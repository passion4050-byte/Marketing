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

    headers = {"Authorization": f"Bearer {SUPABASE_KEY}", "apikey": SUPABASE_KEY}
    try:
        with httpx.Client(timeout=10) as client:
            # Round 81 (2026-06-23) — split-brain 수정 + 진료과(domain_category) 정밀 매칭.
            #   ① UI 토글은 learned_insights.applied 에 씀(기존 applied_insights 테이블과 desync).
            #   ② 매칭은 같은 진료과끼리만 — 안과 인사이트는 안과 병원에만, 모발이식은 모발이식에만.
            #      (tenant_id 단순 매칭이면 같은 진료과 타 병원이 혜택 못 봄 / NULL 전역이면 noise.)
            #   ③ learned_insights 엔 title/summary 컬럼 없음 → 실재 컬럼(notes/keyword) 사용.
            #   1) tenant 의 진료과 조회
            t_r = client.get(
                f"{SUPABASE_URL}/rest/v1/tenants",
                params={"id": f"eq.{tenant_id}", "select": "domain_category"},
                headers=headers,
            )
            if t_r.status_code != 200:
                return None
            t_rows = t_r.json()
            category = (t_rows[0].get("domain_category") if t_rows else None) or ""
            category = category.strip()
            if not category:
                return None
            # 2) 같은 진료과의 적용된(applied) 인사이트
            # 🔴 Round 146 (2026-08-15) — null 포함 매칭 제거.
            #   기존 or=(eq.{cat}, is.null) 은 "전역 자동패턴" 의도였으나, 실측상
            #   category=null 로 저장된 경쟁사 인사이트들(안과 bnviit 등)이 이 조건을
            #   타고 **전 진료과 프롬프트에 무차별 주입**됐음(안과 패턴이 피부과 글에).
            #   같은 진료과만 매칭. 전역 패턴이 필요하면 category 를 명시적 값
            #   ('전역')으로 저장하는 별도 규약을 만들 것 — 조용한 null 포함은 금지.
            #   + 정렬 미지정이라 어떤 5개가 주입되는지 비결정적이던 문제도 고정
            #   (최신 적용 순).
            r = client.get(
                f"{SUPABASE_URL}/rest/v1/learned_insights",
                params={
                    "applied": "eq.true",
                    "domain_category": f"eq.{category}",
                    "select": "id,source_domain,keyword,patterns,notes",
                    "order": "applied_at.desc",
                    "limit": str(max_count),
                },
                headers=headers,
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
