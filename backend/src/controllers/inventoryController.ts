import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../db';

export async function getInventory(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  try {
    const parts = await prisma.inventoryPart.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        name: 'asc',
      },
    });
    res.json(parts);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ message: 'Error al obtener el inventario' });
  }
}

export async function createInventoryPart(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { name, brand, partNumber, price, stock, purchaseUrl } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'El nombre de la pieza es obligatorio' });
  }

  try {
    const part = await prisma.inventoryPart.create({
      data: {
        user_id: userId,
        name,
        brand: brand || null,
        part_number: partNumber || null,
        price: price !== undefined ? Number(price) : 0,
        stock: stock !== undefined ? Number(stock) : 0,
        purchase_url: purchaseUrl || null,
      },
    });
    res.status(201).json(part);
  } catch (err) {
    console.error('Error creating inventory part:', err);
    res.status(500).json({ message: 'Error al registrar la pieza en el inventario' });
  }
}

export async function updateInventoryPart(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const partId = req.params.id;
  const { name, brand, partNumber, price, stock, purchaseUrl } = req.body;

  try {
    // Check ownership
    const checkOwnership = await prisma.inventoryPart.findFirst({
      where: {
        id: Number(partId),
        user_id: userId,
      },
    });

    if (!checkOwnership) {
      return res.status(404).json({ message: 'Pieza no encontrada o no autorizada' });
    }

    const updated = await prisma.inventoryPart.update({
      where: {
        id: Number(partId),
      },
      data: {
        name: name !== undefined ? name : undefined,
        brand: brand !== undefined ? brand : undefined,
        part_number: partNumber !== undefined ? partNumber : undefined,
        price: price !== undefined ? Number(price) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
        purchase_url: purchaseUrl !== undefined ? (purchaseUrl || null) : undefined,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating inventory part:', err);
    res.status(500).json({ message: 'Error al actualizar la pieza del inventario' });
  }
}

export async function deleteInventoryPart(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const partId = req.params.id;

  try {
    const checkOwnership = await prisma.inventoryPart.findFirst({
      where: {
        id: Number(partId),
        user_id: userId,
      },
    });

    if (!checkOwnership) {
      return res.status(404).json({ message: 'Pieza no encontrada o no autorizada' });
    }

    await prisma.inventoryPart.delete({
      where: {
        id: Number(partId),
      },
    });

    res.json({ message: 'Pieza eliminada correctamente del inventario' });
  } catch (err) {
    console.error('Error deleting inventory part:', err);
    res.status(500).json({ message: 'Error al eliminar la pieza' });
  }
}
