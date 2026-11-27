import { api } from '@/lib/api';
import { ActionForm, Submit } from '@/components/form';
import { Field, PageHeader, TextArea } from '@/components/ui';
import { setConfigAction } from '../../actions';

const KNOWN = [
  ['defaultCommissionPercent', 'Commission % applied to newly created stores'],
  ['platformName', 'Name shown on the landing page and receipts'],
  ['supportEmail', 'Platform support contact'],
  ['reservedSlugs', 'JSON array of extra words stores cannot use as their address, e.g. ["billing","docs"]. Built-in: admin, www, api, app, mail, cdn and others'],
];

export default async function Settings() {
  const config = await api<any[]>('/platform/config');
  return (
    <>
      <PageHeader title="Global settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <table className="table">
            <thead><tr><th>Key</th><th>Value</th></tr></thead>
            <tbody>{config.map((c) => <tr key={c.key}><td className="font-mono text-xs">{c.key}</td><td className="font-mono text-xs">{JSON.stringify(c.value)}</td></tr>)}</tbody>
          </table>
          <ul className="mt-4 space-y-1 text-xs text-zinc-500">{KNOWN.map(([k, d]) => <li key={k}><code>{k}</code>: {d}</li>)}</ul>
        </div>
        <div className="card">
          <h2 className="mb-4 font-medium">Set a value</h2>
          <ActionForm action={setConfigAction}>
            <Field label="Key" name="key" required />
            <TextArea label="Value (JSON or text)" name="value" />
            <Submit>Save</Submit>
          </ActionForm>
        </div>
      </div>
    </>
  );
}
