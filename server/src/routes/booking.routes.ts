import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { requirePermission } from '../middleware/rbacGuard.js';
import { requirePropertyScope } from '../middleware/propertyScope.js';

const router = Router();

router.use(requirePropertyScope);

router.get('/', requirePermission('reservation.view'), bookingController.getAllBookings);
router.get('/:id', requirePermission('reservation.view'), bookingController.getBookingById);
router.post('/', requirePermission('reservation.create'), bookingController.createBooking);
router.patch('/:id/status', requirePermission('reservation.manage'), bookingController.updateStatus);
router.delete('/:id', requirePermission('reservation.manage'), bookingController.deleteBooking);

export default router;
