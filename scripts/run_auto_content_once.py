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
    # Round 81 — 부분 성공은 성공으로 처리. 1건이라도 생성되면 exit 0.
    #   (Gemini 무료 quota 429 / 가끔 malformed JSON 으로 일부 글이 실패해도
    #    나머지가 생성됐으면 워크플로를 '전체 실패'로 표시하지 않음.)
    produced = result.get("drafts", 0) + result.get("published", 0)
    errors = result.get("errors", 0)
    if produced == 0 and errors > 0:
        print(f"ERROR: 생성 0건 + 실패 {errors}건 — 전체 실패", file=sys.stderr)
        return 3
    if errors > 0:
        print(f"WARNING: {errors}건 실패했지만 {produced}건 생성됨 — 부분 성공(정상 종료)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
