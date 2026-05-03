# Phase 3: Reference Library (RAG)

**Goal**: URL/문서를 ingest 해 tenant 격리된 Chroma 인덱스를 만들고, Content Generator 가 RAG retrieval 결과를 system prompt 컨텍스트로 주입해 사실 기반 콘텐츠를 생성한다.

**Status**: In Progress
**Estimated**: 1.5일 — Plan 03-01 (~5h) + 03-02 (~4h) + 03-03 (~3h)
**Depends on**: Phase 2 (ReferenceDocument 모델 + Alembic 도입)
**Requirements**: REF-01, REF-02, REF-03, REF-04, REF-05, REF-06, REF-07, UI-05

---

## Context

### Phase 2 까지 보유한 것
- `src/reference/fetcher.py` — URL → trafilatura 본문 추출 (REF-01 부분 구현, 간이 RAG)
- `src/storage/models.py:ReferenceDocument` — Alembic 마이그레이션 + tenant FK + content_hash unique
- `src/storage/db.py` — DATABASE_URL 환경변수, SQLite 기본 + Postgres 호환
- 4채널 통합 발행 (Phase 2-T2.5/T2.6)

### Phase 3 의 정확한 Delta
| 영역 | 현재 | Phase 3 목표 |
|---|---|---|
| **Chunker** | 없음 | 500-token chunks, 100-token overlap |
| **Embedder** | 없음 | Stub/Gemini/OpenAI 멀티 프로바이더 |
| **Vector store** | 없음 | Chroma persistent client, tenant별 collection |
| **Retrieval** | 없음 | retrieve(tenant_id, query, k=5) |
| **Content gen 통합** | references_block 은 fetcher 의 raw text 만 | RAG retrieval 결과를 chunk 단위로 주입 + cited_reference_ids |
| **Ingest** | fetcher only | CLI `ingest_references.py` + Streamlit UI |
| **중복 차단** | 없음 | content_hash unique 활용 |

### 핵심 결정 (decisions)

**1. Embedder 선택 — 멀티 프로바이더 (Phase 1 LLM 패턴 재사용)**
- StubEmbedder: hash-based deterministic vector — 키 0개, 검색 품질 낮음 (데모 동작 확보)
- GeminiEmbedder: `text-embedding-004` — 사용자 무료 tier, 768차원
- OpenAIEmbedder: `text-embedding-3-small` — 정의서 표준, 1536차원
- 토글: `EMBEDDING_PROVIDER` 환경변수 (기본 stub)

**2. Vector store — Chroma persistent local**
- `./data/chroma/` 에 영속 저장 (gitignored — `data/` 이미 ignore)
- Streamlit Cloud 컨테이너 재시작 시 휘발 (Phase 2 의 SQLite 시드 패턴과 동일 한계)
- 영속화 필요해지면 Phase 4+ 에서 Supabase pgvector 마이그레이션

**3. Tenant 격리**
- Chroma collection 명: `tenant_{id}` (예: `tenant_1`)
- Metadata: `{tenant_id, source_url, document_id, chunk_index, source_type}`
- 다른 tenant 의 chunk 가 검색 결과에 절대 노출되지 않도록 collection 단위 분리

**4. content_hash 로 중복 차단**
- ReferenceDocument 의 (tenant_id, content_hash) UNIQUE 활용
- INSERT 전에 hash 비교 → 이미 있으면 skip + 로그

**5. RAG context block format**
- Content generator 의 system prompt 에 주입:
  ```
  [참고 자료]
  - [출처1] 청크 본문...
  - [출처2] 청크 본문...
  ```
- 발행 시 `cited_reference_ids` JSON 컬럼에 사용된 ReferenceDocument.id 리스트 저장

---

## Plans

### Plan 03-01: Embedder + Chunker + Chroma Store

**Goal**: 텍스트를 청크로 쪼개고, 임베딩하고, Chroma 에 tenant 격리 저장하는 파이프라인이 동작한다.

**Requirements**: REF-02, REF-03, REF-04, REF-07

**Tasks**:

