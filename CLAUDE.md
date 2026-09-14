<!-- 사용자 명시 규칙 (2026-06-20) — Claude 가 무조건 지켜야 함 -->
## 🔴 사용자 명시 규칙 — Skill 저장

사용자가 "스킬 저장", "스킬 업데이트", "스킬 누적" 비슷한 요청을 하면 **반드시 다음 두 가지 동시 진행**:

1. **`.skill` 패키지 + Save skill 버튼** (정상 Claude 흐름)
   - `mcp__cowork__present_files` 로 사용자에게 카드 표시
   - 사용자가 "Save skill" 버튼 클릭 → 시스템에 영구 설치
   - **이걸 빼먹지 말 것. 사용자가 "원래 버튼 흐름이었잖아" 라고 지적했음.**

2. **GitHub 저장**: `C:\Users\user\Documents\Marketing\SKILL.md` 갱신 + git commit + push
   - 다중 PC 동기화 (사무실 ↔ 집)
   - git push 안내까지 반드시 포함

**하나만 하면 안 됨**. 둘 다 동시 진행이 사용자 요구사항.

---

<!-- 모델 핸드오프 프로토콜 (2026-07-07) — Fable 5 세션 실사고에서 확립. 모든 모델(Sonnet/Opus/Haiku) 무조건 준수 -->
## 🔴 모델 공통 작업 프로토콜

### 세션 시작 루틴
1. 새 기기/오랜만이면 사용자에게 `git pull` 먼저 안내
2. `SKILL.md` 최신 Round 섹션 + "다음 라운드 후보" 읽고 착수 (또는 geo-snapshot 스킬 트리거)
3. 코드 수정 전 Supabase MCP 로 관련 DB 실상태 확인 — 추측으로 고치지 말 것

### 파일 시스템 진실 규칙 (🔴 함정 ED)
- 호스트 파일 정본 = Read/Edit/Write 도구. Edit/Write 성공 = 파일 무결
- 샌드박스 bash 의 wc/tail 불일치·NUL·중간 절단 = **마운트 동기화 지연일 뿐, 파일 손상 아님**. 특히 SKILL.md 같은 대형 파일은 편집 직후 마운트에 수십 초~무기한 미반영 가능 → 그럴 땐 /tmp 사본에 동일 편집을 파이썬으로 재적용(anchor assert 필수)해서 진행
- 마운트에서 git commit/push 금지. **push 는 항상 사용자 로컬 터미널** — 완성된 한 줄 명령어 제공
- 샌드박스 산출물을 사용자에게 줄 땐 Write 도구(호스트 경로) 또는 outputs 복사+present_files 만 신뢰. outputs 에 직접 zip 생성이 막히면(Operation not permitted) /tmp 에 만들고 cp

### 빌드 게이트 (push 명령 제공 전 필수 — 실사고 3회 예방 실증)
- .tsx/.ts 수정: 수정본 /tmp 사본 확보(마운트 동기화 확인 or 재적용) → `npx --yes esbuild --loader:.tsx=tsx <파일> --outfile=/dev/null` PASS 확인
- .py 수정: `python3 -m py_compile <파일>`
- 🔴 **사무실 PC 엔 실제 Python 이 없다** (Round 200 실측 — `python`·`py` 모두 WindowsApps
  스텁만 있고 `-V` 조차 안 나온다). 여기서는 py_compile 게이트를 못 돌리므로 대체 경로를 쓴다:
  **무해한 입력으로 GitHub Actions 를 브랜치에서 돌려 프로덕션 Python 에 import 를 태운다.**
  예: `gh workflow run auto-publish.yml --ref <branch> -f tenant_id=999999`
  → 로그에 `scheduler.target_no_keyword` 가 찍히면 **모듈은 파싱·실행됐다**(= 문법 OK).
    `{"drafts":0,"published":0}` 이고 타깃 경로는 `last_run_at` 을 갱신하지 않아 부작용 0.
    exit 3 은 "생성 0 + 실패 1" 규칙에 따른 **정상 결과**다 — 코드 결함이 아니다.
  ⚠ 이건 **컴파일만** 증명한다. 조기 반환 때문에 로테이션 블록은 실행되지 않으므로,
    거기서 조립하는 **SQL 은 Supabase 에 직접 태워 따로 검증**할 것 (Round 200 은 그렇게 했다).
  집 PC·노트북에 Python 이 있으면 그쪽에서 `python -m py_compile` 이 정답.
- 🔴 **테스트가 실패하면 결론 전에 베이스라인부터 잰다** (Round 201). `pytest` 3건 실패를
  보고 내 수정 탓으로 닫을 뻔했으나, `git stash` 후 같은 명령이 **동일하게 3건 실패**했다.
  30초짜리 확인이 오진 하나를 막는다.
  반대 방향도 같다 — 원래 깨져 있던 테스트를 "원래 그래" 로 넘기지 말고 후보에 적어둘 것.
