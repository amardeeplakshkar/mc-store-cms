import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { SESSION_COOKIE } from '@/lib/session';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = new URL(req.url).searchParams.get('t');
  const res = new NextResponse(null, { status: 303, headers: { Location: '/' } });
  if (!t) return res;
  try {
    const { token } = await api<{ token: string }>('/auth/player/exchange', { body: { token: t, slug }, token: null });
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 86400 });
  } catch {}
  return res;
}
