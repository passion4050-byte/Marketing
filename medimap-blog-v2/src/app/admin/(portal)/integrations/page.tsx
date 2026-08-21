'use client';

import { CheckCircle2, ExternalLink, Plug, XCircle, Youtube, Instagram, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

interface Integration {
  id: string;
  label: string;
  description: string;
  status: 'connected' | 'available' | 'roadmap';
  icon: typeof Youtube;
  startUrl?: string;
  scope?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'youtube',
    label: 'YouTube + Shorts',
    description: '생성된 스크립트 → 자동 메타데이터 → mp4 업로드 → 발행 큐 (Data API v3)',
    status: 'available',
    icon: Youtube,
    startUrl: '/api/admin/youtube/oauth/start',
    scope: 'youtube.upload + youtube.readonly'
  },
  {
    id: 'instagram',
    label: 'Instagram Reels',
    description: 'Meta Graph API — Business Account + App Review 통과 필요',
    status: 'roadmap',
    icon: Instagram,
    scope: 'instagram_basic + instagram_content_publish'
  },
  {
    id: 'slack',
    label: 'Slack 알림',
    description: 'AI 인용 / 비용 초과 / 검수 큐 알림을 Slack 워크스페이스로 전송',
    status: 'roadmap',
    icon: MessageSquare,
    scope: 'incoming-webhook'
  },
  {
    id: 'kakao',
    label: '카카오톡 비즈 메시지',
    description: '클라이언트에게 검수 요청 + 월간 보고서 발송 (카카오 비즈 메시지 API)',
    status: 'roadmap',
    icon: MessageSquare
  }
];

export default function IntegrationsPage() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  const onConnect = (i: Integration) => {
    if (i.status !== 'available') {
      showToast(`${i.label}은(는) Phase 2 로드맵`, { kind: 'info' });
      return;
    }
    if (i.startUrl) {
      // OAuth flow: redirect to Google
      window.location.href = i.startUrl;
    }
  };

  const onDisconnect = (id: string) => {
    setConnected((p) => ({ ...p, [id]: false }));
    showToast('연결 해제됨');
  };

  return (
    // Round 169 (2026-08-20) — 모바일: px-8 하드코딩 → 반응형(md+ 는 기존 px-8 복원)
    <div className="px-4 py-5 md:px-8 md:py-6">
      <header className="admin-page-header">
        <div>
          <h1 className="admin-page-title">연동 (Integrations)</h1>
          <p className="admin-page-desc">YouTube · 이메일 · Slack 등 외부 서비스 연동을 관리합니다</p>
        </div>
      </header>

      <div className="card mb-4 border-l-4 border-ink bg-surface-muted/60 p-4 text-xs text-ink">
        <strong>YouTube 연동 안내:</strong> 각 클라이언트(병원)가 자기 채널에 OAuth 인증해야 합니다.
        access_token / refresh_token 은 Supabase 에 암호화 저장되며, 위서클은 영상 업로드 권한만 보유합니다.
        Google Cloud Console 에서 OAuth Client ID 발급 + 콜백 URL <code className="rounded bg-surface-base px-1 py-0.5">/api/admin/youtube/oauth/callback</code> 등록 필요.
      </div>

      <div className="space-y-3">
        {INTEGRATIONS.map((i) => {
          const Icon = i.icon;
          const isConnected = connected[i.id];
          return (
            <div key={i.id} className="card flex items-start justify-between gap-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-ink">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-ink">{i.label}</h3>
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      i.status === 'connected' ? 'bg-status-successSoft text-status-success' :
                      i.status === 'available' ? 'bg-surface-muted text-ink' :
                      'bg-surface-muted text-ink-muted'
                    )}>
                      {i.status === 'connected' ? '연결됨' : i.status === 'available' ? '사용 가능' : '로드맵'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{i.description}</p>
                  {i.scope && <p className="mt-1 text-[10px] font-mono text-ink-faint">{i.scope}</p>}
                </div>
              </div>
              <div className="shrink-0">
                {isConnected ? (
                  <button onClick={() => onDisconnect(i.id)} className="btn-secondary text-xs">
                    <XCircle className="h-3.5 w-3.5" /> 연결 해제
                  </button>
                ) : i.status === 'available' ? (
                  <button onClick={() => onConnect(i)} className="btn-primary text-xs">
                    <Plug className="h-3.5 w-3.5" /> 연결하기
                  </button>
                ) : (
                  <button disabled className="btn-secondary text-xs opacity-50">
                    Phase 2
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <details className="card mt-6 p-4">
        <summary className="cursor-pointer text-sm font-bold text-ink">YouTube 설정 가이드 — Google Cloud Console</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-ink-soft">
          <li>https://console.cloud.google.com → 프로젝트 생성 (예: medimap-geo-youtube)</li>
          <li>API & Services → Library → YouTube Data API v3 사용 설정</li>
          <li>OAuth 동의 화면 구성 (앱 이름 = WECIRCLE GEO, 사용자 유형 = External)</li>
          <li>사용자 인증 정보 → OAuth Client ID 생성 → Web application</li>
          <li>승인된 리디렉션 URI 에 추가:<br/><code className="rounded bg-surface-base px-1 py-0.5">https://geo-v2-beta.vercel.app/api/admin/youtube/oauth/callback</code></li>
          <li>발급된 Client ID / Secret 을 Vercel env 에 <code>YOUTUBE_CLIENT_ID</code>, <code>YOUTUBE_CLIENT_SECRET</code> 으로 추가</li>
          <li>이 페이지에서 [연결하기] 클릭 → Google 인증 → 자동 토큰 저장</li>
        </ol>
      </details>
    </div>
  );
}
