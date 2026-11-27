import Link from 'next/link';
import { api } from '@/lib/api';
import { dt, inr, qs } from '@/lib/format';
import { Badge, Empty, PageHeader, Pagination } from '@/components/ui';

export default async function Customers({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; page?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const data = await api(`/stores/${slug}/customers${qs({ q: sp.q, page: sp.page })}`);
  return (
    <>
      <PageHeader title="Users" />
      <form className="mb-4"><input name="q" defaultValue={sp.q} placeholder="Search Minecraft username or UUID" className="input max-w-sm" /></form>
      <div className="card">
        {data.items.length === 0 ? <Empty>No users found</Empty> : (
          <table className="table">
            <thead><tr><th>Minecraft</th><th>UUID</th><th>Account</th><th>Orders</th><th>Spent</th><th>Joined</th></tr></thead>
            <tbody>
              {data.items.map((c: any) => (
                <tr key={c.id}>
                  <td><Link className="text-brand" href={`/customers/${c.id}`}>{c.player.mcUsername ?? '(not set)'}</Link> {c.player.mcVerified && <Badge tone="green">Verified</Badge>}</td>
                  <td className="font-mono text-xs">{c.player.mcUuid ?? '-'}</td>
                  <td className="text-xs">{c.player.displayName}<div className="text-zinc-500">{c.player.email}</div></td>
                  <td>{c._count.orders}</td>
                  <td>{inr(c.spentPaise)}</td>
                  <td className="text-xs">{dt(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} href={(p) => `/customers${qs({ q: sp.q, page: p })}`} />
      </div>
    </>
  );
}
