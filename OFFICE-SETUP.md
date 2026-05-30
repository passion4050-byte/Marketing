# 사무실 PC 셋업 가이드

집 PC ↔ 사무실 PC 양쪽에서 메디맵 GEO/AEO SaaS 작업 이어가기 위한 1회 설정 + 일상 sync 흐름.

## 사전 준비 (이미 됐는지 확인)

- ✅ Git 설치
- ✅ Claude desktop 앱 설치 + 집 PC 와 같은 계정 로그인
- ✅ Anthropic Console / Vercel / Supabase / GitHub 같은 외부 서비스는 클라우드라 PC 무관

## Step 1 — 레포 가져오기 (Marketing 폴더)

### Case A: Marketing 폴더가 사무실 PC 에 처음 (clone 안 됨)

PowerShell 일반 권한으로:

```powershell
# 1-A1. Documents 폴더로 이동
cd $env:USERPROFILE\Documents

# 1-A2. clone
git clone https://github.com/passion4050-byte/Marketing.git

# 1-A3. 폴더 안으로 이동
cd Marketing

# 1-A4. 확인 — main 브랜치 + 최신 commit 보임
git log --oneline -5
```

**예상 결과**: 최근 commit 5개가 출력됨 (예: `Round 35 마무리 - T3/NOISE 화이트리스트 확장 ...`).

**처음 git 명령 실행 시 자격증명 popup 뜰 수 있음**:
- "Sign in with your browser" 클릭 → 브라우저 열림 → GitHub 로그인 → 권한 승인
- 한 번만 하면 Windows Credential Manager 가 저장해서 이후 자동.

### Case B: Marketing 폴더가 이미 있음 (이전에 작업한 적 있음)

```powershell
# 1-B1. 폴더로 이동
cd $env:USERPROFILE\Documents\Marketing

# 1-B2. 집 PC 에서 push 한 최신 내용 받기
git pull origin main

# 1-B3. 확인
git log --oneline -5
```

**예상 결과**: `Updating xxx..yyy, Fast-forward, N files changed, N insertions(+), N deletions(-)` 또는 `Already up to date.` (이미 최신이면)

## Step 2 — skills-plugin 의 geo-aeo-saas 폴더 찾기

PC 마다 UUID 폴더명이 다르기 때문에 자동 검색 필요.

PowerShell 일반 권한으로:

```powershell
# 2-1. skills-plugin 루트
$skillsRoot = "$env:LOCALAPPDATA\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\local-agent-mode-sessions\skills-plugin"

# 2-2. geo-aeo-saas 폴더 검색
Get-ChildItem -Path $skillsRoot -Recurse -Filter "geo-aeo-saas" -Directory | Select-Object -ExpandProperty FullName
```

**예상 결과** (한 줄 출력):
```
C:\Users\<사무실user>\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\local-agent-mode-sessions\skills-plugin\<UUID>\<UUID>\skills\geo-aeo-saas
```

이 한 줄을 **그대로 복사** 해 둠 (Step 3 에서 사용).

만약 출력이 비어있으면 → Claude desktop 앱이 한 번도 geo-aeo-saas 스킬을 로드한 적이 없는 것. Claude 앱 한 번 실행 후 재시도.

## Step 3 — symlink 1회 생성 (관리자 권한 필요)

`Win + X` → **"터미널 (관리자)"** 또는 **"Windows PowerShell (관리자)"** 클릭 → UAC "예"

또는 영구 해결: `Win + I → 시스템 → 개발자용 → 개발자 모드 ON` 켜놓으면 이후 일반 PowerShell 에서도 symlink 가능.