- [ ] **T1.1: chunker 모듈**
  - `src/reference/chunker.py` 신규
  - `chunk_text(text, max_tokens=500, overlap_tokens=100, lang="ko") -> list[Chunk]`
  - Chunk dataclass: `text, char_start, char_end, token_count`
  - 한국어는 어절(공백) 단위로 토큰 카운트 근사 (정확한 tokenizer 는 OpenAI/Gemini 마다 달라서 보수적 추정)
  - **Verification**: `pytest tests/test_chunker.py` — 1500자 입력 → 3~4 chunks, 중복(overlap) 글자수 검증
  - **Files**: `src/reference/chunker.py`

- [ ] **T1.2: Embedder 프로바이더 추상화**
  - `src/reference/embedder.py` 신규
  - Protocol `Embedder`: `name, dim, embed(texts: list[str]) -> list[list[float]]`
  - 3개 구현:
    - `StubEmbedder` (dim=128, hash → deterministic vector)
    - `GeminiEmbedder` (google-generativeai 의 `embed_content`, model="text-embedding-004", dim=768)
    - `OpenAIEmbedder` (model="text-embedding-3-small", dim=1536)
  - Factory `get_embedder()` — `EMBEDDING_PROVIDER` 환경변수 (stub|gemini|openai)
  - **Verification**: `pytest tests/test_embedder.py` — Stub 으로 같은 텍스트 → 같은 vector
  - **Files**: `src/reference/embedder.py`

- [ ] **T1.3: Chroma store wrapper + tenant collection**
  - `pip install chromadb` 추가 (`pyproject.toml`, `requirements.txt`)
  - `src/reference/store.py` 신규
  - `ChromaStore` 클래스:
    - `__init__(persist_dir: Path)` — `chromadb.PersistentClient`
    - `get_or_create_collection(tenant_id) -> Collection` — collection 명 `tenant_{id}`
    - `add_chunks(tenant_id, document_id, chunks: list[Chunk], embeddings, source_url, source_type)` — chunk 와 메타 저장
    - `query(tenant_id, query_embedding, k=5) -> list[ChunkResult]` — top-k 유사 청크 + metadata
  - **Verification**: pytest — 같은 tenant 에 5 chunks 저장 → query 가 top-k 반환, 다른 tenant query 는 결과 0
  - **Files**: `src/reference/store.py`, `pyproject.toml`, `requirements.txt`

- [ ] **T1.4: ReferenceDocument INSERT + 중복 차단**
  - `src/reference/indexer.py` 신규 — fetcher + chunker + embedder + store 오케스트레이션
  - `index_url(session, tenant_id, url) -> IndexResult` — fetch → hash → 중복 체크 → chunk → embed → store + ReferenceDocument INSERT
  - `index_text(session, tenant_id, text, source_type="text", source_url=None, title=None) -> IndexResult`
  - 중복: content_hash 가 이미 있으면 `IndexResult(status="duplicate", document_id=existing.id)` 반환
  - `IndexResult` dataclass: `status, document_id, chunk_count, error_msg`
  - **Verification**: pytest — 같은 URL 두 번 index → 두 번째는 duplicate
  - **Files**: `src/reference/indexer.py`

- [ ] **T1.5: pytest test_chunker + test_embedder**
  - `tests/test_chunker.py` (4 tests): 짧은 텍스트, 정확히 N 토큰, overlap 검증, 한국어 어절
  - `tests/test_embedder.py` (3 tests): StubEmbedder 결정론, dim 일치, 빈 입력 처리
  - **Files**: `tests/test_chunker.py`, `tests/test_embedder.py`

**Verification (Plan 03-01 합격 기준)**:
- pytest 신규 7+ 통과
- `index_text(session, tenant_id=1, text="...", ...)` 호출 시 ReferenceDocument 1행 INSERT + Chroma `tenant_1` collection 에 chunks 저장
- 같은 텍스트 두 번째 호출 시 `IndexResult.status == "duplicate"`

---

### Plan 03-02: Retriever + Content Generator 통합

**Goal**: 발행 시점에 RAG retrieval 결과가 LLM system prompt 에 자동 주입되고, 발행물의 cited_reference_ids 가 채워진다.

**Requirements**: REF-05, GEN-01~07 (RAG 통합)

**Tasks**:

