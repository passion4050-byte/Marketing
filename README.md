# GEO/AEO SaaS — 메디맵

AI 검색엔진(Perplexity / ChatGPT / Gemini / Claude)에서 의료 도메인 브랜드 노출을 측정하고, AI에 인용되도록 최적화된 콘텐츠를 자동 생성하는 멀티테넌트 SaaS.

🌐 **라이브 데모:** https://blogkey.streamlit.app (비공개 — 비밀번호 필요)

> 본 저장소는 **Phase 1 데모 슬라이스**가 동작하는 상태입니다 — 의료법 컴플라이언스 린터 + FAQ Schema.org JSON-LD 생성기. 풀스코프(MVP-0 ~ MVP-3)는 [`.planning/SPEC-v2.md`](.planning/SPEC-v2.md), 로드맵은 [`.planning/ROADMAP.md`](.planning/ROADMAP.md) 참조.

---

## Phase 1 — 무엇이 동작하는가?

```
키워드 + tenant 선택
       ↓
   LLM이 FAQ 5쌍 생성
       ↓
   의료법 린터로 검사
       ↓ (위반 시 LLM에게 위반 요약 전달 → 재호출, 최대 3회)
   Schema.org FAQPage JSON-LD 출력
       ↓
   사이트 <head>에 복사 붙여넣기
```

**키 0개로도 동작합니다.** Stub 프로바이더가 미리 작성된 의료법 안전 FAQ 5쌍을 반환합니다 — 메디맵 데모용으로 충분.

---

## 빠른 시작 (5분)

### 1. 의존성 설치

```bash
# 가상환경 권장
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -e .
```

> Python 3.14 사용 시 일부 패키지(pydantic 등)가 wheel을 빌드해야 할 수 있어 약간 시간이 걸릴 수 있습니다. 빌드 실패하면 Python 3.12로 다운그레이드 권장.

### 2. 환경변수 셋업

```bash
cp .env.example .env
```

기본값(`LLM_PROVIDER=stub`)이면 키 없이 그대로 진행 OK.

### 3. DB 초기화 + sample tenant 시드

```bash
python scripts/init_db.py
```

다음과 같이 출력됩니다:
```
[+] 스키마 생성 완료
[+] tenant 생성: BGN 밝은눈안과
[+] tenant 생성: 메디맵
[+] tenant 1 compliance 룰 9개 시드
[done] init_db OK
```

### 4. Streamlit 앱 실행

```bash
streamlit run src/dashboard/app.py
```

브라우저에서 자동으로 열립니다 (보통 `http://localhost:8501`).

1. 좌측에서 tenant 선택 (예: BGN 밝은눈안과)
2. 키워드 입력 (예: `강남 라식 잘하는 곳`)
3. `✨ 생성하기` 클릭
4. **JSON-LD (복사용)** 탭에서 코드 복사 → 자사 사이트 `<head>`에 붙여넣기

---

## 진짜 LLM으로 업그레이드 — Gemini Flash (무료)

Stub 모드는 항상 같은 FAQ를 반환합니다. 키워드별로 다른 FAQ를 받으려면:

1. https://aistudio.google.com/apikey 접속 (Google 계정)
2. **Create API key** → 무료 키 발급 (신용카드 불필요)
3. `.env` 수정:
   ```
   LLM_PROVIDER=gemini
   GOOGLE_API_KEY=발급받은키
   ```
4. Streamlit 재실행 (`Ctrl+C` 후 다시 `streamlit run ...`)

**Free tier 한도** (2026년 5월 기준): Gemini 2.5 Flash — 분당 15 RPM, 일 1500 RPD. 데모/테스트는 충분.

Anthropic Claude / OpenAI GPT를 쓰려면 동일하게 `.env`에서 `LLM_PROVIDER`를 `anthropic` 또는 `openai`로 바꾸고 해당 키 입력.

---

## 디렉토리 구조 (Phase 1 시점)

