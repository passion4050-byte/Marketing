# 갭 분석 — `smile-lasik-in-korea` (Phase 1 완료, 2026-08-02)

경쟁사 **15회 인용 vs 우리 0회**. 실제 페이지를 수집해 항목 단위로 비교.

---

## 1. 이 슬러그를 가져가는 경쟁 URL (실측)

| 도메인 | URL | 인용 |
|---|---|---|
| **himedi.com** | `/blogs/blog/smile-lasik-in-korea-2026-guide-**top-3-clinics-in-seoul**` | **7** |
| seoulvisionclinic.com | `/SMILE-LASIK-IN-KOREA` | 3 |
| gangnammedspa.com | `/seoul-clinic-recommendation/smile-lasik-in-korea` | 3 |
| lasiksurgerykorea.com | `/ja/**cost-of**-smile-lasik-in-korea` | 3 |
| seoullasikclinic.directory | `/**cost**/cost-of-smile-lasik-in-korea` | 3 |
| lasiksurgerykorea.com | `/cost-of-...` · `/zh/cost-of-...` | 1+1 |
| gangnam.health | `/smile-lasik-in-korea-**best-clinics-for-foreigners**` | 1 |
| lasikseoul.com | `/smile-lasik-in-korea` | 1 |

**URL만 봐도 패턴이 보인다** — 경쟁사는 `cost` / `top 3 clinics` / `best clinics for foreigners`를
**명시적으로** 타겟팅한다. 우리는 "Cost, Recovery & How to Choose"로 다 묶었다.

`lasiksurgerykorea.com` 은 `/ja/` `/zh/` **언어별 경로를 각각** 갖고 있고 각각 인용된다.

---

## 2. 항목 단위 비교 — 우리 vs 1위(himedi)

| 항목 | 우리 (id 203, EN) | himedi (7회 인용) | 갭 |
|---|---|---|---|
| 순수 본문 | 1,956자 | ~2,500자 | 거의 없음 |
| **실명 병원** | **0곳** | **3곳** | 🔴 결정적 |
| **가격 숫자** | 2회 | 3곳 전부 KRW+USD 병기 | 🔴 |
| **주소·지하철** | 없음 | 3곳 전부 | 🔴 |
| 첫 문단 | 일반론 | **숫자 2개** | 🔴 |
| 선정 기준 명시 | 없음 | 4개 기준 서술 | 🟡 |
| 검증 가능 실적 | 없음 | "100,000+ 시술 · 16년" | 🟡 |
| 저자·발행일 | 없음 | "Written by Himedi Inc." · Feb 4 2026 | 🟡 |
| 표 | 2개 | 0개 | — (우리 우위) |
| FAQPage 스키마 | ✗ | **✗** | 없음 |
| Medical 스키마 | ✗ | **✗** | 없음 |

### 🔴 스키마도 길이도 아니다

**himedi 도 FAQ·Medical 스키마가 없다.** 길이도 비슷하다.
차이는 오직 **"인용하면 그대로 답이 되는 문장"의 유무**다.

```
우리 첫 문단:
  "Korea is one of the world's most popular destinations for vision correction,
   and SMILE LASIK is among the most requested procedures..."
  → 인용해도 질문에 답이 안 됨

himedi 첫 문단:
  "In Gangnam, the average price for SMILE LASIK starts around
   KRW 2,300,000 (~$1,600 USD). The laser portion typically takes
   less than 30 seconds per eye."
  → "강남 스마일라식 얼마?" 에 그대로 답이 됨
```

AI 는 **답이 되는 문장**을 인용한다. 구조 최적화는 그 다음 문제다.
이는 코호트 분석에서 "인용된 글이 오히려 더 짧고 H2 적음"이 나온 것과 일치한다.

---

## 3. 🔴🔴 가장 뼈아픈 발견 — 경쟁사가 우리 클라이언트를 팔고 있다

himedi 의 **1순위 추천 = "Bright Eye Clinic"** (Kyobo Tower 강남, 100,000+ 시술, 16년).
**"Bright Eye Clinic" = 밝은눈안과(BGN)** 로 보인다 — 우리 클라이언트다. (⚠️ 확인 필요)

