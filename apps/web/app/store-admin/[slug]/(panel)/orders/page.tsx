import Link from 'next/link';
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from '@mcstore/shared';
import { api } from '@/lib/api';
import { dt, inr, qs } from '@/lib/format';
import { Empty, PageHeader, Pagination, StatusBadge } from '@/components/ui';

type SP = { status?: string; q?: string; from?: string; to?: string; page?: string };

export default async function Orders({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const filters = { status: sp.status, q: sp.q, from: sp.from, to: sp.to };
  const data = await api(`/stores/${slug}/orders${qs({ ...filters, page: sp.page })}`);
  return (
    <>
      <PageHeader title="Orders">
        <a className="btn-secondary" href={`/orders/export${qs(filters)}`}>Export CSV</a>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/orders" className={`rounded-full px-3 py-1 ${!sp.status ? 'bg-zinc-900 text-white' : 'bg-white border'}`}>All</Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/orders${qs({ ...filters, status: s, page: undefined })}`} className={`rounded-full px-3 py-1 ${sp.status === s ? 'bg-zinc-900 text-white' : 'bg-white border'}`}>
            {ORDER_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>
      <form className="mb-4 flex flex-wrap gap-2">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input name="q" defaultValue={sp.q} placeholder="Order #, username, UUID, UTR" className="input w-64" />
        <input name="from" type="date" defaultValue={sp.from} className="input w-40" />
        <input name="to" type="date" defaultValue={sp.to} className="input w-40" />
        <button className="btn-secondary">Search</button>
      </form>
      <div className="card">
        {data.items.length === 0 ? <Empty>No orders</Empty> : (
          <table className="table">
            <thead><tr><th>Order</th><th>Player</th><th>Items</th><th>Customer paid</th><th>Your amount</th><th>UTR</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {data.items.map((o: any) => (
                <tr key={o.id}>
                  <td><Link className="text-brand" href={`/orders/${o.id}`}>{o.number}</Link></td>
                  <td>{o.mcUsername}</td>
                  <td className="text-xs">{o.items.map((i: any) => `${i.nameSnap} x${i.quantity}`).join(', ')}</td>
                  <td>{inr(o.totalPaise)}</td>
                  <td>{inr(o.storeAmountPaise)}</td>
                  <td className="font-mono text-xs">{o.txnReference ?? '-'}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="whitespace-nowrap text-xs">{dt(o.createdAt)}</td>
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
