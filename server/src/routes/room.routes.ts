import { Router } from 'express';
import { roomController } from '../controllers/room.controller.js';
import { requirePermission } from '../middleware/rbacGuard.js';
import { requirePropertyScope } from '../middleware/propertyScope.js';

const router = Router();

router.use(requirePropertyScope);

router.get('/', requirePermission('frontdesk.access'), roomController.getAllRooms);
router.patch('/:roomNo/housekeeping', requirePermission('frontdesk.access'), roomController.updateHousekeeping);

export default router;
