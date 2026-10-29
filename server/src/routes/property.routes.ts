import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { TenantConnectionManager } from '../database/TenantConnectionManager.js';

const router = Router();

// GET /api/properties - List all hotel properties in the chain
router.get('/', async (req: Request, res: Response) => {
    try {
        const properties = await db.prepare(`
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
router.get('/chain/overview', async (req: Request, res: Response) => {
    try {
        let org: any = null;
        try {
            org = await db.prepare('SELECT * FROM organizations LIMIT 1').get();
        } catch (err) {
            console.warn('Chain overview org fetch warning:', err);
        }

        const getSafeCount = async (sql: string): Promise<number> => {
            try {
                const res = await db.prepare(sql).get() as any;
                return Number(res?.c) || 0;
            } catch {
                return 0;
            }
        };

        const getSafeSum = async (sql: string): Promise<number> => {
            try {
                const res = await db.prepare(sql).get() as any;
                return Number(res?.s) || 0;
            } catch {
                return 0;
            }
        };

        const totalProperties = await getSafeCount('SELECT COUNT(*) as c FROM properties');
        const totalRooms = await getSafeCount('SELECT COUNT(*) as c FROM rooms');
        const totalStaff = await getSafeCount("SELECT COUNT(*) as c FROM employees WHERE status = 'ACTIVE'");
        const totalReservations = await getSafeCount('SELECT COUNT(*) as c FROM reservations');
        const totalRevenue = await getSafeSum('SELECT SUM(total_amount) as s FROM reservations');

        res.json({
            success: true,
            data: {
                organization: org || { name: 'Hospitality Enterprise', base_currency: 'USD' },
                totalProperties,
                totalRooms,
                totalStaff,
                totalReservations,
                totalRevenue,
                chainHealth: 'ACTIVE'
            }
        });
    } catch (e: any) {
        console.error('Chain overview route error:', e);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate chain overview metrics'
        });
    }
});

// GET /api/properties/:id - Get property details with buildings, floors & rooms
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const property = await db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId) as any;
        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }
        if (property.settings && typeof property.settings === 'string') {
            try {
                property.settings = JSON.parse(property.settings);
            } catch {}
        }

        const buildings = await db.prepare('SELECT * FROM buildings WHERE property_id = ? ORDER BY sort_order').all(propertyId);
        const floors = await db.prepare(`
            SELECT f.*
            FROM floors f
            JOIN buildings b ON b.id = f.building_id
            WHERE b.property_id = ?
            ORDER BY f.floor_number ASC
        `).all(propertyId);
        const roomTypes = await db.prepare('SELECT * FROM room_types WHERE property_id = ?').all(propertyId);
        const rooms = await db.prepare(`
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

// POST /api/properties - Create and onboard a new hotel property
router.post('/', async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const name = body.name || body.propertyName || 'New Luxury Hotel';
        let rawSlug = body.slug || name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/(^-+|-+$)/g, '');
        if (rawSlug.length < 3) rawSlug = `hotel-${Date.now().toString().slice(-4)}`;
        const code = (body.code || body.shortCode || `${name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-2)}`).toUpperCase();

        const provisionResult = await TenantConnectionManager.provisionTenantDatabase({
            slug: rawSlug,
            name,
            code,
            tier: body.tier || 'STANDARD',
            starRating: Number(body.starRating) || 5,
            propertyType: body.propertyType || 'LUXURY_HOTEL',
            currency: body.currency || 'BDT',
            timeZone: body.timeZone || 'Asia/Dhaka',
            checkInTime: body.checkInTime || '14:00',
            checkOutTime: body.checkOutTime || '12:00',
            address: body.address || 'Dhaka, Bangladesh',
            city: body.city || 'Dhaka',
            country: body.country || 'Bangladesh',
            phone: body.phone || '+880 1700-000000',
            email: body.email || `${rawSlug}@hotelms.com`,
            buildingName: body.buildingName,
            totalFloors: body.totalFloors ? Number(body.totalFloors) : 3,
            roomsPerFloor: body.roomsPerFloor ? Number(body.roomsPerFloor) : 4,
            totalRooms: body.totalRooms ? Number(body.totalRooms) : 12,
            roomTypes: body.roomTypes,
            adminName: body.adminName || 'General Manager',
            adminEmail: body.adminEmail || body.email,
            adminPhone: body.adminPhone || body.phone,
            plugins: body.plugins || []
        });

        const created = await db.prepare('SELECT * FROM properties WHERE id = ?').get(provisionResult.propertyId);
        res.status(201).json({
            success: true,
            data: created || { id: provisionResult.propertyId, name, code },
            tenant: provisionResult,
            message: provisionResult.message
        });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create property' });
    }
});

// PUT /api/properties/:id - Update property details & general operational settings
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const body = req.body || {};
        const starRating = body.starRating ? Math.min(5, Math.max(1, Number(body.starRating))) : null;
        const currency = body.currency ? String(body.currency).slice(0, 3).toUpperCase() : null;
        const settingsJson = body.settings !== undefined ? (typeof body.settings === 'string' ? body.settings : JSON.stringify(body.settings)) : null;

        await db.prepare(`
            UPDATE properties
            SET name = COALESCE(?, name),
                code = COALESCE(?, code),
                star_rating = COALESCE(?, star_rating),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                address = COALESCE(?, address),
                city = COALESCE(?, city),
                country = COALESCE(?, country),
                currency = COALESCE(?, currency),
                time_zone = COALESCE(?, time_zone),
                check_in_time = COALESCE(?, check_in_time),
                check_out_time = COALESCE(?, check_out_time),
                settings = COALESCE(?, settings),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            body.name || null,
            body.code || null,
            starRating,
            body.email || null,
            body.phone || null,
            body.address || null,
            body.city || null,
            body.country || null,
            currency,
            body.timeZone || null,
            body.checkInTime || null,
            body.checkOutTime || null,
            settingsJson,
            propertyId
        );

        const updated = await db.prepare('SELECT * FROM properties WHERE id = ?').get(propertyId);
        res.json({ success: true, data: updated, message: 'Property updated successfully' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update property' });
    }
});

// PUT /api/properties/:id/settings - Dedicated endpoint for property operational settings & configuration
router.put('/:id/settings', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const settings = req.body || {};
        const settingsJson = JSON.stringify(settings);
        await db.prepare('UPDATE properties SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(settingsJson, propertyId);
        res.json({ success: true, message: 'Property configuration saved to database successfully', data: settings });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to save property settings' });
    }
});

// POST /api/properties/:id/buildings - Create building
router.post('/:id/buildings', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Valid property ID is required' });
        }
        const { code, name, sortOrder, totalFloors, type, description, status, amenityIds } = req.body;
        const bCode = (code || 'BLD').toUpperCase();
        const bName = name || 'New Wing';
        const result = await db.prepare(`
            INSERT INTO buildings (property_id, code, name, sort_order, total_floors, type, description, status, amenity_ids_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            propertyId,
            bCode,
            bName,
            Number(sortOrder) || 1,
            Number(totalFloors) || 5,
            type || 'Main Tower',
            description || '',
            status || 'Active',
            amenityIds ? JSON.stringify(amenityIds) : null
        );
        const newId = Number(result.lastInsertRowid);
        res.status(201).json({ success: true, data: { id: newId, code: bCode, name: bName } });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create building' });
    }
});

