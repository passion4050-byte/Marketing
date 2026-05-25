-- ============================================================
-- Migration 007 — users + audit_logs 테이블 신규 생성
-- 2026-05-26
--
-- 설계:
--   users 는 admin 콘솔의 사용자 메타 (초대/role/status). 실제 로그인은
--   기존 ADMIN_PASSWORD + cookie 방식 유지. users 는 권한 관리 + 향후
--   audit 기록 시 actor 식별용.
--
--   audit_logs 는 admin 액션 이력. action hook 은 별도 라운드. 이번엔
--   빈 테이블만 만들고 조회 UI 부터.
-- ============================================================

-- 1) users
create table if not exists users (
  id            serial primary key,
  email         varchar(255) not null unique,
  name          varchar(255) not null,
  role          text not null default 'viewer'
                check (role in ('owner','admin','editor','viewer')),
  status        text not null default 'invited'
                check (status in ('active','invited','suspended')),
  invited_by    integer references users(id),
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists users_role_idx on users(role);
create index if not exists users_status_idx on users(status);

-- owner 한 명 seed (passion4050@gmail.com)
insert into users (email, name, role, status)
values ('passion4050@gmail.com', '재건', 'owner', 'active')
on conflict (email) do nothing;

-- 2) audit_logs
create table if not exists audit_logs (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor       varchar(255) not null,
  action      varchar(64)  not null,
  resource    varchar(255),
  diff        jsonb
);

create index if not exists audit_logs_at_idx       on audit_logs(at desc);
create index if not exists audit_logs_action_idx   on audit_logs(action);
create index if not exists audit_logs_actor_idx    on audit_logs(actor);
create index if not exists audit_logs_resource_idx on audit_logs(resource);

-- 검증
select 'users' as t, count(*) from users
union all
select 'audit_logs' as t, count(*) from audit_logs;
