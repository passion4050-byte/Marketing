-- =============================================================
-- MEDIMAP GEO — 0001 initial schema
-- =============================================================
-- 원칙
--   1. Multi-tenant from day 1 — 모든 도메인 테이블에 tenant_id FK
--   2. RLS 정책 의무화 — 운영 전 모든 테이블 RLS enable + 정책 명시
--   3. UUID PK + created_at/updated_at trigger
--   4. 외래키 ON DELETE CASCADE (tenant 삭제 시 동반 삭제)
--   5. JSONB 컬럼은 typesafe 접근을 위해 별도 컬럼 분리 우선
-- =============================================================

-- 확장
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================
-- 공통 helper
-- =============================================================

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- per-request tenant 세팅 (서버 측에서 SET LOCAL app.tenant_id = '...')
create or replace function current_tenant_id() returns uuid as $$
begin
  return nullif(current_setting('app.tenant_id', true), '')::uuid;
end;
$$ language plpgsql stable;

-- =============================================================
-- 1. tenants — 병원(클라이언트) 계정
-- =============================================================

create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,                  -- 예: 'bgn-jamsil'
  name text not null,                         -- 예: 'BGN 밝은눈안과'
  region text,
  specialty text,
  tagline text,
  password_hash text,
  plan text not null default 'starter',       -- starter / pro / enterprise
  max_daily_usd numeric(10, 2) not null default 5.00,
  max_content_gen_per_day integer not null default 20,
  auto_publish boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create trigger trg_tenants_updated_at before update on tenants
  for each row execute function set_updated_at();

alter table tenants enable row level security;

create policy tenant_self_read on tenants
  for select using (id = current_tenant_id());

-- =============================================================
-- 2. doctors — 의료진 (Schema.org Physician 매핑)
-- =============================================================

