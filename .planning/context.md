# 프로젝트 운영 컨텍스트

CLAUDE.md 의 기술 스택/컨벤션 레벨이 아니라 "왜 이렇게 결정했는지" 의 tacit knowledge 모음. 다음 세션에서 같은 질문이 다시 나오면 여기 먼저 확인.

---

## Streamlit Cloud 배포 (2026-05-03)

### 왜 Vercel 이 아니라 Streamlit Cloud 인가

Vercel = 서버리스/정적 호스팅. Streamlit = 항상 켜져있는 Python 프로세스 + WebSocket 양방향 + 세션 메모리 필요. **기술적으로 호환 불가** — 어떤 어댑터로도 깨끗히 못 돌림.

| Streamlit 이 필요한 것 | Vercel 이 제공하는 것 |
|---|---|
| 항상 켜져있는 Python 프로세스 | 서버리스 함수 (요청 후 종료) |
| WebSocket 양방향 (라이브 리렌더) | 단방향 HTTP |
| 세션 상태 메모리 유지 | 매 요청 콜드스타트, 휘발 |
| 최소 분 단위 실행 | Hobby 60초 / Pro 300초 강제 종료 |

**올바른 분담:**
- Streamlit 앱 → Streamlit Cloud (무료) / Render / Railway
- 마케팅 랜딩페이지 (medimap.kr 등) → Vercel (OK, 별도 프로젝트)

향후 "Vercel 로 배포" 요청 나오면 즉시 이 결정 트리로 정리 — 재논의 불필요.

---

### tools/deploy_github.py — 최초 배포 자동화 스크립트

**용도:** 신규 프로젝트의 **첫 GitHub 푸시** 자동화 (재배포 시엔 불필요).

**흐름:**
1. GitHub Device Flow OAuth (gh CLI 의 public client_id `178c6fc778ccc68e1d6a` 사용 — 별도 OAuth App 등록 불필요)
2. USER_CODE 출력 → 사용자가 https://github.com/login/device 에서 입력
3. 폴링으로 access_token 획득
4. `POST /user/repos` 로 private 리포 생성
5. `git branch -M main` → `git push -u origin main`
6. **푸시 후 즉시 token strip** — `git remote set-url` 로 `.git/config` 에서 토큰 제거

**재배포 시:** `git push origin main` 한 줄. 이 스크립트는 더 이상 안 씀.

**다음 프로젝트에 재사용:** `REPO_NAME` 만 바꾸면 됨. 자동화 후보 — `~/.claude/skills/github-init-push/` 로 승격 검토 가치 있음 (이번 wrap-up 미실행).

---

### SQLite 휘발 + 자동 시드 패턴

**문제:** Streamlit Cloud 컨테이너가 비활성 시 재시작 → SQLite 파일 휘발 → 데모가 빈 DB 로 뜸.

**해결:** `src/storage/seed.py` 의 `seed_if_empty(session)` 가 앱 부트스트랩에서 호출돼:
- `Tenant` 테이블 row count == 0 이면
- `config/tenants.yaml` + `config/compliance_rules/default.yaml` 에서 idempotent INSERT

**한계:** 운영 데이터 (실고객이 입력한 의사/장비/이벤트) 는 영속화 안 됨. 첫 실고객 받기 전에 Supabase Postgres 마이그레이션 필요.

**Supabase 연결 시:** `requirements.txt` 에 `psycopg2-binary` 가 이미 있고, `src/storage/db.py` 의 `_resolve_database_url()` 이 이미 `DATABASE_URL` 환경변수를 읽음. Streamlit Cloud Secrets 에 `DATABASE_URL = "postgresql+psycopg2://..."` 한 줄 추가 + 초기 스키마 적용만 하면 됨.

---

### 사이드바 완전 제거 결정 (UI 설계)

메타정보(LLM provider, 비용 가드레일 등) 가 화면을 영구 점유할 가치 없다는 판단으로 **사이드바를 CSS `display:none` 으로 완전 제거**.

- `initial_sidebar_state="collapsed"` 만으론 부족 (사용자가 토글 가능)
- 사이드바 + collapse 버튼 모두 hide 해야 완전 차단
- 위치: `src/dashboard/theme.py` 의 GLOBAL_CSS — `section[data-testid="stSidebar"] { display: none !important; }`

