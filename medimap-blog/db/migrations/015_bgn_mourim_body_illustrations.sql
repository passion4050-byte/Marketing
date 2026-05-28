-- ============================================================
-- Migration 015 — BGN + Mourim 글 본문에 일러스트 2장씩 추가
-- 2026-05-28
--
-- 배경:
--   Migration 013 에서 BGN/Mourim 본문 Round 15 v3 스타일 재작성 시 텍스트만 작성.
--   TETE 글 (id 41) 처럼 본문 중간에 일러스트 figure 2장 들어가야 사용자 가이드 충족.
--
-- 적용:
--   id 42 (BGN 잠실 라식) — 시술 일러스트 + 정밀 검사 일러스트
--   id 43 (Mourim FUE) — 모낭 채취 일러스트 + 회복 일러스트
--
-- 위치:
--   각 글의 첫 번째 H2 와 두 번째 H2 사이, 그리고 세 번째 H2 와 네 번째 H2 사이
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- BGN 잠실 라식 (id 42) — figure 2장 삽입
-- ─────────────────────────────────────────────────────────────
UPDATE generated_contents
SET
  body = REPLACE(
    body,
    '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">⚖️ 라식 · 라섹 · 스마일라식, 어떻게 다른가요?</h2>',
    '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%20Disney%203D%20animation%20style%2C%20friendly%20Korean%20ophthalmologist%20performing%20LASIK%20laser%20eye%20surgery%2C%20modern%20ophthalmology%20clinic%2C%20warm%20cinematic%20lighting%2C%20pastel%20blue%20and%20white%20palette%2C%20expressive%20friendly%20emotions%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528001&nologo=true&enhance=true" alt="라식 시술 진행 단계 — 메디맵 파트너 BGN 밝은눈안과 잠실" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">라식 시술 진행 단계 — 메디맵 파트너 BGN 밝은눈안과 잠실</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">⚖️ 라식 · 라섹 · 스마일라식, 어떻게 다른가요?</h2>'
  ),
  updated_at = now()
WHERE id = 42;

UPDATE generated_contents
SET
  body = REPLACE(
    body,
    '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🚫 라식이 권장되지 않는 경우</h2>',
    '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%20style%2C%20friendly%20Korean%20optometrist%20measuring%20corneal%20thickness%20with%20modern%20pachymetry%20device%2C%20Korean%20patient%20smiling%2C%20warm%20clinic%20lighting%2C%20pastel%20blue%20accents%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528002&nologo=true&enhance=true" alt="라식 사전 정밀 검사 — 각막 두께 측정 단계" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">라식 사전 정밀 검사 — 각막 두께 측정 단계</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🚫 라식이 권장되지 않는 경우</h2>'
  ),
  updated_at = now()
WHERE id = 42;


-- ─────────────────────────────────────────────────────────────
-- Mourim FUE (id 43) — figure 2장 삽입
-- ─────────────────────────────────────────────────────────────
UPDATE generated_contents
SET
  body = REPLACE(
    body,
    '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">⚖️ FUT(절개식) vs FUE(비절개식) 비교</h2>',
    '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%20Disney%203D%20animation%20style%2C%20friendly%20Korean%20doctor%20performing%20FUE%20hair%20transplant%20with%20small%20precision%20punch%20tool%2C%20modern%20hair%20clinic%2C%20warm%20cinematic%20lighting%2C%20pastel%20teal%20and%20white%20palette%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528003&nologo=true&enhance=true" alt="FUE 비절개식 모낭 채취 단계 — 메디맵 파트너 모우림 모발이식의원" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">FUE 비절개식 모낭 채취 단계 — 메디맵 파트너 모우림 모발이식의원</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">⚖️ FUT(절개식) vs FUE(비절개식) 비교</h2>'
  ),
  updated_at = now()
WHERE id = 43;

UPDATE generated_contents
SET
  body = REPLACE(
    body,
    '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🌱 회복 기간과 주의사항</h2>',
    '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%20style%2C%20happy%20Korean%20man%20smiling%20with%20natural%20healthy%20hairline%20after%20FUE%20hair%20transplant%20recovery%2C%20modern%20clinic%20background%2C%20warm%20natural%20lighting%2C%20pastel%20teal%20accents%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528004&nologo=true&enhance=true" alt="FUE 모발이식 회복 후 자연스러운 헤어라인" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">FUE 모발이식 회복 후 자연스러운 헤어라인 — 12개월차</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🌱 회복 기간과 주의사항</h2>'
  ),
  updated_at = now()
WHERE id = 43;


-- 검증 — 각 글의 figure 개수
SELECT
  id,
  title,
  (length(body) - length(replace(body, '<figure', ''))) / length('<figure') AS figure_count_in_body,
  cover_image_url IS NOT NULL AS has_cover,
  length(body) AS body_len
FROM generated_contents
WHERE id IN (41, 42, 43)
ORDER BY id;
