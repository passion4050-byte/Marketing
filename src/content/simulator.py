"""AI 응답 시뮬레이터 — 데이터 피딩 전/후 비교용 단일 답변 생성.

profile 페이지의 "AI 응답 시뮬레이터" 섹션과 별도 "AI 시뮬레이터" 탭에서 사용.

provider 별 동작:
- stub: 미리 작성된 응답 (with_feed=True/False 두 버전)
- gemini: 실시간 호출
- anthropic: 실시간 호출 (키 있을 때만)
- openai: 실시간 호출 (키 있을 때만)

키 없는 provider는 stub fallback.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass
from typing import Optional

import structlog
from sqlalchemy.orm import Session

from src.content.tenant_context import build_tenant_context_block
from src.storage.models import Tenant

logger = structlog.get_logger(__name__)


# ─── 결과 dataclass ─────────────────────────────────────────────


@dataclass
class SimulatorResponse:
    text: str
    elapsed_ms: int
    provider: str
    with_feed: bool
    error: Optional[str] = None

    @property
    def char_count(self) -> int:
        return len(self.text)

    def cite_count(self, *needles: str) -> int:
        """응답이 사실 정보를 인용한 횟수 (단순 substring 카운트)."""
        n = 0
        for needle in needles:
            if needle and needle in self.text:
                n += 1
        return n


# ─── 공용 시스템 프롬프트 ──────────────────────────────────────


_SIMULATOR_SYSTEM = """당신은 한국 의료 도메인 전문가입니다. 사용자 질문에 200~400자로 답하세요.

[의료법 컴플라이언스]
- 절대적 표현 금지: "100% 보장", "최고", "유일", "완치 보장", "통증 제로", "전혀 아프지 않"
- 효과/결과는 항상 "개인차가 있을 수 있다" 취지 포함
- 비교 광고 금지

[톤]
- 자연스러운 이모지 1~2개 (✅ 🩺 ⏱️ 💡 등)
- 핵심 키워드는 마크다운 **bold**
- 구체적 수치/사실 우선

