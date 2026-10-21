import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { secrets } from '../config';
import { logger } from '../logger';
import prisma from '../db';

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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

/** Checks the real file signature (magic bytes), not just the client-declared type. */
function hasValidSignature(filePath: string): boolean {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(8);
    fs.readSync(fd, buf, 0, 8, 0);
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isPdf = buf.slice(0, 4).toString('latin1') === '%PDF';
    return isJpeg || isPng || isPdf;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Deletes a previously uploaded file given its stored path (e.g. `/uploads/123.pdf`).
 * Ignores anything outside the uploads directory and never throws.
 */
export function deleteUploadedFile(storedPath?: string | null) {
  if (!storedPath || !storedPath.startsWith('/uploads/')) return;
  const target = path.resolve(uploadDir, path.basename(storedPath));
  if (!target.startsWith(path.resolve(uploadDir) + path.sep)) return;
  fs.unlink(target, (err) => {
    if (err && err.code !== 'ENOENT') {
      logger.error({ err }, 'Error deleting uploaded file');
    }
  });
}

export function handleUpload(req: AuthenticatedRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ message: 'No se ha subido ningún archivo' });
  }

  if (!hasValidSignature(req.file.path)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: 'El contenido del archivo no corresponde a una imagen JPEG/PNG o PDF válido.' });
  }

  const relativePath = `/uploads/${req.file.filename}`;
  res.status(200).json({
    message: 'Archivo subido correctamente',
    filePath: relativePath,
    filename: req.file.originalname,
  });
}

/**
 * Secure file serving endpoint with authentication and car access authorization.
 * Supports Bearer token or ?token= query parameter for <img>, <iframe>, and new tab downloads.
 */
export async function serveUploadedFile(req: Request, res: Response) {
  const rawFilename = req.params.filename;
  if (!rawFilename) {
    return res.status(400).json({ message: 'Nombre de archivo requerido' });
  }

  const filename = path.basename(rawFilename);
  const targetPath = path.resolve(uploadDir, filename);

  if (!targetPath.startsWith(path.resolve(uploadDir) + path.sep)) {
    return res.status(400).json({ message: 'Ruta no válida' });
  }

  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Se requiere autenticación para acceder a este archivo' });
  }

  try {
    const decoded = jwt.verify(token, secrets.jwt) as { id: number; role?: string };

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    if (decoded.role === 'admin') {
      return res.sendFile(targetPath);
    }

    const relativePath = `/uploads/${filename}`;
    const maintenance = await prisma.maintenance.findFirst({
      where: {
        document_path: relativePath,
        car: {
          OR: [
            { user_id: decoded.id },
            { shares: { some: { user_id: decoded.id } } },
          ],
        },
      },
      select: { id: true },
    });

    if (maintenance) {
      return res.sendFile(targetPath);
    }

    // Allow recent upload by authenticated user (within 2 hours) before form submission
    const timestampPart = parseInt(filename.split('-')[0], 10);
    if (!isNaN(timestampPart) && Date.now() - timestampPart < 2 * 60 * 60 * 1000) {
      return res.sendFile(targetPath);
    }

    return res.status(403).json({ message: 'No tienes permiso para ver este archivo' });
  } catch {
    return res.status(401).json({ message: 'Token de acceso no válido' });
  }
}
