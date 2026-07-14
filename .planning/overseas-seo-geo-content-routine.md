# 해외(EN/JA/ZH) SEO·GEO 콘텐츠 자동화 루틴 (SYSTEM)

> 목적: 국내 파이프라인(병원×진료항목×콘텐츠 자동발행)을 **해외에도 동일 시스템**으로 적용해
> 구글 상위노출(SEO) + AI 상위언급(GEO)을 만든다. **조건부: 클라이언트가 신청한 언어 상품(tenant_products)에 한해서만** 생성·발행.
> 이 문서는 그 반복 루틴의 정본. 세션/모델이 바뀌어도 이 스펙을 따르면 동일 품질이 재현된다.

---

## 0. 핵심 원칙
1. **상충 금지**: 기존 URL 계층과 겹치지 않게 신규 아키타입 배치. 파트너 종속 경로에 리스티클을 묻지 않는다(키워드 희석).
2. **언어별 트랜스크리에이션**: 직역 금지. 각 시장의 맥락·문화·검색의도·언어스타일로 재창작(§5).
3. **tenant_products 게이팅**: 테넌트가 `market×lang` 상품을 신청한 항목만 큐잉·발행. 미신청 언어는 생성 안 함.
4. **의료법·정확성**: 효과·성공률 단정/보장 금지, 임의수치 날조 금지. 통계는 출처 명시 사실만(FDA 승인연도·기기 스펙 등).
5. **AEO 게이트**: 발행 전 `scoreAeo` ≥ B(66+). 통계·인용문·표·FAQ·구조·최신성 필수.

---

## 1. 레퍼런스 분석 (2026-07 실측 — gangnamwomenshealth 외 6개 상위노출 페이지)
분석 URL: cheongdamskinclinic.com · gangnamwomenshealth.com/top-clinics-in-korea/best-skin-clinics-in-seoul(+gangnam) · renovoskinclinickorea.com · gangnamobgyn.com/foreigners-clinic-guide-korea/best-7-skin-clinics-in-gangnam · seoulorthopedics.com/trusted-clinics-korea/top-10-skin-clinics-in-seoul

**공통 승리 패턴:**
- **URL**: `/[trust-cluster]/best-N-skin-clinics-in-[location]` — 권위 도메인의 "신뢰 클러스터" 하위에 리스티클 리프. (top-clinics-in-korea / trusted-clinics-korea / foreigners-clinic-guide-korea)
- **제목**: `Best {N} Skin Clinics in {Location} : English-Friendly Clinics & Costs` — 숫자·지역·영어친화·가격·연도(2026) 훅.
- **메타디스크립션**: "Best {location} skin clinics with English support—2026 pricing, devices, packages, booking tips for {conditions}."
- **본문 골격(순서 그대로가 AEO 강함):**
  1. `Who this guide helps` — 대상 독자(외국인 방문자/거주자/유학생).
  2. `Clinic Picks` — N개 클리닉 리스트. 각 항목 = **이름+지역+연락(WhatsApp)** / **Best for** / **Popular services** / **Why go** / **Good to know(팁)**.
  3. `Booking steps` — **영어+현지어 예약 스크립트**(복붙용).
  4. `Price Guide (typical KRW ranges)` — 시술별 항목화 가격범위(₩). ← AI가 가장 잘 인용.
  5. `How to choose` — 선택 체크리스트(영어지원·기기투명성·플랜·사진/애프터케어·의료 vs 미용·영수증/VAT).
  6. `What to expect at your first visit` — 번호 단계(스킨분석→매핑→견적→동의/패치→애프터케어).
  7. `Aftercare must-knows` · `Insurance & payment`.
  8. 다국어 스위처 + WhatsApp/LINE CTA.
- **GEO 신호**: 항목별 ₩ 범위·기기명(Morpheus/HIFU/Rejuran)·연도·"English support"·번호 리스트·비교 가능한 구조.

---

