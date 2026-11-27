import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './session';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const API = process.env.API_URL ?? 'http://localhost:4000';

type Opts = { method?: string; body?: unknown; form?: FormData; raw?: boolean; token?: string | null };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const token = opts.token !== undefined ? opts.token : (await cookies()).get(SESSION_COOKIE)?.value;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(`${API}/v1${path}`, { method: opts.method ?? (body ? 'POST' : 'GET'), headers, body, cache: 'no-store' });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = Array.isArray(j.message) ? j.message.join(', ') : j.message ?? msg;
    } catch {}
    throw new ApiError(res.status, msg);
  }
  if (opts.raw) return res as unknown as T;
  const ct = res.headers.get('content-type') ?? '';
  return (ct.includes('json') ? res.json() : res.text()) as Promise<T>;
}

/** Returns null for 401/403/404 instead of throwing. */
export async function apiSafe<T = any>(path: string): Promise<{ data: T | null; status: number }> {
  try {
    return { data: await api<T>(path), status: 200 };
  } catch (e) {
    if (e instanceof ApiError && [401, 403, 404].includes(e.status)) return { data: null, status: e.status };
    throw e;
  }
}
