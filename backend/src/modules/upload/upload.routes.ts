import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { upload } from '../../common/upload';
import { DynamicConfigService } from '../dynamic-config/dynamic-config.service';
import { AppError } from '../../common/errors';
import multer from 'multer';
import path from 'path';

const router = Router();
const configService = new DynamicConfigService();
const DEFAULT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/avif', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif'];
const DEFAULT_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico', '.avif', '.bmp', '.tif', '.tiff', '.heic', '.heif'];

const uploadMiddleware = upload.array('images');

// Wrap multer middleware to catch its errors and pass to Express error handler
function handleUpload(req: any, res: any, next: any) {
  uploadMiddleware(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(400, 'File too large. Maximum size is 15MB per image.'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new AppError(400, 'Too many files or unexpected field name. Use field "images".'));
        }
        return next(new AppError(400, `Upload error: ${err.message}`));
      }
      if (err.message?.includes('Only image')) {
        return next(new AppError(400, err.message));
      }
      return next(err);
    }
    next();
  });
}

router.post('/images', authenticate, handleUpload, async (req, res, next) => {
  try {
    const uploadConfig = await configService.getValue('marketplace.uploads', {});
    const maxProductImages = Number(uploadConfig.maxProductImages || 8);
    const configuredMaxImageSizeMb = Number(uploadConfig.maxImageSizeMb || 15);
    const maxImageSizeMb = Number.isFinite(configuredMaxImageSizeMb) && configuredMaxImageSizeMb > 0 ? configuredMaxImageSizeMb : 15;
    const acceptedImageTypes = Array.from(new Set([
      ...DEFAULT_IMAGE_TYPES,
      ...(Array.isArray(uploadConfig.acceptedImageTypes) ? uploadConfig.acceptedImageTypes : []),
    ]));
    const files = (req.files as Express.Multer.File[] | undefined) || [];

    if (!files.length) {
      throw new AppError(400, 'No image files were received');
    }

    if (files.length > maxProductImages) {
      throw new AppError(400, `You can upload up to ${maxProductImages} product images`);
    }

    const maxBytes = maxImageSizeMb * 1024 * 1024;
    const invalidFile = files.find((file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const acceptedType = file.mimetype.startsWith('image/') || acceptedImageTypes.includes(file.mimetype) || DEFAULT_IMAGE_EXTENSIONS.includes(ext);
      return file.size > maxBytes || !acceptedType;
    });
    if (invalidFile) {
      // Clean up the invalid file(s) from disk asynchronously
      const fs = await import('fs/promises');
      try {
        await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
      } catch {}
      throw new AppError(400, `Each image must be ${maxImageSizeMb}MB or less and use an allowed type`);
    }

    const origin = `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      success: true,
      message: `${files.length} image${files.length === 1 ? '' : 's'} uploaded successfully`,
      limits: {
        maxProductImages,
        maxImageSizeMb,
        acceptedImageTypes,
      },
      data: files.map((file) => ({
        filename: file.filename,
        url: `/uploads/${file.filename}`,
        previewUrl: `${origin}/uploads/${file.filename}`,
        path: `/uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
