"""tenants.yaml 풀 로더 — channel-specific compliance rules 머지 지원.

Phase 2-T1.4. 시드 로직(`src/storage/seed.py`)이 default 룰만 DB 에 적재하는 동안,
이 모듈은 yaml 의 `channel_rules` 섹션을 **런타임 머지** 용도로 in-memory ComplianceRule
인스턴스로 변환한다 (DB 미저장).

용례:
    from src.storage.tenant_loader import load_channel_rules
    extra = load_channel_rules(tenant_id=1, channel="instagram")
    rules = list(db_default_rules) + extra  # linter 에 전달
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

import yaml

from src.storage.models import ComplianceRule

ROOT = Path(__file__).resolve().parent.parent.parent
TENANTS_YAML = ROOT / "config" / "tenants.yaml"


def _load_yaml() -> dict:
    with TENANTS_YAML.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def get_tenant_entry(tenant_id: int) -> dict | None:
    """tenants.yaml 에서 해당 tenant 엔트리를 반환. 없으면 None."""
    data = _load_yaml()
    for entry in data.get("tenants", []) or []:
        if entry.get("id") == tenant_id:
            return entry
    return None


def load_channel_rules(tenant_id: int, channel: str) -> list[ComplianceRule]:
    """tenant + 채널의 yaml 정의 룰을 ComplianceRule 인스턴스 리스트로.

    DB 에 저장되지 않은 in-memory 인스턴스. linter 에 추가 룰로 전달해 머지 적용.
    매칭 엔트리 없으면 빈 리스트.
    """
    entry = get_tenant_entry(tenant_id)
    if entry is None:
        return []
    channel_rules = (entry.get("channel_rules") or {}).get(channel) or []
    rules: list[ComplianceRule] = []
    for r in channel_rules:
        rule = ComplianceRule(
            tenant_id=tenant_id,
            rule_type=r["type"],
            pattern=r["pattern"],
            severity=r["severity"],
            message=r.get("message", ""),
            requires=r.get("requires"),
            is_active=True,
        )
        rules.append(rule)
    return rules


def merge_rules(
    db_rules: Iterable[ComplianceRule],
    yaml_rules: Iterable[ComplianceRule],
) -> list[ComplianceRule]:
    """DB 룰과 yaml 채널 룰을 합친다.

    중복 정책: (tenant_id, rule_type, pattern) 키 기준. yaml 이 DB 를 오버라이드.
    """
    by_key: dict[tuple[int, str, str], ComplianceRule] = {}
    for r in db_rules:
        by_key[(r.tenant_id, r.rule_type, r.pattern)] = r
    for r in yaml_rules:
        by_key[(r.tenant_id, r.rule_type, r.pattern)] = r
    return list(by_key.values())
