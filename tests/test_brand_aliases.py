"""자사 브랜드 별칭 생성 회귀 테스트 — 일반명사 누출 방지.

## 왜 이 파일이 있나 (같은 사고 3회)
tenant_name 에서 별칭을 자동 생성할 때 **일반명사가 자사 브랜드로 등록**되면,
그 단어가 나오는 모든 AI 답변이 그 병원의 target 멘션으로 집계된다.
Mention Share 가 통째로 허수가 되고, 아무도 눈치채지 못한다.

- Round 153 (2026-08-16) — `"벨리셀 피부과"` → `"피부과"` 누출. 225건 허수.
  → `_GENERIC_KOREAN_TOKENS` 에 진료과명 추가로 대응.
- Round 195 (2026-09-08) — `"바를정 한방의원"` → **`"한방"`** 누출. **1,240건 허수**
  (전체 멘션 코퍼스의 약 30%). `"밝은눈안과 강남점"` → `"강남점"` 48건.

🔴 153 의 수정이 195 를 못 막은 이유: 153 은 **단어 목록**만 늘렸는데, 195 의 출처는
**접미사 제거 경로**였다. `"한방의원"` 에서 `"의원"` 을 떼어 **원문에 단어로 존재한 적도
없는** `"한방"` 을 만들어낸 것이다. 목록으로는 만들어질 토큰을 미리 알 수 없다.
그래서 지금은 규칙(최소 길이·지점 표기)으로 막고, 이 테스트가 그 규칙을 지킨다.

**새 tenant 를 추가하면 아래 REAL_TENANTS 에 이름을 넣을 것.**
"""

from __future__ import annotations

import importlib.util
import pathlib

import pytest

_ROOT = pathlib.Path(__file__).resolve().parents[1]


def _load_build_aliases():
    spec = importlib.util.spec_from_file_location(
        "_rmb", _ROOT / "scripts" / "run_measurement_batch.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod._build_aliases


build_aliases = _load_build_aliases()

# 브랜드가 될 수 없는 말. 하나라도 별칭으로 나오면 측정이 오염된다.
FORBIDDEN = {
    "한방", "한방의원", "강남점", "잠실점", "본점", "지점",
    "피부과", "안과", "성형외과", "한의원", "치과", "내과", "외과",
    "의원", "병원", "클리닉", "센터", "의료원", "메디컬", "종합병원",
    "잠실", "강남", "서울", "부산", "분당", "송파",
}

# 실제 운영 중인 tenant 이름 (2026-09-08 기준).
REAL_TENANTS = [
    "BGN 밝은눈안과 잠실",
    "밴스모자이너의원",
    "지우피부과",
    "바를정 한방의원",
    "벨리셀 피부과",
    "밝은눈안과 부산",
    "위서클",
    "클리어서울안과",
    "힐링안과",
    "강남연세안과",
    "모우림의원",
    "청담디어의원",
    "포레나의원",
    "밝은눈안과 강남점",
    "광동병원",
    "심포니성형외과피부과",
]


@pytest.mark.parametrize("tenant_name", REAL_TENANTS)
def test_no_generic_token_leaks(tenant_name: str) -> None:
    """실 tenant 이름 어디서도 일반명사가 별칭으로 새면 안 된다."""
    aliases = set(build_aliases(tenant_name, ""))
    leaked = aliases & FORBIDDEN
    assert not leaked, (
        f"{tenant_name!r} 에서 일반명사가 자사 별칭으로 누출됨: {sorted(leaked)}. "
        "이 단어가 나오는 모든 AI 답변이 이 병원의 target 멘션으로 집계된다."
    )


def test_hanbang_regression() -> None:
    """Round 195 실사고 재현 방지 — 1,240건 허수의 원인."""
    assert "한방" not in build_aliases("바를정 한방의원", "")


def test_branch_suffix_regression() -> None:
    """Round 195 — 지점 표기는 브랜드가 아니다."""
    assert "강남점" not in build_aliases("밝은눈안과 강남점", "")
    assert "잠실점" not in build_aliases("밝은눈안과 잠실점", "")


def test_specialty_regression() -> None:
    """Round 153 실사고 재현 방지 — 225건 허수의 원인."""
    assert "피부과" not in build_aliases("벨리셀 피부과", "")


def test_real_brands_survive() -> None:
    """오탐만 걷어내야 한다 — 진짜 브랜드까지 사라지면 측정이 0 이 된다."""
    assert "밝은눈안과" in build_aliases("BGN 밝은눈안과 잠실", "bgn")
    assert "BGN" in build_aliases("BGN 밝은눈안과 잠실", "bgn")
    assert "바를정" in build_aliases("바를정 한방의원", "")
    assert "벨리셀" in build_aliases("벨리셀 피부과", "")
    assert "포레나" in build_aliases("포레나의원", "forena")
    assert "위서클" in build_aliases("위서클", "")


def test_full_name_always_kept() -> None:
    """tenant_name 전체는 길이 규칙과 무관하게 항상 별칭이어야 한다."""
    for name in REAL_TENANTS:
        assert name in build_aliases(name, "")


def test_short_english_slug_kept() -> None:
    """영문 slug 는 짧아도 유효하다 — 최소 길이 규칙은 한글에만 적용."""
    assert "bgn" in build_aliases("BGN 밝은눈안과 잠실", "bgn")
