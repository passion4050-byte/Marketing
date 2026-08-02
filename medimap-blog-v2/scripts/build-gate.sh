#!/usr/bin/env bash
# Round 144 (2026-08-02) — push 전 필수 게이트.
#
# 배경: 2026-08-02 에 geo-v2 빌드가 4회 연속 실패했고, 실패해도 이전 성공 빌드가
#   계속 서빙되므로 "배포했는데 화면이 그대로"로만 나타나 1시간을 날렸다.
#   원인 3종 모두 esbuild 도 tsc 도 못 잡고 `next build` 만 잡는 것들이었다:
#     ① 동적 세그먼트명 충돌 (/r/[slug] vs /r/[tenantId])  → 라우트 트리 에러
#     ② route.ts 의 비허용 export (MATURE_DAYS)            → Next Route 타입 검사
#     ③ page.tsx 의 Next15 스타일 Promise params           → PageProps 타입 검사
#
# 사용: bash scripts/build-gate.sh   (medimap-blog-v2 디렉토리에서)
# 종료코드 0 = 통과, 1 = 실패.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
FAIL=0
echo "=== Next.js 빌드 게이트 ==="

# ── ① 동적 세그먼트명 충돌 ────────────────────────────────────────────────
echo ""
echo "[1] 동적 세그먼트명 충돌"
CONFLICT=$(find src/app -type d -name '\[*\]' 2>/dev/null | while read -r d; do
  echo "$(dirname "$d")|$(basename "$d")"
done | sort | awk -F'|' '{a[$1]=a[$1]" "$2} END {for(p in a){n=split(a[p],arr," "); if(n>1) print "    ✗ "p" → "a[p]}}')
if [ -n "$CONFLICT" ]; then echo "$CONFLICT"; FAIL=1; else echo "    ✓ 충돌 없음"; fi

# ── ② route.ts 비허용 export ──────────────────────────────────────────────
echo ""
echo "[2] route.ts 비허용 export"
ALLOWED="GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|runtime|dynamic|revalidate|fetchCache|dynamicParams|preferredRegion|maxDuration|generateStaticParams|config"
BAD=""
while IFS= read -r f; do
  names=$(grep -oP '^export\s+(?:async\s+)?(?:const|function|let|var|class)\s+\K\w+' "$f" 2>/dev/null)
  for n in $names; do
    echo "$n" | grep -qE "^($ALLOWED)$" || BAD="$BAD\n    ✗ $f → export '$n'"
  done
done < <(find src/app -name route.ts 2>/dev/null)
if [ -n "$BAD" ]; then echo -e "${BAD#\\n}"; FAIL=1; else echo "    ✓ 없음"; fi

# ── ③ page.tsx 의 Promise params (이 프로젝트는 Next 14) ──────────────────
echo ""
echo "[3] page.tsx Promise params (Next 14 = 동기여야 함)"
P=$(grep -rln "params: Promise" src/app --include=page.tsx 2>/dev/null)
if [ -n "$P" ]; then echo "$P" | sed 's/^/    ✗ /'; FAIL=1; else echo "    ✓ 없음"; fi

# ── ④ 렌더 카피에 내부 개발 용어 ──────────────────────────────────────────
echo ""
echo "[4] UI 카피 내부 용어 (파일명·라운드번호)"
J=$(grep -rn "Round [0-9]\+ \(자동화\|미터링\)\|include_cta=True\|trace_url\|_loader (" src/app/admin src/components/admin \
     --include=*.tsx 2>/dev/null | grep -v "^\S*: *[/*]" | grep -v "^\S*: *\* ")
if [ -n "$J" ]; then echo "$J" | sed 's/^/    ⚠ /'; else echo "    ✓ 없음"; fi

echo ""
if [ $FAIL -eq 0 ]; then
  echo "RESULT: ✅ PASS — push 가능"
else
  echo "RESULT: ❌ FAIL — 위 항목 수정 후 재실행"
fi
exit $FAIL
