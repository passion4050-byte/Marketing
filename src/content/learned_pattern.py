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
from collections import Counter
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

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

        # Round 138 (C 고도화) — 성공 신호에 '출처 인용'(우리 콘텐츠가 AI 근거로 인용)을 결합.
        #   브랜드 언급(kw_map)은 proxy일 뿐, GEO의 실지표는 출처 인용. 출처 인용이 있으면 크게
        #   가중(×10)해 그 키워드 구조를 우선 학습. 아직 0이면 언급으로 자연 폴백(무회귀).
        kw_source = s.execute(
            text(
                """
                SELECT k.text AS keyword, COUNT(*) AS cnt
                FROM keywords k
                JOIN queries q ON q.keyword_id = k.id
                JOIN responses r ON r.query_id = q.id
                WHERE q.requested_at > NOW() - INTERVAL '30 days'
                  AND (
                    r.source_domains::text ILIKE '%wecircle%'
                    OR r.source_domains::text ILIKE '%medimap%'
                    OR r.cited_urls::text ILIKE '%wecircle%'
                    OR r.cited_urls::text ILIKE '%medimap%'
                  )
                GROUP BY k.text
                """
            )
        ).mappings().all()
        src_map = {r["keyword"]: r["cnt"] for r in kw_source}

    # 메트릭 + mention proxy
    enriched = [
        {
            "id": r["id"],
            "metrics": _extract_metrics(r["body"]),
            # 결합 점수: 출처 인용 ×10(PMF 실지표) + 브랜드 언급(폴백). 필드명은 하위호환 유지.
            "mentions": src_map.get(r["keyword_text"], 0) * 10 + kw_map.get(r["keyword_text"], 0),
            "category": r["domain_category"],
        }
        for r in rows
    ]
    enriched.sort(key=lambda x: x["mentions"], reverse=True)

    # Round 96 hotfix 3 — mention > 0 인 글만 Top 후보 (mention 0 글이 평균 희석 방지).
    candidates = [e for e in enriched if e["mentions"] > 0]
    if len(candidates) >= 3:
        # Top = mention 받은 글 전부 / Rest = mention 0 인 나머지
        top = candidates
        rest = [e for e in enriched if e["mentions"] == 0]
        logger.info(
            "learned_pattern.split: top=%d (mention>0), rest=%d (mention=0)",
            len(top), len(rest),
        )
    else:
        # mention 받은 글 < 3개 → 전체 정렬 후 상위 20%
        top_n = max(3, len(enriched) // 5)
        top = enriched[:top_n]
        rest = enriched[top_n:]
        logger.info(
            "learned_pattern.fallback_split: top_n=%d (mention 부족)", top_n,
        )

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

    # Round 96 hotfix 3 — 평균 값 로그 (다음 진단 쉽게)
    logger.info(
        "learned_pattern.metrics: TOP h2=%s table=%s list=%s img=%s faq=%s body=%s | REST h2=%s table=%s list=%s img=%s faq=%s body=%s",
        metrics_summary["top"]["avg_h2"], metrics_summary["top"]["avg_table"],
        metrics_summary["top"]["avg_list"], metrics_summary["top"]["avg_img"],
        metrics_summary["top"]["faq_pct"], metrics_summary["top"]["avg_body_len"],
        metrics_summary["rest"]["avg_h2"], metrics_summary["rest"]["avg_table"],
        metrics_summary["rest"]["avg_list"], metrics_summary["rest"]["avg_img"],
        metrics_summary["rest"]["faq_pct"], metrics_summary["rest"]["avg_body_len"],
    )

    # 의미 있는 차이만 인사이트로 (임계값 완화 — 작은 표본 대응)
    insights: list[str] = []
    t = metrics_summary["top"]
    r = metrics_summary["rest"]
    if t["avg_h2"] > r["avg_h2"] + 0.3:
        insights.append(
            f"H2 섹션 평균 {t['avg_h2']}개 (전체 {r['avg_h2']}개) — 더 잘게 나눈 글이 인용 잘 받음"
        )
    elif t["avg_h2"] < r["avg_h2"] - 0.3:
        insights.append(
            f"H2 섹션 평균 {t['avg_h2']}개 (전체 {r['avg_h2']}개) — 짧은 구조가 우세, H2 줄이기 권장"
        )
    if t["avg_table"] > r["avg_table"] + 0.2:
        insights.append(
            f"표 평균 {t['avg_table']}개 (전체 {r['avg_table']}개) — 표 추가 시 인용률↑"
        )
    if t["avg_list"] > r["avg_list"] + 0.3:
        insights.append(
            f"목록(ul/ol) 평균 {t['avg_list']}개 (전체 {r['avg_list']}개) — 체크리스트형 구조 권장"
        )
    if t["faq_pct"] > r["faq_pct"] + 5:
        insights.append(
            f"FAQPage schema {t['faq_pct']}% (전체 {r['faq_pct']}%) — FAQ 섹션 추가 시 인용률↑"
        )
    if t["avg_body_len"] > r["avg_body_len"] * 1.10:
        insights.append(
            f"본문 평균 {t['avg_body_len']}자 (전체 {r['avg_body_len']}자) — 더 긴 글이 우세"
        )
    elif t["avg_body_len"] < r["avg_body_len"] * 0.90:
        insights.append(
            f"본문 평균 {t['avg_body_len']}자 (전체 {r['avg_body_len']}자) — 짧은 글이 더 인용됨"
        )
    if t["avg_img"] > r["avg_img"] + 0.3:
        insights.append(
            f"이미지 평균 {t['avg_img']}개 (전체 {r['avg_img']}개) — 시각 자료 추가 권장"
        )
    # 임계값 미달 시에도 기본 베이스라인 인사이트 등록 (분석은 됐다는 증거)
    if not insights:
        insights.append(
            f"Top {len(top)}편 평균 구조 — H2 {t['avg_h2']}/표 {t['avg_table']}/목록 {t['avg_list']}/이미지 {t['avg_img']}/FAQ {t['faq_pct']}%/본문 {t['avg_body_len']}자. 전체 평균과 차이 미미 — 더 많은 데이터 누적 후 재분석"
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


def _url_path(u: str) -> str:
    """final_url 에서 path(+query) 만 추출 — 어떤 '콘텐츠'가 인용됐는지 표시용."""
    try:
        pr = urlparse(u)
        q = f"?{pr.query}" if pr.query else ""
        return ((pr.path or "/") + q)[:100]
    except Exception:  # noqa: BLE001
        return (u or "")[:100]


def analyze_competitor_citations(session_factory) -> dict:
    """Round 104 ①-c — 경쟁사(비자사) 인용 final_url 경로를 진료과별 집계.

    "AI 가 이 진료과에서 자주 인용하는 경쟁사 콘텐츠(주제·URL)" 를 도출 →
    learned_insights.patterns.recommendations 로 등록 → 적용 시 생성 prompt 주입.

    Returns: { domain_category: {total_cites, recommendations[], top_keywords[], top_urls[]} }
    """
    with session_factory() as s:
        rows = s.execute(
            text(
                """
                SELECT t.domain_category AS category,
                       kw.text AS keyword,
                       sd->>'domain' AS domain,
                       sd->>'final_url' AS url,
                       COUNT(*) AS cites
                FROM responses r
                JOIN queries q ON q.id = r.query_id
                JOIN keywords kw ON kw.id = q.keyword_id
                JOIN tenants t ON t.id = kw.tenant_id
                CROSS JOIN LATERAL jsonb_array_elements(r.source_domains::jsonb) sd
                WHERE q.engine <> 'stub'
                  AND r.created_at > NOW() - INTERVAL '30 days'
                  AND r.source_domains IS NOT NULL
                  AND COALESCE(sd->>'is_self', 'false') = 'false'
                  AND sd->>'final_url' IS NOT NULL
                  AND sd->>'domain' IS NOT NULL
                  AND t.domain_category IS NOT NULL
                GROUP BY t.domain_category, kw.text, sd->>'domain', sd->>'final_url'
                """
            )
        ).mappings().all()

    by_cat: dict[str, dict] = {}
    for r in rows:
        cat = r["category"]
        c = by_cat.setdefault(cat, {"kw": Counter(), "urls": [], "total": 0})
        cites = int(r["cites"])
        c["kw"][r["keyword"]] += cites
        c["total"] += cites
        c["urls"].append(
            {
                "domain": r["domain"],
                "path": _url_path(r["url"]),
                "url": r["url"],
                "keyword": r["keyword"],
                "cites": cites,
            }
        )

    result: dict[str, dict] = {}
    for cat, c in by_cat.items():
        if c["total"] < 3:  # 표본 너무 적으면 스킵
            continue
        top_urls = sorted(c["urls"], key=lambda x: x["cites"], reverse=True)[:8]
        top_kw = c["kw"].most_common(6)
        kw_str = ", ".join(f"'{k}'({n}회)" for k, n in top_kw)
        recs = [
            f"AI 가 {cat} 진료과에서 자주 인용하는 세부 주제(경쟁사 콘텐츠): {kw_str} "
            f"— 각 주제에 깊이 있는 전용 글을 작성하면 같은 키워드 인용 확률↑",
        ]
        for u in top_urls[:2]:
            recs.append(
                f"경쟁사 인용 콘텐츠 예시 — {u['domain']}{u['path']} "
                f"({u['cites']}회·'{u['keyword']}'): 유사 주제·깊이의 글로 대응"
            )
        result[cat] = {
            "total_cites": c["total"],
            "recommendations": recs,
            "top_keywords": [{"keyword": k, "cites": n} for k, n in top_kw],
            "top_urls": top_urls,
        }
    return result


def upsert_competitor_citation_insights(session_factory, by_cat: dict) -> list[int]:
    """경쟁사 인용 경로 분석을 learned_insights 에 진료과별 등록(applied=false).

    파일업 방지 — 직전 미적용(applied=false) 경쟁사-인용 AUTO 행은 갱신 전 삭제.
    운영자가 [적용중] 토글한 행(applied=true)은 보존.
    """
    import json as _json
    import traceback as _tb

    ids: list[int] = []
    if not by_cat:
        return ids
    with session_factory() as s:
        try:
            s.execute(
                text(
                    "DELETE FROM learned_insights "
                    "WHERE source_url = 'internal://competitor_citations' AND applied = false"
                )
            )
            for cat, data in by_cat.items():
                payload = {
                    "type": "competitor_citations",
                    "title": f"경쟁사 인용 경로 학습 — {cat} ({data['total_cites']}건 인용 분석)",
                    "recommendations": data["recommendations"],
                    "top_keywords": data["top_keywords"],
                    "top_urls": data["top_urls"],
                }
                notes = "\n".join(f"- {r}" for r in data["recommendations"])
                row = s.execute(
                    text(
                        """
                        INSERT INTO learned_insights
                            (source_url, source_domain, source_tier, domain_category,
                             patterns, notes, applied, created_at)
                        VALUES
                            ('internal://competitor_citations', 'internal', 'AUTO', :dom,
                             CAST(:patterns_json AS jsonb), :notes, false, NOW())
                        RETURNING id
                        """
                    ),
                    {
                        "dom": cat,
                        "patterns_json": _json.dumps(payload, ensure_ascii=False),
                        "notes": notes,
                    },
                ).fetchone()
                if row:
                    ids.append(row[0])
            s.commit()
            logger.info("competitor_citations.inserted categories=%d ids=%s", len(ids), ids)
        except Exception as e:  # noqa: BLE001
            logger.error("competitor_citations.insert_failed: %s\n%s", e, _tb.format_exc())
            s.rollback()
    return ids


def run_auto_learning(session_factory) -> dict:
    """엔트리포인트 — 분석 + 자동 등록.

    cron 또는 admin 페이지에서 호출:
        from src.content.learned_pattern import run_auto_learning
        result = run_auto_learning(SessionLocal)

    Round 104 ①-c — 경쟁사 인용 경로 학습도 함께 실행(자사 콘텐츠 양과 무관).
    """
    import traceback as _tb

    # ①-c 경쟁사 인용 경로 학습 — self-content 부족해도 항상 실행
    competitor: dict = {}
    competitor_ids: list[int] = []
    try:
        competitor = analyze_competitor_citations(session_factory)
        competitor_ids = upsert_competitor_citation_insights(session_factory, competitor)
    except Exception as e:  # noqa: BLE001
        logger.error("competitor_citations.run_failed: %s\n%s", e, _tb.format_exc())

    base = {
        "competitor_insight_ids": competitor_ids,
        "competitor_categories": list(competitor.keys()),
    }

    analysis = analyze_patterns(session_factory)
    if analysis.get("total_analyzed", 0) < 10:
        logger.info(
            "learned_pattern.skip_too_few_data total=%d",
            analysis.get("total_analyzed", 0),
        )
        return {"skipped": True, "reason": "총 분석 글 10편 미만", **base, **analysis}
    insight_id = upsert_auto_pattern_insight(session_factory, analysis)
    return {
        "skipped": False,
        "insight_id": insight_id,
        **base,
        **analysis,
    }
