# Round 111 v3 (2026-07-02) — Site-wide editorial 톤 통일

## 사용자 요청
> 지금 만든 페이지들의 톤앤매너 그대로 다른 페이지들과 메인 화면등 모든 페이지들을 동일하게 디자인과 uiux 적용하자. 그리고나서 한번더 모든 페이지들의 씽크, 전체적으로 체크해서 개선할곳 있으면 고도화

## v3 톤 원칙 (v2 에서 확립, 사이트 전체 적용)
- BG: `#FAFAF7` (warm off-white) — body 에 강제
- Ink: stone-950 / 900 (검정 계열)
- Sub: stone-500 / 600
- Divider: `border-stone-200/70` / `border-stone-300`
- Accent: 없음 (오로지 stone-900 검정)
- Numeral: `font-serif` italic 강조
- Meta bar: eyebrow `text-[10px] font-semibold uppercase tracking-[0.32em]`
- Container: `mx-auto w-full max-w-[1280px] px-6 lg:px-10`
- Rounded: 없음 (에디토리얼은 sharp corner)
- Interaction: hover 시 subtle translate + grayscale→color transition

## 수정 파일 (14개)

### 전역 컴포넌트
1. **`app/layout.tsx`** — `body` 에 `bg-[#FAFAF7] text-stone-900 antialiased`
2. **`components/Header.tsx`** — off-white masthead, hairline scroll divider, italic serif "Insights" 부제, mobile drawer 도 numbered
3. **`components/Footer.tsx`** — colophon-style. Off-white bg (`#F5F4EF`), 3-column directory (Sections/Contact/Legal), CTA row with italic quote
4. **`components/ArticleCard.tsx`** — 3 variants:
   - `default`: cover-forward 4:5 grayscale→color
   - `compact`: text-only w/ top divider
   - `index`: TOC row w/ serif numeral

### 공개 페이지
5. **`app/page.tsx` (홈)** — Editorial masthead + 4:5 cover Featured (Cover Story badge) + numbered pillars (3) + Latest 3-card grid + Partner directory teaser + Contact CTA
6. **`app/about/page.tsx`** — Manifesto 톤. 4 principles numbered + 3 chronology + serif italic 대형 인용
7. **`app/guide/page.tsx`** — 5 steps workflow + FAQ + editorial CTA
8. **`app/contact/page.tsx`** — 2 channels (Kakao/Email) + Hours + Company info
9. **`app/blog/page.tsx`** — 이미 v2 완료 (magazine cover masthead)
10. **`app/blog/category/[slug]/page.tsx`** — Section chip nav + Archive TOC (ArticleCard `index` variant 재사용)
11. **`app/blog/[slug]/page.tsx`** — container-content → max-w-[1280px] wrapper 만 조정 (내용은 이미 편집적)
12. **`app/with-partners/page.tsx`** — 이미 v2 완료 (numbered directory)
13. **`app/with-partners/[category]/page.tsx`** — Directory chip nav + Partner clinics list + Latest posts grid (grayscale cover)
14. **`app/with-partners/[category]/[partner]/page.tsx`** — 파트너 masthead + Archive TOC + Contact CTA
15. **`app/with-partners/[category]/[partner]/[slug]/page.tsx`** — wrapper + CTA + related posts (numbered list) 톤 매치
16. **`app/not-found.tsx`** — 404 editorial (serif 대형 numeral)
17. **`app/privacy/page.tsx`** — Breadcrumb bar + max-w-3xl prose stone
18. **`app/terms/page.tsx`** — 동일 pattern

## 폐기한 요소
- `container-content` 클래스 → `mx-auto max-w-[1280px]` 직접 사용
- `pill-label` → `text-[10px] uppercase tracking-[0.32em]` 인라인
- `bg-brand-50` / `text-brand-700` / `from-brand to-accent` — 사이트 전체에서 제거
- Rounded corners (`rounded-2xl` 등) — sharp corner 로 통일
- Emoji · Sparkles pill · gradient text · neon glow — 전부 제거

## Sync 체크 결과 (전체 크로스체크)