- 🔴 **눈에 띄는 에러가 원인이 아니다 — 스킵 로그를 먼저 봐라** (Round 202 정정).
  위 3건의 원인을 나는 "SQLite 스키마 드리프트" 로 적었는데 틀렸다. 로그의
  `sqlite3.OperationalError` 들은 전부 `try/except` 에 잡히는 잡음이고, 진짜 원인은
  `scheduler.plan_a_skipped_today` 한 줄이었다 — `publish_plan` 기본값 `'A'` 라서
  **테스트가 월/수/금에만 통과**했다(Round 83 게이트). 발행·로테이션 테스트를 쓸 땐
  tenant 에 `publish_plan="B"` 를 주고, 실패를 볼 땐 **무엇이 스킵됐는지**를 먼저 찾을 것.
- 🔴 **테스트 SQLite 스키마는 가드 SQL 이 읽는 컬럼을 전부 채워야 한다** (Round 202).
  타깃 경로의 가드는 `purpose`·`content_eligible`·`experiment_arm` 을 한 쿼리로 읽는데
  헬퍼가 `purpose` 만 ALTER 해서 **쿼리 전체가 예외 → `except: rows=[]` → 가드 블록이
  통째로 스킵**됐다. Round 183 을 잠그려던 테스트가 드레인을 한 번도 실행하지 않았다.
  ORM 미매핑 컬럼이 가드를 죽이는 것과 같은 꼴이며, 이번엔 테스트 쪽에서 일어났다.
- 🔴 **새 회귀 테스트는 음성 검증까지 해야 테스트다** (Round 202). 수정 전 커밋으로
  되돌려 그 테스트가 **실제로 실패하는지** 확인한다. 통과만 보면 공허한 테스트
  (예: `tenant_products` 가 없어 해외 키워드가 `_publish_ok` 에서 이미 걸러지면,
  무엇을 주장하든 통과한다)를 잠금장치로 착각한다.
- 🔴 **시계·환경을 조작하는 실험엔 "조건을 안 바꾼 대조군" 을 같이 돌린다** (Round 203).
  토요일로 고정했더니 7건 실패 → "요일 의존 남음" 으로 결론낼 뻔했으나 **월요일 고정도 똑같이
  7건 실패**였다. 원인은 요일이 아니라 `pytest -s` — Windows cp949 콘솔로 `—` 가 출력되며
  생성 경로가 예외를 내 발행이 0이 됐다. **대조군이 실패하면 결과는 전부 도구의 것이다.**
  ⚠ Windows 로컬에서 발행 테스트에 `-s` 금지.
- 게이트 없이 push 명령 주는 것 금지

### 🔴 esbuild 는 타입을 못 잡는다 — Next 규약 수동 체크 필수 (실사고 Round 144)
esbuild 는 **문법만** 본다. 타입 에러는 Vercel 빌드에서 처음 터지고, 실패해도
이전 성공 빌드가 계속 서빙되므로 **"배포됐는데 화면이 그대로"** 로 나타난다.
push 전 아래를 눈으로 확인할 것:

- **이 프로젝트는 Next.js 14.2.13** — 페이지 컴포넌트의 `params`/`searchParams` 는
  **동기 객체**다. Next 15 스타일 `params: Promise<{...}>` 로 쓰면 PageProps 타입
  검사에서 빌드가 깨진다.
  - `page.tsx` → `{ params: { id: string } }` (await 금지)
  - `route.ts` → `params: Promise<{...}>` 패턴이 기존 5개 파일에 있고 동작함(핸들러는 PageProps 검사 대상 아님)
  - 검사 한 줄: `grep -rln "params: Promise" src/app --include=page.tsx` → **결과 0이어야 정상**
- 공유 인터페이스(예: `ReportMetrics`) 필드명을 바꾸면 **소비처 전수 grep** 필수
- 배포 후 화면이 안 바뀌면 캐시를 의심하기 전에 **빌드 실패를 먼저 의심**할 것

### 🔴 신규 라우트 추가 시 — 동적 세그먼트명 충돌 (실사고 Round 144)
Next.js 는 **같은 depth 에 서로 다른 동적 세그먼트명**을 허용하지 않는다.
`/r/[slug]`(ShortLink)가 있는데 `/r/[tenantId]/...` 를 추가해서 빌드가 통째로 깨졌다.
```
Error: You cannot use different slug names for the same dynamic path ('slug' !== 'tenantId').
```
이건 **타입 에러가 아니라 라우트 트리 에러** — esbuild·tsc 둘 다 못 잡고 `next build` 만 잡는다.

**신규 동적 라우트 추가 전 필수 검사 1줄:**
```bash
find src/app -type d -name '\[*\]' | while read d; do echo "$(dirname "$d")|$(basename "$d")"; done \
 | sort | awk -F'|' '{a[$1]=a[$1]" "$2} END {for(p in a){n=split(a[p],arr," "); if(n>1) print "CONFLICT: "p" → "a[p]}}'
```
→ **출력이 비어야 정상.** 현재 예약된 최상위 경로: `/r`(ShortLink) · `/report`(클라이언트 보고서)

