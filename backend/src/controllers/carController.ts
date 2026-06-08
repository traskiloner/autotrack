import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../db';

export async function getCars(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  try {
    const cars = await prisma.car.findMany({
      where: { user_id: userId },
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
        user_id: userId,
      },
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
