import Link from 'next/link';
import { ORDER_STATUS_LABEL, type OrderStatusT } from '@mcstore/shared';

export function Field({ label, name, defaultValue, type = 'text', placeholder, required, hint, step }: {
  label: string; name: string; defaultValue?: string | number | null; type?: string; placeholder?: string; required?: boolean; hint?: string; step?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" name={name} type={type} defaultValue={defaultValue ?? ''} placeholder={placeholder} required={required} step={step} />
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, name, defaultValue, rows = 3, placeholder, hint }: { label: string; name: string; defaultValue?: string | null; rows?: number; placeholder?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea className="input font-normal" name={name} rows={rows} defaultValue={defaultValue ?? ''} placeholder={placeholder} />
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function Select({ label, name, options, defaultValue }: { label: string; name: string; options: { value: string; label: string }[]; defaultValue?: string | null }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" name={name} defaultValue={defaultValue ?? undefined}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-brand" />
      {label}
    </label>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="card">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  AWAITING_VERIFICATION: 'bg-blue-100 text-blue-800',
  SUCCESSFUL: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-zinc-200 text-zinc-700',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? 'bg-zinc-100'}`}>{ORDER_STATUS_LABEL[status as OrderStatusT] ?? status}</span>;
}

export function Badge({ children, tone = 'zinc' }: { children: React.ReactNode; tone?: 'green' | 'red' | 'zinc' | 'blue' }) {
  const t = { green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-800', zinc: 'bg-zinc-100 text-zinc-700', blue: 'bg-blue-100 text-blue-800' }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function Pagination({ page, pageSize, total, href }: { page: number; pageSize: number; total: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-zinc-500">Page {page} of {pages} ({total} total)</span>
      <div className="flex gap-2">
        {page > 1 && <Link className="btn-secondary" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="btn-secondary" href={href(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}

export function DailyBars({ data, valueKey = 'gross' }: { data: { date: string; [k: string]: any }[]; valueKey?: string }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((d) => (
        <div key={d.date} className="group relative flex-1">
          <div className="rounded-t bg-brand/70 hover:bg-brand" style={{ height: `${Math.max(2, (d[valueKey] / max) * 120)}px` }} />
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white group-hover:block">
            {d.date}: {(d[valueKey] / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">{children}</div>;
}
