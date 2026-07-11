# 위서클 GEO/AEO — 국내 + 해외버전 통합 전략 기획서 (v1, 2026-07-11)

> 목표: 국내(한국어) + 해외(영·일·중) 버전이 **각각 잘 운영**되고, PMF의 핵심인 **성능 = ① Google 상위노출 + ② AI(ChatGPT·Perplexity·Gemini) 인용**을 실제로 달성하는 시스템.

---

## 0. 한 문장 정의

> **"한국 병원을, 외국 환자가 Google과 AI로 검색할 때 최상단에 인용되는 자산으로 만든다."**
> — 국내는 한국 환자 대상(기존 wecircle), 해외는 외국 환자의 의료관광 검색 대상(신규).

---

## 1. 레퍼런스 분석 결론 (경쟁사 파인더패턴의 검증된 모델)

전달받은 6개 URL = **(주)파인더패턴**이 제작(seoulorthopedics 하단 크레딧 확인). "구글만 15년" GEO 에이전시. 이미 시장에서 작동 중인 모델이라 **복제 + 초월**이 답.

### 그들이 하는 것 (해부)
1. **크로스-버티컬 호스트 도메인 재활용** — 산부인과·정형외과 도메인에 `/top-clinics-in-korea/best-skin-clinics-in-seoul` 리스티클 게시 → 기존 도메인 권위 차용, 신규 도메인보다 빠른 랭킹.
2. **초일관 콘텐츠 템플릿** (모든 페이지 동일 골격):
   - Title: `Best/Top N Skin Clinics in Seoul [for Foreigners] | English Support & Prices`
   - Meta desc: 키워드 밀집(English support · 2026 pricing · devices · packages · booking)
   - H1 → **Who this guide helps** → **How to Choose (Quick Tips)** → **병원 N곳 리스트**(각: Location / Best for / Highlights / Popular treatments / Visitor tip + **WhatsApp click-to-chat**) → **Price Guide (KRW 범위)** → **Booking steps**(영+한 스크립트) → What to expect → Aftercare → **FAQ**
3. **수익화** = 리스트된 병원 = 유료 고객. 각 병원 개별 마이크로사이트(koreaskinclinic.com 등) + WhatsApp 리드 링크.
4. **다국어 토글**(EN/ES/DE/JP/TH/VI…) — Duda/멀티스크린 기반.

### 왜 이게 SEO+AEO 둘 다 먹히나 (성능의 정체)
- **SEO**: 정확한 검색의도 키워드("best skin clinic in seoul for foreigners") 타이틀·URL·H1 삼중 정렬 + 호스트 도메인 권위 + 롱폼 구조 + 내부링크(개별 클리닉 사이트).
- **AEO(AI 인용)**: **Price Guide(구체 숫자) · FAQ(Q&A) · "how many sessions" · "how to choose"** = AI가 "how much is acne scar laser in korea", "best skin clinic gangnam english" 질문에 **그대로 인용하는 구조화 팩트**. 우리 wecircle 국내 콘텐츠 로직과 동일.

### 그들의 약점 = 우리의 해자
| 축 | 파인더패턴 | **위서클 우위** |
|---|---|---|
| 언어 | 영어 중심 | **영·일·중 네이티브 3권** |
| ROI 증명 | ❌ 측정 없음 | ✅ **AI 인용 실측 대시보드**(이미 구축) |
| 발행 | 수동 | ✅ **자동 발행 파이프라인** |
| 신뢰 | 리스티클만 | ✅ 개별 병원 **자사 도메인 자산** + 네트워크 리스티클 이중 |

---

## 2. 성능 설계 (PMF 핵심 — 이게 전부다)

