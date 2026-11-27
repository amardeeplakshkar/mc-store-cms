import { redirect } from 'next/navigation';
import { api, apiSafe } from '@/lib/api';
import { dt } from '@/lib/format';
import { ActionForm, Submit } from '@/components/form';
import { Badge, Field } from '@/components/ui';
import { newLinkCodeAction, setUsernameAction } from '../actions';

export default async function Account({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: me, status } = await apiSafe(`/s/${slug}/me`);
  if (status === 401 || !me) redirect('/auth/login');
  const { store } = await api(`/s/${slug}`);
  const p = me.player;
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>
      <div className="card flex items-center gap-3">
        {p.avatarUrl && <img src={p.avatarUrl} alt="" className="h-12 w-12 rounded-full" />}
        <div><div className="font-medium">{p.displayName}</div><div className="text-sm text-zinc-500">{p.email}</div></div>
      </div>
      <div className="card">
        <h2 className="mb-3 font-medium">Minecraft account {p.mcVerified ? <Badge tone="green">Verified</Badge> : p.mcUsername && <Badge>Not verified</Badge>}</h2>
        <ActionForm action={setUsernameAction.bind(null, slug)}>
          <Field label="Minecraft username" name="mcUsername" defaultValue={p.mcUsername} required />
          <Submit>Save</Submit>
        </ActionForm>
        {p.mcUsername && !p.mcVerified && (
          <div className="mt-6 rounded-md bg-zinc-50 p-4 text-sm">
            <p className="mb-2">To verify, join <b className="font-mono">{store.serverIp ?? 'the server'}</b> as <b>{p.mcUsername}</b> and type:</p>
            {me.linkCode ? (
              <>
                <p className="font-mono text-lg">/link {me.linkCode}</p>
                <p className="mt-1 text-xs text-zinc-500">Code expires {dt(me.linkCodeExpiresAt)}</p>
              </>
            ) : <p className="text-zinc-500">Your code expired.</p>}
            <ActionForm action={newLinkCodeAction.bind(null, slug)} className="mt-3"><Submit variant="secondary">Generate new code</Submit></ActionForm>
          </div>
        )}
        {p.mcVerified && <p className="mt-3 font-mono text-xs text-zinc-500">UUID {p.mcUuid}</p>}
      </div>
    </div>
  );
}
