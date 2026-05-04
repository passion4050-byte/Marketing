# GEO/AEO SaaS — 기능 정의서 v2 (Source of Truth)

> 사용자가 제공한 원본 기획서. PROJECT.md / REQUIREMENTS.md / ROADMAP.md / 각 phase PLAN.md는 이 문서를 출발점으로 한다.
>
> 변경 시: 사용자 승인 → 이 파일 업데이트 → 영향받는 .planning 문서 동기화.

---

## v1 대비 변경점 (v2)

- 멀티테넌트 데이터 모델 사전 반영 (tenant_id)
- Reference Library (RAG) 모듈 추가
- Compliance Engine (의료법 가이드 린터) 모듈 추가
- Content Generator (채널별 복사용 출력) 모듈 추가
- Competitor Discovery 모듈 추가
- Analytics 통계 검정 강화

---

## 0. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      사용자 (메디맵 운영자)                    │
└────────┬────────────────────────────────────────┬───────────┘
         │                                        │
         ▼                                        ▼
┌──────────────────┐                    ┌──────────────────────┐
│ Reference Library│                    │ Compliance Engine    │
│ (RAG 인덱스)     │                    │ (의료법 가이드 린터) │
│ URL/문서 → Chroma│                    │ 금지어/권장 표현      │
└────────┬─────────┘                    └─────────┬────────────┘
         │                                        │
         └────────────┬───────────────────────────┘
                      ▼
         ┌──────────────────────────┐
         │   Content Generator      │
         │   채널별 템플릿 출력      │
         │  (Schema.org / Blog /    │
         │   네이버 / Instagram)    │
         └────────────┬─────────────┘
                      │
                      ▼
              [사용자가 복사 → 수동 배포]
                      │
         ┌────────────┴───────────┐
         ▼                        ▼
   AI 검색엔진 인덱싱          기존 SEO/SNS

         ▲
         │ (간접 영향)
         │
┌────────┴───────────────────────┐
│   Monitoring Agent (수집)      │
│  Perplexity / OpenAI / Gemini  │
│  / Claude   ×  n=30 샘플       │
└────────┬───────────────────────┘
         ▼
┌────────────────────────────────┐
│   Analytics                    │
│   - Mention Share + CI         │
│   - 통계 검정 (추세/이상치)    │
│   - Competitor Discovery       │
└────────┬───────────────────────┘
         ▼
   Streamlit Dashboard
```

---

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 언어 | Python 3.11+ | |
| LLM SDK | `openai`, `anthropic`, `google-genai`, Perplexity REST | Phase 6.5: `google-generativeai` (deprecated) → `google-genai` 1.0+ 마이그레이션 완료 |
| Embedding | `text-embedding-3-small` (OpenAI) | 한국어 성능 OK, 비용 저렴 |
| Vector DB | `chromadb` (로컬 파일) | MVP는 가벼움. 운영은 Qdrant 고려 |
| Web Crawling | `httpx` + `trafilatura` | URL → 본문 추출 |
| DB | SQLite → PostgreSQL | tenant_id 컬럼은 처음부터 |
| 작업 스케줄러 | APScheduler → Celery+Redis | |
| 대시보드 | Streamlit → React+FastAPI | |
| 통계 | `scipy.stats`, `pymannkendall` | 추세 검정 |
| NER (한국어) | `kiwipiepy` + 룰 베이스 | 병원명/시술명 추출 |
| 환경 변수 | `python-dotenv` | |
| 로깅 | `structlog` | |
| 테스트 | `pytest` | |

---

## 2. 폴더 구조

```
geo-saas/
├── .env.example
├── pyproject.toml
├── README.md
├── config/
│   ├── tenants.yaml             # 고객사 정의 (멀티테넌트 대비)
│   ├── keywords.yaml
│   └── compliance_rules/        # 의료법 가이드 (테넌트별)
│       └── default.yaml
├── data/
│   ├── geo.db                   # SQLite
│   └── chroma/                  # Vector DB
├── src/
│   ├── engines/                 # LLM 엔진 (MVP-0,2)
│   │   ├── base.py
│   │   ├── perplexity.py
│   │   ├── openai_engine.py
│   │   ├── gemini.py
│   │   └── claude.py
│   ├── collector/               # 수집 (MVP-0)
│   │   ├── runner.py
│   │   └── scheduler.py
│   ├── parser/                  # 멘션 추출 (MVP-0,2)
│   │   ├── mention_extractor.py
│   │   ├── ner.py
│   │   └── url_extractor.py
│   ├── storage/
│   │   ├── models.py            # tenant_id 포함
│   │   └── repository.py
│   ├── analytics/               # 분석 (MVP-1)
│   │   ├── visibility.py
│   │   ├── confidence.py
│   │   ├── trend.py             # Mann-Kendall 추세 검정
│   │   ├── anomaly.py           # 이상치 탐지
│   │   └── competitor.py        # 경쟁사 발견
│   ├── reference/               # MVP-3 (RAG)
│   │   ├── crawler.py
│   │   ├── chunker.py
│   │   ├── embedder.py
│   │   ├── store.py
│   │   └── retriever.py
│   ├── compliance/              # MVP-3 (의료법 린터)
│   │   ├── rules_loader.py
│   │   ├── linter.py
│   │   └── reporter.py
│   ├── content/                 # MVP-3 (콘텐츠 생성)
│   │   ├── generator.py
│   │   ├── templates/
│   │   │   ├── schema_org.py
│   │   │   ├── blog_html.py
│   │   │   ├── naver_blog.py
│   │   │   └── instagram.py
│   │   └── exporter.py
│   └── dashboard/
│       └── app.py               # Streamlit
├── scripts/
│   ├── init_db.py
│   ├── run_collection.py
│   ├── ingest_references.py
│   └── generate_content.py
└── tests/
```

---

## 3. 데이터 모델 (멀티테넌트 사전 반영)

```python
# src/storage/models.py