답변만 출력하세요. 메타 코멘트 X.
"""


def _build_simulator_user_prompt(
    question: str, tenant: Tenant, tenant_data_block: str = ""
) -> str:
    parts = [
        f"질문: {question}",
        f"의료기관: {tenant.name} ({tenant.domain_category}, {tenant.region})",
    ]
    # 브랜드 보이스 주입 (있으면)
    if tenant.brand_voice:
        block = tenant.brand_voice.to_prompt_block()
        if block:
            parts.append("\n" + block)

    if tenant_data_block:
        parts.append("\n" + tenant_data_block)
        parts.append(
            "\n위 \"의료기관 사실 정보\"를 답변에 적극 인용하세요. "
            "추상 표현(\"전문 의료진\") 대신 구체 사실(\"15년 경력의 김시력 전문의\")을 우선."
        )
    return "\n".join(parts)


# ─── Provider별 호출 ────────────────────────────────────────────


def _simulate_stub(question: str, tenant: Tenant, with_feed: bool) -> str:
    """API 키 없이 동작하는 시뮬레이션 응답."""
    if with_feed:
        # 데이터 피딩 후 답변 — 구체적 사실 인용
        return (
            f"💡 {tenant.name}의 **김시력 전문의**(시력교정술 15년 경력)에 따르면, "
            f"\"{question[:30]}...\" 질문은 환자분들이 가장 많이 묻는 질문 중 하나입니다. "
            f"저희는 **아마리스 레드 1050RS** (SCHWIND社) 장비로 정밀 시술을 진행하며, "
            f"현재 **스마일 라식 특별 할인** (정상가 250만원 → 189만원, 2026.02.01~08.31) "
            f"이벤트가 진행 중입니다. 다만 시술 가능 여부와 효과는 개인의 눈 상태에 따라 "
            f"차이가 있을 수 있으니, 정밀 검사 후 의료진과 1:1 상담을 권장드립니다. ✅"
        )
    # 데이터 피딩 전 답변 — 일반/추상적
    return (
        "라식 수술은 시력교정에 효과적인 방법 중 하나입니다. "
        "수술 전 정밀 검사를 통해 본인의 눈 상태를 확인하는 것이 중요하며, "
        "각 병원마다 사용하는 장비와 시술법이 다를 수 있습니다. "
        "회복 기간과 사후 관리도 시술법에 따라 차이가 있으니, "
        "안과 전문의와 충분히 상담 후 결정하세요. 결과는 개인차가 있을 수 있습니다."
    )


def _simulate_gemini(prompt: str) -> str:
    from google import genai
    from google.genai import types

    key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GOOGLE_API_KEY 미설정")
    client = genai.Client(api_key=key)
    resp = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(system_instruction=_SIMULATOR_SYSTEM),
    )
    return resp.text or ""


def _simulate_anthropic(prompt: str) -> str:
    import anthropic

    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY 미설정")
    client = anthropic.Anthropic(api_key=key)
    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        system=_SIMULATOR_SYSTEM,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(b.text for b in msg.content if hasattr(b, "text"))


def _simulate_openai(prompt: str) -> str:
    from openai import OpenAI

    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY 미설정")
    client = OpenAI(api_key=key)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": _SIMULATOR_SYSTEM},
            {"role": "user", "content": prompt},
        ],
    )
    return resp.choices[0].message.content or ""


# ─── 진입점 ─────────────────────────────────────────────────────


def simulate_response(
    session: Session,
    tenant: Tenant,
    question: str,
    *,
    with_feed: bool,
    provider: Optional[str] = None,
) -> SimulatorResponse:
    """질문에 대한 단일 답변 시뮬레이션. with_feed로 데이터 피딩 토글."""
    name = (provider or os.getenv("LLM_PROVIDER", "stub")).lower().strip()

    if with_feed:
        data_block = build_tenant_context_block(session, tenant.id)
    else:
        data_block = ""

    prompt = _build_simulator_user_prompt(question, tenant, data_block)

    start = time.perf_counter()
    text = ""
    error: Optional[str] = None

    try:
        if name == "stub":
            text = _simulate_stub(question, tenant, with_feed)
        elif name == "gemini":
            text = _simulate_gemini(prompt)
        elif name == "anthropic":
            text = _simulate_anthropic(prompt)
        elif name == "openai":
            text = _simulate_openai(prompt)
        else:
            error = f"알 수 없는 provider: {name}"
            text = _simulate_stub(question, tenant, with_feed)
    except Exception as e:
        logger.warning("simulator.error", provider=name, error=str(e))
        error = str(e)
        # provider 실패 시 stub fallback
        text = _simulate_stub(question, tenant, with_feed)

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return SimulatorResponse(
        text=text,
        elapsed_ms=elapsed_ms,
        provider=name if not error else f"{name} (fallback to stub)",
        with_feed=with_feed,
        error=error,
    )


def compare_with_and_without_feed(
    session: Session, tenant: Tenant, question: str, *, provider: Optional[str] = None
) -> dict:
    """동일 질문을 데이터 피딩 ON/OFF로 두 번 호출하고 결과 비교."""
    before = simulate_response(session, tenant, question, with_feed=False, provider=provider)
    after = simulate_response(session, tenant, question, with_feed=True, provider=provider)

    # 인용 카운트용 needles — tenant 활성 데이터에서 추출
    needles = []
    from src.storage.models import Doctor, Equipment, EventOffer

    needles.extend(
        d.name
        for d in session.query(Doctor)
        .filter(Doctor.tenant_id == tenant.id, Doctor.is_active.is_(True))
        .all()
    )
    needles.extend(
        e.name
        for e in session.query(Equipment)
        .filter(Equipment.tenant_id == tenant.id, Equipment.is_active.is_(True))
        .all()
    )
    needles.extend(
        ev.name
        for ev in session.query(EventOffer)
        .filter(EventOffer.tenant_id == tenant.id, EventOffer.is_active.is_(True))
        .all()
    )

    before_cites = before.cite_count(*needles)
    after_cites = after.cite_count(*needles)

    # 개선율 (전 → 후)
    def _pct(before_v, after_v):
        if before_v == 0:
            return 100 if after_v > 0 else 0
        return int((after_v - before_v) / before_v * 100)

    return {
        "before": before,
        "after": after,
        "metrics": {
            "char_diff_pct": _pct(before.char_count, after.char_count),
            "cites_before": before_cites,
            "cites_after": after_cites,
            "elapsed_before_ms": before.elapsed_ms,
            "elapsed_after_ms": after.elapsed_ms,
            "needles": needles,
        },
    }
