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
from src.storage.models import GeneratedContent, LlmCallLog, Tenant

logger = structlog.get_logger(__name__)


@dataclass
class ContentResult:
    qa_pairs: list[FAQPair]
    json_ld_script: str
    compliance: ComplianceReport
    iterations: int
    provider: str
    saved_id: Optional[int] = None
    correction_history: list[ComplianceReport] = field(default_factory=list)

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
) -> ContentResult:
    """키워드 → FAQ 생성 → 의료법 린트 → 자동수정 루프 → JSON-LD."""
    tenant = session.get(Tenant, tenant_id)
    if tenant is None:
        raise ValueError(f"tenant {tenant_id} not found. scripts/init_db.py 먼저 실행.")

    check_daily_budget(session, tenant_id)
    _check_daily_usd_budget(session, tenant_id)

    if provider is None:
        provider = get_provider()

    # 활성 의사/장비/이벤트 → LLM 컨텍스트 블록
    tenant_data_block = build_tenant_context_block(session, tenant_id)

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
            raw_qa_pairs={"pairs": [{"q": p.question, "a": p.answer} for p in last_result.qa_pairs]},
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

    if provider is None:
        provider = get_provider()

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
    tenant_data_block = build_tenant_context_block(session, tenant_id)

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
        _log_llm_call(
            session, tenant_id,
            provider=last_result.provider, model=last_result.provider,
            channel="blog_html", keyword=keyword,
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

        if last_report.status == "pass":
            logger.info("blog.passed", attempt=attempt, summary=last_report.summary())
            break

        if not last_report.has_errors() and last_report.status == "warn":
            if attempt < max_corrections:
                correction_hint = _violations_to_correction_hint(last_report)
                continue
            logger.info("blog.warn_accepted", attempt=attempt)
            break

        if attempt < max_corrections:
            correction_hint = _violations_to_correction_hint(last_report)
            logger.info("blog.retry", attempt=attempt, summary=last_report.summary())
            continue

        logger.warning("blog.max_corrections_exhausted", summary=last_report.summary())
        break

    assert last_result is not None and last_report is not None and last_post is not None

    body_html = render_body(last_post)
    meta_block = render_meta_block(last_post)
    full_html = render_full_html(last_post)
    naver_plain = render_naver_blog_plain(last_post)

    saved_id = None
    if save:
        gc = GeneratedContent(
            tenant_id=tenant_id,
            keyword_text=keyword,
            channel="blog_html",
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
            cited_reference_ids=None,
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
) -> NaverBlogResult:
    """네이버 블로그 평문 발행 — 자동수정 루프 포함."""
    check_daily_budget(session, tenant_id)
    _check_daily_usd_budget(session, tenant_id)
    provider = provider or get_provider()

    tenant = session.get(Tenant, tenant_id)
    if tenant is None:
        raise ValueError(f"Unknown tenant_id: {tenant_id}")

    tenant_data_block = build_tenant_context_block(session, tenant_id)

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
            cited_reference_ids=None,
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
) -> InstagramResult:
    """Instagram 캡션 발행 — 자동수정 루프 포함. body 200~300자 + 해시태그 5~10."""
    check_daily_budget(session, tenant_id)
    _check_daily_usd_budget(session, tenant_id)
    provider = provider or get_provider()

    tenant = session.get(Tenant, tenant_id)
    if tenant is None:
        raise ValueError(f"Unknown tenant_id: {tenant_id}")

    tenant_data_block = build_tenant_context_block(session, tenant_id)

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
            cited_reference_ids=None,
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
    )
