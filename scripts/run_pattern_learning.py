"""Round 95 (2026-06-28) — Top 인용 콘텐츠 구조 패턴 자동 학습 실행.

엔트리포인트:
    DATABASE_URL=postgresql://... python scripts/run_pattern_learning.py

cron (.github/workflows/auto-pattern-learning.yml) 으로 주간 실행:
    1. learned_pattern.run_auto_learning() 호출
    2. learned_insights 테이블에 자동 등록 (applied=false default)
    3. 운영자가 어드민 페이지에서 "적용중" 토글 ON → 다음 cron 글 prompt 에 자동 주입

비용: 무료 (LLM 호출 없음, DB query + Python regex 만).
"""
from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from src.content.learned_pattern import run_auto_learning  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> int:
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    if "postgresql" in db_url and "+psycopg" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    logger.info("==== auto pattern learning ====")
    sql_engine = create_engine(db_url, future=True)
    Session = sessionmaker(bind=sql_engine, autoflush=False, autocommit=False)

    result = run_auto_learning(Session)
    logger.info("result.skipped=%s total=%d", result.get("skipped"), result.get("total_analyzed", 0))

    if result.get("insights"):
        logger.info("=== Auto-discovered patterns (%d) ===", len(result["insights"]))
        for line in result["insights"]:
            logger.info("  • %s", line)

    # GitHub Actions summary 출력
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        lines = ["# Auto Pattern Learning 결과\n"]
        if result.get("skipped"):
            lines.append(f"- ⏭️ skipped: {result.get('reason', 'n/a')}")
        else:
            lines.append(f"- 분석 글: **{result.get('total_analyzed', 0)}편**")
            lines.append(f"- Top 패턴: **{result.get('top_count', 0)}편** (상위 20%)")
            lines.append(f"- 자동 등록: insight_id={result.get('insight_id', 'none')}")
            if result.get("insights"):
                lines.append("\n## 발견된 패턴")
                for line in result["insights"]:
                    lines.append(f"- {line}")
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")

    # JSON stdout (Slack 또는 외부 시스템 활용)
    print(json.dumps({
        "skipped": result.get("skipped", False),
        "total_analyzed": result.get("total_analyzed", 0),
        "top_count": result.get("top_count", 0),
        "insight_id": result.get("insight_id"),
        "insights_count": len(result.get("insights", [])),
    }, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
