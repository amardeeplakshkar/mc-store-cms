'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { setSession } from '@/lib/session';
import { attempt, bool, lines, opt, str, type ActionState } from '@/lib/actions';

const base = (slug: string) => `/stores/${slug}`;
const rv = (slug: string, p = '') => revalidatePath(`/store-admin/${slug}${p}`, 'layout');

export async function loginAction(slug: string, _: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(() => api('/auth/admin/login', { body: { email: str(f, 'email'), password: str(f, 'password'), slug }, token: null }));
  if (r?.error) return r;
  await setSession(r!.data.token);
  redirect('/');
}

async function upload(slug: string, file: File | null, kind: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const form = new FormData();
  form.append('file', file);
  const { url } = await api<{ url: string }>(`${base(slug)}/uploads?kind=${kind}`, { form });
  return url;
}

export async function settingsAction(slug: string, _: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(async () => {
    const logoUrl = (await upload(slug, f.get('logo') as File | null, 'logo')) ?? opt(f, 'logoUrl');
    return api(`${base(slug)}/settings`, {
      method: 'PATCH',
      body: {
        name: str(f, 'name'),
        description: opt(f, 'description'),
        logoUrl,
        serverName: opt(f, 'serverName'),
        serverIp: opt(f, 'serverIp'),
        supportInfo: opt(f, 'supportInfo'),
        requireVerifiedUsername: bool(f, 'requireVerifiedUsername'),
      },
    });
  });
  rv(slug);
  return r;
}

export async function discountAction(slug: string, _: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(() => api(`${base(slug)}/discount`, { method: 'PUT', body: { discountPercent: Number(str(f, 'discountPercent') || 0) } }), 'Discount updated');
  rv(slug);
  return r;
}

export async function pluginKeyAction(slug: string, _: ActionState): Promise<ActionState> {
  const r = await attempt(() => api(`${base(slug)}/plugin-key`, { method: 'POST' }));
  if (r?.error) return r;
  return { ok: `New plugin key (shown once, put it in plugins/StoreDelivery/config.yml): ${r!.data.key}` };
}

export async function categoryAction(slug: string, id: string | null, _: ActionState, f: FormData): Promise<ActionState> {
  const body = { name: str(f, 'name'), type: str(f, 'type'), sort: Number(str(f, 'sort') || 0) };
  const r = await attempt(() => (id ? api(`${base(slug)}/categories/${id}`, { method: 'PATCH', body }) : api(`${base(slug)}/categories`, { body })));
  rv(slug, '/categories');
  return r;
}

export async function deleteCategoryAction(slug: string, id: string, _: ActionState): Promise<ActionState> {
  const r = await attempt(() => api(`${base(slug)}/categories/${id}`, { method: 'DELETE' }), 'Deleted');
  rv(slug, '/categories');
  return r;
}

export async function packageAction(slug: string, id: string | null, _: ActionState, f: FormData): Promise<ActionState> {
  const body = {
    categoryId: str(f, 'categoryId'),
    name: str(f, 'name'),
    description: opt(f, 'description'),
    imageUrl: opt(f, 'imageUrl'),
    priceRupees: Number(str(f, 'priceRupees')),
    durationType: str(f, 'durationType'),
    durationDays: str(f, 'durationDays') ? Number(str(f, 'durationDays')) : null,
    commands: lines(f, 'commands'),
    expiryCommands: lines(f, 'expiryCommands'),
    requireOnline: bool(f, 'requireOnline'),
    isEnabled: bool(f, 'isEnabled'),
    sort: Number(str(f, 'sort') || 0),
  };
  const r = await attempt(async () => {
    const image = await upload(slug, f.get('image') as File | null, 'package');
    if (image) body.imageUrl = image;
    return id ? api(`${base(slug)}/packages/${id}`, { method: 'PUT', body }) : api(`${base(slug)}/packages`, { body });
  });
  if (r?.error) return r;
  rv(slug, '/packages');
  redirect('/packages');
}

export async function togglePackageAction(slug: string, id: string, isEnabled: boolean) {
  await api(`${base(slug)}/packages/${id}/enabled`, { method: 'PATCH', body: { isEnabled } });
  rv(slug, '/packages');
}

export async function deletePackageAction(slug: string, id: string) {
  await api(`${base(slug)}/packages/${id}`, { method: 'DELETE' });
  rv(slug, '/packages');
  redirect('/packages');
}

export async function paymentAction(slug: string, _: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(async () => {
    const qr = (await upload(slug, f.get('qr') as File | null, 'qr')) ?? opt(f, 'qrImageUrl');
    return api(`${base(slug)}/payment-config`, {
      method: 'PUT',
      body: {
        upiId: opt(f, 'upiId'),
        upiPayeeName: opt(f, 'upiPayeeName'),
        qrImageUrl: qr,
        bankName: opt(f, 'bankName'),
        accountName: opt(f, 'accountName'),
        accountNumber: opt(f, 'accountNumber'),
        ifsc: opt(f, 'ifsc'),
        instructions: opt(f, 'instructions'),
      },
    });
  });
  rv(slug, '/payments');
  return r;
}

export async function verifyOrderAction(slug: string, id: string, _: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(() => api(`${base(slug)}/orders/${id}/verify`, { body: { note: opt(f, 'note') } }), 'Payment verified, delivery queued');
  rv(slug, '/orders');
  return r;
}

export async function orderStatusAction(slug: string, id: string, _: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(() => api(`${base(slug)}/orders/${id}/status`, { method: 'PATCH', body: { status: str(f, 'status'), note: opt(f, 'note') } }), 'Status updated');
  rv(slug, '/orders');
  return r;
}

export async function redeliverAction(slug: string, id: string, _: ActionState): Promise<ActionState> {
  const r = await attempt(() => api(`${base(slug)}/orders/${id}/redeliver`, { method: 'POST' }), 'Failed commands re-queued');
  rv(slug, '/orders');
  return r;
}
