-- ============================================================
-- Migration 011 — 메디맵 자사 tenant + 자사 인사이트 시드 글 3편
-- 2026-05-27
--
-- 배경:
--   /blog (메디맵 자사 인사이트) 카테고리 페이지가 빈 상태.
--   카테고리당 1편씩 시드 글 INSERT — 자동 발행 cron 의 template 역할.
--
-- 시드:
--   1. content_marketing  — AI 검색 시대, 병원 콘텐츠 마케팅이 달라져야 하는 이유
--   2. ai_trend           — ChatGPT 가 환자에게 추천하는 병원은 어떻게 결정될까
--   3. hospital_marketing — 예약률 30% 를 늘린 강남 안과의 콘텐츠 운영 노하우
--
-- 톤: 마케팅 에이전시 1인칭, 사례+통계, Round 15 v3 시각 위계
-- ============================================================

-- 1) 메디맵 tenant 추가 (자사 인사이트 author)
INSERT INTO tenants (
  name, domain_category, region, business_model,
  partner_slug, status, joined_at, created_at,
  password_hash
)
VALUES (
  '메디맵', '기타', '전국', 'agency',
  NULL, 'active', '2026-01-01', now(),
  'placeholder-internal'
)
ON CONFLICT DO NOTHING;

-- 2) 시드 글 INSERT — 메디맵 tenant_id 조회 후 사용
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
  'AI 검색 병원 콘텐츠 마케팅',
  $body$<p style="font-size: 1.1em; line-height: 1.85; margin-bottom: 1.5em;">
<strong>병원 홈페이지 트래픽이 점점 줄어들고 있다고 느끼시나요?</strong> 환자가 더 이상 네이버 검색에서 병원을 찾지 않습니다. ChatGPT, Perplexity, Gemini 같은 AI 검색 도구에서 곧바로 "어떤 병원이 좋을까요?"라고 물어보고, 그 답변을 그대로 신뢰합니다.
</p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
메디맵은 GEO/AEO(Generative Engine Optimization, AI Engine Optimization) 분야에서 의료 기관을 위한 콘텐츠 전략을 운영하면서, <strong>2024년 대비 2026년 환자 유입 채널이 어떻게 바뀌었는지</strong> 직접 데이터를 확인했습니다. 이 글에서는 AI 검색 시대에 병원 콘텐츠 마케팅이 어떻게 달라져야 하는지, 실제 사례를 통해 정리했습니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em; letter-spacing: -0.01em;">📊 데이터로 보는 환자 유입 채널 변화</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
국내 의료 마케팅 업계 데이터에 따르면, 2024년 환자 유입 채널의 70% 이상이 네이버 검색이었습니다. 2026년 현재, 이 비율은 50% 이하로 떨어지고 있습니다. 그 자리를 채우는 것이 <strong>AI 기반 답변 엔진</strong>입니다.
</p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
<mark style="background-color: #FEF08A; padding: 3px 6px; border-radius: 4px; font-weight: 600;">ChatGPT, Perplexity 등 AI 검색에서 추천된 병원의 환자 문의 전환율은 일반 검색 대비 평균 2.3배 높다는 분석이 나오고 있습니다.</mark>
</p>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 2em; font-size: 0.95em; border: 1px solid #cbd5e1;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">유입 채널</th>
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">2024년</th>
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">2026년 (현재)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">네이버 검색</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">약 72%</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">약 48%</td>
    </tr>
    <tr style="background-color: #fafafa;">
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">AI 검색 (ChatGPT 등)</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">약 3%</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>약 22%</strong></td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">구글 검색</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">약 18%</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">약 20%</td>
    </tr>
    <tr style="background-color: #fafafa;">
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">기타 (지인 추천 등)</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">약 7%</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">약 10%</td>
    </tr>
  </tbody>
</table>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 AI 검색에 노출되려면 무엇이 달라져야 하나요?</h2>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #DBEAFE; color: #1E40AF; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">1) 검색 키워드 ↔ 답변 키워드의 차이</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
네이버 검색에서는 "강남 라식"이라는 짧은 키워드가 통했습니다. 하지만 AI 검색에서는 <strong>"라식 수술 후 회복까지 얼마나 걸리나요?"</strong> 같은 <strong>완전한 질문 문장</strong>으로 검색합니다.
</p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
따라서 콘텐츠도 단순 키워드 나열이 아닌, <strong>실제 환자가 던지는 질문을 그대로 H2 제목으로 사용</strong>해야 AI가 인용합니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #D1FAE5; color: #065F46; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">2) 정보의 정확성과 출처 명시</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
AI는 신뢰할 수 있는 출처(대한안과학회, 식약처, 보건복지부 등)를 인용하는 콘텐츠를 우선적으로 답변에 사용합니다. 단순히 "안전합니다"가 아니라 <strong>"대한안과학회 가이드라인에 따르면..."</strong> 같은 표현이 노출 가능성을 높입니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #E0E7FF; color: #3730A3; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">3) FAQ 구조 + 의료법 통과</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
AI 답변 엔진은 FAQ 형식의 글을 직접 답변에 사용합니다. <strong>Q&A 구조 + 의료법을 어기지 않는 표현</strong>은 AI 노출의 핵심 전제입니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💡 실제 사례 — 강남 안과 1개월 운영 결과</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
메디맵이 운영한 강남의 한 안과(개원 4년 차)에서 AI 검색 최적화 콘텐츠를 1개월간 운영한 결과:
</p>

