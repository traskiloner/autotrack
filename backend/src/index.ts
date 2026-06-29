import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { initDb } from './db';
import { register, login, updateProfile, sendTestEmailHandler, refresh, deleteAccount } from './controllers/authController';
import { getCars, getCarById, createCar, updateCar, deleteCar, getCarShares, shareCar, unshareCar } from './controllers/carController';
import { getMaintenances, createMaintenance, deleteMaintenance, getAllMaintenances } from './controllers/maintenanceController';
import { getInventory, createInventoryPart, updateInventoryPart, deleteInventoryPart } from './controllers/inventoryController';
import { getUserAlerts, getCarAlerts, createAlert, completeAlert, deleteAlert } from './controllers/alertController';
import { upload, handleUpload } from './controllers/uploadController';
import { getCarFuelLogs, createFuelLog, deleteFuelLog } from './controllers/fuelController';
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
  adminTransferCarOwner
} from './controllers/adminController';

dotenv.config();

// Production security enforcement
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'super_secret_key_change_me_123') {
    console.error('[CRITICAL] JWT_SECRET must be configured with a secure value in production.');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5001;

// Trust first proxy hop (e.g. Nginx, Portainer, etc.)
app.set('trust proxy', 1);

// Apply Helmet headers for security
app.use(helmet());

// Restrict CORS origins in production
app.use(cors({
  origin: ['https://autotrack.traskiloner.com', 'http://localhost:4080', 'http://localhost', 'capacitor://localhost'],
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configure rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { message: 'Demasiadas peticiones desde esta IP. Por favor, inténtelo de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth Routes (Rate Limited)
app.post('/api/auth/register', authLimiter, register);
app.post('/api/auth/login', authLimiter, login);
app.post('/api/auth/refresh', refresh);
app.put('/api/users/profile', authMiddleware, updateProfile);
app.delete('/api/users/profile', authMiddleware, deleteAccount);
app.post('/api/users/test-email', authLimiter, authMiddleware, adminMiddleware, sendTestEmailHandler);


// Admin Routes
app.get('/api/admin/setup-check', checkAdminSetup);
app.post('/api/admin/setup', setupInitialAdmin);
app.get('/api/admin/stats', authMiddleware, adminMiddleware, getGlobalStats);
app.get('/api/admin/users', authMiddleware, adminMiddleware, getAllUsers);
app.post('/api/admin/users', authMiddleware, adminMiddleware, adminCreateUser);
app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, adminUpdateUser);
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, adminDeleteUser);
app.get('/api/admin/cars', authMiddleware, adminMiddleware, getAllCars);
app.put('/api/admin/cars/:id/transfer', authMiddleware, adminMiddleware, adminTransferCarOwner);

// Car Routes (Protected)
app.get('/api/cars', authMiddleware, getCars);
app.get('/api/cars/:id', authMiddleware, getCarById);
app.post('/api/cars', authMiddleware, createCar);
app.put('/api/cars/:id', authMiddleware, updateCar);
app.delete('/api/cars/:id', authMiddleware, deleteCar);
app.get('/api/cars/:carId/shares', authMiddleware, getCarShares);
app.post('/api/cars/:carId/share', authMiddleware, shareCar);
app.delete('/api/cars/:carId/share/:userId', authMiddleware, unshareCar);

// Maintenance Routes (Protected)
app.get('/api/maintenances', authMiddleware, getAllMaintenances);
app.get('/api/cars/:carId/maintenance', authMiddleware, getMaintenances);
app.post('/api/cars/:carId/maintenance', authMiddleware, createMaintenance);
app.delete('/api/maintenance/:id', authMiddleware, deleteMaintenance);

// Inventory Routes (Protected)
app.get('/api/inventory', authMiddleware, getInventory);
app.post('/api/inventory', authMiddleware, createInventoryPart);
app.put('/api/inventory/:id', authMiddleware, updateInventoryPart);
app.delete('/api/inventory/:id', authMiddleware, deleteInventoryPart);

// Alert Routes (Protected)
app.get('/api/alerts', authMiddleware, getUserAlerts);
app.get('/api/cars/:carId/alerts', authMiddleware, getCarAlerts);
app.post('/api/cars/:carId/alerts', authMiddleware, createAlert);
app.put('/api/alerts/:id/complete', authMiddleware, completeAlert);
app.delete('/api/alerts/:id', authMiddleware, deleteAlert);

// Fuel Routes (Protected)
app.get('/api/cars/:carId/fuel', authMiddleware, getCarFuelLogs);
app.post('/api/cars/:carId/fuel', authMiddleware, createFuelLog);
app.delete('/api/fuel/:id', authMiddleware, deleteFuelLog);

// Upload Route (Protected)
app.post('/api/upload', authMiddleware, upload.single('file'), handleUpload);


// Error handling middleware for Multer and general errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError || err.message === 'Solo se permiten imágenes (JPEG/PNG) y documentos PDF.') {
    return res.status(400).json({ message: err.message });
  }
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server after DB init
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
