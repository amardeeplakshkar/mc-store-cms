export interface PriceInput {
  pricePaise: number;
  quantity?: number;
}

export interface PriceBreakdown {
  subtotalPaise: number;
  discountPaise: number;
  storeAmountPaise: number;
  platformFeePaise: number;
  totalPaise: number;
}

/**
 * Customer-side commission model:
 *   storeAmount = subtotal - store discount         (what the store keeps)
 *   platformFee = storeAmount * commission%         (paid by the customer on top)
 *   total       = storeAmount + platformFee         (what the customer pays)
 */
export function calculatePrice(items: PriceInput[], discountPercent: number, commissionPercent: number): PriceBreakdown {
  const subtotalPaise = items.reduce((s, i) => s + i.pricePaise * (i.quantity ?? 1), 0);
  const discountPaise = Math.round((subtotalPaise * clamp(discountPercent, 0, 90)) / 100);
  const storeAmountPaise = subtotalPaise - discountPaise;
  const platformFeePaise = Math.round((storeAmountPaise * clamp(commissionPercent, 0, 100)) / 100);
  return { subtotalPaise, discountPaise, storeAmountPaise, platformFeePaise, totalPaise: storeAmountPaise + platformFeePaise };
}

export function discountedPrice(pricePaise: number, discountPercent: number): number {
  return pricePaise - Math.round((pricePaise * clamp(discountPercent, 0, 90)) / 100);
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(paise / 100);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number(n) || 0));
}
