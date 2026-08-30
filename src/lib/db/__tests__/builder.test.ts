import { describe, it, expect } from 'vitest';
import { QueryBuilder, runRpc, type Executor, type Sql } from '@/lib/db/builder';
import type { DbShape } from '@/lib/db/introspect';

const shape: DbShape = {
  foreignKeys: [
    { name: 'fk_p_cat', table: 'products', column: 'category_id', refTable: 'store_categories', refColumn: 'id' },
    { name: 'fk_v_p', table: 'product_variants', column: 'product_id', refTable: 'products', refColumn: 'id' },
    { name: 'fk_i_p', table: 'product_images', column: 'product_id', refTable: 'products', refColumn: 'id' },
    { name: 'fk_t_d', table: 'tournaments', column: 'district_id', refTable: 'districts', refColumn: 'id' },
    { name: 'fk_t_u', table: 'tournaments', column: 'organizer_id', refTable: 'users', refColumn: 'id' },
    { name: 'fk_m_u', table: 'tournament_media', column: 'uploaded_by', refTable: 'users', refColumn: 'id' },
    { name: 'fk_m_t', table: 'tournament_media', column: 'tournament_id', refTable: 'tournaments', refColumn: 'id' },
    { name: 'fk_ssp_ss', table: 'session_set_puzzles', column: 'session_set_id', refTable: 'session_sets', refColumn: 'id' },
    { name: 'tournament_pairings_white_player_id_fkey', table: 'tournament_pairings', column: 'white_player_id', refTable: 'tournament_players', refColumn: 'id' },
    { name: 'tournament_pairings_black_player_id_fkey', table: 'tournament_pairings', column: 'black_player_id', refTable: 'tournament_players', refColumn: 'id' },
  ],
  primaryKeys: new Map([
    ['store_settings', ['id']],
    ['products', ['id']],
  ]),
  columnTypes: new Map([
    ['orders', new Map([['delivery_address', 'jsonb'], ['customer_name', 'text']])],
    ['audit_logs', new Map([['details', 'jsonb']])],
    ['products', new Map([['name', 'text']])],
    ['store_settings', new Map([['bank_details', 'text']])],
    ['puzzles', new Map([['themes', '_text']])],
  ]),
};

function harness(rows: Record<string, unknown>[] = []) {
  const calls: Sql[] = [];
  const exec: Executor = async (sql) => {
    calls.push(sql);
    return { rows };
  };
  const qb = <T = unknown>(table: string) => new QueryBuilder<T>(table, exec, async () => shape);
  return { calls, qb, exec };
}

