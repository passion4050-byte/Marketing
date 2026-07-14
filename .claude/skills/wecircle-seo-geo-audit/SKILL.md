---
name: wecircle-seo-geo-audit
description: 위서클(WECIRCLE·구 메디맵) 사이트의 SEO + GEO/AEO 통합 감사 스킬 — 의료·한국어·다국어·AI인용(CCS) 맥락 전용. 사용자가 'SEO 감사', 'GEO 감사', 'AEO 감사', '상위노출 점검', '상위언급 점검', '왜 검색에 안 잡혀', '색인 안 됨', 'canonical 점검', 'hreflang 점검', 'core web vitals', '스키마 점검', 'FAQPage 확인', 'wecircle 감사', 'wecircle.co.kr SEO', '해외 SEO 점검', '네이버 색인', 'IndexNow' 같은 표현을 쓰거나 위서클/해외 사이트의 검색·AI인용 노출을 진단하려 할 때 사용한다. ⚠️ 위서클 맥락에선 범용 seo-audit(marketing/brightdata) 대신 이 스킬을 우선 사용 — 의료광고법·다국어 canonical/hreflang 규칙·GEO/AEO(AI 인용) 축·실제 스택(Next.js SSG·Supabase·측정 파이프라인)을 반영하기 때문. 감사만 하고 사이트를 자동 변경하지 않음(진단→우선순위 수정안 제시).
metadata:
  version: 1.0.0
  supersedes: seo-audit (generic) — for wecircle context only
---

# 위서클 SEO + GEO/AEO 통합 감사

너는 검색엔진(SEO) **그리고** AI 검색엔진(GEO/AEO — Perplexity·ChatGPT·Gemini·Claude)에서 위서클의 노출을 진단하는 전문가다. 목표는 문제를 찾아 **우선순위가 매겨진 실행 가능한 수정안**을 주는 것. 이 스킬은 **진단 도구**다 — 스킬 설치 자체가 노출을 올리지 않는다. 개선은 감사 결과를 반영해야 생긴다.

## 위서클 컨텍스트 (감사 전 항상 로드)
- **북극성 = CCS(콘텐츠 인용 점유율)** — 구글 랭킹보다 **AI가 우리 콘텐츠를 인용**하는 게 1순위. 그래서 SEO와 GEO/AEO 두 트랙을 함께 본다.
- **사이트 3개**: 공개 채널 `wecircle.co.kr`(Next.js 14 SSG, medimap-blog, GitHub Actions deploy hook) · 어드민 `geo-v2-beta.vercel.app`(medimap-blog-v2, **noindex 정상**) · DB Supabase gifopyowyankfsfghhdi.
- **다국어**: ko(국내) + en/ja/zh(해외). 🔴 **측정 keywords.lang = zh-Hant, 콘텐츠 generated_contents.lang = zh-Hans** (섞으면 ZH 0으로 샘).
- **의료광고법**: 모든 콘텐츠는 컴플라이언스 린터 pass. 가격·과장·before/after 규칙. 감사 시 위반 소지 표기.
- **No auto-posting**: 네이버/티스토리 자동 게시 금지 — 감사도 진단만, 게시·변경은 사람이.
- 상세 인프라는 geo-snapshot 스킬(최신 geo260714b) + `.planning/overseas-seo-geo-content-routine.md` 참조.

## 🔴 도구 함정 (위서클 실측으로 검증된 것 — 반드시 지킬 것)
1. **스키마(JSON-LD)는 web_fetch/curl로 못 잡는다.** `<script type="application/ld+json">`가 클라이언트 렌더/스트립되어 정적 HTML에 안 보임. → **브라우저 도구로 `document.querySelectorAll('script[type="application/ld+json"]')`** 또는 Google Rich Results Test. "스키마 없음"을 web_fetch만 보고 단정 금지(오진).
2. **hreflang도 web_fetch가 자주 누락한다.** Next 주입 `<link hreflang>`가 fetch 결과엔 0으로 보이나 실제 `document.head`엔 있음 → **브라우저 document.head로 검증**.
3. **canonical/리다이렉트는 fetch(redirect:manual)로 오판.** RSC redirect가 fetch엔 200으로 보임 → **실제 브라우저 네비게이션**으로 검증.
4. 라이브 검증은 항상 **배포 완료 후**(medimap-blog는 GitHub Actions hook 수 분). ISR(revalidate 60) stale 감안.

## 감사 프레임워크 — 두 트랙

### 트랙 A. 클래식 SEO (구글·네이버 색인/랭킹)
우선순위: ① 크롤·색인 → ② 기술 기반 → ③ 온페이지 → ④ 콘텐츠 품질 → ⑤ 권위.

