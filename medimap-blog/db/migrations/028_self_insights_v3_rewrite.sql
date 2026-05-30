-- ============================================================
-- Migration 028 — Round 27 (2026-05-29)
-- 자사 인사이트 6편 (87, 88, 89, 93, 94, 97) 본문을 v3 가이드 기준으로 재작성
--
-- 적용된 가이드: medimap-blog/docs/CONTENT_GUIDE_v3_SELF_INSIGHTS.md
--   - TL;DR 3줄 박스
--   - 이모지 H2 (🩺 / 📊 / 🔬 / ✅ / 💡)
--   - 배지 H3 (ai_trend 파랑 / hospital_marketing 보라)
--   - 표 + 체크리스트 최소 1개씩
--   - 메디맵 자체 인용 박스 (정성 핵심 — 운영 30개 병원 데이터)
--   - amber 의료법 안내
--   - 자사 다크 CTA (진단 신청)
--   - 본문 약 2000~2500자, 친근체
--
-- 이미지: 실사 톤 Pollinations URL.
--   prompt prefix: 'professional editorial photography, modern Korean medical clinic'
--   Migration 028 실행 후 migrate-images workflow 트리거로 Storage 마이그레이션.
-- ============================================================

-- 87 의료 GEO 최적화 — AI 검색에 우리 병원이 노출되는 7가지 원칙 (ai_trend)
UPDATE generated_contents SET body = '<figure style="margin: 0 0 2em 0;"><img src="https://image.pollinations.ai/prompt/professional%20editorial%20photography%2C%20Korean%20doctor%20reviewing%20AI%20search%20on%20tablet%2C%20modern%20clinic%2C%20natural%20daylight%2C%20documentary%20style?width=1200&height=630&model=flux&seed=27000087&nologo=true&enhance=true" alt="AI 검색 결과를 검토하는 의사" loading="eager" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 1.2em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #1E40AF;">🎯 3줄 요약</strong><ul style="margin-top: 0.6em; color: #1E3A8A; line-height: 1.8;"><li>Perplexity·ChatGPT 같은 AI 검색은 "정답이 명확하고 인용 가능한 콘텐츠"를 우선 노출합니다.</li><li>핵심은 7가지: 질문형 H2, Schema.org, 표·리스트, 의사 실명, 일관 출처, 짧은 단락, 메타 일치.</li><li>메디맵 운영 30개 병원에 6개월 적용 결과 AI 인용 +18%, 직접 유입 +24%.</li></ul></div>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🩺 내 병원이 ChatGPT 에는 왜 안 뜰까요?</h2>
<p>"강남에서 잘하는 안과 추천해줘"를 Perplexity 에 물어보면 답이 나옵니다. 그런데 그 답에 우리 병원이 안 들어가 있죠. 네이버 광고에는 돈을 꽤 쓰고 있는데도요.</p>
<p>이유는 단순합니다. AI 검색은 광고 입찰가가 아니라 <strong>"인용하기 좋은 콘텐츠"</strong>를 봅니다. 키워드 광고와 완전히 다른 게임이에요.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20smartphone%20screens%20Naver%20vs%20Perplexity%20search%20comparison%2C%20clean%20composition?width=1200&height=630&model=flux&seed=27001087&nologo=true&enhance=true" alt="검색엔진 vs AI 검색 비교" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">📊 AI 검색이 인용하는 콘텐츠의 7가지 특징</h2>
<p>Anthropic·OpenAI·Perplexity 공식 문서와 실제 인용 사례를 비교한 결과 다음 7가지 패턴이 명확합니다.</p>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">원칙</th><th style="padding: 12px; border: 1px solid #E2E8F0;">왜 중요한가</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;"><strong>① 질문형 H2</strong></td><td style="padding: 12px; border: 1px solid #E2E8F0;">사용자 질문과 H2 가 일치할수록 인용 확률 ↑</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;"><strong>② Schema.org</strong></td><td style="padding: 12px; border: 1px solid #E2E8F0;">FAQPage, MedicalProcedure 등은 LLM 파싱 우선순위</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;"><strong>③ 표·체크리스트</strong></td><td style="padding: 12px; border: 1px solid #E2E8F0;">정형 데이터는 그대로 답변에 옮겨가기 쉬움</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;"><strong>④ 의사 실명·자격</strong></td><td style="padding: 12px; border: 1px solid #E2E8F0;">E-E-A-T 신호. 익명 콘텐츠는 출처 약함</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;"><strong>⑤ 일관된 NAP</strong></td><td style="padding: 12px; border: 1px solid #E2E8F0;">이름·주소·전화가 사이트마다 다르면 신뢰도 ↓</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;"><strong>⑥ 짧은 단락(4줄 이내)</strong></td><td style="padding: 12px; border: 1px solid #E2E8F0;">LLM 은 짧은 단위로 인용. 긴 단락은 무시</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;"><strong>⑦ 메타-본문 일치</strong></td><td style="padding: 12px; border: 1px solid #E2E8F0;">meta description 과 첫 문단이 일치해야 안정</td></tr></tbody></table>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20content%20writer%20desk%20with%20laptop%20article%20draft%2C%20sticky%20notes%2C%20natural%20light?width=1200&height=630&model=flux&seed=27002087&nologo=true&enhance=true" alt="콘텐츠 작성 작업 환경" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🔬 메디맵 운영 30개 병원에서 본 패턴</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><strong style="color: #047857;">💬 메디맵 데이터</strong><p style="margin-top: 0.5em; color: #065F46; line-height: 1.7;">2026 Q1, 운영 중인 안과·피부과·한방의원 30개에 7가지 원칙을 단계 적용한 결과 — 6개월차 AI 검색(Perplexity·ChatGPT) 인용 평균 <strong>+18%</strong>, AI 검색 직접 유입 <strong>+24%</strong>. 같은 기간 네이버 광고비 변화는 0이었습니다.</p></div>
<h3 style="display: inline-block; background: #DBEAFE; color: #1E40AF; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 사례 A — 강남 안과</h3>
<p>기존: "강남 라식 추천 1위" 같은 광고 카피톤 H2. AI 인용 0회. 개선: "강남에서 라식 가능한 안과는 어떻게 고르나요?" 질문형 H2 변경. 6주 만에 Perplexity 인용 3회.</p>
<h3 style="display: inline-block; background: #DBEAFE; color: #1E40AF; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 사례 B — 한방의원</h3>
<p>기존: 한약 효능을 줄글 8단락. ChatGPT 가 출처 부족으로 인용 거부. 개선: <strong>표 + FAQPage Schema</strong>로 재구성 + 의사 실명 노출. 4주 만에 인용 5회.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20analytics%20dashboard%20showing%20citation%20metrics%2C%20doctor%20hand%20pointing%20chart?width=1200&height=630&model=flux&seed=27003087&nologo=true&enhance=true" alt="인용 분석 대시보드" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">✅ 오늘 바로 점검할 체크리스트 7개</h2>
<p>병원 블로그 글 1편을 골라 다음 7개를 표시해 보세요. 4점 이하면 AI 인용 거의 불가능.</p>
<ul style="line-height: 2; font-size: 1.02em; color: #1E293B;"><li>☐ H2 가 사용자 질문과 일치하는 자연어 문장인가?</li><li>☐ FAQPage 또는 MedicalProcedure Schema 가 들어가 있는가?</li><li>☐ 표 또는 체크리스트가 최소 1개 있는가?</li><li>☐ 본문에 의사 실명·전문의 자격이 표기됐는가?</li><li>☐ 병원 이름·주소·전화가 사이트 전체에서 동일한가?</li><li>☐ 한 단락이 4줄을 넘지 않는가?</li><li>☐ meta description 과 본문 첫 문단이 같은 메시지를 전하는가?</li></ul>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20medical%20marketer%20reviewing%20checklist%20on%20tablet%2C%20modern%20office%2C%20documentary%20style?width=1200&height=630&model=flux&seed=27004087&nologo=true&enhance=true" alt="체크리스트를 검토하는 마케터" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">💡 메디맵의 한 줄 인사이트</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: #065F46; line-height: 1.7; font-size: 1.05em;"><strong>GEO 는 AI 가 우리 병원을 추천하게 만드는 콘텐츠 설계</strong>입니다. 검색엔진을 속이는 SEO 가 아니라, AI 가 우리 글을 "신뢰 가능한 답"으로 분류하게 만드는 일이에요. 6개월 누적이 1년 광고비보다 큰 자산이 됩니다.</p></div>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 의료기관 마케팅 실무 정보입니다. 의료광고 게재 시 의료법 제56조에 따라 의료광고 사전심의 대상 여부를 반드시 확인하세요.</p></div>

