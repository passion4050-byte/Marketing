# Supabase 셋업 가이드

## 1. 프로젝트 생성

1. https://supabase.com 가입 (GitHub로 로그인)
2. **New Project** → 이름 `medimap-geo` → Region `Northeast Asia (Seoul)` → DB 비밀번호 안전한 곳에 저장
3. 약 2분 대기

## 2. 마이그레이션 적용

**옵션 A — Supabase Dashboard에서 직접 (가장 빠름)**

1. 프로젝트 → 좌측 **SQL Editor** → **New query**
2. `supabase/migrations/0001_initial_schema.sql` 전체 복사 → 붙여넣기 → **RUN**
3. 좌측 **Table Editor**에서 16개 테이블 생성 확인

**옵션 B — Supabase CLI** (CI/배포 자동화 시)

```bash
npm install -g supabase
supabase login
supabase link --project-ref [YOUR_PROJECT_REF]
supabase db push
```

## 3. 환경변수 가져오기

Supabase 프로젝트 → **Settings** → **API**:

| 키 | 값 | 위치 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public | `.env.local` + Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret | **Vercel만** (브라우저 노출 금지) |

## 4. RLS 정책 확인

기본 마이그레이션이 16개 테이블에 RLS enable + per-tenant 정책을 자동 적용함. 확인:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

`rowsecurity = true`가 모두 출력되어야 함.

## 5. 운영 컨벤션 (이전 운영에서 배운 교훈)

- **RLS enable만 하고 정책 없으면 모든 접근 차단** — 정책을 함께 만들 것
- **익명 INSERT 허용은 `inquiries`와 `funnel_events`에만** — 폼 제출/클릭 추적 때문
- **서버 요청마다 `SET LOCAL app.tenant_id = '...'`** 필수 — 그래야 RLS 정책이 작동
- **service_role 키는 cron/admin API 서버 측만 사용** — 클라이언트 노출 시 RLS 우회 가능

## 6. seed 데이터 주입 (선택)

```bash
npm run seed
```

`mock-data.ts`의 FAQ/Publication을 `upsert`함. env에 Supabase 키가 없으면 dry-run.
