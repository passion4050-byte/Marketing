"""Collector — Phase 4-T2.1 (정의서 §4.2).

키워드 1개에 대해 ``n_samples`` 개의 엔진 호출을 비동기 + concurrency 캡으로 수집한다.
각 sample 별:
1. 비용 가드 (LlmCallLog 누적 vs MAX_DAILY_USD)
2. engine.query() async 호출
3. Query / Response INSERT
4. Mention extract → Mention INSERT
5. LlmCallLog INSERT (channel="measurement")

가드 초과 시 즉시 중단 — 이미 처리된 샘플은 commit 된 상태로 남는다.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

import structlog
from sqlalchemy.orm import Session

from src.content.cost import (
    check_daily_usd_budget as _check_daily_usd_budget,
    estimate_call_cost_usd,
)
from src.content.llm import CostGuardrailExceeded
from src.engines.base import BaseEngine, EngineError
from src.parser.mentions import extract_mentions
from src.storage.models import (
    Keyword,
    LlmCallLog,
    Mention,
    Query,
    Response,
    Tenant,
)

logger = structlog.get_logger(__name__)


@dataclass
class CollectionResult:
    n_total: int
    n_success: int
    n_failed: int
    n_mentions: int = 0
    error_msg: str | None = None
    guardrail_stopped: bool = False
    failures: list[str] = field(default_factory=list)


def build_prompt(keyword_text: str, sample_index: int) -> str:
    """엔진에게 보낼 프롬프트. 같은 키워드 + 다른 sample_index 면 응답 변형 유도."""
    return (
        f"키워드: {keyword_text}\n"
        f"sample_index: {sample_index}\n"
        "위 키워드에 대한 정보를 한국어로 정리해 주세요. 추천되는 의료기관/병원이 있다면 자연스럽게 언급하고, "
        "사실에 기반해 답변하세요."
    )


def _estimate_query_cost(provider: str, prompt: str) -> float:
    """대략적인 호출 비용 (USD) — 토큰 정보가 없을 때 휴리스틱."""
    # input ≈ prompt char/3, output ≈ 800 (안전 상한)
    input_tokens = max(50, len(prompt) // 3)
    output_tokens = 800
    return estimate_call_cost_usd(provider, input_tokens, output_tokens)


async def collect_for_keyword(
    session_factory,
    tenant_id: int,
    keyword: Keyword,
    engine: BaseEngine | list[BaseEngine],
    *,
    n_samples: int = 30,
    concurrency: int = 5,
    aliases: list[str] | None = None,
) -> CollectionResult:
    """키워드 1개에 대해 n_samples 비동기 수집.

    ``engine`` 은 단일 BaseEngine 또는 list — 다중 엔진이면 sample 별 round-robin.
    ``session_factory`` 는 ``SessionLocal`` 같은 sessionmaker — 각 sample 마다 새 세션을
    열어 SQLite write 격리. (단일 세션에 동시 write 시 락 충돌 가능)
    """
    keyword_id = keyword.id
    keyword_text = keyword.text
    target_brand = keyword.target_brand or ""

    # 단일 / 다중 엔진 정규화
    engines: list[BaseEngine] = engine if isinstance(engine, list) else [engine]
    if not engines:
        return CollectionResult(
            n_total=n_samples, n_success=0, n_failed=0,
            error_msg="engines list 가 비어있음",
        )

    # tenant 이름이 target 으로 자주 쓰이므로 fallback 보강 + confirmed competitor 자동 로드
    with session_factory() as s:
        tenant = s.get(Tenant, tenant_id)
        if tenant is None:
            return CollectionResult(
                n_total=n_samples, n_success=0, n_failed=n_samples,
                error_msg=f"Unknown tenant_id: {tenant_id}",
            )
        if not target_brand:
            target_brand = tenant.name
        # Phase 6: confirmed=True 경쟁사 자동 주입 (Competitor 테이블 없으면 skip)
        confirmed_competitors: list[str] = []
        try:
            from src.storage.models import Competitor

            confirmed_competitors = [
                c.name for c in s.query(Competitor)
                .filter(Competitor.tenant_id == tenant_id, Competitor.confirmed == True)  # noqa: E712
                .all()
            ]
        except Exception:
            # Competitor 테이블 미생성 (Phase 6 이전) 또는 로드 오류 — graceful
            confirmed_competitors = []

    sema = asyncio.Semaphore(max(1, concurrency))
    state = {"success": 0, "failed": 0, "mentions": 0, "stopped": False, "error": None,
             "failures": []}
    state_lock = asyncio.Lock()

    async def _run_one(idx: int) -> None:
        if state["stopped"]:
            return
        async with sema:
            if state["stopped"]:
                return

            # round-robin engine 선택
            current_engine = engines[idx % len(engines)]
            prompt = build_prompt(keyword_text, idx)
            projected = _estimate_query_cost(current_engine.name, prompt)

            # 비용 가드 — 초과 시 stop flag 세팅
            try:
                with session_factory() as gs:
                    _check_daily_usd_budget(gs, tenant_id, projected_cost=projected)
            except CostGuardrailExceeded as e:
                async with state_lock:
                    state["stopped"] = True
                    state["error"] = str(e)
                logger.warning("collector.guardrail_stop", tenant_id=tenant_id, sample=idx)
                return

            try:
                resp = await current_engine.query(prompt)
            except EngineError as e:
                async with state_lock:
                    state["failed"] += 1
                    state["failures"].append(f"sample={idx}: {e}")
                logger.warning("collector.engine_error", sample=idx, error=str(e),
                               engine=current_engine.name)
                with session_factory() as ls:
                    ls.add(LlmCallLog(
                        tenant_id=tenant_id,
                        provider=current_engine.name,
                        model=current_engine.name,
                        channel="measurement",
                        keyword=keyword_text,
                        input_tokens=0,
                        output_tokens=0,
                        cost_usd=0.0,
                        status="error",
                        error_msg=str(e)[:500],
                    ))
                    ls.commit()
                return

            # Mention 추출 (target + alias + confirmed competitor 자동 주입)
            try:
                mentions_extracted = extract_mentions(
                    resp.text,
                    target_brand=target_brand,
                    aliases=aliases,
                    competitors=confirmed_competitors,
                )
            except Exception as e:  # pragma: no cover — extractor 는 graceful 해야 함
                logger.warning("collector.mention_extract_error", error=str(e))
                mentions_extracted = []

            # DB INSERT (단일 트랜잭션)
            actual_cost = _estimate_query_cost(current_engine.name, prompt)
            with session_factory() as ws:
                q = Query(
                    tenant_id=tenant_id,
                    keyword_id=keyword_id,
                    engine=current_engine.name,
                    prompt=prompt,
                    sample_index=idx,
                    cost_usd=actual_cost,
                )
                ws.add(q)
                ws.flush()

                r = Response(
                    query_id=q.id,
                    raw_text=resp.text,
                    cited_urls=resp.cited_urls or [],
                    latency_ms=resp.latency_ms,
                )
                ws.add(r)
                ws.flush()

                for em in mentions_extracted:
                    ws.add(Mention(
                        response_id=r.id,
                        tenant_id=tenant_id,
                        brand=em.brand,
                        is_target=em.is_target,
                        is_competitor=em.is_competitor,
                        position=em.position,
                        weight=em.weight,
                        # Phase 6: positive | negative | neutral. v1 fallback "negative" if is_negative.
                        sentiment=getattr(em, "sentiment", None) or (
                            "negative" if em.is_negative else "neutral"
                        ),
                        context_snippet=em.context_snippet,
                    ))

                ws.add(LlmCallLog(
                    tenant_id=tenant_id,
                    provider=current_engine.name,
                    model=current_engine.name,
                    channel="measurement",
                    keyword=keyword_text,
                    input_tokens=0,
                    output_tokens=0,
                    cost_usd=actual_cost,
                    status="success",
                ))
                ws.commit()

            async with state_lock:
                state["success"] += 1
                state["mentions"] += len(mentions_extracted)

    await asyncio.gather(*[_run_one(i) for i in range(n_samples)])

    logger.info(
        "collector.done",
        tenant_id=tenant_id,
        keyword_id=keyword_id,
        n_total=n_samples,
        n_success=state["success"],
        n_failed=state["failed"],
        n_mentions=state["mentions"],
        guardrail=state["stopped"],
    )

    return CollectionResult(
        n_total=n_samples,
        n_success=state["success"],
        n_failed=state["failed"],
        n_mentions=state["mentions"],
        error_msg=state["error"],
        guardrail_stopped=state["stopped"],
        failures=state["failures"],
    )
