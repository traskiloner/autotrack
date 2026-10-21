import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../db';
import { deleteUploadedFile } from './uploadController';
import { logger } from '../logger';

interface PartInput {
  partName: string;
  brand?: string;
  partNumber?: string;
  quantity?: number;
  price?: number;
  inventoryPartId?: number;
}

function normalizeChecklist(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter((item) => typeof item === 'string');
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string');
    } catch {
      return [];
    }
  }
  return [];
}

export async function getMaintenances(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;

  try {
    const carCheck = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        OR: [
          { user_id: userId },
          { shares: { some: { user_id: userId } } },
        ],
      },
    });

    if (!carCheck) {
      return res.status(403).json({ message: 'No tienes permiso para ver este coche' });
    }

    const maintenances = await prisma.maintenance.findMany({
      where: {
        car_id: Number(carId),
      },
      include: {
        parts: true,
      },
      orderBy: [
        { date: 'desc' },
        { created_at: 'desc' },
      ],
    });

    const parsed = maintenances.map((m) => ({
      ...m,
      checklist: normalizeChecklist(m.checklist),
    }));

    res.json(parsed);
  } catch (err) {
    logger.error({ err }, 'Error fetching maintenances');
    res.status(500).json({ message: 'Error al obtener los mantenimientos' });
  }
}

export async function createMaintenance(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;
  const { description, details, mileage, cost, date, parts, category, documentPath, checklist } = req.body;

  if (!description || !mileage || !date) {
    return res.status(400).json({ message: 'Descripción, kilometraje y fecha son obligatorios' });
  }

  try {
    const carCheck = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        OR: [
          { user_id: userId },
          { shares: { some: { user_id: userId, can_edit: true } } },
        ],
      },
    });

    if (!carCheck) {
      return res.status(403).json({ message: 'No tienes permiso para modificar este coche' });
    }

    const currentCarMileage = carCheck.mileage || 0;
    const cleanChecklist = normalizeChecklist(checklist);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Insert Maintenance
      const maintenance = await tx.maintenance.create({
        data: {
          car_id: Number(carId),
          description,
          details: details || null,
          mileage: Number(mileage),
          cost: cost ? Number(cost) : 0,
          date: new Date(date),
          category: category || 'Otros',
          document_path: documentPath || null,
          checklist: cleanChecklist,
        },
      });

      // 2. Insert Parts if any
      const insertedParts: any[] = [];
      if (parts && Array.isArray(parts) && parts.length > 0) {
        for (const part of parts as PartInput[]) {
          if (!part.partName) continue;

          // Prevent IDOR: only link to inventory if the inventory part belongs to the user or car owner
          let validInventoryPartId: number | null = null;
          if (part.inventoryPartId) {
            const inventoryPart = await tx.inventoryPart.findFirst({
              where: {
                id: Number(part.inventoryPartId),
                user_id: { in: [userId!, carCheck.user_id] },
              },
            });

            if (inventoryPart) {
              validInventoryPartId = inventoryPart.id;
              const sub = part.quantity ? Number(part.quantity) : 1;
              await tx.inventoryPart.update({
                where: { id: inventoryPart.id },
                data: {
                  stock: Math.max(0, (inventoryPart.stock || 0) - sub),
                },
              });
            }
          }

          const newPart = await tx.part.create({
            data: {
              maintenance_id: maintenance.id,
              part_name: part.partName,
              brand: part.brand || null,
              part_number: part.partNumber || null,
              quantity: part.quantity ? Number(part.quantity) : 1,
              price: part.price ? Number(part.price) : 0,
              inventory_part_id: validInventoryPartId,
            },
          });
          insertedParts.push(newPart);
        }
      }

      // 3. Update Car Mileage if the maintenance mileage is higher
      if (Number(mileage) > currentCarMileage) {
        await tx.car.update({
          where: { id: Number(carId) },
          data: {
            mileage: Number(mileage),
          },
        });
      }

      return {
        ...maintenance,
        checklist: cleanChecklist,
        parts: insertedParts,
      };
    });

    res.status(201).json(result);
  } catch (err) {
    logger.error({ err }, 'Error creating maintenance');
    res.status(500).json({ message: 'Error al registrar el mantenimiento' });
  }
}

