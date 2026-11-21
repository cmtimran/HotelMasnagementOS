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
import { pgPool } from './database/postgres.js';
import { bookingService } from './services/booking.service.js';
import { guestCxController } from './controllers/guestCx.controller.js';

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

// Global Middleware - Strict Multi-Environment CORS Whitelist
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser calls (e.g. server-to-server, curl, health checks)
    if (!origin) return callback(null, true);
    
    const lowerOrigin = origin.toLowerCase();
    
    // Check local dev origins
    if (
      lowerOrigin.startsWith('http://localhost:') || 
      lowerOrigin.startsWith('http://127.0.0.1:') ||
      lowerOrigin.endsWith('.vercel.app') ||
      lowerOrigin.endsWith('.hotelmanagementos.com') ||
      allowedOrigins.includes(lowerOrigin)
    ) {
      return callback(null, true);
    }
    
    // Reject untrusted cross-origin requests
    return callback(new Error(`CORS origin blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Property-Id', 'X-Internal-Secret', 'X-User-Role', 'X-User-Id', 'X-User-Email', 'X-User-Name'],
}));

// Standard Security Headers Middleware
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Hardened Body Parser: Limit to 10MB to mitigate DoS / Memory Exhaustion
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Error handler for malformed JSON or oversized request bodies
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, error: 'Malformed JSON payload' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Payload too large (exceeds 10MB limit)' });
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
const isServerless = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

if (!isServerless) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 HotelManagementOS Backend running at http://localhost:${PORT}`);
    console.log(`📊 Reports API: http://localhost:${PORT}/api/reports/overview/metrics`);
    console.log(`🏨 Rooms API: http://localhost:${PORT}/api/rooms`);
    console.log(`📑 Bookings API: http://localhost:${PORT}/api/bookings`);
    console.log(`🔒 Distributed Redlock API: http://localhost:${PORT}/api/realtime/locks`);
  });

  // Non-overlapping Background Worker Loop (Prevents connection pool exhaustion)
  let isHoldWorkerRunning = false;
  const runHoldCheckLoop = async () => {
    if (isHoldWorkerRunning) return;
    isHoldWorkerRunning = true;
    try {
      const activeProps = await pgPool.query("SELECT id FROM properties WHERE status = 'ACTIVE' LIMIT 50").catch(() => ({ rows: [] }));
      for (const row of activeProps.rows) {
        // 1. Process GuestFlow AI Hold Lifecycle (Pre-cancellation follow-ups & auto-releases)
        await guestCxController.processHoldLifecycle(row.id).catch(() => ({ remindersSent: 0, holdsReleased: 0 }));

        // 2. Standard booking service check
        const res = await bookingService.checkExpiredHolds(row.id).catch(() => ({ releasedCount: 0 }));
        if (res && res.releasedCount > 0) {
          broadcastServerEvent({
            type: 'INVENTORY_REFRESH',
            propertyId: row.id
          });
        }
      }
    } catch (err: any) {
      console.error('Hold lifecycle worker error:', err?.message);
    } finally {
      isHoldWorkerRunning = false;
    }
  };

  const holdIntervalId = setInterval(runHoldCheckLoop, 60000);

  // Graceful Shutdown: Handle process termination signals cleanly
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Initiating Graceful Shutdown...`);
    clearInterval(holdIntervalId);

    server.close(async () => {
      console.log('HTTP Server closed cleanly.');
      try {
        await pgPool.end();
        console.log('PostgreSQL connection pool drained.');
      } catch (err: any) {
        console.error('Error draining PostgreSQL pool:', err?.message);
      }
      process.exit(0);
    });

    // Force exit if connections do not drain within 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after 10s timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
export { app };

