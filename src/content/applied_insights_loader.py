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
            # Round 81 (2026-06-23) — split-brain 버그 수정.
            #   기존엔 applied_insights(is_active) 테이블을 읽었으나, UI 토글은
            #   learned_insights.applied 에 씀 → 영원히 desync(엔진은 0으로 봄).
            #   또한 learned_insights 엔 title/summary 컬럼이 없음(실재: notes/keyword).
            #   → UI 가 쓰는 applied 컬럼을 직접, 실재 컬럼으로 단일 쿼리.
            #   tenant 전용(tenant_id=X) + 글로벌(tenant_id IS NULL) 인사이트 모두 포함.
            r = client.get(
                f"{SUPABASE_URL}/rest/v1/learned_insights",
                params={
                    "applied": "eq.true",
                    "or": f"(tenant_id.eq.{tenant_id},tenant_id.is.null)",
                    "select": "id,source_domain,keyword,patterns,notes",
                    "limit": str(max_count),
                },
                headers={
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "apikey": SUPABASE_KEY,
                },
            )
            if r.status_code != 200:
                return None
            insights = r.json()
            if not insights:
                return None

            # patterns 는 {"scope","per_url":[{h2_count,word_count,image_count,
            #   table_count,ul_ol_count,...}]} dict → per_url 평균을 actionable 가이드로.
            def _avg(rows, key):
                vals = [
                    row.get(key, 0)
                    for row in rows
                    if isinstance(row, dict) and isinstance(row.get(key), (int, float))
                ]
                return round(sum(vals) / len(vals)) if vals else 0

            lines = ["--- 학습 인사이트: 경쟁사 구조 분석 (이를 능가하는 콘텐츠 작성) ---"]
            for ins in insights:
                domain = (ins.get("source_domain") or "경쟁사").strip()
                keyword = (ins.get("keyword") or "").strip()
                notes = (ins.get("notes") or "").strip()
                patterns = ins.get("patterns")

                header = f"• 경쟁사 {domain}"
                if keyword:
                    header += f" (키워드: {keyword[:60]})"
                lines.append(header)
                if notes:
                    lines.append(f"  메모: {notes[:200]}")

                per_url = []
                if isinstance(patterns, dict):
                    per_url = patterns.get("per_url") or []
                elif isinstance(patterns, list):
                    per_url = patterns
                if per_url:
                    lines.append(
                        f"  {domain} 평균 구조 (URL {len(per_url)}개): "
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
