import { api } from '@/lib/api';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const search = new URL(req.url).search;
  const res = await api<Response>(`/stores/${slug}/orders/export.csv${search}`, { raw: true });
  return new Response(res.body, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${slug}-orders-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
