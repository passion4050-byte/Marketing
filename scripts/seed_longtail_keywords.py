"""Round 173 (2026-08-23) - long-tail keyword seed + head-term retirement.

Why
---
GSC (90d, 2026-05~08) says the head terms in `keywords` cannot rank for this
domain and never have:

    라식 44.3위 · 백내장 73.9위 · 부산 라식 52.6위 · 스마일라식 비용 35.0위
    홍대 피부과 90.5위 · lifting seoul 90.0위        -> clicks: 0

The same report says brand-shaped and question-shaped queries DO rank page 1:

    dear clinic seoul 5.0위 · 서울병원마케팅 7.0위 · 韓國近視雷射 6.0위
    bright eye clinic gangnam review 9.0위 · 이마 라인 14.0위
    부산 밝은 눈 안과 18.6위 · 서면 밝은눈안과 19.0위

and the single best-performing document on the site is
`jamsil-cataract-both-eyes-interval-2026` ("양안 백내장 수술 간격") - a four-token
question, 22 impressions and the site's only partner-content click.

Meanwhile the keyword table averaged 1.0-2.6 tokens per row: "라식", "필러",
"울쎄라", "백내장". The generator was being pointed at the exact queries a DR-0
domain publishing three times a week has no path to win.

What this does
--------------
1. Inserts question-shaped long-tail keywords per tenant (measure_eligible=False so
   they cost no LLM measurement credits - they exist to steer publishing).
2. Sets content_eligible=False on the proven-hopeless head terms. They stay
   is_active + measure_eligible, so AI-citation measurement is untouched.
3. Verifies every enabled tenant still has enough content-eligible keywords to fill
   its rotation, and refuses to leave one starved.

Idempotent: ON CONFLICT DO NOTHING on (tenant_id, text, purpose).

Run:  DATABASE_URL=... python scripts/seed_longtail_keywords.py [--dry-run]
"""

from __future__ import annotations

import os
import sys

# tenant_id -> (category, target_brand, [keywords])
# category/target_brand mirror the tenant's existing rows so downstream grouping
# (blog_category mapping, brand mention detection) keeps working.

EYE_COMMON = [
    "스마일라식과 라섹 차이 회복기간 비교",
    "라식 수술 후 야간 빛번짐 얼마나 지속되나요",
    "라식 각막 두께 몇 mm부터 가능한가요",
    "라섹 통증 며칠째가 가장 심한가요",
    "라식 수술 후 운동 언제부터 가능한가요",
    "고도근시 라식과 ICL 어떤 수술이 맞나요",
    "안구건조증 있으면 라식 못하나요",
    "양안 백내장 수술 간격 며칠이 적당한가요",
    "다초점 인공수정체 단점과 적응 기간",
    "백내장 수술 후 눈부심 언제까지 가나요",
    "노안 백내장 동시수술 비용과 실비보험",
    "백내장 수술 실비보험 청구 방법",
    "라섹 후 직장 복귀 며칠이면 되나요",
    "스마일라식 재수술 가능한가요",
    "시력교정수술 나이 제한 몇 살까지인가요",
    "라식 수술 전 렌즈 착용 중단 기간",
    "백내장 초기 증상 자가진단 방법",
]

DERMA_COMMON = [
    "울쎄라와 써마지 차이 어떤 것을 먼저 받나요",
    "리쥬란 힐러 몇 번 맞아야 효과가 있나요",
    "스킨부스터 종류별 효과와 유지 기간 비교",
    "슈링크 시술 후 붓기 며칠이면 빠지나요",
    "보톡스와 스킨보톡스 차이 유지 기간",
    "여드름 흉터 프락셀과 서브시전 차이",
    "울쎄라 시술 후 주의사항 며칠 지켜야 하나요",
    "백옥주사 효과 지속 기간과 주의사항",
    "리프팅 시술 나이대별로 어떤 것이 맞나요",
    "필러 유지 기간과 녹이는 시술 기준",
    "색소침착 레이저 토닝 몇 회 필요한가요",
    "모공 축소 시술 종류와 회복 기간",
    "리쥬란과 스킨부스터 무엇이 다른가요",
    "겨울철 레이저 시술 회복이 빠른 이유",
]

