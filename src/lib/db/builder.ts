/**
 * Direct-to-Postgres implementation of the supabase-js query-builder surface
 * this codebase uses. Call sites are unchanged; SQL runs over a pg pool on
 * the private network instead of an HTTP API.
 *
 * Deliberately strict: anything outside the audited surface throws at build
 * time of the query (visible in dev/tests), never guesses.
 */
import type { DbShape } from './introspect';
import { resolveEmbed } from './introspect';
import { parseInList, parseOr, parseSelect, type OrCondition, type SelectPart } from './parse';

export interface DbResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string; details?: string } | null;
  count?: number | null;
}

export interface Sql {
  text: string;
  values: unknown[];
}

export type Executor = (sql: Sql) => Promise<{ rows: Record<string, unknown>[] }>;

type CmpOp = '=' | '<>' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'ILIKE';

type Filter =
  | { type: 'cmp'; column: string; op: CmpOp; value: unknown }
  | { type: 'in'; column: string; values: unknown[]; negated: boolean }
  | { type: 'isnull'; column: string; negated: boolean }
  | { type: 'contains'; column: string; values: unknown[] }
  | { type: 'or'; conditions: OrCondition[] };

interface State {
  table: string;
  action: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  select: SelectPart[] | null; // for mutations: RETURNING when non-null
  countMode: 'exact' | null;
  head: boolean;
  filters: Filter[];
  orders: { column: string; ascending: boolean }[];
  limit: number | null;
  offset: number | null;
  rows: Record<string, unknown>[] | null;
  updates: Record<string, unknown> | null;
  onConflict: string[] | null;
  ignoreDuplicates: boolean;
  single: 'single' | 'maybe' | null;
}

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const q = (ident: string): string => {
  if (!IDENT.test(ident)) throw new Error(`Invalid identifier: "${ident}"`);
  return `"${ident}"`;
};

const OR_OP_SQL: Record<OrCondition['op'], CmpOp | 'IS'> = {
  eq: '=',
  neq: '<>',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  ilike: 'ILIKE',
  is: 'IS',
};

export class QueryBuilder<T = unknown> implements PromiseLike<DbResult<T>> {
  private state: State;

  constructor(
    table: string,
    private exec: Executor,
    private shape: () => Promise<DbShape>
  ) {
    this.state = {
      table,
      action: 'select',
      select: null,
      countMode: null,
      head: false,
      filters: [],
      orders: [],
      limit: null,
      offset: null,
      rows: null,
      updates: null,
      onConflict: null,
      ignoreDuplicates: false,
      single: null,
    };
  }