class Tenant(Base):
    __tablename__ = "tenants"
    id: int (PK)
    name: str                    # ex: "BGN 밝은눈안과"
    domain_category: str         # ex: "안과/시력교정"
    region: str                  # ex: "서울 강남"
    business_model: str          # 자유 텍스트. 동종업계 매칭에 사용
    created_at: datetime

class Keyword(Base):
    __tablename__ = "keywords"
    id: int (PK)
    tenant_id: int (FK)
    text: str
    category: str
    target_brand: str
    is_active: bool

class Competitor(Base):
    __tablename__ = "competitors"
    id: int (PK)
    tenant_id: int (FK)
    name: str
    aliases: list[str]
    discovery_source: str        # "manual" | "ai_response" | "category_match"
    confirmed: bool
    first_seen_at: datetime

class Query(Base):
    __tablename__ = "queries"
    id: int (PK)
    tenant_id: int (FK)
    keyword_id: int (FK)
    engine: str
    prompt: str
    sample_index: int
    requested_at: datetime
    cost_usd: float

class Response(Base):
    __tablename__ = "responses"
    id: int (PK)
    query_id: int (FK)
    raw_text: str
    cited_urls: list[str]
    latency_ms: int
    created_at: datetime

class Mention(Base):
    __tablename__ = "mentions"
    id: int (PK)
    response_id: int (FK)
    tenant_id: int (FK)
    brand: str
    is_target: bool
    is_competitor: bool
    position: int
    weight: float                # MVP-1
    sentiment: str | None        # MVP-2
    context_snippet: str

class ReferenceDocument(Base):    # MVP-3
    __tablename__ = "reference_documents"
    id: int (PK)
    tenant_id: int (FK)
    source_type: str             # "url" | "text" | "file"
    source_url: str | None
    title: str
    content_hash: str
    chunk_count: int
    indexed_at: datetime

class ComplianceRule(Base):       # MVP-3
    __tablename__ = "compliance_rules"
    id: int (PK)
    tenant_id: int (FK)
    rule_type: str               # "forbidden_word" | "required_disclaimer" | "pattern"
    pattern: str
    severity: str                # "error" | "warning" | "info"
    message: str
    is_active: bool

class GeneratedContent(Base):     # MVP-3
    __tablename__ = "generated_contents"
    id: int (PK)
    tenant_id: int (FK)
    keyword_id: int (FK)
    channel: str                 # "schema_org" | "blog_html" | "naver_blog" | "instagram"
    body: str
    cited_reference_ids: list[int]
    compliance_status: str       # "pass" | "warn" | "fail"
    compliance_report: dict
    created_at: datetime
