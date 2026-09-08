---
slug: cron-health-null-fix
round: 192
status: complete
completed: 2026-09-08
---

# Round 192 완료 — 판정 뷰 `null` 문제 해결

## 원인

`pg_net.ttl = 6 hours` < 감시자 발사 주기 7시간(`0 2,9 * * *`).
`cron_endpoint_health` 가 `LEFT JOIN net._http_response` 라 **직전 결과를 구조적으로 100% 놓쳤다.**
Round 191b 의 200 실측은 시크릿 주입 직후(TTL 안) 관측이라 우연히 보인 값이었다.

## 조치

| 대상 | 내용 |
|---|---|
| `cron_endpoints` | 영속 스냅샷 컬럼 4개 추가 |
| `cron_endpoint_runs` (신규) | 발사 이력 → 가동률 `ok_7d`/`runs_7d` |
| `harvest_cron_endpoint_responses()` (신규) | `*/15 * * * *` 독립 주기 수확 + 보관 정리 |
| `fire_cron_endpoint` | 발사 시 이력 INSERT + 즉시 수확 |
| `cron_endpoint_health` | 조인 제거, 스냅샷 기반 + `harvest_pending` |

마이그레이션: `round192_cron_endpoint_harvest`, `round192_fix_on_conflict_predicate`

## 실측 (2026-09-08 01:16 UTC)

```
last_status_code=200  harvest_pending=false  runs_7d=1  ok_7d=1
cron.job: 1=publish-watchdog '0 2,9 * * *', 2=cron-endpoint-harvest '*/15 * * * *' 둘 다 active
```

## 부수 발견 (→ Round 193)

수확한 첫 200 응답에 **묻혀 있던 실제 알람**: `starving: 포레나의원 11일`.
검증 결과 감시자가 정확했다 — 포레나의원(active/enabled)은 해외는 매일 도는데
**ko 만 08-27 이후 11일째 0**. ko 적격 키워드 17개가 남아 있으므로 소진이 아니라
**로테이션 선택 로직 문제**. 별건으로 조사 필요.

## 미검증

- 다음 자동 발사(02:00 UTC) 이후 `harvest_pending=false` 재확인 — 시간을 두고 한 번 더 볼 것
