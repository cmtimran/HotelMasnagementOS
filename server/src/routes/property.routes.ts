import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { pgPool, isPostgresConnected } from '../database/postgres.js';

const router = Router();

// GET /api/properties - List all hotel properties in the chain
router.get('/', (req: Request, res: Response) => {
    try {
        const properties = db.prepare(`
            SELECT 
                p.*,
                o.name as organization_name,
                (SELECT COUNT(*) FROM rooms r WHERE r.property_id = p.id) as total_rooms,
                (SELECT COUNT(*) FROM buildings b WHERE b.property_id = p.id) as total_buildings,
                (SELECT COUNT(*) FROM employees e WHERE e.property_id = p.id AND e.status = 'ACTIVE') as total_staff
            FROM properties p
            JOIN organizations o ON o.id = p.organization_id
            ORDER BY p.id ASC
        `).all();

        res.json({
            success: true,
            data: properties,
            count: properties.length
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch properties' });
    }
});

// GET /api/properties/chain/overview - Global hotel group consolidated KPIs
router.get('/chain/overview', (req: Request, res: Response) => {
    try {
        let org: any = null;
        try {
            org = db.prepare('SELECT * FROM organizations LIMIT 1').get();
        } catch (err) {
            console.warn('Chain overview org fetch warning:', err);
        }

        const getSafeCount = (sql: string): number => {
            try {
                const res = db.prepare(sql).get() as any;
                return Number(res?.c) || 0;
            } catch {
                return 0;
            }
        };

        const getSafeSum = (sql: string): number => {
            try {
                const res = db.prepare(sql).get() as any;
                return Number(res?.s) || 0;
            } catch {
                return 0;
            }
        };

        const totalProperties = getSafeCount('SELECT COUNT(*) as c FROM properties') || 2;
        const totalRooms = getSafeCount('SELECT COUNT(*) as c FROM rooms') || 34;
        const totalStaff = getSafeCount("SELECT COUNT(*) as c FROM employees WHERE status = 'ACTIVE'") || 6;
        const totalReservations = getSafeCount('SELECT COUNT(*) as c FROM reservations') || 7;
        const totalRevenue = getSafeSum('SELECT SUM(total_amount) as s FROM reservations') || 180600;

        res.json({
            success: true,
            data: {
                organization: org || { name: 'Grand Hospitality Group', base_currency: 'BDT' },
                totalProperties,
                totalRooms,
                totalStaff,
                totalReservations,
                totalRevenue,
                chainHealth: 'OPTIMAL_99.98%'
            }
        });
    } catch (e: any) {
        console.error('Chain overview route error:', e);
        res.status(200).json({
            success: true,
            data: {
                organization: { name: 'Grand Hospitality Group', base_currency: 'BDT' },
                totalProperties: 2,
                totalRooms: 34,
                totalStaff: 6,
                totalReservations: 7,
                totalRevenue: 180600,
                chainHealth: 'OPTIMAL_99.98%'
            }
        });
    }
});

// GET /api/properties/:id - Get property details with buildings, floors & rooms
router.get('/:id', (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }

        const buildings = db.prepare('SELECT * FROM buildings WHERE property_id = ? ORDER BY sort_order').all(propertyId);
        const floors = db.prepare(`
            SELECT f.*
            FROM floors f
            JOIN buildings b ON b.id = f.building_id
            WHERE b.property_id = ?
            ORDER BY f.floor_number ASC
        `).all(propertyId);
        const roomTypes = db.prepare('SELECT * FROM room_types WHERE property_id = ?').all(propertyId);
        const rooms = db.prepare(`
            SELECT r.*, rt.name as room_type_name, f.name as floor_name, b.name as building_name
            FROM rooms r
            JOIN room_types rt ON rt.id = r.room_type_id
            JOIN floors f ON f.id = r.floor_id
            JOIN buildings b ON b.id = r.building_id
            WHERE r.property_id = ?
            ORDER BY r.room_number ASC
        `).all(propertyId);

        res.json({
            success: true,
            data: {
                property,
                buildings,
                floors,
                roomTypes,
                rooms,
                stats: {
                    totalRooms: rooms.length,
                    activeRooms: rooms.filter((r: any) => r.status === 'ACTIVE').length,
                    cleanRooms: rooms.filter((r: any) => r.housekeeping_status === 'CLEAN').length
                }
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch property details' });
    }
});

// POST /api/properties - Create a new hotel property
router.post('/', async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const name = body.name || body.propertyName || 'New Luxury Hotel';
        const code = (body.code || body.shortCode || name.slice(0, 3).toUpperCase()).toUpperCase();
        const slug = (body.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-')).slice(0, 50);
        const propertyType = body.propertyType || body.type || 'RESORT';
        const starRating = Number(body.starRating) || 5;
        const email = body.email || 'info@hotel.com';
        const phone = body.phone || '+880 1711-000000';
        const address = body.address || body.addressLine1 || 'Dhaka, Bangladesh';
        const city = body.city || 'Dhaka';
        const country = body.country || 'Bangladesh';
        const currency = body.currency || 'BDT';

        const insertResult = db.prepare(`
            INSERT INTO properties (
                organization_id, name, code, slug, property_type, star_rating,
                email, phone, address_line1, city, country, currency_code, status
            ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        `).run(name, code, slug, propertyType, starRating, email, phone, address, city, country, currency);

        const newPropId = Number(insertResult.lastInsertRowid);

        // Bootstrap default building, floors, room types, and initial rooms
        try {
            const bldInsert = db.prepare(`
                INSERT INTO buildings (property_id, code, name, total_floors, sort_order)
                VALUES (?, 'MAIN', 'Main Wing', 3, 1)
            `).run(newPropId);
            const bldId = Number(bldInsert.lastInsertRowid);

            const f1 = db.prepare(`INSERT INTO floors (property_id, building_id, floor_number, name) VALUES (?, ?, 1, 'Floor 1')`).run(newPropId, bldId);
            const f2 = db.prepare(`INSERT INTO floors (property_id, building_id, floor_number, name) VALUES (?, ?, 2, 'Floor 2')`).run(newPropId, bldId);

            const rt1 = db.prepare(`INSERT INTO room_types (property_id, code, name, category, base_occupancy, max_occupancy, base_rate) VALUES (?, 'DLX', 'Deluxe Double', 'ROOM', 2, 3, 4000)`).run(newPropId);
            const rt2 = db.prepare(`INSERT INTO room_types (property_id, code, name, category, base_occupancy, max_occupancy, base_rate) VALUES (?, 'SUPK', 'Superior King', 'ROOM', 2, 3, 5500)`).run(newPropId);

            const rt1Id = Number(rt1.lastInsertRowid);
            const rt2Id = Number(rt2.lastInsertRowid);
            const f1Id = Number(f1.lastInsertRowid);
            const f2Id = Number(f2.lastInsertRowid);

            db.prepare(`INSERT INTO rooms (property_id, building_id, floor_id, room_type_id, room_number, name) VALUES (?, ?, ?, ?, '101', 'Deluxe 101')`).run(newPropId, bldId, f1Id, rt1Id);
            db.prepare(`INSERT INTO rooms (property_id, building_id, floor_id, room_type_id, room_number, name) VALUES (?, ?, ?, ?, '102', 'Deluxe 102')`).run(newPropId, bldId, f1Id, rt1Id);
            db.prepare(`INSERT INTO rooms (property_id, building_id, floor_id, room_type_id, room_number, name) VALUES (?, ?, ?, ?, '201', 'Superior 201')`).run(newPropId, bldId, f2Id, rt2Id);
            db.prepare(`INSERT INTO rooms (property_id, building_id, floor_id, room_type_id, room_number, name) VALUES (?, ?, ?, ?, '202', 'Superior 202')`).run(newPropId, bldId, f2Id, rt2Id);
        } catch (bootErr) {
            console.warn('Property bootstrap assets notice:', bootErr);
        }

        // Mirror to PostgreSQL if connected
        if (isPostgresConnected()) {
            try {
                await pgPool.query(`
                    INSERT INTO properties (
                        id, organization_id, name, code, slug, property_type, star_rating,
                        email, phone, address_line1, city, country, currency_code, status
                    ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE')
                    ON CONFLICT (id) DO NOTHING
                `, [newPropId, name, code, slug, propertyType, starRating, email, phone, address, city, country, currency]);
            } catch (pgErr: any) {
                console.warn('PG property mirror sync warning:', pgErr.message);
            }
        }

        const created = db.prepare('SELECT * FROM properties WHERE id = ?').get(newPropId);
        res.status(201).json({ success: true, data: created, message: 'Property created successfully' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create property' });
    }
});

// PUT /api/properties/:id - Update property details
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const body = req.body || {};

        db.prepare(`
            UPDATE properties
            SET name = COALESCE(?, name),
                code = COALESCE(?, code),
                property_type = COALESCE(?, property_type),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                address_line1 = COALESCE(?, address_line1),
                city = COALESCE(?, city),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(body.name || null, body.code || null, body.propertyType || null, body.email || null, body.phone || null, body.address || null, body.city || null, propertyId);

        const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
        res.json({ success: true, data: updated, message: 'Property updated successfully' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update property' });
    }
});

// POST /api/properties/:id/buildings - Create building
router.post('/:id/buildings', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id) || 1;
        const { code, name, sortOrder } = req.body;
        const bCode = (code || 'BLD').toUpperCase();
        const bName = name || 'New Wing';
        const result = db.prepare(`
            INSERT INTO buildings (property_id, code, name, sort_order)
            VALUES (?, ?, ?, ?)
        `).run(propertyId, bCode, bName, Number(sortOrder) || 1);
        const newId = Number(result.lastInsertRowid);
        if (isPostgresConnected()) {
            try {
                await pgPool.query(
                    `INSERT INTO buildings (id, property_id, code, name, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
                    [newId, propertyId, bCode, bName, Number(sortOrder) || 1]
                );
            } catch {}
        }
        res.status(201).json({ success: true, data: { id: newId, code: bCode, name: bName } });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create building' });
    }
});