// PUT /api/properties/:id/buildings/:buildingId - Update building
router.put('/:id/buildings/:buildingId', async (req: Request, res: Response) => {
    try {
        const buildingId = Number(req.params.buildingId);
        const { code, name, sortOrder, totalFloors, type, description, status, amenityIds } = req.body;
        await db.prepare(`
            UPDATE buildings
            SET code = COALESCE(?, code),
                name = COALESCE(?, name),
                sort_order = COALESCE(?, sort_order),
                total_floors = COALESCE(?, total_floors),
                type = COALESCE(?, type),
                description = COALESCE(?, description),
                status = COALESCE(?, status),
                amenity_ids_json = COALESCE(?, amenity_ids_json)
            WHERE id = ?
        `).run(
            code ? code.toUpperCase() : null,
            name || null,
            sortOrder ? Number(sortOrder) : null,
            totalFloors ? Number(totalFloors) : null,
            type || null,
            description || null,
            status || null,
            amenityIds ? JSON.stringify(amenityIds) : null,
            buildingId
        );
        res.json({ success: true, message: 'Building updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update building' });
    }
});

// DELETE /api/properties/:id/buildings/:buildingId - Delete building
router.delete('/:id/buildings/:buildingId', async (req: Request, res: Response) => {
    try {
        const buildingId = Number(req.params.buildingId);
        await db.prepare('DELETE FROM buildings WHERE id = ?').run(buildingId);
        res.json({ success: true, message: 'Building deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete building' });
    }
});

