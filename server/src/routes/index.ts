import { Router } from 'express';
import { isPostgresConnected, initPostgres } from '../database/postgres.js';
import bookingRoutes from './booking.routes.js';
import roomRoutes from './room.routes.js';
import reportRoutes from './report.routes.js';
import realtimeRoutes from './realtime.routes.js';
import propertyRoutes from './property.routes.js';
import accountingRoutes from './accounting.routes.js';
import hrmRoutes from './hrm.routes.js';
import schemaRoutes from './schema.routes.js';
import ratesRoutes from './rates.routes.js';
import connectingRoutes from './connecting.routes.js';
import tenantRoutes from './tenant.routes.js';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', async (req, res) => {
  if (!isPostgresConnected() && process.env.DATABASE_URL) {
    try {
      await initPostgres();
    } catch (e) {
      console.warn('Health check postgres init notice:', e);
    }
  }

  res.json({
    status: 'online',
    service: 'HotelManagementOS Enterprise API',
    version: '1.0.0',
    cloudPostgres: isPostgresConnected() ? 'connected' : 'offline',
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    timestamp: new Date().toISOString(),
  });
});

// Domain Routes
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/rooms', roomRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/realtime', realtimeRoutes);

// Direct folios alias so /api/folios and /api/folios/:id work identically to /api/accounting/folios
apiRouter.use('/folios', (req, res, next) => {
  req.url = '/folios' + (req.url === '/' ? '' : req.url);
  accountingRoutes(req, res, next);
});

// Relational Multi-Hotel & Enterprise Modules
apiRouter.use('/properties', propertyRoutes);
apiRouter.use('/accounting', accountingRoutes);
apiRouter.use('/hrm', hrmRoutes);
apiRouter.use('/schema', schemaRoutes);
apiRouter.use('/rates', ratesRoutes);
apiRouter.use('/connecting-rooms', connectingRoutes);
apiRouter.use('/central', tenantRoutes);
apiRouter.use('/tenants', tenantRoutes);

export default apiRouter;
