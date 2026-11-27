'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/api';
import { setSession } from '@/lib/session';
import { attempt, bool, opt, str, type ActionState } from '@/lib/actions';

export async function loginAction(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(() => api('/auth/admin/login', { body: { email: str(f, 'email'), password: str(f, 'password') }, token: null }));
  if (r?.error) return r;
  await setSession(r!.data.token);
  redirect('/');
}

export async function createStoreAction(_: ActionState, f: FormData): Promise<ActionState> {
  const commission = str(f, 'commissionPercent');
  const r = await attempt(
    () =>
      api('/platform/stores', {
        body: {
          slug: str(f, 'slug'),
          name: str(f, 'name'),
          description: opt(f, 'description'),
          commissionPercent: commission ? Number(commission) : undefined,
          ownerEmail: opt(f, 'ownerEmail') ?? undefined,
          ownerPassword: opt(f, 'ownerPassword') ?? undefined,
        },
      }),
    'Store created',
  );
  revalidatePath('/superadmin/stores');
  return r;
}

export async function updateStoreAction(id: string, _: ActionState, f: FormData): Promise<ActionState> {
  return attempt(() =>
    api(`/platform/stores/${id}`, {
      method: 'PATCH',
      body: { name: str(f, 'name'), description: opt(f, 'description'), commissionPercent: Number(str(f, 'commissionPercent')), isEnabled: bool(f, 'isEnabled') },
    }),
  );
}

export async function toggleStoreAction(id: string, enable: boolean) {
  await api(`/platform/stores/${id}`, { method: 'PATCH', body: { isEnabled: enable } });
  revalidatePath('/superadmin/stores');
  revalidatePath(`/superadmin/stores/${id}`);
}

export async function deleteStoreAction(id: string, slug: string, _: ActionState, f: FormData): Promise<ActionState> {
  if (str(f, 'confirm') !== slug) return { error: `Type "${slug}" to confirm` };
  const r = await attempt(() => api(`/platform/stores/${id}`, { method: 'DELETE' }));
  if (r?.error) return r;
  redirect('/stores');
}

export async function addMemberAction(id: string, _: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(() => api(`/platform/stores/${id}/members`, { body: { adminId: str(f, 'adminId'), role: str(f, 'role') } }), 'Admin added');
  revalidatePath(`/superadmin/stores/${id}`);
  return r;
}

export async function removeMemberAction(id: string, adminId: string) {
  await api(`/platform/stores/${id}/members/${adminId}`, { method: 'DELETE' });
  revalidatePath(`/superadmin/stores/${id}`);
}

export async function settleAction(id: string, _: ActionState, f: FormData): Promise<ActionState> {
  const amt = str(f, 'amount');
  const r = await attempt(
    () => api(`/platform/stores/${id}/settlements`, { body: { amountPaise: amt ? Math.round(Number(amt) * 100) : undefined, reference: opt(f, 'reference'), note: opt(f, 'note') } }),
    'Settlement recorded',
  );
  revalidatePath(`/superadmin/stores/${id}`);
  return r;
}

export async function createAdminAction(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await attempt(
    () =>
      api('/platform/admins', {
        body: {
          email: str(f, 'email'),
          name: opt(f, 'name'),
          password: str(f, 'password'),
          isSuperAdmin: bool(f, 'isSuperAdmin'),
          storeId: opt(f, 'storeId') ?? undefined,
          role: str(f, 'role') || undefined,
        },
      }),
    'Admin created',
  );
  revalidatePath('/superadmin/admins');
  return r;
}

export async function setAdminActiveAction(id: string, isActive: boolean) {
  await api(`/platform/admins/${id}`, { method: 'PATCH', body: { isActive } });
  revalidatePath('/superadmin/admins');
}

export async function resetAdminPasswordAction(id: string, _: ActionState, f: FormData): Promise<ActionState> {
  return attempt(() => api(`/platform/admins/${id}`, { method: 'PATCH', body: { password: str(f, 'password') } }), 'Password updated');
}

export async function deleteAdminAction(id: string) {
  await api(`/platform/admins/${id}`, { method: 'DELETE' });
  revalidatePath('/superadmin/admins');
}

export async function setConfigAction(_: ActionState, f: FormData): Promise<ActionState> {
  let value: unknown = str(f, 'value');
  try {
    value = JSON.parse(String(value));
  } catch {}
  const r = await attempt(() => api('/platform/config', { method: 'PUT', body: { key: str(f, 'key'), value } }));
  revalidatePath('/superadmin/settings');
  return r;
}
