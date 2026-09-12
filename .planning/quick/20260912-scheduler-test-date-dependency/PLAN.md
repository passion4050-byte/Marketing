---
slug: scheduler-test-date-dependency
round: 202
created: 2026-09-12
status: complete
---

# Round 202 — 정정: 테스트 3건은 스키마 드리프트가 아니라 요일 의존이었다

Round 201 은 `pytest tests/test_scheduler.py` 3건 실패를 "SQLite 테스트 스키마 드리프트"
로 기록했다. **틀렸다.** 베이스라인 비교(회귀 아님)는 맞았지만 원인 진단이 틀렸고,
그대로 두면 다음 사람이 sqlite 스키마를 뒤지게 된다.

## 실제 원인 — 로그를 보고서야 알았다

```
scheduler.plan_a_skipped_today  skipped_tenants=[1]
```

`tenants.publish_plan` 기본값은 `'A'`, Round 83 게이트는 plan A 를 **월/수/금 KST** 만
통과시킨다. 두 테스트는 tenant 에 plan 을 안 줘서 **주 4일(화·목·토·일) 실패**한다.
2026-09-12 는 토요일이었다. 내가 본 실패는 수정과 아무 상관이 없었다.

같은 파일 L259 에는 이미 같은 교훈이 적혀 있었다 —
`publish_plan='B' — 플랜 A 의 월/수/금 게이트에 테스트가 요일 의존하지 않게`.
나중에 쓴 테스트만 알고 있었고 오래된 두 개는 갱신되지 않았다.

`sqlite3.OperationalError` 경고들(`published_at`·`structure_type` 없음)은 전부
`try/except` 로 잡히는 잡음이었다. **눈에 띄는 에러를 원인으로 착각했다.**

## 세 번째 실패는 다른 것이었다 — 그리고 더 나쁘다

`test_naver_demand_drain_applies_to_target_path` 는 이미 `publish_plan='B'` 를 주는데도
실패했다. 기대 `모발이식 탈락기`, 실제 `라식`.

타깃 경로의 `_ok_rows` SQL 은 `purpose`·`content_eligible`·`experiment_arm` 을
**한 쿼리로** 읽는다. 테스트 스키마 헬퍼는 `purpose` 만 ALTER 했다.
→ 쿼리 전체가 예외 → `except: _ok_rows = []` → `if _ok_rows:` 안에 들어 있는
**네이버 드레인 블록이 통째로 건너뛰어진다.**

즉 Round 183 을 잠그려고 만든 테스트가 **드레인을 한 번도 실행하지 않은 채** 실패하고
있었다. 컬럼 하나가 빠져 가드가 조용히 죽는 것 — CLAUDE.md 의 "ORM 미매핑 컬럼 =
조용히 죽는 가드" 와 정확히 같은 꼴이고, 이번엔 테스트 쪽에서 일어났다.

## 조치

1. `tests/test_scheduler.py` 두 테스트에 `publish_plan="B"` — 요일 비의존화
2. `_create_naver_report_table` 헬퍼에 `ALTER TABLE keywords ADD COLUMN experiment_arm TEXT`
3. **Round 201 회귀 테스트 신규** — 범위 인자 없는 로테이션이 해외 키워드를 안 뽑는지
   - `daily_count` = 풀 크기(6) → 날짜 오프셋과 무관하게 판정
   - `tenant_products` 테이블을 만들어 해외 상품을 active 로 — 이게 없으면 `_publish_ok`
     가 해외를 전부 걸러 **공허한 통과**가 된다
   - 🔴 음성 검증: 수정 전 코드(`bebb124`)에서 이 테스트가 **실패**하는지 확인
4. R201 이 SKILL.md·CLAUDE.md 에 남긴 오진 문구 정정

## 게이트

- `pytest tests/test_scheduler.py` 전체 PASS
- 신규 테스트의 음성 검증(수정 전 코드에서 실패) — 통과해야 "이 테스트가 버그를 잡는다"
