"""tests for src/storage/tenant_loader.py — Phase 2-T1.4."""

from __future__ import annotations

from src.storage.tenant_loader import (
    get_tenant_entry,
    load_channel_rules,
    merge_rules,
)


def test_get_tenant_entry_existing():
    entry = get_tenant_entry(1)
    assert entry is not None
    assert entry["id"] == 1
    assert "channel_rules" in entry  # 테스트1 에 channel_rules 정의됨


def test_get_tenant_entry_missing():
    assert get_tenant_entry(99999) is None


def test_load_channel_rules_instagram():
    rules = load_channel_rules(1, "instagram")
    assert len(rules) == 2  # 즉시 효과 + 100%
    patterns = [r.pattern for r in rules]
    assert "즉시 효과" in patterns
    assert "100%" in patterns
    # 모두 ComplianceRule 인스턴스인지
    for r in rules:
        assert r.tenant_id == 1
        assert r.is_active is True
        assert r.severity == "error"


def test_load_channel_rules_naver():
    rules = load_channel_rules(1, "naver_blog")
    assert len(rules) == 1
    assert rules[0].rule_type == "required_disclaimer"
    assert rules[0].pattern == "개인차"


def test_load_channel_rules_unknown_channel():
    rules = load_channel_rules(1, "nonexistent_channel")
    assert rules == []


def test_load_channel_rules_no_channel_rules_section():
    # 테스트2 (id=2) — channel_rules 섹션 없음
    rules = load_channel_rules(2, "instagram")
    assert rules == []


def test_merge_rules_yaml_overrides_db():
    from src.storage.models import ComplianceRule

    db_rule = ComplianceRule(
        tenant_id=1, rule_type="forbidden_word", pattern="X",
        severity="warning", message="DB", is_active=True,
    )
    yaml_rule = ComplianceRule(
        tenant_id=1, rule_type="forbidden_word", pattern="X",
        severity="error", message="YAML", is_active=True,
    )
    merged = merge_rules([db_rule], [yaml_rule])
    assert len(merged) == 1
    # yaml 이 DB 를 오버라이드
    assert merged[0].severity == "error"
    assert merged[0].message == "YAML"


def test_merge_rules_combines_distinct():
    from src.storage.models import ComplianceRule

    db_rule = ComplianceRule(
        tenant_id=1, rule_type="forbidden_word", pattern="A",
        severity="error", message="db", is_active=True,
    )
    yaml_rule = ComplianceRule(
        tenant_id=1, rule_type="forbidden_word", pattern="B",
        severity="error", message="yaml", is_active=True,
    )
    merged = merge_rules([db_rule], [yaml_rule])
    assert len(merged) == 2