```powershell
# 3-1. 원본 (워크스페이스) 경로
$src = "$env:USERPROFILE\Documents\Marketing\SKILL.md"

# 3-2. 대상 (skills-plugin) 경로 — Step 2 에서 복사한 폴더 경로 끝에 \SKILL.md 붙임
#      아래 ←← 부분을 Step 2 출력 결과로 교체
$dst = "C:\Users\<사무실user>\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\local-agent-mode-sessions\skills-plugin\<UUID>\<UUID>\skills\geo-aeo-saas\SKILL.md"

# 3-3. 기존 SKILL.md (옛 버전) 삭제 — symlink 만들려면 이름 비워야 함
Remove-Item $dst -Force

# 3-4. symlink 생성 — $dst 이름으로 $src 를 가리키게
New-Item -ItemType SymbolicLink -Path $dst -Target $src

# 3-5. 검증
Get-Item $dst | Format-List Name, LinkType, Target
```

**예상 결과**:
```
Name      : SKILL.md
LinkType  : SymbolicLink
Target    : {C:\Users\<사무실user>\Documents\Marketing\SKILL.md}
```

`LinkType: SymbolicLink` 가 보이면 성공. 이후 사무실 PC 에서도 워크스페이스 SKILL.md 수정 = skills-plugin 자동 반영.

**권한 에러 ("액세스가 거부되었습니다") 나면**:
- PowerShell 타이틀바에 "관리자" 표시되는지 확인
- `takeown /F $dst` 한 줄 추가 후 재시도

## Step 4 — 일상 작업 sync 흐름

### 사무실 PC 에서 작업 시작 전 — 집 PC 변경사항 받기

```powershell
cd $env:USERPROFILE\Documents\Marketing
git pull origin main
```

### 사무실 PC 작업 끝 — 집 PC 와 sync

```powershell
cd $env:USERPROFILE\Documents\Marketing

# 변경된 파일 확인 (어떤 파일이 수정됐는지)
git status

# 모든 변경 stage (또는 특정 파일만 — 예: git add SKILL.md)
git add -A

# commit (메시지는 한 줄로 설명)
git commit -m "사무실에서 작업한 내용 한 줄 설명"

# GitHub 에 push
git push origin main
```

### 집 PC 로 돌아와서

```powershell
cd C:\Users\user\Documents\Marketing
git pull origin main
```

## 핵심 정리

1. **GitHub 가 진실원** — 두 PC 간 sync 는 항상 push (보냄) / pull (받음). 단 두 PC 에서 같은 파일을 동시에 수정해서 양쪽 모두 push 하면 충돌 (conflict) 발생 → 그때 따로 해결.
2. **symlink 는 PC 마다 1회 설정** — git 추적 안 되는 로컬 link 라서. 한 번 만들면 그 PC 에선 영구.
3. **워크스페이스 파일만 편집** = `Documents\Marketing\SKILL.md` 만 메모장/VS Code 로 열어서 수정 + 저장하면 끝. skills-plugin 쪽은 같은 파일 가리키는 link 라서 자동 sync. Copy-Item 안 써도 됨.

## 사무실 PC 잘 작동하는지 최종 검증

설정 끝나면:

```powershell
# 워크스페이스 SKILL.md 끝 3줄
Get-Content "$env:USERPROFILE\Documents\Marketing\SKILL.md" -Tail 3

# skills-plugin SKILL.md 끝 3줄 (Step 3 의 $dst 경로 그대로)
Get-Content "<Step 3 의 $dst>" -Tail 3
```

→ 둘이 완전 동일하게 나오면 symlink 정상 작동 (실제로는 같은 파일).

## 문제 발생 시

- **`git pull` 충돌**: `git stash` → `git pull` → `git stash pop` (사무실 PC 변경사항 일단 옆에 두고 pull → 다시 적용)
- **`git push` 실패 ("rejected")**: 집 PC 가 더 새로운 commit 가지고 있음 → `git pull --rebase origin main` → 다시 push
- **symlink 깨짐 (Claude desktop 앱 업데이트로 UUID 변경)**: Step 2 다시 실행해서 새 경로 찾고 Step 3 다시
- **git 자격증명 만료**: `git push` 시 popup 다시 뜸 → 브라우저 로그인 한 번 더