### 🔴 route.ts 는 정해진 export 만 허용 (실사고 Round 144)
`export const MATURE_DAYS = 42` 같은 임의 상수를 route.ts 에서 export 하면
`"MATURE_DAYS" is not a valid Route export field` 로 빌드 실패.
허용: `GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS · runtime · dynamic · revalidate ·
fetchCache · dynamicParams · preferredRegion · maxDuration · generateStaticParams · config`
공유가 필요하면 **별도 lib 파일로 분리**할 것.

### 🔴 tsc 풀 타입체크 게이트 — 샌드박스에서 재현 가능 (실사고 Round 146→148)
esbuild 게이트만 믿고 push 한 Round 146 커밋의 TS2352(Supabase FK 조인은 생성 타입
없으면 **배열**로 추론 — 객체로 직접 `as` 캐스팅 금지, `as unknown as` + 배열/객체
양쪽 런타임 처리)가 geo-v2 빌드를 2라운드 동안 조용히 깨뜨렸다(이전 빌드 서빙이라
화면은 멀쩡). **npm install 이 샌드박스에서 됨이 확인됐으므로**(52초) v2 의 .ts/.tsx
수정 시 아래를 esbuild 게이트에 추가로 실행:
```bash
cd /tmp && rm -rf v2build && mkdir v2build && cd v2build \
 && cp -r <마운트>/medimap-blog-v2/src . \
 && cp <마운트>/medimap-blog-v2/{package.json,tsconfig.json,next-env.d.ts} . \
 && npm install --no-audit --no-fund --loglevel=error \
 && npx tsc --noEmit   # errors=0 이어야 push
```
(설치 실패 시엔 기존 esbuild 게이트 + Supabase 조인 캐스팅 수동 검토로 대체하고
"tsc 미검증" 을 명시할 것.)

### ✅ 게이트 스크립트 (push 전 1회 실행 — 손으로 치지 말 것)
```bash
cd medimap-blog-v2 && bash scripts/build-gate.sh
```
위 3대 함정(세그먼트 충돌 · route export · Promise params) + UI 내부용어를 한 번에 검사.
**RESULT: ✅ PASS 아니면 push 금지.**

⚠ **`scripts/build-gate.sh` 는 `medimap-blog-v2` 에만 있다.** 원본 `medimap-blog` 를 고칠 땐
스크립트가 없으므로 `npm install → npx tsc --noEmit → npx next build` 를 순서대로 직접 실행할 것
(esbuild 만으로는 부족 — Round 184 의 `PartnerPost`→`PartnerPostMeta` 같은 순수 타입 교체를
esbuild 는 전부 통과시킨다).

### 배포 검증 (Round 144 이후 필수)
push 후 "됐겠지" 금지. Vercel 프로젝트 `geo-v2`(팀 slug `medimaps-projects`) 배포 상태를
확인하거나, 신규 API 엔드포인트를 직접 호출해 **404 가 아닌지** 확인할 것.
빌드 실패해도 이전 성공 빌드가 계속 서빙되므로 화면만 봐서는 구분이 안 된다.

**🔴 배포 완료 판정을 간접 신호로 하지 말 것 (실사고 2회, Round 184b·185)**
- **Etag 금지.** ISR 재검증마다 바뀌므로 배포와 무관하다. 실제로 신 배포가 아직 `QUEUED`
  인데 구 배포를 측정하고 "안 고쳐졌다"고 결론낸 사고가 있었다.
- 판정은 둘 중 하나로만: ① `list_deployments` 에서 **해당 커밋 sha 의 `state: READY`**
  ② 런타임 로그에 **신 코드에만 있는 문자열**(예: 타임아웃 값 `60000ms`→`8000ms`)
- **속도를 잴 땐 `X-Vercel-Cache` 를 반드시 같이 볼 것.** `STALE`/`HIT` 응답이 빠른 건
  당연하다 — 이걸 "고쳐졌다"로 오독한 사고가 있었다. 성능 주장은 `MISS` 로만 한다.

### JSX 함정 (실사고 2회: 124-B, 131-B)
- 삼항 `) : ( ... )` / `{cond && ( ... )}` 괄호 안에 `{/* */}` 주석 금지 → 빌드 실패. `//` 줄주석 또는 괄호 밖에 배치

### 검증 원칙
- 배포/DB 변경 후 라이브 URL(web_fetch) 또는 SQL 로 실측 확인 후 보고. "됐을 것" 금지 — 실측 없으면 "미검증" 명시
- 발행 콘텐츠 검증 항목: 이미지(무인물·무한글·글 맥락·시네마틱 톤), 파트너 태깅 3필드, 의료법 통과, /with-partners 노출

**🔴 `RETURNS void` · `pg_net` 비동기 함수는 빈 결과가 정상이다 (실사고 Round 191b)**
- Supabase SQL 에디터에서 `SELECT public.some_fn(...)` 의 결과 셀이 비어도 **실패가 아니다.**
  `RETURNS void` 이거나 `net.http_post` 처럼 요청만 큐에 넣고 즉시 리턴하는 fire-and-forget
  이면 빈 값이 정상이고, 게다가 **발사 시점엔 HTTP 응답이 존재하지도 않는다.**
