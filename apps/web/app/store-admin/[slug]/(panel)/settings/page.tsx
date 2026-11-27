import { api } from '@/lib/api';
import { dt } from '@/lib/format';
import { ActionForm, Submit } from '@/components/form';
import { Checkbox, Field, PageHeader, TextArea } from '@/components/ui';
import { discountAction, pluginKeyAction, settingsAction } from '../../actions';

export default async function Settings({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await api(`/stores/${slug}`);
  return (
    <>
      <PageHeader title="Store settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <ActionForm action={settingsAction.bind(null, slug)}>
            <Field label="Store name" name="name" defaultValue={s.name} required />
            <TextArea label="Description" name="description" defaultValue={s.description} />
            <div className="flex items-center gap-4">
              {s.logoUrl && <img src={s.logoUrl} alt="" className="h-14 w-14 rounded object-cover" />}
              <label className="block flex-1"><span className="label">Logo</span><input type="file" name="logo" accept="image/*" className="text-sm" /></label>
            </div>
            <input type="hidden" name="logoUrl" defaultValue={s.logoUrl ?? ''} />
            <Field label="Minecraft server name" name="serverName" defaultValue={s.serverName} />
            <Field label="Minecraft server IP" name="serverIp" defaultValue={s.serverIp} placeholder="play.myserver.in" />
            <TextArea label="Support / contact info" name="supportInfo" defaultValue={s.supportInfo} hint="Shown on the storefront support page (Discord invite, email, etc.)" />
            <Checkbox label="Only allow purchases from verified (in-game linked) accounts" name="requireVerifiedUsername" defaultChecked={s.requireVerifiedUsername} />
            <Submit>Save settings</Submit>
          </ActionForm>
        </div>
        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-1 font-medium">Store-wide discount</h2>
            <p className="mb-4 text-sm text-zinc-500">Applied to every package price. Platform commission ({s.commissionPercent}%) is added after the discount.</p>
            <ActionForm action={discountAction.bind(null, slug)} className="flex items-end gap-2">
              <div className="flex-1"><Field label="Discount %" name="discountPercent" type="number" defaultValue={s.discountPercent} /></div>
              <Submit>Apply</Submit>
            </ActionForm>
          </div>
          <div className="card">
            <h2 className="mb-1 font-medium">In-game delivery plugin</h2>
            <p className="mb-4 text-sm text-zinc-500">
              Install the StoreDelivery plugin on your Paper/Spigot server and paste the key into its config. Status:{' '}
              {s.pluginLastSeenAt ? `last connected ${dt(s.pluginLastSeenAt)}` : s.pluginConnected ? 'key issued, not connected yet' : 'not set up'}.
            </p>
            <ActionForm action={pluginKeyAction.bind(null, slug)}>
              <Submit variant="secondary" confirm={s.pluginConnected ? 'This replaces the current key. Your server will stop receiving commands until you update it. Continue?' : undefined}>
                {s.pluginConnected ? 'Regenerate key' : 'Generate key'}
              </Submit>
            </ActionForm>
          </div>
        </div>
      </div>
    </>
  );
}
