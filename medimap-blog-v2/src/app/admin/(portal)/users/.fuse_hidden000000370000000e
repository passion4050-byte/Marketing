'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, Plus, Trash2, UserCog, X } from 'lucide-react';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

type Role = 'owner' | 'admin' | 'editor' | 'viewer';
type Status = 'active' | 'invited' | 'suspended';

interface SbUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  status: Status;
  invited_by: number | null;
  last_seen_at: string | null;
  created_at: string;
}

const ROLE_LABEL: Record<Role, string> = {
  owner: '소유자', admin: '관리자', editor: '편집자', viewer: '뷰어'
};
const STATUS_CHIP: Record<Status, { label: string; cls: string }> = {
  active: { label: '활성', cls: 'chip-success' },
  invited: { label: '초대됨', cls: 'chip-warning' },
  suspended: { label: '정지', cls: 'chip-neutral' }
};

export default function UsersPage() {
  const [users, setUsers] = useState<SbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('viewer');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'fetch failed');
      setUsers(data.users ?? []);
    } catch (e) {
      showToast(`로드 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const invite = async () => {
    if (!/.+@.+/.test(inviteEmail)) {
      return showToast('유효한 이메일을 입력하세요', { kind: 'error' });
    }
    setInviting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, status: 'invited' })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'invite failed');
      showToast(`${inviteEmail} 초대됨 (실제 invite 메일 발송은 다음 라운드)`);
      setShowInvite(false); setInviteEmail('');
      await load();
    } catch (e) {
      showToast(`초대 실패: ${(e as Error).message}`, { kind: 'error' });
    } finally { setInviting(false); }
  };

  const patch = async (u: SbUser, patchBody: Partial<Pick<SbUser, 'role' | 'status'>>) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'update failed');
      showToast('업데이트됨');
      await load();
    } catch (e) {
      showToast(`업데이트 실패: ${(e as Error).message}`, { kind: 'error' });
    }
  };

  const remove = async (u: SbUser) => {
    if (u.role === 'owner') return showToast('소유자는 삭제할 수 없습니다', { kind: 'error' });
    if (!confirm(`${u.email} 를 삭제할까요?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'delete failed');
      showToast('삭제됨');
      await load();
    } catch (e) {
      showToast(`삭제 실패: ${(e as Error).message}`, { kind: 'error' });
    }
  };

  return (
    <div className="px-8 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">사용자 관리 ({users.length})</h1>
          <p className="mt-1 text-sm text-ink-muted">
            admin 콘솔 권한 + 초대 관리 — Supabase users 실시간 (로그인은 ADMIN_PASSWORD 유지)
          </p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary text-xs">
          <Plus className="h-3.5 w-3.5" /> 사용자 초대
        </button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left">이메일 / 이름</th>
              <th className="px-4 py-3 text-left">역할</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-left">가입일</th>
              <th className="px-4 py-3 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-ink-muted">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" /><div className="mt-2">로드 중…</div>
              </td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-ink-muted">
                등록된 사용자가 없습니다.
              </td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-surface-subtle">
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-ink">{u.email}</div>
                  <div className="text-[11px] text-ink-muted">{u.name}</div>
                </td>
                <td className="px-4 py-3">
                  <select className="input-base text-xs" value={u.role}
                    disabled={u.role === 'owner'}
                    onChange={(e) => patch(u, { role: e.target.value as Role })}>
                    {(['owner', 'admin', 'editor', 'viewer'] as Role[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => patch(u, { status: u.status === 'active' ? 'suspended' : 'active' })}
                    disabled={u.role === 'owner'}
                    className={cn('chip-base px-2', STATUS_CHIP[u.status].cls)}>
                    {STATUS_CHIP[u.status].label}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs text-ink-muted">{u.created_at?.slice(0, 10) ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(u)} disabled={u.role === 'owner'}
                    className="rounded-md p-1.5 text-ink-muted hover:text-status-danger disabled:opacity-30">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/60 p-4" onClick={() => setShowInvite(false)}>
          <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="text-base font-bold text-ink">사용자 초대</h3>
              <button onClick={() => setShowInvite(false)} className="rounded-md p-1 text-ink-muted hover:bg-surface-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">이메일</label>
                <input className="input-base" type="email" placeholder="newuser@example.com"
                  value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">역할</label>
                <select className="input-base" value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}>
                  <option value="admin">{ROLE_LABEL.admin}</option>
                  <option value="editor">{ROLE_LABEL.editor}</option>
                  <option value="viewer">{ROLE_LABEL.viewer}</option>
                </select>
              </div>
              <p className="text-[11px] text-ink-faint">
                초대 이메일 발송은 다음 라운드. 지금은 users 테이블에 invited 상태로만 INSERT.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button onClick={() => setShowInvite(false)} className="btn-secondary text-xs" disabled={inviting}>취소</button>
              <button onClick={invite} className="btn-primary text-xs" disabled={inviting}>
                {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                초대
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
