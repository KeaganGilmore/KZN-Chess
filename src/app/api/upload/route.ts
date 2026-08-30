import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { getUploadDir } from '@/lib/uploads';

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 400 });
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 });
  }

  // Extension from the validated MIME type, never from the client filename.
  const ext = EXT_BY_TYPE[file.type];
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const FOLDERS = new Set(['tournament-media', 'store']);
  const requested = formData.get('folder');
  const folder =
    typeof requested === 'string' && FOLDERS.has(requested) ? requested : 'tournament-media';
  // Product images are admin-only.
  if (folder === 'store' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const filePath = `${folder}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Local disk (a Railway volume in production), served by /api/media.
  const uploadDir = getUploadDir();
  if (uploadDir) {
    try {
      await mkdir(path.join(uploadDir, folder), { recursive: true });
      await writeFile(path.join(uploadDir, folder, fileName), buffer, { flag: 'wx' });
    } catch (err) {
      console.error('Upload write failed:', err);
      return NextResponse.json({ error: 'Could not save the file' }, { status: 500 });
    }
    return NextResponse.json({ url: `/api/media/${filePath}` });
  }

  // Legacy: Supabase Storage.
  const supabase = createServerClient();
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('media')
    .getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrl });
}
