"""Round 174d (2026-08-23) - 얇은 기존 발행글을 같은 URL 에서 심화 재생성.

왜 이게 필요한가
----------------
Round 173 에서 h2당 400자 깊이 게이트를 넣었지만 **이미 나간 글에는 소급되지 않는다.**
실측(ko 파트너, noindex 제외):

    본문 2,000자 미만 = 50편
      · BGN 밝은눈안과 잠실 45편 (평균 1,257자 / h2 6개 = 섹션당 약 210자)
      · 그 외 5편
    이 중 21편은 이미 GSC 노출이 있다(합계 103노출).

섹션당 210자면 h2 하나에 2~3문장이다. 질문형 제목·표·FAQ 라는 껍데기는 갖췄는데
정작 "그래서 내 경우 기준이 뭔데"에 답하지 않는다. **이미 색인돼 노출까지 나오는데
얕아서 클릭이 안 되는 글** — 새 URL 을 하나도 안 늘리고 순위를 올릴 수 있는,
지금 가장 효율 좋은 구간이다.

설계 원칙
--------
1. **URL 을 바꾸지 않는다.** INSERT 가 아니라 기존 행의 body 를 UPDATE 한다.
   크롤 예산이 병목인 사이트에서 재작성이 새 URL 을 만들면 순이익이 사라진다.
2. **generate_blog_post 를 그대로 재사용한다.** 그래야 Round 173 의 개선
   (D-3 롱테일 · D-4 깊이 · E-2 전환 동선 · 얇은 섹션 재시도 · 내부링크 보정 ·
   의료법 린터)이 전부 자동으로 적용된다. 별도 프롬프트를 만들면 그 순간 갈라진다.
3. **더 나빠지면 쓰지 않는다.** 새 본문이 기존보다 짧거나 컴플라이언스를 통과하지
   못하면 원본을 그대로 둔다. 실패는 건너뛰기지 롤백 대상이 아니다.
4. **노출 있는 글부터.** 이미 노출이 나오는 글이 개선 효과가 즉시 드러난다.

실행:
    DRY_RUN=1 python scripts/enrich_thin_posts.py        # 대상만 출력 (기본값)
    DRY_RUN=0 LIMIT=5 python scripts/enrich_thin_posts.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# 🔴 이 리포의 scripts/* 는 반드시 이 3줄이 있어야 한다.
#   `python scripts/foo.py` 로 실행하면 sys.path[0] 이 scripts/ 라서 `src` 패키지를
#   못 찾는다(ModuleNotFoundError: No module named 'src'). 함수 안에서 import 해도
#   마찬가지 — 경로 문제라 지연 import 로는 해결되지 않는다.
#   run_auto_content_once.py 등 기존 스크립트가 전부 쓰는 관례.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

MIN_CHARS = int(os.getenv("MIN_CHARS", "2000"))
LIMIT = int(os.getenv("LIMIT", "5"))
DRY_RUN = os.getenv("DRY_RUN", "1") != "0"
TARGET_CHARS = int(os.getenv("TARGET_CHARS", "3200"))
# 새 본문이 기존 대비 이 비율 미만이면 채택하지 않는다(개악 방지).
MIN_GROWTH = float(os.getenv("MIN_GROWTH", "1.3"))

SELECT_SQL = """
WITH imp AS (
  SELECT regexp_replace(page, '^.*/', '') AS slug, SUM(impressions) AS impressions
  FROM gsc_daily GROUP BY 1
)
SELECT gc.id, gc.tenant_id, gc.slug, gc.keyword_text,
       length(regexp_replace(gc.body, '<[^>]+>', '', 'g')) AS text_chars,
       COALESCE(i.impressions, 0) AS impressions
FROM generated_contents gc
LEFT JOIN imp i ON i.slug = gc.slug
WHERE gc.status = 'published'
  AND gc.compliance_status = 'pass'
  AND gc.channel = 'blog_html'
  AND gc.is_partner_content
  AND COALESCE(gc.market, 'domestic') <> 'overseas'
  AND gc.lang = 'ko'
  AND NOT COALESCE(gc.noindex, false)
  AND gc.keyword_text IS NOT NULL
  AND length(regexp_replace(gc.body, '<[^>]+>', '', 'g')) < :min_chars
ORDER BY COALESCE(i.impressions, 0) DESC, gc.published_at DESC
LIMIT :limit
"""


def main() -> int:
    from sqlalchemy import text as sql_text

    from src.storage.db import get_session_factory
    from src.content.generator import generate_blog_post

    if not os.environ.get("DATABASE_URL"):
        print("ERROR: DATABASE_URL 미설정", file=sys.stderr)
        return 1

    session_factory = get_session_factory()

    with session_factory() as s:
        rows = s.execute(
            sql_text(SELECT_SQL), {"min_chars": MIN_CHARS, "limit": LIMIT}
        ).fetchall()

    if not rows:
        print("대상 없음 — 얇은 글이 없습니다.")
        return 0

    print(f"대상 {len(rows)}편 (기준 {MIN_CHARS}자 미만, 노출 많은 순)")
    for r in rows:
        print(f"  #{r[0]:>5}  {r[4]:>5}자  노출 {r[5]:>4}  {r[3]}  /{r[2]}")
    if DRY_RUN:
        print("\nDRY_RUN=1 — 아무것도 바꾸지 않았습니다. 실제 실행: DRY_RUN=0")
        return 0

    ok = skipped = failed = 0
    for cid, tenant_id, slug, keyword, old_chars, impressions in rows:
        try:
            with session_factory() as s:
                res = generate_blog_post(
                    s, tenant_id, keyword,
                    target_chars=TARGET_CHARS,
                    save=False,          # 새 행을 만들지 않는다 — URL 보존이 핵심
                    include_cta=True,
                    lang="ko",
                    market="domestic",
                )
                new_body = res.body_html or ""
                import re as _re

                new_chars = len(_re.sub(r"<[^>]+>", "", new_body))
                if res.compliance.status != "pass":
                    print(f"  SKIP #{cid} — 컴플라이언스 {res.compliance.status}")
                    skipped += 1
                    continue
                if new_chars < old_chars * MIN_GROWTH:
                    print(f"  SKIP #{cid} — {old_chars}자 → {new_chars}자 (성장 부족)")
                    skipped += 1
                    continue
                s.execute(
                    sql_text(
                        "UPDATE generated_contents "
                        "SET body = :body, updated_at = now() WHERE id = :id"
                    ),
                    {"body": new_body, "id": cid},
                )
                s.commit()
                print(f"  OK   #{cid} — {old_chars}자 → {new_chars}자 · 노출 {impressions} · /{slug}")
                ok += 1
        except Exception as e:  # noqa: BLE001
            print(f"  FAIL #{cid} — {type(e).__name__}: {e}", file=sys.stderr)
            failed += 1

    print(f"\n완료 — 갱신 {ok} · 건너뜀 {skipped} · 실패 {failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
