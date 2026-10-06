import sharp from 'sharp';

/**
 * Re-encode an uploaded photo without its metadata: EXIF GPS location,
 * camera and device details (sharp drops metadata unless asked to keep it).
 * Any EXIF rotation is applied first so the photo still displays upright.
 *
 * GIFs pass through untouched: the format has no EXIF block, and
 * re-encoding would risk breaking animation.
 *
 * Throws if the bytes are not a decodable image.
 */
export async function stripImageMetadata(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (mimeType === 'image/gif') return buffer;
  const image = sharp(buffer).rotate();
  if (mimeType === 'image/jpeg') image.jpeg({ quality: 90 });
  if (mimeType === 'image/webp') image.webp({ quality: 90 });
  return image.toBuffer();
}
