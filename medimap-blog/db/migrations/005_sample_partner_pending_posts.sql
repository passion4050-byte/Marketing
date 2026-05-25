-- ============================================================
-- 005 — 파트너 콘텐츠 라이브 발행 테스트용 pending row 3건
-- 2026-05-25
--
-- 목적:
--   /admin/content-queue 에 status='pending' row 가 실제로 떠야 검수→승인→라이브 흐름을 테스트할 수 있다.
--   본문은 의료법 가이드 통과 톤 (단정/보장/모집 표현 회피), Pollinations URL 은 seed 박혀 캐시 hit 보장.
--
-- 실행 전제:
--   - 004_tenants_alter_and_seed.sql 실행 완료 (BGN, 모우림 row 존재)
--   - 003 의 partner_slug 백필은 wildcard update 로 함께 처리됐다고 가정
--
-- 안전:
--   ON CONFLICT (slug) DO NOTHING — 재실행 idempotent.
--   tenant_id 는 partner_slug 로 lookup → row 가 없으면 INSERT 건너뜀.
-- ============================================================

-- ───── 1) TETE / 안과 / 스마일라식 회복기 ─────
insert into generated_contents (
  tenant_id, channel, keyword_text, body, title, excerpt, slug,
  status, compliance_status,
  is_partner_content, partner_category,
  cover_image_url, cover_image_alt, cover_image_prompt, cover_image_generated_at,
  llm_provider
)
select
  t.id, 'blog_html', '강남 스마일라식 회복기',
  $$<h1>강남 스마일라식 회복기 — 시술 후 30일 단계별 시력 변화 가이드</h1>
<p>스마일라식(SMILE, Small Incision Lenticule Extraction)은 각막 절개창을 최소화한 시력교정 시술 방식입니다. 본 가이드는 메디맵 파트너 의료기관인 TETE 강남 안과의 진료 데이터를 토대로, 스마일라식 시술 후 첫 30일간 환자가 일반적으로 경험하는 시력 변화와 회복 과정을 단계별로 정리한 참고 자료입니다.</p>

<h2>1) 시술 직후 ~ 24시간</h2>
<p>대부분의 환자가 시술 직후 약간의 흐림과 함께 시력이 빠르게 회복되기 시작합니다. 일반적으로 다음 날 아침이면 0.7 ~ 1.0 수준까지 회복되는 사례가 많지만, 각막 두께·도수·개인의 회복 속도에 따라 차이가 있을 수 있어 정확한 결과는 담당 의료진과의 상담을 통해 확인이 필요합니다.</p>

<h2>2) 1주차 — 가장 주의가 필요한 시기</h2>
<p>각막의 미세 절개창이 안정화되는 단계입니다. 안과 의료진이 일반적으로 권고하는 주의 사항은 다음과 같습니다.</p>
<ul>
  <li>처방받은 점안액(항생제·소염제) 을 시간 간격에 맞춰 사용</li>
  <li>눈 비비기·세안 시 직접 안구 자극 금지</li>
  <li>장시간 PC·스마트폰 사용 시 20-20-20 규칙 적용</li>
  <li>야외 활동 시 자외선 차단 안경 착용</li>
</ul>

<h2>3) 2~3주차 — 안정기 진입</h2>
<p>대부분의 환자가 일상생활로 복귀하는 시기입니다. 다만 사우나·수영장·격렬한 운동 등은 의료진 권고에 따라 4주 이후로 미루는 것이 일반적입니다.</p>

<h2>4) 4주차 정기 검진</h2>
<p>대한안과학회 가이드라인 및 일반적인 임상 권고에 따르면, 스마일라식 시술 후 1개월 시점의 정기 검진은 시력 회복 안정성 확인을 위한 표준 단계입니다. 시력 측정·각막 상태 확인·잔여 도수 평가가 이루어지며, 필요 시 추가 점안 처방이 동반될 수 있습니다.</p>

