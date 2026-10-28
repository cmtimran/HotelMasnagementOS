import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/index.js';
import { authMiddleware } from './middleware/authMiddleware.js';
import { tenantMiddleware } from './middleware/tenantMiddleware.js';
import { initDatabase } from './database/db.js';
import { initPostgres } from './database/postgres.js';
import { initRedis } from './services/redis.service.js';
import { broadcastServerEvent } from './routes/realtime.routes.js';

dotenv.config();

// 1. Initialize Sole Database Engine: Cloud PostgreSQL 17
initDatabase().catch((err) => {
  console.error('🚨 PostgreSQL initialization error:', err);
});

// 3. Initialize Redis 7 Pub/Sub Cluster Bus & Distributed Redlock Engine
initRedis((clusterEvent) => {
  // Disseminate cluster-wide events to local connected SSE clients
  broadcastServerEvent(clusterEvent, 'REDIS_CLUSTER');
}).catch((err) => {
  console.warn('Redis cluster initialization skipped:', err.message);
});

const app = express();
const PORT = process.env.PORT || 3002;

// Global Middleware - Multi-Environment Dynamic CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests, localhost, and Vercel domains
    if (!origin) return callback(null, true);
    if (
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      origin.includes('vercel.app') || 
      origin.includes('hotelmasnagementos')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all configured hotel client origins
  },
  credentials: true,
}));

// Body parser with 50mb limit for room data / logs / bulk sync
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Error handler for malformed JSON or oversized request bodies
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, error: 'Malformed JSON payload' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Payload too large (exceeds 50MB)' });
  }
  next(err);
});

// Enterprise Auth Middleware
app.use(authMiddleware);

// Multi-Tenant Isolation Middleware (Routes queries to dedicated tenant databases)
app.use(tenantMiddleware);

// API Routes (Mounted on both /api and / to support direct and rewritten proxy requests)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Start HTTP listener only when running standalone (not in Serverless/Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 HotelManagementOS Backend running at http://localhost:${PORT}`);
    console.log(`📊 Reports API: http://localhost:${PORT}/api/reports/overview/metrics`);
    console.log(`🏨 Rooms API: http://localhost:${PORT}/api/rooms`);
    console.log(`📑 Bookings API: http://localhost:${PORT}/api/bookings`);
    console.log(`🔒 Distributed Redlock API: http://localhost:${PORT}/api/realtime/locks`);
  });
}

export default app;
export { app };