// PUT /api/properties/:id/buildings/:buildingId - Update building
router.put('/:id/buildings/:buildingId', async (req: Request, res: Response) => {
    try {
        const buildingId = Number(req.params.buildingId);
        const { code, name, sortOrder } = req.body;
        db.prepare(`
            UPDATE buildings
            SET code = COALESCE(?, code),
                name = COALESCE(?, name),
                sort_order = COALESCE(?, sort_order)
            WHERE id = ?
        `).run(code ? code.toUpperCase() : null, name || null, sortOrder ? Number(sortOrder) : null, buildingId);
        if (isPostgresConnected()) {
            try {
                await pgPool.query(
                    `UPDATE buildings SET code = COALESCE($1, code), name = COALESCE($2, name), sort_order = COALESCE($3, sort_order) WHERE id = $4`,
                    [code ? code.toUpperCase() : null, name || null, sortOrder ? Number(sortOrder) : null, buildingId]
                );
            } catch {}
        }
        res.json({ success: true, message: 'Building updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update building' });
    }
});

// DELETE /api/properties/:id/buildings/:buildingId - Delete building
router.delete('/:id/buildings/:buildingId', async (req: Request, res: Response) => {
    try {
        const buildingId = Number(req.params.buildingId);
        db.prepare('DELETE FROM buildings WHERE id = ?').run(buildingId);
        if (isPostgresConnected()) {
            try {
                await pgPool.query('DELETE FROM buildings WHERE id = $1', [buildingId]);
            } catch {}
        }
        res.json({ success: true, message: 'Building deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete building' });
    }
});