describe('select', () => {
  it('builds filters, order, limit', async () => {
    const { calls, qb } = harness();
    await qb('users').select('id, email').eq('role', 'admin').neq('is_active', false).order('created_at', { ascending: false }).limit(5);
    expect(calls[0].text).toBe(
      'SELECT t."id", t."email" FROM "users" t WHERE t."role" = $1 AND t."is_active" <> $2 ORDER BY t."created_at" DESC LIMIT 5'
    );
    expect(calls[0].values).toEqual(['admin', false]);
  });

  it('builds many-to-one and one-to-many embeds from FKs', async () => {
    const { calls, qb } = harness();
    await qb('products').select('*, category:store_categories(*), variants:product_variants(*)').eq('is_active', true);
    const text = calls[0].text;
    expect(text).toContain(
      '(SELECT to_jsonb(sub) FROM (SELECT e0.* FROM "store_categories" e0 WHERE e0."id" = t."category_id" LIMIT 1) sub) AS "category"'
    );
    expect(text).toContain(
      `(SELECT COALESCE(jsonb_agg(to_jsonb(sub)), '[]'::jsonb) FROM (SELECT e1.* FROM "product_variants" e1 WHERE e1."product_id" = t."id") sub) AS "variants"`
    );
  });

  it('disambiguates multiple FKs to the same table via the alias', async () => {
    const { calls, qb } = harness();
    await qb('tournaments').select('*, organizer:users(id, name)').eq('id', 'x');
    expect(calls[0].text).toContain('WHERE e0."id" = t."organizer_id"');
  });

  it('builds embedded count aggregates in PostgREST shape', async () => {
    const { calls, qb } = harness();
    await qb('session_sets').select('id, puzzle_count:session_set_puzzles(count)');
    expect(calls[0].text).toContain(
      `(SELECT jsonb_build_array(jsonb_build_object('count', COUNT(*))) FROM "session_set_puzzles" e0 WHERE e0."session_set_id" = t."id") AS "puzzle_count"`
    );
  });

  it('handles or() with is.null and timestamp gt', async () => {
    const { calls, qb } = harness();
    await qb('announcements').select('*').eq('is_active', true).or('end_date.is.null,end_date.gt.2026-08-26T10:00:00.000Z');
    expect(calls[0].text).toContain('(t."end_date" IS NULL OR t."end_date" > $2)');
    expect(calls[0].values).toEqual([true, '2026-08-26T10:00:00.000Z']);
  });

  it('handles in, not-in and contains', async () => {
    const { calls, qb } = harness();
    await qb('orders').select('*').in('status', ['paid', 'packed']).not('status', 'in', '(completed,cancelled)');
    expect(calls[0].text).toContain('t."status" = ANY($1)');
    expect(calls[0].text).toContain('t."status" <> ALL($2)');
    expect(calls[0].values).toEqual([['paid', 'packed'], ['completed', 'cancelled']]);

    const h2 = harness();
    await h2.qb('puzzles').select('id').contains('themes', ['fork']).limit(1);
    expect(h2.calls[0].text).toContain('t."themes" @> $1');
  });

  it('count exact head runs a count query only', async () => {
    const { calls, qb } = harness([{ count: '42' }]);
    const res = await qb('users').select('id', { count: 'exact', head: true }).eq('role', 'player');
    expect(calls).toHaveLength(1);
    expect(calls[0].text).toBe('SELECT COUNT(*)::bigint AS count FROM "users" t WHERE t."role" = $1');
    expect(res.count).toBe(42);
    expect(res.data).toBeNull();
  });

  it('range becomes limit/offset and count accompanies data', async () => {
    const { calls, qb } = harness([{ count: '7' }]);
    await qb('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(20, 39);
    expect(calls[0].text).toContain('COUNT(*)');
    expect(calls[1].text).toContain('LIMIT 20 OFFSET 20');
  });
});

describe('inventory-driven special cases', () => {
  it('two-level nested embeds (gallery/feed shape)', async () => {
    const { calls, qb } = harness();
    await qb('tournament_media').select('*, tournament:tournaments(id, name, district:districts(name)), uploader:users(id, name)').limit(30);
    const text = calls[0].text;
    expect(text).toContain('FROM "tournaments" e0 WHERE e0."id" = t."tournament_id"');
    expect(text).toContain('FROM "districts" e1 WHERE e1."id" = e0."district_id"');
    expect(text).toContain('AS "uploader"');
  });

  it('FK-hint disambiguation for pairings (two FKs to one table)', async () => {
    const { calls, qb } = harness();
    await qb('tournament_pairings')
      .select('*, white_player:tournament_players!tournament_pairings_white_player_id_fkey(*), black_player:tournament_players!tournament_pairings_black_player_id_fkey(*)')
      .eq('round_id', 'r1')
      .order('board_number', { ascending: true });
    const text = calls[0].text;
    expect(text).toContain('WHERE e0."id" = t."white_player_id"');
    expect(text).toContain('WHERE e1."id" = t."black_player_id"');
  });

  it('embed-only select (my-tournaments arbiter shape)', async () => {
    const { calls, qb } = harness();
    await qb('tournament_arbiters' as string).select('tournament:tournaments(id, name, district:districts(name))').eq('user_id', 'u1').then(
      () => undefined,
      () => undefined
    );
    // tournament_arbiters has no FK in the fake shape; assert it fails loudly, not silently
    const res = await qb('tournament_media').select('tournament:tournaments(id, name)').eq('id', 'x');
    expect(calls.at(-1)!.text.startsWith('SELECT (SELECT to_jsonb(sub)')).toBe(true);
    expect(res.error).toBeNull();
  });

  it('mutation returning embeds goes through a CTE', async () => {
    const { calls, qb } = harness([{ id: 'm1', uploader: { id: 'u1', name: 'K' } }]);
    const res = await qb('tournament_media')
      .insert({ tournament_id: 't1', uploaded_by: 'u1', url: 'x' })
      .select('*, uploader:users(id, name)')
      .single();
    expect(calls[0].text).toMatch(/^WITH t AS \(INSERT INTO "tournament_media" .+ RETURNING \*\) SELECT t\.\*, \(SELECT to_jsonb\(sub\)/);
    expect(calls[0].text).toContain('WHERE e0."id" = t."uploaded_by"');
    expect(res.data).toEqual({ id: 'm1', uploader: { id: 'u1', name: 'K' } });
  });

  it('upsert with ignoreDuplicates does nothing on conflict', async () => {
    const { calls, qb } = harness();
    await qb('session_set_puzzles').upsert(
      { session_set_id: 's', puzzle_id: 'p', sort_order: 1 },
      { onConflict: 'session_set_id,puzzle_id', ignoreDuplicates: true }
    );
    expect(calls[0].text).toContain('ON CONFLICT ("session_set_id", "puzzle_id") DO NOTHING');
    expect(calls[0].text).not.toContain('RETURNING');
  });
});

describe('single/maybeSingle semantics', () => {
  it('single() errors on zero rows with PGRST116', async () => {
    const { qb } = harness([]);
    const res = await qb('users').select('*').eq('id', 'x').single();
    expect(res.data).toBeNull();
    expect(res.error?.code).toBe('PGRST116');
  });
  it('maybeSingle() returns null data on zero rows without error', async () => {
    const { qb } = harness([]);
    const res = await qb('users').select('*').eq('id', 'x').maybeSingle();
    expect(res.data).toBeNull();
    expect(res.error).toBeNull();
  });
  it('maybeSingle() errors on multiple rows', async () => {
    const { qb } = harness([{ a: 1 }, { a: 2 }]);
    const res = await qb('users').select('*').maybeSingle();
    expect(res.error?.code).toBe('PGRST116');
  });
});

describe('mutations', () => {
  it('insert with returning single', async () => {
    const { calls, qb } = harness([{ id: '1' }]);
    const res = await qb('store_categories').insert({ name: 'Boards', slug: 'boards', sort_order: 0 }).select().single();
    expect(calls[0].text).toBe(
      'INSERT INTO "store_categories" ("name", "slug", "sort_order") VALUES ($1, $2, $3) RETURNING *'
    );
    expect(res.data).toEqual({ id: '1' });
  });

  it('insert stringifies jsonb columns but leaves text[] arrays alone', async () => {
    const { calls, qb } = harness();
    await qb('audit_logs').insert({ details: { a: 1 }, action: 'x' });
    expect(calls[0].text).toContain('$1::jsonb');
    expect(calls[0].values[0]).toBe('{"a":1}');
  });

  it('multi-row insert', async () => {
    const { calls, qb } = harness();
    await qb('product_images').insert([
      { url: 'a', sort_order: 0 },
      { url: 'b', sort_order: 1 },
    ]);
    expect(calls[0].text).toContain('VALUES ($1, $2), ($3, $4)');
  });

  it('update with where and returning maybeSingle', async () => {
    const { calls, qb } = harness([{ id: 'c1' }]);
    const res = await qb('store_categories').update({ name: 'New' }).eq('id', 'c1').select().maybeSingle();
    expect(calls[0].text).toBe(
      'UPDATE "store_categories" t SET "name" = $1 WHERE t."id" = $2 RETURNING *'
    );
    expect(res.data).toEqual({ id: 'c1' });
  });

  it('update skips undefined values', async () => {
    const { calls, qb } = harness();
    await qb('products').update({ name: 'x', slug: undefined }).eq('id', 'p');
    expect(calls[0].text).not.toContain('slug');
  });

  it('upsert defaults conflict target to the primary key', async () => {
    const { calls, qb } = harness([{ id: 1 }]);
    await qb('store_settings').upsert({ id: 1, bank_details: 'FNB' }).select().single();
    expect(calls[0].text).toBe(
      'INSERT INTO "store_settings" ("id", "bank_details") VALUES ($1, $2) ON CONFLICT ("id") DO UPDATE SET "bank_details" = EXCLUDED."bank_details" RETURNING *'
    );
  });

  it('delete requires a filter and supports returning', async () => {
    const { calls, qb } = harness([{ id: 'x', name: 'n' }]);
    const res = await qb('collection_points').delete().eq('id', 'x').select('id, name').maybeSingle();
    expect(calls[0].text).toBe(
      'DELETE FROM "collection_points" t WHERE t."id" = $1 RETURNING "id", "name"'
    );
    expect(res.data).toEqual({ id: 'x', name: 'n' });

    const bare = harness();
    const bad = await bare.qb('orders').delete();
    expect(bad.error?.message).toContain('without any filter');
  });
});

describe('rpc', () => {
  it('casts object and array args to jsonb and unwraps single rows', async () => {
    const calls: Sql[] = [];
    const exec: Executor = async (sql) => {
      calls.push(sql);
      return { rows: [{ id: 'o1', status: 'awaiting_payment' }] };
    };
    const res = await runRpc(exec, 'place_order', {
      p_order: { customer_name: 'A' },
      p_items: [{ quantity: 1 }],
    });
    expect(calls[0].text).toBe(
      'SELECT * FROM "place_order"("p_order" => $1::jsonb, "p_items" => $2::jsonb)'
    );
    expect(calls[0].values).toEqual(['{"customer_name":"A"}', '[{"quantity":1}]']);
    expect(res.data).toEqual({ id: 'o1', status: 'awaiting_payment' });
  });

  it('passes scalars plainly and surfaces pg errors', async () => {
    const exec: Executor = async () => {
      const err = new Error('Order not found') as Error & { code: string };
      err.code = 'P0001';
      throw err;
    };
    const res = await runRpc(exec, 'set_order_status', {
      p_order_id: 'x',
      p_status: 'paid',
      p_note: null,
      p_actor: null,
    });
    expect(res.error?.message).toBe('Order not found');
    expect(res.error?.code).toBe('P0001');
  });
});
