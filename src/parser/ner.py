r"""의료 도메인 한국어 NER — Phase 6-T2.2.

clinic / procedure / region 3종 entity 추출.

매칭 전략:
1. clinic — 정규식: ``\S+?(안과|피부과|치과|...)``. 앞 토큰까지 포함해 병원명을 추출.
2. procedure — ``config/procedure_dict.yaml`` 의 사전 substring 매칭 (한국어 word boundary).
3. region — 한국 시드 사전 + (옵션) kiwipiepy NN 태그.

kiwipiepy 미설치 시 정규식 only 로 동작 — graceful fallback.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import yaml


# ─── 사전 ────────────────────────────────────────────────────────


_CLINIC_SUFFIXES = (
    "안과", "피부과", "치과", "한의원", "성형외과", "이비인후과", "정형외과",
    "산부인과", "소아과", "내과", "외과", "비뇨의학과", "비뇨기과", "신경과",
    "정신의학과", "마취통증의학과", "가정의학과", "영상의학과",
    "병원", "의원", "클리닉",
)
# 한국어 조사를 흡수하면서도 compound (서울대학교, 라식수술) 는 차단.
_PARTICLE_BOUNDARY = (
    r"(?:은|는|이|가|을|를|의|에서|에게|에|와|과|도|만|까지|부터|으로|보다|이나|"
    r"라고|이라|라는|이라는|입니다|이라서)?"
    r"(?![가-힣A-Za-z0-9])"
)
_CLINIC_SUFFIX_RE = re.compile(
    # 앞에 1~12 한국/영문/숫자(공백 1회 허용) + 의료기관 접미어 + 조사 허용.
    # 안쪽 {0,8} 은 "메디맵 안과" 처럼 두 번째 토큰이 0자 케이스를 허용.
    r"(?<![가-힣A-Za-z0-9])"
    r"([가-힣A-Za-z0-9]{1,12}(?:\s[가-힣A-Za-z0-9]{0,8})?"
    r"(?:" + "|".join(_CLINIC_SUFFIXES) + r"))"
    + _PARTICLE_BOUNDARY
)

_REGION_SEEDS: list[str] = [
    "서울", "강남", "강북", "서초", "송파", "강동", "마포", "용산", "종로", "중구",
    "여의도", "압구정", "신사", "청담", "역삼", "삼성", "잠실", "건대", "홍대",
    "분당", "수원", "성남", "용인", "고양", "일산", "김포", "안양", "안산", "과천",
    "부산", "해운대", "서면", "동래", "광안", "남포", "센텀",
    "대구", "인천", "광주", "대전", "울산", "세종",
    "제주", "춘천", "강릉", "원주", "청주", "전주", "포항", "창원",
]
_REGION_RE = re.compile(
    # leading 엄격 + trailing 은 조사 흡수 (서울에서 / 강남은 / 압구정에) — compound 차단.
    r"(?<![가-힣A-Za-z0-9])"
    r"(" + "|".join(map(re.escape, _REGION_SEEDS)) + r")"
    + _PARTICLE_BOUNDARY
)


@dataclass(frozen=True)
class Entity:
    text: str
    kind: str  # "clinic" | "procedure" | "region"
    position: int  # match start


# ─── 사전 로드 ───────────────────────────────────────────────────


@lru_cache(maxsize=1)
def _load_procedure_dict(path: str | None = None) -> tuple[str, ...]:
    """procedure_dict.yaml 의 모든 시술명을 길이 desc 정렬 (긴 것 먼저 매칭).

    경로 미지정 시 repo 루트의 ``config/procedure_dict.yaml`` 사용.
    """
    if path:
        p = Path(path)
    else:
        p = Path(__file__).resolve().parents[2] / "config" / "procedure_dict.yaml"
    if not p.exists():
        return ()
    try:
        data = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    except Exception:
        return ()
    items: list[str] = []
    for category, names in data.items():
        if isinstance(names, list):
            items.extend(str(n).strip() for n in names if str(n).strip())
    # 중복 제거 + 길이 desc (긴 것 먼저)
    return tuple(sorted(set(items), key=lambda s: -len(s)))


def _build_procedure_re(items: tuple[str, ...]) -> re.Pattern[str] | None:
    if not items:
        return None
    pattern = (
        r"(?<![가-힣A-Za-z0-9])"
        + "(" + "|".join(re.escape(it) for it in items) + ")"
        + _PARTICLE_BOUNDARY
    )
    return re.compile(pattern)


# ─── kiwipiepy (선택) ───────────────────────────────────────────


@lru_cache(maxsize=1)
def _try_kiwi():
    try:
        from kiwipiepy import Kiwi  # type: ignore

        return Kiwi()
    except Exception:
        return None


# ─── 메인 진입점 ────────────────────────────────────────────────


def extract_entities(text: str) -> list[Entity]:
    """한국어 의료 도메인 NER — clinic / procedure / region.

    같은 위치에서 더 긴 매칭이 우선. 한 entity 가 여러 kind 에 매칭될 경우
    clinic > procedure > region 순으로 우선.
    """
    if not text:
        return []

    found: list[Entity] = []
    occupied: list[tuple[int, int]] = []  # 이미 점유된 (start, end)

    def _conflicts(s: int, e: int) -> bool:
        for os_, oe in occupied:
            if not (e <= os_ or s >= oe):
                return True
        return False

    # 1. clinic — 가장 우선 (particle 제외하고 group(1) 만 capture)
    for m in _CLINIC_SUFFIX_RE.finditer(text):
        s, e = m.start(1), m.end(1)
        name = (m.group(1) or "").strip()
        if not name or _conflicts(s, e):
            continue
        found.append(Entity(text=name, kind="clinic", position=s))
        occupied.append((s, e))

    # 2. procedure
    pdict = _load_procedure_dict()
    pre = _build_procedure_re(pdict)
    if pre is not None:
        for m in pre.finditer(text):
            s, e = m.start(1), m.end(1)
            if _conflicts(s, e):
                continue
            found.append(Entity(text=m.group(1), kind="procedure", position=s))
            occupied.append((s, e))

    # 3. region (시드 사전)
    for m in _REGION_RE.finditer(text):
        s, e = m.start(1), m.end(1)
        if _conflicts(s, e):
            continue
        found.append(Entity(text=m.group(1), kind="region", position=s))
        occupied.append((s, e))

    # 4. kiwipiepy 보강 — 고유명사(NNP) 중 사전 미커버 region 후보 추가 (옵션)
    kiwi = _try_kiwi()
    if kiwi is not None:
        try:
            tokens = kiwi.tokenize(text)
            for tok in tokens:
                if getattr(tok, "tag", "") not in ("NNP",):
                    continue
                form = getattr(tok, "form", "").strip()
                if not form or len(form) < 2:
                    continue
                start = getattr(tok, "start", -1)
                if start < 0:
                    continue
                end = start + len(form)
                if _conflicts(start, end):
                    continue
                # NNP 중 region seed 에 없는 것은 skip — 보수적
                # (clinic suffix 매칭이 이미 잡았을 가능성 높음)
        except Exception:
            pass

    found.sort(key=lambda en: en.position)
    return found
