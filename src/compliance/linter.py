"""의료법 컴플라이언스 린터. 정의서 §5.2.

룰 타입 3종:
- forbidden_word        : 패턴이 텍스트에 등장하면 위반
- required_disclaimer   : 패턴 등장 시 requires 정규식이 함께 있어야 함
- pattern               : 일반 정규식 매치

ComplianceReport.status 결정 규칙:
- 위반 중 error severity 1개라도 있음 → fail
- 위반 중 warning severity 1개라도 있음 → warn
- 위반 없음 OR info만 있음 → pass
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Iterable, Literal

from sqlalchemy.orm import Session

from src.storage.models import ComplianceRule

Severity = Literal["error", "warning", "info"]
Status = Literal["pass", "warn", "fail"]


@dataclass
class Violation:
    rule_type: str
    severity: Severity
    matched_text: str
    position: tuple[int, int]  # (start, end)
    message: str
    pattern: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class ComplianceReport:
    status: Status
    violations: list[Violation] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {"status": self.status, "violations": [v.to_dict() for v in self.violations]}

    def has_errors(self) -> bool:
        return any(v.severity == "error" for v in self.violations)

    def has_warnings(self) -> bool:
        return any(v.severity == "warning" for v in self.violations)

    def summary(self) -> str:
        e = sum(1 for v in self.violations if v.severity == "error")
        w = sum(1 for v in self.violations if v.severity == "warning")
        i = sum(1 for v in self.violations if v.severity == "info")
        return f"{self.status} (error={e}, warning={w}, info={i})"


def _check_forbidden_word(text: str, rule: ComplianceRule) -> list[Violation]:
    pattern = rule.pattern
    flags = re.UNICODE
    matches: list[Violation] = []
    for m in re.finditer(pattern, text, flags):
        matches.append(
            Violation(
                rule_type=rule.rule_type,
                severity=rule.severity,  # type: ignore[arg-type]
                matched_text=m.group(0),
                position=(m.start(), m.end()),
                message=rule.message,
                pattern=pattern,
            )
        )
    return matches


def _check_required_disclaimer(text: str, rule: ComplianceRule) -> list[Violation]:
    """패턴이 등장하면 requires 정규식이 같은 텍스트 내에 함께 있어야 함."""
    if not rule.requires:
        return []
    if not re.search(rule.pattern, text, re.UNICODE):
        return []
    if re.search(rule.requires, text, re.UNICODE):
        return []
    # 패턴은 있으나 disclaimer 없음 → 위반
    m = re.search(rule.pattern, text, re.UNICODE)
    assert m is not None
    return [
        Violation(
            rule_type=rule.rule_type,
            severity=rule.severity,  # type: ignore[arg-type]
            matched_text=m.group(0),
            position=(m.start(), m.end()),
            message=rule.message,
            pattern=rule.pattern,
        )
    ]


def _check_pattern(text: str, rule: ComplianceRule) -> list[Violation]:
    return _check_forbidden_word(text, rule)


_CHECKERS = {
    "forbidden_word": _check_forbidden_word,
    "required_disclaimer": _check_required_disclaimer,
    "pattern": _check_pattern,
}


def _aggregate_status(violations: Iterable[Violation]) -> Status:
    sev = {v.severity for v in violations}
    if "error" in sev:
        return "fail"
    if "warning" in sev:
        return "warn"
    return "pass"


def lint(session: Session, tenant_id: int, text: str) -> ComplianceReport:
    """텍스트를 tenant의 활성 룰로 린트."""
    rules = (
        session.query(ComplianceRule)
        .filter(ComplianceRule.tenant_id == tenant_id, ComplianceRule.is_active.is_(True))
        .all()
    )
    return lint_with_rules(text, rules)


def lint_with_rules(text: str, rules: list[ComplianceRule]) -> ComplianceReport:
    """DB 의존 없이 in-memory 룰로 린트 (테스트/단독 호출용)."""
    violations: list[Violation] = []
    for rule in rules:
        checker = _CHECKERS.get(rule.rule_type)
        if checker is None:
            continue
        violations.extend(checker(text, rule))
    return ComplianceReport(status=_aggregate_status(violations), violations=violations)
