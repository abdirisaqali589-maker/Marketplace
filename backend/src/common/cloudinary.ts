import { v2 as cloudinary } from 'cloudinary';
import { config } from './config';
import { logger } from './logger';

let initialized = false;

function init() {
  if (initialized) return;
  if (config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret) {
    cloudinary.config({
      cloud_name: config.cloudinaryCloudName,
      api_key: config.cloudinaryApiKey,
      api_secret: config.cloudinaryApiSecret,
    });
    initialized = true;
    logger.info('Cloudinary CDN initialized');
  } else {
    logger.info('Cloudinary not configured - using local file storage');
  }
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
    effect?: string;
  }[];
}

export async function uploadImage(
  filePath: string,
  options: UploadOptions = {},
): Promise<{ url: string; publicId: string; secureUrl: string; format: string; width: number; height: number } | null> {
  init();
  if (!initialized) return null;

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'marketplace',
      public_id: options.publicId,
      transformation: options.transformation || [
        { quality: 'auto', fetch_format: 'auto' },
      ],
      resource_type: 'image',
    });

    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    logger.error('Cloudinary upload failed', { error: (error as Error).message });
    return null;
  }
}

export async function uploadImageBuffer(
  buffer: Buffer,
  options: UploadOptions = {},
): Promise<{ url: string; publicId: string; secureUrl: string; format: string; width: number; height: number } | null> {
  init();
  if (!initialized) return null;

  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'marketplace',
        public_id: options.publicId,
        transformation: options.transformation || [
          { quality: 'auto', fetch_format: 'auto' },
        ],
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          logger.error('Cloudinary buffer upload failed', { error: error?.message });
          resolve(null);
          return;
        }
        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
        });
      },
    );
    uploadStream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<boolean> {
  init();
  if (!initialized) return false;

  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    logger.error('Cloudinary delete failed', { publicId, error: (error as Error).message });
    return false;
  }
}

export function getOptimizedUrl(publicId: string, options: { width?: number; height?: number; quality?: string; format?: string } = {}): string {
  init();
  if (!initialized) return '';

  const transformations = [];
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);
  transformations.push('fl_progressive');

  return cloudinary.url(publicId, {
    transformation: transformations.join(','),
    secure: true,
  });
}

export function getThumbnailUrl(publicId: string): string {
  return getOptimizedUrl(publicId, { width: 150, height: 150, quality: 'auto' });
}

export function getProductImageUrl(publicId: string): string {
  return getOptimizedUrl(publicId, { width: 800, quality: 'auto' });
}