# 해외 콘텐츠 효용성 측정·관리 시스템 기획서 (v1)

_작성 2026-07-11 · 국내 파이프라인 실측 검증 기반_

## 0. 확정된 전제 (사용자 결정)
- **상품/과금 단위 = 언어별 개별 상품.** 클라이언트는 `일본어만`, `중국어만`, `국내만` 등 언어 단위로 신청·과금·관리.
- **중화권 타깃 = 대만·홍콩·해외 화교** → Google·ChatGPT·Perplexity·Gemini 모두 접속 가능 → **엔진 세트 국내와 동일**. Baidu/Ernie 연동 불필요.
  - ⚠️ 단, TW/HK는 **번체(zh-Hant)**가 정서상 정답. 현재 시드는 zh-Hans(간체) → 번체 전환 검토(§7 리스크).
- **효용성 핵심 지표 = 5종 전부**: ① AI 인용 점유율 ② 우리 콘텐츠 출처 인용 ③ Google 상위노출 순위 ④ AI봇 크롤 ⑤ 리드 전환.

## 0.5 북극성(North-Star) — "AI 인용 시장에서 우리 콘텐츠의 점유율" (국내·해외 공통)
> 단순 "우리 브랜드가 언급됐나"가 아니라, **① 현재 AI 인용 시장의 추이를 파악하고 ② 그 안에서 우리 콘텐츠의 경쟁력을 키워 ③ 우리 콘텐츠의 인용 점유율을 올리는 것**이 핵심 목표. 국내 콘텐츠에도 동일 적용(소급).

**정의**
- **AI 인용 시장** = 측정 질의 공간(우리 타깃 키워드들)에서 AI 엔진이 답변 근거로 인용하는 **전체 출처(도메인/URL) 집합**. `responses.cited_urls` + `source_domains` 로 이미 수집 중 → 집계만 하면 됨.
- **콘텐츠 인용 점유율(Content Citation Share, CCS)** = `우리가 발행한 URL 인용 수 ÷ 전체 인용 수` (질의 공간·기간 기준). **이게 북극성 수치.**
- **인용 시장 추이** = 기간별 CCS 라인 + 전체 인용량 성장(시장 자체가 커지는가).
- **인용 출처 경쟁 지형** = 어떤 도메인이 인용을 지배하는가(경쟁 매체/병원/포털) vs 우리 점유. "다음에 뺏을 출처" 우선순위 도출.

**측정 = 우리 콘텐츠 경쟁력 개선 루프**
CCS 추이 → 어떤 주제/포맷/구조가 실제 인용되는가 학습(`learned_insights`) → 콘텐츠 개선/증산 → CCS 재측정. (기존 학습 루프 B/C에 CCS를 성공신호로 결합.)

## 0.6 검증된 국내 베이스라인 (2026-07-11 실측)
- 30일 응답 1,952건 중 cited_urls 1,398 · source_domains 877. `source_domains` = `[{domain,is_self,redirect,final_url}]` 형태 → **집계 준비 완료.**
- **인용 시장 지형(30일 상위):** youtube(341), news.hidoc(140·의료매체), modoodoc(122·병원정보), namu.wiki(109), bnviit(101·경쟁안과), bgneye(76·클라이언트 자사), daum(70), 서울대병원(49)… → **의료매체·병원정보포털·나무위키·경쟁병원 자사사이트가 인용 지배.**
- **우리 CCS = 0.04%** (90일 9,116인용 중 wecircle 3, medimap 0). 시장은 크고 활발, 우리 점유는 사실상 0 = 성장 여지 전부.
- **재사용 데이터층 생성 완료:** RPC `citation_market(_days)` → (domain, cites, is_self, share_pct). 국내·해외 대시보드 공용.

### 데이터 품질 이슈 (개선 대상, 실측 발견)
1. **자기판별 미흡**: 클라이언트 자사 도메인(bgneye 등)이 `is_self=false`. "우리 콘텐츠 인용"과 "클라이언트 브랜드 인용"을 구분하되, 각 tenant 도메인 셋을 resolver에 등록 필요.
2. **domain=null 364건**: 일부 redirect 미해소. source_domains 파서 보강 여지.
3. **키워드 모호성**: 브랜드 "BGN" 질의가 불가리아 통화·유전자(BGN gene)로 오인용. 브랜드 키워드에 진료과·지역 컨텍스트 주입 필요.

## 1. 국내 측정 파이프라인 (실측 확인 — 재사용 자산)
```
keywords (측정 질의; tenant_id, text, target_brand, purpose, last_measured_at)
  → queries (engine, prompt, sample_index, cost_usd)        ← engine·비용 이미 기록
    → responses (raw_text, cited_urls[json], source_domains[jsonb])  ← 출처 인용 이미 기록
      → mentions (brand, is_target, is_competitor, position, weight, sentiment)  ← 브랜드 추출
competitors (tenant_id, name, aliases[json])
crawler_hits (bot_name, path, country, hit_at)              ← AI봇 방문 + country 이미 기록
dashboard_overview() RPC → 콘솔/어드민 대시보드
```
**결론:** engine·cited_urls·source_domains·crawler_hits.country가 이미 존재 → 해외 확장은 "새 파이프라인"이 아니라 **스코프 차원(market/lang) 추가 + 언어별 질의 생성 + 지역 SERP**가 전부.

