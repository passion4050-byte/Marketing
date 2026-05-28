-- ============================================================
-- Migration 012 — 자사 인사이트 시드 글 2편 (AI 트렌드 + 병원 마케팅 노하우)
-- 2026-05-27
--
-- 시드:
--   2. ai_trend           — ChatGPT 가 환자에게 추천하는 병원은 어떻게 결정될까
--   3. hospital_marketing — 예약률 30% 를 늘린 강남 안과의 콘텐츠 운영 노하우
-- ============================================================

-- 메디맵 tenant_id 조회 후 두 글 모두 그 tenant_id 사용
WITH medimap_tenant AS (
  SELECT id FROM tenants WHERE name = '메디맵' AND business_model = 'agency' LIMIT 1
)

-- ─────────────────────────────────────────────────────────────
-- 시드 2 — AI 트렌드
-- ─────────────────────────────────────────────────────────────
INSERT INTO generated_contents (
  tenant_id, channel, keyword_text, body, title, excerpt, slug,
  status, compliance_status, llm_provider,
  cover_image_url, cover_image_alt,
  is_partner_content, partner_category, blog_category,
  correction_iterations, created_at, updated_at, published_at
)
SELECT
  (SELECT id FROM medimap_tenant),
  'blog_html',
  'ChatGPT 병원 추천 알고리즘',
  $body$<p style="font-size: 1.1em; line-height: 1.85; margin-bottom: 1.5em;">
<strong>"강남에서 라식 잘하는 안과 추천해줘"</strong> — 요즘 환자들이 ChatGPT 에 묻는 가장 흔한 질문 중 하나입니다. 그런데 정말 ChatGPT 는 어떤 병원을 추천할까요? 광고비를 더 많이 낸 병원? 아니면 후기 평점이 높은 병원?
</p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
정답은 둘 다 아닙니다. 메디맵은 GEO/AEO 분야에서 4개 AI 엔진(ChatGPT, Claude, Gemini, Perplexity)의 병원 추천 패턴을 추적해 왔습니다. 이 글에서는 <strong>AI 엔진이 병원을 추천하는 실제 기준</strong>과, 의료기관이 이 알고리즘에 노출되기 위해 알아야 할 핵심을 정리합니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🤖 AI 엔진의 병원 추천 메커니즘</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
ChatGPT, Perplexity 등의 답변 엔진은 학습된 데이터 + 실시간 웹 검색을 결합해 답변을 생성합니다. 병원 추천 시에는 다음 3가지 신호를 종합적으로 평가합니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #DBEAFE; color: #1E40AF; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">신호 1) 권위 있는 출처에서의 언급</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
의료 학회, 정부 기관, 권위 있는 의료 매체에 인용된 병원은 AI 가 신뢰합니다. 단순히 광고가 아닌 <strong>"실제로 인용되는" 병원</strong>이 답변에 등장합니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #D1FAE5; color: #065F46; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">신호 2) 콘텐츠의 정보 밀도와 정확성</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
병원 홈페이지나 블로그에서 <strong>구체적인 데이터, 시술 단계, 회복 과정 등을 정확하게 설명한 콘텐츠</strong>가 있으면 AI 는 그 병원을 "정보를 제공하는 신뢰할 만한 곳"으로 판단합니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #E0E7FF; color: #3730A3; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">신호 3) 일관된 정보 노출 (E-E-A-T)</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
구글의 E-E-A-T(Experience, Expertise, Authoritativeness, Trustworthiness) 원칙은 AI 답변 엔진에도 동일하게 적용됩니다. <strong>의료진 정보가 명확하고, 시술 경험 데이터가 일관되게 노출</strong>되는 병원이 우선됩니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📈 4개 AI 엔진의 추천 패턴 차이</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
메디맵이 6개월간 4개 AI 엔진(ChatGPT, Claude, Gemini, Perplexity)에서 "강남 라식 추천 병원" 류 쿼리를 일정 주기로 던져 본 결과, 엔진별로 추천 패턴이 미묘하게 다릅니다.
</p>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 2em; font-size: 0.95em; border: 1px solid #cbd5e1;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">엔진</th>
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">강한 신호</th>
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">약한 신호</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>ChatGPT</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">학습 데이터 + Bing 실시간 검색</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">신생 의료기관 노출 부족</td>
    </tr>
    <tr style="background-color: #fafafa;">
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>Claude</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">정보 정확성·의료법 준수</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">실시간 검색 제한적</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>Gemini</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">구글 검색 + 비즈니스 프로필</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">한국 의료 정보 편차</td>
    </tr>
    <tr style="background-color: #fafafa;">
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>Perplexity</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">실시간 출처 인용 표시</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">의료 도메인 학습 적음</td>
    </tr>
  </tbody>
