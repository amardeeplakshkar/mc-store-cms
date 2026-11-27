import { api } from '@/lib/api';
import { ActionForm, Submit } from '@/components/form';
import { Badge, Checkbox, Field, PageHeader, Select } from '@/components/ui';
import { createAdminAction, deleteAdminAction, resetAdminPasswordAction, setAdminActiveAction } from '../../actions';

export default async function Admins() {
  const [admins, stores] = await Promise.all([api<any[]>('/platform/admins'), api<any[]>('/platform/stores')]);
  return (
    <>
      <PageHeader title="Admins" />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <table className="table">
            <thead><tr><th>Admin</th><th>Stores</th><th>Status</th><th>Reset password</th><th /></tr></thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>{a.email}<div className="text-xs text-zinc-500">{a.name}</div>{a.isSuperAdmin && <Badge tone="blue">Super admin</Badge>}</td>
                  <td className="text-xs">{a.memberships.map((m: any) => `${m.store.slug} (${m.role.toLowerCase()})`).join(', ') || '-'}</td>
                  <td>
                    <form action={setAdminActiveAction.bind(null, a.id, !a.isActive)}>
                      <button className="text-xs underline">{a.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}</button>
                    </form>
                  </td>
                  <td>
                    <ActionForm action={resetAdminPasswordAction.bind(null, a.id)} className="flex gap-1" reset>
                      <input name="password" type="password" placeholder="New password" className="input w-36 py-1" />
                      <Submit variant="secondary">Set</Submit>
                    </ActionForm>
                  </td>
                  <td><form action={deleteAdminAction.bind(null, a.id)}><Submit variant="secondary" confirm={`Delete ${a.email}?`}>Delete</Submit></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h2 className="mb-4 font-medium">Create admin</h2>
          <ActionForm action={createAdminAction} reset>
            <Field label="Email" name="email" type="email" required />
            <Field label="Name" name="name" />
            <Field label="Password" name="password" type="password" required />
            <Select label="Assign to store (optional)" name="storeId" options={[{ value: '', label: 'None' }, ...stores.map((s) => ({ value: s.id, label: s.name }))]} />
            <Select label="Store role" name="role" options={[{ value: 'STAFF', label: 'Staff' }, { value: 'OWNER', label: 'Owner' }]} />
            <Checkbox label="Super admin" name="isSuperAdmin" />
            <Submit>Create</Submit>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
