import { api } from '@/lib/api';
import { dt, inr } from '@/lib/format';
import { storeAdminUrl, storefrontUrl } from '@/lib/urls';
import { ActionForm, Submit } from '@/components/form';
import { Badge, Checkbox, Field, PageHeader, Select, Stat, TextArea } from '@/components/ui';
import { addMemberAction, deleteStoreAction, removeMemberAction, settleAction, updateStoreAction } from '../../../actions';

export default async function StoreDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [s, admins] = await Promise.all([api(`/platform/stores/${id}`), api<any[]>('/platform/admins')]);
  return (
    <>
      <PageHeader title={s.name}>
        <a className="btn-secondary" href={storefrontUrl(s.slug)} target="_blank">Storefront</a>
        <a className="btn-secondary" href={storeAdminUrl(s.slug)} target="_blank">Store admin</a>
      </PageHeader>
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Store revenue" value={inr(s.commission.storeRevenuePaise)} />
        <Stat label="Commission earned" value={inr(s.commission.earnedPaise)} />
        <Stat label="Commission due" value={inr(s.commission.duePaise)} sub={`${s.commission.dueOrders} orders`} />
        <Stat label="Plugin" value={s.pluginConnected ? 'Key issued' : 'Not set up'} sub={s.pluginLastSeenAt ? `Last seen ${dt(s.pluginLastSeenAt)}` : undefined} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-medium">Store details</h2>
          <ActionForm action={updateStoreAction.bind(null, s.id)}>
            <Field label="Name" name="name" defaultValue={s.name} required />
            <TextArea label="Description" name="description" defaultValue={s.description} />
            <Field label="Commission % (charged to customers)" name="commissionPercent" type="number" step="0.01" defaultValue={s.commissionPercent} />
            <Checkbox label="Store enabled" name="isEnabled" defaultChecked={s.isEnabled} />
            <Submit>Save</Submit>
          </ActionForm>
        </div>

        <div className="card">
          <h2 className="mb-4 font-medium">Store admins</h2>
          <ul className="mb-4 divide-y divide-zinc-100">
            {s.members.map((m: any) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span>{m.admin.email} <Badge>{m.role}</Badge></span>
                <form action={removeMemberAction.bind(null, s.id, m.admin.id)}><button className="text-xs text-red-600 underline">Remove</button></form>
              </li>
            ))}
          </ul>
          <ActionForm action={addMemberAction.bind(null, s.id)} className="flex flex-wrap items-end gap-2">
            <div className="flex-1"><Select label="Admin" name="adminId" options={admins.map((a) => ({ value: a.id, label: a.email }))} /></div>
            <Select label="Role" name="role" options={[{ value: 'STAFF', label: 'Staff' }, { value: 'OWNER', label: 'Owner' }]} />
            <Submit>Add</Submit>
          </ActionForm>
        </div>

        <div className="card">
          <h2 className="mb-1 font-medium">Commission settlement</h2>
          <p className="mb-4 text-sm text-zinc-500">Customers pay the store directly, so the store owes the platform fee. Record a payment to mark all currently due orders as settled.</p>
          <ActionForm action={settleAction.bind(null, s.id)} reset>
            <Field label="Amount received (INR)" name="amount" type="number" step="0.01" placeholder={(s.commission.duePaise / 100).toFixed(2)} />
            <Field label="Payment reference" name="reference" />
            <Field label="Note" name="note" />
            <Submit>Record settlement</Submit>
          </ActionForm>
          {s.settlements.length > 0 && (
            <table className="table mt-4">
              <thead><tr><th>Date</th><th>Amount</th><th>Reference</th></tr></thead>
              <tbody>{s.settlements.map((x: any) => <tr key={x.id}><td>{dt(x.createdAt)}</td><td>{inr(x.amountPaise)}</td><td>{x.reference ?? '-'}</td></tr>)}</tbody>
            </table>
          )}
        </div>

        <div className="card border-red-200">
          <h2 className="mb-1 font-medium text-red-700">Delete store</h2>
          <p className="mb-4 text-sm text-zinc-500">Permanently deletes the store, its packages, orders and customers.</p>
          <ActionForm action={deleteStoreAction.bind(null, s.id, s.slug)}>
            <Field label={`Type "${s.slug}" to confirm`} name="confirm" />
            <Submit variant="danger">Delete store</Submit>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
