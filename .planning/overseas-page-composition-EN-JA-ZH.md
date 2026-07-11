# 해외 페이지 구성 기획 (EN / JA / ZH) — SEO 상위노출 + GEO(AI 인용) 최적화

_2026-07-11 · 경쟁 상위노출 URL(피부과 로케이션 리스티클) 패턴 분석 기반 · 청담디어의원(피부과·청담) 적용_

---

## 0. 대원칙 — "AI가 인용하고 구글이 올리는 페이지"의 조건
1. **직답 문단(Answer-first)**: 인트로 첫 40~60단어가 질문에 그대로 답 → AI가 통째로 발췌. 예: "The top skin clinics in Gangnam for foreign patients include A, B and C, known for …".
2. **추출 가능 구조**: 번호 리스트 · 비교표 · 가격표 · FAQ. AI는 표/리스트를 인용에 강하게 씀.
3. **스키마 마크업**: ItemList · MedicalClinic · FAQPage · BreadcrumbList.
4. **권위 신호(E-E-A-T)**: 발행일/업데이트(2026), publisher(WECIRCLE), 근거(장비·자격), 저자성.
5. **검색어 정합**: H1·title·URL·H2에 정확한 타깃 질의어 포함.
6. **freshness + 내부링크**: 지역 리스티클 ↔ 치료 가이드 상호 링크.

---

## 1. 2층 아키텍처 (상충 방지)
- **① 로케이션 리스티클 = GEO 본진(허브)** — "best skin clinics in [지역]". 지역 질의 = 가장 큰 트래픽·인용. 청담디어 featured.
- **② 치료 가이드 = 롱테일 스포크** — ultherapy/rejuran/skinbooster/acne/melasma. 시술 질의.
- **카니발 방지**: 지역 질의(리스티클) vs 시술 질의(가이드) = 검색 의도가 달라 안 겹침. 같은 층 안에서만 지역/시술 중복 금지 + 내부링크로 보완.

---

## 2. 로케이션 리스티클 — 섹션 스켈레톤 (EN 기준, JA/ZH는 §4 톤 조정)

**URL/H1**: `/en/guides/best-skin-clinics-in-cheongdam`
`H1: Best Skin Clinics in Cheongdam, Seoul (2026): A Foreign Patient's Guide`

1. **인트로(직답, 45~60단어)** — "Cheongdam is Seoul's premium skin-care district. For foreign patients, the most notable skin clinics here include Cheongdam Dear Clinic and others, offering lifting (Ultherapy/Shurink), Rejuran, skin boosters and pigmentation care with English/Japanese/Chinese support."
2. **빠른 비교표** — | Clinic | Area | Signature | Languages | Notable |
3. **클리닉 엔트리 #1~#7** (각 H2/H3) — 클리닉명 · 위치 · 시그니처 시술 · 왜 주목 · 언어지원 · 한 줄 요약. **청담디어의원 = featured 상단**.
4. **How to choose a skin clinic in Cheongdam** — 선택 기준 리스트(진료과 전문성·장비·언어·애프터케어).
5. **Typical prices (foreign patients)** — 표(시술별 KRW + USD 참고치).
6. **FAQ (FAQPage schema)** — "Which skin clinic in Cheongdam is best for foreigners?" / "Do Cheongdam skin clinics speak English?" / "How much does skin treatment cost in Cheongdam?"
7. **CTA** — WhatsApp / LINE.
- **Schema**: ItemList(클리닉들) + BreadcrumbList + FAQPage. 각 클리닉 MedicalClinic/MedicalBusiness(name·address·areaServed).
- **내부링크** → 치료 가이드(Ultherapy·Rejuran·Skin booster).

---

## 3. 치료 가이드 — 섹션 스켈레톤 (이미 발행 포맷 유지)
`H1: [Treatment] in Korea (2026): Options, Cost & Choosing a Clinic`
인트로 직답 → 종류/원리 → 옵션 비교표 → 비용표 → How to choose → FAQ(FAQPage) → **내부링크 → 지역 리스티클**("Looking for a clinic? See Best Skin Clinics in Cheongdam").

---

## 4. 🌐 언어별 차별화 (핵심 — 톤·랭킹·통화·신뢰신호)

