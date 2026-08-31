export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getDbMode } from '@/lib/db/mode';
import { envStr } from '@/lib/env';

/**
 * Deployment health check for the data layer. Deliberately public (auth
 * itself needs the database, so an admin gate would be useless while the
 * site is down) and deliberately minimal: it reports which mode the process
 * is in and whether a trivial query works — never URLs, credentials or
 * driver error text.
 */
export async function GET() {
  const mode = getDbMode();
  const configured = {
    DB_DIRECT: !!envStr('DB_DIRECT'),
    DATABASE_URL: !!envStr('DATABASE_URL'),
    UPLOAD_DIR: !!envStr('UPLOAD_DIR'),
  };
  try {
    const supabase = createServerClient();
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    if (error) {
      return NextResponse.json(
        { mode, configured, ok: false, reason: error.code || 'query_failed' },
        { status: 503 }
      );
    }
    return NextResponse.json({ mode, configured, ok: true, users: count ?? 0 });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    return NextResponse.json(
      { mode, configured, ok: false, reason: code || 'exception' },
      { status: 503 }
    );
  }
}