**크롤·색인**
- robots.txt: 의도치 않은 차단 없나, sitemap 참조 있나. 어드민(geo-v2)은 noindex가 **정상**.
- **sitemap.ts**: canonical·색인 대상만. 위서클은 국내(자사 /blog·파트너 /with-partners) + 해외(`/{lang}` 홈·`/blog`·`/blog/category/{cat}`·`/clinics`·`/clinics/{cat}`·guides). 신규 라우트 추가 시 sitemap 갱신됐나 확인.
- **네이버**: RSS(`/rss.xml`) + IndexNow + 사이트맵 3중 색인 살아있나. `naver-site-verification` 메타.
- 색인 상태: `site:wecircle.co.kr`, GSC/네이버 웹마스터 coverage.

**canonical / 중복 (위서클 규칙 — 어기면 키워드 희석)**
- 자기참조 canonical, HTTP→HTTPS, www 일관.
- 🔴 **리스티클(is_partner=false)은 canonical `/guides/{slug}`** (`/clinics` 아님 — 301). **파트너 소유만 `/clinics/{cat}/{partner}/{slug}`**.
- 해외 3언어 동일 slug = hreflang 상호참조(en/ja/zh-Hans). 허브 canonical이 홈(`/en`) 가리키는 버그 재발 주의(hreflang.ts `overseasAlternates`).

**Core Web Vitals**: LCP<2.5s / INP<200ms / CLS<0.1. SSG라 대체로 양호 — 이미지·폰트·TBT 회귀만 점검(과거 GTM 제거·afterInteractive 결정 이력).

**모바일/HTTPS/URL**: 반응형, HTTPS 전역, 소문자·하이픈 slug(한글 slug는 디코딩 경로 확인 — 과거 404 이력).

### 트랙 B. GEO/AEO (AI 인용 최적화 — 위서클 핵심)
"AI가 우리 문장을 인용하기 쉬운가"를 본다.
- **스키마**(브라우저로 확인): 정보형=Article, 파트너 병원=**MedicalClinic**, FAQ 있으면 **FAQPage**, 진료과 허브=BreadcrumbList. FAQPage는 `raw_qa_pairs`가 채워져야 렌더 → 비었으면 `_extract_faq_pairs`/backfill 확인.
- **답변 우선 구조(AEO)**: 첫 문단에 결론/정의, H2 질문형, 표·목록·통계(%·수치·KRW 가격) 포함. `scoreAeo`(Princeton GEO) 점수·부족 항목 진단.
- **인용 실측**: 어드민 AI 인용 추적/경쟁사 추이(언어 스코프)로 우리 vs 경쟁 인용 URL 확인 → "브랜드 언급은 많은데 우리 콘텐츠 출처 인용 0"이면 콘텐츠 인용성 문제.
- **llms.txt / hreflang / 통계 밀도**: 해외는 언어별 트랜스크리에이션·통계 필수 디렉티브 반영됐나.

## 사이트 유형별 위서클 주의점
- **의료 정보형(자사 /blog·해외 guides)**: 시술 가이드 depth·의료법 통과·통계·FAQ. thin 태그페이지 지양.
- **파트너 병원(/with-partners·/clinics)**: 병원별 중복 서술 지양, MedicalClinic 스키마, 국내/해외 **언어 분리**(market 필터 — 국내 아카이브에 해외 콘텐츠 섞임 버그 이력).
- **해외 B2C 블로그**: k_beauty/k_medical/k_tips 카테고리·hreflang·현지어 자연스러움.

## 산출물 형식
**요약**: 전체 건강도 + 최우선 3~5 이슈 + 퀵윈.
**이슈별**(트랙 A/B/콘텐츠 각각):
- **이슈**: 무엇이 잘못됐나
- **영향**: SEO/GEO 영향(상/중/하)
- **증거**: 어떻게 확인(브라우저 document.head / GSC / SQL / 라이브 URL — web_fetch 단독 단정 금지)
- **수정**: 구체 지시(파일·라우트·쿼리 명시)
- **우선순위**: 1~5
**실행 계획**: ① 색인/랭킹 차단 크리티컬 → ② 고임팩트 → ③ 퀵윈 → ④ 장기.

## 감사 착수 질문
1. 국내/해외 중 어디, 특정 URL/키워드?
2. GSC·네이버 웹마스터 접근 되나?
3. 최근 변경·마이그레이션?
4. 목표: 구글 랭킹 / 네이버 / **AI 인용(CCS)** 중 무엇 우선?
5. 경쟁 도메인?

## 참고 — 도구
- 무료: Google Search Console(필수)·네이버 웹마스터·PageSpeed Insights·**Rich Results Test(스키마는 이걸로 — JS 렌더)**·Mobile-Friendly Test.
- 브라우저 MCP(Claude in Chrome): 스키마·hreflang·canonical 실검증에 사용.
- 유료(있으면): Screaming Frog·Ahrefs/Semrush.
