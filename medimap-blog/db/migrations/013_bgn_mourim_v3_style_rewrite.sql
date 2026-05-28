-- ============================================================
-- Migration 013 — BGN + Mourim 글 Round 15 v3 스타일 재작성
-- 2026-05-27
--
-- 대상:
--   id 42: BGN 밝은눈안과 잠실 — 잠실 라식 시술 종류별 차이점과 검사 절차
--   id 43: 모우림 모발이식의원 — FUE 비절개식 모발이식 시술 방식과 회복 과정
--
-- 적용 스타일 (TETE 41 글과 동일):
--   - 이모지 H2/H3
--   - H3 배지 (컬러 박스)
--   - 형광펜 (mark) 핵심 결론
--   - 비교 표
--   - FAQ Q1~Q5 (브랜드 블루 + 볼드)
--   - 의료법 disclaimer 박스 (amber)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- BGN 잠실 라식 (id 42) v3 재작성
-- ─────────────────────────────────────────────────────────────
UPDATE generated_contents
SET
  body = $body$<p style="font-size: 1.1em; line-height: 1.85; margin-bottom: 1.5em;">
<strong>"라식, 라섹, 스마일라식 — 도대체 어떤 차이가 있나요?"</strong> 시력교정 시술을 고민하는 분들이 가장 많이 받는 질문입니다. 각 시술은 각막을 다루는 방식이 다르고, 회복 기간과 적합한 환자 유형도 다릅니다.
</p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
이 글은 메디맵 파트너 의료기관인 <strong>BGN 밝은눈안과 잠실</strong>의 진료 프로토콜을 기반으로, 라식·라섹·스마일라식의 차이점, 사전 정밀 검사 절차, 시술 당일 흐름, 그리고 라식이 권장되지 않는 경우를 의료법 가이드라인에 맞춰 정리했습니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em; letter-spacing: -0.01em;">🔍 라식은 어떤 시술인가요?</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
라식(<em>LASIK, Laser-Assisted in Situ Keratomileusis</em>)은 <strong>각막에 얇은 절편(flap)을 만들고 그 아래 각막 실질에 레이저를 조사</strong>해 굴절률을 교정하는 시술입니다. 1990년대 후반부터 시행된 가장 검증된 시력교정 방식 중 하나입니다.
</p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
<mark style="background-color: #FEF08A; padding: 3px 6px; border-radius: 4px; font-weight: 600;">회복이 빠르고 통증이 적은 편이라는 점이 라식의 가장 큰 장점이며, 시술 다음 날부터 일상 복귀가 가능한 경우가 많습니다.</mark>
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">⚖️ 라식 · 라섹 · 스마일라식, 어떻게 다른가요?</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
세 가지 시술의 차이를 한눈에 비교하면 다음과 같습니다.
</p>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 2em; font-size: 0.95em; border: 1px solid #cbd5e1;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">구분</th>
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">라식</th>
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">라섹</th>
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">스마일라식</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>각막 절편</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">절편 생성</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">절편 없음 (각막 상피 제거)</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">최소 절개 (2~4mm)</td>
    </tr>
    <tr style="background-color: #fafafa;">
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>회복 속도</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">빠름 (1~3일)</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">느림 (1~2주)</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">빠름 (1~3일)</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>통증</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">적음</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">초기 통증 있음</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">적음</td>
    </tr>
    <tr style="background-color: #fafafa;">
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>적합 환자</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">각막 두께 충분, 빠른 일상 복귀</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">각막 얇음, 격투기 종사자</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">건조증 우려, 절편 부담</td>
    </tr>
  </tbody>
</table>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">📋 라식 사전 정밀 검사 절차</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
라식 시술 전에는 <strong>최소 6~8가지 항목</strong>의 정밀 검사를 거칩니다. BGN 밝은눈안과 잠실에서는 다음과 같은 순서로 진행됩니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #DBEAFE; color: #1E40AF; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">📐 1) 시력 측정 · 자동 굴절 검사</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
나안 시력과 교정 시력을 측정하고, 자동 굴절 측정기로 도수와 난시를 정밀하게 확인합니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #D1FAE5; color: #065F46; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">📏 2) 각막 두께 측정 (Pachymetry)</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
<strong>각막 두께는 라식 가능 여부의 핵심 지표</strong>입니다. 일반적으로 480㎛ 이상이면 라식이 가능하지만, 잔여 각막 두께가 250㎛ 이상 남아야 안전합니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #E0E7FF; color: #3730A3; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">🗺 3) 각막 지형도 검사 (Topography)</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
각막의 곡률과 모양을 3D 로 분석하여 <strong>원추각막</strong> 같은 이상 소견이 없는지 확인합니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #FEE2E2; color: #991B1B; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">💧 4) 안구건조증 검사</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
눈물막 안정성, 눈물량을 측정합니다. 심한 건조증은 라식 후 증상이 악화될 수 있어, 시술 전 충분한 치료가 필요합니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🚫 라식이 권장되지 않는 경우</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
<mark style="background-color: #FEF08A; padding: 3px 6px; border-radius: 4px; font-weight: 600;">정밀 검사 결과에 따라 라식이 권장되지 않는 경우가 있습니다.</mark> 다음 사항에 해당하면 시술 전 의료진과 충분한 상담이 필요합니다.
</p>

