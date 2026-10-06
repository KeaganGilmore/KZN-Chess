-- Record which version of the Terms of Service / Privacy Policy someone
-- accepted, and when. Versions are LEGAL_VERSION in src/lib/legal.ts.
--   users:  set on registration, refreshed when an organiser accepts the
--           organiser terms on a new tournament submission.
--   orders: set at checkout (guests included).
-- NULL = accepted nothing on record (accounts/orders from before this change).
-- Apply BEFORE deploying the code that writes these columns.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Same as 010_store.sql, plus the terms columns. Acceptance time is the
-- moment the order row is written.
CREATE OR REPLACE FUNCTION place_order(p_order JSONB, p_items JSONB)
RETURNS orders LANGUAGE plpgsql AS $$
DECLARE
  o orders;
  it JSONB;
BEGIN
  INSERT INTO orders (
    user_id, customer_name, customer_email, customer_phone, fulfilment, delivery_address,
    collection_point_id, collection_point_name, subtotal_cents, delivery_fee_cents, total_cents,
    payment_provider, customer_note, terms_version, terms_accepted_at
  ) VALUES (
    NULLIF(p_order->>'user_id', '')::uuid,
    p_order->>'customer_name', p_order->>'customer_email', p_order->>'customer_phone',
    p_order->>'fulfilment', p_order->'delivery_address',
    NULLIF(p_order->>'collection_point_id', '')::uuid, p_order->>'collection_point_name',
    (p_order->>'subtotal_cents')::int, (p_order->>'delivery_fee_cents')::int, (p_order->>'total_cents')::int,
    p_order->>'payment_provider', p_order->>'customer_note',
    NULLIF(p_order->>'terms_version', ''),
    CASE WHEN NULLIF(p_order->>'terms_version', '') IS NOT NULL THEN NOW() END
  ) RETURNING * INTO o;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO order_items (
      order_id, product_id, variant_id, product_name, variant_name, image_url,
      unit_price_cents, quantity, line_total_cents
    ) VALUES (
      o.id, (it->>'product_id')::uuid, NULLIF(it->>'variant_id', '')::uuid,
      it->>'product_name', it->>'variant_name', it->>'image_url',
      (it->>'unit_price_cents')::int, (it->>'quantity')::int, (it->>'line_total_cents')::int
    );
    IF NULLIF(it->>'variant_id', '') IS NOT NULL THEN
      UPDATE product_variants SET stock_qty = stock_qty - (it->>'quantity')::int
        WHERE id = (it->>'variant_id')::uuid AND is_active;
      IF NOT FOUND THEN RAISE EXCEPTION 'Variant unavailable'; END IF;
    ELSE
      UPDATE products SET stock_qty = stock_qty - (it->>'quantity')::int
        WHERE id = (it->>'product_id')::uuid AND is_active;
      IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable'; END IF;
    END IF;
  END LOOP;

  INSERT INTO order_events (order_id, from_status, to_status, note)
    VALUES (o.id, NULL, o.status, 'Order placed');
  RETURN o;
END $$;
