import { z } from 'zod';

export const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().nullable().default(null),
  quantity: z.number().int().min(1).max(99),
});

export const deliveryAddressSchema = z.object({
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional().nullable(),
  suburb: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().min(2).max(80),
  postal_code: z.string().trim().min(4).max(10),
  province: z.string().trim().min(2).max(40),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(50),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(120),
    phone: z.string().trim().min(8).max(20),
  }),
  fulfilment: z.enum(['delivery', 'collection']),
  delivery_address: deliveryAddressSchema.optional().nullable(),
  collection_point_id: z.string().uuid().optional().nullable(),
  payment_provider: z.string().min(1).max(40),
  note: z.string().trim().max(500).optional().nullable(),
});
export type CheckoutBody = z.infer<typeof checkoutSchema>;

export const variantSchema = z.object({
  id: z.string().uuid().optional(),
  option_label: z.string().trim().min(1).max(40).default('Option'),
  name: z.string().trim().min(1).max(60),
  sku: z.string().trim().max(60).optional().nullable(),
  price_delta_cents: z.number().int().min(-10_000_000).max(10_000_000).default(0),
  stock_qty: z.number().int().min(0).max(1_000_000).default(0),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const imageSchema = z.object({
  url: z.string().url().max(500),
  alt: z.string().trim().max(160).optional().nullable(),
  sort_order: z.number().int().default(0),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    category_id: z.string().uuid().optional().nullable(),
    price_cents: z.number().int().min(0).max(100_000_000),
    compare_at_cents: z.number().int().min(0).max(100_000_000).optional().nullable(),
    stock_qty: z.number().int().min(0).max(1_000_000).default(0),
    is_active: z.boolean().default(true),
    is_featured: z.boolean().default(false),
    sort_order: z.number().int().default(0),
    variants: z.array(variantSchema).max(50).default([]),
    images: z.array(imageSchema).max(12).default([]),
  })
  .superRefine((p, ctx) => {
    // A variant discount may never take the sellable price below zero.
    p.variants.forEach((v, i) => {
      if (p.price_cents + v.price_delta_cents < 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['variants', i, 'price_delta_cents'],
          message: 'Price difference would make this variant cheaper than free',
        });
      }
    });
  });
export type ProductBody = z.infer<typeof productSchema>;

/**
 * Partial product update (no variants/images): only the supplied scalar
 * columns change. Deliberately excludes stock so a stale admin screen can
 * never overwrite stock that checkouts have reduced in the meantime.
 */
export const productPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  price_cents: z.number().int().min(0).max(100_000_000).optional(),
  compare_at_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  sort_order: z.number().int().default(0),
});

/** Partial category update — no defaults, so a rename never resets sort_order. */
export const categoryPatchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  slug: z.string().trim().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  sort_order: z.number().int().optional(),
});

export const collectionPointSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().max(300).optional().nullable(),
  instructions: z.string().trim().max(500).optional().nullable(),
  tournament_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

/** Partial collection-point update — no defaults, so a rename never re-enables a hidden point. */
export const collectionPointPatchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  address: z.string().trim().max(300).nullable().optional(),
  instructions: z.string().trim().max(500).nullable().optional(),
  tournament_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const settingsSchema = z.object({
  store_enabled: z.boolean().optional(),
  delivery_enabled: z.boolean().optional(),
  collection_enabled: z.boolean().optional(),
  delivery_fee_cents: z.number().int().min(0).max(1_000_000).optional(),
  free_delivery_threshold_cents: z.number().int().min(0).max(100_000_000).nullable().optional(),
  bank_details: z.string().trim().max(1000).nullable().optional(),
  whatsapp_number: z.string().trim().regex(/^\d{9,15}$/).nullable().optional(),
  store_name: z.string().trim().min(2).max(80).optional(),
  tagline: z.string().trim().max(200).nullable().optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    'awaiting_payment',
    'paid',
    'packed',
    'shipped',
    'ready_for_collection',
    'completed',
    'cancelled',
  ]),
  note: z.string().trim().max(500).optional().nullable(),
});

export const orderAdminSchema = z.object({
  admin_note: z.string().trim().max(2000).nullable().optional(),
  payment_reference: z.string().trim().max(120).nullable().optional(),
});
