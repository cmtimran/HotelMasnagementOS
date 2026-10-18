import { Router } from 'express';
import bookingRoutes from './booking.routes.js';
import roomRoutes from './room.routes.js';
import reportRoutes from './report.routes.js';

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

export default apiRouter;
