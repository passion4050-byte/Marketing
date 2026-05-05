-- medimap-blog 폼 제출 저장소 (Phase 10 — 어드민 페이지)
-- 적용 위치: Supabase 콘솔 → SQL Editor → New query → 실행
-- 또는 psql "$DATABASE_URL" -f db/migrations/001_medimap_inquiries.sql
--
-- 폼 3종을 단일 테이블로 수렴:
--   form_type='partnership'  → /about 비즈니스 제휴 문의
--   form_type='listing'      → /about 병원 입점 문의
--   form_type='contact'      → /contact 일반 제휴 문의
--
-- status 라이프사이클: new → in_progress → replied → archived

CREATE TABLE IF NOT EXISTS medimap_inquiries (
  id           BIGSERIAL PRIMARY KEY,
  form_type    TEXT NOT NULL CHECK (form_type IN ('partnership', 'listing', 'contact')),
  org_name     TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'in_progress', 'replied', 'archived')),
  notes        TEXT,
  -- 익명화 메타데이터 (개인정보 최소화)
  ip_hash      TEXT,
  user_agent   TEXT,
  referer      TEXT,
  -- 타임스탬프
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medimap_inquiries_created
  ON medimap_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medimap_inquiries_form_type
  ON medimap_inquiries (form_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medimap_inquiries_status
  ON medimap_inquiries (status, created_at DESC);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION medimap_inquiries_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medimap_inquiries_updated ON medimap_inquiries;
CREATE TRIGGER trg_medimap_inquiries_updated
  BEFORE UPDATE ON medimap_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION medimap_inquiries_set_updated_at();

-- (선택) Row Level Security — Supabase RLS 켜 둔 환경에서 의도적 차단.
-- API 는 service-role/direct connection 사용하므로 RLS 영향 없음.
-- ALTER TABLE medimap_inquiries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE medimap_inquiries IS 'medimap-blog 어드민이 조회하는 폼 제출 저장소.';
COMMENT ON COLUMN medimap_inquiries.form_type IS 'partnership | listing | contact — 어느 폼에서 왔는지';
COMMENT ON COLUMN medimap_inquiries.status     IS 'new | in_progress | replied | archived';
