---
description: pg_cron 잡 등록·실행·엔드포인트 실응답을 한 번에 점검 — "발행/감시가 안 도는 것 같다" 의심 시, cron_endpoints 신규·수정 직후 실행
---

# /pg-cron-health

Round 188 은 코드도 배포도 끝난 감시자가 **한 달 가까이 `cron.job` 에 등록조차 안 된 채**
방치됐다. 아무도 "이거 실제로 등록돼 있나?" 를 한 번 안 물어봤기 때문이다.
이 커맨드는 그 질문을 한 번에 던진다.

Supabase MCP(`execute_sql`) 로 실행. **read-only 쿼리만 사용한다.**
프로젝트: `blogkey` (`gifopyowyankfsfghhdi`)

## 실행 순서

### 1. 등록 여부

```sql
SELECT jobid, jobname, schedule, command, active FROM cron.job ORDER BY jobid;
```

- 대상 jobname 이 목록에 **없음** → 🔴 **FAIL — 등록 누락** (Round 188 재발). 여기서 중단하고 보고
- `active = false` → 🔴 **FAIL — 비활성**
- 있고 active=true → 다음 단계. **jobid 를 기억할 것** (2단계에서 쓴다)

### 2. 최근 실행 이력

```sql
SELECT jobid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = <1단계의 jobid>
ORDER BY start_time DESC LIMIT 5;
```

- `status <> 'succeeded'` → 🔴 **FAIL** — `return_message` 를 그대로 보고
- 행이 0건 → ⚠ **WARN — 등록은 됐으나 아직 한 번도 안 돌았음.** 다음 예정 시각을 함께 안내
- 최근 `start_time` 이 schedule 간격을 넘겨 오래됨 → ⚠ **WARN — stale**
  - `'0 2,9 * * *'`(하루 2회)면 최대 간격 ~16h. 그 이상 비었으면 이상

⚠ 여기서 `status='succeeded'` 는 **"함수 호출이 성공했다"** 는 뜻일 뿐이다.
HTTP 요청이 성공했다는 뜻이 **아니다.** 그건 3단계에서만 알 수 있다.

### 3. 엔드포인트 실응답 (여기가 진짜 판정)

```sql
SELECT * FROM public.cron_endpoint_health;
```

| 관측 | 판정 |
|------|------|
| `secret_set = false` | 🔴 FAIL — 시크릿 미주입 (401 이 뜬다) |
| `last_status_code = 200` | ✅ PASS |
| `last_status_code = 401` | 🔴 FAIL — 시크릿 불일치. 단, **경로 자체는 살아 있다는 증거** |
| `last_status_code = 404` | 🔴 FAIL — 라우트 없음 (배포 실패 의심 → Vercel 배포 상태 확인) |
| `last_status_code` 5xx / `last_error` 있음 | 🔴 FAIL — 핸들러 예외 |
| `last_status_code` NULL | ⚠ WARN — 응답 미도착. pg_net 이 비동기라 발사 직후면 정상. 잠시 후 재조회 |

## 🔴 판정 시 반드시 지킬 해석 규칙 (실사고 이력)

- **`SELECT public.fire_cron_endpoint('...')` 의 빈 결과를 실패로 읽지 말 것.**
  `RETURNS void` 라 빈 셀이 정상이고, pg_net 은 비동기라 그 시점엔 응답이 존재하지도 않는다.
  성패는 오직 `cron_endpoint_health` 로 읽는다. (CLAUDE.md `검증 원칙` 참조)
- **`alerted: false` 는 정상이다.** 이상이 없어서 메일을 안 보냈다는 뜻이지 감시자가
  죽었다는 뜻이 아니다. `reason: "healthy"` 를 같이 볼 것
- **`hours_since_last` 가 커도 그 자체로 장애가 아니다.** 발행 워크플로에 요일 게이트가
  걸려 있다 — `auto-publish` 는 일/화/목 23:00 + 월/수/금 05:00 UTC,
  `daily-brighteye-all-langs` 는 일·화·목 22:00 UTC, `auto-publish-overseas` 는 매일 06:00 UTC.
  요일을 먼저 맞춰볼 것 (Round 191 §4 실사고)
- **GitHub Actions 크론은 4~6시간 늦게 뜬다.** `'0 6 * * *'` 인 해외 발행이 실제로는
  10~12 UTC 에 시작한 이력이 있다. 예정 시각에 없다고 장애로 판정하지 말 것

## 최종 판정 요약

| 조건 | 판정 |
|------|------|
| `cron.job` 에 행 없음 / `active=false` | 🔴 FAIL — 등록·활성 문제 |
| `secret_set=false` | 🔴 FAIL — 시크릿 미주입 |
| `last_status_code <> 200` | 🔴 FAIL — 엔드포인트 응답 이상 |
| 최근 실행이 schedule 간격보다 오래됨 | ⚠ WARN — stale, 원인 조사 |
| 위 전부 통과 | ✅ PASS |

## 트리거 시점

- `cron_endpoints` 에 행을 추가하거나 수정한 직후 (**등록만 하고 검증 안 하는 게 Round 188 의 문**)
- "발행/감시가 안 도는 것 같다" 는 의심이 나왔을 때
- 신규 pg_cron 잡을 추가한 세션의 마무리 점검

## 도구 사용 가이드

- Supabase MCP `execute_sql` 로만 실행. **DDL·UPDATE 금지** — 이 커맨드는 진단 전용
- 시크릿 값 자체를 조회하지 말 것. `cron_endpoint_health` 는 설정 여부(boolean)만 노출하도록
  설계돼 있다 (Round 190 규칙). `SELECT * FROM cron_endpoints` 로 우회 조회 금지
- 정본 SQL: `db/supabase/round191_cron_endpoints.sql`