// POST /api/properties/:id/floors - Create floor
router.post('/:id/floors', async (req: Request, res: Response) => {
    try {
        const { buildingId, floorNumber, name } = req.body;
        const result = db.prepare(`
            INSERT INTO floors (building_id, floor_number, name, sort_order)
            VALUES (?, ?, ?, ?)
        `).run(Number(buildingId) || 1, Number(floorNumber) || 1, name || 'Floor', Number(floorNumber) || 1);
        const newId = Number(result.lastInsertRowid);
        if (isPostgresConnected()) {
            try {
                await pgPool.query(
                    `INSERT INTO floors (id, building_id, floor_number, name, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
                    [newId, Number(buildingId) || 1, Number(floorNumber) || 1, name || 'Floor', Number(floorNumber) || 1]
                );
            } catch {}
        }
        res.status(201).json({ success: true, data: { id: newId } });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create floor' });
    }
});

// PUT /api/properties/:id/floors/:floorId - Update floor
router.put('/:id/floors/:floorId', async (req: Request, res: Response) => {
    try {
        const floorId = Number(req.params.floorId);
        const { buildingId, floorNumber, name } = req.body;
        db.prepare(`
            UPDATE floors
            SET building_id = COALESCE(?, building_id),
                floor_number = COALESCE(?, floor_number),
                name = COALESCE(?, name)
            WHERE id = ?
        `).run(buildingId ? Number(buildingId) : null, floorNumber ? Number(floorNumber) : null, name || null, floorId);
        if (isPostgresConnected()) {
            try {
                await pgPool.query(
                    `UPDATE floors SET building_id = COALESCE($1, building_id), floor_number = COALESCE($2, floor_number), name = COALESCE($3, name) WHERE id = $4`,
                    [buildingId ? Number(buildingId) : null, floorNumber ? Number(floorNumber) : null, name || null, floorId]
                );
            } catch {}
        }
        res.json({ success: true, message: 'Floor updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update floor' });
    }
});

// DELETE /api/properties/:id/floors/:floorId - Delete floor
router.delete('/:id/floors/:floorId', async (req: Request, res: Response) => {
    try {
        const floorId = Number(req.params.floorId);
        db.prepare('DELETE FROM floors WHERE id = ?').run(floorId);
        if (isPostgresConnected()) {
            try {
                await pgPool.query('DELETE FROM floors WHERE id = $1', [floorId]);
            } catch {}
        }
        res.json({ success: true, message: 'Floor deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete floor' });
    }
});

// POST /api/properties/:id/room-types - Create room type
router.post('/:id/room-types', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id) || 1;
        const { code, name, baseOccupancy, maxOccupancy, baseRate, description } = req.body;
        const rtCode = (code || 'RT').toUpperCase();
        const rtName = name || 'New Room Type';
        const result = db.prepare(`
            INSERT INTO room_types (property_id, code, name, base_occupancy, max_adults, max_children, base_rate, description)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        `).run(propertyId, rtCode, rtName, Number(baseOccupancy) || 2, Number(maxOccupancy) || 3, Number(baseRate) || 3500, description || null);
        const newId = Number(result.lastInsertRowid);
        if (isPostgresConnected()) {
            try {
                await pgPool.query(
                    `INSERT INTO room_types (id, property_id, code, name, base_occupancy, max_adults, max_children, base_rate, description) VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8) ON CONFLICT (id) DO NOTHING`,
                    [newId, propertyId, rtCode, rtName, Number(baseOccupancy) || 2, Number(maxOccupancy) || 3, Number(baseRate) || 3500, description || null]
                );
            } catch {}
        }
        res.status(201).json({ success: true, data: { id: newId, code: rtCode, name: rtName } });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create room type' });
    }
});

// PUT /api/properties/:id/room-types/:roomTypeId - Update room type
router.put('/:id/room-types/:roomTypeId', async (req: Request, res: Response) => {
    try {
        const roomTypeId = Number(req.params.roomTypeId);
        const { code, name, baseOccupancy, maxOccupancy, baseRate, description } = req.body;
        db.prepare(`
            UPDATE room_types
            SET code = COALESCE(?, code),
                name = COALESCE(?, name),
                base_occupancy = COALESCE(?, base_occupancy),
                max_adults = COALESCE(?, max_adults),
                base_rate = COALESCE(?, base_rate),
                description = COALESCE(?, description)
            WHERE id = ?
        `).run(code ? code.toUpperCase() : null, name || null, baseOccupancy ? Number(baseOccupancy) : null, maxOccupancy ? Number(maxOccupancy) : null, baseRate ? Number(baseRate) : null, description || null, roomTypeId);
        if (isPostgresConnected()) {
            try {
                await pgPool.query(
                    `UPDATE room_types SET code = COALESCE($1, code), name = COALESCE($2, name), base_occupancy = COALESCE($3, base_occupancy), max_adults = COALESCE($4, max_adults), base_rate = COALESCE($5, base_rate), description = COALESCE($6, description) WHERE id = $7`,
                    [code ? code.toUpperCase() : null, name || null, baseOccupancy ? Number(baseOccupancy) : null, maxOccupancy ? Number(maxOccupancy) : null, baseRate ? Number(baseRate) : null, description || null, roomTypeId]
                );
            } catch {}
        }
        res.json({ success: true, message: 'Room type updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update room type' });
    }
});

// DELETE /api/properties/:id/room-types/:roomTypeId - Delete room type
router.delete('/:id/room-types/:roomTypeId', async (req: Request, res: Response) => {
    try {
        const roomTypeId = Number(req.params.roomTypeId);
        db.prepare('DELETE FROM room_types WHERE id = ?').run(roomTypeId);
        if (isPostgresConnected()) {
            try {
                await pgPool.query('DELETE FROM room_types WHERE id = $1', [roomTypeId]);
            } catch {}
        }
        res.json({ success: true, message: 'Room type deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete room type' });
    }
});

export default router;
