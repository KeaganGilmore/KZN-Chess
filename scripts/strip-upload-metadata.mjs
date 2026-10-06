// Removes metadata (EXIF GPS location, camera/device details, XMP, IPTC) from
// photos uploaded before the upload route started stripping it on the way in
// (src/lib/image-metadata.ts — keep the encode settings below in step).
// Rewrites JPEG/PNG/WebP files that still carry metadata, in place; GIFs and
// already-clean files are left alone, so it is safe to re-run.
//
// Usage (on the app service, where the uploads volume is mounted):
//   UPLOAD_DIR=/data/uploads node scripts/strip-upload-metadata.mjs [--dry-run]

import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.env.UPLOAD_DIR;
const dryRun = process.argv.includes('--dry-run');
if (!root) {
  console.error('Usage: UPLOAD_DIR=/data/uploads node scripts/strip-upload-metadata.mjs [--dry-run]');
  process.exit(1);
}

const FORMATS = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp' };

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let cleaned = 0;
let skipped = 0;
let failed = 0;

for await (const file of walk(root)) {
  const format = FORMATS[path.extname(file).toLowerCase()];
  if (!format) continue;
  try {
    const input = await readFile(file);
    const meta = await sharp(input).metadata();
    if (!meta.exif && !meta.xmp && !meta.iptc) {
      skipped++;
      continue;
    }
    if (dryRun) {
      console.log(`would clean ${file}`);
      cleaned++;
      continue;
    }
    let image = sharp(input).rotate();
    if (format === 'jpeg') image = image.jpeg({ quality: 90 });
    if (format === 'webp') image = image.webp({ quality: 90 });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, await image.toBuffer());
    await rename(tmp, file);
    console.log(`cleaned ${file}`);
    cleaned++;
  } catch (err) {
    console.error(`failed ${file}: ${err.message}`);
    failed++;
  }
}

console.log(`${dryRun ? 'Would clean' : 'Cleaned'} ${cleaned}, already clean ${skipped}, failed ${failed}.`);
process.exit(failed ? 1 : 0);
