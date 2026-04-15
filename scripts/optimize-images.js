const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Image Optimization Script for AutoTek
 *
 * This script optimizes images by:
 * 1. Converting to WebP format (60-70% size reduction)
 * 2. Creating responsive sizes (400w, 800w, 1200w)
 * 3. Maintaining fallback images (original format)
 *
 * Usage:
 *   node scripts/optimize-images.js
 *   node scripts/optimize-images.js --input ./custom/path
 */

const inputDir = process.argv[2] || './frontend/public/images';
const sizes = [400, 800, 1200]; // Responsive sizes for different viewports
const quality = 85; // WebP quality (85 is good balance of size/quality)

/**
 * Recursively get all image files from a directory
 */
function getAllImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllImageFiles(filePath, fileList);
    } else if (/\.(jpg|jpeg|png)$/i.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Optimize a single image file
 */
async function optimizeImage(inputPath) {
  try {
    const ext = path.extname(inputPath);
    const basename = path.basename(inputPath, ext);
    const dir = path.dirname(inputPath);

    console.log(`\nProcessing: ${path.relative(process.cwd(), inputPath)}`);

    // Get original image metadata
    const metadata = await sharp(inputPath).metadata();
    console.log(`  Original: ${metadata.width}x${metadata.height}, ${(metadata.size / 1024).toFixed(1)}KB`);

    // Generate WebP versions at different sizes
    for (const width of sizes) {
      // Skip if original is smaller than target size
      if (metadata.width < width) {
        console.log(`  Skipping ${width}w (original is smaller)`);
        continue;
      }

      const outputPath = path.join(dir, `${basename}-${width}w.webp`);

      await sharp(inputPath)
        .resize(width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({ quality })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`  ✓ Generated ${width}w.webp (${(stats.size / 1024).toFixed(1)}KB)`);
    }

    // Also create a WebP version at original size
    const originalWebPPath = path.join(dir, `${basename}.webp`);
    await sharp(inputPath)
      .webp({ quality })
      .toFile(originalWebPPath);

    const webpStats = fs.statSync(originalWebPPath);
    const reduction = ((1 - (webpStats.size / metadata.size)) * 100).toFixed(1);
    console.log(`  ✓ Generated original size WebP (${(webpStats.size / 1024).toFixed(1)}KB, ${reduction}% reduction)`);

  } catch (error) {
    console.error(`  ✗ Error processing ${inputPath}:`, error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('============================================');
  console.log('AutoTek Image Optimization Script');
  console.log('============================================');
  console.log(`Input directory: ${inputDir}`);
  console.log(`Generating sizes: ${sizes.join(', ')}px`);
  console.log(`WebP quality: ${quality}`);
  console.log('============================================\n');

  // Check if input directory exists
  if (!fs.existsSync(inputDir)) {
    console.error(`Error: Directory not found: ${inputDir}`);
    console.log('\nUsage: node scripts/optimize-images.js [input-directory]');
    process.exit(1);
  }

  // Get all image files
  const imageFiles = getAllImageFiles(inputDir);

  if (imageFiles.length === 0) {
    console.log('No images found to optimize.');
    process.exit(0);
  }

  console.log(`Found ${imageFiles.length} image(s) to optimize\n`);

  // Process all images
  let processed = 0;
  for (const imagePath of imageFiles) {
    await optimizeImage(imagePath);
    processed++;
  }

  console.log('\n============================================');
  console.log(`Successfully optimized ${processed}/${imageFiles.length} images`);
  console.log('============================================\n');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