### 2-A. SEO 상위노출 12대 레버
1. **검색의도 정렬**: `{treatment} in {city} [for foreigners]` 3중 정렬(title·URL slug·H1). 예: `smile-lasik-in-korea`.
2. **hreflang 다국어**: 같은 글의 en/ja/zh-Hans/zh-Hant 버전을 `<link rel="alternate" hreflang>`로 상호 연결 → 언어별 정확 타겟, 중복 페널티 회피.
3. **구조화 데이터(schema.org)**: `MedicalClinic` + `MedicalBusiness` + `FAQPage` + `ItemList`(리스티클) + `Article` + `BreadcrumbList` + `AggregateRating`(가능 시). JSON-LD.
4. **E-E-A-T**: 작성자(의료 검수자) 명시 · 출처 · 최신성(2026 갱신일) · 실제 가격/데이터.
5. **도메인 권위**: `.com` 국제 신뢰(뒤 3-C) + 백링크(파트너 병원·의료관광 디렉토리·보도).
6. **내부링크 토폴로지**: 허브(`/skin-clinics-in-korea`) → 지역(`/gangnam`) → 시술(`/acne-scar-laser`) → 개별 병원. 촘촘히.
7. **Core Web Vitals**: SSG/ISR(Next.js) · 이미지 최적화 · <2.5s LCP.
8. **롱테일 대량**: `{시술} × {지역} × {언어}` 매트릭스(뒤 4) → 저경쟁 롱테일 선점.
9. **콘텐츠 깊이·유니크**: 번역 복붙 금지 — 언어별 현지화(통화·문화·표현). 가격 실범위·세션수·다운타임 등 **실팩트**.
10. **프레시니스**: 연/분기 갱신(제목에 2026) + 갱신 스키마.
11. **색인 가속**: sitemap(언어별) + IndexNow + GSC 제출.
12. **CTR 최적화**: 제목에 숫자·연도·베네핏(가격·영어지원).

### 2-B. AI 인용(AEO) 8대 레버
1. **정의형 첫 문장**: "Smile LASIK is a minimally invasive vision correction…" — AI가 정의 답변에 인용.
2. **가격 가이드(구체 숫자 범위)**: AI가 "how much" 질문에 인용하는 최강 자산.
3. **FAQPage 스키마 + 본문 노출 Q&A**: "how many sessions", "is it safe", "english support?" 등 실제 질문.
4. **비교표**: `Smile LASIK vs LASIK vs LASEK` / `Clinic A vs B` — AI가 비교 답변에 표째 인용.
5. **엔티티 명확화**: 병원명·시술명·지역을 정확·일관 표기(엔티티 그래프).
6. **크롤러 접근**: robots/llms.txt에서 GPTBot·ClaudeBot·PerplexityBot·Google-Extended 허용.
7. **인용 가능 통계·리스트**: "Top 15…", "3–6 sessions", "SPF 50+" 같은 뽑아쓰기 좋은 단위.
8. **웹 전반 언급(off-site)**: 리스티클을 여러 자산(자사 병원 사이트 + 네트워크 리스티클 + 디렉토리)에 분산 → AI 소스 다양성↑.

### 2-C. 측정 = 해자 (이미 구축된 wecircle 자산 재활용)
- 국내 대시보드의 `mentions/responses/queries` 파이프라인을 **영어 쿼리로 확장**: "best skin clinic gangnam", "smile lasik korea cost" 등을 ChatGPT/Perplexity/Gemini에 측정 → **출처 인용 실측**.
- 병원 미팅에서 "당신 병원이 AI에 N회 인용됨"을 **숫자로 증명** = 파인더패턴이 못 하는 세일즈 클로징.

---

## 3. 아키텍처 (국내 + 해외 각각 잘 굴러가게)

### 3-A. 콘텐츠 시스템 (기존 wecircle 파이프라인 확장)
- `generated_contents`에 **`lang` 컬럼**(ko/en/ja/zh-Hans/zh-Hant) + `market`(domestic/overseas) 추가.
- 언어별 **페르소나·프롬프트·의료광고 규칙** 분리(각 나라 광고규제 상이 — 뒤 7).
- 콘텐츠 타입 2종: **(a) 리스티클/가이드**(Best N Clinics, How-to) · **(b) 개별 병원/시술 상세**.
- 자동 발행 루틴(월·수 등)에 언어별 밀도 스케줄.

### 3-B. i18n 렌더 (Next.js)
- **서브디렉토리 + hreflang**: `/en/…` `/ja/…` `/zh/…` (Google 권장 — 도메인 권위 통합). 언어 토글 UI.
- 각 글 = 언어별 유니크 URL + 상호 hreflang.

### 3-C. 도메인 전략 (성능 직결 — 결정 필요)
3가지 옵션, 추천은 **하이브리드**:
- **제품 홈페이지(병원 세일즈용)**: 국제 신뢰 위해 **`.com` 신규 도메인 권장**(예: wecircle.com 또는 wecircle-geo.com). `.co.kr`은 "한국 로컬" 시그널이라 글로벌 영어 랭킹에 불리.
- **콘텐츠 게재 위치(핵심)**: **이중 게재**로 성능 극대화 —
  1. **고객 병원 자사 도메인** `/en/guides/…` (병원 자산 + 그 도메인 권위 차용, 장기 최강) —
  2. **위서클 네트워크 리스티클**(우리 통제 도메인들에 "Best N Clinics" 게시 — 파인더패턴처럼 aggregate 권위 + AI 소스 다양성).
