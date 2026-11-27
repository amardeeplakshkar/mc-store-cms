import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { apiSafe } from '@/lib/api';
import { SESSION_COOKIE } from '@/lib/session';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await apiSafe(`/s/${slug}`);
  return { title: data ? `${data.store.name} Store` : 'Store' };
}

export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data, status } = await apiSafe(`/s/${slug}`);
  if (status === 403) {
    return <main className="flex min-h-screen items-center justify-center text-zinc-500">This store is currently unavailable.</main>;
  }
  if (!data) notFound();
  const s = data.store;
  const signedIn = !!(await cookies()).get(SESSION_COOKIE);
  return (
    <div className="min-h-screen">
      <header className="no-print bg-zinc-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {s.logoUrl && <img src={s.logoUrl} alt="" className="h-10 w-10 rounded object-cover" />}
            <div>
              <div className="text-lg font-semibold">{s.name}</div>
              {s.serverIp && <div className="font-mono text-xs text-zinc-400">{s.serverIp}</div>}
            </div>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/">Store</Link>
            <Link href="/support">Support</Link>
            {signedIn ? (
              <>
                <Link href="/orders">My orders</Link>
                <Link href="/account">Account</Link>
                <a href="/auth/logout" className="text-zinc-400">Sign out</a>
              </>
            ) : (
              <a href="/auth/login" className="rounded-md bg-[#5865F2] px-3 py-1.5 font-medium">Sign in with Discord</a>
            )}
          </nav>
        </div>
      </header>
      {s.discountPercent > 0 && <div className="no-print bg-brand py-2 text-center text-sm font-medium text-white">{s.discountPercent}% off everything</div>}
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <footer className="no-print py-8 text-center text-xs text-zinc-400">Powered by business.com. Not affiliated with Mojang or Microsoft.</footer>
    </div>
  );
}
