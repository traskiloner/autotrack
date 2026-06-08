import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDb } from './db';
import { register, login } from './controllers/authController';
import { getCars, getCarById, createCar, updateCar, deleteCar } from './controllers/carController';
import { getMaintenances, createMaintenance, deleteMaintenance, getAllMaintenances } from './controllers/maintenanceController';
import { getInventory, createInventoryPart, updateInventoryPart, deleteInventoryPart } from './controllers/inventoryController';
import { getUserAlerts, getCarAlerts, createAlert, completeAlert, deleteAlert } from './controllers/alertController';
import { upload, handleUpload } from './controllers/uploadController';
import { getCarFuelLogs, createFuelLog, deleteFuelLog } from './controllers/fuelController';
import { authMiddleware } from './middlewares/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors({
  origin: '*', // Allow all origins for simplicity in development (Docker container orchestration)
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Auth Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Car Routes (Protected)
app.get('/api/cars', authMiddleware, getCars);
app.get('/api/cars/:id', authMiddleware, getCarById);
app.post('/api/cars', authMiddleware, createCar);
app.put('/api/cars/:id', authMiddleware, updateCar);
app.delete('/api/cars/:id', authMiddleware, deleteCar);

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
