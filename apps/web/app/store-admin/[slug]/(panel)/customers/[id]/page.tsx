import Link from 'next/link';
import { api } from '@/lib/api';
import { dt, inr } from '@/lib/format';
import { Badge, PageHeader, Stat, StatusBadge } from '@/components/ui';

export default async function Customer({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const c = await api(`/stores/${slug}/customers/${id}`);
  const paid = c.orders.filter((o: any) => o.status === 'SUCCESSFUL');
  return (
    <>
      <PageHeader title={c.player.mcUsername ?? c.player.displayName ?? 'User'}>
        {c.player.mcVerified ? <Badge tone="green">Verified account</Badge> : <Badge>Unverified</Badge>}
      </PageHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="UUID" value={<span className="font-mono text-xs">{c.player.mcUuid ?? '-'}</span>} />
        <Stat label="Login" value={<span className="text-sm">{c.player.displayName}</span>} sub={c.player.email} />
        <Stat label="Successful orders" value={paid.length} />
        <Stat label="Total spent" value={inr(paid.reduce((s: number, o: any) => s + o.totalPaise, 0))} />
      </div>
      <div className="card">
        <h2 className="mb-3 font-medium">Purchase history</h2>
        <table className="table">
          <thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {c.orders.map((o: any) => (
              <tr key={o.id}>
                <td><Link className="text-brand" href={`/orders/${o.id}`}>{o.number}</Link></td>
                <td className="text-xs">{o.items.map((i: any) => `${i.nameSnap} x${i.quantity}`).join(', ')}</td>
                <td>{inr(o.totalPaise)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td className="text-xs">{dt(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