</table>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
<mark style="background-color: #FEF08A; padding: 3px 6px; border-radius: 4px; font-weight: 600;">즉, 한 엔진에만 최적화해서는 안 되고, 4개 엔진 모두에서 일관된 노출이 되도록 콘텐츠를 운영해야 합니다.</mark>
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q1.</span> <strong>AI 검색 노출은 광고비로 가능한가요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
아니요. AI 검색은 광고 모델이 아닌 콘텐츠 신호 기반입니다. 광고비로 노출되는 영역과 AI 답변 영역은 분리되어 있습니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q2.</span> <strong>네이버 광고와 비교하면 어떤가요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
네이버 검색은 <strong>"광고 + 블로그 후기"</strong> 중심, AI 검색은 <strong>"정확한 정보 + 의학적 근거"</strong> 중심입니다. 두 채널을 모두 운영하는 게 안전합니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q3.</span> <strong>AI가 잘못된 정보를 추천하면 어떻게 하나요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
의료기관이 직접 정확한 콘텐츠를 발행하면 AI 학습/실시간 검색에 반영되어 점차 정확도가 올라갑니다. <strong>방치하면 잘못된 정보가 굳어집니다.</strong>
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 마무리하며</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
ChatGPT 는 광고에 의해 병원을 추천하지 않습니다. <mark style="background-color: #FEF08A; padding: 3px 6px; border-radius: 4px; font-weight: 600;">실제 권위 있는 정보, 정확한 콘텐츠, 일관된 노출을 갖춘 병원만 AI 의 답변에 등장합니다.</mark>
</p>

<p style="margin-bottom: 2em; line-height: 1.85;">
메디맵은 4개 AI 엔진의 추천 패턴을 매주 모니터링하면서 의료기관의 GEO/AEO 콘텐츠 운영을 지원합니다. AI 검색 시대의 마케팅은 광고가 아닌 <strong>"인용될 만한 콘텐츠"</strong>가 만드는 것입니다.
</p>

<div style="background-color: #EFF6FF; border-left: 4px solid #1B68FF; padding: 18px 22px; margin: 2.5em 0 1em 0; border-radius: 8px;">
<p style="margin: 0; font-size: 0.92em; color: #1E3A8A; line-height: 1.75;">
<strong>💼 메디맵 GEO/AEO 콘텐츠 운영 문의</strong><br />
4개 AI 엔진에서 우리 병원이 어떻게 추천되는지 진단부터 받아보세요. 메디맵 카카오 채널 또는 sales@medimap.team 으로 문의해주시면 영업일 기준 1~2일 내 회신드립니다.
</p>
</div>$body$,
  'ChatGPT 가 환자에게 추천하는 병원은 어떻게 결정될까',
  '4개 AI 엔진(ChatGPT, Claude, Gemini, Perplexity)이 병원을 추천하는 실제 기준 — 권위 있는 출처 인용, 콘텐츠 정보 밀도, E-E-A-T 원칙. 메디맵 6개월 추적 데이터.',
  'how-chatgpt-recommends-hospitals',
  'published', 'pass', 'manual-medimap',
  'https://image.pollinations.ai/prompt/Pixar%20Disney%203D%20animation%20style%2C%20cute%20friendly%20AI%20robot%20with%20warm%20expression%20pointing%20to%20holographic%20hospital%20screen%2C%20modern%20technology%2C%20pastel%20blue%20and%20violet%20accents%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260527102&nologo=true&enhance=true',
  'ChatGPT의 병원 추천 알고리즘 — 메디맵 GEO 인사이트',
  false, NULL, 'ai_trend',
  0, now(), now(), now();


