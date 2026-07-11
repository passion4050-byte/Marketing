"""SQLAlchemy ORM models. 정의서 §3 — 멀티테넌트 사전 반영.

Phase 1에서는 Tenant, ComplianceRule, GeneratedContent만 사용.
나머지(Keyword, Competitor, Query, Response, Mention, ReferenceDocument)는
Phase 2~6에서 추가하지만, 스키마는 처음부터 함께 정의해 마이그레이션 부담을 줄인다.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ─── Tenant ─────────────────────────────────────────────────────


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    domain_category: Mapped[str] = mapped_column(String(100))
    region: Mapped[str] = mapped_column(String(100))
    business_model: Mapped[str] = mapped_column(Text, default="")
    address: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    naver_place_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    homepage: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    password_set_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    # Round 83 (2026-06-28) — 상품 옵션별 발행 정책.
    # A: 주 3회 (월/수/금) 기본 · B: 매일 1편 프리미엄.
    # CHECK 제약은 Supabase 마이그레이션에서 ('A','B') 만 허용.
    publish_plan: Mapped[str] = mapped_column(String(2), default="A")

    keywords: Mapped[list["Keyword"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    compliance_rules: Mapped[list["ComplianceRule"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    generated_contents: Mapped[list["GeneratedContent"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    doctors: Mapped[list["Doctor"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    equipment: Mapped[list["Equipment"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    event_offers: Mapped[list["EventOffer"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    brand_voice: Mapped[Optional["BrandVoice"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan", uselist=False
    )
    reference_documents: Mapped[list["ReferenceDocument"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )


# ─── Keyword (Phase 1에서 sample 1개 시드. 본격 사용은 Phase 4) ─


class Keyword(Base):
    __tablename__ = "keywords"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(100), default="")
    target_brand: Mapped[str] = mapped_column(String(200), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Phase A — 측정 언어/시장 스코프. 기존 행은 ko/domestic (측정 언어분기 구동).
    lang: Mapped[str] = mapped_column(String(16), default="ko")
    market: Mapped[str] = mapped_column(String(16), default="domestic")

    tenant: Mapped[Tenant] = relationship(back_populates="keywords")


# ─── Compliance (Phase 1 핵심) ──────────────────────────────────


class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    rule_type: Mapped[str] = mapped_column(String(50))  # forbidden_word | required_disclaimer | pattern
    pattern: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20))  # error | warning | info
    message: Mapped[str] = mapped_column(Text)
    requires: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    tenant: Mapped[Tenant] = relationship(back_populates="compliance_rules")


# ─── Generated Content (Phase 1 핵심) ───────────────────────────


class GeneratedContent(Base):
    __tablename__ = "generated_contents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    keyword_text: Mapped[str] = mapped_column(String(500))  # Phase 1: keyword_id 대신 text. Phase 2에서 FK 추가.
    channel: Mapped[str] = mapped_column(String(50))  # schema_org | blog_html | naver_blog | instagram
    body: Mapped[str] = mapped_column(Text)
    raw_qa_pairs: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # FAQ Q&A 원본
    cited_reference_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    compliance_status: Mapped[str] = mapped_column(String(20))  # pass | warn | fail
    compliance_report: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    llm_provider: Mapped[str] = mapped_column(String(20), default="stub")
    correction_iterations: Mapped[int] = mapped_column(Integer, default=0)
    # Phase 6.5 — published | draft (자동 생성 큐). 기본값은 published (수동 발행).
    status: Mapped[str] = mapped_column(String(20), default="published")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # Round 25 (2026-05-29): /blog 자사 인사이트 분류 컬럼 ORM 매핑 추가.
    # DB 컬럼은 Migration 010 에 이미 있었으나 ORM 클래스에 누락돼 있어 scheduler.py 의
    # _map_blog_category() 자동 매핑이 DB UPDATE 에 반영되지 않던 버그 해결.
    # posts.ts BLOG_CATEGORY_SLUGS: content_marketing | ai_trend | hospital_marketing
    blog_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    # Phase 3 — 콘텐츠 언어/시장 스코프 (자동발행 언어분기 + 대시보드 필터). 기존 ko/domestic.
    lang: Mapped[str] = mapped_column(String(16), default="ko")
    market: Mapped[str] = mapped_column(String(16), default="domestic")

    tenant: Mapped[Tenant] = relationship(back_populates="generated_contents")


# ─── Data Feeding (Phase 1.5+) — 구조화 비즈니스 정보 ──────────


class Doctor(Base):
    """의사 자격 정보 — 콘텐츠에 실제 의사명/경력으로 인용되도록."""

    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))                   # 예: 김시력
    specialty: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # 예: 라식/라섹 전문의
    education_career: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 예: 연세대 의대... 시력교정술 15년 경력
    certifications: Mapped[Optional[str]] = mapped_column(Text, nullable=True)    # 예: 안과 전문의, 굴절교정 전문의
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant: Mapped[Tenant] = relationship(back_populates="doctors")

    @property
    def is_complete(self) -> bool:
        """모든 핵심 필드가 채워져 있으면 '최적화됨'."""
        return bool(self.name and self.specialty and self.education_career)


class Equipment(Base):
    """의료 장비 — 콘텐츠가 실제 장비 모델명을 언급하도록."""

    __tablename__ = "equipment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200))                    # 예: 아마리스 레드 1050RS
    manufacturer: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # 예: SCHWIND
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)          # 장비 설명
    features: Mapped[Optional[str]] = mapped_column(Text, nullable=True)             # 주요 기능 (콤마 구분 또는 자유)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant: Mapped[Tenant] = relationship(back_populates="equipment")

    @property
    def is_complete(self) -> bool:
        return bool(self.name and self.manufacturer and self.description)


class EventOffer(Base):
    """진행 중인 이벤트/프로모션 — 콘텐츠 끝에 자연 노출 + 의료법 종료일 자동 체크."""

    __tablename__ = "event_offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200))                    # 예: 스마일 라식 특별 할인
    regular_price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)   # 원 단위
    discount_price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 원 단위
    period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)              # 조건/유의사항
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant: Mapped[Tenant] = relationship(back_populates="event_offers")

    @property
    def is_complete(self) -> bool:
        return bool(self.name and self.period_start and self.period_end)

    def is_currently_running(self, now: Optional[datetime] = None) -> bool:
        """오늘이 이벤트 기간 안에 있나? 콘텐츠에 노출할지 판단용.

        SQLite는 timezone 정보 없이 datetime을 저장하므로 양쪽 모두 naive로 정렬해 비교.
        """
        if not self.is_active or not self.period_start or not self.period_end:
            return False
        n = now or _now()
        ps = self.period_start.replace(tzinfo=None) if self.period_start.tzinfo else self.period_start
        pe = self.period_end.replace(tzinfo=None) if self.period_end.tzinfo else self.period_end
        nn = n.replace(tzinfo=None) if n.tzinfo else n
        return ps <= nn <= pe


# ─── Brand Voice (persona.png) ──────────────────────────────────


class BrandVoice(Base):
    """톤/핵심 가치/커뮤니케이션 스타일 — LLM 시스템 프롬프트에 자동 주입."""

    __tablename__ = "brand_voices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), unique=True)
    tone: Mapped[str] = mapped_column(String(50), default="전문적")  # 전문적 | 친근함 | 간결함 | 상세함
    vision: Mapped[Optional[str]] = mapped_column(Text, nullable=True)            # 비전
    mission: Mapped[Optional[str]] = mapped_column(Text, nullable=True)           # 미션
    core_values: Mapped[Optional[str]] = mapped_column(Text, nullable=True)       # 핵심 가치
    style_guide: Mapped[Optional[str]] = mapped_column(Text, nullable=True)       # 안내문/매뉴얼 스타일
    formality: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)   # 격식 (실어 / 100% 보임 등)
    forbidden_words: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # 금지 단어 (콤마)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant: Mapped[Tenant] = relationship(back_populates="brand_voice")

    def to_prompt_block(self) -> str:
        """LLM system prompt 부록으로 들어갈 톤 가이드."""
        if not (self.tone or self.vision or self.mission or self.core_values or self.style_guide):
            return ""
        lines = ["[브랜드 보이스]"]
        if self.tone:
            tone_desc = {
                "전문적": "신뢰성 있고 정확한 어조. 의료진 입장에서 정중하게.",
                "친근함": "따뜻하고 편안한 어조. 1인칭 \"저희\" 자주 사용.",
                "간결함": "핵심만 빠르게. 짧은 문장 위주.",
                "상세함": "자세하고 구체적. 단계별 설명 포함.",
            }.get(self.tone, "")
            lines.append(f"- 응답 톤: {self.tone} ({tone_desc})")
        if self.vision:
            lines.append(f"- 비전: {self.vision}")
        if self.mission:
            lines.append(f"- 미션: {self.mission}")
        if self.core_values:
            lines.append(f"- 핵심 가치: {self.core_values}")
        if self.style_guide:
            lines.append(f"- 커뮤니케이션 스타일: {self.style_guide}")
        if self.forbidden_words:
            lines.append(f"- 금지 단어: {self.forbidden_words}")
        return "\n".join(lines)


# ─── LLM Call Log (Phase 2-T3.2 — 비용 추적) ──────────────────


class LlmCallLog(Base):
    """LLM 호출 1건 로그 — USD 가드레일 + 운영 모니터링용.

    `src/content/generator.py` 가 LLM 호출 직후 1행 INSERT.
    """

    __tablename__ = "llm_call_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    called_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    provider: Mapped[str] = mapped_column(String(20))     # stub | gemini | anthropic | openai
    model: Mapped[str] = mapped_column(String(100))       # 예: gemini-2.5-flash
    channel: Mapped[str] = mapped_column(String(50))      # schema_org | blog_html | naver_blog | instagram
    keyword: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="success")  # success | error | guardrail
    error_msg: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


# ─── Reference Document (Phase 3 RAG 가 사용 — Phase 2 에서 모델만 정의) ──


class ReferenceDocument(Base):
    """외부 참고 문서 (URL/파일/텍스트) — Phase 3 의 RAG 인덱싱이 사용.

    Phase 2 시점엔 모델만 정의. content_hash 로 tenant 격리 중복 방지.
    """

    __tablename__ = "reference_documents"
    __table_args__ = (
        UniqueConstraint("tenant_id", "content_hash", name="uq_refdoc_tenant_hash"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    source_type: Mapped[str] = mapped_column(String(20))  # url | file | text
    source_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content_hash: Mapped[str] = mapped_column(String(64))  # sha256
    raw_text: Mapped[str] = mapped_column(Text)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    indexed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    tenant: Mapped[Tenant] = relationship(back_populates="reference_documents")


# ─── Measurement (Phase 4 — MVP-0) ───────────────────────────────


class Query(Base):
    """검색 엔진 호출 1회 = Query 1행. 같은 키워드의 n=30 샘플은 Query 30행."""

    __tablename__ = "queries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    keyword_id: Mapped[int] = mapped_column(ForeignKey("keywords.id", ondelete="CASCADE"))
    engine: Mapped[str] = mapped_column(String(50))  # perplexity | stub | openai_search | ...
    prompt: Mapped[str] = mapped_column(Text)
    sample_index: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Response(Base):
    """엔진의 raw 응답. text + cited_urls + latency."""

    __tablename__ = "responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    query_id: Mapped[int] = mapped_column(ForeignKey("queries.id", ondelete="CASCADE"))
    raw_text: Mapped[str] = mapped_column(Text)
    cited_urls: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # list[str] 형식
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Mention(Base):
    """Response 본문에서 추출된 브랜드 멘션 1건."""

    __tablename__ = "mentions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    response_id: Mapped[int] = mapped_column(ForeignKey("responses.id", ondelete="CASCADE"))
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    brand: Mapped[str] = mapped_column(String(200))
    is_target: Mapped[bool] = mapped_column(Boolean, default=False)
    is_competitor: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(Integer, default=0)
    weight: Mapped[float] = mapped_column(Float, default=1.0)  # v1=1.0, Phase 5 에서 0~1 가중치
    sentiment: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Phase 6
    context_snippet: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ─── Competitor (Phase 6 — MVP-2) ────────────────────────────────


class AutoContentSetting(Base):
    """자동 콘텐츠 생성 설정 — Phase 6.5.

    매일 활성 키워드 × 채널 조합으로 ``draft`` 상태의 콘텐츠를 자동 생성한다.
    tenant 별 1행 (UNIQUE).
    """

    __tablename__ = "auto_content_settings"
    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_auto_setting_tenant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    daily_count: Mapped[int] = mapped_column(Integer, default=2)  # 1~10
    channels: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # channels: ["schema_org","blog_html","naver_blog","instagram"] subset, default all
    # auto_publish=True 면 의료법 린터 status='pass' 인 콘텐츠는 draft 단계 건너뛰고
    # 즉시 status='published' 로 저장. warn/fail 콘텐츠는 안전하게 draft 로 남김.
    auto_publish: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Competitor(Base):
    """경쟁사 후보 + 확정 마스터 — discover_competitors() 가 후보를 INSERT,
    사용자가 측정 탭에서 승인하면 confirmed=True 로 업데이트된다.

    confirmed=True 인 row 만 분석/share 비교에 사용된다.
    """

    __tablename__ = "competitors"
    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_competitor_tenant_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200))
    aliases: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # list[str]
    discovery_source: Mapped[str] = mapped_column(String(30), default="manual")
    # discovery_source ∈ {manual, ai_response, category_match}
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


# ─── Publication (Phase 6.6 — 발행 추적 + AEO 인용 매칭) ─────────


class Publication(Base):
    """tenant 가 외부 채널에 실제 발행한 콘텐츠 1건.

    GeneratedContent 가 시스템 안의 ``status=draft/published`` 상태였다면,
    Publication 은 "외부 세계에 publish 된 URL" — naver blog/tistory/자사 홈페이지/PR 등.

    ``cited_by_engines`` 가 AEO/GEO 의 진짜 KPI 근거 — 이 URL 이 Response.cited_urls 에
    등장한 이력을 ``analytics.citation.match_publications_to_responses()`` 가 갱신한다.
    """

    __tablename__ = "publications"
    __table_args__ = (
        UniqueConstraint("tenant_id", "url", name="uq_publication_tenant_url"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    generated_content_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("generated_contents.id", ondelete="SET NULL"), nullable=True,
    )
    channel: Mapped[str] = mapped_column(String(50))
    # channel ∈ {naver_blog, tistory, own_blog, naver_place, press_release, youtube, threads, other}
    destination_label: Mapped[str] = mapped_column(String(300), default="")
    url: Mapped[str] = mapped_column(String(1000))
    title: Mapped[str] = mapped_column(String(500), default="")
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cited_by_engines: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # cited_by_engines: [{"engine":"perplexity","first_seen":ISO,"last_seen":ISO,"query_count":N}]
    cite_count: Mapped[int] = mapped_column(Integer, default=0)
    last_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ─── Funnel: 단축링크 (Phase 7-04) ──────────────────────────────


class ShortLink(Base):
    """tenant 가 단축한 링크 (m.medimap.kr/r/{slug} → target_url).

    target_url 은 *공유용 UTM-fied URL* 또는 canonical URL 둘 다 가능. Publication 과의 FK 는
    선택적 — PR 보도자료 등 외부 도메인 링크에도 단축을 적용할 수 있다.
    """

    __tablename__ = "shortlinks"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_shortlink_tenant_slug"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    publication_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("publications.id", ondelete="SET NULL"), nullable=True,
    )
    slug: Mapped[str] = mapped_column(String(120))
    target_url: Mapped[str] = mapped_column(String(2000))
    label: Mapped[str] = mapped_column(String(300), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    click_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now,
    )


class ShortLinkClick(Base):
    """ShortLink redirect 호출 1건. Vercel/redirect 라우트 → SaaS webhook 으로 적재."""

    __tablename__ = "shortlink_clicks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shortlink_id: Mapped[int] = mapped_column(
        ForeignKey("shortlinks.id", ondelete="CASCADE"),
    )
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    clicked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    referer: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    ip_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    # 익명화: ip 자체는 저장하지 않고 SHA-256 해시 prefix 만
