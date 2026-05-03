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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

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
