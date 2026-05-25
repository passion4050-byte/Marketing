'use client';

import { useState } from 'react';
import { Upload, X, Youtube } from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import type { VideoScript } from '@/lib/types';

interface Props {
  script: VideoScript;
  onClose: () => void;
  onSuccess: (videoId: string, url: string) => void;
}

export function YouTubeUploadModal({ script, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(script.title);
  const [description, setDescription] = useState(
    `${script.hook}\n\n${script.beats.map((b) => `${b.start} ${b.line}`).join('\n')}\n\nCTA: ${script.cta}\n\n#MEDIMAP #의료`
  );
  const [uploading, setUploading] = useState(false);

  const onSubmit = async () => {
    if (!file) return showToast('영상 파일을 선택하세요', { kind: 'error' });
    setUploading(true);
    try {
      const form = new FormData();
      form.append('video', file);
      form.append('title', title);
      form.append('description', description);
      const res = await fetch('/api/admin/youtube/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.stub) {
        showToast(`YouTube env 미설정: ${data.error}`, { kind: 'info', ms: 4000 });
      } else if (data.ok) {
        showToast(`업로드 성공! videoId: ${data.videoId}`);
        onSuccess(data.videoId, data.url);
        onClose();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast(`오류: ${(err as Error).message}`, { kind: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            <h3 className="text-base font-bold text-ink">YouTube 업로드</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-ink-muted hover:bg-surface-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">영상 파일 (.mp4) *</label>
            <input
              type="file"
              accept="video/mp4,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-md border border-border bg-surface-base px-3 py-2 text-xs"
            />
            {file && (
              <p className="mt-1 text-[10px] text-ink-muted">
                {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">제목</label>
            <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">설명 (자동 생성됨)</label>
            <textarea
              className="input-base min-h-[140px] resize-y text-[12px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="rounded-md bg-surface-subtle px-3 py-2 text-[10px] text-ink-muted">
            업로드 시 기본 공개 범위는 <strong>Unlisted</strong>. 운영팀 검수 후 /admin/integrations 에서 Public 전환 가능.
            Vercel free tier 한도로 영상 파일 크기는 100MB 이하 권장.
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button onClick={onClose} disabled={uploading} className="btn-secondary text-xs">취소</button>
          <button onClick={onSubmit} disabled={uploading || !file} className="btn-primary text-xs disabled:opacity-60">
            <Upload className="h-3.5 w-3.5" /> {uploading ? '업로드 중…' : 'YouTube 업로드'}
          </button>
        </div>
      </div>
    </div>
  );
}
