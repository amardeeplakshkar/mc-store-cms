import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const api = process.env.PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';
  return NextResponse.redirect(`${api}/v1/auth/discord/start?slug=${encodeURIComponent(slug)}`);
}
