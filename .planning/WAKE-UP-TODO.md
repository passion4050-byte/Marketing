# 위서클 사이트 — 사용자 외출 중 자동 진행 결과 요약

## 상태
Round 111 v4 파일 준비 완료. **Push 대기 중** — 사용자가 돌아오면 아래 명령 실행.

## Push 명령 (돌아와서 실행)

```bash
cd C:\Users\user\Documents\Marketing
git add -A
git commit -m "Round 111 v4: Fraunces serif + FloatingInquiry/CTABlock 톤 매치 + Hero deprecate + hero 사이즈 마이크로 튜닝"
git push origin main
```

## 이번 라운드 결과 (Round 111 v4)

1. **Serif 폰트 self-host** — Fraunces 도입 (`layout.tsx` head 에 Google Fonts, `globals.css` 에서 `.font-serif` 오버라이드)
   - 효과: 브라우저 fallback Times New Roman → 매거진 감도 modern serif. Italic accent, numbered index, quote 감도 크게 개선

2. **FloatingInquiryButton** — 파란 그라디언트 → 검정 사각 pill + Kakao 아이콘 (톤 일관)

3. **CTABlock** — blog 상세 본문 CTA. gradient 카드 → editorial hairline divider + italic quote + 검정 button

4. **Hero.tsx** — Deprecated stub (`return null`). Home 에서 인라인 대체 완료. 실제 파일은 sandbox 삭제 권한 없어 stub 처리

5. **Hero 사이즈 마이크로 튜닝** — 
   - Home: `text-[68px]` → `text-[54px] xl:text-[62px]` + `<br className="xl:block">` 명시적 line break
   - About/Guide/Contact: `md:text-[60~64px]` → `md:text-[52px] xl:text-[58px]`
   - leading 도 `[1.05]` → `[1.08]` 로 조금 여유

## 스킵한 것 (사용자 판단 필요)
- **globals.css legacy class 완전 삭제** (`pill-label`, `container-content`, `btn-primary`, `card-*` 등) → admin/client 페이지가 여전히 참조. 삭제 시 그쪽 페이지 깨질 리스크. 다음 라운드에서 admin/client 톤 통일과 함께 정리 권장.
- **Hero.tsx 실제 파일 삭제** — sandbox 권한 없음. stub 만 남김.

## 스크린샷 검증 포인트 (배포 후)
- 우측 하단 floating 버튼: 검정 사각 pill 로 바뀜
- 홈/About/Guide/Contact hero 헤드라인: 데스크톱에서 자연스러운 wrap
- 모든 italic 부분 (예: 홈 "*병원이 남기는 문장*", About "*병원이 남길 문장*") 이 Fraunces 로 렌더 → 훨씬 매거진스러운 느낌
- Blog 상세 (`/blog/[slug]`) 본문 하단 CTA: hairline + italic quote + 검정 button 으로 정렬

## 다음 라운드 (Round 112) 후보
- Admin (`geo-v2-beta`) 대시보드도 editorial 톤 통일
- 그 후 globals.css legacy 완전 정리
- Blog MDX prose 스타일 미세 튜닝 (링크색, 코드블록)
- medimap-blog-v2 리포트 페이지도 톤 통일