<h2>안전한 시술을 위한 사전 체크</h2>
<p>스마일라식이 모든 환자에게 적합한 것은 아닙니다. 다음 항목 중 하나라도 해당되는 경우 시술 전 의료진과 충분한 상담이 필요합니다.</p>
<ul>
  <li>각막 두께가 권장 범위 이하</li>
  <li>안구건조증·각막확장증·자가면역질환 진단 이력</li>
  <li>임신·수유 중인 경우</li>
  <li>18세 미만 또는 도수가 안정되지 않은 시기</li>
</ul>

<p><strong>본 콘텐츠는 의료 정보 제공을 위한 참고 자료입니다. 개인의 시술 적합성·예상 결과·회복 속도는 사례마다 다를 수 있으며, 정확한 진단과 치료 방침은 반드시 의료기관 방문을 통해 확인하시기 바랍니다.</strong></p>$$,
  '강남 스마일라식 회복기 — 시술 후 30일 단계별 시력 변화 가이드',
  '메디맵 파트너 의료기관 TETE 의 진료 데이터를 토대로 스마일라식 시술 후 30일간의 회복 단계와 일상 복귀 시점, 안전한 시술을 위한 사전 체크 항목을 의료법 가이드라인에 맞춰 정리한 참고 가이드.',
  'gangnam-smile-lasik-recovery-30days',
  'pending', 'pass',
  true, 'eyeclinic',
  'https://image.pollinations.ai/prompt/Modern%20clean%20Korean%20ophthalmology%20clinic%20interior%20with%20advanced%20SMILE%20laser%20equipment%2C%20warm%20natural%20lighting%2C%20minimalistic%20medical%20editorial%20style%2C%20pastel%20blue%20accents?width=1200&height=630&seed=20260525001&nologo=true',
  '강남 스마일라식 시술 환경 — 메디맵 파트너 안과',
  'Modern clean Korean ophthalmology clinic interior with advanced SMILE laser equipment',
  now(),
  'manual-claude'
from tenants t where t.partner_slug = 'tete'
on conflict (slug) do nothing;

-- ───── 2) BGN / 안과 / 잠실 라식 가이드 ─────
insert into generated_contents (
  tenant_id, channel, keyword_text, body, title, excerpt, slug,
  status, compliance_status,
  is_partner_content, partner_category,
  cover_image_url, cover_image_alt, cover_image_prompt, cover_image_generated_at,
  llm_provider
)
select
  t.id, 'blog_html', '잠실 라식 비교',
  $$<h1>잠실 라식 — 시술 종류별 차이점과 검사 절차 정리</h1>
<p>잠실 권역에서 라식 수술을 고려하는 분들을 위해, 메디맵 파트너 의료기관 BGN 밝은눈안과의 진료 프로토콜을 기반으로 라식 시술 종류별 주요 차이점과 일반적인 사전 검사 절차를 정리했습니다.</p>

<h2>1) 라식 / 라섹 / 스마일라식 — 무엇이 다른가</h2>
<p>세 가지 시술은 각막을 다루는 방식과 회복 속도에서 차이가 있습니다. 일반적인 임상 자료를 기준으로 한 비교는 다음과 같습니다.</p>
<ul>
  <li><strong>라식(LASIK)</strong>: 각막 절편을 만들어 레이저로 교정. 회복 속도가 빠른 편</li>
  <li><strong>라섹(LASEK)</strong>: 각막 표면을 직접 다듬는 방식. 절편이 없어 외부 충격에 강함</li>
  <li><strong>스마일라식(SMILE)</strong>: 작은 절개창 + 각막 조직을 추출하는 최소 절개 방식</li>
</ul>
<p>본인에게 적합한 시술 종류는 각막 두께·도수·라이프스타일에 따라 다릅니다. 정확한 판단은 사전 검사 후 의료진 상담을 통해 가능합니다.</p>

