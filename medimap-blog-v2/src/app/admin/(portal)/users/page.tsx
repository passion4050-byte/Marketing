'use client';

import { useState } from 'react';
import { Mail, Plus, Trash2, UserCog, X } from 'lucide-react';
import { mockAdminUsers, ROLE_LABEL, type AdminRole, type AdminUser } from '@/lib/admin-roles';
import { showToast } from '@/lib/clientActions';
import { cn } from '@/lib/cn';

const STATUS_CHIP: Record<AdminUser['status'], { label: string; cls: string }> = {
  active: { label: '활성', cls: 'chip-success' },
  invited: { label: '초대됨', cls: 'chip-warning' },
  suspended: { label: '정지', cls: 'chip-neutral' }
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(mockAdminUsers);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('viewer');

  const invite = () => {
    if (!inviteEmail.trim() || !/.+@.+/.test(inviteEmail)) {
      return showToast('유효한 이메일을 입력하세요', { kind: 'error' });
    }
    setUsers((p) => [{
      id: `u-${Date.now()}`,
      email: inviteEmail.trim(),
      name: inviteEmail.split('@')[0],
      role: inviteRole,
      status: 'invited',
      createdAt: new Date().toISOString().slice(0, 10)
    }, ...p]);
    setShowInvite(false);
    setInviteEmail('');
    showToast(`${inviteEmail} 초대 이메일 발송됨 (운영 환경 연동 시)`);
  };

  const changeRole = (id: string, role: AdminRole) => {
    setUsers((p) => p.map((u) => (u.id === id ? { ...u, role } : u)));
    showToast(`역할 변경: ${ROLE_LABEL[role]}`);
  };

  const remove = (id: string) => {
    if (!confirm('이 사용자를 삭제할까요?')) return;
    setUsers((p) => p.filter((u) => u.id !== id));
    showToast('삭제됨');
  };

  return (
    <div className="px-8 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">사용자 관리 ({users.length})</h1>
          <p className="mt-1 text-sm text-ink-muted">메디맵 운영팀 + 클라이언트 병원 직원의 admin 콘솔 접근 권한</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary text-xs">
          <Plus className="h-3.5 w-3.5" /> 사용자 초대
        </button>
      </header>

      <div className="card mb-4 border-l-4 border-status-warning bg-status-warningSoft/30 p-4 text-xs text-status-warning">
        <strong>현재 상태:</strong> Single ADMIN_PASSWORD 모드로 작동 중. 본격적인 멀티 사용자는 Supabase auth 마이그레이션 필요.
        SQL 파일: <code className="rounded bg-surface-base px-1 py-0.5">supabase/migrations/202605_admin_users.sql</code>{' '}
        — dev팀에게 전달.
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="px-4 py-3 text-left">이름 / 이메일</th>
              <th className="px-4 py-3 text-left">역할</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-left">마지막 로그인</th>
              <th className="px-4 py-3 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-surface-subtle">
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-ink">{u.name}</div>
                  <div className="text-[11px] text-ink-muted">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value as AdminRole)}
                    className="rounded-md border border-border bg-surface-base px-2 py-1 text-xs"
                  >
                    {(['owner', 'editor', 'viewer'] as AdminRole[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={STATUS_CHIP[u.status].cls}>{STATUS_CHIP[u.status].label}</span>
                </td>
                <td className="px-4 py-3 text-[11px] text-ink-muted">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleString('ko-KR') : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remove(u.id)} className="rounded-md p-1.5 text-ink-muted hover:bg-surface-base hover:text-status-danger">
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
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-700" />
                <h3 className="text-base font-bold text-ink">사용자 초대</h3>
              </div>
              <button onClick={() => setShowInvite(false)} className="rounded-md p-1 text-ink-muted hover:bg-surface-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-6 py-5">
              <div>
                <label className="mb-1 block text-xs font-semibold">이메일</label>
                <input className="input-base" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">역할</label>
                <select className="input-base" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as AdminRole)}>
                  {(['owner', 'editor', 'viewer'] as AdminRole[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <button onClick={() => setShowInvite(false)} className="btn-secondary text-xs">취소</button>
              <button onClick={invite} className="btn-primary text-xs">초대 발송</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