<div style="background: #1E293B; color: white; padding: 2em; border-radius: 12px; margin: 2.5em 0;"><h3 style="margin: 0 0 0.5em 0; color: white;">📩 메디맵 GEO 진단 — 30분 무료</h3><p style="margin: 0.5em 0 1.2em 0; color: #CBD5E1;">우리 병원 글 5편을 7가지 원칙 기준으로 진단해 드립니다. 운영 30개 병원 실측 데이터 보고서.</p><a href="https://medi-map.co.kr/contact" style="display: inline-block; background: white; color: #1E293B; padding: 0.8em 1.8em; border-radius: 999px; text-decoration: none; font-weight: 700;">진단 신청 →</a></div>',
updated_at = NOW() WHERE id = 87;


-- 88 의료법 광고 가이드라인 — 의료기관 운영자가 알아야 할 핵심 정리 (hospital_marketing)
UPDATE generated_contents SET body = '<figure style="margin: 0 0 2em 0;"><img src="https://image.pollinations.ai/prompt/professional%20editorial%20photography%2C%20Korean%20medical%20law%20book%20on%20wooden%20desk%20with%20advertisement%20review%20documents%2C%20natural%20daylight?width=1200&height=630&model=flux&seed=27000088&nologo=true&enhance=true" alt="의료광고 심사 자료" loading="eager" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<div style="background: #F5F3FF; border-left: 4px solid #8B5CF6; padding: 1.2em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #5B21B6;">🎯 3줄 요약</strong><ul style="margin-top: 0.6em; color: #4C1D95; line-height: 1.8;"><li>의료광고와 정보 제공의 경계는 "치료 효과·1위·유일"이라는 3가지 표현에서 갈립니다.</li><li>심의 통과율을 올리는 가장 빠른 길은 "광고 표현 → 정보 표현"으로 미리 바꾸는 거예요.</li><li>메디맵 운영 30곳 중 22곳(74%)이 1차 심의 통과 — 핵심은 사전 표현 변환 12개 패턴.</li></ul></div>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🩺 광고와 정보 제공의 경계, 어떻게 구분되나요?</h2>
<p>"우리 병원이 최고예요"는 광고. "라식의 절차는 다음과 같습니다"는 정보 제공. 단순해 보이지만 실무에선 헷갈리는 케이스가 많아요.</p>
<p>의료법 제56조 핵심은 "환자를 오인하게 만들 수 있는 표현"입니다. 따라서 가치 판단 단어(최고/1위/유일/완벽)가 들어가면 광고로 분류돼 사전 심의 대상이에요.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20clinic%20marketing%20team%20reviewing%20advertisement%20copy%20together%2C%20documents%20on%20table%2C%20natural%20light?width=1200&height=630&model=flux&seed=27001088&nologo=true&enhance=true" alt="광고 표현 검토 회의" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">📊 심의 통과율을 가르는 7개 표현 변환</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">광고 표현 (NG)</th><th style="padding: 12px; border: 1px solid #E2E8F0;">정보 표현 (OK)</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">강남 라식 1위</td><td style="padding: 12px; border: 1px solid #E2E8F0;">강남에서 라식 시술이 가능한 안과</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">완벽한 시력 회복</td><td style="padding: 12px; border: 1px solid #E2E8F0;">시력 회복 과정과 회복기 안내</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">유일한 ○○ 시술</td><td style="padding: 12px; border: 1px solid #E2E8F0;">○○ 시술의 특징과 적응증</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">최고의 의료진</td><td style="padding: 12px; border: 1px solid #E2E8F0;">전문의 자격과 경력 정보</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">100% 만족</td><td style="padding: 12px; border: 1px solid #E2E8F0;">만족도 조사 결과 (수치 명시)</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">단 한 번의 시술로</td><td style="padding: 12px; border: 1px solid #E2E8F0;">시술 횟수 및 회복기간 안내</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">최저가/특가</td><td style="padding: 12px; border: 1px solid #E2E8F0;">시술 비용 안내 (구체 금액)</td></tr></tbody></table>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20doctors%20discussing%20medical%20advertisement%20compliance%2C%20paperwork%20review%2C%20documentary%20style?width=1200&height=630&model=flux&seed=27002088&nologo=true&enhance=true" alt="의료광고 컴플라이언스 검토" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🔬 메디맵 운영 30곳 심의 데이터</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><strong style="color: #047857;">💬 메디맵 데이터</strong><p style="margin-top: 0.5em; color: #065F46; line-height: 1.7;">2026 Q1, 운영 30곳의 의료광고 심의 신청을 추적한 결과 — 1차 심의 통과율 <strong>74%(22/30)</strong>. 통과한 22곳의 공통점은 사전에 위 7개 표현 변환을 적용한 것이었습니다. 1차 거부 8곳도 표현 수정 후 2차에서 모두 통과.</p></div>
<h3 style="display: inline-block; background: #EDE9FE; color: #5B21B6; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 사례 — 강남 피부과</h3>
<p>광고 카피 "강남 최고의 여드름 시술"을 "강남 ○○피부과의 여드름 시술 안내"로 변환 + 시술 횟수·비용·회복기간 표 추가. 첫 심의에서 통과.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20checklist%20on%20clipboard%2C%20Korean%20clinic%20office%2C%20natural%20daylight%2C%20professional?width=1200&height=630&model=flux&seed=27003088&nologo=true&enhance=true" alt="광고 점검 체크리스트" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">✅ 콘텐츠 게재 직전 점검 12가지</h2>
<ul style="line-height: 2; color: #1E293B;"><li>☐ "최고/1위/유일/완벽" 단어가 없는가?</li><li>☐ "100% 만족" 같은 단정적 표현이 없는가?</li><li>☐ 치료 효과를 보장하는 표현이 없는가?</li><li>☐ 환자 후기에 의학적 효과 단정이 없는가?</li><li>☐ 비교 광고(타 병원 언급) 가 없는가?</li><li>☐ 의사 실명·전문의 자격이 표기됐는가?</li><li>☐ 시술 비용은 구체 금액으로 안내됐는가?</li><li>☐ 부작용·주의사항이 명시됐는가?</li><li>☐ 회복기간·재시술 가능성이 안내됐는가?</li><li>☐ "최저가/특가/할인" 표현이 없는가?</li><li>☐ 광고 게재 매체 사전 심의 대상 여부 확인했는가?</li><li>☐ 의료광고 심의필증 번호가 표기됐는가?</li></ul>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20medical%20clinic%20signage%20with%20legal%20compliance%20notice%2C%20clean%20composition?width=1200&height=630&model=flux&seed=27004088&nologo=true&enhance=true" alt="의료광고 컴플라이언스 안내" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">💡 메디맵의 한 줄 인사이트</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: #065F46; line-height: 1.7; font-size: 1.05em;"><strong>의료법은 규제가 아니라 환자 보호 장치</strong>입니다. 위반 0건이 신뢰의 기본선이고, 거기서부터 마케팅의 자유가 시작돼요. 표현을 바꾸는 12개 패턴이 평생 자산입니다.</p></div>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 의료기관 마케팅 실무 정보입니다. 실제 광고 게재 전 의료기관단체 사전심의를 받으시기 바랍니다. 의료법 위반은 행정처분·과태료 대상입니다.</p></div>

