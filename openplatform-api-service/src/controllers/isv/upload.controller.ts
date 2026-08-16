/**
 * Upload Controller
 * Handles file upload for payment proofs
 */

import { Request, Response, NextFunction } from 'express';
import { ISVAuthRequest } from '../../middleware/isv-auth.middleware';
import { HttpCodes } from '../../enums/http-codes.enum';
import { BusinessCodes } from '../../enums/business-codes.enum';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'proofs');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `proof-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const uploadProof = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
}).single('file');

export async function handleUploadProof(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const isvUser = (req as ISVAuthRequest).isvUser;
    if (!isvUser) {
      res.status(HttpCodes.UNAUTHORIZED).json({
        code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized', data: null,
      });
      return;
    }
    if (!req.file) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_REQUIRED, message: 'No file uploaded', data: null,
      });
      return;
    }
    const protocol = req.protocol || 'http'
    const host = req.get('host') || 'localhost:1000'
    const fileUrl = `${protocol}://${host}/uploads/proofs/${req.file.filename}`

    res.json({
      code: 0, message: 'success',
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('Upload proof error:', error);
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL, message: 'Failed to upload file', data: null,
    });
  }
}