```

---

## 4. MVP-0 ~ MVP-1 (측정·분석 인프라)

### 4.1 Engine 추상화

```python
class BaseEngine(ABC):
    name: str
    @abstractmethod
    async def query(self, prompt: str) -> EngineResponse: ...

@dataclass
class EngineResponse:
    text: str
    cited_urls: list[str]
    latency_ms: int
    raw_payload: dict
```

구현 우선순위: Perplexity → OpenAI → Gemini → Claude.

### 4.2 Collector

```python
async def collect_for_keyword(
    tenant_id: int,
    keyword: Keyword,
    engines: list[BaseEngine],
    n_samples: int = 30,
    concurrency: int = 5,
) -> list[Response]: ...
```

비용 가드레일 + DB 저장 + 멘션 추출까지 한 번에.

### 4.3 Mention Extractor (v2 강화)

```python
def extract_mentions(
    response_text: str,
    target_brand: str,
    competitors: list[Competitor],
    aliases: dict[str, list[str]],
) -> list[ExtractedMention]:
    """
    - v1: 정규화 + 한글 어절 매칭 + 위치 추적
    - v2: 어절 가중치, 추천 강도, 부정 컨텍스트 감지
    """

@dataclass
class ExtractedMention:
    brand: str
    position: int
    weight: float          # 0.0 ~ 1.0
    is_negative: bool
    context_snippet: str
```

weight 계산:
```
weight = position_score × strength_score
  position_score = 1.0 - (position / total_length) × 0.5
  strength_score = 1.0 if 추천/권장 인접
                 = 0.7 if 단순 언급
                 = 0.3 if 비교 대상으로만 언급
```

### 4.4 Analytics

#### 4.4.1 Visibility
```python
def mention_share(...) -> {n, share, ci_95, weighted_share, weighted_ci_95}
```
Wilson score interval로 신뢰구간.

#### 4.4.2 추세 검정 (Mann-Kendall)
```python
import pymannkendall as mk

def detect_trend(time_series: list[float]) -> dict:
    """{trend, p_value, tau, is_significant}"""
```

#### 4.4.3 이상치 탐지
이동 평균 ± 2σ 벗어난 시점 탐지. SOV 급락 시 알림용.

#### 4.4.4 Competitor Discovery (MVP-2)
NER + 빈도 누적 → 후보 풀 → 사람 승인 워크플로.

### 4.5 Dashboard (Streamlit)
- 추세 검정 결과 (significant ↑/↓)
- 이상치 알림 배너
- Competitor 후보 검수
- Weighted vs simple mention share 비교 토글

---

## 5. MVP-3: Reference Library + Compliance + Content Generator

### 5.1 Reference Library (RAG)

#### 5.1.1 입력
```bash
python scripts/ingest_references.py --tenant 1 --url https://...
python scripts/ingest_references.py --tenant 1 --file ./guide.md
python scripts/ingest_references.py --tenant 1 --text "직접 입력"
```

#### 5.1.2 처리 파이프라인
```
URL/텍스트 입력
  ↓
[crawler.py]   trafilatura로 본문 추출
  ↓
[chunker.py]   500 token, 100 token overlap
  ↓
[embedder.py]  text-embedding-3-small
  ↓
[store.py]     Chroma collection (tenant별 분리)
               metadata: {tenant_id, source_url, document_id, chunk_index}
```

#### 5.1.3 검색
```python
def retrieve(tenant_id: int, query: str, k: int = 5) -> list[Chunk]:
    """Tenant 격리된 collection에서 top-k 유사 chunk."""
```

### 5.2 Compliance Engine (의료법 린터)

#### 5.2.1 룰 형식

```yaml
# config/compliance_rules/default.yaml
tenant_id: 1
rules:
  - type: forbidden_word
    severity: error
    pattern: "100% 보장"
    message: "절대적 보장 표현은 의료법 위반 가능. '높은 만족도' 등으로 대체."

  - type: forbidden_word
    severity: error
    pattern: "최고|유일|최초"
    message: "최상급 표현은 객관적 근거 없으면 부당광고. 구체 수치로 대체."

  - type: required_disclaimer
    severity: warning
    pattern: "이벤트|할인|프로모션"
    requires: "* 본 이벤트는 \\d{4}\\.\\d{1,2}\\.\\d{1,2}까지 진행됩니다"
    message: "이벤트 표현 시 종료일 명시 필요."

  - type: pattern
    severity: warning
    pattern: "(?i)(treatment effects?|효과 보장)"
    message: "의료광고 사전심의 대상일 수 있음."
