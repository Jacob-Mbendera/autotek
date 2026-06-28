import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { uploadImageWithPublicId } from '../config/cloudinary';
import { ensureStaticAssetFiles } from './generateStaticAssets';

dotenv.config();

const STATIC_ROOT = path.resolve(__dirname, '../../assets/static');

const UPLOADS: Array<{ relativePath: string; publicId: string }> = [
  { relativePath: 'placeholders/default.png', publicId: 'autotek/placeholders/default' },
  { relativePath: 'placeholders/engine.png', publicId: 'autotek/placeholders/engine' },
  { relativePath: 'placeholders/brakes.png', publicId: 'autotek/placeholders/brakes' },
  { relativePath: 'placeholders/electrical.png', publicId: 'autotek/placeholders/electrical' },
  { relativePath: 'placeholders/filters.png', publicId: 'autotek/placeholders/filters' },
  { relativePath: 'marketing/hero-home.jpg', publicId: 'autotek/marketing/hero-home' },
  { relativePath: 'marketing/hero-services.jpg', publicId: 'autotek/marketing/hero-services' },
  { relativePath: 'marketing/category-default.jpg', publicId: 'autotek/marketing/category-default' },
];

async function main(): Promise<void> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Cloudinary credentials missing. Set CLOUDINARY_* in backend/.env');
    process.exit(1);
  }

  await ensureStaticAssetFiles();

  console.log('\nUploading static assets to Cloudinary...\n');

  for (const item of UPLOADS) {
    const filePath = path.join(STATIC_ROOT, item.relativePath);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing source file: ${item.relativePath}`);
      process.exit(1);
    }

    const result = await uploadImageWithPublicId(filePath, item.publicId);
    console.log(`${item.publicId}`);
    console.log(`  -> ${result.secure_url}\n`);
  }

  console.log('All static assets uploaded.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
