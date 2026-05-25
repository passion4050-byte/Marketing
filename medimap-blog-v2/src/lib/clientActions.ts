/**
 * 클라이언트 사이드 액션 — 클립보드/파일 다운로드/PDF 인쇄 공통 유틸.
 *
 * 모든 페이지의 "복사" / "다운로드" / "PDF" 버튼이 일관된 UX로 동작하도록 한다.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallthrough */
  }
  try {
    // 구식 fallback (HTTP, iframe 등 clipboard API 미허용 환경)
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

export function downloadJsonLdHtml(filename: string, payloads: unknown[]): void {
  const json = JSON.stringify(payloads, null, 2);
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>MEDIMAP GEO — JSON-LD</title>
<script type="application/ld+json">
${json}
</script>
</head>
<body>
<h1>MEDIMAP GEO — Schema.org JSON-LD</h1>
<p>위 &lt;script&gt; 블록을 병원 홈페이지 &lt;head&gt; 영역에 그대로 복사해 넣으세요.</p>
<pre>${escapeHtml(json)}</pre>
</body>
</html>`;
  downloadText(filename, html, 'text/html;charset=utf-8');
}

export function downloadMarkdownBundle(filename: string, posts: Array<{ title: string; body: string }>): void {
  const md = posts
    .map((p, i) => `# ${String(i + 1).padStart(2, '0')}. ${p.title}\n\n${p.body}`)
    .join('\n\n---\n\n');
  downloadText(filename, md, 'text/markdown;charset=utf-8');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function printCurrentPage(): void {
  if (typeof window !== 'undefined') window.print();
}

/**
 * 미니 토스트 — 의존성 없는 1줄 알림. 같은 메시지는 디바운스.
 * (radix/sonner 같은 라이브러리 도입 전까지 임시.)
 */
const TOAST_ID = 'medimap-geo-toast';
export function showToast(message: string, opts?: { kind?: 'success' | 'error' | 'info'; ms?: number }): void {
  if (typeof document === 'undefined') return;
  const kind = opts?.kind ?? 'success';
  const ms = opts?.ms ?? 2400;
  let el = document.getElementById(TOAST_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = TOAST_ID;
    el.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:24px',
      'transform:translateX(-50%)',
      'z-index:99999',
      'padding:10px 18px',
      'border-radius:12px',
      'box-shadow:0 10px 30px rgba(15,23,42,.18)',
      'font-size:13px',
      'font-weight:600',
      'letter-spacing:-0.01em',
      'opacity:0',
      'transition:opacity .18s ease, transform .18s ease',
      'pointer-events:none'
    ].join(';');
    document.body.appendChild(el);
  }
  const tone = kind === 'error' ? '#FEE2E2;color:#991B1B' : kind === 'info' ? '#E0F2FE;color:#075985' : '#CCFBF1;color:#0F766E';
  el.setAttribute('style', el.getAttribute('style') + `;background:${tone}`);
  el.textContent = message;
  requestAnimationFrame(() => {
    if (!el) return;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(-4px)';
  });
  window.clearTimeout((el as any).__hideTimer);
  (el as any).__hideTimer = window.setTimeout(() => {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(0)';
  }, ms);
}
