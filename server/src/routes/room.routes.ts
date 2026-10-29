import { Router, Request, Response } from 'express';
import { roomController } from '../controllers/room.controller.js';
import { requirePermission } from '../middleware/rbacGuard.js';
import { requirePropertyScope } from '../middleware/propertyScope.js';
import { db } from '../database/db.js';

const router = Router();

const getReqPropertyId = (req: Request): number | null => {
    const raw = (req as any).propertyId || req.query?.propertyId || req.headers?.['x-property-id'] || req.body?.propertyId;
    if (!raw || raw === 'all' || raw === 'prop_grand_palace') return null;
    const num = Number(raw);
    return isNaN(num) ? null : num;
};

router.use(requirePropertyScope);

router.get('/', requirePermission('frontdesk.access'), roomController.getAllRooms);
router.patch('/:roomNo/housekeeping', requirePermission('frontdesk.access'), roomController.updateHousekeeping);

// POST /api/rooms - Create a new room
router.post('/', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const roomNumber = body.number || body.room_number;
        const name = body.name || `Room ${roomNumber}`;
        const buildingId = Number(body.buildingId || body.building_id);
        const floorId = Number(body.floorId || body.floor_id);
        const roomTypeId = Number(body.roomTypeId || body.room_type_id);
        const status = (body.status === 'Out of Order' || body.status === 'OUT_OF_ORDER') ? 'OUT_OF_ORDER'
            : (body.status === 'Maintenance' || body.status === 'MAINTENANCE') ? 'MAINTENANCE' : 'ACTIVE';
        const hkStatus = (body.housekeepingStatus || body.housekeeping_status || 'Clean').toUpperCase() === 'DIRTY' ? 'DIRTY'
            : (body.housekeepingStatus || '').toUpperCase() === 'INSPECTED' ? 'INSPECTED' : 'CLEAN';

        if (!roomNumber) {
            return res.status(400).json({ success: false, error: 'room number is required' });
        }
        if (!buildingId || !floorId || !roomTypeId) {
            return res.status(400).json({ success: false, error: 'buildingId, floorId, and roomTypeId are required' });
        }

        const result = await db.prepare(`
            INSERT INTO rooms (
                property_id, building_id, floor_id, room_type_id, room_number, name, status, housekeeping_status, remarks,
                phone_ext, lock_id, is_connecting, connected_to, smoking_status, near_elevator,
                bed_type, bed_count, is_bed_convertible, current_bed_setup, view_type, is_accessible, connecting_door_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            Boolean(body.nearElevator),
            body.bedType || body.bed_type || null,
            body.bedCount !== undefined ? Number(body.bedCount) : null,
            Boolean(body.isBedConvertible || body.is_bed_convertible),
            body.currentBedSetup || body.current_bed_setup || 'Standard',
            body.viewType || body.view_type || 'City View',
            Boolean(body.isAccessible || body.is_accessible),
            body.connectingDoorStatus || body.connecting_door_status || 'LOCKED'
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

// POST /api/rooms/bulk-generate - Smart Batch Floor & Room Generator Wizard
router.post('/bulk-generate', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const {
            buildingId,
            buildingName,
            floorStart = 1,
            floorEnd = 1,
            skipFloors = [],
            roomsPerFloor = 10,
            numberingScheme = 'standard', // 'standard' | 'building_prefix' | 'floor_dash' | 'four_digit'
            buildingPrefix = 'A',
            phoneExtPrefix = '2',
            lockPrefix = 'LOCK-',
            roomTypeDistribution = [],
            defaultHousekeepingStatus = 'CLEAN',
            defaultStatus = 'ACTIVE'
        } = req.body || {};

        if (Number(floorStart) > Number(floorEnd)) {
            return res.status(400).json({ success: false, error: 'floorStart must be less than or equal to floorEnd' });
        }
        if (Number(roomsPerFloor) <= 0 || Number(roomsPerFloor) > 100) {
            return res.status(400).json({ success: false, error: 'roomsPerFloor must be between 1 and 100' });
        }

        // 1. Resolve or Create Building
        let targetBuildingId = Number(buildingId);
        if (!targetBuildingId) {
            const bName = buildingName || 'Main Tower';
            const bCode = (bName.slice(0, 4) + '-' + propertyId).toUpperCase();
            const existingB = await db.prepare('SELECT id FROM buildings WHERE property_id = ? LIMIT 1').get(propertyId) as any;
            if (existingB) {
                targetBuildingId = existingB.id;
            } else {
                const bResult = await db.prepare(`
                    INSERT INTO buildings (property_id, code, name, total_floors)
                    VALUES (?, ?, ?, ?)
                `).run(propertyId, bCode, bName, Math.max(1, Number(floorEnd)));
                targetBuildingId = Number(bResult.lastInsertRowid);
            }
        }

        // 2. Resolve or Create Floors
        const floorMap = new Map<number, number>();
        const existingFloors = await db.prepare('SELECT id, floor_number FROM floors WHERE building_id = ?').all(targetBuildingId) as any[];
        for (const ef of existingFloors) {
            floorMap.set(Number(ef.floor_number), Number(ef.id));
        }

        const skipSet = new Set(Array.isArray(skipFloors) ? skipFloors.map(Number) : []);
        let floorsCreatedCount = 0;

        for (let fl = Number(floorStart); fl <= Number(floorEnd); fl++) {
            if (skipSet.has(fl)) continue;
            if (!floorMap.has(fl)) {
                const fResult = await db.prepare(`
                    INSERT INTO floors (building_id, floor_number, name, sort_order)
                    VALUES (?, ?, ?, ?)
                `).run(targetBuildingId, fl, `Floor ${fl}`, fl);
                floorMap.set(fl, Number(fResult.lastInsertRowid));
                floorsCreatedCount++;
            }
        }

        // 3. Resolve fallback Room Type if none provided in distribution
        let defaultRoomTypeId = 0;
        const availableRTs = await db.prepare('SELECT id, default_bed_type, bed_type FROM room_types WHERE property_id = ?').all(propertyId) as any[];
        if (availableRTs.length > 0) {
            defaultRoomTypeId = Number(availableRTs[0].id);
        }

        // 4. Generate Room Items
        const roomsToInsert: any[] = [];
        for (let fl = Number(floorStart); fl <= Number(floorEnd); fl++) {
            if (skipSet.has(fl)) continue;
            const floorId = floorMap.get(fl);
            if (!floorId) continue;

            for (let rIdx = 1; rIdx <= Number(roomsPerFloor); rIdx++) {
                const roomIndexPadded = String(rIdx).padStart(2, '0');
                let generatedRoomNo = '';
                if (numberingScheme === 'four_digit') {
                    generatedRoomNo = `${String(fl).padStart(2, '0')}${roomIndexPadded}`;
                } else if (numberingScheme === 'floor_dash') {
                    generatedRoomNo = `${fl}-${roomIndexPadded}`;
                } else if (numberingScheme === 'building_prefix') {
                    generatedRoomNo = `${buildingPrefix}-${fl}${roomIndexPadded}`;
                } else {
                    generatedRoomNo = `${fl}${roomIndexPadded}`;
                }

                const matchedRule = (roomTypeDistribution || []).find((rule: any) =>
                    rIdx >= Number(rule.fromIndex) && rIdx <= Number(rule.toIndex)
                );

                const finalRoomTypeId = Number(matchedRule?.roomTypeId || defaultRoomTypeId);
                const finalBedType = matchedRule?.bedType || 'King';
                const finalBedCount = matchedRule?.bedCount ? Number(matchedRule.bedCount) : 1;
                const finalViewType = matchedRule?.viewType || 'City View';
                const finalSmoking = matchedRule?.smokingStatus || 'Non-Smoking';
                const finalAccessible = Boolean(matchedRule?.isAccessible);

                roomsToInsert.push({
                    propertyId,
                    buildingId: targetBuildingId,
                    floorId,
                    roomTypeId: finalRoomTypeId,
                    roomNumber: generatedRoomNo,
                    name: `Room ${generatedRoomNo}`,
                    status: defaultStatus,
                    housekeepingStatus: defaultHousekeepingStatus,
                    phoneExt: `${phoneExtPrefix}${generatedRoomNo}`,
                    lockId: `${lockPrefix}${generatedRoomNo}`,
                    smokingStatus: finalSmoking,
                    bedType: finalBedType,
                    bedCount: finalBedCount,
                    viewType: finalViewType,
                    isAccessible: finalAccessible,
                    isConnecting: Boolean(matchedRule?.isConnecting),
                    connectingDoorStatus: 'LOCKED'
                });
            }
        }

        // 5. Batch Insert with Conflict Avoidance
        let createdRoomsCount = 0;
        let skippedExistingCount = 0;

        const insertStmt = db.prepare(`
            INSERT INTO rooms (
                property_id, building_id, floor_id, room_type_id, room_number, name, status, housekeeping_status,
                phone_ext, lock_id, is_connecting, smoking_status, bed_type, bed_count, view_type, is_accessible, connecting_door_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const r of roomsToInsert) {
            try {
                const existing = await db.prepare('SELECT id FROM rooms WHERE property_id = ? AND room_number = ? LIMIT 1').get(propertyId, r.roomNumber);
                if (existing) {
                    skippedExistingCount++;
                    continue;
                }
                await insertStmt.run(
                    r.propertyId,
                    r.buildingId,
                    r.floorId,
                    r.roomTypeId,
                    r.roomNumber,
                    r.name,
                    r.status,
                    r.housekeepingStatus,
                    r.phoneExt,
                    r.lockId,
                    r.isConnecting,
                    r.smokingStatus,
                    r.bedType,
                    r.bedCount,
                    r.viewType,
                    r.isAccessible,
                    r.connectingDoorStatus
                );
                createdRoomsCount++;
            } catch {
                skippedExistingCount++;
            }
        }

        res.status(201).json({
            success: true,
            message: `Batch generation complete! Created ${createdRoomsCount} rooms across ${floorsCreatedCount} new floors (${skippedExistingCount} skipped/duplicates).`,
            data: {
                totalGenerated: roomsToInsert.length,
                createdRoomsCount,
                skippedExistingCount,
                floorsCreatedCount
            }
        });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to bulk-generate rooms' });
    }
});

