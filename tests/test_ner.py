"""Phase 6-T2.6 — 의료 NER 테스트.

clinic / procedure / region 추출 검증. kiwipiepy 미설치 환경에서도 동작해야 한다.
"""

from __future__ import annotations

from src.parser.ner import Entity, extract_entities


def test_extract_clinic_with_particle():
    """병원 접미어 + 한국어 조사 — '안과는' / '병원이' 등 흡수."""
    text = "BGN밝은눈안과는 강남에서 라식과 라섹을 잘하는 곳입니다."
    ents = extract_entities(text)
    clinics = [e for e in ents if e.kind == "clinic"]
    assert clinics, "clinic 미검출"
    assert any("안과" in c.text for c in clinics)
    assert all("는" not in c.text for c in clinics), "조사가 capture 에 포함됨"


def test_extract_clinic_two_words():
    """'메디맵 안과' 처럼 공백 뒤 접미어가 바로 오는 케이스."""
    text = "메디맵 안과는 안과 분야 권위자가 많습니다."
    ents = extract_entities(text)
    clinics = [e for e in ents if e.kind == "clinic"]
    assert any(c.text.startswith("메디맵") for c in clinics), \
        f"메디맵 안과 미검출: {[(c.text, c.kind) for c in ents]}"


def test_extract_procedure_with_particle():
    """라식과/라섹을/임플란트는 → 모두 procedure 로 잡혀야."""
    text = "라식과 라섹을 비교해보면 임플란트는 별도 시술입니다."
    ents = extract_entities(text)
    procs = {e.text for e in ents if e.kind == "procedure"}
    assert "라식" in procs
    assert "라섹" in procs
    assert "임플란트" in procs


def test_extract_region_with_particle():
    """서울/강남에서/부산은 — leading 엄격 + trailing 조사 흡수."""
    text = "서울 강남에서 가장 유명. 부산은 해운대 위주."
    ents = extract_entities(text)
    regions = {e.text for e in ents if e.kind == "region"}
    assert {"서울", "강남", "부산", "해운대"}.issubset(regions), \
        f"region 누락: {regions}"


def test_compound_word_not_matched_as_region():
    """'서울대학교' 가 'region: 서울' 로 잘못 잡히면 안 됨."""
    text = "서울대학교 졸업 후 압구정 안과 의원 개원"
    ents = extract_entities(text)
    regions = {e.text for e in ents if e.kind == "region"}
    assert "서울" not in regions, f"compound 차단 실패: {regions}"
    # 압구정은 region 으로 잡힐 수 있지만, 안과 매치가 우선이므로 occupied 검사로 흡수
    clinics = [e for e in ents if e.kind == "clinic"]
    assert any("안과" in c.text for c in clinics), "clinic 매칭 실패"


def test_empty_or_no_match():
    assert extract_entities("") == []
    assert extract_entities("일반 텍스트 매칭 없음") == []


def test_kiwipiepy_optional():
    """kiwipiepy 가 미설치여도 정규식 only fallback 으로 동작."""
    # 단순 호출 — 예외 없이 결과가 나와야 함
    ents = extract_entities("강남 라식")
    assert any(e.kind == "region" for e in ents)
    assert any(e.kind == "procedure" for e in ents)
