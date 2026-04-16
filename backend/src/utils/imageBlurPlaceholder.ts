import sharp from 'sharp';

const BLUR_MAX_WIDTH = 32;

/**
 * Tiny JPEG as data URL for LQIP / blur-up (keeps payload small).
 */
export async function generateBlurDataUrl(filePath: string): Promise<string> {
  const buf = await sharp(filePath)
    .rotate()
    .resize({ width: BLUR_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 28, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}
