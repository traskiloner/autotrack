import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../db';

interface FuelInput {
  date: Date;
  mileage: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  isFullTank: boolean;
}

/**
 * Validates and normalizes a fuel log payload.
 * Returns either the parsed data or an error message.
 */
function parseFuelInput(body: any): { data?: FuelInput; error?: string } {
  const { date, mileage, liters, pricePerLiter, totalCost, isFullTank } = body || {};

  if (!date || mileage === undefined || liters === undefined || pricePerLiter === undefined) {
    return { error: 'Fecha, kilometraje, litros y precio por litro son obligatorios' };
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return { error: 'La fecha no es válida' };
  }

  const m = Number(mileage);
  const l = Number(liters);
  const p = Number(pricePerLiter);
  if (!Number.isFinite(m) || !Number.isInteger(m) || m < 0) {
    return { error: 'El kilometraje debe ser un número entero positivo' };
  }
  if (!Number.isFinite(l) || l <= 0) {
    return { error: 'Los litros deben ser un número mayor que 0' };
  }
  if (!Number.isFinite(p) || p <= 0) {
    return { error: 'El precio por litro debe ser un número mayor que 0' };
  }

  let total = Number((l * p).toFixed(2));
  if (totalCost !== undefined && totalCost !== null && totalCost !== '') {
    const t = Number(totalCost);
    if (!Number.isFinite(t) || t < 0) {
      return { error: 'El coste total no es válido' };
    }
    total = t;
  }

  return {
    data: {
      date: parsedDate,
      mileage: m,
      liters: l,
      pricePerLiter: p,
      totalCost: total,
      isFullTank: isFullTank !== undefined ? Boolean(isFullTank) : true,
    },
  };
}

export async function getCarFuelLogs(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;

  try {
    // Verify car ownership first
    const carCheck = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        OR: [
          { user_id: userId },
          { shares: { some: { user_id: userId } } }
        ]
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
  const parsed = parseFuelInput(req.body);
  if (!parsed.data) {
    return res.status(400).json({ message: parsed.error });
  }
  const input = parsed.data;

  try {
    // Verify car ownership
    const carCheck = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        OR: [
          { user_id: userId },
          { shares: { some: { user_id: userId } } }
        ]
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
          date: input.date,
          mileage: input.mileage,
          liters: input.liters,
          price_per_liter: input.pricePerLiter,
          total_cost: input.totalCost,
          is_full_tank: input.isFullTank,
        },
      });

      // 2. Update Car Mileage if the fuel log mileage is higher
      if (input.mileage > currentCarMileage) {
        await tx.car.update({
          where: { id: Number(carId) },
          data: {
            mileage: input.mileage,
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

export async function updateFuelLog(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const logId = req.params.id;

  const parsed = parseFuelInput(req.body);
  if (!parsed.data) {
    return res.status(400).json({ message: parsed.error });
  }
  const input = parsed.data;

  try {
    const logCheck = await prisma.fuelLog.findFirst({
      where: {
        id: Number(logId),
        car: {
          OR: [
            { user_id: userId },
            { shares: { some: { user_id: userId } } }
          ]
        },
      },
      include: { car: true },
    });

    if (!logCheck) {
      return res.status(403).json({ message: 'No autorizado para editar este repostaje' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const log = await tx.fuelLog.update({
        where: { id: Number(logId) },
        data: {
          date: input.date,
          mileage: input.mileage,
          liters: input.liters,
          price_per_liter: input.pricePerLiter,
          total_cost: input.totalCost,
          is_full_tank: input.isFullTank,
        },
      });

      if (input.mileage > (logCheck.car.mileage || 0)) {
        await tx.car.update({
          where: { id: logCheck.car_id },
          data: { mileage: input.mileage },
        });
      }

      return log;
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating fuel log:', err);
    res.status(500).json({ message: 'Error al actualizar el repostaje' });
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
          OR: [
            { user_id: userId },
            { shares: { some: { user_id: userId } } }
          ]
        },
      },
    });

    if (!logCheck) {
      return res.status(403).json({ message: 'No autorizado para eliminar este repostaje' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.fuelLog.delete({
        where: {
          id: Number(logId),
        },
      });

      // If this log was what set the car's current mileage, fall back to the
      // highest remaining known mileage (other fuel logs or maintenances).
      const car = await tx.car.findUnique({ where: { id: logCheck.car_id } });
      if (car && (car.mileage || 0) === logCheck.mileage) {
        const [fuelMax, maintMax] = await Promise.all([
          tx.fuelLog.aggregate({ where: { car_id: car.id }, _max: { mileage: true } }),
          tx.maintenance.aggregate({ where: { car_id: car.id }, _max: { mileage: true } }),
        ]);
        const candidates = [fuelMax._max.mileage, maintMax._max.mileage].filter(
          (v): v is number => typeof v === 'number'
        );
        if (candidates.length > 0) {
          await tx.car.update({
            where: { id: car.id },
            data: { mileage: Math.max(...candidates) },
          });
        }
      }
    });

    res.json({ message: 'Repostaje eliminado correctamente' });
  } catch (err) {
    console.error('Error deleting fuel log:', err);
    res.status(500).json({ message: 'Error al eliminar el repostaje' });
  }
}
