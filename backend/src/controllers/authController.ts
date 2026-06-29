import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { sendWelcomeEmail, sendTestEmail } from '../services/emailService';

export async function register(req: Request, res: Response) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Por favor, rellene todos los campos' });
  }

  try {
    // Check if user exists
    const userCheck = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (userCheck) {
      return res.status(400).json({ message: 'El usuario o el correo ya están registrados' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
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
      }
    });

    // Send welcome email asynchronously
    sendWelcomeEmail(user.email, user.username).catch(err => {
      console.error('Error sending welcome email in controller:', err);
    });

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'super_secret_key_change_me_123';
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, secret, {
      expiresIn: '1h',
    });

    const refreshSecret = process.env.JWT_REFRESH_SECRET || (secret + '_refresh');
    const refreshToken = jwt.sign({ id: user.id, username: user.username, role: user.role, type: 'refresh' }, refreshSecret, {
      expiresIn: '30d',
    });

    res.status(201).json({
      token,
      refreshToken,
      user,
    });
  } catch (err) {
    console.error('Error in registration:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor, rellene todos los campos' });
  }

  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Tu cuenta ha sido deshabilitada por el administrador' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Update login stats
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
        last_login_at: new Date()
      }
    });

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'super_secret_key_change_me_123';
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, secret, {
      expiresIn: '1h',
    });

    const refreshSecret = process.env.JWT_REFRESH_SECRET || (secret + '_refresh');
    const refreshToken = jwt.sign({ id: user.id, username: user.username, role: user.role, type: 'refresh' }, refreshSecret, {
      expiresIn: '30d',
    });

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Error in login:', err);
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
    // Check if username or email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ],
        NOT: {
          id: userId
        }
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'El correo electrónico ya está en uso' });
      }
    }

    const updateData: any = {
      username,
      email
    };

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        created_at: true
      }
    });

    // Generate a new JWT token with updated info
    const secret = process.env.JWT_SECRET || 'super_secret_key_change_me_123';
    const token = jwt.sign({ id: updatedUser.id, username: updatedUser.username, role: updatedUser.role }, secret, {
      expiresIn: '1h',
    });

    const refreshSecret = process.env.JWT_REFRESH_SECRET || (secret + '_refresh');
    const refreshToken = jwt.sign({ id: updatedUser.id, username: updatedUser.username, role: updatedUser.role, type: 'refresh' }, refreshSecret, {
      expiresIn: '30d',
    });

    res.json({
      token,
      refreshToken,
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating profile:', err);
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
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await sendTestEmail(user.email, user.username);
    res.json({ message: 'Correo de prueba enviado correctamente' });
  } catch (err) {
    console.error('Error sending test email handler:', err);
    res.status(500).json({ message: 'Error al enviar el correo de prueba' });
  }
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token es requerido' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_key_change_me_123';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || (secret + '_refresh');
    const decoded = jwt.verify(refreshToken, refreshSecret) as { id: number; username: string; role: string; type: string };

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Token de refresco no válido' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Tu cuenta ha sido deshabilitada por el administrador' });
    }

    // Generate new access and refresh tokens
    const newAccessToken = jwt.sign({ id: user.id, username: user.username, role: user.role }, secret, {
      expiresIn: '1h',
    });

    const newRefreshToken = jwt.sign({ id: user.id, username: user.username, role: user.role, type: 'refresh' }, refreshSecret, {
      expiresIn: '30d',
    });

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Error in refresh token:', err);
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
      where: { id: userId }
    });

    if (!userToDelete) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Safety guard: prevent deleting the last admin
    if (userToDelete.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin' }
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: 'No puedes eliminar tu cuenta porque eres el único administrador del sistema.'
        });
      }
    }

    // Delete the user (this will cascade delete all associated cars, maintenances, etc.)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting account:', err);
    res.status(500).json({ message: 'Error interno del servidor al eliminar la cuenta' });
  }
}



