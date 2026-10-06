import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { stripImageMetadata } from '@/lib/image-metadata';

async function photoWithExif(format: 'jpeg' | 'png' | 'webp') {
  return sharp({ create: { width: 4, height: 2, channels: 3, background: '#c08a3e' } })
    .withMetadata({ exif: { IFD0: { Copyright: 'test-device', Make: 'TestCam' } } })
    .toFormat(format)
    .toBuffer();
}

describe('stripImageMetadata', () => {
  it.each(['jpeg', 'png', 'webp'] as const)('removes EXIF from %s and keeps the image', async (format) => {
    const input = await photoWithExif(format);
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const out = await stripImageMetadata(input, `image/${format}`);
    const meta = await sharp(out).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe(format);
    expect([meta.width, meta.height]).toEqual([4, 2]);
  });

  it('passes GIFs through unchanged', async () => {
    const gif = Buffer.from('GIF89a-not-really');
    expect(await stripImageMetadata(gif, 'image/gif')).toBe(gif);
  });

  it('rejects bytes that are not an image', async () => {
    await expect(stripImageMetadata(Buffer.from('not an image'), 'image/jpeg')).rejects.toThrow();
  });
});
