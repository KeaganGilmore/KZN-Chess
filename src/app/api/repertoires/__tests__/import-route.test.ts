import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * In-memory stand-in for the query builder calls the import route makes:
 * select…eq…maybeSingle, select…eq (list), insert (one or many),
 * insert…select…single, and update…eq.
 */
type Row = Record<string, any>;
const db: { repertoires: Row[]; repertoire_nodes: Row[] } = { repertoires: [], repertoire_nodes: [] };
const insertCalls: number[] = [];

function from(table: 'repertoires' | 'repertoire_nodes') {
  const filters: [string, unknown][] = [];
  let pending: Row[] | null = null;
  const rows = () => db[table].filter((r) => filters.every(([k, v]) => r[k] === v));
  const api: any = {
    select: () => api,
    eq: (k: string, v: unknown) => {
      filters.push([k, v]);
      return api;
    },
    maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
    single: async () => ({ data: pending ? pending[0] : rows()[0], error: null }),
    insert: (v: Row | Row[]) => {
      const list = (Array.isArray(v) ? v : [v]).map((r) => ({ id: r.id ?? crypto.randomUUID(), ...r }));
      insertCalls.push(list.length);
      for (const r of list) {
        if (r.parent_id && !db[table].some((x) => x.id === r.parent_id)) {
          return Promise.resolve({ data: null, error: { message: 'FK violation: parent inserted after child' } });
        }
        db[table].push(r);
      }
      pending = list;
      const p: any = Promise.resolve({ data: list, error: null });
      p.select = () => api;
      return p;
    },
    update: () => api,
    then: (res: (v: unknown) => void) => res({ data: rows(), error: null }),
  };
  return api;
}

vi.mock('@/lib/supabase/server', () => ({ createServerClient: () => ({ from }) }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => ({ id: 'u1' }) }));

import { POST } from '@/app/api/repertoires/[id]/import/route';
import { buildImportTree } from '@/lib/openings/pgn-import';

const call = async (pgn: string) => {
  const req = new NextRequest('http://x/api/repertoires/r1/import', {
    method: 'POST',
    body: JSON.stringify({ pgn }),
  });
  const res = await POST(req, { params: { id: 'r1' } });
  return { status: res.status, json: await res.json() };
};

describe('POST /api/repertoires/[id]/import', () => {
  beforeEach(() => {
    db.repertoires = [{ id: 'r1', user_id: 'u1' }];
    db.repertoire_nodes = [];
    insertCalls.length = 0;
  });

  it('imports every game and variation, parents before children', async () => {
    const { status, json } = await call('[Event "A"]\n\n1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *\n\n[Event "B"]\n\n1. d4 d5 *');
    expect(status).toBe(200);
    // e4, e5, c5, Nf3 (after c5), Nf3 (after e5), d4, d5
    expect(json).toMatchObject({ added: 7, reused: 0, games: 2, imported_games: 2 });
    expect(db.repertoire_nodes).toHaveLength(8); // + root
    const root = db.repertoire_nodes.find((n) => n.parent_id === null)!;
    expect(db.repertoire_nodes.filter((n) => n.parent_id === root.id).map((n) => n.move_san).sort()).toEqual(['d4', 'e4']);
  });

  it('reuses moves already in the repertoire', async () => {
    await call('1. e4 e5 2. Nf3 *');
    const { json } = await call('1. e4 e5 2. Nf3 Nc6 (2... d6) *');
    expect(json).toMatchObject({ added: 2, reused: 3 });
    const again = await call('1. e4 e5 2. Nf3 Nc6 *');
    expect(again.json).toMatchObject({ added: 0, reused: 4 });
  });

  it('inserts large imports in batches', async () => {
    // Every white first move x every black reply, plus a second move: >500 new moves.
    const firsts = ['a3', 'a4', 'b3', 'b4', 'c3', 'c4', 'd3', 'd4', 'e3', 'e4', 'f3', 'f4', 'g3', 'g4', 'h3', 'h4', 'Na3', 'Nc3', 'Nf3', 'Nh3'];
    const replies = firsts.map((m) => m.replace(/3$/, '6').replace(/4$/, '5'));
    const games = firsts.flatMap((f) => replies.map((r) => `1. ${f} ${r} 2. Nc3 (2. Ke3??) *`));
    const text = games.join('\n\n');
    const expected = buildImportTree(text).moveCount;
    expect(expected).toBeGreaterThan(500);
    const { json } = await call(text);
    expect(json.added).toBe(expected);
    expect(json.errors.length).toBeGreaterThan(0); // the illegal Ke3 lines
    expect(insertCalls.length).toBeGreaterThan(2); // root insert + several batches
    expect(Math.max(...insertCalls)).toBeLessThanOrEqual(500);
  });

  it('explains why nothing was imported', async () => {
    const { status, json } = await call('[FEN "8/8/8/4k3/8/8/4K3/4R3 w - - 0 1"]\n\n1. Re2 *');
    expect(status).toBe(400);
    expect(json.error).toMatch(/set-up position/);
    const empty = await call('hello there');
    expect(empty.status).toBe(400);
  });
});
