import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDir = path.join(process.cwd(), 'uploads', 'deposits');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.bin';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  },
});

export const depositProofUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '');
    if (mime.startsWith('image/') || mime === 'application/pdf') {
      cb(null, true);
      return;
    }
    cb(new Error('Only images or PDF files are allowed for deposit proof'));
  },
});