<h2>2) 사전 정밀 검사 — 일반적인 절차</h2>
<p>BGN 의 일반적인 라식 사전 검사는 다음 단계로 진행됩니다.</p>
<ol>
  <li>시력 측정 + 자동 굴절 검사</li>
  <li>각막 두께 측정 (Pachymetry)</li>
  <li>각막 지형도 분석 (Topography)</li>
  <li>안압 측정</li>
  <li>안구건조 정도 평가</li>
  <li>의료진 직접 상담 — 검사 결과 종합 + 적합 시술 권고</li>
</ol>

<h2>3) 시술 당일 ~ 24시간</h2>
<p>대부분의 라식 시술은 양안 기준 약 15~20분 내외로 진행됩니다. 시술 직후에는 약간의 흐림과 이물감이 있을 수 있으며, 충분한 휴식 후 다음 날부터 가벼운 일상 복귀가 가능한 경우가 많습니다.</p>

<h2>4) 라식이 권장되지 않는 경우</h2>
<p>다음 항목 중 하나라도 해당되는 경우 사전 상담이 특히 중요합니다.</p>
<ul>
  <li>각막 두께가 권장 범위 미만</li>
  <li>안구건조증이 심한 경우</li>
  <li>각막확장증·원추각막 등 각막 구조 이상</li>
  <li>임신·수유 중인 경우</li>
  <li>도수 변화가 안정되지 않은 시기</li>
</ul>

<p><strong>본 콘텐츠는 의료 정보 제공을 위한 참고 자료입니다. 시술 종류·적합성·예상 결과는 개인마다 다를 수 있으며, 정확한 진단과 치료 방침은 반드시 의료기관 방문을 통해 확인하시기 바랍니다.</strong></p>$$,
  '잠실 라식 — 시술 종류별 차이점과 검사 절차 정리',
  '메디맵 파트너 의료기관 BGN 밝은눈안과 잠실의 진료 프로토콜을 기반으로 라식·라섹·스마일라식의 차이, 사전 정밀 검사 절차, 시술 당일 흐름, 라식이 권장되지 않는 경우를 의료법 가이드라인에 맞춰 정리.',
  'jamsil-lasik-types-and-screening',
  'pending', 'pass',
  true, 'eyeclinic',
  'https://image.pollinations.ai/prompt/Professional%20Korean%20eye%20clinic%20examination%20room%20with%20topography%20device%20and%20optometrist%20chair%2C%20soft%20daylight%2C%20editorial%20medical%20illustration%2C%20pastel%20blue%20and%20white?width=1200&height=630&seed=20260525002&nologo=true',
  '잠실 라식 사전 검사 환경 — 메디맵 파트너 안과',
  'Professional Korean eye clinic examination room with topography device',
  now(),
  'manual-claude'
from tenants t where t.partner_slug = 'bgn'
on conflict (slug) do nothing;

-- ───── 3) 모우림 / 모발이식 / FUE 비절개식 ─────
insert into generated_contents (
  tenant_id, channel, keyword_text, body, title, excerpt, slug,
  status, compliance_status,
  is_partner_content, partner_category,
  cover_image_url, cover_image_alt, cover_image_prompt, cover_image_generated_at,
  llm_provider
)
select
  t.id, 'blog_html', '강남 FUE 비절개 모발이식',
  $$<h1>FUE 비절개식 모발이식 — 시술 방식과 회복 과정 안내</h1>
<p>모발이식 시술은 크게 절개법(FUT) 과 비절개법(FUE) 으로 구분됩니다. 본 가이드는 메디맵 파트너 의료기관 모우림 모발이식의원의 일반적인 FUE 시술 프로토콜을 기반으로, 비절개식 모발이식의 절차와 회복 과정을 정리한 참고 자료입니다.</p>