## 2. 데이터 모델 변경 (Phase A — additive, 저위험)
### 2.1 스코프 차원 추가
- `keywords`: **`market`**(domestic|overseas, default domestic), **`lang`**(ko|en|ja|zh-Hant, default ko) 추가. 기존 행 → ko/domestic 백필.
  - keyword_id 조인으로 queries·responses·mentions에 자동 전파 → 국내/해외 데이터 격리.
- `generated_contents`: lang/market **이미 존재**(완료).
### 2.2 상품(subscription) 테이블 신설 — 관리의 중심
```
tenant_products (
  id, tenant_id,
  market   text,        -- domestic | overseas
  lang     text,        -- ko | en | ja | zh-Hant  (언어별 상품 = 행 1개)
  status   text,        -- active | paused | churned
  plan     text,        -- 발행량/측정주기 등급
  monthly_cost numeric,
  started_at date, ended_at date
)
```
- 한 클라이언트(tenant) = 여러 product 행(예: 국내 ko + 해외 ja). **어드민이 각 상품을 개별 신청·일시정지·해지·과금 관리.**
- 기존 `tenants.monthly_cost/publish_plan`(전역)은 국내 기본값으로 두고 점진 이관.
### 2.3 지역 SERP 순위 저장
```
serp_rankings (id, tenant_id, keyword_id, lang, engine, position, url, checked_at)
```
- Google 상위노출(③)을 언어/지역별로 저장. 소스는 **Bright Data SERP API**(플러그인 보유) — gl/hl 로 en/ja/zh-Hant 로컬 SERP 조회.

## 3. 측정 파이프라인 변경 (Phase B)
1. **언어별 질의 생성**: 수집기가 keyword.lang 로 프롬프트를 해당 언어로 구성해 엔진 호출(엔진 세트 동일). 응답에 lang/market 태깅(keyword_id 경유).
2. **브랜드 매칭(해외)**: target_brand = 클라이언트의 영문/로마자명. competitors.aliases에 언어별 표기 추가(예: "BGN"/"밝은눈"/"Bright Eye"). 기존 parser 재사용.
3. **출처 인용(②) 자기판별**: `source_resolver` 의 SELF_DOMAINS에 **wecircle.co.kr/en|/ja|/zh + 클라이언트 해외 도메인** 포함(과거 도메인 누락 버그 재발 방지 — 함정 DM 참조). cited_urls/source_domains에서 자사 URL 매칭 → "우리 콘텐츠가 실제 인용됨" 카운트.
4. **Google 순위(③)**: Bright Data SERP 로 keyword×lang SERP → serp_rankings upsert. 주 1회 배치.
5. **AI봇 크롤(④)**: crawler_hits를 path prefix(/en,/ja,/zh) + country 로 필터 → 해외 인그레션 신호. (신규 수집 불필요, 필터만.)
6. **리드 전환(⑤)**: WhatsApp/LINE 클릭 트래킹 엔드포인트 신설(국내 kakao_referrals 패턴 재사용) + 해외 문의 폼 → market/lang 태깅된 리드.
7. **비용 가드레일**: 언어×엔진×키워드 증가 → MAX_DAILY_USD 준수. 해외 측정 주기 = **주 1~2회**(국내 일간보다 낮게)로 비용 통제. queries.cost_usd 로 상품별 원가 집계 → 과금 근거.

## 4. 어드민 관리 UI (Phase C)
- **클라이언트 상품 관리**: tenant별 product 목록(국내 ko / 해외 ja / 해외 zh-Hant …) — 상태·플랜·월비용·개시일. 상품 추가/일시정지/해지.
- **상품별 대시보드**(핵심): (tenant, market, lang) 스코프. **최상단 = 북극성 CCS 블록**(§0.5) — 콘텐츠 인용 점유율 추이 라인 + 인용 출처 경쟁 지형(도메인 랭킹: 경쟁 매체 vs 우리) + 우리가 실제 인용된 콘텐츠 Top. 그 아래 보조 5지표 카드:
  1. AI 인용 점유율(브랜드, 우리 vs 경쟁, mentions)
  2. 우리 콘텐츠 출처 인용(cited_urls 자사 매칭 수/율) — CCS의 원천
  ※ **국내 대시보드도 동일 CCS 블록 소급 적용**(국내·해외 화면 통일).
  3. Google 상위노출(serp_rankings, 키워드별 순위·추이)
  4. AI봇 크롤(crawler_hits, 봇별·국가별)
  5. 리드 전환(WhatsApp/LINE 클릭·문의)
  - `dashboard_overview` RPC에 market/lang 파라미터 추가(국내 화면 무변경 보장 — default ko/domestic).
