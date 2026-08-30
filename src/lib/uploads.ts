/**
 * Where uploaded images live.
 *
 * - `UPLOAD_DIR` set (production on Railway: a mounted volume such as
 *   /data/uploads) → files are written to disk and served by /api/media.
 * - unset → the upload route falls back to Supabase Storage (legacy).
 */
export function getUploadDir(): string | null {
  const dir = process.env.UPLOAD_DIR?.trim();
  return dir ? dir : null;
}
