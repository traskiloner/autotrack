import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../db';
import { sendNewAlertEmail } from '../services/emailService';

export async function getUserAlerts(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  try {
    const alerts = await prisma.maintenanceAlert.findMany({
      where: {
        is_completed: false,
        car: {
          OR: [
            { user_id: userId },
            { shares: { some: { user_id: userId } } }
          ]
        },
      },
      include: {
        car: {
          select: {
            brand: true,
            model: true,
            license_plate: true,
            mileage: true,
          },
        },
      },
      orderBy: [
        { target_date: 'asc' },
        { target_mileage: 'asc' },
      ],
    });

    const flattened = alerts.map((a) => ({
      id: a.id,
      car_id: a.car_id,
      description: a.description,
      target_date: a.target_date,
      target_mileage: a.target_mileage,
      is_completed: a.is_completed,
      created_at: a.created_at,
      brand: a.car?.brand,
      model: a.car?.model,
      license_plate: a.car?.license_plate,
      current_mileage: a.car?.mileage,
    }));

    res.json(flattened);
  } catch (err) {
    console.error('Error fetching global alerts:', err);
    res.status(500).json({ message: 'Error al obtener las alertas globales' });
  }
}

export async function getCarAlerts(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;

  try {
    // Check car ownership
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

    const alerts = await prisma.maintenanceAlert.findMany({
      where: {
        car_id: Number(carId),
      },
      orderBy: [
        { is_completed: 'asc' },
        { target_date: 'asc' },
        { target_mileage: 'asc' },
      ],
    });
    res.json(alerts);
  } catch (err) {
    console.error('Error fetching car alerts:', err);
    res.status(500).json({ message: 'Error al obtener las alertas' });
  }
}

export async function createAlert(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const carId = req.params.carId;
  const { description, targetDate, targetMileage } = req.body;

  if (!description) {
    return res.status(400).json({ message: 'La descripción de la alerta es obligatoria' });
  }

  if (!targetDate && !targetMileage) {
    return res.status(400).json({ message: 'Debes introducir una fecha o un kilometraje objetivo' });
  }

  try {
    // Check car ownership and fetch owner and shared users
    const carCheck = await prisma.car.findFirst({
      where: {
        id: Number(carId),
        OR: [
          { user_id: userId },
          { shares: { some: { user_id: userId } } }
        ]
      },
      include: {
        user: true,
        shares: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!carCheck) {
      return res.status(403).json({ message: 'No tienes permiso para modificar este coche' });
    }

    const alert = await prisma.maintenanceAlert.create({
      data: {
        car_id: Number(carId),
        description,
        target_date: targetDate ? new Date(targetDate) : null,
        target_mileage: targetMileage ? Number(targetMileage) : null,
      },
    });

    // Send email notifications asynchronously
    const carInfo = `${carCheck.brand} ${carCheck.model} (${carCheck.license_plate})`;
    const targetDateStr = targetDate ? new Date(targetDate).toLocaleDateString('es-ES') : '';
    const targetMileageStr = targetMileage ? `${targetMileage} km` : '';
    
    let criteria = '';
    if (targetDateStr && targetMileageStr) {
      criteria = ` (Para: ${targetDateStr} o ${targetMileageStr})`;
    } else if (targetDateStr) {
      criteria = ` (Para: ${targetDateStr})`;
    } else if (targetMileageStr) {
      criteria = ` (Para: ${targetMileageStr})`;
    }
    
    const alertInfo = `${description}${criteria}`;

    // Notify owner
    if (carCheck.user) {
      sendNewAlertEmail(carCheck.user.email, carCheck.user.username, carInfo, alertInfo).catch(err => {
        console.error('Error sending alert email to owner:', err);
      });
    }

    // Notify shared users
    if (carCheck.shares) {
      for (const share of carCheck.shares) {
        if (share.user) {
          sendNewAlertEmail(share.user.email, share.user.username, carInfo, alertInfo).catch(err => {
            console.error('Error sending alert email to shared user:', err);
          });
        }
      }
    }

    res.status(201).json(alert);
  } catch (err) {
    console.error('Error creating alert:', err);
    res.status(500).json({ message: 'Error al registrar la alerta' });
  }
}

export async function completeAlert(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const alertId = req.params.id;

  try {
    // Verify ownership via join
    const alert = await prisma.maintenanceAlert.findFirst({
      where: {
        id: Number(alertId),
        car: {
          OR: [
            { user_id: userId },
            { shares: { some: { user_id: userId } } }
          ]
        },
      },
    });

    if (!alert) {
      return res.status(403).json({ message: 'No autorizado para modificar esta alerta' });
    }

    const updated = await prisma.maintenanceAlert.update({
      where: {
        id: Number(alertId),
      },
      data: {
        is_completed: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Error completing alert:', err);
    res.status(500).json({ message: 'Error al completar la alerta' });
  }
}

export async function deleteAlert(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const alertId = req.params.id;

  try {
    // Verify ownership via join
    const alert = await prisma.maintenanceAlert.findFirst({
      where: {
        id: Number(alertId),
        car: {
          OR: [
            { user_id: userId },
            { shares: { some: { user_id: userId } } }
          ]
        },
      },
    });

    if (!alert) {
      return res.status(403).json({ message: 'No autorizado para eliminar esta alerta' });
    }

    await prisma.maintenanceAlert.delete({
      where: {
        id: Number(alertId),
      },
    });

    res.json({ message: 'Alerta eliminada correctamente' });
  } catch (err) {
    console.error('Error deleting alert:', err);
    res.status(500).json({ message: 'Error al eliminar la alerta' });
  }
}
