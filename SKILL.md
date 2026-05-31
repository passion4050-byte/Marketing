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
