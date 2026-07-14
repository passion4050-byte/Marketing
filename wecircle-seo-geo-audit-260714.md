# 위서클 SEO + GEO/AEO 감사 리포트

**대상:** wecircle.co.kr (공개 채널) · **일자:** 2026-07-14 · **방법:** robots/sitemap fetch + 브라우저 실렌더 검증(JSON-LD·hreflang·canonical·H1) + Supabase SQL 커버리지 교차검증

---

## 요약 (Executive Summary)

전반 건강도 **양호**. 해외(en/ja/zh)는 **교과서적 수준**으로 완성돼 있고, 크롤·색인 기반(robots·AI봇 허용)은 최상. 실질 개선 여지는 **국내(ko)에 집중**됨 — 특히 파트너 병원 콘텐츠의 FAQPage 부재와 자사 블로그 템플릿의 이중 H1.

**최우선 3가지**
1. 🔴 파트너 콘텐츠 56건 **FAQPage 스키마 없음** (GEO/AEO 손실) — 자사 글엔 이미 있음, 파트너에 이식.
2. 🟡 자사 `/blog` 템플릿 **H1 2개** (온페이지 SEO) — 이슈 라벨과 기사 제목이 둘 다 H1.
3. 🟡 국내 콘텐츠 **excerpt 87/100 누락** → meta description 자동파생·잘림.

---

## 잘 되어 있는 것 (유지)

- **robots.txt = GEO 친화 최상**: GPTBot·ChatGPT-User·OAI-SearchBot·ClaudeBot·PerplexityBot·Google-Extended·CCBot·Googlebot·Bingbot 전부 명시 `Allow`. `/admin` `/client` `/api` 차단. sitemap 참조. → AI 검색엔진이 콘텐츠를 학습·인용하도록 문 열림.
- **해외(en/ja/zh) 페이지 = 완성형** (증거: `/en/guides/ultherapy-lifting-in-korea` 실렌더):
  - JSON-LD **Article + BreadcrumbList + FAQPage** 3종
  - hreflang **en/ja/zh-Hans** 상호참조 정확
  - canonical 자기참조 · H1 1개 · excerpt 기반 meta description 정상
- **국내 파트너 글**: canonical·**MedicalWebPage**+Article+BreadcrumbList·H1 1개 정상 (증거: `/with-partners/derma/dear/필러-248`).
- **국내 자사 글**: FAQPage 5문항 실렌더 (증거: `/blog/의료-GEO-최적화-194`).

---

## 이슈 & 수정 (우선순위)

### 1. [높음 · GEO/AEO] 파트너 콘텐츠 FAQPage 부재
- **이슈:** 국내 파트너 병원 글은 `Article + MedicalWebPage + BreadcrumbList`만 렌더, **FAQPage 없음**. 자사 글은 FAQPage(5문항)가 나오는데 파트너는 안 나옴.
- **영향:** 높음. FAQPage는 (a) Google FAQ 리치결과 노출, (b) AI가 Q&A 쌍을 그대로 인용하기 쉬운 구조 → CCS(인용 점유) 직접 기여. 파트너 56건이 이 신호를 놓치는 중.
- **증거:** 브라우저 JSON-LD — 파트너 `필러-248`에 FAQPage 부재 / 자사 `#194`엔 존재. DB: 파트너 blog_html 56건 중 raw_qa_pairs 채워진 건 5건.
- **수정:** 자사 글의 FAQPage 생성 경로를 파트너 글에도 적용. (a) 파트너 생성 프롬프트에 FAQ 섹션 디렉티브 추가 + `_extract_faq_pairs`로 raw_qa_pairs 채움, 또는 (b) 자사가 쓰는 렌더타임 FAQ 생성기를 파트너 상세 템플릿에도 연결. 기존 56건은 재생성 또는 FAQ 블록 append 필요(본문에 FAQ 없으면 backfill 불가).
- **우선순위:** 1

