import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { AuthenticatedRequest } from '../middlewares/auth';

// 1. Check if admin setup is required (no admin user exists)
export async function checkAdminSetup(req: Request, res: Response) {
  try {
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'admin'
      }
    });

    res.json({ setupRequired: !adminUser });
  } catch (err) {
    console.error('Error checking admin setup status:', err);
    res.status(500).json({ message: 'Error al comprobar el estado del administrador' });
  }
}

// 2. Setup the first initial administrator account
export async function setupInitialAdmin(req: Request, res: Response) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Por favor, rellene todos los campos' });
  }

  try {
    // Check if any admin already exists
    const adminExists = await prisma.user.findFirst({
      where: {
        role: 'admin'
      }
    });

    if (adminExists) {
      return res.status(400).json({ message: 'El administrador inicial ya está configurado' });
    }

    // Check if user with same email or username already exists (just to be safe)
    const userCheck = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (userCheck) {
      return res.status(400).json({ message: 'El nombre de usuario o correo ya existen' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        username,
        email,
        password_hash: passwordHash,
        role: 'admin'
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        created_at: true
      }
    });

    // Generate JWT
    const secret = process.env.JWT_SECRET || 'super_secret_key_change_me_123';
    const token = jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, secret, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: admin
    });
  } catch (err) {
    console.error('Error setting up initial admin:', err);
    res.status(500).json({ message: 'Error interno del servidor al crear administrador' });
  }
}

// 3. Get platform-wide statistics (Admin only)
export async function getGlobalStats(req: AuthenticatedRequest, res: Response) {
  try {
    const totalUsers = await prisma.user.count();
    const totalCars = await prisma.car.count();
    const totalFuelLogs = await prisma.fuelLog.count();
    
    const maintenanceCostAggregation = await prisma.maintenance.aggregate({
      _sum: {
        cost: true
      }
    });
    const totalMaintenanceCost = Number(maintenanceCostAggregation._sum.cost || 0);

    const inventoryStockAggregation = await prisma.inventoryPart.aggregate({
      _sum: {
        stock: true
      }
    });
    const totalInventoryStock = Number(inventoryStockAggregation._sum.stock || 0);

    const partsCount = await prisma.part.count();

    res.json({
      totalUsers,
      totalCars,
      totalFuelLogs,
      totalMaintenanceCost,
      totalInventoryStock,
      partsCount
    });
  } catch (err) {
    console.error('Error getting global statistics:', err);
    res.status(500).json({ message: 'Error al obtener estadísticas globales' });
  }
}

// 4. Get all users (Admin only)
export async function getAllUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        created_at: true,
        _count: {
          select: {
            cars: true,
            inventory: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json(users);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ message: 'Error al obtener el listado de usuarios' });
  }
}

// 5. Create a user (Admin only)
export async function adminCreateUser(req: AuthenticatedRequest, res: Response) {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: 'Por favor, rellene todos los campos' });
  }

  try {
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

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password_hash: passwordHash,
        role
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        created_at: true
      }
    });

    res.status(201).json(newUser);
  } catch (err) {
    console.error('Error creating user from admin panel:', err);
    res.status(500).json({ message: 'Error interno del servidor al crear usuario' });
  }
}

// 6. Update user (Admin only)
export async function adminUpdateUser(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { username, email, role, password } = req.body;

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: Number(id) }
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // If changing role of self, prevent demotion to avoid locking out the last admin
    if (Number(id) === req.user?.id && targetUser.role === 'admin' && role !== 'admin') {
      return res.status(400).json({ message: 'No puedes quitarte el rol de administrador a ti mismo' });
    }

    const updateData: any = {
      username,
      email,
      role
    };

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        created_at: true
      }
    });

    res.json(updatedUser);
  } catch (err) {
    console.error('Error updating user from admin panel:', err);
    res.status(500).json({ message: 'Error al actualizar el usuario' });
  }
}

// 7. Delete user (Admin only)
export async function adminDeleteUser(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  if (Number(id) === req.user?.id) {
    return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: Number(id) }
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await prisma.user.delete({
      where: { id: Number(id) }
    });

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting user from admin panel:', err);
    res.status(500).json({ message: 'Error al eliminar el usuario' });
  }
}

// 8. Get all cars (Admin only)
export async function getAllCars(req: AuthenticatedRequest, res: Response) {
  try {
    const cars = await prisma.car.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    res.json(cars);
  } catch (err) {
    console.error('Error fetching all fleet cars:', err);
    res.status(500).json({ message: 'Error al obtener el listado de vehículos' });
  }
}