```
.
├── .planning/                # GSD 계획 산출물 (PROJECT/REQUIREMENTS/ROADMAP/SPEC-v2)
├── config/
│   ├── tenants.yaml          # Sample tenants
│   └── compliance_rules/
│       └── default.yaml      # 의료법 9개 기본 룰
├── data/                     # 로컬 DB (gitignored)
├── scripts/
│   └── init_db.py            # 스키마 생성 + 시드
├── src/
│   ├── compliance/
│   │   └── linter.py         # 의료법 린터
│   ├── content/
│   │   ├── generator.py      # 생성 + 자동수정 루프
│   │   ├── llm.py            # 멀티 프로바이더
│   │   └── templates/
│   │       └── schema_org.py # JSON-LD FAQPage
│   ├── dashboard/
│   │   └── app.py            # Streamlit UI
│   └── storage/
│       ├── db.py
│       └── models.py         # 멀티테넌트 데이터 모델
├── tests/
│   ├── test_linter.py
│   └── test_generator.py
├── .env.example
└── pyproject.toml
```

---

## 의료법 컴플라이언스 룰

`config/compliance_rules/default.yaml`에 **9개 기본 룰** — 절대표현, 최상급, 완치 약속, 통증제로, 환자 유인, 이벤트 종료일, 사전심의 키워드, 비교광고, 시술 전후.

추가/수정은 yaml 편집 후 `python scripts/init_db.py` 재실행.

> ⚠️ 본 룰셋은 **데모용**입니다. 운영 배포 전 의료광고 자율심의기구의 가이드라인 + 표시광고법 위반 사례를 반영해 보강하세요. 1차 출처는 [`.planning/SPEC-v2.md`](.planning/SPEC-v2.md) 부록 B.

---

## 테스트

```bash
pip install -e ".[dev]"
pytest
```

핵심 모듈:
- `tests/test_linter.py` — 9개 케이스 (룰 타입별, 위반 집계, position)
- `tests/test_generator.py` — 4개 케이스 (stub 통과, DB 영속화, 모르는 tenant, 린트 호출)

---

## 데이터베이스 마이그레이션 (Alembic — Phase 2 도입)

`scripts/init_db.py` 가 내부적으로 `alembic upgrade head` 를 호출하므로 평소엔 신경쓸 일 없음. 다음 케이스만 별도 절차:

### 기존 production SQLite 가 이미 있는 경우 (1회성 baseline 표식)

Phase 1.5 시점에 만들어진 `data/geo.db` 가 있다면 baseline 마이그레이션 적용 전에 한 번:

```bash
.venv/Scripts/alembic stamp head    # macOS/Linux: source .venv/bin/activate; alembic stamp head
```

이 절차로 기존 데이터(GeneratedContent 등) 손실 없이 alembic 이 "이미 head 상태" 로 인식. 이후엔 `alembic upgrade head` 만 호출.

### 신규 마이그레이션 작성

모델 변경 시:

```bash
.venv/Scripts/alembic revision --autogenerate -m "변경_설명"
.venv/Scripts/alembic upgrade head
```

빈 마이그레이션이 생성되면 production DB 가 이미 같은 스키마인 것 — 임시 빈 DB(`DATABASE_URL=sqlite:///./data/_tmp.db`)로 다시 autogenerate 해서 차이를 캡처.

### Streamlit Cloud 배포 시

`scripts/init_db.py` 호출 또는 부트스트랩에서 `alembic.command.upgrade(cfg, "head")` 가 자동 실행. Postgres(Supabase) 사용 시 `DATABASE_URL` secret 만 추가하면 동일 마이그레이션이 적용됨.

---

## 배포 (Streamlit Community Cloud)

이미 https://blogkey.streamlit.app 에 배포되어 있습니다. 본인 계정으로 새 인스턴스를 띄우려면:

1. **GitHub** — 이 리포를 fork (또는 본인 리포로 복제)
2. **Streamlit Cloud** — https://share.streamlit.io → `Create app` → 본인 리포 선택
   - Main file path: `src/dashboard/app.py`
   - Branch: `main`
3. **Secrets** (Advanced settings → Secrets):
   ```toml
   LLM_PROVIDER = "gemini"          # 또는 "stub"
   GOOGLE_API_KEY = "키"
   APP_PASSWORD = "데모비밀번호"
   ```
   템플릿: [`.streamlit/secrets.toml.example`](.streamlit/secrets.toml.example)
4. **Deploy** 클릭 → 2~3분 후 URL 발급

> 컨테이너 재시작 시 SQLite 가 휘발돼도 [`src/storage/seed.py`](src/storage/seed.py) 의 `seed_if_empty()` 가 매 부트마다 자동으로 sample tenants/rules 를 다시 채웁니다. 운영 데이터를 영속화하려면 `DATABASE_URL` secret 에 Postgres URL (예: Supabase) 를 추가하세요.

---