- 판정은 항상 **판정용 뷰/응답 테이블**로 한다 — `cron_endpoint_health`, `net._http_response`.
  호출 함수의 반환값으로 성패를 판단하지 말 것.
- 위 "배포 완료 판정을 간접 신호로 하지 말 것" 과 뿌리는 같으나 대상이 다르다. 저건 배포
  파이프라인(sha READY·런타임 로그로 판정), 이건 DB 함수의 비동기 사이드이펙트.
- 🔴 **판정용 뷰가 `net._http_response` 를 조인하면 그 뷰는 6시간 뒤 거짓말을 한다** (실사고 Round 192).
  `pg_net.ttl = 6 hours` 인데 감시자 발사 주기는 7시간이라 **직전 결과를 구조적으로 100% 놓쳤다**
  — 조회하면 항상 `last_status_code=null`, 그리고 null 은 진짜 실패(401)와 구분되지 않는다.
  → 응답은 **독립 주기의 수확 잡**(`cron-endpoint-harvest`, 15분)이 TTL 안에 우리 테이블로
  옮긴다. 판정 뷰는 조인하지 말고 **수확된 스냅샷 컬럼**을 읽는다.
- 🔴 **한 번 200 을 봤다고 판정 수단이 살아 있다는 뜻이 아니다.** Round 191b 는 주입 직후
  (TTL 안) 200 을 보고 "가동 확인" 으로 닫았고, 그 뷰는 6시간 뒤부터 영원히 null 이었다.
  **관측은 시간이 지난 뒤 한 번 더 해야 검증이다.** 그동안 감시자는 실제 알람
  (`starving: 포레나의원 11일`)을 계속 감지하고 있었지만 아무도 볼 수 없었다.
- **🔴 "성공만 남는" 로그 테이블로는 죽은 구성요소를 볼 수 없다 (실사고 Round 198)**
  `responses` 에는 성공한 호출만 남아, 엔진이 100% 실패하면 그냥 조용해질 뿐이다 —
  **"요즘 조용하네" 와 "죽었다" 가 구분되지 않는다.** 실측: Claude 가 5일간 전량 실패
  (크레딧 소진)했는데 배치는 `success` 로 끝났고 로그 헤더엔 `✓ Claude engine 활성` 이
  찍혔다(키가 **있으면** 뜨는 표시일 뿐 호출 성공이 아니다). Perplexity 는 키 미등록으로
  **넉 달간 조용히 skip** 됐다.
  → 실패까지 남는 로그(`status`+`error_msg`, 이 프로젝트는 `llm_call_logs`)를 따로 보고,
  판정을 **원인별로 분리**한다: `missing`(호출 기록 자체 없음=키 미등록) ·
  `down`(성공 0+실패 다수=크레딧·키 만료) · `degraded`(실패율 50%+=레이트리밋).
  뭉뚱그리면 알람을 받고도 시크릿 탭인지 결제 페이지인지 모른다.
  ⚠ 같은 엔진이 표기 불일치(`claude`/`anthropic`)로 쪼개지면 집계에서 새므로 별칭을 묶을 것.
  🔴 **"충전했다" 와 "키가 있다" 는 다른 사실이다** (Round 200). 사용자가 "다 충전했어" 라고
  해도 `missing` 판정 엔진은 안 살아난다 — 돈이 아니라 시크릿이 없는 것이다. 실측:
  Claude·Gemini 는 충전으로 즉시 복구(2/2 성공)됐지만 Perplexity 는 그대로 0이었고,
  `gh secret list` 에 `PERPLEXITY_API_KEY` 자체가 없었다(넉 달째 조용히 skip 된 이유).
  → 복구 보고 전에 **`gh secret list` 로 키 존재를 먼저 확인**하고, 판정별로 조치를 분리해
    알릴 것. 그리고 복구는 **실호출로만** 확인한다 — `check_llm_health.py` 는 과거 로그만
    읽는 리더라 충전 직후엔 아무것도 증명하지 못한다.
    최소 비용 실호출: `gh workflow run measure-ai-mentions.yml -f engine_mode=production
    -f keyword_limit=2` → `llm_call_logs` 에서 엔진별 성공/실패 확인.
- **비동기 호출 함수를 새로 만들 땐 request id 를 저장하고 판정용 health view 를 같이 만든다.**
  안 만들면 "쐈다는 것만 알고 됐는지는 아무도 모른다" 가 된다 (Round 187 재현).

