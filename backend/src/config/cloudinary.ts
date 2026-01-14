import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Upload an image to Cloudinary
 * @param filePath - Path to the file (from multer)
 * @param folder - Folder name in Cloudinary (e.g., 'autotek/products')
 * @returns Promise with upload result containing secure_url
 */
export const uploadImage = async (
  filePath: string,
  folder: string = 'autotek/products'
): Promise<{ secure_url: string; public_id: string }> => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env file');
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param filePaths - Array of file paths
 * @param folder - Folder name in Cloudinary
 * @returns Promise with array of upload results
 */
export const uploadMultipleImages = async (
  filePaths: string[],
  folder: string = 'autotek/products'
): Promise<Array<{ secure_url: string; public_id: string }>> => {
  try {
    const uploadPromises = filePaths.map((filePath) => uploadImage(filePath, folder));
    return await Promise.all(uploadPromises);
  } catch (error: any) {
    console.error('Cloudinary multiple upload error:', error);
    throw new Error(`Failed to upload images: ${error.message}`);
  }
};

/**
 * Delete an image from Cloudinary
 * @param publicId - Public ID of the image to delete
 * @returns Promise with deletion result
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary credentials not configured');
    }

    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Extract public_id from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID or null
 */
export const extractPublicId = (url: string): string | null => {
  try {
    // Cloudinary URLs format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};