// POST /api/rooms/bulk-import - Bulk CSV / Excel Room Importer
router.post('/bulk-import', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const { rows = [] } = req.body || {};
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ success: false, error: 'No room rows provided for import' });
        }

        const buildings = await db.prepare('SELECT id, name, code FROM buildings WHERE property_id = ?').all(propertyId) as any[];
        const floors = await db.prepare('SELECT f.id, f.floor_number, f.name, f.building_id FROM floors f JOIN buildings b ON b.id = f.building_id WHERE b.property_id = ?').all(propertyId) as any[];
        const roomTypes = await db.prepare('SELECT id, code, name FROM room_types WHERE property_id = ?').all(propertyId) as any[];

        let defaultBuildingId = buildings[0]?.id;
        if (!defaultBuildingId) {
            const bRes = await db.prepare('INSERT INTO buildings (property_id, code, name, total_floors) VALUES (?, ?, ?, ?)').run(propertyId, 'TOWER-1', 'Main Tower', 5);
            defaultBuildingId = Number(bRes.lastInsertRowid);
        }

        let importedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        const insertStmt = db.prepare(`
            INSERT INTO rooms (
                property_id, building_id, floor_id, room_type_id, room_number, name, status, housekeeping_status,
                phone_ext, lock_id, is_connecting, smoking_status, bed_type, bed_count, view_type, is_accessible, connecting_door_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (let idx = 0; idx < rows.length; idx++) {
            const row = rows[idx];
            const roomNo = String(row.roomNumber || row.roomNo || row.number || '').trim();
            if (!roomNo) {
                errors.push(`Row ${idx + 1}: Room number is required`);
                skippedCount++;
                continue;
            }

            const existing = await db.prepare('SELECT id FROM rooms WHERE property_id = ? AND room_number = ? LIMIT 1').get(propertyId, roomNo);
            if (existing) {
                skippedCount++;
                continue;
            }

            const rtCode = String(row.roomTypeCode || row.roomType || '').trim().toLowerCase();
            const matchedRT = roomTypes.find(rt => rt.code.toLowerCase() === rtCode || rt.name.toLowerCase() === rtCode) || roomTypes[0];
            if (!matchedRT) {
                errors.push(`Row ${idx + 1} (${roomNo}): Room type not found`);
                skippedCount++;
                continue;
            }

            const flNum = Number(row.floor || row.floorNumber) || 1;
            let matchedFloor = floors.find(f => f.floor_number === flNum && f.building_id === defaultBuildingId);
            if (!matchedFloor) {
                const fRes = await db.prepare('INSERT INTO floors (building_id, floor_number, name, sort_order) VALUES (?, ?, ?, ?)').run(defaultBuildingId, flNum, `Floor ${flNum}`, flNum);
                matchedFloor = { id: Number(fRes.lastInsertRowid), floor_number: flNum, building_id: defaultBuildingId };
                floors.push(matchedFloor);
            }

            try {
                await insertStmt.run(
                    propertyId,
                    defaultBuildingId,
                    matchedFloor.id,
                    matchedRT.id,
                    roomNo,
                    row.name || `Room ${roomNo}`,
                    row.status || 'ACTIVE',
                    row.housekeepingStatus || 'CLEAN',
                    row.phoneExt || `2${roomNo}`,
                    row.lockId || `LOCK-${roomNo}`,
                    Boolean(row.isConnecting),
                    row.smokingStatus || 'Non-Smoking',
                    row.bedType || 'King',
                    Number(row.bedCount) || 1,
                    row.viewType || 'City View',
                    Boolean(row.isAccessible),
                    'LOCKED'
                );
                importedCount++;
            } catch (err: any) {
                errors.push(`Row ${idx + 1} (${roomNo}): ${err.message}`);
                skippedCount++;
            }
        }

        res.status(200).json({
            success: true,
            message: `Bulk import completed! ${importedCount} rooms imported, ${skippedCount} skipped.`,
            data: { importedCount, skippedCount, errors }
        });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to bulk-import rooms' });
    }
});

// PUT /api/rooms/:roomNo/details and PUT /api/rooms/:roomNo - Update room details and settings
const handleUpdateRoom = async (req: Request, res: Response) => {
    try {
        const identifier = String(req.params.roomNo || req.params.id || '');
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }

        const isNumeric = !isNaN(Number(identifier)) && Number(identifier) > 0;
        const targetRoom = await db.prepare(`
            SELECT id, room_number FROM rooms 
            WHERE property_id = ? AND (id = ? OR room_number = ?)
            LIMIT 1
        `).get(propertyId, isNumeric ? Number(identifier) : -1, identifier) as any;

        if (!targetRoom) {
            return res.status(404).json({ success: false, error: `Room '${identifier}' not found in property inventory` });
        }

        const body = req.body || {};
        const newRoomNumber = (body.number || body.roomNumber || targetRoom.room_number).trim();

        // If room number changed, verify it doesn't collide with another room in this property
        if (newRoomNumber && newRoomNumber !== targetRoom.room_number) {
            const conflict = await db.prepare(`
                SELECT id FROM rooms WHERE property_id = ? AND room_number = ? AND id != ? LIMIT 1
            `).get(propertyId, newRoomNumber, targetRoom.id) as any;
            if (conflict) {
                return res.status(400).json({ success: false, error: `Room number '${newRoomNumber}' already exists in this property.` });
            }
        }

        const name = body.name !== undefined ? (body.name || null) : null;
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
            SET room_number = COALESCE(?, room_number),
                name = COALESCE(?, name),
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
                bed_type = COALESCE(?, bed_type),
                bed_count = COALESCE(?, bed_count),
                is_bed_convertible = COALESCE(?, is_bed_convertible),
                current_bed_setup = COALESCE(?, current_bed_setup),
                view_type = COALESCE(?, view_type),
                is_accessible = COALESCE(?, is_accessible),
                connecting_door_status = COALESCE(?, connecting_door_status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            newRoomNumber || null,
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
            body.bedType || body.bed_type || null,
            body.bedCount !== undefined ? Number(body.bedCount) : null,
            body.isBedConvertible !== undefined ? Boolean(body.isBedConvertible || body.is_bed_convertible) : null,
            body.currentBedSetup || body.current_bed_setup || null,
            body.viewType || body.view_type || null,
            body.isAccessible !== undefined ? Boolean(body.isAccessible || body.is_accessible) : null,
            body.connectingDoorStatus || body.connecting_door_status || null,
            targetRoom.id
        );

        const updatedRoom = await db.prepare('SELECT * FROM rooms WHERE id = ?').get(targetRoom.id);

        res.json({ success: true, message: `Room ${newRoomNumber} updated successfully`, data: updatedRoom });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update room' });
    }
};

router.put('/:roomNo/details', requirePermission('frontdesk.access'), handleUpdateRoom);
router.put('/:roomNo', requirePermission('frontdesk.access'), handleUpdateRoom);

// DELETE /api/rooms/:roomNo - Delete a room from inventory
router.delete('/:roomNo', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const identifier = String(req.params.roomNo || '');
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }

        const isNumeric = !isNaN(Number(identifier)) && Number(identifier) > 0;
        const targetRoom = await db.prepare(`
            SELECT id, room_number FROM rooms 
            WHERE property_id = ? AND (id = ? OR room_number = ?)
            LIMIT 1
        `).get(propertyId, isNumeric ? Number(identifier) : -1, identifier) as any;

        if (!targetRoom) {
            return res.status(404).json({ success: false, error: `Room '${identifier}' not found in inventory` });
        }

        const roomId = targetRoom.id;
        const roomNo = targetRoom.room_number;

        // Check if there are active in-house reservations
        const activeStays = await db.prepare(`
            SELECT r.id, r.reservation_number 
            FROM reservation_rooms rr
            JOIN reservations r ON r.id = rr.reservation_id
            WHERE rr.room_id = ? AND r.status IN ('IN_HOUSE', 'in-house', 'arrived')
            LIMIT 1
        `).get(roomId) as any;

        if (activeStays) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete Room ${roomNo}: Guest is currently In-House (Reservation #${activeStays.reservation_number}). Please checkout or move guest before deleting.`
            });
        }

        // Clean up dependent child records to prevent FK constraints from blocking deletion
        await db.prepare('DELETE FROM keycard_logs WHERE property_id = ? AND room_number = ?').run(propertyId, roomNo).catch(() => {});
        await db.prepare('DELETE FROM room_maintenance_blocks WHERE property_id = ? AND room_number = ?').run(propertyId, roomNo).catch(() => {});
        await db.prepare('DELETE FROM housekeeping_tasks WHERE room_id = ?').run(roomId).catch(() => {});
        await db.prepare('DELETE FROM room_amenities WHERE room_id = ?').run(roomId).catch(() => {});
        await db.prepare('DELETE FROM reservation_rooms WHERE room_id = ?').run(roomId).catch(() => {});

        // Delete room
        const info = await db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);
        if (info.rowCount === 0) {
            return res.status(404).json({ success: false, error: `Room ${roomNo} not found` });
        }

        res.json({ success: true, message: `Room ${roomNo} removed from inventory` });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete room' });
    }
});

