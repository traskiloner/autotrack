import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { sendWelcomeEmail } from '../services/emailService';

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
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
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
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipStr = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '');

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
      expiresIn: '7d',
    });

    res.json({
      token,
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
      expiresIn: '7d',
    });

    res.json({
      token,
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Error interno del servidor al actualizar perfil' });
  }
}

