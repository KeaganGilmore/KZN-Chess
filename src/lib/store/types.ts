export type Fulfilment = 'delivery' | 'collection';
export type OrderStatus =
  | 'awaiting_payment'
  | 'paid'
  | 'packed'
  | 'shipped'
  | 'ready_for_collection'
  | 'completed'
  | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface StoreCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  option_label: string;
  name: string;
  sku: string | null;
  price_delta_cents: number;
  stock_qty: number;
  is_active: boolean;
  sort_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  /** Which variant this photo shows; null = general photo (any variant without its own falls back to these). */
  variant_id: string | null;
  url: string;
  alt: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price_cents: number;
  compare_at_cents: number | null;
  stock_qty: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category?: StoreCategory | null;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface CollectionPoint {
  id: string;
  name: string;
  address: string | null;
  instructions: string | null;
  tournament_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface StoreSettings {
  id: 1;
  store_enabled: boolean;
  delivery_enabled: boolean;
  collection_enabled: boolean;
  delivery_fee_cents: number;
  free_delivery_threshold_cents: number | null;
  bank_details: string | null;
  whatsapp_number: string | null;
  store_name: string;
  tagline: string | null;
  updated_at: string;
}

export interface DeliveryAddress {
  line1: string;
  line2?: string | null;
  suburb?: string | null;
  city: string;
  postal_code: string;
  province: string;
}

/** What the browser cart stores — nothing price-related, the server re-prices. */
export interface CartItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
}

export type LineProblem = 'inactive' | 'out_of_stock' | 'insufficient_stock' | null;

export interface PricedLine {
  product_id: string;
  variant_id: string | null;
  product_slug: string | null;
  product_name: string;
  variant_name: string | null;
  image_url: string | null;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
  available: number;
  problem: LineProblem;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  /** true when every line can be fulfilled as requested */
  ok: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  access_token: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  fulfilment: Fulfilment;
  delivery_address: DeliveryAddress | null;
  collection_point_id: string | null;
  collection_point_name: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  status: OrderStatus;
  payment_provider: string;
  payment_reference: string | null;
  payment_status: PaymentStatus;
  paid_at: string | null;
  customer_note: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  image_url: string | null;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  actor_user_id: string | null;
  created_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  events: OrderEvent[];
}
