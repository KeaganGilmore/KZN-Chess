import { getPool } from './pool';

export interface ForeignKey {
  name: string; // constraint name, used by !fk_name embed hints
  table: string;
  column: string;
  refTable: string;
  refColumn: string;
}

export interface DbShape {
  foreignKeys: ForeignKey[];
  primaryKeys: Map<string, string[]>; // table -> pk columns
  /** table -> column -> udt name ('jsonb', 'json', 'uuid', '_text' for text[], …) */
  columnTypes: Map<string, Map<string, string>>;
}

let shapePromise: Promise<DbShape> | null = null;

/**
 * Reads foreign keys and primary keys for the public schema once per process.
 * Embedded selects (alias:table(cols)) are resolved from these, exactly as
 * PostgREST resolves them from the same catalogs.
 */
export function getDbShape(): Promise<DbShape> {
  if (!shapePromise) {
    shapePromise = loadShape().catch((err) => {
      shapePromise = null; // allow retry after transient failures
      throw err;
    });
  }
  return shapePromise;
}

async function loadShape(): Promise<DbShape> {
  const pool = getPool();
  // att.attname is Postgres's internal `name` type, not `text`. Scalar `name`
  // values parse to plain JS strings fine, but pg's default type-parser
  // registry has no entry for `name[]` (array_agg(name) -> oid 1003), so an
  // aggregated result silently comes back as the raw "{a,b}" literal string
  // instead of a JS array — cast to text everywhere so array_agg produces a
  // properly-parsed `text[]` (oid 1009).
  const fkRes = await pool.query(`
    SELECT
      con.conname                        AS name,
      con.conrelid::regclass::text       AS table,
      att.attname::text                  AS column,
      con.confrelid::regclass::text      AS ref_table,
      refatt.attname::text               AS ref_column
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
    JOIN pg_attribute refatt
      ON refatt.attrelid = con.confrelid AND refatt.attnum = con.confkey[1]
    WHERE con.contype = 'f'
      AND con.connamespace = 'public'::regnamespace
      AND array_length(con.conkey, 1) = 1
  `);
  const pkRes = await pool.query(`
    SELECT con.conrelid::regclass::text AS table,
           array_agg(att.attname::text ORDER BY ord.n) AS columns
    FROM pg_constraint con
    CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS ord(attnum, n)
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ord.attnum
    WHERE con.contype = 'p' AND con.connamespace = 'public'::regnamespace
    GROUP BY con.conrelid
  `);

  const colRes = await pool.query(`
    SELECT table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  const columnTypes = new Map<string, Map<string, string>>();
  for (const r of colRes.rows) {
    let m = columnTypes.get(r.table_name);
    if (!m) {
      m = new Map();
      columnTypes.set(r.table_name, m);
    }
    m.set(r.column_name, r.udt_name);
  }

  const foreignKeys: ForeignKey[] = fkRes.rows.map((r) => ({
    name: r.name,
    table: r.table,
    column: r.column,
    refTable: r.ref_table,
    refColumn: r.ref_column,
  }));
  const primaryKeys = new Map<string, string[]>(
    pkRes.rows.map((r) => [r.table as string, r.columns as string[]])
  );
  return { foreignKeys, primaryKeys, columnTypes };
}

export type EmbedRelation =
  | { kind: 'many-to-one'; fkColumn: string; refColumn: string }
  | { kind: 'one-to-many'; fkColumn: string; refColumn: string };

/**
 * Resolve how `parent` relates to embedded `child` (the table named in the
 * select string). Disambiguation, in PostgREST's own order: an explicit
 * `!fk_constraint_name` hint wins; otherwise a single FK is unambiguous;
 * otherwise the embed alias must match the FK column prefix
 * (organizer:users → organizer_id).
 */
export function resolveEmbed(
  shape: DbShape,
  parent: string,
  child: string,
  alias: string,
  fkHint?: string | null
): EmbedRelation {
  if (fkHint) {
    const fk = shape.foreignKeys.find((f) => f.name === fkHint);
    if (!fk) throw new Error(`Unknown FK hint "!${fkHint}" for embed "${alias}"`);
    if (fk.table === parent && fk.refTable === child) {
      return { kind: 'many-to-one', fkColumn: fk.column, refColumn: fk.refColumn };
    }
    if (fk.table === child && fk.refTable === parent) {
      return { kind: 'one-to-many', fkColumn: fk.column, refColumn: fk.refColumn };
    }
    throw new Error(`FK hint "!${fkHint}" does not join ${parent} and ${child}`);
  }

  const pick = (fks: ForeignKey[]): ForeignKey => {
    if (fks.length === 1) return fks[0];
    const byAlias = fks.filter((f) => f.column === `${alias}_id` || f.column.startsWith(alias));
    if (byAlias.length === 1) return byAlias[0];
    throw new Error(
      `Ambiguous embed ${parent} -> ${child} (alias "${alias}"): ` +
        fks.map((f) => `${f.table}.${f.column}`).join(', ')
    );
  };

  const toChild = shape.foreignKeys.filter((f) => f.table === parent && f.refTable === child);
  if (toChild.length > 0) {
    const fk = pick(toChild);
    return { kind: 'many-to-one', fkColumn: fk.column, refColumn: fk.refColumn };
  }
  const fromChild = shape.foreignKeys.filter((f) => f.table === child && f.refTable === parent);
  if (fromChild.length > 0) {
    const fk = pick(fromChild);
    return { kind: 'one-to-many', fkColumn: fk.column, refColumn: fk.refColumn };
  }
  throw new Error(`No foreign key between ${parent} and ${child} for embed "${alias}"`);
}
