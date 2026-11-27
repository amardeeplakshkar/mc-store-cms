import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

export async function GET() {
  const res = new NextResponse(null, { status: 303, headers: { Location: '/login' } });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
