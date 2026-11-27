import { api } from '@/lib/api';
import { dt, qs } from '@/lib/format';
import { PageHeader, Pagination } from '@/components/ui';

export default async function AuditLogs({ searchParams }: { searchParams: Promise<{ storeId?: string; page?: string }> }) {
  const sp = await searchParams;
  const [data, stores] = await Promise.all([api(`/platform/audit-logs${qs({ storeId: sp.storeId, page: sp.page })}`), api<any[]>('/platform/stores')]);
  const storeName = (id: string | null) => stores.find((s) => s.id === id)?.slug ?? (id ? id.slice(0, 8) : 'platform');
  return (
    <>
      <PageHeader title="Audit logs" />
      <form className="mb-4 flex gap-2">
        <select name="storeId" defaultValue={sp.storeId ?? ''} className="input w-56">
          <option value="">All stores</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="btn-secondary">Filter</button>
      </form>
      <div className="card">
        <table className="table">
          <thead><tr><th>When</th><th>Admin</th><th>Store</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>
            {data.items.map((l: any) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap text-xs">{dt(l.createdAt)}</td>
                <td className="text-xs">{l.actor?.email ?? 'system'}</td>
                <td className="text-xs">{storeName(l.storeId)}</td>
                <td className="font-mono text-xs">{l.action}</td>
                <td className="text-xs">{l.entity}{l.entityId ? ` ${l.entityId.slice(0, 8)}` : ''}</td>
                <td className="max-w-md truncate font-mono text-xs text-zinc-500" title={JSON.stringify(l.data)}>{l.data ? JSON.stringify(l.data) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} href={(p) => `/audit-logs${qs({ storeId: sp.storeId, page: p })}`} />
      </div>
    </>
  );
}
