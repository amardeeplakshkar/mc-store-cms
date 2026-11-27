import Link from 'next/link';
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from '@mcstore/shared';
import { api } from '@/lib/api';
import { dt, inr } from '@/lib/format';
import { ActionForm, Submit } from '@/components/form';
import { Badge, Field, PageHeader, Select, StatusBadge } from '@/components/ui';
import { orderStatusAction, redeliverAction, verifyOrderAction } from '../../../actions';

export default async function OrderDetail({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const o = await api(`/stores/${slug}/orders/${id}`);
  const canVerify = ['PENDING', 'AWAITING_VERIFICATION', 'FAILED'].includes(o.status);
  const failedDeliveries = o.deliveries.filter((d: any) => d.status === 'FAILED').length;
  return (
    <>
      <PageHeader title={`Order ${o.number}`}><StatusBadge status={o.status} /></PageHeader>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h2 className="mb-3 font-medium">Payment</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-zinc-500">Transaction reference (UTR)</dt><dd className="font-mono">{o.txnReference ?? 'Not submitted yet'}</dd>
              <dt className="text-zinc-500">Submitted</dt><dd>{dt(o.referenceAt)}</dd>
              <dt className="text-zinc-500">Subtotal</dt><dd>{inr(o.subtotalPaise)}</dd>
              <dt className="text-zinc-500">Store discount</dt><dd>-{inr(o.discountPaise)}</dd>
              <dt className="text-zinc-500">Your amount</dt><dd className="font-medium">{inr(o.storeAmountPaise)}</dd>
              <dt className="text-zinc-500">Platform fee ({Number(o.commissionPercent)}%)</dt><dd>{inr(o.platformFeePaise)}</dd>
              <dt className="text-zinc-500">Customer should have paid</dt><dd className="text-lg font-semibold">{inr(o.totalPaise)}</dd>
              <dt className="text-zinc-500">Verified</dt><dd>{o.verifiedAt ? dt(o.verifiedAt) : '-'}</dd>
            </dl>
            <p className="mt-3 text-xs text-zinc-500">Check your bank or UPI app for a payment of {inr(o.totalPaise)} with note {o.number} or UTR {o.txnReference ?? '-'}.</p>
          </div>
          <div className="card">
            <h2 className="mb-3 font-medium">Items</h2>
            <table className="table">
              <thead><tr><th>Package</th><th>Qty</th><th>List price</th><th>Expires</th></tr></thead>
              <tbody>{o.items.map((i: any) => <tr key={i.id}><td>{i.nameSnap}</td><td>{i.quantity}</td><td>{inr(i.pricePaise)}</td><td>{i.expiresAt ? dt(i.expiresAt) : '-'}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">In-game delivery</h2>
              {failedDeliveries > 0 && o.status === 'SUCCESSFUL' && (
                <ActionForm action={redeliverAction.bind(null, slug, id)}><Submit variant="secondary">Retry failed ({failedDeliveries})</Submit></ActionForm>
              )}
            </div>
            {o.deliveries.length === 0 ? <p className="text-sm text-zinc-500">Commands are queued once the payment is verified.</p> : (
              <table className="table">
                <thead><tr><th>Command</th><th>Status</th><th>Attempts</th><th>Error</th></tr></thead>
                <tbody>
                  {o.deliveries.map((d: any) => (
                    <tr key={d.id}>
                      <td className="font-mono text-xs">{d.command}</td>
                      <td><Badge tone={d.status === 'EXECUTED' ? 'green' : d.status === 'FAILED' ? 'red' : 'blue'}>{d.status}</Badge></td>
                      <td>{d.attempts}</td>
                      <td className="text-xs text-red-600">{d.lastError}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 font-medium">Player</h2>
            <p className="text-sm">{o.mcUsername} {o.customer.player.mcVerified && o.customer.player.mcUsername?.toLowerCase() === o.mcUsername.toLowerCase() ? <Badge tone="green">Verified</Badge> : <Badge>Unverified</Badge>}</p>
            <p className="font-mono text-xs text-zinc-500">{o.mcUuid ?? 'UUID unknown'}</p>
            <p className="mt-2 text-xs text-zinc-500">{o.customer.player.displayName} {o.customer.player.email}</p>
            <Link href={`/customers/${o.customer.id}`} className="mt-2 inline-block text-sm text-brand">Purchase history</Link>
          </div>
          {canVerify && (
            <div className="card">
              <h2 className="mb-3 font-medium">Verify payment</h2>
              <ActionForm action={verifyOrderAction.bind(null, slug, id)}>
                <Field label="Note (optional)" name="note" />
                <Submit confirm={`Confirm you received ${inr(o.totalPaise)}? Commands will be sent to the server.`}>Mark as paid and deliver</Submit>
              </ActionForm>
            </div>
          )}
          <div className="card">
            <h2 className="mb-3 font-medium">Update status</h2>
            <ActionForm action={orderStatusAction.bind(null, slug, id)}>
              <Select label="Status" name="status" defaultValue={o.status} options={ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s] }))} />
              <Field label="Note" name="note" defaultValue={o.adminNote} />
              <Submit variant="secondary">Update</Submit>
            </ActionForm>
          </div>
        </div>
      </div>
    </>
  );
}
