import { notFound, redirect } from 'next/navigation';
import { apiSafe } from '@/lib/api';
import { storefrontUrl } from '@/lib/urls';
import { AdminShell } from '@/components/shell';

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: store, status } = await apiSafe(`/stores/${slug}`);
  if (status === 401 || status === 403) redirect('/login');
  if (!store) notFound();
  return (
    <AdminShell
      title={store.name}
      subtitle="Store admin"
      banner={
        !store.isEnabled && (
          <div className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">This store has been disabled by the platform. The storefront is offline and changes are locked.</div>
        )
      }
      nav={[
        { href: '/', label: 'Dashboard' },
        { href: '/orders', label: 'Orders' },
        { href: '/packages', label: 'Packages' },
        { href: '/categories', label: 'Categories' },
        { href: '/payments', label: 'Payments' },
        { href: '/customers', label: 'Users' },
        { href: '/settings', label: 'Store settings' },
        { href: storefrontUrl(slug), label: 'View storefront' },
      ]}
    >
      {children}
    </AdminShell>
  );
}
