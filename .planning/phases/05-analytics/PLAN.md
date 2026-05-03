# Phase 5: Analytics 강화 (MVP-1)

**Goal**: Mention v2(가중치 + 추천 강도 + 부정 컨텍스트) + Analytics(visibility/trend/anomaly) + Streamlit 대시보드(시계열 + CI 음영 + 추세 + 이상치)가 동작한다.

**Status**: Planned
**Estimated**: 2~2.5일 — Plan 05-01 (~5h) + 05-02 (~5h) + 05-03 (~6h)
**Depends on**: Phase 4 (Query/Response/Mention 모델, Collector, Mention v1)
**Requirements**: MEN-02, MEN-03, MEN-04, ANA-01, ANA-02, ANA-03, UI-03

---

## Context

### Phase 4 까지 보유한 것 (재사용)
- **Mention v1**: `src/parser/mentions.py:extract_mentions` — 어절 boundary + position + snippet
- **Query/Response/Mention 모델**: Phase 4 에서 생성. weight 컬럼 이미 존재 (v1=1.0 고정), sentiment=null
- **Collector**: 매 sample 마다 Mention INSERT. v2 weight 계산을 extract_mentions 가 채우면 Collector 변경 0
- **측정 탭 (📡)**: 키워드 등록 + 결과 카드. 시계열 그래프는 본 phase 에서 추가
- **structlog JSON**: analytics 함수 호출 시 응답 시간/샘플 수 로깅 활용

### Phase 5 의 정확한 Delta
| 영역 | 현재 (Phase 4) | Phase 5 목표 |
|---|---|---|
| **Mention weight** | 1.0 고정 | `position_score × strength_score` (0~1 실수) |
| **추천 강도** | 미구현 | 매치 위치 ± 어절 윈도우에 추천 동사 인접 → strength=1.0/0.7/0.3 |
| **부정 컨텍스트** | `is_negative=False` 고정 | 부정 단어/조사 인접 시 True |
| **mention_share** | 없음 | `{n, share, ci_95, weighted_share, weighted_ci_95}` Wilson |
| **추세 검정** | 없음 | `pymannkendall` 적용, p_value/tau/significant |
| **이상치** | 없음 | 이동평균 ± 2σ 윈도우 검사 |
| **대시보드 시계열** | 없음 | Streamlit `st.line_chart` + Altair CI 음영 + 이상치 배너 |

### 핵심 결정 (decisions)

**1. Mention v2 — 단어 단위가 아닌 응답 단위 weight 도 고려**
- 정의서 §4.3 weight 공식 그대로:
  - `position_score = 1.0 - (position / total_length) × 0.5` → 응답 앞쪽에 등장하면 1.0, 끝쪽 0.5
  - `strength_score = 1.0` if 추천/권장 동사가 매치 위치 ± 30자 이내
  - `strength_score = 0.7` if 단순 언급 (기본)
  - `strength_score = 0.3` if 비교 대상으로만 언급 (예: "vs 메디맵", "메디맵보다")
- v1 호환: 추가 인자 (`enable_v2=True`) 옵션. False 면 weight=1.0 유지

**2. 추천 동사 / 비교 / 부정 키워드 — yaml 룰북**
- `config/mention_signals.yaml` 신규
- 추천: ["추천", "권장", "권합니다", "추천합니다", "잘하는", "좋은", "신뢰할만한", ...]
- 비교: ["보다", "vs", "대비", "비해", "에 비해", ...]
- 부정: ["피하", "조심", "주의", "별로", "비추천", "후기 안 좋", ...]
- 한국어 형태소 분석은 사용 안 함 (Phase 6 예정) — 어절 + substring 매칭

**3. Wilson CI — scipy 없이 직접 구현**
- 표준 공식 (Newcombe 1998): `(p̂ + z²/2n ± z·sqrt(p̂(1-p̂)/n + z²/4n²)) / (1 + z²/n)`
- z = 1.96 (95%), 의존성 0 — 외부 패키지 미사용
- weighted CI 도 같은 공식, n 은 응답 수, 분자는 weighted sum / n

