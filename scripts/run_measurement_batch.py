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
    # 🔴 Round 195 (2026-09-08) — Round 153 과 같은 사고가 다른 경로로 재발했다.
    #   실측(9월 멘션): "한방" 405건이 전부 바를정 한방의원의 target 멘션으로 잡혔다.
    #   9월 전체 멘션의 **32%** 다. 한방 치료를 언급한 모든 AI 답변이 바를정 멘션이 됐다.
    #   출처는 split() 이 아니라 **접미사 제거 경로**다 — "한방의원" 에서 "의원" 을 떼어
    #   원문에 단어로 존재한 적도 없는 "한방" 을 만들어냈다. 아래 stem 가드 참조.
    "한방", "한방의원", "의료원", "의료", "메디컬", "메디", "종합병원",
    #   "강남점" 12건도 같은 부류 — "강남" 은 있는데 "강남점" 이 없었다.
    #   지점 표기는 열거가 아니라 규칙으로 막는다(_is_branch_token).
    "강남점", "잠실점", "부산점", "본점", "지점", "분점",
}

# 지점 표기(…점)는 이름이 무한하므로 열거가 불가능하다 — 규칙으로 거른다.
def _is_branch_token(tok: str) -> bool:
    return len(tok) <= 4 and tok.endswith("점")


