import Link from 'next/link';
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from '@mcstore/shared';
import { api } from '@/lib/api';
import { dt, inr, qs } from '@/lib/format';
import { storeAdminUrl } from '@/lib/urls';
import { Empty, PageHeader, Pagination, StatusBadge } from '@/components/ui';

type SP = { status?: string; q?: string; storeId?: string; page?: string };

export default async function Orders({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = { status: sp.status, q: sp.q, storeId: sp.storeId };
  const [data, stores] = await Promise.all([api(`/platform/orders${qs({ ...filters, page: sp.page })}`), api<any[]>('/platform/stores')]);
  return (
    <>
      <PageHeader title="All orders">
        <a className="btn-secondary" href={`/orders/export${qs(filters)}`}>Export CSV</a>
      </PageHeader>
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="storeId" defaultValue={sp.storeId ?? ''} className="input w-48">
          <option value="">All stores</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ''} className="input w-56">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </select>
        <input name="q" defaultValue={sp.q} placeholder="Order #, username, UUID, UTR" className="input w-64" />
        <button className="btn-secondary">Filter</button>
      </form>
      <div className="card">
        {data.items.length === 0 ? <Empty>No orders found</Empty> : (
          <table className="table">
            <thead><tr><th>Order</th><th>Store</th><th>Player</th><th>Items</th><th>Total</th><th>Fee</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {data.items.map((o: any) => (
                <tr key={o.id}>
                  <td><a className="text-brand" href={`${storeAdminUrl(o.store.slug)}/orders/${o.id}`} target="_blank">{o.number}</a></td>
                  <td>{o.store.name}</td>
                  <td>{o.mcUsername}</td>
                  <td className="text-xs">{o.items.map((i: any) => `${i.nameSnap} x${i.quantity}`).join(', ')}</td>
                  <td>{inr(o.totalPaise)}</td>
                  <td>{inr(o.platformFeePaise)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-xs">{dt(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} href={(p) => `/orders${qs({ ...filters, page: p })}`} />
      </div>
    </>
  );
}
