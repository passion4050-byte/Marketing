"""GH Actions cron 진입점 — Streamlit Cloud APScheduler 슬립 우회.

매 시간 GitHub Actions 가 이 스크립트를 실행한다. 기존 ``daily_auto_content_job``
과 동일한 코드 경로 (blogkey 임시저장함의 '지금 1회 실행' 버튼). DATABASE_URL 만
필요. auto_content_settings.enabled=True + daily_count 만큼 (keyword × channel)
라운드로빈 생성. compliance pass + auto_publish=True 면 즉시 published.

사용:
    DATABASE_URL=postgresql://... GEMINI_API_KEY=... \
        python scripts/run_auto_content_once.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.collector.scheduler import daily_auto_content_job  # noqa: E402
from src.storage.db import SessionLocal  # noqa: E402


def main() -> int:
    if not os.environ.get("DATABASE_URL"):
        print("ERROR: DATABASE_URL 미설정", file=sys.stderr)
        return 1

    try:
        result = daily_auto_content_job(SessionLocal)
    except Exception as e:  # pragma: no cover
        print(f"ERROR: daily_auto_content_job 실패: {e}", file=sys.stderr)
        return 2

    print(json.dumps(result, ensure_ascii=False))
    # tenants > 0 + (drafts + published) > 0 이면 정상 동작
    if result.get("errors", 0) > 0:
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