# 🔴 별칭 최소 길이. 2글자 한국어 토큰은 브랜드로 기능하지 않고 오탐만 만든다
#   ("한방"·"모발"·"미앤"…). 실제 브랜드는 3글자 이상이거나 tenant_name 전체로 잡힌다.
_MIN_ALIAS_LEN = 3


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
            if tok in _GENERIC_KOREAN_TOKENS or _is_branch_token(tok):
                continue
            aliases.add(tok)
        # 한국어 부분 (의원/병원 + 잠실/서울 등 제외한 핵심 brand)
        # 예: "밝은눈안과" 같은 단독 키워드
        for match in _re.finditer(r"[가-힣]{2,}", tenant_name):
            cand = match.group(0)
            if cand not in _GENERIC_KOREAN_TOKENS and len(cand) >= 3:
                aliases.add(cand)
                # 의원/안과/병원 등 접미사 제거 버전
                # 🔴 Round 195 — 여기가 "한방" 405건의 출처였다.
                #   접미사를 떼면 **원문에 단어로 존재한 적 없는 토큰**이 생긴다.
                #   "한방의원" → "한방" 처럼 일반명사가 만들어지면 그 단어가 나오는
                #   모든 답변이 자사 멘션으로 집계된다. stem 은 더 엄격하게 검사한다:
                #   ① 최소 3글자 ② 일반명사 목록 ③ 지점 표기
                for suffix in ("의원", "병원", "안과의원", "피부과", "성형외과", "한의원"):
                    if cand.endswith(suffix) and len(cand) > len(suffix) + 1:
                        stem = cand[: -len(suffix)]
                        if len(stem) < _MIN_ALIAS_LEN:
                            continue
                        if stem in _GENERIC_KOREAN_TOKENS or _is_branch_token(stem):
                            continue
                        aliases.add(stem)
    if target_brand:
        aliases.add(target_brand.strip())
    # 최종 방어선 — tenant_name 전체는 길이 무관하게 통과시키고, 나머지는 최소 길이 적용.
    #   (영문 slug 는 2글자여도 유효하므로 한글에만 적용한다: "bgn" 은 3, "TETE" 는 4)
    full = (tenant_name or "").strip()
    out = []
    for a in aliases:
        if not a:
            continue
        if a == full:
            out.append(a)
            continue
        if any("가" <= ch <= "힣" for ch in a) and len(a) < _MIN_ALIAS_LEN:
            continue
        out.append(a)
    return out


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

    # 🔴 Round 181b (2026-08-31) — tracked 바이패스를 purpose 별로 제한.
    #   Round 180b 가 tracked 에 purpose 게이트까지 면제해 준 결과, **경쟁 지형 잡이 굶었다.**
    #   실측(2026-08-30 21:00 measure-competitor-mentions 런, LIMIT 20):
    #     측정된 20개 중 19개가 purpose='own' tracked, competitor_landscape 는 단 1개.
    #   tracked 는 거의 전부 own 이므로, competitor 전용 잡에서까지 먼저 집으면
    #   그 잡이 존재할 이유가 사라진다.
    #   → 바이패스는 own 잡(또는 필터 미지정)에서만 적용한다.
    #     competitor_landscape 잡은 원래대로 그 purpose 만 본다.
    _tracked_bypass = "COALESCE(k.tracked, false) = true OR " if purpose_filter in ("", "own") else ""
    if not _tracked_bypass:
        logger.info("tracked 바이패스 비활성 (PURPOSE_FILTER=%s 전용 잡)", purpose_filter)
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
                   k.target_brand, k.purpose, k.last_measured_at, t.partner_slug
            FROM keywords k JOIN tenants t ON t.id=k.tenant_id
            WHERE k.is_active = true
              -- 🔴 Round 206c — 일시정지·해지 병원은 측정하지 않는다(fail-open: null 은 active).
              --   실측 7일: 힐링안과·청담디어·클리어서울(paused) 측정 성공 호출 130건.
              --   발행 로테이션(R174i)·A/B(R204) 는 이미 이 게이트가 있었고 측정만 빠져 있었다.
              AND COALESCE(lower(t.status), 'active') NOT IN ('paused', 'churned')
              AND (
                    -- 🔴 Round 180b — tracked 는 measure_eligible / purpose 게이트를 건너뛴다.
                    --   (Round 181b: 이 바이패스는 own 잡에서만 켠다 — 위 _tracked_bypass 주석 참조)
                    --   Round 173 이 롱테일 질문형 키워드를 measure_eligible=false 로 막았다
                    --   ("발행 방향만 잡는 용도, 측정 크레딧 아끼자"). 그런데 Round 180 의
                    --   근거가 정확히 그 반대다 — 인용 6건 중 4건이 롱테일 질문형
                    --   '강남 모발이식 회복'(3위) 에서 나왔고, 헤드텀 '잠실 라식'(3.5위, 11편)
                    --   은 0건이다. 그 정책을 그대로 두면 추적 키워드 76개 중 27개가
                    --   영구 미측정 → 성과 보드에 영원히 0 으로 남는다. 약속한 키워드는
                    --   반드시 측정한다. 비용 상한은 tracked 개수(76) 와 LIMIT 이 잡는다.
                    {_tracked_bypass}(COALESCE(k.measure_eligible, true) = true {where_purpose})
              )
            -- Round 182 (2026-08-31) - focus_tier ranked above the fairness key,
            --   which starved tier 0 tenants permanently. Measured: 22 of 106
            --   tracked keywords (bellisel 13, healingeye 4, wecircle-self 2,
            --   dear 2, forena 1 - all focus_tier=0) had never been measured,
            --   because the 84 tier 1 tracked keywords always fill LIMIT first.
            --   Fix: staleness in days (capped at 7) ranks ABOVE focus_tier.
            --   Anything idle 7+ days wins regardless of tier; inside the same
            --   staleness bucket focus tenants still win (Round 180 intent kept).
            ORDER BY COALESCE(k.tracked, false) DESC,
                     LEAST(
                       EXTRACT(EPOCH FROM (NOW() - COALESCE(k.last_measured_at, TIMESTAMPTZ '2000-01-01')))
                         / 86400.0,
                       7
                     ) DESC,
                     COALESCE(t.focus_tier, 0) DESC,
                     k.last_measured_at ASC NULLS FIRST,
                     k.id
            """
        )).mappings().all()

    # 🔴 Round 206c — 브랜드명 질의는 BRANDED_MEASURE_INTERVAL_DAYS(기본 7)일에 한 번만.
    #   브랜드 질의("밝은눈안과강남")는 글과 무관하게 56~91% 등장한다(R204 실측) — 매일 재도
    #   새 정보가 거의 없다. 실측 7일: 활성 병원 브랜드 질의 측정 218건(22개 키워드).
    #   ⚠ SQL LIMIT 뒤에서 거르면 tracked 브랜드 키워드가 매일 앞자리를 차지한 채 버려져
    #     슬롯만 먹는다 → 전체 후보를 받아 여기서 거른 뒤 keyword_limit 으로 자른다.
    #   판정 규칙은 발행·어드민과 같은 src/content/brand_tokens.py.
    from datetime import datetime, timedelta, timezone

    from src.content.brand_tokens import brand_tokens, is_branded

    _branded_days = float(os.environ.get("BRANDED_MEASURE_INTERVAL_DAYS", "7") or "7")
    _now = datetime.now(timezone.utc)
    _tok_cache: dict = {}
    _kept = []
    _branded_skipped = 0
    for r in rows:
        tid = r["tenant_id"]
        if tid not in _tok_cache:
            _tok_cache[tid] = brand_tokens(r["tenant_name"], r.get("partner_slug"))
        last = r["last_measured_at"]
        if last is not None and last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if (
            _branded_days > 0
            and last is not None
            and _now - last < timedelta(days=_branded_days)
            and is_branded(r["keyword_text"], _tok_cache[tid])
        ):
            _branded_skipped += 1
            continue
        _kept.append(r)
    rows = _kept[:keyword_limit]
    logger.info("브랜드 질의 주기 스킵: %d 건 (interval=%s일)", _branded_skipped, _branded_days)

    logger.info("대상 키워드: %d 건", len(rows))
    if not rows:
        logger.info("측정할 키워드 없음 — exit 0")
        return 0

    engines = _build_engines(mode)
    logger.info("활성 엔진: %s", [e.__class__.__name__ for e in engines])
    # 🔴 Round 206c — 같은 배치에서 같은 (엔진, 프롬프트) 는 한 번만 호출하고 답을 병원끼리 공유한다.
    #   근거·안전성은 src/engines/reuse.py docstring. stub 은 병원별 URL 을 섞으므로 제외.
    _reuse_cache: dict = {}
    if mode != "stub" and os.environ.get("MEASURE_REUSE_RESPONSES", "1").strip() not in ("0", "false", "off"):
        from src.engines.reuse import ResponseReuseEngine
        from src.engines.stub import StubEngine as _Stub

        engines = [e if isinstance(e, _Stub) else ResponseReuseEngine(e, _reuse_cache) for e in engines]
        logger.info("응답 재사용 활성 (MEASURE_REUSE_RESPONSES=0 으로 끄기)")

    # 측정 실행 — 엔진별로 collect_for_keyword 호출
    from src.collector.collect import collect_for_keyword
    from src.storage.models import Keyword

    total_success = 0
    total_failed = 0
    total_mentions = 0

    def _mark_measured(processed: list) -> None:
        """이번 batch 에서 건드린 키워드의 last_measured_at 갱신.

        🔴 Round 181b (2026-08-31) — 예전엔 이 UPDATE 가 루프를 **끝까지 돈 경우에만**
          실행됐다. MAX_DAILY_USD 가드에 걸려 중간에 return 하면 갱신이 통째로 건너뛰어지고,
          다음 런은 last_measured_at 이 그대로인 **같은 키워드 머리**를 다시 집는다.
          → 큐 앞쪽만 무한 반복되고 뒤쪽은 영원히 굶는다(공정 로테이션의 자기부정).
          가드에 걸렸어도 **실제로 처리한 데까지는** 기록해야 다음 런이 그다음으로 넘어간다.
        """
        if not processed:
            return
        with sql_engine.begin() as conn:
            conn.execute(
                text("UPDATE keywords SET last_measured_at = NOW() WHERE id = ANY(:ids)"),
                {"ids": processed},
            )
        logger.info("last_measured_at 갱신: %d 건", len(processed))

    # Round 182 (2026-08-31) - marking once at the end of the batch loses the
    #   whole run's bookkeeping the moment the process dies.
    #   Measured (2026-08-31 00:00 run): 135 responses stored (46 keywords x 3
    #   engines) but ZERO last_measured_at updates. The API spend happened and
    #   only the ledger was lost. Round 181b covered the guardrail return path
    #   only; kill/crash still relied on one UPDATE at the end.
    #   Fix: flush after every keyword (one tiny UPDATE, negligible cost).
    _processed_ids: list = []
    _marked_upto = 0

    def _flush_marks() -> None:
        nonlocal _marked_upto
        if len(_processed_ids) > _marked_upto:
            _mark_measured(_processed_ids[_marked_upto:])
            _marked_upto = len(_processed_ids)

    for r in rows:
        keyword_id = r["id"]
        keyword_text = r["keyword_text"]
        tenant_name = r["tenant_name"]
        logger.info("[k=%d] %s · %s", keyword_id, tenant_name, keyword_text[:30])
        _processed_ids.append(keyword_id)

        # Round 31 fix (2026-05-30): collect_for_keyword 의 실제 시그니처는
        #   (session_factory, tenant_id, keyword, engine, *, n_samples, ...)
        # session_factory 는 `with sf() as s` 로 호출되는 callable.
        with Session() as _read_session:
            kw = _read_session.get(Keyword, keyword_id)
        if not kw:
            continue
        # Round 31 fix 3 (2026-05-30): 한국어 brand alias 자동 생성.
        # target_brand 가 영문 slug (예: "bgn") 만 있으면 한국 응답 매칭 0.
        aliases = _build_aliases(r["tenant_name"], r.get("target_brand") or "")

        # 🔴 Round 181c (2026-08-31) — 엔진을 **동시에** 돌린다. 이게 진짜 병목이었다.
        #
        #   실측(2026-08-30~31 llm_call_logs):
        #     엔진당 호출 간격 ~37~43초 · 엔진 3개를 순차로 → 키워드당 약 2분
        #     workflow timeout-minutes = 30  →  **한 런에 최대 15개 내외**
        #   즉 KEYWORD_LIMIT 을 60 → 90 → 120 으로 올린 것은 전부 무의미했다.
        #   상한이 아니라 **벽시계 시간**이 구속 조건이었는데 엉뚱한 손잡이를 돌린 것이다.
        #   (실제로 8/31 00:00 런은 44개까지 가고 죽었고, 그전 런은 20개였다.)
        #
        #   세 엔진은 서로 독립이고 각자 다른 벤더 API 를 친다 — 순차로 기다릴 이유가 없다.
        #   동시 실행으로 키워드당 ~2분 → ~40초. 같은 30분에 3배를 돈다.
        #   ⚠ 벤더 rate limit 은 엔진별로 따로 걸리므로 동시 실행이 한 벤더의 분당 한도를
        #     올리지 않는다(키워드 간에는 여전히 순차다).
        async def _run_engine(_engine):
            try:
                return await collect_for_keyword(
                    Session,            # session_factory
                    r["tenant_id"],     # tenant_id
                    kw,                 # keyword
                    _engine,            # engine
                    n_samples=1,
                    concurrency=1,
                    aliases=aliases,    # 한국어 brand alias
                )
            except Exception as e:  # noqa: BLE001
                logger.exception("[k=%d engine=%s] 측정 실패: %s",
                                 keyword_id, _engine.__class__.__name__, e)
                return None

        results = await asyncio.gather(*(_run_engine(e) for e in engines))

        _guardrail = False
        for result in results:
            if result is None:
                total_failed += 1
                continue
            total_success += result.n_success
            total_failed += result.n_failed
            total_mentions += result.n_mentions
            if result.guardrail_stopped:
                _guardrail = True

        _flush_marks()

        if _guardrail:
            logger.warning("MAX_DAILY_USD 가드 도달 — 중단")
            logger.info("최종: success=%d fail=%d mentions=%d",
                        total_success, total_failed, total_mentions)
            # Round 181b — 중단하더라도 처리한 데까지는 기록해야
            #   다음 런이 큐의 다음 구간으로 넘어간다.
            _flush_marks()
            return 0

    logger.info("==== 측정 완료 ====")
    logger.info("success=%d fail=%d mentions=%d", total_success, total_failed, total_mentions)
    for _e in engines:
        if hasattr(_e, "hits"):
            logger.info("응답 재사용 engine=%s 실호출=%d 재사용=%d", _e.name, _e.misses, _e.hits)

    # Round 36 (2026-05-31) — fairness 갱신.
    # 이번 batch 에서 처리된 keyword 들 last_measured_at = NOW() UPDATE.
    # 다음 cron 은 last_measured_at 가장 오래된 (또는 NULL) 키워드 우선 픽업.
    _flush_marks()

    # Round 32 (2026-05-30) — 측정 직후 cited_urls 의 source domain 추적.
    # mode=production 의 Gemini/OpenAI/etc 응답에 cited_urls 가 있으면
    # redirect 따라가서 실제 source domain 을 responses.source_domains 에 저장.
    if mode == "production":
        await _resolve_recent_source_domains(sql_engine)

    return 0


async def _resolve_recent_source_domains(sql_engine) -> None:
    """source_domains 가 아직 없는 responses 의 인용 URL 을 해석한다.

    🔴 Round 197 (2026-09-08) — 창이 10분이라 배치 앞부분이 통째로 누락됐다.
       기존: `created_at > NOW() - INTERVAL '10 min'`. 그런데 이 함수는 배치 **끝**에
       한 번 도는데 배치는 30~90분을 돈다 → 처음 20~80분 사이에 만들어진 응답은
       호출 시점에 이미 10분을 넘겨 **영원히 해석되지 않는다**(다음 배치도 창 밖이다).
       실측: gemini 응답 4,648건 중 source_domains 보유 2,346건(50.5%),
       openai 17%, claude 42%. **인용의 절반이 애초에 관측 불가였다.**
       Gemini 는 cited_urls 가 vertexaisearch 리다이렉트라 해석 없이는 도메인을 알 수 없으므로,
       미해석 = 그 응답의 자사 인용은 존재해도 영영 세지지 않는다.

    수정: 나이 창 대신 **미해석 잔량**을 본다(오래된 것도 따라잡는다).
      RESOLVE_LOOKBACK_DAYS(기본 3) 안에서 최신 우선 RESOLVE_MAX_RESPONSES(기본 400)건.
      배치가 하루 여러 번 돌므로 밀린 것은 몇 회에 걸쳐 소진된다.
    """
    try:
        from src.parser.source_resolver import resolve_urls, summarize
    except Exception as e:  # noqa: BLE001
        logger.warning("source_resolver import 실패: %s", e)
        return

    import json
    with sql_engine.connect() as conn:
        # cited_urls 는 json type (not jsonb) — json_array_length 사용 또는 jsonb cast.
        # 또는 단순히 NULL 체크만 하고 Python 에서 list 검증.
        _lookback = int(os.environ.get("RESOLVE_LOOKBACK_DAYS", "3") or "3")
        _cap = int(os.environ.get("RESOLVE_MAX_RESPONSES", "400") or "400")
        rows = conn.execute(text(
            """
            SELECT r.id, r.cited_urls
            FROM responses r
            WHERE r.created_at > NOW() - make_interval(days => :lookback)
              AND r.source_domains IS NULL
              AND r.cited_urls IS NOT NULL
            ORDER BY r.created_at DESC
            LIMIT :cap
            """
        ), {"lookback": _lookback, "cap": _cap}).mappings().all()

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
