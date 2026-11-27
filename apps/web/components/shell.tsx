import Link from 'next/link';

export function AdminShell({ title, subtitle, nav, children, banner }: {
  title: string; subtitle?: string; nav: { href: string; label: string }[]; children: React.ReactNode; banner?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 p-4">
          <div className="font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-zinc-500">{subtitle}</div>}
        </div>
        <nav className="flex flex-col p-2">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100">
              {n.label}
            </Link>
          ))}
          <a href="/logout" className="mt-4 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50">Sign out</a>
        </nav>
      </aside>
      <main className="flex-1 overflow-x-auto p-8">
        {banner}
        {children}
      </main>
    </div>
  );
}

export function LoginCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mb-4 mt-1 text-sm text-zinc-500">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
