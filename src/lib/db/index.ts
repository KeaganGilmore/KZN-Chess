import { getPool } from './pool';
import { getDbShape } from './introspect';
import { QueryBuilder, runRpc, type Executor } from './builder';

/**
 * Direct-to-Postgres client with the supabase-js call shape this codebase
 * uses (`from(...)` chains and `rpc(...)`). See src/lib/db/builder.ts.
 */
export function createDirectClient() {
  const exec: Executor = async (sql) => {
    const res = await getPool().query(sql.text, sql.values as unknown[]);
    return { rows: res.rows };
  };
  return {
    from(table: string) {
      return new QueryBuilder(table, exec, getDbShape);
    },
    rpc(fn: string, args?: Record<string, unknown>) {
      return runRpc(exec, fn, args);
    },
    storage: {
      from(): never {
        throw new Error('Storage is not available in direct DB mode — set UPLOAD_DIR');
      },
    },
  };
}
