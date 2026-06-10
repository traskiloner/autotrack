import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../db';

export async function getCars(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  try {
    const cars = await prisma.car.findMany({
      where: {
        OR: [
          { user_id: userId },
          { shares: { some: { user_id: userId } } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(cars);
  } catch (err) {
    console.error('Error fetching cars:', err);
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
          { shares: { some: { user_id: userId } } }
        ]
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

    if (!car) {
      return res.status(404).json({ message: 'Coche no encontrado' });
    }

    res.json(car);
  } catch (err) {
    console.error('Error fetching car:', err);
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
        user_id: userId,
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
    res.status(201).json(car);
  } catch (err) {
    console.error('Error creating car:', err);
    res.status(500).json({ message: 'Error al registrar el coche' });
  }
}

export async function updateCar(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.id;
  const { brand, model, year, licensePlate, color, mileage, engineCode, vin, tireSize, oilType } = req.body;

  try {
    // Verify ownership
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

    res.json(updatedCar);
  } catch (err) {
    console.error('Error updating car:', err);
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

    await prisma.car.delete({
      where: {
        id: Number(carId),
      },
    });

    res.json({ message: 'Coche eliminado correctamente' });
  } catch (err) {
    console.error('Error deleting car:', err);
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

    const users = shares.map(s => s.user);
    res.json(users);
  } catch (err) {
    console.error('Error fetching car shares:', err);
    res.status(500).json({ message: 'Error al obtener los usuarios compartidos' });
  }
}

export async function shareCar(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;
  const { identifier } = req.body;

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
          { username: identifier },
          { email: identifier },
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

    res.status(201).json(newShare.user);
  } catch (err) {
    console.error('Error sharing car:', err);
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

    await prisma.carShare.delete({
      where: {
        car_id_user_id: {
          car_id: Number(carId),
          user_id: Number(targetUserId),
        },
      },
    });

    res.json({ message: 'Acceso revocado correctamente' });
  } catch (err) {
    console.error('Error unsharing car:', err);
    res.status(500).json({ message: 'Error al revocar el acceso' });
  }
}
