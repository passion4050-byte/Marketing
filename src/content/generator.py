"""콘텐츠 생성 파이프라인. 정의서 §5.3.1 + Phase 1.5 확장.

흐름 (FAQ):
1. cost guardrail 사전 체크
2. LLM provider로 FAQ 생성
3. 합쳐서 의료법 린트
4. 위반 시 LLM에 위반 요약 전달 → 재호출 (최대 max_corrections회)
5. 통과(또는 max 도달) 시 JSON-LD 변환 + DB 저장 + 결과 반환

흐름 (Blog post — Phase 1.5):
1. cost guardrail
2. (옵션) reference URL fetch → 본문 추출 → context block
3. LLM에 context block + image 메타 → 블로그 JSON 출력
4. 의료법 린트 (intro + sections + conclusion 합본)
5. 위반 시 자동수정 루프
6. 이미지 src 매핑 + HTML 렌더링 + DB 저장
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import structlog
from sqlalchemy.orm import Session

from src.compliance.linter import ComplianceReport, lint, lint_for_channel
from src.content.cost import (
    check_daily_usd_budget as _check_daily_usd_budget,
    estimate_call_cost_usd,
)
from src.content.llm import (
    BlogGenerationResult,
    FAQPair,
    GenerationResult,
    InstagramGenerationResult,
    LLMError,
    LLMProvider,
    NaverBlogGenerationResult,
    check_daily_budget,
    get_provider,
)
from src.content.tenant_context import build_tenant_context_block
from src.content.templates.blog_html import (
    BlogPost,
    ImageSlot,
    post_from_dict,
    render_body,
    render_full_html,
    render_meta_block,
    render_naver_blog_plain,
)
from src.content.templates.instagram import (
    InstagramCaption,
    post_from_dict as instagram_from_dict,
    render_instagram_caption,
    validate_hashtags as ig_validate_hashtags,
    validate_length as ig_validate_length,
)
from src.content.templates.naver_blog import (
    NaverBlogPost,
    post_from_dict as naver_from_dict,
    render_naver_plain,
)
from src.content.templates.schema_org import faq_page_script_tag
from src.reference.fetcher import (
    Reference,
    fetch_many,
    references_to_context_block,
)
from src.reference.retriever import (
    cited_document_ids,
    format_references_block,
    retrieve,
)
from src.marketing.cta_templates import CtaConfig, append_cta_to_content
from src.storage.models import GeneratedContent, LlmCallLog, Tenant

logger = structlog.get_logger(__name__)


def _build_cta_config_from_tenant(tenant: Tenant) -> CtaConfig:
    """Tenant 의 연락처 → CtaConfig. 없는 필드는 CtaConfig 기본값 유지."""
    defaults = CtaConfig()
    return CtaConfig(
        kakao_channel_url=defaults.kakao_channel_url,  # 외부 채널 URL은 환경변수/배포측 책임
        naver_place_url=tenant.naver_place_url or defaults.naver_place_url,
        phone=tenant.phone or defaults.phone,
        brand_name=tenant.name or defaults.brand_name,
        own_blog_url=tenant.homepage or defaults.own_blog_url,
    )


_SLUG_RE = __import__("re").compile(r"[^a-z0-9가-힣]+")


def _resolve_cta_campaign(explicit: Optional[str], keyword: str) -> str:
    """utm_campaign 값을 결정. explicit > keyword slug > 'untagged'."""
    if explicit and explicit.strip():
        return explicit.strip()[:80]
    base = (keyword or "").strip().lower()
    base = _SLUG_RE.sub("_", base).strip("_")
    return base[:80] or "untagged"


@dataclass
class ContentResult:
    qa_pairs: list[FAQPair]
    json_ld_script: str
    compliance: ComplianceReport
    iterations: int
    provider: str
    saved_id: Optional[int] = None
    correction_history: list[ComplianceReport] = field(default_factory=list)
    cited_reference_ids: list[int] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return self.compliance.status == "pass"

    @property
    def safe_to_use(self) -> bool:
        """error 위반이 없으면 사용 가능 (warn은 검수 권장)."""
        return not self.compliance.has_errors()


@dataclass
class BlogResult:
    post: BlogPost
    body_html: str  # CMS 붙여넣기용
    full_html: str  # 미리보기용 완성 HTML
    meta_block: str  # <head>용 메타 + OG
    naver_plain: str  # 네이버 블로그 평문
    references: list[Reference]
    compliance: ComplianceReport
    iterations: int
    provider: str
    saved_id: Optional[int] = None
    correction_history: list[ComplianceReport] = field(default_factory=list)
    cited_reference_ids: list[int] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return self.compliance.status == "pass"

    @property
    def safe_to_use(self) -> bool:
        return not self.compliance.has_errors()


def _log_llm_call(
    session: Session,
    tenant_id: int,
    *,
    provider: str,
    model: str,
    channel: str,
    keyword: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    status: str = "success",
    error_msg: str | None = None,
) -> None:
    """LLM 호출 1건 LlmCallLog INSERT — Phase 2-T3.2.

    토큰 정보가 없으면(현재 Stub/일부 provider) 0 으로 기록 — cost_usd 계산도 0.
    """
    cost = estimate_call_cost_usd(model or provider, input_tokens, output_tokens)
    log = LlmCallLog(
        tenant_id=tenant_id,
        provider=provider,
        model=model or provider,
        channel=channel,
        keyword=keyword,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=cost,
        status=status,
        error_msg=error_msg,
    )
    session.add(log)
    session.commit()


def _build_rag_context(
    session: Session,
    tenant_id: int,
    keyword: str,
    *,
    use_rag: bool,
    rag_k: int,
) -> tuple[str, list[int]]:
    """RAG 활성 시 retriever 호출 → (references_block, cited_document_ids).

    오류/빈 결과 시 ("", []) 로 graceful 처리.
    """
    if not use_rag or rag_k <= 0:
        return "", []
    try:
        chunks = retrieve(session, tenant_id, keyword, k=rag_k)
    except Exception as e:  # pragma: no cover — graceful: RAG 실패 시 발행은 진행
        logger.warning("rag.retrieve_failed", error=repr(e), tenant_id=tenant_id)
        return "", []
    if not chunks:
        return "", []
    block = format_references_block(chunks)
    ids = cited_document_ids(chunks)
    logger.info("rag.context_built", tenant_id=tenant_id, n_chunks=len(chunks), n_docs=len(ids))
    return block, ids


def _augment_tenant_block(tenant_data_block: str, references_block: str) -> str:
    """tenant 정보 + 참고자료를 한 블록으로 결합 (provider 시그니처 무변경 패스스루)."""
    if not references_block:
        return tenant_data_block
    if not tenant_data_block:
        return references_block
    return f"{tenant_data_block}\n\n{references_block}"


def _join_for_lint(pairs: list[FAQPair]) -> str:
    """모든 Q+A를 하나의 텍스트로 합쳐 린트."""
    return "\n".join(f"Q: {p.question}\nA: {p.answer}" for p in pairs)


def _violations_to_correction_hint(report: ComplianceReport) -> str:
    """위반 목록을 LLM에게 전달할 자연어 hint로."""
    if not report.violations:
        return ""
    lines = ["다음 위반 사항을 모두 제거하여 다시 작성하세요:"]
    for v in report.violations:
        lines.append(
            f"- [{v.severity.upper()}] '{v.matched_text}' → {v.message}"
        )
    return "\n".join(lines)


def generate_faq_content(
    session: Session,
    tenant_id: int,
    keyword: str,
    *,
    n_pairs: int = 5,
    max_corrections: int = 3,
    provider: Optional[LLMProvider] = None,
    angle: str = "",
    save: bool = True,
    use_rag: bool = True,
    rag_k: int = 5,
) -> ContentResult:
    """키워드 → FAQ 생성 → 의료법 린트 → 자동수정 루프 → JSON-LD.

    use_rag=True 면 Phase 3 retriever 가 keyword 로 top-k 청크를 가져와 LLM 컨텍스트에 주입.
    """
    tenant = session.get(Tenant, tenant_id)
    if tenant is None:
        raise ValueError(f"tenant {tenant_id} not found. scripts/init_db.py 먼저 실행.")

    check_daily_budget(session, tenant_id)
    _check_daily_usd_budget(session, tenant_id)

    if provider is None:
        provider = get_provider()

    # 활성 의사/장비/이벤트 → LLM 컨텍스트 블록
    base_tenant_data = build_tenant_context_block(session, tenant_id)
    rag_block, cited_ids = _build_rag_context(
        session, tenant_id, keyword, use_rag=use_rag, rag_k=rag_k
    )
    tenant_data_block = _augment_tenant_block(base_tenant_data, rag_block)

    correction_hint: Optional[str] = None
    correction_history: list[ComplianceReport] = []
    last_result: Optional[GenerationResult] = None
    last_report: Optional[ComplianceReport] = None
    iterations = 0

    for attempt in range(max_corrections + 1):  # 초기 호출 + 수정 max_corrections회
        iterations = attempt
        logger.info(
            "generator.attempt",
            tenant_id=tenant_id,
            keyword=keyword,
            attempt=attempt,
            provider=provider.name,
            has_tenant_data=bool(tenant_data_block),
        )
        last_result = provider.generate_faq(
            keyword=keyword,
            tenant_name=tenant.name,
            tenant_category=tenant.domain_category,
            tenant_region=tenant.region,
            n_pairs=n_pairs,
            angle=angle,
            tenant_data_block=tenant_data_block,
            correction_hint=correction_hint,
        )
        _log_llm_call(
            session, tenant_id,
            provider=last_result.provider, model=last_result.provider,
            channel="schema_org", keyword=keyword,
        )
        joined = _join_for_lint(last_result.qa_pairs)
        last_report = lint_for_channel(session, tenant_id, "schema_org", joined)
        correction_history.append(last_report)

        if last_report.status == "pass":
            logger.info("generator.passed", attempt=attempt, summary=last_report.summary())
            break

        if not last_report.has_errors() and last_report.status == "warn":
            # warning만 있는 경우 — 한 번은 수정 시도
            if attempt < max_corrections:
                correction_hint = _violations_to_correction_hint(last_report)
                continue
            logger.info("generator.warn_accepted", attempt=attempt)
            break

        # error 있음 — 재시도
        if attempt < max_corrections:
            correction_hint = _violations_to_correction_hint(last_report)
            logger.info("generator.retry", attempt=attempt, summary=last_report.summary())
            continue

        # max_corrections 소진했지만 여전히 fail
        logger.warning("generator.max_corrections_exhausted", summary=last_report.summary())
        break

    assert last_result is not None and last_report is not None  # for type checker

    json_ld = faq_page_script_tag(last_result.qa_pairs)

    saved_id = None
    if save:
        gc = GeneratedContent(
            tenant_id=tenant_id,
            keyword_text=keyword,
            channel="schema_org",
            body=json_ld,
            raw_qa_pairs=[{"q": p.question, "a": p.answer} for p in last_result.qa_pairs],
            cited_reference_ids=cited_ids or None,
            compliance_status=last_report.status,
            compliance_report=last_report.to_dict(),
            llm_provider=last_result.provider,
            correction_iterations=iterations,
        )
        session.add(gc)
        session.flush()  # id 확보
        saved_id = gc.id
        session.commit()

    return ContentResult(
        qa_pairs=last_result.qa_pairs,
        json_ld_script=json_ld,
        compliance=last_report,
        iterations=iterations,
        provider=last_result.provider,
        saved_id=saved_id,
        correction_history=correction_history,
        cited_reference_ids=cited_ids,
    )


# ─── Blog Post (Phase 1.5) ───────────────────────────────────


def _join_blog_for_lint(post: BlogPost) -> str:
    """블로그 post의 모든 텍스트를 합쳐 린트 대상 문자열로."""
    parts: list[str] = []
    parts.append(post.title)
    parts.append(post.meta_description)
    parts.extend(post.intro_paragraphs)
    for sec in post.sections:
        parts.append(sec.heading)
        parts.extend(sec.paragraphs)
        for sub in sec.sub_sections:
            parts.append(sub.heading)
            parts.extend(sub.paragraphs)
    parts.extend(post.conclusion_paragraphs)
    return "\n".join(parts)


# Round 81 (2026-06-23) — AEO 표 강제. 모델이 표를 빠뜨리면 재시도 힌트.
_TABLE_HINT = (
    "AEO 강화(필수): 본문 섹션 중 한 곳의 paragraphs 배열에, 비교/요약용 마크다운 표를 "
    "별도 문자열 1개로 정확히 포함하세요. 형식 — 헤더행 `| 항목 | 값 |`, 구분행 `|---|---|`, "
    "데이터행 3개 이상. 체크리스트로 대체 불가 — 표가 반드시 1개 있어야 합니다."
)


# 🔴 Round 173b (2026-08-23) — 얇은 섹션 게이트.
#   실측(ko 파트너, 최근 30일): 테넌트별 H2당 평균 글자수가 244자(BGN 잠실)부터
#   787자(벨리셀)까지 3배 넘게 벌어져 있었다. 244자면 H2 하나에 2~3문장 — 구조(질문형
#   제목·표·FAQ)는 갖췄지만 답이 없는 글이다. 검색자는 "그래서 내 경우 기준이 뭔데"를
#   묻는데 문서가 답하지 않으면 2페이지에서 더 못 올라간다.
#   400자 기준선: 건강한 테넌트들의 중앙값(650~790자)보다 한참 낮게 잡아 재시도 폭주를
#   막으면서, 2~3문장짜리 빈 섹션만 걸러낸다.
_MIN_SECTION_CHARS = 400

_DEPTH_HINT = (
    "깊이 보강(필수): 아래 섹션들이 2~3문장으로 너무 얕습니다. 각 섹션을 400자 이상으로 "
    "다시 쓰되 분량을 늘리려고 같은 말을 반복하지 마세요. 반드시 아래 중 최소 2가지를 "
    "구체적으로 넣으세요 — ①판단 기준이 되는 수치·범위(예: 잔여 각막 250~300µm), "
    "②단계별 절차와 각 단계의 소요 기간, ③해당되는 사람 / 해당되지 않는 사람의 구분, "
    "④검사·상담 때 실제로 확인하는 항목, ⑤흔한 오해와 그것이 왜 틀렸는지. "
    "수치를 쓸 때는 범위와 전제를 함께 적고(개인차·검사 결과에 따라 달라짐), "
    "단정적 효과 보장 표현은 금지합니다. 얕은 섹션: "
)


def _thin_sections(post: BlogPost, min_chars: int = _MIN_SECTION_CHARS) -> list[str]:
    """min_chars 미만인 h2 섹션의 heading 목록. 표가 든 섹션은 면제."""
    from src.content.templates.blog_html import _looks_like_md_table

    thin: list[str] = []
    for sec in post.sections:
        blocks = list(sec.paragraphs)
        for sub in sec.sub_sections:
            blocks.append(sub.heading or "")
            blocks.extend(sub.paragraphs)
        # 표·체크리스트가 본체인 섹션은 글자수가 적어도 정보 밀도가 높다 → 면제
        if any(
            _looks_like_md_table(seg)
            for b in blocks
            for seg in (b or "").split("\n\n")
        ):
            continue
        if sum(len(b or "") for b in blocks) < min_chars:
            thin.append(sec.heading or "(제목 없음)")
    return thin


def _post_has_md_table(post: BlogPost) -> bool:
    """post 의 어느 paragraph 든 마크다운 표 블록이 있으면 True."""
    from src.content.templates.blog_html import _looks_like_md_table

    blocks: list[str] = list(post.intro_paragraphs)
    for sec in post.sections:
        blocks.extend(sec.paragraphs)
        for sub in sec.sub_sections:
            blocks.extend(sub.paragraphs)
    blocks.extend(post.conclusion_paragraphs)
    for b in blocks:
        for seg in (b or "").split("\n\n"):
            if _looks_like_md_table(seg):
                return True
    return False


# Round 81 (2026-06-24) → Round 82 (2026-06-26) — 리치 구조 로테이션 확장(3→7종).
#   목적: 콘텐츠가 누적돼도 '획일화'되지 않게 — 반복적 구조는 AI 생성 티가 나고 SEO 에도 불리.
#   모든 구조가 표·목록·정의문·이미지(베이스 AEO 프롬프트가 강제)를 포함 → SEO/AEO 상위노출 유지.
#   7종 아키타입 × (도입부·어조·반복방지) 변주 레이어 → 사실상 매 발행물이 다른 형태.
_STRUCTURE_DIRECTIVES = {
    "A": (
        "[글 구조 A — 질문답변형(Q&A) 가이드]\n"
        "- 모든 H2 를 환자가 실제로 검색·질문하는 자연어 문장으로(5~7개).\n"
        "- 각 H2 도입부 첫 문장은 한 문장 정의형 답변(AI 가 그대로 발췌하기 좋게).\n"
        "- 마지막 섹션에 '자주 묻는 질문' 3개를 짧게 Q/A 형태로.\n"
        "- 비교/요약 마크다운 표 1개 + 핵심 항목 체크리스트(• 목록) 1개 필수."
    ),
    "B": (
        "[글 구조 B — 비교·선택 가이드]\n"
        "- 핵심은 '선택 기준'. 시술/방법/유형을 비교하는 마크다운 표를 2개 이상.\n"
        "  (예: 종류별 특징 비교표, 장단점 표) 각 선택지의 '적합한 대상'을 명시.\n"
        "- 'A vs B' 형태의 비교 소제목을 1개 이상 활용.\n"
        "- 마지막에 '나에게 맞는 선택은?' 요약 체크리스트(• 목록)."
    ),
    "C": (
        "[글 구조 C — 단계별 실행 가이드]\n"
        "- 시간 순 단계(준비 → 과정 → 회복·관리)를 번호 목록(1. 2. 3.)으로 구성.\n"
        "- 각 단계에 소요 기간/주의사항을 함께. '회복·관리 타임라인' 마크다운 표 1개.\n"
        "- '준비물·체크리스트'(• 목록) 1개 이상 + 'N단계' 형태 소제목."
    ),
    "D": (
        "[글 구조 D — 오해·진실 교정형]\n"
        "- 흔한 오해/잘못된 통념 3~5개를 짚고 각각 근거로 바로잡는 구성.\n"
        "- '오해 vs 사실'을 대비하는 마크다운 표 1개(왼쪽 오해 / 오른쪽 사실).\n"
        "- 각 항목 첫 문장은 사실을 단정적으로(과장 없이) 한 문장 정의형으로.\n"
        "- 마지막에 '꼭 기억할 핵심'(• 목록) 요약."
    ),
    "E": (
        "[글 구조 E — 사례·시나리오 중심]\n"
        "- 대표적인 환자 상황/고민 시나리오 2~3개를 들고 각 상황별 접근을 설명(가상의 일반화, 특정인 단정 금지).\n"
        "- 상황별 고려사항을 정리한 마크다운 표 1개 + 단계 체크리스트(• 목록).\n"
        "- 각 섹션 도입부는 상황 묘사 → 한 문장 정의형 핵심으로 연결.\n"
        "- 의료법상 효과 단정·치료 보장 표현 금지(객관적 정보 위주)."
    ),
    "F": (
        "[글 구조 F — 비용·기간·고려사항 정보 정리형]\n"
        "- '무엇을 따져봐야 하는가'를 정보 위주로 정리(표 중심).\n"
        "- 항목별 비교/고려요소 마크다운 표 2개 이상(예: 고려사항 표, 기간·관리 표).\n"
        "  ※ 구체적 가격·할인 단정 표기 금지 — '비용에 영향을 주는 요소' 식 일반 정보로.\n"
        "- 핵심 요약(• 목록) 1개 + 정의형 첫 문장 H2 2개 이상."
    ),
    "G": (
        "[글 구조 G — 초보자 핵심정리(한눈에)]\n"
        "- 처음 접하는 독자 기준으로 핵심만 간결히. 짧은 정의형 H2 6개 내외.\n"
        "- '한눈에 보기' 요약 마크다운 표 1개 + 용어 풀이(• 목록) 1개.\n"
        "- 각 H2 첫 문장은 쉬운 한 문장 정의(전문용어는 괄호로 풀어서)."
    ),
}


# Round 141 (2026-07-13) — AEO 통계·데이터 강제.
#   감사 결과: 해외 발행글 34/34 가 '%수치 통계' 0개. Princeton GEO(KDD2024) 실증상
#   통계 삽입은 인용률 +30~41% 로 단일 최대 지렛대인데 전면 결손 → 인용 0의 콘텐츠 측 원인.
#   표/정의문/이미지처럼 '베이스 요건'에 통계를 추가. 단, 의료법 안전장치를 프롬프트에 명시.
_STATS_ENFORCE_DIRECTIVE = (
    "[AEO 통계·데이터 강화 — 필수]\n"
    "- 본문에 '출처를 함께 밝힌' 구체적 수치/통계를 최소 2개 포함하세요"
    "(예: 유병률, 회복기간 범위, 만족도 설문 수치, 이용·시장 통계 등).\n"
    "- 각 수치는 '무엇에 대한 값인지' + 대략적 출처(기관·조사명·연도 등)를 함께 밝혀,"
    " AI가 그대로 인용해도 근거가 남게 합니다.\n"
    "- 수치는 퍼센트(%)나 구간(예: 2~3주, 10명 중 7명)처럼 AI가 발췌하기 쉬운 형태로 표현합니다.\n"
    "- 🔴 의료법 준수(중요): 특정 병원·시술의 '효과·성공률 단정/보장'으로 읽히는 수치는 금지."
    " 일반적·객관적 통계와 범위만 사용하고, 개별 결과를 보장하지 않는다는 맥락을 유지합니다.\n"
    "- 근거 없는 임의 수치 날조 금지 — 확실치 않으면 '일반적으로 알려진 범위' 수준으로 신중히 표현합니다."
)


# 🔴 Round 146 (2026-08-15) — 첫 문단 answer-first 강제.
#   8/2 갭 분석(.planning/overseas-gap-smile-lasik-in-korea.md)의 단일 최대 발견:
#   경쟁 1위 himedi 는 스키마도 표도 우리보다 없었다. 이긴 이유는 단 하나 —
#   첫 문단이 "인용하면 그대로 답이 되는 문장"(가격 구간 + 소요시간 + 회복기간)
#   이었기 때문. 우리 첫 문단은 "한국은 인기 있는 목적지…" 류 일반론이었고,
#   이 교훈이 수동 보강 3편에만 반영되고 자동 생성 프롬프트엔 0% 반영돼 있었다.
#   (Round 141 통계 디렉티브는 "본문 어딘가에 수치 2개"라 위치 무관 — 별개 요건.)
#   국내/해외 공용 주입. 상담 클릭 실측(12일 24건)에서도 숫자형 가이드가
#   클릭을 만들고 가격 0회 글은 정보만 주고 보냈다.
_ANSWER_FIRST_DIRECTIVE = (
    "[첫 문단 = 답변 문단 — 필수]\n"
    "- 글의 **첫 번째 문단**은 독자의 핵심 질문에 그대로 답하는 문단으로 작성하세요.\n"
    "- 첫 문단에 반드시 포함: ① 비용 구간(원화 KRW 범위. 해외 독자 대상 글이면 USD 병기)"
    " ② 시술/회복에 걸리는 기간(예: 일상 복귀 1~2일, 안정화 약 1개월) ③ 가능하면 소요 시간.\n"
    "- 배경 설명·인사·일반론('한국은 인기 있는 목적지입니다' 류)으로 시작하지 마세요."
    " 그런 내용은 두 번째 문단 이후로 보냅니다.\n"
    "- 첫 문단에 핵심 개체명(시술명·장비명, 파트너 글이면 병원명) 2개 이상을 **굵게** 표기해"
    " '질문 → 즉답' 형태를 만드세요 (상위노출 5사 실측 공통 패턴 — Round 146-B).\n"
    "- 🔴 의료법: 비용은 반드시 **구간/범위**로만 (확정가·최저가·이벤트가 금지)."
    " '병원·상태에 따라 다르며 검사 후 확정' 맥락을 같은 문단에 유지하세요.\n"
    "- 이 문단만 떼어 AI 답변에 인용돼도 완결된 답이 되는지 스스로 검증하세요."
)


# 🔴 Round 146-B (2026-08-15) — "skin clinic in korea" 상위 5사 실측 공통 패턴 주입.
#   Firecrawl 전수 해부(renovoskin/seoulorthopedics/enlienjang/gangnamobgyn/gangnamwomenshealth):
#   5사 전원 JSON-LD 0개 — 구글이 이 SERP 에서 보상한 건 스키마가 아니라 **문서 구조**
#   (고정필드 클리닉 블록 · 본문 Q&A 8~11개 · 개체명 밀도 · 답변형 첫 문단).
#   FAQPage 스키마는 경쟁사가 안 하는 우리만의 우위로 유지하고, 본문 구조를
#   이 실측 패턴으로 끌어올린다. 국내/해외 공용 주입.
_SERP_PROVEN_DIRECTIVE = (
    "[상위노출 실측 구조 — 필수]\n"
    "- 병원·클리닉·시술 옵션을 소개하는 블록이 있으면 고정 필드 순서로 작성:"
    " 위치(동네명) / 이런 분께(한 줄) / 주요 시술·장비(실명 나열) / 방문 흐름 / 방문 팁 1개.\n"
    "- 블록 안에는 가격 숫자를 쓰지 말고 '상담 시 서면 견적 요청' 안내로 대체합니다"
    " (첫 문단의 비용 구간 표기와는 별개 규칙).\n"
    "- 본문 하단 FAQ 는 8개 이상: 질문은 실제 검색 질의형('몇 회 받아야 하나요',"
    " '당일 시술 가능한가요', '민감성 피부도 되나요'), 답변 첫 문장은 숫자나 예/아니오 즉답.\n"
    "- 가능하면 '증상·고민별 선택 가이드' 섹션 1개(예: 색소·기미면 A 방향, 모공·흉터면 B 방향)"
    " 로 롱테일 질의를 흡수하세요.\n"
    "- 개체명 밀도: 장비·시술 실명과 지역(동네)명을 문서 앞부분에 자연스럽게 배치합니다.\n"
    "- 🔴 금지: 'No.1'·'최고'·'유일'·'1위' 등 최상급, 비교 우위 단정, 효과·성공률 보장."
    " 신뢰어는 검증 가능한 사실만(전문의 직접 상담, 정품·정식 장비, 개원 연차 등).\n"
    "- 이모지(🩺✨📌 등)는 제목·본문 어디에도 사용 금지 — 에디토리얼 매거진 톤 유지"
    " (Round 146-D: 구 발행분 이모지가 사이트 감도를 깨는 최대 잡음원으로 실측됨)."
)


# 해외(overseas) SEO/GEO 아키타입 — 상위노출 레퍼런스 실측 골격
#   (.planning/overseas-seo-geo-content-routine.md §2). lang != ko 일 때만 주입.
#   Round 146-B 개정 — "skin clinic in korea" 상위 5사 실측 반영:
#   ① 연도(2026) 타이틀 규칙 폐지: 5사 중 연도 사용 0곳, 대신 숫자·지역·타깃 밀도가 공식
#   ② 클리닉 블록 고정필드화 ③ FAQ 4+→8+ ④ 여행자 실용 섹션 신설
#   ⑤ 메신저 언어분기(EN→WhatsApp·JA→LINE·ZH→WeChat) 문구화 ⑥ 답변형 첫 문단 볼드 개체명.
_OVERSEAS_ARCHETYPE_DIRECTIVE = (
    "[OVERSEAS PAGE ARCHETYPE — foreign-patient SEO/GEO, follow this proven structure]\n"
    "Use H2 sections in this order where they fit the topic:\n"
    "1) 'Who this guide helps' — the target reader.\n"
    "2) The main list (clinics or treatment options) — each item with fixed fields in this order: "
    "'Location (neighborhood)', 'Best for (one line)', 'Popular services (real device/treatment names)', "
    "'Visit flow (analysis→consult→treat→aftercare)', 'Visitor tip (stay-schedule advice)'.\n"
    "3) 'Booking steps' — include a ready-to-copy inquiry script in the target language AND in Korean.\n"
    "4) 'Price guide' — an itemized table of typical KRW ranges per procedure (concrete numbers AI can cite).\n"
    "5) 'How to choose' — a practical checklist (English/native support, device transparency, treatment plan, photos & aftercare).\n"
    "6) 'What to expect at your first visit' — numbered steps.\n"
    "7) 'Traveler practicality' — recommended session count & spacing (e.g. 3–5 sessions, 3–6 weeks apart), "
    "downtime, itinerary tips (consult + first treatment early in the stay, follow-up before departure), "
    "and pre-treatment prep (e.g. pause retinoids/acids 3–5 days before).\n"
    "8) 'Aftercare' and 'Payment / VAT refund'.\n"
    "9) An FAQ with 8+ Q&A pairs — search-query style questions; first sentence of each answer gives "
    "a number or a yes/no. Phrase at least 3 questions EXACTLY like real community/forum posts foreigners "
    "write (e.g. 'Is {treatment} in Korea worth it?', 'How much did you actually pay for {treatment} in "
    "Gangnam?', 'Can I do this as a foreigner without speaking Korean?') — AI engines retrieve these "
    "long-tail community phrasings, and the only written answer should be ours.\n"
    "10) 'Getting there' — the clinic/area address EXACTLY as written on Google Maps in English, nearest "
    "subway station + exit number, and one line inviting the reader to search the clinic name on Google "
    "Maps (AI local recommendations are retrieved from map databases — our text must match the map "
    "listing verbatim so engines can join the two).\n"
    "Title formula (measured top-ranking SERP pattern): '[Best|Top] {N} {keyword} in {area} for {audience}' "
    "— do NOT put a year in the H1/title; {N} must match the actual item count. "
    "Meta description: one question sentence + one answer sentence that names 3–4 neighborhoods "
    "(Gangnam, Cheongdam, Hongdae, Myeongdong...) AND 3–4 treatments.\n"
    "First paragraph: restate the query as a question, then answer immediately with 2+ **bold** entity names "
    "(treatments/devices; partner clinic name if applicable), then the evidence sentence.\n"
    "CTA messenger by language: EN → WhatsApp, JA → LINE, ZH → WeChat/WhatsApp. Name the messenger in the "
    "CTA sentence, and right before the final CTA add one action line: 'Ask for a specialist consultation "
    "first and request a written quote.'\n"
    "Evidence style: prefer concrete verifiable numbers (KRW ranges, session counts, MFDS/FDA clearance "
    "years, device model names) over adjectives. Write key claims so a single sentence can be lifted "
    "verbatim as an AI answer: claim + number + plain-language source. Never invent statistics, reviews "
    "or community quotes — if a number is not verifiable, give a range and say 'typically'.\n"
    "Medical-ad compliance: 'best/top' listicle framing is allowed for overseas, but NO efficacy guarantees, "
    "success-rate claims, 'No.1' claims, or competitor disparagement."
)


def _pick_structure_type(keyword: str) -> str:
    """키워드 + 발행일 기준 결정적 구조 픽 — 같은 키워드도 날마다, 키워드끼리 구조가 달라짐.

    아키타입 수가 늘어도 자동 반영(% len). 결정적이라 A/B 테스트·재현에 안정적.
    """
    import datetime as _dt
    import hashlib

    keys = list(_STRUCTURE_DIRECTIVES.keys())
    h = int(hashlib.md5((keyword or "").encode("utf-8")).hexdigest(), 16)
    idx = (h + _dt.date.today().timetuple().tm_yday) % len(keys)
    return keys[idx]


# Round 82 — 변주 레이어. 같은 아키타입이라도 도입부·어조·표현이 매번 달라지도록.
#   아키타입(결정적) × 변주(랜덤) → 누적 발행물의 '템플릿 느낌' 제거.
_OPENING_STYLES = [
    "핵심 결론을 한 문장으로 먼저 제시한 뒤 근거를 푸는 역피라미드식",
    "독자가 흔히 하는 고민·질문을 던지며 공감으로 여는 방식",
    "왜 지금 이 주제가 중요한지(최근 관심 맥락)로 시작하는 방식",
    "흔한 오해를 먼저 짚고 바로잡으며 시작하는 방식",
    "구체적인 상황·장면을 짧게 묘사한 뒤 본론으로 들어가는 방식",
]
_TONE_HINTS = [
    "신뢰감 있는 전문가 톤(과장·단정 없이 근거 중심)",
    "친근하고 쉬운 설명체(어려운 용어는 풀어서)",
    "차분히 안내하는 상담 톤",
    "데이터·근거를 앞세운 분석적 톤",
]


def _build_variation_block(seed: int | None = None) -> str:
    """이번 발행물만의 도입부·어조 + 반복 방지 지침. 매 호출 랜덤 → 획일화 차단.

    Round 144 (2026-08-02) — `seed` 인자 추가.
      A/B 테스트에서 이 랜덤 변주가 **양 팔 모두에** 들어가 처치보다 큰 교란이
      됐고, 표본 1쌍으로는 원리적으로 효과 분리가 불가능했음(실측: 6건 전부
      0 vs 0, 제목 차이는 쉼표/동사 1개). A/B 경로는 동일 seed 를 넘겨
      변주를 통제변인으로 고정한다. 일반 발행은 seed=None (기존 랜덤 유지).
    """
    import random

    rng = random.Random(seed) if seed is not None else random
    opening = rng.choice(_OPENING_STYLES)
    tone = rng.choice(_TONE_HINTS)
    return (
        "[이번 글의 변주 — 매 발행물을 다르게]\n"
        f"- 도입부 방식: {opening}.\n"
        f"- 어조: {tone}.\n"
        "- 소제목(H2)은 'OOO이란?', 'OOO 장점' 같은 정형 틀 반복을 피하고 자연어로 다양하게.\n"
        "- 문단 길이를 균일하게 하지 말 것(짧은 문단·긴 문단을 섞어 사람이 쓴 리듬으로).\n"
        "- 섹션 순서·예시·표현을 이번 글만의 방식으로 구성(직전 글과 비슷해 보이지 않게)."
    )


def generate_blog_post(
    session: Session,
    tenant_id: int,
    keyword: str,
    *,
    reference_urls: Optional[list[str]] = None,
    images: Optional[list[ImageSlot]] = None,
    target_chars: int = 2000,
    max_corrections: int = 3,
    provider: Optional[LLMProvider] = None,
    angle: str = "",
    save: bool = True,
    use_rag: bool = True,
    rag_k: int = 5,
    include_cta: bool = True,
    cta_utm_campaign: Optional[str] = None,
    apply_insights: bool = True,
    lang: str = "ko",
    market: str = "domestic",
    variation_seed: Optional[int] = None,
) -> BlogResult:
    """키워드 + (선택) 참조 URL + (선택) 이미지 → SEO 친화적 블로그 post.

    images는 src/alt/caption/after_section 정보. LLM이 alt/after_section을
    제안하면 호출 측에서 src를 채워 BlogPost에 매핑.
    """
    tenant = session.get(Tenant, tenant_id)
    if tenant is None:
        raise ValueError(f"tenant {tenant_id} not found.")

    check_daily_budget(session, tenant_id)
    _check_daily_usd_budget(session, tenant_id)

    # Phase 3b — 해외(비 ko) 자동발행 언어분기.
    #   국내(ko)는 완전 무변경. 해외는 LLM 에 네이티브 언어 생성 지시를 angle 로 주입
    #   (provider 4곳 미변경 — angle 은 이미 user 프롬프트에 실림). transcreation=번역 아님.
    if lang and lang != "ko":
        _lang_name = {
            "en": "English",
            "ja": "Japanese (日本語)",
            "zh-Hant": "Traditional Chinese (繁體中文)",
            "zh-Hans": "Simplified Chinese (简体中文)",
        }.get(lang, lang)
        # §5 언어별 트랜스크리에이션 스타일 (.planning/overseas-seo-geo-content-routine.md)
        _lang_style = {
            "en": "Tone: practical and transparent. Emphasize English-language support, itemized KRW pricing, and clear booking steps; cite verifiable facts (device names, FDA-clearance years) without efficacy guarantees.",
            "ja": "文体は丁寧な です・ます 調。安心・安全・ダウンタイム・アフターケアを重視し、手順を丁寧に説明する。過度な最上級表現は避け、料金は明確に示す。",
            "zh-Hans": "语气以结果与口碑为导向，注重性价比、设备/成分与预约便利；避免疗效保证等夸大表述（医疗广告合规）。",
            "zh-Hant": "語氣以結果與口碑為導向，注重性價比、設備與預約便利；避免療效保證等誇大表述。",
        }.get(lang, "")
        _lang_directive = (
            f"OUTPUT LANGUAGE: Write the ENTIRE article natively in {_lang_name}, "
            f"for foreign patients considering medical treatment in Korea. Do NOT use Korean. "
            f"Localize tone, examples and culture for that audience (transcreation, not translation). "
            f"Keep clinic and medical facts accurate; avoid unverified efficacy guarantees. "
            f"{_lang_style}"
        )
        angle = _lang_directive + ("\n\n" + angle if angle else "")

    if provider is None:
        # Round 84 (2026-06-28) — LLM 라우팅 옵션 (b):
        #   자사글 → Claude 우선 (깊이/문장력), 파트너글 → Gemini 우선 (속도/비용)
        #   tenant.business_model='self' 또는 partner_slug='medimap-self' = 자사
        _bm = (getattr(tenant, "business_model", "") or "").strip().lower()
        _ps = (getattr(tenant, "partner_slug", "") or "").strip().lower()
        _is_self = _bm == "self" or _ps == "medimap-self"
        _prefer = "anthropic" if _is_self else "gemini"
        logger.info("blog.llm_routing", tenant_id=tenant_id, is_self=_is_self, prefer=_prefer)
        provider = get_provider(prefer=_prefer)

    # 1. References fetch
    references: list[Reference] = []
    if reference_urls:
        clean_urls = [u.strip() for u in reference_urls if u and u.strip()]
        if clean_urls:
            logger.info("blog.fetching_references", count=len(clean_urls))
            references = fetch_many(clean_urls)
            logger.info("blog.fetched", got=len(references))

    references_block = references_to_context_block(references) if references else ""

    # 활성 의사/장비/이벤트 → LLM 컨텍스트 블록
    base_tenant_data = build_tenant_context_block(session, tenant_id)

    # Phase 3 RAG retrieval — keyword 로 인덱싱된 청크 가져와서 references_block 에 보강
    rag_block, cited_ids = _build_rag_context(
        session, tenant_id, keyword, use_rag=use_rag, rag_k=rag_k
    )
    if rag_block:
        # 기존 fetch references 와 RAG references 를 한 블록으로 합침
        references_block = (
            f"{references_block}\n\n{rag_block}".strip() if references_block else rag_block
        )

    # Round 38 Phase 2 (2026-05-31) — learned_insights 카테고리별 가이드 주입.
    # /admin/competitors 의 도메인 분석 → /admin/learned-insights 에서 [적용중] 표시된 인사이트만.
    # 빈 카테고리면 가이드 없음 (개념상 noop).
    # Round 81 (2026-06-23) — apply_insights 게이트 추가. 이 경로가 게이트 없이 항상 주입돼
    #   A/B 베이스라인(A, apply_insights=False)까지 오염시켜 A/B 차이를 무의미하게 만들던 버그 수정.
    if apply_insights:
        try:
            from src.content.learned_insights_loader import get_guidance_for_category
            guidance = get_guidance_for_category(tenant.domain_category)
            if guidance:
                references_block = (
                    f"{references_block}\n\n{guidance}".strip() if references_block else guidance
                )
                logger.info("blog.learned_guidance_injected", category=tenant.domain_category, len=len(guidance))
        except Exception as e:  # noqa: BLE001
            logger.warning("blog.learned_guidance_load_failed", error=str(e))

    # Round 71 (2026-06-22) — 테넌트별 '적용중' 학습 인사이트 주입 (Phase 2 실연결).
    #   /admin/learned-insights 에서 [적용중] 표시한 applied_insights 가 실제 발행 prompt 에 반영됨.
    #   apply_insights=False (A/B 변형 A=베이스라인) 이면 주입 생략.
    if apply_insights:
        try:
            from src.content.applied_insights_loader import load_applied_insights_block
            applied_block = load_applied_insights_block(tenant_id)
            if applied_block:
                references_block = (
                    f"{references_block}\n\n{applied_block}".strip()
                    if references_block
                    else applied_block
                )
                logger.info(
                    "blog.applied_insights_injected", tenant_id=tenant_id, len=len(applied_block)
                )
        except Exception as e:  # noqa: BLE001
            logger.warning("blog.applied_insights_load_failed", error=str(e))

    # Round 81→82 — 리치 구조(7종) + 변주 레이어 주입. references_block 에 디렉티브 주입
    #   (provider 스레딩 불필요). 베이스 AEO 프롬프트의 표/정의문/이미지 요건 위에 형태만 다르게.
    #   아키타입(결정적) + 변주(랜덤 도입부·어조·반복방지) → 누적 발행물의 획일화 차단.
    _structure_type = _pick_structure_type(keyword)
    _structure_directive = _STRUCTURE_DIRECTIVES.get(_structure_type, "")
    _variation_block = _build_variation_block(variation_seed)
    # 해외(lang != ko)만 아키타입 골격 주입 — 국내는 완전 무변경.
    _overseas_directive = _OVERSEAS_ARCHETYPE_DIRECTIVE if (lang and lang != "ko") else ""
    # Round 162 (2026-08-16) — 검증된 NAP 주입 (지도 축).
    #   'Getting there' 를 모델 기억이 아니라 DB 원본(tenants.name_en/address_en/...)으로
    #   쓰게 한다 — GBP 표기와 글자 단위 일치(경쟁사 growly 분석: NAP 인용 일관성이
    #   Gemini 'Grounding with Google Maps' 매칭의 재료). 값 없으면 블록 생략(무회귀).
    _nap_directive = ""
    if lang and lang != "ko":
        try:
            from sqlalchemy import text as _sql_text
            _nap_row = session.execute(
                _sql_text(
                    "SELECT name_en, address_en, transit_en, phone FROM tenants WHERE id = :tid"
                ),
                {"tid": tenant_id},
            ).fetchone()
            if _nap_row and (_nap_row[0] or _nap_row[1]):
                _nap_lines = ["VERIFIED CLINIC NAP (use these strings EXACTLY, verbatim — do not rewrite):"]
                if _nap_row[0]:
                    _nap_lines.append(f"- Clinic name (as on Google Maps): {_nap_row[0]}")
                if _nap_row[1]:
                    _nap_lines.append(f"- Address (as on Google Maps): {_nap_row[1]}")
                if _nap_row[2]:
                    _nap_lines.append(f"- Getting there: {_nap_row[2]}")
                if _nap_row[3]:
                    _nap_lines.append(f"- Phone: {_nap_row[3]}")
                _nap_lines.append(
                    "Use these in the 'Getting there' section and anywhere the clinic is named. "
                    "Never invent an address, floor, station, or phone number."
                )
                _nap_directive = "\n".join(_nap_lines)
        except Exception:  # noqa: BLE001
            _nap_directive = ""
    # Round 165 (2026-08-18) — 내부 링크 디렉티브 (토픽 클러스터).
    #   같은 테넌트·같은 언어의 기존 발행 글 목록(실제 URL)을 주고, 본문 흐름에 맞는
    #   컨텍스트 내부 링크 2개 내외를 넣게 한다. URL 은 목록 밖 생성 금지(할루시네이션 차단).
    #   효과: 세션당 페이지뷰·체류 ↑ + 검색/AI 크롤러에 사이트 토픽 구조 신호.
    #   글이 아직 없으면 블록 생략(무회귀). 실패해도 생성은 계속(graceful).
    _internal_links_directive = ""
    try:
        from sqlalchemy import text as _sql_text_il
        _il_lang = (lang or "ko").strip() or "ko"
        _lp = {"en": "en", "ja": "ja", "zh-Hans": "zh", "zh-Hant": "tw"}.get(_il_lang)
        _il_rows = session.execute(
            _sql_text_il(
                "SELECT g.title, g.slug, g.is_partner_content, g.partner_category, t.partner_slug "
                "FROM generated_contents g JOIN tenants t ON t.id = g.tenant_id "
                "WHERE g.tenant_id = :tid AND g.lang = :lang AND g.status = 'published' "
                "AND g.channel = 'blog_html' AND g.slug IS NOT NULL "
                "ORDER BY g.published_at DESC NULLS LAST LIMIT 6"
            ),
            {"tid": tenant_id, "lang": _il_lang},
        ).fetchall()
        _il_links: list[str] = []
        # Round 173b — 같은 목록을 프롬프트용 문자열과 사후 검증용 구조체 두 벌로 만든다.
        #   프롬프트만으로는 안 지켜졌다: 발행된 ko 파트너 234편 중 2세그먼트 깨진 링크 45건,
        #   정상 4세그먼트 7건, 나머지 182편은 내부 링크 자체가 없었다.
        from src.content.internal_links import LinkCandidate as _LinkCandidate
        _il_candidates: list[_LinkCandidate] = []
        for _il_title, _il_slug, _il_partner, _il_pcat, _il_pslug in _il_rows:
            if not _il_slug or not _il_title:
                continue
            if _il_lang != "ko":
                if not _lp:
                    continue
                if _il_partner and _il_pcat and _il_pslug:
                    _il_url = f"https://wecircle.co.kr/{_lp}/clinics/{_il_pcat}/{_il_pslug}/{_il_slug}"
                else:
                    _il_url = f"https://wecircle.co.kr/{_lp}/guides/{_il_slug}"
            else:
                if _il_partner and _il_pcat and _il_pslug:
                    _il_url = f"https://wecircle.co.kr/with-partners/{_il_pcat}/{_il_pslug}/{_il_slug}"
                else:
                    _il_url = f"https://wecircle.co.kr/blog/{_il_slug}"
            _il_links.append(f"- {_il_title}: {_il_url}")
            _il_candidates.append(
                _LinkCandidate(
                    title=str(_il_title),
                    slug=str(_il_slug),
                    path=_il_url.replace("https://wecircle.co.kr", "", 1),
                )
            )
        if _il_links:
            if _il_lang != "ko":
                _internal_links_directive = (
                    "[Internal links - recommended]\n"
                    "Below are this clinic's previously published articles. Where the flow is "
                    "natural, add about 2 contextual internal links in the body as "
                    "<a href=\"URL\">natural anchor text</a>. NEVER invent a URL that is not in "
                    "this list. If none fit naturally, omit links rather than forcing them.\n"
                    + "\n".join(_il_links)
                )
            else:
                _internal_links_directive = (
                    "[내부 링크 — 권장]\n"
                    "아래는 이 병원의 기존 발행 글 목록입니다. 본문 흐름상 자연스러운 지점 2곳 "
                    "내외에 <a href=\"URL\">자연스러운 앵커 텍스트</a> 형태로 내부 링크를 "
                    "넣으세요. 목록에 없는 URL 을 만들어내는 것은 금지합니다. 어울리는 글이 "
                    "없으면 넣지 않습니다.\n" + "\n".join(_il_links)
                )
    except Exception:  # noqa: BLE001
        _internal_links_directive = ""
        _il_candidates = []

    _combined_directive = "\n\n".join(
        d
        for d in (
            _ANSWER_FIRST_DIRECTIVE,  # Round 146 — 첫 문단 answer-first (가장 앞에)
            _structure_directive,
            _STATS_ENFORCE_DIRECTIVE,
            _SERP_PROVEN_DIRECTIVE,  # Round 146-B — 상위 5사 실측 구조 (국내/해외 공용)
            _overseas_directive,
            _nap_directive,  # Round 162 — 검증된 NAP (지도 축)
            _internal_links_directive,  # Round 165 — 내부 링크 (토픽 클러스터)
            _variation_block,
        )
        if d
    )
    if _combined_directive:
        references_block = (
            f"{_combined_directive}\n\n{references_block}".strip()
            if references_block
            else _combined_directive
        )
        logger.info("blog.structure_type", keyword=keyword, structure=_structure_type)

    tenant_data_block = base_tenant_data

    image_count = len(images) if images else 0

    correction_hint: Optional[str] = None
    correction_history: list[ComplianceReport] = []
    last_result: Optional[BlogGenerationResult] = None
    last_report: Optional[ComplianceReport] = None
    last_post: Optional[BlogPost] = None
    iterations = 0

    for attempt in range(max_corrections + 1):
        iterations = attempt
        logger.info(
            "blog.attempt",
            tenant_id=tenant_id,
            keyword=keyword,
            attempt=attempt,
            provider=provider.name,
            n_refs=len(references),
            n_images=image_count,
        )
        try:
            last_result = provider.generate_blog_post(
                keyword=keyword,
                tenant_name=tenant.name,
                tenant_category=tenant.domain_category,
                tenant_region=tenant.region,
                tenant_address=tenant.address or "",
                tenant_naver_place_url=tenant.naver_place_url or "",
                tenant_homepage=tenant.homepage or "",
                tenant_phone=tenant.phone or "",
                references_block=references_block,
                tenant_data_block=tenant_data_block,
                image_count=image_count,
                target_chars=target_chars,
                angle=angle,
                correction_hint=correction_hint,
            )
        except LLMError as e:
            # Round 81 — provider 호출/JSON 파싱 실패(예: Gemini 429 폴백 → Claude malformed JSON).
            #   재시도 기회가 남았으면 다음 attempt 로(Claude 가 valid JSON 낼 확률↑). 소진 시 raise.
            logger.warning("blog.provider_error_retry", attempt=attempt, error=str(e)[:200])
            if attempt < max_corrections:
                continue
            raise
        _bit, _bot = getattr(provider, "_last_usage", (0, 0))  # Round 81 — 실토큰 미터링
        _log_llm_call(
            session, tenant_id,
            provider=last_result.provider, model=last_result.provider,
            channel="blog_html", keyword=keyword,
            input_tokens=_bit, output_tokens=_bot,
        )
        # LLM이 제안한 image 메타와 사용자 업로드 src를 매핑
        post_dict = dict(last_result.post_dict)
        llm_images = post_dict.get("images") or []
        merged_images: list[ImageSlot] = []
        if images:
            for i, user_img in enumerate(images):
                # LLM이 제안한 메타가 있으면 alt/after_section/caption 채택
                meta = llm_images[i] if i < len(llm_images) else {}
                alt = (meta.get("alt") or "").strip() or user_img.alt
                caption = (meta.get("caption") or "").strip() or user_img.caption
                after = int(meta.get("after_section") or user_img.after_section or (i + 1))
                merged_images.append(
                    ImageSlot(
                        src=user_img.src,
                        alt=alt or f"이미지 {i + 1}",
                        caption=caption,
                        after_section=after,
                    )
                )
        # references는 fetch한 URL을 자동으로 channel에 넣어줌
        if references and not post_dict.get("references"):
            post_dict["references"] = [r.url for r in references]
        # 네이버 플레이스 URL은 references에도 자동 추가 (LLM이 누락 시)
        if tenant.naver_place_url and tenant.naver_place_url not in (post_dict.get("references") or []):
            existing = post_dict.get("references") or []
            existing.append(tenant.naver_place_url)
            post_dict["references"] = existing
        last_post = post_from_dict(post_dict, images=merged_images)
        # 영업 정보 주입 (렌더 시 위치 블록에 사용)
        last_post.tenant_name = tenant.name
        last_post.tenant_address = tenant.address or ""
        last_post.tenant_naver_place_url = tenant.naver_place_url or ""
        last_post.tenant_phone = tenant.phone or ""
        last_post.tenant_homepage = tenant.homepage or ""

        joined = _join_blog_for_lint(last_post)
        last_report = lint_for_channel(session, tenant_id, "blog_html", joined)
        correction_history.append(last_report)

        # Round 81 — AEO 표 강제. 의료법(compliance) 로직은 그대로 두고, 표 누락 시에만
        #   재시도 힌트를 추가. 끝까지 표가 없어도 발행은 막지 않음(비차단).
        has_table = _post_has_md_table(last_post)
        # Round 173b — 얇은 섹션도 표 누락과 같은 방식으로 비차단 재시도.
        thin = _thin_sections(last_post)

        if last_report.status == "pass" and has_table and not thin:
            logger.info("blog.passed", attempt=attempt, summary=last_report.summary())
            break

        if last_report.status == "pass" and (not has_table or thin):
            if attempt < max_corrections:
                hints = []
                if not has_table:
                    hints.append(_TABLE_HINT)
                if thin:
                    hints.append(_DEPTH_HINT + " / ".join(thin))
                correction_hint = "\n\n".join(hints)
                logger.info(
                    "blog.retry_for_quality",
                    attempt=attempt, no_table=not has_table, thin_sections=len(thin),
                )
                continue
            # 끝까지 못 고쳐도 발행은 막지 않는다 — 컴플라이언스와 달리 품질은 비차단.
            logger.info(
                "blog.quality_accepted",
                attempt=attempt, no_table=not has_table, thin_sections=len(thin),
            )
            break

        if not last_report.has_errors() and last_report.status == "warn":
            if attempt < max_corrections:
                correction_hint = _violations_to_correction_hint(last_report)
                if not has_table:
                    correction_hint = (correction_hint + "\n" + _TABLE_HINT) if correction_hint else _TABLE_HINT
                continue
            logger.info("blog.warn_accepted", attempt=attempt)
            break

        if attempt < max_corrections:
            correction_hint = _violations_to_correction_hint(last_report)
            if not has_table:
                correction_hint = (correction_hint + "\n" + _TABLE_HINT) if correction_hint else _TABLE_HINT
            logger.info("blog.retry", attempt=attempt, summary=last_report.summary())
            continue

        logger.warning("blog.max_corrections_exhausted", summary=last_report.summary())
        break

    assert last_result is not None and last_report is not None and last_post is not None

    body_html = render_body(last_post)

    # Round 173b — 내부 링크 결정적 보정. 프롬프트 준수에 맡기지 않는다.
    #   깨진 내부 링크는 404 → 이미 고갈된 크롤 예산을 더 태우고 링크 자산도 샌다.
    #   sanitize: 알 수 있는 slug 면 정본 경로로 교정, 못 찾으면 <a> 만 벗김(문장 보존).
    #   ensure:   유효 내부 링크가 2개 미만이면 "함께 읽으면 좋은 글" 블록을 붙임.
    #   실패해도 생성은 계속 — 링크 보정 때문에 발행이 막히면 안 된다.
    try:
        if _il_candidates:
            from src.content.internal_links import apply as _apply_links

            body_html, _il_stats = _apply_links(
                body_html, _il_candidates, self_slug=None, min_links=2
            )
            if any(_il_stats.values()):
                logger.info("blog.internal_links", keyword=keyword, **_il_stats)
    except Exception as _il_err:  # noqa: BLE001
        logger.warning("blog.internal_links_failed", error=str(_il_err))

    meta_block = render_meta_block(last_post)
    full_html = render_full_html(last_post)
    naver_plain = render_naver_blog_plain(last_post)

    if include_cta:
        cta_cfg = _build_cta_config_from_tenant(tenant)
        camp = _resolve_cta_campaign(cta_utm_campaign, keyword)
        body_html = append_cta_to_content(
            body_html, "blog_html", cfg=cta_cfg,
            utm_source="own_blog", utm_campaign=camp,
        )
        full_html = append_cta_to_content(
            full_html, "blog_html", cfg=cta_cfg,
            utm_source="own_blog", utm_campaign=camp,
        )
        naver_plain = append_cta_to_content(
            naver_plain, "naver_blog", cfg=cta_cfg,
            utm_source="naver_blog", utm_campaign=camp,
        )

    saved_id = None
    if save:
        gc = GeneratedContent(
            tenant_id=tenant_id,
            keyword_text=keyword,
            channel="blog_html",
            lang=lang,
            market=market,
            body=body_html,
            raw_qa_pairs={
                "title": last_post.title,
                "meta_description": last_post.meta_description,
                "keywords": last_post.keywords,
                "char_count": last_post.total_word_count(),
                "n_sections": len(last_post.sections),
                "n_images": len(last_post.images),
                "references": [r.url for r in references],
            },
            cited_reference_ids=cited_ids or None,
            compliance_status=last_report.status,
            compliance_report=last_report.to_dict(),
            llm_provider=last_result.provider,
            correction_iterations=iterations,
        )
        session.add(gc)
        session.flush()
        saved_id = gc.id
        session.commit()

    return BlogResult(
        post=last_post,
        body_html=body_html,
        full_html=full_html,
        meta_block=meta_block,
        naver_plain=naver_plain,
        references=references,
        compliance=last_report,
        iterations=iterations,
        provider=last_result.provider,
        saved_id=saved_id,
        correction_history=correction_history,
        cited_reference_ids=cited_ids,
    )


# ─── Phase 2-T2.5 — 네이버 블로그 평문 / Instagram 캡션 ──────────


@dataclass
class NaverBlogResult:
    post: NaverBlogPost
    plain_text: str
    compliance: ComplianceReport
    iterations: int
    provider: str
    saved_id: Optional[int]
    correction_history: list[dict] = field(default_factory=list)
    cited_reference_ids: list[int] = field(default_factory=list)


@dataclass
class InstagramResult:
    caption: InstagramCaption
    rendered: str
    compliance: ComplianceReport
    iterations: int
    provider: str
    saved_id: Optional[int]
    char_count: int
    hashtag_count: int
    correction_history: list[dict] = field(default_factory=list)
    cited_reference_ids: list[int] = field(default_factory=list)


def _join_naver_for_lint(post: NaverBlogPost) -> str:
    parts = [post.title]
    parts.extend(post.intro)
    for s in post.sections:
        parts.append(s.heading)
        parts.extend(s.paragraphs)
    parts.extend(post.conclusion)
    return "\n".join(p for p in parts if p)


def _join_instagram_for_lint(cap: InstagramCaption) -> str:
    return "\n".join([cap.hook, cap.body, cap.cta])


def generate_naver_blog_content(
    session: Session,
    tenant_id: int,
    keyword: str,
    *,
    target_chars: int = 2000,
    image_count: int = 0,
    angle: str = "",
    max_corrections: int = 3,
    provider: LLMProvider | None = None,
    save: bool = True,
    use_rag: bool = True,
    rag_k: int = 5,
    include_cta: bool = True,
    cta_utm_campaign: Optional[str] = None,
) -> NaverBlogResult:
    """네이버 블로그 평문 발행 — 자동수정 루프 포함."""
    check_daily_budget(session, tenant_id)
    _check_daily_usd_budget(session, tenant_id)
    provider = provider or get_provider()

    tenant = session.get(Tenant, tenant_id)
    if tenant is None:
        raise ValueError(f"Unknown tenant_id: {tenant_id}")

    base_tenant_data = build_tenant_context_block(session, tenant_id)
    rag_block, cited_ids = _build_rag_context(
        session, tenant_id, keyword, use_rag=use_rag, rag_k=rag_k
    )
    tenant_data_block = _augment_tenant_block(base_tenant_data, rag_block)

    last_post: Optional[NaverBlogPost] = None
    last_report: Optional[ComplianceReport] = None
    last_result: Optional[NaverBlogGenerationResult] = None
    iterations = 0
    correction_hint: Optional[str] = None
    history: list[dict] = []

    for _ in range(max_corrections + 1):
        iterations += 1
        result = provider.generate_naver_blog(
            keyword=keyword,
            tenant_name=tenant.name,
            tenant_category=tenant.domain_category,
            tenant_region=tenant.region,
            tenant_address=tenant.address or "",
            tenant_naver_place_url=tenant.naver_place_url or "",
            tenant_phone=tenant.phone or "",
            tenant_data_block=tenant_data_block,
            image_count=image_count,
            target_chars=target_chars,
            angle=angle,
            correction_hint=correction_hint,
        )
        _log_llm_call(
            session, tenant_id,
            provider=result.provider, model=result.provider,
            channel="naver_blog", keyword=keyword,
        )
        last_result = result
        post = naver_from_dict(
            result.post_dict,
            tenant_name=tenant.name,
            tenant_address=tenant.address or "",
            tenant_naver_place_url=tenant.naver_place_url or "",
            tenant_phone=tenant.phone or "",
        )
        last_post = post

        text = _join_naver_for_lint(post)
        report = lint_for_channel(session, tenant_id, "naver_blog", text)
        last_report = report
        history.append({"iteration": iterations, "status": report.status, "n_violations": len(report.violations)})

        if report.status == "pass" or report.status == "warn":
            break
        correction_hint = _violations_to_correction_hint(report)

    assert last_post is not None and last_report is not None and last_result is not None
    plain = render_naver_plain(last_post)

    if include_cta:
        tenant = session.get(Tenant, tenant_id)
        if tenant is not None:
            cta_cfg = _build_cta_config_from_tenant(tenant)
            camp = _resolve_cta_campaign(cta_utm_campaign, keyword)
            plain = append_cta_to_content(
                plain, "naver_blog", cfg=cta_cfg,
                utm_source="naver_blog", utm_campaign=camp,
            )

    saved_id = None
    if save:
        gc = GeneratedContent(
            tenant_id=tenant_id,
            keyword_text=keyword,
            channel="naver_blog",
            body=plain,
            raw_qa_pairs={
                "title": last_post.title,
                "char_count": last_post.char_count(),
                "n_sections": len(last_post.sections),
                "hashtags": last_post.hashtags,
                "image_count": last_post.image_count,
            },
            cited_reference_ids=cited_ids or None,
            compliance_status=last_report.status,
            compliance_report=last_report.to_dict(),
            llm_provider=last_result.provider,
            correction_iterations=iterations - 1,
        )
        session.add(gc)
        session.commit()
        saved_id = gc.id

    return NaverBlogResult(
        post=last_post,
        plain_text=plain,
        compliance=last_report,
        iterations=iterations,
        provider=last_result.provider,
        saved_id=saved_id,
        correction_history=history,
        cited_reference_ids=cited_ids,
    )


def generate_instagram_content(
    session: Session,
    tenant_id: int,
    keyword: str,
    *,
    angle: str = "",
    max_corrections: int = 3,
    provider: LLMProvider | None = None,
    save: bool = True,
    use_rag: bool = True,
    rag_k: int = 5,
    include_cta: bool = True,
    cta_utm_campaign: Optional[str] = None,
) -> InstagramResult:
    """Instagram 캡션 발행 — 자동수정 루프 포함. body 200~300자 + 해시태그 5~10."""
    check_daily_budget(session, tenant_id)
    _check_daily_usd_budget(session, tenant_id)
    provider = provider or get_provider()

    tenant = session.get(Tenant, tenant_id)
    if tenant is None:
        raise ValueError(f"Unknown tenant_id: {tenant_id}")

    base_tenant_data = build_tenant_context_block(session, tenant_id)
    rag_block, cited_ids = _build_rag_context(
        session, tenant_id, keyword, use_rag=use_rag, rag_k=rag_k
    )
    tenant_data_block = _augment_tenant_block(base_tenant_data, rag_block)

    last_cap: Optional[InstagramCaption] = None
    last_report: Optional[ComplianceReport] = None
    last_result: Optional[InstagramGenerationResult] = None
    iterations = 0
    correction_hint: Optional[str] = None
    history: list[dict] = []

    for _ in range(max_corrections + 1):
        iterations += 1
        result = provider.generate_instagram(
            keyword=keyword,
            tenant_name=tenant.name,
            tenant_category=tenant.domain_category,
            tenant_region=tenant.region,
            tenant_data_block=tenant_data_block,
            angle=angle,
            correction_hint=correction_hint,
        )
        _log_llm_call(
            session, tenant_id,
            provider=result.provider, model=result.provider,
            channel="instagram", keyword=keyword,
        )
        last_result = result
        cap = instagram_from_dict(result.caption_dict)
        last_cap = cap

        text = _join_instagram_for_lint(cap)
        report = lint_for_channel(session, tenant_id, "instagram", text)
        last_report = report
        history.append({"iteration": iterations, "status": report.status, "n_violations": len(report.violations)})

        if report.status == "pass" or report.status == "warn":
            break
        correction_hint = _violations_to_correction_hint(report)

    assert last_cap is not None and last_report is not None and last_result is not None
    rendered = render_instagram_caption(last_cap)
    len_ok, char_count = ig_validate_length(last_cap)
    tag_ok, tag_count = ig_validate_hashtags(last_cap)

    if include_cta:
        cta_cfg = _build_cta_config_from_tenant(tenant)
        camp = _resolve_cta_campaign(cta_utm_campaign, keyword)
        rendered = append_cta_to_content(
            rendered, "instagram", cfg=cta_cfg,
            utm_source="instagram", utm_campaign=camp,
        )

    saved_id = None
    if save:
        gc = GeneratedContent(
            tenant_id=tenant_id,
            keyword_text=keyword,
            channel="instagram",
            body=rendered,
            raw_qa_pairs={
                "hook": last_cap.hook,
                "body": last_cap.body,
                "cta": last_cap.cta,
                "hashtags": last_cap.hashtags,
                "char_count": char_count,
                "length_ok": len_ok,
                "hashtag_count_ok": tag_ok,
            },
            cited_reference_ids=cited_ids or None,
            compliance_status=last_report.status,
            compliance_report=last_report.to_dict(),
            llm_provider=last_result.provider,
            correction_iterations=iterations - 1,
        )
        session.add(gc)
        session.commit()
        saved_id = gc.id

    return InstagramResult(
        caption=last_cap,
        rendered=rendered,
        compliance=last_report,
        iterations=iterations,
        provider=last_result.provider,
        saved_id=saved_id,
        char_count=char_count,
        hashtag_count=tag_count,
        correction_history=history,
        cited_reference_ids=cited_ids,
    )