### 🔴 새 지표·판정 도구를 만들면 그 자체를 먼저 반증할 것 (세션 총평 Round 191b~198)
이 세션에서 찾은 문제가 **전부 같은 형태**였다 — 측정·판정 도구가 틀렸는데 아무도 몰랐다.
191b 판정 뷰가 6시간 뒤 거짓말 · 193 죽은 ORM 가드 2개 · 194 빈 경쟁사 테이블 ·
195 일반명사 별칭 오염(전체 멘션의 30%) · 197 인용 컬럼 한쪽만 읽음.
🔴 그리고 **196 에서 그 진단을 하려고 내가 만든 측정 자체가 틀렸다** — 크롤 도달을
경로 접두사로 세서 71%를 12%로 보고했고, "유통이 문제" 라는 결론이 "인용이 문제" 로 뒤집혔다.
반증하지 않았다면 **잘못된 결론 위에 다음 라운드를 쌓을 뻔했다.**

→ **새 지표·판정 뷰·감시자를 만들면, 결론을 내기 전에 그 숫자를 최소 1회 다른 경로로
교차검증한다**(raw SQL 재계산 · 표본 수동 확인 · 다른 조인 방식과 대조).
"숫자가 나왔다" 는 "숫자가 맞다" 를 보장하지 않는다. 측정 코드도 코드다.

### 작은 모델(Sonnet/Haiku) 추가 규칙
- 한 세션 라운드 1~2개만. 큰 편집은 세션 초반에
- 여러 파일 수정 시 파일당 [수정→게이트] 완결 후 다음 파일 (일괄 수정 후 일괄 검증 금지)
- 컨텍스트 절약: Grep head_limit≤50, Read offset/limit, SELECT 필요 컬럼만
- 확신 없으면 SKILL.md 에서 해당 주제 선례를 먼저 Grep — 대부분의 함정은 이미 기록돼 있음

---

<!-- GSD:project-start source:PROJECT.md -->
## Project

# GEO/AEO SaaS (메디맵)

AI 검색엔진(Perplexity, ChatGPT, Gemini, Claude)에서 의료 도메인 브랜드의 노출(Mention Share)을 측정하고, AI에 인용되도록 최적화된 콘텐츠를 자동 생성하는 멀티테넌트 SaaS. 첫 고객은 메디맵(의료/안과 마케팅)이며, 의료법 컴플라이언스가 핵심 차별점.

**Core value:** 키워드 → AEO 최적화 콘텐츠 → 의료법 통과 → 복사 가능 한 라인이 메디맵 운영자에게 동작.

상세는 `.planning/PROJECT.md` 참조. 정의서 풀스코프는 `.planning/SPEC-v2.md`.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

- **언어:** Python 3.11+
- **LLM SDK:** `openai`, `anthropic`, `google-genai` (구 `google-generativeai` 에서 마이그레이션 — Phase 6.5), Perplexity REST
- **Embedding:** `text-embedding-3-small` (OpenAI)
- **Vector DB:** `chromadb` (로컬 파일)
- **Web Crawling:** `httpx` + `trafilatura`
- **DB:** SQLite → PostgreSQL 마이그레이션 가능 (tenant_id 컬럼 처음부터)
- **Scheduler:** APScheduler → Celery+Redis
- **Dashboard:** Streamlit (배포: Streamlit Community Cloud) → React+FastAPI (MVP-5)
- **통계:** `scipy.stats`, `pymannkendall`
- **NER (한국어):** `kiwipiepy` + 룰베이스
- **Env:** `python-dotenv`
- **Logging:** `structlog`
- **Test:** `pytest`

상세는 `.planning/SPEC-v2.md` §1.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