**탭 구조 (Phase 6.5 기준 — 4-탭 그룹핑):**
1. 📊 인사이트 = 대시보드 + 측정 (sub-tabs)
2. 🛠️ 데이터 관리 = 데이터피딩 + 참고자료 + 브랜드보이스 (sub-tabs)
3. ✨ 콘텐츠 발행 = 통합발행 + AI 시뮬레이터 + 발행 이력 (sub-tabs)
4. 📥 임시 저장함 = 자동 생성 큐

Phase 6.5 이전엔 9-탭 평탄 구조 (FAQ 생성기/블로그 포스트가 별도). 통합 발행 탭이 4채널 모두 흡수해 legacy FAQ/블로그 탭 ~380줄 삭제. 향후 채널 (유튜브/Threads 등) 확장 시 통합 발행에 추가.

이 결정을 되돌리려면 theme.py 의 사이드바 CSS 블록 + app.py 의 `_top_header()` / `main()` 의 4-탭 라우팅을 함께 손봐야 함.

---

### 자동 콘텐츠 큐 (AutoContentSetting) 설계 결정 (Phase 6.5)

`AutoContentSetting` 모델로 tenant 별 자동 큐 설정 (enabled / daily_count / channels) 을 DB 에 저장. `src/collector/scheduler.py` 의 `daily_auto_content_job` 이 매일 03:00 KST 에 실행해 활성 키워드 × 채널로 `GeneratedContent` 를 생성하고 `status='draft'` 로 저장.

- `GeneratedContent.status` 컬럼 (`draft` / `published`) 으로 임시저장함 (`draft_queue_tab`) 과 발행 이력 (`_history_section`) 분리.
- "🚀 발행" 버튼 → `status='published'` 전환 (사용자 검수 후).
- **No auto-posting 원칙 유지:** 자동 큐는 **콘텐츠 생성까지만**. 외부 플랫폼 (네이버 블로그/티스토리/인스타) 자동 게시는 여전히 금지. 발행 = 사용자가 임시저장함에서 본문을 클립보드 복사하거나 status 를 published 로 전환하는 행위까지.
- **키워드 × 채널 라운드로빈** (2026-05-04 갱신): tenant 의 모든 활성 `Keyword` × `AutoContentSetting.channels` 를 (keyword, channel) 쌍으로 round-robin 하여 daily_count 슬롯을 채운다. 어느 한쪽이 1개여도 안전. 1차의 "첫 키워드만" 한계 해소.

---

### 비밀번호 게이트 (`APP_PASSWORD`) 구조

**왜 필요?** 공개 URL 받으면 누구나 들어와 Gemini 무료 quota 소진 + 데모 노출 우려.

**구현:** `src/dashboard/app.py` 의 `_check_password()` — `APP_PASSWORD` 환경변수가 빈 값이면 게이트 비활성, 값이 있으면 폼으로 차단.

**비활성화 방법:** Streamlit Cloud Secrets 에서 `APP_PASSWORD` 줄 삭제 (또는 빈 문자열).

---

## Gemini SDK Deprecation (TODO)

`google-generativeai` 패키지는 deprecated. 신규 `google-genai` SDK 로 마이그레이션 필요. 영향 파일:
- `requirements.txt` — 패키지명 교체
- `src/content/llm.py` — `GeminiProvider` 클래스 (`genai.Client` 방식으로 변경)
- `src/content/simulator.py` — Gemini 호출

다음 세션 P1 작업.

---

## 사용자 (메디맵 운영자) 협업 패턴

- **한국어로 소통.** UI 라벨/콘텐츠/룰셋도 한국어 우선.
- **상세 기획서를 직접 작성.** PROJECT/REQUIREMENTS 는 그 문서에 align.
- **시간 제약 강조.** "3시간 안에 데모" 같은 명확한 deadline 자주 등장 → 스코프 가지치기 우선.
- **디자이너 페르소나 호출 시:** 단순 적용 대신 "디자인 의도 표" 를 함께 제공하면 만족도 높음.
- **`!command` 접두사 안내는 신뢰성 낮음.** 인터랙티브 OAuth 같은 케이스는 **백그라운드 Python 스크립트로 흡수** 하는 게 정답.
