# 해외 페이지 온페이지 SEO 개선 — Round 199 (2026-09-11)

대상: `medimap-blog` (wecircle.co.kr) 의 해외 로케일 `/en` `/ja` `/zh` `/tw`
적용 스킬: `hospital-onpage-seo` (카카오톡 수신본)
원칙 준수: 디자인·레이아웃·기능 무변경. 화면에 보이는 문구는 한 글자도 고치지 않았고,
메타 태그·구조화 데이터·언어 속성만 수정했다.

## 0. 레포 정찰

| 항목 | 실제 |
|---|---|
| 프레임워크 | Next.js 14.2.13 App Router, SSG + ISR(60s) |
| 메타 생성 위치 | 각 `page.tsx` 의 `metadata` / `generateMetadata` export |
| 다국어 체계 | 서브디렉터리 `/en` `/ja` `/zh` `/tw` (i18n 라이브러리 없이 라우트 분기) |
| hreflang 헬퍼 | `src/lib/hreflang.ts` — 일부 라우트만 사용 중이었음 |
| sitemap | `src/app/sitemap.ts` — 해외 정적·허브·상세 모두 포함, 연령별 우선순위 적용됨 |
| 검사 명령 | `npx tsc --noEmit` · `npx next build` |

## 1. 🔴 발견 1 — 모든 해외 하위 페이지가 브랜드명을 두 번 달고 나갔다

라이브 실측 (수정 전):

```
/en/clinics       <title>Partner clinics — WECIRCLE Global · WECIRCLE Global</title>
/ja/blog          <title>ブログ — WECIRCLE Global · WECIRCLE Global</title>
/tw/clinics/derma <title>韓國皮膚科診所 — WECIRCLE Global · WECIRCLE Global</title>
```

원인은 두 겹이다. 로케일 레이아웃이 `title.template: "%s · WECIRCLE Global"` 을 걸어 두었는데,
페이지들이 자기 title 문자열에도 `— WECIRCLE Global` 을 손으로 붙이고 있었다.
Next 는 문자열 title 에 부모 template 을 적용하므로 결과가 겹친다.

**SERP 타이틀 예산은 약 60자다. 그중 18자를 반복되는 브랜드명이 먹고 있었다.**
해외 페이지 29개 파일의 title 문자열에서 접미사를 제거했다. template 이 붙여 주므로
브랜드는 그대로 한 번 남는다.

빌드 산출물 실측 (수정 후):
```
Korean Clinics by Specialty — Seoul & Gangnam · WECIRCLE Global
```

## 2. 🔴 발견 2 — hreflang 이 한 번도 유효했던 적이 없다

두 가지 결함이 겹쳐 있었다.

**(a) 페이지가 레이아웃의 alternates 를 통째로 덮어쓴다.**
`en/ja/zh/tw/layout.tsx` 는 `languages` 에 4개 로케일 + `ko` 를 제대로 선언하고 있었다.
그런데 Next 는 `alternates` 를 **병합하지 않고 대체**한다. 페이지가
`alternates: { canonical: "/ja" }` 만 선언하는 순간 레이아웃의 `languages` 는 사라진다.
로케일 홈 4개, about·contact·blog(en·ja·zh), guides 상세가 전부 이 경우였다 —
**canonical 만 있고 언어 대체가 없는 상태로 서빙되고 있었다.**

**(b) 국내 페이지가 되받지 않았다.**
해외 about·contact 는 예전부터 `ko: "/about"` 을 달고 있었지만, 국내 `/about` 은
`alternates: { canonical: "/about" }` 뿐이었다. hreflang 은 **상호 참조여야 유효**하다.
한쪽만 선언한 짝은 Google 이 통째로 무시한다. 즉 ko↔해외 링크는 선언만 있고
**성립한 적이 없었다.**

조치:
- `overseasAlternates()` 에 `x-default`(→ `/en`) 추가. 4개 로케일이 서로만 가리키고
  종점이 없으면 Google 이 클러스터 기본형을 임의로 고른다.
- `ko` 는 **경로가 1:1 로 대응할 때만** 넣도록 옵트인 인자로 바꿨다. `/clinics` ↔
  `/with-partners` 처럼 대응이 깨지는 곳에 ko 를 달면 짝이 어긋나 오히려 손해다.
- `koAlternates()` 신설 — 국내 `/`, `/about`, `/contact`, `/blog` 가 해외 4개를 되받는다.
  국내 홈은 `metadata` export 자체가 없어 루트 레이아웃을 상속했으므로 새로 추가했고,
  RSS autodiscovery(`/rss.xml`, 네이버 서치어드바이저용)를 함께 실어 유지했다.
- 하드코딩돼 있던 해외 페이지 14곳을 헬퍼로 일원화했다.

빌드 산출물 실측 — 국내 `/about` 과 해외가 서로를 가리킨다:
```
/about        ko→/about  en→/en/about  ja→/ja/about  zh-Hans→/zh/about  zh-Hant→/tw/about  x-default→/en/about
/tw           en→/en  ja→/ja  zh-Hans→/zh  zh-Hant→/tw  ko→/  x-default→/en
```

## 3. 발견 3 — 해외 페이지가 `<html lang="ko">` 로 나갔다

