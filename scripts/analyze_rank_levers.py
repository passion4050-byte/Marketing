"""Round 158 (2026-08-16) — 순위 레버 자동 분석 (3일 주기).

Round 157 실측에서 나온 인사이트의 자동화:
  "dear clinic 7.0위 · 이마 라인 교정 18.8위 · 부산 밝은 눈 안과 18.9위 —
   1페이지 진입 직전 키워드를 밀면 클릭이 처음으로 유의미해진다."

매 실행 (rank-lever-analysis.yml, 3일 주기 08:00 KST):
1. gsc_query_daily 최근 28일 → 검색어별 노출·순위 집계.
2. 레버 검출: 평균순위 POS_MIN~POS_MAX(기본 4~20) & 노출 >= MIN_IMPRESSIONS(기본 3).
   = 이미 구글이 관련성을 인정했고, 순위만 오르면 클릭이 생기는 검색어.
3. 검색어를 3단계로 귀속:
   a. 입점 병원(tenant alias) 또는 활성 키워드 풀과 매칭 & 미시딩
      → keywords 테이블에 자동 시딩 (해당 tenant 의 기존 키워드에서
        category/target_brand/market/lang 상속 — Round 155 시딩 규약).
      → scheduler 가 다음 발행 로테이션에서 자동으로 집어감.
   b. 기존 키워드/콘텐츠가 이미 커버 → 'covered' 기록만 (1회).
   c. 어느 입점 병원과도 매칭 불가 (미입점 진료과목/지역/서비스)
      → 운영자 이메일(NOTIFY_EMAIL)로 신규 영업/기획 후보 발송.
      → 같은 검색어는 EMAIL_SUPPRESS_DAYS(기본 14일) 내 재알림 억제.

이메일: Resend API (RESEND_API_KEY). 미설정 시 이메일만 생략하고 분석·시딩은 정상 수행.

env:
  DATABASE_URL(필수), RESEND_API_KEY, RESEND_FROM(기본 onboarding@resend.dev),
  NOTIFY_EMAIL(기본 passion4050@gmail.com),
  POS_MIN=4 POS_MAX=20 MIN_IMPRESSIONS=3 WINDOW_DAYS=28 EMAIL_SUPPRESS_DAYS=14
  DRY_RUN=1 이면 DB 쓰기·이메일 없이 분석 결과만 출력.
"""
from __future__ import annotations

import logging
import os
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine, text  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("rank-lever")

# run_measurement_batch._GENERIC_KOREAN_TOKENS 과 동기 유지 (Round 153 교훈:
# 진료과명·지역명은 절대 brand alias 가 아니다 — 여기서는 tenant 매칭 오탐 방지용).
GENERIC_TOKENS = {
    "잠실", "서울", "강남", "부산", "분당", "송파", "용산", "신촌",
    "병원", "의원", "클리닉", "센터", "본점", "지점", "강남구", "송파구",
    "피부과", "안과", "성형외과", "치과", "내과", "외과", "정형외과", "산부인과",
    "한의원", "한방병원", "이비인후과", "비뇨기과", "신경외과", "가정의학과",
    "clinic", "hospital", "korea", "seoul", "gangnam", "busan",
}


def norm(s: str) -> str:
    return re.sub(r"\s+", "", (s or "").lower())


def build_tenant_aliases(name: str, partner_slug: str | None) -> list[str]:
    """tenant 매칭용 alias — 2글자 이상 토큰, generic 제외."""
    aliases: set[str] = set()
    full = norm(name)
    if len(full) >= 2:
        aliases.add(full)
    for tok in re.split(r"[\s\-_/·]+", name or ""):
        t = norm(tok)
        if len(t) >= 2 and t not in {norm(g) for g in GENERIC_TOKENS}:
            aliases.add(t)
    if partner_slug and len(partner_slug) >= 3:
        aliases.add(norm(partner_slug))
    return sorted(aliases, key=len, reverse=True)