<ul style="margin-bottom: 1.5em; line-height: 1.9;">
  <li><strong>각막 두께가 권장 범위 미만</strong> — 잔여 두께 부족으로 안전 확보 어려움</li>
  <li><strong>원추각막 의심 소견</strong> — 시술 후 각막확장증 위험</li>
  <li><strong>심한 안구건조증</strong> — 시술 후 증상 악화 가능</li>
  <li><strong>도수가 안정되지 않은 시기</strong> — 18세 미만 또는 최근 1년 도수 변화 큰 경우</li>
  <li><strong>임신·수유 중</strong> — 호르몬 변화로 시력 변동 가능</li>
  <li><strong>자가면역질환 또는 당뇨 등 만성 질환</strong> — 회복 과정에 영향</li>
</ul>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q1.</span> <strong>라식과 스마일라식, 어느 것이 더 좋은가요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
<strong>"좋다"는 절대적 기준이 아닌 환자 개인 특성</strong>에 따라 결정됩니다. 각막 두께가 충분하고 빠른 회복이 필요하다면 라식, 절편 부담을 줄이고 싶다면 스마일라식이 권장될 수 있습니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q2.</span> <strong>시술 후 운동은 언제부터 가능한가요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
가벼운 산책은 1주차부터, 헬스장 운동은 2주차 이후, <strong>수영·사우나·격투기는 4주 이후</strong>가 일반적입니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q3.</span> <strong>한 번 시술하면 평생 시력이 유지되나요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
라식 후 시력은 보통 <strong>10~20년 이상 안정적으로 유지</strong>됩니다. 다만 노안(40대 이후)이나 백내장 같은 자연적 시력 변화는 별개입니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q4.</span> <strong>사전 검사는 시간이 얼마나 걸리나요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
일반적으로 <strong>1~2시간</strong> 소요됩니다. 콘택트렌즈 착용자는 검사 전 일정 기간(소프트 1주, 하드 2~3주) 착용 중단이 필요합니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q5.</span> <strong>시술 후 야간 빛 번짐 현상이 생긴다고 들었어요</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
시술 직후에는 야간 빛 번짐(halo, glare)이 있을 수 있지만, <strong>대부분 1~3개월 내 자연 감소</strong>합니다. 야간 운전이 잦은 분은 의료진과 상담 후 시술을 결정하는 것이 좋습니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 마무리하며</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
라식은 <strong>20년 이상 검증된 시력교정 방식</strong>이지만, 모든 환자에게 적합한 시술은 아닙니다. 정밀 사전 검사를 통해 본인의 각막 상태, 도수, 생활 패턴에 맞는 시술을 선택하는 것이 가장 중요합니다.
</p>

<p style="margin-bottom: 2em; line-height: 1.85;">
BGN 밝은눈안과 잠실에서는 <strong>8가지 정밀 검사 + 의료진 상담</strong>을 통해 환자 개인에게 적합한 시술을 권고합니다.
</p>

<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 18px 22px; margin: 2.5em 0 1em 0; border-radius: 8px;">
<p style="margin: 0; font-size: 0.92em; color: #78350f; line-height: 1.75;">
<strong>⚠️ 본 콘텐츠는 의료 정보 제공을 위한 참고 자료입니다.</strong><br />
개인의 시술 적합성·예상 결과·회복 속도는 사례마다 다를 수 있으며, 정확한 진단과 치료 방침은 반드시 의료기관 방문을 통해 확인하시기 바랍니다. 본 콘텐츠는 메디맵 의료법 가이드라인을 통과한 참고 자료입니다.
</p>
</div>$body$,
  excerpt = '라식·라섹·스마일라식의 차이, 사전 정밀 검사 8가지 항목, 라식이 권장되지 않는 경우 — BGN 밝은눈안과 잠실의 진료 프로토콜을 기반으로 정리한 참고 가이드.',
  updated_at = now()
