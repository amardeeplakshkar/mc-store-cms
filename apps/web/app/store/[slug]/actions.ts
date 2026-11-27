'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { attempt, str, type ActionState } from '@/lib/actions';

const base = (slug: string) => `/s/${slug}`;

export async function setUsernameAction(slug: string, _: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(() => api(`${base(slug)}/me/username`, { body: { mcUsername: str(f, 'mcUsername') } }), 'Username saved');
  revalidatePath(`/store/${slug}`, 'layout');
  return r;
}

export async function newLinkCodeAction(slug: string, _: ActionState): Promise<ActionState> {
  const r = await attempt(() => api(`${base(slug)}/me/link-code`, { method: 'POST' }), 'New code generated');
  revalidatePath(`/store/${slug}/account`);
  return r;
}

export async function buyAction(slug: string, packageId: string, _: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(() =>
    api(`${base(slug)}/orders`, { body: { packageId, quantity: Number(str(f, 'quantity') || 1), mcUsername: str(f, 'mcUsername') || undefined } }),
  );
  if (r?.error) return r;
  redirect(`/orders/${r!.data.id}`);
}

export async function submitReferenceAction(slug: string, id: string, _: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(() => api(`${base(slug)}/orders/${id}/reference`, { body: { txnReference: str(f, 'txnReference') } }), 'Payment reference submitted');
  revalidatePath(`/store/${slug}/orders/${id}`);
  return r;
}

export async function cancelOrderAction(slug: string, id: string) {
  await api(`${base(slug)}/orders/${id}/cancel`, { method: 'POST' });
  revalidatePath(`/store/${slug}/orders/${id}`);
}
