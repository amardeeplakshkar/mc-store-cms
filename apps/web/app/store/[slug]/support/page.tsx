import { api } from '@/lib/api';

export default async function Support({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store } = await api(`/s/${slug}`);
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Support</h1>
      <div className="card space-y-3 text-sm">
        {store.serverName && <p><span className="text-zinc-500">Server:</span> {store.serverName}</p>}
        {store.serverIp && <p><span className="text-zinc-500">IP:</span> <span className="font-mono">{store.serverIp}</span></p>}
        <p className="whitespace-pre-line">{store.supportInfo ?? 'Contact the server staff in-game or on their Discord for help with purchases.'}</p>
        <p className="text-zinc-500">Include your order number and transaction ID when asking about a payment.</p>
      </div>
    </div>
  );
}
