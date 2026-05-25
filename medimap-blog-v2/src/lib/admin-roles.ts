/**
 * 다중 사용자 역할 정의.
 * 운영 환경에서 Supabase admin_users 테이블 + JWT claim 으로 교체.
 */
export type AdminRole = 'owner' | 'editor' | 'viewer';

export const ROLE_LABEL: Record<AdminRole, string> = {
  owner: '오너 (전체 권한)',
  editor: '에디터 (검수/발행)',
  viewer: '뷰어 (읽기 전용)'
};

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  owner: ['*'],
  editor: ['tenants:read', 'content:*', 'keywords:*', 'reports:read', 'integrations:read'],
  viewer: ['*:read']
};

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: 'active' | 'invited' | 'suspended';
  lastLogin?: string;
  createdAt: string;
}

export const mockAdminUsers: AdminUser[] = [
  { id: 'u-1', email: 'passion4050@gmail.com', name: '재건 (오너)', role: 'owner', status: 'active', lastLogin: '2026-05-25T08:00:00+09:00', createdAt: '2026-03-01' },
  { id: 'u-2', email: 'ops@medimap.team', name: '운영팀', role: 'editor', status: 'active', lastLogin: '2026-05-25T07:30:00+09:00', createdAt: '2026-04-15' },
  { id: 'u-3', email: 'sales@medimap.team', name: '영업팀', role: 'viewer', status: 'active', createdAt: '2026-05-10' },
  { id: 'u-4', email: 'newhire@medimap.team', name: '신규 입사자', role: 'editor', status: 'invited', createdAt: '2026-05-23' }
];

export function hasPermission(role: AdminRole, perm: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.includes('*')) return true;
  return perms.some((p) => {
    if (p === perm) return true;
    if (p.endsWith(':*')) {
      const prefix = p.slice(0, -2);
      return perm.startsWith(prefix + ':');
    }
    if (p.startsWith('*:')) {
      const suffix = p.slice(2);
      return perm.endsWith(':' + suffix);
    }
    return false;
  });
}
