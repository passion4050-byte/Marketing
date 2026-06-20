"""
Round 62 (2026-06-01) — 학습 인사이트 prompt injection 로더.

cron 의 prompt builder 가 호출:
  - tenant 가 지정된 경우 → 그 tenant 에 적용 중인 insight 의 patterns 를 가져옴
  - 메디맵 자사 tenant 면 자사용 insight, 클라이언트면 해당 클라이언트 insight

반환 형식: prompt 에 inject 할 수 있는 multi-line string.
"""
from __future__ import annotations

import os
from typing import Optional

import httpx

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
SUPABASE_KEY = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()


def load_applied_insights_block(tenant_id: int, max_count: int = 5) -> Optional[str]:
    """tenant 에 적용 중인 learned_insights 의 patterns 를 prompt block 으로 변환.

    Returns:
        prompt 에 inject 할 수 있는 string (예: "--- 학습된 인사이트 ---\\n...")
        또는 적용된 게 없으면 None.
    """
    if not (SUPABASE_URL and SUPABASE_KEY):
        return None

    try:
        with httpx.Client(timeout=10) as client:
            # 1. tenant 에 적용 중인 insight_id 목록
            applied_r = client.get(
                f"{SUPABASE_URL}/rest/v1/applied_insights",
                params={
                    "tenant_id": f"eq.{tenant_id}",
                    "is_active": "eq.true",
                    "select": "insight_id",
                    "order": "applied_at.desc",
                    "limit": str(max_count),
                },
                headers={
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "apikey": SUPABASE_KEY,
                },
            )
            if applied_r.status_code != 200:
                return None
            insight_ids = [row["insight_id"] for row in applied_r.json()]
            if not insight_ids:
                return None

            # 2. 해당 insight 의 patterns / title / summary
            insights_r = client.get(
                f"{SUPABASE_URL}/rest/v1/learned_insights",
                params={
                    "id": f"in.({','.join(map(str, insight_ids))})",
                    "select": "id,title,summary,patterns",
                },
                headers={
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "apikey": SUPABASE_KEY,
                },
            )
            if insights_r.status_code != 200:
                return None
            insights = insights_r.json()
            if not insights:
                return None

            # 3. prompt block 조립
            lines = ["--- 적용된 학습 인사이트 (콘텐츠에 반영 필수) ---"]
            for ins in insights:
                title = (ins.get("title") or "").strip()
                summary = (ins.get("summary") or "").strip()
                patterns = ins.get("patterns")
                if title:
                    lines.append(f"• {title}")
                if summary:
                    lines.append(f"  요약: {summary[:200]}")
                if patterns and isinstance(patterns, list):
                    for p in patterns[:3]:
                        if isinstance(p, str):
                            lines.append(f"  - {p[:150]}")
                        elif isinstance(p, dict):
                            note = p.get("note") or p.get("description") or ""
                            if note:
                                lines.append(f"  - {note[:150]}")
            lines.append("--- 위 인사이트의 톤·구조·키워드를 본문에 자연스럽게 반영하세요 ---")
            return "\n".join(lines)
    except Exception:  # noqa: BLE001
        return None
