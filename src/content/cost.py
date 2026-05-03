"""LLM 호출 비용 가드레일 — Phase 2-T3.1 / T3.2.

핵심:
- PRICING: 모델별 1M 토큰 단가 (USD)
- estimate_call_cost_usd(): 단일 호출 비용 추정
- check_daily_usd_budget(): tenant 의 오늘 누적 비용 vs MAX_DAILY_USD 체크
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session


# 1M 토큰당 USD — 보수적 정찰가 (실제는 모델/요금제별 변동)
PRICING: dict[str, dict[str, float]] = {
    # Google Gemini
    "gemini-2.5-flash":     {"input": 0.075, "output": 0.30},
    "gemini-2.5-flash-lite": {"input": 0.05,  "output": 0.20},
    "gemini-1.5-flash":     {"input": 0.075, "output": 0.30},
    # Anthropic Claude
    "claude-haiku-4-5-20251001": {"input": 1.0, "output": 5.0},
    "claude-haiku-4-5":          {"input": 1.0, "output": 5.0},
    # OpenAI
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    # Perplexity (검색 엔진 — Phase 4)
    "llama-3.1-sonar-small-128k-online":  {"input": 0.20, "output": 0.20},
    "llama-3.1-sonar-large-128k-online":  {"input": 1.00, "output": 1.00},
    "sonar":       {"input": 0.20, "output": 0.20},
    "perplexity":  {"input": 0.20, "output": 0.20},
    # Stub — 무료
    "stub":        {"input": 0.0, "output": 0.0},
}


def get_pricing(model: str) -> dict[str, float]:
    """모델 단가 반환. 매칭 안 되면 보수적 기본값 (claude haiku 수준)."""
    if model in PRICING:
        return PRICING[model]
    # prefix 매칭 시도 (예: "gemini-2.5-flash-001" → "gemini-2.5-flash")
    for known, price in PRICING.items():
        if model.startswith(known):
            return price
    # fallback — 가장 비싼 모델 가정 (보수적)
    return {"input": 1.0, "output": 5.0}


def estimate_call_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    """단일 LLM 호출 비용 추정 (USD).

    가격은 1M 토큰 기준이므로 토큰 수를 1_000_000 으로 나눠 계산.
    """
    if input_tokens <= 0 and output_tokens <= 0:
        return 0.0
    price = get_pricing(model)
    cost = (input_tokens / 1_000_000) * price["input"]
    cost += (output_tokens / 1_000_000) * price["output"]
    return round(cost, 6)


def daily_usd_used(session: Session, tenant_id: int) -> float:
    """tenant 의 오늘 누적 LLM 비용 (UTC 기준)."""
    from src.storage.models import LlmCallLog

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    total = (
        session.query(func.coalesce(func.sum(LlmCallLog.cost_usd), 0.0))
        .filter(
            LlmCallLog.tenant_id == tenant_id,
            LlmCallLog.called_at >= today_start,
        )
        .scalar()
    )
    return float(total or 0.0)


def check_daily_usd_budget(session: Session, tenant_id: int, *, projected_cost: float = 0.0) -> None:
    """누적 + projected 비용이 MAX_DAILY_USD 초과 시 raise CostGuardrailExceeded.

    `projected_cost` 는 다음 호출 예상 비용 (선택). 0 이면 누적만 비교.
    """
    from src.content.llm import CostGuardrailExceeded

    max_usd = float(os.getenv("MAX_DAILY_USD", "5.0"))
    used = daily_usd_used(session, tenant_id)
    if used + projected_cost > max_usd:
        raise CostGuardrailExceeded(
            f"tenant {tenant_id} 일일 USD 한도({max_usd:.2f}) 초과: "
            f"누적 ${used:.4f} + 다음 호출 ${projected_cost:.4f}. "
            f"한도는 .env / Streamlit secrets 의 MAX_DAILY_USD 로 조정."
        )
