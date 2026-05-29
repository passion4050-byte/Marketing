# 다음 세션 시작 시 할 일 (Round 27 후속)

> 2026-05-29 종료 시점 — 자사 인사이트 v3 가이드 작성 완료 후 87번 샘플 재작성 작업 직전 중단.

## 즉시 (5분)

1. **Round 26 fix 4 push** — 워크플로 if: !cancelled() 조건 변경한 게 push 안 됨
   ```
   cd C:\Users\user\Documents\Marketing
   git add .
   git commit -m "Round 26 fix 4 + Round 27 v3 guide doc"
   git push origin main
   ```

2. **Vercel medimap-blog 수동 redeploy** — Round 26 의 cover 8개 + body 20개 마이그레이션이 라이브 반영 안 됨
   - Vercel → medimap-blog → 최신 deployment → Redeploy

## Round 27 진행 (사용자 결정 받은 작업)

3. **87번 (의료 GEO 최적화) 본문 정성 재작성**
   - 가이드: `medimap-blog/docs/CONTENT_GUIDE_v3_SELF_INSIGHTS.md`
   - 구조: TL;DR 3줄 + 이모지 H2 + 배지 H3 + 표 + 메디맵 인용 박스 + 자사 CTA + 실사 이미지 5장
   - 약 2500자
   - 사용자 OK 받으면 5편 일괄

4. **자사 6편 실사 이미지 생성 + Storage 업로드**
   - Pollinations prompt: "professional editorial photography, modern Korean medical clinic environment, ..."
   - 글당 5장 × 6편 = 30장
   - Round 26 의 image_uploader.py 재사용

5. **scheduler.py / generator.py LLM prompt 분기**
   - 자사 tenant (`business_model='self'`) 일 때 v3 가이드 system prompt 주입
   - 다음 cron 부터 자동 적용

6. **image_picker.py prompt 분기**
   - 자사면 실사, 파트너면 Pixar
   - 다음 cron 부터 자동 적용

7. **Migration 028** — 자사 6편 body + cover URL 일괄 UPDATE

## 잔존 이슈

- **85번 (벨리셀 여드름 흉터) body figure 4개 Pollinations 영구 거부** — 어드민에서 수동 처리 또는 무시
- **Vercel deploy 캐시 stale 가끔** — Round 24 의 hook 자동화 후 개선됨

## 메모리 참고

- [medimap-round23-state](memory:medimap_round23_state) — 활성 tenant 7개
- [medimap-blog-category-filter](memory:medimap_blog_category_filter) — Round 16 NULL 필터
- [medimap-sql-gotchas](memory:medimap_sql_gotchas) — Migration 함정 5가지
- [medimap-business-model](memory:medimap_business_model) — 3-layer 구조
