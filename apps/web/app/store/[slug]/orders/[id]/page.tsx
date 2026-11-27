import QRCode from 'qrcode';
import { notFound, redirect } from 'next/navigation';
import { apiSafe } from '@/lib/api';
import { dt, inr } from '@/lib/format';
import { ActionForm, CopyButton, PrintButton, Submit } from '@/components/form';
import { Field, StatusBadge } from '@/components/ui';
import { cancelOrderAction, submitReferenceAction } from '../../actions';

export default async function OrderPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { data, status } = await apiSafe(`/s/${slug}/orders/${id}`);
  if (status === 401) redirect('/auth/login');
  if (!data) notFound();
  const { order: o, payment, upiLink, store } = data;
  const qr = upiLink ? await QRCode.toDataURL(upiLink, { width: 280, margin: 1 }) : null;
  const awaitingPayment = o.status === 'PENDING' || o.status === 'AWAITING_VERIFICATION';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Order {o.number}</h1>
        <StatusBadge status={o.status} />
      </div>

      {awaitingPayment && (
        <div className="card">
          <h2 className="mb-1 text-lg font-semibold">Pay {inr(o.totalPaise)}</h2>
          <p className="mb-4 text-sm text-zinc-600">Pay the exact amount and keep the order number <b>{o.number}</b> in the payment note.</p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="text-center">
              {qr ? <img src={qr} alt="UPI QR" className="mx-auto rounded border" /> : payment?.qrImageUrl && <img src={payment.qrImageUrl} alt="UPI QR" className="mx-auto max-h-72 rounded border" />}
              {upiLink && <a href={upiLink} className="btn-primary mt-3 md:hidden">Open UPI app</a>}
              {qr && payment?.qrImageUrl && <p className="mt-2 text-xs text-zinc-500">Scan with any UPI app. Amount is pre-filled.</p>}
            </div>
            <div className="space-y-3 text-sm">
              {payment?.upiId && <div><div className="text-zinc-500">UPI ID</div><div className="font-mono">{payment.upiId} <CopyButton text={payment.upiId} /></div></div>}
              {payment?.accountNumber && (
                <div>
                  <div className="text-zinc-500">Bank transfer</div>
                  <div>{payment.accountName}</div>
                  <div className="font-mono">{payment.accountNumber} <CopyButton text={payment.accountNumber} /></div>
                  <div>IFSC: <span className="font-mono">{payment.ifsc}</span> ({payment.bankName})</div>
                </div>
              )}
              {payment?.instructions && <p className="whitespace-pre-line rounded bg-zinc-50 p-3 text-zinc-700">{payment.instructions}</p>}
            </div>
          </div>
          <div className="mt-6 border-t pt-4">
            {o.status === 'AWAITING_VERIFICATION' && (
              <p className="mb-3 rounded bg-blue-50 p-3 text-sm text-blue-800">
                We received your transaction ID <span className="font-mono">{o.txnReference}</span>. The store will verify it shortly and your items will be delivered in-game.
              </p>
            )}
            <ActionForm action={submitReferenceAction.bind(null, slug, o.id)}>
              <Field label={o.status === 'AWAITING_VERIFICATION' ? 'Update transaction ID' : 'After paying, enter your UPI transaction ID (UTR)'} name="txnReference" defaultValue={o.txnReference} required placeholder="12-digit UTR" />
              <Submit>Submit payment reference</Submit>
            </ActionForm>
            {o.status === 'PENDING' && (
              <form action={cancelOrderAction.bind(null, slug, o.id)} className="mt-3"><button className="text-sm text-zinc-500 underline">Cancel order</button></form>
            )}
          </div>
        </div>
      )}

      {o.status === 'FAILED' && <div className="card bg-red-50 text-sm text-red-800">The store could not verify this payment. {o.adminNote} Contact support if you have paid.</div>}
      {o.status === 'CANCELLED' && <div className="card text-sm text-zinc-600">This order was cancelled. {o.adminNote}</div>}

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">{o.status === 'SUCCESSFUL' ? 'Receipt' : 'Order summary'}</h2>
          {o.status === 'SUCCESSFUL' && <PrintButton />}
        </div>
        <dl className="mb-4 grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-zinc-500">Store</dt><dd>{store.name}</dd>
          <dt className="text-zinc-500">Player</dt><dd>{o.mcUsername}</dd>
          <dt className="text-zinc-500">Placed</dt><dd>{dt(o.createdAt)}</dd>
          {o.verifiedAt && <><dt className="text-zinc-500">Paid</dt><dd>{dt(o.verifiedAt)}</dd></>}
          {o.txnReference && <><dt className="text-zinc-500">Transaction ID</dt><dd className="font-mono">{o.txnReference}</dd></>}
          {o.status === 'SUCCESSFUL' && <><dt className="text-zinc-500">In-game delivery</dt><dd>{o.delivered ? 'Delivered' : 'Queued, delivers when the server processes it'}</dd></>}
        </dl>
        <table className="table">
          <tbody>
            {o.items.map((i: any) => <tr key={i.id}><td>{i.nameSnap} x{i.quantity}{i.expiresAt && <div className="text-xs text-zinc-500">Expires {dt(i.expiresAt)}</div>}</td><td className="text-right">{inr(i.pricePaise * i.quantity)}</td></tr>)}
            {o.discountPaise > 0 && <tr><td>Discount</td><td className="text-right">-{inr(o.discountPaise)}</td></tr>}
            <tr><td>Platform fee ({o.commissionPercent}%)</td><td className="text-right">{inr(o.platformFeePaise)}</td></tr>
            <tr className="font-semibold"><td>Total</td><td className="text-right">{inr(o.totalPaise)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
