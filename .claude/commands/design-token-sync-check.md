---
description: 강남언니 디자인 토큰 4파일 + 인라인 hex + SVG gradient 의 브랜드 컬러 일관성 검사
---

# /design-token-sync-check

3개 사이트(blogkey 테넌트 / blogkey-adm 어드민 / medimap-blog 블로그)가 공유하는 강남언니 디자인 토큰의 sync 상태를 검사합니다.

CLAUDE.md "Cross-site design sync" / "Token-first components" 규칙의 실행 레이어입니다 — 한 곳만 빠뜨려도 리브랜딩 시 색이 어긋나는 사각지대를 자동으로 잡아냅니다.

## 확정 팔레트 (canonical)

- Brand: `#FF4D5E` (핫핑크)
- Accent: `#FF6B35` (오렌지-레드)
- Admin Primary: `#4F5DF8` (퍼플)
- Mint: `#15CBA8`

## 실행 순서

### 1. 토큰 파일 4개 hex 값 추출

| # | 파일 | 검사 대상 |
|---|------|-----------|
| 1 | `src/dashboard/theme.py` | `Colors.PRIMARY`, `Colors.ACCENT` |
| 2 | `src/admin/theme.py` | `GnColors.BRAND`, `GnColors.PRIMARY`, `GnColors.MINT` |
| 3 | `medimap-blog/tailwind.config.ts` | `brand.DEFAULT`, `accent.DEFAULT` (필요 시 `500` 키) |
| 4 | `medimap-blog/src/app/globals.css` | 하드코딩 hex (있으면 안 됨, `var(--*)` 또는 `@apply` 만 허용) |

### 2. 인라인 hex 누수 검사 (드리프트 위험)

이론상 토큰 파일에서 import 해야 하는데 직접 hex 가 들어간 경우를 찾는다.

| # | 파일 | 변수/위치 |
|---|------|-----------|
| 5 | `src/dashboard/dashboard_tab.py` | `_BRAND` 등 |
| 6 | `src/dashboard/measurement_tab.py` | `_BRAND_PINK` 등 |
| 7 | `src/admin/app.py` | CSS 문자열 내 hex |
| 8 | `src/marketing/cta_templates.py` | 템플릿 내 hex |

### 3. SVG `<linearGradient>` stop-color 검사 (Tailwind 사각지대)

Tailwind 토큰이 SVG 인라인 속성에는 닿지 않으므로 별도 체크. 하드코딩이 정책상 허용되는 유일한 영역이지만, 캐노니컬 팔레트와 일치해야 한다.

| # | 파일 | 검사 대상 |
|---|------|-----------|
| 9 | `medimap-blog/src/components/Header.tsx` | `<stop stopColor="...">` |
| 10 | `medimap-blog/src/components/Footer.tsx` | `<stop stopColor="...">` |

### 4. 결과 리포트

다음 표 형식으로 출력:

```
| File | Token/Variable | Found | Canonical | Status |
|------|----------------|-------|-----------|--------|
| src/dashboard/theme.py | Colors.PRIMARY | #FF4D5E | #FF4D5E | PASS |
| src/admin/theme.py | GnColors.BRAND | #FF4D5E | #FF4D5E | PASS |
| ... |
```

상태 분류:

- **PASS** — 캐노니컬과 일치
- **WARN** — 값은 맞지만 토큰 import 가 아닌 인라인 hex (드리프트 위험)
- **FAIL** — 캐노니컬과 다름, 즉시 수정 필요

마지막에 한 줄 요약: `✅ 전체 동기화 OK` 또는 `⚠ N개 FAIL / M개 WARN — 수정 필요`.

## 도구 사용 가이드

- `Read` 로 토큰 파일 4개 읽기 (라인 한정 OK)
- `Grep` 으로 인라인 hex 검색: `pattern="#[0-9a-fA-F]{6}"`, 대상 파일 8개
- `Grep` 으로 SVG stop-color: `pattern="stopColor=\"#[0-9a-fA-F]{6}\""`, 대상 `*.tsx`
- 부수 효과 없이 read-only — 자동 수정하지 말 것 (사용자가 결과 보고 결정)

## 트리거 시점

- 브랜드 팔레트 변경 후 commit 직전
- 새로운 컴포넌트 추가 후 (인라인 hex 누수 확인)
- "왜 이 페이지만 색이 다르지?" 의심 시
- 리브랜딩 PR 리뷰 시
