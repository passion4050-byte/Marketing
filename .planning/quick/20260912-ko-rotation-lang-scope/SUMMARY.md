---
slug: ko-rotation-lang-scope
round: 201
created: 2026-09-12
status: complete
---

# Round 201 요약 — 정렬은 고쳤는데 슬롯을 다른 언어가 썼다

## 한 일

1. **R200 의 1순위 검증을 실제로 돌렸다** (세션랩이 지정한 판정 2종)
   - 판정 1 ✅ `starvation_sort order=[18, 6, ...]` — ko 스코프 정렬이 런타임에서 동작
   - 판정 2 ❌ 포레나의원 ko 발행 없음. 마지막 ko 발행 2026-08-27 (16일째 0)
2. **원인 확정**: `daily_auto_content_job` 의 키워드 풀에 범위 기본값이 없어, ko 굶김으로
   1순위가 된 tenant 가 그 슬롯에 해외 키워드를 발행했다 (t18 `红大皮肤科推荐` zh-Hans,
   t6 `江南童妍針推薦` zh-Hant).
3. **수정**: `lang_only`·`market_only` 둘 다 없으면 풀을 `lang='ko'` 로 좁힌다
   (`src/collector/scheduler.py`, R200 정렬 `else` 와 대칭).

## 게이트

| 게이트 | 결과 |
|---|---|
| `python -m py_compile src/collector/scheduler.py` | PASS (이 PC 는 Python 3.12.10 실재) |
| `pytest tests/test_scheduler.py` | 9 passed / 3 failed |
| 위 3건 **수정 전 베이스라인** | 동일하게 9 passed / 3 failed → **회귀 아님** |

🔴 베이스라인을 안 재고 "3건 실패" 만 봤으면 내 수정 탓으로 오판했을 것이다. 스택은
SQLite 테스트 스키마 드리프트다(`generated_contents.published_at`·`structure_type` 없음,
Postgres 전용 SQL 이 sqlite 에서 문법 오류). 별건으로 남긴다.

## 미검증 (정직하게)

**이 수정도 런타임에서 실행된 적이 없다.** 실적 확인은 다음 ko 발사분이다 —
`0 23 * * 0,2,4` 기준 **2026-09-13 23:00 UTC = 09-14 08:00 KST**.

판정 2종(R200 과 동일한 방식):
1. 그 run 의 픽에 **해외 키워드가 0건**인지 (`blog.structure_type keyword=` 라인 전수)
2. `generated_contents` 에서 tenant 18 의 ko 발행이 09-14 로 갱신되는지

안 나오면 다음 용의자는 순서대로: 키워드 상한(R155/R177) · `publish_plan`(R83) ·
`ROTATION_PARTNER_BATCH`.
