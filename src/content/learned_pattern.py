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
        # 발행 콘텐츠 (30일) — Round 96 hotfix:
        #   domain_category 는 tenants 테이블에 있음. JOIN 으로 가져와야.
        rows = s.execute(
            text(
                """
                SELECT gc.id, gc.body, gc.keyword_text, t.domain_category
                FROM generated_contents gc
                LEFT JOIN tenants t ON t.id = gc.tenant_id
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
    """분석 결과를 learned_insights 테이블에 자동 등록.

    Round 96 hotfix — 실제 learned_insights 컬럼 정합:
        id / source_url(NN) / source_domain / source_tier / domain_category / keyword /
        tenant_id / patterns(jsonb NN) / notes / applied / applied_at / created_at
    source_url = 'internal://auto_pattern' 으로 자동 패턴 임을 마킹.
    patterns jsonb = metrics 전체 + insights 리스트 저장.
    notes = 자연어 요약 (한국어 인사이트 줄바꿈).
    """
    import json as _json
    import traceback as _tb

    if not analysis.get("insights"):
        logger.info("learned_pattern.no_insights — top vs rest 차이 미발견")
        return None

    notes_text = "\n".join(f"- {s}" for s in analysis["insights"])
    patterns_payload = {
        "type": "auto_pattern",
        "title": f"자동 발견 패턴 — Top 인용 콘텐츠 ({analysis.get('top_count', 0)}편 분석)",
        "top_count": analysis.get("top_count", 0),
        "rest_count": analysis.get("rest_count", 0),
        "total_analyzed": analysis.get("total_analyzed", 0),
        "metrics": analysis.get("metrics", {}),
        "insights": analysis.get("insights", []),
    }

    with session_factory() as s:
        try:
            row = s.execute(
                text(
                    """
                    INSERT INTO learned_insights
                        (source_url, source_domain, source_tier, domain_category,
                         patterns, notes, applied, created_at)
                    VALUES
                        ('internal://auto_pattern', 'internal', 'AUTO', :dom,
                         CAST(:patterns_json AS jsonb), :notes, false, NOW())
                    RETURNING id
                    """
                ),
                {
                    "dom": domain_category,
                    "patterns_json": _json.dumps(patterns_payload, ensure_ascii=False),
                    "notes": notes_text,
                },
            ).fetchone()
            s.commit()
            insight_id = row[0] if row else None
            logger.info(
                "learned_pattern.inserted insight_id=%s insights=%d",
                insight_id, len(analysis["insights"]),
            )
            return insight_id
        except Exception as e:  # noqa: BLE001
            # Round 96 hotfix — silent except 가 함정 흡수. traceback 명시 노출.
            logger.error("learned_pattern.insert_failed: %s\n%s", e, _tb.format_exc())
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
