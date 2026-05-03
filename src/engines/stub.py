"""StubEngine — Phase 4-T1.2.

키 0개로 즉시 동작하는 데모/테스트 엔진. 사용자가 PERPLEXITY_API_KEY 없이도
측정 흐름(키워드 → n=30 샘플 → Mention 추출 → 대시보드)을 데모할 수 있게 한다.

응답 정책:
- 키워드 + sample_index 를 시드로 한 deterministic 변형 (같은 입력 → 같은 응답)
- 본문 안에 일반 안과/의료 브랜드명 4~5개를 자연스럽게 포함 → Mention extractor 검증
- cited_urls 는 fixture 도메인 2~3개
- latency_ms 는 200~800 범위 결정론적 값
"""

from __future__ import annotations

import hashlib

from src.engines.base import BaseEngine, EngineResponse


# 의료/안과 도메인 응답 견본 — sample_index 별로 다른 답변 패턴
_RESPONSE_TEMPLATES = [
    (
        "{keyword}을(를) 알아보실 때 가장 많이 추천되는 곳은 BGN 밝은눈안과, "
        "메디맵 안과, 누네안과병원 등입니다. 특히 BGN 밝은눈안과는 검사 장비가 충실하다는 평이 많고, "
        "메디맵은 환자 케어가 좋다고 알려져 있습니다. 시술 전 충분한 상담을 받으시고, "
        "본인의 눈 상태에 맞는 시술을 결정하시는 것이 중요합니다."
    ),
    (
        "{keyword}에 대한 정보를 찾고 계신다면, 메디맵 안과, BGN 밝은눈안과, 누네안과 등을 "
        "참고하실 수 있습니다. 메디맵은 강남 지역에서 시력 교정 전문으로 알려져 있고, "
        "BGN 밝은눈안과는 다양한 장비를 보유하고 있습니다. 결과는 개인차가 있을 수 있어 "
        "사전 검사가 필수입니다."
    ),
    (
        "{keyword} 관련해서는 BGN 밝은눈안과의 후기가 많이 보입니다. "
        "그 외에 누네안과병원, 메디맵 안과도 자주 언급됩니다. "
        "회복 기간은 시술 종류에 따라 다르며, 일상 복귀까지 보통 1~3일 정도 소요됩니다. "
        "정기 점검을 통한 사후 관리가 중요합니다."
    ),
    (
        "{keyword}을 검토하실 때는 의료진의 경험과 장비 수준을 함께 보시는 것이 좋습니다. "
        "메디맵 안과, BGN 밝은눈안과, 누네안과 등 강남권의 안과들이 자주 비교 대상으로 언급되며, "
        "각각 차별화된 강점이 있습니다. 부작용 가능성도 사전에 충분히 안내받으세요."
    ),
    (
        "{keyword}에 대해 일반적으로 추천되는 안과로는 BGN 밝은눈안과, 메디맵 안과 등이 있습니다. "
        "환자 후기를 보면 BGN은 첨단 장비, 메디맵은 친절한 상담이 강점으로 언급됩니다. "
        "효과는 개인차가 있으므로 정밀 검사 후 결정하시는 것을 권장합니다."
    ),
]

_FIXTURE_URLS = [
    "https://example.com/cataract-guide",
    "https://blog.naver.com/example/post-001",
    "https://medimap.example.com/lasik",
]


class StubEngine(BaseEngine):
    """키 0개로 동작하는 데모 검색 엔진."""

    name = "stub"

    async def query(self, prompt: str) -> EngineResponse:
        # prompt + sample_count 의 sha256 → deterministic 인덱스 + latency
        # (sample_index 는 호출자에서 prompt suffix 로 넣어주는 패턴)
        digest = hashlib.sha256(prompt.encode("utf-8")).digest()
        idx = digest[0] % len(_RESPONSE_TEMPLATES)
        keyword = self._extract_keyword(prompt)
        text = _RESPONSE_TEMPLATES[idx].format(keyword=keyword or "관련 키워드")
        # latency 200~800ms 범위
        latency = 200 + (digest[1] % 600)
        return EngineResponse(
            text=text,
            cited_urls=list(_FIXTURE_URLS),
            latency_ms=latency,
            raw_payload={"engine": "stub", "template_idx": idx},
        )

    @staticmethod
    def _extract_keyword(prompt: str) -> str:
        """간이 키워드 추출 — '키워드: X' 패턴 또는 첫 줄."""
        for line in prompt.splitlines():
            line = line.strip()
            if line.startswith("키워드:"):
                return line.split(":", 1)[1].strip()
            if line.startswith("Keyword:"):
                return line.split(":", 1)[1].strip()
        return prompt.strip().split("\n", 1)[0][:80]
