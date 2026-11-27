export const ORDER_STATUSES = ['PENDING', 'AWAITING_VERIFICATION', 'SUCCESSFUL', 'FAILED', 'CANCELLED'] as const;
export type OrderStatusT = (typeof ORDER_STATUSES)[number];

export const PACKAGE_CATEGORIES = ['RANK', 'CRATE', 'COIN', 'OTHER'] as const;
export type PackageCategoryT = (typeof PACKAGE_CATEGORIES)[number];

export const DURATION_TYPES = ['PERMANENT', 'DAYS', 'MONTHLY'] as const;
export type DurationTypeT = (typeof DURATION_TYPES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatusT, string> = {
  PENDING: 'Pending payment',
  AWAITING_VERIFICATION: 'Awaiting verification',
  SUCCESSFUL: 'Successful',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export const CATEGORY_LABEL: Record<PackageCategoryT, string> = {
  RANK: 'Ranks',
  CRATE: 'Crates',
  COIN: 'Coins',
  OTHER: 'Other items',
};
