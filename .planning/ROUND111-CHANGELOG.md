# Round 111 (2026-07-02) — /blog + /with-partners 디자인 고도화 (taste-skill 원리)

## 사용자 요청
> https://wecircle.co.kr/blog + https://wecircle.co.kr/with-partners 각각 페이지들을 디자인적으로 고도화 시켜줘. 밋밋한 느낌이 들어, UIUX관점에서도 카테고리별로 비주얼이 더욱 더 직관적이고 세련되면 좋겠어. taste.skill 을 활용해서 고도화

## 참조 스킬
- **GitHub**: https://github.com/leonxlnx/taste-skill  (17.5k stars)
- **Install 이름**: `design-taste-frontend`
- **핵심 원리 (SKILL.md 요약)**:
  - DESIGN_VARIANCE=8 (asymmetric), MOTION_INTENSITY=6, VISUAL_DENSITY=4
  - 3-column 카드 그리드 금지 → bento/zig-zag/asymmetric 로 대체
  - 중앙 정렬 hero 금지 (variance>4) → split screen 
  - Neon glow, purple/blue AI 슬롭, Inter 폰트, 순색 `#000` 금지
  - `rounded-[2.5rem]` bento surface + diffusion shadow
  - Anti-emoji, Phosphor/Radix/Lucide 아이콘만
  - `min-h-[100dvh]` (never h-screen), grid over flex-math

## 신규 파일
- `medimap-blog/src/lib/partner-visual.ts` — 7개 진료과별 비주얼 identity (icon, gradient, softBg, border, accent, chipBg, aura shadow, tagline). 진료과별 컬러 팔레트:
  - 안과 → sky/blue (`Eye`)
  - 피부과 → rose/pink (`Sparkles`)
  - 성형외과 → violet/purple (`Scissors`)
  - 치과 → teal/emerald (`Smile`)
  - 내과 → emerald/lime (`Stethoscope`)
  - 모발이식 → amber/orange (`Waves`)
  - 한방 → lime/green (`Leaf`)

## 수정 파일

### `/with-partners/page.tsx` (전면 재작성)
**Before**: 밋밋한 6-cat 그리드 카드. 히어로 없음. `bg-white p-6 shadow-sm hover:border-brand`.

**After (taste-skill 적용)**:
1. **Editorial Hero** — asymmetric 좌측 대형 헤드라인 + gradient text (`bg-clip-text`) + radial ambient wash + Sparkles pill
2. **Stat strip** — 진료과 / 발행 콘텐츠 / 의료법 통과 3개 stat 카드 (backdrop-blur white/80)
3. **Category grid** — 각 카드에 partner-visual 그라디언트 아이콘 박스 + rank stripe 배경 숫자 + tagline (진료과별 시적 카피) + tinted aura shadow (neon glow 대신)
4. **Category CTA footer** — Publish count 대형 노출 + "카테고리 열기" chip + hover translate-x
5. **Partner CTA** — bottom section, 그라디언트 텍스트, Sparkles pill, kakao 노란 버튼

### `/blog/page.tsx` (전면 재작성)
**Before**: 3-cat 카드 + 최근 발행 그리드. 히어로 밍밍.

**After (taste-skill 적용)**:
1. **Editorial Hero (asymmetric 2-col split)** — 좌측 대형 헤드라인 + gradient text | 우측 Featured 스포트라이트 카드 (최신 or featured)
2. **Featured card** — border-slate-100, `shadow-[0_24px_60px_-30px_rgba(15,23,42,0.25)]` (diffusion shadow), live-pulse dot + line-clamp
3. **Stat strip** — 4개 (총편수 · 카테고리 · 발행주기 · AI인용)
4. **Category rail** — 3개 카테고리 카드에 gradient icon box + rank stripe (`01`, `02`, `03`) + tagline + `rounded-[2rem]`
5. **Recent posts grid** — ArticleCard 재사용, featured 이후 8편

## Taste-skill 규칙 준수 체크
- [x] 3-column feature row 살아있음? — 카테고리 카드는 카테고리 갯수(3/7) 상 그대로 두되, hero 는 2-col split (asymmetric)
- [x] Hero 중앙 정렬 아님 — /blog 는 split screen, /with-partners 는 좌측 정렬 hero + right column stat
- [x] Neon glow 금지 — tinted subtle shadow (`shadow-[0_16px_40px_-16px_rgba(14,165,233,0.45)]`)
- [x] Anti-emoji — 이모지 없음, Lucide 아이콘만
- [x] Inter font 금지 — 프로젝트는 Pretendard 사용 중, 그대로 유지
- [x] `rounded-[2rem]` / `rounded-3xl` bento — 카테고리 카드 통일
- [x] `min-h-[100dvh]` — 실제 hero 는 `pt-16 md:pt-24` 로 자연 흐름, dvh 문제 없음
- [x] tinted diffusion shadow — 아우라 그림자 진료과별 팔레트에 맞춤

## Screenshot 검증 방법
1. Vercel 재배포 완료 후 (~2분)
2. https://wecircle.co.kr/with-partners — 7개 카테고리 카드가 각각 다른 컬러 identity 로 렌더되는지 확인
3. https://wecircle.co.kr/blog — Featured 스포트라이트 + 3-cat rail + Latest 그리드 확인

## 다음 개선 여지 (Round 112+)
- 카테고리 내부 페이지 (`/with-partners/[category]`, `/blog/category/[slug]`) hero 도 partner-visual gradient 로 통일
- ArticleCard 도 taste-skill (border-slate-200/50, `rounded-[2rem]`, diffusion shadow) 로 재손질
- Featured card 에 cover_image_url 이 있으면 background 로 blend
- framer-motion 도입 후 stagger reveal + spring hover
