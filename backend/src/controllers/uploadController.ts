import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/i;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (JPEG/PNG) y documentos PDF.'));
  },
});

export function handleUpload(req: AuthenticatedRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ningún archivo' });
  }

  const relativePath = `/uploads/${req.file.filename}`;
  res.status(200).json({
    message: 'Archivo subido correctamente',
    filePath: relativePath,
    filename: req.file.originalname,
  });
}
