# 🪝 Vercel Deploy Hook — medimap-blog 자동 누적 보장

medimap-blog/ 의 새 글이 main 에 push 됐는데도 Vercel 자동 git 통합이 트리거 안
되는 경우를 대비한 백업 자동화. GitHub Actions 가 deploy hook 을 강제로 호출 →
Vercel 이 빌드 큐에 적재 → 1~2분 후 production URL 갱신.

## ⚠️ GitHub Actions 워크플로우 파일을 web UI 에서 추가해야 합니다

이 repo 의 OAuth 토큰에 `workflow` scope 가 없어 자동화 스크립트로
`.github/workflows/*.yml` 을 push 할 수 없습니다. **GitHub web UI** 에서
**한 번만** 직접 추가하세요 (3 클릭):

1. https://github.com/passion4050-byte/Marketing → 우상단 **Add file** → **Create new file**
2. 파일명: `.github/workflows/deploy-medimap-blog.yml`
3. 아래 워크플로우 내용을 그대로 복사:

```yaml
name: Deploy medimap-blog to Vercel

# Vercel 자동 GitHub 통합이 silently 실패할 때를 대비한 백업 트리거.
# medimap-blog/ 디렉토리가 변경된 main 브랜치 push 마다 Vercel Deploy Hook 호출.
# Vercel 자동 빌드도 동시에 동작하면 같은 commit 으로 두 번 빌드되는데,
# Vercel 이 동일 commit 의 중복 빌드를 dedup 처리하므로 안전.

on:
  push:
    branches: [main]
    paths:
      - 'medimap-blog/**'
  workflow_dispatch: {}

jobs:
  trigger-vercel:
    name: Trigger Vercel deploy
    runs-on: ubuntu-latest
    steps:
      - name: Verify secret is set
        run: |
          if [ -z "${{ secrets.VERCEL_DEPLOY_HOOK }}" ]; then
            echo "::error::VERCEL_DEPLOY_HOOK secret 미설정. README 의 셋업 가이드 참고."
            exit 1
          fi

      - name: Trigger Vercel deploy hook
        run: |
          response=$(curl -sS -w "\nHTTP_STATUS:%{http_code}" -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}")
          status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d':' -f2)
          body=$(echo "$response" | sed '/HTTP_STATUS:/d')
          echo "Status: $status"
          echo "Response: $body"
          if [ "$status" -lt 200 ] || [ "$status" -ge 300 ]; then
            echo "::error::Deploy hook 호출 실패 — Vercel dashboard 에서 hook URL 재발급 필요할 수 있음."
            exit 1
          fi
          echo "::notice::Vercel 빌드 큐 적재 완료. 1~2분 후 production URL 갱신."
```

4. **Commit new file** → main 에 직접 commit

이후 셋업 ↓:

## 셋업 (한 번만, ~2분)

### 1. Vercel — Deploy Hook 발급

1. https://vercel.com/dashboard → **medimap-blog** 프로젝트 선택
2. **Settings** → 좌측 메뉴 **Git** 탭 (또는 General → Git Configuration)
3. **Deploy Hooks** 섹션 → **Create Hook**
   - **Hook Name**: `gh-actions-backup` (자유)
   - **Branch**: `main`
   - **Create Hook** → URL 복사 (형태: `https://api.vercel.com/v1/integrations/deploy/prj_xxx/yyy`)

### 2. GitHub — Repository Secret 등록

1. https://github.com/passion4050-byte/Marketing/settings/secrets/actions
2. **New repository secret**
   - **Name**: `VERCEL_DEPLOY_HOOK`
   - **Secret**: 1단계의 URL 그대로 붙여넣기
3. **Add secret**

### 3. 검증 — 더미 commit 으로 한번 트리거

```bash
git commit --allow-empty -m "test: trigger deploy hook"
git push origin main
```

GitHub Actions 탭 → Deploy medimap-blog to Vercel 워크플로우 → 통과 ✓ →
Vercel dashboard → Deployments → 새 빌드 적재 확인.

## 동작 방식

```
사용자: medimap-blog/content/blog/new-post.mdx 추가
      ↓ git push origin main
      ↓
GitHub:
  · Vercel 네이티브 통합 (자동) — 이게 정상 동작하면 1~2분 빌드
  · GitHub Actions 백업 (.github/workflows/deploy-medimap-blog.yml)
    → curl POST https://api.vercel.com/v1/integrations/deploy/...
    → Vercel 빌드 큐에 적재
      ↓
Vercel 빌드:
  · 같은 commit 의 중복 트리거는 자동 dedup → 1번만 빌드됨
  · sitemap.ts 의 getAllPosts() 가 새 mdx 자동 발견
  · /blog 리스트에 카드 추가, /sitemap.xml 에 URL 추가
      ↓
1~2분 후: medimap-blog-phi.vercel.app/blog 에서 새 글 확인 가능
```

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| Actions 워크플로우가 트리거 안 됨 | medimap-blog/ 외 파일만 변경 | path 필터(`medimap-blog/**`) 정상 — 콘텐츠 변경 시에만 동작 |
| Actions 통과했는데 Vercel 빌드 없음 | Hook URL 무효/만료 | Vercel → Settings → Git → Deploy Hooks → 재발급 후 GH secret 갱신 |
| Vercel 빌드 실패 | MDX frontmatter 오타 / 컴포넌트 import 오류 | Vercel → Deployments → 실패한 빌드 클릭 → Build Logs 확인 |
| 2회 빌드 (중복) | Vercel 자동 통합 + GH Actions 둘 다 트리거 | Vercel 이 같은 commit 의 중복은 dedup — 1번만 청구됨, 무시 OK |

## 수동 트리거

GitHub Actions 탭 → Deploy medimap-blog to Vercel → **Run workflow** 버튼 →
main 브랜치 → Run. 마지막 commit 그대로 빌드 강제.

또는 로컬에서:
```bash
curl -X POST "$VERCEL_DEPLOY_HOOK"
```

## 보안

- Deploy Hook URL 은 인증 토큰 역할 — **공개되면 누구나 빌드 트리거 가능**
- GitHub repository secret 으로만 보관 (.env / 채팅 / 코드에 직접 X)
- 유출 의심 시 Vercel Settings → Git → Deploy Hooks → 옛 hook 삭제 + 새로 발급
