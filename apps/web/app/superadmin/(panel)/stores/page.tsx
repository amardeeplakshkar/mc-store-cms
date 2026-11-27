import Link from 'next/link';
import { api } from '@/lib/api';
import { inr } from '@/lib/format';
import { storefrontUrl } from '@/lib/urls';
import { ActionForm, Submit } from '@/components/form';
import { Badge, Field, PageHeader, TextArea } from '@/components/ui';
import { createStoreAction, toggleStoreAction } from '../../actions';

export default async function Stores({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const stores = await api<any[]>(`/platform/stores${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  return (
    <>
      <PageHeader title="Stores" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <form className="mb-4"><input name="q" defaultValue={q} placeholder="Search stores" className="input max-w-xs" /></form>
          <table className="table">
            <thead><tr><th>Store</th><th>Status</th><th>Commission</th><th>Orders</th><th>Gross</th><th>Commission due</th><th /></tr></thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/stores/${s.id}`} className="font-medium text-brand">{s.name}</Link>
                    <div className="text-xs text-zinc-500"><a href={storefrontUrl(s.slug)} target="_blank">{s.slug}</a></div>
                  </td>
                  <td>{s.isEnabled ? <Badge tone="green">Enabled</Badge> : <Badge tone="red">Disabled</Badge>}</td>
                  <td>{s.commissionPercent}%</td>
                  <td>{s.stats.successfulOrders} / {s._count.orders}</td>
                  <td>{inr(s.stats.grossPaise)}</td>
                  <td>{inr(s.stats.commissionDuePaise)}</td>
                  <td>
                    <form action={toggleStoreAction.bind(null, s.id, !s.isEnabled)}>
                      <button className="text-xs text-zinc-600 underline">{s.isEnabled ? 'Disable' : 'Enable'}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2 className="mb-4 font-medium">Create store</h2>
          <ActionForm action={createStoreAction} reset>
            <Field label="Store slug" name="slug" required placeholder="mysmp" hint="Storefront: mysmp.business.com, admin: mysmp-admin.business.com" />
            <Field label="Store name" name="name" required />
            <TextArea label="Description" name="description" />
            <Field label="Commission %" name="commissionPercent" type="number" step="0.01" placeholder="Default from global settings" />
            <Field label="Owner email" name="ownerEmail" type="email" hint="Existing admin or a new one" />
            <Field label="Owner password" name="ownerPassword" type="password" hint="Only needed for a new admin" />
            <Submit>Create store</Submit>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
