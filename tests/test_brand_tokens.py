"""Round 204 — 브랜드 토큰 규칙 잠금.

기대값은 **DB RPC `funnel_tenant_stats` 의 tok CTE 를 실 tenant 16곳에 돌린 결과**(2026-09-14)다.
파이썬(src/content/brand_tokens.py)과 SQL(db/supabase/round203_funnel_tenant_stats.sql)이
어긋나면 어드민의 "비브랜드 등장률" 과 발행 우선순위가 서로 다른 키워드를 브랜드로 보게 된다.
한쪽 규칙을 바꾸면 SQL 로 이 표를 다시 뽑아 갱신할 것.
"""
import pytest

from src.content.brand_tokens import brand_tokens, is_branded

# (tenant name, partner_slug) → SQL 이 만든 토큰 집합
SQL_TOKENS = {
    ("BGN 밝은눈안과 잠실", "bgn"): {"bgn", "밝은눈", "밝은눈안과"},
    ("밴스모자이너의원", "vandsmosigner"): {"vandsmosigner", "밴스모자이너", "밴스모자이너의원"},
    ("지우피부과", "jiwooclinic"): {"jiwooclinic", "지우피부과"},
    ("바를정 한방의원", "barujeong"): {"barujeong", "바를정"},
    ("벨리셀 피부과", "bellisel"): {"bellisel", "벨리셀"},
    ("밝은눈안과 부산", "bgn-busan"): {"bgn-busan", "밝은눈", "밝은눈안과"},
    ("위서클", "wecircle-self"): {"위서클"},
    ("클리어서울안과", "clearseoul"): {"clearseoul", "클리어서울", "클리어서울안과"},
    ("힐링안과", "healingeye"): {"healingeye", "힐링안과"},
    ("강남연세안과", "gangnamyonsei"): {"gangnamyonsei", "강남연세", "강남연세안과"},
    ("모우림의원", "mowoolim"): {"mowoolim", "모우림", "모우림의원"},
    ("청담디어의원", "dear"): {"dear", "청담디어", "청담디어의원"},
    ("포레나의원", "forena"): {"forena", "포레나", "포레나의원"},
    ("밝은눈안과 강남점", "brighteye"): {"brighteye", "밝은눈", "밝은눈안과"},
    ("광동병원", "kwangdong"): {"kwangdong", "광동병원"},
    ("심포니성형외과피부과", "symphony"): {"symphony", "심포니성형외과", "심포니성형외과피부과"},
}


@pytest.mark.parametrize("key,expected", list(SQL_TOKENS.items()))
def test_python_tokens_match_sql_rpc(key, expected):
    assert brand_tokens(*key) == expected


@pytest.mark.parametrize("name", [
    "바를정 한방의원",      # Round 195: "한방의원" → "한방" 이 새면 안 된다
    "OO 성형외과",          # 뗄 접미사가 없는 일반명사 — 원형이 통과하면 안 된다
    "OO 클리닉",
    "밝은눈안과 강남점",    # 지점표기
])
def test_generic_words_never_become_tokens(name):
    toks = brand_tokens(name, None)
    for generic in ("한방", "한방의원", "성형외과", "클리닉", "강남점", "피부과", "안과", "의원"):
        assert generic not in toks


def test_is_branded_ignores_spaces_and_case():
    toks = brand_tokens("밝은눈안과 강남점", "brighteye")
    assert is_branded("밝은눈안과강남", toks)
    assert is_branded("강남 밝은눈안과 위치와 진료 시간", toks)
    assert is_branded("Bright Eye clinic Seoul", toks)
    assert not is_branded("잠실 라섹 비용", toks)
    assert not is_branded("라식", toks)