### 2. [중간 · 온페이지] 자사 /blog 템플릿 이중 H1
- **이슈:** 자사 블로그 상세가 **H1 2개** — 마스트헤드 이슈 라벨("의료 GEO 최적화 #194")과 실제 기사 제목이 둘 다 `<h1>`.
- **영향:** 중간. 검색엔진의 페이지 주제 신호 희석. 파트너·해외 템플릿은 H1 1개라 정상 → 자사 블로그 템플릿만의 버그.
- **증거:** `/blog/의료-GEO-최적화-194` h1count=2 vs 파트너·해외 h1count=1.
- **수정:** 자사 블로그 상세 컴포넌트에서 이슈 라벨을 `<h1>`→`<p>`/`<span>`(또는 `<h2>` 강등). 기사 제목만 H1 유지. 디자인 전용 마크업 변경.
- **우선순위:** 2

### 3. [중간 · 색인/CTR] 국내 excerpt 누락 → meta description 약함
- **이슈:** 국내 발행 100건 중 **87건 excerpt 없음** → meta description이 본문 첫 문장 자동파생, 종종 중간에 잘림("…무조건").
- **영향:** 중간. 잘못된 게 아니라 "최적화 안 됨" — SERP 클릭 유도 문구가 아님. 해외는 excerpt 정상.
- **증거:** SQL no_excerpt: ko 87/100 vs en 2/14·ja 1/12·zh 1/12. 브라우저 metaDesc 본문 파생 확인.
- **수정:** 생성 파이프라인에 excerpt(150–160자, 주요 키워드 포함, 가치제안+CTA) 자동 생성 추가. 기존분은 본문 요약으로 backfill 가능.
- **우선순위:** 3

### 4. [낮음 · 오탐 정리] slug 없는 발행글 10건 = 정상
- schema_org 채널 콘텐츠(스키마 조각 전용, 페이지 아님)라 slug 없음이 **정상**. 색인 버그 아님. (초기 의심 → 증거로 기각)

### 5. [낮음 · 개선 여지]
- no_cover: 국내 8·해외 각 1 — OG/썸네일 이미지 없는 글. 리스팅·SNS 공유 시 심미성. 낮음.
- 국내 `/blog`·`/blog/category`에 hreflang 없음 — 국내가 기본 언어라 필수는 아님. 향후 국내↔해외 동일 주제 교차연결 전략 세우면 x-default 포함 고려.

---

## GEO/AEO 관점 정리

- **해외:** 구조·스키마·hreflang 완성 → 이제 남은 건 **발행량 누적 + 실측(CCS)**. 측정 데이터는 아직 희소(별개 트랙, auto-publish-overseas 누적 대기).
- **국내:** #1(파트너 FAQPage)만 채우면 AEO가 한 단계 올라감. 자사는 이미 FAQPage 보유.
- **인용 실측:** "브랜드 언급은 많은데 우리 콘텐츠 출처 인용은 적다"가 핵심 갭 — 콘텐츠의 인용 가능성(FAQ·통계·표·답변 우선 구조)을 국내 파트너로 확대하는 게 직접적 레버.

---

## 실행 계획 (순서)

1. **크리티컬/고임팩트:** 파트너 콘텐츠 FAQPage 생성 경로 추가(#1) — 신규 발행부터 적용 + 기존 56건 처리안 결정.
2. **퀵윈:** 자사 블로그 이중 H1 수정(#2) — 마크업 1곳, 즉시 배포 가능.
3. **파이프라인 개선:** excerpt 자동 생성(#3) — 신규 발행 meta description 강화 + 기존 backfill.
4. **장기:** 해외 발행량 누적 → CCS 실측 → 인용 안 되는 주제 역추적해 콘텐츠 보강.

> 검증 원칙 준수: 스키마·hreflang·canonical·H1은 web_fetch가 아닌 **브라우저 실렌더**로 확인(이 감사에서 실제로 자사 FAQPage 오진을 브라우저가 바로잡음). 다음 수정 후에도 동일 방식으로 재검증 권장.
