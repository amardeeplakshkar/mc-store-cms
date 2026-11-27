import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiSafe } from '@/lib/api';
import { dt, inr } from '@/lib/format';
import { Empty, StatusBadge } from '@/components/ui';

export default async function MyOrders({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: orders, status } = await apiSafe<any[]>(`/s/${slug}/orders`);
  if (status === 401) redirect('/auth/login');
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">My orders</h1>
      {!orders?.length ? <Empty>No orders yet.</Empty> : (
        <div className="card">
          <table className="table">
            <thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link className="text-brand" href={`/orders/${o.id}`}>{o.number}</Link></td>
                  <td className="text-sm">{o.items.map((i: any) => `${i.nameSnap} x${i.quantity}`).join(', ')}</td>
                  <td>{inr(o.totalPaise)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-xs">{dt(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