create table if not exists doctors (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  specialty text,
  history text,                               -- 학력·경력
  certifications text[] default '{}',
  years_of_experience integer,
  alumni_of text,
  member_of text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index idx_doctors_tenant on doctors(tenant_id);
create trigger trg_doctors_updated_at before update on doctors
  for each row execute function set_updated_at();

alter table doctors enable row level security;
create policy doctors_tenant on doctors
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 3. equipments — 의료 장비 (Schema.org MedicalDevice)
-- =============================================================

create table if not exists equipments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  manufacturer text,
  purpose text,
  adopted_at date,
  applied_procedures text[] default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index idx_equipments_tenant on equipments(tenant_id);
create trigger trg_equipments_updated_at before update on equipments
  for each row execute function set_updated_at();
alter table equipments enable row level security;
create policy equipments_tenant on equipments
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 4. offers — 이벤트·가격 (Schema.org Offer)
-- =============================================================

create table if not exists offers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  valid_from date,
  valid_through date,
  price numeric(12, 0),                       -- 원 단위 (KRW)
  price_currency text not null default 'KRW',
  notice text,                                -- 주의/조건
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index idx_offers_tenant on offers(tenant_id);
create index idx_offers_valid on offers(tenant_id, valid_through);
create trigger trg_offers_updated_at before update on offers
  for each row execute function set_updated_at();
alter table offers enable row level security;
create policy offers_tenant on offers
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 5. faqs — FAQ (Schema.org FAQPage)
-- =============================================================

create type faq_status as enum ('draft', 'review', 'published', 'archived');
create type llm_source as enum ('chatgpt', 'claude', 'gemini', 'perplexity', 'manual');

create table if not exists faqs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  category text,
  question text not null,
  answer text not null,
  keywords text[] default '{}',
  status faq_status not null default 'draft',
  generated_by llm_source not null default 'manual',
  schema_ready boolean not null default false,
  compliance_status text not null default 'pending',  -- pending/pass/warn/fail
  compliance_reasons text[] default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index idx_faqs_tenant_status on faqs(tenant_id, status);
create index idx_faqs_category on faqs(tenant_id, category);
create trigger trg_faqs_updated_at before update on faqs
  for each row execute function set_updated_at();
alter table faqs enable row level security;
create policy faqs_tenant on faqs
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 6. content_topics — 블로그 소재 (1소재 = 5글)
-- =============================================================

create table if not exists content_topics (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  label text not null,                        -- 예: '잠실 라섹 회복 가이드'
  badge text,                                 -- 수술정보 / 비용 / 후기 ...
  brief text,
  source_keywords text[] default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index idx_content_topics_tenant on content_topics(tenant_id);
create trigger trg_content_topics_updated_at before update on content_topics
  for each row execute function set_updated_at();
alter table content_topics enable row level security;
create policy content_topics_tenant on content_topics
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 7. blog_posts — 블로그 글 (소재 1 → 5 변형)
-- =============================================================

create type post_format as enum ('info', 'review', 'qna', 'comparison', 'checklist');

create table if not exists blog_posts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  topic_id uuid not null references content_topics(id) on delete cascade,
  variant_no integer not null,
  format post_format not null,
  format_label text not null,
  cue text,
  status faq_status not null default 'draft',
  title text not null,
  lead text,
  body text,
  bullets text[] default '{}',
  keywords text[] default '{}',
  read_minutes integer,
  char_count integer,
  generated_by llm_source not null default 'manual',
  compliance_status text not null default 'pending',
  compliance_reasons text[] default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(topic_id, variant_no)
);
create index idx_blog_posts_tenant_status on blog_posts(tenant_id, status);
create index idx_blog_posts_topic on blog_posts(topic_id);
create trigger trg_blog_posts_updated_at before update on blog_posts
  for each row execute function set_updated_at();
alter table blog_posts enable row level security;
create policy blog_posts_tenant on blog_posts
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 8. video_scripts — 영상 스크립트
-- =============================================================

create type video_channel as enum ('shorts', 'reels', 'youtube');

create table if not exists video_scripts (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  hook text,
  beats jsonb not null default '[]'::jsonb,    -- [{start, line}]
  cta text,
  duration text,                              -- "00:45"
  channel video_channel not null,
  status faq_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index idx_video_scripts_tenant on video_scripts(tenant_id);
create trigger trg_video_scripts_updated_at before update on video_scripts
  for each row execute function set_updated_at();
alter table video_scripts enable row level security;
create policy video_scripts_tenant on video_scripts
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 9. publications — 외부 채널 발행 트래킹
-- =============================================================

create type publication_channel as enum ('blog', 'naver', 'instagram', 'video', 'faq');

create table if not exists publications (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  channel publication_channel not null,
  url text not null,
  title text not null,
  blog_post_id uuid references blog_posts(id) on delete set null,
  faq_id uuid references faqs(id) on delete set null,
  video_id uuid references video_scripts(id) on delete set null,
  published_at timestamptz not null default timezone('utc', now()),
  pageviews_7d integer not null default 0,
  inquiries_attributed integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index idx_publications_tenant on publications(tenant_id, channel);
create index idx_publications_url on publications(url);
create trigger trg_publications_updated_at before update on publications
  for each row execute function set_updated_at();
alter table publications enable row level security;
create policy publications_tenant on publications
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 10. llm_responses — 4-엔진 응답 수집
-- =============================================================

create type engine_kind as enum ('chatgpt', 'claude', 'gemini', 'perplexity');
create type sentiment_kind as enum ('positive', 'neutral', 'negative');

create table if not exists llm_responses (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  engine engine_kind not null,
  model_label text,
  query text not null,
  response text not null,
  cited_urls text[] default '{}',
  sentiment sentiment_kind,
  accuracy_score integer,
  tone_score integer,
  captured_at timestamptz not null default timezone('utc', now()),
  cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);
create index idx_llm_responses_tenant on llm_responses(tenant_id, engine, captured_at desc);
alter table llm_responses enable row level security;
create policy llm_responses_tenant on llm_responses
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 11. mentions — LLM 응답에서 추출된 멘션
-- =============================================================

create table if not exists mentions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  response_id uuid not null references llm_responses(id) on delete cascade,
  entity_label text not null,                 -- 'BGN 밝은눈안과' 등
  entity_kind text,                           -- 'self' / 'competitor'
  sentiment sentiment_kind,
  occurrence_count integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);
create index idx_mentions_tenant on mentions(tenant_id, entity_kind);
alter table mentions enable row level security;
create policy mentions_tenant on mentions
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 12. short_links — 단축링크 + UTM
-- =============================================================

create table if not exists short_links (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  slug text not null unique,                  -- /r/[slug]
  destination_url text not null,              -- 최종 URL (UTM 포함)
  publication_id uuid references publications(id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  click_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);
create index idx_short_links_tenant on short_links(tenant_id);
alter table short_links enable row level security;
create policy short_links_tenant on short_links
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 13. inquiries — 문의 폼 제출
-- =============================================================

create type inquiry_status as enum ('new', 'contacted', 'qualified', 'closed_won', 'closed_lost');

create table if not exists inquiries (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text,
  phone text,
  email text,
  message text,
  procedure_interest text,
  status inquiry_status not null default 'new',
  source text,                                -- 'website' / 'naver' / ...
  -- attribution
  last_click_short_link_id uuid references short_links(id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index idx_inquiries_tenant_status on inquiries(tenant_id, status);
create trigger trg_inquiries_updated_at before update on inquiries
  for each row execute function set_updated_at();
alter table inquiries enable row level security;
create policy inquiries_tenant on inquiries
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- 익명 INSERT 허용 (폼 제출은 인증 없이 가능해야 함)
create policy inquiries_anon_insert on inquiries
  for insert with check (true);

-- =============================================================
-- 14. funnel_events — 클릭 / 노출 / 전환 이벤트
-- =============================================================

create type funnel_event_kind as enum ('impression', 'click', 'inquiry_submit', 'inquiry_qualified', 'inquiry_won');

create table if not exists funnel_events (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  kind funnel_event_kind not null,
  short_link_id uuid references short_links(id) on delete set null,
  publication_id uuid references publications(id) on delete set null,
  inquiry_id uuid references inquiries(id) on delete set null,
  visitor_id text,                            -- 1st-party 쿠키 ID
  meta jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now())
);
create index idx_funnel_events_tenant_time on funnel_events(tenant_id, kind, occurred_at desc);
create index idx_funnel_events_visitor on funnel_events(visitor_id);
alter table funnel_events enable row level security;
create policy funnel_events_tenant on funnel_events
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy funnel_events_anon_insert on funnel_events
  for insert with check (true);

-- =============================================================
-- 15. compliance_lints — 의료법 린터 결과 로그
-- =============================================================

create table if not exists compliance_lints (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  target_type text not null,                  -- 'blog_post' / 'faq' / 'video_script'
  target_id uuid not null,
  status text not null,                       -- pass / warn / fail
  violations jsonb not null default '[]'::jsonb,
  lint_version text,
  lint_at timestamptz not null default timezone('utc', now())
);
create index idx_compliance_lints_target on compliance_lints(target_type, target_id);
alter table compliance_lints enable row level security;
create policy compliance_lints_tenant on compliance_lints
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 16. llm_call_logs — 비용 가드레일
-- =============================================================

create table if not exists llm_call_logs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  engine engine_kind not null,
  model text,
  prompt_tokens integer,
  completion_tokens integer,
  cost_usd numeric(10, 6) not null default 0,
  duration_ms integer,
  status text not null default 'ok',           -- ok / error / blocked
  error text,
  called_at timestamptz not null default timezone('utc', now())
);
create index idx_llm_call_logs_tenant_day on llm_call_logs(tenant_id, called_at desc);
alter table llm_call_logs enable row level security;
create policy llm_call_logs_tenant on llm_call_logs
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- =============================================================
-- 일일 비용 합산 뷰 — 가드레일 체크용
-- =============================================================

create or replace view v_daily_llm_cost as
select
  tenant_id,
  date_trunc('day', called_at at time zone 'Asia/Seoul')::date as day_kst,
  sum(cost_usd) as cost_usd,
  count(*) as call_count
from llm_call_logs
group by 1, 2;

-- =============================================================
-- 시드 — 데모 tenant
-- =============================================================

insert into tenants (id, slug, name, region, specialty, tagline, plan)
values (
  '00000000-0000-0000-0000-000000000001',
  'bgn-jamsil',
  'BGN 밝은눈안과',
  '잠실',
  '안과',
  'AI 가시성 관리',
  'pro'
)
on conflict (slug) do nothing;