2순위 **B&VIIT** = `bnviit.com`. 우리 어드민 AI 시장 점유 진단에서 **경쟁사 3위(216회 인용)** 로
잡히는 바로 그 도메인이다.

그리고 **우리 해외 가이드 12편에는 파트너 병원명이 단 한 번도 등장하지 않는다**(실측: 파트너병원명 = false).

정리하면:
- 우리는 클라이언트를 위해 해외 콘텐츠를 만들면서 **클라이언트 이름을 안 넣었다**
- 경쟁사는 **우리 클라이언트를 자기 콘텐츠에 넣어** 인용을 가져가고 있다
- 즉 우리가 만든 트래픽 기회를 경쟁사가 회수하는 구조

이건 콘텐츠 품질 문제가 아니라 **상품 설계 누락**이다.

---

## 4. 다국어 실태 — 더 심각

| | 순수 본문 |
|---|---|
| EN (id 203) | 1,956자 |
| **JA (id 205)** | **660자** |
| **ZH (id 206)** | **525자** |

JA/ZH 는 EN 의 1/3 수준. 사실상 요약본이다.
반면 `lasiksurgerykorea.com` 은 `/ja/` `/zh/` 전용 경로를 갖고 **각각 인용**된다.

---

## 5. Phase 2 실행 항목 (신규 발행 아님 — 기존 12편 보강)

우선순위 순. **① ~ ③ 만으로도 성격이 바뀐다.**

| # | 항목 | 근거 |
|---|---|---|
| ① | **파트너 병원 실명 + 주소 + 지하철 + 가격 구간** 표 삽입 (2~3곳) | himedi 1위 요인. 우리 파트너를 우리 콘텐츠에 넣는 게 상품 본질 |
| ② | **첫 문단을 숫자로 재작성** — 가격 구간 + 소요 시간 + 회복 기간 | 인용 가능한 문장 |
| ③ | **JA/ZH 본문을 EN 수준(1,900자+)으로** 확장 | 660/525자는 요약본 |
| ④ | 선정 기준 명시 (시술 건수·안전 이력·기술·외국인 지원) | 신뢰 근거 |
| ⑤ | 저자·감수자·최종 수정일 표기 | YMYL |
| ⑥ | 체류 일정표 (검사 → 수술 → 실밥/검진 → 귀국 가능일) | 해외 환자 실제 질문 |
| ⑦ | FAQ 3~5문항 + FAQPage 스키마 | 비용 최저 · 다만 himedi 도 없으므로 우선순위 낮음 |

### ⚠️ 의료광고법
가격은 **확정가 금지 · 구간/범위 표기**. "최저가·1위·100% 안전" 등 최상급 금지.
파트너 병원명 노출은 광고이므로 **사전 동의 필수**. 기존 국내 파이프라인의 의료법 린터를
해외 콘텐츠에도 태울 것.

---

## 6. 가설 판정 (Phase 1 결과)

| 가설 | 판정 |
|---|---|
| H1 콘텐츠 밀도 부족 | **부분 지지** — EN 은 길이 비슷. JA/ZH 는 명백히 부족 |
| **H2 결정 근거 데이터 부재** | **강하게 지지** ← 갭 10개 중 6개가 여기 |
| H3 도메인 권위 | **판정 보류** — H2 를 채우고도 안 되면 그때 결론 |

**H2 가 주범이다.** 그리고 H2 는 콘텐츠로 고칠 수 있다 — 도메인 연차와 달리.

---

## 7. Phase 3 관측 설계

- 보강 후 **6주 관측** (코호트 실측상 첫 인용까지 16~39일)
- 판정 화면: 어드민 **주제 공간 경쟁 현황** → `contested_losing` → `contested_winning` 전환 여부
- 전환 0건이면 H3(도메인 권위) 확정 → 옵션 B(파트너 자체 도메인 게시) 파일럿으로 이동

---

## 다음 세션 착수점

1. **"Bright Eye Clinic = 밝은눈안과(BGN)" 확인** — 맞으면 이게 이번 분석의 헤드라인
2. BGN 에 해외 가이드 파트너 노출 동의 확인
3. Phase 2 ①~③ 을 `smile-lasik-in-korea` 3개 언어에 먼저 적용 → 6주 관측
4. 나머지 11개 슬러그는 결과 확인 후 확대
