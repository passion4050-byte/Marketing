"""learned_insights_loader — Round 38 Phase 2 (2026-05-31).

learned_insights 테이블에서 applied=true 인 인사이트를 카테고리별로 집계 →
자연어 가이드 텍스트 생성 → generator.py 의 references_block 에 주입.

연결 흐름:
    /admin/competitors 에서 [전체 분석 & 반영] 클릭
        ↓
    learned_insights INSERT (scope='domain', patterns.diagnosis/recommendations)
        ↓
    /admin/learned-insights 에서 [적용중] toggle (applied=true)
        ↓
    매 발행 cron → 이 loader → tenant.domain_category 별 권장사항 자연어 prompt 주입
"""
from __future__ import annotations

import json
import logging
import os
from collections import Counter, defaultdict
from typing import Optional

logger = logging.getLogger(__name__)


def _fetch_applied_insights() -> list[dict]:
    """Supabase REST 로 applied=true 인 learned_insights 가져옴.

    DATABASE_URL/SQLAlchemy 없는 cron 환경에서도 동작하도록 REST 사용.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (url and key):
        return []
    try:
        import httpx
    except ImportError:
        return []
    try:
        with httpx.Client(timeout=10) as client:
            r = client.get(
                f"{url}/rest/v1/learned_insights",
                params={
                    "select": "domain_category,source_domain,source_tier,patterns,keyword",
                    "applied": "eq.true",
                },
                headers={"apikey": key, "Authorization": f"Bearer {key}"},
            )
            if r.status_code != 200:
                logger.warning("learned_insights GET status=%s", r.status_code)
                return []
            return r.json() or []
    except Exception as e:  # noqa: BLE001
        logger.exception("learned_insights fetch 실패: %s", e)
        return []


def build_guidance_by_category() -> dict[str, str]:
    """domain_category → 자연어 prompt 가이드 dict 반환.

    같은 카테고리에 여러 도메인 인사이트가 누적되면 권장사항을 집계 + 빈도 기반 우선순위.
    예: 안과 카테고리에 3개 도메인 분석 누적 → 공통 권장 추출.
    """
    insights = _fetch_applied_insights()
    if not insights:
        return {}

    # 카테고리별로 모음
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for row in insights:
        cat = row.get("domain_category") or "기타"
        by_cat[cat].append(row)

    result: dict[str, str] = {}
    for cat, rows in by_cat.items():
        # 모든 권장사항 누적 → Counter 로 빈도 기반 정렬
        rec_counter: Counter[str] = Counter()
        # 평균 지표 누적
        word_counts: list[float] = []
        h2_counts: list[float] = []
        faq_rates: list[float] = []
        medical_rates: list[float] = []
        source_domains: list[str] = []

        for row in rows:
            patterns = row.get("patterns")
            if isinstance(patterns, str):
                try:
                    patterns = json.loads(patterns)
                except Exception:
                    patterns = {}
            if not isinstance(patterns, dict):
                continue
            domain = row.get("source_domain")
            if domain:
                source_domains.append(domain)
            recs = patterns.get("recommendations") or []
            for rec in recs:
                if isinstance(rec, str) and rec.strip():
                    rec_counter[rec.strip()] += 1
            summary = patterns.get("summary") or {}
            if isinstance(summary, dict):
                if isinstance(summary.get("avg_word_count"), (int, float)):
                    word_counts.append(float(summary["avg_word_count"]))
                if isinstance(summary.get("avg_h2_count"), (int, float)):
                    h2_counts.append(float(summary["avg_h2_count"]))
                if isinstance(summary.get("faq_schema_rate"), (int, float)):
                    faq_rates.append(float(summary["faq_schema_rate"]))
                if isinstance(summary.get("medical_schema_rate"), (int, float)):
                    medical_rates.append(float(summary["medical_schema_rate"]))

        # 자연어 prompt 빌드
        lines: list[str] = []
        lines.append(f"[학습 인사이트 — {cat} 카테고리, 누적 {len(rows)}개 도메인 분석]")
        if source_domains:
            uniq = sorted(set(source_domains))
            lines.append(f"분석 출처: {', '.join(uniq[:5])}" + (f" 외 {len(uniq)-5}" if len(uniq) > 5 else ""))
        if word_counts:
            avg_w = sum(word_counts) / len(word_counts)
            lines.append(f"- AI 인용 성공 콘텐츠 평균 본문: {avg_w:.0f} 단어")
        if h2_counts:
            avg_h = sum(h2_counts) / len(h2_counts)
            lines.append(f"- 평균 H2 구조: {avg_h:.1f}개")
        if faq_rates:
            avg_f = sum(faq_rates) / len(faq_rates)
            if avg_f >= 0.3:
                lines.append(
                    f"- FAQ schema 사용률 {avg_f*100:.0f}% — 본문에 FAQ 섹션 (3~5문항) 포함 권장"
                )
        if medical_rates:
            avg_m = sum(medical_rates) / len(medical_rates)
            if avg_m >= 0.3:
                lines.append(
                    f"- Medical schema 사용률 {avg_m*100:.0f}% — 시술/병원 정보 명시 권장"
                )

        if rec_counter:
            lines.append("권장 변경 (빈도순 top 3):")
            for rec, cnt in rec_counter.most_common(3):
                # 빈도 표시는 1보다 큰 경우만
                suffix = f" (재발견 {cnt}회)" if cnt > 1 else ""
                lines.append(f"  • {rec}{suffix}")

        lines.append(
            "※ 위는 경쟁사/권위 사이트 분석에서 도출. 메디맵 차별점(시술 사례·후기·실측 데이터)을 우선하되 구조 권장을 반영."
        )
        result[cat] = "\n".join(lines)

    return result


def get_guidance_for_category(domain_category: Optional[str]) -> str:
    """tenant.domain_category 1개에 해당하는 가이드 1줄 반환. 없으면 빈 문자열."""
    if not domain_category:
        return ""
    all_guides = build_guidance_by_category()
    return all_guides.get(domain_category, "")


def get_all_guidance_for_prompt() -> str:
    """모든 카테고리 가이드를 합쳐 prompt 주입용 단일 string 반환."""
    all_guides = build_guidance_by_category()
    if not all_guides:
        return ""
    return "\n\n".join(all_guides.values())
