import { describe, it, expect } from 'vitest';
import { createDirectClient } from '@/lib/db';
import { getDbShape } from '@/lib/db/introspect';

/**
 * Live integration tests for the direct-SQL client against a real database.
 * Skipped unless INTEGRATION_DB_URL is set:
 *   INTEGRATION_DB_URL=postgresql://... npx vitest run src/lib/db/__tests__/integration.test.ts
 * Read-only apart from RPC error paths; safe against production data.
 */
const url = process.env.INTEGRATION_DB_URL;
const d = url ? describe : describe.skip;

d('direct client against live database', () => {
  // Rows are untyped here on purpose: these tests assert runtime shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (): any => {
    // The pool reads DATABASE_URL lazily on first query.
    process.env.DATABASE_URL = url;
    return createDirectClient();
  };

  it('reads the store settings singleton', async () => {
    const { data, error } = await client().from('store_settings').select('*').eq('id', 1).maybeSingle();
    expect(error).toBeNull();
    expect(data?.store_name).toBeTruthy();
  });

  it('introspects primary keys as real JS arrays, not Postgres array-literal strings', async () => {
    // Regression: pg_attribute.attname is Postgres's internal `name` type;
    // array_agg(name) has no default pg type-parser and silently comes back
    // as the raw "{id}" string unless cast to text — see introspect.ts. That
    // broke every upsert() (e.g. saving store settings) with "target.map is
    // not a function" because the "string with a .length" looked truthy.
    process.env.DATABASE_URL = url;
    const shape = await getDbShape();
    const settingsPk = shape.primaryKeys.get('store_settings');
    const productsPk = shape.primaryKeys.get('products');
    expect(Array.isArray(settingsPk)).toBe(true);
    expect(settingsPk).toEqual(['id']);
    expect(Array.isArray(productsPk)).toBe(true);
    expect(productsPk).toEqual(['id']);
  });

  it('upserts store_settings end to end (round-trips the current value, no net change)', async () => {
    const before = await client().from('store_settings').select('payment_enabled').eq('id', 1).single();
    expect(before.error).toBeNull();
    const { data, error } = await client()
      .from('store_settings')
      .upsert({ id: 1, payment_enabled: before.data.payment_enabled })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.payment_enabled).toBe(before.data.payment_enabled);
  });

  it('counts players with head:true', async () => {
    const { count, error } = await client()
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'player')
      .eq('is_active', true);
    expect(error).toBeNull();
    expect(typeof count).toBe('number');
  });

  it('runs the homepage tournaments query (embed + in + gte + order + limit)', async () => {
    const { data, error } = await client()
      .from('tournaments')
      .select('*, district:districts(*)')
      .in('status', ['approved', 'featured'])
      .order('date', { ascending: true })
      .limit(5);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0 && data[0].district_id) {
      expect(data[0].district).toBeTruthy();
    }
  });

  it('runs the gallery nested-embed + count-aggregate query', async () => {
    const { data, error } = await client()
      .from('tournaments')
      .select('*, district:districts(*), media:tournament_media(count)')
      .in('status', ['approved', 'featured'])
      .order('date', { ascending: false })
      .limit(3);
    expect(error).toBeNull();
    if (data.length > 0) {
      expect(Array.isArray(data[0].media)).toBe(true);
      expect(typeof data[0].media[0].count).toBe('number');
    }
  });

  it('runs the pairings FK-hint query (SQL validity on empty result)', async () => {
    const { data, error } = await client()
      .from('tournament_pairings')
      .select(
        '*, white_player:tournament_players!tournament_pairings_white_player_id_fkey(*), black_player:tournament_players!tournament_pairings_black_player_id_fkey(*)'
      )
      .eq('round_id', '00000000-0000-0000-0000-000000000000')
      .order('board_number', { ascending: true });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('runs the tutor sets count-embed query', async () => {
    const { error } = await client()
      .from('session_sets')
      .select('*, puzzle_count:session_set_puzzles(count)')
      .order('created_at', { ascending: false });
    expect(error).toBeNull();
  });

  it('runs the products catalogue query (multi-embed + or-search)', async () => {
    const { data, error } = await client()
      .from('products')
      .select('*, category:store_categories(*), variants:product_variants(*), images:product_images(*)')
      .eq('is_active', true)
      .or('name.ilike.%a%,description.ilike.%a%')
      .order('sort_order')
      .order('created_at', { ascending: false })
      .limit(4);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('filters puzzles by theme with contains', async () => {
    const { data, error } = await client()
      .from('puzzles')
      .select('id, fen, moves, rating, themes')
      .gte('rating', 1000)
      .lte('rating', 1400)
      .contains('themes', ['fork'])
      .limit(3);
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].themes).toContain('fork');
  });

  it('surfaces RPC errors with their message (set_order_status on unknown order)', async () => {
    const { error } = await client().rpc('set_order_status', {
      p_order_id: '00000000-0000-0000-0000-000000000000',
      p_status: 'paid',
      p_note: null,
      p_actor: null,
    });
    expect(error?.message).toContain('Order not found');
  });

  it('place_order rejects an unknown product atomically', async () => {
    const { error } = await client().rpc('place_order', {
      p_order: {
        user_id: null,
        customer_name: 'Integration Test',
        customer_email: 'integration@test.local',
        customer_phone: '0000000000',
        fulfilment: 'collection',
        delivery_address: null,
        collection_point_id: null,
        collection_point_name: 'x',
        subtotal_cents: 100,
        delivery_fee_cents: 0,
        total_cents: 100,
        payment_provider: 'manual_eft',
        customer_note: null,
      },
      p_items: [
        {
          product_id: '00000000-0000-0000-0000-000000000000',
          variant_id: null,
          product_name: 'ghost',
          variant_name: null,
          image_url: null,
          unit_price_cents: 100,
          quantity: 1,
          line_total_cents: 100,
        },
      ],
    });
    // A ghost product trips either the FK constraint (order_items insert) or
    // the explicit availability check — both roll the whole order back.
    expect(error?.message).toMatch(/unavailable|foreign key/i);
  });

  it('left no test orders behind', async () => {
    const { count, error } = await client()
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_email', 'integration@test.local');
    expect(error).toBeNull();
    expect(count).toBe(0);
  });
});
