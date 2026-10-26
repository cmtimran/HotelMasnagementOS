import { Router, Request, Response } from 'express';
import { roomController } from '../controllers/room.controller.js';
import { requirePermission } from '../middleware/rbacGuard.js';
import { requirePropertyScope } from '../middleware/propertyScope.js';
import { db } from '../database/db.js';

const router = Router();

router.use(requirePropertyScope);

router.get('/', requirePermission('frontdesk.access'), roomController.getAllRooms);
router.patch('/:roomNo/housekeeping', requirePermission('frontdesk.access'), roomController.updateHousekeeping);

// POST /api/rooms - Create a new room
router.post('/', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const propertyId = (req as any).propertyId ? Number((req as any).propertyId) : 1;
        const roomNumber = body.number || body.room_number;
        const name = body.name || `Room ${roomNumber}`;
        const buildingId = Number(body.buildingId || body.building_id || 1);
        const floorId = Number(body.floorId || body.floor_id || 1);
        const roomTypeId = Number(body.roomTypeId || body.room_type_id || 1);
        const status = (body.status === 'Out of Order' || body.status === 'OUT_OF_ORDER') ? 'OUT_OF_ORDER'
            : (body.status === 'Maintenance' || body.status === 'MAINTENANCE') ? 'MAINTENANCE' : 'ACTIVE';
        const hkStatus = (body.housekeepingStatus || body.housekeeping_status || 'Clean').toUpperCase() === 'DIRTY' ? 'DIRTY'
            : (body.housekeepingStatus || '').toUpperCase() === 'INSPECTED' ? 'INSPECTED' : 'CLEAN';

        if (!roomNumber) {
            return res.status(400).json({ success: false, error: 'room number is required' });
        }

        const result = await db.prepare(`
            INSERT INTO rooms (
                property_id, building_id, floor_id, room_type_id, room_number, name, status, housekeeping_status, remarks,
                phone_ext, lock_id, is_connecting, connected_to, smoking_status, near_elevator
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            propertyId,
            buildingId,
            floorId,
            roomTypeId,
            String(roomNumber),
            name,
            status,
            hkStatus,
            body.remarks || null,
            body.phoneExt || body.phone_ext || null,
            body.lockId || body.lock_id || null,
            Boolean(body.isConnecting),
            body.connectedTo || body.connected_to || null,
            body.smokingStatus || body.smoking_status || 'Non-Smoking',
            Boolean(body.nearElevator)
        );

        res.status(201).json({
            success: true,
            data: { id: Number(result.lastInsertRowid), roomNumber, name, status },
            message: `Room ${roomNumber} created successfully`
        });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create room' });
    }
});

// PUT /api/rooms/:roomNo/details - Update room details
router.put('/:roomNo/details', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const roomNo = String(req.params.roomNo || '');
        const propertyId = (req as any).propertyId ? Number((req as any).propertyId) : 1;
        const body = req.body || {};
        const name = body.name || null;
        const buildingId = body.buildingId ? Number(body.buildingId) : null;
        const floorId = body.floorId ? Number(body.floorId) : null;
        const roomTypeId = body.roomTypeId ? Number(body.roomTypeId) : null;
        const rawStatus = body.status || '';
        const status = rawStatus === 'Out of Order' || rawStatus === 'OUT_OF_ORDER' ? 'OUT_OF_ORDER'
            : rawStatus === 'Maintenance' || rawStatus === 'MAINTENANCE' ? 'MAINTENANCE'
            : rawStatus ? 'ACTIVE' : null;
        const rawHk = body.housekeepingStatus || '';
        const hkStatus = rawHk.toUpperCase() === 'DIRTY' ? 'DIRTY' : rawHk.toUpperCase() === 'INSPECTED' ? 'INSPECTED' : rawHk ? 'CLEAN' : null;

        await db.prepare(`
            UPDATE rooms
            SET name = COALESCE(?, name),
                building_id = COALESCE(?, building_id),
                floor_id = COALESCE(?, floor_id),
                room_type_id = COALESCE(?, room_type_id),
                status = COALESCE(?, status),
                housekeeping_status = COALESCE(?, housekeeping_status),
                remarks = COALESCE(?, remarks),
                phone_ext = COALESCE(?, phone_ext),
                lock_id = COALESCE(?, lock_id),
                is_connecting = COALESCE(?, is_connecting),
                connected_to = COALESCE(?, connected_to),
                smoking_status = COALESCE(?, smoking_status),
                near_elevator = COALESCE(?, near_elevator),
                updated_at = CURRENT_TIMESTAMP
            WHERE property_id = ? AND room_number = ?
        `).run(
            name,
            buildingId,
            floorId,
            roomTypeId,
            status,
            hkStatus,
            body.remarks || null,
            body.phoneExt || body.phone_ext || null,
            body.lockId || body.lock_id || null,
            body.isConnecting !== undefined ? Boolean(body.isConnecting) : null,
            body.connectedTo || body.connected_to || null,
            body.smokingStatus || body.smoking_status || null,
            body.nearElevator !== undefined ? Boolean(body.nearElevator) : null,
            propertyId,
            roomNo
        );

        res.json({ success: true, message: `Room ${roomNo} updated successfully` });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update room' });
    }
});

// DELETE /api/rooms/:roomNo - Delete a room from inventory
router.delete('/:roomNo', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const roomNo = String(req.params.roomNo || '');
        const propertyId = (req as any).propertyId ? Number((req as any).propertyId) : 1;
        const info = await db.prepare('DELETE FROM rooms WHERE property_id = ? AND room_number = ?').run(propertyId, roomNo);
        if (info.rowCount === 0) {
            return res.status(404).json({ success: false, error: `Room ${roomNo} not found` });
        }
        res.json({ success: true, message: `Room ${roomNo} removed from inventory` });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete room' });
    }
});

export default router;
