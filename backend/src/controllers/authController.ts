import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@autotrack/shared';
import prisma from '../db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { sendWelcomeEmail, sendTestEmail } from '../services/emailService';
import { secrets, config } from '../config';
import { logger } from '../logger';
import { deleteUploadedFile } from './uploadController';

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function issueTokens(user: { id: number; username: string; role: Role | string; token_version?: number }) {
  const secret = secrets.jwt;
  const tokenVersion = user.token_version ?? 0;

  const accessToken = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      tokenVersion,
    },
    secret,
    {
      expiresIn: config.accessTokenTtl as any,
    }
  );

  // Generate random 40-byte opaque refresh token
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    },
  });

  return {
    token: accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

export async function register(req: Request, res: Response) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Por favor, rellene todos los campos' });
  }

  try {
    const userCheck = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: 'insensitive' } },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    });

    if (userCheck) {
      return res.status(400).json({ message: 'El usuario o el correo ya están registrados' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password_hash: passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        token_version: true,
      },
    });

    sendWelcomeEmail(user.email, user.username).catch((err) => {
      logger.error({ err }, 'Error sending welcome email');
    });

    const tokens = await issueTokens(user);

    res.status(201).json({
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Error in registration');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor, rellene todos los campos' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!user) {
      // Timing attack countermeasure
      await bcrypt.hash('dummy_password_timing', 10);
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Tu cuenta ha sido deshabilitada por el administrador' });
    }

    // Capture real client IP
    const xff = req.headers['x-forwarded-for'];
    const realIpHeader = req.headers['x-real-ip'];
    const socketIp = req.socket.remoteAddress || '';
    let ipStr = socketIp;
    if (xff) {
      ipStr = Array.isArray(xff) ? xff[0] : xff.split(',')[0].trim();
    } else if (realIpHeader) {
      ipStr = Array.isArray(realIpHeader) ? realIpHeader[0] : realIpHeader.trim();
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        login_count: { increment: 1 },
        last_login_ip: ipStr || null,
        last_login_at: new Date(),
      },
    });

    const tokens = await issueTokens(user);

    res.json({
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Error in login');
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  const { username, email, password } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  if (!username || !email) {
    return res.status(400).json({ message: 'El nombre de usuario y el correo son obligatorios' });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: 'insensitive' } },
          { email: { equals: email, mode: 'insensitive' } },
        ],
        NOT: {
          id: userId,
        },
      },
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
      }
      if (existingUser.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({ message: 'El correo electrónico ya está en uso' });
      }
    }

    const updateData: any = {
      username,
      email,
    };

    let passwordChanged = false;
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
      updateData.token_version = { increment: 1 };
      passwordChanged = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        token_version: true,
        created_at: true,
      },
    });

    // Invalidate prior refresh tokens if password changed
    if (passwordChanged) {
      await prisma.refreshToken.deleteMany({
        where: { user_id: userId },
      });
    }

    const tokens = await issueTokens(updatedUser);

    res.json({
      ...tokens,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        created_at: updatedUser.created_at,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Error updating profile');
    res.status(500).json({ message: 'Error interno del servidor al actualizar perfil' });
  }
}

export async function sendTestEmailHandler(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await sendTestEmail(user.email, user.username);
    res.json({ message: 'Correo de prueba enviado correctamente' });
  } catch (err) {
    logger.error({ err }, 'Error sending test email handler');
    res.status(500).json({ message: 'Error al enviar el correo de prueba' });
  }
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(400).json({ message: 'Refresh token es requerido' });
  }

  try {
    const tokenHash = hashRefreshToken(refreshToken);

    // 1. Look up in opaque refresh_tokens table
    const stored = await prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (stored) {
      if (stored.expires_at < new Date()) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
        return res.status(401).json({ message: 'Token de refresco expirado' });
      }

      if (!stored.user.is_active) {
        await prisma.refreshToken.deleteMany({ where: { user_id: stored.user_id } });
        return res.status(403).json({ message: 'Tu cuenta ha sido deshabilitada por el administrador' });
      }

      // Rotate: delete the old one and issue a new one
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      const tokens = await issueTokens(stored.user);

      return res.json({
        ...tokens,
        user: {
          id: stored.user.id,
          username: stored.user.username,
          email: stored.user.email,
          role: stored.user.role,
        },
      });
    }

    // 2. Backward compatibility: handle legacy JWT refresh tokens
    const legacySecret = secrets.legacyRefresh || secrets.jwt;
    try {
      const decoded = jwt.verify(refreshToken, legacySecret) as { id: number; type: string };
      if (decoded && decoded.type === 'refresh') {
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (user && user.is_active) {
          const tokens = await issueTokens(user);
          return res.json({
            ...tokens,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            },
          });
        }
      }
    } catch {
      // Ignore legacy decode error
    }

    return res.status(401).json({ message: 'Token de refresco no válido o expirado' });
  } catch (err) {
    logger.error({ err }, 'Error in refresh token');
    return res.status(401).json({ message: 'Token de refresco no válido o expirado' });
  }
}

export async function deleteAccount(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  try {
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Safety guard: prevent deleting the last admin
    if (userToDelete.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin' },
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: 'No puedes eliminar tu cuenta porque eres el único administrador del sistema.',
        });
      }
    }

    // Find and delete any uploaded document files belonging to this user's cars
    const maintenancesWithDocs = await prisma.maintenance.findMany({
      where: {
        car: { user_id: userId },
        document_path: { not: null },
      },
      select: { document_path: true },
    });

    for (const m of maintenancesWithDocs) {
      deleteUploadedFile(m.document_path);
    }

    // Delete user (cascades in DB)
    await prisma.user.delete({
      where: { id: userId },
    });

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Error deleting account');
    res.status(500).json({ message: 'Error interno del servidor al eliminar la cuenta' });
  }
}