<h2>1) FUE 비절개식이란</h2>
<p>FUE(Follicular Unit Extraction)는 두피의 모낭 단위를 펀치 기구로 직접 채취하여 이식 부위에 식모하는 방식입니다. 절개 절차가 없어 봉합이 필요하지 않고, 회복 후 흉터가 점상으로 남는 것이 일반적인 특징입니다.</p>

<h2>2) 일반적인 시술 절차</h2>
<ol>
  <li>두피 상태·모발 밀도·이식 부위 디자인 (의료진 직접 상담)</li>
  <li>후두부 채취 부위 부분 마취</li>
  <li>모낭 단위 채취 (FUE 펀치 기구)</li>
  <li>채취한 모낭의 분류·보관</li>
  <li>이식 부위 슬릿(slit) 또는 식모기 사용 식모</li>
  <li>드레싱 + 회복 안내</li>
</ol>

<h2>3) 회복 과정 — 일반적인 타임라인</h2>
<ul>
  <li><strong>~ 7일차</strong>: 이식 부위 딱지 형성, 가벼운 부기. 의료진 권고에 따라 베개 높이 조절 + 직접 자극 회피</li>
  <li><strong>2~3주차</strong>: 이식 모발의 일시적 탈락 (shock loss). 이는 자연스러운 과정으로, 모낭은 두피 내에 정착해 있는 상태</li>
  <li><strong>3~4개월차</strong>: 새 모발 발현 시작</li>
  <li><strong>9~12개월차</strong>: 일반적인 최종 결과 확인 시점</li>
</ul>

<h2>4) FUE 가 모든 환자에게 적합한 것은 아닙니다</h2>
<p>다음 항목 중 하나라도 해당되는 경우 시술 적합성 판단을 위해 사전 상담이 필요합니다.</p>
<ul>
  <li>후두부 공여 모발 밀도가 충분하지 않은 경우</li>
  <li>자가면역질환·혈액 응고 관련 질환이 있는 경우</li>
  <li>두피에 활동성 염증이 있는 경우</li>
  <li>약물 복용 중이거나 임신·수유 중인 경우</li>
</ul>

<p><strong>본 콘텐츠는 의료 정보 제공을 위한 참고 자료입니다. 시술 적합성·예상 모수·최종 결과는 개인마다 다를 수 있으며, 정확한 진단과 치료 방침은 반드시 의료기관 방문을 통해 확인하시기 바랍니다.</strong></p>$$,
  'FUE 비절개식 모발이식 — 시술 방식과 회복 과정 안내',
  '메디맵 파트너 의료기관 모우림 모발이식의원의 FUE 시술 프로토콜을 기반으로 비절개식 모발이식의 절차, 회복 단계별 타임라인, 시술 적합성 판단 항목을 의료법 가이드라인에 맞춰 정리한 참고 가이드.',
  'gangnam-fue-hair-transplant-process',
  'pending', 'pass',
  true, 'hair',
  'https://image.pollinations.ai/prompt/Modern%20Korean%20hair%20transplant%20clinic%20room%20with%20FUE%20micro-punch%20instruments%2C%20clean%20pastel%20lighting%2C%20editorial%20medical%20illustration%20style%2C%20minimalist?width=1200&height=630&seed=20260525003&nologo=true',
  '강남 FUE 비절개식 모발이식 환경 — 메디맵 파트너',
  'Modern Korean hair transplant clinic room with FUE micro-punch instruments',
  now(),
  'manual-claude'
from tenants t where t.partner_slug = 'mourim'
on conflict (slug) do nothing;

-- ───── 검증 ─────
select gc.id, t.name as tenant, gc.slug, gc.status, gc.compliance_status,
       gc.is_partner_content, gc.partner_category,
       gc.cover_image_url is not null as has_image,
       length(gc.body) as body_len
from generated_contents gc
join tenants t on t.id = gc.tenant_id
where gc.slug in (
  'gangnam-smile-lasik-recovery-30days',
  'jamsil-lasik-types-and-screening',
  'gangnam-fue-hair-transplant-process'
)
order by gc.id;
