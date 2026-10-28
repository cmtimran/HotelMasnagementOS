import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { broadcastServerEvent } from './realtime.routes.js';

const router = Router();

/**
 * Two-way sync: Synchronizes physical rooms' is_connecting and connected_to
 * attributes with the active connecting rooms configurations in the database.
 */
async function syncRoomsConnectingStatus(propertyId: number): Promise<void> {
    try {
        // 1. Reset all rooms for this property
        await db.prepare(`
            UPDATE rooms
            SET is_connecting = false, connected_to = NULL
            WHERE property_id = ?
        `).run(propertyId);

        // 2. Fetch all active connecting suites
        const suites = await db.prepare(`
            SELECT component_rooms_json
            FROM connecting_rooms
            WHERE property_id = ? AND status = 'Active'
        `).all(propertyId) as any[];

        const partnerMap = new Map<string, string[]>();

        for (const suite of suites) {
            let componentRooms: any[] = [];
            try {
                componentRooms = typeof suite.component_rooms_json === 'string'
                    ? JSON.parse(suite.component_rooms_json)
                    : (suite.component_rooms_json || []);
            } catch {
                componentRooms = [];
            }

            const suiteRooms: string[] = [];
            for (const cr of componentRooms) {
                if (Array.isArray(cr.roomNumbers)) {
                    for (const num of cr.roomNumbers) {
                        const cleanNum = String(num).trim();
                        if (cleanNum && !suiteRooms.includes(cleanNum)) {
                            suiteRooms.push(cleanNum);
                        }
                    }
                }
            }

            if (suiteRooms.length >= 2) {
                for (const rm of suiteRooms) {
                    const others = suiteRooms.filter(x => x !== rm);
                    const existing = partnerMap.get(rm) || [];
                    partnerMap.set(rm, Array.from(new Set([...existing, ...others])));
                }
            }
        }

        // 3. Update physical rooms with active partners
        const updateStmt = db.prepare(`
            UPDATE rooms
            SET is_connecting = true, connected_to = ?, updated_at = CURRENT_TIMESTAMP
            WHERE property_id = ? AND room_number = ?
        `);

        for (const [roomNumber, partners] of partnerMap.entries()) {
            await updateStmt.run(partners.join(', '), propertyId, roomNumber);
        }

        // 4. Realtime broadcast to all connected terminals
        broadcastServerEvent({
            type: 'INVENTORY_REFRESH',
            propertyId: String(propertyId),
            reason: 'CONNECTING_ROOMS_SYNC',
            timestamp: Date.now()
        });
    } catch (err) {
        console.error('[ConnectingRooms] Failed to sync physical rooms status:', err);
    }
}

// GET /api/connecting-rooms
router.get('/', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.query.propertyId) || 1;
        const rows = await db.prepare(`
            SELECT * FROM connecting_rooms WHERE property_id = ? ORDER BY id ASC
        `).all(propertyId) as any[];

        const mapped = rows.map(r => ({
            id: r.id,
            name: r.name,
            inventoryLogic: r.inventory_logic,
            pricingStrategy: r.pricing_strategy,
            fixedPrice: Number(r.fixed_price) || 0,
            status: r.status,
            componentRooms: r.component_rooms_json ? JSON.parse(r.component_rooms_json) : []
        }));

        res.json({ success: true, data: mapped });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch connecting rooms' });
    }
});

// POST /api/connecting-rooms
router.post('/', async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const propertyId = Number(body.propertyId || req.query.propertyId) || 1;
        const name = body.name || 'Connecting Suite';

        const result = await db.prepare(`
            INSERT INTO connecting_rooms (
                property_id, name, inventory_logic, pricing_strategy, fixed_price, status, component_rooms_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            propertyId,
            name,
            body.inventoryLogic || 'Auto-Sync',
            body.pricingStrategy || 'Sum of Rates',
            Number(body.fixedPrice) || 0,
            body.status || 'Active',
            JSON.stringify(body.componentRooms || [])
        );

        const newId = Number(result.lastInsertRowid);

        // Sync physical rooms
        await syncRoomsConnectingStatus(propertyId);

        res.status(201).json({ success: true, data: { ...body, id: newId } });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create connecting room suite' });
    }
});

// PUT /api/connecting-rooms/:id
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body || {};
        const existing = await db.prepare('SELECT property_id FROM connecting_rooms WHERE id = ?').get(id) as any;
        const propertyId = Number(body.propertyId || existing?.property_id || 1);

        await db.prepare(`
            UPDATE connecting_rooms
            SET name = COALESCE(?, name),
                inventory_logic = COALESCE(?, inventory_logic),
                pricing_strategy = COALESCE(?, pricing_strategy),
                fixed_price = COALESCE(?, fixed_price),
                status = COALESCE(?, status),
                component_rooms_json = COALESCE(?, component_rooms_json),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            body.name || null,
            body.inventoryLogic || null,
            body.pricingStrategy || null,
            body.fixedPrice !== undefined ? Number(body.fixedPrice) : null,
            body.status || null,
            body.componentRooms ? JSON.stringify(body.componentRooms) : null,
            id
        );

        // Sync physical rooms
        await syncRoomsConnectingStatus(propertyId);

        res.json({ success: true, message: 'Connecting room suite updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update connecting room suite' });
    }
});

// DELETE /api/connecting-rooms/:id
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const existing = await db.prepare('SELECT property_id FROM connecting_rooms WHERE id = ?').get(id) as any;
        const propertyId = Number(existing?.property_id || 1);

        await db.prepare('DELETE FROM connecting_rooms WHERE id = ?').run(id);

        // Sync physical rooms
        await syncRoomsConnectingStatus(propertyId);

        res.json({ success: true, message: 'Connecting room suite deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete connecting room suite' });
    }
});

export default router;