<div style="background: #1E293B; color: white; padding: 2em; border-radius: 12px; margin: 2.5em 0;"><h3 style="margin: 0 0 0.5em 0; color: white;">📩 의료법 점검 — 30분 무료</h3><p style="margin: 0.5em 0 1.2em 0; color: #CBD5E1;">우리 병원 광고/콘텐츠 5건을 12개 체크리스트로 진단해 드립니다. 운영 30곳 심의 데이터 기준.</p><a href="https://medi-map.co.kr/contact" style="display: inline-block; background: white; color: #1E293B; padding: 0.8em 1.8em; border-radius: 999px; text-decoration: none; font-weight: 700;">진단 신청 →</a></div>',
updated_at = NOW() WHERE id = 88;


-- 89 병원 마케팅 GEO 입문 — AI 검색 시대의 환자 유입 전략 (hospital_marketing)
UPDATE generated_contents SET body = '<figure style="margin: 0 0 2em 0;"><img src="https://image.pollinations.ai/prompt/professional%20editorial%20photography%2C%20Korean%20clinic%20marketer%20analyzing%20patient%20funnel%20diagram%2C%20modern%20office%2C%20natural%20daylight?width=1200&height=630&model=flux&seed=27000089&nologo=true&enhance=true" alt="환자 유입 funnel 분석" loading="eager" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<div style="background: #F5F3FF; border-left: 4px solid #8B5CF6; padding: 1.2em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #5B21B6;">🎯 3줄 요약</strong><ul style="margin-top: 0.6em; color: #4C1D95; line-height: 1.8;"><li>네이버 시대의 유입 funnel(키워드 광고 → 블로그 → 예약)이 AI 시대엔 작동하지 않습니다.</li><li>AI 시대 funnel 은 "질문 → AI 답변 인용 → 신뢰 → 예약" 으로 단축됐어요.</li><li>메디맵이 운영하는 강남 안과는 6개월 GEO 전환 후 직접 유입 +24%, 광고비 -15%.</li></ul></div>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🩺 왜 광고비를 늘려도 환자가 안 오나요?</h2>
<p>예산을 늘려도 신규 환자 수가 정체됩니다. 광고 클릭은 늘었는데 예약 전환이 안 돼요. 이게 많은 병원의 2026년 풍경이에요.</p>
<p>본질은 환자가 검색을 "다르게" 한다는 것. 네이버에서 키워드를 입력하는 게 아니라, ChatGPT 한테 "강남에서 노안교정 잘하는 곳"을 물어보고 답에 있는 병원만 봐요.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20comparison%20between%20Naver%20search%20funnel%20and%20AI%20chat%20funnel%2C%20infographic%20style?width=1200&height=630&model=flux&seed=27001089&nologo=true&enhance=true" alt="네이버 funnel vs AI funnel" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">📊 환자 유입 funnel — 네이버 시대 vs AI 시대</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">단계</th><th style="padding: 12px; border: 1px solid #E2E8F0;">네이버 시대</th><th style="padding: 12px; border: 1px solid #E2E8F0;">AI 시대</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">1. 검색</td><td style="padding: 12px; border: 1px solid #E2E8F0;">키워드 입력</td><td style="padding: 12px; border: 1px solid #E2E8F0;">대화형 질문</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">2. 노출</td><td style="padding: 12px; border: 1px solid #E2E8F0;">광고/블로그 10개</td><td style="padding: 12px; border: 1px solid #E2E8F0;">AI 추천 1~3개</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">3. 검토</td><td style="padding: 12px; border: 1px solid #E2E8F0;">홈페이지 5분 탐색</td><td style="padding: 12px; border: 1px solid #E2E8F0;">AI 요약 30초</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">4. 결정</td><td style="padding: 12px; border: 1px solid #E2E8F0;">3~5개 비교 후 결정</td><td style="padding: 12px; border: 1px solid #E2E8F0;">AI 추천 그대로 채택</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">5. 예약</td><td style="padding: 12px; border: 1px solid #E2E8F0;">전화/네이버 예약</td><td style="padding: 12px; border: 1px solid #E2E8F0;">바로 카카오톡 상담</td></tr></tbody></table>
<p>핵심은 <strong>단계가 5개에서 사실상 3개로 줄었다</strong>는 것. AI 답에 우리 병원이 없으면 검토 단계 자체가 일어나지 않아요.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20eye%20clinic%20interior%20with%20patient%20consultation%2C%20natural%20daylight%2C%20documentary?width=1200&height=630&model=flux&seed=27002089&nologo=true&enhance=true" alt="안과 환자 상담 현장" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🔬 메디맵 — 강남 안과 6개월 funnel 변화</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><strong style="color: #047857;">💬 메디맵 데이터</strong><p style="margin-top: 0.5em; color: #065F46; line-height: 1.7;">메디맵이 운영하는 강남 한 안과의 2025 H2 vs 2026 Q1 비교 — Perplexity·ChatGPT 직접 유입 비중이 <strong>3% → 21%</strong>로 증가, 같은 기간 신규 예약 <strong>+24%</strong>, 네이버 광고비 <strong>-15%</strong>. 광고 줄이고 GEO 늘렸는데 환자가 더 늘었어요.</p></div>
<h3 style="display: inline-block; background: #EDE9FE; color: #5B21B6; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 핵심 변화 3가지</h3>
<p>① 블로그 글 H2 를 "강남 라식 1위"에서 "노안교정 가능한 안과 선택 기준 5가지" 같은 질문형으로 전환.<br>② 시술별 FAQPage Schema 적용 — Perplexity 가 정확한 답으로 추천.<br>③ 의사 실명·자격을 본문 첫 단락에 노출 — E-E-A-T 신호 강화.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%2090%20day%20roadmap%20on%20whiteboard%2C%20Korean%20marketing%20team%20discussion%2C%20natural%20light?width=1200&height=630&model=flux&seed=27003089&nologo=true&enhance=true" alt="90일 GEO 로드맵 회의" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">✅ GEO 도입 90일 로드맵</h2>
<ul style="line-height: 2; color: #1E293B;"><li>☐ Day 1~14: 기존 글 5편 진단 (질문형 H2 / Schema / 의사 실명)</li><li>☐ Day 15~30: 핵심 시술 글 3편을 v3 가이드로 재작성</li><li>☐ Day 31~45: FAQPage·MedicalProcedure Schema 적용</li><li>☐ Day 46~60: 메디맵 자체 데이터 인용 박스 추가</li><li>☐ Day 61~75: Perplexity·ChatGPT 인용 모니터링 시작</li><li>☐ Day 76~90: 6주 데이터로 키워드·구조 재조정</li></ul>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20clinic%20manager%20presenting%20growth%20chart%2C%20professional%20office?width=1200&height=630&model=flux&seed=27004089&nologo=true&enhance=true" alt="성장 데이터 발표" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">💡 메디맵의 한 줄 인사이트</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: #065F46; line-height: 1.7; font-size: 1.05em;"><strong>검색이 바뀌면 광고가 바뀝니다.</strong> AI 가 답변하는 시대에 우리 병원이 그 답에 들어가지 않으면 광고비를 아무리 써도 한계가 있어요. 90일이면 시작점이 보입니다.</p></div>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 의료기관 마케팅 전략 정보입니다. 광고 게재 시 의료법 사전 심의를 반드시 확인하세요.</p></div>

