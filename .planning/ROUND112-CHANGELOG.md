# Round 112 (2026-07-02) — 어드민 브랜드 정리 + 즉시 발행 + Round 113 로드맵

## 사용자 요청 (매우 광범위 — 여러 라운드로 분할)
1. 어드민 페이지 "메디맵" → "위서클" 전면 변경 + wecircle 톤앤매너
2. 기능 통합/시각화/자동화 루프 개선
3. 검수 대기 empty state 문구 개선 + 즉시 발행 버튼
4. 콘텐츠 완료 탭 카테고리 chip + 페이지네이션 + 삭제/수정
5. 비용 모니터 실데이터 연동
6. 월간 보고서 이메일 브랜드 (WECIRCLE) + 데이터 정합성

## 이번 세션 (Round 112) 완료

### 1. 브랜드 sed 전면
23개 어드민 파일에서 일괄:
- `메디맵` → `위서클`
- `MEDIMAP GEO` → `WECIRCLE GEO`
- `MEDIMAP` → `WECIRCLE`
- `medi-map.co.kr` → `wecircle.co.kr`

파일: `src/app/admin/(portal)/*.tsx`, `src/components/admin/*.tsx`

**검증**: `grep -rc "메디맵" src/app/admin/ src/components/admin/` → 0 (모두 정리)

### 2. 검수 대기 empty state 재설계 + 즉시 발행 CTA
- Before: `"검수 대기 큐가 비어 있습니다. 자동발행 cron 다음 사이클까지 대기."`
- After: 아이콘 📭 + 3-line 안내 + 검정 CTA 버튼 `즉시 발행 → 클라이언트 선택`
- 버튼은 `/admin/calendar` 로 라우팅 (클라이언트별 즉시 발행 UI)

### 3. 즉시 발행 API 신규
`medimap-blog-v2/src/app/api/admin/publish-now/route.ts`

- POST body: `{ tenantId, keyword? }`
- 동작: GitHub Actions `auto-publish.yml` `workflow_dispatch` 트리거 (tenant_id input)
- Fallback: `GH_TOKEN` 미설정 시 사용자가 GH Actions UI 에서 수동 실행하도록 URL 반환

**필수 Vercel env**
- `GH_TOKEN` — GitHub PAT (repo:workflow scope)
- `GH_REPO` — 기본 `passion4050-byte/Marketing`
- `PUBLISH_WORKFLOW` — 기본 `auto-publish.yml`

**필수 auto-publish.yml 수정 (다음 라운드)**: `workflow_dispatch.inputs` 에 `tenant_id`, `keyword` 추가 필요.

---

## 다음 세션 (Round 113) 로드맵

시간 상 이번 세션에서 다 못 함. 우선순위대로:

### P0 (필수 다음 라운드)
1. **어드민 톤 editorial 통일** — 사이트와 동일한 warm off-white + hairline. 지금 어드민은 여전히 파란 그라디언트 KPI 카드 + 카드 shadow. `theme.ts` 도 stone 팔레트로 재작성 필요.
2. **월간 보고서 데이터 정합성 감사** — BGN 밝은눈안과 대시보드에는 165회 인용이 있는데 보고서 미리보기에서는 0 표시. 
   - 원인 후보: 리포트 페이지가 다른 tenantId 를 참조하거나, mentions 필터가 `is_target=true` 인데 밝은눈안과 mention 이 all=false 이거나, 기간 필터 (이번 달 vs 30일) 불일치
   - 조사 순서: `SELECT tenant_id, is_target, COUNT(*) FROM mentions WHERE created_at >= (now - interval '30 days') GROUP BY 1,2` 로 실데이터 확인 → reports/[tenantId] 페이지 fetch 로직 점검

### P1 (기능 개선)
3. **콘텐츠 완료 탭 개선**
   - 카테고리 chip (진료과별)
   - 페이지네이션 (25건씩)
   - 인라인 삭제/수정 (이미 인라인 편집 있으니 확장)
4. **auto-publish.yml workflow_dispatch inputs** 추가 (`tenant_id`, `keyword`)
5. **비용 모니터 오늘 값** — `llm_call_logs` 실 데이터. 지금은 "비교 데이터 없음". 컬럼 확인 + cron 이 실제로 log 쓰는지 검증

### P2 (자동화 루프)
6. **인용 down-trending 감지 알림** — 클라이언트 A 의 인용이 최근 7일 이전 7일 대비 -50% → 이메일 알림 + 자동 A/B 시작 제안
7. **learned_insights 자동 적용률** 위젯 — 얼마나 많은 인사이트가 실제 prompt 에 주입됐는지, `applied_at` 컬럼 활용
8. **경쟁사 top 5 → 자동 학습 큐** — 스샷의 "경쟁 SaaS 도메인 자동 발견" 페이지에서 클릭 한 번으로 학습 등록

### P3 (UX)
9. Sidebar IA 정리 (지금 `AI 인용 추적` / `SaaS 시장 노출도` / `Funnel · ROI` / `월간 보고서` 가 분리돼 있는데 실제로는 성과 대시보드 하나로 통합 가능)
10. 대시보드 KPI 카드 → editorial hairline stat 스타일

## Push

```bash
cd C:\Users\user\Documents\Marketing
git add -A
git commit -m "Round 112: 어드민 메디맵→위서클 sed 전면 + 검수대기 empty state 개선 + 즉시발행 API"
git push origin main
```

## 배포 후 확인
1. 어드민 어디에도 "메디맵" / "MEDIMAP" 라벨 없음 (검색 → 0건)
2. `/admin/content-queue` 검수 탭 비었을 때: 📭 + 3-line 안내 + 검정 CTA 버튼
3. `/api/admin/publish-now` POST test:
   ```bash
   curl -X POST https://geo-v2-beta.vercel.app/api/admin/publish-now \
     -H "Content-Type: application/json" \
     -d '{"tenantId": 4}'
   ```
   - `GH_TOKEN` 없으면 `needsManual: true` + GH Actions URL 반환
   - `GH_TOKEN` 있으면 workflow_dispatch 성공 → 202
