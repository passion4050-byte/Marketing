"""네이버 서치어드바이저 「콘텐츠 노출/클릭」 리포트 CSV → naver_search_report 적재.

왜 CSV 인가
-----------
서치어드바이저는 리포트를 가져오는 공식 API 를 제공하지 않는다(글쓰기 API 도 없다).
대신 각 리포트 화면에 **「다운로드」** 가 있고 최대 2,000 행을 준다.
노출/클릭 리포트는 일별이 아니라 **기간 집계 TOP N** 이므로, 월 1회 수동 다운로드로 충분하다.
자동화하겠다고 로그인 세션을 흉내내는 것은 ToS 위반이고 계정 리스크가 크다 — 하지 않는다.

왜 이걸 만드는가 (Round 181)
---------------------------
같은 30일 창 실측:  네이버 노출 1,800 / 클릭 30   vs   구글(GSC) 노출 644 / 클릭 17.
네이버가 이미 우리 최대 유입 채널인데 시스템은 GSC 만 보고 있었다.
그리고 네이버 상위 30개 검색어를 keywords 테이블과 대조한 결과 **exact match 0/30** 이었다 —
우리가 상상한 키워드로 쓰고 측정하는 동안, 실제 유입은 전혀 다른 데서 오고 있었다.

사용법
-----
  DATABASE_URL=... python scripts/import_naver_report.py \
      --keywords ~/Downloads/naver_keywords.csv \
      --pages    ~/Downloads/naver_pages.csv \
      --period 2026-07-31:2026-08-29

CSV 컬럼은 네이버가 바꿀 수 있으므로 헤더를 유연하게 매칭한다
(검색 키워드/검색어/keyword, 검색 웹문서/URL/page, 클릭/click, 노출/impression).
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from datetime import date, datetime
from typing import Iterable
from urllib.parse import unquote, urlsplit

from sqlalchemy import create_engine, text

# 헤더 후보 — 네이버 UI 표기가 바뀌어도 웬만하면 잡히도록.
_H_VALUE = ("검색 키워드", "검색어", "키워드", "keyword", "검색 웹문서", "웹문서", "url", "page", "페이지")
_H_CLICK = ("클릭", "클릭수", "click", "clicks")
_H_IMP = ("노출", "노출수", "impression", "impressions")


def _pick(header: list[str], candidates: Iterable[str]) -> int | None:
    norm = [h.strip().lower().replace(" ", "") for h in header]
    for i, h in enumerate(norm):
        for c in candidates:
            if c.lower().replace(" ", "") in h:
                return i
    return None


def _to_int(raw: str) -> int:
    m = re.sub(r"[^0-9]", "", raw or "")
    return int(m) if m else 0


def read_rows(path: str) -> list[tuple[str, int, int]]:
    """(value, clicks, impressions) 목록."""
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        sample = f.read(4096)
        f.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",\t;")
        except csv.Error:
            dialect = csv.excel
        reader = csv.reader(f, dialect)
        rows = [r for r in reader if any((c or "").strip() for c in r)]

    if not rows:
        return []

    header = rows[0]
    i_val = _pick(header, _H_VALUE)
    i_clk = _pick(header, _H_CLICK)
    i_imp = _pick(header, _H_IMP)
    if i_val is None or i_clk is None or i_imp is None:
        raise SystemExit(
            f"[{path}] 헤더를 못 찾았습니다: {header}\n"
            "  → value/클릭/노출 컬럼명을 확인하고 _H_* 상수에 추가하세요."
        )

    out: list[tuple[str, int, int]] = []
    for r in rows[1:]:
        if len(r) <= max(i_val, i_clk, i_imp):
            continue
        v = (r[i_val] or "").strip()
        if not v:
            continue
        out.append((v, _to_int(r[i_clk]), _to_int(r[i_imp])))
    return out


UPSERT = text(
    """
    INSERT INTO naver_search_report
      (period_start, period_end, dimension, value, clicks, impressions, ctr, device)
    VALUES (:ps, :pe, :dim, :val, :clk, :imp,
            CASE WHEN :imp > 0 THEN round(:clk::numeric * 100 / :imp, 1) END, :dev)
    ON CONFLICT (period_end, dimension, value, device) DO UPDATE
      SET clicks = EXCLUDED.clicks,
          impressions = EXCLUDED.impressions,
          ctr = EXCLUDED.ctr,
          period_start = EXCLUDED.period_start
    """
)

# 적재 후 우리 엔티티에 연결 — 키워드는 텍스트 정규화 매칭, 페이지는 slug 매칭.
LINK_KEYWORDS = text(
    """
    UPDATE naver_search_report r
       SET keyword_id = k.id, tenant_id = k.tenant_id
      FROM keywords k
     WHERE r.dimension = 'keyword'
       AND r.period_end = :pe
       AND r.keyword_id IS NULL
       AND lower(regexp_replace(k.text,  '[^[:alnum:]가-힣]', '', 'g'))
         = lower(regexp_replace(r.value, '[^[:alnum:]가-힣]', '', 'g'))
    """
)

LINK_PAGES = text(
    """
    UPDATE naver_search_report r
       SET content_id = g.id, tenant_id = g.tenant_id
      FROM generated_contents g
     WHERE r.dimension = 'page'
       AND r.period_end = :pe
       AND r.content_id IS NULL
       AND g.slug IS NOT NULL
       AND (r.value LIKE '%/' || g.slug OR r.value LIKE '%/' || g.slug || '?%')
    """
)

# 🔴 Round 207 (2026-09-20) — 위 SQL 한 판으로는 9월 리포트 30행 중 8행이 안 붙었다.
#   ① 한글 슬러그가 퍼센트 인코딩돼 온다:
#      .../healingeye/%EB%9D%BC%EC%84%B9-317  =  라섹-317
#      LIKE 는 인코딩된 문자열과 DB 의 한글 slug 를 영원히 못 맞춘다.
#   ② 슬러그가 바뀐 글은 former_slug 로만 잡힌다(위 SQL 은 slug 만 본다).
#   ③ 파트너 인덱스 페이지(/with-partners/derma/symphony)는 글이 아니라
#      content_id 가 없지만, 경로의 partner_slug 로 **병원까지는** 확정적으로 붙는다.
#   ⚠ 빈 마지막 세그먼트 주의: 'https://wecircle.co.kr/' 의 마지막 세그먼트는 ''
#     이고, 이걸 coalesce(former_slug,'') 와 비교하면 former_slug 가 NULL 인 글
#     **아무거나** 걸린다(실제로 홈이 글 #88 에 붙는 사고가 났다). 반드시 비우지 말 것.
SELECT_UNLINKED_PAGES = text(
    """
    SELECT id, value FROM naver_search_report
     WHERE dimension = 'page' AND period_end = :pe AND content_id IS NULL
    """
)

FIND_CONTENT_BY_SLUG = text(
    """
    SELECT id, tenant_id FROM generated_contents
     WHERE slug = :slug OR former_slug = :slug
     LIMIT 1
    """
)

SET_PAGE_CONTENT = text(
    "UPDATE naver_search_report SET content_id = :cid, tenant_id = :tid WHERE id = :rid"
)

# 글로는 못 붙어도 경로에 파트너 슬러그가 있으면 병원은 확정된다(추정 아님).
LINK_PAGES_PARTNER = text(
    """
    UPDATE naver_search_report r
       SET tenant_id = t.id
      FROM tenants t
     WHERE r.dimension = 'page'
       AND r.period_end = :pe
       AND r.tenant_id IS NULL
       AND t.partner_slug IS NOT NULL
       AND r.value ~ ('/with-partners/[^/]+/' || t.partner_slug || '(/|$)')
    """
)


def _slug_of(url: str) -> str:
    """URL → 마지막 경로 세그먼트(퍼센트 디코딩 후). 없으면 빈 문자열."""
    path = urlsplit(url).path.rstrip("/")
    if not path:
        return ""
    return unquote(path.rsplit("/", 1)[-1])


def link_pages_decoded(conn, pe: date) -> int:
    """LINK_PAGES 가 놓친 행을 디코딩한 slug/former_slug 로 다시 붙인다."""
    linked = 0
    for rid, value in conn.execute(SELECT_UNLINKED_PAGES, {"pe": pe}).fetchall():
        slug = _slug_of(value or "")
        if not slug:  # 홈('/') 등 — 붙일 글이 없다. 빈 값으로 매칭하면 안 된다.
            continue
        row = conn.execute(FIND_CONTENT_BY_SLUG, {"slug": slug}).fetchone()
        if row:
            conn.execute(SET_PAGE_CONTENT, {"cid": row[0], "tid": row[1], "rid": rid})
            linked += 1
    return linked


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--keywords", help="검색 키워드 리포트 CSV")
    ap.add_argument("--pages", help="검색 웹문서 리포트 CSV")
    ap.add_argument("--period", required=True, help="YYYY-MM-DD:YYYY-MM-DD (리포트 기간)")
    ap.add_argument("--device", default="all", help="all | pc | mobile")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not args.keywords and not args.pages:
        ap.error("--keywords 또는 --pages 중 하나는 필요합니다")

    try:
        ps_s, pe_s = args.period.split(":")
        ps: date = datetime.strptime(ps_s, "%Y-%m-%d").date()
        pe: date = datetime.strptime(pe_s, "%Y-%m-%d").date()
    except ValueError:
        ap.error("--period 형식은 2026-07-31:2026-08-29")
        return 2

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("DATABASE_URL 미설정", file=sys.stderr)
        return 1

    jobs: list[tuple[str, str]] = []
    if args.keywords:
        jobs.append(("keyword", args.keywords))
    if args.pages:
        jobs.append(("page", args.pages))

    engine = create_engine(dsn, pool_pre_ping=True)
    total = 0
    with engine.begin() as conn:
        for dim, path in jobs:
            rows = read_rows(path)
            print(f"[{dim}] {path} → {len(rows)}행")
            for value, clk, imp in rows:
                if args.dry_run:
                    continue
                conn.execute(UPSERT, {"ps": ps, "pe": pe, "dim": dim, "val": value,
                                      "clk": clk, "imp": imp, "dev": args.device})
            total += len(rows)

        if not args.dry_run:
            k = conn.execute(LINK_KEYWORDS, {"pe": pe}).rowcount
            p = conn.execute(LINK_PAGES, {"pe": pe}).rowcount
            # Round 207 — 인코딩된 한글 슬러그 + former_slug 를 2차 패스로 회수.
            p2 = link_pages_decoded(conn, pe)
            # 글엔 못 붙어도 경로의 partner_slug 로 병원은 붙인다(인덱스 페이지 등).
            pt = conn.execute(LINK_PAGES_PARTNER, {"pe": pe}).rowcount
            print(f"연결: keyword {k}건, page {p}건(+디코딩 {p2}건), 병원만 {pt}건")

            left = conn.execute(
                text(
                    "SELECT count(*) FROM naver_search_report "
                    " WHERE dimension='page' AND period_end=:pe AND tenant_id IS NULL"
                ),
                {"pe": pe},
            ).scalar()
            if left:
                print(f"⚠ 병원 미연결 page {left}행 — 카테고리/목록 페이지인지 확인할 것")

    print(f"{'(dry-run) ' if args.dry_run else ''}총 {total}행 처리 — 기간 {ps} ~ {pe}")

    # GitHub Actions job summary
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary and not args.dry_run:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(f"\n## 네이버 리포트 적재\n- 기간: {ps} ~ {pe}\n- 행: {total}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