```

#### 5.2.2 린터
```python
def lint(tenant_id: int, text: str) -> ComplianceReport:
    """DB rules + tenant yaml 머지 → 텍스트 검사 → 위반 위치 + 메시지 + severity."""

@dataclass
class ComplianceReport:
    status: Literal["pass", "warn", "fail"]
    violations: list[Violation]
    suggestions: list[Suggestion]

@dataclass
class Violation:
    rule_type: str
    severity: str
    matched_text: str
    position: tuple[int, int]
    message: str
```

#### 5.2.3 자동 수정 (옵션)
위반 발견 → LLM에 "의료법 가이드에 맞게 수정" 재호출 → 최대 3회 반복.

### 5.3 Content Generator

#### 5.3.1 생성 파이프라인

```
사용자 입력 (tenant_id, keyword, channel, reference_query)
  ↓
[retriever]  RAG top-5
  ↓
[generator]  채널별 system prompt + RAG + keyword → LLM
  ↓
[linter]     Compliance 검사
  ↓ (위반 시)
[generator]  자동 수정 재호출 (최대 3회)
  ↓
[exporter]   채널별 포맷 변환
  ↓
[storage]    GeneratedContent 저장
  ↓
사용자에게 표시 + 복사 버튼
```

#### 5.3.2 채널별 템플릿

**Schema.org (자사 웹 삽입용)**
```python
def generate_faq_schema(tenant: Tenant, qa_pairs: list[dict]) -> str:
    """JSON-LD FAQPage schema. <script type='application/ld+json'>...</script>."""

def generate_medical_business_schema(tenant: Tenant) -> str:
    """MedicalBusiness schema."""
```

**자사 블로그 HTML**
- `<h2>` `<h3>` 구조 + `<p>` + 출처 링크
- 메타 태그 포함
- 워드프레스/티스토리에 붙여넣기

**네이버 블로그 (평문)**
- HTML 미지원. 단락 + 이모지 + 해시태그
- 1500~2500자, 키워드 자연 반복, [이미지1] placeholder

**Instagram (캡션)**
- 200~300자 + 해시태그 30개 이내
- 첫 줄 hook + 이모지

#### 5.3.3 출력 UI (Streamlit)

```
┌──────────────────────────────────────────┐
│ 키워드: [강남 라식 잘하는 곳        ▼] │
│ 채널:   [네이버 블로그              ▼] │
│ [생성하기]                              │
├──────────────────────────────────────────┤
│ Compliance 상태: ⚠ 1 warning            │
│   - "최고 수준" → 객관적 근거 필요      │
│ [자동 수정 시도] [사람 검수로 진행]      │
├──────────────────────────────────────────┤
│ 생성 본문:                               │
│ ┌──────────────────────────────────────┐│
│ │ 안녕하세요, BGN 밝은눈안과입니다...  ││
│ └──────────────────────────────────────┘│
│ [📋 복사하기]                            │
├──────────────────────────────────────────┤
│ 참고한 레퍼런스:                         │
│ - https://... (similarity: 0.87)        │
└──────────────────────────────────────────┘
```

---

## 6. 환경 변수 (`.env.example`)

```
# LLM
PERPLEXITY_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
ANTHROPIC_API_KEY=

# Embedding (RAG)
EMBEDDING_MODEL=text-embedding-3-small

# Storage
DATABASE_URL=sqlite:///./data/geo.db
CHROMA_PATH=./data/chroma

# 가드레일
MAX_DAILY_USD=10.0
MAX_CONTENT_GEN_PER_DAY=50
DEFAULT_N_SAMPLES=30
DEFAULT_CONCURRENCY=5

# 외부 API (옵션, MVP-2)
NAVER_LOCAL_API_CLIENT_ID=
NAVER_LOCAL_API_CLIENT_SECRET=

