-- ============================================================
-- Migration 017 — 파트너 글 3편 본문에 일러스트 2장씩 추가 (총 5장 정책)
-- 2026-05-28
--
-- 대상:
--   id 41 (TETE 스마일라식) — 현재 cover + 본문 2 → cover + 본문 4
--   id 42 (BGN 잠실 라식) — 현재 cover + 본문 2 → cover + 본문 4
--   id 43 (Mourim FUE) — 현재 cover + 본문 2 → cover + 본문 4
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TETE 스마일라식 (id 41) — figure 2 추가
-- ─────────────────────────────────────────────────────────────

-- figure 추가 1 — 🩺 적합한가요? 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🩺 스마일라식, 모두에게 적합한가요?</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20friendly%20Korean%20ophthalmologist%20consulting%20with%20patient%20about%20surgery%20suitability%2C%20modern%20clinic%2C%20warm%20pastel%20blue%20lighting%2C%20expressive%20concern%20care%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528221&nologo=true&enhance=true" alt="스마일라식 시술 적합성 상담" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">시술 적합성 사전 상담 — TETE 강남 안과</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🩺 스마일라식, 모두에게 적합한가요?</h2>'
), updated_at = now() WHERE id = 41;

-- figure 추가 2 — 💬 FAQ 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20patient%20asking%20questions%20to%20friendly%20ophthalmologist%2C%20modern%20consultation%20room%2C%20pastel%20blue%20palette%2C%20warm%20natural%20lighting%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528222&nologo=true&enhance=true" alt="시술 후 자주 묻는 질문 상담" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">시술 후 자주 묻는 질문 — TETE 강남 안과</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>'
), updated_at = now() WHERE id = 41;


-- ─────────────────────────────────────────────────────────────
-- BGN 잠실 라식 (id 42) — figure 2 추가
-- ─────────────────────────────────────────────────────────────

-- figure 추가 1 — 💬 FAQ 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20patient%20consultation%20with%20eye%20surgeon%20about%20LASIK%20questions%2C%20modern%20clinic%2C%20pastel%20blue%20palette%2C%20friendly%20atmosphere%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528223&nologo=true&enhance=true" alt="라식 자주 묻는 질문 상담" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">라식 시술 자주 묻는 질문 — BGN 밝은눈안과 잠실</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>'
), updated_at = now() WHERE id = 42;

-- figure 추가 2 — 🎯 마무리하며 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 마무리하며</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20happy%20Korean%20patient%20with%20clear%20vision%20smiling%20outdoor%2C%20no%20glasses%2C%20warm%20sunlight%2C%20pastel%20blue%20accents%2C%20freedom%20feeling%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528224&nologo=true&enhance=true" alt="라식 시술 후 명확한 시력의 일상" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">라식 후 명확한 시력의 일상</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 마무리하며</h2>'
), updated_at = now() WHERE id = 42;


-- ─────────────────────────────────────────────────────────────
-- Mourim FUE (id 43) — figure 2 추가
-- ─────────────────────────────────────────────────────────────

-- figure 추가 1 — 💉 시술 단계 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💉 FUE 모발이식 시술 단계</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20doctor%20designing%20natural%20hairline%20with%20pen%20on%20patient%27s%20scalp%2C%20modern%20hair%20clinic%2C%20pastel%20teal%20accents%2C%20warm%20focused%20lighting%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528225&nologo=true&enhance=true" alt="FUE 모발이식 헤어라인 디자인" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">헤어라인 디자인 단계 — 모우림 모발이식의원</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💉 FUE 모발이식 시술 단계</h2>'
), updated_at = now() WHERE id = 43;

-- figure 추가 2 — 💬 FAQ 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20patient%20asking%20questions%20to%20hair%20transplant%20doctor%20at%20consultation%20desk%2C%20modern%20clinic%2C%20pastel%20teal%20palette%2C%20warm%20friendly%20atmosphere%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528226&nologo=true&enhance=true" alt="FUE 모발이식 자주 묻는 질문 상담" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">FUE 모발이식 자주 묻는 질문</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>'
), updated_at = now() WHERE id = 43;


-- 검증
SELECT id, title,
  (length(body) - length(replace(body, '<figure', ''))) / length('<figure') AS body_figure_count,
  cover_image_url IS NOT NULL AS has_cover,
  length(body) AS body_len
FROM generated_contents
WHERE id IN (41, 42, 43, 73, 74, 75)
ORDER BY id;
