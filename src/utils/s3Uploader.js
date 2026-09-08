import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import env from '../config/env.js';

let s3Client = null;

if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_S3_BUCKET_NAME) {
  s3Client = new S3Client({
    region: env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Compresses an image buffer using Sharp (max width 1600px, 80% quality WebP).
 * @param {Buffer} buffer 
 * @returns {Promise<Buffer>}
 */
export async function compressScreenshot(buffer) {
  return await sharp(buffer)
    .resize({ width: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Uploads a compressed image to AWS S3 or fallback to local disk.
 * @param {Buffer} fileBuffer 
 * @param {string} originalName 
 * @param {string} folder 
 * @returns {Promise<string>} Uploaded Image URL
 */
export async function uploadScreenshot(fileBuffer, originalName = 'screenshot.png', folder = 'screenshots') {
  const compressedBuffer = await compressScreenshot(fileBuffer);
  const fileKey = `${folder}/${Date.now()}-${randomUUID()}.webp`;

  if (s3Client && env.AWS_S3_BUCKET_NAME) {
    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
      Body: compressedBuffer,
      ContentType: 'image/webp',
    });

    await s3Client.send(command);

    // Return S3 public URL
    return `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${fileKey}`;
  }

  // Fallback to local uploads directory if S3 environment variables are not yet configured
  const localDir = path.join(process.cwd(), 'uploads', folder);
  await fs.mkdir(localDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}.webp`;
  const localPath = path.join(localDir, fileName);
  await fs.writeFile(localPath, compressedBuffer);

  return `/uploads/${folder}/${fileName}`;
}
