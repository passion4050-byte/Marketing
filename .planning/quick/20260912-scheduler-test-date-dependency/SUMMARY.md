---
slug: scheduler-test-date-dependency
round: 202
created: 2026-09-12
status: complete
---

# Round 202 요약 — 테스트가 회귀를 못 잡던 세 가지 이유

## 한 일

1. **Round 201 의 오진 정정.** 실패 3건은 SQLite 스키마 드리프트가 아니었다.
   로그의 `sqlite3.OperationalError` 는 전부 `try/except` 에 잡히는 잡음이고,
   원인은 `scheduler.plan_a_skipped_today` 한 줄 — `publish_plan` 기본값 `'A'` +
   토요일이라 Round 83 요일 게이트에 걸렸다. **테스트가 월/수/금에만 통과했다.**
2. **세 번째 실패는 죽은 가드였다.** 타깃 경로 SQL 이 `purpose`·`content_eligible`·
   `experiment_arm` 을 한 쿼리로 읽는데 헬퍼가 `purpose` 만 ALTER 해서 쿼리 전체가
   예외 → `_ok_rows=[]` → 네이버 드레인 블록이 통째로 스킵. Round 183 을 잠그려던
   테스트가 드레인을 **한 번도 실행하지 않은 채** 실패하고 있었다.
3. **공허한 통과 1건도 같이 막았다.** `skips_when_disabled` 는 기대값이 `tenants=0`
   이라, 월/수/금이 아닌 날엔 enabled 게이트가 망가져도 요일 게이트가 대신 0 을
   만들어 초록불이 켜졌다.
4. **Round 201 회귀 테스트 신규 + 음성 검증.**

## 게이트 (실측)

| 항목 | 결과 |
|---|---|
| `pytest tests/test_scheduler.py` | **13 passed** (이전 9 passed / 3 failed) |
| 신규 테스트 음성 검증 (`bebb124` 코드로 되돌림) | **1 failed** — 해외 키워드가 섞여 실패 |
| 복원 확인 | `RESTORED marker_count=2` |

음성 검증 실패 메시지:
```
AssertionError: assert {'gangnam skin clinic', ..., '红大皮肤科推荐', '강남 리쥬란'}
                    == {'강남 리쥬란'}
```
수정 전 6슬롯이 풀을 한 바퀴 돌아 해외 5건이 전부 나왔다 — 설계대로 날짜 무관하게 잡힌다.

## 이 라운드가 건드리지 않은 것

`src/collector/scheduler.py` 는 **무변경**이다(Round 201 커밋 그대로). 테스트와 문서만 바뀌었다.

## 남은 것

- Round 201 런타임 실적: 2026-09-14 08:00 KST ko 발사분에서 판정 2종
- `PERPLEXITY_API_KEY` 시크릿 등록 (사용자 조치, `gh secret list` 23건에 없음을 확인)
