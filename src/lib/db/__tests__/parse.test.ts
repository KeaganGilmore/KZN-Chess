import { describe, it, expect } from 'vitest';
import { parseSelect, parseOr, parseInList } from '@/lib/db/parse';

describe('parseSelect', () => {
  it('parses star and plain columns', () => {
    expect(parseSelect('*')).toEqual([{ kind: 'column', name: '*' }]);
    expect(parseSelect('id, fen, moves')).toEqual([
      { kind: 'column', name: 'id' },
      { kind: 'column', name: 'fen' },
      { kind: 'column', name: 'moves' },
    ]);
    expect(parseSelect('')).toEqual([{ kind: 'column', name: '*' }]);
  });

  it('parses aliased embeds with stars and column lists', () => {
    expect(parseSelect('*, district:districts(*)')).toEqual([
      { kind: 'column', name: '*' },
      {
        kind: 'embed',
        alias: 'district',
        table: 'districts',
        fkHint: null,
        parts: [{ kind: 'column', name: '*' }],
        isCount: false,
      },
    ]);
    expect(parseSelect('sort_order, puzzle:puzzles(id, fen)')).toEqual([
      { kind: 'column', name: 'sort_order' },
      {
        kind: 'embed',
        alias: 'puzzle',
        table: 'puzzles',
        fkHint: null,
        parts: [
          { kind: 'column', name: 'id' },
          { kind: 'column', name: 'fen' },
        ],
        isCount: false,
      },
    ]);
  });

  it('parses unaliased embeds, count aggregates and FK hints', () => {
    expect(parseSelect('districts(name)')).toEqual([
      {
        kind: 'embed',
        alias: 'districts',
        table: 'districts',
        fkHint: null,
        parts: [{ kind: 'column', name: 'name' }],
        isCount: false,
      },
    ]);
    expect(parseSelect('id, puzzle_count:session_set_puzzles(count)')).toEqual([
      { kind: 'column', name: 'id' },
      {
        kind: 'embed',
        alias: 'puzzle_count',
        table: 'session_set_puzzles',
        fkHint: null,
        parts: [{ kind: 'column', name: 'count' }],
        isCount: true,
      },
    ]);
    const [hinted] = parseSelect('white_player:tournament_players!pairings_white_fkey(*)');
    expect(hinted).toMatchObject({
      kind: 'embed',
      alias: 'white_player',
      table: 'tournament_players',
      fkHint: 'pairings_white_fkey',
    });
  });

  it('parses two-level nested embeds', () => {
    const [embed] = parseSelect('tournament:tournaments(id, district:districts(name))');
    expect(embed).toMatchObject({ kind: 'embed', alias: 'tournament', table: 'tournaments' });
    const inner = (embed as { parts: unknown[] }).parts;
    expect(inner).toEqual([
      { kind: 'column', name: 'id' },
      {
        kind: 'embed',
        alias: 'district',
        table: 'districts',
        fkHint: null,
        parts: [{ kind: 'column', name: 'name' }],
        isCount: false,
      },
    ]);
  });

  it('parses multiple embeds in one select', () => {
    const parts = parseSelect(
      '*, category:store_categories(*), variants:product_variants(*), images:product_images(*)'
    );
    expect(parts).toHaveLength(4);
    expect(parts.filter((p) => p.kind === 'embed')).toHaveLength(3);
  });

  it('rejects junk', () => {
    expect(() => parseSelect('robert"; drop table users')).toThrow();
    expect(() => parseSelect('a:b(c; drop)')).toThrow();
  });
});

describe('parseOr', () => {
  it('parses is.null with timestamp gt (dots in value)', () => {
    expect(parseOr('end_date.is.null,end_date.gt.2026-08-03T10:00:00.000Z')).toEqual([
      { column: 'end_date', op: 'is', value: 'null' },
      { column: 'end_date', op: 'gt', value: '2026-08-03T10:00:00.000Z' },
    ]);
  });
  it('parses multi-column ilike search', () => {
    expect(parseOr('name.ilike.%kzn%,description.ilike.%kzn%')).toEqual([
      { column: 'name', op: 'ilike', value: '%kzn%' },
      { column: 'description', op: 'ilike', value: '%kzn%' },
    ]);
  });
  it('rejects unknown operators', () => {
    expect(() => parseOr('name.regex.x')).toThrow();
    expect(() => parseOr('name.is.notnull')).toThrow();
  });
});

describe('parseInList', () => {
  it('parses plain and quoted lists', () => {
    expect(parseInList('(completed,cancelled)')).toEqual(['completed', 'cancelled']);
    expect(parseInList('("a b",c)')).toEqual(['a b', 'c']);
  });
  it('rejects non-parenthesised input', () => {
    expect(() => parseInList('completed,cancelled')).toThrow();
  });
});