HAIR_COMMON = [
    "비절개 모발이식 회복기간 며칠 걸리나요",
    "모발이식 6개월 후 변화와 생착률",
    "절개와 비절개 모발이식 흉터 차이",
    "헤어라인 교정 디자인 상담 기준",
    "정수리 모발이식 생착률과 회복 과정",
    "여성 헤어라인 교정 비용과 회복 기간",
    "모발이식 후 흡연 음주 언제부터 가능한가요",
    "모발이식 후 샴푸 언제부터 하나요",
    "모발치료주사 주기와 효과 기간",
    "모발이식 상담 전 준비할 것",
    "M자 헤어라인 교정 모수 기준",
    "모발이식 후 쇼크로스 언제 회복되나요",
]

TENANTS: dict[int, tuple[str, str, list[str]]] = {
    # 안과
    4: ("안과", "BGN 밝은눈안과 잠실", EYE_COMMON + [
        "잠실 안과 라식 상담 예약 방법",
        "잠실 밝은눈안과 위치와 주차 안내",
        "송파 잠실 백내장 수술 상담 절차",
    ]),
    10: ("안과", "밝은눈안과 부산", EYE_COMMON + [
        "부산 서면 안과 라식 상담 예약 방법",
        "부산 밝은눈안과 위치와 진료 시간",
        "부산 백내장 수술 상담 절차",
    ]),
    19: ("안과", "밝은눈안과 강남점", EYE_COMMON + [
        "강남 안과 라섹 상담 예약 방법",
        "강남 밝은눈안과 위치와 진료 시간",
        "강남역 근처 시력교정 상담 절차",
    ]),
    15: ("안과", "강남연세안과", EYE_COMMON + [
        "강남역 안과 라식 상담 예약 방법",
        "강남연세안과 위치와 진료 시간",
        "강남 노안교정 상담 절차",
    ]),
    # 피부과
    6: ("피부과", "지우피부과", DERMA_COMMON + [
        "강남 피부과 리쥬란 상담 예약 방법",
        "지우피부과 위치와 진료 시간",
    ]),
    18: ("피부과", "포레나의원", DERMA_COMMON + [
        "홍대 피부과 울쎄라 상담 예약 방법",
        "포레나의원 위치와 진료 시간",
    ]),
    9: ("피부과", "벨리셀 피부과", DERMA_COMMON + [
        "피부과 첫 상담 때 확인할 것",
        "벨리셀 피부과 위치와 진료 시간",
    ]),
    # 모발이식
    16: ("모발이식", "모우림의원", HAIR_COMMON + [
        "강남 모발이식 상담 예약 방법",
        "모우림의원 위치와 진료 시간",
    ]),
    5: ("모발이식", "밴스모자이너의원", HAIR_COMMON + [
        "강남 비절개 모발이식 상담 절차",
        "밴스모자이너의원 위치와 진료 시간",
    ]),
    # 한방
    8: ("한방의원", "바를정 한방의원", [
        "구안와사 초기 증상과 골든타임",
        "안면마비 한방 치료 기간은 얼마나 되나요",
        "구안와사 후유증 관리 방법",
        "한방 실리프팅과 안면거상 차이",
        "한방 다이어트 한약 복용 기간과 주의사항",
        "성장클리닉 한약 시작하기 좋은 시기",
        "안면마비 재발 예방 생활 관리",
        "구안와사 침 치료 주기와 회복 과정",
        "턱관절 장애 한방 치료 방법",
        "바를정 한방의원 위치와 진료 시간",
        "한방 치료 실비보험 적용 범위",
        "구안와사 초기 병원 선택 기준",
    ]),
    # 통증재활 / 검진
    20: ("기타", "광동병원", [
        "도수치료 실비보험 청구 횟수 기준",
        "허리 통증 도수치료 몇 회 받아야 하나요",
        "무릎 스포츠재활 기간은 얼마나 걸리나요",
        "어깨 회전근개 재활 운동 순서",
        "종합건강검진 40대 추천 항목",
        "건강검진 전날 주의사항과 금식 시간",
        "목 디스크 비수술 치료 방법 비교",
        "발목 인대 손상 재활 단계별 기간",
        "도수치료와 물리치료 차이",
        "허리디스크 재활운동 집에서 하는 법",
        "스포츠 손상 후 복귀 시점 판단 기준",
        "광동병원 위치와 진료 시간",
    ]),
}

