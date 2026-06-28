import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const STATIC_ROOT = path.join(REPO_ROOT, 'backend/assets/static');
const OG_IMAGE = path.join(REPO_ROOT, 'frontend/public/assets/social/og-image-1200x630.png');

const PLACEHOLDER_SPECS: Array<{ file: string; label: string; color: string }> = [
  { file: 'placeholders/default.png', label: 'AutoTek', color: '#0d9488' },
  { file: 'placeholders/engine.png', label: 'Engine Parts', color: '#0f766e' },
  { file: 'placeholders/brakes.png', label: 'Brake Parts', color: '#115e59' },
  { file: 'placeholders/electrical.png', label: 'Electrical', color: '#14b8a6' },
  { file: 'placeholders/filters.png', label: 'Filters', color: '#2dd4bf' },
];

async function writePlaceholderSvg(
  outPath: string,
  label: string,
  color: string,
  width: number,
  height: number
): Promise<void> {
  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#134e4a;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="50%" y="50%" font-family="Arial,sans-serif" font-size="48" font-weight="700"
    fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

async function writeMarketingFromOg(outPath: string, width: number, height: number): Promise<void> {
  if (fs.existsSync(OG_IMAGE)) {
    await sharp(OG_IMAGE).resize(width, height, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(outPath);
    return;
  }
  await writePlaceholderSvg(outPath.replace('.jpg', '.png'), 'AutoTek', '#0d9488', width, height);
}

export async function ensureStaticAssetFiles(): Promise<void> {
  fs.mkdirSync(path.join(STATIC_ROOT, 'placeholders'), { recursive: true });
  fs.mkdirSync(path.join(STATIC_ROOT, 'marketing'), { recursive: true });

  for (const spec of PLACEHOLDER_SPECS) {
    const outPath = path.join(STATIC_ROOT, spec.file);
    if (!fs.existsSync(outPath)) {
      await writePlaceholderSvg(outPath, spec.label, spec.color, 800, 800);
      console.log(`Generated ${spec.file}`);
    }
  }

  const marketingSpecs: Array<{ file: string; w: number; h: number }> = [
    { file: 'marketing/hero-home.jpg', w: 1920, h: 1080 },
    { file: 'marketing/hero-services.jpg', w: 1920, h: 1080 },
    { file: 'marketing/category-default.jpg', w: 800, h: 600 },
  ];

  for (const spec of marketingSpecs) {
    const outPath = path.join(STATIC_ROOT, spec.file);
    if (!fs.existsSync(outPath)) {
      await writeMarketingFromOg(outPath, spec.w, spec.h);
      console.log(`Generated ${spec.file}`);
    }
  }
}

if (require.main === module) {
  ensureStaticAssetFiles()
    .then(() => console.log('Static asset source files ready.'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
