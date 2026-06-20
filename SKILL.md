---
name: geo-aeo-saas
description: 메디맵 GEO/AEO SaaS — Done For You 모델 풀스택. (1) 클라이언트 SaaS 콘솔 medimap-blog-v2 (geo-v2-beta.vercel.app, 딥 티얼 #0E5A6B, /admin 13개 페이지, /admin/login 세일즈 랜딩, ADMIN_PASSWORD 가드, middleware 가드, noindex). (2) 콘텐츠 채널 medimap-blog (medimap-blog-phi.vercel.app, 메디맵 블루 #1B68FF, /with-partners 6 카테고리 hub, AI 크롤러 13종 노출). (3) 같은 Supabase DB (gifopyowyankfsfghhdi), 같은 GH Actions cron. 사용자가 '메디맵 GEO SaaS', 'geo-v2-beta', 'with-partners', 'medimap-blog-phi', 'tenants CRUD', '카카오 채널 pf.kakao.com/_xnWQkG', 'BGN/TETE/모우림 파트너', 'Resend 보고서', 'Pollinations 일러스트', '안과/피부과/성형외과/치과/내과/모발이식 카테고리' 같은 표현 쓰면 반드시 이 스킬을 사용한다. 같은 GitHub 레포 passion4050-byte/Marketing 의 medimap-blog/ + medimap-blog-v2/ 모노레포 통합 운영.
---

# 메디맵 GEO/AEO SaaS — 풀스택 통합 (2026-05-25)

## 무엇

메디맵의 GEO/AEO Done-For-You SaaS. 두 사이트 분리 운영:

- **medimap-blog-v2/** = 클라이언트/운영자 콘솔 (geo-v2-beta.vercel.app, 딥 티얼)
- **medimap-blog/** = 공개 콘텐츠 채널 (medimap-blog-phi.vercel.app, 메디맵 블루)

같은 `passion4050-byte/Marketing` 모노레포 + 같은 Supabase DB + 같은 GH Actions cron.

## 라이브 URL

| 사이트 | URL | 역할 | 디자인 토큰 |
|---|---|---|---|
| 콘솔 (v2) | https://geo-v2-beta.vercel.app | 클라이언트 + 운영자 SaaS | brand #0E5A6B (딥 티얼) |
| 콘텐츠 채널 (v1) | https://medimap-blog-phi.vercel.app | AI 크롤러용 공개 콘텐츠 | brand #1B68FF (메디맵 블루) |
| 메디맵 본 사이트 | https://medi-map.co.kr | 의료뷰티 플랫폼 본체 | 메디맵 본 톤 |

## v2 (콘솔) 라우트 풀세트

```
geo-v2-beta.vercel.app/
├── /                          통합 대시보드 (4 엔진 비교)
├── /data-feeding              다중 entry (의사 N명, 장비 M개) + localStorage
├── /simulator                 4 엔진 BEFORE/AFTER 비교
├── /ai-code                   JSON-LD 자동 합성
├── /faq                       FAQPage Schema
├── /blog                      소재 → 5 변형 자동 + inline 편집
├── /video                     Shorts/Reels/YouTube 스크립트 + mp4 업로드
│
├── /admin/login               🎯 Sales landing 톤 (28회/11명 파일럿 데이터)
├── /admin/(portal)/...        ADMIN_PASSWORD + middleware 가드
│   ├── /                      운영 대시보드 (KPI 4 + 최근 큐/인용)
│   ├── /tenants               클라이언트 CRUD ⚠️ Supabase 직접 연결 필요 (저장 안 됨)
│   ├── /content-queue         검수 큐 + 린트 점수 + 미리보기
│   ├── /keywords              테넌트별 키워드 풀
│   ├── /cost                  14일 비용 차트
│   ├── /funnel                ShortLink ROI
│   ├── /reports               월간 PDF 보고서 (Resend)
│   ├── /reports/[tenantId]    print-friendly HTML 보고서
│   ├── /calendar              콘텐츠 캘린더
│   ├── /citations             4 엔진 AI 인용 + Slack/Email 토글
│   ├── /ab-tests              A/B 변형 비교 + 승자
│   ├── /audit                 감사 로그
│   ├── /users                 사용자 초대 + role (owner/editor/viewer)
│   └── /integrations          YouTube OAuth + Reels/Slack/카톡 (4 카드)
│
└── /api/admin/
    ├── /login + /logout
    ├── /youtube/oauth/start + /callback + /upload
    ├── /reports/email
    └── /notify (Slack/Email/카톡 dispatcher)
```

## v1 (콘텐츠 채널) 라우트

```
medimap-blog-phi.vercel.app/
├── /                                      메디맵 자사 홈
├── /blog/[slug]                           메디맵 자사 블로그 (cover image hero)
├── /admin/* (legacy)                      v1 admin (deprecate 예정)
├── /client/* (legacy)                     v1 클라이언트 포털 (deprecate 예정)
│
├── /with-partners                         ⭐ 6 카테고리 hub (NEW)
├── /with-partners/[category]              카테고리 hub (eyeclinic/derma/plastic/dental/internal/hair)
├── /with-partners/[category]/[partner]    파트너별 글 list
└── /with-partners/[category]/[partner]/[slug]  개별 글 (cover image hero)
```

## 카테고리 6종 (영문 slug 확정)

| 영문 slug | 한글 | 키워드 예시 |
|---|---|---|
| `eyeclinic` | 안과 | 라식, 라섹, 스마일라식, 백내장, 노안교정 |
| `derma` | 피부과 | 여드름, 색소침착, 레이저, 필러, 보톡스 |
| `plastic` | 성형외과 | 안면윤곽, 가슴, 코, 양악, 쌍꺼풀 |
| `dental` | 치과 | 임플란트, 교정, 미백, 신경치료 |
| `internal` | 내과 | 건강검진, 내시경, 갑상선, 당뇨 |
| `hair` | 모발이식 | FUT 절개, FUE 비절개, 헤어라인 |

## URL 구조 (with-partners)

- `/with-partners/eyeclinic/bgn/lasik-recovery` 형태
- 영문 only (한글 slug 사용 X)
- 파트너 표기: 글 헤더 + 푸터 양쪽 (BGN 카드 + 카카오 CTA)

## Supabase 스키마 — 핵심 컬럼

### `tenants`
- 기존 + `partner_slug text unique` ⭐ 추가 (URL용)
- BGN→bgn, TETE→tete, 모우림→mourim (TETE 만 시드 완료, BGN/모우림 수동 update 필요)

### `generated_contents`
- 기존: id, tenant_id, channel, keyword_text, body, slug, title, excerpt, status, compliance_status, cover_image_url, cover_image_alt, published_at
- 신규 ⭐: `partner_category text` (eyeclinic/derma/plastic/dental/internal/hair)
- 신규 ⭐: `is_partner_content boolean default false`

### 마이그레이션 파일
`medimap-blog/db/migrations/002_with_partners.sql` — 실행 완료 (TETE 시드까지)

## 디자인 토큰 (v2 = 딥 티얼)

| 토큰 | 값 |
|---|---|
| `brand.DEFAULT` | `#0E5A6B` |
| `accent.DEFAULT` | `#15B8A6` |
| 4 엔진 컬러 | chatgpt `#10A37F` / claude `#D97706` / gemini `#4285F4` / perplexity `#20B2AA` |
| KPI 폰트 | 2.5rem / weight 700 / -0.02em |

## 디자인 토큰 (v1 = 메디맵 블루)

| 토큰 | 값 |
|---|---|
| `brand.DEFAULT` | `#1B68FF` |
| meta-theme-color | `#1B68FF` |

## Env 셋업 (Vercel geo-v2 프로젝트)

| Key | 상태 | 용도 |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase Postgres (PgBouncer port 6543) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | https://gifopyowyankfsfghhdi.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | server-side write (admin CRUD 에서 사용) |
| `LLM_PROVIDER` | ✅ gemini | |
| `GEMINI_API_KEY` | ✅ | (GOOGLE_API_KEY fallback 지원) |
| `IMAGE_GEN_ENABLED` | ✅ true | Pollinations.AI 이미지 자동 |
| `ADMIN_PASSWORD` | ✅ | /admin 로그인 |
| `ADMIN_SESSION_SECRET` | ✅ | 32자 cookie 서명 |
| `RESEND_API_KEY` | ✅ | 월간 보고서 이메일 |
| `RESEND_FROM` | ✅ `onboarding@resend.dev` (임시) | 도메인 verify 후 본인 도메인으로 |
| `ADMIN_EMAIL` | ✅ `passion4050@gmail.com` | 보고서 받을 메일 |
| `SLACK_WEBHOOK_URL` | ⏸ 미설정 | 알림 (옵션) |
| `YOUTUBE_CLIENT_ID/SECRET` | ⏸ 미설정 | YouTube 업로드 (옵션, /admin/integrations 가이드) |
| `NEXT_PUBLIC_SITE_URL` | (default) | siteConfig fallback = geo-v2-beta.vercel.app |

## Vercel Deployment Protection

- geo-v2 프로젝트: Vercel Authentication **OFF** (외부 server-to-server 호출 가능)
- 보안은 자체 `ADMIN_PASSWORD` + `middleware.ts` cookie 가드로
- `/api/admin/*` (login/logout 제외): cookie 없으면 401
- `/admin/*` (login 제외): cookie 없으면 /admin/login 리다이렉트

## SEO 정책

| 사이트 | 정책 |
|---|---|
| v2 (콘솔) | **noindex/nofollow** — /admin layout + login layout 에 metadata robots |
| v1 (콘텐츠) | **public** — robots.txt 에 AI 크롤러 13종 명시 허용 (GPTBot/ChatGPT-User/OAI-SearchBot/ClaudeBot/Claude-Web/anthropic-ai/Google-Extended/Googlebot/PerplexityBot/Perplexity-User/Bingbot/CCBot 등) |

## Sales Landing (`/admin/login`) — 카피라이팅 확정

- **헤드라인:** "AI 검색 시대, 병원 마케팅 게임이 바뀝니다"
- **서브:** "ChatGPT · Claude · Gemini · Perplexity 가 당신의 병원을 추천하도록"
- **소셜 프루프:** "월평균 AI 인용 28회 · 신규 문의 전환 11명 (파일럿 데이터)"
- **CTA:** 카카오톡 채널 https://pf.kakao.com/_xnWQkG (노란 #FEE500 버튼)
- **2 column 구조:** 좌측 로그인 폼 + 우측 잠재 클라이언트 CTA 카드

## Commit 이력 (최근)

```
9223cf6 feat(v2/admin): sales landing login + noindex + API middleware guard
06b1ec9 fix(v2): remove duplicate /admin/funnel — route conflict with (portal)/funnel
26deb21 fix(v2): correct production URL — medimap-geo → geo-v2-beta.vercel.app
1ffc8e8 feat(db): add with-partners migration
bf1dcac feat(v2): Phase 2 — monthly PDF reports + YouTube upload + A/B + multi-user
49d913f feat(v2/admin): full admin console — 10 pages + YouTube OAuth + Slack/Email notify
2106d00 feat(v2): multi-entry data-feeding + real blog post editor
d1579f0 feat(v2): interactive UI fixes - all dead buttons now working
099b527 feat(v2): medimap-blog-v2 신설 — 광고대행사 시안 (딥 티얼)
```

## 🚧 미완료 작업 (다음 세션에서 진행)

### 1. with-partners 라우트 4종 push (90% 작성됨)

이미 /tmp/Marketing 에 작성된 파일들:
- `medimap-blog/src/lib/partners.ts` (cover_image_url 포함)
- `medimap-blog/src/app/with-partners/page.tsx` (6 카테고리 hub)
- `medimap-blog/src/app/with-partners/[category]/page.tsx`
- `medimap-blog/src/app/with-partners/[category]/[partner]/page.tsx`
- `medimap-blog/src/app/with-partners/[category]/[partner]/[slug]/page.tsx`
- `medimap-blog/src/app/sitemap.ts` (with-partners URL 자동 포함)
- `medimap-blog/src/lib/site.ts` (navItems 에 파트너 콘텐츠 추가)

**작업:** /tmp/Marketing 다시 클론 → 위 파일들 그대로 작성 → commit + push.

### 2. /api/admin/tenants/* CRUD (저장 안 되는 문제 fix)

현재 `/admin/(portal)/tenants/page.tsx` 가 useState 만 사용 → 새로고침 시 사라짐. 

해결책:
- `medimap-blog-v2/src/app/api/admin/tenants/route.ts` — GET (list), POST (create)
- `medimap-blog-v2/src/app/api/admin/tenants/[id]/route.ts` — PATCH, DELETE
- 페이지를 fetch 기반으로 변경
- Supabase tenants 테이블 직접 CRUD (SUPABASE_SERVICE_ROLE_KEY 사용)

같은 패턴 `/api/admin/keywords/*` 에도 적용 (keywords 테이블이 있다면).

### 3. /admin/content-queue 이미지 미리보기 + 본문 복사 시 이미지 URL

`medimap-blog-v2/src/app/admin/(portal)/content-queue/page.tsx`:
- 카드에 cover_image_url thumbnail 표시
- 미리보기 모달에 hero image
- "본문 복사" 시 markdown 에 `![alt](url)` 포함

### 4. /admin/login 카피 미세조정

`medimap-blog-v2/src/app/admin/login/page.tsx`:
- 서브 텍스트에서 "한국 최초의 의료 특화 AI 검색 최적화 (GEO) SaaS" 제거
- 카드 3번째 "100% 4 엔진" → "(파일럿 데이터)" 명시
- 카피라이팅 확정안 그대로 적용

### 5. BGN/모우림 partner_slug Supabase 수동 update

Supabase SQL Editor:
```sql
select id, name, partner_slug from tenants order by name;
-- 결과 보고 정확한 update:
update tenants set partner_slug = 'bgn'    where id = '<BGN tenant id>' and partner_slug is null;
update tenants set partner_slug = 'mourim' where id = '<모우림 id>' and partner_slug is null;
```

## 다음 세션 시작 명령어 (그대로 복사)

```
geo-aeo-saas 스킬 활성화. 다음 작업 진행:
1. /tmp/Marketing 클론 (passion4050-byte/Marketing)
2. medimap-blog 에 with-partners 4 라우트 + sitemap + nav 적용 (스킬 명세 그대로)
3. medimap-blog-v2 에 /api/admin/tenants/* CRUD 추가 (Supabase service_role 사용)
4. /admin/content-queue 이미지 미리보기 + copy 에 image URL
5. /admin/login 카피 미세조정 (28회/11명/파일럿)
6. build + commit + push
끝나면 검증 URL 알려줘.
```

## 학습된 함정 (Pitfalls Catalog — 2026-05-25 round 4 누적)

### Supabase / DB
- **Multi-statement transaction wrap**: Supabase SQL Editor 는 multi-statement 를 single transaction 으로 래핑한다. ALTER TABLE + INSERT 를 한 블록에 묶으면 INSERT 실패 시 ALTER 도 rollback 되어 컬럼 추가가 사라진다. **DDL 과 DML 은 반드시 분리 실행**.
- **prod tenants 스키마 vs admin-mock 컬럼명 mismatch (치명적)**:
  | mock | prod 실제 |
  |---|---|
  | `category` | `domain_category` |
  | `domain` | (없음 — `naver_place_url` / `homepage` 분리) |
  | `contact` | `phone` |
  | `publishCount` `monthlyCost` `joinedAt` `status` | snake_case + ALTER 로 추가 필요 (`publish_count`, `monthly_cost`, `joined_at`, `status`) |
  새 admin CRUD 작성 전 반드시 `information_schema.columns` 로 실제 컬럼명 확인.
- **tenants NOT NULL 컬럼 6개**: `name, domain_category, region, business_model, created_at, password_hash` — INSERT 시 모두 채워야 함. `created_at` 은 default 없음 → `now()` 명시. `password_hash` 도 default 없음 → placeholder string 또는 nullable 검증.
- **generated_contents NOT NULL 컬럼 12개**: 자주 빠뜨리는 것 → `correction_iterations` (default 없음, 0 채워야), `created_at` (default 없음, now() 채워야). updated_at, is_partner_content 는 default 있음.
- **keywords prod 스키마**: `id, tenant_id, text, category, target_brand, is_active` — mock 의 `keyword/dailyTarget/status` 와 완전히 다름. text/category/target_brand 사용.
- **tenant 의 domain_category 가 '기타' 인 경우**: 자동 매핑 함수에서 partner_category=NULL 로 떨어져 /with-partners 라우트 미노출. 운영 보정 SQL 권장: `update tenants set domain_category='안과' where partner_slug='tete';`.

### Admin 화면 전수 mock 상태 (round 4 시점)
프로젝트 시작 시 admin 12개 페이지 중 **content-queue 만** live DB. 나머지 11개 (tenants/keywords/calendar/citations/cost/reports/ab-tests/funnel/audit/users/integrations) 는 mock. **작업 시작 첫 단계로 admin 페이지 전수 mock vs live 매트릭스를 그려야 함** — 단계별 발견은 사용자 신뢰 깎고 비효율.

### Git / GitHub
- **Windows Git Credential Manager 캐시**: 기본 캐시 PAT 가 다른 계정 (예: `marketingdreamus`) 이면 `passion4050-byte/Marketing` push 시 403. 해결: `git remote set-url origin https://<username>@github.com/<owner>/<repo>.git` 으로 username 명시 → 첫 push 시 브라우저 OAuth 또는 PAT 입력 prompt.
- **Sandbox 의 GitHub push 불가**: 자격증명 없음. 모든 코드 변경은 `git format-patch -1 HEAD --stdout > patch` 로 패키징해서 handoff 폴더에 떨군 뒤 사용자가 `git am` 으로 적용.
- **handoff 폴더 구조**: `handoff/round<N>-YYYY-MM-DD/` 에 patch + SQL migrations + README 묶음. 사용자가 운동 가도 한 번에 적용 가능하게.

### Next.js / Vercel
- **Vercel 빌드 캐시 + 브라우저 캐시**: 새 push 후 admin 페이지가 옛 mock 으로 보이면 → 빌드 진행중이거나 브라우저 캐시. `Ctrl + Shift + R` hard reload 필요. 확인 방법: GitHub commits 페이지의 CI 체크 ✓ + Vercel deployment 상태 READY.
- **`/api/admin/*` middleware 가드**: `medimap-blog-v2/src/middleware.ts` 가 `/api/admin/:path*` 매처로 cookie 검증. login/logout 제외 모든 API 가 admin cookie 없으면 401. 같은 도메인 fetch 는 cookie 자동 전송 OK.
- **next/image remotePatterns**: medimap-blog 의 next.config.js 에 `image.pollinations.ai`, `gifopyowyankfsfghhdi.supabase.co`, `*.supabase.co` 허용. medimap-blog-v2 는 admin 콘솔이라 native `<img>` 사용 (remotePatterns 설정 없음).
- **ISR revalidate=60** + `dynamicParams=true`: 빌드타임 SSG 후 새 데이터는 60초 ISR. `/with-partners/*` 라우트는 이 패턴.

### Pollinations / 외부 이미지
- **seed 파라미터 필수**: `https://image.pollinations.ai/prompt/<...>?width=1200&height=630&seed=<N>&nologo=true` — seed 없으면 매 호출마다 새로 생성 (5~15초 소요, 가끔 timeout). seed 박으면 deterministic 캐시 hit.
- **클라이언트 fallback**: 그래도 timeout 시 broken 표시되므로 `<img onError>` fallback (ImageOff icon) 필수.

### 효율 워크플로 (Efficient Workflow — Repeat-Avoidance Rules)

1. **작업 시작 첫 단계** = admin 전수 점검 + prod 스키마 진단. 코드 작성보다 먼저.
2. **prod 스키마 진단 1줄**:
   ```sql
   select column_name, data_type, is_nullable, column_default
   from information_schema.columns
   where table_name = '<table>' order by ordinal_position;
   ```
   특히 `is_nullable='NO'` + `column_default IS NULL` 인 컬럼 = INSERT 시 반드시 채워야 함.
3. **NOT NULL 진단 후 INSERT**:
   ```sql
   select column_name from information_schema.columns
   where table_name = '<table>' and is_nullable = 'NO'
     and column_default is null;
   ```
4. **DDL/DML 분리 실행**: ALTER → 검증 → INSERT → 검증 단계별.
5. **mock 페이지를 발견하면 즉시 매트릭스화** (라이브/즉시 가능/외부 ETL 분류) → 사용자 동의 후 일괄 처리. 단계별 발견 금지.
6. **라이브 검증 자동**: 발행/저장 작업 후 `web_fetch` 로 즉시 라이브 확인. 캐시 이슈 회피 위해 사용자에게 hard reload 안내.
7. **patch 묶음 packaging**: handoff 폴더에 SQL + patch + README 한 세트. 운동 가도 한 번에 적용 가능하게.
8. **Vercel 빌드 검증 흐름**: push → GitHub commits 페이지 체크 ✓ → Vercel deployment READY → hard reload → 라이브 검증.
9. **신뢰 회복 패턴**: 사용자가 mock/문제 발견 시 변명 X, 인정 + 전수 매트릭스 + 우선순위 + 작업 시간 약속.

## 알려진 함정 (구 기록 — 기존 항목 유지)


- SSG 빌드 timeout: `staticPageGenerationTimeout: 180` + DB 쿼리 8 초 Promise.race
- 한글 slug: `encodeURIComponent` + `decodeURIComponent`
- PgBouncer transaction mode: `prepare: false`
- Gemini JSON 깨짐: `response_mime_type: "application/json"` + lenient parser
- Next.js route group 중복: `/admin/funnel/page.tsx` 와 `/admin/(portal)/funnel/page.tsx` 동시 존재 시 빌드 실패
- ESLint `react/no-unescaped-entities`: 한국어 콘텐츠에서 `'` `"` 사용 시 빌드 실패 — `.eslintrc.json` 에 룰 OFF 설정
- Vercel root layout 의 Sidebar 가 /admin 라우트 가로채는 문제: `SidebarShell` 패턴으로 pathname 분기
- Supabase 컬럼명: `partner_slug` (tenants), `partner_category` + `is_partner_content` (generated_contents)
- 한글 commit message: PowerShell 에서 dash 파싱 에러 — 영문으로 작성
- 디스크 ENOSPC: /tmp 가득 시 `.next` 캐시 제거 (다음 build 전)

---

## Round 22-23 (2026-05-28) — 자동 발행 정책 DB + 콘텐츠 운영 인프라

### Round 22 — Phase 3 content_settings 시스템

**완성된 모듈**
- DB: `medimap-blog/db/migrations/022_content_settings_table.sql` — key-value 12개 정책 (tone, length_min/max, cta_target, keyword_seed_mode, disclaimer_style, image_count_total, image_style, image_realistic_only_for, publish_schedule, content_pattern_pool, lead_pattern_pool)
- Admin UI: `medimap-blog-v2/src/app/admin/(portal)/content-settings/page.tsx` + `src/app/api/admin/content-settings/route.ts`
- Sidebar: `AdminShell.tsx` 에 "콘텐츠 설정" 메뉴 추가 (Settings 아이콘)
- Python loader: `src/content/content_settings.py` — Supabase REST 직접 호출, 모듈 캐시, DEFAULTS fallback
- `image_picker.py` — `inject_body_illustrations()` 본문 H2 직전 figure 자동 삽입
- `scheduler.py` — `_generate_draft` 가 settings.length_max → target_chars 전달 + body 일러스트 호출
- `auto-publish.yml` — cron 매시간 → `0 23 * * *` (매일 08:00 KST) 단일 실행

**검증 단계에서 발견·수정한 버그 2건**
1. `inject_body_illustrations` 멱등성 깨짐: `existing >= max_count + 1` 가 cover figure 를 body 안에 있다고 잘못 가정 → cover 는 별도 컬럼이라 `existing >= max_count` 로 수정. 재실행 시 figure 도배 위험 제거.
2. `_coerce_pool` 빈 문자열에서 `[]` 반환: 빈/whitespace 도 DEFAULTS 로 폴백하도록 수정.

### Round 23 — 한방 카테고리 + 자동화 인프라 + 콘텐츠 batch

**한방 카테고리 신설**
- `partners.ts` PartnerCategory 에 `'oriental'` 추가 (한글 라벨 "한방", description "한약·체형교정·다이어트·통증·면역")
- `/api/admin/content-queue/[id]` CATEGORY_MAP 에 `'한방의원' → 'oriental'`, `'한방' → 'oriental'`
- DB CHECK constraint 교체:
  ```sql
  ALTER TABLE generated_contents DROP CONSTRAINT IF EXISTS generated_contents_partner_category_check;
  ALTER TABLE generated_contents ADD CONSTRAINT generated_contents_partner_category_check
    CHECK (partner_category IS NULL OR partner_category IN ('eyeclinic','derma','plastic','dental','internal','hair','oriental'));
  ```

**자동화 인프라 (Migration 024)**
- `auto_content_settings` 테이블 CREATE TABLE IF NOT EXISTS + `ALTER TABLE ... ALTER COLUMN updated_at SET DEFAULT NOW()` 보강
- PostgreSQL trigger: `tenants` INSERT 시 `auto_content_settings` row 자동 생성 (enabled=false, daily_count=1)
- 모든 기존 tenant 에 누락 row backfill
- 자사 tenant 신설: `partner_slug='medimap-self', business_model='self', domain_category='자사인사이트', region='서울'` → id=12
- 자사 키워드 3개: '의료 GEO 최적화' / '의료법 광고 가이드' / '병원 마케팅 GEO' (id 29/30/31)
- 자사 auto_content_settings: `enabled=true, daily_count=3, auto_publish=true, channels=["blog_html"]`

**파트너 6편 v3 스타일 SQL (Migration 025)**
- id 81 BGN 잠실 — 잠실 노안교정 EDOF·다초점 비교 (eyeclinic)
- id 82 밴스모자이너의원 — 강남 모발이식 회복 6개월 (hair)
- id 83 지우피부과 — 강남 리쥬란 힐러 (derma)
- id 84 바를정 한방의원 — 한방 다이어트 6주 (oriental — 첫 한방 글)
- id 85 벨리셀 피부과 — 여드름 흉터 (derma)
- id 86 밝은눈안과 부산 — 부산 라식 비교 (eyeclinic)
- 각 글 본문 6500~7000자, cover 1 + 본문 4 figure, 이모지 H2, 배지 H3, amber disclaimer, 테이블, FAQ
- 사용자 검수 후 보정: 본문 끝 그라디언트 CTA 박스 제거 (사이드바와 중복) + FAQ `<details>` → 펼친 박스

**자사 인사이트 3편 cron 발행** (id 87, 88, 89)
- Gemini 503 UNAVAILABLE 2회 발생했지만 retry 로 최종 3편 모두 published
- 1m 50s 소요, last_run_at 정상 업데이트

**삭제 안전망**
- `/admin/(portal)/tenants/page.tsx` 삭제 confirm 강화: 클라이언트 이름 + "연결된 모든 글·키워드·발행 정책이 함께 삭제됩니다" 명시

---

## 알려진 함정 (Round 22-23 추가)

### ORM-only default vs DB-level default 차이
SQLAlchemy `default=_now`, `default=0`, `default=False` 등은 Python ORM 레벨이지 DB constraint 가 아님. 직접 SQL INSERT 하면 NOT NULL violation. **Migration 024/025 작성 중 4개 컬럼에서 발생**:
- `auto_content_settings.updated_at` → `ALTER TABLE ... ALTER COLUMN updated_at SET DEFAULT NOW()`
- `generated_contents.correction_iterations` → `SET DEFAULT 0`
- `generated_contents.llm_provider` → `SET DEFAULT 'manual'`
- `generated_contents.status` → `SET DEFAULT 'draft'`
- `generated_contents.compliance_status` → `SET DEFAULT 'pass'`
- **Lesson**: 신규 SQLAlchemy 컬럼 추가 시 `server_default=` 도 함께 명시. 이미 default 없이 만든 컬럼은 ALTER 로 보강.

### CREATE TABLE IF NOT EXISTS 한계
기존 테이블의 컬럼 default/constraint 를 변경하지 못함. 새 default 추가/스키마 변경은 별도 `ALTER TABLE` 필요. **재실행 안전한 마이그레이션 작성 시 `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... IF EXISTS ALTER COLUMN ...` 패턴 권장.**

### tenants NOT NULL 컬럼 — region
tenants.region 이 NOT NULL. 자사 tenant 처럼 region 이 무의미한 경우도 placeholder ('서울', '본사' 등) 명시 필수. address/naver_place_url/phone/homepage 도 안전망 차원에서 명시 권장 (각 마이그레이션이 NOT NULL 추가하기 전이라면).

### partner_category CHECK constraint 교체 패턴
DB 레벨 enum 역할. 새 카테고리 추가 시 DROP + ADD 두 단계:
```sql
ALTER TABLE generated_contents DROP CONSTRAINT IF EXISTS generated_contents_partner_category_check;
ALTER TABLE generated_contents ADD CONSTRAINT generated_contents_partner_category_check
  CHECK (partner_category IS NULL OR partner_category IN (...));
```

### Pollinations.AI lazy generation
새 URL 첫 요청 시 5~30초 생성 시간 — 그 동안 broken image (X 박스). 페이지 새로고침 + 1~2분 대기로 회복. 다수 (30장+) 동시 요청 시 더 두드러짐. **장기 해결: cover_image 처럼 Supabase Storage 업로드 후 public URL 사용**. 현재는 cover 만 Storage, body figure 는 Pollinations URL 직접.

### Vercel serverless module-level cache (60s TTL)
`posts.ts` / `partners.ts` 의 `_postsCache`, `_allPostsCache` 가 인스턴스 메모리에 stale 한 응답을 들고 있음. cron 으로 새 글 발행 후 즉시 표시 안 됨. **해결**:
1. Vercel redeploy (즉시)
2. `VERCEL_DEPLOY_HOOK` secret → GitHub Actions cron 끝에 자동 호출
3. 60s 기다리기

### Gemini 503 UNAVAILABLE
무료 tier 라 우선순위 낮음. 503 이 잦음. retry 또는 Anthropic/OpenAI fallback 필요. 현재 generator.py retry 로 1m 50s 안에 회복.

### Vercel build duplicate identifier error
TypeScript 가 같은 `const` 두 번 정의되면 빌드 실패. sandbox edit 동기화 문제로 같은 edit 두 번 일어날 가능성 주의. **Round 22 의 PATCH endpoint 중복 사고**. push 전 `git diff` 또는 untracked 파일까지 한 번 검토.

### scheduler.py 의 한글 slug
`_make_slug()` 가 한글 그대로 유지. SEO·AEO (Perplexity·ChatGPT URL 파싱) 측면에서 영문 권장. 영문 transliteration 또는 keyword 영문 매핑 풀 필요 — 별도 라운드 작업.

### auto_content_settings 비어있으면 cron 0편 발행
GitHub Actions cron 트리거하기 전에 자사 또는 파트너 tenant 에 `auto_content_settings` row 가 `enabled=true` 로 있어야 함. 이전 사고 (CASCADE DELETE 11 row) 로 자사 tenant 와 함께 사라졌던 경험. **trigger 추가 후 신규 클라이언트 부터는 자동 row 생성. 기존은 backfill SQL 필요.**

---

## 운영 흐름 — 신규 클라이언트 추가 (Round 23 이후)

**SQL 실행 0회 — 어드민 UI 클릭만으로 완결**:

```
1. /admin/tenants → "추가" → 이름·partner_slug·카테고리·지역 입력 → 저장
   ↓ (PostgreSQL trigger 가 auto_content_settings row 자동 생성, enabled=false default)
2. /admin/keywords → 그 테넌트 선택 → 키워드 2~3개 입력 → 저장
   ↓ (is_active=true 로 자동 등록)
3. 자동 발행 활성화 원하면 /admin/content-settings 또는 별도 토글 UI 에서 enabled=true 변경
4. 다음 날 08:00 KST 에 cron 이 알아서 발행
```

**관리자 운영 사이클**:
- 매일 08:00 KST: cron 발행
- 매일 09:00 KST: `/admin/content-queue` 검수 (필요 시 인라인 편집)
- 매일 09:30 KST: 미승인 글은 reject 또는 draft 보존
- 매주 월요일: `/admin/content-settings` 에서 정책 미세 조정 (톤·길이·키워드 풀)

---

---

## Round 24 (2026-05-29) — /blog 표시 복구 + cron 자동 redeploy

### 발견 — Round 16 의 `blog_category=NULL` 필터가 자사 cron 글까지 막음

`posts.ts` `getAllPosts()` 의 `.filter((m) => m.blogCategory !== undefined)` 가 자사 인사이트 자동 발행 글(id 87/88/89) 도 함께 제외. /with-partners 는 정상이지만 /blog 만 "0편" 표시. 캐시 문제로 오인 가능 — Round 16 의 의도적 필터가 원인.

### 작업

**1. Migration 026 — 자사 글 3편 blog_category 채우기**
- id 87 (의료 GEO 최적화) → `ai_trend`
- id 88 (의료법 광고 가이드) → `hospital_marketing`
- id 89 (병원 마케팅 GEO) → `hospital_marketing`

**2. `scheduler.py` 자동 매핑 — 자사 tenant 발행 시 blog_category 자동 할당**
- 새 함수 `_map_blog_category(keyword: str) → str` 추가
- 매칭 우선순위:
  1. GEO/AEO/AI 검색/Perplexity/ChatGPT/Gemini/Claude/LLM → `ai_trend`
  2. 콘텐츠/포스팅/블로그 글/키워드 전략 → `content_marketing`
  3. 의료법/광고/마케팅/SEO/병원 운영 → `hospital_marketing`
  4. default → `hospital_marketing`
- `_generate_draft` 에서 자사 tenant (`business_model='self'` OR `partner_slug='medimap-self'`) 식별 후 `obj.blog_category` 미설정이면 매핑 적용
- **알려진 한계**: 키워드에 GEO 와 마케팅 단어가 같이 있으면 (예: "병원 마케팅 GEO") GEO 우선매칭으로 ai_trend 로 분류됨. 사용자가 운영 도중 어드민에서 수정 가능.

**3. `auto-publish.yml` 두 hook 호출 구조**
- 기존 단일 `VERCEL_DEPLOY_HOOK` → 분리:
  - `VERCEL_DEPLOY_HOOK_BLOG` (medimap-blog 자사+파트너 노출)
  - `VERCEL_DEPLOY_HOOK_ADMIN` (geo-v2 어드민 콘솔)
- 하위 호환 단일 hook 도 fallback 으로 유지

### 알려진 함정 (Round 24 추가)

- **Round 16 의 `blog_category=NULL` 필터** — `/blog` 가 의료 mdx + 자동 발행 파트너 글 섞이지 않도록 추가한 필터. 자사 cron 글까지 막혔던 부작용. 자동 매핑 추가로 해결.
- **매핑 우선순위 충돌** — "병원 마케팅 GEO" 같이 두 카테고리 단어가 섞이면 첫 일치 카테고리로 떨어짐. 의도와 다르면 어드민 수정.

---

---

## Round 25 (2026-05-29) — ORM 매핑 누락 + 어드민 자사 통합

### Round 24 자동 매핑이 실제로 동작 안 했던 진짜 원인

`scheduler.py` 의 `_map_blog_category` 함수가 키워드 → blog_category 자동 매핑 로직을 호출했지만 **DB UPDATE 가 발생 안 함**. 90~97 8편 모두 blog_category=NULL 로 발행됨.

**원인**: `src/storage/models.py` 의 `GeneratedContent` 클래스에 `blog_category` 컬럼이 **ORM 매핑 정의 안 됨**. SQLAlchemy 가 모르는 컬럼이라 `obj.blog_category = ...` 가 Python attribute 만 설정하고 commit 시 무시. DB 컬럼은 Migration 010 에 추가됐지만 ORM 갱신 누락.

### 작업

**1. `models.py` 에 `blog_category` 컬럼 추가**
- `blog_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)`
- 이제 scheduler 의 `obj.blog_category = _map_blog_category(...)` 가 commit 시 DB UPDATE 발생

**2. 매핑 규칙 우선순위 수정 — 사용자 의도 반영**
- 기존: GEO 우선 → "병원 마케팅 GEO" 가 ai_trend 로 분류돼 사용자 의도(hospital_marketing) 와 충돌
- 수정: **의료법/광고/마케팅/병원 운영** 매칭 먼저 → 그 다음 GEO/AEO/AI 트렌드
- 단위 테스트 검증 — 87/88/89 자사 시드 + 90~97 cron 발행 키워드 100% 사용자 SQL UPDATE 와 일치

**3. SQL UPDATE — 90~97 blog_category 채우기**
- ai_trend: 91, 95 (의료 GEO 최적화)
- hospital_marketing: 89, 90, 92, 93, 94, 96, 97 (의료법 광고 가이드 / 병원 마케팅 GEO)

**4. `/api/admin/content-queue` 의 `is_partner_content=true` 필터 제거**
- 사용자 결정: "소속 탭에 같이 표시"
- 콘텐츠 완료 탭에 파트너 + 자사 모두 노출
- `select` 에 `blog_category` 추가 + `live_url` 자사 글 분기 (`/blog/{slug}` vs `/with-partners/...`)

### 알려진 함정 (Round 25 추가)

**ORM 컬럼 누락 → silent fail**:
SQLAlchemy 가 모르는 컬럼에 `setattr(obj, "col", value)` 또는 `obj.col = value` 해도 commit 시 무시. 에러 없음. 자동 매핑이 동작하지 않은 이유. **DB 컬럼을 ALTER 로 추가했으면 반드시 ORM 모델에도 동기화** 필요. 검증 방법: `hasattr(obj, "col")` 가 False 면 누락.

---

---

## Round 26 (2026-05-29) — Pollinations → Supabase Storage 영구 해결

### 배경

Pollinations.AI 는 새 URL 의 첫 요청 시 5~30초 lazy generation. 그 동안 브라우저는 timeout → 빈 X 박스. 30장+ 동시 요청 시 일부 영구 실패. Round 22~25 의 자사 6편 + 파트너 6편 모두 이 패턴으로 일부 figure 가 X 박스로 노출.

### 작업

**1. `src/content/image_uploader.py` 신규**
- `fetch_image_bytes(url)` — Pollinations bytes 다운로드 (60s timeout)
- `upload_bytes_to_storage(bytes, name_hint, subdir)` — Supabase Storage 'post-images' 버킷 업로드
- `migrate_url_to_storage(src_url, ...)` — URL → bytes → Storage URL 한 번에
- `storage_url_for_section_figure(url, keyword, heading)` — scheduler 통합용 wrapper

**2. `src/content/image_picker.py` 보정**
- `generate_body_illustration_for_section()` 가 Pollinations URL 생성 후 Storage 업로드 → 영구 URL 사용
- 업로드 실패 시 Pollinations URL fallback (graceful)
- 다음 cron 부터 body figure 도 안정적 표시

**3. `scripts/migrate_pollinations_to_storage.py` 신규**
- 기존 status='published' 글 일괄 마이그레이션
- cover_image_url (필드) + body 안 `<img src="...pollinations.ai/...">` (정규식 추출)
- 멱등 — 이미 Storage URL 인 글은 skip
- 진행 상황 stdout + 통계 JSON

**4. `.github/workflows/migrate-images.yml` 신규**
- workflow_dispatch 만 (한 번 수동 실행)
- 마지막 step 에서 양 Vercel deploy hook 호출 → 자동 redeploy

### 안정성

- 마이그레이션 실패한 URL 은 그대로 Pollinations URL 유지 (graceful)
- 다음 cron 부터는 발행 시점에 즉시 Storage 업로드
- 향후 새 글 추가 시 X 박스 발생 안 함

---

### Round 26 fix 2/3/4 — Storage 마이그레이션 함정 누적

마이그레이션 워크플로 1차 실패 후 3번의 보정으로 cover 8/8 + body 누적 20개 성공.

**알려진 함정 3가지 (Round 26 누적)**:
- **GitHub Secret 끝의 newline/quote** → `httpx LocalProtocolError: Illegal header value`. SUPABASE_SERVICE_ROLE_KEY 등을 GitHub Secrets 에 복붙할 때 trailing newline 같이 들어감. **모든 env 읽을 때 `.strip().strip('"').strip("'")` 안전망 필수**.
- **Supabase Storage path 에 한글 거부** — `InvalidKey` 400. `_slugify` 가 한글 허용하면 path 에 한글 들어가서 거부. **영문/숫자/하이픈/언더스코어만 허용**.
- **Pollinations 402 Payment Required** — 일부 seed 가 영구 거부 또는 무료 한도 초과. 재시도해도 회복 불가. 마이그레이션이 100% 성공 못 할 수 있으니 `if: !cancelled()` 로 부분 성공만 있어도 redeploy 트리거.

**남은 잔존 — 85번 글 (벨리셀 여드름 흉터)** 의 body figure 4개가 Pollinations 영구 거부. /with-partners 의 해당 글에 X 박스. 운영자가 어드민에서 수동 처리 또는 무시.

---

## Round 27 (2026-05-29 진행 중) — 자사 인사이트 v3 가이드 + 실사 이미지 정책

### 배경

사용자가 `/blog` 자사 인사이트 6편 (87/88/89/93/94/97) 의 가독성 + 정성 부족 + 이미지 부재 보고. LLM(Gemini) cron 자동 생성물의 본질적 한계 — 키워드 3개로 매일 반복 발행하면 일반론 누적.

### 완료

**1. `medimap-blog/docs/CONTENT_GUIDE_v3_SELF_INSIGHTS.md` 신규**
- 자사 인사이트만의 시각 구조 (TL;DR 박스 + 이모지 H2 + 배지 H3 + 메디맵 자체 인용 박스 + 자사 CTA)
- 운영 흐름: LLM 초안 → 운영자 정성 추가 (메디맵 데이터/사례/1인칭 시각/체크리스트)
- 이미지 정책: 자사만 실사 톤 (Professional editorial photography), 파트너는 Pixar 톤 유지
- LLM 만으로는 정성 한계 인정 — 운영자 검수가 필수임을 명시

### 다음 라운드에 이어서 할 일 (Round 27 후속)

- **87번 (의료 GEO 최적화) 샘플 본문 재작성** — 가이드 적용 사례 (TL;DR + 표 + 메디맵 인용 박스 + 실사 이미지 5장)
- **사용자 OK 후 88/89/93/94/97 같은 패턴 일괄**
- **scheduler.py / generator.py LLM prompt 에 가이드 system prompt 주입** — 자사 tenant 일 때만 v3 가이드 강제
- **image_picker.py prompt 분기** — 자사 tenant 면 실사 톤, 파트너면 Pixar 톤
- **Migration 028** — 자사 6편 body + 새 cover 일괄 UPDATE

---

---

## Round 28 (2026-05-30) — 발행 로테이션 + CTA + 검수 단계 cron

### 배경

- Pollinations 무료 한도 빠르게 소진 (자사 6편 + 파트너 6편 × 매일 × figure 5장 = 60장+)
- 자사 cron 이 매일 옛 LLM 패턴 글 누적 — 운영자 정리 부담 가중
- 모든 글 자동 발행 (auto_publish=true) — 정성 안 들어간 글이 라이브로 직행

### 결정

- 매일 발행 **자사 1편 + 파트너 1편 = 총 2편** (Pollinations 부담 90% 절감)
- **last_run_at ASC 로테이션** — 가장 오래 안 만든 tenant 1개씩 선택 → 자연 라운드로빈
- **검수 단계 cron**: `auto_publish=false` → status=draft. 운영자가 어드민 검수 후 발행
- 자사 글 CTA href: `medi-map.co.kr/contact` → `/contact` (medimap-blog 내부)

### 작업

**1. `scheduler.daily_auto_content_job` 로테이션 로직**
- 활성 setting 을 `last_run_at ASC NULLS FIRST` 정렬
- 자사 set / 파트너 set 분리 (`business_model='self' or partner_slug='medimap-self'`)
- 각 set 의 [0] 만 선택 → 매일 2 tenant 만 발행

**2. Migration 029**
- CTA href 일괄 REPLACE
- 98/99/100 reject (자사 옛 cron 글)
- auto_content_settings 일괄 `enabled=true, daily_count=1, auto_publish=false`

### 운영 흐름 (Round 28 이후)

```
매일 08:00 KST cron 실행 → 자사 1편(draft) + 파트너 1편(draft) 발행
→ 09:00 KST 운영자가 /admin/content-queue 검수 탭에서:
   • LLM 초안 확인
   • 메디맵 자체 데이터·사례 정성 추가
   • status → published 변경
→ 라이브 노출
```

매일 2편만 누적 + 검수 통과한 것만 발행 → 정성과 안정성 확보.

### 알려진 함정 (Round 28 추가)

- **자동 cron + 매일 누적** = 정성 부족 글이 라이브로 직행하는 함정. 검수 단계(auto_publish=false) 가 운영의 정성 안전망.
- **Pollinations 한도** — 매일 figure 10장(2편 × 5장) 이면 안정. 그 이상이면 일부 X 박스.
- **last_run_at NULL 처리** — `NULLS FIRST` 안 쓰면 신규 tenant 가 영원히 후순위로 밀림.

---

---

## Round 29 (2026-05-30) — Unsplash + 영문 slug + Pollinations 강화 + 검수 reminder

### 작업

**1. `src/content/unsplash_client.py` 신규**
- `fetch_unsplash_to_storage(query, ...)` — Unsplash 검색 + bytes + Storage 업로드 + 약관 download_location 트래킹
- `UNSPLASH_ACCESS_KEY` env 필요 (사용자가 Unsplash Developers 에서 발급)
- 자사 인사이트 글의 cover 생성 시 우선 사용 (실사 톤, 안정)

**2. `image_picker.py` — Pollinations realistic + Unsplash fallback**
- `PROMPT_TEMPLATE_REALISTIC` 신규 ("professional editorial photography, ...")
- `generate_image_for_content(..., is_self_tenant=True)` 시:
  1. Unsplash 우선 시도
  2. 실패 시 Pollinations realistic prompt + 1600×900 큰 사이즈
- 파트너 글은 기존 Pixar 톤 유지

**3. `scheduler._make_slug` 영문화**
- `KEYWORD_SLUG_MAP` 신규 — 자사·파트너 자주 쓰는 한글 → 영문 매핑
- 매칭 안 되면 한글 제거 + 영문/숫자만 fallback
- 옛 `_make_slug_LEGACY` 함수 참고용 보존

**4. Migration 030 — 87/88/89/93/94/97 slug 영문화**
- 한글 slug → 영문 slug 일괄 UPDATE
- 옛 slug 외부 공유는 404 가능 (다음 라운드 redirect 처리)

**5. `.github/workflows/review-reminder.yml` 신규**
- 매일 09:00 KST (00:00 UTC) cron
- Supabase REST API 로 draft 카운트
- `SLACK_REMINDER_WEBHOOK` secret 있으면 Slack 알림
- 운영자 검수 부담 자동 알림으로 보강

### 운영 흐름 (Round 29 이후)

```
매일 08:00 KST → 자사 1편(draft) + 파트너 1편(draft) cron 발행
매일 09:00 KST → review-reminder 가 draft 카운트 → Slack 알림
   "📝 메디맵 어드민 검수 대기 2건"
운영자 09:30 KST → 어드민 진입 → 검수 + 정성 추가 → published
```

### 사용자가 해야 할 secret 등록

- `UNSPLASH_ACCESS_KEY` — Unsplash Developers (https://unsplash.com/developers) 무료 가입 → "New Application" → Access Key 복사 → GitHub Secrets 등록
- `SLACK_REMINDER_WEBHOOK` — Slack workspace → 채널 → Incoming Webhooks 앱 → Webhook URL 복사 → GitHub Secrets 등록

두 secret 모두 미설정이면 fallback 동작 (Pollinations / 알림 skip).

### 알려진 함정 (Round 29 추가)

- **Unsplash API 약관** — download_location 호출로 다운로드 카운트 트래킹 필수 (자동 처리)
- **slug 영문화 후 옛 URL** — 외부 공유된 옛 한글 slug 는 404. Next.js redirects 또는 middleware fallback 별도 라운드.
- **GitHub workflow 의 secret newline** — Round 26 fix 2 와 동일 패턴으로 모든 workflow 에 trailing whitespace 정리.

---

## 다음 라운드 후보 (Round 30+)

- **옛 한글 slug → 새 영문 slug redirect** — Next.js redirects 또는 middleware
- **Resend 이메일 알림 추가** — Slack 외 이메일도 지원
- **검수 SLA 추적** — draft 가 N일 누적되면 별도 경고
- **한글 slug → 영문 변환** — `scheduler._make_slug` 보정 + 기존 87/88/89 slug 마이그레이션
- **본문 figure 도 Supabase Storage 업로드** — Pollinations lazy gen 회피
- **/admin/tenants UI 에 "자동 발행 활성화" 토글** — auto_content_settings 의 enabled 직접 켜기
- **`/admin/keywords` 의 카테고리 옵션에 '한방' 추가** — 현재 CATEGORY_SUGGEST 7개 (한방 빠짐)
- **Gemini 503 retry 안정화** — Anthropic Sonnet fallback provider 우선순위
- **콘텐츠 검수 자동 알림** — Slack/이메일 webhook (매일 cron 끝나면)
- **자사 tenant 의 키워드 풀 확장** — 현재 3개. 6편 추가 발행 후 / 운영 데이터 보고 12~20개로 확장

---

## Round 29 fix 10~12 (2026-05-30 오후) — 검수 알림 + 어드민 통합 end-to-end 완성

### 시행착오 비용

**fix 1~9** (약 1~2시간 낭비): 추측만으로 9차례 push 반복. 가설들이 전부 빗나감 (jq 파싱 / multiline output / tenants join 표기 / secret newline / bash scope).

**fix 10~12** (약 30분, 정답까지 직진): stdout / Network Response / SQL raw 확인 후 진단.

### 진짜 원인 3가지

**1. SUPABASE_SERVICE_ROLE_KEY GitHub Secret 미설정 (review-reminder workflow)**
- 증상: Slack "2건" false alarm (DB 0건)
- 원인: PostgREST 가 invalid key 시 error object `{"message":"...", "hint":"..."}` 반환. `jq 'length'` 가 object key 개수(2) 카운트.
- fix 10: workflow 에 `jq -r 'type'` 으로 array 검증 가드. object 면 ⚠️ 로그 + Slack skip.

**2. Vercel 환경변수 SUPABASE_SERVICE_ROLE_KEY 미설정 (어드민)**
- 증상: 어드민 검수 큐 0건 표시 (DB 1건)
- 원인: `getServerClient()` 가 service_role 없으면 anon fallback. RLS 활성 + 정책 0개라 anon 으로는 draft 접근 차단.
- fix: Vercel Project → Environment Variables 에 추가 (All Environments). Redeploy 시 **Build Cache 해제** 필수.

**3. PostgREST nested embed 가 inner join 으로 작동 (content-queue API)**
- 증상: service_role 정상 + DB 1건 정상인데 어드민 API 만 빈 array 반환
- 원인: Supabase JS `.select('id, ..., tenants:tenant_id ( id, name )')` 가 inner join 으로 평가. tenant row 매칭 / schema cache 영향.
- fix 12: embed 제거 + tenants 별도 `.in('id', tenantIds)` fetch + Map merge.

### 새 함정 (Round 29 추가)

**(A) PostgREST embed inner join 함정**

```typescript
// ❌ 위험 — embed 가 0건 반환 가능
.select(`id, ..., tenants:tenant_id ( id, name )`)

// ✅ 안전 — 별도 query + Map merge
const { data } = await sb.from('main').select('id, fk_id, ...').filter(...);
const ids = [...new Set(data.map(r => r.fk_id))];
const { data: rels } = await sb.from('related').select(...).in('id', ids);
const relMap = new Map(rels.map(r => [r.id, r]));
const items = data.map(r => ({ ...r, related: relMap.get(r.fk_id) ?? null }));
```

적용: 어드민 multi-tenant 조회 전반. 신규 admin 라우트도 같은 패턴.

**(B) PostgREST error object — jq length false alarm**

```bash
# workflow / cron 에서 PostgREST 응답 처리 시 type 가드 필수
RESP_TYPE=$(echo "$RESP" | jq -r 'type' 2>/dev/null || echo "error")
if [ "$RESP_TYPE" != "array" ]; then
  echo "::error::PostgREST 응답이 array 아님 (type=$RESP_TYPE)"
  exit 0  # workflow success 유지 + alert skip
fi
```

### 운영 디버깅 원칙 (반드시 준수)

데이터 처리 워크플로 (cron / API / DB query) 디버깅 시:

1. **first action = raw 응답 확인** — 절대 코드부터 만지지 말 것
   - GitHub Actions: step 로그 펼치기 (stdout)
   - Next.js API: 브라우저 F12 → Network → Response
   - DB query: Supabase SQL Editor 에서 직접 실행
   - 환경변수 의심: debug endpoint 임시 추가 (사용 후 삭제 필수)
2. 응답 보고 가설 세움 — 응답 안 보고 코드 수정 → push → 재시도 **금지**
3. stdout / Response 확인이 어려운 환경이면 그것부터 fix (echo 추가, debug logging)
4. **비용**: 추측 1회 ≈ 5~10분. 8회 ≈ 1시간+. 진단 1회 ≈ 1분.

### Round 29 최종 운영 흐름 (검수 알림 end-to-end)

```
매일 23:00 UTC (08:00 KST 다음 날):
  auto-publish cron → Round 28 rotation
  → 자사 1편(tenant 12) + 파트너 1편 draft INSERT
  ↓
매일 00:00 UTC (09:00 KST):
  review-reminder cron → Supabase REST → draft 카운트 + 목록
  → Slack "메디맵 어드민 검수 대기 N건" + 글 목록 + 바로가기
  ↓
운영자:
  → Slack 바로가기 → /admin/content-queue 검수 탭
  → 본문 미리보기 → 메디맵 자체 데이터·사례 정성 추가
  → 발행 승인 → status='published'
  → Vercel deploy hook → medimap-blog 갱신
  → /blog/{영문 slug} 공개
```

검증 완료: 2026-05-30. 자사 글 id=101 ("의료 GEO 최적화 #101") 이 Slack 알림 + 어드민 검수 탭 모두 정상 표시.

### Round 30 후보 (이번 라운드에서 확인된 작은 이슈들)

- **자사 글 cover_image_url 표시 깨짐** — 검수 큐 cover 회색 박스. UNSPLASH_ACCESS_KEY 등록 + Pollinations realistic fallback 검증
- **자사 글 라벨 "파트너 medimap-self" 오표시** — 어드민 UI 칩 분기 (`is_partner_content=false` → "자사" 표시)
- **콘텐츠 완료 탭 TETE → "메디맵" 오표시** — fix 12 의 별도 fetch 패턴으로 정리
- **옛 한글 slug redirect** — Migration 030 후 옛 URL 404. Next.js redirects 또는 middleware fallback
- **LLM provider fallback** — Gemini 503 시 Anthropic/OpenAI 자동 retry
- **debug endpoint 삭제** — `/api/admin/debug-env/route.ts` 보안상 삭제 push 필수 (Round 29 마무리 직후)

---

## Round 31~34 (2026-05-30 → 05-31) — AI 인용 측정 + 5-tier 분류 + 경쟁사 분석 + 자동 분석

### 진짜 가치 명제 (Round 30 ~ 31 사이 재발견)

**문제 인식.** BGN 잠실 케이스에서 Gemini citation source 를 확인했더니, 인용 source 가 **메디맵 SaaS 콘텐츠가 아니라** 경쟁사 SU연세안과(`sueye.co.kr`)나 BGN 자체 사이트(`bgneye.com`)였음. 즉 "AI 인용 횟수 = 우리 가치" 는 거짓 명제. 클라이언트 BGN 의 기존 SEO 자체가 강하기 때문.

**재정의 가치.**
1. **3~6 개월 누적**: 메디맵 SaaS 가 발행하는 GEO/AEO 최적화 콘텐츠가 T1(메디맵 도메인) 인용 share 를 점진 상승시킴
2. **마케팅 컨설팅 도구**: 클라이언트가 "지금 우리는 어떤 source 가 AI 에 인용되는지" 를 실시간으로 보고, 경쟁사 대비 약점 / 강점을 진단 가능
3. **5-tier 분류**: 인용 source 를 T1~T5 로 자동 분류 → 단순 카운트가 아니라 "메디맵 직접 효과 vs 클라이언트 자체 SEO vs 경쟁사 점유" 를 분리 시각화

### 5-tier source classification (Round 31)

| Tier | 정의 | 예시 (BGN 잠실 안과 기준) | 의미 |
|---|---|---|---|
| **T1** | 메디맵 SaaS 자사 콘텐츠 | `medi-map.co.kr`, `medimap-blog-phi.vercel.app` | SaaS 직접 효과 |
| **T2** | 클라이언트 자체 사이트 | `bgneye.com`, `mourimclinic.com` | 클라이언트 기존 SEO 기준선 |
| **T3** | 권위 매체 / 의료기관 | `msdmanuals.com`, `amc.seoul.kr`, `snuh.org` | 의료법 안전한 인용 |
| **T4** | 의료 플랫폼 | `gangnamunni.com`, `babitalk.com`, `modoodoc.com` | 클라이언트가 입점한 채널 |
| **T5** | 경쟁사 | `sueye.co.kr`, `chuneye.co.kr` | 점유 빼앗기는 경쟁 위협 |

분류는 `medimap-blog-v2/src/app/api/admin/competitors/route.ts` 와 `citations/route.ts` 에 정적 도메인 set + selectedClientDomain 매칭. unknown 도메인은 T5 default.

### DB 마이그레이션 (Round 31~33)

| 마이그레이션 | 컬럼 / 객체 | 용도 |
|---|---|---|
| `add_source_domains_to_responses` | `responses.source_domains` (JSONB) | 4 엔진 응답에서 추출한 인용 hostname 배열 + final_url |
| `add_keyword_purpose` | `keywords.purpose` ENUM('own', 'competitor_landscape') | 자사 측정 키워드 vs 경쟁사 측정 키워드 분리 |
| `auto_sync_business_model_keywords` | PostgreSQL TRIGGER | `tenants.business_model` UPDATE 시 comma-split → `keywords` 자동 INSERT/DELETE (purpose='competitor_landscape') |

### 어드민 신규 페이지 (Round 32~34)

```
/admin/citations         자사 현황 보기 — 메디맵 + 클라이언트 자체 인용 (T1 + T2 중심)
  - KPI: 총 인용 횟수, T1 share, T2 share, 메디맵 도메인 share trend
  - Chart: 최근 30일 인용 추세 / Source tier 도넛 / Top 10 도메인 / 메디맵 share 추이
  - 키워드 클릭 → AI 응답 원문 모달

/admin/competitors       경쟁사 현황 보기 — business_model 키워드 기준 (T3 + T4 + T5)
  - KPI: T3/T4/T5 분포, 키워드 × 경쟁사 매트릭스
  - 클릭 → 실제 인용된 URL 직접 진입
```

두 페이지는 `CitationsTabs` 컴포넌트로 묶여 있고, **`tenantId` 가 URL searchParams 로 공유**되어 자사 ↔ 경쟁사 탭 전환 시 클라이언트 재선택 불필요 (Round 34 phase 5).

### 자사 / 경쟁사 API 분리 패턴 (Round 32)

```typescript
// /api/admin/citations/route.ts — 자사
.from('keywords').eq('purpose', 'own')

// /api/admin/competitors/route.ts — 경쟁사
.from('keywords').eq('purpose', 'competitor_landscape')
```

같은 responses 테이블을 보지만 **WHERE 절의 keyword.purpose** 가 다름.

### 홈페이지 자동 분석 (Round 33~34)

```
POST /api/admin/tenants/[id]/analyze-homepage              preview only
POST /api/admin/tenants/[id]/analyze-homepage?apply=true   business_model 즉시 UPDATE + trigger 발동
```

**다단계 fetch 흐름 (SPA / redirect 사이트 대응):**

```
Step 1: tenant.homepage 직접 fetch (8초 timeout)
Step 2: 텍스트 < 300자면 → meta refresh / JS location / 첫 internal link 추적
Step 3: 그래도 짧으면 → robots.txt 에서 Sitemap 자동 발견 → sitemap.xml 파싱
         → priority 높은 URL top 3 순차 시도 (sitemap index 도 depth 1 follow)
Step 4: 그래도 짧으면 → common paths (/main/index.php, /about, /intro 등) 시도
Final fallback: 모든 fetch 실패 시 domain_category default 키워드
   (안과 → 라식/라섹/스마일라식/백내장/노안교정)
```

전체 timeout = Vercel 30초 limit 안 (각 fetch 8초 + AbortController). 결과는 UI 에 fetched_url 링크 + fallback_used 경고로 투명하게 표시.

**의료 키워드 사전**: `medimap-blog-v2/src/lib/medical-keywords.ts` 의 카테고리별 사전(안과/피부과/성형외과/치과/모발이식/내과/한방)과 매칭 → 빈도순 top 8 추출 → 상위 5 개를 `business_model` 후보로 반환.

---

## Round 35 (2026-05-31) — 경쟁사 측정 cron 분리 (own/competitor LIMIT 충돌 해결)

### 진단 — raw 데이터 기반

BGN tenant(id=4) 의 경쟁사 페이지가 모든 카운트 0건 표시. 진짜 원인 확인:

```sql
-- BGN keywords 분포 (DB 직접 확인)
own 6개 (id 12~17): 측정 queries 각 5~7건씩 정상 (2026-05-30 14:22 까지)
competitor_landscape 5개 (id 54~58): 측정 queries 0건 ← !!!

-- 전체 활성 키워드
total_active=32 (own 24 + competitor_landscape 8)
```

**진짜 원인**: `scripts/run_measurement_batch.py` 의 `WHERE is_active=true ORDER BY k.id LIMIT 20` 가 own 키워드(id 낮음)만 픽업하고 competitor 키워드(id 54+)까지 도달 못함. 트리거는 정상이지만 측정 cron 이 잘랐음.

### 해결 — 측정 workflow 분리

**1. `measure-ai-mentions.yml` 수정**
- `purpose_filter` workflow_dispatch input 추가 (own | competitor_landscape | all)
- env `PURPOSE_FILTER` 기본값 'own' → 매일 cron 은 own 만 측정
- 기존 own 24개 → KEYWORD_LIMIT 20 안에서 측정 (overflow 4개는 다음 cron 또는 round-robin 필요 — Round 36 후보)

**2. `measure-competitor-mentions.yml` 신규**
- Cron: `0 21 * * 1,4` (매주 월/목 21:00 UTC = 화/금 06:00 KST)
- env `PURPOSE_FILTER=competitor_landscape` 고정
- 동일 `scripts/run_measurement_batch.py` 재활용 (PURPOSE_FILTER env 만 다름)
- Gemini free tier 20/day 도 자사 측정과 분리되어 quota 안 겹침

**3. UI 문구 갱신**
- `/admin/competitors` 비즈니스 모델 박스 — "Round 35 별도 batch 추가 예정" → "경쟁사 측정 cron 분리됨 (매주 월·목 06:00 KST 자동, manual run 가능)"

### Round 35 함정 (cron 운영)

**(I) Sandbox bash mount 와 cowork Edit/Write 의 파일 view 불일치**
- 증상: cowork Read 가 1100+ 라인 보여주는데 bash `wc -l` 은 810 라인
- 원인: Windows path → cowork Edit/Write 가 disk 에 직접 write, 그러나 sandbox `/sessions/.../mnt/` 의 cache 가 stale
- 정답: 변경 sanity check 은 sandbox bash `tail` / `cat` / `python3 read` 로. cowork Read 결과를 disk 의 진실로 가정하지 말 것. 큰 SKILL 갱신은 bash heredoc 으로 직접 append 하는 게 안전.

**(J) 측정 batch ORDER BY k.id LIMIT N 의 누적 누락**
- 증상: 신규 키워드가 id 큰 쪽으로 등록되면 LIMIT 안에서 영원히 측정 못 받음
- 정답: purpose 분리 cron + KEYWORD_LIMIT 상향 + 또는 `ORDER BY last_measured_at NULLS FIRST` 같은 fairness 정책 (Round 36 후보)

### Round 35 후속 / Round 36 후보

- **즉시 backfill**: `gh workflow run "Measure competitor mentions (weekly Mon/Thu 06:00 KST)" -f engine_mode=production -f keyword_limit=20` 또는 GitHub UI Actions → manual run. 다음 자동 cron 까지 기다리지 말고 1회 수동.
- **own 24개 vs LIMIT 20** — own 도 4개 overflow. KEYWORD_LIMIT 상향(30) 또는 fairness ORDER BY 도입 필요
- **fairness ORDER BY**: `ORDER BY last_measured_at ASC NULLS FIRST, id` 같이 변경하면 매 cron 신선한 키워드 우선 픽업
- **경쟁사 신규 도메인 알림** — T5 분류된 신규 hostname 등장 시 Slack notify
- **business_model 키워드 검수 UI** — auto-extract 결과를 chip-style 으로 추가/삭제

---

## Round 35 마무리 (2026-05-31 오후) — production 검증 + 함정 K~O + Round 36 보류

### Production 데이터 흐름 검증 결과

manual run (`measure-competitor-mentions` workflow) 1회 실행 → 8 keyword × 2 engine 시도 → **3건 grounding success**, 17건 fail.

성공 3건 분포:
- 지우피부과(tenant_id=6) "피부과" 키워드 × gemini → n_sources=10 (snuh.org, apollohospitals.com, akd.or.kr, namu.wiki, 등)
- 지우피부과 "리쥬란" 키워드 × gemini → n_sources=10 (toxnfill.com, medspabeni.com, blog.onlif.co.kr, smartskin.kr, sunmeliaskin.com 등 모두 경쟁 클리닉)
- BGN(tenant_id=4) "백내장" × gemini → response 있으나 grounding 없음 (n_sources=0)

`/admin/competitors` 지우피부과 선택 시 화면: **권위 사이트 1, 경쟁 안과/병원 19, 총 20** — 5-tier 분류는 작동했으나 T3 화이트리스트가 빈약해서 권위 사이트가 부풀려진 T5 로 흘러감.

### T3 / NOISE 화이트리스트 확장 (코드 한 곳)

`medimap-blog-v2/src/app/api/admin/{citations,competitors}/route.ts` 두 곳의 `AUTHORITY_DOMAINS` + `NOISE_DOMAINS` set 확장:

T3 추가 (실측 응답에서 발견):
- `apollohospitals.com` — 글로벌 종합병원
- `akd.or.kr` / `derma.or.kr` — 대한피부과학회
- `kma.org` — 대한의사협회
- `ophthalmology.or.kr` — 대한안과학회
- `kda.or.kr` — 대한치과의사협회
- `k-health.com` / `dailymedi.com` / `docdocdoc.co.kr` — 의료 전문매체

NOISE 추가:
- `namu.wiki` — 백과, 권위로 보기 애매
- `ko.wikipedia.org` / `wikipedia.org`
- `m.search.naver.com` / `search.naver.com`
- `tistory.com` (subdomain 은 별도 분류)

확장 후 재배포 + 같은 데이터로 재계산: 권위 사이트 1→**4**, 경쟁 안과/병원 19→**15**, 총 20→19 (namu.wiki noise 제외).

### 새 함정 (Round 35 추가)

**(K) sandbox bash 의 `.git/index.lock` 권한 충돌**
- 증상: sandbox bash 가 commit 시도 중 lock 만들고 죽으면, Windows PowerShell git 이 lock 못 지움 (uid mismatch — sandbox `dreamy-funny-bell` 1008 vs Windows `user`)
- 정답: PowerShell 에서 `takeown /F .git\index.lock` + `icacls .git\index.lock /grant "$($env:USERNAME):(F)"` + `Remove-Item .git\index.lock -Force` 순서. sandbox bash 에서 git commit 시도하지 말 것 — 권한 충돌 위험.

**(L) cowork Edit/Write vs sandbox bash mount 의 file view 불일치**
- 증상: cowork Read 가 1100 줄을 보여주는데 bash `wc -l` 은 810 줄. Edit "성공" 메시지 받았지만 disk 에 실제 반영 안 된 경우도 있음.
- 정답: 큰 SKILL 갱신은 bash heredoc 으로 직접 append 하는 게 안전. cowork Read 결과를 disk 의 진실로 가정 금지 — `wc -l` / `tail` / `python3 read` 로 확인.

**(M) "분리 cron 의 quota 분리 효과 무효" — 같은 GCP project 공유 시**
- 증상: `measure-ai-mentions` (own, 22:00 UTC) 와 `measure-competitor-mentions` (competitor, 21:00 UTC) 분리해도 같은 `GOOGLE_API_KEY` 쓰면 free tier 20/day 한 quota window 공유 → competitor 가 own 분량까지 막힘
- 정답: cron 시간을 서로 다른 quota window 에 배치하거나, 별도 GCP project + key 발급. 또는 paid tier 전환.

**(N) Anthropic credit 잔액 0 → 400 invalid_request_error**
- 증상: ANTHROPIC_API_KEY 등록 직후 호출 시 `400 - {"type": "error", "error": {"type": "invalid_request_error", "message": "Your credit balance is too low to access the Anthropic API."}}`
- 정답: API key 발급과 별개로 console.anthropic.com → Plans & Billing → Add Credits 로 사전 충전 ($5 권장). 무료 trial credit 끝나면 자동 차단.

**(O) Gemini quota 임박 시 grounding metadata 누락**
- 증상: `success=3 fail=13` 와중에 success 3건 중에도 일부는 `n_sources=0` (텍스트는 받았으나 grounding URL 없음). free tier quota window 끝나갈 때 grounding API 부분 응답.
- 정답: paid tier 전환이 정공법. free 유지 시 grounding 부족 row 는 운영자가 인지하고 추후 재측정 큐에 넣는 패턴 필요.

**(P) 5-tier 분류 사전은 production 응답 기반 incremental 확장 — 사전 enumerate 금지**
- 증상: T3/T4/T5 화이트리스트를 사전에 모든 의료 권위/플랫폼 도메인을 추측해서 채우려 하면 시간 낭비 + 누락 천지
- 정답: production cron 한 번 돌리고 → DB `responses.source_domains` 조회 → 등장한 도메인만 정확히 분류 → SKILL 에 추가. 새 라운드마다 같은 패턴 반복.

### Round 36 결정 (2026-05-31)

사용자 결정: **Anthropic credit 충전 보류**. 이유 — 자사 own cron + 경쟁 cron 이 시간 누적되며 Gemini quota reset 마다 자동 데이터 채워질 것. BGN 만 단기 비어있어도 운영 흐름 자체엔 영향 없음.

다음 라운드 재논의 트리거:
- 2주 누적 후에도 BGN tenant 의 경쟁사 데이터가 5건 미만이면 Anthropic credit / Gemini paid 재검토
- 또는 클라이언트가 BGN 화면 보고 "왜 비어있냐" 질문하면 즉시 paid 전환

### Round 35 최종 산출물

- `.github/workflows/measure-competitor-mentions.yml` 신규 (월/목 21:00 UTC)
- `.github/workflows/measure-ai-mentions.yml` purpose_filter input + 기본 'own' 분리
- `medimap-blog-v2/src/app/api/admin/citations/route.ts` AUTHORITY/NOISE set 확장
- `medimap-blog-v2/src/app/api/admin/competitors/route.ts` 동일 확장
- `medimap-blog-v2/src/app/admin/(portal)/competitors/page.tsx` UI 문구 간소화 ("매주 월·목 06:00 자동 측정")
- `medimap-blog-v2/src/app/api/admin/tenants/[id]/analyze-homepage/route.ts` robots/sitemap Step 3 추가
- `medimap-blog-v2/src/components/admin/HomepageAnalyzeButton.tsx` loading / fallback / fetched_url UX
- DB: `add_source_domains_to_responses` / `add_keyword_purpose` / `auto_sync_business_model_keywords` trigger
- production 검증: 지우피부과(tenant_id=6) 케이스 — T3=4, T5=15, 총 19 sources, 매트릭스 + Top10 차트 정상 표시

---

## Round 36 (2026-05-31) — fairness 측정 + 다중 도메인 + 분류 사전 확장 + trigger soft delete

### 진단 시작점

사용자 요청 "결제 없이 집에서 가능한 것부터" → Tier 1/2/3 batch:
- **Tier 1**: debug endpoint 빈 폴더 정리, OFFICE-SETUP push
- **Tier 2**: own 24개 vs LIMIT 20 overflow → fairness ORDER BY
- **Tier 3**: production 응답 도메인 23개 훑어 5-tier 분류 사전 확장

작업 중 추가 발견: **trigger DELETE 패턴이 측정 history CASCADE 손실 시키는 버그**.

### Tier 2 — keywords.last_measured_at fairness ORDER BY

**문제**: own 24개 + competitor 12개 = 활성 36개, KEYWORD_LIMIT=20 + `ORDER BY k.id LIMIT 20` → id 큰 키워드 영원히 미측정.

**해결**:
- Migration `add_last_measured_at_to_keywords` — `keywords.last_measured_at TIMESTAMPTZ` + partial index 2개 (own/competitor 별)
- `scripts/run_measurement_batch.py`:
  - `ORDER BY k.last_measured_at ASC NULLS FIRST, k.id`
  - 측정 batch 끝에 `UPDATE keywords SET last_measured_at = NOW() WHERE id = ANY(:ids)`

**효과**: 매 cron 신규/오래된 키워드 우선 픽업 → 모든 키워드 균등 측정 보장.

### Tier 3 — 분류 사전 확장 + tenants.additional_domains

DB-wide 도메인 훑어 23개 발견 → 분류 결정:

T3 추가 (실측 권위 도메인):
- `news.hidoc.co.kr` / `hidoc.co.kr` — 하이닥 (의료 매체)
- `www.zeiss.co.kr` / `zeiss.co.kr` — Carl Zeiss 한국 (의료 장비)

NOISE 추가:
- `pf.kakao.com` — 카카오 채널 (메디맵 path `_xnWQkG` 는 위 classify 가 T1 별도 처리)

**다중 도메인 운영 지원 (BGN 의 bgnblog.com 사례)**:
- Migration `add_additional_domains_to_tenants` — `tenants.additional_domains TEXT[]`
- BGN 에 `['bgnblog.com', 'www.bgnblog.com']` INSERT
- `classifyDomain` 시그니처 변경: `clientHomepageDomain: string` → `clientDomains: Set<string>`
- citations + competitors route 둘 다 동일 패턴 적용 (cross-site sync)

### Round 36 fix — trigger soft delete (긴급 버그 수정)

**증상 발견**: 지우피부과의 옛 keyword (id=51 "피부과", id=52 "리쥬란") 가 DB 에서 사라졌고, 그것으로 측정된 responses 19건 (Round 35 검증 시 T3=4, T5=15 화면의 데이터) 도 함께 사라짐.

**진짜 원인 — trigger 의 `DELETE FROM keywords` 가 FK CASCADE 로 queries → responses 까지 다 날림**:

```sql
-- 옛 trigger (Round 33 도입)
DELETE FROM keywords WHERE tenant_id = NEW.id AND purpose = 'competitor_landscape';
-- → queries.keyword_id FK CASCADE → responses.query_id FK CASCADE → 측정 history 증발
```

사용자가 클라이언트의 business_model 을 "피부과,리쥬란" → "강남피부과,리쥬란,스킨보톡스,써마지,울쎄라,울쎄라피" 로 수정하는 순간 모든 측정 데이터 손실.

**수정 (Migration `soft_delete_business_model_keywords`)**:
1. `keywords_tenant_text_purpose_unique` UNIQUE constraint 추가 — ON CONFLICT 가능하게
2. trigger 함수 재작성:
   - 옛 키워드 `is_active = false` (soft delete, history 보존)
   - 새 키워드 `INSERT ... ON CONFLICT (tenant_id, text, purpose) DO UPDATE SET is_active = true` (재활성화)
   - 측정 batch 는 `is_active=true` 만 픽업하니 동작 동일, history 는 그대로 분석 가능

**손실 데이터**: 지우피부과 옛 measurement 19건은 이미 CASCADE 로 사라져 복구 불가. 새 키워드 6개가 다음 cron 부터 새로 측정 누적.

### 새 함정 (Round 36 추가)

**(Q) trigger DELETE 패턴 → CASCADE 로 측정 history 손실**
- 증상: business_model UPDATE 한 번에 클라이언트의 모든 측정 데이터 사라짐. 사용자가 클라이언트 정보 수정만 해도 분석 자료 증발.
- 원인: FK CASCADE 가 keywords → queries → responses 까지 전파. trigger 설계 시 history 보존 고려 안 했음.
- 정답: trigger 에서 DELETE 금지. `is_active = false` soft delete + `INSERT ON CONFLICT DO UPDATE SET is_active = true` 패턴. 측정 batch 는 `is_active=true` 만 픽업하므로 운영 동작 동일.

**(R) UNIQUE constraint 부재 시 ON CONFLICT 사용 불가**
- 증상: `ON CONFLICT (a, b, c) DO UPDATE` 작성했는데 `there is no unique or exclusion constraint matching the ON CONFLICT specification` 에러
- 정답: ON CONFLICT 사용 전 해당 컬럼 조합에 UNIQUE constraint 가 있어야 함. `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE (...)` 먼저 적용.

**(S) `.git/index.lock` 권한 충돌 — 같은 함정 반복 발생**
- 증상: sandbox bash 가 git 명령 시도 중 lock 생성 → Windows PowerShell 이 다른 uid 권한이라 못 지움 → 이후 모든 git 명령 차단
- 대응: PowerShell profile 에 alias 등록 권장
  ```powershell
  function Reset-GitLock { takeown /F .git\index.lock; Remove-Item .git\index.lock -Force }
  ```
- 같은 함정 (K) 였음. Round 35, 36 두 번 연속 발생 → 이 패턴은 sandbox bash + Windows PowerShell 병행 시 거의 매번 일어나는 것으로 추정.

### Round 36 산출물

DB Migration:
- `add_last_measured_at_to_keywords` — fairness ORDER BY 지원
- `add_additional_domains_to_tenants` — 다중 도메인 운영 지원
- `soft_delete_business_model_keywords` — UNIQUE constraint + trigger soft delete 패턴

코드 변경 (1 commit `7b1c70e`):
- `scripts/run_measurement_batch.py` — ORDER BY fairness + 측정 후 last_measured_at UPDATE
- `medimap-blog-v2/src/app/api/admin/citations/route.ts` — T3/NOISE 확장 + clientDomains Set + tenant.additional_domains 매칭
- `medimap-blog-v2/src/app/api/admin/competitors/route.ts` — 동일 패턴

### Round 37 후보 (사용자 사무실에서 결정)

- **Anthropic credit 충전** + Gemini paid tier 전환 — 4 엔진 본격 측정 (사용자 결정 보류 중)
- **분류 사전 admin UI** — 운영자가 직접 T3/T4/T5/NOISE/additional_domains 편집. 코드 수정 + 배포 사이클 제거.
- **business_model 키워드 chip editor** — auto-extract 결과 + 운영자 검수 한 화면
- **클라이언트 typeahead 드롭다운** — 클라이언트 20+ 대비
- **자사 share trend 자동 알림** — T1 share +N% / -N% 변화 시 Slack notify
- **경쟁사 신규 도메인 알림** — T5 분류된 신규 hostname 등장 시 운영자 즉시 알림

---

## Round 36 fix 2~3 (2026-05-31 늦은 오후) — stub 제외 + 도메인 학습 + 가이드 비교 진단

### fix 2 — 어드민 화면에서 stub engine 측정 제외

영업 시연 화면에서 stub 라벨 응답이 보여 신뢰도 떨어짐. 세 곳 API 에 `engine != 'stub'` 필터 추가:

- `/api/admin/citations/keyword/route.ts` — 키워드 클릭 모달 raw 응답
- `/api/admin/citations/route.ts` — 자사 현황 KPI/차트
- `/api/admin/competitors/route.ts` — 경쟁사 현황 분석

데이터는 DB 에 보존 (필터링만). 변경 후 모달은 production AI 측정 (gemini 등) 만 표시.

### fix 3 — 도메인 일괄 분석 + 메디맵 가이드 비교 진단

**UX 결정 — URL별 vs 도메인 단위**:
- 처음 구현: URL별 [반영하기] 버튼 → 사용자 피드백 "버튼 하나로 도메인 전체"
- 폐기 안 함, 보존: `LearnFromUrlButton.tsx` + `/api/admin/learn-from-url` — 미래 자사 citations 페이지 등에서 활용 가능
- 최종: `LearnFromDomainButton.tsx` + `/api/admin/learn-from-domain` — 도메인 펼침 영역 헤더에 한 버튼

**도메인 일괄 분석 흐름**:
```
[✨ 전체 분석 & 반영 (N개 URL)] 클릭
  ↓
병렬 fetch (batch 5개 × 5초 timeout) — Vercel 30초 한도 안
  ↓
각 URL HTML 분석: 제목 / meta desc / h1~h3 / word count / 이미지 (alt 포함) / 내부 링크 / JSON-LD Schema / table / list
  ↓
집계: 평균 지표 + Schema 사용률 + alt 커버리지 + table/list 사용률
  ↓
메디맵 baseline 과 비교 → 자연어 진단 + 권장 변경 (규칙 기반, LLM 호출 0)
  ↓
모달 표시 → 운영자 검수 + 메모 → [가이드에 추가]
  ↓
learned_insights INSERT (scope='domain', patterns 안에 summary/per_url/diagnosis/recommendations)
```

**메디맵 baseline (하드코딩, 향후 content_settings 로 동적 로드 권장)**:
```typescript
const MEDIMAP_BASELINE = {
  title_length: 35,
  word_count: 850,
  h2_count: 6,
  h3_count: 8,
  image_count: 5,
  internal_link_count: 3,
  faq_schema_rate: 0,        // 메디맵 현재 0%
  medical_schema_rate: 0,
};
```

**진단 규칙 예시**:
- 본문 ±200 단어 이상 차이 → 확장/축소 권장
- FAQ schema 사용률 ≥50% → "즉시 적용 권장"
- table 사용률 ≥50% → "비교 표 의무 삽입"
- alt 커버리지 ≥80% → "SEO 기본 충족"

### DB 마이그레이션 (Round 36 fix 3)

`create_learned_insights_table`:
- `learned_insights` 테이블 — source_url / source_domain / source_tier / domain_category / keyword / tenant_id / patterns (JSONB) / notes / applied / applied_at / created_at
- UNIQUE (source_url, keyword) — 같은 URL+키워드 조합 ON CONFLICT UPDATE
- patterns 안의 `scope` 필드로 'url' vs 'domain' 구분

### 새 함정 (Round 36 fix 2/3 추가)

**(T) "버튼 한 번에 자동 반영" 요청은 위험 — 검수 단계 필수**
- 증상: 사용자가 "버튼 하나로 즉시 자동 적용" 요청. 곧바로 구현하면 잘못된 패턴 누적 위험.
- 원인: AI 인용 URL = "grounding 매칭이 잘 됐다" 의미. 좋은 콘텐츠 보장 아님. 자동 반영 시 미흡한 경쟁사 패턴이 콘텐츠 가이드에 누적되어 다음 콘텐츠 품질 저하.
- 정답: Phase 1 (분석 + 검수 + 누적) / Phase 2 (생성 시 적용) 분리. Phase 1 의 [가이드에 추가] 는 운영자 명시적 액션 필수. Phase 2 는 별도 라운드에서 generator.py 의 prompt 주입으로 연결.

**(U) UX 단위 (URL별 vs 도메인 단위) — 사용자 피드백 반영 패턴**
- 처음 구현 시 정밀도(URL별)와 운영자 피로도(도메인 단위) 사이 트레이드오프 명시. 사용자 결정 받고 후자 선택.
- 두 API 모두 보존 — 미래 자사 citations 페이지에서 URL별 분석이 필요할 수 있음. 코드 폐기 대신 보존 패턴.

**(V) Vercel 30초 timeout 안에 병렬 fetch — batch 5 × 5초 패턴**
- 단일 URL 8초 timeout 으로 직렬이면 10 URL = 80초 → fail
- 정답: Promise.all 로 5개씩 batch 병렬 + 각 5초 timeout → 약 10초 안 완료
- 실패 URL 은 skip + 응답에 `urls_failed` 카운트 명시

### Round 36 fix 2/3 산출물

코드:
- `medimap-blog-v2/src/app/api/admin/citations/keyword/route.ts` — stub 제외 (commit `614b615`)
- `medimap-blog-v2/src/app/api/admin/citations/route.ts` — stub 제외
- `medimap-blog-v2/src/app/api/admin/competitors/route.ts` — stub 제외
- `medimap-blog-v2/src/app/api/admin/learn-from-url/route.ts` — 보존 (URL별 분석, 미래 활용)
- `medimap-blog-v2/src/components/admin/LearnFromUrlButton.tsx` — 보존
- `medimap-blog-v2/src/app/api/admin/learn-from-domain/route.ts` — 신규 (도메인 일괄 분석)
- `medimap-blog-v2/src/components/admin/LearnFromDomainButton.tsx` — 신규
- `medimap-blog-v2/src/app/admin/(portal)/competitors/page.tsx` — 버튼 위치 변경

DB:
- `create_learned_insights_table` — learned_insights 테이블 + UNIQUE + index

Commit history (Round 36 전체):
- `7b1c70e` Tier 1-3 — fairness + additional_domains + 화이트리스트 확장
- `27bfe3f` SKILL.md 함정 Q/R/S
- `614b615` fix 2 stub 제외
- `01f5b91` fix 3 URL별 (보존)
- `4cd3bf2` fix 3 도메인 단위 전환 (최종)

### Round 37 후보 (사무실 결정 후)

- **Anthropic credit 충전 + Gemini paid tier** — 4 엔진 본격 활성화
- **learn-from-domain Phase 2** — generator.py 가 콘텐츠 생성 시 learned_insights 카테고리별 집계 → prompt 주입
- **메디맵 baseline 동적 로드** — content_settings 에서 baseline 수치 가져오기 (지금은 하드코딩)
- **learned_insights 어드민 페이지** — 누적된 진단 목록 보기 + 편집 + 적용 history
- **분류 사전 admin UI** — 운영자가 직접 T3/T4/T5/NOISE/additional_domains 편집

---

## Round 37 A+B (2026-05-31 저녁) — baseline 동적 로드 + 학습 인사이트 어드민 페이지

### A — 메디맵 콘텐츠 baseline 을 DB 로 (운영자 동적 편집 가능)

**문제**: learn-from-domain 진단의 비교 기준 (MEDIMAP_BASELINE) 이 코드에 하드코딩 → 운영자가 변경하려면 코드 push 필요.

**해결**:
- `content_settings.content_baseline` row 추가 (JSON setting_value)
- `learn-from-domain/route.ts` 의 `loadBaseline()` 헬퍼 — DB 에서 읽고 default fallback
- `diagnose()` 시그니처에 baseline 추가 — 모든 비교 메시지 동적

### B — `/admin/learned-insights` 학습 인사이트 페이지

**3 섹션 구성**:

1. **메디맵 콘텐츠 baseline 카드** — 8개 필드 (제목 길이, 본문 단어, H2/H3, 이미지, 내부링크, FAQ/Medical schema rate) 보기 + 인라인 편집. PUT API 가 즉시 content_settings UPDATE.

2. **학습 인사이트 누적 목록** — 도메인별 카드, 행 클릭 → expand → 평균 지표 / 진단 / 권장 / 메모. 행마다 [적용중] / [미적용] 토글 + 메모 편집 + 삭제. 빈 상태일 때 `/admin/competitors` 안내.

3. **Phase 2 안내 카드** — 다음 라운드 (사무실 + Anthropic credit) 에서 generator.py 가 적용 표시된 인사이트 카테고리별 집계 후 prompt 주입할 예정 명시.

### API 통합 (단일 route, 4 메서드)

`/api/admin/learned-insights`:
- GET — insights 목록 + baseline + tenant_name resolution (FK separate fetch — Round 29 fix 12 패턴)
- PATCH — applied toggle (+ applied_at 자동 set/null) / notes 편집
- DELETE — id 기반 단일 삭제
- PUT — baseline 전체 UPSERT (content_settings.content_baseline)

### 사이드바 메뉴

`AdminShell.tsx` 인사이트 그룹에 추가:
```
인사이트:
  ⚡ AI 인용 추적
  📚 학습 인사이트   ← Round 37 추가 (BookOpen)
  🔗 Funnel · ROI
  💰 비용 모니터
  📄 월간 보고서
```

### 새 함정 (Round 37 추가)

**(W) 운영 데이터 baseline 패턴 — 코드 하드코딩 → DB 로 점진 이동**
- 증상: 운영 진화하면서 baseline 수치가 변하는데 매번 코드 push + Vercel deploy 사이클 필요
- 정답: `content_settings` 같은 key-value 테이블에 JSON 으로 저장 → API 가 read-on-demand. default fallback 으로 안전성 유지. 운영자가 admin UI 에서 실시간 수정.
- 적용 가능: baseline 외에 의료법 린터 규칙 / 분류 사전 / 콘텐츠 가이드 v3 등도 같은 패턴 (Round 37 C 후보)

### Round 37 A+B 산출물

코드 (commit `f4a64d8`):
- `medimap-blog-v2/src/app/api/admin/learn-from-domain/route.ts` — loadBaseline + diagnose 시그니처 변경 + 응답에 baseline 포함
- `medimap-blog-v2/src/app/api/admin/learned-insights/route.ts` — GET/PATCH/DELETE/PUT 4 메서드 단일 route
- `medimap-blog-v2/src/app/admin/(portal)/learned-insights/page.tsx` — baseline 편집 + 인사이트 목록 + Phase 2 안내
- `medimap-blog-v2/src/components/admin/AdminShell.tsx` — 사이드바 "학습 인사이트" 추가

DB:
- `content_settings.content_baseline` row INSERT (8 필드 JSON)

### Round 37 C 후보 (다음 작업 결정 대기)

- **분류 사전 admin UI** (~3시간) — T3/T4/T5/NOISE/additional_domains 운영자 직접 편집. domain_classifications 테이블 신설 또는 content_settings 재활용.
- **자사 own cron 검증** (KST 07:00 이후) — fairness ORDER BY 효과 + 가능하면 시연용 스크린샷 준비
- **Round 30 잔여 잡일** (~1시간) — 자사 글 cover / 라벨 / slug redirect / LLM provider fallback

---

## Round 37 C (2026-05-31 야간) — 5-tier 분류 사전 admin UI + DB 화

### 진단 + 해결

**문제**: citations/competitors route.ts 의 `MEDIMAP_DOMAINS / AUTHORITY_DOMAINS / PLATFORM_DOMAINS / NOISE_DOMAINS` Set 4개 + classify 함수가 두 파일에 **중복 하드코딩**. 운영자가 새 도메인 분류 추가/수정 → 코드 push + Vercel deploy 사이클 필수. 매 라운드 동일 작업 반복.

**해결**:
1. `domain_classifications` 테이블 신설 — domain(unique) / tier(T1|T3|T4|NOISE) / category / notes / is_active
2. 기존 하드코딩 도메인 61개 시드 (Round 35/36 추가분 포함)
3. 공용 모듈 `src/lib/domain-classifier.ts` — `loadClassifierSets()` (5분 캐시) + `classifyDomain()` + `invalidateClassifierCache()`
4. citations/competitors route.ts 모두 신규 모듈 사용 — 중복 제거
5. 신규 CRUD API + admin UI 페이지

### 구조 다이어그램

```
┌─────────────────────────────────┐
│ domain_classifications (DB)     │
│  - T1 5개 / T3 34개 / T4 10개   │
│  - NOISE 12개 / total 61        │
└──────────┬──────────────────────┘
           │ read on demand (5분 캐시)
           ▼
┌─────────────────────────────────┐
│ src/lib/domain-classifier.ts    │
│  - loadClassifierSets()         │
│  - classifyDomain(d, url, cd, s)│
│  - invalidateClassifierCache()  │
└──────────┬──────────────────────┘
           │ shared
           ▼
┌─────────────────────────────────┐
│ citations / competitors route   │
│  - 하드코딩 set 제거 (95줄 ↓)   │
│  - classifyDomain 호출 통일     │
└─────────────────────────────────┘
           ▲
           │ admin CRUD
┌──────────┴──────────────────────┐
│ /api/admin/domain-classifications│
│  - GET / POST / PATCH / DELETE  │
│  - 모든 mutation 후 cache 무효화│
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ /admin/domain-classifications   │
│  - tier 카운트 카드 4개         │
│  - 신규 추가 form               │
│  - 검색 + 필터 + 인라인 편집    │
│  - 활성 토글 + 삭제             │
└─────────────────────────────────┘
```

### 사이드바 메뉴 (인사이트 그룹 갱신)

```
인사이트:
  ⚡ AI 인용 추적
  📚 학습 인사이트
  🛡️ 도메인 분류 사전   ← Round 37 C 추가 (ShieldCheck)
  🔗 Funnel · ROI
  💰 비용 모니터
  📄 월간 보고서
```

### Cache 무효화 패턴

```typescript
// 모든 POST/PATCH/DELETE 후
invalidateClassifierCache();
```

- 다음 fresh request 가 DB 재조회
- 5분 TTL 외에도 admin 변경 즉시 반영
- serverless cold start 마다 캐시 reset 됨 (Vercel 환경 특성)

### 새 함정 (Round 37 C 추가)

**(X) "하드코딩 → DB 이전" 패턴 — 점진 적용 권장**
- 증상: Round 35/36 매번 코드 push 사이클 반복. baseline (W), 분류 사전 (X), 의료법 규칙, generator prompt 템플릿 모두 같은 문제.
- 정답: 운영 변경 빈도가 잦거나 운영자 직접 편집 가치 큰 데이터는 DB 로 이전 + 5분 캐시 + admin UI. content_settings 같은 key-value 테이블 또는 전용 테이블 신설.
- 사용처: baseline (Round 37 A), 분류 사전 (Round 37 C). 다음 후보 — 의료법 린터 규칙, generator prompt 템플릿.

**(Y) 공용 모듈로 중복 제거 — 분류 로직이 여러 route 에 흩어진 경우**
- 증상: citations/competitors route 둘 다 classify 함수 + 4 set 하드코딩 → Round 35/36 추가 시 두 파일 동시 수정 + sync 누락 위험
- 정답: lib/domain-classifier.ts 같은 공용 모듈로 추출 + import. mutation API 가 invalidateClassifierCache() 호출하면 다음 호출부터 모든 route 가 fresh 데이터.

### Round 37 C 산출물

DB:
- `domain_classifications` 테이블 + 시드 61개

코드:
- `medimap-blog-v2/src/lib/domain-classifier.ts` — 공용 모듈
- `medimap-blog-v2/src/app/api/admin/domain-classifications/route.ts` — CRUD
- `medimap-blog-v2/src/app/admin/(portal)/domain-classifications/page.tsx` — 관리 UI
- `medimap-blog-v2/src/app/api/admin/citations/route.ts` — 하드코딩 제거 + 신규 모듈
- `medimap-blog-v2/src/app/api/admin/competitors/route.ts` — 동일
- `medimap-blog-v2/src/components/admin/AdminShell.tsx` — 사이드바 추가

### Round 37 E/F 상태

- **E**: 자사 글 라벨 — content-queue 의 is_partner_content=false 분기 이미 작동 (Round 30 작업). 다른 페이지 오표시 시 위치 알려주면 fix. Unsplash secret / slug redirect / LLM fallback 은 사무실 결정 후 (Round 38).
- **F**: 검증 시드 — 가짜 데이터 시드는 false signal. 사용자가 /admin/competitors 도메인 [전체 분석 & 반영] 정상 클릭으로 검증 (BGN / 지우피부과 / sueye.co.kr 등).

### Round 38 후보 (사무실 결정 + 시간 여유 시)

- Anthropic credit + Gemini paid tier 전환
- learn-from-domain Phase 2 — generator.py prompt 주입 (learned_insights applied=true 항목 카테고리별 집계)
- 옛 한글 slug redirect — Next.js redirects 또는 middleware fallback
- LLM provider fallback — Gemini 503 시 Anthropic/OpenAI 자동 retry
- UNSPLASH_ACCESS_KEY GitHub Secret 등록 (자사 글 cover 깨짐 해소)
- 의료법 린터 규칙 DB 이전 (X 패턴 추가 적용)
- generator.py prompt 템플릿 DB 이전 (X 패턴)

---

## Round 37 G + H (2026-05-31 야간 후반) — 모바일 햄버거 + 대시보드 차트 3개

### G — AdminShell 모바일 햄버거 사이드바

**문제**: 어드민 사이드바 228px 고정 폭 — 모바일(< 768px)에서 거의 화면 절반 점유, 메인 콘텐츠 누르기 어려움.

**해결**: Tailwind `md` (768px) breakpoint 기준 반응형:
- 데스크탑(md+): 기존 고정 사이드바 (hidden md:flex)
- 모바일: 상단 고정 헤더(h-14, fixed top-0) + 햄버거 버튼 + drawer overlay
- drawer 열림 시 `body.style.overflow = 'hidden'` scroll lock
- 라우트 변경 시 `useEffect(() => setMobileOpen(false), [pathname])` 자동 close
- 모든 nav item `min-h-[44px]` (애플 HIG tap target)
- 메인 콘텐츠 `pt-14 md:pt-0` (모바일 헤더 높이 보정)

### H — 운영 대시보드 차트 3개 (사용자 요청 + 스파링 제안)

사용자 요청 + 추가 제안 분석 후 3개 확정:

**차트 1: 메디맵 AI 인용 점유율(T1 share) 추이** — 라인 (30일)
- "메디맵 자체 도메인이 AI 응답에 인용되는 비율" — SaaS 직접 효과 검증
- 사용자 요청 정확 반영
- 현재 0% — 시간 누적 후 상승 추적이 가치 증명

**차트 2: 5-tier 점유율 추이** — stacked area (30일)
- 사용자 요청 "클라이언트(T2) vs 경쟁사(T5) 비교" 를 5-tier 전체로 확장 — 정보 풍부
- T1(메디맵) / T3(권위) / T4(플랫폼) / T5(외부·경쟁) / NOISE
- "T1 ↑ + T5 ↓" 가 진짜 성공 패턴

**차트 3: 클라이언트별 AI 인용 ranking** — 가로 막대 (Top 5)
- 추가 제안 — 영업 우선순위 결정 자료
- 색상 분리: T1 인용 있는 클라이언트(브랜드 블루) vs 없는 클라이언트(퍼플)
- 향후 4 엔진 활성화 후 더 가치 큼

### 차트 데이터 처리 패턴

server component (page.tsx) 에서 직접 SQL 호출 + JS 집계 → client component (DashboardCharts.tsx) 에 props 전달:
- responses 최근 30일 (source_domains NOT NULL) + queries (engine != stub) join
- domain_classifications 분류 사전 read
- JS 에서 일자별 group + tenant 별 group + tier 분류
- recharts ResponsiveContainer + AreaChart/LineChart/BarChart

### 추가 제안 (Round 38+ 후보)

스파링 분석 시 도출:
- **Top 키워드 grounding rate** — 어느 키워드가 잘 grounding 되나, 콘텐츠 우선순위 결정
- **신규 T5 도메인 알림** — Slack notify, 시장 변화 감지
- **엔진별 인용 분포** — Gemini/Claude/Perplexity/OpenAI 비교 (4 엔진 활성화 후)
- **카테고리별 baseline 비교** — 안과/피부과/성형외과 등 카테고리별 평균 메타 구조

### 새 함정 (Round 37 G/H 추가)

**(Z) 모바일 햄버거 sidebar — 라우트 변경 시 close + body scroll lock 필수**
- 증상: drawer 열린 채 다른 메뉴 클릭 → 라우트 변경되지만 drawer 그대로 → UX 어색
- 정답: `useEffect(() => setMobileOpen(false), [pathname])` + `body.style.overflow` 토글. cleanup 으로 `''` 복원.

**(AA) recharts 차트는 client component 강제** — server 에서 import 시 빌드 에러
- 증상: `'use client'` 안 붙이고 recharts 사용 → "ResponsiveContainer is not exported from 'recharts'" 류 에러
- 정답: 차트 wrapper 컴포넌트 별도 파일 + `'use client'` 첫 줄. server page 는 props 로 데이터만 전달.

### Round 37 G/H 산출물

코드:
- `medimap-blog-v2/src/components/admin/AdminShell.tsx` — 햄버거 사이드바 + drawer overlay
- `medimap-blog-v2/src/components/admin/LearnFromDomainButton.tsx` — modal grid `grid-cols-2 sm:grid-cols-3` 모바일 대응
- `medimap-blog-v2/src/components/admin/DashboardCharts.tsx` — 차트 3개 (라인/stacked area/가로 막대)
- `medimap-blog-v2/src/app/admin/(portal)/page.tsx` — fetchDashboardData 차트 데이터 집계 + import

### Round 37 미진 (다음 라운드)

- 모바일 표 → 카드 변환 (tenants/citations/competitors/learned-insights/domain-classifications)
- 모든 모달 풀스크린 (모바일)
- 키워드 풀 Tier 1+2 (사용자 결정 — 다른 작업 먼저)
- E 잔여 잡일 / F 검증 시드 — 사무실 결정 후

---

## Round 38 A + B (2026-05-31 외출 모드) — learn-from-domain Phase 2 + 추가 차트 2개

### A — learned_insights → generator prompt 주입 (Phase 2 완성)

**가치 명제 완성**: 운영자가 /admin/competitors 에서 분석한 도메인 인사이트 → /admin/learned-insights 에서 [적용중] → 매 발행 cron 시 prompt 에 자동 반영.

**구조**:
```
/admin/competitors [전체 분석 & 반영] (Round 36 fix 3)
       ↓ POST /api/admin/learn-from-domain?save=true
learned_insights INSERT (scope='domain', patterns.diagnosis/recommendations)
       ↓
/admin/learned-insights [적용중] toggle (Round 37 B)
       ↓ applied=true
generator.py (Round 38 A): src/content/learned_insights_loader.py
       ↓ build_guidance_by_category()
references_block 에 자연어 가이드 append
       ↓
LLM prompt 자동 주입 → 새 콘텐츠가 권장사항 반영
```

**`src/content/learned_insights_loader.py` 핵심 로직**:
- Supabase REST 로 `applied=true` 인사이트 fetch (DATABASE_URL 없는 cron 환경도 OK)
- 카테고리별 group + 빈도 기반 권장사항 top 3
- 평균 본문 / H2 / FAQ schema / Medical schema rate 집계
- 자연어 string 으로 빌드 (LLM 이 자연스럽게 읽음)
- 빈 카테고리면 빈 string (noop)

**generator.py 통합**:
```python
# 약 4줄 추가 — 기존 references_block 빌드 직후
from src.content.learned_insights_loader import get_guidance_for_category
guidance = get_guidance_for_category(tenant.domain_category)
if guidance:
    references_block = f"{references_block}\n\n{guidance}".strip()
```

침습 최소. 기존 prompt 구조 손대지 않고 references 와 같은 자리에 자연어로 추가.

### B — 대시보드 차트 2개 추가 (Round 37 H 의 연장)

**차트 4: Top 키워드 grounding rate (가로 막대)**
- "이 키워드 측정 시 AI가 출처 URL을 명시하는 비율"
- 데이터: 30일 queries (engine != stub) vs responses (source_domains.length > 0)
- Top 10, queries 횟수 순
- 색상 — 50%+ 권위색(민트) / 20~50% 플랫폼색(퍼플) / 20% 미만 경고색(앰버, 보강 필요)
- **운영 가치**: rate 낮은 키워드 = 콘텐츠 보강 우선순위

**차트 5: 신규 등장 도메인 (표)**
- "최근 7일에 처음 인용된 hostname" — 그 이전 30일에는 안 등장한 것만
- tier 자동 분류 + 첫 등장일 + 등장 횟수
- "분류 →" 링크로 /admin/domain-classifications 바로가기
- **운영 가치**: 시장 변화 / 신규 경쟁사 즉시 감지

### 새 함정 (Round 38 추가)

**(AB) Python ↔ TypeScript 데이터 흐름 — REST 로 통일**
- 상황: generator.py (Python, GitHub Actions cron) 가 learned_insights (TypeScript admin 이 INSERT) 를 읽어야 함
- 정답: Supabase REST 가 양방향 단일 source — DATABASE_URL/SQLAlchemy 없이도 httpx 만으로 read/write. content_settings.py 의 `load_from_supabase_rest()` 패턴 재활용.

**(AC) recharts 의 Bar 안 Cell 색상 변경 — entry 별 dynamic**
- 증상: 일반적인 `<Bar fill="..." />` 단일 색상만. entry 마다 다른 색 필요 (예: rate 50%+ vs 미만)
- 정답: `<Bar>{data.map((d, i) => <Cell key={i} fill={...} />)}</Bar>` 패턴. clientRanking 의 t1 강조와 keywordGrounding 의 rate 범위 강조 모두 사용.

### Round 38 산출물 (A + B)

코드:
- `src/content/learned_insights_loader.py` — 신규 (Python REST loader)
- `src/content/generator.py` — references_block 에 learned guidance append
- `medimap-blog-v2/src/components/admin/DashboardCharts.tsx` — 차트 4/5 추가
- `medimap-blog-v2/src/app/admin/(portal)/page.tsx` — fetchDashboardData 에 keyword grounding + new domains 집계

### Round 38 C/D 보류 (다음 라운드)

- **C 키워드 풀 강화**: 사용자가 위 turn 에서 "그대로 유지" 결정. 재논의 필요.
- **D 모바일 표 → 카드**: 5 페이지 변환. 페이지당 30분 ~ 2.5시간. 다음 라운드 별도 진행 권장.

### Round 38 검증 — 사용자가 사무실/돌아온 후

1. **Phase 2 효과 확인**: /admin/learned-insights 에서 [전체 분석 & 반영] 1회 클릭 → applied=true → 다음 발행 cron (23:00 UTC) 의 생성 콘텐츠가 권장사항 반영하는지 (예: FAQ schema 포함, H2 7+개 등)
2. **차트 4 검증**: /admin → "Top 키워드 grounding rate" 가 채워지는지 (gemini 측정 14건 기반 — 5~10개 키워드 표시 예상)
3. **차트 5 검증**: 신규 도메인 — 최근 7일 + Round 36/37 발견 도메인 (toxnfill, medspabeni 등) 이 priorDomains 에 없으면 표시

---

## Round 38 C+D+G (2026-05-31 외출 모드 계속) — SaaS 자체 추적 + 기간 조회 + ranking 강화

### Round 38 C — 메디맵 SaaS 자체 시장 노출도 추적 (사용자 신규 아이디어)

**가치 명제**:
- "GEO 최적화", "AEO 컨설팅" 같은 SaaS 카테고리 키워드를 AI 에 query → 메디맵 자체가 인용되는지
- 잠재 고객 (다른 의료 마케팅 대행사 / 큰 병원) 노출도 측정
- 동시에 경쟁 SaaS 도메인 자동 발견 (인사이트 추출)

**구조**:
- `keywords.is_saas_marketing BOOLEAN` 컬럼 + partial index
- 메디맵 tenant 에 SaaS 마케팅 키워드 10개 시드 (GEO 최적화, AEO 컨설팅, 의료 AI 마케팅 도구, ...)
- `/api/admin/saas-tracking` API — saas_marketing 키워드만 + 결과 분석
- `/admin/saas-tracking` 페이지 — 4 KPI + T1 share 라인 차트 + 키워드별 grounding 표 + 경쟁 SaaS 도메인 list (expand 시 URL)
- 사이드바 인사이트 그룹에 ✨ "SaaS 시장 노출도" (Sparkles 아이콘)

**기존 cron 자연 통합**:
- `measure-ai-mentions.yml` 의 `PURPOSE_FILTER=own` 자사 측정에 자동 포함 (is_saas_marketing 도 own purpose 유지)
- 별도 cron 안 만들고 기존 인프라 재활용
- last_measured_at fairness ORDER BY (Round 36 Tier 2) 가 자동으로 균등 측정 보장

### Round 38 D — 대시보드 기간 조회 토글 (7d/30d/90d)

- `/admin?period=7|30|90` URL searchParams
- server component 가 periodDays 받아 모든 차트 데이터 fetch
- 헤더 위 토글 버튼 3개 — 현재 기간 강조
- fetchDashboardData(periodDays) 시그니처 변경 — 모든 cutoff 와 일자 fill 이 periodDays 기준

### Round 38 G — Ranking 차트 stacked bar (T1/외부)

- 기존 단일 막대 → T1 + 권위/플랫폼 + 외부 T5 stacked
- "BGN 의 인용 50건 = T1 5 + 권위 10 + T5 35" 처럼 분리 진단
- 막대 안 색상이 영업 자료 — T1 비중 = 메디맵 SaaS 효과, T5 = 보강 기회

### 새 함정 (Round 38 추가)

**(AD) URL searchParams 기반 기간 조회 — server component 패턴**
- 증상: 대시보드에 interactive 기간 토글 추가하려는데 모든 차트가 server component
- 정답: server component 의 page 가 `{ searchParams }` props 받음 → fetchDashboardData(periodDays) → `<Link href="/admin?period=7">` 로 페이지 reload. interactive 안 필요 (탭 클릭 = 새 페이지 fetch).
- 장점: URL 공유 가능 (예: 슬랙에 `/admin?period=90` 공유), 새로고침 시 상태 유지.

**(AE) PostgreSQL ALTER TABLE 안전 — DO $$ BEGIN END $$ 블록**
- 상황: 메디맵 tenant id 를 조건부 SELECT → INSERT 키워드 시드
- 패턴: `DO $$ DECLARE tid INTEGER; BEGIN SELECT id INTO tid ... IF tid IS NOT NULL THEN INSERT ... END IF; END $$;`
- DECLARE + IF 로 안전. 메디맵 tenant 미존재 시 noop.

### Round 38 C+D+G 산출물

DB:
- `add_saas_marketing_flag` migration — keywords.is_saas_marketing + 시드 10개

코드:
- `medimap-blog-v2/src/app/api/admin/saas-tracking/route.ts` — 신규 API
- `medimap-blog-v2/src/app/admin/(portal)/saas-tracking/page.tsx` — 신규 페이지
- `medimap-blog-v2/src/components/admin/AdminShell.tsx` — 사이드바 + Sparkles 아이콘
- `medimap-blog-v2/src/app/admin/(portal)/page.tsx` — fetchDashboardData(periodDays) + URL 토글
- `medimap-blog-v2/src/components/admin/DashboardCharts.tsx` — ranking stacked bar

### Round 38 미진 (다음 라운드)

- **5-tier 차트 카테고리 group** — 안과/피부과/성형외과 별 분리 차트
- **클라이언트 검색 필터** — ranking 에서 클라이언트 검색 (현재 Top 5 만)
- **모바일 표 → 카드** — tenants/citations/competitors/learned-insights/domain-classifications (5 페이지, 큰 작업)
- **키워드 풀 Tier 1+2** — purpose 컬럼 + 클라이언트 chip editor
- **LLM provider fallback** — Gemini 503 시 Anthropic/OpenAI 자동 retry (generator.py + llm.py 변경)
- **목표선/추세 화살표** — 차트 고도화 추가

### 사용자가 돌아온 후 검증

1. `/admin?period=7` / `period=30` / `period=90` 토글 동작 확인
2. `/admin/saas-tracking` 페이지 진입 — 10 SaaS 키워드 + 차트 (현재 데이터 0, 다음 cron 후 누적)
3. Ranking 차트 stacked 색상 분리 — BGN 막대 안 T1(파랑) + 권위/플랫폼(민트) + T5(앰버) 비율

---

## Round 38 후속 (2026-05-31) — 도메인 분류 사전의 클라이언트 컨텍스트화

### 진단 — 글로벌 분류만의 한계

**사용자 핵심 지적**:
- T1/T3/T4/NOISE 는 글로벌 분류 (어느 클라이언트 봐도 의미 동일)
- 그러나 **T5 (외부/경쟁) 는 클라이언트마다 의미 다름**
- 예: sueye.co.kr 은 BGN(안과)의 직접 경쟁, 지우피부과와는 무관
- 도메인 분류 사전이 "비즈니스 모델에 맞는 키워드(경쟁사) 확인 → 분석/추적 → 고도화" 자산이 되려면 클라이언트 컨텍스트 필수

### 해결 — tenant_domain_competition 테이블 + 컨텍스트 UI

**DB 구조**:
```sql
CREATE TABLE tenant_domain_competition (
  tenant_id INTEGER REFERENCES tenants(id),
  domain TEXT,
  label TEXT,  -- DIRECT | INDIRECT | REFERENCE | TO_LEARN | IGNORE
  priority INTEGER (0~5),
  notes TEXT,
  auto_suggested BOOLEAN,
  UNIQUE (tenant_id, domain)
);
```

**자동 시드**: Round 35/36 발견 도메인 중 카테고리 매칭되는 것 자동 라벨:
- BGN(안과): sueye.co.kr, bnviit, topeye, brandeye, eyereum, eyemiso, goodlasik 등 10개 DIRECT (priority 2~5)
- 지우피부과: toxnfill, medspabeni, smartskin, alllitingclinic, cheongdamskinclinic 등 7 DIRECT + 3 INDIRECT + 1 REFERENCE

**페이지 UI**:
- 헤더 아래 "클라이언트 컨텍스트 보기" 카드
- 드롭다운 selector — 클라이언트 선택 시 그 tenant 의 라벨 카운트 chip 표시 (직접 경쟁 10 / 간접 3 / 정보 1 등)
- 표에 컬럼 2개 추가 (선택 시): **인용 횟수** (그 클라이언트 측정 시) + **경쟁 라벨** (select 드롭다운)
- 라벨 변경 즉시 POST → DB 저장 → 새로고침
- auto_suggested 표시 — 운영자가 직접 분류 vs 자동 발견 구분

### API

`/api/admin/domain-context`:
- GET ?tenantId=N — selected tenant 의 keyword 측정 결과 → 도메인별 occurrences + 라벨 join
- POST ?tenantId=N body {domain, label} — UPSERT (auto_suggested=false)
- DELETE ?tenantId=N&domain= — 라벨 제거

### 새 함정 (Round 38 후속)

**(AF) 글로벌 분류 vs 클라이언트별 컨텍스트 — 둘 다 필요**
- 증상: T5 default 분류가 모든 unknown 도메인을 묶음 → 클라이언트별 영업 인사이트 부족
- 정답: 글로벌 (domain_classifications) + 클라이언트별 (tenant_domain_competition) 분리. 5-tier 분류는 운영자 큐레이션 master, 라벨은 영업 컨텍스트.

**(AG) 자동 시드 패턴 — Round 35/36 발견 도메인 회수**
- 운영 누적 데이터가 가치 — 새 테이블 만들 때 기존 발견 도메인 카테고리 매칭으로 자동 시드
- 운영자가 처음 페이지 들어가도 빈 화면 X, 자동 분류된 라벨 보고 검수만

### Round 38 후속 산출물

DB:
- `add_tenant_domain_competition` migration — 테이블 + index + 자동 시드 21개

코드:
- `medimap-blog-v2/src/app/api/admin/domain-context/route.ts` — 신규 CRUD
- `medimap-blog-v2/src/app/admin/(portal)/domain-classifications/page.tsx` — selector + 컨텍스트 컬럼 + 인라인 라벨 편집

### Round 38 후속 미진 (Round 39 이후)

- **옵션 3: 자동 분석 trigger** — cron 이 새 T5 도메인 발견 시 자동 learn-from-domain 호출 + 카테고리 룰 기반 라벨 추천
- **컨텍스트 모드 전용 표** — 글로벌 분류 안 된 도메인 (T5 default) 도 표시. 현재는 분류 사전에 있는 도메인만 컨텍스트 컬럼 표시
- **citations API 라벨 활용** — DIRECT_COMPETITOR 만 보기 등 라벨 기반 필터
- **모바일 표 → 카드** — 5 페이지 대규모 작업
- **키워드 풀 Tier 1+2** — purpose 컬럼 + 클라이언트 chip editor
- **LLM provider fallback** — Gemini 503 시 Anthropic/OpenAI 자동 retry

### 사용자 검증

1. `/admin/domain-classifications` → 클라이언트 컨텍스트 카드 → **BGN 잠실** 선택
2. 라벨 chip 표시: 직접 경쟁 10 (자동 발견)
3. 표 우측에 인용 횟수 + 경쟁 라벨 드롭다운 컬럼 추가
4. 라벨 변경 → DB 저장 → 페이지 reload 시 유지 확인
5. 다른 클라이언트 (지우피부과) 선택 시 같은 도메인이라도 다른 라벨 표시

---

## Round 39 (2026-05-31 외출 후반) — 대시보드 차트 5개 클라이언트 필터 + 사용자 지정 기간 + 신규 도메인 세부 인사이트

### 진단 — 사용자 핵심 지적

**1. 모든 차트 공통**:
- 기간이 7d/30d/90d 만 있음 → **사용자 지정 (date range)** 필요
- 클라이언트별 데이터 보기 어려움 → **클라이언트 selector + 검색** 필요

**2. 신규 도메인 알림**:
- 대표 도메인만 표시 → **어떤 콘텐츠/세부 URL 때문인지** 불명확
- 분류 등록 버튼 → **자동 분류 + 검증 히스토리** 필요 (다음 라운드)

**3. Top 키워드 grounding rate**:
- 차트 역할 설명 부족 → **자세한 해석 + 활용 가이드** 추가

### 해결 — `DashboardFilters` 신규 컴포넌트 + tenantId 필터

**URL searchParams 패턴**: `?tenantId=N&period=7|30|90|custom&from=YYYY-MM-DD&to=YYYY-MM-DD`
- server component reload 기반 → 새로고침 시 상태 유지, URL 공유 가능

**DashboardFilters 컴포넌트**:
- 클라이언트 selector — text input + datalist 자동완성 + clear 버튼
- 기간 토글 4개 (7d / 30d / 90d / 사용자 지정)
- 사용자 지정 모드 시 `<input type="date">` 2개 + 적용 버튼

**fetchDashboardData 시그니처 변경**:
```typescript
async function fetchDashboardData(opts: {
  periodDays: number;
  tenantId?: number | null;
  fromDate?: string;
  toDate?: string;
})
```
- 사용자 지정 기간 시 customCutoff/customEnd 우선
- 모든 SQL 에 tenantId 필터 추가 (queries.tenant_id = ?)

**차트별 tenantId 효과**:
- T1 share / 5-tier stacked: 그 클라이언트 키워드 측정만 집계
- ranking: 그 클라이언트 1개만 표시 (이미 ranking 이지만 filter 적용 시 1개)
- keyword grounding: 그 클라이언트 키워드만
- 신규 도메인: 그 클라이언트 측정에서 첫 등장한 도메인만

### 신규 도메인 세부 인사이트 강화

**기존**: 도메인 / tier / 첫 등장일 / 등장 횟수 / 분류 등록 링크

**Round 39 확장**:
- expandable 행 — 클릭 시 펼침
- **세부 인사이트**:
  - 등장 키워드 (`라식`, `백내장` 등 — 어느 검색에서 발견)
  - 측정 클라이언트 (`BGN 잠실` — 어느 tenant 측정 흐름에서)
  - **실제 인용된 URL** (Vertex AI grounding redirect 해제된 final_url) — "어떤 콘텐츠 때문에 등장했나" 답변
  - 분류 사전 편집 바로가기

### Top 키워드 grounding rate 역할 명확화

차트 헤더에 3 단계 설명 추가:
1. **차트의 역할** — "키워드 query 시 AI 가 출처 URL 을 명시하는 비율"
2. **해석** — 50%+ 안정 / 20~50% 보강 가능 / 20% 미만 시급
3. **활용** — 낮은 rate 키워드 = 메디맵 콘텐츠 가이드 적용 우선순위

### 새 함정 (Round 39 추가)

**(AH) Server component + URL searchParams interactive 필터 패턴**
- 증상: 모든 차트가 server-side, recharts 가 client-only → interactive 필터 어떻게 통합?
- 정답: server page 가 searchParams 받음 → fetchData(opts) → client 컴포넌트(DashboardFilters)가 `useRouter().push()` 로 URL 변경 → 페이지 재렌더. interactive useState 안 써도 됨.

**(AI) datalist + typeahead 패턴 — search 가능한 selector**
- 증상: 단순 `<select>` 는 클라이언트 20+ 시 누르기 어려움
- 정답: `<input list="...">` + `<datalist>` — 브라우저 native 자동완성. + 별도 filtered dropdown 으로 fallback (datalist 가 모바일에서 약함).

**(AJ) 클라이언트 컨텍스트 새로 등장 도메인 — query meta 별도 fetch**
- 증상: source_domains 만으로는 "어느 키워드/클라이언트로 발견됐는지" 모름
- 정답: respRecent.query_id → queries 별도 fetch → keyword_id + tenant_id → keyword.text + tenant.name 또 별도 fetch. PostgREST embed inner join 함정 (Round 29 fix 12) 패턴 그대로.

### Round 39 산출물 (Phase A)

코드:
- `medimap-blog-v2/src/components/admin/DashboardFilters.tsx` — 신규 (typeahead selector + 4 기간 토글 + date range)
- `medimap-blog-v2/src/app/admin/(portal)/page.tsx` — fetchDashboardData(opts) 시그니처 변경 + tenantId 필터 + 신규 도메인 세부 정보 집계
- `medimap-blog-v2/src/components/admin/DashboardCharts.tsx` — 신규 도메인 expandable 표 + grounding 차트 설명 강화 + NewDomainItem 확장

### Round 39 Phase B 후보 (사용자 결정)

- **자동 분류 (옵션 3 잔여)** — 신규 T5 도메인 cron 발견 시 rule-based 카테고리 매칭 + auto INSERT 또는 1클릭 확정 UI
- **검증 히스토리** — 자동 분류된 도메인의 시간별 인용 추이 + 운영자 수정 history
- **citations API 라벨 활용** — DIRECT_COMPETITOR 만 보기
- **모바일 표→카드** (큰 작업)
- **키워드 풀 Tier 1+2** — purpose 컬럼 + 클라이언트 chip editor
- **LLM provider fallback** — Gemini 503 → Anthropic/OpenAI 자동 retry

---

## Round 40 (2026-05-31 외출 후반 2) — B1 LLM fallback + B2 라벨 필터 + B3 자동 분류 + B6/B7 헬퍼

### B1 — LLM provider fallback

**가치**: Gemini 503/429/quota exhaust 시 자동 Anthropic → OpenAI → Stub 시도.

**`src/content/llm.py` 변경**:
- `class FallbackProvider` 신규 — `_try_all(method_name, *args, **kwargs)` 로 모든 provider 순차 시도
- `_build_provider_chain()` — 환경변수 기반 우선순위 chain (Anthropic > Gemini > OpenAI > Stub)
- `get_provider("fallback")` 호출 시 FallbackProvider 반환

**환경변수 사용법**: `LLM_PROVIDER=fallback` 으로 설정 시 자동 활성. 단일 provider (gemini/anthropic/openai) 도 그대로 작동.

**향후**: GitHub Actions cron yml 에 `LLM_PROVIDER: fallback` 설정 권장. 사용자가 Anthropic credit 충전 후 효과 즉시.

### B2 — citations/competitors API 라벨 필터

**가치**: 사용자 명시 요청 "DIRECT_COMPETITOR 만 보기".

**`/api/admin/competitors?label=DIRECT|INDIRECT|REFERENCE|TO_LEARN|IGNORE`**:
- 그 라벨이 부여된 도메인만 competitor_top 반환
- priority 순으로 정렬 (DIRECT 의 priority 5 가 priority 2 보다 위)
- tenant_id 필수 (라벨은 tenant 별)

### B3 — 도메인 자동 분류 rule-based (LLM 호출 없음)

**`src/lib/domain-auto-classifier.ts` 신규**:
- 5 단계 규칙 매칭:
  1. NOISE — wiki/google/youtube/tistory 등 패턴
  2. T3 학회/공식 — `.or.kr` / `.go.kr` / `.ac.kr` / 알려진 종합병원
  3. T3 매체 — `news.` / hidoc / docdocdoc / 의료 매체
  4. T4 플랫폼 — modoodoc / gangnamunni / babitalk / ddmdandy
  5. T5 의료 카테고리 — eye / skin / clinic / hospital / 의원 (default 라 DB 등록 skip)
- confidence 0~1 + reason 자연어
- LLM 호출 0 — 사용자 결정 "보수적"

**`/api/admin/auto-classify-domains` POST**:
- body 비어있으면 최근 7일 신규 도메인 자동 추출
- 매칭된 도메인 (T1/T3/T4/NOISE) → `domain_classifications` INSERT (`is_active=false`)
- 운영자 검토 후 활성화 필요 (`/admin/domain-classifications` 에서)
- 응답: added/skipped 분리, skipped 사유 명시

**향후 dashboard 통합**: 신규 도메인 차트 옆 "[자동 분류 일괄 등록]" 버튼 추가 (다음 라운드).

### B6 + B7 — globals.css 에 admin UI 헬퍼 일괄 추가

운영 단계의 일관성을 위한 헬퍼 클래스:
- `.admin-page-header` / `.admin-page-title` / `.admin-page-desc` — 모든 페이지 헤더 통일
- `.admin-table-wrap` — `-mx-2 overflow-x-auto md:mx-0` + 표 min-w-[640px] (모바일 가로 스크롤 안전)
- `.admin-empty` / `.admin-empty-icon` / `.admin-empty-title` / `.admin-empty-desc` — 일관된 빈 상태 메시지
- `.admin-card` — `p-3 md:p-5` 모바일 padding 자동
- `.admin-skeleton` — animate-pulse loading

**향후**: 페이지별 적용은 점진적 (refactor 분량 큼). 새 페이지 만들 때부터 이 헬퍼 사용.

### 새 함정 (Round 40 추가)

**(AK) FallbackProvider — `_try_all` generic 메서드 디스패치**
- 증상: Gemini/Anthropic/OpenAI 모두 같은 4개 메서드 (faq/blog/naver/instagram) 노출. 각각 wrap 하면 코드 중복.
- 정답: `getattr(p, method_name)` 으로 메서드 이름만 받고 동적 호출. 메서드 추가 시 wrapper 작성 안 해도 됨.

**(AL) Rule-based 자동 분류는 보수적 default 권장**
- 증상: 매칭 안 된 도메인을 T5 로 자동 등록하면 DB 폭증 + 의미 없음
- 정답: T5 는 default 이므로 명시 INSERT skip. T1/T3/T4/NOISE 만 명시 등록.
- `is_active=false` 로 등록 — 운영자가 검토 후 활성화 (함정 T "검수 단계 필수" 적용)

**(AM) UI/UX 헬퍼 — globals.css 에 점진 추가, 페이지 refactor 는 별도**
- 증상: 모든 페이지 동시 refactor 면 분량 너무 큼 + 빌드 위험
- 정답: 헬퍼 클래스 먼저 정의 → 새 페이지부터 사용 → 기존 페이지는 별도 라운드에서 점진 마이그레이션

### Round 40 산출물

코드:
- `src/content/llm.py` — FallbackProvider class + _build_provider_chain + get_provider 'fallback' 옵션
- `medimap-blog-v2/src/app/api/admin/competitors/route.ts` — label 필터 옵션
- `medimap-blog-v2/src/lib/domain-auto-classifier.ts` — 신규 rule engine
- `medimap-blog-v2/src/app/api/admin/auto-classify-domains/route.ts` — 신규 자동 분류 API
- `medimap-blog-v2/src/app/globals.css` — admin UI 헬퍼 클래스 9개

### Round 41 후보 (다음 라운드)

- **자동 분류 UI 통합** — dashboard 의 신규 도메인 차트 옆 [자동 분류 일괄 등록] 버튼
- **자동 분류 cron** — daily/weekly cron 으로 신규 도메인 자동 발견 + 분류
- **검증 히스토리** — 자동 분류된 도메인의 시간별 인용 추이 (B4 잔여)
- **키워드 풀 Tier 1+2** — purpose 컬럼 + 클라이언트 chip editor (B5 잔여)
- **모바일 표→카드 본격 변환** — 단순 wrap 이상의 카드 layout (5 페이지)
- **페이지별 헬퍼 적용** — admin-page-header / admin-table-wrap / admin-empty 점진 마이그레이션
- **citations 페이지에 label 필터 토글** — `/admin/competitors?label=DIRECT` URL 노출 UI

### UI/UX 17년차 전문가 추가 제안 (Round 41+)

지금까지 작업한 후 추가 개선 후보:
1. **Visual hierarchy 강화** — KPI 카드의 숫자 크기 / 색상 강조 / typography 비율
2. **Loading skeleton** — 모든 페이지 server fetch 동안 스켈레톤 표시
3. **Toast notification** — 액션 결과 (저장/삭제/적용) 즉시 피드백
4. **Breadcrumb** — 깊은 페이지 (예: tenant 편집 안 키워드 모달) navigation 강화
5. **Keyboard shortcuts** — 자주 사용 액션 (예: `/` 검색 focus, `g + t` tenants 이동)
6. **Onboarding tooltip** — 첫 방문 시 핵심 페이지 가이드
7. **Color semantic 일관성** — success/warning/danger 일관된 사용 (status-success/warning/danger 토큰 활용)
8. **Accessibility** — aria-label, focus-visible 강화, WCAG AA 색 대비
9. **Dark mode** — 운영자가 야간 사용 시 (저녁/새벽 cron 검수)
10. **Search across pages** — Cmd+K palette

---

## Round 41 (2026-05-31 마무리) — 사용자 지정 기간 fix + domain-classifications 검색/연동/고도화

### 사용자 4가지 명시 요청

1. **사용자 지정 기간 키 안 먹힘**
2. **domain-classifications 클라이언트 selector 연동 X**
3. **드롭다운 → 검색 가능**
4. **분류 목록 고도화 — 클라이언트사 경쟁사 분석 → 학습 → 메디맵 콘텐츠 배포**

### Fix 1 — 사용자 지정 기간 default 7일

**버그**: `selectPeriod('custom')` 첫 클릭 시 fromDraft/toDraft 비어있음 → URL 에 from/to 없음 → page.tsx 의 `isCustom = period === 'custom' && from && to` → false → 30일 fallback.

**수정**: 첫 클릭 시 default from = 7일 전 / to = 오늘 자동 set → URL 즉시 업데이트 → UI 와 차트 동시 반영. 사용자가 date input 직접 변경 후 [적용] 버튼 누르면 다시 업데이트.

### Fix 2+3 — ClientContextSelector 컴포넌트 (typeahead)

**Before**: 단순 `<select>` — 클라이언트 많아지면 누르기 어려움

**After**: 신규 `ClientContextSelector` 컴포넌트
- text input + Search icon + clear (X) 버튼
- focus 시 자동 dropdown (최근 10개)
- 검색어 입력 → filter
- selected 상태 강조
- business_model 부제목 표시

DashboardFilters 의 typeahead 패턴과 일관성. 두 페이지 다 동일 UX.

### Fix 4 — 분류 목록 클라이언트 컨텍스트 자동 필터링

**Before**: 클라이언트 선택해도 표는 글로벌 list 그대로. 컬럼 2개만 추가 표시 (인용 횟수, 라벨).

**After (Round 41 통합 view)**:

1. **글로벌 모드** (클라이언트 미선택):
   - 분류 목록 (T1/T3/T4/NOISE 전체)
   - 마스터 사전 관리 view

2. **클라이언트 컨텍스트 모드** (클라이언트 선택):
   - 표 자동 필터링 → 그 클라이언트 인용 있는 도메인만 + 인용 횟수 순 정렬
   - **새 섹션** "분류 사전 미등록 외부 도메인" — T5 default 외부 도메인 자동 표시
     - 인용 횟수, 경쟁 라벨, 비고
     - "학습 분석 →" 링크로 `/admin/competitors?tenantId=X` 이동
   - 표 헤더 동적 — "인용 있는 것만 (N건)" 표시

이 패턴이 사용자 명시 의도 ("경쟁사 현황, 분석을 하고 이를 바탕으로 학습해서 우리에게 맞는 컨텐츠를 배포") 의 구체화:
- 클라이언트 선택 → 그 경쟁사 도메인 한눈에
- 학습 분석 버튼 → `/admin/competitors` 의 도메인 분석 cycle 진입
- 발견된 외부 도메인 → 분류 라벨링 즉시 가능

### 새 함정 (Round 41 추가)

**(AN) URL searchParams 기반 토글 첫 클릭 default 패턴**
- 증상: "사용자 지정" 같은 모드 토글이 추가 입력 (date range) 필요 → 첫 클릭 시 입력 없으면 무반응
- 정답: 첫 클릭 시 default 값 (7일 전 ~ 오늘) 자동 set → 즉시 활성. 사용자가 input 으로 fine-tune.

**(AO) typeahead onMouseDown vs onClick**
- 증상: `onBlur` 가 `onClick` 보다 먼저 발생 → dropdown 닫힌 뒤 클릭 → 선택 안 됨
- 정답: dropdown 옵션 클릭 핸들러 `onMouseDown` 사용. 또는 `onBlur` 에 `setTimeout` 100~200ms 지연.

**(AP) 글로벌 마스터 view vs 클라이언트 컨텍스트 view — 같은 페이지 dual mode**
- 패턴: 페이지 본질을 변경하지 않으면서 클라이언트 선택 시 강화 view 추가
- 글로벌 미선택 시 — 마스터 사전 관리 (기존)
- 클라이언트 선택 시 — 경쟁사 분석 + 학습 진입점 (신규)
- 사용자 의도 "분류 사전이 경쟁사 분석/학습 자산" 구체화

### Round 41 산출물

코드:
- `medimap-blog-v2/src/components/admin/DashboardFilters.tsx` — 사용자 지정 default 7일
- `medimap-blog-v2/src/app/admin/(portal)/domain-classifications/page.tsx`:
  - 신규 `ClientContextSelector` 컴포넌트 (typeahead)
  - filtered 로직 — 클라이언트 컨텍스트 시 인용 있는 도메인만 + 인용 횟수 정렬
  - 신규 `contextOnlyDomains` — 분류 사전 미등록 외부 도메인 추출
  - 신규 섹션 "분류 사전 미등록 외부 도메인" — 학습 분석 진입점
  - 표 헤더 동적

### Round 42 후보 (다음 라운드)

- 자동 분류 dashboard UI 통합 — 신규 도메인 차트 옆 [자동 분류 일괄 등록] 버튼
- 검증 히스토리 (B4 잔여)
- 키워드 풀 Tier 1+2 (B5 잔여)
- 모바일 본격 카드 변환 (5 페이지)
- citations 페이지 label 필터 토글 UI
- learn-from-domain Phase 3 — 카테고리별 자동 baseline 보강

---

## Round 42 (2026-05-31 6시간 외출 자동 진행) — A+B+D 완료, E/F/G/H 보류

사용자 의도: 6시간 동안 다 진행 + 복귀 후 검증. 솔직한 평가 — 총 10+ 시간 분량이라 안전 batch 분할 + 빌드 위험 큰 변경은 다음 라운드 미룸.

### A — 자동 분류 UI 통합

**`AutoClassifyButton.tsx` 신규 컴포넌트** + dashboard 신규 도메인 차트 헤더 통합:
- POST `/api/admin/auto-classify-domains` 호출 — rule-based 매칭 도메인 일괄 등록
- 결과 모달 — 등록 N건 + 스킵 사유 + 활성화 안내
- 성공 시 `router.refresh()` 자동 페이지 갱신
- 신규 도메인 list 가 candidate domains 로 자동 전달
- 등록은 `is_active=false` — 운영자가 `/admin/domain-classifications` 에서 검토 후 활성화 (Round 40 의 자동 분류 정책 유지)

### B — citations(competitors) 페이지 label 필터 토글 UI

`/admin/competitors` 의 "경쟁사 도메인 상세" 헤더에 토글 6개:
- 전체 / 직접 경쟁 / 간접 / 정보 출처 / 분석 대상 / 무시
- 클라이언트 선택 시에만 표시 (라벨은 tenant 별 컨텍스트)
- 클릭 시 setLabelFilter → useEffect dep → API 재호출 (?label=DIRECT)
- API 가 priority desc 정렬 (DIRECT priority 5 > 2)

### D — 키워드 풀 Tier 1: purpose 컬럼 + 필터

**`/admin/keywords`**:
- API GET — `purpose`, `is_saas_marketing` 컬럼 select 추가
- 페이지 — `<KwRow>` 타입에 purpose 추가
- 표 헤더 "분류" 컬럼 추가 (자사 own / 경쟁) — 색상 칩
- SaaS 키워드 → "SaaS" 작은 배지
- purpose 필터 토글 3개 (전체 / 자사 / 경쟁) + 카운트 표시
- 검색 input (키워드/테넌트/카테고리)

**Tier 2 (클라이언트 편집 chip editor) 는 Round 43 으로**:
- tenant edit 페이지에 own 키워드 chip editor 통합 — 분량 큼

### E/F/G/H 보류 사유

스파링 솔직 평가 — 한 push 에 너무 큰 변경 = 빌드 실패 시 진단 불가능:
- E 검증 히스토리 — 새 페이지 + 차트 (분량 중간)
- F 모바일 본격 카드 — 5 페이지 각 30분 (분량 큼)
- G learn-from-domain Phase 3 — 카테고리별 baseline (분량 중간)
- H UI/UX 전체 정리 — 무한 (모든 페이지 검토)

대신 globals.css 의 admin UI 헬퍼 (Round 40 추가) 가 이미 점진 적용 가능한 base. 페이지별 refactor 는 사용자가 검증 후 batch 별 진행 권장.

### 새 함정 (Round 42 추가)

**(AQ) `router.refresh()` — server component 데이터 무효화**
- 증상: client component 액션 (예: 자동 분류 POST) 후 server fetch 갱신 필요
- 정답: `useRouter().refresh()` 호출 → server component 재렌더 + 새 데이터 fetch
- vs `window.location.reload()` — full page reload (느림). refresh 가 SPA navigation 유지.

**(AR) PostgREST select 에 새 컬럼 추가 — 안전 패턴**
- 증상: keywords 테이블에 `purpose`, `is_saas_marketing` 신규 컬럼 — 기존 API select 가 안 가져옴
- 정답: select 에 추가 + 타입 guard `as unknown as { purpose?: string }` (column 누락된 row 대응)

### Round 42 산출물 (push 한 commit 으로 묶음 가능)

코드:
- `medimap-blog-v2/src/components/admin/AutoClassifyButton.tsx` — 신규
- `medimap-blog-v2/src/components/admin/DashboardCharts.tsx` — AutoClassifyButton 통합
- `medimap-blog-v2/src/app/admin/(portal)/competitors/page.tsx` — labelFilter state + 토글 UI + useEffect dep
- `medimap-blog-v2/src/app/api/admin/keywords/route.ts` — select 에 purpose/is_saas_marketing 추가
- `medimap-blog-v2/src/app/admin/(portal)/keywords/page.tsx` — purpose 컬럼 + 필터 + 검색

### Round 43 후보 (사용자 복귀 후)

**미진 batch**:
- E 검증 히스토리 — 자동 분류된 도메인의 시간별 인용 추이
- F 모바일 본격 카드 변환 (5 페이지)
- G learn-from-domain Phase 3 — 카테고리별 baseline 보강
- 키워드 풀 Tier 2 — 클라이언트 편집 페이지 chip editor

**UI/UX 17년차 전문가 관점 정리 후보 (사용자 명시 요청)**:

스파링 — 어드민 전체 페이지 정리 시 가장 임팩트 큰 것 우선:

1. **헤더 일관성** — 모든 페이지 `<h1>` + `<description>` + `<actions>` 패턴 통일
   - 현재 페이지마다 다른 spacing/typography
   - admin-page-header 헬퍼 일괄 적용

2. **빈 상태 메시지 강화** — 모든 페이지 데이터 없을 때 명확한 다음 액션 안내
   - "이 차트가 채워지려면 [도메인 분석] 또는 [측정 cron]"
   - admin-empty 헬퍼 활용

3. **Color semantic 일관성** — 한 페이지 안에서 success/warning/danger 일관 사용
   - 키워드 풀의 "활성/일시정지" — 색상 명확화
   - learned-insights 의 "적용중/미적용" — 색상 통일

4. **Loading skeleton** — 모든 차트/표 서버 fetch 동안 스켈레톤
   - admin-skeleton 헬퍼 활용

5. **Visual hierarchy** — KPI 카드 숫자 크기/색상 강조
   - 24h AI 인용 등 핵심 KPI 와 부가 정보 시각 분리

6. **Action affordance** — 클릭 가능한 행/카드에 hover 효과 일관성

7. **Toast notification** — 액션 결과 (저장/삭제/적용) 즉시 피드백
   - 현재 일부 페이지만 showToast 사용

8. **Mobile spacing** — `.admin-card` 의 `p-3 md:p-5` 패턴 모든 카드 적용

9. **Search/Filter 일관 위치** — 페이지 상단 우측 또는 카드 헤더 우측 통일

10. **Empty/Loading/Error 3가지 상태** 모든 데이터 표시 영역에 명시

11. **Breadcrumb** — 깊은 페이지 (모달 내 모달) navigation 강화

12. **Keyboard shortcuts** — `/` 검색 focus, Esc 모달 close

13. **Accessibility** — focus-visible, aria-label, WCAG AA 색 대비

14. **Dark mode** — 야간 cron 검수 시 (저녁/새벽) 도움

15. **Cmd+K palette** — 페이지 빠른 이동

이 15가지는 사용자 복귀 후 우선순위 결정 후 batch 별 진행 권장.

---

## Round 43 (2026-05-31 후반 자동 진행) — 모바일 카드 + Phase 3 + UI 헬퍼 확장

### 1. 모바일 본격 카드 — tenants 페이지 (Round 42 F 잔여)

**Dual layout 패턴**:
- 데스크탑 (md+): `<div className="card hidden md:block">` + 기존 `<table>`
- 모바일 (sm): `<div className="space-y-2 md:hidden">` + 카드 list

**모바일 카드 구조**:
- 헤더: 병원명 (truncate) + 상태 chip (status-trial/active/paused)
- 본문: 진료과목/지역/slug/발행/월비용 — grid-cols-2 로 정보 밀도 ↑
- 액션: 일시정지/편집/삭제 — min-h-[36px] tap target

**다른 페이지 모바일 변환** (Round 44 우선순위):
- /admin/content-queue (가장 자주)
- /admin/citations
- /admin/competitors
- /admin/learned-insights
- /admin/domain-classifications

### 3. learn-from-domain Phase 3 — 카테고리별 baseline

**문제**: 글로벌 baseline 1개로 모든 카테고리 진단 → 안과(시술 비교 강) vs 피부과(시술 종류 많음) 차이 무시.

**해결**:
- `content_baseline_{category}` 7개 row 추가 (안과/피부과/성형외과/치과/모발이식/내과/한방)
- 카테고리별 word_count / h2_count / image_count 차별화
- learn-from-domain route — tenant.domain_category 기반 우선 로드 + 글로벌 fallback

**카테고리별 baseline 예시**:
| 카테고리 | word_count | h2 | h3 | images | 특징 |
|---|---|---|---|---|---|
| 안과 | 900 | 6 | 8 | 5 | 시술 비교/회복기간 |
| 피부과 | 1100 | 7 | 10 | 6 | 시술 종류 많음, before-after |
| 성형외과 | 1200 | 7 | 10 | 7 | 장문 + 사례 풍부 |
| 모발이식 | 1300 | 8 | 12 | 8 | 절개/비절개 비교, before-after 풍부 |

### 4. UI/UX 헬퍼 추가 — globals.css

Round 40 의 admin-* 헬퍼 확장:
- `.admin-action` / `.admin-action-primary` / `.admin-action-danger` — 모바일 친화 tap target (min-h-[36px])
- `.chip-direct` / `.chip-indirect` / `.chip-reference` / `.chip-tolearn` / `.chip-ignore` — 라벨 색상 semantic 일관성
- `.status-dot` — inline status indicator
- `.admin-section-spacing` — `space-y-4 md:space-y-5` 페이지 섹션 간 일관 spacing

### Round 43 보류 (Round 44 로 미룸)

**E 검증 히스토리** — 자동 분류 도메인의 시간별 인용 추이:
- 별도 페이지 또는 expandable mini-chart 분량 중간
- 검수 패턴 안정화 후 진행이 더 효율적

**키워드 풀 Tier 2 — 클라이언트 편집 chip editor**:
- tenant edit modal 안에 own 키워드 chip editor 통합
- 분량 큼 (modal 구조 변경)
- Round 44 로

**모바일 카드 — 4 페이지 잔여**:
- content-queue / citations / competitors / learned-insights / domain-classifications
- 페이지당 30분 × 4 = 2시간
- Round 44 batch 진행

### 새 함정 (Round 43 추가)

**(AS) Dual layout `hidden md:block` + `md:hidden` 패턴**
- 증상: 데스크탑 표 → 모바일 카드 변환 시 같은 데이터 두 번 렌더 → 코드 중복
- 정답: 데이터 fetch 1회 + dual layout. 둘 다 같은 `tenants` array 순회. hidden 으로 visibility 만 분기 — 빌드/SEO 안전.

**(AT) 카테고리별 baseline 우선 로드 + fallback chain**
- 증상: 카테고리별 baseline 없을 때 (예: '한방' row 누락) → 차트 진단 동작 X
- 정답: `loadBaseline(sb, category)` 가 `content_baseline_{category}` → `content_baseline` → DEFAULT_BASELINE 순 fallback. 안전 chain.

### Round 43 산출물

DB:
- `content_settings` 에 7개 카테고리별 baseline row 추가

코드:
- `medimap-blog-v2/src/app/admin/(portal)/tenants/page.tsx` — dual layout (table + card)
- `medimap-blog-v2/src/app/api/admin/learn-from-domain/route.ts` — loadBaseline 시그니처 + fallback chain
- `medimap-blog-v2/src/app/globals.css` — UI/UX 헬퍼 추가 (admin-action / chip-* / status-dot / admin-section-spacing)

### Round 44 후보 (사용자 복귀 후)

- 모바일 카드 4 페이지 잔여
- 검증 히스토리 (E)
- 키워드 풀 Tier 2 (클라이언트 chip editor)
- 페이지별 admin-page-header 일관 적용
- UI/UX 정리 15개 중 우선순위 batch
- Anthropic credit 후 — 4 엔진 본격

---

## Round 44 (2026-05-31 야간) — 월간 보고서 17년차 영업/마케터 관점 재구성

### 진단 — 기존 보고서의 한계

**Before**: mock data (`adminTenants`, `costDaily`, `citationEvents`) 기반. 단순 통계 나열. "그래서 메디맵에 돈 쓴 ROI 가 뭐냐" 답 없음.

**17년차 영업/마케터 관점 — 클라이언트가 받는 자료의 본질**:
- 병·의원장 / 마케팅 담당자가 다음 달 갱신 의사결정에 쓰는 자료
- 영업 시 시연 자료 (다른 잠재 클라이언트에게)
- "지난 달 변화" + "다음 달 액션" 명확
- 데이터만이 아니라 **인사이트 + 권장 행동** 필수

### 새 보고서 8 섹션 구조

1. **표지/헤더** — 클라이언트명 + 진료과목/지역 + 보고 기간 + 메디맵 브랜딩
2. **Executive Summary** — 한 줄 평가 (변화 + 다음 액션 함의)
3. **핵심 KPI 3개** — 총 인용 수 / 메디맵 점유율 / 발행 콘텐츠 + 전월 대비 delta
4. **AI 검색 노출 추이 차트** — 일자별 막대 (총/T1) + line (메디맵 share %)
5. **키워드 성과 Top 5** — 인용/메디맵/경쟁사/win rate + **보강 필요 키워드** 별도 박스
6. **경쟁사 노출 현황 Top 5** — 외부 도메인 + 인용 키워드
7. **AI 가 인용한 메디맵 콘텐츠 URL** — SaaS 가치의 직접 증거 (있을 때만)
8. **다음 달 액션 플랜 4개** — 보강 콘텐츠 / 키워드 확장 / 경쟁사 학습 / 영업 인사이트

### 데이터 처리

server component (`/admin/reports/[tenantId]/page.tsx`) — 실데이터 fetch:
- 이번 달 + 지난 달 queries/responses 분리 fetch → 비교 가능
- tenant.homepage + additional_domains → clientDomains set → T2 정확 매칭
- domain_classifications 로 T1~T5 5-tier 자동 분류
- 키워드별 win_rate (T1/total) 계산
- 경쟁사 도메인 ranking (T5 기준)
- 메디맵 인용 URL 추출 (T1 의 final_url)

### 시각 디자인 — 17년차 톤

- **표지** 그라데이션 (brand-50 → surface-base) — 첫인상 강조
- **KPI 카드** — 큰 숫자 (text-2xl bold) + 단위 + delta 화살표 (success/danger) + 전월값 부제
- **메디맵 인용 URL section** — brand-50 배경으로 강조 (가치 증명)
- **보강 키워드** — warning 색 박스 (경고 vs 일반)
- **다음 달 액션** — 번호 매김 + 실행 가능한 자연어
- **footer** — 메디맵 SaaS 브랜딩 + 4 엔진 출처 명시

### Print/PDF 친화

- `print:hidden` 인쇄 시 안내 영역 숨김
- `print:max-w-none` 인쇄 시 폭 제한 해제
- `print:bg-white` 배경 흰색 (잉크 절약)
- `PrintButton` 컴포넌트 — window.print() 호출 → 브라우저 PDF 저장 가능

### 보조 컴포넌트 — `_components/` 디렉토리

server page 와 분리:
- `PrintButton.tsx` — 'use client' (window.print)
- `ReportTrendChart.tsx` — 'use client' (recharts ComposedChart)

server / client 경계 명확 — Vercel 빌드 안전.

### 새 함정 (Round 44 추가)

**(AU) server component 보고서 페이지 + client 컴포넌트 분리**
- 증상: server page 에서 client component (recharts) 직접 import → "Client Component cannot be imported in Server Component" 컴파일 에러 (사실 가능하지만 cache/serialization 이슈)
- 정답: `_components/` 디렉토리 (Next.js 컨벤션 — router 에서 무시) 에 'use client' 컴포넌트 분리. data 는 props 로 전달.

**(AV) 영업 자료 보고서 — "데이터만" 이 아니라 "다음 액션" 명시**
- 17년차 기획자 원칙: 의사결정자 (병원장) 가 받는 자료는 "그래서 뭐 해야 하나" 자동 답. 그래프 + 숫자만 있으면 "그래서?" 질문 나옴.
- 정답: 마지막 섹션 "다음 달 액션 플랜" 4개 — 데이터 기반 자동 생성. 운영자가 1클릭으로 실행 가능 (Phase 2).

**(AW) Delta 시각화 — % vs %p 명확 구분**
- 인용 수 전월 대비: % (relative)
- share 전월 대비: %p (absolute percentage point)
- 혼동 시 클라이언트 오해. `isPercentDelta` prop 으로 구분.

### Round 44 보고서 산출물

코드:
- `medimap-blog-v2/src/app/admin/(portal)/reports/[tenantId]/page.tsx` — server component 전면 재작성 (mock → 실데이터)
- `medimap-blog-v2/src/app/admin/(portal)/reports/[tenantId]/_components/PrintButton.tsx` — 신규
- `medimap-blog-v2/src/app/admin/(portal)/reports/[tenantId]/_components/ReportTrendChart.tsx` — 신규 (recharts ComposedChart)

### Round 44 보류 (Round 45 후보)

사용자 명시 4개 중 월간 보고서 외:
- 키워드 풀 Tier 2 chip editor — tenant edit modal 구조 변경 큼
- 모바일 카드 4 페이지 — content-queue 우선
- 검증 히스토리 — 자동 분류 도메인 시간별 추이
- UI/UX 정리 — admin-page-header 일관 적용 + 빈/loading/error 상태

이번 batch 는 월간 보고서 (가장 임팩트 + 시각 변화 큼) 완료. 나머지는 사용자 검증 + 결정 후 Round 45 진행.

---

## Round 45 (2026-05-31 야간 2) — 키워드 풀 Tier 2: tenant edit modal chip editor

### 진단

**Round 42 D 에서 Tier 1 완료** (키워드 풀 페이지에 purpose 컬럼 + 필터 + 검색).

**Tier 2 필요성** — own 키워드 추가는 키워드 풀 페이지에서만 가능 → 클라이언트 편집 흐름과 단절.
- 운영자 흐름: 클라이언트 등록 → business_model 입력 → trigger 가 competitor 키워드 자동 생성 → own 키워드는 별도 페이지로 이동해서 추가 (UX 단절)

**해결**: tenant edit modal 안에 own 키워드 chip editor 통합 — 클라이언트 편집 흐름 내에서 직관 관리.

### 새 컴포넌트 — `TenantOwnKeywordsEditor`

**위치**: `medimap-blog-v2/src/components/admin/TenantOwnKeywordsEditor.tsx`

**기능**:
- tenant.id 받음 → /api/admin/keywords fetch → own purpose 키워드만 filter
- chip 으로 표시:
  - 활성 chip: brand-50 배경 + brand text
  - 비활성 chip: surface-base 배경 + ink-muted text (gray-out)
  - chip 클릭 → 활성 toggle
  - chip ✕ → 삭제
- 입력 input + Enter / [추가] 버튼 → POST 키워드
- defaultCategory prop (tenant.domain_category) — 새 키워드의 category 자동 지정
- 모든 변경 즉시 DB 반영 (저장 버튼 별도 X — 직관 UX)
- 신규 tenant (id 없음) 시 안내 메시지 ("저장 후 추가 가능")

### tenants/page.tsx 통합

edit modal 안 비즈니스 모델 입력란 + HomepageAnalyzeButton 직후에 chip editor 배치. 운영자가 한 화면에서:
1. 비즈니스 모델 입력 → competitor 키워드 자동 생성 (trigger)
2. own 키워드 chip 으로 추가 (예: "잠실 라식", "노안교정")
3. 저장 → 다음 cron 부터 측정 시작

### 17년차 UX 관점

**Before**: 운영자 흐름 단절 → "이 키워드 어디서 추가?" 질문
**After**: 모든 키워드 관리 한 화면 (tenant edit modal) — single source of truth

**디자인 디테일**:
- chip 클릭 = 토글, ✕ 클릭 = 삭제 (다른 affordance)
- ✕ 버튼은 hover 시만 강조 (실수 클릭 방지)
- 빈 상태 메시지 — "키워드 없음 — 아래 입력으로 추가"
- 추가 시 spinner → 즉시 list 갱신 (낙관적 UI 대신 안전한 reload)

### 새 함정 (Round 45 추가)

**(AX) modal 안 nested component — re-fetch 타이밍**
- 증상: edit modal 열림 → 부모 컴포넌트가 keywords API 호출 안 함 → chip editor 가 자체 fetch 필요
- 정답: editor 가 useEffect([tenantId]) 로 자체 load. tenantId 없으면 빈 상태 + 안내 메시지.

**(AY) chip ✕ 클릭 vs chip 본체 클릭 분리**
- 증상: chip 전체가 button 이면 ✕ 클릭 시에도 활성 토글 호출
- 정답: chip 내부 본체 (text) 와 ✕ 를 별도 button 으로 분리. 둘 다 type="button" + 각자 onClick.

### Round 45 산출물

코드:
- `medimap-blog-v2/src/components/admin/TenantOwnKeywordsEditor.tsx` — 신규 (chip + 추가 input)
- `medimap-blog-v2/src/app/admin/(portal)/tenants/page.tsx` — import + edit modal 통합

### Round 46 후보 (사용자 명시 — 다음 batch)

- 모바일 카드 4 페이지 — content-queue / citations / competitors / learned-insights / domain-classifications
- 검증 히스토리 — 자동 분류 도메인 시간별 추이
- UI/UX 정리 — admin-page-header 일관 적용 + 빈/loading/error 상태 페이지별 강화
- Anthropic credit 충전 후 — 4 엔진 본격

---

## Round 46 (2026-05-31 야간 3) — Round 44 빌드 fix + 검증 히스토리 API

### 빌드 에러 진단

**증상**: Vercel build 실패 (Round 44 commit `362ba8a`)
```
./src/app/admin/(portal)/reports/[tenantId]/page.tsx:244:33
Type error: 'data.t1ShareThis' is possibly 'undefined'.
  const t1SharePct = Math.round(data.t1ShareThis * 100);
```

**원인**: `fetchReportData` 가 두 가지 shape 반환:
- 데이터 없을 때: `{ tenant, hasData: false, ownKeywords, competitorKeywords }` — t1ShareThis 등 없음
- 데이터 있을 때: full object with t1ShareThis 등

TypeScript narrowing 이 `data.hasData` 체크 후에도 안 됨 — return type 명시 안 했고 union 자동 추론 실패.

### 해결 — 항상 동일 shape 반환

```typescript
if (allKwIds.length === 0) {
  return {
    tenant, hasData: false, ownKeywords, competitorKeywords,
    tierThis: { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 },
    tierPrev: { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 },
    totalThis: 0, totalPrev: 0,
    t1ShareThis: 0, t1SharePrev: 0, t1ShareDelta: 0,
    dailyTrend: [] as DailyPoint[],
    topKeywords: [], weakKeywords: [], competitorTop: [],
    publishedCount: 0, medimapCitedUrls: [],
  };
}
```

데이터 없음 = 모든 수치 0. hasData boolean 으로 UI 분기만 결정. TypeScript narrowing 깨끗.

### 검증 히스토리 API — `/api/admin/domain-history`

**가치**: 자동 분류된 도메인 (Round 40 rule engine) 의 시간별 인용 추이 검증.

**구조**:
- GET ?domain=sueye.co.kr&days=30
- 응답: { domain, days: [{date, count}], total, classification }
- responses 30일치 fetch → source_domains 안에 그 도메인 포함된 row count
- 일자별 fill (없는 날 0)
- classification (domain_classifications row) 같이 반환

**활용** (Round 47 후보):
- domain-classifications 페이지의 도메인 행 expand → 미니 차트 표시
- 자동 분류된 도메인 "이 분류가 맞는지" 검증 (인용 빈도 추적)

### 새 함정 (Round 46 추가)

**(AZ) Server function return type 명시 vs 자동 추론**
- 증상: 함수가 if/else 분기에서 다른 shape 반환 → TS 가 union 으로 추론 → 호출처에서 narrowing 실패
- 정답 1: 항상 동일 shape 반환 (default 값 0 / []) — 가장 simple
- 정답 2: `async function fetchData(...): Promise<ReportData> { ... }` return type 명시 + discriminated union 정의

이번엔 정답 1 채택 — 코드 양 적고 호출처 narrowing 불필요.

### Round 46 산출물

코드:
- `medimap-blog-v2/src/app/admin/(portal)/reports/[tenantId]/page.tsx` — hasData=false 분기에 모든 필드 default 채움
- `medimap-blog-v2/src/app/api/admin/domain-history/route.ts` — 신규 (도메인 인용 추이)

### Round 47 후보 (다음 batch)

- **모바일 본격 카드** — content-queue / citations / competitors / learned-insights / domain-classifications 5 페이지
  - 페이지당 30분 × 5 = 2.5시간 분량
  - Round 43 tenants 페이지 패턴 (hidden md:block + md:hidden) 그대로 적용
- **검증 히스토리 UI 통합** — domain-classifications 행 expand → ReportTrendChart 패턴 활용 미니 차트
- **UI/UX 정리** — admin-page-header / 빈/loading/error 상태 페이지별 강화
- **Anthropic credit 충전** — 4 엔진 본격 활성화

---

## Round 47 (2026-05-31 야간 4) — 월간 보고서 발행 콘텐츠 + AI 인용 효과 + 전 클라이언트 자동 동일

### 사용자 피드백 반영

**의도**: "클라이언트 입장에서 어떤 글을 발행했고, 어떤 효과가 있는지 궁금"
**문제**: 기존 보고서 (Round 44) — `publishedCount` 숫자만, 글 list / 각 글 효과 없음
**해결**: 발행 글 list + AI 인용 매칭 + ROI 인사이트 멘트

### 발행 콘텐츠 섹션 추가

**fetchReportData 확장**:
- `generated_contents` select 에 `slug, cover_image_url, channel, published_at` 추가
- `published_at` 기준 desc 정렬
- 각 글의 slug 가 medimapCitedUrls 에 포함되는지 매칭 (`citedSlugs` Set)
- URL pattern: `/blog/{slug}` 또는 `/with-partners/{cat}/{slug}` 추출

**publishedWithEffect 데이터 구조**:
```typescript
{
  id, title, slug, cover_image_url, channel, published_at,
  ai_cited: boolean  // ← slug 가 AI grounding 출처로 사용됐는지
}
```

**UI 섹션 7 (재배치)**:
- 헤더 우측 chip: "AI 인용 활용: N편 / M편 (%) "
- 글마다 카드 — cover_image / title / channel / 발행일 / blog URL
- ai_cited=true → 카드 brand-50 배경 + "✓ AI 인용" 배지
- 8편 이상 — "외 N편" 표시
- ROI 인사이트 박스 — citedCount 기반 자연어:
  - "발행 N편 중 M편이 AI 검색 답변의 출처로 사용됨. 메디맵 SaaS 의 직접 효과 = 잠재 환자가 AI 에 질문할 때 클라이언트 콘텐츠가 출처로 노출"
  - 0편 시 — "1~3개월 누적 효과 — 다음 보고서에서 본격 확인 예상"

### 모든 클라이언트 자동 동일 적용 확인

**`/admin/reports/[tenantId]` 동적 라우트** — 이미 모든 tenant 자동 작동:
- `/admin/reports/4` (BGN 잠실) ✅
- `/admin/reports/6` (지우피부과) ✅
- `/admin/reports/7` (모우림) ✅
- `/admin/reports/12` (메디맵 자사) ✅
- 새 클라이언트 등록 시 자동 활성

**`/admin/reports` 목록 페이지** — 이미 모든 tenants 카드 표시 + 각각 [PDF 미리보기] 링크. 새 클라이언트 추가 시 자동 list 갱신.

### 17년차 영업 관점 추가 가치

**Before**: 발행 N편 (숫자만)
**After**:
1. **시각화** — cover_image + title 카드 → 영업 시연 자료 가치 ↑
2. **AI 인용 marker** — "이 글이 AI 검색에 노출됐다" 직접 증거
3. **ROI 인사이트** — 자연어 멘트 자동 생성. 의사결정자 (병원장) 가 한 줄로 이해
4. **외부 링크** — 글 URL 클릭 → 실제 콘텐츠 확인 (영업 자료 신뢰도)

### 새 함정 (Round 47 추가)

**(BA) slug 매칭 — URL pattern 다양성 대응**
- 증상: medimapCitedUrls 의 URL 형식 다양 (`/blog/x`, `/with-partners/cat/slug/x`, query string 포함 등)
- 정답: regex `/(?:blog|with-partners\/[^/]+\/[^/]+)\/([^/?#]+)/` 로 마지막 slug segment 추출. query/hash 제거.

**(BB) cover_image_url 표시 — Next.js Image vs `<img>`**
- 증상: 외부 이미지 (pollinations, unsplash, supabase storage) 도메인 별로 next.config.ts 의 remotePatterns 등록 부담
- 정답: 보고서는 PDF 친화 (`window.print()`) 라 `<img>` 직접 사용. ESLint 경고만 `eslint-disable-next-line @next/next/no-img-element`. Image 컴포넌트의 lazy load 보다 즉시 표시가 보고서에 더 적합.

### Round 47 산출물

코드:
- `medimap-blog-v2/src/app/admin/(portal)/reports/[tenantId]/page.tsx`:
  - `generated_contents` select 확장
  - `publishedWithEffect` + `citedContentCount` 매핑
  - 발행 콘텐츠 섹션 7 추가 (cover/title/slug/published_at + AI 인용 마커 + ROI 인사이트)

### Round 47 검증

1. **`/admin/reports/4`** (BGN) — 새 발행 콘텐츠 섹션 표시
   - publishedCount = 0 또는 N — 실제 generated_contents 의 status='published' 카운트
   - AI 인용률 표시 (있다면)
2. **`/admin/reports/6`** (지우피부과) — 자동 동일 view
3. **`/admin/reports/7`** (모우림) — 자동 동일 view
4. **`/admin/reports`** (목록) — 모든 tenants 카드 + 각각 진입

### Round 48 후보 (다음 라운드)

- **이메일 자동 발송 cron** — 매월 1일 자동 발송 (Resend env 설정 시)
- **PDF 직접 생성** — `window.print()` 보다 server-side PDF (puppeteer/playwright) — 더 일관된 형식
- **클라이언트별 logo upload** — 보고서 표지에 클라이언트 logo 추가 (브랜드 친화)
- **모바일 카드 변환** (Round 43 후보 5 페이지 잔여)
- **검증 히스토리 UI 통합** (Round 46 의 domain-history API)
- **UI/UX 정리**
- **Anthropic credit 충전 후** — 4 엔진 본격

---

## Round 48 (2026-05-31 야간 5) — 이메일 자동 발송 cron + content-queue 모바일 wrap

### 1. 이메일 자동 발송 cron (매월 1일 18:00 KST)

**기존 endpoint 한계**:
- 단일 tenant 만 처리
- to: `ADMIN_EMAIL` 만 (클라이언트가 직접 받지 못함)
- cron 미연동

**Round 48 보강** — `/api/admin/reports/email`:
- `all=true` 모드 추가 — 모든 tenants (email NOT NULL) 일괄 발송
- `cronSecret` 인증 (CRON_SECRET 환경변수 매칭)
- `to: tenant.email` 우선 (Round 48), ADMIN_EMAIL fallback
- **새 HTML 템플릿** — 17년차 영업 관점:
  - 메디맵 브랜드 헤더 (#1B68FF 라인)
  - 클라이언트 이름 인사
  - "이번 달 4대 AI 엔진 grounding 데이터..." 자연어 안내
  - 보고서 포함 내용 5개 list (인용 횟수, 키워드 성과, 경쟁사, 발행 콘텐츠 + AI 인용, 다음 달 액션)
  - CTA 버튼 "보고서 보기 →" (brand 색)
  - 푸터 — 발송 안내

**GitHub Actions workflow** — `.github/workflows/send-monthly-reports.yml`:
- Cron: `0 9 1 * *` (매월 1일 09:00 UTC = 18:00 KST)
- curl POST → `{all: true, cronSecret}`
- 응답 jq 파싱 — sent / failed / total 출력
- Job summary 에 결과 누적

**필수 GitHub Secrets**:
- `VERCEL_PROD_URL` — `https://geo-v2-beta.vercel.app`
- `CRON_SECRET` — Vercel 환경변수 + 동일

**필수 Vercel 환경변수**:
- `RESEND_API_KEY`
- `RESEND_FROM` — 예: `MEDIMAP GEO <reports@medimap.team>`
- `CRON_SECRET` — GitHub Secrets 와 동일

### 2. content-queue 모바일 가로 스크롤 wrap

가장 자주 보는 페이지의 모바일 대응 — Round 43 tenants 패턴이 아닌 가벼운 overflow wrap:
- `<table>` 을 `<div className="overflow-x-auto">` 로 감쌈
- `min-w-[720px]` — 표 폭 고정 → 가로 스크롤 안전
- 본격 카드 변환은 다음 라운드 (Round 43 tenants 패턴)

### 새 함정 (Round 48 추가)

**(BC) 단일 endpoint 의 dual 모드 — query param vs body flag**
- 패턴: `POST /api/admin/reports/email` 가 두 가지 동작:
  - `body.tenantId` — 단일 tenant (admin UI 의 [이메일 발송] 버튼)
  - `body.all=true` + `cronSecret` — 일괄 발송 (cron)
- 정답: body 의 boolean flag 로 분기 + cronSecret 인증으로 보안. URL 분리보다 단일 endpoint 가 코드 응집 ↑.

**(BD) Resend HTML 템플릿 — inline style 만**
- 증상: 이메일 클라이언트 (Gmail, Outlook) 가 `<style>` block 무시. CSS class 무시.
- 정답: 모든 스타일 inline (`style="..."`). 폰트 family, color, padding, border-radius 등.

**(BE) GitHub Actions cron + Vercel admin endpoint — 인증 패턴**
- 증상: admin endpoint 가 middleware 가드 (ADMIN_PASSWORD cookie) → curl 호출 시 401
- 정답: endpoint 자체에 `body.cronSecret === process.env.CRON_SECRET` 체크 + middleware 우회 (cookie 없어도 통과). 다만 SecREt 안 유출되게 GitHub Secrets + Vercel 양쪽 동일하게 설정.

### Round 48 산출물

코드:
- `medimap-blog-v2/src/app/api/admin/reports/email/route.ts` — all 모드 + sendOne 헬퍼 + HTML 템플릿
- `.github/workflows/send-monthly-reports.yml` — 신규 cron workflow
- `medimap-blog-v2/src/app/admin/(portal)/content-queue/page.tsx` — overflow wrap

### Round 49 후보

- **모바일 본격 카드 변환** — citations / competitors / learned-insights / domain-classifications (Round 43 tenants 패턴)
- **검증 히스토리 UI** — domain-classifications expand 행 + mini chart (Round 46 API 활용)
- **이메일 cron 검증** — Vercel/GitHub 환경변수 등록 후 manual run
- **Anthropic credit 충전 후** — 4 엔진 본격

---

## Round 49 (2026-05-31 야간 6) — 검증 히스토리 UI 통합 + 모바일 wrap 강화

### 1. 검증 히스토리 UI — `DomainHistoryButton`

**가치**: Round 40 의 rule-based 자동 분류 + Round 46 의 domain-history API 가 UI 통합 안 됨. 운영자가 자동 분류된 도메인의 효용을 시각 검증할 길 없음.

**구현**:
- 신규 client component `DomainHistoryButton` — 도메인 1개 받아 modal 표시
- 클릭 시 `/api/admin/domain-history?domain=X&days=30` fetch (lazy)
- modal 구성:
  - 헤더: 도메인 + tier 배지 + 카테고리 + 분류일 + 비활성 경고 (검토 대기)
  - KPI 2개: 30일 총 인용 / 일평균
  - Area chart (recharts) — 일자별 인용 수
  - 빈 데이터 시 "측정 데이터 없음" 안내
  - 푸터 — "자동 분류 효용 검증 — 인용 빈도가 낮으면 분류 재검토 필요"

**통합 위치** (domain-classifications page):
- 글로벌 분류 목록 행 — 액션 컬럼에 추이 버튼 + 편집/삭제 버튼 옆
- 컨텍스트 모드 외부 도메인 행 — 액션 컬럼에 추이 버튼 + 학습 분석 링크

### 2. citations 모바일 min-w 강화

기존 `overflow-x-auto` + 표 폭 자동 → 작은 모바일에서 표 칸이 너무 좁아짐. `min-w-[560px]` 추가로 가독성 유지 + 가로 스크롤 안전.

### 본격 카드 변환 보류 사유

competitors / learned-insights / domain-classifications 의 본격 카드 변환 (Round 43 tenants 패턴) 은 다음 라운드:
- 페이지당 30~45분 × 3 = 1.5~2시간 — 단일 commit 분량 큼
- 사용자 검증 후 점진 진행이 안전
- 이미 overflow-x-auto 적용된 페이지 — 모바일에서 가로 스크롤로 기본 사용성 보장

### 이메일 cron 검증 — 사용자 액션

내가 진행 못 함 (환경변수 등록 필요):

**GitHub Secrets** (Repo Settings → Secrets and variables → Actions):
- `VERCEL_PROD_URL` = `https://geo-v2-beta.vercel.app`
- `CRON_SECRET` = 랜덤 문자열

**Vercel 환경변수** (Project Settings → Environment Variables):
- `RESEND_API_KEY` — https://resend.com 가입 후 API key 발급
- `RESEND_FROM` — 예: `MEDIMAP GEO <reports@medimap.team>` (도메인 verified)
- `CRON_SECRET` — GitHub 과 동일

설정 후 GitHub Actions 에서 "Send monthly reports (1st of month 09:00 UTC = 18:00 KST)" → **Run workflow** → 즉시 manual 테스트.

### Round 49 산출물

코드:
- `medimap-blog-v2/src/components/admin/DomainHistoryButton.tsx` — 신규 (modal + area chart)
- `medimap-blog-v2/src/app/admin/(portal)/domain-classifications/page.tsx` — 글로벌 + 컨텍스트 행에 추이 버튼 통합
- `medimap-blog-v2/src/app/admin/(portal)/citations/page.tsx` — 표 min-w 추가

### Round 50 후보

- **competitors / learned-insights / domain-classifications 본격 카드 변환** (Round 43 tenants 패턴)
- **이메일 cron manual run 검증** (사용자 환경변수 등록 후)
- **Anthropic credit 충전** + 4 엔진 본격
- **UI/UX 정리** — admin-page-header 페이지별 일관 적용

---

## Round 50 (2026-05-31) — 이메일 cron middleware 차단 fix

### 증상

GitHub Actions "Send monthly reports" workflow manual run → 401:
```json
{"ok": false, "error": "unauthorized — admin login required"}
```

### 진단

`/api/admin/*` 경로의 middleware (`src/middleware.ts`) 가 ADMIN_PASSWORD cookie 검증.
- Round 48 의 `/api/admin/reports/email` endpoint 자체는 `body.cronSecret` 체크
- 그러나 **middleware 가 endpoint 도달 전에 401 차단**
- curl 호출은 cookie 없으니 무조건 401

### Fix — middleware 에 cron secret 우회

```typescript
// Round 50 — Cron secret 우회
const cronSecret = process.env.CRON_SECRET;
if (cronSecret && isApi) {
  const headerSecret = req.headers.get('x-cron-secret');
  const querySecret = req.nextUrl.searchParams.get('cronSecret');
  if (headerSecret === cronSecret || querySecret === cronSecret) {
    return NextResponse.next();  // 통과
  }
}
```

**보안**:
- CRON_SECRET 환경변수 설정된 경우만 우회 가능
- 미설정 시 헤더/쿼리 secret 무시 → 일반 admin 가드 동작
- 헤더 우회 + endpoint 의 body.cronSecret 이중 가드 — 보안 강화

### workflow 도 헤더 방식 변경

`.github/workflows/send-monthly-reports.yml` 의 curl 호출:
```bash
curl -X POST \
  -H "X-Cron-Secret: $CRON_SECRET" \    # ← 추가
  -H "Content-Type: application/json" \
  -d "{\"all\": true, \"cronSecret\": \"$CRON_SECRET\", ...}" \
  "$VERCEL_URL/api/admin/reports/email"
```

헤더 + body 둘 다 cronSecret 전송 — middleware 우회 + endpoint 가드 둘 다 통과.

### 새 함정 (Round 50)

**(BF) Next.js middleware 가 admin endpoint 도달 전 차단**
- 증상: endpoint 자체에 cron secret 가드 있어도 middleware 가 먼저 cookie 검증 → 401
- 정답: middleware 에서도 secret 우회 로직 추가. header 우선, query 보조 (query 는 로그/Referer 노출 가능 — header 권장)

**(BG) 환경변수 CRON_SECRET — GitHub Secrets + Vercel 양쪽 동일 필수**
- 증상: GitHub 의 secret 과 Vercel 의 환경변수 불일치 → middleware 우회 실패 + endpoint 401
- 정답: 같은 랜덤 문자열 두 곳에 똑같이 등록. 둘 다 Production environment 에서 적용 확인.

### Round 50 산출물

- `medimap-blog-v2/src/middleware.ts` — cron secret 우회 로직
- `.github/workflows/send-monthly-reports.yml` — X-Cron-Secret 헤더 추가

---

## Round 51 (2026-05-31) — 모바일 표 min-w + admin-page-header 일관 적용

### 배경

Round 50 까지 어드민 13개 페이지의 헤더 마크업이 페이지마다 제각각 (`text-2xl font-bold` / `flex items-center justify-between` / 설명 없거나 줄 위치 차이 등). 첫 진입한 사용자가 "이 페이지가 뭐 하는 곳인지" 알기 어려움. 또한 모바일에서 일부 표가 너무 좁아 컬럼이 겹침.

### Fix A — globals.css 헬퍼 일관 적용 (13 페이지)

`.admin-page-header` / `.admin-page-title` / `.admin-page-desc` — Round 40 에 정의만 되어 있고 적용 안 된 상태. 13개 페이지에 통일:

- `/admin` (대시보드), `/admin/tenants`, `/admin/keywords`
- `/admin/content-queue`, `/admin/content-settings`, `/admin/calendar`
- `/admin/citations`, `/admin/competitors`, `/admin/learned-insights`, `/admin/domain-classifications`, `/admin/saas-tracking`
- `/admin/reports`, `/admin/users`, `/admin/audit`, `/admin/cost`, `/admin/funnel`, `/admin/integrations`, `/admin/ab-tests`

각 헤더에 한 줄 설명(`admin-page-desc`) 추가 — 진입 시 페이지 목적 즉시 인지. 모바일 `text-xl` / 데스크탑 `md:text-2xl` 자동 전환.

### Fix B — 표에 min-w 추가 (모바일 가로 스크롤 안전)

competitors / domain-classifications / saas-tracking 의 표가 모바일에서 컬럼 겹침 위험.
- competitors: `min-w-[560px]` (2개 표 모두)
- domain-classifications: `min-w-[640px]`
- saas-tracking: `min-w-[640px]`

이미 `overflow-x-auto` wrapper 있으니 안전한 가로 스크롤로 폴백.

### 새 함정 (Round 51)

**(BH) PowerShell 의 `(portal)` 괄호가 cmdlet 으로 해석**
- 증상: `git add medimap-blog-v2/src/app/admin/(portal)/` → `'portal' 용어가 cmdlet 으로 인식되지 않습니다` 에러
- 정답: 따옴표로 감싸기 (`git add "..."` ) 또는 `git add -A` 사용. PowerShell 에서 path 에 괄호 있으면 항상 quoting 필요.

### Round 51 산출물

- 13개 admin 페이지 헤더 일관화 (commit `30ae999`)
- 3개 페이지 표 min-w 추가

---

## Round 52 (2026-05-31) — competitors/domain-classifications UIUX 고도화

### 배경

사용자 피드백: "데이터가 많으니 한눈에 보기 복잡, 데이터 분석 흐름이나 사용 흐름 개선해줘". UIUX 관점에서 두 페이지 분석.

### competitors 페이지 문제 진단

1. **정보 위계 부재** — KPI → 차트 → 매트릭스 → 도메인 상세를 같은 데이터의 다른 각도로 4번 반복. 사용자가 "어디부터 봐야 하지?" 헷갈림.
2. **액션 부재** — 데이터만 있고 "그래서 이번 주 뭘 해야 하지?" 가 안 보임.
3. **위협 인지 어려움** — 도메인 30개 나열 중 "위험" 인지 한눈에 안 들어옴.

### Fix A — 인사이트 박스 (상단 3분할)

KPI 위에 "위협 → 학습 → 액션" 3단 박스 추가. 같은 데이터 (`competitor_top`, `tier_distribution`) 를 다른 각도로 재구성:

1. **🚨 위협 도메인 Top 3** (border-l-status-danger) — T5 (직접 경쟁) 우선, 없으면 전체 top. "AI 가 우리보다 자주 추천하는 경쟁사".
2. **📚 학습 후보 Top 3** (border-l-status-warning) — T3 (권위 사이트). "콘텐츠 톤 학습 대상 → Learn 버튼으로 학습".
3. **✅ 이번 주 액션** (border-l-brand) — `tier_distribution` 기반 조건부 액션 멘트. T5>5건이면 "DIRECT 라벨링", 매트릭스 있으면 "1위 사수 / 2위 보강" 등.

### Fix B — 모바일 카드 변환 (competitor_top 상세)

기존 `<table>` 을 `hidden md:block` 으로 감싸고 `md:hidden` 모바일 카드 list 추가. 각 카드:
- 도메인 (font-mono truncate) + tier 배지 + 키워드 카운트
- 우측: 인용 횟수 (큰 글씨)
- T5 인 경우 `border-status-danger/30` 강조
- 클릭 시 expand — 키워드 chip + URL list (5개까지, 6개 이상은 "데스크탑에서 전체 보기") + LearnFromDomainButton

### domain-classifications 페이지 문제 진단

1. **분류 목적 모호** — T1~T5 가 뭔지 한 줄 설명 없음 → 첫 사용자 막막.
2. **자동/수동 분류 구분 불가** — DB schema 에 `classified_by` 같은 컬럼 없음 (별도 라운드에서 추가 필요).
3. **bulk action 부재** — NOISE/T4 일괄 처리 어려움 (별도 라운드).

### Fix C — 5-tier 설명 박스

분류 사전 헤더 아래에 `bg-brand-50/30` 박스 추가. "왜 분류하는가?" + 5-tier 한 줄 정의:
- T1 우리 자산 / T3 종합병원·학회 (콘텐츠 톤 학습) / T4 의료 플랫폼 (점유율 경쟁) / T5 경쟁 안과·병원 (직접 위협) / NOISE 무관

### 다음 라운드 후보 (Round 53+)

- **domain_classifications.classified_by 컬럼** ('auto' | 'manual') + auto/manual 배지
- **bulk action** — 선택 도메인 일괄 tier 변경 / 비활성화
- **inline 편집 UX 개선** — 편집 모드 시 행 강조 + ESC 취소
- **citations 페이지에도 인사이트 박스** — 동일 패턴으로 자사 KPI 위에 적용

### Round 52 산출물

- `medimap-blog-v2/src/app/admin/(portal)/competitors/page.tsx` — 인사이트 3단 박스 + 모바일 카드 list
- `medimap-blog-v2/src/app/admin/(portal)/domain-classifications/page.tsx` — 5-tier 설명 박스

---

## Round 52 fix (2026-05-31) — 산업 종속 라벨 일반화

### 증상

사용자 보고: 밴스모자이너의원(모발이식 클라이언트)의 competitors 페이지 KPI 4번째 카드가 "경쟁 안과/병원 ⚠️" 로 표시. 모우림(모발이식), TETE 등 안과 외 클라이언트 모두 동일 버그.

### 진단

`TIER_LABELS.T5.label = '경쟁 안과/병원'` 으로 하드코딩. 메디맵이 처음 안과 마케팅으로 시작했을 때 라벨이 그대로 남아있음. T3 desc "MSD/아산/삼성 등" 도 안과 한정 예시.

### Fix — 일반화 + 동적

1. **TIER_LABELS.T5.label** = `'동종업계 경쟁사'` (산업 무관 default)
2. **`extractCategoryLabel(businessModel)`** 함수 — `business_model` 문자열 키워드 매칭 → 동적 라벨:
   - 모발이식/FUE/FUT → "경쟁 모발이식 병원"
   - 안과/라식/라섹/백내장 → "경쟁 안과"
   - 피부/레이저 → "경쟁 피부과"
   - 성형 → "경쟁 성형외과"
   - 치과/임플란트 → "경쟁 치과"
   - 한방/한의원 → "경쟁 한의원"
   - 정형/척추 → "경쟁 정형외과"
   - 산부인과/여성 → "경쟁 산부인과"
   - 기본값 → "동종업계 경쟁사"
3. **KPI 4번째 카드 라벨** — `extractCategoryLabel(businessModel)` 사용
4. **T3 desc** "MSD/아산/삼성 등" → "종합병원·학회·의료매체" (산업 무관)
5. **T4 desc** "모두닥/강남언니 등" → "모두닥·강남언니·하이닥 등" (의료 플랫폼은 산업 무관이라 사례만 보강)
6. **인사이트 박스 액션 멘트** "T5 (경쟁 안과)" → 동적 라벨
7. **CitationsTabs.tsx** "경쟁 안과 분석" → "동종업계 경쟁사 분석"
8. **domain-classifications 설명 박스** "T5 경쟁 안과·병원" → "T5 동종업계 경쟁사"

### 새 함정 (Round 52 fix)

**(BI) 초기 비즈니스(안과) 라벨이 멀티 클라이언트 SaaS 로 확장 시 그대로 남는 함정**
- 증상: 첫 클라이언트 산업의 용어가 코드 상수에 박혀 다른 산업 클라이언트에도 그대로 노출
- 정답: 모든 산업 종속 단어는 (a) 클라이언트 단위 동적 라벨 함수 + (b) default 는 일반화된 단어로. 신규 SaaS 의 첫 클라이언트 라벨링 시 점검 필수.

### 코드

- `medimap-blog-v2/src/app/admin/(portal)/competitors/page.tsx` — TIER_LABELS + extractCategoryLabel + KPI/액션 동적
- `medimap-blog-v2/src/components/admin/CitationsTabs.tsx` — desc 일반화
- `medimap-blog-v2/src/app/admin/(portal)/domain-classifications/page.tsx` — 5-tier 설명 박스 일반화

### admin-mock.ts / aeo.ts 의 산업 종속

남아있지만 mock 데이터 (이미 라이브 DB 로 대체됨) — 사용 안 됨. 굳이 수정 안 함.

---

## Round 53 (2026-05-31) — 보고서 발송일 + 일별 cron 분기 + Mock 경고 fix + reports 페이지 재디자인

### 배경

사용자 보고:
1. 월간 보고서 list 페이지의 "⚠ Mock 데이터 — 라이브 미연동" 경고 — 실제로는 tenants list / 이메일 / 발행수 모두 라이브. 경고가 거짓.
2. 클라이언트별 발송일 설정 기능 부재 — 매월 1일 일괄만 가능.
3. reports 페이지 디자인 단조 — "안 이뻐".

### Fix A — DB migration: tenants.report_send_day

```sql
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS report_send_day SMALLINT NOT NULL DEFAULT 1
  CHECK (report_send_day BETWEEN 1 AND 28);

CREATE INDEX IF NOT EXISTS idx_tenants_report_send_day ON tenants(report_send_day) WHERE email IS NOT NULL;
```

1~28일 범위 (29~31 은 매월 존재하지 않을 수 있어 제외). email 있는 tenant 만 인덱스.

### Fix B — endpoint 의 today_day 필터 + force 모드

`/api/admin/reports/email` 의 `all=true` 모드:
- 기본: KST today.day 와 `report_send_day` 일치하는 tenant 만 발송
- `force: true` body 옵션 — 필터 무시하고 모든 email 있는 tenant 발송 (수동 manual run / 일괄 발송 버튼)

### Fix C — workflow cron 매일 실행

```yaml
on:
  schedule:
    - cron: '0 9 * * *'   # 매일 09:00 UTC = 18:00 KST
```

이전: `0 9 1 * *` (매월 1일만). endpoint 의 today_day 필터로 분기됨.

### Fix D — tenants edit modal 의 발송일 dropdown

상태 select 옆에 "월간 보고서 발송일" select (1~28일). 저장 시 `/api/admin/tenants` PUT 으로 컬럼 업데이트.

### Fix E — reports/page.tsx 완전 재디자인

- MockBanner 제거 → 실데이터 안내 박스 ("실데이터 연동 완료")
- **자사(메디맵) 별도 섹션** — `partner_slug === 'medimap'` 또는 name 시작 "메디맵". 그라데이션 카드, "외부 발송 대상 아님" 명시.
- **두 그룹 분리**:
  - 발송 가능 (이메일 등록) — 2열 grid 카드. 이름, 이메일 chip, 발송일 + D-day, 발행수 큰 숫자, 미리보기/발송 버튼.
  - 이메일 미등록 — 3열 grid, dashed border. 편집 deep-link.
- **오늘 발송 강조** — `report_send_day === todayDay` 인 카드는 좌측 색띠 + animate-pulse "오늘 발송" 배지.
- **정렬 옵션** — 다음 발송 빠른순 / 이름순 / 발행수순.
- **전체 즉시 발송 버튼** — confirm 후 `all: true, force: true` 호출 — 일괄 manual run.

### 새 함정 (Round 53)

**(BJ) Mock 경고가 실제는 라이브 데이터인데 거짓 경고로 남아있는 함정**
- 증상: 일부 컬럼만 placeholder(`—`)인데 페이지 전체를 mock 으로 라벨링
- 정답: MockBanner 는 진짜 mock 데이터일 때만 사용. placeholder dash 는 별도 안내. 라이브 전환 시 banner 삭제.

**(BK) 매달 일자 28일 제한 — 29~31 일은 매월 존재하지 않을 수 있음**
- 증상: report_send_day=31 설정 시 2월/4월/6월/9월/11월 발송 안 됨
- 정답: CHECK constraint 로 1~28 만 허용. UI dropdown 도 28까지.

**(BL) KST today_day 추출 — UTC 시각 + 9시간 보정 필요**
- 증상: cron 이 UTC 기준이라 그대로 `new Date().getUTCDate()` 쓰면 KST 자정~09시 사이 하루 차이
- 정답: `new Date(Date.now() + 9 * 3600 * 1000).getUTCDate()` — KST 일자.

### Round 53 산출물

- Supabase migration `round53_tenants_report_send_day`
- `/api/admin/tenants/route.ts` — ALLOWED_INSERT 에 `report_send_day` 추가
- `/api/admin/reports/email/route.ts` — today_day 필터 + force 모드
- `.github/workflows/send-monthly-reports.yml` — cron 매일 실행
- `tenants/page.tsx` — edit modal 발송일 dropdown
- `reports/page.tsx` — 완전 재디자인 (자사 분리 / 발송 가능 / 미등록 / D-day / 오늘 발송 강조)
- `content-settings/page.tsx` — "변경은 즉시 다음 발행 플랜부터 반영됩니다" 로 안내 단순화 (cron 안내 제거 — 다른 페이지에서 관리)

---

## Round 54 (2026-05-31) — 캘린더 라이브 보기 + saas-tracking 리네이밍 + 어드민 전체 안내 문구 가독성

### 배경

사용자 보고:
1. `/admin/calendar` 의 콘텐츠 modal 에서 발행된 글의 라이브 URL 로 가는 버튼이 작고 본문 안에 있어서 못 찾음. cover image 포함된 진짜 글을 확인하고 싶음.
2. `/admin/saas-tracking` 제목 "SaaS 시장 노출도" → "GEO 최적화 관리" 로 변경. 다른 어드민 문구도 jargon 많음.
3. calendar API 가 **자사글에 live_url 생성 안 함** — content-queue 와 로직 불일치.

### Fix A — calendar API 자사글 live_url 생성

기존: published + 파트너 + slug + partner_slug 모두 있어야 live_url 생성. 자사 글은 NULL.

```typescript
const liveUrl =
  row.status === 'published' && row.slug
    ? row.is_partner_content && row.partner_category && row.tenants?.partner_slug
      ? `${PUBLIC_BLOG_BASE}/with-partners/${row.partner_category}/${row.tenants.partner_slug}/${row.slug}`
      : `${PUBLIC_BLOG_BASE}/blog/${row.slug}`
    : null;
```

content-queue route 와 동일 로직 — 자사글은 `/blog/{slug}`.

### Fix B — calendar modal 헤더 prominent 라이브 보기 버튼

기존: 본문 안에 작은 "라이브 열기" 텍스트 링크. 사용자 못 찾음.

신규: sticky modal 헤더에 brand blue 버튼 "발행된 콘텐츠 보기 ↗". live_url 없으면 "URL 미생성" 회색 disabled 배지 + tooltip ("slug 미생성" 또는 "아직 발행 전").

### Fix C — saas-tracking 리네이밍 + 안내 단순화

- 제목 "SaaS 시장 노출도" → "GEO 최적화 관리"
- 안내 문구 — 한 문장으로 자연어화. "잠재 고객이 AI 에 검색했을 때 메디맵이 얼마나 노출되는지 측정하고, 경쟁 SaaS 도메인을 자동으로 발견합니다"
- KPI 라벨 — "SaaS 키워드" → "추적 중인 키워드", "총 인용 수 (30일)" → "최근 30일 AI 인용", "메디맵 T1 share" → "메디맵 점유율", "경쟁 SaaS 도메인" → "경쟁 SaaS 발견"
- 차트 제목 — "메디맵 T1 share 추이 (SaaS 키워드 한정, 30일)" → "메디맵 점유율 추이 (최근 30일)"

### Fix D — 어드민 전체 페이지 안내 문구 가독성

14개 페이지의 `admin-page-desc` 전체 동사형 + 자연어로 통일. 예:
- "admin 액션 hook · tenants / keywords / content-queue CRUD 기록" → "어드민이 수행한 모든 작업 기록 (클라이언트 · 키워드 · 콘텐츠 변경 이력)"
- "global · per-tenant 프롬프트 / 카테고리 / 메디맵 CTA 정책" → "콘텐츠 자동 생성 정책 (프롬프트 · 카테고리 · CTA) 을 관리합니다"
- "LLM API 사용량 · Vercel function invocation · 일일/월간 추이" → "AI 모델 호출 비용과 서버 사용량 추이를 모니터링합니다"
- "AI 인용 → 클릭 → 전환 · GA4 + ShortLink 추적" → "AI 인용 → 클릭 → 실제 문의/예약까지의 전환 ROI 를 추적합니다"
- "YouTube OAuth · Resend · Slack 알림 · 외부 API 연결 관리" → "YouTube · 이메일 · Slack 등 외부 서비스 연동을 관리합니다"

### 새 함정 (Round 54)

**(BM) 두 endpoint 가 같은 데이터의 live_url 을 다르게 생성**
- 증상: calendar 와 content-queue 가 같은 generated_contents 행을 다르게 처리 (자사글 NULL vs `/blog/{slug}`)
- 정답: 두 endpoint 의 url generation 로직을 공통 utility 로 추출. 향후 Round 55 candidate.

**(BN) jargon 약어가 admin 첫 사용자에게 진입 장벽**
- 증상: "T1 share", "SaaS 카테고리", "grounding rate", "OAuth · CRUD" 같은 엔지니어 단어를 운영자가 이해 못 함
- 정답: KPI 라벨 / desc 모두 일반 사용자 한국어로. 예: "T1 share" → "점유율", "grounding rate" → "출처 명시율" 등 (다음 라운드 추가 정리).

### Round 54 산출물

- `medimap-blog-v2/src/app/api/admin/calendar/route.ts` — 자사글 live_url 생성
- `medimap-blog-v2/src/app/admin/(portal)/calendar/page.tsx` — modal 헤더 라이브 보기 버튼
- `medimap-blog-v2/src/app/admin/(portal)/saas-tracking/page.tsx` — 제목/KPI/차트 문구 가독성
- 14개 admin 페이지 `admin-page-desc` 일괄 가독성 개선

---

## Round 55 (2026-05-31) — reports 페이지 카드 grid → 표 리스트 (스케일)

### 배경

사용자 지적: "카드 grid 는 클라이언트 많아지면 또 디자인 수정해야 함". 정확한 지적 — 카드 2열 grid 는 10~20명까지만 보기 좋고 50+ 부터 무한 스크롤 + 정보 밀도 낮음.

### Fix — table 기반 dense 리스트

데스크탑/모바일 공통 표 구조 (모바일은 `overflow-x-auto` + `min-w-[720px]`).

**컬럼**: 클라이언트 | 이메일 | 발송일 | 발행 | 액션 (미리보기 / 발송)

**그룹 separator 행** — 같은 표 안에 3섹션 (자사 → 발송 가능 → 이메일 미등록):
```tsx
<GroupSeparator icon={...} label="발송 가능" color="text-status-success" count={N} />
```
- colSpan=5 의 회색 background 행 — 시각 분리는 유지하되 추가 카드 컨테이너 없음.

**행 디자인**:
- 자사: 작은 brand 배지 + `자사` chip + "외부 발송 대상 아님" 회색 텍스트
- 발송 가능: 오늘 발송이면 좌측 pulse dot + 행 배경 status-success-soft, 발송일 D-day chip
- 미등록: 행 전체 status-warning-soft 배경, "이메일 등록" 버튼 deep-link

**기능**:
- 검색 input (이름 + 이메일)
- 정렬 select (다음 발송 빠른순 / 이름 / 발행수)
- sticky header (스크롤 시 컬럼 헤더 유지)
- 하단 요약 footer (총 N · 발송 가능 N · 미등록 N)
- 검색 결과 0 시 빈 상태 메시지

**삭제된 것**:
- "실데이터 연동 완료" 안내 박스 (사용자 요청)
- 카드 grid 레이아웃 전체

### 스케일링 효과

- 카드 grid 200px height × 50명 = 10000px 스크롤
- table dense 32px row × 50명 = 1600px 스크롤 (6배 압축)
- 검색 + 정렬 + sticky header 로 100+ 명도 운영 가능

### 새 함정 (Round 55)

**(BO) 어드민 list UI 의 카드 grid 는 스케일 함정**
- 증상: 초기 5~10개 데이터에 카드 grid 가 예쁘게 보임 → 50+ 되면 무한 스크롤 + 디자인 재작업 강제
- 정답: 운영용 admin list 는 처음부터 table dense row. 카드는 detail 페이지나 "first impression" 한정.

### Round 55 산출물

- `medimap-blog-v2/src/app/admin/(portal)/reports/page.tsx` — 카드 grid → table 리스트 + 검색 + sticky header + GroupSeparator 컴포넌트

---

## Round 56 (2026-05-31) — reports 위계 강화 + 진료항목 필터 + saas KPI 클릭 anchor

### 배경

사용자 (17년차 디자이너 관점):
1. 한 표 안에 3그룹 (자사 / 발송 가능 / 미등록) 모은 구조 — separator 행 한 줄로는 위계 약함
2. 메디맵 행의 brand 그라데이션 아이콘 = 시각 노이즈 (자사 chip 으로 충분)
3. 클라이언트 많아지면 필터 필요 — 진료항목별

### Fix A — 3개 GroupCard 컴포넌트로 분리

기존: 한 `<table>` 안에 GroupSeparator row 로 3그룹 묶음.

신규: 각 그룹이 자체 card + 좌측 4px color stripe:
- 자사: `bg-brand` stripe
- 발송 가능: `bg-status-success` stripe
- 미등록: `bg-status-warning` stripe

각 카드 헤더: status icon + 제목 + count chip (status-color soft). 카드 간 `space-y-5` 로 명확한 분리.

### Fix B — 메디맵 행 단순화

기존: 6×6 그라데이션 brand 아이콘 + 자사 chip + 이름. 시각 중복.

신규: chip + 이름만. 행 자체가 brand stripe + brand soft 배경으로 자사임을 시그널.

### Fix C — 진료항목 chip 필터 (CategoryFilterBar)

각 그룹 헤더 우측에 chip filter 바 — `전체 / 안과 / 피부과 / 성형외과 / 치과 / 내과 / 모발이식 / 한방 / 기타`.

활성 chip 색상은 그룹 stripe 색과 일치 (success / warning). 실제 데이터에 있는 카테고리만 chip 노출 (빈 카테고리 숨김).

발송 가능 / 미등록 각자 independent state — 한쪽 필터 변경이 다른 그룹에 영향 없음.

### Fix D — saas-tracking KPI 클릭 anchor

KpiCard 4개 → 각 KPI 클릭 시 해당 section 으로 smooth scroll:
- 추적 중인 키워드 → `#keyword-grounding`
- 최근 30일 AI 인용 → `#share-trend`
- 메디맵 점유율 → `#share-trend`
- 경쟁 SaaS 발견 → `#competitor-saas`

KpiCard 컴포넌트에 `href` prop 추가 — `<a>` 로 래핑, `scroll-mt-20` 으로 anchor offset.

### 새 함정 (Round 56)

**(BP) GroupSeparator row 는 시각 위계 한계가 명확**
- 증상: 한 표 안에 group separator row 로 3그룹 묶을 때 디자이너 관점에서 약함. 데이터 행과 separator 의 거리감 부족.
- 정답: 별도 card + 좌측 color stripe + 자체 헤더/필터. 데이터 그룹 시각 분리는 컨테이너 분리가 정공법.

**(BQ) 메디맵 자사 글의 partner_slug 패턴 — 단순 'medimap' 가정 금지**
- 증상: reports/page.tsx 의 isSelf 가 `partner_slug === 'medimap'` 만 체크 → 실제 DB 는 `medimap-self`
- 정답: `partner_slug === 'medimap' || partner_slug === 'medimap-self' || name.startsWith('메디맵')` 으로 OR 체크.

### Round 56 산출물

- `medimap-blog-v2/src/app/admin/(portal)/reports/page.tsx` — 3개 GroupCard + CategoryFilterBar + isSelf medimap-self 추가
- `medimap-blog-v2/src/app/admin/(portal)/saas-tracking/page.tsx` — KpiCard href 지원 + section id (#share-trend / #keyword-grounding / #competitor-saas)

### 다음 라운드 후보 (Round 58)

**학습 → 콘텐츠 활용 워크플로우** (큰 작업, 별도 분리):
- learned-insights 페이지의 분석 결과를 → 콘텐츠 생성에 직접 활용하는 기능
- 메디맵 + 각 클라이언트별 관리 (dropdown + 검색)
- DB schema: `applied_insights` 테이블 (insight_id → tenant_id 매핑)
- API: `/api/admin/insights/apply` (insight 를 tenant 의 content_settings 에 inject)
- UI: learned-insights 카드에 "이 클라이언트에 적용" 버튼 + applied 표시

---

## Round 57 (2026-05-31) — SEO/속도 진단 + recharts lazy load + 핸드오프 가이드

### 점검 결과

**medimap-blog (자사 SaaS 사이트)** — SEO 기본기 양호:
- ✅ `robots.ts` — AI 크롤러 전체 허용 + admin/client/api 차단 + sitemap 명시
- ✅ `sitemap.ts` — try/catch fallback (Round 12)
- ✅ `next.config.js` — AVIF/WebP, compress, poweredByHeader off, redirects (한글→영문)
- ✅ Pretendard font preconnect + dns-prefetch
- ✅ `force-dynamic` + middleware no-store (Round 16)
- ⚠️ 보강 가능: next/font self-host (CDN 의존 제거 → CLS 감소), Article JSON-LD 풍부화

**medimap-blog-v2 (admin)** — 운영자용:
- ✅ `(portal)/layout.tsx` robots noindex/nofollow (Round 5)
- ✅ `force-dynamic` 일관
- ⚠️ 병목: recharts (~100KB) 가 6개 파일에서 직접 import → 첫 로드 부담

### Fix — recharts dynamic import (2 핵심 페이지)

운영자 매일 진입 경로 2개에 next/dynamic 적용:

```typescript
const DashboardCharts = nextDynamic(
  () => import('@/components/admin/DashboardCharts').then((m) => m.DashboardCharts),
  { ssr: false, loading: () => <SkeletonChart /> }
);
```

적용:
- `/admin/(portal)/page.tsx` — DashboardCharts (대시보드 차트 3개)
- `/admin/(portal)/reports/[tenantId]/page.tsx` — ReportTrendChart (보고서 추이)

효과: 첫 페인트 시 recharts 번들 제외 → KPI 카드 / 표 부터 즉시 표시. 차트는 비동기 로드.

**중요한 import alias 함정**:
- `admin/(portal)/page.tsx` 는 `export const dynamic = 'force-dynamic'` 이 있어서 `import dynamic from 'next/dynamic'` 하면 변수명 충돌. → `import nextDynamic from 'next/dynamic'` 로 alias 필수.

### 새 함정 (Round 57)

**(BR) Next.js 의 `export const dynamic` 과 `next/dynamic` 변수명 충돌**
- 증상: 같은 파일에서 둘 다 쓰면 `dynamic` 이 shadow 됨. `Cannot read properties` 런타임 에러.
- 정답: `import nextDynamic from 'next/dynamic'` alias.

**(BS) `ssr: false` dynamic 컴포넌트의 type 은 별도 import**
- 증상: dynamic component 의 named export `type` 도 같이 import 하면 lazy 로드 안 됨 (type 강제로 번들에 포함)
- 정답: `import type { ... } from '@/components/...'` 로 type 만 분리, component 만 dynamic.

### 다음 라운드 후보 (Round 58+)

**추가 SEO/속도 최적화 (시간 들 때 진행)**
1. medimap-blog 의 next/font self-host (Pretendard 로컬화)
2. saas-tracking / citations / competitors / learned-insights 의 recharts 도 dynamic 처리 (4 페이지)
3. Article JSON-LD 풍부화 (mainEntityOfPage, breadcrumb, faq 추가)
4. medimap-blog 의 ISR 도입 가능 항목 검토 (`force-dynamic` 일괄을 일부 ISR 로 전환 — TTFB 단축)
5. Vercel Analytics 또는 PageSpeed Insight 정기 모니터링 자동화

### Round 57 산출물

- `medimap-blog-v2/src/app/admin/(portal)/page.tsx` — DashboardCharts dynamic
- `medimap-blog-v2/src/app/admin/(portal)/reports/[tenantId]/page.tsx` — ReportTrendChart dynamic
- `handoff/round57-2026-05-31/HANDOFF.md` — 내일 작업 가이드
- SKILL.md 갱신

---

## Round 58~62 (2026-06-01 ~ 2026-06-20) — Anthropic 연동 + 운영 인프라 완비

### Round 58 — Anthropic LLM 연동

- env: `LLM_PROVIDER=anthropic`, `ANTHROPIC_MODEL=claude-sonnet-4-6`
- factory.ts + llm.py 양쪽이 `ANTHROPIC_MODEL` env 안 읽던 silent 함정 fix
- cost.py 에 sonnet-4-6 / opus 단가 추가
- workflow.yml 에 `ANTHROPIC_MODEL` secret 전달 추가
- **fix 1** — Sonnet 4.6 의 `\'` (작은따옴표 escape) JSON 파싱 실패 → assistant prefill `{` 강제
- **fix 2** — Vercel 빌드 실패 (`reports/[tenantId]/page.tsx` 의 `dynamic` 변수명 충돌, Round 57 함정 BR 재현 잔여)
- **fix 3** — max_tokens=4096 부족으로 한국어 응답 잘림 → 8192 + `stop_reason=max_tokens` 감지

### Round 59 (CRITICAL) — Next.js fetch cache 함정

**최대 함정 (BX)** — Next.js 13+ 의 fetch auto-cache 가 Supabase JS client 내부 fetch 까지 캐시 → admin API 응답이 stale (5/30 데이터가 6/20 까지 반환됨).

`force-dynamic` / `Cache-Control` header / middleware no-store / Vercel Redeploy 모두 무력. 해결책 단 하나:

```typescript
// lib/supabase.ts
createClient(url, key, {
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' as RequestCache }),
  },
});
```

Round 50+ 모든 캐시 fix 가 무력했던 root cause. **모든 Supabase 호출이 영향**.

#### 동시 진행
- cron 2회/일 (KST 08시 + 14시)
- content-queue UIUX 완벽 개선 (자사/파트너 stripe + 필터 chip + 본문 modal 가독성)
- `isSelfContent()` 함수 — cron 의 잘못된 `is_partner_content` 마킹 우회 (partner_slug 기반 분기)
- blog_category 매핑 강화 — title 도 함께 보고 hospital/content/ai 균형 분류
- siteConfig.url default `medimap-blog-phi.vercel.app` 로 변경 (`medimap.kr` 은 다른 회사 — 도메인 confusion)
- Article LD-JSON 보강 (wordCount + articleBody + url)

### Round 60 — 이미지 자동 추가 + 한국 특화

- Storage upload 실패 시 `return None` → cover NULL 함정 fix
- Raw Pollinations URL fallback 추가
- **fix 2** — Pollinations prompt 가 서양 의료진 출력 → `asian east asian Korean people, Seoul, no western faces` 강제
- DB 자사 18편 body figure 일괄 삽입 + cover 한국 특화 prompt 재생성
- `dbRowToPostMeta` 의 cover_image_url 매핑 누락 함정 (DbPostRow 에 선언만 있고 PostMeta 변환 코드 빠짐) — 18편 cover 안 보이던 버그

### Round 61 — LLM 응답 HTML entity 영구 차단

Gemini/Sonnet 이 한국어 응답 시 `'` → `&#x27;`, `&` → `&amp;` escape 함정.

```python
def _decode_html_entities_deep(obj):
    import html as _html
    if isinstance(obj, str): return _html.unescape(obj)
    if isinstance(obj, dict): return {k: _decode_html_entities_deep(v) for k, v in obj.items()}
    if isinstance(obj, list): return [_decode_html_entities_deep(v) for v in obj]
    return obj
```

`_parse_blog_json` + `_parse_qa_json` 양쪽 적용.

### Round 62 — 학습 → 콘텐츠 활용 워크플로우 인프라

- DB schema: `applied_insights` 테이블 (insight × tenant 매핑)
- API: `/api/admin/insights/apply` (POST upsert / DELETE soft / GET filter)
- Python loader: `applied_insights_loader.py` — prompt block 변환
- **fix** — `NextResponse.json(body, init1, init2)` 3-arg signature 함정 → `NextResponse.json(body, { status, headers })` 단일 init

### Round 58~62 새 함정 누적 (BR~CB)

| 코드 | 함정 | 정답 |
|---|---|---|
| BR | `export const dynamic` vs `import dynamic from 'next/dynamic'` 변수명 충돌 | `nextDynamic` alias |
| BS | dynamic component type 같이 import 시 lazy 무력 | `import type` 분리 |
| BT | Anthropic factory가 model env 안 읽음 | constructor 에 model 전달 |
| BU | Sonnet `\'` invalid JSON escape | assistant prefill `{` 강제 |
| BV | API key 채팅 노출 | POC 종료 후 즉시 revoke |
| BW | Sonnet markdown fence + prefix 강제 무시 | prefill 또는 Tool use API |
| **BX** | **(CRITICAL) Next.js fetch auto-cache 가 Supabase client 도 캐시** | `createClient` 의 `global.fetch` override |
| BY | 한국어 max_tokens 영어 대비 2배 필요 | 8192 + stop_reason 감지 |
| BZ | Storage upload 실패 시 모든 작업 폐기 | raw URL fallback |
| CA | DB 컬럼 → PostMeta 매핑 누락 (type 있고 변환 코드 빠짐) | 매핑 코드 점검 |
| CB | `NextResponse.json(body, init1, init2)` 안됨 | 단일 init 안에 status + headers |

### Round 58~62 산출물 누적

**Code 변경**:
- `lib/supabase.ts` — global.fetch no-store override (BX 핵심)
- `lib/llm/factory.ts` + `src/content/llm.py` — ANTHROPIC_MODEL env, prefill, max_tokens 8192, stop_reason, `_decode_html_entities_deep`
- `src/content/image_picker.py` — 한국 특화 prompt + raw Pollinations fallback
- `src/content/applied_insights_loader.py` — 신규 (학습 prompt loader)
- `src/collector/scheduler.py` — blog_category mapping 강화 (keyword+title)
- `src/content/cost.py` — sonnet-4-6 / opus 단가
- `medimap-blog/src/lib/posts.ts` — cover_image_url → PostMeta 매핑 (CA fix)
- `medimap-blog/src/lib/schema.ts` — wordCount/articleBody/url
- `medimap-blog/src/lib/site.ts` — siteConfig.url default fix
- `medimap-blog/src/app/layout.tsx` — Google Search Console verification meta
- `medimap-blog-v2/src/app/admin/(portal)/content-queue/page.tsx` — UIUX overhaul
- `medimap-blog-v2/src/app/admin/(portal)/reports/[tenantId]/page.tsx` — nextDynamic alias
- `medimap-blog-v2/src/app/api/admin/content-queue/[id]/route.ts` — isSelf 분기 fix
- `medimap-blog-v2/src/app/api/admin/insights/apply/route.ts` — 신규
- `medimap-blog-v2/src/middleware.ts` — admin API cache 안전망
- `.github/workflows/auto-publish.yml` — cron 2회/일 + ANTHROPIC_MODEL

**DB 변경**:
- Migration `round58_*`, `round62_applied_insights`
- 자사 18편 발행 + 카테고리 균형 (hospital 8 / content 6 / ai 4)
- HTML entity 일괄 decode + cover URL 한국 특화 + body figure 삽입
- 옛 양식·placeholder·FAQ-only 일괄 거부

**운영**:
- Google Search Console: 인증 + sitemap 제출 + 핵심 3편 우선 색인 요청
- Anthropic Sonnet 4.6 본격 cron 발행 환경 완비

### 다음 라운드 후보 (Round 63+)

1. **Round 56 후속** — learned-insights UI 마무리 (tenant dropdown + 적용 chip)
2. **본 사이트로 마이그레이션** — vercel.app → medi-map.co.kr/blog (domain authority)
3. **백링크 전략** — 의료 매체 기고 (mkhealth, hidoc, hinews)
4. **자동 검수 (의료법 + quality)** — AI 1차 통과 → 운영자는 borderline 만
5. **Tool use API 전환** — Anthropic structured output (prefill 함정 영구 제거)
cron 발행 환경 완비

### 다음 라운드 후보 (Round 63+)

1. **Round 56 후속** — 학습 → 콘텐츠 활용 UI 마무리 (tenant dropdown + 적용 chip)
2. **본 사이트로 마이그레이션** — vercel.app 한계 → medi-map.co.kr/blog 서브패스로 이전 (domain authority)
3. **백링크 전략** — 의료 매체 기고 (mkhealth, hidoc, hinews) — 1편당 1개 백링크
4. **자동 검수 (의료법 + quality)** — 검수 부담 줄이기 (AI 1차 통과 → 운영자는 borderline 만)
5. **Tool use API 전환** — Anthropic structured output (prefill 함정 영구 제거)


## Round 58 (2026-06-01) — Anthropic LLM 연동 (Claude Sonnet 4.6)

### 배경

사용자가 Claude Code 구독을 통해 Anthropic API key 발급 후 LLM provider 로 anthropic 사용 결정. POC 단계.

env 설정:
- `LLM_PROVIDER=anthropic`
- `ANTHROPIC_API_KEY=sk-ant-...`
- `ANTHROPIC_MODEL=claude-sonnet-4-6`

### 진단 — Anthropic 모델 환경변수 미적용 함정

**문제**: factory 패턴에서 `AnthropicProvider(api_key)` 만 호출 → 두 번째 인자 `model` 안 전달 → default `claude-haiku-4-5-20251001` 강제.

사용자가 `ANTHROPIC_MODEL=claude-sonnet-4-6` 설정해도 무시되는 silent 함정.

### Fix — 두 곳 모두 ANTHROPIC_MODEL 적용

1. **`medimap-blog-v2/src/lib/llm/factory.ts`** (Next.js admin/API):
   ```typescript
   return new AnthropicProvider(
     process.env.ANTHROPIC_API_KEY ?? '',
     process.env.ANTHROPIC_MODEL || undefined
   );
   ```

2. **`src/content/llm.py`** (Python cron 발행):
   - `_build_provider_chain()` (fallback chain)
   - `_get_provider_from_env(name="anthropic")` (단일 provider)
   둘 다 `os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")` 로 model 인자 전달.

### Cost 단가 추가

- **Next.js (`base.ts`)** — `claude-sonnet-4-6` 이미 정의됨 ✅ (`{ input: 3e-6, output: 15e-6 }`)
- **Python (`cost.py`)** — 추가:
  - `claude-sonnet-4-6`: input $3.0 / output $15.0
  - `claude-sonnet-4-5`: 동일
  - `claude-opus-4-6/4-7`: input $15.0 / output $75.0

비용 가드레일 (MAX_DAILY_USD) 가 sonnet 단가로 정확히 계산됨.

### 환경변수 등록 — 두 곳 필수

1. **Vercel 환경변수** (Next.js admin 용):
   - https://vercel.com → medimap-blog-v2 → Settings → Environment Variables
   - `LLM_PROVIDER=anthropic`
   - `ANTHROPIC_API_KEY=sk-ant-...`
   - `ANTHROPIC_MODEL=claude-sonnet-4-6`
   - 적용 환경: Production + Preview 둘 다 체크

2. **GitHub Actions Secrets** (Python cron 발행 용):
   - https://github.com/passion4050-byte/Marketing → Settings → Secrets and variables → Actions
   - 같은 3개 동일하게 등록
   - 이미 `auto-publish.yml` 에서 사용 중인 env 패턴이라 별도 workflow 변경 불필요

### 검증 방법

push + Vercel 빌드 후:
1. `/admin/cost` 접속 → 다음 cron 후 LLM 호출 row 의 `model` 컬럼이 `claude-sonnet-4-6` 으로 나타나야 정상
2. 다음 발행 cycle (UTC 23:00 = KST 08:00) 의 GitHub Actions 로그에서 `provider=anthropic model=claude-sonnet-4-6` 확인
3. `llm_call_logs` 테이블 직접 조회로 검증 가능

### 새 함정 (Round 58)

**(BT) Factory 패턴이 env 변수 일부만 읽는 silent 함정**
- 증상: API key 만 전달되고 model 인자 누락 → constructor default 모델 강제. 사용자가 model env 변수 설정해도 무시.
- 정답: factory 패턴 추가 시 모든 관련 env 변수 (`PROVIDER`, `KEY`, `MODEL`, `MAX_TOKENS` 등) 한 번에 전달. 또는 provider class 내부에서 직접 `os.getenv` 호출.

**(BU) Anthropic 모델 ID 명명 — 두 가지 패턴**
- 짧은 형식: `claude-sonnet-4-6`, `claude-opus-4-7`
- 긴 형식: `claude-haiku-4-5-20251001` (날짜 suffix)
- 둘 다 유효하지만 cost 단가 매핑이 짧은 형식 한정이면 긴 형식 호출 시 cost=0 fallback. cost.py / base.ts 양쪽에 alias 등록.

**(BV) API key 채팅 노출 — POC 라도 작업 종료 후 revoke 권장**
- 증상: API key 가 채팅 로그, 캐시, IDE history 에 남을 수 있음
- 정답: POC 후 즉시 revoke + 새 key 발급 → Vercel/GitHub Secrets 갱신

### Round 58 산출물

- `medimap-blog-v2/src/lib/llm/factory.ts` — ANTHROPIC_MODEL env 전달
- `src/content/llm.py` — `_build_provider_chain` + `_get_provider_from_env` 둘 다 model 전달
- `src/content/cost.py` — sonnet-4-6 / opus-4-6 / opus-4-7 단가 추가
- `handoff/round58-2026-06-01/ENV-SETUP.md` — Vercel + GitHub Secrets 등록 가이드 (별도 파일)

---

## Round 58 fix (2026-06-01) — Sonnet JSON 파싱 실패 + assistant prefill

### 증상

`auto-publish` workflow 첫 실행 (#69) 실패:
```
scheduler.auto_content_error channel=blog_html
error='JSON 파싱 실패: Expecting ',' delimiter: line 75 column 6 (char 4227);
raw=```json\n{\n "title": "의료 GEO 최적화로 지역 환자들 찾기..."
```

Process exit code 3, drafts=1 errors=1 published=0.

### 진단

Sonnet 4.6 가 Haiku 와 달리:
1. **```json fence 로 응답을 감쌈** (system prompt "코드 블록 X" 무시)
2. **작은따옴표를 `\\'` 로 escape** — JSON 비표준 (큰따옴표 `\"` 만 허용)
3. raw 내부에 `'내 주변 치과\\' \\'강남 안과\\'` 같은 invalid escape 발견

### Fix A — `_lenient_json_loads` 보강

```python
# markdown fence strip (앞/뒤 모두)
fixed = _re.sub(r"^\s*```(?:json)?\s*\n?", "", fixed)
fixed = _re.sub(r"\n?```\s*$", "", fixed)
# Round 58 — Claude Sonnet 의 `\'` (작은따옴표 escape) → `'`
fixed = fixed.replace("\\'", "'")
```

기존 `_parse_blog_json` 의 markdown strip 외에 `_lenient_json_loads` 에도 추가 (이중 안전망).

### Fix B — Anthropic assistant prefill

가장 robust 방법. user 메시지 후 assistant 응답을 `{` 로 prefill → Sonnet 의 첫 출력 token 이 JSON object 키부터 시작:

```python
messages=[
    {"role": "user", "content": prompt},
    {"role": "assistant", "content": "{"},  # prefill
]
raw = response_text
if not raw.lstrip().startswith("{"):
    raw = "{" + raw
```

효과:
- markdown fence 차단 (assistant 가 `{` 이후로 응답하니 ```json 못 씀)
- "여기 JSON 입니다:" 같은 prefix 차단
- 토큰 절약 (불필요한 wrapping 제거)

### 새 함정 (Round 58 fix)

**(BW) Sonnet 4.6 는 Haiku 보다 `(코드 블록 X)` 지시 무시 경향이 강함**
- 증상: system prompt 에 명시해도 markdown fence 로 감쌈
- 정답: assistant prefill `{` 로 형식 강제. 또는 Tool use API 사용.

**(BX) JSON 비표준 `\\'` escape — 한국어 LLM 응답에 자주 발생**
- 증상: 작은따옴표를 `\\'` 로 escape → `json.loads` 실패
- 정답: `_lenient_json_loads` 에서 `\\'` → `'` 치환. 또는 다른 lenient JSON parser (json5, demjson3) 사용.

### Round 58 fix 산출물

- `src/content/llm.py`:
  - `_lenient_json_loads`: markdown fence strip + `\\'` 치환 + 에러 메시지 raw 진단 정보
  - `AnthropicProvider.generate_blog_post`: assistant prefill `{`
  - `AnthropicProvider.generate_faq`: assistant prefill `{`

### 검증

push 후 GitHub Actions `auto-publish` workflow 수동 재실행 → 성공 시 drafts ≥ 1 + errors=0 + exit 0.

---

## Round 58 fix 2 (2026-06-01) — Vercel 빌드 실패 (함정 BR 재현)

### 증상

Vercel deploy hook 실행 → Build Failed:
```
import dynamic from 'next/dynamic';
^^^^^^^
-- previous definition of 'dynamic' here
```

`reports/[tenantId]/page.tsx` 에서 `import dynamic from 'next/dynamic'` 과 `export const dynamic = 'force-dynamic'` 둘 다 사용 → 변수명 충돌. TypeScript redeclaration 에러.

### 진단

Round 57 에서 BR 함정 인지했지만 부분 적용:
- ✅ `admin/(portal)/page.tsx` — `nextDynamic` alias 적용
- ❌ `admin/(portal)/reports/[tenantId]/page.tsx` — `dynamic` 그대로 → 충돌

함정 인지 후 grep 으로 전체 찾았어야 했음.

### Fix

`reports/[tenantId]/page.tsx` 에서 동일하게 `nextDynamic` alias:
```typescript
import nextDynamic from 'next/dynamic';
const ReportTrendChart = nextDynamic(...);
```

### 교훈

함정 발견 시 grep 으로 **전체 파일 점검**:
```bash
grep -r "import dynamic from 'next/dynamic'" src/ | \
  while read line; do
    file=$(echo $line | cut -d: -f1)
    if grep -q "export const dynamic" $file; then
      echo "충돌 위험: $file"
    fi
  done
```

Round 57 시 위 검증 안 함 → Round 58 fix 2 추가 push 필요.

### Round 58 fix 2 산출물

- `medimap-blog-v2/src/app/admin/(portal)/reports/[tenantId]/page.tsx` — `nextDynamic` alias

---

## Round 59 누적 (2026-06-01) — 일괄 정리

### 주요 fix

**fix 4 — Supabase client 의 Next.js fetch auto-cache (CRITICAL)**
```typescript
// lib/supabase.ts
createClient(url, key, {
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' as RequestCache }),
  },
});
```
Next.js 13+ 의 fetch auto-cache 가 Supabase 내부 fetch 까지 캐시 → 5/30 응답이 6/20 까지 stale. `force-dynamic` / `Cache-Control` header 모두 무력. **global.fetch override 가 유일한 해결**.

**fix 5 — content-queue UIUX 완벽 개선**
- isSelfContent() 함수 (partner_slug 기반) — cron 의 잘못된 `is_partner_content` 마킹 우회
- 카드 좌측 4px stripe (자사 brand / 파트너 accent)
- 필터 chip (전체/자사/파트너)
- 본문 미리보기 modal: 좁은 max-w + 큰 폰트 + H1/H2/H3 위계 + 메타 정보 헤더

**fix 6 — blog_category 매핑 강화**
- title 도 같이 보고 hospital/content/ai 3분류
- 단일 키워드 편향 해결 (이전엔 모든 자사 글이 ai_trend)

### Round 59 새 함정

**(BX) Next.js fetch auto-cache — 모든 Supabase 호출 stale**
- 증상: 어드민 API 가 옛 데이터 반환 (force-dynamic 무력)
- 정답: createClient 의 global.fetch override 로 cache 차단

**(BY) is_partner_content 컬럼 cron 잘못 마킹**
- 증상: 모든 draft 가 is_partner_content=false 로 저장 → admin UI 에서 파트너 글이 "자사" 로 잘못 분류
- 정답: 컬럼 무시. partner_slug 기반 분기 (`medimap` / `medimap-self` 이외 = 파트너)

### Round 59 산출물

- `lib/supabase.ts` — global.fetch no-store
- `content-queue/page.tsx` — UIUX 개선 + isSelfContent() + 필터 chip + modal 가독성
- `content-queue/[id]/route.ts` — isSelf 분기 fix (medimap-self 자사 인식)
- `scheduler.py` — _map_blog_category(keyword, title) 강화
- `auto-publish.yml` — ANTHROPIC_MODEL env + cron 2회/일
- `schema.ts` — Article LD-JSON wordCount/articleBody/url
- `site.ts` — siteConfig.url default = medimap-blog-phi.vercel.app
- middleware.ts — admin API cache no-store
- 자사 발행 18편 (DB 직접) + 카테고리 균형 재분류

---

## Round 60 (2026-06-01) — cron 이미지 자동 추가 fix

### 증상

자사 발행 18편 모두 `cover_image_url=NULL`. cron 의 image_picker 가 작동 안 함.

### 진단

`generate_image_for_content()` 흐름:
1. is_self_tenant=True → Unsplash 시도 → UNSPLASH_ACCESS_KEY 미설정 시 실패
2. Pollinations 시도 → 응답 받음
3. Storage upload (`_upload_to_supabase`) → 실패 시 **`return None`** ← 함정
4. cron 이 None 받으면 cover_image_url 그대로 NULL

핵심 함정 — Storage upload 가 401/500 받으면 cover 가 NULL 채로 저장. Pollinations 응답은 받았는데 폐기.

### Fix — Raw Pollinations URL fallback

```python
storage_url = _upload_to_supabase(img_bytes, keyword, title)
if not storage_url:
    # Storage 실패 → raw Pollinations URL 그대로 사용 (cover NULL 회피)
    return {
        "url": url,  # raw Pollinations URL (image.pollinations.ai)
        ...
        "source": "pollinations_raw",
    }
```

medimap-blog 의 next.config.js 가 `image.pollinations.ai` remote pattern 이미 허용 → next/image 정상 렌더.

### 백필 — 옛 글 18편 cover 채움

```sql
UPDATE generated_contents
SET cover_image_url = 'https://image.pollinations.ai/prompt/{escaped_prompt}?width=1600&height=900&model=flux&seed={id}&nologo=true&enhance=true'
WHERE status = 'published' AND tenant_id = 12 AND cover_image_url IS NULL;
```

### 새 함정 (Round 60)

**(BZ) Storage upload 실패 시 모든 작업 폐기 (graceful 아님)**
- 증상: Pollinations 응답 OK 인데 Storage upload 1번 실패로 cover NULL 채로 저장 → 운영자가 다음 cron 사이클까지 못 알아챔
- 정답: 단계별 fallback — Storage 실패 → raw URL fallback → 둘 다 실패 시만 NULL

### Round 60 산출물

- `image_picker.py` — Storage 실패 시 raw Pollinations URL fallback
- DB 백필 — 자사 18편 cover_image_url 채움

### Round 60 fix 2 (2026-06-01) — 서양 의료진 + 본문 figure 누락

- PROMPT_TEMPLATE_REALISTIC 에 `asian east asian Korean people, Seoul South Korea` + `no western faces` 명시 강제
- 자사 18편 body 안에 figure 일괄 삽입 (첫 H2 직후, Pollinations 한국 특화 URL)
- `dbRowToPostMeta` 의 cover_image_url 매핑 누락 함정 (DB 채워졌지만 UI render skip)

---

## Round 61 (2026-06-01) — LLM 응답 HTML entity 영구 차단

### 함정

Gemini/Sonnet 이 한국어 응답 시 작은따옴표를 `&#x27;`, `&` 를 `&amp;` 로 escape 한 채 반환. DB 에 저장 → 라이브 페이지에 literal entity 노출 ("우리 병원, 지역 검색에서 &#x27;진짜&#x27;...").

### Fix

`_decode_html_entities_deep` 함수 — dict/list/str 재귀 순회 + `html.unescape()`. `_parse_blog_json` + `_parse_qa_json` 양쪽에서 호출. 향후 cron 발행 글 entity 영구 차단.

### 산출물

- `src/content/llm.py` — `_decode_html_entities_deep` + parse 함수 두 곳 적용
- DB 18편 일괄 unescape 백필 완료

---

## Round 62 (2026-06-01) — 학습 → 콘텐츠 활용 워크플로우 (인프라)

### 목표

`learned_insights` 의 분석 결과를 cron prompt 에 inject — 메디맵 자사 + 각 클라이언트 별로 독립 적용 가능.

### DB schema

```sql
CREATE TABLE applied_insights (
  id SERIAL PRIMARY KEY,
  insight_id INTEGER NOT NULL REFERENCES learned_insights(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by VARCHAR(100),
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(insight_id, tenant_id)
);
```

### API

- `POST /api/admin/insights/apply` — upsert applied_insights (insight × tenant 매핑)
- `DELETE /api/admin/insights/apply` — soft delete (is_active=false)
- `GET /api/admin/insights/apply?tenant_id=N` — 적용된 list

### Python loader

`src/content/applied_insights_loader.py` — `load_applied_insights_block(tenant_id)`:
1. PostgREST 로 applied_insights 조회 (is_active=true)
2. learned_insights 의 title/summary/patterns 가져옴
3. prompt block 으로 조립 (`--- 적용된 학습 인사이트 ---\n... ---`)
4. cron 의 `_build_blog_user_prompt` 에서 호출 → user prompt 끝에 append

### 남은 작업 (다음 라운드)

- learned-insights UI 에 tenant dropdown + 적용 list chip
- generator.py 가 applied_insights_loader 호출 + prompt inject
- 검증: 다음 cron 의 콘텐츠 quality 확인

### Round 62 산출물

- Migration `round62_applied_insights`
- `/api/admin/insights/apply/route.ts`
- `src/content/applied_insights_loader.py`


---

## Round 58 fix 3 (2026-06-01) — Sonnet 응답 잘림 (max_tokens 도달)

### 증상

`auto-publish` workflow #70 실패. raw 분석:
- `{` 로 시작 (prefill 작동) ✅
- 정상 JSON 구조 시작 (`title`, `meta_description`, `keywords`, `canonical_keyword`, `intro_paragraphs`)
- `intro_paragraphs` 첫 string **중간에서 끝남** → invalid JSON
- error `line 59 column 6 (char 4151)` — JSON 깊은 곳에서 ',' 누락

### 진단

`max_tokens=4096` 이 한국어 blog post (title + meta + 5 sections + intro + conclusion + references + images) 에 부족.

한국어는 token 효율 영어보다 낮음:
- 영어 4096 토큰 ≈ 3000 단어 (blog 충분)
- 한국어 4096 토큰 ≈ 1500-2000 자 (제목 + meta + 1-2 섹션만)

### Fix — max_tokens 증가 + stop_reason 감지

1. **blog**: `max_tokens=4096` → `8192` (안전 마진 2배)
2. **faq**: `max_tokens=2048` → `4096`
3. **stop_reason 감지**:
   ```python
   if msg.stop_reason == "max_tokens":
       raise LLMError(f"Anthropic 응답 잘림 (max_tokens 도달). raw 마지막 200자: {raw[-200:]!r}")
   ```

→ 잘림 시 명확한 에러 메시지로 진단 시간 단축. fallback chain 작동 (Gemini 로 자동 대체).

### 새 함정 (Round 58 fix 3)

**(BY) Anthropic max_tokens — 한국어 콘텐츠는 영어 대비 2배 필요**
- 증상: blog post 한국어 응답이 잘려 invalid JSON
- 정답: 한국어 blog 8192, FAQ 4096 최소. Tool use API 도 별도 응답 길이 한도 있음.

**(BZ) stop_reason 미체크 함정 — JSON 파싱 에러로 위장**
- 증상: 응답 잘렸는데 단순 JSON 파싱 실패 메시지만 나옴 → 원인 진단 어려움
- 정답: `msg.stop_reason == "max_tokens"` 명시 체크 → 즉시 잘림 진단.

### 다음 단계 후보 (Round 59)

**Anthropic Tool use API 전환** (가장 robust):
- `tools=[{"name": "blog_post", "input_schema": {...}}]`
- `tool_choice={"type": "tool", "name": "blog_post"}`
- 100% valid JSON 보장 — schema 자체에 강제됨
- prefill / lenient parser / fence strip 모두 불필요
- 단점: 코드 변경 큼 (응답 구조 다름 — content[0].input 형식)

### Round 58 fix 3 산출물

- `src/content/llm.py`:
  - `generate_blog_post`: max_tokens 4096 → 8192, stop_reason 체크
  - `generate_faq`: max_tokens 2048 → 4096, stop_reason 체크

