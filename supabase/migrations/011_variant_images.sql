-- Let a product image be tied to a specific variant (e.g. a colour), so the
-- storefront can swap the photo when the shopper switches variants. NULL
-- (the default for every existing row) means "general photo, shown for any
-- variant that has none of its own" — purely additive, no behaviour change
-- for products that don't use it.

ALTER TABLE product_images
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_images_variant ON product_images(variant_id);
