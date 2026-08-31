-- Whether online payment (currently: manual EFT) is offered at checkout.
-- Off = checkout still places a real order (stock reserved, appears in
-- Admin > Orders as normal) but skips payment instructions in favour of a
-- "we'll contact you" message — see src/lib/store/payments/contact.ts.
-- Defaults to true so existing checkout behaviour is unchanged.

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN NOT NULL DEFAULT true;