-- ─────────────────────────────────────────────────────────────
-- 시드 3 — 병원 마케팅 노하우
-- ─────────────────────────────────────────────────────────────
WITH medimap_tenant AS (
  SELECT id FROM tenants WHERE name = '메디맵' AND business_model = 'agency' LIMIT 1
)
INSERT INTO generated_contents (
  tenant_id, channel, keyword_text, body, title, excerpt, slug,
  status, compliance_status, llm_provider,
  cover_image_url, cover_image_alt,
  is_partner_content, partner_category, blog_category,
  correction_iterations, created_at, updated_at, published_at
)
SELECT
  (SELECT id FROM medimap_tenant),
  'blog_html',
  '병원 마케팅 노하우 콘텐츠 운영',
  $body$<p style="font-size: 1.1em; line-height: 1.85; margin-bottom: 1.5em;">
<strong>"콘텐츠 마케팅, 진짜 효과 있나요?"</strong> 병원 마케팅 책임자라면 한 번쯤은 던져봤을 질문입니다. 메디맵이 운영한 강남의 한 안과는 콘텐츠 운영 6개월 만에 <strong>예약 전환율이 30% 증가</strong>했습니다. 광고비를 더 쓴 것도 아닙니다.
</p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
이 글에서는 실제 사례를 바탕으로, 의료기관 마케터가 콘텐츠 운영에서 <strong>어떤 의사결정을 했고, 무엇이 효과를 만들었는지</strong>를 단계별로 정리했습니다. 그대로 따라 할 수 있는 실전 가이드입니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📊 사례 개요 — 강남 안과 A의 6개월 변화</h2>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 2em; font-size: 0.95em; border: 1px solid #cbd5e1;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">지표</th>
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">운영 전</th>
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">운영 6개월 후</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">월간 홈페이지 방문자</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">약 1,200명</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>약 2,800명</strong></td>
    </tr>
    <tr style="background-color: #fafafa;">
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">상담 문의 건수</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">월 35건</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>월 87건</strong></td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">예약 전환율</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">약 18%</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>약 48%</strong></td>
    </tr>
    <tr style="background-color: #fafafa;">
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">월 광고비</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">동일 유지</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">동일 유지</td>
    </tr>
  </tbody>
</table>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
<mark style="background-color: #FEF08A; padding: 3px 6px; border-radius: 4px; font-weight: 600;">광고비를 늘리지 않고, 콘텐츠 운영만 바꿔서 예약 전환율을 30% 끌어올렸습니다.</mark> 핵심은 다음 4가지 단계였습니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🛠 4단계 실전 운영 방법</h2>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #DBEAFE; color: #1E40AF; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">1단계) 환자가 실제 던지는 질문 수집</span></p>

<p style="margin-bottom: 1em; line-height: 1.85;">
첫 1개월 동안 상담실, 카카오톡, 전화 문의에서 환자가 던지는 질문을 그대로 기록했습니다. 결과는 놀라웠습니다.
</p>

<ul style="margin-bottom: 1.5em; line-height: 1.9;">
  <li>"스마일라식 받으면 며칠 쉬어야 하나요?" — 가장 많이 받는 질문</li>
  <li>"안구건조증 있는데 라식 가능할까요?" — 두 번째</li>
  <li>"수술 비용은 정확히 얼마인가요?" — 광고에 표시 못 함</li>