**4. Mann-Kendall — `pymannkendall` 사용**
- 정의서 명시 라이브러리
- `original_test()` 결과의 `trend` (increasing/decreasing/no trend), `p` (p-value), `Tau`
- 시점 7개 미만이면 `is_significant=False` + 경고 메시지

**5. 이상치 — 이동평균 ± 2σ**
- 윈도우 7 (일주일) 기본, env `ANOMALY_WINDOW`
- 마지막 N (기본 14) 시점에 대해 검사
- 이동평균 + std 양쪽 outside 면 이상치 마크

**6. 시계열 데이터 단위 — 일별 (UTC 기준 자정)**
- Query.requested_at 또는 Response.created_at 의 date()
- 데모용 demo seed: collector 가 며칠치 데이터를 생성하도록 도와주는 dev CLI
- 라이브 환경에서는 매일 02:00 KST scheduler 가 누적

**7. 신규 의존성 2개**
- `scipy>=1.13` (CLAUDE.md 에 이미 있다고 적혀있지만 미설치) — 옵셔널, Wilson CI 자체 구현이라 필수 아님
- `pymannkendall>=1.4` — Mann-Kendall 필수
- 정책: scipy 는 install 하지 않고 자체 구현, pymannkendall만 추가
- `altair` 는 streamlit 의존성으로 이미 설치됨 — CI 음영 그래프

**8. 대시보드 시계열 — Altair stack**
- Streamlit `st.altair_chart` — 단순 line + area chart 로 CI 음영 표현
- mention_share 시계열 + CI 음영 + 이상치 점 마크 + 추세 화살표 (`↑ p=0.04`)

---

## Plans

### Plan 05-01: Mention Extractor v2 + 시그널 룰북

**Goal**: extract_mentions 가 weight (0~1), is_negative, recommendation_strength 를 계산해 ExtractedMention 에 채우고, Collector 가 Mention.weight / Mention.sentiment 에 정확히 저장한다.

**Requirements**: MEN-02, MEN-03, MEN-04

**Tasks**:

- [ ] **T1.1: 시그널 룰북 yaml**
  - `config/mention_signals.yaml` 신규
  - `recommendation: [...]`, `comparison: [...]`, `negative: [...]`
  - 각 카테고리에 한국어 키워드 10~20개
  - **Files**: `config/mention_signals.yaml`

- [ ] **T1.2: 룰북 로더**
  - `src/parser/signals.py` 신규
  - `load_signals(path=None) -> MentionSignals`
  - `MentionSignals(recommendation, comparison, negative)` dataclass — frozenset 으로 빠른 lookup
  - 캐시 (모듈-레벨 1회 로드, 테스트는 reload 가능하게)
  - **Files**: `src/parser/signals.py`

- [ ] **T1.3: extract_mentions v2 로직**
  - `extract_mentions` 시그니처에 `enable_v2: bool = True` 추가
  - 매 매치 별:
    - `position_score`: 응답 앞쪽이면 1.0, 끝쪽이면 0.5
    - `strength_score`: 매치 ± 30자 윈도우에서 추천 → 1.0, 비교 → 0.3, 그 외 0.7
    - `weight = position_score × strength_score`, 소수 둘째자리 round
    - `is_negative`: 매치 ± 30자 윈도우에 negative 키워드 → True
  - `ExtractedMention.recommendation_strength: float` 필드 추가
  - v1 동작 보존: `enable_v2=False` 면 weight=1.0 / is_negative=False
  - **Files**: `src/parser/mentions.py`

- [ ] **T1.4: Collector 통합 — Mention.weight / sentiment 저장**
  - `src/collector/collect.py` — Mention INSERT 시 `weight=em.weight, sentiment="negative" if em.is_negative else None`
  - sentiment 컬럼은 Phase 6 까지 v1 placeholder ("negative" or null) — 본격 NLP sentiment 는 Phase 6
  - **Files**: `src/collector/collect.py`

- [ ] **T1.5: pytest test_mention_extractor_v2 + test_signals**
  - 추천 동사 인접 → strength=1.0
  - 비교 표현 → strength=0.3
  - 부정 컨텍스트 → is_negative=True
  - position_score: 앞 1.0, 뒤 0.5
  - 결합: weight = position × strength 검증
  - signals.yaml 로딩 + 캐시
  - **Files**: `tests/test_mention_v2.py`, `tests/test_signals.py`

