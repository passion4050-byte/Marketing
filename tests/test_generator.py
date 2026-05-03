"""Generator 통합 테스트 — Stub provider + in-memory SQLite.

실제 LLM/네트워크 호출 없음. 파이프라인 동작 검증.
"""

from __future__ import annotations

import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.compliance.linter import lint
from src.content.generator import generate_faq_content
from src.content.llm import StubProvider
from src.storage.models import Base, ComplianceRule, Tenant


@pytest.fixture
def session():
    # 환경변수가 다른 테스트에서 새어들어오지 않도록 명시
    os.environ.pop("MAX_CONTENT_GEN_PER_DAY", None)
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    s = SessionLocal()
    try:
        # tenant 시드
        s.add(
            Tenant(
                id=1,
                name="BGN 밝은눈안과",
                domain_category="안과/시력교정",
                region="서울 강남",
                business_model="라식/라섹 전문",
            )
        )
        s.add(
            ComplianceRule(
                tenant_id=1,
                rule_type="forbidden_word",
                pattern="100%\\s*(보장|성공|완치|효과)",
                severity="error",
                message="절대 보장 표현 금지",
            )
        )
        s.add(
            ComplianceRule(
                tenant_id=1,
                rule_type="forbidden_word",
                pattern="(최고|유일|최초)",
                severity="error",
                message="최상급 표현 금지",
            )
        )
        s.commit()
        yield s
    finally:
        s.close()


def test_generate_with_stub_passes(session):
    """Stub provider의 출력은 의료법 안전하게 작성되어 있어 pass 해야 함."""
    result = generate_faq_content(
        session,
        tenant_id=1,
        keyword="강남 라식 잘하는 곳",
        provider=StubProvider(),
        max_corrections=1,
        save=True,
    )
    assert result.passed is True
    assert result.compliance.status == "pass"
    assert len(result.qa_pairs) == 5
    assert result.json_ld_script.startswith("<script type=\"application/ld+json\">")
    assert "FAQPage" in result.json_ld_script
    assert result.provider == "stub"
    assert result.saved_id is not None


def test_generate_persists_to_db(session):
    """생성된 콘텐츠가 GeneratedContent 테이블에 저장된다."""
    from src.storage.models import GeneratedContent

    result = generate_faq_content(
        session, tenant_id=1, keyword="라섹 회복", provider=StubProvider(), save=True
    )
    row = session.get(GeneratedContent, result.saved_id)
    assert row is not None
    assert row.tenant_id == 1
    assert row.keyword_text == "라섹 회복"
    assert row.compliance_status == "pass"
    assert row.llm_provider == "stub"


def test_unknown_tenant_raises(session):
    with pytest.raises(ValueError):
        generate_faq_content(session, tenant_id=999, keyword="x", provider=StubProvider())


def test_lint_catches_violation(session):
    """직접 lint를 호출해 룰이 작동함을 확인."""
    report = lint(session, tenant_id=1, text="저희가 100% 보장하는 최고의 시술입니다.")
    assert report.status == "fail"
    # "100% 보장" + "최고" 두 위반 검출
    matched = {v.matched_text for v in report.violations}
    assert any("100%" in m for m in matched)
    assert "최고" in matched
