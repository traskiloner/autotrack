import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';

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
      }
    });

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'super_secret_key_change_me_123';
    const token = jwt.sign({ id: user.id, username: user.username }, secret, {
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

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'super_secret_key_change_me_123';
    const token = jwt.sign({ id: user.id, username: user.username }, secret, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}