export async function deleteMaintenance(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const maintenanceId = req.params.id;

  try {
    const maintCheck = await prisma.maintenance.findFirst({
      where: {
        id: Number(maintenanceId),
        car: {
          OR: [
            { user_id: userId },
            { shares: { some: { user_id: userId, can_edit: true } } },
          ],
        },
      },
      include: {
        car: true,
        parts: true,
      },
    });

    if (!maintCheck) {
      return res.status(403).json({ message: 'No autorizado para eliminar este mantenimiento' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Safely restore stock for each linked part owned by the user or car owner
      for (const part of maintCheck.parts) {
        if (part.inventory_part_id) {
          await tx.inventoryPart.updateMany({
            where: {
              id: Number(part.inventory_part_id),
              user_id: { in: [userId!, maintCheck.car.user_id] },
            },
            data: {
              stock: {
                increment: part.quantity || 1,
              },
            },
          });
        }
      }

      // 2. Delete maintenance
      await tx.maintenance.delete({
        where: {
          id: Number(maintenanceId),
        },
      });

      // 3. If this maintenance set the car's mileage, fall back to highest remaining
      const car = await tx.car.findUnique({ where: { id: maintCheck.car_id } });
      if (car && (car.mileage || 0) === maintCheck.mileage) {
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

    deleteUploadedFile(maintCheck.document_path);

    res.json({ message: 'Mantenimiento eliminado correctamente' });
  } catch (err) {
    logger.error({ err }, 'Error deleting maintenance');
    res.status(500).json({ message: 'Error al eliminar el mantenimiento' });
  }
}

export async function getAllMaintenances(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  try {
    const maintenances = await prisma.maintenance.findMany({
      where: {
        car: {
          OR: [
            { user_id: userId },
            { shares: { some: { user_id: userId } } },
          ],
        },
      },
      include: {
        car: {
          select: {
            brand: true,
            model: true,
            license_plate: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { created_at: 'desc' },
      ],
    });

    const flattened = maintenances.map((m) => ({
      id: m.id,
      car_id: m.car_id,
      description: m.description,
      details: m.details,
      mileage: m.mileage,
      cost: m.cost,
      date: m.date,
      category: m.category,
      document_path: m.document_path,
      checklist: normalizeChecklist(m.checklist),
      created_at: m.created_at,
      brand: m.car?.brand,
      model: m.car?.model,
      license_plate: m.car?.license_plate,
    }));

    res.json(flattened);
  } catch (err) {
    logger.error({ err }, 'Error fetching all user maintenances');
    res.status(500).json({ message: 'Error al obtener los mantenimientos' });
  }
}

export async function updateMaintenance(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const maintenanceId = req.params.id;
  const { description, details, mileage, cost, date, category, documentPath, checklist } = req.body;

  if (!description || !mileage || !date) {
    return res.status(400).json({ message: 'Descripción, kilometraje y fecha son obligatorios' });
  }

  try {
    const maintCheck = await prisma.maintenance.findFirst({
      where: {
        id: Number(maintenanceId),
        car: {
          OR: [
            { user_id: userId },
            { shares: { some: { user_id: userId, can_edit: true } } },
          ],
        },
      },
    });

    if (!maintCheck) {
      return res.status(403).json({ message: 'No autorizado para editar este mantenimiento' });
    }

    const cleanChecklist = normalizeChecklist(checklist);

    const updatedMaintenance = await prisma.maintenance.update({
      where: {
        id: Number(maintenanceId),
      },
      data: {
        description,
        details: details || null,
        mileage: Number(mileage),
        cost: cost ? Number(cost) : 0,
        date: new Date(date),
        category: category || 'Otros',
        document_path: documentPath || null,
        checklist: cleanChecklist,
      },
    });

    // Remove the previous document if it was removed or replaced
    if (maintCheck.document_path && maintCheck.document_path !== (documentPath || null)) {
      deleteUploadedFile(maintCheck.document_path);
    }

    res.json({
      ...updatedMaintenance,
      checklist: cleanChecklist,
    });
  } catch (err) {
    logger.error({ err }, 'Error updating maintenance');
    res.status(500).json({ message: 'Error al actualizar el mantenimiento' });
  }
}
