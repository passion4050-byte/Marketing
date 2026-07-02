-- Round 110-B/C (2026-07-02) — 크롤러 로그 + 카카오톡 유입 트래킹 테이블.

-- ============================================================
-- 1. crawler_hits — AI 크롤러(GPTBot/ClaudeBot/PerplexityBot 등) 방문 로그
-- ============================================================
CREATE TABLE IF NOT EXISTS crawler_hits (
  id BIGSERIAL PRIMARY KEY,
  bot_name TEXT NOT NULL,              -- 'gptbot' | 'claudebot' | 'perplexitybot' | 'ccbot' | 'oai-searchbot' | 'google-extended' | 'bytespider' | 'meta-externalagent' | 'unknown'
  user_agent TEXT,
  path TEXT NOT NULL,
  referer TEXT,
  country TEXT,
  status_code INTEGER,                 -- 실제 응답 코드 (기록 시점엔 항상 200 가정, middleware 에서 채움)
  hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawler_hits_hit_at ON crawler_hits (hit_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawler_hits_bot ON crawler_hits (bot_name, hit_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawler_hits_path ON crawler_hits (path);

COMMENT ON TABLE crawler_hits IS 'AI 크롤러 방문 로그 — middleware 에서 fire-and-forget 로 insert. GPTBot/ClaudeBot 등 인용 검색봇 파악 용도.';

-- ============================================================
-- 2. kakao_referrals — UTM=kakao 유입 클릭 트래킹
-- ============================================================
CREATE TABLE IF NOT EXISTS kakao_referrals (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,                 -- 'kakao_cta_click' | 'kakao_channel_click' | 'kakao_beacon'
  page_path TEXT,                      -- 클릭 시점의 페이지 경로
  cta_label TEXT,                      -- '카카오톡 상담', '문의' 등
  utm_source TEXT DEFAULT 'kakao',
  utm_medium TEXT,                     -- 'cta' | 'channel' | 'floating'
  utm_campaign TEXT,
  tenant_id INTEGER,                   -- 파트너 매칭 (nullable)
  ip_hash TEXT,
  user_agent TEXT,
  referer TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kakao_referrals_clicked_at ON kakao_referrals (clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_kakao_referrals_event ON kakao_referrals (event, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_kakao_referrals_tenant ON kakao_referrals (tenant_id, clicked_at DESC);

COMMENT ON TABLE kakao_referrals IS 'UTM 카카오톡 유입 로그 — CTA 버튼 클릭 시 클라이언트가 /api/track/kakao 로 beacon 전송.';
