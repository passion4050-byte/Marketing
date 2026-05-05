---
description: ahead 상태 + 3개 라이브 사이트 deploy latency 한 번에 점검 — "라이브 확인 가능" 보고 직전에 실행
---

# /live-push-status

`commit + push 까지 한 묶음` 규칙의 실행 레이어. 라이브 영향 코드를 commit 만 하고 push 안 한 채 "라이브 확인 가능" 으로 보고하는 실수를 막는다.

## 실행 순서

### 1. ahead 커밋 검사

```bash
git log --oneline origin/main..HEAD
```

- 출력이 비어 있음 → 로컬이 origin 과 동기화됨 (OK)
- 출력에 커밋이 있음 → **WARNING — push 전 커밋이 남아있음** 으로 표시하고 커밋 목록 출력

### 2. 작업 트리 dirty 검사

```bash
git status --short
```

- 비어 있음 → clean (OK)
- 출력 있음 → **WARNING — uncommitted changes** 로 파일 목록 출력

### 3. 최근 5개 commit 표시

```bash
git log --oneline -5
```

사용자가 "어떤 커밋이 라이브로 나갔는지" 한눈에 확인할 수 있도록.

### 4. 배포 토폴로지 리포트

```
| Site | URL | Trigger | Expected latency |
|------|-----|---------|------------------|
| 테넌트 대시보드 | https://blogkey.streamlit.app | main push → Streamlit Cloud auto | 1~2분 |
| 어드민 백오피스 | https://blogkey-adm.streamlit.app | main push → Streamlit Cloud auto | 1~2분 |
| 블로그/랜딩 | https://medimap-blog-phi.vercel.app | main push → Vercel deploy hook | 즉시 |
```

### 5. 최종 판정

- ahead=0 AND dirty=0 → **✅ LIVE 확인 가능** (1~2분 후 Streamlit, Vercel은 즉시 반영)
- ahead>0 → **⚠ PUSH 필요 — `git push origin main` 실행 후 재확인**
- dirty>0 → **⚠ uncommitted changes — commit 또는 stash 후 재확인**

## 트리거 시점

- 라이브 영향 코드 commit 직후
- 사용자에게 "이제 라이브에서 확인하세요" 알림 직전
- 세션 wrap-up 직전에 "남아있는 work 없는지" 점검

## 도구 사용 가이드

- 모두 `Bash` 로 실행. read-only 명령만 사용.
- push 자동 실행 금지 — 사용자가 직접 결정해야 함 (CLAUDE.md "라이브 영향 코드는 commit 후 즉시 push" 정책의 인지 트리거 역할).
