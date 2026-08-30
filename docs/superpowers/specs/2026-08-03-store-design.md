# KZN Chess Store — design

**Date:** 2026-08-03
**Status:** Approved (approach A: native store in this app + Supabase)

## Goal

Add an e-commerce store to kznchess.co.za that sells **physical chess goods**
(sets, boards, clocks, books, merch), backed by a real **admin backend**
(products, variants, stock, orders, fulfilment, settings), and make the store
the **primary experience for visitors**: the homepage becomes store-first, with
tournaments and Learn kept one scroll (and one nav click) away.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| What is sold | Physical goods with stock and fulfilment |
| Variants | Simple variants (e.g. Size / Colour), each with own stock and price difference |
| Fulfilment | Courier delivery (admin-set flat fee, optional free-delivery threshold) **or** free collection at an admin-managed collection point (a venue or tournament) chosen at checkout |
| Payments | Provider-agnostic layer. Day one ships **Manual EFT / pay on collection** as a real provider; PayFast/Yoco slot in later as redirect providers |
| Homepage | Store-first: store hero + featured products + categories first; announcements, stats, upcoming tournaments, Learn CTA follow as sections. Store becomes the first nav item |
| Accounts | Guest checkout allowed (name, email, phone). Logged-in users get order history at `/my-orders` |
| Currency / tax | ZAR, integer cents in the DB, prices displayed VAT-inclusive with no separate VAT line |
| Notifications | No email service exists. Confirmation is on-screen via a private tokenised order link, plus a "send via WhatsApp" prefilled message to the store's number. Admin contacts customers via WhatsApp/phone/email links on the order |
| Stock | Reserved atomically when an order is placed; released when an order is cancelled; re-reserved if a cancelled order is reinstated |

## Architecture

- **Database:** migration `supabase/migrations/010_store.sql`. Tables:
  `store_categories`, `products`, `product_variants`, `product_images`,
  `collection_points`, `store_settings` (singleton row id=1), `orders`,
  `order_items` (name/price snapshots), `order_events` (status timeline).
  Two plpgsql functions keep multi-row writes atomic through PostgREST:
  `place_order(p_order jsonb, p_items jsonb)` (insert order + items, reserve
  stock, first event) and `set_order_status(p_order_id, p_status, p_note,
  p_actor)` (transition, restock on cancel, re-reserve on reinstate, mark paid).
  RLS enabled everywhere; public read policies only on catalogue tables; orders
  are service-role only (existing convention: APIs use the service role key).
- **Domain lib:** `src/lib/store/` — pure, testable modules (`money`, `slug`,
  `status`, `cart` pricing) and server modules (`catalog`, `orders`,
  `settings`), plus `payments/` (provider interface + registry + manual EFT)
  and `whatsapp.ts`.
- **API:** public `/api/store/*` (cart pricing, checkout, order lookup by
  token, payment webhooks) and admin `/api/admin/store/*` (products,
  categories, collection points, settings, orders). Admin routes use
  `getCurrentUser()` + role check and write to `audit_logs` like existing
  admin routes. Input validated with zod.
- **Storefront pages:** `/` (store-first home), `/store`, `/store/[slug]`,
  `/store/cart`, `/store/checkout`, `/store/orders/[orderNumber]`, `/my-orders`.
  Cart lives in a client `CartProvider` (localStorage) mounted in the root
  layout; the server re-prices and re-validates stock at checkout.
- **Admin pages:** `/admin/store` (overview), `/admin/store/products`
  (+ `/new`, `/[id]`), `/admin/store/orders` (+ `/[id]`),
  `/admin/store/settings` (settings + categories + collection points).
  Sidebar gets a **Store** entry.
- **Navigation:** Navbar: Store first, cart icon with count, "My Orders" in the
  account menu. Bottom nav gains Store. Middleware protects `/my-orders`.
- **Uploads:** existing `/api/upload` gains an optional `folder` field
  (allow-list) so product images land in `media/store/`.

## Order lifecycle

`awaiting_payment → paid → packed → shipped | ready_for_collection → completed`,
with `cancelled` reachable from any state (restocks). Marking `paid` sets
`payment_status = 'paid'` and `paid_at`. Admin UI only offers valid next
transitions for the order's fulfilment type.

## Payment provider contract

```ts
interface PaymentProvider {
  id: string;            // stored on orders.payment_provider
  label: string;         // shown at checkout
  description: string;
  createPayment(order: Order, settings: StoreSettings): Promise<PaymentInit>;
  handleWebhook?(req: Request): Promise<WebhookResult>;
}
type PaymentInit =
  | { kind: 'instructions'; title: string; lines: string[] }  // manual EFT
  | { kind: 'redirect'; url: string; method: 'GET' | 'POST'; fields?: Record<string, string> };
```

`manual_eft` returns instructions (bank details from settings, the order
number as payment reference, the total). A future `payfast` provider returns a
POST redirect and implements `handleWebhook` for ITN.

## Homepage behaviour

If the store is enabled, the page renders: announcement banner → `StoreHero`
(store name/tagline from settings, "Shop now" + "Tournaments" CTAs) →
`FeaturedProducts` (up to 8 active featured products; section omitted when
none) → `CategoryStrip` (omitted when no categories) → stats → upcoming
tournaments → Learn CTA. If the store is disabled in settings, the existing
tournament hero renders instead. No placeholder products or copy.

## Testing

- `vitest` for the pure modules: money formatting, slugify, status
  transitions, cart pricing (stock, inactive products, delivery fee and
  free-delivery threshold, variant price deltas).
- `npx next build` must pass.
- Manual smoke test through the admin: create a category, product with
  variants and image, place a guest order, mark it paid → packed → ready for
  collection, cancel another and confirm stock returns.

## Out of scope (v1)

Email notifications, discount codes, customer accounts beyond order history,
per-region shipping rates, refunds via provider API, product reviews.