# Proven-hopeless head terms. content_eligible=False; measurement untouched.
HEAD_TERMS = [
    # 안과
    "라식", "라섹", "스마일라식", "스마일", "스마일프로", "백내장", "시력교정",
    "노안교정", "노안수술", "드림렌즈", "강남안과", "강남스마일",
    "강남 라식", "강남 라섹", "강남 스마일라식", "강남 노안교정", "강남 백내장 수술",
    "부산 라식", "잠실 라식", "잠실 라섹", "잠실 백내장", "잠실 노안교정",
    "잠실 스마일라식", "라식 후기", "라식 비용", "라섹 후기", "라섹 비용",
    # 피부과
    "필러", "스킨부스터", "울쎄라", "울쎄라피", "써마지", "리쥬란", "슈링크",
    "리프팅", "여드름", "백옥주사", "스킨보톡스", "강남피부과", "청담피부과",
    "청담써마지", "강남써마지", "홍대피부과", "홍대 울쎄라", "홍대 써마지",
    "홍대 리쥬란", "홍대 스킨부스터", "홍대 피부과 추천", "울쎄라 비용",
    "울쎄라 후기", "강남 리쥬란 힐러", "여드름 흉터 치료",
    # 모발이식
    "모발이식", "헤어라인교정", "강남 모발이식", "강남 헤어라인교정",
    "정수리 모발이식", "여성 모발이식", "비절개 모발이식 강남",
    "강남 모발이식 추천", "헤어라인교정 잘하는곳", "모발이식 병원 순위",
    "모발이식 후기", "모발이식 비용", "모발이식 잘하는곳", "비절개 모발이식 추천",
    "강남 모발이식 병원 추천", "강남 모발이식 회복", "모발치료주사",
    "모발치료주사 후기", "모발치료주사 비용", "FUE 비절개 모발이식",
    "FUE 비절개식 모발이식", "FUT 절개 모발이식", "M자 헤어라인 교정",
    # 한방
    "안면거상", "실리프팅", "한방 다이어트 한약", "안면마비", "한방병원",
    "구안와사", "성장클리닉", "구안와사 후기", "구안와사 비용",
    # 통증재활
    "통증재활", "스포츠재활", "건강검진", "통증재활 후기", "통증재활 비용",
]

MIN_CONTENT_KEYWORDS = 8


def build_sql() -> list[str]:
    stmts: list[str] = []
    for tid, (category, brand, kws) in TENANTS.items():
        for kw in kws:
            text = kw.replace("'", "''")
            stmts.append(
                "INSERT INTO keywords (tenant_id, text, category, target_brand, "
                "is_active, purpose, market, lang, content_eligible, measure_eligible) "
                f"VALUES ({tid}, '{text}', '{category}', '{brand.replace(chr(39), chr(39) * 2)}', "
                "true, 'own', 'domestic', 'ko', true, false) "
                "ON CONFLICT DO NOTHING;"
            )
    joined = ", ".join("'" + t.replace("'", "''") + "'" for t in HEAD_TERMS)
    stmts.append(
        "UPDATE keywords SET content_eligible = false "
        f"WHERE lang = 'ko' AND text IN ({joined});"
    )
    return stmts


def main() -> int:
    dry = "--dry-run" in sys.argv
    stmts = build_sql()
    if dry:
        print("\n".join(stmts))
        return 0
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL not set", file=sys.stderr)
        return 2
    import psycopg  # type: ignore

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            for st in stmts:
                cur.execute(st)
            cur.execute(
                "SELECT k.tenant_id, count(*) FROM keywords k "
                "JOIN auto_content_settings s ON s.tenant_id = k.tenant_id AND s.enabled "
                "WHERE k.is_active AND k.content_eligible AND k.lang = 'ko' "
                "GROUP BY 1 ORDER BY 2"
            )
            starved = [(t, n) for t, n in cur.fetchall() if n < MIN_CONTENT_KEYWORDS]
            if starved:
                conn.rollback()
                print(f"ABORT - tenants below {MIN_CONTENT_KEYWORDS} keywords: {starved}",
                      file=sys.stderr)
                return 1
        conn.commit()
    print(f"applied {len(stmts)} statements")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
