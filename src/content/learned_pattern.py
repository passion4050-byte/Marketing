"""Round 94 (2026-06-28) — Top 인용 콘텐츠 구조 패턴 자동 학습.

비즈니스 목표: 메디맵 콘텐츠가 AI 에 자주 인용되도록.

원리:
    1. 최근 30일 발행 글 + 같은 키워드의 mention 카운트 (proxy)
    2. Top 20% vs 나머지 의 구조 차이 (H2/표/목록/이미지/길이/FAQ schema) 분석
    3. 의미 있는 차이는 `learned_insights` 테이블에 자동 INSERT (source='auto_pattern')
    4. `generator.py` 가 적용 가능한 인사이트로 다음 cron 글 prompt 에 주입

기존 학습 사이클 (Round 71) 은 운영자 수동 등록. 이건 자동 발견 + 자동 등록.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import text

logger = logging.getLogger(__name__)


@dataclass
class StructureMetrics:
    body_len: int
    h2_count: int
    table_count: int
    list_count: int
    img_count: int
    has_faq_schema: bool


def _extract_metrics(body: str) -> StructureMetrics:
    """HTML body 에서 구조 메트릭 추출."""
    return StructureMetrics(
        body_len=len(body or ""),
        h2_count=len(re.findall(r"<h2[\s>]", body or "")),
        table_count=len(re.findall(r"<table[\s>]", body or "")),
        list_count=len(re.findall(r"<(ul|ol)[\s>]", body or "")),
        img_count=len(re.findall(r"<img[\s>]", body or "")),
        has_faq_schema="FAQPage" in (body or ""),
    )


def _avg(nums: list[float]) -> float:
    return sum(nums) / len(nums) if nums else 0.0


def analyze_patterns(session_factory) -> dict:
    """발행 콘텐츠 × 키워드 mention 분석 → top vs 나머지 패턴 차이.

    Returns:
        {
            'total_analyzed': int,
            'top_count': int,
            'rest_count': int,
            'metrics': {
                'top': {...avg...},
                'rest': {...avg...},
                'diff': {...% change...},
            },
            'insights': [str],  # 자동 발견된 패턴 자연어
        }
    """
    with session_factory() as s:
        # 발행 콘텐츠 (30일)
        rows = s.execute(
            text(
                """
                SELECT gc.id, gc.body, gc.keyword_text, gc.domain_category
                FROM generated_contents gc
                WHERE gc.status = 'published'
                  AND gc.channel = 'blog_html'
                  AND gc.published_at > NOW() - INTERVAL '30 days'
                  AND gc.body IS NOT NULL
                  AND length(gc.body) > 200
                """
            )
        ).mappings().all()
        if not rows:
            return {"total_analyzed": 0, "insights": []}

        # 키워드별 mention 카운트 (proxy — Round 88 함정 DC 로 content_id 직접 매칭 불가)
        kw_mentions = s.execute(
            text(
                """
                SELECT k.text AS keyword, COUNT(m.id) AS cnt
                FROM keywords k
                JOIN queries q ON q.keyword_id = k.id
                JOIN responses r ON r.query_id = q.id
                JOIN mentions m ON m.response_id = r.id
                WHERE q.requested_at > NOW() - INTERVAL '30 days'
                  AND m.is_target = true
                GROUP BY k.text
                """
            )
        ).mappings().all()
        kw_map = {r["keyword"]: r["cnt"] for r in kw_mentions}

    # 메트릭 + mention proxy
    enriched = [
        {
            "id": r["id"],
            "metrics": _extract_metrics(r["body"]),
            "mentions": kw_map.get(r["keyword_text"], 0),
            "category": r["domain_category"],
        }
        for r in rows
    ]
    enriched.sort(key=lambda x: x["mentions"], reverse=True)

    # Top 20% (최소 5개)
    top_n = max(5, len(enriched) // 5)
    top = enriched[:top_n]
    rest = enriched[top_n:]
    if not rest:
        return {"total_analyzed": len(enriched), "insights": []}

    # 평균 비교
    def avg_of(items: list[dict], field: str) -> float:
        return _avg([getattr(i["metrics"], field) for i in items])

    def pct_with_faq(items: list[dict]) -> float:
        return _avg([1.0 if i["metrics"].has_faq_schema else 0.0 for i in items])

    metrics_summary = {
        "top": {
            "avg_body_len": int(avg_of(top, "body_len")),
            "avg_h2": round(avg_of(top, "h2_count"), 1),
            "avg_table": round(avg_of(top, "table_count"), 1),
            "avg_list": round(avg_of(top, "list_count"), 1),
            "avg_img": round(avg_of(top, "img_count"), 1),
            "faq_pct": int(pct_with_faq(top) * 100),
        },
        "rest": {
            "avg_body_len": int(avg_of(rest, "body_len")),
            "avg_h2": round(avg_of(rest, "h2_count"), 1),
            "avg_table": round(avg_of(rest, "table_count"), 1),
            "avg_list": round(avg_of(rest, "list_count"), 1),
            "avg_img": round(avg_of(rest, "img_count"), 1),
            "faq_pct": int(pct_with_faq(rest) * 100),
        },
    }

    # 의미 있는 차이만 인사이트로 (≥ 15% 또는 절대값 차이)
    insights: list[str] = []
    t = metrics_summary["top"]
    r = metrics_summary["rest"]
    if t["avg_h2"] > r["avg_h2"] + 0.5:
        insights.append(
            f"H2 섹션 평균 {t['avg_h2']}개 (전체 평균 {r['avg_h2']}개) — 더 잘게 나눈 글이 인용 잘 받음"
        )
    if t["avg_table"] > r["avg_table"] + 0.3:
        insights.append(
            f"표 평균 {t['avg_table']}개 (전체 {r['avg_table']}개) — 표 추가 시 인용률↑"
        )
    if t["avg_list"] > r["avg_list"] + 0.5:
        insights.append(
            f"목록(ul/ol) 평균 {t['avg_list']}개 (전체 {r['avg_list']}개) — 체크리스트형 구조 권장"
        )
    if t["faq_pct"] > r["faq_pct"] + 10:
        insights.append(
            f"FAQPage schema {t['faq_pct']}% (전체 {r['faq_pct']}%) — FAQ 섹션 추가 시 인용률↑"
        )
    if t["avg_body_len"] > r["avg_body_len"] * 1.15:
        insights.append(
            f"본문 평균 {t['avg_body_len']}자 (전체 {r['avg_body_len']}자) — 더 긴 글이 우세"
        )
    if t["avg_img"] > r["avg_img"] + 0.5:
        insights.append(
            f"이미지 평균 {t['avg_img']}개 (전체 {r['avg_img']}개) — 시각 자료 추가 권장"
        )

    return {
        "total_analyzed": len(enriched),
        "top_count": len(top),
        "rest_count": len(rest),
        "metrics": metrics_summary,
        "insights": insights,
    }


def upsert_auto_pattern_insight(
    session_factory, analysis: dict, *, domain_category: Optional[str] = None
) -> Optional[int]:
    """분석 결과를 learned_insights 테이블에 자동 등록 (source='auto_pattern').

    UPSERT — 같은 source+domain_category 면 갱신, 없으면 INSERT.
    적용 토글은 default false (운영자가 검토 후 활성).
    """
    if not analysis.get("insights"):
        return None

    guidance = "\n".join(f"- {s}" for s in analysis["insights"])
    title = f"자동 발견 패턴 — Top 인용 콘텐츠 ({analysis.get('top_count', 0)}편 분석)"

    with session_factory() as s:
        # learned_insights 테이블 컬럼: title / category / guidance / domain_category / applied / source(?)
        # source 컬럼 없을 수 있으니 raw SQL 로 안전하게 INSERT (없으면 그냥 INSERT, 있으면 source 추가)
        try:
            row = s.execute(
                text(
                    """
                    INSERT INTO learned_insights
                        (title, category, guidance, domain_category, applied, source_url, created_at)
                    VALUES
                        (:title, :category, :guidance, :dom, false, 'internal://auto_pattern', NOW())
                    RETURNING id
                    """
                ),
                {
                    "title": title,
                    "category": "콘텐츠 구조 자동 학습",
                    "guidance": guidance,
                    "dom": domain_category,
                },
            ).fetchone()
            s.commit()
            insight_id = row[0] if row else None
            logger.info(
                "learned_pattern.inserted",
                insight_id=insight_id,
                insights_count=len(analysis["insights"]),
            )
            return insight_id
        except Exception as e:  # noqa: BLE001
            logger.warning("learned_pattern.insert_failed: %s", e)
            s.rollback()
            return None


def run_auto_learning(session_factory) -> dict:
    """엔트리포인트 — 분석 + 자동 등록.

    cron 또는 admin 페이지에서 호출:
        from src.content.learned_pattern import run_auto_learning
        result = run_auto_learning(SessionLocal)
    """
    analysis = analyze_patterns(session_factory)
    if analysis.get("total_analyzed", 0) < 10:
        logger.info(
            "learned_pattern.skip_too_few_data",
            total=analysis.get("total_analyzed", 0),
        )
        return {"skipped": True, "reason": "총 분석 글 10편 미만", **analysis}
    insight_id = upsert_auto_pattern_insight(session_factory, analysis)
    return {
        "skipped": False,
        "insight_id": insight_id,
        **analysis,
    }
