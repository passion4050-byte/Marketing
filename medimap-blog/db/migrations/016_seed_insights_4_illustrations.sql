-- ============================================================
-- Migration 016 — 자사 인사이트 시드 3편 본문에 일러스트 4장씩 추가
-- 2026-05-28
--
-- 사용자 정책: 모든 발행 콘텐츠 일러스트 5장 이상 (cover 1 + 본문 4+)
-- 대상:
--   id 73 — AI 검색 시대, 병원 콘텐츠 마케팅이 달라져야 하는 이유 (cover만 → cover + 4)
--   id 74 — ChatGPT 가 환자에게 추천하는 병원은 어떻게 결정될까 (cover만 → cover + 4)
--   id 75 — 예약률 30% 를 늘린 강남 안과의 콘텐츠 운영 노하우 (cover만 → cover + 4)
--
-- 일러스트 스타일: Pixar Disney 3D animation, 마케팅/의료 맥락
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 시드 1 (id 73) — AI 검색 시대 콘텐츠 마케팅
-- 본문 H2 4개 앞에 figure 4장 삽입
-- ─────────────────────────────────────────────────────────────

-- figure 1 — 📊 데이터로 보는 환자 유입 채널 변화 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em; letter-spacing: -0.01em;">📊 데이터로 보는 환자 유입 채널 변화</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%20Disney%203D%20animation%20style%2C%20marketing%20analyst%20studying%20channel%20attribution%20charts%20on%20laptop%2C%20modern%20office%2C%20warm%20natural%20lighting%2C%20pastel%20blue%20accents%2C%20friendly%20expression%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528201&nologo=true&enhance=true" alt="환자 유입 채널 데이터 분석" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">환자 유입 채널 데이터 분석 — 2024 vs 2026</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em; letter-spacing: -0.01em;">📊 데이터로 보는 환자 유입 채널 변화</h2>'
), updated_at = now() WHERE id = 73;

-- figure 2 — 🎯 AI 검색 노출 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 AI 검색에 노출되려면 무엇이 달라져야 하나요?</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%20style%2C%20smartphone%20screen%20showing%20AI%20chat%20interface%20with%20hospital%20recommendation%2C%20friendly%20Korean%20user%20looking%20curious%2C%20warm%20lighting%2C%20pastel%20blue%20palette%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528202&nologo=true&enhance=true" alt="환자가 AI 에 병원 추천 질문하는 모습" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">환자가 AI 검색에 병원을 묻는 모습</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 AI 검색에 노출되려면 무엇이 달라져야 하나요?</h2>'
), updated_at = now() WHERE id = 73;

-- figure 3 — 💡 실제 사례 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💡 실제 사례 — 강남 안과 1개월 운영 결과</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20hospital%20marketing%20success%20chart%20with%20rising%20growth%20arrow%2C%20Korean%20clinic%20staff%20celebrating%2C%20warm%20bright%20lighting%2C%20pastel%20blue%20accents%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528203&nologo=true&enhance=true" alt="강남 안과 1개월 운영 성과" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">강남 안과 1개월 콘텐츠 운영 성과 — 메디맵 GEO/AEO 사례</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💡 실제 사례 — 강남 안과 1개월 운영 결과</h2>'
), updated_at = now() WHERE id = 73;

-- figure 4 — 💬 FAQ 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20friendly%20Korean%20marketing%20strategist%20answering%20questions%20at%20whiteboard%2C%20modern%20office%2C%20pastel%20blue%20palette%2C%20warm%20expression%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528204&nologo=true&enhance=true" alt="메디맵 마케팅 컨설팅 — FAQ" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">자주 묻는 질문 — 메디맵 마케팅 컨설팅</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>'
), updated_at = now() WHERE id = 73;


-- ─────────────────────────────────────────────────────────────
-- 시드 2 (id 74) — ChatGPT 병원 추천 알고리즘
-- ─────────────────────────────────────────────────────────────

-- figure 1 — 🤖 AI 엔진 메커니즘 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🤖 AI 엔진의 병원 추천 메커니즘</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20cute%20friendly%20AI%20robot%20analyzing%20hospital%20data%20on%20floating%20holographic%20screens%2C%20modern%20tech%20office%2C%20pastel%20violet%20and%20blue%20palette%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528205&nologo=true&enhance=true" alt="AI 엔진의 병원 추천 메커니즘 분석" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">AI 엔진의 병원 추천 신호 분석</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🤖 AI 엔진의 병원 추천 메커니즘</h2>'
), updated_at = now() WHERE id = 74;

