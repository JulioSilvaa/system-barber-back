import { Request } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { ValidationError } from '@/domain/errors';

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MAX_FILE_SIZE = 2 * 1024 * 1024;

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new ValidationError('logo must be a PNG, JPG or WEBP image'));
  }
  return cb(null, true);
}

export const uploadLogo = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `logo-${id}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});
