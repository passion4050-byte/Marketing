# Phase 6.6: 발행 추적 + AEO 인용 매칭

**Goal**: 사용자가 외부 채널에 발행한 콘텐츠 URL 을 등록하면, 그 URL 이 AI 엔진(Perplexity/OpenAI/Gemini/Claude) 응답의 cited_urls 에 등장하는지 자동 매칭해 인용률을 측정한다.

**왜?** AEO/GEO 의 진짜 KPI 는 "AI 가 우리 콘텐츠를 cite 했는가" 이다. 메디맵이 콘텐츠를 발행하기만 해서는 부족하고, 그 URL 이 AI 검색에서 인용돼야 의미가 있다. Phase 6 까지는 "tenant 브랜드명 멘션" 만 추적했지만, Phase 6.6 은 "tenant 가 발행한 URL 의 인용" 을 추적한다.

**Status**: In Progress
**Estimated**: ~3-4h
**Depends on**: Phase 6 (Response.cited_urls 가 채워져 있어야 매칭 가능)

---

## Scope (이 phase 에서 하는 것)

1. `Publication` 모델 + Alembic 마이그레이션 — tenant 가 발행한 외부 URL 1건당 1행
2. `match_publications_to_responses()` 함수 — Publication.url 이 Response.cited_urls 에 등장하면 cited_by_engines 갱신
3. 발행 추적 UI (📍 발행 현황 sub-tab) — KPI + 채널 분포 + 테이블 + 신규 등록 폼 + 인용 매칭 갱신 버튼
4. 발행 도우미 — GeneratedContent 카드에 "📍 어디에 발행했어요" 폼 부착 (Publication INSERT)
5. AEO/GEO 전략 리서치 문서 (`.planning/aeo_geo_strategy.md`)
6. pytest — 인용 매칭 + Alembic smoke

## Out of Scope (이 phase 에서 안 하는 것)

- **외부 플랫폼 자동 게시** — `CLAUDE.md` 의 "No auto-posting" 정책 유지. Publication 은 사용자가 발행한 URL 을 *기록* 하는 단계까지.
- **백링크/도메인 권위 자동 측정** — Ahrefs/SEMrush 등 외부 SEO API 통합은 Phase 7+
- **PR 보도자료 발행** — 헬스조선/메디게이트 등 외부 미디어 자동 송고는 정책 외

## Schema 결정

```python
class Publication(Base):
    __tablename__ = "publications"
    id: int
    tenant_id: int (FK tenants.id, CASCADE)
    generated_content_id: int | None (FK generated_contents.id, SET NULL)
        # null 허용 — 시스템 외부에서 작성한 콘텐츠도 등록 가능
    channel: str  # naver_blog | tistory | own_blog | naver_place | press_release | youtube | threads | other
    destination_label: str  # 자유 텍스트 — 예: "메디맵 네이버블로그", "헬스조선 보도자료"
    url: str  # 공개 URL — UNIQUE(tenant_id, url)
    title: str
    published_at: datetime  # 외부 발행 시각 (사용자 입력)
    cited_by_engines: JSON  # [{"engine":"perplexity","first_seen":"...","last_seen":"...","query_count":N}]
    cite_count: int  # 누적 인용 카운트
    last_checked_at: datetime | None  # 매칭 함수가 마지막으로 돌린 시각
    notes: str
    created_at: datetime
```

## URL 매칭 정규화

- 대소문자 무시
- trailing slash 제거
- query string `utm_*` 제거
- `http://` ↔ `https://` 동일시
- 모바일 ↔ 데스크톱 도메인 변환 (m.blog.naver.com ↔ blog.naver.com)

## 인용 카운트 갱신 로직

```python
def match_publications_to_responses(session, tenant_id) -> dict:
    pubs = session.query(Publication).filter(tenant_id=tenant_id).all()
    queries = session.query(Query).filter(tenant_id=tenant_id).all()
    # 각 Response.cited_urls 를 평탄화해서 정규화 URL → engine 매핑
    # Publication.url 정규화와 매칭 → cited_by_engines 갱신
    return {"publications": N, "matched": N, "new_citations": N}
```

## 결과물

- `src/storage/models.py`: Publication 모델
- `alembic/versions/{hash}_add_publication.py`
- `src/analytics/citation.py`: match_publications_to_responses + URL 정규화
- `src/dashboard/publication_tab.py`: 📍 발행 현황 sub-tab UI
- `src/dashboard/app.py`: 콘텐츠 발행 그룹 sub-tabs 에 "발행 현황" 추가
- `src/dashboard/app.py`: render_content_card 에 "발행 등록" 버튼 추가
- `.planning/aeo_geo_strategy.md`: 전략 리서치
- `tests/test_citation_matching.py`: 신규
- `tests/test_alembic_smoke.py`: publications 테이블 추가
- `.planning/context.md`: 발행 추적 + 정책 stance 기록