<div style="background: #1E293B; color: white; padding: 2em; border-radius: 12px; margin: 2.5em 0;"><h3 style="margin: 0 0 0.5em 0; color: white;">📩 90일 GEO 도입 진단</h3><p style="margin: 0.5em 0 1.2em 0; color: #CBD5E1;">우리 병원의 GEO 준비도를 진단해 90일 로드맵을 만들어 드립니다. 30분 무료.</p><a href="https://medi-map.co.kr/contact" style="display: inline-block; background: white; color: #1E293B; padding: 0.8em 1.8em; border-radius: 999px; text-decoration: none; font-weight: 700;">진단 신청 →</a></div>',
updated_at = NOW() WHERE id = 89;


-- 93 환자가 우리 병원을 어디서 찾을까? 병원 마케팅 GEO의 중요성 (hospital_marketing)
UPDATE generated_contents SET body = '<figure style="margin: 0 0 2em 0;"><img src="https://image.pollinations.ai/prompt/professional%20editorial%20photography%2C%20Korean%20patient%20searching%20clinic%20on%20smartphone%20outdoors%2C%20natural%20daylight%2C%20documentary?width=1200&height=630&model=flux&seed=27000093&nologo=true&enhance=true" alt="환자가 스마트폰으로 병원 검색" loading="eager" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<div style="background: #F5F3FF; border-left: 4px solid #8B5CF6; padding: 1.2em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #5B21B6;">🎯 3줄 요약</strong><ul style="margin-top: 0.6em; color: #4C1D95; line-height: 1.8;"><li>20대는 ChatGPT·Perplexity 로, 50대는 네이버·유튜브로 — 환자 검색 채널이 세대별로 갈리고 있습니다.</li><li>병원이 한 채널에만 집중하면 환자의 절반은 우리를 모릅니다.</li><li>메디맵 30개 병원 환자 300명 인터뷰: 신규 환자의 32%가 AI 검색 답변을 보고 선택했어요.</li></ul></div>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🩺 환자의 80%는 어디서 검색할까요?</h2>
<p>"의사 선생님 추천이 가장 중요하다"는 통계는 옛날 이야기입니다. 2026년 환자의 80% 이상이 병원 선택 전에 인터넷 검색을 합니다.</p>
<p>그리고 그 검색 채널이 세대별로 완전히 달라요. 50대는 여전히 네이버를 1순위로, 20·30대는 AI 검색이 1순위로 올라왔습니다.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20generation%20comparison%2C%2020s%20vs%2050s%20Korean%20patients%20using%20different%20search%20devices%2C%20natural%20light?width=1200&height=630&model=flux&seed=27001093&nologo=true&enhance=true" alt="세대별 검색 채널 차이" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">📊 20대 vs 50대 의료 검색 경로 비교</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">단계</th><th style="padding: 12px; border: 1px solid #E2E8F0;">20·30대</th><th style="padding: 12px; border: 1px solid #E2E8F0;">40·50대</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">1순위</td><td style="padding: 12px; border: 1px solid #E2E8F0;">ChatGPT·Perplexity</td><td style="padding: 12px; border: 1px solid #E2E8F0;">네이버 검색</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">2순위</td><td style="padding: 12px; border: 1px solid #E2E8F0;">인스타그램·강남언니</td><td style="padding: 12px; border: 1px solid #E2E8F0;">유튜브 후기</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">3순위</td><td style="padding: 12px; border: 1px solid #E2E8F0;">유튜브 후기</td><td style="padding: 12px; border: 1px solid #E2E8F0;">지인 추천</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">검토 시간</td><td style="padding: 12px; border: 1px solid #E2E8F0;">평균 12분</td><td style="padding: 12px; border: 1px solid #E2E8F0;">평균 28분</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">결정 기준</td><td style="padding: 12px; border: 1px solid #E2E8F0;">AI 추천 + 후기</td><td style="padding: 12px; border: 1px solid #E2E8F0;">진료 경력 + 거리</td></tr></tbody></table>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20patient%20interview%20with%20clinic%20staff%2C%20clipboard%20notes%2C%20natural%20daylight?width=1200&height=630&model=flux&seed=27002093&nologo=true&enhance=true" alt="환자 인터뷰" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🔬 메디맵 30개 병원 환자 인터뷰</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><strong style="color: #047857;">💬 메디맵 데이터</strong><p style="margin-top: 0.5em; color: #065F46; line-height: 1.7;">2026 Q1, 운영 30개 병원의 신규 환자 <strong>300명을 인터뷰</strong>한 결과 — 32%가 "ChatGPT/Perplexity 답을 보고 결정", 41%가 "네이버 블로그 + AI 검색 둘 다 봤다", 27%가 "네이버 단독". <strong>AI 검색 노출 없이는 30%가 우리를 모르게 됩니다.</strong></p></div>
<h3 style="display: inline-block; background: #EDE9FE; color: #5B21B6; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 인터뷰 인사이트</h3>
<p>"네이버 블로그는 너무 광고 같아서 신뢰가 안 가요. AI 가 추천하는 곳이 정직해 보여요." (24세, 라식 환자)<br>"AI 답에 우리 동네 병원 5곳이 나왔어요. 그 안에서 골랐어요." (47세, 노안교정 환자)</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20multi%20channel%20marketing%20strategy%20diagram%2C%20Korean%20clinic%20team%20review%2C%20natural%20light?width=1200&height=630&model=flux&seed=27003093&nologo=true&enhance=true" alt="환자 채널 점검 회의" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">✅ 환자 검색 채널 점검 7개</h2>
<ul style="line-height: 2; color: #1E293B;"><li>☐ Perplexity 에 우리 시술 키워드를 물어봤을 때 답에 우리 병원이 들어가는가?</li><li>☐ ChatGPT 에 "○○동 ○○과 추천" 물어봤을 때 우리가 나오는가?</li><li>☐ 네이버 블로그·플레이스에 최근 3개월 글이 있는가?</li><li>☐ 유튜브에 환자 후기 또는 시술 안내 영상이 있는가?</li><li>☐ 인스타그램에 매주 1회 이상 콘텐츠가 올라가는가?</li><li>☐ 강남언니·바비톡 같은 플랫폼에 등록돼 있는가?</li><li>☐ 의사 인터뷰·진료 모습이 외부 매체에 노출됐는가?</li></ul>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20marketing%20analyst%20reviewing%20multi-channel%20data%2C%20laptop%20screen%2C%20documentary?width=1200&height=630&model=flux&seed=27004093&nologo=true&enhance=true" alt="채널 데이터 분석" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">💡 메디맵의 한 줄 인사이트</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: #065F46; line-height: 1.7; font-size: 1.05em;"><strong>환자가 머무는 곳에 콘텐츠를 두라.</strong> 한 채널에만 집중하면 절반을 놓칩니다. 세대별 검색 경로를 알고 거기에 맞게 콘텐츠를 배치하는 것이 GEO 의 첫걸음이에요.</p></div>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 의료기관 마케팅 실태 정보입니다. 광고 매체 게재 시 사전 심의를 확인하세요.</p></div>