루트 레이아웃에 `<html lang="ko">` 가 하드코딩돼 있다. App Router 의 루트 레이아웃은
pathname 을 읽을 수 없어 여기서 로케일을 분기할 수 없다(라우트 그룹별 루트 레이아웃
분리는 전면 리팩터링이라 이번 범위 밖).

**hreflang 으로는 "이 문서는 일본어" 라고 선언하면서 문서 자체는 한국어라고 말하는
모순** 상태였다. `OverseasShell` 래퍼에 실제 언어를 스코프했다 —
en→`en`, ja→`ja`, zh→`zh-Hans`, tw→`zh-Hant`. 시각적 변화 0.

## 4. 발견 4 — ja·zh·tw 홈에 구조화 데이터가 하나도 없었다

`/en` 홈만 `Service` JSON-LD 를 내보내고 나머지 세 로케일은 전무했다.
en 의 구조를 그대로 미러하되 `name`·`description` 은 각 로케일 언어로,
`provider`·`areaServed` 는 동일하게 넣었다. 지어낸 사실 없음 — 기존 en LD 의 값만 옮겼다.

## 5. 키워드 정렬 — 허브 페이지 8개

DB `keywords` 테이블의 **실제 추적 중인 해외 키워드 279개**(en 78 · ja 69 · zh-Hant 69 ·
zh-Hans 63, 전부 `is_active`)에서 어휘를 가져왔다. 지어낸 키워드 아님.

| 경로 | 변경 전 | 변경 후 |
|---|---|---|
| `/en/clinics` | Partner clinics | Korean Clinics by Specialty — Seoul & Gangnam |
| `/ja/clinics` | 提携クリニック | 韓国のクリニック一覧 — ソウル・江南（診療科別） |
| `/zh/clinics` | 合作诊所 | 韩国诊所一览 — 首尔·江南（按科室） |
| `/tw/clinics` | 合作診所 | 韓國診所一覽 — 首爾·江南（按科別） |
| `/en/blog` | Blog | Korea Treatment Guides & Costs for Foreign Patients |
| `/ja/blog` | ブログ | 韓国 施術ガイド・費用（外国人患者向け） |
| `/zh/blog` | 博客 | 韩国就诊指南与费用（外国患者） |
| `/tw/blog` | 部落格 | 韓國就診攻略與費用（外國患者） |

description 에도 江南·清潭 皮膚科 / SMILE 近視雷射 / 植髮 같은 추적 키워드를 실었다.
최상급·효과 보장 표현은 쓰지 않았다(의료법 제56조). 기존 문구는 손대지 않았다.

## 6. 게이트

```
npx tsc --noEmit   → errors 0
npx next build     → 성공 (해외 라우트 전량 프리렌더)
이중인코딩 스캔     → 변경 파일 25개 전부 0건
```

⚠ 작업 중 perl 스크립트에 한글 리터럴을 직접 넣어 **두 번 이중인코딩 사고**를 냈다
(`src/app/page.tsx` 주석, JSON-LD 의 `legalName`). 둘 다 커밋 전에 잡아 복구했고,
en 홈 원본과 `legalName` 바이트 해시가 일치함을 확인했다. 재발 방지는 §8 참조.

## 7. 이번에 하지 않은 것

- **`<html lang>` 자체 수정** — 라우트 그룹별 루트 레이아웃 분리가 필요해 별도 라운드로.
  현재는 래퍼 스코프로 모순만 제거한 상태.
- **clinics 허브의 BreadcrumbList·ItemList LD** — 추가 가치는 있으나 이번 범위 밖.
- **가이드 본문 헤딩 계층 점검** — 본문은 자동 생성 파이프라인 산출물이라 개별 수정이
  아니라 생성기 템플릿을 고쳐야 한다.
- **키워드 카니벌라이제이션 전수 분석** — zh/tw 간 중복은 hreflang 으로 해소했지만,
  guides 상세 간 주제 중복은 별도 조사 필요.

## 8. 사람만 줄 수 있는 정보 · 후속 조치

1. 🔴 **Anthropic 크레딧 충전** — Claude 엔진 2026-09-03 이후 성공 0건, 7일간 980건 전량 실패.
2. 🔴 **Gemini(AI Studio) 선불 크레딧 소진** — 2026-09-09 23:56 부터 `RESOURCE_EXHAUSTED`.
   측정 4엔진 중 **OpenAI 하나만 살아 있는 상태**다. 이 기간 Mention Share 는 편향돼 있다.
3. **Perplexity API 키 미등록** — `llm_call_logs` 에 호출 기록 자체가 없음(넉 달째).
4. 배포 후 라이브에서 타이틀 중복 해소 + hreflang 노출을 재확인할 것(§9).

## 9. 배포 후 검증 명령

```bash
curl -sL https://wecircle.co.kr/en/clinics | grep -o '<title>[^<]*</title>'
# 기대: Korean Clinics by Specialty — Seoul & Gangnam · WECIRCLE Global  (· WECIRCLE Global 이 한 번만)

curl -sL https://wecircle.co.kr/about | grep -io '<link[^>]*alternate[^>]*hreflang[^>]*>'
# 기대: ko/en/ja/zh-Hans/zh-Hant/x-default 6줄
```
