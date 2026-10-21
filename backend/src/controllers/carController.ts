import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../db';
import { sendCarSharedEmail, sendCarUnsharedEmail } from '../services/emailService';
import { deleteUploadedFile } from './uploadController';
import { logger } from '../logger';

export async function getCars(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  try {
    const cars = await prisma.car.findMany({
      where: {
        OR: [
          { user_id: userId },
          { shares: { some: { user_id: userId } } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        shares: {
          where: { user_id: userId },
          select: { can_edit: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const mapped = cars.map((car) => {
      let access: 'owner' | 'editor' | 'viewer' = 'owner';
      if (car.user_id !== userId) {
        access = car.shares[0]?.can_edit ? 'editor' : 'viewer';
      }
      return {
        ...car,
        access,
      };
    });

    res.json(mapped);
  } catch (err) {
    logger.error({ err }, 'Error fetching cars');
    res.status(500).json({ message: 'Error al obtener los coches' });
  }
}

export async function getCarById(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.id;

  try {
    const car = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        OR: [
          { user_id: userId },
          { shares: { some: { user_id: userId } } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        shares: {
          where: { user_id: userId },
          select: { can_edit: true },
        },
      },
    });

    if (!car) {
      return res.status(404).json({ message: 'Coche no encontrado' });
    }

    let access: 'owner' | 'editor' | 'viewer' = 'owner';
    if (car.user_id !== userId) {
      access = car.shares[0]?.can_edit ? 'editor' : 'viewer';
    }

    res.json({
      ...car,
      access,
    });
  } catch (err) {
    logger.error({ err }, 'Error fetching car');
    res.status(500).json({ message: 'Error al obtener el coche' });
  }
}

export async function createCar(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { brand, model, year, licensePlate, color, mileage, engineCode, vin, tireSize, oilType } = req.body;

  if (!brand || !model || !year || !licensePlate) {
    return res.status(400).json({ message: 'Faltan campos obligatorios' });
  }

  try {
    const car = await prisma.car.create({
      data: {
        user_id: userId!,
        brand,
        model,
        year: Number(year),
        license_plate: licensePlate,
        color: color || null,
        mileage: Number(mileage) || 0,
        engine_code: engineCode || null,
        vin: vin || null,
        tire_size: tireSize || null,
        oil_type: oilType || null,
      },
    });
    res.status(201).json({
      ...car,
      access: 'owner',
    });
  } catch (err) {
    logger.error({ err }, 'Error creating car');
    res.status(500).json({ message: 'Error al registrar el coche' });
  }
}

export async function updateCar(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.id;
  const { brand, model, year, licensePlate, color, mileage, engineCode, vin, tireSize, oilType } = req.body;

  try {
    // Only owner can update technical car metadata
    const checkOwnership = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        user_id: userId,
      },
    });

    if (!checkOwnership) {
      return res.status(404).json({ message: 'Coche no encontrado o no autorizado' });
    }

    const updatedCar = await prisma.car.update({
      where: {
        id: Number(carId),
      },
      data: {
        brand: brand !== undefined ? brand : undefined,
        model: model !== undefined ? model : undefined,
        year: year !== undefined ? Number(year) : undefined,
        license_plate: licensePlate !== undefined ? licensePlate : undefined,
        color: color !== undefined ? color : undefined,
        mileage: mileage !== undefined ? Number(mileage) : undefined,
        engine_code: engineCode !== undefined ? engineCode : undefined,
        vin: vin !== undefined ? vin : undefined,
        tire_size: tireSize !== undefined ? tireSize : undefined,
        oil_type: oilType !== undefined ? oilType : undefined,
      },
    });

    res.json({
      ...updatedCar,
      access: 'owner',
    });
  } catch (err) {
    logger.error({ err }, 'Error updating car');
    res.status(500).json({ message: 'Error al actualizar el coche' });
  }
}

export async function deleteCar(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.id;

  try {
    const checkOwnership = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        user_id: userId,
      },
    });

    if (!checkOwnership) {
      return res.status(404).json({ message: 'Coche no encontrado o no autorizado' });
    }

    // Clean up uploaded documents belonging to this car
    const docs = await prisma.maintenance.findMany({
      where: {
        car_id: Number(carId),
        document_path: { not: null },
      },
      select: { document_path: true },
    });

    for (const d of docs) {
      deleteUploadedFile(d.document_path);
    }

    await prisma.car.delete({
      where: {
        id: Number(carId),
      },
    });

    res.json({ message: 'Coche eliminado correctamente' });
  } catch (err) {
    logger.error({ err }, 'Error deleting car');
    res.status(500).json({ message: 'Error al eliminar el coche' });
  }
}

