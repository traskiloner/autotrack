import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@autotrack/shared';
import prisma from '../db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { issueTokens } from './authController';
import { logger } from '../logger';
import { deleteUploadedFile } from './uploadController';

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
    logger.error({ err }, 'Error checking admin setup status');
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
          { username: { equals: username, mode: 'insensitive' } },
          { email: { equals: email, mode: 'insensitive' } },
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
        role: 'admin' as Role,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        created_at: true,
        token_version: true,
      }
    });

    const tokens = await issueTokens(admin);

    res.status(201).json({
      ...tokens,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error setting up initial admin');
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

    // Additional statistics
    const activeUsersCount = await prisma.user.count({ where: { is_active: true } });
    const disabledUsersCount = await prisma.user.count({ where: { is_active: false } });
    const totalShares = await prisma.carShare.count();
    
    const loginAggregation = await prisma.user.aggregate({
      _avg: {
        login_count: true
      }
    });
    const avgLogins = Number(loginAggregation._avg.login_count || 0);

    res.json({
      totalUsers,
      totalCars,
      totalFuelLogs,
      totalMaintenanceCost,
      totalInventoryStock,
      partsCount,
      activeUsersCount,
      disabledUsersCount,
      totalShares,
      avgLogins
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
        is_active: true,
        login_count: true,
        last_login_ip: true,
        last_login_at: true,
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
  const { username, email, role, password, is_active } = req.body;

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

    // If deactivating self, prevent it
    if (Number(id) === req.user?.id && is_active === false) {
      return res.status(400).json({ message: 'No puedes deshabilitar tu propio usuario' });
    }

    const updateData: any = {
      username: username !== undefined ? username : undefined,
      email: email !== undefined ? email : undefined,
      role: role !== undefined ? role : undefined,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined
    };

    let shouldRevokeTokens = false;
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
      updateData.token_version = { increment: 1 };
      shouldRevokeTokens = true;
    }

    if (is_active === false) {
      updateData.token_version = { increment: 1 };
      shouldRevokeTokens = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        is_active: true,
        login_count: true,
        last_login_ip: true,
        last_login_at: true,
        created_at: true
      }
    });

    if (shouldRevokeTokens) {
      await prisma.refreshToken.deleteMany({
        where: { user_id: Number(id) }
      });
    }

    res.json(updatedUser);
  } catch (err) {
    logger.error({ err }, 'Error updating user from admin panel');
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

    // Find and delete any uploaded document files belonging to this user's cars
    const userDocs = await prisma.maintenance.findMany({
      where: {
        car: { user_id: Number(id) },
        document_path: { not: null }
      },
      select: { document_path: true }
    });

    for (const doc of userDocs) {
      deleteUploadedFile(doc.document_path);
    }

    await prisma.user.delete({
      where: { id: Number(id) }
    });

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Error deleting user from admin panel');
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

export async function adminTransferCarOwner(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'Se requiere el ID del nuevo propietario' });
  }

  try {
    const car = await prisma.car.findUnique({
      where: { id: Number(id) }
    });

    if (!car) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    const newOwner = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });

    if (!newOwner) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const updatedCar = await prisma.car.update({
      where: { id: Number(id) },
      data: {
        user_id: Number(userId)
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    res.json(updatedCar);
  } catch (err) {
    console.error('Error transferring car ownership:', err);
    res.status(500).json({ message: 'Error al transferir la propiedad del vehículo' });
  }
}
