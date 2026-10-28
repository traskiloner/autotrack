import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { ZodError } from 'zod';
import { initDb, pool, prisma } from './db';
import { config } from './config';
import { logger } from './logger';
import { HttpError } from './lib/http';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  updateProfileSchema,
  carSchema,
  carUpdateSchema,
  shareCarSchema,
  maintenanceSchema,
  inventoryPartSchema,
  inventoryPartUpdateSchema,
  alertSchema,
  fuelLogSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  transferCarSchema,
  sharePermissionSchema,
} from '@autotrack/shared';
import { validateBody } from './middlewares/validate';
import {
  register,
  login,
  updateProfile,
  sendTestEmailHandler,
  refresh,
  deleteAccount,
} from './controllers/authController';
import {
  getCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
  getCarShares,
  shareCar,
  unshareCar,
  updateCarShare,
} from './controllers/carController';
import {
  getMaintenances,
  createMaintenance,
  deleteMaintenance,
  getAllMaintenances,
  updateMaintenance,
} from './controllers/maintenanceController';
import {
  getInventory,
  createInventoryPart,
  updateInventoryPart,
  deleteInventoryPart,
} from './controllers/inventoryController';
import {
  getUserAlerts,
  getCarAlerts,
  createAlert,
  completeAlert,
  deleteAlert,
} from './controllers/alertController';
import { upload, handleUpload, serveUploadedFile } from './controllers/uploadController';
import {
  getCarFuelLogs,
  createFuelLog,
  updateFuelLog,
  deleteFuelLog,
} from './controllers/fuelController';
import { authMiddleware, adminMiddleware } from './middlewares/auth';
import {
  checkAdminSetup,
  setupInitialAdmin,
  getGlobalStats,
  getAllUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  getAllCars,
  adminTransferCarOwner,
} from './controllers/adminController';

const app = express();
const PORT = config.port;

// Trust reverse proxy hops (Nginx, Portainer, Docker network)
app.set('trust proxy', config.trustProxy);

// Security headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        config.corsOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('https://localhost:') ||
        origin === 'capacitor://localhost'
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS no permitido para el origen: ${origin}`));
    },
    credentials: true,
  })
);

// Body parser with size limits
app.use(express.json({ limit: '2mb' }));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Demasiadas peticiones desde esta IP. Por favor, inténtelo de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Demasiadas peticiones de refresco de token.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Demasiadas subidas de archivos desde esta IP.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Secure document viewing endpoint with authentication check
app.get('/uploads/:filename', serveUploadedFile);

// Health check endpoint with database probe
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date() });
  } catch (err: any) {
    logger.error({ err }, 'Health check failed: database unreachable');
    res.status(503).json({ status: 'error', message: 'Database unreachable', timestamp: new Date() });
  }
});

// Auth Routes
app.post('/api/auth/register', authLimiter, validateBody(registerSchema), register);
app.post('/api/auth/login', authLimiter, validateBody(loginSchema), login);
app.post('/api/auth/refresh', refreshLimiter, validateBody(refreshSchema), refresh);
app.put('/api/users/profile', authMiddleware, validateBody(updateProfileSchema), updateProfile);
app.delete('/api/users/profile', authMiddleware, deleteAccount);
app.post('/api/users/test-email', authLimiter, authMiddleware, adminMiddleware, sendTestEmailHandler);

// Admin Routes
app.get('/api/admin/setup-check', checkAdminSetup);
app.post('/api/admin/setup', authLimiter, setupInitialAdmin);
app.get('/api/admin/stats', authMiddleware, adminMiddleware, getGlobalStats);
app.get('/api/admin/users', authMiddleware, adminMiddleware, getAllUsers);
app.post('/api/admin/users', authMiddleware, adminMiddleware, validateBody(adminCreateUserSchema), adminCreateUser);
app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, validateBody(adminUpdateUserSchema), adminUpdateUser);
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, adminDeleteUser);
app.get('/api/admin/cars', authMiddleware, adminMiddleware, getAllCars);
app.put('/api/admin/cars/:id/transfer', authMiddleware, adminMiddleware, validateBody(transferCarSchema), adminTransferCarOwner);

// Car Routes
app.get('/api/cars', authMiddleware, getCars);
app.get('/api/cars/:id', authMiddleware, getCarById);
app.post('/api/cars', authMiddleware, validateBody(carSchema), createCar);
app.put('/api/cars/:id', authMiddleware, validateBody(carUpdateSchema), updateCar);
app.delete('/api/cars/:id', authMiddleware, deleteCar);
app.get('/api/cars/:carId/shares', authMiddleware, getCarShares);
app.post('/api/cars/:carId/share', authMiddleware, validateBody(shareCarSchema), shareCar);
app.put('/api/cars/:carId/share/:userId', authMiddleware, validateBody(sharePermissionSchema), updateCarShare);
app.delete('/api/cars/:carId/share/:userId', authMiddleware, unshareCar);

// Maintenance Routes
app.get('/api/maintenances', authMiddleware, getAllMaintenances);
app.get('/api/cars/:carId/maintenance', authMiddleware, getMaintenances);
app.post('/api/cars/:carId/maintenance', authMiddleware, validateBody(maintenanceSchema), createMaintenance);
app.put('/api/maintenance/:id', authMiddleware, validateBody(maintenanceSchema), updateMaintenance);
app.delete('/api/maintenance/:id', authMiddleware, deleteMaintenance);

// Inventory Routes
app.get('/api/inventory', authMiddleware, getInventory);
app.post('/api/inventory', authMiddleware, validateBody(inventoryPartSchema), createInventoryPart);
app.put('/api/inventory/:id', authMiddleware, validateBody(inventoryPartUpdateSchema), updateInventoryPart);
app.delete('/api/inventory/:id', authMiddleware, deleteInventoryPart);

// Alert Routes
app.get('/api/alerts', authMiddleware, getUserAlerts);
app.get('/api/cars/:carId/alerts', authMiddleware, getCarAlerts);
app.post('/api/cars/:carId/alerts', authMiddleware, validateBody(alertSchema), createAlert);
app.put('/api/alerts/:id/complete', authMiddleware, completeAlert);
app.delete('/api/alerts/:id', authMiddleware, deleteAlert);

// Fuel Routes
app.get('/api/cars/:carId/fuel', authMiddleware, getCarFuelLogs);
app.post('/api/cars/:carId/fuel', authMiddleware, validateBody(fuelLogSchema), createFuelLog);
app.put('/api/fuel/:id', authMiddleware, validateBody(fuelLogSchema), updateFuelLog);
app.delete('/api/fuel/:id', authMiddleware, deleteFuelLog);

// Upload Route
app.post('/api/upload', authMiddleware, uploadLimiter, upload.single('file'), handleUpload);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join('. ');
    return res.status(400).json({ message, details: err.issues });
  }

  if (err instanceof multer.MulterError || err.message === 'Solo se permiten imágenes (JPEG/PNG) y documentos PDF.') {
    return res.status(400).json({ message: err.message });
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled server error');
  res.status(500).json({ message: 'Error interno del servidor' });
});

let server: any = null;

async function startServer() {
  try {
    await initDb();
    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown handling
const handleShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await prisma.$disconnect();
        await pool.end();
        logger.info('Database pool closed.');
      } catch (err) {
        logger.error({ err }, 'Error closing database connections');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