// ============================================================================
// OUT OF ORDER (OOO) & OUT OF SERVICE (OOS) MAINTENANCE BLOCKS
// ============================================================================

// GET /api/rooms/ooo-blocks - List all OOO/OOS blocks
router.get('/ooo-blocks', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.json({ success: true, data: [] });
        }
        const status = String(req.query.status || 'all');
        const roomNo = req.query.roomNo ? String(req.query.roomNo) : null;

        let query = `
            SELECT id, property_id as "propertyId", room_number as "roomNumber", room_type as "roomType",
                   block_type as "blockType", start_date as "startDate", end_date as "endDate",
                   reason_category as "reasonCategory", description, assigned_to as "assignedTo",
                   status, return_to_status as "returnToStatus", extension_notes as "extensionNotes",
                   created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt"
            FROM room_maintenance_blocks
            WHERE property_id = ?
        `;
        const params: any[] = [propertyId];

        if (status !== 'all') {
            query += ` AND status = ?`;
            params.push(status);
        }
        if (roomNo) {
            query += ` AND room_number = ?`;
            params.push(roomNo);
        }

        query += ` ORDER BY start_date DESC, id DESC`;

        const rows = await db.prepare(query).all(params);
        res.json({ success: true, data: rows });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch OOO blocks' });
    }
});