def translate_keyword(text: str, langs: list[str]) -> dict[str, str] | None:
    """Round 160 — 효율 키워드의 전 언어 복제용 번역 (검색어 트랜스크리에이션).

    직역이 아니라 그 언어 사용자가 실제로 입력할 검색어로 변환.
    ANTHROPIC_API_KEY 미설정/실패 시 None (복제만 생략 — 나머지 분석 무영향).
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key or not langs:
        return None
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
        lang_names = {
            "en": "English", "ja": "Japanese",
            "zh-Hans": "Simplified Chinese (mainland terms, e.g. 激光/种植牙)",
            "zh-Hant": "Traditional Chinese (Taiwan terms, e.g. 雷射/植牙)",
        }
        wanted = ", ".join(f'"{l}" ({lang_names.get(l, l)})' for l in langs)
        msg = client.messages.create(
            model=model,
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": (
                    "You localize Korean medical-tourism SEARCH KEYWORDS. "
                    "Rewrite the keyword as a natural search query a native speaker would type "
                    "(transcreation, not literal translation; keep it short like a real query).\n"
                    f'Keyword: "{text}"\n'
                    f"Target languages: {wanted}\n"
                    'Reply with ONLY a JSON object mapping lang code to keyword, e.g. {"en": "..."}'
                ),
            }],
        )
        raw = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()
        raw = raw[raw.find("{"): raw.rfind("}") + 1]
        import json as _json

        out = _json.loads(raw)
        return {k: str(v).strip() for k, v in out.items() if k in langs and str(v).strip()}
    except Exception as e:  # noqa: BLE001
        logger.warning("번역 실패 (%s): %s — 다국어 복제 생략", text, e)
        return None


def send_email(subject: str, html: str) -> bool:
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    to = os.getenv("NOTIFY_EMAIL", "passion4050@gmail.com").strip()
    sender = os.getenv("RESEND_FROM", "onboarding@resend.dev").strip()
    if not api_key:
        logger.warning("RESEND_API_KEY 미설정 — 이메일 생략 (분석·시딩은 정상 수행됨)")
        return False
    import requests

    resp = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"from": f"WECIRCLE GEO <{sender}>", "to": [to], "subject": subject, "html": html},
        timeout=30,
    )
    if resp.status_code >= 300:
        logger.error("Resend 발송 실패 %s: %s", resp.status_code, resp.text[:300])
        return False
    logger.info("이메일 발송 완료 → %s", to)
    return True


def main() -> int:
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    dry = os.getenv("DRY_RUN", "").strip() == "1"
    pos_min = float(os.getenv("POS_MIN", "4"))
    pos_max = float(os.getenv("POS_MAX", "20"))
    min_impr = int(os.getenv("MIN_IMPRESSIONS", "3"))
    window = int(os.getenv("WINDOW_DAYS", "28"))
    suppress_days = int(os.getenv("EMAIL_SUPPRESS_DAYS", "14"))

    engine = create_engine(db_url, pool_pre_ping=True)
    with engine.connect() as conn:
        levers = conn.execute(
            text(
                """
                SELECT query,
                       sum(impressions) AS impressions,
                       sum(clicks) AS clicks,
                       sum(position * impressions) / NULLIF(sum(impressions), 0) AS avg_pos
                FROM gsc_query_daily
                WHERE date >= current_date - :window
                GROUP BY query
                HAVING sum(impressions) >= :min_impr
                   AND sum(position * impressions) / NULLIF(sum(impressions), 0) BETWEEN :pos_min AND :pos_max
                ORDER BY sum(impressions) DESC
                """
            ),
            {"window": window, "min_impr": min_impr, "pos_min": pos_min, "pos_max": pos_max},
        ).fetchall()

        tenants = conn.execute(
            text("SELECT id, name, partner_slug, status FROM tenants")
        ).fetchall()
        keywords = conn.execute(
            text("SELECT id, tenant_id, text, category, target_brand, market, lang FROM keywords WHERE is_active = true")
        ).fetchall()
        contents = conn.execute(
            text(
                "SELECT keyword_text, title, tenant_id FROM generated_contents WHERE status = 'published'"
            )
        ).fetchall()
        recent_log = conn.execute(
            text(
                """
                SELECT query, action, max(created_at) AS last_at
                FROM rank_lever_log GROUP BY query, action
                """
            )
        ).fetchall()
        # Round 160 — 전 언어 복제 대상: 해외 상품 활성 tenant 의 언어 목록
        active_products = conn.execute(
            text(
                "SELECT tenant_id, lang FROM tenant_products "
                "WHERE market = 'overseas' AND status = 'active'"
            )
        ).fetchall()

    tenant_langs: dict[int, list[str]] = {}
    for r in active_products:
        tenant_langs.setdefault(int(r.tenant_id), []).append(str(r.lang))

    logged: dict[tuple[str, str], object] = {(r.query, r.action): r.last_at for r in recent_log}
    kw_norms = [(k, norm(k.text)) for k in keywords if k.text]
    content_norms = [(norm(c.keyword_text or ""), norm(c.title or ""), c.tenant_id) for c in contents]
    tenant_aliases = [
        (t, build_tenant_aliases(t.name or "", t.partner_slug)) for t in tenants
    ]

    seeded: list[str] = []
    covered: list[str] = []
    email_items: list[dict] = []
    # Round 160 — 효율(레버) 키워드의 전 언어 복제 대상 (tenant, 원문 키워드)
    multilang_targets: list[tuple[int, str]] = []
    multilang_done: list[str] = []

    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)

    with engine.begin() as conn:
        for row in levers:
            q, qn = row.query, norm(row.query)
            avg_pos = float(row.avg_pos or 0)
            impr = int(row.impressions or 0)

            # 1) 활성 키워드 풀에 이미 존재? (양방향 포함)
            kw_hit = next((k for k, kn in kw_norms if kn and (kn in qn or qn in kn)), None)
            # 2) 발행 콘텐츠가 이미 커버? (키워드 텍스트/제목 포함)
            content_hit = next(
                (c for c in content_norms if (c[0] and c[0] in qn) or (qn and qn in c[1])), None
            )
            # 3) 입점 병원 alias 매칭 (자사명 검색)
            tenant_hit = next(
                (t for t, aliases in tenant_aliases if any(a in qn for a in aliases)), None
            )

            if kw_hit is not None or content_hit is not None:
                # Round 160 — 커버된 레버 = 검증된 효율 키워드 → 전 언어 복제 후보
                _mt_tid = kw_hit.tenant_id if kw_hit is not None else (content_hit[2] if content_hit else None)
                if _mt_tid is not None and int(_mt_tid) in tenant_langs and (q, "seeded_multilang") not in logged:
                    multilang_targets.append((int(_mt_tid), q))
                # 이미 측정/커버 중 — 최초 1회만 기록 (레버 현황 대시보드용)
                if (q, "covered") not in logged:
                    if not dry:
                        conn.execute(
                            text(
                                """
                                INSERT INTO rank_lever_log (query, avg_position, impressions, action, detail, tenant_id, keyword_id)
                                VALUES (:q, :p, :i, 'covered', :d, :tid, :kid)
                                """
                            ),
                            {
                                "q": q, "p": avg_pos, "i": impr,
                                "d": f"기존 커버 (순위 {avg_pos:.1f} · 노출 {impr})",
                                "tid": kw_hit.tenant_id if kw_hit is not None else (content_hit[2] if content_hit else None),
                                "kid": kw_hit.id if kw_hit is not None else None,
                            },
                        )
                    covered.append(f"{q} ({avg_pos:.1f}위·{impr}회)")
                continue

            if tenant_hit is not None:
                # 입점 병원 자사명/연관 검색인데 키워드 풀에 없음 → 자동 시딩
                if (q, "seeded") in logged:
                    continue
                donor = next((k for k in keywords if k.tenant_id == tenant_hit.id), None)
                if not dry:
                    res = conn.execute(
                        text(
                            """
                            INSERT INTO keywords (tenant_id, text, category, target_brand, purpose, is_active, market, lang)
                            VALUES (:tid, :text, :cat, :brand, 'own', true, :market, :lang)
                            RETURNING id
                            """
                        ),
                        {
                            "tid": tenant_hit.id,
                            "text": q,
                            "cat": donor.category if donor is not None else None,
                            "brand": donor.target_brand if donor is not None else tenant_hit.partner_slug,
                            "market": donor.market if donor is not None else "kr",
                            "lang": donor.lang if donor is not None else "ko",
                        },
                    )
                    kid = res.scalar()
                    conn.execute(
                        text(
                            """
                            INSERT INTO rank_lever_log (query, avg_position, impressions, action, detail, tenant_id, keyword_id)
                            VALUES (:q, :p, :i, 'seeded', :d, :tid, :kid)
                            """
                        ),
                        {
                            "q": q, "p": avg_pos, "i": impr,
                            "d": f"{tenant_hit.name} 자동 시딩 (순위 {avg_pos:.1f} · 노출 {impr})",
                            "tid": tenant_hit.id, "kid": kid,
                        },
                    )
                seeded.append(f"{q} → {tenant_hit.name} ({avg_pos:.1f}위·{impr}회)")
                # Round 160 — 신규 시딩 키워드도 전 언어 복제 후보
                if int(tenant_hit.id) in tenant_langs and (q, "seeded_multilang") not in logged:
                    multilang_targets.append((int(tenant_hit.id), q))
                continue

            # 미입점 수요 — 이메일 후보 (14일 억제)
            last = logged.get((q, "emailed"))
            if last is not None and (now - last) < timedelta(days=suppress_days):  # type: ignore[operator]
                continue
            email_items.append({"query": q, "pos": avg_pos, "impr": impr, "clicks": int(row.clicks or 0)})

        # Round 160 — 효율 키워드 전 언어 복제: 레버(신규 시딩+기커버)를 해외 상품
        # 활성 언어들로 트랜스크리에이션해 시딩 → 다음 발행 로테이션에서 각 언어 생성.
        # 전략(사용자 지시): "키워드·자사명·경쟁사 분석으로 찾은 효율 콘텐츠를
        # 모든 언어 버전으로 배포"의 자동화 지점.
        for tid, src_q in multilang_targets:
            langs = tenant_langs.get(tid, [])
            if not langs:
                continue
            translated = None if dry else translate_keyword(src_q, langs)
            if dry:
                multilang_done.append(f"{src_q} → {langs} (DRY)")
                continue
            if not translated:
                continue
            donor_os = next(
                (k for k in keywords if k.tenant_id == tid and (k.market or "") == "overseas"),
                None,
            )
            inserted_langs = []
            for l, kw_text in translated.items():
                exists = conn.execute(
                    text("SELECT 1 FROM keywords WHERE tenant_id = :tid AND lower(text) = lower(:t) LIMIT 1"),
                    {"tid": tid, "t": kw_text},
                ).fetchone()
                if exists:
                    continue
                conn.execute(
                    text(
                        """
                        INSERT INTO keywords (tenant_id, text, category, target_brand, purpose, is_active, market, lang)
                        VALUES (:tid, :t, :cat, :brand, 'own', true, 'overseas', :lang)
                        """
                    ),
                    {
                        "tid": tid, "t": kw_text, "lang": l,
                        "cat": donor_os.category if donor_os is not None else None,
                        "brand": donor_os.target_brand if donor_os is not None else None,
                    },
                )
                inserted_langs.append(f"{l}:{kw_text}")
            if inserted_langs:
                conn.execute(
                    text(
                        """
                        INSERT INTO rank_lever_log (query, action, detail, tenant_id)
                        VALUES (:q, 'seeded_multilang', :d, :tid)
                        """
                    ),
                    {"q": src_q, "tid": tid, "d": " · ".join(inserted_langs)[:900]},
                )
                multilang_done.append(f"{src_q} → {', '.join(inserted_langs)}")

        # 이메일 본문 구성·발송
        if email_items:
            rows_html = "".join(
                f"<tr><td style='padding:6px 12px;border-bottom:1px solid #eee'>{e['query']}</td>"
                f"<td style='padding:6px 12px;border-bottom:1px solid #eee;text-align:right'>{e['pos']:.1f}위</td>"
                f"<td style='padding:6px 12px;border-bottom:1px solid #eee;text-align:right'>{e['impr']}</td></tr>"
                for e in sorted(email_items, key=lambda x: x["impr"], reverse=True)
            )
            html = (
                "<div style='font-family:sans-serif;max-width:560px'>"
                "<h2 style='margin:0 0 4px'>미입점 검색 수요 알림</h2>"
                f"<p style='color:#666;font-size:13px;margin:0 0 16px'>최근 {window}일 Google 검색에서 "
                "우리 블로그가 1페이지 직전 순위(4~20위)에 노출되고 있으나, "
                "입점 병원·활성 키워드·발행 콘텐츠 어느 것과도 매칭되지 않는 검색어입니다.<br/>"
                "→ 해당 진료항목 병원 신규 영업 또는 콘텐츠 기획 후보.</p>"
                "<table style='border-collapse:collapse;font-size:13px;width:100%'>"
                "<tr><th style='text-align:left;padding:6px 12px;border-bottom:2px solid #333'>검색어</th>"
                "<th style='text-align:right;padding:6px 12px;border-bottom:2px solid #333'>평균 순위</th>"
                "<th style='text-align:right;padding:6px 12px;border-bottom:2px solid #333'>노출(28일)</th></tr>"
                f"{rows_html}</table>"
                "<p style='color:#999;font-size:11px;margin-top:16px'>3일 주기 자동 분석 · 같은 검색어는 "
                f"{suppress_days}일 내 재알림하지 않습니다 · /admin/traffic 에서 전체 현황 확인</p></div>"
            )
            sent = False
            if not dry:
                sent = send_email(
                    f"[위서클 GEO] 미입점 검색 수요 {len(email_items)}건 — 신규 영업/기획 후보", html
                )
            if sent and not dry:
                for e in email_items:
                    conn.execute(
                        text(
                            """
                            INSERT INTO rank_lever_log (query, avg_position, impressions, action, detail)
                            VALUES (:q, :p, :i, 'emailed', :d)
                            """
                        ),
                        {"q": e["query"], "p": e["pos"], "i": e["impr"], "d": "미입점 수요 이메일 발송"},
                    )

    logger.info("레버 %d건 — 시딩 %d · 기커버 %d · 전언어복제 %d · 이메일 후보 %d",
                len(levers), len(seeded), len(covered), len(multilang_done), len(email_items))
    for s in seeded:
        logger.info("  [시딩] %s", s)
    for m in multilang_done:
        logger.info("  [전언어] %s", m)
    for e in email_items:
        logger.info("  [미입점] %s (%.1f위·%d회)", e["query"], e["pos"], e["impr"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
