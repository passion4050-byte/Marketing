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


def _build_engines(mode: str) -> list:
    """ENGINE_MODE 에 따라 engine instance 리스트 반환."""
    if mode == "stub":
        from src.engines.stub import StubEngine
        return [StubEngine()]

    # production — 4 엔진 활성. key 없는 엔진은 skip.
    engines = []
    if os.environ.get("PERPLEXITY_API_KEY"):
        try:
            from src.engines.perplexity import PerplexityEngine
            engines.append(PerplexityEngine())
            logger.info("✓ Perplexity engine 활성")
        except Exception as e:  # noqa: BLE001
            logger.warning("Perplexity engine init 실패: %s", e)
    if os.environ.get("OPENAI_API_KEY"):
        try:
            from src.engines.openai_engine import OpenAIEngine
            engines.append(OpenAIEngine())
            logger.info("✓ OpenAI engine 활성")
        except Exception as e:  # noqa: BLE001
            logger.warning("OpenAI engine init 실패: %s", e)
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            from src.engines.claude import ClaudeEngine
            engines.append(ClaudeEngine())
            logger.info("✓ Claude engine 활성")
        except Exception as e:  # noqa: BLE001
            logger.warning("Claude engine init 실패: %s", e)
    if os.environ.get("GOOGLE_API_KEY"):
        try:
            from src.engines.gemini import GeminiEngine
            engines.append(GeminiEngine())
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
    with sql_engine.connect() as conn:
        rows = conn.execute(text(
            """
            SELECT k.id, k.tenant_id, k.text AS keyword_text, t.name AS tenant_name
            FROM keywords k JOIN tenants t ON t.id=k.tenant_id
            WHERE k.is_active = true
            ORDER BY k.id
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
                result = await collect_for_keyword(
                    Session,            # session_factory (callable, 함수 안에서 새 session 생성)
                    r["tenant_id"],     # tenant_id
                    kw,                 # keyword
                    engine,             # engine
                    n_samples=1,
                    concurrency=1,
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
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