// POST /api/rooms/ooo-blocks - Create a new OOO/OOS block
router.post('/ooo-blocks', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const body = req.body || {};
        const roomNumber = String(body.roomNumber || body.room_number || '').trim();
        const roomType = String(body.roomType || body.room_type || 'Room').trim();
        const blockType = (body.blockType || body.type || 'OOO').toUpperCase() === 'OOS' ? 'OOS' : 'OOO';
        const startDate = String(body.startDate || body.start_date || '').trim();
        const endDate = String(body.endDate || body.end_date || '').trim();
        const reasonCategory = String(body.reasonCategory || body.reason_category || 'Maintenance').trim();
        const description = String(body.description || '').trim();
        const assignedTo = body.assignedTo ? String(body.assignedTo).trim() : null;
        const returnToStatus = body.returnToStatus === 'Clean' || body.returnToStatus === 'Inspected' ? body.returnToStatus : 'Dirty';
        const createdBy = body.createdBy ? String(body.createdBy).trim() : 'Manager';
        const force = Boolean(body.force);

        if (!roomNumber || !startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'roomNumber, startDate, and endDate are required' });
        }
        if (startDate > endDate) {
            return res.status(400).json({ success: false, error: 'startDate cannot be after endDate' });
        }

        // 1. Conflict Check: Search for overlapping active reservations in this room
        const conflictSql = `
            SELECT r.id, r.reservation_number as "reservationNumber",
                   rr.check_in_date as "checkIn", rr.check_out_date as "checkOut", r.status,
                   COALESCE(g.first_name || ' ' || g.last_name, 'Guest') as "guestName"
            FROM reservations r
            LEFT JOIN guests g ON r.booker_guest_id = g.id
            JOIN reservation_rooms rr ON rr.reservation_id = r.id
            JOIN rooms rm ON rr.room_id = rm.id
            WHERE r.property_id = ?
              AND rm.room_number = ?
              AND r.status NOT IN ('CANCELLED', 'VOIDED', 'CHECKED_OUT', 'COMPLETED')
              AND rr.check_in_date < ?
              AND rr.check_out_date > ?
        `;
        const conflicts = await db.prepare(conflictSql).all(propertyId, roomNumber, endDate, startDate);

        if (conflicts.length > 0 && !force) {
            return res.status(409).json({
                success: false,
                conflict: true,
                message: `Room ${roomNumber} has ${conflicts.length} overlapping reservation(s). Reassign them first or confirm with force=true.`,
                conflictingReservations: conflicts
            });
        }

        // 2. Insert maintenance block
        const insertResult = await db.prepare(`
            INSERT INTO room_maintenance_blocks (
                property_id, room_number, room_type, block_type, start_date, end_date,
                reason_category, description, assigned_to, status, return_to_status, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
        `).run(
            propertyId,
            roomNumber,
            roomType,
            blockType,
            startDate,
            endDate,
            reasonCategory,
            description,
            assignedTo,
            returnToStatus,
            createdBy
        );

        // 3. If today falls in [startDate, endDate], sync room status in rooms table
        const todayStr = new Date().toISOString().slice(0, 10);
        if (todayStr >= startDate && todayStr <= endDate) {
            const targetStatus = blockType === 'OOO' ? 'OUT_OF_ORDER' : 'MAINTENANCE';
            await db.prepare(`
                UPDATE rooms
                SET status = ?, housekeeping_status = 'DIRTY', updated_at = CURRENT_TIMESTAMP
                WHERE property_id = ? AND room_number = ?
            `).run(targetStatus, propertyId, roomNumber);
        }

        res.status(201).json({
            success: true,
            data: {
                id: insertResult.lastInsertRowid,
                roomNumber,
                roomType,
                blockType,
                startDate,
                endDate,
                reasonCategory,
                description,
                assignedTo,
                status: 'active',
                returnToStatus,
                createdBy
            },
            message: `Room ${roomNumber} successfully placed ${blockType === 'OOO' ? 'Out of Order' : 'Out of Service'}`
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to create OOO block' });
    }
});

