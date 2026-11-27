import { api } from '@/lib/api';
import { dt, inr } from '@/lib/format';
import { ActionForm, Submit } from '@/components/form';
import { Field, PageHeader, StatusBadge, TextArea } from '@/components/ui';
import { paymentAction } from '../../actions';
import Link from 'next/link';

export default async function Payments({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, recent] = await Promise.all([api(`/stores/${slug}/payment-config`), api(`/stores/${slug}/orders?pageSize=15`)]);
  return (
    <>
      <PageHeader title="Payments" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <ActionForm action={paymentAction.bind(null, slug)}>
            <h2 className="font-medium">UPI</h2>
            <Field label="UPI ID" name="upiId" defaultValue={p.upiId} placeholder="yourname@okaxis" hint="Used to generate a QR with the exact amount for every order" />
            <Field label="Payee name" name="upiPayeeName" defaultValue={p.upiPayeeName} />
            <div className="flex items-center gap-4">
              {p.qrImageUrl && <img src={p.qrImageUrl} alt="UPI QR" className="h-24 w-24 rounded border object-contain" />}
              <label className="block flex-1"><span className="label">Static UPI QR code (optional)</span><input type="file" name="qr" accept="image/*" className="text-sm" /></label>
            </div>
            <input type="hidden" name="qrImageUrl" defaultValue={p.qrImageUrl ?? ''} />
            <h2 className="pt-2 font-medium">Bank account</h2>
            <Field label="Bank name" name="bankName" defaultValue={p.bankName} />
            <Field label="Account holder name" name="accountName" defaultValue={p.accountName} />
            <Field label="Account number" name="accountNumber" defaultValue={p.accountNumber} />
            <Field label="IFSC" name="ifsc" defaultValue={p.ifsc} />
            <TextArea label="Payment instructions" name="instructions" rows={4} defaultValue={p.instructions} placeholder="Pay the exact amount, then paste your UPI transaction ID (UTR) below." />
            <Submit>Save payment settings</Submit>
          </ActionForm>
        </div>
        <div className="card">
          <h2 className="mb-4 font-medium">Recent transactions</h2>
          <table className="table">
            <thead><tr><th>Order</th><th>Amount</th><th>UTR</th><th>Status</th></tr></thead>
            <tbody>
              {recent.items.map((o: any) => (
                <tr key={o.id}>
                  <td><Link className="text-brand" href={`/orders/${o.id}`}>{o.number}</Link><div className="text-xs text-zinc-500">{dt(o.createdAt)}</div></td>
                  <td>{inr(o.totalPaise)}</td>
                  <td className="font-mono text-xs">{o.txnReference ?? '-'}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link href="/orders" className="mt-4 inline-block text-sm text-brand">All orders</Link>
        </div>
      </div>
    </>
  );
}
