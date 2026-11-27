import { DURATION_TYPES } from '@mcstore/shared';
import { ActionForm, Submit } from '@/components/form';
import { Checkbox, Field, Select, TextArea } from '@/components/ui';
import { packageAction } from '../../actions';

const DUR = { PERMANENT: 'Permanent', MONTHLY: 'Monthly (30 days)', DAYS: 'Custom number of days' } as const;

export function PackageForm({ slug, categories, pkg }: { slug: string; categories: any[]; pkg?: any }) {
  return (
    <ActionForm action={packageAction.bind(null, slug, pkg?.id ?? null)} className="grid gap-4 md:grid-cols-2">
      <Field label="Name" name="name" defaultValue={pkg?.name} required />
      <Select label="Category" name="categoryId" defaultValue={pkg?.categoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
      <div className="md:col-span-2"><TextArea label="Description" name="description" defaultValue={pkg?.description} /></div>
      <Field label="Price (INR)" name="priceRupees" type="number" step="0.01" defaultValue={pkg ? pkg.pricePaise / 100 : ''} required />
      <Field label="Display order" name="sort" type="number" defaultValue={pkg?.sort ?? 0} />
      <Select label="Duration" name="durationType" defaultValue={pkg?.durationType} options={DURATION_TYPES.map((d) => ({ value: d, label: DUR[d] }))} />
      <Field label="Days (custom duration only)" name="durationDays" type="number" defaultValue={pkg?.durationDays} />
      <div className="md:col-span-2">
        <TextArea label="Delivery commands (one per line)" name="commands" rows={4} defaultValue={pkg?.commands.join('\n')} placeholder="lp user {username} parent add vip" hint="Placeholders: {username}, {uuid}, {order}. Run from the server console, without the leading slash." />
      </div>
      <div className="md:col-span-2">
        <TextArea label="Expiry commands (timed packages, one per line)" name="expiryCommands" rows={2} defaultValue={pkg?.expiryCommands.join('\n')} placeholder="lp user {username} parent remove vip" />
      </div>
      <Field label="Image URL" name="imageUrl" defaultValue={pkg?.imageUrl} />
      <label className="block"><span className="label">Or upload image</span><input type="file" name="image" accept="image/*" className="text-sm" /></label>
      <Checkbox label="Wait until the player is online before running commands" name="requireOnline" defaultChecked={pkg?.requireOnline} />
      <Checkbox label="Enabled (visible on storefront)" name="isEnabled" defaultChecked={pkg?.isEnabled ?? true} />
      <div className="md:col-span-2"><Submit>{pkg ? 'Save package' : 'Create package'}</Submit></div>
    </ActionForm>
  );
}
