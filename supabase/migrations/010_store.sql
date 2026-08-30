-- KZN Chess store: products with simple variants, orders with delivery or
-- collection fulfilment, provider-agnostic payments, admin-managed settings.
-- Money is stored as integer cents (ZAR). Prices are VAT-inclusive.

CREATE TABLE IF NOT EXISTS store_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID REFERENCES store_categories(id) ON DELETE SET NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  compare_at_cents INTEGER CHECK (compare_at_cents IS NULL OR compare_at_cents >= 0),
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0), -- used only when the product has no active variants
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option_label TEXT NOT NULL DEFAULT 'Option',  -- e.g. 'Size'
  name TEXT NOT NULL,                            -- e.g. 'Large'
  sku TEXT,
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);

CREATE TABLE IF NOT EXISTS collection_points (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  instructions TEXT,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Singleton settings row (id is always 1).
CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  store_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_enabled BOOLEAN NOT NULL DEFAULT true,
  collection_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  free_delivery_threshold_cents INTEGER CHECK (free_delivery_threshold_cents IS NULL OR free_delivery_threshold_cents >= 0),
  bank_details TEXT,          -- shown to customers paying by EFT
  whatsapp_number TEXT,       -- digits with country code, e.g. 27821234567
  store_name TEXT NOT NULL DEFAULT 'KZN Chess Store',
  tagline TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE DEFAULT ('KZN-' || lpad(nextval('order_number_seq')::text, 6, '0')),
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  fulfilment TEXT NOT NULL CHECK (fulfilment IN ('delivery', 'collection')),
  delivery_address JSONB,     -- { line1, line2, suburb, city, postal_code, province }
  collection_point_id UUID REFERENCES collection_points(id) ON DELETE SET NULL,
  collection_point_name TEXT, -- snapshot so renames do not rewrite history
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  delivery_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN (
    'awaiting_payment', 'paid', 'packed', 'shipped', 'ready_for_collection', 'completed', 'cancelled')),
  payment_provider TEXT NOT NULL,
  payment_reference TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  customer_note TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  image_url TEXT,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at);

-- Place an order atomically: insert the order and its items and reserve stock.
-- The stock_qty >= 0 CHECK constraints make an oversell raise, which rolls
-- back the whole order (PostgREST has no client-side transactions).
CREATE OR REPLACE FUNCTION place_order(p_order JSONB, p_items JSONB)
RETURNS orders LANGUAGE plpgsql AS $$
DECLARE
  o orders;
  it JSONB;
BEGIN
  INSERT INTO orders (
    user_id, customer_name, customer_email, customer_phone, fulfilment, delivery_address,
    collection_point_id, collection_point_name, subtotal_cents, delivery_fee_cents, total_cents,
    payment_provider, customer_note
  ) VALUES (
    NULLIF(p_order->>'user_id', '')::uuid,
    p_order->>'customer_name', p_order->>'customer_email', p_order->>'customer_phone',
    p_order->>'fulfilment', p_order->'delivery_address',
    NULLIF(p_order->>'collection_point_id', '')::uuid, p_order->>'collection_point_name',
    (p_order->>'subtotal_cents')::int, (p_order->>'delivery_fee_cents')::int, (p_order->>'total_cents')::int,
    p_order->>'payment_provider', p_order->>'customer_note'
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

-- Change an order status atomically. Cancelling restocks every line;
-- reinstating a cancelled order re-reserves stock (fails if it is gone).
-- Marking paid records payment_status/paid_at.
CREATE OR REPLACE FUNCTION set_order_status(p_order_id UUID, p_status TEXT, p_note TEXT, p_actor UUID)
RETURNS orders LANGUAGE plpgsql AS $$
DECLARE
  o orders;
  it order_items;
  prev TEXT;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status = p_status THEN RETURN o; END IF;
  prev := o.status;

  -- Reinstating an order that was already paid goes straight back to 'paid',
  -- so the customer is not asked to pay twice.
  IF prev = 'cancelled' AND p_status = 'awaiting_payment' AND o.payment_status = 'paid' THEN
    p_status := 'paid';
  END IF;

  IF p_status = 'cancelled' THEN
    FOR it IN SELECT * FROM order_items WHERE order_id = o.id LOOP
      IF it.variant_id IS NOT NULL THEN
        UPDATE product_variants SET stock_qty = stock_qty + it.quantity WHERE id = it.variant_id;
      ELSIF it.product_id IS NOT NULL THEN
        UPDATE products SET stock_qty = stock_qty + it.quantity WHERE id = it.product_id;
      END IF;
    END LOOP;
  ELSIF prev = 'cancelled' THEN
    FOR it IN SELECT * FROM order_items WHERE order_id = o.id LOOP
      IF it.variant_id IS NOT NULL THEN
        UPDATE product_variants SET stock_qty = stock_qty - it.quantity WHERE id = it.variant_id;
      ELSIF it.product_id IS NOT NULL THEN
        UPDATE products SET stock_qty = stock_qty - it.quantity WHERE id = it.product_id;
      END IF;
    END LOOP;
  END IF;

  UPDATE orders SET
    status = p_status,
    payment_status = CASE WHEN p_status = 'paid' AND payment_status = 'pending' THEN 'paid' ELSE payment_status END,
    paid_at = CASE WHEN p_status = 'paid' AND paid_at IS NULL THEN NOW() ELSE paid_at END,
    updated_at = NOW()
  WHERE id = o.id RETURNING * INTO o;

  INSERT INTO order_events (order_id, from_status, to_status, note, actor_user_id)
    VALUES (o.id, prev, p_status, p_note, p_actor);
  RETURN o;
END $$;

-- RLS (defence in depth; the app uses the service role key server-side).
ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads categories" ON store_categories;
CREATE POLICY "Public reads categories" ON store_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public reads active products" ON products;
CREATE POLICY "Public reads active products" ON products FOR SELECT USING (is_active);
DROP POLICY IF EXISTS "Public reads active variants" ON product_variants;
CREATE POLICY "Public reads active variants" ON product_variants FOR SELECT USING (is_active);
DROP POLICY IF EXISTS "Public reads images" ON product_images;
CREATE POLICY "Public reads images" ON product_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public reads active collection points" ON collection_points;
CREATE POLICY "Public reads active collection points" ON collection_points FOR SELECT USING (is_active);
DROP POLICY IF EXISTS "Public reads settings" ON store_settings;
CREATE POLICY "Public reads settings" ON store_settings FOR SELECT USING (true);
-- orders / order_items / order_events: no public policies (service role only).