## 2. WECIRCLE 아키타입 (레퍼런스 적응 — 우리 모델에 맞게)
우리는 파트너를 위해 발행하므로, 레퍼런스의 "중립 가이드" 톤을 유지하되 **파트너를 리스트 상단에 자연스럽게 배치**한다(과장·유일최고 단정 없이).

**3-티어 콘텐츠 유형:**
| 유형 | 목적 | 예 | 키워드 |
|---|---|---|---|
| **A. 지역 리스티클** | "best clinics in {location}" 상위노출 | Best Skin Clinics in Seoul/Gangnam/Cheongdam | 지역+진료과 |
| **B. 시술 허브** | "best clinics for {treatment}" | Best Clinics for Ultherapy/Rejuran/Thermage in Seoul | 시술 인텐트 |
| **C. 파트너 소개형** | 브랜드 신뢰·전환 | Cheongdam Dear Clinic Guide | 병원명 |

**본문 템플릿(A·B 공통, §1 골격 준수):** H1(숫자·지역·연도·"Foreign Patient's Guide") → Who this helps → Clinic/Treatment picks(Best for/Popular/Why go/Good to know) → Booking scripts(현지어+한국어) → **KRW Price Guide 표** → How to choose → First visit steps → Aftercare → FAQ(raw_qa_pairs 4+) → 파트너 CTA. **의료법: "best"는 해외 허용, 단 효과 보장·성공률 단정·경쟁사 비방 금지.**

---

## 3. URL / IA 전략 (상충 금지)
현재: `/{lang}/clinics/[category]/[partner]/[slug]`(파트너 종속) · `/{lang}/guides/[slug]`(블로그) · `/{lang}/blog`·`/{lang}/clinics`·`/{lang}/clinics/[category]`(허브).

**문제**: 지역 리스티클(A)이 `/clinics/derma/dear/best-skin-clinics-in-seoul` 처럼 파트너 하위에 묻혀 "best skin clinics in seoul" 키워드가 희석됨.

**개선(권장, 상충 없음):** 리스티클 A·B는 파트너 비종속 **`/{lang}/guides/[slug]`** 로 canonical 통일(예: `/en/guides/best-skin-clinics-in-seoul`). 파트너 종속 상세(C·리뷰형)만 `/clinics/.../[slug]` 유지. → 이미 `/guides/[slug]`가 파트너면 `/clinics/...`로 301하는 로직이 있으므로, **리스티클은 is_partner=false 또는 별도 플래그로 /guides에 남긴다**. (구현 시: 리스티클 콘텐츠는 partner 태깅하되 canonical만 /guides로 두는 예외, 또는 tenant를 "위서클 가이드" 중립 발행 주체로.)
- 3언어 **동일 slug** 필수(hreflang 자동 연결). ✅ 이미 skin-lifting(245/246/247)에서 적용.
- sitemap: guides·clinics·category 전부 canonical 등재(완료).

---

## 4. 파이프라인 통합 (자동화)
국내 = `병원(tenant) × 진료항목(keyword) × 아키타입 → generator.py → generated_contents(draft) → 어드민 검수 → 발행`.

**해외 배선(이미 존재하는 엔진 재사용):**
1. **키워드 시딩**: `keywords`에 `lang∈{en,ja,zh-Hant}`, `market='overseas'`, 진료항목/지역/시술 인텐트 키워드 등록. (측정용 lang=zh-Hant, 콘텐츠 lang=zh-Hans 이원화 주의 — §5.)
2. **게이팅**: `tenant_products(tenant, market, lang, active=true)` 인 조합만 큐 생성. 스케줄러 루프가 active 상품 없는 (tenant,lang)은 skip. (Round 139에서 배선됨 — 재확인 항목.)
3. **생성**: `generator.py` — `lang`별 `build_prompt`가 §2 아키타입 골격 + §5 트랜스크리에이션 디렉티브 + 통계 강제(`_STATS_ENFORCE_DIRECTIVE`) 주입. 아키타입 A/B/C를 `content_archetype` 파라미터로 분기.
4. **품질 게이트**: 생성 후 `scoreAeo` 채점 → B 미만이면 재생성/보류. 의료법 린터 통과 필수.
5. **적재**: `generated_contents(status='draft', lang, market='overseas', channel='guide_html', partner_category, tenant_id, slug=3언어동일)`.
6. **검수·발행**: 어드민 content-queue(언어 스코프)에서 사람 검수 → 발행. **무검수 자동발행 금지(의료법).**
7. **측정 루프**: 발행 후 measure cron이 lang별 인용 수집 → CCS/AEO 대시보드(스코프) 반영.

