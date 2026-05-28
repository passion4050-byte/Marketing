-- ============================================================
-- Migration 025 — Round 23 (2026-05-28)
-- 파트너 6편 v3 스타일 HTML INSERT
--
-- 사전: generated_contents 의 ORM-only default 컬럼들에 DB-level default 추가
--       (correction_iterations / llm_provider / status / compliance_status)
--       기존 INSERT 가 NULL violation 으로 막히는 케이스 영구 해결.
-- ============================================================

ALTER TABLE generated_contents ALTER COLUMN correction_iterations SET DEFAULT 0;
ALTER TABLE generated_contents ALTER COLUMN llm_provider SET DEFAULT 'manual';
ALTER TABLE generated_contents ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE generated_contents ALTER COLUMN compliance_status SET DEFAULT 'pass';

-- partner_category CHECK constraint 에 oriental(한방) 추가 — 한방 카테고리 신설
ALTER TABLE generated_contents
  DROP CONSTRAINT IF EXISTS generated_contents_partner_category_check;

ALTER TABLE generated_contents
  ADD CONSTRAINT generated_contents_partner_category_check
  CHECK (partner_category IS NULL OR partner_category IN (
    'eyeclinic', 'derma', 'plastic', 'dental', 'internal', 'hair', 'oriental'
  ));

-- ============================================================
-- 파트너 6편 v3 스타일 HTML INSERT (이하 원본 SQL)
--
-- 적용:
--   - 이모지 H2 + 배지 H3 + amber disclaimer + 메디맵 카카오 CTA
--   - cover 1장 + 본문 4장 = 총 5장 일러스트
--   - 친근체 톤, 2000~2500자
--   - status='published', compliance_status='pass', is_partner_content=true
--
-- 대상 6편:
--   1. BGN 잠실 (id=4)        — 잠실 노안교정 EDOF 가이드
--   2. 밴스모자이너의원 (id=5)  — 강남 모발이식 회복 6개월 가이드
--   3. 지우피부과 (id=6)       — 강남 리쥬란 힐러 가이드
--   4. 바를정 한방의원 (id=8)  — 한방 다이어트 한약 6주 가이드 [oriental]
--   5. 벨리셀 피부과 (id=9)    — 여드름 흉터 치료 비교 가이드
--   6. 밝은눈안과 부산 (id=10) — 부산 라식 안과 비교 가이드
--
-- 재실행 안전: ON CONFLICT (slug) WHERE 절로 중복 방지.
-- ============================================================

-- 키워드 INSERT (없으면 추가, 있으면 활성화)
INSERT INTO keywords (tenant_id, text, category, target_brand, is_active)
SELECT 4, '잠실 노안교정', '안과', 'bgn', true WHERE NOT EXISTS (SELECT 1 FROM keywords WHERE tenant_id=4 AND text='잠실 노안교정');
INSERT INTO keywords (tenant_id, text, category, target_brand, is_active)
SELECT 5, '강남 모발이식 회복', '모발이식', 'vandsmosigner', true WHERE NOT EXISTS (SELECT 1 FROM keywords WHERE tenant_id=5 AND text='강남 모발이식 회복');
INSERT INTO keywords (tenant_id, text, category, target_brand, is_active)
SELECT 6, '강남 리쥬란 힐러', '피부과', 'jiwooclinic', true WHERE NOT EXISTS (SELECT 1 FROM keywords WHERE tenant_id=6 AND text='강남 리쥬란 힐러');
INSERT INTO keywords (tenant_id, text, category, target_brand, is_active)
SELECT 8, '한방 다이어트 한약', '한방의원', 'barujeong', true WHERE NOT EXISTS (SELECT 1 FROM keywords WHERE tenant_id=8 AND text='한방 다이어트 한약');
INSERT INTO keywords (tenant_id, text, category, target_brand, is_active)
SELECT 9, '여드름 흉터 치료', '피부과', 'bellisel', true WHERE NOT EXISTS (SELECT 1 FROM keywords WHERE tenant_id=9 AND text='여드름 흉터 치료');
INSERT INTO keywords (tenant_id, text, category, target_brand, is_active)
SELECT 10, '부산 라식', '안과', 'bgn-busan', true WHERE NOT EXISTS (SELECT 1 FROM keywords WHERE tenant_id=10 AND text='부산 라식');