**Verification (Plan 05-01 합격)**:
- pytest 신규 8+ 통과
- 회귀: 기존 `test_mention_extractor.py` 14건 모두 통과 (`enable_v2=True` 기본 — weight 가 0~1 실수가 되니 v1 테스트의 `weight=1.0` 단언은 유지하되 명시적 enable_v2=False 케이스 1건 추가)
- collector 테스트: 적어도 1개 sample 의 Mention.weight ∈ (0, 1] 검증

---

### Plan 05-02: Analytics 모듈 (visibility / trend / anomaly)

**Goal**: 함수 3개 (`mention_share`, `detect_trend`, `detect_anomalies`) 가 SQLite 데이터로부터 통계량을 계산해 dict 로 반환한다.

**Requirements**: ANA-01, ANA-02, ANA-03

**Tasks**:

- [ ] **T2.1: src/analytics/__init__.py + visibility.py**
  - `mention_share(session, tenant_id, keyword_id, *, since=None, until=None) -> dict`
  - 반환: `{n, target_count, share, ci_95, weighted_share, weighted_ci_95, by_brand}`
  - `n` = 해당 키워드의 Response 수, `target_count` = is_target Mention 응답 수 (response 단위 dedupe)
  - `share = target_count / n`
  - `ci_95` = Wilson 95% CI (Newcombe 1998 공식, scipy 없이 직접 구현)
  - `weighted_share = Σ(target weight) / n` (response 단위 max weight)
  - `by_brand = {brand: count}` 내림차순
  - **Files**: `src/analytics/__init__.py`, `src/analytics/visibility.py`

- [ ] **T2.2: src/analytics/trend.py**
  - `detect_trend(time_series: list[float], min_points=7) -> dict`
  - 반환: `{trend, p_value, tau, is_significant, n_points}`
  - pymannkendall.original_test 사용 — n_points < min_points 면 trend="insufficient_data"
  - is_significant = (p_value < 0.05) and (n_points >= min_points)
  - **Files**: `src/analytics/trend.py`

- [ ] **T2.3: src/analytics/anomaly.py**
  - `detect_anomalies(time_series: list[float], window=7, sigma_factor=2.0, last_n=14) -> list[AnomalyPoint]`
  - 반환 dataclass: `AnomalyPoint(index, value, mean, std, direction)` direction = "high" | "low"
  - 각 시점에서 직전 window 일 평균 ± sigma_factor × std 벗어나면 이상치
  - **Files**: `src/analytics/anomaly.py`

- [ ] **T2.4: 시계열 빌더 — DB → daily series**
  - `src/analytics/series.py` 신규
  - `daily_mention_share_series(session, tenant_id, keyword_id, *, days=30) -> list[(date, share, weighted_share, n)]`
  - SQL 그룹: Query.requested_at::date 별 응답 수 + target 멘션 수 + weighted sum
  - 데이터 0 인 날도 0.0 으로 fill (np.nan 방지)
  - **Files**: `src/analytics/series.py`

- [ ] **T2.5: 의존성 — pymannkendall**
  - `pyproject.toml` + `requirements.txt` 에 `pymannkendall>=1.4` 추가
  - scipy 는 추가 안 함 (Wilson 자체 구현)
  - **Files**: `pyproject.toml`, `requirements.txt`

- [ ] **T2.6: pytest test_visibility + test_trend + test_anomaly**
  - mention_share: n=10 / target=4 / weighted=3.5 → share=0.4, weighted=0.35, ci_95 검증 (Wilson 공식 hand-calc 와 일치)
  - tenant 격리: 다른 tenant 의 mention 미포함
  - detect_trend: 명백한 증가 시계열 → trend="increasing", is_significant=True; 평탄 → "no trend"
  - detect_anomalies: 이상치 1건 시뮬레이션 → 마크
  - 시계열 빌더: 빈 키워드 → 0 fill 30일
  - **Files**: `tests/test_visibility.py`, `tests/test_trend.py`, `tests/test_anomaly.py`

