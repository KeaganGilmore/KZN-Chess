export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { readdir, stat, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createServerClient } from '@/lib/supabase/server';
import { getDbMode } from '@/lib/db/mode';
import { getUploadDir } from '@/lib/uploads';
import { envStr } from '@/lib/env';

/**
 * Deployment health check. Deliberately public (auth itself needs the
 * database, so an admin gate would be useless while the site is down) and
 * deliberately minimal: modes, counts and writability — never URLs,
 * credentials or driver error text.
 */
async function uploadsHealth() {
  const dir = getUploadDir();
  if (!dir) return { configured: false as const };

  const out: Record<string, unknown> = { configured: true, dir };
  try {
    const s = await stat(dir);
    out.exists = s.isDirectory();
  } catch {
    out.exists = false;
  }

  // Count what is actually on disk, so a wiped ephemeral filesystem is obvious.
  try {
    let files = 0;
    for (const folder of await readdir(dir, { withFileTypes: true })) {
      if (!folder.isDirectory()) continue;
      files += (await readdir(path.join(dir, folder.name))).length;
    }
    out.files = files;
  } catch {
    out.files = 0;
  }

  try {
    const probe = path.join(dir, `.health-${Date.now()}`);
    await writeFile(probe, 'ok');
    await unlink(probe);
    out.writable = true;
  } catch {
    out.writable = false;
  }
  return out;
}

export async function GET() {
  const mode = getDbMode();
  const configured = {
    DB_DIRECT: !!envStr('DB_DIRECT'),
    DATABASE_URL: !!envStr('DATABASE_URL'),
    NEXTAUTH_SECRET: !!envStr('NEXTAUTH_SECRET'),
    UPLOAD_DIR: !!envStr('UPLOAD_DIR'),
  };
  const uploads = await uploadsHealth();

  try {
    const supabase = createServerClient();
    const { count, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    if (error) {
      return NextResponse.json(
        { mode, configured, uploads, ok: false, reason: error.code || 'query_failed' },
        { status: 503 }
      );
    }
    return NextResponse.json({ mode, configured, uploads, ok: true, users: count ?? 0 });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    return NextResponse.json(
      { mode, configured, uploads, ok: false, reason: code || 'exception' },
      { status: 503 }
    );
  }
}
