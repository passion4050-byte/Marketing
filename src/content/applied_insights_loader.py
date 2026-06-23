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
                    "select": "id,title,summary,patterns,source_domain",
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

            # 3. prompt block 조립.
            #   Round 81 (2026-06-23) — patterns 는 {"scope","per_url":[{h2_count,word_count,
            #   image_count,table_count,ul_ol_count,...}]} dict. 기존 코드는 list 만 처리해
            #   아무것도 주입 안 됨. → per_url 구조 메트릭을 평균내 actionable 가이드로 변환.
            def _avg(rows, key):
                vals = [
                    r.get(key, 0)
                    for r in rows
                    if isinstance(r, dict) and isinstance(r.get(key), (int, float))
                ]
                return round(sum(vals) / len(vals)) if vals else 0

            lines = ["--- 학습 인사이트: 경쟁사 구조 분석 (이를 능가하는 콘텐츠 작성) ---"]
            for ins in insights:
                domain = (ins.get("source_domain") or "경쟁사").strip()
                title = (ins.get("title") or "").strip()
                summary = (ins.get("summary") or "").strip()
                patterns = ins.get("patterns")

                if title:
                    lines.append(f"• {title}")
                else:
                    lines.append(f"• 경쟁사 {domain} 구조 분석")
                if summary:
                    lines.append(f"  요약: {summary[:200]}")

                per_url = []
                if isinstance(patterns, dict):
                    per_url = patterns.get("per_url") or []
                elif isinstance(patterns, list):
                    per_url = patterns
                if per_url:
                    lines.append(
                        f"  경쟁사 {domain} 평균 구조 (URL {len(per_url)}개): "
                        f"H2 {_avg(per_url, 'h2_count')}개 · 본문 {_avg(per_url, 'word_count')}단어 · "
                        f"이미지 {_avg(per_url, 'image_count')}장 · 표 {_avg(per_url, 'table_count')}개 · "
                        f"리스트 {_avg(per_url, 'ul_ol_count')}개"
                    )

            lines.append(
                "--- 위 경쟁사 구조를 능가하도록: H2는 자연어 질문 5개 이상, 표/체크리스트 1개 이상, "
                "정의형 첫 문장, 이미지 적정 배치로 더 깊고 구조화된 글을 작성하세요 ---"
            )
            return "\n".join(lines)
    except Exception:  # noqa: BLE001
        return None
