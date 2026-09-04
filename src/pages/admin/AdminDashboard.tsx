import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { adminApi, formatCents, type AdminGroupSummary, type DashboardStats } from '../../lib/api';
import { useAdminSession } from '../../store/useAdminSession';

export function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { token, clearToken } = useAdminSession();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [groups, setGroups] = useState<AdminGroupSummary[]>([]);

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    Promise.all([adminApi.dashboardStats(token), adminApi.dashboardGroups(token)])
      .then(([s, g]) => {
        setStats(s);
        setGroups(g);
      })
      .catch(() => navigate('/admin/login'));
  }, [navigate, token]);

  async function handleDeactivate(id: string) {
    await adminApi.deactivateGroup(token!, id);
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, active: false } : g)));
  }

  async function handleLogout() {
    await adminApi.logout(token!);
    clearToken();
    navigate('/admin/login');
  }

  if (!stats) return null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{t('admin.dashboard')}</h1>
        <Button variant="secondary" onClick={handleLogout}>
          {t('admin.logout')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('admin.totalGroups')} value={stats.totalGroups} />
        <Stat label={t('admin.activeGroups')} value={stats.activeGroups} />
        <Stat label={t('admin.totalExpenses')} value={stats.totalExpenses} />
        <Stat
          label={t('admin.totalVolume')}
          value={
            stats.totalVolumeByCurrency.length === 0
              ? formatCents(0, 'USD', i18n.language)
              : stats.totalVolumeByCurrency
                  .map((v) => formatCents(v.amountCents, v.currency, i18n.language))
                  .join(' · ')
          }
        />
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 text-lg font-bold">{t('admin.recentGroups')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-t border-[var(--border)]">
                  <td className="py-2 pr-3 font-medium">{g.name}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-[var(--text-muted)]">{g.code}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-[var(--text-muted)]">{g.currency}</td>
                  <td className="py-2 pr-3 text-xs text-[var(--text-muted)]">
                    {g._count.participants} · {g._count.expenses}
                  </td>
                  <td className="py-2 text-right">
                    {g.active ? (
                      <button onClick={() => handleDeactivate(g.id)} className="text-xs font-medium text-alert">
                        {t('admin.deactivate')}
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">·</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="font-mono text-2xl font-medium tabular-nums">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
    </div>
  );
}