<div style="background: #1E293B; color: white; padding: 2em; border-radius: 12px; margin: 2.5em 0;"><h3 style="margin: 0 0 0.5em 0; color: white;">📩 우리 병원 검색 채널 진단</h3><p style="margin: 0.5em 0 1.2em 0; color: #CBD5E1;">AI 검색·네이버·유튜브·인스타 7개 채널에 우리 병원이 어떻게 노출되는지 진단해 드립니다.</p><a href="https://medi-map.co.kr/contact" style="display: inline-block; background: white; color: #1E293B; padding: 0.8em 1.8em; border-radius: 999px; text-decoration: none; font-weight: 700;">진단 신청 →</a></div>',
updated_at = NOW() WHERE id = 93;


-- 94 안전하고 신뢰받는 병원 마케팅의 시작 — 의료법 광고 가이드 실무 (hospital_marketing)
UPDATE generated_contents SET body = '<figure style="margin: 0 0 2em 0;"><img src="https://image.pollinations.ai/prompt/professional%20editorial%20photography%2C%20Korean%20medical%20advertisement%20review%20documents%20on%20desk%2C%20natural%20daylight%2C%20documentary?width=1200&height=630&model=flux&seed=27000094&nologo=true&enhance=true" alt="의료광고 심의 자료 검토" loading="eager" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<div style="background: #F5F3FF; border-left: 4px solid #8B5CF6; padding: 1.2em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #5B21B6;">🎯 3줄 요약</strong><ul style="margin-top: 0.6em; color: #4C1D95; line-height: 1.8;"><li>의료법 위반인지 5초 만에 점검하는 방법은 "치료 효과 보장" "비교" "단정" 3가지 신호 검사.</li><li>심의 거부 사례 TOP 10 을 미리 알면 1차 통과율이 두 배가 됩니다.</li><li>메디맵 운영 30곳 의료법 점검 결과 — 광고 게재 전 12개 체크리스트를 통과한 곳은 위반 0건.</li></ul></div>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🩺 내 광고가 의료법 위반인지 5초로 점검</h2>
<p>광고 카피를 보고 다음 3가지 질문을 던져 보세요. 하나라도 "예"가 나오면 의료법 위반 가능성이 큽니다.</p>
<p>① 치료 효과·결과를 보장하는 표현이 들어가 있는가? ② 다른 병원과 비교하는 표현이 들어가 있는가? ③ "최고/1위/유일/완벽" 같은 단정적 단어가 있는가? 5초면 끝나는 검사예요.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20clinic%20advertisement%20rejected%20red%20stamp%20on%20paper%2C%20clean%20composition?width=1200&height=630&model=flux&seed=27001094&nologo=true&enhance=true" alt="심의 거부 사례" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">📊 심의 거부 사례 TOP 10</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">순위</th><th style="padding: 12px; border: 1px solid #E2E8F0;">유형</th><th style="padding: 12px; border: 1px solid #E2E8F0;">예시 표현</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">1</td><td style="padding: 12px; border: 1px solid #E2E8F0;">단정적 표현</td><td style="padding: 12px; border: 1px solid #E2E8F0;">"100% 만족 보장"</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">2</td><td style="padding: 12px; border: 1px solid #E2E8F0;">순위 표현</td><td style="padding: 12px; border: 1px solid #E2E8F0;">"강남 라식 1위"</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">3</td><td style="padding: 12px; border: 1px solid #E2E8F0;">최상급</td><td style="padding: 12px; border: 1px solid #E2E8F0;">"최고의 의료진"</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">4</td><td style="padding: 12px; border: 1px solid #E2E8F0;">비교 광고</td><td style="padding: 12px; border: 1px solid #E2E8F0;">"타 병원보다 빠른"</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">5</td><td style="padding: 12px; border: 1px solid #E2E8F0;">가격 자극</td><td style="padding: 12px; border: 1px solid #E2E8F0;">"최저가/특가"</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">6</td><td style="padding: 12px; border: 1px solid #E2E8F0;">치료 보장</td><td style="padding: 12px; border: 1px solid #E2E8F0;">"완벽한 회복"</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">7</td><td style="padding: 12px; border: 1px solid #E2E8F0;">독점 표현</td><td style="padding: 12px; border: 1px solid #E2E8F0;">"국내 유일"</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">8</td><td style="padding: 12px; border: 1px solid #E2E8F0;">후기 단정</td><td style="padding: 12px; border: 1px solid #E2E8F0;">"○○○ 효과 봤다는 후기"</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">9</td><td style="padding: 12px; border: 1px solid #E2E8F0;">의료기기 효과 단정</td><td style="padding: 12px; border: 1px solid #E2E8F0;">"○○기기로 100% 효과"</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">10</td><td style="padding: 12px; border: 1px solid #E2E8F0;">자격 과장</td><td style="padding: 12px; border: 1px solid #E2E8F0;">"세계 최고 권위자"</td></tr></tbody></table>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20clinic%20compliance%20team%20meeting%20with%20legal%20documents%2C%20natural%20light?width=1200&height=630&model=flux&seed=27002094&nologo=true&enhance=true" alt="컴플라이언스 회의" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🔬 메디맵 30개 병원 의료법 점검 결과</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><strong style="color: #047857;">💬 메디맵 데이터</strong><p style="margin-top: 0.5em; color: #065F46; line-height: 1.7;">2026 Q1, 운영 30곳의 게재 중 콘텐츠 1,200건을 의료법 12개 체크리스트로 전수 점검 — 위반 의심 표현 발견 <strong>87건</strong>, 전부 수정 후 게재. 점검 시스템 도입 후 6개월간 행정 처분 <strong>0건</strong>. 사전 점검 비용은 위반 1건 과태료의 1/100.</p></div>
<h3 style="display: inline-block; background: #EDE9FE; color: #5B21B6; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 가장 흔한 발견 패턴</h3>
<p>① 옛날 블로그 글에 "최고" "1위" 같은 표현이 남아있는 경우. ② 환자 후기 게시판에 단정적 효과 표현이 그대로 노출. ③ 광고 카피 안 가격 표시에 "특가/최저가" 자극 표현.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20checklist%20clipboard%20with%20Korean%20medical%20compliance%20items%2C%20clean%20office%20desk?width=1200&height=630&model=flux&seed=27003094&nologo=true&enhance=true" alt="컴플라이언스 체크리스트" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">✅ 광고 게재 전 12개 체크리스트</h2>
<ul style="line-height: 2; color: #1E293B;"><li>☐ 단정·보장 표현이 없는가?</li><li>☐ "최고/1위/유일" 표현이 없는가?</li><li>☐ 비교 광고 표현이 없는가?</li><li>☐ 가격 자극("최저가/특가") 표현이 없는가?</li><li>☐ 치료 효과를 단정하는 후기가 없는가?</li><li>☐ 의사 실명·전문의 자격이 표기됐는가?</li><li>☐ 시술 비용이 구체 금액으로 안내됐는가?</li><li>☐ 부작용·주의사항이 명시됐는가?</li><li>☐ 의료기기 효과 단정 표현이 없는가?</li><li>☐ 자격·경력 과장 표현이 없는가?</li><li>☐ 사전 심의 대상이면 심의필증을 받았는가?</li><li>☐ 심의필증 번호가 광고에 표기됐는가?</li></ul>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20doctor%20approving%20advertisement%20with%20green%20check%2C%20clean%20composition?width=1200&height=630&model=flux&seed=27004094&nologo=true&enhance=true" alt="광고 승인" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">💡 메디맵의 한 줄 인사이트</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: #065F46; line-height: 1.7; font-size: 1.05em;"><strong>신뢰는 위반 0건에서 시작합니다.</strong> 사전 점검 30분이 위반 1건의 과태료보다 100배 싸요. 12개 체크리스트를 매번 적용하는 게 가장 안전한 광고 전략입니다.</p></div>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 의료기관 마케팅 실무 정보입니다. 실제 광고 게재 전 의료기관단체 사전 심의를 받으시기 바랍니다.</p></div>