## Reference Library (RAG) — Phase 3

운영자가 인덱싱한 참고 자료(병원 안내문/원장 칼럼/의료 가이드 URL)를 LLM 컨텍스트로 자동 주입해 **사실 기반 콘텐츠**를 생성합니다. 동일 자료 중복 차단 + tenant 격리 + 발행물에 출처 doc_id 자동 기록.

### 인덱싱 — 2가지 경로

**A. Streamlit "📚 참고 자료" 탭**
- URL 입력 → Fetch + 본문 추출 → 청크 + 임베딩 → Chroma 저장
- 텍스트 직접 붙여넣기 → 같은 파이프라인
- 인덱스된 문서 목록에서 본문 일부 보기 / 삭제

**B. CLI**

```bash
# 단일 URL
python scripts/ingest_references.py --tenant 1 --url https://example.com/article

# 텍스트 파일 (.txt / .md)
python scripts/ingest_references.py --tenant 1 --file ./docs/clinic_intro.md

# 직접 텍스트
python scripts/ingest_references.py --tenant 1 --text "백내장은 …"

# URL 배치 — 한 줄에 한 URL
python scripts/ingest_references.py --tenant 1 --batch ./urls.txt

# 인덱스 상태 확인
python scripts/ingest_references.py --tenant 1 --list
```

### Embedding Provider 선택

`EMBEDDING_PROVIDER` 환경변수 (`.env` 또는 Streamlit Secrets):

| 값 | 모델 | dim | 키 필요 | 용도 |
|---|---|---|---|---|
| `stub` (기본) | hash 기반 결정론 | 128 | 없음 | 데모 / 단위 테스트 / 무키 fallback |
| `gemini` | text-embedding-004 | 768 | `GOOGLE_API_KEY` | 무료 tier 권장 |
| `openai` | text-embedding-3-small | 1536 | `OPENAI_API_KEY` | 정의서 표준 |

> Stub 임베딩은 의미 유사도가 약합니다. 실제 검색 품질을 보려면 `gemini` 이상 권장.

### 발행 시 RAG 사용

통합 발행 탭의 "옵션" 펼침 → **📚 참고 자료(RAG) 사용** 체크박스 (기본 ON, k=5).

- 활성: 키워드 → 인덱싱된 청크 top-k 가 LLM system prompt 에 자동 주입
- 발행 결과 카드에 `📎 출처 N건` 칩 + `cited_reference_ids` doc_id 리스트 노출
- 통합 탭 외 4개 generator 함수 (`generate_faq_content`, `generate_blog_post`, `generate_naver_blog_content`, `generate_instagram_content`) 모두 `use_rag=True, rag_k=5` 파라미터 지원

발행물 DB 저장 시 `GeneratedContent.cited_reference_ids` JSON 컬럼에 인용된 `ReferenceDocument.id` 리스트가 자동 기록됩니다.

### 영속성 한계

- Chroma persistent dir: `./data/chroma/` (gitignored)
- Streamlit Cloud 컨테이너 재시작 시 휘발 — SQLite 와 동일한 한계
- 영구 보존 필요 시 Phase 4+ 에서 Supabase **pgvector** 등 외부 vector DB 로 마이그레이션
- DB 의 `ReferenceDocument` 메타 (제목/원문/hash) 는 `DATABASE_URL` 에 Postgres 연결 시 영속

---

## 측정 + Analytics (Phase 4-5)

AI 검색 엔진(Perplexity 등)에서 키워드별 브랜드 멘션 추이를 측정 + 통계 분석. 의료법 콘텐츠 발행이 "브랜드 인용도"를 어떻게 움직이는지 평가.

### 사용 흐름

1. **📡 측정 탭** 진입 → 키워드 등록 (예: "강남 라식 잘하는 곳") + 타겟 브랜드
2. **▶️ 수집** 버튼 → StubEngine 으로 n=10 즉시 데모 (`PERPLEXITY_API_KEY` 설정 시 실 호출)
3. **📈 키워드별 시계열** 섹션 → 30일 mention share + Wilson 95% CI 음영 + 추세 chip + 이상치 마크
4. APScheduler 가 매일 02:00 KST 자동 수집 (Streamlit Cloud 컨테이너 안 동작)

### 통계 함수