// PUT /api/rooms/ooo-blocks/:id/extend - Extend OOO/OOS duration
router.put('/ooo-blocks/:id/extend', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const body = req.body || {};
        const newEndDate = String(body.newEndDate || body.endDate || '').trim();
        const reason = String(body.reason || '').trim();
        const extendedBy = String(body.extendedBy || 'Manager').trim();

        if (!newEndDate) {
            return res.status(400).json({ success: false, error: 'newEndDate is required' });
        }

        const block = await db.prepare('SELECT * FROM room_maintenance_blocks WHERE id = ? AND property_id = ?').get(id, propertyId);
        if (!block) {
            return res.status(404).json({ success: false, error: 'Maintenance block not found' });
        }

        const noteEntry = `[${new Date().toISOString().slice(0, 16).replace('T', ' ')}] Extended from ${block.end_date} to ${newEndDate} by ${extendedBy}. Reason: ${reason || 'N/A'}`;
        const updatedNotes = block.extension_notes ? `${block.extension_notes}\n${noteEntry}` : noteEntry;

        await db.prepare(`
            UPDATE room_maintenance_blocks
            SET end_date = ?, status = 'extended', extension_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND property_id = ?
        `).run(newEndDate, updatedNotes, id, propertyId);

        res.json({
            success: true,
            message: `Maintenance period extended to ${newEndDate}`,
            data: { id, newEndDate, status: 'extended' }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to extend OOO block' });
    }
});

