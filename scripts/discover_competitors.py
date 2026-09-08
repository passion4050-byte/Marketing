#!/usr/bin/env python
"""경쟁사 자동 발굴 — `competitors` 테이블을 응답 코퍼스에서 채운다.

## 왜 (🔴 Round 194, 2026-09-08)
`mentions.is_competitor` 가 **전 기간(5월~9월) 0건**이었다. 코드는 정상인데
`competitors` 테이블이 **완전히 비어 있었다**(0행). `collect.py` 는
`confirmed=True` 인 경쟁사만 주입하므로 주입할 것이 하나도 없었던 것이다.

결과: 제품의 핵심 지표인 **Mention Share 에 분모가 없었다.** 대시보드의
"점유율 100%" 는 점유율이 아니라 "우리 것만 셌다" 는 뜻이었고, 그래서
지금까지의 성과 판정에 쓸 수 없었다.

## 어떻게
이미 쌓인 `responses.raw_text`(수천 건)에 경쟁 병원 이름이 그대로 들어 있다.
병원명 패턴으로 후보를 뽑고, 일반명사와 자사 브랜드를 걷어낸 뒤 upsert 한다.
tenant 범위는 `responses → queries.tenant_id` 로 잡는다 — 그 병원의 질의에
같이 등장한 곳만 그 병원의 경쟁사다.

## 사용
    python scripts/discover_competitors.py --dry-run          # 미리보기
    python scripts/discover_competitors.py --days 60 --min 8  # 실제 반영

`--min` 이상 등장한 후보는 `confirmed=True` 로 넣어 **즉시 측정에 반영**된다.
그 미만은 `confirmed=False` 후보로만 적재 — 어드민에서 확인 후 켜면 된다.
"""

from __future__ import annotations

import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 병원명 꼬리. 이 접미사로 끝나는 토큰만 후보로 본다.
_SUFFIX = r"(?:안과|의원|피부과|성형외과|한의원|클리닉|병원|의료원)"
_CAND_RE = re.compile(rf"([가-힣A-Za-z0-9]{{2,12}}{_SUFFIX})")

# 🔴 일반명사 — 이걸 안 거르면 "대학병원" 같은 게 최상위 경쟁사로 올라온다.
#   9월 멘션의 32%가 "한방" 이었던 것과 같은 종류의 오탐이다.
_GENERIC = {
    "대학병원", "종합병원", "전문병원", "요양병원", "한방병원", "치과병원",
    "정형외과의원", "동네의원", "개인의원", "상급종합병원", "국립병원",
    "협력병원", "지정병원", "일반병원", "전문의원", "네트워크병원",
}
# 대형 상급종합 — 미용/시력교정 시장의 경쟁자가 아니다. 답변에 배경으로 늘 등장한다.
_TERTIARY = {
    "서울아산병원", "삼성서울병원", "서울대학교병원", "세브란스병원",
    "강남세브란스병원", "서울성모병원", "서울대병원", "아산병원",
    "고려대학교병원", "한양대학교병원", "중앙대학교병원", "건국대학교병원",
    "서울의료원", "동물병원",
}
# 접미사 규칙으로 거르는 것들 — 대학병원 계열은 이름이 무한하므로 열거가 불가능하다.
_GENERIC_SUFFIX = ("대학교병원", "대학병원", "동물병원", "의료원", "보건소")


def _own_tokens(names: list[str]) -> set[str]:
    """자사 브랜드 토큰. 부분일치로 걸러내기 위해 조각까지 넣는다.

    ⚠ 정확히 같은 이름만 제외하면 안 된다. tenant 이름이 '밝은눈안과 강남점' 인데
      응답에는 '밝은눈안과' 로 나오므로, 그대로 두면 **자사가 경쟁사로 등록**된다.
    """
    toks: set[str] = set()
    for n in names:
        n = (n or "").strip()
        if not n:
            continue
        toks.add(n)
        for part in re.split(r"[\s·,/]+", n):
            if len(part) >= 3:
                toks.add(part)
    return toks


def _is_own(cand: str, own: set[str]) -> bool:
    return any(o in cand or cand in o for o in own)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=90)
    ap.add_argument("--min", type=int, default=8, help="confirmed=True 로 넣을 최소 등장 응답 수")
    ap.add_argument("--keep", type=int, default=3, help="후보로라도 적재할 최소 등장 수")
    # ⚠ 상한이 필요한 이유: 멘션 추출은 경쟁사 1개당 본문 전체를 regex 스캔한다.
    #   테넌트당 100개를 넣으면 수집 비용이 그만큼 곱해진다. 상위 N개면 신호는 다 잡힌다.
    ap.add_argument("--top", type=int, default=30, help="테넌트당 적재 상한 (빈도 상위)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    from sqlalchemy import text as T

    from src.storage.db import get_session_factory

    SessionLocal = get_session_factory()
    added = confirmed = skipped = 0

    with SessionLocal() as s:
        tenants = s.execute(T("SELECT id, name FROM tenants")).fetchall()
        own = _own_tokens([t[1] for t in tenants])

        for tid, tname in tenants:
            rows = s.execute(
                T(
                    "SELECT r.id, r.raw_text FROM responses r "
                    "JOIN queries q ON q.id = r.query_id "
                    "WHERE q.tenant_id = :tid "
                    "  AND r.created_at >= now() - (:days || ' days')::interval"
                ),
                {"tid": tid, "days": args.days},
            ).fetchall()
            if not rows:
                continue

            counts: dict[str, int] = {}
            for _rid, text_ in rows:
                for cand in set(_CAND_RE.findall(text_ or "")):
                    if cand in _GENERIC or cand in _TERTIARY:
                        continue
                    if cand.endswith(_GENERIC_SUFFIX):
                        continue
                    if _is_own(cand, own):
                        continue
                    counts[cand] = counts.get(cand, 0) + 1

            picked = sorted(
                ((c, n) for c, n in counts.items() if n >= args.keep),
                key=lambda x: -x[1],
            )[: args.top]
            if not picked:
                continue

            print(f"\n[{tid}] {tname} — 응답 {len(rows)}건에서 후보 {len(picked)}개")
            for cand, n in picked[:15]:
                mark = "✅확정" if n >= args.min else "  후보"
                print(f"   {mark} {cand:<24} {n}")

            if args.dry_run:
                continue

            for cand, n in picked:
                is_conf = n >= args.min
                exists = s.execute(
                    T("SELECT id, confirmed FROM competitors WHERE tenant_id=:tid AND name=:n"),
                    {"tid": tid, "n": cand},
                ).fetchone()
                if exists:
                    # 이미 사람이 confirmed 를 조정했을 수 있으므로 덮어쓰지 않는다.
                    skipped += 1
                    continue
                s.execute(
                    T(
                        "INSERT INTO competitors "
                        "(tenant_id, name, aliases, discovery_source, confirmed, first_seen_at, updated_at) "
                        "VALUES (:tid, :n, NULL, 'auto_response_scan', :c, now(), now())"
                    ),
                    {"tid": tid, "n": cand, "c": is_conf},
                )
                added += 1
                confirmed += 1 if is_conf else 0
        if not args.dry_run:
            s.commit()

    print(
        f"\n{'[DRY-RUN] ' if args.dry_run else ''}"
        f"추가 {added} (confirmed {confirmed}) · 기존 유지 {skipped}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