**Verification (Plan 05-02 합격)**:
- pytest 신규 10+ 통과
- mention_share() 에 hand-calc 한 시나리오를 넣어 ci_95 정확성 검증
- 의존성 설치 후 `import pymannkendall` 정상

---

### Plan 05-03: Streamlit 대시보드 (시계열 + CI + 추세 + 이상치)

**Goal**: 측정 탭이 키워드 시계열을 보여주며, CI 음영 + 이상치 마크 + 추세 화살표가 한 화면에 노출된다.

**Requirements**: UI-03

**Tasks**:

- [ ] **T3.1: 측정 탭 시계열 섹션 추가**
  - `src/dashboard/measurement_tab.py` 에 "📈 키워드별 시계열" 섹션
  - 키워드 선택 dropdown (current tenant)
  - 시계열 30일 → Altair line chart, Y 축 = mention_share
  - CI 음영: `area_chart` 로 lower/upper CI band
  - **Files**: `src/dashboard/measurement_tab.py`

- [ ] **T3.2: 추세 + 이상치 표시**
  - 시계열 위 헤더에:
    - 추세 chip: `↑ 증가 (p=0.03)` / `→ 변화없음` / `↓ 감소 (p=0.01)`
    - 이상치 chip: `⚠️ 이상치 N건 (최근 7일)` 또는 `✓ 정상`
  - 이상치 점은 차트에 빨간 dot 으로 overlay
  - **Files**: `src/dashboard/measurement_tab.py`

- [ ] **T3.3: 메디맵 데모용 시드 CLI (선택)**
  - `scripts/seed_measurement_demo.py` — 1개 키워드에 14일치 더미 Query/Response/Mention 시드
  - 시뮬레이션 패턴: 7일 안정 → 7일 증가 (Mann-Kendall significant 시연용)
  - StubEngine 응답 그대로 재활용
  - **Files**: `scripts/seed_measurement_demo.py`

- [ ] **T3.4: pytest test_dashboard_smoke (rendering)**
  - measurement_tab import + render 호출 (Streamlit 모킹은 어려우니 헤더 함수만 단위 테스트)
  - daily_mention_share_series + detect_trend + detect_anomalies 함수 통합 e2e
  - **Files**: `tests/test_analytics_e2e.py`

- [ ] **T3.5: README 갱신**
  - `## 측정 + Analytics (Phase 4-5)` 섹션 추가
  - 측정 탭 사용법, scheduler 동작, 추세 해석 가이드, 시드 CLI 사용법
  - **Files**: `README.md`

**Verification (Plan 05-03 합격)**:
- pytest 신규 3+ 통과
- 라이브 측정 탭에서 데모 시드 후: 시계열 + CI + 이상치 + 추세 화살표 모두 노출
- README 에 Phase 5 가이드 1 섹션 추가

---

## Out of Scope (Phase 5 에서 안 하는 것)

- **OpenAI/Gemini/Claude 검색 엔진** — Phase 6
- **NER 기반 Competitor Discovery** — Phase 6 (`kiwipiepy`)
- **본격 Sentiment 분석** — Phase 6 (Phase 5 의 negative flag 는 룰베이스 v1)
- **포맷별 export (PDF/Excel)** — Phase 7+
- **알림/이메일 통보** — Phase 7+
- **A/B 테스트 프레임워크** — Phase 7+

---

## Verification (Phase 5 종료 조건 — 정의서 §7 MVP-1)

- [ ] 2주 연속 측정 후 Mann-Kendall 추세 검정 출력 (시드 CLI 로 데모 가능)
- [ ] Wilson CI + Weighted Mention Share 둘 다 `mention_share()` 반환에 포함
- [ ] Streamlit 대시보드: 시계열 + CI 음영 + 이상치 배너 + 추세 chip 한 화면에 노출
- [ ] 멘션 추출 수동 검수 정확도 ≥ 80% (시드 데이터 기준 테스트)
- [ ] 신규 pytest 21+ 통과 (T1: 8, T2: 10, T3: 3)
- [ ] 회귀 0 (147 → 168+)