-- figure 2 — 📈 4개 AI 엔진 패턴 차이 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📈 4개 AI 엔진의 추천 패턴 차이</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20four%20cute%20friendly%20AI%20robots%20comparing%20notes%20on%20holographic%20displays%2C%20modern%20laboratory%2C%20pastel%20violet%20and%20teal%20accents%2C%20warm%20lighting%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528206&nologo=true&enhance=true" alt="ChatGPT, Claude, Gemini, Perplexity 4 엔진 비교" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">4개 AI 엔진의 추천 패턴 비교</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📈 4개 AI 엔진의 추천 패턴 차이</h2>'
), updated_at = now() WHERE id = 74;

-- figure 3 — 💬 FAQ 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20marketing%20consultant%20answering%20client%20questions%20about%20AI%20search%2C%20laptop%20on%20desk%2C%20modern%20clean%20office%2C%20pastel%20violet%20palette%2C%20warm%20expression%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528207&nologo=true&enhance=true" alt="AI 검색 마케팅 자주 묻는 질문" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">AI 검색 마케팅 — FAQ</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>'
), updated_at = now() WHERE id = 74;

-- figure 4 — 🎯 마무리하며 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 마무리하며</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20futuristic%20healthcare%20marketing%20vision%20with%20doctor%20and%20AI%20harmony%2C%20warm%20cinematic%20lighting%2C%20pastel%20violet%20and%20blue%20palette%2C%20hopeful%20atmosphere%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528208&nologo=true&enhance=true" alt="AI 와 의료의 미래" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">AI 와 의료의 새로운 협업 — 메디맵</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 마무리하며</h2>'
), updated_at = now() WHERE id = 74;


-- ─────────────────────────────────────────────────────────────
-- 시드 3 (id 75) — 예약률 30% 콘텐츠 운영 노하우
-- ─────────────────────────────────────────────────────────────

-- figure 1 — 📊 사례 개요 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📊 사례 개요 — 강남 안과 A의 6개월 변화</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20hospital%20marketing%20manager%20smiling%20at%20growth%20chart%20on%20wall%20screen%2C%20modern%20clinic%20office%2C%20pastel%20emerald%20and%20blue%20accents%2C%20warm%20bright%20lighting%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528209&nologo=true&enhance=true" alt="강남 안과 마케팅 성장 사례" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">강남 안과 A 의 6개월 성장 사례</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📊 사례 개요 — 강남 안과 A의 6개월 변화</h2>'
), updated_at = now() WHERE id = 75;

-- figure 2 — 🛠 4단계 실전 운영 방법 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🛠 4단계 실전 운영 방법</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20friendly%20Korean%20content%20strategist%20working%20with%20sticky%20notes%20and%20whiteboard%20planning%2C%20modern%20bright%20office%2C%20pastel%20emerald%20accents%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528210&nologo=true&enhance=true" alt="콘텐츠 운영 4단계" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">콘텐츠 운영 4단계 실전 가이드</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🛠 4단계 실전 운영 방법</h2>'
), updated_at = now() WHERE id = 75;

-- figure 3 — 💬 FAQ 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20hospital%20marketing%20director%20listening%20to%20client%20questions%2C%20modern%20consulting%20room%2C%20pastel%20emerald%20palette%2C%20warm%20professional%20atmosphere%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528211&nologo=true&enhance=true" alt="병원 마케팅 자주 묻는 질문" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">병원 마케팅 자주 묻는 질문 — 메디맵</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>'
), updated_at = now() WHERE id = 75;

-- figure 4 — 🎯 마무리하며 앞
UPDATE generated_contents
SET body = REPLACE(
  body,
  '<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 마무리하며</h2>',
  '<figure style="margin: 2.5em 0;">
  <img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20doctor%20and%20marketing%20team%20celebrating%20together%2C%20modern%20clinic%20with%20pastel%20emerald%20accents%2C%20warm%20cinematic%20lighting%2C%20success%20atmosphere%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528212&nologo=true&enhance=true" alt="병원 + 마케팅 파트너십 성공" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" />
  <figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">병원 + 마케팅 파트너십 성공 — 메디맵</figcaption>
</figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 마무리하며</h2>'
), updated_at = now() WHERE id = 75;


-- 검증
SELECT id, title,
  (length(body) - length(replace(body, '<figure', ''))) / length('<figure') AS body_figure_count,
  cover_image_url IS NOT NULL AS has_cover,
  length(body) AS body_len
FROM generated_contents
WHERE id IN (73, 74, 75)
ORDER BY id;
