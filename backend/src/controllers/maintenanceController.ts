import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../db';

interface PartInput {
  partName: string;
  brand?: string;
  partNumber?: string;
  quantity?: number;
  price?: number;
  inventoryPartId?: number;
}

export async function getMaintenances(req: AuthenticatedRequest, res: Response) {
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

    // Get maintenances and their parts
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

    res.json(maintenances);
  } catch (err) {
    console.error('Error fetching maintenances:', err);
    res.status(500).json({ message: 'Error al obtener los mantenimientos' });
  }
}

export async function createMaintenance(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;
  const { description, mileage, cost, date, parts, category, documentPath, checklist } = req.body;

  if (!description || !mileage || !date) {
    return res.status(400).json({ message: 'Descripción, kilometraje y fecha son obligatorios' });
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
      // 1. Insert Maintenance
      const maintenance = await tx.maintenance.create({
        data: {
          car_id: Number(carId),
          description,
          mileage: Number(mileage),
          cost: cost ? Number(cost) : 0,
          date: new Date(date),
          category: category || 'Otros',
          document_path: documentPath || null,
          checklist: checklist || [],
        },
      });

      // 2. Insert Parts if any
      const insertedParts: any[] = [];
      if (parts && Array.isArray(parts) && parts.length > 0) {
        for (const part of parts as PartInput[]) {
          if (!part.partName) continue;

          const newPart = await tx.part.create({
            data: {
              maintenance_id: maintenance.id,
              part_name: part.partName,
              brand: part.brand || null,
              part_number: part.partNumber || null,
              quantity: part.quantity ? Number(part.quantity) : 1,
              price: part.price ? Number(part.price) : 0,
              inventory_part_id: part.inventoryPartId || null,
            },
          });
          insertedParts.push(newPart);

          // Decrement inventory stock if linked
          if (part.inventoryPartId) {
            const inventoryPart = await tx.inventoryPart.findUnique({
              where: { id: Number(part.inventoryPartId) },
            });
            if (inventoryPart && inventoryPart.user_id === userId) {
              const currentStock = inventoryPart.stock || 0;
              const sub = part.quantity ? Number(part.quantity) : 1;
              await tx.inventoryPart.update({
                where: { id: Number(part.inventoryPartId) },
                data: {
                  stock: Math.max(0, currentStock - sub),
                },
              });
            }
          }
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
        parts: insertedParts,
      };
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating maintenance:', err);
    res.status(500).json({ message: 'Error al registrar el mantenimiento' });
  }
}

export async function deleteMaintenance(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const maintenanceId = req.params.id;

  try {
    // Verify ownership via join
    const maintCheck = await prisma.maintenance.findFirst({
      where: {
        id: Number(maintenanceId),
        car: {
          user_id: userId,
        },
      },
      include: {
        parts: true,
      },
    });

    if (!maintCheck) {
      return res.status(403).json({ message: 'No autorizado para eliminar este mantenimiento' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Restore stock for each linked part
      for (const part of maintCheck.parts) {
        if (part.inventory_part_id) {
          await tx.inventoryPart.update({
            where: { id: Number(part.inventory_part_id) },
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
    });

    res.json({ message: 'Mantenimiento eliminado correctamente' });
  } catch (err) {
    console.error('Error deleting maintenance:', err);
    res.status(500).json({ message: 'Error al eliminar el mantenimiento' });
  }
}

export async function getAllMaintenances(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  try {
    const maintenances = await prisma.maintenance.findMany({
      where: {
        car: {
          user_id: userId,
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
      mileage: m.mileage,
      cost: m.cost,
      date: m.date,
      category: m.category,
      document_path: m.document_path,
      checklist: m.checklist,
      created_at: m.created_at,
      brand: m.car?.brand,
      model: m.car?.model,
      license_plate: m.car?.license_plate,
    }));

    res.json(flattened);
  } catch (err) {
    console.error('Error fetching all user maintenances:', err);
    res.status(500).json({ message: 'Error al obtener los mantenimientos' });
  }
}
