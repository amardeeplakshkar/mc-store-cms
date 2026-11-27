import { api } from '@/lib/api';

export async function GET(req: Request) {
  const search = new URL(req.url).search;
  const res = await api<Response>(`/platform/orders/export.csv${search}`, { raw: true });
  return new Response(res.body, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
