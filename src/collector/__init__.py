"""Collector package — Phase 4 (MVP-0).

Engine + Mention extractor 를 묶어 키워드 1개에 대한 n=30 샘플 비동기 수집.
비용 가드레일 + DB 저장 (Query/Response/Mention) 까지 한 번에.
"""

from src.collector.collect import CollectionResult, build_prompt, collect_for_keyword

__all__ = ["CollectionResult", "build_prompt", "collect_for_keyword"]