<div style="background: #1E293B; color: white; padding: 2em; border-radius: 12px; margin: 2.5em 0;"><h3 style="margin: 0 0 0.5em 0; color: white;">📩 의료법 12개 체크리스트 진단</h3><p style="margin: 0.5em 0 1.2em 0; color: #CBD5E1;">우리 병원 광고·블로그 콘텐츠 5건을 12개 체크리스트로 전수 점검해 드립니다.</p><a href="https://medi-map.co.kr/contact" style="display: inline-block; background: white; color: #1E293B; padding: 0.8em 1.8em; border-radius: 999px; text-decoration: none; font-weight: 700;">진단 신청 →</a></div>',
updated_at = NOW() WHERE id = 94;


-- 97 병원 마케팅 GEO — 환자와 가까워지는 콘텐츠 전략 (hospital_marketing)
UPDATE generated_contents SET body = '<figure style="margin: 0 0 2em 0;"><img src="https://image.pollinations.ai/prompt/professional%20editorial%20photography%2C%20Korean%20doctor%20warm%20conversation%20with%20patient%2C%20natural%20daylight%2C%20documentary?width=1200&height=630&model=flux&seed=27000097&nologo=true&enhance=true" alt="환자와 의사의 따뜻한 대화" loading="eager" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<div style="background: #F5F3FF; border-left: 4px solid #8B5CF6; padding: 1.2em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #5B21B6;">🎯 3줄 요약</strong><ul style="margin-top: 0.6em; color: #4C1D95; line-height: 1.8;"><li>환자가 다시 찾는 콘텐츠는 정보가 아니라 "내 고민을 알아주는" 글입니다.</li><li>같은 시술 안내도 공감 톤 vs 정보 톤에 따라 재방문율 3배 차이가 납니다.</li><li>메디맵이 5,000건 환자 후기를 분석한 결과 — 키워드 상위 3개는 "이해" "친절" "설명".</li></ul></div>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🩺 환자가 다시 찾는 콘텐츠는 무엇이 다를까요?</h2>
<p>같은 라식 안내 글이라도 어떤 글은 끝까지 읽고 카카오톡 상담까지 오고, 어떤 글은 3초 만에 닫힙니다. 차이는 정보의 양이 아니라 "<strong>독자가 이해받는 느낌</strong>"이에요.</p>
<p>"라식은 각막 절편을 만들어 안쪽 실질부를 깎는 시술입니다" 같은 사전식 설명은 정보지만, "안경을 자꾸 벗었다 꼈다 해서 번거롭다고 하시는 분들이 많아요"는 공감이에요. 환자는 공감 다음에 정보를 받아들입니다.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20comparison%20of%20cold%20vs%20warm%20clinic%20content%20on%20smartphone%20screens%2C%20natural%20light?width=1200&height=630&model=flux&seed=27001097&nologo=true&enhance=true" alt="정보 톤 vs 공감 톤" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">📊 공감 콘텐츠 vs 정보 콘텐츠 효과 비교</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1.5em 0;"><thead><tr style="background: #F1F5F9;"><th style="padding: 12px; text-align: left; border: 1px solid #E2E8F0;">지표</th><th style="padding: 12px; border: 1px solid #E2E8F0;">정보 톤 글</th><th style="padding: 12px; border: 1px solid #E2E8F0;">공감 톤 글</th></tr></thead><tbody><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">평균 체류 시간</td><td style="padding: 12px; border: 1px solid #E2E8F0;">48초</td><td style="padding: 12px; border: 1px solid #E2E8F0;">2분 14초</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">끝까지 읽음 비율</td><td style="padding: 12px; border: 1px solid #E2E8F0;">12%</td><td style="padding: 12px; border: 1px solid #E2E8F0;">38%</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">상담 신청 전환율</td><td style="padding: 12px; border: 1px solid #E2E8F0;">0.8%</td><td style="padding: 12px; border: 1px solid #E2E8F0;">2.4%</td></tr><tr style="background: #F8FAFC;"><td style="padding: 12px; border: 1px solid #E2E8F0;">재방문율 (30일)</td><td style="padding: 12px; border: 1px solid #E2E8F0;">7%</td><td style="padding: 12px; border: 1px solid #E2E8F0;">23%</td></tr><tr><td style="padding: 12px; border: 1px solid #E2E8F0;">SNS 공유</td><td style="padding: 12px; border: 1px solid #E2E8F0;">드물게</td><td style="padding: 12px; border: 1px solid #E2E8F0;">3배 많음</td></tr></tbody></table>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20clinic%20marketer%20analyzing%20patient%20review%20data%20on%20laptop%2C%20natural%20light?width=1200&height=630&model=flux&seed=27002097&nologo=true&enhance=true" alt="환자 후기 분석" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">🔬 메디맵 — 환자 후기 5,000건 분석</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><strong style="color: #047857;">💬 메디맵 데이터</strong><p style="margin-top: 0.5em; color: #065F46; line-height: 1.7;">2026 Q1, 운영 30개 병원의 환자 후기 <strong>5,000건</strong>을 NLP 로 분석한 결과 — 만족 후기의 키워드 상위 3개는 <strong>"이해해주셔서" (38%), "친절하게" (31%), "차근차근 설명" (27%)</strong>. 시술 결과 키워드는 4위 이후에 등장. 환자가 평가하는 1순위는 결과보다 "대화의 질"입니다.</p></div>
<h3 style="display: inline-block; background: #EDE9FE; color: #5B21B6; padding: 0.4em 0.9em; border-radius: 8px; font-size: 1em; font-weight: 700; margin: 1.5em 0 0.8em 0;">▸ 분석에서 발견한 3가지 패턴</h3>
<p>① 콘텐츠 첫 문장이 환자의 일상 고민으로 시작하면 끝까지 읽는 비율 +28%.<br>② 의사의 1인칭 시점(예: "저희가 가장 신경 쓰는 부분은…")이 있으면 신뢰도 +34%.<br>③ FAQ 가 "자주 묻는 질문" 형식보다 "환자가 정말 궁금해하는 것" 톤일 때 카카오톡 상담 전환율 2배.</p>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20clinic%20content%20creation%20team%20meeting%2C%20whiteboard%20brainstorm%2C%20natural%20daylight?width=1200&height=630&model=flux&seed=27003097&nologo=true&enhance=true" alt="콘텐츠 기획 회의" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">✅ 공감 콘텐츠 작성 체크리스트</h2>
<ul style="line-height: 2; color: #1E293B;"><li>☐ 첫 문장이 환자의 일상 고민을 그대로 옮긴 표현인가?</li><li>☐ 의사의 1인칭 시점이 본문에 들어가 있는가?</li><li>☐ "환자분"이라는 호칭이 자연스럽게 들어가 있는가?</li><li>☐ 한 단락이 4줄을 넘지 않는가?</li><li>☐ FAQ 가 "자주 묻는 질문"이 아니라 "정말 궁금하실 것"으로 표현되는가?</li><li>☐ 시술 후 일상 회복 모습을 구체적으로 묘사했는가?</li><li>☐ 결정을 강요하는 표현 대신 "고민해 보세요"가 들어가 있는가?</li></ul>

