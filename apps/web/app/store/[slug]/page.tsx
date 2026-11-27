import Link from 'next/link';
import { api } from '@/lib/api';
import { inr } from '@/lib/format';
import { Empty } from '@/components/ui';

const DURATION = (p: any) => (p.durationType === 'PERMANENT' ? 'Permanent' : p.durationType === 'MONTHLY' ? 'Monthly' : `${p.durationDays} days`);

export default async function Catalog({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store, categories } = await api(`/s/${slug}`);
  return (
    <>
      {store.description && <p className="mb-8 max-w-3xl text-zinc-600">{store.description}</p>}
      {categories.length === 0 && <Empty>No packages available yet.</Empty>}
      <div className="space-y-10">
        {categories.map((c: any) => (
          <section key={c.id}>
            <h2 className="mb-4 text-xl font-semibold">{c.name}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {c.packages.map((p: any) => (
                <Link key={p.id} href={`/package/${p.id}`} className="card flex flex-col transition hover:shadow-md">
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="mb-3 h-32 w-full rounded object-contain" />}
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-zinc-500">{DURATION(p)}</div>
                  <div className="mt-auto pt-3">
                    {p.finalPricePaise < p.pricePaise && <span className="mr-2 text-sm text-zinc-400 line-through">{inr(p.pricePaise)}</span>}
                    <span className="text-lg font-semibold text-brand">{inr(p.finalPricePaise)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
