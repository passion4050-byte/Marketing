"""Compliance 린터 단위 테스트.

DB 없이 in-memory 룰로 린팅 검증.
"""

from __future__ import annotations

from src.compliance.linter import lint_with_rules
from src.storage.models import ComplianceRule


def _rule(
    *,
    rule_type: str,
    pattern: str,
    severity: str = "error",
    message: str = "violation",
    requires: str | None = None,
) -> ComplianceRule:
    """테스트용 ORM 인스턴스. DB에 붙이지 않고 dataclass처럼 사용."""
    return ComplianceRule(
        tenant_id=1,
        rule_type=rule_type,
        pattern=pattern,
        severity=severity,
        message=message,
        requires=requires,
        is_active=True,
    )


def test_pass_when_no_violation():
    rules = [_rule(rule_type="forbidden_word", pattern="100% 보장")]
    report = lint_with_rules("저희 병원은 환자분들께 최선을 다합니다.", rules)
    assert report.status == "pass"
    assert report.violations == []


def test_forbidden_word_error():
    rules = [
        _rule(
            rule_type="forbidden_word",
            pattern="100%\\s*(보장|성공|완치|효과)",
            severity="error",
            message="절대적 보장 표현 금지",
        )
    ]
    text = "저희는 100% 보장 시술을 제공합니다."
    report = lint_with_rules(text, rules)
    assert report.status == "fail"
    assert len(report.violations) == 1
    v = report.violations[0]
    assert v.severity == "error"
    assert "100%" in v.matched_text


def test_warning_aggregates_to_warn():
    rules = [
        _rule(
            rule_type="forbidden_word",
            pattern="(통증\\s*제로|전혀\\s*아프지\\s*않)",
            severity="warning",
        )
    ]
    text = "통증 제로 시술입니다."
    report = lint_with_rules(text, rules)
    assert report.status == "warn"
    assert report.has_warnings()
    assert not report.has_errors()


def test_required_disclaimer_present():
    """이벤트 표현 + 종료일 함께 있으면 통과."""
    rules = [
        _rule(
            rule_type="required_disclaimer",
            pattern="(이벤트|할인)",
            requires="(\\d{4}[\\.\\-]\\d{1,2}[\\.\\-]\\d{1,2}|기간\\s*한정)",
            severity="warning",
        )
    ]
    text = "5월 이벤트 진행 중. 2026.05.31까지 진행됩니다."
    report = lint_with_rules(text, rules)
    assert report.status == "pass"


def test_required_disclaimer_missing():
    """이벤트 표현은 있으나 종료일 없으면 위반."""
    rules = [
        _rule(
            rule_type="required_disclaimer",
            pattern="(이벤트|할인)",
            requires="(\\d{4}[\\.\\-]\\d{1,2}[\\.\\-]\\d{1,2}|기간\\s*한정)",
            severity="warning",
        )
    ]
    text = "5월 이벤트 진행 중!"
    report = lint_with_rules(text, rules)
    assert report.status == "warn"
    assert len(report.violations) == 1


def test_multiple_rules_aggregate_to_worst_severity():
    rules = [
        _rule(rule_type="forbidden_word", pattern="최고", severity="error"),
        _rule(rule_type="forbidden_word", pattern="할인", severity="warning"),
    ]
    text = "최고 시술, 할인 진행."
    report = lint_with_rules(text, rules)
    assert report.status == "fail"  # error가 worst
    assert len(report.violations) == 2
    assert report.has_errors()
    assert report.has_warnings()


def test_position_tuple_returned():
    rules = [_rule(rule_type="forbidden_word", pattern="최고")]
    text = "저희가 최고입니다"
    report = lint_with_rules(text, rules)
    v = report.violations[0]
    assert v.position == (text.index("최고"), text.index("최고") + 2)


def test_info_severity_does_not_warn():
    rules = [_rule(rule_type="pattern", pattern="시술\\s*전후", severity="info")]
    text = "시술 전후 사진을 보세요."
    report = lint_with_rules(text, rules)
    assert report.status == "pass"  # info는 pass에 머무름
    assert len(report.violations) == 1


def test_summary_format():
    rules = [
        _rule(rule_type="forbidden_word", pattern="최고", severity="error"),
        _rule(rule_type="forbidden_word", pattern="할인", severity="warning"),
        _rule(rule_type="pattern", pattern="시술\\s*전후", severity="info"),
    ]
    text = "최고 할인 시술 전후"
    report = lint_with_rules(text, rules)
    assert "fail" in report.summary()
    assert "error=1" in report.summary()
    assert "warning=1" in report.summary()
    assert "info=1" in report.summary()
