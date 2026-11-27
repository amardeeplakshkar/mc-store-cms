import Link from 'next/link';
import { api } from '@/lib/api';
import { inr } from '@/lib/format';
import { DailyBars, PageHeader, Stat, StatusBadge } from '@/components/ui';

export default async function Dashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await api(`/stores/${slug}/stats`);
  const awaiting = s.ordersByStatus.AWAITING_VERIFICATION ?? 0;
  return (
    <>
      <PageHeader title="Dashboard" />
      {awaiting > 0 && (
        <Link href="/orders?status=AWAITING_VERIFICATION" className="mb-6 block rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {awaiting} order{awaiting > 1 ? 's' : ''} waiting for payment verification
        </Link>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={inr(s.revenuePaise)} sub="After discounts, excluding platform fee" />
        <Stat label="Successful orders" value={s.successfulOrders} />
        <Stat label="Users" value={s.customers} sub={`${s.newCustomers30d} new in 30 days`} />
        <Stat label="Platform fees collected" value={inr(s.platformFeesPaise)} sub="Paid by customers, owed to the platform" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 font-medium">Revenue, last 30 days</h2>
          <DailyBars data={s.daily} />
        </div>
        <div className="card space-y-6">
          <div>
            <h2 className="mb-2 font-medium">Orders by status</h2>
            <ul className="space-y-2">
              {Object.entries(s.ordersByStatus as Record<string, number>).map(([k, v]) => (
                <li key={k} className="flex justify-between"><StatusBadge status={k} /><span>{v}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 font-medium">Top packages</h2>
            <ul className="space-y-1 text-sm">{s.topPackages.map((p: any) => <li key={p.packageId} className="flex justify-between"><span>{p.name}</span><span>{p.sold} sold</span></li>)}</ul>
          </div>
        </div>
      </div>
    </>
  );
}
