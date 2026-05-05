import { Settings, KeyRound, Database, Bell } from "lucide-react";

export const dynamic = "force-dynamic";

const ENV_KEYS: { key: string; label: string; required: boolean; group: "auth" | "db" | "site" | "notify" }[] = [
  { key: "ADMIN_PASSWORD", label: "어드민 로그인 비밀번호", required: true, group: "auth" },
  { key: "ADMIN_SESSION_SECRET", label: "쿠키 서명 secret", required: false, group: "auth" },
  { key: "DATABASE_URL", label: "Supabase Postgres 직결 URL", required: true, group: "db" },
  { key: "IP_HASH_SALT", label: "IP 해시 salt (익명화)", required: false, group: "db" },
  { key: "NEXT_PUBLIC_KAKAO_CHANNEL_URL", label: "카카오 채널 URL", required: false, group: "site" },
  { key: "NEXT_PUBLIC_PHONE", label: "대표 전화번호", required: false, group: "site" },
  { key: "NEXT_PUBLIC_NAVER_PLACE_URL", label: "네이버 플레이스 URL", required: false, group: "site" },
  { key: "NEXT_PUBLIC_GA_ID", label: "GA4 Measurement ID", required: false, group: "site" },
];

function isSet(key: string): boolean {
  const v = process.env[key];
  if (!v) return false;
  // 자명한 placeholder 패턴은 미설정 취급.
  if (v.includes("_xxxxx") || v.includes("0000-0000")) return false;
  return true;
}

const GROUP_META: Record<string, { title: string; icon: React.ReactNode }> = {
  auth: { title: "인증 / 세션", icon: <KeyRound size={14} /> },
  db: { title: "데이터베이스", icon: <Database size={14} /> },
  site: { title: "사이트 / 외부 연결", icon: <Settings size={14} /> },
  notify: { title: "알림", icon: <Bell size={14} /> },
};

export default function AdminSettings() {
  const grouped = ENV_KEYS.reduce<Record<string, typeof ENV_KEYS>>((acc, e) => {
    (acc[e.group] ||= []).push(e);
    return acc;
  }, {});
  return (
    <div className="space-y-5">
      <div className="rounded-card bg-white p-6 shadow-card text-[13px] text-ink-muted">
        <div className="flex items-start gap-3">
          <Settings size={18} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <div className="font-semibold text-ink">환경변수 설정 상태</div>
            <p className="mt-1">
              어드민 자체에서 변경할 수 없습니다 — Vercel 프로젝트 설정 → Environment Variables 에서 변경 후 redeploy.
            </p>
          </div>
        </div>
      </div>

      {Object.entries(grouped).map(([group, items]) => (
        <div key={group} className="rounded-card bg-white shadow-card">
          <div className="flex items-center gap-2 border-b border-line/70 px-6 py-3 text-[13px] font-bold text-ink">
            {GROUP_META[group].icon}
            {GROUP_META[group].title}
          </div>
          <table className="w-full text-[13px]">
            <tbody>
              {items.map((row) => {
                const set = isSet(row.key);
                return (
                  <tr key={row.key} className="border-b border-line/40 last:border-0">
                    <td className="px-6 py-3 font-mono text-[12px] text-ink">
                      {row.key}
                      {row.required && (
                        <span className="ml-1 text-brand">*</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{row.label}</td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`rounded-pill px-2.5 py-0.5 text-[11px] font-semibold ${
                          set
                            ? "bg-emerald-100 text-emerald-700"
                            : row.required
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {set ? "설정됨" : row.required ? "필수 미설정" : "선택"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
