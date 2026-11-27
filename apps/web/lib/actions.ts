import { unstable_rethrow } from 'next/navigation';

export type ActionState = { error?: string; ok?: string; data?: any } | undefined;

export async function attempt(fn: () => Promise<unknown>, ok = 'Saved'): Promise<ActionState> {
  try {
    const data = await fn();
    return { ok, data };
  } catch (e) {
    unstable_rethrow(e);
    return { error: e instanceof Error ? e.message : 'Something went wrong' };
  }
}

export const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};
export const opt = (f: FormData, k: string) => str(f, k) || null;
export const bool = (f: FormData, k: string) => f.get(k) === 'on' || f.get(k) === 'true';
export const lines = (f: FormData, k: string) => str(f, k).split('\n').map((l) => l.trim()).filter(Boolean);
