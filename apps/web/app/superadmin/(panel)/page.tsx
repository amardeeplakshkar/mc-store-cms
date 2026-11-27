import { api } from '@/lib/api';
import { inr } from '@/lib/format';
import { DailyBars, PageHeader, Stat, StatusBadge } from '@/components/ui';

export default async function Dashboard() {
  const s = await api('/platform/stats');
  return (
    <>
      <PageHeader title="Platform overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Stores" value={s.stores} sub={`${s.enabledStores} enabled`} />
        <Stat label="Players" value={s.players} />
        <Stat label="Successful orders" value={s.successfulOrders} />
        <Stat label="Gross volume" value={inr(s.grossPaise)} sub="Paid by customers" />
        <Stat label="Store revenue" value={inr(s.storeRevenuePaise)} />
        <Stat label="Commission earned" value={inr(s.commissionPaise)} />
        <Stat label="Commission due" value={inr(s.commissionDuePaise)} sub="Not yet settled by stores" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 font-medium">Gross volume, last 30 days</h2>
          <DailyBars data={s.daily} />
        </div>
        <div className="card">
          <h2 className="mb-4 font-medium">Orders by status</h2>
          <ul className="space-y-2">
            {Object.entries(s.ordersByStatus as Record<string, number>).map(([k, v]) => (
              <li key={k} className="flex justify-between"><StatusBadge status={k} /><span>{v}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
