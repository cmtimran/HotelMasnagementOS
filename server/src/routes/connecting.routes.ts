import { Router, Request, Response } from 'express';
import { pgPool } from '../database/postgres.js';
import { broadcastServerEvent } from './realtime.routes.js';

const router = Router();

/**
 * Two-way sync: Synchronizes physical rooms' is_connecting and connected_to
 * attributes with the active connecting rooms configurations in the database.
 */
async function syncRoomsConnectingStatus(propertyId: number): Promise<void> {
    try {
        // 1. Reset all rooms for this property
        await pgPool.query(`
            UPDATE rooms
            SET is_connecting = false, connected_to = NULL
            WHERE property_id = $1;
        `, [propertyId]);

        // 2. Fetch all active connecting suites
        const suitesRes = await pgPool.query(`
            SELECT component_rooms_json
            FROM connecting_rooms
            WHERE property_id = $1 AND status = 'Active';
        `, [propertyId]);

        const suites = suitesRes.rows;
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
        for (const [roomNumber, partners] of partnerMap.entries()) {
            await pgPool.query(`
                UPDATE rooms
                SET is_connecting = true, connected_to = $1, updated_at = CURRENT_TIMESTAMP
                WHERE property_id = $2 AND room_number = $3;
            `, [partners.join(', '), propertyId, roomNumber]);
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
        const rawProp = req.query.propertyId || req.headers['x-property-id'];
        if (!rawProp || rawProp === 'all') {
            return res.json({ success: true, data: [] });
        }
        const propertyId = Number(rawProp);
        const rowsRes = await pgPool.query(`
            SELECT * FROM connecting_rooms WHERE property_id = $1 ORDER BY id ASC;
        `, [propertyId]);

        const mapped = rowsRes.rows.map(r => ({
            id: r.id,
            name: r.name,
            inventoryLogic: r.inventory_logic,
            pricingStrategy: r.pricing_strategy,
            fixedPrice: Number(r.fixed_price) || 0,
            status: r.status,
            componentRooms: r.component_rooms_json ? (typeof r.component_rooms_json === 'string' ? JSON.parse(r.component_rooms_json) : r.component_rooms_json) : []
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
        const rawProp = body.propertyId || req.query.propertyId || req.headers['x-property-id'];
        if (!rawProp) {
            return res.status(400).json({ success: false, error: 'Property ID is required' });
        }
        const propertyId = Number(rawProp);
        const name = body.name || 'Connecting Suite';

        const insertRes = await pgPool.query(`
            INSERT INTO connecting_rooms (
                property_id, name, inventory_logic, pricing_strategy, fixed_price, status, component_rooms_json
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `, [
            propertyId,
            name,
            body.inventoryLogic || 'Auto-Sync',
            body.pricingStrategy || 'Sum of Rates',
            Number(body.fixedPrice) || 0,
            body.status || 'Active',
            JSON.stringify(body.componentRooms || [])
        ]);

        const newId = Number(insertRes.rows[0]?.id);

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
        const existingRes = await pgPool.query('SELECT property_id FROM connecting_rooms WHERE id = $1', [id]);
        const existing = existingRes.rows[0];
        const propertyId = Number(body.propertyId || existing?.property_id);

        await pgPool.query(`
            UPDATE connecting_rooms
            SET name = COALESCE($1, name),
                inventory_logic = COALESCE($2, inventory_logic),
                pricing_strategy = COALESCE($3, pricing_strategy),
                fixed_price = COALESCE($4, fixed_price),
                status = COALESCE($5, status),
                component_rooms_json = COALESCE($6, component_rooms_json),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7;
        `, [
            body.name || null,
            body.inventoryLogic || null,
            body.pricingStrategy || null,
            body.fixedPrice !== undefined ? Number(body.fixedPrice) : null,
            body.status || null,
            body.componentRooms ? JSON.stringify(body.componentRooms) : null,
            id
        ]);

        // Sync physical rooms
        if (propertyId) {
            await syncRoomsConnectingStatus(propertyId);
        }

        res.json({ success: true, message: 'Connecting room suite updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update connecting room suite' });
    }
});

// DELETE /api/connecting-rooms/:id
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const existingRes = await pgPool.query('SELECT property_id FROM connecting_rooms WHERE id = $1', [id]);
        const existing = existingRes.rows[0];
        const propertyId = Number(existing?.property_id);

        await pgPool.query('DELETE FROM connecting_rooms WHERE id = $1', [id]);

        // Sync physical rooms
        if (propertyId) {
            await syncRoomsConnectingStatus(propertyId);
        }

        res.json({ success: true, message: 'Connecting room suite deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete connecting room suite' });
    }
});

export default router;
