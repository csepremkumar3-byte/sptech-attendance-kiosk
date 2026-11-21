import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import sequelize from './config/database.js';
import './models/index.js';
import apiRouter from './routes/api.js';
import * as bonusCtrl from './controllers/bonusController.js';
import { authenticate, requireAdmin } from './middleware/auth.js';
import { seedInitialData } from './utils/seeder.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Generous limit for JSON payloads (to receive facial embeddings/data)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Serve uploaded salary slips and static files
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dialect: process.env.DB_DIALECT || 'sqlite',
    service: 'SPTech Attendance & Payroll Kiosk Backend'
  });
});

// API Routes
app.use('/api', apiRouter);

// Direct root aliases for Bonus (prevents 404 regardless of route prefixing)
app.get('/bonus', authenticate, requireAdmin, bonusCtrl.calculateBonus);
app.get('/bonus/calculate', authenticate, requireAdmin, bonusCtrl.calculateBonus);
app.get('/bonus/export', authenticate, requireAdmin, bonusCtrl.exportBonusCsv);

// Serve Frontend SPA build (if built)
const candidateDists = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(__dirname, './frontend/dist'),
];
const frontendDist = candidateDists.find(p => fs.existsSync(p)) || candidateDists[0];
app.use(express.static(frontendDist));

// Catch-all route to serve SPA index.html for client-side routing (prevents 404 on refresh)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `API endpoint ${req.path} not found` });
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Database Synchronization & Server Startup
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log(`✓ Database connected (${process.env.DB_DIALECT || 'sqlite'})`);

    // Sync schema
    await sequelize.sync();
    console.log('✓ Database tables synchronized');

    // Run Initial Seed
    await seedInitialData();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  SPTech AI Attendance & Payroll API running on port ${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/health`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
