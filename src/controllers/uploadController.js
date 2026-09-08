import upload from '../middlewares/uploadMiddleware.js';
import { uploadScreenshot } from '../utils/s3Uploader.js';
import { AppError } from '../middlewares/errorHandler.js';

export async function uploadScreenshotHandler(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError(400, 'No screenshot file uploaded');
    }
    const folder = req.body?.folder || 'screenshots';
    const imageUrl = await uploadScreenshot(req.file.buffer, req.file.originalname, folder);
    return res.json({
      success: true,
      data: {
        imageUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}
