import { Router } from 'express';
import bookingRoutes from './booking.routes.js';
import roomRoutes from './room.routes.js';
import reportRoutes from './report.routes.js';
import realtimeRoutes from './realtime.routes.js';
import propertyRoutes from './property.routes.js';
import accountingRoutes from './accounting.routes.js';
import hrmRoutes from './hrm.routes.js';
import schemaRoutes from './schema.routes.js';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'HotelManagementOS Enterprise API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Domain Routes
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/rooms', roomRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/realtime', realtimeRoutes);

// Relational Multi-Hotel & Enterprise Modules
apiRouter.use('/properties', propertyRoutes);
apiRouter.use('/accounting', accountingRoutes);
apiRouter.use('/hrm', hrmRoutes);
apiRouter.use('/schema', schemaRoutes);

export default apiRouter;