// POST /api/properties/:id/floors - Create floor
router.post('/:id/floors', async (req: Request, res: Response) => {
    try {
        const { buildingId, floorNumber, name, category, roomCapacity, description, status, amenityIds } = req.body;
        const result = await db.prepare(`
            INSERT INTO floors (building_id, floor_number, name, sort_order, category, room_capacity, description, status, amenity_ids_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            Number(buildingId) || 1,
            Number(floorNumber) || 1,
            name || 'Floor',
            Number(floorNumber) || 1,
            category || 'Guest Rooms',
            Number(roomCapacity) || 8,
            description || '',
            status || 'Open',
            amenityIds ? JSON.stringify(amenityIds) : null
        );
        const newId = Number(result.lastInsertRowid);
        res.status(201).json({ success: true, data: { id: newId } });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create floor' });
    }
});

// PUT /api/properties/:id/floors/:floorId - Update floor
router.put('/:id/floors/:floorId', async (req: Request, res: Response) => {
    try {
        const floorId = Number(req.params.floorId);
        const { buildingId, floorNumber, name, category, roomCapacity, description, status, amenityIds } = req.body;
        await db.prepare(`
            UPDATE floors
            SET building_id = COALESCE(?, building_id),
                floor_number = COALESCE(?, floor_number),
                name = COALESCE(?, name),
                category = COALESCE(?, category),
                room_capacity = COALESCE(?, room_capacity),
                description = COALESCE(?, description),
                status = COALESCE(?, status),
                amenity_ids_json = COALESCE(?, amenity_ids_json)
            WHERE id = ?
        `).run(
            buildingId ? Number(buildingId) : null,
            floorNumber ? Number(floorNumber) : null,
            name || null,
            category || null,
            roomCapacity ? Number(roomCapacity) : null,
            description || null,
            status || null,
            amenityIds ? JSON.stringify(amenityIds) : null,
            floorId
        );
        res.json({ success: true, message: 'Floor updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update floor' });
    }
});

// DELETE /api/properties/:id/floors/:floorId - Delete floor
router.delete('/:id/floors/:floorId', async (req: Request, res: Response) => {
    try {
        const floorId = Number(req.params.floorId);
        await db.prepare('DELETE FROM floors WHERE id = ?').run(floorId);
        res.json({ success: true, message: 'Floor deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete floor' });
    }
});

// POST /api/properties/:id/room-types - Create room type
router.post('/:id/room-types', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Valid property ID is required' });
        }
        const body = req.body || {};
        const { code, name, baseOccupancy, maxOccupancy, baseRate, description } = body;
        const rtCode = (code || body.shortCode || 'RT').toUpperCase();
        const rtName = name || 'New Room Type';
        const baseOcc = Number(baseOccupancy || body.baseAdult) || 2;
        const maxOcc = Number(maxOccupancy || body.maxAdult) || 3;
        const maxChild = Number(body.maxChild) || 1;
        const rate = Number(baseRate || body.basePrice) || 3500;
        const extraAdult = Number(body.extraAdultPrice) || 1000;
        const extraChild = Number(body.extraChildPrice) || 500;
        const size = Number(body.size) || 350;

        const result = await db.prepare(`
            INSERT INTO room_types (
                property_id, code, name, base_occupancy, max_adults, max_children, base_rate, extra_bed_rate,
                description, size, extra_adult_price, extra_child_price, pricing_unit, bed_type, view_type,
                smoking_policy, amenities_json, photos_json, is_connecting, show_on_website, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            propertyId,
            rtCode,
            rtName,
            baseOcc,
            maxOcc,
            maxChild,
            rate,
            extraAdult,
            description || body.description || null,
            size,
            extraAdult,
            extraChild,
            body.pricingUnit || 'Per Room',
            body.bedType || 'King',
            body.viewType || 'City View',
            body.smokingPolicy || 'Non-Smoking',
            body.amenities ? JSON.stringify(body.amenities) : null,
            body.photos ? JSON.stringify(body.photos) : null,
            body.isConnecting ? 1 : 0,
            body.showOnWebsite !== undefined ? (body.showOnWebsite ? 1 : 0) : 1,
            body.status || 'Active'
        );

        const newId = Number(result.lastInsertRowid);
        res.status(201).json({ success: true, data: { ...body, id: newId, code: rtCode, name: rtName } });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create room type' });
    }
});

// PUT /api/properties/:id/room-types/:roomTypeId - Update room type
router.put('/:id/room-types/:roomTypeId', async (req: Request, res: Response) => {
    try {
        const roomTypeId = Number(req.params.roomTypeId);
        const body = req.body || {};
        const { code, name, baseOccupancy, maxOccupancy, baseRate, description } = body;
        const rtCode = code || body.shortCode;
        const baseOcc = baseOccupancy || body.baseAdult;
        const maxOcc = maxOccupancy || body.maxAdult;
        const rate = baseRate || body.basePrice;

        await db.prepare(`
            UPDATE room_types
            SET code = COALESCE(?, code),
                name = COALESCE(?, name),
                base_occupancy = COALESCE(?, base_occupancy),
                max_adults = COALESCE(?, max_adults),
                max_children = COALESCE(?, max_children),
                base_rate = COALESCE(?, base_rate),
                extra_bed_rate = COALESCE(?, extra_bed_rate),
                description = COALESCE(?, description),
                size = COALESCE(?, size),
                extra_adult_price = COALESCE(?, extra_adult_price),
                extra_child_price = COALESCE(?, extra_child_price),
                pricing_unit = COALESCE(?, pricing_unit),
                bed_type = COALESCE(?, bed_type),
                view_type = COALESCE(?, view_type),
                smoking_policy = COALESCE(?, smoking_policy),
                amenities_json = COALESCE(?, amenities_json),
                photos_json = COALESCE(?, photos_json),
                is_connecting = COALESCE(?, is_connecting),
                show_on_website = COALESCE(?, show_on_website),
                status = COALESCE(?, status)
            WHERE id = ?
        `).run(
            rtCode ? rtCode.toUpperCase() : null,
            name || null,
            baseOcc ? Number(baseOcc) : null,
            maxOcc ? Number(maxOcc) : null,
            body.maxChild !== undefined ? Number(body.maxChild) : null,
            rate ? Number(rate) : null,
            body.extraAdultPrice ? Number(body.extraAdultPrice) : null,
            description || body.description || null,
            body.size ? Number(body.size) : null,
            body.extraAdultPrice ? Number(body.extraAdultPrice) : null,
            body.extraChildPrice ? Number(body.extraChildPrice) : null,
            body.pricingUnit || null,
            body.bedType || null,
            body.viewType || null,
            body.smokingPolicy || null,
            body.amenities ? JSON.stringify(body.amenities) : null,
            body.photos ? JSON.stringify(body.photos) : null,
            body.isConnecting !== undefined ? (body.isConnecting ? 1 : 0) : null,
            body.showOnWebsite !== undefined ? (body.showOnWebsite ? 1 : 0) : null,
            body.status || null,
            roomTypeId
        );
        res.json({ success: true, message: 'Room type updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update room type' });
    }
});

// DELETE /api/properties/:id/room-types/:roomTypeId - Delete room type
router.delete('/:id/room-types/:roomTypeId', async (req: Request, res: Response) => {
    try {
        const roomTypeId = Number(req.params.roomTypeId);
        await db.prepare('DELETE FROM room_types WHERE id = ?').run(roomTypeId);
        res.json({ success: true, message: 'Room type deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete room type' });
    }
});

export default router;