- **Multi-tenant from day 1**: 모든 테이블에 `tenant_id` FK (Tenant 자기 자신 제외). 쿼리/생성/검색 모든 경로에서 tenant 격리.
- **Compliance 강제**: 의료법 린터를 모든 콘텐츠 생성 경로에 강제. 우회 경로 만들지 말 것.
- **Cost guardrail**: LLM 호출 전 `MAX_DAILY_USD`, `MAX_CONTENT_GEN_PER_DAY` 사전 체크. 가드레일 우회 금지.
- **No auto-posting**: 외부 플랫폼(네이버 블로그/티스토리/인스타) 자동 게시 금지. 출력은 클립보드/파일로만.
- **Korean-first**: UI/콘텐츠/룰 한국어. 영어는 코드 식별자에만.
- **Async I/O**: LLM 호출, HTTP, DB는 가능한 비동기 (`asyncio` + `httpx.AsyncClient`).
- **Type hints**: 모든 public 함수에 type hint. dataclass/Pydantic 사용.
- **No mocking DB in tests**: 통합 테스트는 SQLite 메모리 DB 실제 사용. LLM은 모킹 OK.
- **Streamlit stale module cache 가드**: Streamlit Cloud 재배포 후 `sys.modules` 캐시로 신규 ORM 컬럼/모델이 누락된 채 실행될 수 있음. 신규 속성/모델 접근 전 `hasattr(Model, "field")` 또는 `try/except ImportError` 가드 필수. 완전 해소는 앱 reboot.
- **Design-only changes**: 디자인/UI 작업 시 기능 로직(LLM 호출, DB 쿼리, 스케줄러, 컴플라이언스 린터, 핸들러)은 절대 손대지 말 것. theme.py CSS / Tailwind 토큰 / 마크업만 수정. 기능 변경이 필요하면 별도 커밋으로 분리.
- **Cross-site design sync**: 3개 사이트가 동일한 강남언니 디자인 토큰을 공유 — `src/dashboard/theme.py`(테넌트), `src/admin/theme.py`(어드민), `medimap-blog/tailwind.config.ts` + `medimap-blog/src/app/globals.css`(블로그). 브랜드 컬러 변경 시 4개 파일을 동시에 갱신. 확정 팔레트 — Brand `#1B68FF`(핫핑크), Accent `#1AD2A4`(민트), Admin Primary `#4F5DF8`(퍼플), Mint `#15CBA8`. SVG `<linearGradient>` stop-color 는 Tailwind 토큰이 미치지 않으므로 별도 체크리스트.
- **Supabase 함수·트리거 정본화**: Supabase 함수/트리거를 신규 생성하거나 수정하면 반드시 `db/supabase/` 에 정본 SQL 을 남긴다. DB 안의 트리거는 **리포 grep 에 0건**이라 코드 리뷰로는 존재조차 알 수 없다 (Round 186: 발행마다 Vercel 배포를 쏘던 `trg_fire_vercel_on_publish` 를 찾는 데 이 때문에 오래 걸렸다). 원인 불명 증상 조사 시 `pg_trigger`·함수 정의도 스캔 범위에 넣을 것.
- **🔴 경로(path)로 콘텐츠를 식별하지 말 것 — 식별자는 slug (실사고 Round 196)**
  같은 글이 `/blog/<slug>` · `/with-partners/<카테고리>/<파트너>/<slug>` ·
  `/{lang}/guides/<slug>` 등 **최소 3가지 경로**를 가진다. 어드민 퍼널 탭이 크롤 도달을
  `path LIKE '/blog/%'` 로만 세다가 **실제 도달의 84%를 놓쳤다**(12.2% 로 보고, 실제 71.0%).
  → `regexp_replace(path,'^.*/','')` 로 마지막 세그먼트를 뽑아 **slug 와 동등 조인**한다.
  경로 구조가 바뀌어도 안 깨지고, LIKE 스캔보다 빠르고, 언어별 경로도 자동으로 잡힌다.
- **🔴 AI 응답의 인용 URL 은 두 컬럼에 나뉘어 들어온다 (실사고 Round 197)**
  | 컬럼 | 엔진 | 성격 |
  |---|---|---|
  | `responses.source_domains` | Gemini | 리다이렉트(vertexaisearch)를 HTTP 로 따라가 **해석한 결과** — 별도 해석 배치가 돌아야 채워진다 |
  | `responses.cited_urls` | Claude · OpenAI | 처음부터 들어 있는 **실제 URL** — 해석 불필요 |
  `collect_citation_events.py` 가 앞의 것만 읽어서 **Claude 인용 4건이 0건으로 기록**됐고,
  "인용 9건 전부 Gemini" 라는 결론이 나왔다. 그건 세계의 사실이 아니라 **쿼리의 사실**이었다.
  → 인용·출처 집계는 **두 컬럼을 UNION** 으로 같이 읽는다.
  🔴 **`medi-map.co.kr` 은 자사가 아니다 — R197 의 "구 브랜드 도메인 포함" 규칙은 오진이었다** (Round 203 정정).
  그 도메인은 **전 직장 메디맵의 병원찾기 플랫폼**(wecircle 로 리다이렉트 안 됨)이고, 인용된 URL 은
  전부 `/search?q=` · `/hospital/view/` · `global.medi-map.co.kr` 였다 — 우리 글 0건.
  `SELF_HOSTS` 에 넣었다가 "자사 인용" 의 23% 가 허수가 됐다. Round 180b 가 이미 같은 결론을
  냈는데 197 이 되살렸다. 정본: 자사 = `wecircle.co.kr`(+서브도메인), 어드민 `domain_classifications`
  에서 medi-map = T4. 자사 판정 정규식은 **호스트 위치에 고정**할 것(부분일치 금지).
  → "옛 도메인이다" 라는 주장은 **리다이렉트와 인용 URL 표본으로 확인한 뒤** 목록에 넣는다.
