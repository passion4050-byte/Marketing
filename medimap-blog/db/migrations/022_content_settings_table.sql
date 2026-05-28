-- ============================================================
-- Migration 022 — content_settings 테이블 (자동 발행 정책)
-- 2026-05-28
--
-- 사용자 결정 (Phase 3 — Round 22):
--   - 글 톤: 친근체, 자연스러운 느낌
--   - 글 길이: 3000~5000자
--   - CTA: 메디맵 카카오 채널
--   - 키워드 시드: 자동
--   - 의료법 disclaimer: 현재 amber 박스 v3 스타일 유지
--
-- 위 결정 사항을 DB key-value 로 저장 → generator.py + image_picker.py 가 매 발행 시 읽어 prompt 빌드.
-- /admin/content-settings 페이지에서 운영자가 수정 가능.
-- ============================================================

CREATE TABLE IF NOT EXISTS content_settings (
  id           SERIAL PRIMARY KEY,
  setting_key  VARCHAR(64) UNIQUE NOT NULL,
  setting_value TEXT,
  description  TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_settings_key ON content_settings(setting_key);

-- 초기 설정 시드 (사용자 결정 사항)
INSERT INTO content_settings (setting_key, setting_value, description) VALUES
  ('tone',
   'friendly_natural',
   '글 어조 — friendly_natural (친근체 자연스러운 느낌) / formal (격식체) / casual (구어체)'),

  ('length_min',
   '3000',
   '최소 글 길이 (한글 자 기준)'),

  ('length_max',
   '5000',
   '최대 글 길이 (한글 자 기준)'),

  ('cta_target',
   'medimap_kakao',
   'CTA 연락 채널 — medimap_kakao (메디맵 카카오) / partner_direct (병원 직접 연락처)'),

  ('keyword_seed_mode',
   'auto',
   '키워드 시드 모드 — auto (자동 생성) / manual (수동 입력)'),

  ('disclaimer_style',
   'amber_box_v3',
   '의료법 disclaimer 스타일 — amber_box_v3 (현재 v3 amber 박스) / plain (단순 텍스트)'),

  ('image_count_total',
   '5',
   '글 1편 당 일러스트 총 개수 (cover 1 + 본문 N)'),

  ('image_style',
   'pixar_3d',
   '일러스트 스타일 — pixar_3d (Pixar Disney 3D animation) / watercolor / editorial / flat_design'),

  ('image_realistic_only_for',
   'clinic_interior',
   '실사진 톤 허용 카테고리 — clinic_interior (병원 인테리어만) / none (모두 일러스트)'),

  ('publish_schedule',
   '23:00_utc_daily',
   '자동 발행 cron 시각 — 23:00 UTC daily = 매일 8AM KST'),

  ('content_pattern_pool',
   'staged_guide,comparison,case_study,faq_heavy,checklist,data_driven',
   '글 구조 패턴 풀 (random.choice rotate)'),

  ('lead_pattern_pool',
   'question,stat,case,doctor_quote',
   '리드 문장 패턴 풀 (random.choice rotate)')

ON CONFLICT (setting_key) DO NOTHING;

-- 검증
SELECT setting_key, setting_value, description FROM content_settings ORDER BY id;
