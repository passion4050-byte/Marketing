# 메디맵 GEO/AEO SaaS — 핸드오프 Round 81 (2026-06-24)

> 사무실에서 하루 종일 진행한 Round 81 종합. 집에서 이어가기용.
> 핵심 축: 의료법 안전망 복원 · 진료과 정밀매칭 · 콘텐츠 품질(표/목록/이미지/A·B·C 구조) · 측정/A·B 인프라 · SEO.

---

## 0. 집에서 이어가기 (5분)

```powershell
cd "C:\Users\user\Documents\Marketing"
git pull origin main      # 권한 거부 시 관리자 takeown+icacls (함정 CF)
```
Claude 데스크탑앱 → 폴더 `C:\Users\user\Documents\Marketing` 선택 →
첫 메시지: **"handoff/round81-2026-06-24/HANDOFF.md 읽고 컨텍스트 파악 + 이어서 작업"**

---

## 1. 라이브 URL / 인프라
- 블로그(자사 AEO 자산): https://medimap-blog-phi.vercel.app
- 어드민 콘솔(geo-v2): https://geo-v2-beta.vercel.app
- GitHub: https://github.com/passion4050-byte/Marketing (private, main)
- Supabase: project blogkey (`gifopyowyankfsfghhdi`) — Supabase MCP 로 직접 SQL
- Vercel: geo-v2(admin) + medimap-blog(블로그) push 시 둘 다 자동배포

---

## 2. Round 81 한 일 (전부 푸시 완료)

**제품 핵심 / 컴플라이언스**
- 🔴 **의료법 안전망 복원** — compliance_rules 0행이라 린터가 모든 글 vacuous pass(7병원 OFF) 였음. default.yaml 9룰 × 7 tenant 시드(63행) + 마이그레이션. (함정 CO)
- **split-brain 수정** — UI는 learned_insights.applied, 엔진은 빈 applied_insights 읽던 버그 (함정 CK)
- **진료과(domain_category) 정밀매칭** — 안과 인사이트→안과 병원만(노이즈 0). 카테고리 백필 + 캡처 자동도출 + Path1 게이트 (함정 CL)

**보안**
- admin 미들웨어 **fail-closed**(ADMIN_PASSWORD 미설정 시 전체 public 이던 P0)
- **cronSecret 헤더 전용**(쿼리파라미터 제거) + 신규 tenant 자동분석 401 수정
- `LLM_PROVIDER` 안전폴백(오타→fallback, 별칭) (함정 CM)

**콘텐츠 품질**
- **AEO 표/목록 렌더** — 마크다운 표→`<table>`, 목록→`<ul>/<ol>` + 표 생성 강제(재시도) (함정 CP)
- **A/B/C 리치 구조 로테이션** — 키워드+날짜 해시로 질문답변형/비교선택형/단계실행형 다양화
- **이미지 footgun 수정** — is_enabled() opt-out (함정 CQ)
- **이미지 사람 제거** — flux 얼굴/손 왜곡 → 인테리어·장비 정물 (함정 CR). 기존 35편 일괄 교체(regexp_replace)
- **이미지 1 cover + 2 본문**(4~5장→축소, 로딩속도)
- **Unsplash 실사** — auto-publish 에 키 전달 + 작가 크레딧 figcaption 클릭 링크(약관) + download 트리거
- **검수 미리보기 가독성** — geo-v2 prose 무력 → `.db-html-content` (함정 CS)

**측정 / SEO / 비용**
- **USD 실토큰 미터링** — provider usage 포착 + Fallback 프록시
- **#2 콘텐츠 품질 자동채점** — 구조 점수(H2·질문형·표·목록·이미지) A~D 뱃지 + breakdown (content-queue)
- **#3 FAQPage 스키마** — Type A 글 Q&A 추출 → FAQPage JSON-LD(중복 시각섹션 가드)
- **#4 관련글 카테고리 매칭** — 같은 진료과 우선(내부링크·크롤)
- **sitemap** revalidate 3600 (함정 CN)

---

## 3. DB 상태 (Supabase, 라이브)
- `compliance_rules`: 63행(9룰 × 7 활성 tenant 4·5·6·8·9·10·12) — 신규
- `learned_insights`: 2건, 둘 다 applied=true + domain_category(id2 안과/t4, id1 모발이식/t5)
- `applied_insights`: 0행(완전 고아, drop 가능)
- `ab_tests`: **0행** — A/B 아직 미실행
- 측정: queries(gemini 455·claude 209, 매일 갱신), mentions 296건 — **실측 작동**. Perplexity·OpenAI 엔진은 키 미설정으로 빠짐
- blog_html 콘텐츠 35편 전부 cover+figure 보유(이미지 사람 제거 프롬프트로 교체됨)

---

## 4. 사용자 액션 대기 (우선순위)

- [ ] 🔴 **A/B auto-generate Run** (GitHub Actions) → A/B 데이터 생성 → 며칠 뒤 `/admin/ab-tests` 첫 승자. (선행 ①인사이트적용=완료 ②LLM_PROVIDER=코드폴백처리 ③Run 만 하면 됨)
- [ ] **GSC 색인 체크** (2~3일 뒤) — `/sitemap.xml` "성공" + 발견 페이지 60. 홈은 이미 색인됨. 안 되면 커스텀 도메인
- [ ] (선택) **커스텀 도메인** — blog.medi-map.co.kr 등. 코드 `NEXT_PUBLIC_SITE_URL` 지원. vercel.app 색인 천장 우회
- [ ] (선택) **Perplexity·ChatGPT 측정** — `PERPLEXITY_API_KEY`/`OPENAI_API_KEY` 시크릿(유료). 키 넣으면 자동 합류(코드 graceful skip)
- [ ] (선택) `LLM_PROVIDER`=`fallback`, `MAX_CONTENT_GEN_PER_DAY`=20, `MAX_DAILY_USD`=5 시크릿 정리

---

## 5. 다음 작업 후보
- A/B 데이터 쌓인 뒤 승자 분석 + 인사이트 학습 루프 강화
- 정의형 첫 문장 강제, 내부링크 추가 확장(파트너), Medical/Article 스키마 보강
- 측정에 Perplexity/ChatGPT 합류 후 4엔진 점유율 추세
- (보류) next/image — 본문은 HTML 문자열이라 불가, cover만 가능하나 Vercel 무료 이미지 한도 리스크

---

## 6. 새 함정 (repo SKILL.md 누적: CK~CS)
- **CK** split-brain · **CL** domain_category NULL · **CM** LLM_PROVIDER 오타 하드크래시 · **CN** sitemap 콜드 타임아웃 · **CO** 의료법 안전망 OFF · **CP** 표/목록 escape · **CQ** 이미지 is_enabled footgun · **CR** flux 사람 왜곡 · **CS** geo-v2 prose 무력(typography 플러그인 없음)
- **CE**(재확인) Cowork bash 마운트가 Edit 결과를 truncated/binary 로 읽음 → **권위는 Read 도구 + /tmp git 클론(비마운트)** py_compile. git diff/grep(마운트)는 phantom 가능
- **CF** repo 가 C:\Users\user, 로그인 owner → .git 쓰기 거부 + 잔여 index.lock. push 는 사용자 PC 에서(`del .git\index.lock` 먼저)

생성: 2026-06-24 사무실 — Round 81 종합