WHERE id = 42;


-- ─────────────────────────────────────────────────────────────
-- Mourim FUE 모발이식 (id 43) v3 재작성
-- ─────────────────────────────────────────────────────────────
UPDATE generated_contents
SET
  body = $body$<p style="font-size: 1.1em; line-height: 1.85; margin-bottom: 1.5em;">
<strong>"흉터 없이 모발이식이 가능하다고요?"</strong> 모발이식을 처음 고민하는 분들이 가장 자주 받는 질문입니다. 절개 없이 모낭 단위로 채취하는 <strong>FUE(비절개식) 모발이식</strong>은 흉터 최소화와 자연스러운 결과로 최근 가장 많이 시행되는 방식입니다.
</p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
이 글은 메디맵 파트너 의료기관인 <strong>모우림 모발이식의원</strong>의 진료 프로토콜을 토대로, FUE 비절개식 모발이식의 원리, 시술 단계, 회복 과정, 그리고 자주 묻는 질문을 의료법 가이드라인에 맞춰 정리했습니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em; letter-spacing: -0.01em;">🔍 FUE 비절개식 모발이식이란?</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
FUE(<em>Follicular Unit Extraction</em>)는 <strong>두피를 절개하지 않고 0.7~1mm 의 작은 펀치 기구로 모낭을 한 단위씩 채취</strong>하는 모발이식 방식입니다. 채취한 모낭을 이식 부위에 식모기로 심어 자연스러운 헤어라인을 만듭니다.
</p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
<mark style="background-color: #FEF08A; padding: 3px 6px; border-radius: 4px; font-weight: 600;">절개 흉터가 거의 남지 않아 짧은 머리 스타일을 선호하는 분에게 적합하며, 회복 기간도 절개식 대비 짧은 편입니다.</mark>
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">⚖️ FUT(절개식) vs FUE(비절개식) 비교</h2>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 2em; font-size: 0.95em; border: 1px solid #cbd5e1;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">구분</th>
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">FUT (절개식)</th>
      <th style="border: 1px solid #cbd5e1; padding: 14px 18px; text-align: left; font-weight: 700;">FUE (비절개식)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>채취 방식</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">두피 띠 절개 후 모낭 분리</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">펀치로 모낭 단위 채취</td>
    </tr>
    <tr style="background-color: #fafafa;">
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>흉터</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">선 형태 흉터 남음</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">점 형태 — 거의 보이지 않음</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>회복 기간</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">2~3주</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">1~2주</td>
    </tr>
    <tr style="background-color: #fafafa;">
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>한 번에 가능 모수</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">3,000~5,000모</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">1,500~3,000모</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;"><strong>적합 환자</strong></td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">대량 이식 필요, 긴 머리</td>
      <td style="border: 1px solid #cbd5e1; padding: 14px 18px;">흉터 최소화, 짧은 머리 선호</td>
    </tr>
  </tbody>
</table>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💉 FUE 모발이식 시술 단계</h2>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #DBEAFE; color: #1E40AF; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">📋 1) 사전 상담 · 디자인</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
탈모 진행 단계 평가, 헤어라인 디자인, 이식 모수 결정을 위한 상담이 진행됩니다. <strong>모우림 모발이식의원에서는 평균 1시간 이상</strong>의 상담 시간을 두고 환자의 라이프스타일에 맞는 디자인을 함께 결정합니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #D1FAE5; color: #065F46; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">✂️ 2) 후두부 부분 삭모 · 마취</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
채취 부위인 후두부를 부분적으로 삭모(짧게 자름)한 후 국소 마취를 진행합니다. 마취 시 통증은 미미합니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #E0E7FF; color: #3730A3; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">⚙️ 3) 모낭 채취 (Extraction)</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
펀치 기구로 후두부에서 모낭을 한 단위씩 채취합니다. 채취 시간은 모수에 따라 <strong>2~4시간</strong> 소요됩니다.
</p>

<p style="margin: 2em 0 1em 0;"><span style="display: inline-block; background-color: #FEE2E2; color: #991B1B; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 1.05em;">🌱 4) 식모 (Implantation)</span></p>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
채취한 모낭을 이식 부위에 식모기로 심습니다. <strong>모낭의 방향·각도·밀도</strong>가 자연스러운 헤어라인의 핵심입니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🌱 회복 기간과 주의사항</h2>

