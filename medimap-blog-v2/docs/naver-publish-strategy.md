# 네이버 블로그 발행 전략 — 정책 리스크와 3가지 옵션

## 핵심 사실 (먼저 알고 시작)

- 네이버는 **외부에서 블로그 글을 직접 작성하는 공식 API를 제공하지 않는다.** (검색·통계 API는 별개)
- 자동화 도구로 글을 게시하는 행위는 운영원칙상 **"비정상 행위"로 분류되어 계정 제재 사유**가 될 수 있다.
- 동일 IP에서 짧은 시간에 다수 게시 → 저품질 블로그(C-Rank/D.I.A 노출 누락)로 분류될 위험.
- 따라서 **"100% 무인 자동 발행"은 ToS 위반 + 비즈니스 리스크**가 동시 발생.

## 3가지 옵션

### (a) MANUAL — 권장 기본값

본문 + 태그를 Smart Editor 호환 HTML로 변환 → 사용자가 ‘HTML 모드’로 붙여넣고 직접 발행.

- ✅ 리스크 0, 발행 품질 통제 가능
- ❌ 1건당 1~2분 수동 작업 필요
- 적합: 주 1~5건 발행

```ts
import { buildManualArtifact } from '@/lib/publish/naver';
const a = buildManualArtifact({ title, body, tags });
navigator.clipboard.writeText(a.smartEditorHtml);
window.open(a.publishGuideUrl, '_blank');
```

### (b) EMAIL — 드래프트 이메일 자동 발송

자동 생성된 발행 드래프트를 담당자 이메일로 전송 → 사람이 검토 후 게시.

- ✅ 리스크 0, 자동 생성 + 사람 게이트
- ❌ 이메일 도구 1개 추가 비용 (Resend 무료 100건/일)
- 적합: 주 5~20건, 검수 인원 1명

`.env.local` 추가:
```env
RESEND_API_KEY=re_xxx
RESEND_FROM=auto@yourdomain.com
```

### (c) PLAYWRIGHT — 헤드리스 자동 발행 (옵트인, 리스크 인지 필수)

별도 worker에서 Playwright로 네이버 로그인 → Smart Editor 작성 → 게시 자동화.

- ⚠️ ToS 회색 지대, 계정 정지 가능
- ⚠️ Vercel 서버리스에서 **실행 불가** (Chromium 바이너리 + 메모리 제한)
- ⚠️ 발행 간격 5분 이상, 일 5건 이하로 throttle 필수

권장 배포:
- Railway / Render / Fly.io 등 영구 컨테이너 + Playwright
- GitHub Actions self-hosted runner (퇴근 시간대 cron)
- 로컬 데스크탑 + cron (가장 안전, 비정기적)

본 저장소는 **enqueue만** 담당하고 실 실행은 외부 worker로 위임.
worker 구현 템플릿은 별도 저장소(예: `medimap-naver-worker`)로 분리 권장.

`.env.local`:
```env
NAVER_WORKER_WEBHOOK_URL=https://worker.yourdomain.com/jobs
NAVER_WORKER_ACK_KEY=secret_xxx
```

## 의사결정 가이드

| 발행 빈도 | 추천 전략 | 리스크 |
|---|---|---|
| 주 1~5건 | (a) MANUAL | 없음 |
| 주 5~20건 | (b) EMAIL + 사람 검수 | 없음 |
| 일 1~3건 (정기) | (b) EMAIL 우선, 검증 후 (c) | 낮음 |
| 일 5건 이상 | (c) PLAYWRIGHT + 별도 워커 + throttle | 중간 |
| 일 10건 이상 | **권장 안 함** — 저품질 분류 위험 | 높음 |

## 본문 자체로 노출 정확도 높이는 법 (자동화보다 효과 큼)

1. 첫 문단에 키워드 1회 자연스럽게
2. 본문 1,500자 이상 + 이미지 3장 이상
3. 외부 링크보단 자사 도메인 내부 링크 우선
4. 댓글·이웃 수가 점진적으로 증가하는 패턴 (스파이크 금지)
5. 동영상 1개 임베드 (체류시간 가산)

이 5가지는 자동화 강도와 무관하게 **C-Rank 신호**에 직접 작용한다.
