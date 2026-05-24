/**
 * 네이버 블로그 발행 — 3가지 옵션.
 *
 * ⚠️ 정책 리스크 — 반드시 읽고 선택할 것:
 *
 *   1. 네이버는 외부에서 블로그 글을 직접 작성하는 공식 API를 제공하지 않는다.
 *      (검색·통계 API는 있으나, 글쓰기 API는 없음.)
 *
 *   2. 자동화 도구로 글을 게시하는 행위는 네이버 운영원칙상 "비정상 행위"로
 *      간주되어 계정 정지·검색 노출 누락(저품질) 사유가 될 수 있다.
 *
 *   3. 따라서 "100% 무인 자동 발행"은 ToS 위반 + 비즈니스 리스크가 크다.
 *
 * 본 모듈은 3가지 단계적 옵션을 제공:
 *
 *   (a) MANUAL — 본문 + 이미지를 ZIP으로 패키징 + 클립보드 + 발행 가이드 URL 발급 (기본·안전)
 *   (b) EMAIL  — 담당자에게 발행 드래프트 이메일 전송 (사람이 게시 결정)
 *   (c) PLAYWRIGHT — 헤드리스 브라우저로 작성 (운영 리스크 명시 옵트인 + 별도 환경에서 실행)
 *
 * 권장: (a) → (b)로 운영하되, 발행량이 일정 임계 이상이고 사용자가 리스크 수용 시 (c) 도입.
 */

export type NaverPublishStrategy = 'manual' | 'email' | 'playwright';

export interface NaverPublishPayload {
  title: string;
  body: string;          // HTML or SmartEditor 호환 텍스트
  tags: string[];
  category?: string;
  /** 본문 끝에 자동 부착할 CTA + UTM 단축링크 */
  ctaShortUrl?: string;
}

export interface NaverPublishResult {
  strategy: NaverPublishStrategy;
  status: 'queued' | 'sent' | 'manual_required' | 'failed';
  message: string;
  /** (a) MANUAL: 클립보드 콘텐츠 ID / (b) EMAIL: 발송 ID / (c) PLAYWRIGHT: 외부 잡 ID */
  artifactId?: string;
}

// =====================================================
// (a) MANUAL — Smart Editor 호환 형태로 패키지 생성
// =====================================================

export function buildManualArtifact(payload: NaverPublishPayload): {
  smartEditorHtml: string;
  copyText: string;
  publishGuideUrl: string;
} {
  const cta = payload.ctaShortUrl
    ? `\n\n---\n👉 상담 예약: ${payload.ctaShortUrl}\n`
    : '';
  const smartEditorHtml = wrapSmartEditor(payload.title, payload.body + cta, payload.tags);
  const copyText = `# ${payload.title}\n\n${payload.body}${cta}\n\n태그: ${payload.tags.map((t) => `#${t}`).join(' ')}`;
  const publishGuideUrl = 'https://blog.naver.com/PostWriteForm.naver';
  return { smartEditorHtml, copyText, publishGuideUrl };
}

function wrapSmartEditor(title: string, body: string, tags: string[]): string {
  // 네이버 Smart Editor에 붙여넣었을 때 단락이 깨지지 않도록 <p> 단위로 변환
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
  return [
    `<h1>${title}</h1>`,
    paragraphs,
    `<p>태그: ${tags.map((t) => `#${t}`).join(' ')}</p>`
  ].join('\n');
}

// =====================================================
// (b) EMAIL — 담당자에게 발행 드래프트 전송
// =====================================================

export interface EmailDispatchInput {
  to: string;
  payload: NaverPublishPayload;
  /** Resend / SES / Postmark 등 — env 기반 */
  apiKey?: string;
}

export async function dispatchEmailDraft(input: EmailDispatchInput): Promise<NaverPublishResult> {
  const apiKey = input.apiKey ?? process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      strategy: 'email',
      status: 'failed',
      message: 'RESEND_API_KEY 미설정 — 이메일 발송 불가'
    };
  }

  const { smartEditorHtml } = buildManualArtifact(input.payload);
  const html = [
    `<h2>네이버 블로그 발행 드래프트</h2>`,
    `<p><b>${input.payload.title}</b></p>`,
    `<p>아래 HTML을 네이버 Smart Editor에 ‘HTML 모드’로 붙여넣어 발행해주세요.</p>`,
    `<hr/>`,
    smartEditorHtml,
    `<hr/>`,
    `<p>가이드: <a href="https://blog.naver.com/PostWriteForm.naver">바로 글쓰기</a></p>`
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? 'no-reply@medimap-geo.app',
      to: [input.to],
      subject: `[발행 드래프트] ${input.payload.title}`,
      html
    })
  });

  if (!res.ok) {
    return { strategy: 'email', status: 'failed', message: `Resend ${res.status}` };
  }
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return {
    strategy: 'email',
    status: 'sent',
    message: '담당자 이메일로 발행 드래프트 전송 완료',
    artifactId: json.id
  };
}

// =====================================================
// (c) PLAYWRIGHT — 헤드리스 자동 발행 (옵트인 + 외부 잡)
// =====================================================

/**
 * Playwright 자동화는 Vercel 서버리스에서 실행 불가 (브라우저 바이너리 미포함, 메모리 제한).
 * 권장 배포 위치:
 *   - Railway / Render / Fly.io 등 영구 컨테이너
 *   - GitHub Actions self-hosted runner
 *   - 로컬 데스크탑 + cron
 *
 * 이 함수는 외부 잡 큐(예: Upstash QStash, Inngest)에 작업을 푸시할 뿐
 * 실 실행은 별도 worker에서 수행한다.
 */
export async function enqueuePlaywrightJob(payload: NaverPublishPayload): Promise<NaverPublishResult> {
  const webhook = process.env.NAVER_WORKER_WEBHOOK_URL;
  const ack = process.env.NAVER_WORKER_ACK_KEY;

  if (!webhook || !ack) {
    return {
      strategy: 'playwright',
      status: 'manual_required',
      message:
        'NAVER_WORKER_WEBHOOK_URL 미설정 — Playwright worker 미구성. (a) manual 또는 (b) email로 폴백 권장.'
    };
  }

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-ack-key': ack },
    body: JSON.stringify({ kind: 'naver_blog_publish', payload, requestedAt: Date.now() })
  });

  if (!res.ok) {
    return { strategy: 'playwright', status: 'failed', message: `Worker ${res.status}` };
  }
  const json = (await res.json().catch(() => ({}))) as { jobId?: string };
  return {
    strategy: 'playwright',
    status: 'queued',
    message: 'Playwright worker에 발행 잡 enqueue 완료. 5~15분 내 처리.',
    artifactId: json.jobId
  };
}

// =====================================================
// 통합 디스패처 — strategy에 따라 라우팅
// =====================================================

export async function publishToNaver(
  strategy: NaverPublishStrategy,
  payload: NaverPublishPayload,
  context?: { emailTo?: string }
): Promise<NaverPublishResult> {
  switch (strategy) {
    case 'manual': {
      const a = buildManualArtifact(payload);
      return {
        strategy: 'manual',
        status: 'manual_required',
        message: `Smart Editor 호환 HTML이 클립보드에 복사되었습니다. 발행 페이지: ${a.publishGuideUrl}`
      };
    }
    case 'email':
      if (!context?.emailTo) {
        return { strategy: 'email', status: 'failed', message: 'emailTo 필요' };
      }
      return dispatchEmailDraft({ to: context.emailTo, payload });
    case 'playwright':
      return enqueuePlaywrightJob(payload);
  }
}