<p style="margin-bottom: 1em; line-height: 1.85;">
<mark style="background-color: #FEF08A; padding: 3px 6px; border-radius: 4px; font-weight: 600;">FUE 모발이식 후 첫 2주가 모낭 생착의 골든 타임입니다.</mark> 이 기간 동안 다음 사항을 지켜주세요.
</p>

<ul style="margin-bottom: 1.5em; line-height: 1.9;">
  <li><strong>시술 후 1~3일</strong>: 머리를 만지지 않고, 처방받은 점적액 사용</li>
  <li><strong>4~7일</strong>: 부드러운 샴푸로 가볍게 세정 시작</li>
  <li><strong>2주차</strong>: 일반 샴푸 사용 가능, 운동은 가벼운 산책만</li>
  <li><strong>1개월차</strong>: 격렬한 운동 가능 (사우나·수영은 6주 이후)</li>
  <li><strong>3~4개월차</strong>: 이식모 일부 빠짐 → 정상 (휴지기 현상)</li>
  <li><strong>6~12개월차</strong>: 최종 결과 평가</li>
</ul>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">💬 자주 묻는 질문 (FAQ)</h2>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q1.</span> <strong>이식한 모발이 평생 유지되나요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
후두부 모낭은 남성 호르몬에 영향을 적게 받기 때문에, <strong>이식한 모발은 일반적으로 영구적으로 유지</strong>됩니다. 단, 기존 두피의 탈모는 별도 관리가 필요합니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q2.</span> <strong>시술 후 며칠 만에 일상 복귀가 가능한가요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
대부분 <strong>3~5일 후</strong> 사무직 복귀가 가능합니다. 모자 착용으로 자연스럽게 커버할 수 있습니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q3.</span> <strong>이식 후 머리가 다시 빠진다고 들었어요</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
시술 후 3~4개월차에 이식모가 일시적으로 빠지는 <strong>"휴지기 현상"</strong>은 정상입니다. 이후 6개월부터 다시 자라기 시작해 12개월차에 최종 결과가 나옵니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q4.</span> <strong>탈모 약은 계속 복용해야 하나요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
이식한 모발은 안정적이지만 <strong>기존 모발의 탈모 진행을 늦추기 위해</strong> 의료진과 상담 후 약물 치료를 병행하는 것이 일반적입니다.
</p>

<p style="margin: 2.5em 0 1em 0; font-size: 1.05em;"><span style="color: #1B68FF; font-weight: 800;">Q5.</span> <strong>한 번 시술로 충분한가요? 추가 시술이 필요할 수 있나요?</strong></p>
<p style="margin-bottom: 2em; line-height: 1.85;">
탈모 진행 단계가 심한 경우 <strong>2회 이상의 분할 시술</strong>이 권장될 수 있습니다. 정밀 진단을 통해 결정합니다.
</p>

<h2 style="font-size: 1.75em; font-weight: 800; color: #0f172a; margin-top: 2.5em; margin-bottom: 1em;">🎯 마무리하며</h2>

<p style="margin-bottom: 1.5em; line-height: 1.85;">
FUE 비절개식 모발이식은 <strong>흉터 최소화와 빠른 회복을 원하는 환자</strong>에게 적합한 시술입니다. 다만 모우림 모발이식의원에서 강조하는 것처럼, <strong>중요한 것은 시술 방식보다 정확한 진단과 자연스러운 디자인</strong>입니다.
</p>

<p style="margin-bottom: 2em; line-height: 1.85;">
시술 적합성 평가는 정밀 두피 진단과 상담을 통해서만 정확히 알 수 있습니다.
</p>

<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 18px 22px; margin: 2.5em 0 1em 0; border-radius: 8px;">
<p style="margin: 0; font-size: 0.92em; color: #78350f; line-height: 1.75;">
<strong>⚠️ 본 콘텐츠는 의료 정보 제공을 위한 참고 자료입니다.</strong><br />
개인의 시술 적합성·예상 결과·회복 속도는 사례마다 다를 수 있으며, 정확한 진단과 치료 방침은 반드시 의료기관 방문을 통해 확인하시기 바랍니다. 본 콘텐츠는 메디맵 의료법 가이드라인을 통과한 참고 자료입니다.
</p>
</div>$body$,
  excerpt = 'FUE 비절개식 모발이식의 원리, FUT vs FUE 비교, 시술 단계별 흐름, 12개월 회복 과정 — 모우림 모발이식의원의 진료 프로토콜을 토대로 정리한 참고 가이드.',
  updated_at = now()
WHERE id = 43;

-- 검증
SELECT id, title, blog_category, status, length(body) as body_len, updated_at
FROM generated_contents
WHERE id IN (41, 42, 43)
ORDER BY id;
