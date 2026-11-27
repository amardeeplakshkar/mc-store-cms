import { redirect } from 'next/navigation';
import { apiSafe } from '@/lib/api';
import { AdminShell } from '@/components/shell';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { data: me } = await apiSafe('/auth/me');
  if (!me || !me.isSuperAdmin) redirect('/login');
  return (
    <AdminShell
      title="Platform admin"
      subtitle={me.email}
      nav={[
        { href: '/', label: 'Dashboard' },
        { href: '/stores', label: 'Stores' },
        { href: '/admins', label: 'Admins' },
        { href: '/orders', label: 'Orders' },
        { href: '/audit-logs', label: 'Audit logs' },
        { href: '/settings', label: 'Global settings' },
      ]}
    >
      {children}
    </AdminShell>
  );
}
