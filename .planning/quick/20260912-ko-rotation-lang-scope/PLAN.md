---
slug: ko-rotation-lang-scope
round: 201
created: 2026-09-12
status: complete
---

# Round 201 — ko 굶김 1순위 슬롯을 중국어 글이 가져갔다

Round 200 이 고친 것은 **정렬**이었다. 정렬은 실제로 고쳐졌다. 그런데 발행은 안 나갔다.

## 검증 결과 — 판정 1 PASS · 판정 2 FAIL

Round 200 세션랩이 지정한 1순위 검증(2026-09-11 00:50 UTC 발사분, run `34548188930`):

```
scheduler.starvation_sort   lang_only=None market_only=None
                            order=[18, 6, 20, 8, 12, 4, 5, 21, 15, 9, 16, 19]
scheduler.rotation_selected  rotated_today=[12, 18, 6, 20, 8, 12] self_tenants=[12]
```

판정 1 ✅ 첫 항목 = **18(포레나의원)**. R200 의 ko 스코프 정렬이 런타임에서 동작했다.
(부수 확인: `self_tenants=[12]` — Round 193 의 ORM 매핑 수정도 살아 있다. 이전엔 항상 `[]`)

판정 2 ❌ **포레나의원 ko 발행은 안 나갔다.**

```sql
tenant 18  ko 마지막 발행 = 2026-08-27   (16일째 0)
tenant  6  ko 마지막 발행 = 2026-09-04
tenant  8/20/12/4  → 09-11 발행됨
```

## 원인 — 정렬은 ko 로 좁혔는데 키워드 풀은 안 좁혔다

같은 run 의 키워드 픽:

```
t12  의료기관 디지털 마케팅 도구      ko
t18  红大皮肤科推荐                  zh-Hans   ← ko 굶김 1순위 슬롯
t6   江南童妍針推薦                  zh-Hant   ← ko 굶김 2순위 슬롯
t20  무릎 스포츠재활 기간은…          ko
t8   성장클리닉 한약…                ko
t4   스마일라식 재수술…              ko
```

`daily_auto_content_job` 에서 `lang_only`/`market_only` 가 없을 때:
- 정렬(R200, L471~485): `AND COALESCE(lang,'ko') = 'ko'` — **ko 로 좁힘**
- 키워드 풀(L682~705): `market_only is None` 이면 **필터 없음** — 해외 키워드가 그대로 들어온다

즉 **"ko 로 굶었으니 1순위" 로 뽑아놓고 그 슬롯에 중국어 글을 쓴다.** 굶김은 그대로 남고
다음 실행에서 또 1순위가 된다. CLAUDE.md 의 *"발행 대상 선택 규칙은 두 경로 모두에"* 가
이번엔 **정렬 축과 풀 축 사이**에서 깨진 형태다.

## 이 수정이 해외 커버리지를 줄이지 않는다 (실측)

해외는 전용 배치가 매일 따로 돈다 — `auto-publish-overseas.yml`(`0 6 * * *`, `MARKET_ONLY=overseas`)
+ `daily-brighteye-all-langs.yml`(`LANG_ONLY` 언어별). 둘 다 범위 인자를 명시하므로 무영향.

최근 14일 실측 (tenant 18):

| lang | 발행 |
|---|---|
| zh-Hans | 8 |
| ja | 6 |
| en | 5 |
| zh-Hant | 4 |
| **ko** | **0** |

해외 23편 / ko 0편. ko 로테이션이 해외를 또 찍는 것은 중복 경로이고, 그 대가로 ko 가 굶는다.

일반 로테이션 4개 run 의 픽 23건 중 4건(17%)이 해외 키워드였다
(`34548188930` 2건 · `34297629241` 智宥诊所 · `34335352358` 弘大スキンブースター).

## 조치

`kw_rows` 컴프리헨션에 범위 기본값을 추가한다 — R200 정렬의 `else` 와 대칭:

```python
_rotation_domestic_only = lang_only is None and market_only is None
... and (not _rotation_domestic_only or (getattr(k, "lang", "ko") or "ko") == "ko")
```

축은 **lang** 으로 맞춘다(굶김 키와 동일 축이어야 슬롯이 알람을 해소한다).
실측으로 `keywords` 는 lang/market 이 1:1 로 짝지어져 있어(ko=domestic 474 · 해외 283,
엇갈린 조합 0건) 어느 축이든 결과는 같지만, 정렬 축과 일치시키는 쪽이 규칙이다.

## 게이트

- `python -m py_compile src/collector/scheduler.py` (이 PC 에 Python 이 있으면)
- 없으면 R200 대체 경로: 프로덕션 워크플로 import 태우기
- 런타임 실적 확인은 다음 ko 발사분(UTC 월 05:00 = 09-14 14:00 KST 또는 일 23:00)