---

## 5. 언어별 트랜스크리에이션 규칙 (직역 금지 — 루틴)
동일 시술이라도 각 시장 검색의도·신뢰 트리거·문체가 다르다. `generator.py` build_prompt에 lang별 디렉티브로 주입.

- **EN (영미·글로벌 외국인 환자)**: 실용·투명성. "English support", 항목별 KRW 가격, 예약 스크립트, "what to expect", FDA/기기명 근거. 톤=담백·정보형. 과장 회피.
- **JA (일본인 환자)**: 안심·정중·상세. 정중체(です・ます), 다운타임·안전·아프터케어 강조, 세밀한 절차 설명, "안심하고" 뉘앙스. 가격은 명확히. 과한 최상급 회피(일본 소비자 거부감).
- **ZH-Hans (중국 본토)**: 결과·평판·효율. 성분/기기 브랜드·후기 신뢰·"性价比(가성비)"·예약 편의. 简体. 단 의료광고 과장규제 의식(효과 보장 표현 금지). 톤=신뢰+실속.
- (공통) 지역/시술 키워드는 현지 검색어로 현지화(예: Ultherapy=울쎄라/ウルセラ/超声炮). 병원명 다국어 표기(§ guides 다국어명).
- **측정 lang 이원화 주의**: keywords.lang zh='zh-Hant', generated_contents.lang zh='zh-Hans'. `scopeToKeywordLang`/`scopeToContentLang` 각각 사용.

---

## 6. 반복 스케줄 (자동화 루틴)
- 국내 밀도 루틴(`wecircle-content-density`, 월·수 주10개)과 별개로 **해외 밀도 루틴** 신설 검토: active 해외 상품 있는 테넌트만, lang별 주 N편, 아키타입 A/B 우선(볼륨=인용 병목).
- 각 배치: 키워드 인텐트 top → 아키타입 선택 → 3언어(신청분) 트랜스크리에이션 생성 → AEO 게이트 → draft 적재 → 어드민 알림.
- 검수 SLA: 발행 담당이 언어 스코프로 큐 확인 → 의료법·사실·이미지(무인물·무한글·맥락) 체크 → 발행.

---

## 7. 지금 상태 vs 남은 구현
**있음(재사용):** 언어분기 generator·측정·발행, tenant_products, 3언어 라우트(guides/clinics/category/blog), hreflang·canonical·구조화데이터, AEO lib, 통계 디렉티브, content-queue 언어스코프. skin-lifting 리스티클 3언어(245/246/247) = 아키타입 B 실증.
**구현 필요(다음):**
1. generator.py에 `content_archetype`(A 지역/B 시술/C 파트너) 분기 + §2 골격 프롬프트 + §5 lang 디렉티브 강화.
2. 리스티클 A/B의 canonical=/guides 예외(§3) — URL 키워드 희석 해소.
3. 해외 키워드 시딩(지역×시술 인텐트, 신청 언어).
4. tenant_products 게이팅 스케줄러 루프 재검증(active 상품만).
5. (선택) 해외 밀도 스케줄 태스크.

> 이 루틴을 따르면: 클라이언트가 언어 상품 신청 → 파이프라인이 해당 언어로 §2 아키타입 콘텐츠를 §5 스타일로 생성 → 검수 발행 → 3언어 hreflang 연결 → 구글 상위노출 + AI 인용. 전부 시스템.
