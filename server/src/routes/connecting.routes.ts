import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';

const router = Router();

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

        res.json({ success: true, message: 'Connecting room suite updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update connecting room suite' });
    }
});

// DELETE /api/connecting-rooms/:id
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        await db.prepare('DELETE FROM connecting_rooms WHERE id = ?').run(id);
        res.json({ success: true, message: 'Connecting room suite deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete connecting room suite' });
    }
});

export default router;
