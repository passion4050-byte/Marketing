---
slug: cron-health-null-fix
round: 192
created: 2026-09-08
status: complete
---

# Round 192 — `cron_endpoint_health` 가 반나절 뒤엔 항상 `null` 을 돌려준다

## 증상 (2026-09-08 01:11 UTC 실측)

```
last_fired_at    = 2026-09-07 09:00:00Z   ← 쐈다는 사실은 남음
last_status_code = null
last_response    = null
last_error       = null
net._http_response 총 행수 = 1 (최신 00:04)
```

## 원인 (확정)

`pg_net.ttl = 6 hours`. `cron_endpoint_health` 는 `LEFT JOIN net._http_response`
인데, 감시자 발사 간격은 `0 2,9 * * *` = **7시간**이다.
→ 다음 발사 시점엔 직전 응답이 이미 삭제돼 있다. **구조적으로 100% 놓친다.**
우연히 6시간 안에 조회했을 때만 값이 보인다 (Round 191b 의 실측이 그 경우였다).

`null` 은 실패(401 등)와 구분되지 않으므로, 진짜 장애를 놓치거나 정상을 장애로 오판한다.
Round 187/191b 의 *"쐈다는 것만 알고 됐는지는 아무도 모른다"* 가 시간지연 형태로 재발한 것.

## 조치

1. `cron_endpoints` 에 **영속 스냅샷 컬럼** — `last_status_code` · `last_response`
   · `last_error` · `last_checked_at`. TTL 과 무관하게 남는다.
2. **`cron_endpoint_runs` 이력 테이블** — 발사마다 1행. 이게 있어야 "쐈다/됐다" 를 넘어
   **가동률**이 나온다 (Round 191 §2 의 "배치는 분포를 봐야 한다"와 같은 결).
3. **`harvest_cron_endpoint_responses()`** — TTL 안에 응답을 수확해 1·2에 적재.
   `*/15 * * * *` 스케줄. 6시간 넘게 응답이 안 잡힌 행은 `expired` 로 확정 표기해
   영원히 pending 으로 남지 않게 한다.
4. `fire_cron_endpoint` — 발사 시 이력 행을 먼저 INSERT (응답이 영영 안 와도 발사는 남는다).
5. 뷰 재작성 — 스냅샷 기반 + `harvest_pending` + 최근 7일 가동률.
6. 로그 팽창 방지 — harvest 가 `cron_endpoint_runs` 90일 / `cron.job_run_details` 30일 정리.

## 검증

- 마이그레이션 후 `fire_cron_endpoint` 수동 발사 → harvest 수동 실행 → `last_status_code=200` 실측
- 다음 자동 발사(02:00 UTC) 이후 `harvest_pending=false` + `runs_7d` 증가 확인

## 파일

- `db/supabase/round192_cron_endpoint_harvest.sql` (정본, 신규)
- `db/supabase/round191_cron_endpoints.sql` (경고 주석 추가 — 이 뷰는 192 가 대체)
