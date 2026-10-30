import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { requirePermission } from '../middleware/rbacGuard.js';
import { requirePropertyScope } from '../middleware/propertyScope.js';

const router = Router();

router.use(requirePropertyScope);

router.get('/', requirePermission('reservation.view'), bookingController.getAllBookings);
router.post('/reset', requirePermission('reservation.manage'), bookingController.resetInventory);
router.get('/:id', requirePermission('reservation.view'), bookingController.getBookingById);
router.post('/', requirePermission('reservation.create'), bookingController.createBooking);
router.put('/:id', requirePermission('reservation.manage'), bookingController.updateBooking);
router.patch('/:id', requirePermission('reservation.manage'), bookingController.updateBooking);
router.post('/group/link', requirePermission('reservation.manage'), bookingController.linkGroup);
router.post('/group/unlink', requirePermission('reservation.manage'), bookingController.unlinkGroup);
router.patch('/:id/amend', requirePermission('reservation.manage'), bookingController.amendBooking);
router.post('/:id/move', requirePermission('reservation.manage'), bookingController.moveRoom);
router.post('/:id/payment', requirePermission('reservation.manage'), bookingController.addPayment);
router.post('/:id/split', requirePermission('reservation.manage'), bookingController.splitBooking);
router.post('/:id/hold', requirePermission('reservation.manage'), bookingController.holdBooking);
router.post('/:id/confirm-hold', requirePermission('reservation.manage'), bookingController.confirmHoldBooking);
router.post('/:id/release-hold', requirePermission('reservation.manage'), bookingController.releaseHoldBooking);
router.post('/holds/check-expiries', requirePermission('reservation.manage'), bookingController.checkExpiredHolds);
router.post('/:id/unassign', requirePermission('reservation.manage'), bookingController.unassignRoom);
router.post('/:id/void', requirePermission('reservation.manage'), bookingController.voidBooking);
router.post('/:id/ungroup', requirePermission('reservation.manage'), bookingController.ungroupBooking);
router.post('/:id/link-group', requirePermission('reservation.manage'), bookingController.linkGroup);
router.post('/:id/change-owner', requirePermission('reservation.manage'), bookingController.changeOwner);
router.patch('/:id/status', requirePermission('reservation.manage'), bookingController.updateStatus);
router.delete('/:id', requirePermission('reservation.manage'), bookingController.deleteBooking);

export default router;
