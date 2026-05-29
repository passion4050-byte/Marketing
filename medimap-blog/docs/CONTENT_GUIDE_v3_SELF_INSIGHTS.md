# 자사 인사이트 v3 콘텐츠 가이드 (Round 27, 2026-05-29)

> 메디맵이 직접 운영하는 마케팅 에이전시 관점의 인사이트.
> 파트너 콘텐츠와 다른 톤·구조·목적. AI 검색 시대(GEO/AEO) + 의료법 컴플라이언스 + 병원 마케팅 실무를 다루는 **메디맵의 시그니처 보이스**.

---

## 1. 작성 원칙 (정성스러운 인사이트의 기준)

### 1-1. LLM 자동 생성물의 한계 인지

LLM(Gemini) 의 자동 발행 글은 **초안**입니다. 정성스러운 인사이트가 되려면 운영자가 다음을 추가해야 합니다:
- 메디맵 자체 데이터 (예: "메디맵 운영 30개 병원 평균 인용률 +18%")
- 실제 사례 (병원 X의 6개월 전후 비교)
- 현직 마케터의 1인칭 시각 ("저희가 강남언니 분석할 때...")
- 구체적 숫자·도구·체크리스트

LLM 만으로는 "일반론" 만 나옵니다. 운영자 검수 단계에서 위 4가지를 한 글당 최소 2개 이상 삽입.

### 1-2. 한 글의 목적은 한 가지

GEO 가 무엇인지 설명하는 글에 의료법까지 다 넣지 마세요. 키워드 × 부제 1개로 좁히고 깊게.

| 키워드 | 권장 부제 |
|---|---|
| 의료 GEO 최적화 | "AI 검색에 노출되는 7가지 원칙" / "Perplexity 인용 받는 콘텐츠 구조" |
| 의료법 광고 가이드 | "광고 vs 정보제공 경계선 사례" / "심의 통과 체크리스트 12항" |
| 병원 마케팅 GEO | "AI 시대 환자 유입 funnel" / "GEO 도입 90일 로드맵" |

### 1-3. 가독성 — 한 단락 4줄 이내

긴 단락은 절대 피합니다. AI 검색은 짧은 단락에서 인용을 잘 뽑아갑니다.
- 한 단락: 4줄 이내 (모바일 기준)
- 한 문장: 60자 이내 권장
- 어려운 단어 앞에는 괄호 풀이

---

## 2. 시각 구조 (v3 마크업 표준)

### 2-1. TL;DR 박스 (글 첫머리)

```html
<div style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 1.2em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;">
  <strong style="color: #1E40AF;">🎯 3줄 요약</strong>
  <ul style="margin-top: 0.6em;">
    <li>핵심 결론 1</li>
    <li>핵심 결론 2</li>
    <li>핵심 결론 3</li>
  </ul>
</div>
```

독자가 3초 안에 가치 판단 가능.

### 2-2. 이모지 H2 + 배지 H3

```html
<h2>🩺 [한 줄 질문 또는 명제]</h2>
<h3 style="display: inline-block; background: #DBEAFE; color: #1E40AF; ...">▸ [구체 포인트]</h3>
```

이모지는 H2 당 1개. H3 배지는 카테고리별 색상 통일:
- ai_trend: 파랑 (`#DBEAFE`/`#1E40AF`)
- hospital_marketing: 보라 (`#EDE9FE`/`#5B21B6`)
- content_marketing: 초록 (`#DCFCE7`/`#166534`)

### 2-3. 표·체크리스트 — 한 글에 최소 1개씩

비교/단계/체크리스트는 표 또는 ul. 줄글로만 가지 않습니다.

### 2-4. 메디맵 자체 인용 박스

```html
<div style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1em 1.5em; margin: 2em 0; border-radius: 0 8px 8px 0;">
  <strong style="color: #047857;">💬 메디맵 데이터</strong>
  <p>저희가 운영 중인 30개 파트너 병원에서 ... 평균 ...% 개선됐습니다.</p>
</div>
```

이게 정성의 핵심. LLM 이 못 만드는 부분 — 운영자가 직접 채움.

### 2-5. amber 의료법 박스 (의료 주제일 때만)

기존 파트너 v3 와 동일. 자사 글은 의료법 직접 다루는 경우만 사용.

### 2-6. 본문 끝 CTA (자사용)

파트너의 카카오톡 상담 박스 대신:

```html
<div style="background: #1E293B; color: white; padding: 2em; border-radius: 12px; margin: 2.5em 0;">
  <h3>📩 병원 마케팅 진단 요청</h3>
  <p>메디맵 마케팅 팀이 30분 무료 진단해드립니다. ...</p>
  <a href="https://medi-map.co.kr/contact">진단 신청 →</a>
</div>
```

---

## 3. 이미지 정책 (Round 27 — 실사 톤)

### 자사 인사이트만 실사 톤. 파트너 글은 기존 Pixar 톤 유지.

**Pollinations prompt prefix**:
```
professional editorial photography, modern Korean medical clinic environment,
clean composition, natural daylight, soft focus background,
documentary style, shot on DSLR, high quality, no text, no logo, no watermark
```

**구성**:
- cover 1장 (1200×630, 글 주제 시각화)
- body figure 4장 (각 H2 섹션마다 1장씩 또는 핵심 데이터 시각화)

**예시 cover prompt (87 의료 GEO 최적화)**:
```
professional editorial photography, modern Korean doctor reviewing AI search
results on tablet device, clean clinic interior, natural daylight, focus on
hands holding tablet, blurred background, documentary style, shot on DSLR
```

---

## 4. 글 흐름 표준 (자사 인사이트 1편 = 약 2500자)

```
[Cover figure]
[3줄 요약 박스]

🩺 [한 줄 질문 H2 — 독자의 의문 또는 통념]
  - 짧은 도입 단락 (3~4줄)
  - 메디맵 자체 인용 박스 (필요시)

[Body figure 1]

📊 [데이터·실태 H2]
  - ▸ 배지 H3 1~2개
  - 표 또는 ul 1개

[Body figure 2]

🔬 [원리·구조 H2]
  - 단계별 ▸ H3 3개

[Body figure 3]

✅ [실행 체크리스트 H2]
  - 체크리스트 ul

[Body figure 4]

💡 [메디맵 시그니처 인사이트 H2]
  - 메디맵 인용 박스 (정성 핵심)

[amber 의료법 박스 (의료 주제일 때만)]

[자사 CTA 박스 — 진단 신청]
```

---

## 5. 운영 흐름

1. 매일 08:00 KST cron 이 LLM 초안 발행 (자동)
2. 09:00 KST 운영자가 `/admin/content-queue` 검수:
   - **꼭 정성 추가**: 메디맵 자체 데이터 인용 박스 1개 이상
   - 실제 사례 또는 1인칭 시각 1군데 이상
   - 표·체크리스트 추가
3. 검수 OK 후 발행 그대로 두기
4. NG (LLM 결과 무의미) 면 reject + 다음 cron 대기

LLM 초안 → 운영자 정성 추가 = "인사이트" 완성.

---

## 6. 절대 하지 말 것

- LLM 이 만든 문장 그대로 발행 (반드시 1군데 이상 인간 손길)
- 표 없이 줄글 5단락 이상 연속
- 메디맵 자체 의견·데이터 없는 글 (그러면 일반론에 불과)
- TL;DR 박스 생략
- 본문 중간 광고성 표현 ("최고의" / "1위" / "유일한")