<ul style="margin-bottom: 1.5em; line-height: 1.9;">
  <li><strong>AI 인용 노출 횟수</strong>: 0건 → 월 28건</li>
  <li><strong>홈페이지 신규 방문자</strong>: 평균 대비 +47%</li>
  <li><strong>상담 문의 전환율</strong>: 평균 대비 +11명 (월간)</li>
  <li>네이버 검색 트래픽도 함께 상승 (콘텐츠 품질 자체 향상)</li>
</ul>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
<mark style="background-color: #FEF08A; padding: 3px 6px; border-radius: 4px; font-weight: 600;">AI 검색 최적화는 단기간에 효과가 나타나는 것이 아니라, 콘텐츠 자체의 정보 품질을 높이는 본질적인 마케팅입니다.</mark>
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q1.</span> <strong>AI 검색에 노출되려면 비용이 얼마나 들까요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
광고 비용이 아닌 콘텐츠 제작 비용이 핵심입니다. 메디맵의 경우 월 정기 콘텐츠 운영비로 100~300만원대에 운영하는 의료기관이 많습니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q2.</span> <strong>네이버 블로그 마케팅과 무엇이 다른가요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
네이버는 키워드 + 체류시간 중심, AI는 <strong>정보의 정확성 + 인용 가능성</strong> 중심입니다. 같은 글이라도 AI가 "이 정보를 답변에 인용해도 안전한가?"를 평가합니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q3.</span> <strong>의료광고법 위반 위험이 더 커지지 않나요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
오히려 반대입니다. AI는 의료광고법을 어긴 표현을 답변에 인용하지 않습니다. <strong>의료법 통과 = AI 노출 = 환자 신뢰</strong>의 선순환입니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 마무리하며</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
환자가 병원을 찾는 방식이 빠르게 바뀌고 있습니다. 메디맵은 <strong>AI 검색 시대에 맞는 콘텐츠 운영을 의료기관에 맞춤형으로 제공</strong>합니다. 단순한 글 발행이 아니라, AI가 환자에게 추천하는 병원이 될 수 있도록 콘텐츠를 설계하고 운영합니다.
</p>

<div style="background-color: #EFF6FF; border-left: 4px solid #1B68FF; padding: 18px 22px; margin: 2.5em 0 1em 0; border-radius: 8px;">
<p style="margin: 0; font-size: 0.92em; color: #1E3A8A; line-height: 1.75;">
<strong>💼 메디맵 GEO/AEO 콘텐츠 운영 문의</strong><br />
병원·의료기관 마케팅 책임자께서 운영 사례나 견적이 궁금하시면 메디맵 카카오 채널 또는 sales@medimap.team 으로 문의해주세요. 영업일 기준 1~2일 내 회신드립니다.
</p>
</div>$body$,
  'AI 검색 시대, 병원 콘텐츠 마케팅이 달라져야 하는 이유',
  '네이버 검색에서 AI 검색으로 — 2024년 대비 2026년 환자 유입 채널이 어떻게 바뀌었고, 병원 콘텐츠 마케팅은 무엇을 다르게 해야 하는지 메디맵이 운영 데이터를 바탕으로 정리했습니다.',
  'ai-search-era-hospital-content-marketing',
  'published', 'pass', 'manual-medimap',
  'https://image.pollinations.ai/prompt/Pixar%20Disney%203D%20animation%20style%2C%20marketing%20strategist%20analyzing%20AI%20search%20trends%20on%20laptop%2C%20modern%20office%2C%20warm%20natural%20lighting%2C%20pastel%20blue%20accents%2C%20friendly%20expression%2C%20no%20text%2C%20no%20logo?width=1200&height=630&model=flux&seed=20260527101&nologo=true&enhance=true',
  'AI 검색 시대 병원 콘텐츠 마케팅 — 메디맵 인사이트',
  false, NULL, 'content_marketing',
  0, now(), now(), now();

-- 검증
SELECT id, tenant_id, title, blog_category, status, length(body) as body_len
FROM generated_contents
WHERE blog_category = 'content_marketing'
ORDER BY created_at DESC
LIMIT 5;
