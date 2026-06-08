import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../db';

export async function getCarFuelLogs(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;

  try {
    // Verify car ownership first
    const carCheck = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        user_id: userId,
      },
    });

    if (!carCheck) {
      return res.status(403).json({ message: 'No tienes permiso para ver este coche' });
    }

    const logs = await prisma.fuelLog.findMany({
      where: {
        car_id: Number(carId),
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json(logs);
  } catch (err) {
    console.error('Error fetching fuel logs:', err);
    res.status(500).json({ message: 'Error al obtener los registros de combustible' });
  }
}

export async function createFuelLog(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;
  const { date, mileage, liters, pricePerLiter, totalCost, isFullTank } = req.body;

  if (!date || mileage === undefined || liters === undefined || pricePerLiter === undefined) {
    return res.status(400).json({ message: 'Fecha, kilometraje, litros y precio por litro son obligatorios' });
  }

  try {
    // Verify car ownership
    const carCheck = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        user_id: userId,
      },
    });

    if (!carCheck) {
      return res.status(403).json({ message: 'No tienes permiso para modificar este coche' });
    }

    const currentCarMileage = carCheck.mileage || 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create fuel log
      const log = await tx.fuelLog.create({
        data: {
          car_id: Number(carId),
          date: new Date(date),
          mileage: Number(mileage),
          liters: Number(liters),
          price_per_liter: Number(pricePerLiter),
          total_cost: totalCost !== undefined ? Number(totalCost) : Number((Number(liters) * Number(pricePerLiter)).toFixed(2)),
          is_full_tank: isFullTank !== undefined ? Boolean(isFullTank) : true,
        },
      });

      // 2. Update Car Mileage if the fuel log mileage is higher
      if (Number(mileage) > currentCarMileage) {
        await tx.car.update({
          where: { id: Number(carId) },
          data: {
            mileage: Number(mileage),
          },
        });
      }

      return log;
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating fuel log:', err);
    res.status(500).json({ message: 'Error al registrar el repostaje' });
  }
}

export async function deleteFuelLog(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const logId = req.params.id;

  try {
    // Verify ownership via join
    const logCheck = await prisma.fuelLog.findFirst({
      where: {
        id: Number(logId),
        car: {
          user_id: userId,
        },
      },
    });

    if (!logCheck) {
      return res.status(403).json({ message: 'No autorizado para eliminar este repostaje' });
    }

    await prisma.fuelLog.delete({
      where: {
        id: Number(logId),
      },
    });

    res.json({ message: 'Repostaje eliminado correctamente' });
  } catch (err) {
    console.error('Error deleting fuel log:', err);
    res.status(500).json({ message: 'Error al eliminar el repostaje' });
  }
}