| 함수 | 반환 | 용도 |
|---|---|---|
| `mention_share()` | `{n, share, ci_95, weighted_share, weighted_ci_95, by_brand}` | 누적 점유율 + Wilson CI |
| `detect_trend()` | `{trend, p_value, tau, is_significant, n_points}` | Mann-Kendall 추세 검정 (pymannkendall) |
| `detect_anomalies()` | `[AnomalyPoint]` (이동평균 ± 2σ) | 시계열 이상치 탐지 |
| `daily_mention_share_series()` | `[DailyShare]` | DB → 일별 시계열 (누락 날짜 0 fill) |

### Mention Extractor v1 → v2

- **v1 (Phase 4)**: 정규화 + 한글 어절 boundary + 위치 추적. weight=1.0 고정.
- **v2 (Phase 5)**: `weight = position_score × strength_score` (0~1)
  - position: 응답 앞쪽 1.0, 끝쪽 0.5
  - strength: 매치 ± 30자에 추천 동사 인접 → 1.0, 비교 표현 → 0.3, 그 외 → 0.7
  - is_negative: 부정 컨텍스트 자동 감지
- 시그널 키워드는 `config/mention_signals.yaml` 에서 카테고리(추천/비교/부정)별 편집 가능

### 데모 시드 CLI

`pymannkendall` 추세 검정이 동작하려면 7일 이상의 시계열이 필요. 즉시 시연하려면:

```bash
python scripts/seed_measurement_demo.py --tenant 1 --keyword "강남 라식 잘하는 곳"
```

→ 14일치 더미 Query/Response/Mention 생성 (7일 안정 → 7일 증가 패턴, Mann-Kendall significant 보장).

### 추세 해석 가이드

| Chip | 의미 | 해석 |
|---|---|---|
| ↑ 증가 (p<0.05) | 통계적 유의 증가 | 콘텐츠 발행 효과 + |
| ↓ 감소 (p<0.05) | 통계적 유의 감소 | 경쟁사 대응 또는 자료 노후 |
| → 변화 없음 | tau≈0 | 시간 더 필요 또는 효과 없음 |
| ⏳ 데이터 부족 | n<7 | 7일 이상 누적 필요 |
| ⚠️ 이상치 N건 | 직전 7일 평균 ± 2σ 벗어남 | 외부 이벤트(보도/리뷰) 확인 |

### 환경변수

| 변수 | 기본 | 설명 |
|---|---|---|
| `ENGINE_PROVIDER` | `stub` | `stub` \| `perplexity` |
| `PERPLEXITY_API_KEY` | — | Perplexity 사용 시 필수 |
| `PERPLEXITY_MODEL` | `llama-3.1-sonar-small-128k-online` | Perplexity 모델 |
| `MAX_DAILY_USD` | `5.0` | LLM/측정 USD 한도 |
| `MEASUREMENT_CRON_HOUR` | `2` | 자동 수집 시각 (KST) |
| `ANOMALY_WINDOW` | `7` | 이상치 윈도우 (일) |
| `ANOMALY_SIGMA` | `2.0` | 이상치 임계 (σ) |

---

## 다음 단계 (Roadmap)

상세는 [`.planning/ROADMAP.md`](.planning/ROADMAP.md).

- ✅ **Phase 2** — 4채널 템플릿(Schema.org / Blog / 네이버 / Instagram) + 자동수정 + 비용 가드레일
- ✅ **Phase 3** — Reference Library (RAG) — URL 인덱싱 → tenant 격리 검색 → 사실 기반 콘텐츠 + 출처 기록
- ✅ **Phase 4** — Measurement Foundation (MVP-0) — Engine 추상화 + Perplexity + n=30 비동기 수집 + Mention v1
- ✅ **Phase 5** — Analytics 강화 (MVP-1) — Mention v2(가중치/sentiment) + Wilson CI + Mann-Kendall + 이상치 + 시계열 대시보드
- **Phase 6** — 4엔진 동시 + Competitor Discovery (NER) + Sentiment

---

## 명시적 비목표

- ❌ **외부 채널 자동 게시** (네이버 블로그/티스토리/인스타) — 플랫폼 ToS 위반 + 봇 차단 + 의료법 리스크
- ❌ **AI 엔진 학습 데이터 직접 주입** — 기술적으로 불가능
- ❌ **의료광고 사전심의 대행** — 자율심의기구의 외부 절차
- ❌ **Fine-tuning** — RAG로 충분

자세한 제약은 [`.planning/PROJECT.md`](.planning/PROJECT.md) Out of Scope 참조.