LOG_LEVEL=INFO
```

---

## 7. 단계별 검증 기준

### MVP-0 종료 조건
- [ ] Perplexity 1엔진, n=30 샘플 수집
- [ ] tenant_id 기반 데이터 격리 동작
- [ ] 비용 가드레일

### MVP-1 종료 조건
- [ ] 2주 연속 측정 후 Mann-Kendall 추세 검정 출력
- [ ] Wilson CI + Weighted Mention Share
- [ ] Streamlit 대시보드: 시계열 + CI 음영 + 이상치 배너
- [ ] 멘션 추출 수동 검수 정확도 ≥ 80%

### MVP-2 종료 조건
- [ ] 4개 엔진 동시 수집
- [ ] Competitor Discovery: 후보 자동 발견 + 승인 워크플로
- [ ] Sentiment 분석 (정확도 ≥ 70%)

### MVP-3 종료 조건
- [ ] URL 5개 이상 RAG 인덱싱 → 유사도 검색 동작
- [ ] Compliance 룰 10개 이상 등록 → 린터 동작
- [ ] 4개 채널 (Schema.org / Blog HTML / Naver / Instagram) 생성
- [ ] 자동 수정 루프 (최대 3회) 동작
- [ ] 복사 버튼으로 클립보드 export

### MVP-4 (이후)
A/B 테스트 프레임워크. Schema.org 적용 전후 SOV 변화 측정.

### MVP-5 (이후)
멀티테넌트 풀 SaaS UI. React+FastAPI. 결제, 권한.

---

## 8. 명시적 비목표

- ❌ 외부 채널(네이버 블로그/카페/인스타) **자동 게시** — 사용자가 수동 복사
- ❌ AI 엔진의 학습 데이터 직접 주입 (불가능)
- ❌ 의료광고 사전심의 대행 (자율심의기구 외부 절차)
- ❌ Fine-tuning (필요 없음. RAG로 충분)

---

## 9. 본 프로젝트의 GSD Phase 매핑 (사용자 요청 반영)

> 정의서 §9의 "MVP-0 → 1 → 2 → 3" 권장 순서를 **사용자가 의도적으로 뒤집음**.
> 이유: 가시적 결과물(콘텐츠 생성기)을 먼저 만들어 메디맵 데모/판매 가능 상태 확보.
> 측정 인프라(MVP-0~2)는 그 뒤로 이어짐.

| Phase | 내용 | 정의서 매핑 | 비고 |
|-------|------|-------------|------|
| 1 | 메디맵 데모 슬라이스 — Compliance 린터 + FAQ JSON-LD 생성기 | §5.2 일부 + §5.3.2 Schema.org 일부 | **오늘 3시간** |
| 2 | Foundation — tenant 모델 + DB + 환경 + 4채널 템플릿 + 자동수정 루프 | §3 + §5.3 풀 | |
| 3 | RAG (Reference Library) | §5.1 풀 | |
| 4 | MVP-0 측정 인프라 (Perplexity 수집) | §4.1, §4.2 일부 | |
| 5 | MVP-1 분석 강화 (가중치/추세/이상치/대시보드) | §4.3, §4.4.1~4.4.3, §4.5 | |
| 6 | MVP-2 풀 엔진 + Competitor Discovery | §4.1 나머지, §4.4.4 | |

---

## 부록 A. 비용 추정

| 단계 | 항목 | 추정 월 비용 (10 키워드 기준) |
|------|------|------------------------------|
| MVP-0 | Perplexity n=30 × 주 1회 | ~$30 |
| MVP-2 | 4 엔진 n=30 × 주 1회 | ~$120 |
| MVP-2 | 임베딩 (RAG 인덱싱) | ~$5 |
| MVP-3 | 콘텐츠 생성 50건/월 | ~$30 |

키워드 100개로 늘리면 ×10. 비용 가드레일 절대 빼지 말 것.

---

## 부록 B. 의료법 가이드 데이터 피딩 권장 출처

Reference Library에 인덱싱할 권장 1차 자료:
- 의료법 (국가법령정보센터 https://law.go.kr — [의료법] 전문)
- 의료광고 사전심의 가이드라인 (대한의사협회 의료광고심의위원회)
- 의료광고 자율심의 사례집 (보건복지부 발간 자료)
- 표시광고법 위반 사례 (공정거래위원회)

이들을 RAG 인덱스에 넣어두면 콘텐츠 생성 시 자동 참조됨. Compliance 룰은 이 자료들에서 추출한 패턴을 yaml로 입력.

---

*Source: 사용자 제공 기획정의서 v2 (Document version: 2.0). Captured: 2026-05-03.*