- 국내는 기존 `wecircle.co.kr` 유지, 해외는 `.com` 계열 + 고객 도메인.

> **결정 포인트:** (a) 완전 별도 `.com`으로 해외 통합 vs (b) `en.wecircle.co.kr` 서브도메인. → **성능상 별도 `.com` 권장**(글로벌 신뢰 + hreflang 서브디렉토리).

---

## 4. 진료 버티컬 × 지역 × 언어 매트릭스 (롱테일 대량)

**버티컬(외국 환자 수요순):**
1. 피부과 (skin clinic / acne scar / melasma / laser toning / skin booster / K-beauty)
2. 성형 (rhinoplasty / double eyelid / V-line / facial contouring / breast)
3. 시력교정 (**smile lasik** / lasik / lasek / ICL — 사용자 예시)
4. 모발이식 (hair transplant / FUE)
5. 치과 (dental implant / veneers)
6. 건강검진 (medical checkup / health screening)
7. 항노화·재생 (stem cell / IV therapy / anti-aging)

**지역:** korea · seoul · gangnam · cheongdam · apgujeong · myeongdong · hongdae · busan
**언어:** en · ja · zh-Hans(중국 본토) · zh-Hant(대만·홍콩)

→ 예시 롱테일: `smile-lasik-in-korea` (en/ja/zh) · `best-skin-clinics-in-gangnam` · `hair-transplant-in-korea-for-foreigners` · `rhinoplasty-in-seoul-cost`. **7×8×4 = 수백 롱테일**을 우선순위(검색량·수요)로 발행.

---

## 5. 콘텐츠 템플릿 (성능 최적화 골격 — 리스티클)

```
[Title] Best 12 {Treatment} Clinics in {City} (2026) | English Support & Prices
[H1] + 정의형 리드 1문장
[Who this guide helps]
[How to Choose — 5 tips]  ← AI 인용
[Comparison Table]  ← 시술/병원 비교, AI 인용
[Clinic List ×N] Location/Best for/Popular/Visitor tip/Inquiry(WhatsApp·카카오·폼)
[Price Guide] 구체 범위  ← AEO 최강
[Booking steps] 다국어 스크립트
[What to expect / Aftercare]
[FAQ ×6] FAQPage 스키마  ← AI 인용
[JSON-LD] MedicalClinic + FAQPage + ItemList + Breadcrumb
[hreflang] en/ja/zh 상호
```

개별 시술 상세는 국내 wecircle 구조(TL;DR·이모지 H2·비교표·FAQ·정의형) 다국어판 재사용.

---

## 6. 빌드 로드맵 (①②③ + 다음주 미팅)

- **Phase 0 (지금)**: 본 기획 확정 + 도메인 결정.
- **① 제품 홈페이지(영문)** — 병원 세일즈용 랜딩. 가치제안("Get cited by ChatGPT for foreign patients") + 파인더패턴 대비 우위표 + 측정 데모 + CTA. **다음주 미팅 즉시 사용.**
- **② 샘플 콘텐츠 1편** — `Best Skin Clinics in Gangnam (English)` 실제 리스티클을 위 템플릿+스키마로 완성. 미팅 데모.
- **③ 해외 콘텐츠 아키텍처** — `generated_contents` lang/market 확장 + i18n 라우팅 + 다국어 발행 루틴 + 영어 측정 쿼리.
- **Phase 2**: 일·중 확장 · 네트워크 리스티클 · 백링크.

---

## 7. 리스크 (성능·신뢰 지키기)

- **국가별 의료광고 규제 상이**: 한국 의료광고법 + 대상국 규제. 언어별 컴플라이언스 린터 분리. 최상급·보장·가격유인 표현 국가별 조정.
- **콘텐츠 진정성/중복**: 언어 간 번역 복붙 = 중복·저품질 페널티. 언어별 현지화·유니크 필수.
- **가격 정확성**: 허위 가격 = 신뢰·법 리스크. 실범위 + "ask for itemized quote" 안전문구.
- **AI 인용은 누적**: 신규 도메인은 3~6개월 축적 필요 — 미팅에선 "국내 실측(299 인용 등)"으로 방법론 증명.

---

## 8. 다음 결정 2가지
1. **도메인**: 별도 `.com`(추천) vs `en.wecircle.co.kr` 서브도메인?
2. **콘텐츠 게재**: 고객 병원 도메인 우선 vs 위서클 네트워크 리스티클 우선(또는 이중)?

→ 결정 주시면 ①(홈페이지)부터 바로 빌드 착수.
