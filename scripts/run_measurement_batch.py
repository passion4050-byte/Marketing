"""Round 31 (2026-05-30) — AI 인용 추적 measure batch.

매일 22:00 UTC cron 으로 실행. 환경변수로 동작 분기:

- ENGINE_MODE=stub (기본): src.engines.stub.StubEngine 으로 파이프라인 검증.
  외부 API 호출 0, 비용 0. demo 데이터로 mention 추출 + DB INSERT 검증.

- ENGINE_MODE=production: 4 엔진 (perplexity / openai / anthropic / gemini)
  모두 실제 호출. cost_usd 누적 + MAX_DAILY_USD 가드.

대상 키워드:
  - is_active=true 인 모든 keyword (auto_content_settings 와 별개로 측정)
  - KEYWORD_LIMIT 으로 상한 (기본 20개)

각 keyword 당 — 4 엔진 × n_samples (기본 1) 호출.
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("measurement-batch")


_GENERIC_KOREAN_TOKENS = {
    "잠실", "서울", "강남", "부산", "분당", "송파", "용산", "신촌",
    "병원", "의원", "클리닉", "센터", "본점", "지점", "강남구", "송파구",
    # 🔴 Round 153 (2026-08-16) — 진료과명 누락 실사고: "벨리셀 피부과" 를 공백분리하며
    #   "피부과" 가 target alias 로 주입 → 일반명사 언급 225건이 전부 벨리셀 목표 멘션으로
    #   집계(포털·보고서 허수, 경쟁병원 스니펫 노출의 원천). 진료과명은 절대 brand 가 아님.
    "피부과", "안과", "성형외과", "치과", "내과", "외과", "정형외과", "산부인과",
    "한의원", "한방병원", "이비인후과", "비뇨기과", "신경외과", "가정의학과",
}


def _build_aliases(tenant_name: str, target_brand: str) -> list[str]:
    """tenant.name 에서 한국어 brand alias 자동 생성.

    예: tenant_name="BGN 밝은눈안과 잠실", target_brand="bgn"
        → ["BGN 밝은눈안과 잠실", "BGN", "밝은눈안과", "bgn"]

    추출 규칙:
    - tenant_name 자체 (full match 용)
    - tenant_name 의 영문/한글 token 중 ≥2글자 + generic 단어 제외
    - target_brand 영문 (이미 키워드에 등록된 것)
    """
    import re as _re
    aliases: set[str] = set()
    if tenant_name:
        aliases.add(tenant_name.strip())
        # tokens 추출
        for tok in tenant_name.split():
            tok = tok.strip()
            if len(tok) < 2:
                continue
            if tok in _GENERIC_KOREAN_TOKENS:
                continue
            aliases.add(tok)
        # 한국어 부분 (의원/병원 + 잠실/서울 등 제외한 핵심 brand)
        # 예: "밝은눈안과" 같은 단독 키워드
        for match in _re.finditer(r"[가-힣]{2,}", tenant_name):
            cand = match.group(0)
            if cand not in _GENERIC_KOREAN_TOKENS and len(cand) >= 3:
                aliases.add(cand)
                # 의원/안과/병원 등 접미사 제거 버전
                for suffix in ("의원", "병원", "안과의원"):
                    if cand.endswith(suffix) and len(cand) > len(suffix) + 1:
                        aliases.add(cand[: -len(suffix)])
    if target_brand:
        aliases.add(target_brand.strip())
    return [a for a in aliases if a]


def _build_engines(mode: str) -> list:
    """ENGINE_MODE 에 따라 engine instance 리스트 반환."""
    if mode == "stub":
        from src.engines.stub import StubEngine
        return [StubEngine()]

    # production — 4 엔진 활성. key 없는 엔진은 skip.
    # Round 31 fix (2026-05-30): 모든 engine 의 __init__ 이 api_key 를 positional 첫 인자로 요구.
    engines = []
    if (k := os.environ.get("PERPLEXITY_API_KEY")):
        try:
            from src.engines.perplexity import PerplexityEngine
            engines.append(PerplexityEngine(k))
            logger.info("✓ Perplexity engine 활성")
        except Exception as e:  # noqa: BLE001
            logger.warning("Perplexity engine init 실패: %s", e)
    if (k := os.environ.get("OPENAI_API_KEY")):
        try:
            from src.engines.openai_engine import OpenAIEngine
            engines.append(OpenAIEngine(k))
            logger.info("✓ OpenAI engine 활성")
        except Exception as e:  # noqa: BLE001
            logger.warning("OpenAI engine init 실패: %s", e)
    if (k := os.environ.get("ANTHROPIC_API_KEY")):
        try:
            from src.engines.claude import ClaudeEngine
            engines.append(ClaudeEngine(k))
            logger.info("✓ Claude engine 활성")
        except Exception as e:  # noqa: BLE001
            logger.warning("Claude engine init 실패: %s", e)
    if (k := os.environ.get("GOOGLE_API_KEY")):
        try:
            from src.engines.gemini import GeminiEngine
            engines.append(GeminiEngine(k))
            logger.info("✓ Gemini engine 활성")
        except Exception as e:  # noqa: BLE001
            logger.warning("Gemini engine init 실패: %s", e)

    if not engines:
        logger.warning("Production mode 인데 활성 engine 0 — stub 으로 fallback")
        from src.engines.stub import StubEngine
        engines.append(StubEngine())
    return engines


async def main() -> int:
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    if "postgresql" in db_url and "+psycopg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    mode = os.environ.get("ENGINE_MODE", "stub").strip().lower()
    keyword_limit = int(os.environ.get("KEYWORD_LIMIT", "20") or "20")
    max_daily_usd = float(os.environ.get("MAX_DAILY_USD", "1.0") or "1.0")

    logger.info("==== measurement batch ====")
    logger.info("mode=%s keyword_limit=%d max_daily_usd=$%.2f", mode, keyword_limit, max_daily_usd)

    sql_engine = create_engine(db_url, future=True)
    Session = sessionmaker(bind=sql_engine, autoflush=False, autocommit=False)

    # 대상 키워드 수집 — is_active=true
    # Round 34 (2026-05-30): purpose 도 같이 가져옴 (own | competitor_landscape).
    # responses 의 query 가 어느 카테고리인지 추적 가능.
    purpose_filter = os.environ.get("PURPOSE_FILTER", "").strip().lower()  # 'own' | 'competitor_landscape' | ''
    where_purpose = ""
    if purpose_filter in ("own", "competitor_landscape"):
        where_purpose = f"AND k.purpose = '{purpose_filter}'"
        logger.info("PURPOSE_FILTER=%s", purpose_filter)
    # Round 36 (2026-05-31) — fairness ORDER BY.
    # 기존 ORDER BY k.id 는 id 큰 키워드 영원히 미측정 (own 24 + comp 12 = 36, LIMIT 20)
    # 변경 ORDER BY k.last_measured_at NULLS FIRST → 신규/오래된 키워드 우선
    #
    # 🔴 Round 180 (2026-08-30) — 추적 키워드 우선. 공정 로테이션이 신호를 죽이고 있었다.
    #   실측: 활성 키워드 537개 vs LIMIT 60 → 키워드당 9일에 1회.
    #   '강남 모발이식 회복' 은 7월 gemini 31회 측정(인용 4회, 인용률 13%)에서
    #   8월 7회로 떨어졌고, 그래서 8월 인용 0 이 "성과 하락"인지 "측정 부족"인지
    #   구분할 수 없게 됐다. 기대값이 0.9 인데 0 을 관측한 것뿐일 수 있다.
    #   → 성과를 약속한 키워드(keywords.tracked)를 항상 먼저 채우고, 남는 자리를
    #     나머지가 last_measured_at 순으로 쓴다. 비용은 그대로, 신호 밀도만 올린다.
    with sql_engine.connect() as conn:
        rows = conn.execute(text(
            f"""
            SELECT k.id, k.tenant_id, k.text AS keyword_text, t.name AS tenant_name,
                   k.target_brand, k.purpose, k.last_measured_at
            FROM keywords k JOIN tenants t ON t.id=k.tenant_id
            WHERE k.is_active = true
              AND COALESCE(k.measure_eligible, true) = true
              {where_purpose}
            ORDER BY COALESCE(k.tracked, false) DESC,
                     COALESCE(t.focus_tier, 0) DESC,
                     k.last_measured_at ASC NULLS FIRST,
                     k.id
            LIMIT :limit
            """
        ), {"limit": keyword_limit}).mappings().all()

    logger.info("대상 키워드: %d 건", len(rows))
    if not rows:
        logger.info("측정할 키워드 없음 — exit 0")
        return 0

    engines = _build_engines(mode)
    logger.info("활성 엔진: %s", [e.__class__.__name__ for e in engines])

    # 측정 실행 — 엔진별로 collect_for_keyword 호출
    from src.collector.collect import collect_for_keyword
    from src.storage.models import Keyword

    total_success = 0
    total_failed = 0
    total_mentions = 0

    for r in rows:
        keyword_id = r["id"]
        keyword_text = r["keyword_text"]
        tenant_name = r["tenant_name"]
        logger.info("[k=%d] %s · %s", keyword_id, tenant_name, keyword_text[:30])

        for engine in engines:
            try:
                # Round 31 fix (2026-05-30): collect_for_keyword 의 실제 시그니처는
                #   (session_factory, tenant_id, keyword, engine, *, n_samples, ...)
                # session_factory 는 `with sf() as s` 로 호출되는 callable.
                with Session() as _read_session:
                    kw = _read_session.get(Keyword, keyword_id)
                if not kw:
                    continue
                # Round 31 fix 3 (2026-05-30): 한국어 brand alias 자동 생성.
                # target_brand 가 영문 slug (예: "bgn") 만 있으면 한국 응답 매칭 0.
                # tenant.name 에서 한국어 brand 부분 추출 + 합쳐서 alias 리스트.
                aliases = _build_aliases(r["tenant_name"], r.get("target_brand") or "")
                result = await collect_for_keyword(
                    Session,            # session_factory
                    r["tenant_id"],     # tenant_id
                    kw,                 # keyword
                    engine,             # engine
                    n_samples=1,
                    concurrency=1,
                    aliases=aliases,    # 한국어 brand alias
                )
                total_success += result.n_success
                total_failed += result.n_failed
                total_mentions += result.n_mentions
                if result.guardrail_stopped:
                    logger.warning("MAX_DAILY_USD 가드 도달 — 중단")
                    logger.info("최종: success=%d fail=%d mentions=%d",
                                total_success, total_failed, total_mentions)
                    return 0
            except Exception as e:  # noqa: BLE001
                logger.exception("[k=%d engine=%s] 측정 실패: %s",
                                 keyword_id, engine.__class__.__name__, e)
                total_failed += 1

    logger.info("==== 측정 완료 ====")
    logger.info("success=%d fail=%d mentions=%d", total_success, total_failed, total_mentions)

    # Round 36 (2026-05-31) — fairness 갱신.
    # 이번 batch 에서 처리된 keyword 들 last_measured_at = NOW() UPDATE.
    # 다음 cron 은 last_measured_at 가장 오래된 (또는 NULL) 키워드 우선 픽업.
    processed_ids = [r["id"] for r in rows]
    if processed_ids:
        with sql_engine.begin() as conn:
            conn.execute(
                text("UPDATE keywords SET last_measured_at = NOW() WHERE id = ANY(:ids)"),
                {"ids": processed_ids},
            )
        logger.info("last_measured_at 갱신: %d 건", len(processed_ids))

    # Round 32 (2026-05-30) — 측정 직후 cited_urls 의 source domain 추적.
    # mode=production 의 Gemini/OpenAI/etc 응답에 cited_urls 가 있으면
    # redirect 따라가서 실제 source domain 을 responses.source_domains 에 저장.
    if mode == "production":
        await _resolve_recent_source_domains(sql_engine)

    return 0


async def _resolve_recent_source_domains(sql_engine) -> None:
    """이번 batch 의 responses 중 source_domains 가 NULL 인 것 추적."""
    try:
        from src.parser.source_resolver import resolve_urls, summarize
    except Exception as e:  # noqa: BLE001
        logger.warning("source_resolver import 실패: %s", e)
        return

    import json
    with sql_engine.connect() as conn:
        # cited_urls 는 json type (not jsonb) — json_array_length 사용 또는 jsonb cast.
        # 또는 단순히 NULL 체크만 하고 Python 에서 list 검증.
        rows = conn.execute(text(
            """
            SELECT r.id, r.cited_urls
            FROM responses r
            WHERE r.created_at > NOW() - INTERVAL '10 min'
              AND r.source_domains IS NULL
              AND r.cited_urls IS NOT NULL
            """
        )).mappings().all()

    logger.info("Source 추적 대상 responses: %d 건", len(rows))
    total_resolved = 0
    for r in rows:
        response_id = r["id"]
        urls = r["cited_urls"] or []
        if not isinstance(urls, list) or not urls:
            continue
        try:
            resolved = await resolve_urls(urls, concurrency=10, timeout=4.0)
            summary = summarize(resolved)
            logger.info(
                "  [resp=%d] total=%d self=%d (%.1f%%) top=%s",
                response_id, summary["total"], summary["self_count"],
                summary["self_share"] * 100,
                summary["top_domains"][:3],
            )
            with sql_engine.begin() as conn:
                conn.execute(
                    text("UPDATE responses SET source_domains = :sd WHERE id = :id"),
                    {"sd": json.dumps(resolved, ensure_ascii=False), "id": response_id},
                )
            total_resolved += 1
        except Exception as e:  # noqa: BLE001
            logger.warning("  [resp=%d] source 추적 실패: %s", response_id, e)
    logger.info("Source 추적 완료: %d 건 UPDATE", total_resolved)


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
