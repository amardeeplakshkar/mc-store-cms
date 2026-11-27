import { cookies } from 'next/headers';
import { api, apiSafe } from '@/lib/api';
import { inr } from '@/lib/format';
import { SESSION_COOKIE } from '@/lib/session';
import { ActionForm, Submit } from '@/components/form';
import { Field } from '@/components/ui';
import { buyAction } from '../../actions';

export default async function PackagePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { package: p, price, store } = await api(`/s/${slug}/packages/${id}`);
  const signedIn = !!(await cookies()).get(SESSION_COOKIE);
  const me = signedIn ? (await apiSafe(`/s/${slug}/me`)).data : null;
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        {p.imageUrl && <img src={p.imageUrl} alt="" className="mb-4 max-h-72 w-full rounded-lg object-contain" />}
        <div className="text-sm text-zinc-500">{p.category.name}</div>
        <h1 className="text-3xl font-semibold">{p.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">{p.durationType === 'PERMANENT' ? 'Permanent' : p.durationType === 'MONTHLY' ? 'Lasts 30 days' : `Lasts ${p.durationDays} days`}</p>
        {p.description && <p className="mt-4 whitespace-pre-line text-zinc-700">{p.description}</p>}
      </div>
      <div className="card h-fit">
        <h2 className="mb-3 font-medium">Price</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt>Price</dt><dd>{inr(price.subtotalPaise)}</dd></div>
          {price.discountPaise > 0 && <div className="flex justify-between text-brand"><dt>Discount ({store.discountPercent}%)</dt><dd>-{inr(price.discountPaise)}</dd></div>}
          <div className="flex justify-between text-zinc-500"><dt>Platform fee ({store.commissionPercent}%)</dt><dd>{inr(price.platformFeePaise)}</dd></div>
          <div className="flex justify-between border-t pt-2 text-lg font-semibold"><dt>Total</dt><dd>{inr(price.totalPaise)}</dd></div>
        </dl>
        <div className="mt-6">
          {!signedIn ? (
            <a href="/auth/login" className="btn w-full bg-[#5865F2] text-white">Sign in with Discord to buy</a>
          ) : (
            <ActionForm action={buyAction.bind(null, slug, p.id)}>
              <Field
                label="Minecraft username"
                name="mcUsername"
                defaultValue={me?.player?.mcUsername}
                required
                hint={store.requireVerifiedUsername ? 'This store only delivers to accounts linked in-game (see Account).' : 'The rank or items are given to this player.'}
              />
              {p.durationType === 'PERMANENT' && <Field label="Quantity" name="quantity" type="number" defaultValue={1} />}
              <Submit>Continue to payment</Submit>
            </ActionForm>
          )}
        </div>
      </div>
    </div>
  );
}