  select(columns = '*', opts?: { count?: 'exact'; head?: boolean }): this {
    this.state.select = parseSelect(columns);
    if (opts?.count) this.state.countMode = opts.count;
    if (opts?.head) this.state.head = true;
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.state.action = 'insert';
    this.state.rows = Array.isArray(values) ? values : [values];
    this.state.select = null;
    return this;
  }

  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    opts?: { onConflict?: string; ignoreDuplicates?: boolean }
  ): this {
    this.state.action = 'upsert';
    this.state.rows = Array.isArray(values) ? values : [values];
    this.state.onConflict = opts?.onConflict ? opts.onConflict.split(',').map((s) => s.trim()) : null;
    this.state.ignoreDuplicates = opts?.ignoreDuplicates === true;
    this.state.select = null;
    return this;
  }

  update(values: Record<string, unknown>): this {
    this.state.action = 'update';
    this.state.updates = values;
    this.state.select = null;
    return this;
  }

  delete(): this {
    this.state.action = 'delete';
    this.state.select = null;
    return this;
  }

  eq(c: string, v: unknown): this { return this.cmp(c, '=', v); }
  neq(c: string, v: unknown): this { return this.cmp(c, '<>', v); }
  gt(c: string, v: unknown): this { return this.cmp(c, '>', v); }
  gte(c: string, v: unknown): this { return this.cmp(c, '>=', v); }
  lt(c: string, v: unknown): this { return this.cmp(c, '<', v); }
  lte(c: string, v: unknown): this { return this.cmp(c, '<=', v); }
  like(c: string, v: string): this { return this.cmp(c, 'LIKE', v); }
  ilike(c: string, v: string): this { return this.cmp(c, 'ILIKE', v); }

  private cmp(column: string, op: CmpOp, value: unknown): this {
    this.state.filters.push({ type: 'cmp', column, op, value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.state.filters.push({ type: 'in', column, values, negated: false });
    return this;
  }

  is(column: string, value: null): this {
    if (value !== null) throw new Error('.is() only supports null');
    this.state.filters.push({ type: 'isnull', column, negated: false });
    return this;
  }

  contains(column: string, values: unknown[]): this {
    this.state.filters.push({ type: 'contains', column, values });
    return this;
  }

  not(column: string, op: string, value: unknown): this {
    if (op === 'in') {
      this.state.filters.push({
        type: 'in',
        column,
        values: parseInList(String(value)),
        negated: true,
      });
      return this;
    }
    if (op === 'is' && value === null) {
      this.state.filters.push({ type: 'isnull', column, negated: true });
      return this;
    }
    throw new Error(`.not('${column}', '${op}', …) is not supported`);
  }

  or(conditions: string): this {
    this.state.filters.push({ type: 'or', conditions: parseOr(conditions) });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this.state.orders.push({ column, ascending: opts?.ascending !== false });
    return this;
  }

  limit(n: number): this {
    this.state.limit = n;
    return this;
  }

  range(from: number, to: number): this {
    this.state.offset = from;
    this.state.limit = to - from + 1;
    return this;
  }

  single(): this {
    this.state.single = 'single';
    return this;
  }

  maybeSingle(): this {
    this.state.single = 'maybe';
    return this;
  }

  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((value: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<DbResult<T>> {
    try {
      const s = this.state;
      const needsShape =
        s.select?.some((p) => p.kind === 'embed') ||
        (s.action === 'upsert' && !s.onConflict) ||
        s.action === 'insert' ||
        s.action === 'update' ||
        s.action === 'upsert';
      const shape = needsShape ? await this.shape() : null;

      if (s.action === 'select' && s.countMode && s.head) {
        const { rows } = await this.exec(this.buildCount());
        return { data: null, error: null, count: Number(rows[0]?.count ?? 0) };
      }

      let count: number | null = null;
      if (s.action === 'select' && s.countMode && !s.head) {
        const { rows } = await this.exec(this.buildCount());
        count = Number(rows[0]?.count ?? 0);
      }

      let sql: Sql;
      if (s.action === 'select') {
        sql = this.buildSelect(shape);
      } else {
        sql =
          s.action === 'insert' || s.action === 'upsert'
            ? this.buildInsert(shape!)
            : s.action === 'update'
              ? this.buildUpdate(shape!)
              : this.buildDelete();
        // Mutations that return embeds run through a CTE so the embed
        // subqueries can reference the affected rows.
        if (s.select?.some((p) => p.kind === 'embed')) {
          const ctr = { n: 0 };
          const cols = this.selectColumns(shape!, s.select, s.table, 't', ctr);
          sql = { text: `WITH t AS (${sql.text} RETURNING *) SELECT ${cols} FROM t`, values: sql.values };
        } else if (s.select) {
          sql = { text: `${sql.text}${this.returning(s.select)}`, values: sql.values };
        }
      }

      const { rows } = await this.exec(sql);
      return this.shapeResult(rows, count);
    } catch (err) {
      const e = err as { message?: string; code?: string; detail?: string };
      return {
        data: null,
        error: { message: e.message || String(err), code: e.code, details: e.detail },
      };
    }
  }

  private shapeResult(rows: Record<string, unknown>[], count: number | null): DbResult<T> {
    const s = this.state;
    const wantsRows = s.action === 'select' || s.select !== null;
    if (!wantsRows) return { data: null, error: null, count };
    if (s.single === 'single') {
      if (rows.length !== 1) {
        return {
          data: null,
          error: {
            message: `JSON object requested, ${rows.length === 0 ? 'no' : 'multiple'} rows returned`,
            code: 'PGRST116',
          },
          count,
        };
      }
      return { data: rows[0] as T, error: null, count };
    }
    if (s.single === 'maybe') {
      if (rows.length > 1) {
        return {
          data: null,
          error: { message: 'JSON object requested, multiple rows returned', code: 'PGRST116' },
          count,
        };
      }
      return { data: (rows[0] ?? null) as T, error: null, count };
    }
    return { data: rows as T, error: null, count };
  }

  // ---------- SQL building ----------

  private bind(values: unknown[], value: unknown): string {
    values.push(value);
    return `$${values.length}`;
  }

  /** JSON-stringify values headed for json/jsonb columns so pg doesn't treat arrays as Postgres arrays. */
  private bindTyped(values: unknown[], table: string, column: string, value: unknown, shape: DbShape): string {
    const udt = shape.columnTypes.get(table)?.get(column);
    if ((udt === 'jsonb' || udt === 'json') && value !== null && typeof value === 'object') {
      values.push(JSON.stringify(value));
      return `$${values.length}::${udt}`;
    }
    values.push(value);
    return `$${values.length}`;
  }

  private whereClause(values: unknown[]): string {
    const parts = this.state.filters.map((f) => {
      switch (f.type) {
        case 'cmp':
          return `t.${q(f.column)} ${f.op} ${this.bind(values, f.value)}`;
        case 'in':
          return f.negated
            ? `t.${q(f.column)} <> ALL(${this.bind(values, f.values)})`
            : `t.${q(f.column)} = ANY(${this.bind(values, f.values)})`;
        case 'isnull':
          return `t.${q(f.column)} IS ${f.negated ? 'NOT ' : ''}NULL`;
        case 'contains':
          return `t.${q(f.column)} @> ${this.bind(values, f.values)}`;
        case 'or': {
          const inner = f.conditions.map((c) =>
            c.op === 'is'
              ? `t.${q(c.column)} IS NULL`
              : `t.${q(c.column)} ${OR_OP_SQL[c.op]} ${this.bind(values, c.value)}`
          );
          return `(${inner.join(' OR ')})`;
        }
      }
    });
    return parts.length ? ` WHERE ${parts.join(' AND ')}` : '';
  }

  private tailClause(): string {
    const s = this.state;
    let sql = '';
    if (s.orders.length) {
      sql += ` ORDER BY ${s.orders
        .map((o) => `t.${q(o.column)} ${o.ascending ? 'ASC' : 'DESC'}`)
        .join(', ')}`;
    }
    if (s.limit != null) sql += ` LIMIT ${Math.max(0, Math.floor(s.limit))}`;
    if (s.offset != null) sql += ` OFFSET ${Math.max(0, Math.floor(s.offset))}`;
    return sql;
  }

  /** Column list for a SELECT over `table` aliased as `sqlAlias`, embeds included (recursive). */
  private selectColumns(
    shape: DbShape | null,
    parts: SelectPart[],
    table: string,
    sqlAlias: string,
    ctr: { n: number }
  ): string {
    return parts
      .map((p) => {
        if (p.kind === 'column') {
          return p.name === '*' ? `${sqlAlias}.*` : `${sqlAlias}.${q(p.name)}`;
        }
        if (!shape) throw new Error('internal: shape required for embeds');
        return this.embedSql(shape, p, table, sqlAlias, ctr);
      })
      .join(', ');
  }

  private embedSql(
    shape: DbShape,
    part: Extract<SelectPart, { kind: 'embed' }>,
    parentTable: string,
    parentAlias: string,
    ctr: { n: number }
  ): string {
    const rel = resolveEmbed(shape, parentTable, part.table, part.alias, part.fkHint);
    const a = `e${ctr.n++}`;
    const link =
      rel.kind === 'many-to-one'
        ? `${a}.${q(rel.refColumn)} = ${parentAlias}.${q(rel.fkColumn)}`
        : `${a}.${q(rel.fkColumn)} = ${parentAlias}.${q(rel.refColumn)}`;
    if (part.isCount) {
      return `(SELECT jsonb_build_array(jsonb_build_object('count', COUNT(*))) FROM ${q(part.table)} ${a} WHERE ${link}) AS ${q(part.alias)}`;
    }
    const cols = this.selectColumns(shape, part.parts, part.table, a, ctr);
    if (rel.kind === 'many-to-one') {
      return `(SELECT to_jsonb(sub) FROM (SELECT ${cols} FROM ${q(part.table)} ${a} WHERE ${link} LIMIT 1) sub) AS ${q(part.alias)}`;
    }
    return `(SELECT COALESCE(jsonb_agg(to_jsonb(sub)), '[]'::jsonb) FROM (SELECT ${cols} FROM ${q(part.table)} ${a} WHERE ${link}) sub) AS ${q(part.alias)}`;
  }

  buildSelect(shape: DbShape | null): Sql {
    const s = this.state;
    const parts = s.select ?? parseSelect('*');
    const ctr = { n: 0 };
    const cols = this.selectColumns(shape, parts, s.table, 't', ctr);
    const values: unknown[] = [];
    const where = this.whereClause(values);
    return {
      text: `SELECT ${cols} FROM ${q(s.table)} t${where}${this.tailClause()}`,
      values,
    };
  }

  buildCount(): Sql {
    const values: unknown[] = [];
    const where = this.whereClause(values);
    return { text: `SELECT COUNT(*)::bigint AS count FROM ${q(this.state.table)} t${where}`, values };
  }

  private returning(parts: SelectPart[]): string {
    const cols = parts.map((p) => {
      if (p.kind !== 'column') throw new Error('internal: embed RETURNING goes through the CTE path');
      return p.name === '*' ? '*' : q(p.name);
    });
    return ` RETURNING ${cols.join(', ')}`;
  }

  buildInsert(shape: DbShape): Sql {
    const s = this.state;
    const rows = s.rows!;
    if (rows.length === 0) throw new Error('insert() with no rows');
    const columns = Object.keys(rows[0]).filter((k) => rows[0][k] !== undefined);
    const values: unknown[] = [];
    const tuples = rows
      .map(
        (row) =>
          `(${columns.map((c) => this.bindTyped(values, s.table, c, row[c] ?? null, shape)).join(', ')})`
      )
      .join(', ');
    let text = `INSERT INTO ${q(s.table)} (${columns.map(q).join(', ')}) VALUES ${tuples}`;
    if (s.action === 'upsert') {
      const target = s.onConflict ?? shape.primaryKeys.get(s.table);
      if (!target || target.length === 0) {
        throw new Error(`upsert(): no conflict target known for ${s.table}`);
      }
      const updatable = columns.filter((c) => !target.includes(c));
      text += ` ON CONFLICT (${target.map(q).join(', ')})`;
      text +=
        !s.ignoreDuplicates && updatable.length
          ? ` DO UPDATE SET ${updatable.map((c) => `${q(c)} = EXCLUDED.${q(c)}`).join(', ')}`
          : ' DO NOTHING';
    }
    return { text, values };
  }

  buildUpdate(shape: DbShape): Sql {
    const s = this.state;
    const updates = Object.entries(s.updates!).filter(([, v]) => v !== undefined);
    if (updates.length === 0) throw new Error('update() with no values');
    const values: unknown[] = [];
    const set = updates
      .map(([c, v]) => `${q(c)} = ${this.bindTyped(values, s.table, c, v, shape)}`)
      .join(', ');
    // Re-use whereClause with a "t" alias for consistency.
    const where = this.whereClause(values);
    return { text: `UPDATE ${q(s.table)} t SET ${set}${where}`, values };
  }

  buildDelete(): Sql {
    const values: unknown[] = [];
    const where = this.whereClause(values);
    if (!where) throw new Error('delete() without any filter is not allowed');
    return { text: `DELETE FROM ${q(this.state.table)} t${where}`, values };
  }
}

/** rpc('fn', { p_a: … }) → SELECT * FROM fn(p_a => $1, …) */
export async function runRpc(
  exec: Executor,
  fn: string,
  args: Record<string, unknown> = {}
): Promise<DbResult<unknown>> {
  try {
    if (!IDENT.test(fn)) throw new Error(`Invalid function name: "${fn}"`);
    const values: unknown[] = [];
    const params = Object.entries(args).map(([k, v]) => {
      if (!IDENT.test(k)) throw new Error(`Invalid rpc argument name: "${k}"`);
      if (v !== null && typeof v === 'object') {
        values.push(JSON.stringify(v));
        return `${q(k)} => $${values.length}::jsonb`;
      }
      values.push(v);
      return `${q(k)} => $${values.length}`;
    });
    const { rows } = await exec({ text: `SELECT * FROM ${q(fn)}(${params.join(', ')})`, values });
    return { data: rows.length === 1 ? rows[0] : rows, error: null };
  } catch (err) {
    const e = err as { message?: string; code?: string; detail?: string };
    return {
      data: null,
      error: { message: e.message || String(err), code: e.code, details: e.detail },
    };
  }
}