// PUT /api/rooms/ooo-blocks/:id/release - Mark maintenance completed and return room to housekeeping
router.put('/ooo-blocks/:id/release', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const body = req.body || {};
        const returnStatus = body.returnStatus === 'Clean' || body.returnStatus === 'Inspected' ? body.returnStatus : 'Dirty';
        const releasedBy = String(body.releasedBy || 'Manager').trim();
        const notes = String(body.notes || '').trim();

        const block = await db.prepare('SELECT * FROM room_maintenance_blocks WHERE id = ? AND property_id = ?').get(id, propertyId);
        if (!block) {
            return res.status(404).json({ success: false, error: 'Maintenance block not found' });
        }

        const releaseEntry = `[${new Date().toISOString().slice(0, 16).replace('T', ' ')}] Released by ${releasedBy} with status ${returnStatus}. Note: ${notes || 'Work completed'}`;
        const updatedNotes = block.extension_notes ? `${block.extension_notes}\n${releaseEntry}` : releaseEntry;

        await db.prepare(`
            UPDATE room_maintenance_blocks
            SET status = 'completed', return_to_status = ?, extension_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND property_id = ?
        `).run(returnStatus, updatedNotes, id, propertyId);

        // Transition room back to ACTIVE with returned Housekeeping status
        const hkEnum = returnStatus.toUpperCase() === 'INSPECTED' ? 'INSPECTED' : returnStatus.toUpperCase() === 'CLEAN' ? 'CLEAN' : 'DIRTY';
        await db.prepare(`
            UPDATE rooms
            SET status = 'ACTIVE', housekeeping_status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE property_id = ? AND room_number = ?
        `).run(hkEnum, propertyId, block.room_number);

        res.json({
            success: true,
            message: `Room ${block.room_number} successfully released to Housekeeping as ${returnStatus}`,
            data: { id, roomNumber: block.room_number, returnStatus, status: 'completed' }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to release OOO block' });
    }
});

// DELETE /api/rooms/ooo-blocks/:id - Cancel maintenance block
router.delete('/ooo-blocks/:id', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }

        const block = await db.prepare('SELECT * FROM room_maintenance_blocks WHERE id = ? AND property_id = ?').get(id, propertyId);
        if (!block) {
            return res.status(404).json({ success: false, error: 'Maintenance block not found' });
        }

        await db.prepare(`
            UPDATE room_maintenance_blocks
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND property_id = ?
        `).run(id, propertyId);

        // If room is currently OUT_OF_ORDER or MAINTENANCE, revert to ACTIVE
        await db.prepare(`
            UPDATE rooms
            SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
            WHERE property_id = ? AND room_number = ? AND status IN ('OUT_OF_ORDER', 'MAINTENANCE')
        `).run(propertyId, block.room_number);

        res.json({ success: true, message: `Maintenance block cancelled for Room ${block.room_number}` });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to cancel OOO block' });
    }
});

export default router;
