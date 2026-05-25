-- =====================================================
-- MEDIMAP GEO Admin — 다중 사용자 + Integration 토큰
-- 2026-05-25
-- 운영팀 / dev팀이 Supabase SQL Editor 에서 실행.
-- =====================================================

-- 1) admin_users — 메디맵 직원 + 클라이언트 병원 직원
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  status text not null default 'invited' check (status in ('active', 'invited', 'suspended')),
  tenant_id uuid references tenants(id), -- nullable: 메디맵 직원은 null, 병원 직원은 tenant 한정
  password_hash text, -- bcrypt; OAuth 사용 시 nullable
  invite_token text,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists admin_users_email_idx on admin_users(email);
create index if not exists admin_users_tenant_idx on admin_users(tenant_id);

-- 2) admin_sessions — JWT/cookie session
create table if not exists admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references admin_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  ip_address inet,
  user_agent text
);
create index if not exists admin_sessions_user_idx on admin_sessions(user_id);
create index if not exists admin_sessions_expires_idx on admin_sessions(expires_at);

-- 3) audit_log — 모든 mutation 기록 (의료법 분쟁 대비)
create table if not exists audit_log (
  id bigserial primary key,
  actor_user_id uuid references admin_users(id),
  actor_email text,
  action text not null,
  resource_type text not null,
  resource_id text,
  diff jsonb,
  ip_address inet,
  at timestamptz default now()
);
create index if not exists audit_log_actor_idx on audit_log(actor_user_id, at desc);
create index if not exists audit_log_resource_idx on audit_log(resource_type, resource_id);

-- 4) tenant_integrations — YouTube / Slack / 카카오 OAuth tokens (테넌트별)
create table if not exists tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  provider text not null check (provider in ('youtube', 'instagram', 'slack', 'kakao')),
  access_token text, -- 운영: pgcrypto 로 암호화 (PGP_SYM_ENCRYPT)
  refresh_token text,
  expires_at timestamptz,
  scope text,
  channel_id text, -- YouTube channelId, Slack channelId 등
  connected_at timestamptz default now(),
  unique(tenant_id, provider)
);
create index if not exists tenant_integrations_tenant_idx on tenant_integrations(tenant_id);

-- 5) ab_tests — A/B 테스트
create table if not exists ab_tests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  keyword text not null,
  hypothesis text,
  variant_a jsonb not null, -- { title, cta, content_id }
  variant_b jsonb not null,
  metric_a jsonb default '{"mentions":0,"clicks":0,"inquiries":0}'::jsonb,
  metric_b jsonb default '{"mentions":0,"clicks":0,"inquiries":0}'::jsonb,
  winner text check (winner in ('A', 'B', 'tie')),
  status text default 'running' check (status in ('running', 'concluded', 'paused')),
  started_at timestamptz default now(),
  concluded_at timestamptz
);

-- 6) RLS — 운영팀만 자기 데이터 접근
alter table admin_users enable row level security;
alter table admin_sessions enable row level security;
alter table tenant_integrations enable row level security;
alter table ab_tests enable row level security;

-- (실 정책은 운영팀이 user → tenant 매핑 확정 후 작성)

-- 7) Seed: owner 계정 (재건)
-- insert into admin_users (email, name, role, status, password_hash)
-- values ('passion4050@gmail.com', '재건', 'owner', 'active', '<bcrypt hash>');
