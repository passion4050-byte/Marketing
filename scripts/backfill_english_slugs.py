"""한글 슬러그 → 영문 슬러그 백필 (구 URL 은 former_slug 에 보관해 301).

🔴 왜 필요한가 (Round 174j, 2026-08-24 실측)
   국내 ko 파트너 라이브 182편을 슬러그 형태로 가른 결과:
       ASCII 슬러그  52편 → 27편(51.9%)이 GSC 노출, 총 180 impressions
       한글 슬러그  130편 → **0편(0.0%)**, 총 0 impressions
   130편 전부 gsc_daily 관측 시작(2026-07-05) 이후 발행이라 측정된 0이다.

   원인은 Supabase BEFORE INSERT 트리거 `trg_autofill_title_slug` 가 원본 한글
   keyword_text 를 슬러그에 그대로 박았던 것. 파이썬 후속 UPDATE 가
   `COALESCE(NULLIF(slug,''), :slug)` 라서 트리거를 이길 수 없었다.
   Round 174h 에서 생성 경로는 고쳤고(LLM 영문 슬러그), 이 스크립트는 **기존 재고**를
   교정한다.

   ⚠ 인과 주의: 한글 슬러그 자체가 색인 불가는 아니다(구글은 percent-encoding 처리).
     한글 슬러그 글들은 같은 구버전 경로에서 나와 제목도 자기홍보형이라 교란 요인이
     있다. 다만 130/130 이 0 인 분리는 우연으로 보기 어렵다.

동작
   1) 대상 조회 — ko · 파트너 · published · slug 가 비ASCII · former_slug 미설정
   2) 제목을 배치로 LLM 에 넘겨 영문 슬러그 생성 (의미 번역, 음역 아님)
   3) sanitize_slug 로 정규화 → 비면 **건너뛴다**(한글 슬러그를 그대로 유지).
      'post-{id}' 로 바꾸지 않는다 — 키워드 신호 0 이 한글보다 낫다는 근거가 없다.
   4) 충돌 시 `-{id}` 접미
   5) UPDATE slug = 새 슬러그, former_slug = 구 슬러그
      → medimap-blog 의 partners.ts / posts.ts 가 former_slug 도 매칭하고
        상세 페이지가 새 URL 로 301. 구 URL 이 404 가 되지 않는다.

환경변수
   DRY_RUN=1 (기본)  — 1 이면 아무것도 쓰지 않고 계획만 출력
   LIMIT=20          — 이번 실행에서 처리할 최대 편수
   BATCH=12          — LLM 1회 호출당 제목 수
   DATABASE_URL, ANTHROPIC_API_KEY (또는 OPENAI_API_KEY)

사용
   DRY_RUN=1 LIMIT=10 python scripts/backfill_english_slugs.py
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

# ⚠ `python scripts/foo.py` 는 sys.path[0] 을 scripts/ 로 잡는다. 리포 루트를 넣지
#   않으면 `from src...` 가 ModuleNotFoundError. lazy import 로는 안 고쳐진다 —
#   경로 문제다. (Round 174 실사고: enrich_thin_posts.py 에서 동일 함정)
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy import text  # noqa: E402

from src.content.templates.blog_html import sanitize_slug  # noqa: E402
from src.storage.db import SessionLocal  # noqa: E402

DRY_RUN = os.getenv("DRY_RUN", "1") not in ("0", "false", "False")
LIMIT = int(os.getenv("LIMIT", "20"))
BATCH = int(os.getenv("BATCH", "12"))

_SELECT = """
SELECT id, slug, title, keyword_text, region FROM (
  SELECT gc.id, gc.slug, gc.title, gc.keyword_text, t.region,
         t.status AS tstatus,
         -- 🔴 Round 174j-c — 병원별 라운드로빈. 두 가지를 동시에 해결한다.
         --  (1) 중간에 멈춰도 커버리지가 전 병원에 고르게 퍼진다. gc.id 순이면
         --      앞쪽 132편 중 상당수가 청담디어 '필러' 한 곳에 몰린다.
         --  (2) 슬러그 충돌이 줄어든다. 같은 배치에 같은 키워드 글이 5편 들어오면
         --      제목이 거의 같아서(“자연스러운 아름다움을 위한 현명한 선택” x3)
         --      LLM 이 뚜렷이 다른 슬러그를 못 만들고 전부 -{id} 접미로 끝난다.
         --      배치를 병원별로 흩으면 제목이 다양해져 충돌 자체가 안 생긴다.
         row_number() OVER (PARTITION BY gc.tenant_id ORDER BY gc.id) AS rn
  FROM generated_contents gc
  JOIN tenants t ON t.id = gc.tenant_id
  WHERE gc.status = 'published'
    AND gc.channel = 'blog_html'
    AND gc.compliance_status = 'pass'
    AND gc.is_partner_content = true
    AND COALESCE(gc.market, 'domestic') <> 'overseas'
    AND COALESCE(gc.lang, 'ko') = 'ko'
    AND gc.slug IS NOT NULL
    AND gc.slug !~ '^[a-z0-9-]+$'      -- 비ASCII 슬러그만
    AND gc.former_slug IS NULL          -- 이미 리네임한 건 재처리 금지(멱등)
    -- 🔴 Round 174j-b — 첫 dry_run 이 잡아낸 두 가지. 이 두 줄이 없으면
    --    LLM 비용을 태우고 URL 만 흔들면서 얻는 게 0 이다.
    --  (1) noindex 글 제외. 사이트맵에서 빠지고 robots noindex 가 걸린 글이라
    --      슬러그를 고쳐도 검색에 아무 영향이 없다. 첫 dry_run 10편이 **전부**
    --      noindex 였다(#169·175·176·177·178·179·180·183·185·186).
    AND NOT COALESCE(gc.noindex, false)
    --  (2) 자사(wecircle-self) 제외. 자사 글은 /blog/{slug} 로 서빙되는데
    --      301 은 /with-partners 상세 페이지에만 넣었다(canonicalPathFor 가
    --      wecircle-self 를 의도적으로 제외하므로 /blog 쪽은 리다이렉트가 안 걸린다).
    --      지금 리네임하면 구 URL 이 새 본문을 렌더해 중복 URL 이 생긴다 —
    --      Round 173 에서 277개를 없앤 그 문제를 다시 만드는 셈.
    --      자사까지 하려면 /blog/[slug] 에도 former_slug 301 을 먼저 넣을 것.
    AND t.partner_slug <> 'wecircle-self'
) x
-- 활성 병원 우선 → 병원별 1편씩 → id. 일시정지 병원(청담디어 등)은 뒤로 민다.
ORDER BY (tstatus = 'active') DESC, rn, id
LIMIT :lim
"""


_SYSTEM = """당신은 의료 콘텐츠의 URL 슬러그를 만드는 SEO 엔지니어입니다.
한국어 제목 목록을 받아 각각에 대응하는 영문 URL 슬러그를 만듭니다.

규칙 (전부 필수):
- 영문 소문자·숫자·하이픈만. 한글·공백·특수문자 절대 금지.
- 3~6단어, 60자 이내.
- 음역(romanization)이 아니라 **의미 번역**.
  나쁨: "rasik-tongjeung"   좋음: "lasik-pain-timeline"
- 지역명은 로마자로 맨 앞: jamsil / gangnam / busan / hongdae / sinsa / cheongdam / seoul
- 시술명은 통용 영문:
  라식 lasik / 라섹 lasek / 스마일라식 smile-lasik / 백내장 cataract /
  노안 presbyopia / 필러 filler / 울쎄라 ulthera / 써마지 thermage /
  스킨부스터 skin-booster / 모발이식 hair-transplant / 리쥬란 rejuran /
  안면거상 face-lift / 헤어라인 hairline / 여드름흉터 acne-scar
- 제목에 연도가 있으면 끝에 붙인다 (예: -2026).
- 각 슬러그는 서로 달라야 한다.

출력은 정확히 JSON 배열 하나만. 설명·코드블록 금지.
입력이 N개면 출력도 N개, 같은 순서.
형식: [{"i": 1, "slug": "..."}, {"i": 2, "slug": "..."}]
"""


def _call_llm(titles: list[tuple[int, str, str]]) -> dict[int, str]:
    """[(idx, title, region)] → {idx: slug}. 실패 시 빈 dict (해당 배치 건너뜀)."""
    lines = [f'{i}. (지역: {region or "미지정"}) {title}' for i, title, region in titles]
    user = "다음 제목들의 영문 슬러그를 만들어라.\n\n" + "\n".join(lines)

    raw = ""
    akey = os.getenv("ANTHROPIC_API_KEY")
    okey = os.getenv("OPENAI_API_KEY")
    if akey:
        import anthropic

        cli = anthropic.Anthropic(api_key=akey)
        msg = cli.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001"),
            system=_SYSTEM,
            max_tokens=2048,
            messages=[{"role": "user", "content": user}],
        )
        raw = "".join(b.text for b in msg.content if hasattr(b, "text"))
    elif okey:
        from openai import OpenAI

        cli = OpenAI(api_key=okey)
        r = cli.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": user},
            ],
        )
        raw = r.choices[0].message.content or ""
    else:
        print("ERROR: ANTHROPIC_API_KEY / OPENAI_API_KEY 둘 다 없음", file=sys.stderr)
        return {}

    m = re.search(r"\[.*\]", raw, re.S)
    if not m:
        print(f"  WARN 배치 파싱 실패 (JSON 배열 없음): {raw[:120]!r}")
        return {}
    try:
        arr = json.loads(m.group(0))
    except Exception as e:  # noqa: BLE001
        print(f"  WARN 배치 JSON 오류: {e}")
        return {}
    out: dict[int, str] = {}
    for item in arr:
        try:
            out[int(item["i"])] = str(item["slug"])
        except Exception:  # noqa: BLE001, S112
            continue
    return out


def main() -> int:
    if not os.getenv("DATABASE_URL"):
        print("ERROR: DATABASE_URL 미설정", file=sys.stderr)
        return 1

    with SessionLocal() as s:
        rows = s.execute(text(_SELECT), {"lim": LIMIT}).fetchall()
        if not rows:
            print("대상 없음 — 한글 슬러그 파트너 글이 모두 처리됨.")
            return 0
        print(f"대상 {len(rows)}편 (DRY_RUN={DRY_RUN}, BATCH={BATCH})\n")

        # 전역 슬러그 집합 — 배치 내 중복까지 한 번에 막는다.
        taken = {
            r[0]
            for r in s.execute(
                text("SELECT slug FROM generated_contents WHERE slug IS NOT NULL")
            ).fetchall()
        }

        planned: list[tuple[int, str, str]] = []
        skipped: list[tuple[int, str, str]] = []

        for start in range(0, len(rows), BATCH):
            chunk = rows[start : start + BATCH]
            idx_map = {i + 1: chunk[i] for i in range(len(chunk))}
            got = _call_llm(
                [(i + 1, (chunk[i][2] or chunk[i][3] or ""), chunk[i][4]) for i in range(len(chunk))]
            )
            for i, row in idx_map.items():
                cid, old_slug, title = row[0], row[1], row[2]
                new_slug = sanitize_slug(got.get(i, ""))
                if not new_slug:
                    # 한글이 섞였거나 LLM 이 빠뜨림 → 원본 유지. 억지로 바꾸지 않는다.
                    skipped.append((cid, old_slug, "LLM 슬러그 없음/한글 혼입"))
                    continue
                if new_slug in taken:
                    cand = f"{new_slug[:52].rstrip('-')}-{cid}"
                    if cand in taken:
                        skipped.append((cid, old_slug, f"충돌 회피 실패 ({new_slug})"))
                        continue
                    new_slug = cand
                taken.add(new_slug)
                planned.append((cid, old_slug, new_slug))
                print(f"  #{cid}  {old_slug}\n        → {new_slug}\n        ({title[:60]})")

        print(f"\n계획: 변경 {len(planned)}편 / 건너뜀 {len(skipped)}편")
        for cid, old, why in skipped:
            print(f"  SKIP #{cid} {old} — {why}")

        if DRY_RUN:
            print("\nDRY_RUN=1 — 아무것도 쓰지 않았습니다. 적용은 DRY_RUN=0.")
            return 0

        for cid, old_slug, new_slug in planned:
            s.execute(
                text(
                    "UPDATE generated_contents "
                    "SET slug = :new, former_slug = :old, updated_at = now() "
                    "WHERE id = :id AND former_slug IS NULL"
                ),
                {"new": new_slug, "old": old_slug, "id": cid},
            )
        s.commit()
        print(f"\n적용 완료: {len(planned)}편. 구 URL 은 former_slug 로 301 처리됩니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