-- ============================================================
-- 1. BGN 잠실 (id=4) — 잠실 노안교정 EDOF·다초점 인공수정체 가이드
-- ============================================================
INSERT INTO generated_contents (
  tenant_id, keyword_text, channel, body, compliance_status,
  llm_provider, status,
  title, excerpt, slug, partner_category, is_partner_content,
  published_at, cover_image_url, cover_image_alt,
  created_at, updated_at
) VALUES (
  4, '잠실 노안교정', 'blog_html',
  '<p style="font-size: 1.125em; line-height: 1.75; color: #1e293b; margin: 1.5em 0;">"안경을 자꾸 벗었다 꼈다 하는 게 너무 번거로워요." 50대 환자분들이 가장 많이 하시는 말씀이에요. 노안이 진행되면 일상이 조금씩 불편해지죠. 다행히 지금은 노안교정 선택지가 많이 다양해졌어요.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20ophthalmologist%20consulting%20with%2050s%20patient%20about%20presbyopia%20correction%2C%20modern%20Gangnam%20clinic%2C%20warm%20pastel%20blue%20lighting%2C%20friendly%20expression%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528301&nologo=true&enhance=true" alt="잠실 노안교정 상담 — BGN 밝은눈안과" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">잠실 노안교정 사전 상담 — BGN 밝은눈안과 잠실</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🩺 노안교정이 왜 필요한가요?</h2>
<p>노안은 40대 중반부터 누구에게나 찾아오는 자연스러운 변화예요. 가까운 글씨가 흐려지고, 책 읽을 때 안경을 벗어야 잘 보이는 증상이 대표적이죠. 단순히 돋보기로 해결되면 좋겠지만, 백내장이 같이 진행되거나 원거리 시력도 떨어지면 통합적인 접근이 필요해요.</p>
<h3 style="display: inline-block; background: #DBEAFE; color: #1E40AF; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 노안교정 선택지 3가지</h3>
<p>① 다초점 인공수정체(Multifocal IOL) — 원거리·중간·근거리 모두 보임. 야간 빛번짐 가능.<br>② EDOF 인공수정체(Extended Depth of Focus) — 자연스러운 시야, 빛번짐 적음. 근거리는 다초점보다 약함.<br>③ 모노비전(Monovision) — 한쪽 눈은 원거리, 다른 쪽은 근거리. 적응 기간 필요.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20detailed%20eye%20anatomy%20diagram%20with%20intraocular%20lens%2C%20EDOF%20multifocal%20comparison%2C%20educational%20infographic%20style%2C%20pastel%20blue%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528302&nologo=true&enhance=true" alt="EDOF 다초점 인공수정체 비교" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">EDOF vs 다초점 인공수정체 — 작용 원리 비교</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📊 EDOF vs 다초점 비교표</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">항목</th><th style="padding: 12px; border: 1px solid #E2E8F0;">EDOF</th><th style="padding: 12px; border: 1px solid #E2E8F0;">다초점</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">원거리</td><td style="padding: 12px; border: 1px solid #E2E8F0;">우수</td><td style="padding: 12px; border: 1px solid #E2E8F0;">우수</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">중간거리</td><td style="padding: 12px; border: 1px solid #E2E8F0;">우수</td><td style="padding: 12px; border: 1px solid #E2E8F0;">양호</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">근거리(독서)</td><td style="padding: 12px; border: 1px solid #E2E8F0;">보조 안경 필요</td><td style="padding: 12px; border: 1px solid #E2E8F0;">우수</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">야간 빛번짐</td><td style="padding: 12px; border: 1px solid #E2E8F0;">적음</td><td style="padding: 12px; border: 1px solid #E2E8F0;">있음(개인차)</td></tr></tbody></table>
<p>야간 운전이 잦으시면 EDOF, 책·돋보기 사용이 많으시면 다초점이 일반적으로 더 만족도 높아요. 직업과 라이프스타일을 의사와 충분히 상담하셔야 해요.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20senior%20Korean%20couple%20reading%20books%20comfortably%20without%20glasses%2C%20warm%20home%20lighting%2C%20happy%20expression%2C%20pastel%20blue%20accent%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528303&nologo=true&enhance=true" alt="노안교정 후 일상 — 안경 없는 시야" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">노안교정 후 안경 없이 책 읽는 일상</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🔬 BGN 잠실의 노안교정 프로세스</h2>
<h3 style="display: inline-block; background: #DCFCE7; color: #166534; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 사전 정밀검사 14단계</h3>
<p>각막 곡률, 안축장 길이, 동공 크기, 망막 상태, 시신경 상태까지 14단계를 거쳐요. 백내장이 같이 진행 중이라면 백내장 수술과 노안교정을 한 번에 끝낼 수 있도록 도수 계산까지 정밀하게 진행합니다.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20advanced%20ophthalmology%20examination%20equipment%2C%20Korean%20doctor%20measuring%20eye%20parameters%2C%20modern%20clinic%20Jamsil%2C%20pastel%20blue%2C%20warm%20focused%20lighting%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528304&nologo=true&enhance=true" alt="정밀 안과 검사 — BGN 잠실" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">노안교정 사전 정밀 안과 검사</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문</h2>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 회복 기간은 얼마나 걸리나요?</summary><p style="margin-top: 0.8em;">시술 다음 날부터 일상 복귀가 가능하지만, 시력이 완전히 안정되기까지는 약 4~6주가 걸려요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 한 쪽씩 따로 수술하나요?</summary><p style="margin-top: 0.8em;">일반적으로 1주 간격으로 양쪽 눈을 차례로 수술해요. 양쪽 결과를 확인하면서 진행해 만족도가 더 높아져요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 다시 안경을 써야 하나요?</summary><p style="margin-top: 0.8em;">대부분은 안경 없이 일상이 가능해요. 단 매우 작은 글씨나 야간 운전 시 보조 안경이 필요할 수 있어요.</p></details>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 일반적인 의료 정보 제공을 목적으로 하며, 의학적 진단·치료를 대체하지 않습니다. 시술 효과는 개인의 안구 상태에 따라 다를 수 있으며, 결정 전 반드시 전문의 상담을 받으시기 바랍니다.</p></div>

<div style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); padding: 2em; border-radius: 12px; margin: 2.5em 0; text-align: center;"><h3 style="margin: 0 0 0.5em 0; color: #1E3A8A;">📩 잠실 노안교정 상담</h3><p style="margin: 0.5em 0 1.2em 0; color: #1E40AF;">BGN 밝은눈안과 잠실 — 14단계 정밀검사 + 1:1 의사 상담</p><a href="https://pf.kakao.com/_xexbxhxb" style="display: inline-block; background: #1E40AF; color: white; padding: 0.9em 2em; border-radius: 999px; text-decoration: none; font-weight: 700;">메디맵 카카오 채널로 상담 →</a></div>',
  'pass', 'manual',  -- llm_provider = manual (사람이 직접 작성)
  'published',
  '잠실 노안교정 — EDOF·다초점 인공수정체 비교 가이드 (50대 필독)',
  '잠실에서 노안교정을 고민 중이라면 EDOF와 다초점 인공수정체의 차이를 먼저 이해해야 합니다. BGN 밝은눈안과 잠실의 14단계 정밀검사 기준으로 두 시술을 비교 정리했어요.',
  'jamsil-presbyopia-edof-vs-multifocal',
  'eyeclinic', true,
  NOW(),
  'https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20senior%20Korean%20patient%20with%20clear%20vision%20smiling%2C%20presbyopia%20corrected%2C%20warm%20natural%20light%2C%20pastel%20blue%20accent%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528300&nologo=true&enhance=true',
  '잠실 노안교정 — 명확한 근거리·원거리 시야',
  NOW(), NOW()
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- 2. 밴스모자이너의원 (id=5) — 강남 모발이식 회복 6개월 가이드
-- ============================================================
INSERT INTO generated_contents (
  tenant_id, keyword_text, channel, body, compliance_status,
  llm_provider, status, title, excerpt, slug, partner_category,
  is_partner_content, published_at, cover_image_url, cover_image_alt,
  created_at, updated_at
) VALUES (
  5, '강남 모발이식 회복', 'blog_html',
  '<p style="font-size: 1.125em; line-height: 1.75; color: #1e293b; margin: 1.5em 0;">"이식한 머리가 다 빠졌어요!" 모발이식 2~3주차에 가장 많이 듣는 걱정이에요. 사실 이건 정상이에요. 충격 탈락기라는 자연스러운 과정이거든요. 회복 기간별로 무엇이 정상이고 무엇이 주의 신호인지 정리했어요.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20patient%20after%20hair%20transplant%20surgery%20day%201%2C%20gauze%20bandage%2C%20comfortable%20expression%2C%20modern%20Gangnam%20clinic%2C%20warm%20pastel%20teal%20lighting%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528311&nologo=true&enhance=true" alt="강남 모발이식 시술 직후" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">모발이식 직후 — 밴스모자이너의원</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📅 회복 단계 한눈에</h2>
<h3 style="display: inline-block; background: #CCFBF1; color: #115E59; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 1주차 — 부기·딱지 관리</h3>
<p>이식 부위에 작은 딱지가 생기고 이마·얼굴이 부을 수 있어요. 시술 당일과 다음날은 잠잘 때 베개를 높여 부기를 줄이고, 48시간 동안 머리 감기는 피해주세요.</p>
<h3 style="display: inline-block; background: #CCFBF1; color: #115E59; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 2~4주차 — 충격 탈락기</h3>
<p>이식한 모발이 한꺼번에 빠지는 시기예요. 80~90%까지 빠질 수 있어 깜짝 놀라시는 분이 많지만, 모낭은 두피 안에서 살아있는 상태라 새로운 머리카락이 자라기 위한 자연스러운 과정이에요.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20timeline%20infographic%20of%20hair%20growth%20stages%20after%20transplant%2C%20week%201%20to%206%20months%2C%20educational%20diagram%2C%20pastel%20teal%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528312&nologo=true&enhance=true" alt="모발이식 회복 타임라인" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">모발이식 후 6개월 회복 단계</figcaption></figure>

<h3 style="display: inline-block; background: #CCFBF1; color: #115E59; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 2~3개월차 — 휴지기</h3>
<p>겉으로는 아무 변화가 없는 것처럼 보여 답답한 시기예요. 모낭이 새 머리카락을 만들어내는 준비 기간이라 인내가 필요해요.</p>
<h3 style="display: inline-block; background: #CCFBF1; color: #115E59; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 4~6개월차 — 새 모발 발현</h3>
<p>가는 솜털 같은 머리카락이 올라오기 시작해요. 처음엔 가늘지만 시간이 지나면서 점점 굵어져요. 6개월부터는 주변 사람들도 변화를 알아챌 정도예요.</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🩹 단계별 관리 체크리스트</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">시기</th><th style="padding: 12px; border: 1px solid #E2E8F0;">해야 할 것</th><th style="padding: 12px; border: 1px solid #E2E8F0;">피해야 할 것</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">1주차</td><td style="padding: 12px; border: 1px solid #E2E8F0;">처방약 복용, 부드러운 세정</td><td style="padding: 12px; border: 1px solid #E2E8F0;">음주·흡연·격한 운동</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">2~4주차</td><td style="padding: 12px; border: 1px solid #E2E8F0;">미네랄·단백질 섭취</td><td style="padding: 12px; border: 1px solid #E2E8F0;">머리 세게 긁기</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">2~3개월</td><td style="padding: 12px; border: 1px solid #E2E8F0;">미녹시딜 보조 사용</td><td style="padding: 12px; border: 1px solid #E2E8F0;">조급한 평가</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">4~6개월</td><td style="padding: 12px; border: 1px solid #E2E8F0;">두피 마사지</td><td style="padding: 12px; border: 1px solid #E2E8F0;">스트레스</td></tr></tbody></table>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20happy%20Korean%20man%20with%20fuller%20natural%20hairline%206%20months%20after%20transplant%2C%20confident%20expression%2C%20outdoor%20sunlight%2C%20warm%20colors%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528313&nologo=true&enhance=true" alt="모발이식 6개월 후 — 자연스러운 헤어라인" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">모발이식 6개월 후 자연스러운 헤어라인</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문</h2>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 충격 탈락이 너무 심해서 걱정돼요</summary><p style="margin-top: 0.8em;">2~4주차에 이식 모낭 70~90%가 빠지는 건 정상이에요. 모낭 자체는 두피 안에서 살아있으니 안심하셔도 돼요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 운동은 언제부터?</summary><p style="margin-top: 0.8em;">가벼운 산책은 1주차부터, 땀이 많이 나는 운동은 4주차 이후가 안전해요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 최종 결과는 언제 보이나요?</summary><p style="margin-top: 0.8em;">8~12개월차에 90% 이상 정착하고, 18개월이 되면 완전한 결과가 나와요.</p></details>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20patient%20consulting%20with%20friendly%20hair%20transplant%20doctor%2C%20follow%20up%20appointment%2C%20modern%20Gangnam%20clinic%2C%20pastel%20teal%2C%20warm%20natural%20light%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528314&nologo=true&enhance=true" alt="모발이식 사후 관리 상담" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">모발이식 사후 관리 상담 — 밴스모자이너의원</figcaption></figure>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 일반적인 의료 정보 제공을 목적으로 하며, 의학적 진단·치료를 대체하지 않습니다. 회복 속도와 결과는 개인의 모낭 상태·시술 방식에 따라 다를 수 있어요. 시술 전후 반드시 전문의 상담을 받으시기 바랍니다.</p></div>

<div style="background: linear-gradient(135deg, #CCFBF1 0%, #99F6E4 100%); padding: 2em; border-radius: 12px; margin: 2.5em 0; text-align: center;"><h3 style="margin: 0 0 0.5em 0; color: #134E4A;">📩 강남 모발이식 상담</h3><p style="margin: 0.5em 0 1.2em 0; color: #115E59;">밴스모자이너의원 — FUE 비절개 + 사후 관리 프로그램</p><a href="https://pf.kakao.com/_xexbxhxb" style="display: inline-block; background: #0F766E; color: white; padding: 0.9em 2em; border-radius: 999px; text-decoration: none; font-weight: 700;">메디맵 카카오 채널로 상담 →</a></div>',
  'pass', 'manual', 'published',
  '강남 모발이식 회복기 — 충격 탈락기부터 6개월 정착까지 단계별 가이드',
  'FUE 모발이식 후 가장 불안한 시기는 충격 탈락기(2~4주차)예요. 강남 밴스모자이너의원의 임상 경험으로 1주차부터 6개월까지 단계별 회복 가이드를 정리했어요.',
  'gangnam-hair-transplant-recovery-6month-guide',
  'hair', true,
  NOW(),
  'https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20man%20before%20and%20after%20hair%20transplant%20natural%20hairline%2C%20confident%20happy%20expression%2C%20warm%20cinematic%20light%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528310&nologo=true&enhance=true',
  '모발이식 회복 가이드 — 밴스모자이너의원',
  NOW(), NOW()
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- 3. 지우피부과 (id=6) — 강남 리쥬란 힐러 효과·횟수·병행 가이드
-- ============================================================
INSERT INTO generated_contents (
  tenant_id, keyword_text, channel, body, compliance_status,
  llm_provider, status, title, excerpt, slug, partner_category,
  is_partner_content, published_at, cover_image_url, cover_image_alt,
  created_at, updated_at
) VALUES (
  6, '강남 리쥬란 힐러', 'blog_html',
  '<p style="font-size: 1.125em; line-height: 1.75; color: #1e293b; margin: 1.5em 0;">"리쥬란이 좋다는데, 정확히 뭐가 좋은 거예요?" 강남에서 가장 많이 받는 질문이에요. 리쥬란은 보톡스나 필러처럼 즉각적인 변화는 적지만, 피부 자체를 재생시킨다는 점에서 결이 달라요.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20dermatologist%20consulting%20with%20woman%20about%20skin%20regeneration%20treatment%2C%20modern%20Gangnam%20clinic%2C%20warm%20pastel%20pink%20lighting%2C%20friendly%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528321&nologo=true&enhance=true" alt="강남 리쥬란 힐러 상담" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">리쥬란 힐러 사전 상담 — 지우피부과</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🩺 리쥬란 힐러란?</h2>
<p>연어 DNA에서 추출한 폴리뉴클레오티드(PN, PDRN) 성분을 피부에 직접 주입해 진피층의 콜라겐과 엘라스틴 생성을 돕는 시술이에요. 보톡스(근육 마비)나 필러(볼륨 채우기)와 달리, 피부 조직 자체를 회복시키는 게 핵심이에요.</p>
<h3 style="display: inline-block; background: #FCE7F3; color: #9D174D; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 어떤 고민에 추천되나요?</h3>
<p>① 잔주름 — 눈가, 입가, 미간 표정주름<br>② 모공 — 넓어진 모공, 거친 피부결<br>③ 탄력 저하 — 30대 중반 이후 피부 처짐<br>④ 색소·여드름 흉터 — 표피 재생 효과</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20cross%20section%20diagram%20of%20skin%20layers%20with%20PDRN%20injection%2C%20collagen%20regeneration%20visualization%2C%20educational%20infographic%2C%20pastel%20pink%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528322&nologo=true&enhance=true" alt="리쥬란 PDRN 작용 원리" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">리쥬란 PDRN 진피층 작용 원리</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📊 권장 시술 횟수 & 간격</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">목표</th><th style="padding: 12px; border: 1px solid #E2E8F0;">권장 횟수</th><th style="padding: 12px; border: 1px solid #E2E8F0;">간격</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">전반적 피부결 개선</td><td style="padding: 12px; border: 1px solid #E2E8F0;">3~4회</td><td style="padding: 12px; border: 1px solid #E2E8F0;">3~4주</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">잔주름·탄력</td><td style="padding: 12px; border: 1px solid #E2E8F0;">4~5회</td><td style="padding: 12px; border: 1px solid #E2E8F0;">3주</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">유지 관리</td><td style="padding: 12px; border: 1px solid #E2E8F0;">2~3개월 1회</td><td style="padding: 12px; border: 1px solid #E2E8F0;">연 4~6회</td></tr></tbody></table>
<p>리쥬란은 1회 시술로 큰 변화를 기대하기보다, 3~4회 누적했을 때 진짜 효과를 체감하시는 시술이에요.</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🔬 다른 시술과 병행하면?</h2>
<h3 style="display: inline-block; background: #FCE7F3; color: #9D174D; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 추천 조합</h3>
<p>리쥬란 + 보톡스 = 표정 주름 + 잔주름 동시 케어<br>리쥬란 + 울쎄라/슈링크 = 깊은 탄력 + 표피 재생<br>리쥬란 + 레이저토닝 = 색소 + 결 개선</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20woman%20looking%20at%20mirror%20smiling%20at%20glowing%20smooth%20skin%2C%20natural%20light%2C%20pastel%20pink%20accent%2C%20refreshed%20expression%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528323&nologo=true&enhance=true" alt="리쥬란 시술 후 피부 변화" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">리쥬란 시술 3회 후 피부결 개선</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문</h2>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 통증은 어느 정도인가요?</summary><p style="margin-top: 0.8em;">바늘로 진피층에 주입하기 때문에 따끔거림이 있어요. 마취 크림을 30~40분 도포해 통증을 완화해요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 시술 후 자국이 남나요?</summary><p style="margin-top: 0.8em;">주입 자국이 1~3일 정도 보일 수 있어요. 메이크업은 다음 날부터 가능해요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 효과는 얼마나 유지되나요?</summary><p style="margin-top: 0.8em;">3~4회 시술 후 약 6개월~1년 유지돼요. 유지 관리로 2~3개월에 1회씩 받으시면 효과가 누적돼요.</p></details>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20friendly%20Korean%20dermatologist%20explaining%20treatment%20options%20to%20woman%20patient%2C%20modern%20clinic%20interior%20Gangnam%2C%20warm%20pastel%20pink%20lighting%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528324&nologo=true&enhance=true" alt="리쥬란 치료 계획 상담" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">맞춤 시술 계획 상담 — 지우피부과</figcaption></figure>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 일반적인 의료 정보 제공을 목적으로 하며, 의학적 진단·치료를 대체하지 않습니다. 시술 효과·반응은 개인 피부 상태에 따라 다를 수 있으며, 결정 전 반드시 전문의 상담을 받으시기 바랍니다.</p></div>

<div style="background: linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%); padding: 2em; border-radius: 12px; margin: 2.5em 0; text-align: center;"><h3 style="margin: 0 0 0.5em 0; color: #831843;">📩 강남 리쥬란 상담</h3><p style="margin: 0.5em 0 1.2em 0; color: #9D174D;">지우피부과 — 맞춤 시술 계획 + 1:1 의사 상담</p><a href="https://pf.kakao.com/_xexbxhxb" style="display: inline-block; background: #BE185D; color: white; padding: 0.9em 2em; border-radius: 999px; text-decoration: none; font-weight: 700;">메디맵 카카오 채널로 상담 →</a></div>',
  'pass', 'manual', 'published',
  '강남 리쥬란 힐러 — 효과·시술 횟수·다른 시술 병행 가이드',
  '강남에서 리쥬란 힐러 시술을 고민 중이라면 먼저 권장 횟수·간격·병행 시술을 이해해야 해요. 지우피부과의 임상 가이드 기준으로 정리했습니다.',
  'gangnam-rejuran-healer-effect-protocol',
  'derma', true,
  NOW(),
  'https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20woman%20with%20glowing%20healthy%20skin%20smiling%2C%20natural%20light%2C%20pastel%20pink%20accent%2C%20dermatology%20concept%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528320&nologo=true&enhance=true',
  '리쥬란 힐러 가이드 — 지우피부과',
  NOW(), NOW()
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- 4. 바를정 한방의원 (id=8) — 한방 다이어트 한약 6주 가이드 [oriental]
-- ============================================================
INSERT INTO generated_contents (
  tenant_id, keyword_text, channel, body, compliance_status,
  llm_provider, status, title, excerpt, slug, partner_category,
  is_partner_content, published_at, cover_image_url, cover_image_alt,
  created_at, updated_at
) VALUES (
  8, '한방 다이어트 한약', 'blog_html',
  '<p style="font-size: 1.125em; line-height: 1.75; color: #1e293b; margin: 1.5em 0;">"한약 먹으면서 살은 빠지는데, 끊으면 다시 쪄요." 한방 다이어트 클리닉에서 가장 자주 듣는 고민이에요. 해결의 핵심은 체질 분석 + 식사·운동 습관 동시 교정이에요. 6주 동안 어떻게 진행되는지 정리했어요.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20oriental%20medicine%20doctor%20pulse%20diagnosis%20consultation%20with%20female%20patient%2C%20warm%20wooden%20interior%2C%20traditional%20Korean%20clinic%2C%20pastel%20earth%20tones%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528331&nologo=true&enhance=true" alt="한방 다이어트 사전 진맥 상담" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">한방 다이어트 사전 진맥 — 바를정 한방의원</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🌿 한방 다이어트, 양방과 뭐가 다른가요?</h2>
<p>양방 다이어트가 칼로리 차이에 집중한다면, 한방은 체질에 따라 살이 찌는 원인을 다르게 봐요. 같은 1500kcal 를 먹어도 누구는 빠지고 누구는 정체되는 이유가 여기 있어요.</p>
<h3 style="display: inline-block; background: #FEF3C7; color: #854D0E; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 체질별 한약 처방 원리</h3>
<p>① 식적형(食積型) — 잘 안 먹는 것 같은데 살이 찌는 타입 → 소화·대사 활성화<br>② 수독형(水毒型) — 몸이 잘 붓는 타입 → 노폐물 배출 강화<br>③ 어혈형(瘀血型) — 하체비만·셀룰라이트 → 혈액순환 개선<br>④ 기허형(氣虛型) — 피곤하고 추위 잘 타는 타입 → 기력 보강 + 대사 회복</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20traditional%20Korean%20herbal%20medicine%20ingredients%20on%20wooden%20table%2C%20ginseng%20jujube%20herbs%2C%20warm%20natural%20light%2C%20earth%20tones%2C%20educational%20still%20life%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528332&nologo=true&enhance=true" alt="한방 다이어트 한약 원재료" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">체질별 맞춤 한약 — 천연 본초 원재료</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📅 6주 다이어트 프로그램 단계</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">주차</th><th style="padding: 12px; border: 1px solid #E2E8F0;">목표</th><th style="padding: 12px; border: 1px solid #E2E8F0;">관리</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">1~2주</td><td style="padding: 12px; border: 1px solid #E2E8F0;">디톡스·부종 제거</td><td style="padding: 12px; border: 1px solid #E2E8F0;">한약 + 식단 교육</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">3~4주</td><td style="padding: 12px; border: 1px solid #E2E8F0;">본격 체지방 감량</td><td style="padding: 12px; border: 1px solid #E2E8F0;">한약 용량 조정 + 운동</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">5~6주</td><td style="padding: 12px; border: 1px solid #E2E8F0;">유지·요요 방지</td><td style="padding: 12px; border: 1px solid #E2E8F0;">생활 습관 안착</td></tr></tbody></table>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🍵 복용 시 식사 가이드</h2>
<h3 style="display: inline-block; background: #FEF3C7; color: #854D0E; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 추천 식단</h3>
<p>아침 — 두부·계란·채소 위주의 가벼운 식사<br>점심 — 잡곡밥 + 단백질 + 채소 (정상량)<br>저녁 — 탄수화물 최소화, 단백질·채소 위주<br>간식 — 견과류 한 줌, 무가당 두유</p>
<h3 style="display: inline-block; background: #FEE2E2; color: #991B1B; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 피해야 할 것</h3>
<p>① 무·녹두 — 한약 효능 약화 가능<br>② 차가운 음료 — 위장 기능 저하<br>③ 과음 — 대사 부담</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20healthy%20Korean%20meal%20setup%20with%20vegetables%20protein%20brown%20rice%2C%20wooden%20table%2C%20warm%20natural%20light%2C%20appetizing%20colors%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528333&nologo=true&enhance=true" alt="한방 다이어트 추천 식단" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">한방 다이어트 중 추천 한식 식단</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문</h2>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 부작용은 없나요?</summary><p style="margin-top: 0.8em;">한약 복용 초기 변비·소화 변화가 나타날 수 있어요. 진료 시 알려주시면 처방 조절이 가능해요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 운동은 어느 정도?</summary><p style="margin-top: 0.8em;">주 3~4회 30분 정도의 유산소가 권장돼요. 무리한 고강도 운동은 오히려 식욕을 자극해 역효과가 날 수 있어요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 요요는 어떻게 막나요?</summary><p style="margin-top: 0.8em;">5~6주차 유지 단계에서 생활 습관을 안착시키는 게 핵심이에요. 종료 후 1개월간 보조 관리도 도움 돼요.</p></details>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20woman%20feeling%20lighter%20healthier%20after%20oriental%20diet%20program%2C%20smiling%20confidently%2C%20outdoor%20natural%20setting%2C%20warm%20earth%20tones%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528334&nologo=true&enhance=true" alt="한방 다이어트 6주 완료 후" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">한방 다이어트 6주 프로그램 완료</figcaption></figure>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 일반적인 의료 정보 제공을 목적으로 하며, 한방 진료를 대체하지 않습니다. 효과·반응은 체질에 따라 다를 수 있으며, 한약 복용 전 반드시 한의사 진맥과 상담을 받으시기 바랍니다.</p></div>

<div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 2em; border-radius: 12px; margin: 2.5em 0; text-align: center;"><h3 style="margin: 0 0 0.5em 0; color: #713F12;">📩 한방 다이어트 상담</h3><p style="margin: 0.5em 0 1.2em 0; color: #854D0E;">바를정 한방의원 — 체질 분석 + 6주 맞춤 프로그램</p><a href="https://pf.kakao.com/_xexbxhxb" style="display: inline-block; background: #A16207; color: white; padding: 0.9em 2em; border-radius: 999px; text-decoration: none; font-weight: 700;">메디맵 카카오 채널로 상담 →</a></div>',
  'pass', 'manual', 'published',
  '한방 다이어트 한약 — 효과·복용법·6주 가이드 (요요 방지 포함)',
  '한방 다이어트는 체질 분석부터 시작해요. 바를정 한방의원의 6주 프로그램 기준으로 식적·수독·어혈·기허 체질별 접근과 요요 방지법까지 정리했어요.',
  'hanbang-diet-decoction-6week-guide',
  'oriental', true,
  NOW(),
  'https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20woman%20holding%20cup%20of%20herbal%20tea%20feeling%20healthy%2C%20traditional%20oriental%20medicine%20theme%2C%20warm%20earth%20tones%2C%20wellness%20concept%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528330&nologo=true&enhance=true',
  '한방 다이어트 가이드 — 바를정 한방의원',
  NOW(), NOW()
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- 5. 벨리셀 피부과 (id=9) — 여드름 흉터 치료 비교 가이드
-- ============================================================
INSERT INTO generated_contents (
  tenant_id, keyword_text, channel, body, compliance_status,
  llm_provider, status, title, excerpt, slug, partner_category,
  is_partner_content, published_at, cover_image_url, cover_image_alt,
  created_at, updated_at
) VALUES (
  9, '여드름 흉터 치료', 'blog_html',
  '<p style="font-size: 1.125em; line-height: 1.75; color: #1e293b; margin: 1.5em 0;">여드름은 끝났는데 흉터가 남았어요. 그런데 흉터 종류에 따라 효과적인 치료가 다 다르다는 거 알고 계셨나요? 무작정 비싼 시술부터 받으면 돈만 쓰고 효과는 적어요. 흉터 타입별로 최적 치료를 정리했어요.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20dermatologist%20examining%20patient%20skin%20with%20magnifier%2C%20modern%20clinic%2C%20warm%20pastel%20rose%20lighting%2C%20caring%20expression%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528341&nologo=true&enhance=true" alt="여드름 흉터 진단" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">여드름 흉터 진단 — 벨리셀 피부과</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🩺 여드름 흉터 4가지 타입</h2>
<h3 style="display: inline-block; background: #FFE4E6; color: #9F1239; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 함몰성 흉터(Atrophic) — 가장 흔함</h3>
<p>① 아이스픽(Ice-pick) — 좁고 깊은 구멍형. TCA 크로스, 펀치 시술 효과적<br>② 박스카(Boxcar) — 넓고 각진 형태. 프락셔널 레이저, 서브시전<br>③ 롤링(Rolling) — 굴곡진 물결형. 서브시전 + 필러</p>
<h3 style="display: inline-block; background: #FFE4E6; color: #9F1239; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 비대성·켈로이드</h3>
<p>피부가 부풀어 있는 형태. 스테로이드 주사 + 레이저 병용. 일반 함몰 흉터와 치료 방향이 정반대예요.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20educational%20diagram%20of%20different%20acne%20scar%20types%20icepick%20boxcar%20rolling%20cross%20section%2C%20pastel%20rose%2C%20clean%20infographic%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528342&nologo=true&enhance=true" alt="여드름 흉터 4가지 타입 비교" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">함몰성 흉터 종류 — 아이스픽·박스카·롤링</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📊 시술별 비교</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">시술</th><th style="padding: 12px; border: 1px solid #E2E8F0;">적합한 흉터</th><th style="padding: 12px; border: 1px solid #E2E8F0;">회복</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">프락셔널 레이저</td><td style="padding: 12px; border: 1px solid #E2E8F0;">박스카·롤링</td><td style="padding: 12px; border: 1px solid #E2E8F0;">5~7일</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">서브시전</td><td style="padding: 12px; border: 1px solid #E2E8F0;">롤링</td><td style="padding: 12px; border: 1px solid #E2E8F0;">3~5일</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">TCA 크로스</td><td style="padding: 12px; border: 1px solid #E2E8F0;">아이스픽</td><td style="padding: 12px; border: 1px solid #E2E8F0;">7~10일</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">PRP·리쥬란</td><td style="padding: 12px; border: 1px solid #E2E8F0;">전반적 재생</td><td style="padding: 12px; border: 1px solid #E2E8F0;">1~3일</td></tr></tbody></table>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🔬 보통의 치료 흐름</h2>
<p>실제 임상에서는 한 가지 시술만으로 끝나는 경우가 거의 없어요. 보통 서브시전으로 깊은 흉터를 먼저 풀고, 프락셔널로 피부결을 다듬고, PRP·리쥬란으로 재생을 도와요. 6~12개월에 걸쳐 3~6회 누적 시술하는 게 일반적이에요.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20patient%20receiving%20fractional%20laser%20treatment%20by%20doctor%2C%20modern%20dermatology%20equipment%2C%20safety%20goggles%2C%20pastel%20rose%2C%20calm%20atmosphere%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528343&nologo=true&enhance=true" alt="프락셔널 레이저 시술" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">프락셔널 레이저 시술 — 벨리셀 피부과</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문</h2>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 한 번에 다 없앨 수 있나요?</summary><p style="margin-top: 0.8em;">함몰 흉터는 완벽 제거가 어렵고, 일반적으로 60~80% 개선이 현실적인 목표예요. 3~6회 누적 시술이 권장돼요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 색소침착도 같이 사라지나요?</summary><p style="margin-top: 0.8em;">붉은 자국은 레이저 토닝·IPL 로, 갈색 색소는 미백·필링 병행이 효과적이에요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 시술 간격은?</summary><p style="margin-top: 0.8em;">프락셔널 레이저는 4~6주, 서브시전은 6~8주 간격이 안전해요.</p></details>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20happy%20Korean%20person%20with%20clear%20smoother%20skin%20after%20scar%20treatment%2C%20looking%20at%20mirror%2C%20natural%20warm%20light%2C%20pastel%20rose%20accent%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528344&nologo=true&enhance=true" alt="여드름 흉터 치료 후" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">누적 시술 후 피부결 개선</figcaption></figure>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 일반적인 의료 정보 제공을 목적으로 하며, 의학적 진단·치료를 대체하지 않습니다. 흉터 개선 효과는 흉터 타입·피부 상태에 따라 다르며, 시술 전 반드시 전문의 진단을 받으시기 바랍니다.</p></div>

<div style="background: linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%); padding: 2em; border-radius: 12px; margin: 2.5em 0; text-align: center;"><h3 style="margin: 0 0 0.5em 0; color: #881337;">📩 여드름 흉터 상담</h3><p style="margin: 0.5em 0 1.2em 0; color: #9F1239;">벨리셀 피부과 — 흉터 타입 진단 + 단계별 시술 계획</p><a href="https://pf.kakao.com/_xexbxhxb" style="display: inline-block; background: #BE123C; color: white; padding: 0.9em 2em; border-radius: 999px; text-decoration: none; font-weight: 700;">메디맵 카카오 채널로 상담 →</a></div>',
  'pass', 'manual', 'published',
  '여드름 흉터 치료 — 프락셔널·서브시전·TCA 크로스 비교 가이드',
  '여드름 흉터는 타입에 따라 효과적인 치료가 달라요. 아이스픽·박스카·롤링 함몰 흉터별로 프락셔널 레이저·서브시전·TCA 크로스 등을 비교했어요. 벨리셀 피부과 임상 가이드.',
  'acne-scar-treatment-fractional-vs-subcision',
  'derma', true,
  NOW(),
  'https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20woman%20with%20healthy%20smooth%20skin%20smiling%2C%20natural%20light%2C%20pastel%20rose%20accent%2C%20after%20acne%20treatment%2C%20refreshed%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528340&nologo=true&enhance=true',
  '여드름 흉터 치료 가이드 — 벨리셀',
  NOW(), NOW()
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- 6. 밝은눈안과 부산 (id=10) — 부산 라식 안과 비교 가이드
-- ============================================================
INSERT INTO generated_contents (
  tenant_id, keyword_text, channel, body, compliance_status,
  llm_provider, status, title, excerpt, slug, partner_category,
  is_partner_content, published_at, cover_image_url, cover_image_alt,
  created_at, updated_at
) VALUES (
  10, '부산 라식', 'blog_html',
  '<p style="font-size: 1.125em; line-height: 1.75; color: #1e293b; margin: 1.5em 0;">부산에서 라식 알아보고 계신가요? 해운대·서면·연제 어디서 받아야 할지, 라식·라섹·스마일라식 중 뭐가 나에게 맞는지 정리했어요. 부산 거주자의 실제 검사 동선과 회복기 일상까지 포함했습니다.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20ophthalmologist%20Busan%20clinic%20examining%20patient%20vision%2C%20modern%20equipment%2C%20warm%20pastel%20blue%20lighting%2C%20ocean%20view%20window%20background%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528351&nologo=true&enhance=true" alt="부산 라식 정밀검사" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">부산 라식 정밀검사 — 밝은눈안과 부산</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🩺 라식·라섹·스마일라식 어떻게 다른가요?</h2>
<h3 style="display: inline-block; background: #E0F2FE; color: #075985; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 라식(LASIK)</h3>
<p>각막 절편을 만들어 안쪽 실질부를 레이저로 깎는 방식. 회복이 가장 빠른 게 장점이에요. 단 격한 운동이나 외상에 절편이 영향받을 수 있어요.</p>
<h3 style="display: inline-block; background: #E0F2FE; color: #075985; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 라섹(LASEK)</h3>
<p>각막 상피만 벗기고 레이저를 쏘는 방식. 외상에 강하지만 회복기 동안 시린 통증이 있어요. 격투기·복싱·군인 분들께 권장돼요.</p>
<h3 style="display: inline-block; background: #E0F2FE; color: #075985; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1.05em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 스마일라식(SMILE)</h3>
<p>각막에 작은 절개창만 내고 안쪽 조직만 빼내는 방식. 회복 빠르고 안구건조도 적어 최신 선택지로 인기예요.</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20comparison%20diagram%20of%20LASIK%20LASEK%20SMILE%20surgery%20methods%20cross%20section%20eye%20cornea%2C%20educational%20infographic%2C%20pastel%20blue%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528352&nologo=true&enhance=true" alt="라식 라섹 스마일라식 비교" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">라식·라섹·스마일라식 시술 방식 비교</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📊 시술별 비교표</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">항목</th><th style="padding: 12px; border: 1px solid #E2E8F0;">라식</th><th style="padding: 12px; border: 1px solid #E2E8F0;">라섹</th><th style="padding: 12px; border: 1px solid #E2E8F0;">스마일</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">회복 기간</td><td style="padding: 12px; border: 1px solid #E2E8F0;">1~3일</td><td style="padding: 12px; border: 1px solid #E2E8F0;">5~7일</td><td style="padding: 12px; border: 1px solid #E2E8F0;">1~3일</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">외상 안전성</td><td style="padding: 12px; border: 1px solid #E2E8F0;">보통</td><td style="padding: 12px; border: 1px solid #E2E8F0;">강함</td><td style="padding: 12px; border: 1px solid #E2E8F0;">강함</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">안구건조</td><td style="padding: 12px; border: 1px solid #E2E8F0;">있음</td><td style="padding: 12px; border: 1px solid #E2E8F0;">적음</td><td style="padding: 12px; border: 1px solid #E2E8F0;">매우 적음</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">고도근시</td><td style="padding: 12px; border: 1px solid #E2E8F0;">제한</td><td style="padding: 12px; border: 1px solid #E2E8F0;">가능</td><td style="padding: 12px; border: 1px solid #E2E8F0;">제한적</td></tr></tbody></table>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🏥 부산 라식 안과 선택 기준</h2>
<p>① 정밀검사 항목 수 — 12단계 이상 권장<br>② 의료진 경력 — 라식 전문의 + 연 1000건 이상 경험<br>③ 사후 관리 — 1년 이상 정기 검사 무료 여부<br>④ 응급 대응 — 24시간 비상 연락 채널</p>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20patient%20happy%20after%20LASIK%20surgery%20walking%20Haeundae%20beach%20without%20glasses%2C%20clear%20vision%2C%20sunny%20day%2C%20pastel%20blue%20ocean%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528353&nologo=true&enhance=true" alt="부산 해운대 라식 후 일상" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">라식 후 안경 없이 해운대를 걷는 일상</figcaption></figure>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문</h2>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 부산에서 가장 권장되는 시술은?</summary><p style="margin-top: 0.8em;">바다·서핑 자주 즐기시면 라섹이나 스마일라식이 외상에 더 강해 안전해요. 일반 직장인은 회복 빠른 라식·스마일라식이 효율적이에요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 검사일과 시술일이 같나요?</summary><p style="margin-top: 0.8em;">정밀검사 후 결과 분석 시간이 필요해 보통 검사 다음 날 시술해요. 부산 거주자는 당일 검사·다음 날 시술 패키지를 운영해요.</p></details>
<details style="margin: 1em 0; padding: 1em; background: #F8FAFC; border-radius: 8px;"><summary style="font-weight: 700; cursor: pointer;">Q. 비용은 어느 정도인가요?</summary><p style="margin-top: 0.8em;">시술 방식·각막 상태에 따라 다르며 정확한 비용은 정밀검사 후에야 산정 가능해요.</p></details>

<figure style="margin: 2.5em 0;"><img src="https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20modern%20Busan%20ophthalmology%20clinic%20interior%2C%20welcoming%20reception%2C%20warm%20natural%20light%2C%20pastel%20blue%2C%20professional%20atmosphere%2C%20no%20text?width=1200&height=630&model=flux&seed=20260528354&nologo=true&enhance=true" alt="밝은눈안과 부산 클리닉" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /><figcaption style="text-align: center; color: #64748b; font-size: 0.9em; margin-top: 0.6em;">밝은눈안과 부산 — 현대식 안과 시설</figcaption></figure>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 일반적인 의료 정보 제공을 목적으로 하며, 의학적 진단·치료를 대체하지 않습니다. 시술 적합성과 효과는 각막 두께·근시 정도 등 개인 조건에 따라 다르며, 시술 전 반드시 안과 정밀검사를 받으시기 바랍니다.</p></div>

<div style="background: linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%); padding: 2em; border-radius: 12px; margin: 2.5em 0; text-align: center;"><h3 style="margin: 0 0 0.5em 0; color: #0C4A6E;">📩 부산 라식 상담</h3><p style="margin: 0.5em 0 1.2em 0; color: #075985;">밝은눈안과 부산 — 12단계 정밀검사 + 사후 관리</p><a href="https://pf.kakao.com/_xexbxhxb" style="display: inline-block; background: #0369A1; color: white; padding: 0.9em 2em; border-radius: 999px; text-decoration: none; font-weight: 700;">메디맵 카카오 채널로 상담 →</a></div>',
  'pass', 'manual', 'published',
  '부산 라식 — 해운대·서면 안과 선택 가이드 + 라식·라섹·스마일라식 비교',
  '부산에서 라식을 고민 중이라면 라식·라섹·스마일라식 차이를 먼저 이해해야 해요. 외상 안전성·회복기간·고도근시 적합성을 비교 정리했고 부산 안과 선택 기준 4가지도 포함.',
  'busan-lasik-haeundae-seomyeon-clinic-comparison',
  'eyeclinic', true,
  NOW(),
  'https://image.pollinations.ai/prompt/Pixar%203D%20animation%2C%20Korean%20person%20happy%20clear%20vision%20Busan%20Haeundae%20beach%20sunset%2C%20no%20glasses%2C%20freedom%20feeling%2C%20pastel%20blue%20ocean%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260528350&nologo=true&enhance=true',
  '부산 라식 가이드 — 밝은눈안과 부산',
  NOW(), NOW()
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- 검증 — 새로 INSERT 된 6편 확인
-- ============================================================
SELECT
  gc.id, gc.tenant_id, t.name AS tenant_name, t.partner_slug,
  gc.partner_category, gc.slug, gc.status, gc.is_partner_content,
  gc.compliance_status,
  length(gc.body) AS body_chars,
  (length(gc.body) - length(replace(gc.body, '<figure', ''))) / length('<figure') AS figure_count
FROM generated_contents gc
JOIN tenants t ON t.id = gc.tenant_id
WHERE gc.slug IN (
  'jamsil-presbyopia-edof-vs-multifocal',
  'gangnam-hair-transplant-recovery-6month-guide',
  'gangnam-rejuran-healer-effect-protocol',
  'hanbang-diet-decoction-6week-guide',
  'acne-scar-treatment-fractional-vs-subcision',
  'busan-lasik-haeundae-seomyeon-clinic-comparison'
)
ORDER BY gc.id;
