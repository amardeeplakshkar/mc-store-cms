import Link from 'next/link';
import { discountedPrice } from '@mcstore/shared';
import { api } from '@/lib/api';
import { inr } from '@/lib/format';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { togglePackageAction } from '../../actions';

const DURATION = (p: any) => (p.durationType === 'PERMANENT' ? 'Permanent' : p.durationType === 'MONTHLY' ? 'Monthly' : `${p.durationDays} days`);

export default async function Packages({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [pkgs, store] = await Promise.all([api<any[]>(`/stores/${slug}/packages`), api(`/stores/${slug}`)]);
  return (
    <>
      <PageHeader title="Packages">
        <Link href="/packages/new" className="btn-primary">New package</Link>
      </PageHeader>
      {store.discountPercent > 0 && <p className="mb-4 text-sm text-zinc-600">A {store.discountPercent}% store-wide discount is active.</p>}
      <div className="card">
        {pkgs.length === 0 ? <Empty>No packages yet</Empty> : (
          <table className="table">
            <thead><tr><th>Package</th><th>Category</th><th>Price</th><th>Duration</th><th>Commands</th><th>Status</th></tr></thead>
            <tbody>
              {pkgs.map((p) => (
                <tr key={p.id}>
                  <td><Link className="font-medium text-brand" href={`/packages/${p.id}`}>{p.name}</Link></td>
                  <td>{p.category.name}</td>
                  <td>
                    {inr(p.pricePaise)}
                    {store.discountPercent > 0 && <div className="text-xs text-zinc-500">Sells at {inr(discountedPrice(p.pricePaise, store.discountPercent))}</div>}
                  </td>
                  <td>{DURATION(p)}</td>
                  <td className="text-xs text-zinc-500">{p.commands.length}</td>
                  <td>
                    <form action={togglePackageAction.bind(null, slug, p.id, !p.isEnabled)}>
                      <button>{p.isEnabled ? <Badge tone="green">Enabled</Badge> : <Badge tone="red">Disabled</Badge>}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
