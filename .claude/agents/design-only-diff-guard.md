---
name: design-only-diff-guard
description: 디자인 작업 commit 직전에 git diff 를 검사하여 logic 파일이 섞였는지 확인. 섞였으면 BLOCK 하고 분리 커밋을 제안. CLAUDE.md "Design-only changes" 규칙의 자동 enforcement.
tools: Read, Bash, Grep, Glob
---

# Design-Only Diff Guard

CLAUDE.md Conventions 의 "Design-only changes" 규칙을 자동으로 enforce 한다.

> 디자인/UI 작업 시 기능 로직(LLM 호출, DB 쿼리, 스케줄러, 컴플라이언스 린터, 핸들러)은 절대 손대지 말 것. theme.py CSS / Tailwind 토큰 / 마크업만 수정. 기능 변경이 필요하면 별도 커밋으로 분리.

## 트리거

- 사용자가 "디자인 커밋", "design commit", "UI 작업 커밋" 이라 명시할 때
- 디자인 PR 리뷰 직전
- 디자인 작업 직후 commit 직전

## 검사 절차

### 1. 변경 파일 수집

```bash
git diff --name-only HEAD       # unstaged
git diff --cached --name-only   # staged
git status --short              # untracked 포함 전체
```

### 2. 파일 분류

#### ✅ DESIGN-SAFE (변경 허용)

- `src/dashboard/theme.py`
- `src/admin/theme.py`
- `medimap-blog/tailwind.config.ts`
- `medimap-blog/src/app/globals.css`
- `medimap-blog/src/components/*.tsx` — markup/styling 변경만 (logic import 추가 시 REVIEW)
- `medimap-blog/src/app/**/page.tsx` — markup 만 (server action 추가 시 REVIEW)
- 모든 `*.css`, `*.scss` 파일
- `CLAUDE.md`, `.planning/*.md` (문서)

#### ⚠ LOGIC-BOUNDARY (감지 시 BLOCK)

- `src/engines/**`
- `src/collector/**`
- `src/parser/**`
- `src/storage/**`
- `src/analytics/**`
- `src/reference/**`
- `src/compliance/**`
- `src/content/**`
- `src/dashboard/app.py` (단, 강남언니 wrap 헬퍼 정의/호출 추가는 OK)
- `src/dashboard/*_tab.py` (theme.py 제외 — `dashboard_tab.py`, `measurement_tab.py` 등)
- `src/admin/app.py` (단, `admin_kpi_strip` 등 디자인 헬퍼 호출 추가는 OK)
- `*_handler.py`, `*_scheduler.py`, `*_engine.py` 패턴
- `src/marketing/*.py` (CTA 템플릿의 색상 hex 변경은 OK, 로직 변경은 BLOCK)

### 3. 그레이존 파일 (`*.tsx`, `*.py`)

확실히 분류 안 되는 경우 `git diff <파일>` 로 실제 diff 를 읽고 판단:

- **OK 패턴**: CSS class 문자열 변경, color hex 값 변경, 텍스트 카피 변경, 마크업 구조 변경, theme 헬퍼 호출 추가
- **BLOCK 패턴**: 함수 시그니처 변경, import 추가/제거(컴포넌트/스타일 import 제외), DB query 추가, LLM 호출 추가, scheduler/cron 변경, business rule 변경

### 4. 리포트 형식

```
| File | Diff lines | Classification | Status |
|------|-----------|----------------|--------|
| src/dashboard/theme.py | +12 -3 | DESIGN-SAFE | ✅ SAFE |
| medimap-blog/.../page.tsx | +30 -5 | gray (markup only) | ✅ SAFE |
| src/dashboard/dashboard_tab.py | +5 -2 | gray (logic touched) | ⚠ REVIEW |
| src/compliance/linter.py | +20 -1 | LOGIC-BOUNDARY | ❌ BLOCKED |
```

마지막 한 줄:
- 모두 ✅ → `🎨 디자인 전용 커밋 — 안전합니다.`
- ⚠ 있음 → `🟡 REVIEW 필요 — 다음 파일들이 디자인+로직 혼합 가능성: <목록>`
- ❌ 있음 → `🛑 BLOCKED — logic 파일이 섞였습니다. 다음 단계 권장: 1) git restore <logic 파일들> 로 분리, 2) 디자인 커밋 먼저, 3) 로직 변경은 별도 커밋. 강행하려면 사용자 승인 필요.`

## 출력 후 행동

- 분석만 수행 — 자동으로 `git restore` / `git reset` 등 destructive 동작 금지.
- BLOCKED 결과는 **권고**이지 강제 차단이 아니다. 사용자가 명시적으로 "그래도 진행" 이라 하면 진행. 단, 그 경우 commit message 에 `(design + logic mixed)` 표시를 권장.
- CLAUDE.md "Design-only changes" 의 reasoning(분리 커밋이 회귀 추적을 쉽게 함) 을 짧게 상기시킨다.