- **콘텐츠 관리**: market 필터(완료) + lang 서브필터 추가.
- **키워드 관리**: market/lang 별 등록·활성/비활성.

## 5. 클라이언트 콘솔(선택, 후속)
- 클라이언트가 자기 상품별 대시보드를 로그인해 열람(국내 blogkey 패턴). 해외 상품 구독 클라이언트에게 해당 언어 지표만 노출.

## 6. 단계별 로드맵 (검증 게이트 포함)
- **Phase A · 데이터 모델**(1일): keywords.market/lang, tenant_products, serp_rankings, 백필. → SQL 마이그레이션, 국내 데이터 무변경 검증.
- **Phase B · 측정**(2~3일): 언어별 질의 생성, source_resolver 해외 도메인, Bright Data SERP, WhatsApp/LINE 트래킹. → 파일럿 클라이언트 1곳 키워드 시딩 후 **실측 1회 → 5지표 실데이터 확인**.
- **Phase C · 어드민**(2일): 상품 관리 UI + 상품별 대시보드(RPC 확장). → 국내 대시보드 회귀 없음 검증.
- **Phase D · 리드/과금**(1일): 상품별 cost_usd 집계·월비용 리포트.
- **Phase E · QA**(0.5일): 라이브 URL·SQL 실측으로 지표 정합 검증, 함정 회귀 체크.

## 6.5 통합 운영 백본 — 상품 신청이 모든 기능을 구동 (tenant_products 허브)
> 사용자 요구: 클라이언트 관리에서 병원별로 서비스를 **신청·추가·수정**하면, 연결된 기능(측정·대시보드·자동발행)이 **자동 연동**돼야 함. 모든 영역이 tenant_products 한 곳에서 파생.

**tenant_products(테넌트×market×lang) = 단일 진실원(SoT).** 여기에 상품 행을 추가/수정/일시정지하면 다음이 연동:
1. **측정 연동** — 그 상품의 lang/market 으로 keywords 활성화 → 측정 cron 이 해당 언어로 질의·수집(active 상품만, 비활성 스킵 = 비용 통제).
2. **대시보드 연동** — 상품별(언어별) 스코프로 CCS·인용시장·SERP·리드 자동 필터(통합/국내/EN/JA/ZH 토글). EN 상품 병원 = EN 데이터만.
3. **자동발행 연동** — 발행 스케줄러가 active 상품의 lang/market 으로 콘텐츠 생성·검수·발행(콘텐츠 밀도 루틴을 언어별로 분기). 국내 KO + 해외 EN/JA/ZH 각각.
4. **과금 연동** — queries.cost_usd + 발행량을 상품별 집계 → 월비용/청구.

**어드민 화면 (Phase C 상세):**
- **클라이언트 관리(tenants)**: 병원 행 확장 → 상품 목록(국내 KO / 해외 EN·JA·ZH) **추가·수정·일시정지·해지**. 상품별 플랜·월비용·개시일.
- **전역 언어 스코프 셀렉터**: 어드민 상단에 통합/국내/EN/JA/ZH — 대시보드·인용·SERP·리드·콘텐츠 큐 전부에 컨텍스트 적용(content-queue market 필터를 전역화).
- **연동 상태 뱃지**: 각 상품이 측정 on/off, 발행 스케줄 on/off, 대시보드 데이터 유무를 한눈에.

**빌드 순서(안전·검증 우선):**
1. tenant_products CRUD API + 클라이언트 관리 UI(상품 추가/수정). ← 데이터 SoT 먼저
2. 전역 언어 스코프 셀렉터 → 대시보드/인용/CCS에 스코프 연동(측정 데이터가 언어 태깅되면 자동 채워짐).
3. 측정 cron 언어 분기(active 상품 기준) + 자동발행 언어 분기.
4. 상품별 과금 집계.
각 단계 후 라이브 실측 검증(함정 체크) — "됐을 것" 금지.

## 7. 리스크 & 검증 포인트
- **zh 간체 vs 번체**: TW/HK 타깃이면 zh-Hant가 정답. 현재 시드 zh-Hans → 번체 재생성 필요(콘텐츠 + lang 값 'zh-Hant'). 결정 필요.
- **자기판별 누락(함정 DM 재발 위험)**: SELF_DOMAINS에 해외 경로/도메인 누락 시 "출처 인용=0"으로 샘. Phase B에서 최우선 검증.
- **Google SERP 소스 비용**: Bright Data SERP 호출량 = 키워드×언어×주기. 상품 플랜에 SERP 주기 연동.
- **브랜드 표기 다양성(해외)**: 영문/로마자/현지어 별칭 누락 시 인용 점유율 과소. competitors.aliases 초기 세팅 중요.
- **비용 폭증**: 언어별 상품이라 활성 상품 수만큼 측정 곱연산. 상품 status=active 인 것만 측정(비활성 스킵) 강제.

## 8. 다음 액션 (승인 대기)
Phase A(데이터 모델, additive·저위험)부터 착수 권장 — 국내 무영향. 승인 시 SQL 마이그레이션 + 백필부터 진행.
