"""Round 171 (2026-08-22) — LLM 측정 호출 건강 점검 (실패 시 워크플로 빨간불).

배경: 2026-08-19~22 나흘간 Anthropic 크레딧 소진으로 claude measurement 호출이
하루 80건 전량 실패했는데 **아무도 몰랐다**. queries/responses 에는 행이 안 남고
llm_call_logs 에만 에러가 쌓여서, 대시보드는 그냥 "수치가 줄어든 것"처럼 보였다.
같은 사고가 8/12~8/13(claude·openai), 8/15~8/17(gemini·openai)에도 있었다.
매번 며칠씩 데이터가 비었고 병원 리포트가 그만큼 과소집계됐다.

이 스크립트는 전날 measurement 호출을 검사해 아래 중 하나라도 걸리면 exit 1 →
GitHub Actions 가 빨간불이 된다.
  A) 특정 provider 의 실패율이 FAIL_RATIO 초과 (호출이 MIN_CALLS 이상일 때)
  B) 최근 7일간 돌던 provider 가 이번 창에서 호출 0건 (조용히 사라진 경우)

크레딧 소진 메시지는 그대로 출력하므로 Actions 요약만 보면 원인이 바로 보인다.

환경변수: DATABASE_URL(필수)
  선택: LOOKBACK_HOURS(26) · FAIL_RATIO(0.2) · MIN_CALLS(10) · CHANNEL(measurement)
"""
from __future__ import annotations

import logging
import os
import sys

from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("llm-health")

WINDOW_SQL = """
SELECT provider,
       count(*)::int AS total,
       count(*) FILTER (WHERE status <> 'success')::int AS failed,
       max(left(error_msg, 400)) FILTER (WHERE status <> 'success') AS sample_err
FROM llm_call_logs
WHERE channel = :ch
  AND called_at >= now() - make_interval(hours => :hours)
GROUP BY 1 ORDER BY 1
"""

BASELINE_SQL = """
SELECT DISTINCT provider
FROM llm_call_logs
WHERE channel = :ch
  AND called_at >= now() - interval '7 days'
  AND called_at <  now() - make_interval(hours => :hours)
  AND status = 'success'
"""


def _f(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)).strip() or default)
    except ValueError:
        return default


def _i(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)).strip() or default)
    except ValueError:
        return default


def main() -> int:
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    hours = _i("LOOKBACK_HOURS", 26)
    fail_ratio = _f("FAIL_RATIO", 0.2)
    min_calls = _i("MIN_CALLS", 10)
    channel = os.getenv("CHANNEL", "measurement").strip() or "measurement"

    engine = create_engine(db_url, pool_pre_ping=True)
    with engine.connect() as conn:
        rows = conn.execute(text(WINDOW_SQL), {"ch": channel, "hours": hours}).fetchall()
        baseline = {r[0] for r in conn.execute(text(BASELINE_SQL), {"ch": channel, "hours": hours}).fetchall()}

    seen = {r.provider for r in rows}
    problems: list[str] = []
    lines: list[str] = [
        f"| provider | 호출 | 실패 | 실패율 | 판정 |",
        f"|---|---:|---:|---:|---|",
    ]

    for r in rows:
        ratio = r.failed / max(1, r.total)
        bad = r.total >= min_calls and ratio > fail_ratio
        verdict = "🔴 FAIL" if bad else "✅ OK"
        lines.append(f"| {r.provider} | {r.total} | {r.failed} | {100*ratio:.0f}% | {verdict} |")
        logger.info("%s: %s호출 · %s실패 (%.0f%%) %s", r.provider, r.total, r.failed, 100 * ratio, verdict)
        if bad:
            problems.append(f"{r.provider}: {r.failed}/{r.total} 실패 ({100*ratio:.0f}%)\n    {r.sample_err}")

    # B) 최근 7일간 돌던 provider 가 이번 창에서 사라진 경우
    for p in sorted(baseline - seen):
        lines.append(f"| {p} | 0 | — | — | 🔴 MISSING |")
        logger.error("%s: 최근 %s시간 호출 0건 — 최근 7일엔 정상 실행되던 provider", p, hours)
        problems.append(f"{p}: 최근 {hours}시간 호출 0건 (스케줄 중단 의심)")

    if not rows and not baseline:
        logger.warning("최근 7일 measurement 호출 자체가 없음 — 점검 대상 없음")
        return 0

    summary = os.getenv("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write(f"## LLM measurement 건강 점검 (최근 {hours}시간)\n\n")
            fh.write("\n".join(lines) + "\n\n")
            if problems:
                fh.write("### 🔴 문제\n\n")
                for p in problems:
                    fh.write(f"- {p}\n")
                fh.write("\n크레딧 소진이면 각 콘솔에서 충전 + **자동 충전(auto-reload) 설정**을 권장합니다.\n")
                fh.write("- Anthropic: https://console.anthropic.com/settings/billing\n")
                fh.write("- OpenAI: https://platform.openai.com/settings/organization/billing\n")
                fh.write("- Google AI Studio: https://aistudio.google.com/\n")
            else:
                fh.write("전 provider 정상.\n")

    if problems:
        logger.error("=== 점검 실패 %s건 ===", len(problems))
        for p in problems:
            logger.error("  %s", p)
        return 1

    logger.info("전 provider 정상")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
