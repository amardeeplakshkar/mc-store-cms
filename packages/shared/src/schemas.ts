import { z } from 'zod';
import { DURATION_TYPES, ORDER_STATUSES, PACKAGE_CATEGORIES } from './enums';
import { validateSlug } from './slug';

const optStr = z.string().trim().max(2000).optional().nullable().transform((v) => (v === '' ? null : v));

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const slugSchema = z.string().trim().toLowerCase().superRefine((v, ctx) => {
  const err = validateSlug(v);
  if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
});

export const createStoreSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(80),
  description: optStr,
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
  ownerEmail: z.string().email().optional(),
  ownerPassword: z.string().min(6).optional(),
});

export const updateStorePlatformSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: optStr,
  isEnabled: z.boolean().optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
});

export const createAdminSchema = z.object({
  email: z.string().email(),
  name: optStr,
  password: z.string().min(6),
  isSuperAdmin: z.boolean().optional(),
  storeId: z.string().optional(),
  role: z.enum(['OWNER', 'STAFF']).optional(),
});

export const updateAdminSchema = z.object({
  name: optStr,
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
});

export const assignMemberSchema = z.object({
  adminId: z.string(),
  role: z.enum(['OWNER', 'STAFF']).default('STAFF'),
});

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: optStr,
  logoUrl: optStr,
  serverName: optStr,
  serverIp: optStr,
  supportInfo: optStr,
  requireVerifiedUsername: z.boolean().optional(),
  settings: z.record(z.any()).optional(),
});

export const discountSchema = z.object({ discountPercent: z.coerce.number().int().min(0).max(90) });

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  type: z.enum(PACKAGE_CATEGORIES),
  sort: z.coerce.number().int().default(0),
});

export const packageSchema = z
  .object({
    categoryId: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    description: optStr,
    imageUrl: optStr,
    priceRupees: z.coerce.number().min(1).max(1_000_000),
    durationType: z.enum(DURATION_TYPES).default('PERMANENT'),
    durationDays: z.coerce.number().int().min(1).max(3650).optional().nullable(),
    commands: z.array(z.string().trim().min(1)).min(1, 'Add at least one command'),
    expiryCommands: z.array(z.string().trim().min(1)).default([]),
    requireOnline: z.boolean().default(false),
    isEnabled: z.boolean().default(true),
    sort: z.coerce.number().int().default(0),
  })
  .refine((p) => p.durationType !== 'DAYS' || !!p.durationDays, { message: 'Duration days required', path: ['durationDays'] });

export const paymentConfigSchema = z.object({
  upiId: optStr,
  upiPayeeName: optStr,
  qrImageUrl: optStr,
  bankName: optStr,
  accountName: optStr,
  accountNumber: optStr,
  ifsc: optStr,
  instructions: optStr,
});

export const orderQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  storeId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: optStr,
});

export const createOrderSchema = z.object({
  packageId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  mcUsername: z.string().trim().regex(/^[A-Za-z0-9_]{3,16}$/, 'Invalid Minecraft username').optional(),
});

export const submitReferenceSchema = z.object({
  txnReference: z.string().trim().min(6).max(40).regex(/^[A-Za-z0-9-]+$/, 'Only letters, numbers and hyphens'),
});

export const setUsernameSchema = z.object({
  mcUsername: z.string().trim().regex(/^[A-Za-z0-9_]{3,16}$/, 'Invalid Minecraft username'),
});

export const settlementSchema = z.object({
  amountPaise: z.coerce.number().int().min(1).optional(),
  reference: optStr,
  note: optStr,
});

export const globalConfigSchema = z.object({ key: z.string().min(1), value: z.any() });

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type PackageInput = z.infer<typeof packageSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