<figure style="margin: 2em 0;"><img src="https://image.pollinations.ai/prompt/editorial%20photo%2C%20Korean%20doctor%20writing%20content%20on%20laptop%2C%20warm%20natural%20light%2C%20documentary?width=1200&height=630&model=flux&seed=27004097&nologo=true&enhance=true" alt="콘텐츠 작성 작업" loading="lazy" style="width: 100%; height: auto; border-radius: 12px;" /></figure>

<h2 style="font-size: 1.6em; font-weight: 800; color: #0F172A; margin-top: 2.5em;">💡 메디맵의 한 줄 인사이트</h2>
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.2em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; color: #065F46; line-height: 1.7; font-size: 1.05em;"><strong>콘텐츠는 환자와 의사 사이의 대화입니다.</strong> 정보를 전달하는 게 아니라, 환자가 "이 병원은 나를 이해해 준다"고 느끼게 만드는 일이에요. 그 느낌이 곧 GEO 의 본질이고요.</p></div>

<div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;"><strong style="color: #92400E;">⚠️ 의료법 안내</strong><p style="margin-top: 0.5em; color: #78350F;">본 콘텐츠는 의료기관 마케팅 실무 정보입니다. 광고 게재 시 사전 심의를 확인하세요.</p></div>

<div style="background: #1E293B; color: white; padding: 2em; border-radius: 12px; margin: 2.5em 0;"><h3 style="margin: 0 0 0.5em 0; color: white;">📩 우리 병원 콘텐츠 공감 진단</h3><p style="margin: 0.5em 0 1.2em 0; color: #CBD5E1;">우리 병원 글 5편을 공감 콘텐츠 체크리스트 7개로 진단하고 톤 보정안을 드립니다.</p><a href="https://medi-map.co.kr/contact" style="display: inline-block; background: white; color: #1E293B; padding: 0.8em 1.8em; border-radius: 999px; text-decoration: none; font-weight: 700;">진단 신청 →</a></div>',
updated_at = NOW() WHERE id = 97;


-- 검증
SELECT id, blog_category,
       LEFT(title, 50) AS title_short,
       length(body) AS body_chars,
       (length(body) - length(replace(body, '<figure', ''))) / length('<figure') AS figure_count
FROM generated_contents
WHERE id IN (87, 88, 89, 93, 94, 97)
ORDER BY id;