| 항목 | 🇺🇸 EN (글로벌) | 🇯🇵 JA (일본) | 🇹🇼🇭🇰 ZH-Hant (대만·홍콩·화교) |
|---|---|---|---|
| **톤** | 근거·직접·간결 | 안심·정중(です・ます) | 결과·가성비·구체 |
| **랭킹 표현** | "Top 7 / Best" 랭킹 OK | **"最高/No.1 회피"** → "おすすめ・比較・徹底ガイド"(일본 의료광고 가이드라인·소비자 정서) | "推薦・精選・評比" (랭킹 OK, 단 과장 자제) |
| **신뢰 신호** | 의사 자격·장비·투명 가격·리뷰 | 안전·アフターケア·症例·丁寧な説明 | 案例(전후)·性价比·예약 편의·후기 |
| **통화** | KRW + USD 참고 | KRW + JPY 참고 | KRW + TWD/HKD 참고 |
| **타깃 검색어** | skin clinic in gangnam/cheongdam, ultherapy korea | 江南 皮膚科 おすすめ, ウルセラ 韓国 | 江南 皮膚科 推薦, 音波拉提 韓國 |
| **CTA 채널** | WhatsApp + LINE | **LINE 우선** + WhatsApp | WhatsApp + (WeChat 검토) |
| **결정 동인** | 결과 예측 + 여행 편의 | 불안 해소·세심함 | 效果 + 性价比 + 편의 |

> 원칙: **번역이 아니라 현지화(transcreation)**. 같은 뼈대, 톤·신뢰코드·통화·CTA만 시장별로 교체.

---

## 5. 로케이션 계층 (카니발라이제이션 방지)
```
Seoul (광역)  ⊃  Gangnam  ⊃  Cheongdam
```
- 지역당 리스티클 1개씩, **canonical = 자기 자신**, 상위→하위 내부링크(Seoul 글에서 Gangnam·Cheongdam 링크).
- **같은 지역 중복 리스티클 금지** (기존 `best-skin-clinics-in-gangnam` 샘플과 겹치지 않게 Cheongdam은 별도 스코프).
- hreflang: 각 리스티클 en/ja/zh-Hant 상호 연결.

---

## 6. 기술 SEO/GEO 체크리스트 (페이지마다)
- [ ] title·H1·URL에 타깃 질의어
- [ ] 인트로 = 직답 문단(AI 발췌용)
- [ ] 비교표 + 가격표 + FAQ(구조화)
- [ ] Schema: ItemList/MedicalClinic/FAQPage/BreadcrumbList
- [ ] 발행일 2026 + "Updated" + publisher WECIRCLE
- [ ] hreflang en/ja/zh-Hant + canonical
- [ ] sitemap 포함(getGuides)
- [ ] 커버 = 무텍스트·무인물 실사 + alt
- [ ] 내부링크(리스티클 ↔ 치료 가이드)

---

## 7. 청담디어의원 적용안 (미팅 데모)
- **Cheongdam 리스티클**(EN/JA/ZH)에서 청담디어의원 = featured 상단(필러·울쎄라·리쥬란·스킨부스터·슈링크·백옥주사 시그니처).
- **치료 가이드**(Ultherapy·Rejuran·Skin booster)에서 "available at Cheongdam clinics such as Cheongdam Dear" + 리스티클로 내부링크.
- 측정: 이미 시드한 청담디어 해외 키워드(ultherapy/rejuran/…) + **로케이션 키워드 추가**(skin clinic in cheongdam/gangnam) → 이 리스티클 인용을 CCS로 추적.

---

## 8. 다음 빌드 순서 (제안)
1. **Cheongdam 리스티클 EN/JA/ZH** 3개 (청담디어 featured, §2 스켈레톤 + §4 언어톤) + 실사 커버.
2. 청담디어 로케이션 키워드 추가(skin clinic in cheongdam/gangnam × en/ja/zh).
3. 치료 가이드 ↔ 리스티클 내부링크 연결.
4. (후속) 병원별 해외 콘텐츠를 위한 `/en/with-partners` 전용 라우트(국내 with-partners의 해외판) — 지금은 공용 /guides에 게재.
