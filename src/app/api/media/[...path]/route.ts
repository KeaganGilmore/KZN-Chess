export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { getUploadDir } from '@/lib/uploads';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * Serves files uploaded to the local upload directory (a Railway volume in
 * production). Filenames are unique and never rewritten, so responses are
 * cached as immutable.
 */
export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const dir = getUploadDir();
  if (!dir) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rel = params.path.join('/');
  const abs = path.resolve(dir, rel);
  // Never serve anything outside the upload directory.
  if (!abs.startsWith(path.resolve(dir) + path.sep)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const type = CONTENT_TYPES[path.extname(abs).toLowerCase()];
  if (!type) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let size: number;
  try {
    const s = await stat(abs);
    if (!s.isFile()) throw new Error('not a file');
    size = s.size;
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      'Content-Type': type,
      'Content-Length': String(size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