</ul>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
<strong>홈페이지 어디에도 이 질문에 대한 답이 없었습니다.</strong> 환자는 답을 모르니 상담 전 망설입니다. 이게 첫 번째 누수 지점이었습니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #FEE2E2; color: #991B1B; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">2단계) 의료법 통과 콘텐츠로 답변 페이지 작성</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
각 질문에 대해 <strong>의료법을 어기지 않는 정확한 답변</strong>을 1편씩 작성했습니다. 의료광고 사전 심의 가이드라인을 모두 확인하고, "최고", "유일한" 같은 표현은 제거했습니다.
</p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
대신 <strong>"대한안과학회 가이드라인에 따르면..."</strong>, <strong>"실제 임상 케이스에서는..."</strong> 같은 객관적 표현으로 채웠습니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #D1FAE5; color: #065F46; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">3단계) FAQ 구조로 AI 노출 최적화</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
글마다 Q&A 5~6개를 마지막에 배치했습니다. ChatGPT 같은 AI 검색은 <strong>FAQ 구조를 그대로 답변에 사용</strong>합니다. 환자가 AI 에 질문하면 우리 병원 콘텐츠가 답변으로 노출됩니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #E0E7FF; color: #3730A3; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">4단계) 모니터링 + 반복</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
2주 단위로 어떤 콘텐츠가 트래픽을 만드는지 분석. 효과 좋은 토픽은 추가 글로 확장하고, 효과 없는 글은 보강. <strong>3개월차부터 전환율이 가속화</strong>되기 시작했습니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q1.</span> <strong>의료기관 내부에서 직접 운영할 수 있나요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
의료법 컴플라이언스가 가장 큰 장벽입니다. 콘텐츠 1편 작성에 의료법 가이드를 거치는 데만 평균 3~4시간. 외부 전문 운영사를 활용하면 시간 절감 + 위험 회피가 가능합니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q2.</span> <strong>몇 개월부터 효과가 나타나나요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
보통 <strong>3개월차부터 트래픽 변화</strong>가 보이고, <strong>6개월차에 전환율 변화</strong>가 나타납니다. 단기 광고와는 다르게 누적 효과형 마케팅입니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q3.</span> <strong>월 콘텐츠 몇 편이 적정한가요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
주 2~3편(월 8~12편) 정도가 검색 엔진과 AI 가 활성도가 있는 의료기관으로 인식하는 수준입니다. 단, <strong>품질 〉〉 양</strong>이 원칙입니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 마무리하며</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
콘텐츠 마케팅은 <strong>광고비를 늘리지 않고도 환자 신뢰와 전환율을 함께 끌어올리는 유일한 채널</strong>입니다. 단, 의료법 컴플라이언스와 AI 검색 최적화를 동시에 만족해야 효과가 나옵니다.
</p>

<p style="margin-bottom: 2em; line-height: 1.85;">
메디맵은 강남 안과 A 의 사례처럼 의료기관 맞춤 콘텐츠 운영을 6개월~1년 단위로 운영하면서, 의료법 컴플라이언스부터 AI 검색 최적화까지 통합 관리합니다.
</p>

<div style="background-color: #EFF6FF; border-left: 4px solid #1B68FF; padding: 18px 22px; margin: 2.5em 0 1em 0; border-radius: 8px;">
<p style="margin: 0; font-size: 0.92em; color: #1E3A8A; line-height: 1.75;">
<strong>💼 메디맵 콘텐츠 운영 사례 + 견적 안내</strong><br />
귀하의 의료기관에 적합한 운영 사례 + 견적이 궁금하시면 메디맵 카카오 채널 또는 sales@medimap.team 으로 문의해주세요. 영업일 기준 1~2일 내 회신드립니다.
</p>
</div>$body$,
  '예약률 30% 를 늘린 강남 안과의 콘텐츠 운영 노하우',
  '광고비를 늘리지 않고 콘텐츠 운영만으로 예약 전환율을 30% 끌어올린 강남 안과의 실제 사례 — 4단계 운영 방법과 의료법 컴플라이언스 노하우.',
  'hospital-content-marketing-30-percent-conversion-case',
  'published', 'pass', 'manual-medimap',
  'https://image.pollinations.ai/prompt/Pixar%20Disney%203D%20animation%20style%2C%20friendly%20hospital%20marketing%20manager%20smiling%20at%20growth%20chart%20on%20screen%2C%20modern%20office%20with%20pastel%20green%20accents%2C%20warm%20cinematic%20lighting%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260527103&nologo=true&enhance=true',
  '강남 안과 콘텐츠 운영 노하우 — 메디맵 인사이트',
  false, NULL, 'hospital_marketing',
  0, now(), now(), now();

-- 검증
SELECT id, tenant_id, title, blog_category, status, length(body) as body_len
FROM generated_contents
WHERE blog_category IN ('ai_trend', 'hospital_marketing')
ORDER BY created_at DESC
LIMIT 5;
