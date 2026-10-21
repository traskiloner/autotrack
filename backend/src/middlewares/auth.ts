import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@autotrack/shared';
import { secrets } from '../config';
import prisma from '../db';

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: Role;
  tokenVersion?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, secrets.jwt) as {
      id: number;
      username: string;
      role: Role;
      tokenVersion?: number;
    };

    // Verify user exists, is active, and token_version matches
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true, is_active: true, token_version: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    if (!user.is_active) {
      return res.status(401).json({ message: 'Tu cuenta ha sido deshabilitada por el administrador' });
    }

    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.token_version) {
      return res.status(401).json({ message: 'Sesión expirada. Por favor, inicia sesión de nuevo.' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role as Role,
      tokenVersion: user.token_version,
    };
    next();
  } catch {
    res.status(401).json({ message: 'Token is not valid' });
  }
}

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado, se requieren permisos de administrador' });
  }
  next();
}
