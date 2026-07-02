# Round 111 v4 (2026-07-02) — 자율 마이크로 튜닝

## 사용자 지시
> 다 진행해줘, 나 외출나갈꺼니 그냥 너가 알아서 다 진행해. 밸런스 세부 조정도 알아서.

## 완료

### 1. Serif 폰트 self-host — Fraunces 도입
- `layout.tsx` — Google Fonts 로 Fraunces (variable, italic-capable, opsz 9-144) 추가
- `globals.css` — `.font-serif` 유틸이 Fraunces 를 쓰도록 오버라이드 (fallback: ui-serif → Georgia)
- **효과**: 기존 브라우저 fallback (Times New Roman) → 매거진 감도 있는 modern serif 로 격상. 특히 numbered index (01, 02...), italic accent quote (*자산*, *병원이 남기는 문장*), Q1~4 라벨 등에서 인상 크게 변화

### 2. FloatingInquiryButton — 톤 매치
- Before: `bg-gradient-to-r from-brand to-accent` (파란 그라디언트 + 흰 링) — v2/v3 톤 완전 안 맞음
- After: `border-stone-900 bg-stone-900 text-white` (검정 사각 pill) + Kakao MessageCircle 아이콘. subtle drop shadow. `/client/*` 도 hide 추가

### 3. CTABlock — 톤 매치 (blog 상세 본문에서 사용)
- Before: gradient brand-to-brand-700 + neon glow blob + rounded-card + yellow kakao button
- After: 상단 hairline divider + editorial 2-col (좌: eyebrow + italic serif quote + description, 우: 검정 CTA arrow button) — 다른 CTA 와 완전 일관

### 4. Hero.tsx — Deprecated stub
- Home 에서 인라인 대체됨. import 없음 확인. 파일은 stub (`return null`) 으로 남김 (다음 라운드 완전 삭제)

### 5. 마이크로 튜닝 — Mobile/Desktop breakpoint
- **문제**: 스샷에서 홈 hero 좌측 `"검색이 검색을 벗어난 시대"` 가 데스크톱 좌측 컬럼이 좁아 부자연스러운 wrap
- **fix**: `text-[68px]` → `text-[54px] xl:text-[62px]` 로 낮추고 `xl` 에서만 명시적 lineb break 추가
- About/Guide/Contact hero 도 동일: `md:text-[60~64px]` → `md:text-[52px] xl:text-[58px]` 로 통일. leading-tight 대신 `leading-[1.08]` 로 여유

### 6. 레거시 CSS 정리
- `globals.css` 는 keep (기존 `pill-label` / `container-content` / `btn-primary` 등이 아직 admin/client 쪽에서 쓰이거나 무해 → 삭제 시 그쪽 페이지 리스크 있어 유지). 다만 body `bg-surface` 는 편집 페이지 body class 로 override 됐음 (`bg-[#FAFAF7]` on layout body)

## 스킵한 항목 (안전 이유)
- `globals.css` 의 legacy component classes 완전 삭제 → admin/client 페이지가 여전히 참조. 이건 별도 라운드에서 admin/client 톤 통일과 함께 정리해야 안전
- Hero.tsx 실제 파일 삭제 → sandbox 권한 없음. stub 처리로 대체

## Push

```bash
cd C:\Users\user\Documents\Marketing
git add -A
git commit -m "Round 111 v4: Fraunces serif + FloatingInquiry/CTABlock 톤 매치 + Hero deprecate + hero 사이즈 마이크로 튜닝"
git push origin main
```

## 검증 (2분 후)
- Fraunces 폰트 로드 확인 — italic accent 부분이 눈에 띄게 매거진스러워짐 (모든 페이지)
- 우측 하단 floating "문의하기" 버튼 → 검정 사각 pill 로
- Home / About / Guide / Contact hero 헤드라인 사이즈 자연스럽게 fit (긴 라인 wrap 개선)

## 다음 세션 후보
- Admin (`geo-v2-beta` 어드민) 도 editorial 톤으로 통일 (지금은 기존 브랜드 파랑/화이트 카드)
- 어드민 톤 통일 후 globals.css legacy class 완전 정리 (`pill-label` / `container-content` / `btn-primary` / `card-*`)
- Blog/[slug] MDX article 내부 (prose) 도 stone 팔레트로 미세 튜닝 (링크 색, 코드 블록 등)
- `medimap-blog-v2` (어드민 Next.js 리포트 페이지) 도 톤 통일
