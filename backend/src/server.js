import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
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
  contentSecurityPolicy: false,
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
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
];
const frontendDist = candidateDists.find(p => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) || candidateDists[0];
console.log(`✓ Serving frontend from: ${frontendDist} (valid index.html: ${fs.existsSync(path.join(frontendDist, 'index.html'))})`);

// Permanent Anti-Stale Cache Solution
app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  const swPath = path.join(frontendDist, 'sw.js');
  if (fs.existsSync(swPath)) {
    return res.sendFile(swPath);
  }
  res.status(404).send('SW not found');
});

// Serve assets with immutable cache (they have unique content hashes)
app.use('/assets', express.static(path.join(frontendDist, 'assets'), {
  maxAge: '1y',
  immutable: true
}));

app.use(express.static(frontendDist, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Catch-all route to serve SPA index.html for client-side routing (prevents 404 on refresh)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: `API endpoint ${req.path} not found` });
  }
  const indexPath = path.join(frontendDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    // ALWAYS serve index.html with NO CACHE so users always get new deployments instantly
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return res.sendFile(indexPath);
  }
  return res.status(404).send('Frontend build not found. Please build frontend first.');
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

    // Sync schema with auto-migration for added columns
    await sequelize.sync({ alter: true });
    console.log('✓ Database tables synchronized');

    // Run Initial Seed
    await seedInitialData();

    // Check if SSL certificates exist (Let's Encrypt production mode)
    const sslKeyCandidates = [
      '/etc/letsencrypt/live/facex.sp-tech.in/privkey.pem',
      path.resolve(process.cwd(), 'ssl/privkey.pem'),
    ];
    const sslCertCandidates = [
      '/etc/letsencrypt/live/facex.sp-tech.in/fullchain.pem',
      path.resolve(process.cwd(), 'ssl/fullchain.pem'),
    ];

    const sslKeyPath = sslKeyCandidates.find(p => fs.existsSync(p));
    const sslCertPath = sslCertCandidates.find(p => fs.existsSync(p));

    if (sslKeyPath && sslCertPath) {
      const sslOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      };

      // Start HTTPS Server on Port 443
      https.createServer(sslOptions, app).listen(443, () => {
        console.log(`====================================================`);
        console.log(`  ✓ SPTech HTTPS Server active on port 443`);
        console.log(`  ✓ Secure Kiosk: https://facex.sp-tech.in/kiosk`);
        console.log(`====================================================`);
      });

      // Redirect HTTP (Port 80) to HTTPS (Port 443)
      http.createServer((req, res) => {
        const host = req.headers.host ? req.headers.host.split(':')[0] : 'facex.sp-tech.in';
        res.writeHead(301, { Location: `https://${host}${req.url}` });
        res.end();
      }).listen(80, () => {
        console.log(`  ✓ HTTP Port 80 redirecting traffic to HTTPS 443`);
      });
    } else {
      app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`  SPTech AI Attendance & Payroll API running on port ${PORT}`);
        console.log(`  Health Check: http://localhost:${PORT}/health`);
        console.log(`====================================================`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start the HTTP server if running directly (not imported by AWS Lambda or tests)
if (!process.env.AWS_EXECUTION_ENV && process.argv[1] && process.argv[1].includes('server.js')) {
  startServer();
}

export { app, startServer };