- [ ] **T2.1: retriever 모듈**
  - `src/reference/retriever.py` 신규
  - `retrieve(session, tenant_id, query, k=5) -> list[RetrievedChunk]`
  - `RetrievedChunk(text, source_url, document_id, chunk_index, distance)`
  - Chroma store + embedder 사용
  - **Verification**: pytest — 인덱싱 후 query 가 관련 chunk 반환

- [ ] **T2.2: Content Generator 의 RAG 통합**
  - 4개 generator 함수 (faq/blog/naver/instagram) 에 `use_rag: bool = True, rag_k: int = 5` 파라미터 추가
  - RAG 활성 시:
    - retriever 로 keyword 기반 chunk 검색
    - chunks → `references_block` 으로 포맷 (출처 URL + 본문)
    - LLM 호출 시 references_block 주입
    - cited_reference_ids 에 사용된 document_id 리스트 저장
  - **Verification**: 인덱싱된 tenant 로 발행 시 GeneratedContent.cited_reference_ids 가 비어있지 않음
  - **Files**: `src/content/generator.py`

- [ ] **T2.3: Streamlit 통합 탭에 RAG 토글**
  - `unified_publisher_tab.py` 옵션 expander 에 "RAG 사용" 체크박스 + k slider
  - 발행 결과에 cited sources 노출 (📎 출처 N건)
  - **Files**: `src/dashboard/unified_publisher_tab.py`

- [ ] **T2.4: pytest test_retriever + test_rag_integration**
  - `tests/test_retriever.py` (3 tests): 인덱싱 후 retrieve k 개 반환, tenant 격리, distance 정렬
  - `tests/test_rag_integration.py` (2 tests): faq generator 가 cited_reference_ids 채움, RAG 비활성 시 빈 리스트
  - **Files**: `tests/test_retriever.py`, `tests/test_rag_integration.py`

**Verification (Plan 03-02 합격 기준)**:
- pytest 신규 5+ 통과
- 통합 탭에서 RAG ON 발행 시 결과 카드에 출처 chip 노출
- 다른 tenant 의 ReferenceDocument 가 절대 결과에 안 나옴

---

### Plan 03-03: Ingest CLI + Streamlit UI + 사용자 가이드

**Goal**: 운영자가 URL/파일/텍스트를 손쉽게 인덱싱하고, 인덱스 상태를 한눈에 본다.

**Requirements**: REF-06, UI-05

**Tasks**:

- [ ] **T3.1: scripts/ingest_references.py CLI**
  - argparse: `--tenant <id> --url <URL> | --file <path> | --text "..." | --batch <urls.txt>`
  - 출력: 인덱싱 결과 (success/duplicate/error) + chunk count
  - **Files**: `scripts/ingest_references.py`

- [ ] **T3.2: Streamlit "참고 자료" 탭**
  - 새 탭 "📚 참고 자료" 추가
  - URL 입력 + 인덱싱 버튼 + 진행 표시 (st.spinner)
  - 텍스트 직접 입력 + 인덱싱 버튼
  - tenant 의 ReferenceDocument 리스트 (title, source_url, chunk_count, indexed_at, 삭제 버튼)
  - **Files**: `src/dashboard/reference_library_tab.py` (신규), `src/dashboard/app.py` (탭 추가)

- [ ] **T3.3: README RAG 사용 가이드**
  - `## Reference Library (RAG)` 섹션 추가
  - 인덱싱 방법 (UI / CLI), embedding provider 선택, 휘발성 한계
  - **Files**: `README.md`

**Verification (Plan 03-03 합격 기준)**:
- `python scripts/ingest_references.py --tenant 1 --url https://...` 정상 동작
- Streamlit 신규 탭에서 URL 인덱싱 → 리스트에 즉시 표시
- README 에 RAG 가이드 노출

---

## Out of Scope (Phase 3 에서 안 하는 것)
- 다국어 임베딩 비교 분석 (Phase 5+)
- 청크 품질 메트릭 / 자동 튜닝
- pgvector / Postgres 영속화 (Supabase 연결 시점에 이전)
- Reranker (cross-encoder) — Phase 5+
- 4엔진 측정 인프라 — Phase 4