export async function getCarShares(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;

  try {
    const car = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        user_id: userId,
      },
    });

    if (!car) {
      return res.status(403).json({ message: 'No tienes permiso para ver los compartidos de este coche' });
    }

    const shares = await prisma.carShare.findMany({
      where: {
        car_id: Number(carId),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    const users = shares.map((s) => ({
      ...s.user,
      can_edit: s.can_edit,
    }));
    res.json(users);
  } catch (err) {
    logger.error({ err }, 'Error fetching car shares');
    res.status(500).json({ message: 'Error al obtener los usuarios compartidos' });
  }
}

export async function shareCar(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;
  const { identifier, canEdit } = req.body;

  if (!identifier) {
    return res.status(400).json({ message: 'Se requiere el nombre de usuario o email' });
  }

  try {
    const car = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        user_id: userId,
      },
    });

    if (!car) {
      return res.status(403).json({ message: 'No tienes permiso para compartir este coche' });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: identifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (targetUser.id === userId) {
      return res.status(400).json({ message: 'No puedes compartir un coche contigo mismo' });
    }

    const existingShare = await prisma.carShare.findUnique({
      where: {
        car_id_user_id: {
          car_id: Number(carId),
          user_id: targetUser.id,
        },
      },
    });

    if (existingShare) {
      return res.status(400).json({ message: 'El coche ya está compartido con este usuario' });
    }

    const newShare = await prisma.carShare.create({
      data: {
        car_id: Number(carId),
        user_id: targetUser.id,
        can_edit: canEdit !== undefined ? Boolean(canEdit) : true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    const ownerName = req.user?.username || 'Un usuario';
    const carDetails = `${car.brand} ${car.model} (${car.license_plate})`;
    sendCarSharedEmail(targetUser.email, targetUser.username, ownerName, carDetails).catch((err) => {
      logger.error({ err }, 'Error sending car shared email');
    });

    res.status(201).json({
      ...newShare.user,
      can_edit: newShare.can_edit,
    });
  } catch (err) {
    logger.error({ err }, 'Error sharing car');
    res.status(500).json({ message: 'Error al compartir el coche' });
  }
}

export async function unshareCar(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;
  const targetUserId = req.params.userId;

  try {
    const car = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        user_id: userId,
      },
    });

    if (!car) {
      return res.status(403).json({ message: 'No tienes permiso para gestionar los compartidos de este coche' });
    }

    const shareToDelete = await prisma.carShare.findUnique({
      where: {
        car_id_user_id: {
          car_id: Number(carId),
          user_id: Number(targetUserId),
        },
      },
      include: {
        user: true,
      },
    });

    if (!shareToDelete) {
      return res.status(404).json({ message: 'El coche no está compartido con este usuario' });
    }

    await prisma.carShare.delete({
      where: {
        car_id_user_id: {
          car_id: Number(carId),
          user_id: Number(targetUserId),
        },
      },
    });

    const ownerName = req.user?.username || 'Un usuario';
    const carDetails = `${car.brand} ${car.model} (${car.license_plate})`;
    sendCarUnsharedEmail(shareToDelete.user.email, shareToDelete.user.username, ownerName, carDetails).catch((err) => {
      logger.error({ err }, 'Error sending car unshared email');
    });

    res.json({ message: 'Acceso revocado correctamente' });
  } catch (err) {
    logger.error({ err }, 'Error unsharing car');
    res.status(500).json({ message: 'Error al revocar el acceso' });
  }
}