**Container 통일**
```
Home         → max-w-[1280px] ✓
About        → max-w-[1280px] ✓
Guide        → max-w-[1280px] ✓
Contact      → max-w-[1280px] ✓
Blog         → max-w-[1280px] ✓
Blog cat     → max-w-[1280px] ✓
Blog post    → max-w-[1280px] ✓
Partners     → max-w-[1280px] ✓
Partners cat → max-w-[1280px] ✓
Partner      → max-w-[1280px] ✓
Partner post → max-w-[860px]  ✓ (본문 가독성 위해 narrower)
Privacy      → max-w-[1280px] + prose max-w-3xl ✓
Terms        → max-w-[1280px] + prose max-w-3xl ✓
404          → max-w-[1280px] ✓
```

**Header/Footer 톤 매치**: 전 페이지 layout.tsx 통해 자동 반영 ✓

**Typography 스케일**
```
Meta eyebrow: text-[10px] tracking-[0.32em] uppercase   (전 페이지 통일) ✓
Section eyebrow: text-xs tracking-[0.35em] uppercase   (전 페이지 통일) ✓
Overline: text-[10px] tracking-[0.28em] uppercase       (전 페이지 통일) ✓
Hero H1: text-[42px] md:text-[52~68px] font-black tracking-[-0.025em] ✓
Section H2: text-2xl md:text-[28~40px] font-black tracking-[-0.02em] ✓
Body: text-[15px] leading-[1.75] ✓
Numeral: font-serif font-light tabular-nums ✓
```

**Color 통일**
- stone-950 (headings)
- stone-900 (strong body)
- stone-700 (body)
- stone-600 (sub-body)
- stone-500 (meta)
- stone-400 (muted numeral)
- stone-300 (divider strong)
- stone-200/70 (divider hairline)
- stone-100 (image bg)
- `#FAFAF7` (page bg)
- `#F5F4EF` (footer bg)
- stone-900 bg / white text (CTA button)

**Interaction 통일**
- Cover images: `grayscale → group-hover:grayscale-0` transition-[900ms]
- Arrow: `group-hover:-translate-y-0.5 group-hover:translate-x-0.5`
- Numeral: `text-stone-400 → group-hover:text-stone-900`
- Chip: `border-stone-300 → hover:border-stone-900 hover:bg-stone-900 hover:text-white`

## 추가 고도화 (Round 111 v3 에서 함께 진행)
- ArticleCard 에 `index` variant 신규 추가 (TOC 스타일) — 카테고리 페이지에서 재사용
- Home 에 Partner directory teaser 신규 섹션 (Home ↔ Partners 브릿지)
- Home CTA 는 primary=파트너 아카이브 / secondary=인사이트 로 이원화
- 404 페이지 완전 재작성 (기존 gradient 폐기)
- Privacy/Terms breadcrumb bar 통일

## Push 명령

```bash
cd C:\Users\user\Documents\Marketing
git add -A
git commit -m "Round 111 v3: 사이트 전체 editorial 톤 통일 (Home/About/Guide/Contact/Category/Partner/404/Legal + Header/Footer/ArticleCard)"
git push origin main
```

## 검증 URL (2분 후)

| URL | 확인 |
|---|---|
| https://wecircle.co.kr/ | Split hero + Cover Story 4:5 이미지 + numbered pillars |
| https://wecircle.co.kr/about | 4 principles + timeline + manifesto quote |
| https://wecircle.co.kr/guide | 5 steps + FAQ Q1~4 |
| https://wecircle.co.kr/contact | 2 channels + Hours + Company |
| https://wecircle.co.kr/blog/category/content_marketing | Section chips + Archive TOC |
| https://wecircle.co.kr/with-partners/eyeclinic | Category chips + Partner clinics list + Latest grid |
| https://wecircle.co.kr/notfound-test | 404 editorial (테스트: 존재 안 하는 URL) |
| Header/Footer | 전 페이지에 warm off-white masthead + colophon footer |

## 남은 개선 (Round 112+)
- Serif 폰트 정식 도입 (현재 브라우저 fallback) — Playfair Display / Cormorant 등 self-host
- FloatingInquiryButton (하단 fab) 톤 매치
- Blog/[slug] 본문 CTABlock 컴포넌트 톤 정렬
- Hero.tsx (레거시 컴포넌트) 삭제 검토 — Home 에서 인라인 대체됨
- ArticleCard 는 blog/category 에서만 `index` variant 사용 중 → 다른 곳도 정리
- FeatureCard, pill-label, container-content 등 레거시 CSS 정리 (globals.css)
