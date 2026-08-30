/**
 * Pure parsers for the PostgREST-style strings supabase-js call sites use.
 * The direct-SQL client (src/lib/db) supports exactly the surface this
 * codebase uses — anything unrecognised throws loudly rather than guessing.
 */

export interface SelectColumn {
  kind: 'column';
  name: string; // '*' for all
}

export interface SelectEmbed {
  kind: 'embed';
  alias: string;
  table: string;
  /** explicit FK-constraint disambiguation: alias:table!fk_name(cols) */
  fkHint: string | null;
  /** recursive: embeds may nest one or more levels (tournament(..., district:districts(name))) */
  parts: SelectPart[];
  isCount: boolean;
}

export type SelectPart = SelectColumn | SelectEmbed;

/** Split on commas that are not inside parentheses. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim() !== '' || parts.length === 0) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Parse a supabase-js select string, e.g.
 *   '*'
 *   'id, fen, moves'
 *   '*, district:districts(*), organizer:users(id, name, email)'
 *   '*, tournament:tournaments(id, name, district:districts(name))'   (nested)
 *   '*, white_player:tournament_players!pairings_white_fkey(*)'       (FK hint)
 *   'id, puzzle_count:session_set_puzzles(count)'                     (count aggregate)
 */
export function parseSelect(input: string): SelectPart[] {
  const parts = splitTopLevel(input.trim() === '' ? '*' : input);
  return parts.map((part): SelectPart => {
    const embed =
      /^(?:([a-zA-Z_][a-zA-Z0-9_]*):)?([a-zA-Z_][a-zA-Z0-9_]*)(?:!([a-zA-Z_][a-zA-Z0-9_]*))?\(([^]*)\)$/.exec(
        part
      );
    if (embed) {
      const [, alias, table, fkHint, inner] = embed;
      const innerParts = parseSelect(inner);
      const isCount =
        innerParts.length === 1 &&
        innerParts[0].kind === 'column' &&
        innerParts[0].name === 'count';
      return {
        kind: 'embed',
        alias: alias || table,
        table,
        fkHint: fkHint || null,
        parts: innerParts,
        isCount,
      };
    }
    if (part === '*' || part === 'count' || IDENT.test(part)) {
      return { kind: 'column', name: part };
    }
    throw new Error(`Unsupported select part: "${part}"`);
  });
}

export interface OrCondition {
  column: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is';
  value: string; // raw string; 'null' for is
}

const OR_OPS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is']);

/**
 * Parse a supabase-js .or() string, e.g.
 *   'end_date.is.null,end_date.gt.2026-08-03T10:00:00.000Z'
 *   'name.ilike.%board%,description.ilike.%board%'
 * Values may contain dots (timestamps), so only the first two dots delimit.
 */
export function parseOr(input: string): OrCondition[] {
  return splitTopLevel(input).map((clause) => {
    const first = clause.indexOf('.');
    const second = clause.indexOf('.', first + 1);
    if (first <= 0 || second <= first + 1) {
      throw new Error(`Unsupported or() clause: "${clause}"`);
    }
    const column = clause.slice(0, first);
    const op = clause.slice(first + 1, second);
    const value = clause.slice(second + 1);
    if (!IDENT.test(column) || !OR_OPS.has(op)) {
      throw new Error(`Unsupported or() clause: "${clause}"`);
    }
    if (op === 'is' && value !== 'null') {
      throw new Error(`Only is.null is supported in or(): "${clause}"`);
    }
    return { column, op: op as OrCondition['op'], value };
  });
}

/** Parse a .not('col', 'in', '(a,b)') / .in() style list literal. */
export function parseInList(input: string): string[] {
  const m = /^\(([^]*)\)$/.exec(input.trim());
  if (!m) throw new Error(`Unsupported in-list literal: "${input}"`);
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .map((s) => (/^".*"$/.exec(s) ? s.slice(1, -1) : s))
    .filter((s) => s.length > 0);
}