- **발행 대상 선택 규칙은 모든 경로에**: 발행 키워드 선택 경로는 **일반 로테이션** · **타깃 경로(`target_tenant_id`)** · **A/B 자동 생성(`scripts/run_ab_auto.py`, 주간)** **세 곳**이다. 게이트·우선순위 규칙을 한쪽에만 넣으면 다른 쪽이 옛 규칙으로 계속 발행한다 — Round 164b·173·182c·183 에서 같은 문으로 4회 반복됐고, **Round 204 에서 세 번째 경로가 발견됐다**(게이트 0개 — 2026-09-08 발행 제외 헤드 키워드 `헤어라인교정` 이 이 경로로 발행됨. 후보 685개 중 경쟁조사 82·발행제외 143·해외 267·일시정지 병원 125).
  → 새 게이트를 추가할 땐 `grep -rn "FROM keywords" scripts/ src/` 로 **키워드를 고르는 SQL 을 전수** 찾을 것.
  - **우선순위 규칙 (Round 204)**: 실험 드레인 → 네이버 수요 드레인 → **커버리지 드레인**(글 0편 · 비브랜드 · ko) → 날짜 로테이션. 브랜드 판정 정본은 `src/content/brand_tokens.py` (어드민 RPC `funnel_tenant_stats` 와 규칙 동일, `tests/test_brand_tokens.py` 가 합의를 잠금). 끄기: `COVERAGE_DRAIN=0`.
  - 🔴 **범위(scope)는 정렬과 대상 풀에 같은 축으로 넣는다 (실사고 Round 201)**
    R200 은 굶김 정렬을 `lang='ko'` 로 좁혔는데 **키워드 풀은 안 좁혔다.** 결과: ko 로 굶었다는
    이유로 1순위를 받은 병원이 그 슬롯에 **중국어 글**을 냈다(포레나의원 `红大皮肤科推荐`).
    굶김 키는 그대로 남아 다음 실행에서 또 1순위 — **알람은 계속 울리고 발행은 영원히 안 나간다.**
    위 규칙이 *경로 두 개*(로테이션↔타깃)라면 이건 *같은 경로 안의 축 두 개*(정렬↔대상 풀)다.
    → 우선순위를 어떤 축으로 매겼으면 **그 슬롯이 소비하는 대상도 같은 축으로 걸러야** 한다.
      아니면 슬롯이 알람을 해소하지 못한다.
- **🔴 ORM 미매핑 컬럼 = 조용히 죽는 가드 (실사고 2회: `Keyword` Round 183, `Tenant` Round 193)**
  `getattr(obj, "col", default)` 는 매핑이 없으면 **언제나 default** 를 돌려준다. 예외도
  경고도 없다. Round 193 실측: `Tenant` 에 `partner_slug`·`status` 가 없어서
  ① Round 189 의 self 판정(`ps.endswith("-self")`)이 **죽은 코드**였고(발행 로그가 매번
  `self_tenants=[]`), ② Round 174i 의 일시정지 가드도 항상 `"active"` 로 읽혀 무력했다.
  **두 번 다 "고쳤다" 고 커밋한 뒤 몇 주간 아무도 몰랐다.**
  → 새 컬럼을 조건문에 쓰기 전에 `grep "컬럼명" src/storage/models.py` 로 **매핑 존재를
  먼저 확인**할 것. 없으면 모델에 추가하거나 raw SQL 로 읽는다.
- **🔴 자동 생성한 별칭에 일반명사가 새면 측정이 통째로 허수가 된다 (실사고 3회: 153·195)**
  `_build_aliases`(scripts/run_measurement_batch.py)가 tenant_name 에서 자사 별칭을
  만든다. 여기에 일반명사가 들어가면 **그 단어가 나오는 모든 AI 답변이 그 병원의 target
  멘션**이 된다. 실측: `"바를정 한방의원"` → `"한방"` **1,240건**(전체 멘션의 약 30%),
  `"벨리셀 피부과"` → `"피부과"` 225건, `"밝은눈안과 강남점"` → `"강남점"` 48건.
  🔴 **단어 목록을 늘리는 것으로는 못 막는다.** 195 의 출처는 목록이 아니라 **접미사 제거
  경로**였다 — `"한방의원"` 에서 `"의원"` 을 떼어 원문에 단어로 존재한 적도 없는 `"한방"` 을
  만들어냈다. 만들어질 토큰을 미리 열거할 수 없다.
  → 규칙으로 막는다: **한글 별칭 최소 3글자** · 지점 표기(`…점`, ≤4자) 제외 ·
  stem 은 일반명사 검사를 한 번 더. `tests/test_brand_aliases.py` 가 이걸 지킨다.
  **새 tenant 를 추가하면 그 테스트의 `REAL_TENANTS` 에 이름을 넣을 것.**
- **🔴 로테이션 커서를 두 파이프라인이 공유하면 한쪽이 굶는다 (실사고 Round 193)**
  `auto_content_settings.last_run_at` 하나를 ko 로테이션과 해외 배치가 같이 갱신했다.
  해외는 매일·ko 는 주 6회라, 해외 상품을 가진 병원일수록 ko 대기열 뒤로 밀려
  **포레나의원 ko 발행이 11일째 0**이었다(해외는 매일 나가서 겉보기엔 정상).
  → 굶김 정렬은 **그 실행의 범위(lang/market) 안에서 마지막으로 낸 발행 시각**으로 한다.
  "최근에 뭔가 돌았다" 가 아니라 "이 범위의 결과물이 언제 나왔나" 가 기준이어야 한다.
- **ORM `Keyword` 에 없는 컬럼이 있다**: 실 DB 에는 `purpose`·`experiment_arm`·`experiment_pair_id`·`tracked` 가 있지만 ORM 모델에는 **없다**. `getattr(k, "purpose", "own")` 은 언제나 기본값을 돌려줘 **필터가 조용히 무력화**된다. 이 컬럼들로 거를 땐 raw SQL 을 쓸 것 (테스트 SQLite 스키마도 `ALTER TABLE` 로 맞춰준다).
- **Token-first components**: 신규 컴포넌트는 `brand-*` / `accent-*` 토큰 클래스만 사용. `#hexcode` 직접 삽입 금지 (SVG gradient 제외). 한 곳만 빠뜨려도 리브랜딩 시 색이 어긋나는 구멍이 됨.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

```
사용자 (메디맵 운영자)
  ↓
[Reference Library (RAG)] + [Compliance Engine (의료법 린터)]
  ↓
[Content Generator (채널별 템플릿)]
  ↓
사용자가 복사 → 수동 배포

병렬:
[Monitoring Agent (4엔진 수집)] → [Analytics] → [Streamlit Dashboard]
```

**디렉토리:**
```
src/
├── engines/         # LLM 엔진 (Perplexity, OpenAI, Gemini, Claude)
├── collector/       # 수집 + 스케줄러
├── parser/          # 멘션 추출 + NER
├── storage/         # SQLAlchemy 모델 (tenant_id 포함)
├── analytics/       # mention share, 추세, 이상치, competitor
├── reference/       # RAG (crawler, chunker, embedder, retriever)
├── compliance/      # 의료법 린터
├── content/         # 콘텐츠 생성 + 4채널 템플릿
├── dashboard/       # Streamlit 테넌트 앱 — theme.py(강남언니 핑크 #1B68FF + 오렌지 #1AD2A4)
│                    # kpi_strip / login wrap 헬퍼
└── admin/           # Streamlit 어드민 백오피스 — theme.py(핑크 #1B68FF + 퍼플 #4F5DF8 + 민트 #15CBA8)
                     # admin_kpi_strip / admin_chip / render_admin_header / render_side_card 헬퍼
medimap-blog/        # Next.js 14 SSG 블로그/랜딩 (Vercel 배포)
```

상세는 `.planning/SPEC-v2.md` §0, §2.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:deployment-start -->
## Deployment

- **플랫폼:** Streamlit Community Cloud (무료 tier) + Vercel (Next.js)
- **라이브 사이트 (3개):**
  - **테넌트 대시보드** (`blogkey`) → https://blogkey.streamlit.app — 클라이언트(병·의원) 운영자, `APP_PASSWORD` + `?tenant=&pw=` 게이트
  - **어드민 백오피스** (`blogkey-adm`) → https://blogkey-adm.streamlit.app — 메디맵 직원 전용, `ADMIN_APP_PASSWORD` 게이트
  - **블로그/랜딩** (`medimap-blog`) → https://medimap-blog-phi.vercel.app — Next.js 14 SSG, AEO 자산용 자사 통제 URL
- **GitHub:** https://github.com/passion4050-byte/Marketing (private)
- **브랜치:** `main` (master → main 리브랜드 완료)
- **자동 재배포:** main push 시 — Streamlit Cloud(blogkey + blogkey-adm) 1~2분 빌드, Vercel deploy hook(medimap-blog) 즉시 트리거

**배포 산출물:**
- `requirements.txt` — Streamlit Cloud 가 읽는 의존성 목록 (pyproject.toml 미러)
- `.streamlit/config.toml` — 테마 + 서버 설정
- `.streamlit/secrets.toml.example` — 시크릿 템플릿 (실 파일은 gitignored)
- `.python-version` — Python 3.12 핀
- `src/storage/seed.py` — `seed_if_empty()` 가 부트스트랩 시 호출돼 SQLite 휘발 대응

**Streamlit Cloud Secrets (앱 설정 → Secrets 탭):**
- `LLM_PROVIDER` — `gemini` | `anthropic` | `openai` | `stub`
- `GOOGLE_API_KEY` (또는 `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`)
- `APP_PASSWORD` — 데모 비밀번호 게이트
- `DATABASE_URL` (선택) — Supabase Postgres 등 영속 DB 사용 시

**시크릿 hydration:** `src/dashboard/app.py` 의 `_hydrate_env_from_secrets()` 가 `st.secrets` 를 `os.environ` 으로 흘려보내 기존 `os.getenv()` 코드가 변경 없이 동작.

**Analytics (GA4 단일 소스):** 3개 사이트 모두 GA4 만 사용 (GTM 제거 완료, ~280KB 절감 유지). medimap-blog 의 GA4 measurement ID 는 `medimap-blog/src/lib/site.ts` 의 `siteConfig.ga` 에서 조회. `next/script` 전략은 **항상 `afterInteractive`** — 이전에 `lazyOnload` 시도했으나 작은 스크립트라 main thread idle 진입을 늦춰 TBT/FCP 가 회귀해 되돌림.

**최초 배포 자동화 (재실행 불필요):** `tools/deploy_github.py` — GitHub Device Flow OAuth → private 리포 생성 → master→main 리브랜드 → 첫 푸시 → 토큰 strip. 일반 재배포는 `git push origin main` 만으로 충분.
<!-- GSD:deployment-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` — do not edit manually.
<!-- GSD:profile-end -->
