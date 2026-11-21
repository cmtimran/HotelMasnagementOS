import { Router, Request, Response } from 'express';
import { pgPool } from '../database/postgres.js';
import { TenantConnectionManager } from '../database/TenantConnectionManager.js';
import { getEnrichedCatalogForYear, checkIsDuplicate, fetchAllSupportedCountries, type ExternalHolidayCandidate } from '../utils/holidayCatalog.js';
import { requireRole } from '../middleware/rbacGuard.js';

const router = Router();

// GET /api/properties - List all hotel properties in the chain
router.get('/', async (req: Request, res: Response) => {
    try {
        const propertiesRes = await pgPool.query(`
            SELECT 
                p.*,
                o.name as organization_name,
                (SELECT COUNT(*) FROM rooms r WHERE r.property_id = p.id) as total_rooms,
                (SELECT COUNT(*) FROM buildings b WHERE b.property_id = p.id) as total_buildings,
                (SELECT COUNT(*) FROM employees e WHERE e.property_id = p.id AND e.status = 'ACTIVE') as total_staff
            FROM properties p
            JOIN organizations o ON o.id = p.organization_id
            ORDER BY p.id ASC
        `);
        const properties = propertiesRes.rows;

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
            const orgRes = await pgPool.query('SELECT * FROM organizations LIMIT 1');
            org = orgRes.rows[0] || null;
        } catch (err) {
            console.warn('Chain overview org fetch warning:', err);
        }

        const getSafeCount = async (sql: string): Promise<number> => {
            try {
                const res = await pgPool.query(sql);
                return Number(res.rows[0]?.c) || 0;
            } catch {
                return 0;
            }
        };

        const getSafeSum = async (sql: string): Promise<number> => {
            try {
                const res = await pgPool.query(sql);
                return Number(res.rows[0]?.s) || 0;
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
        const propRes = await pgPool.query('SELECT * FROM properties WHERE id = $1', [propertyId]);
        const property = propRes.rows[0] as any;
        if (!property) {
            return res.status(404).json({ success: false, error: 'Property not found' });
        }
        if (property.settings && typeof property.settings === 'string') {
            try {
                property.settings = JSON.parse(property.settings);
            } catch {}
        }

        const buildingsRes = await pgPool.query('SELECT * FROM buildings WHERE property_id = $1 ORDER BY sort_order', [propertyId]);
        const buildings = buildingsRes.rows;
        const floorsRes = await pgPool.query(`
            SELECT f.*
            FROM floors f
            JOIN buildings b ON b.id = f.building_id
            WHERE b.property_id = $1
            ORDER BY f.floor_number ASC
        `, [propertyId]);
        const floors = floorsRes.rows;
        const rawRoomTypesRes = await pgPool.query('SELECT * FROM room_types WHERE property_id = $1 ORDER BY display_order ASC, id ASC', [propertyId]);
        const rawRoomTypes = rawRoomTypesRes.rows;
        const roomTypes = rawRoomTypes.map((rt: any) => {
            let raw: any = {};
            try {
                if (rt.raw_json) raw = typeof rt.raw_json === 'string' ? JSON.parse(rt.raw_json) : rt.raw_json;
            } catch {}
            return {
                ...raw,
                ...rt,
                id: String(rt.id),
                property_id: Number(rt.property_id),
                code: rt.code,
                name: rt.name,
                base_occupancy: Number(rt.base_occupancy ?? raw.baseAdult ?? 2),
                max_adults: Number(rt.max_adults ?? raw.maxAdult ?? 2),
                max_children: Number(rt.max_children ?? raw.maxChild ?? 0),
                base_rate: rt.base_rate,
                extra_bed_rate: rt.extra_bed_rate,
                status: rt.status || 'Active'
            };
        });
        const roomsRes = await pgPool.query(`
            SELECT r.*, rt.name as room_type_name, f.name as floor_name, b.name as building_name
            FROM rooms r
            JOIN room_types rt ON rt.id = r.room_type_id
            JOIN floors f ON f.id = r.floor_id
            JOIN buildings b ON b.id = r.building_id
            WHERE r.property_id = $1
            ORDER BY r.room_number ASC
        `, [propertyId]);
        const rooms = roomsRes.rows;

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

// POST /api/properties - Create and onboard a new hotel property (Super Admin Only)
router.post('/', requireRole(['super_admin']), async (req: Request, res: Response) => {
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

        const createdRes = await pgPool.query('SELECT * FROM properties WHERE id = $1', [provisionResult.propertyId]);
        const created = createdRes.rows[0] || null;
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
router.put('/:id', requireRole(['super_admin', 'hotel_admin', 'general_manager']), async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const body = req.body || {};
        const starRating = body.starRating ? Math.min(5, Math.max(1, Number(body.starRating))) : null;
        const currency = body.currency ? String(body.currency).slice(0, 3).toUpperCase() : null;
        const settingsJson = body.settings !== undefined ? (typeof body.settings === 'string' ? body.settings : JSON.stringify(body.settings)) : null;

        await pgPool.query(`
            UPDATE properties
            SET name = COALESCE($1, name),
                code = COALESCE($2, code),
                star_rating = COALESCE($3, star_rating),
                email = COALESCE($4, email),
                phone = COALESCE($5, phone),
                address = COALESCE($6, address),
                city = COALESCE($7, city),
                country = COALESCE($8, country),
                currency = COALESCE($9, currency),
                time_zone = COALESCE($10, time_zone),
                check_in_time = COALESCE($11, check_in_time),
                check_out_time = COALESCE($12, check_out_time),
                settings = COALESCE($13, settings),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $14
        `, [
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
        ]);

        const updatedRes = await pgPool.query('SELECT * FROM properties WHERE id = $1', [propertyId]);
        const updated = updatedRes.rows[0];
        res.json({ success: true, data: updated, message: 'Property updated successfully' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update property' });
    }
});

// PUT /api/properties/:id/settings - Dedicated endpoint for property operational settings & configuration
router.put('/:id/settings', requireRole(['super_admin', 'hotel_admin', 'general_manager']), async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const settings = req.body || {};
        const settingsJson = JSON.stringify(settings);
        await pgPool.query('UPDATE properties SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [settingsJson, propertyId]);
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
        const result = await pgPool.query(`
            INSERT INTO buildings (property_id, code, name, sort_order, total_floors, type, description, status, amenity_ids_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [
            propertyId,
            bCode,
            bName,
            Number(sortOrder) || 1,
            Number(totalFloors) || 5,
            type || 'Main Tower',
            description || '',
            status || 'Active',
            amenityIds ? JSON.stringify(amenityIds) : null
        ]);
        const newId = Number(result.rows[0]?.id);
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
        await pgPool.query(`
            UPDATE buildings
            SET code = COALESCE($1, code),
                name = COALESCE($2, name),
                sort_order = COALESCE($3, sort_order),
                total_floors = COALESCE($4, total_floors),
                type = COALESCE($5, type),
                description = COALESCE($6, description),
                status = COALESCE($7, status),
                amenity_ids_json = COALESCE($8, amenity_ids_json)
            WHERE id = $9
        `, [
            code ? code.toUpperCase() : null,
            name || null,
            sortOrder ? Number(sortOrder) : null,
            totalFloors ? Number(totalFloors) : null,
            type || null,
            description || null,
            status || null,
            amenityIds ? JSON.stringify(amenityIds) : null,
            buildingId
        ]);
        res.json({ success: true, message: 'Building updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update building' });
    }
});

// DELETE /api/properties/:id/buildings/:buildingId - Delete building
router.delete('/:id/buildings/:buildingId', requireRole(['super_admin', 'general_manager']), async (req: Request, res: Response) => {
    try {
        const buildingId = Number(req.params.buildingId);
        await pgPool.query('DELETE FROM buildings WHERE id = $1', [buildingId]);
        res.json({ success: true, message: 'Building deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete building' });
    }
});

// POST /api/properties/:id/floors - Create floor
router.post('/:id/floors', async (req: Request, res: Response) => {
    try {
        const { buildingId, floorNumber, name, category, roomCapacity, description, status, amenityIds } = req.body;
        const result = await pgPool.query(`
            INSERT INTO floors (building_id, floor_number, name, sort_order, category, room_capacity, description, status, amenity_ids_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `, [
            Number(buildingId) || 1,
            Number(floorNumber) || 1,
            name || 'Floor',
            Number(floorNumber) || 1,
            category || 'Guest Rooms',
            Number(roomCapacity) || 8,
            description || '',
            status || 'Open',
            amenityIds ? JSON.stringify(amenityIds) : null
        ]);
        const newId = Number(result.rows[0]?.id);
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
        await pgPool.query(`
            UPDATE floors
            SET building_id = COALESCE($1, building_id),
                floor_number = COALESCE($2, floor_number),
                name = COALESCE($3, name),
                category = COALESCE($4, category),
                room_capacity = COALESCE($5, room_capacity),
                description = COALESCE($6, description),
                status = COALESCE($7, status),
                amenity_ids_json = COALESCE($8, amenity_ids_json)
            WHERE id = $9
        `, [
            buildingId ? Number(buildingId) : null,
            floorNumber ? Number(floorNumber) : null,
            name || null,
            category || null,
            roomCapacity ? Number(roomCapacity) : null,
            description || null,
            status || null,
            amenityIds ? JSON.stringify(amenityIds) : null,
            floorId
        ]);
        res.json({ success: true, message: 'Floor updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update floor' });
    }
});

// DELETE /api/properties/:id/floors/:floorId - Delete floor
router.delete('/:id/floors/:floorId', requireRole(['super_admin', 'general_manager']), async (req: Request, res: Response) => {
    try {
        const floorId = Number(req.params.floorId);
        await pgPool.query('DELETE FROM floors WHERE id = $1', [floorId]);
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
        const extraBed = Number(body.extraBedRate ?? body.extra_bed_rate ?? body.extraBedPrice ?? 1000);
        const size = Number(body.size) || 350;

        const result = await pgPool.query(`
            INSERT INTO room_types (
                property_id, code, name, base_occupancy, max_adults, max_children, base_rate, extra_bed_rate,
                description, size, extra_adult_price, extra_child_price, pricing_unit, pricing_basis,
                extra_bed_allowed, extra_bed_quantity, baby_cot_allowed, bed_type, view_type,
                smoking_policy, amenities, photos, videos, is_connecting, show_on_website, status, raw_json
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
            RETURNING id
        `, [
            propertyId,
            rtCode,
            rtName,
            baseOcc,
            maxOcc,
            maxChild,
            rate,
            extraBed,
            description || body.description || null,
            size,
            extraAdult,
            extraChild,
            body.pricingUnit || 'Per Room',
            body.pricingBasis || 'Per Room',
            body.extraBedAllowed ? 1 : 0,
            Number(body.extraBedQuantity ?? 0),
            body.babyCotAllowed !== undefined ? (body.babyCotAllowed ? 1 : 0) : 1,
            body.bedType || 'King',
            body.viewType || 'City View',
            body.smokingPolicy || 'Non-Smoking',
            body.amenities ? (typeof body.amenities === 'string' ? body.amenities : JSON.stringify(body.amenities)) : '[]',
            body.photos ? (typeof body.photos === 'string' ? body.photos : JSON.stringify(body.photos)) : '[]',
            body.videos ? (typeof body.videos === 'string' ? body.videos : JSON.stringify(body.videos)) : '[]',
            body.isConnecting ? 1 : 0,
            body.showOnWebsite !== undefined ? (body.showOnWebsite ? 1 : 0) : 1,
            body.status || 'Active',
            JSON.stringify(body)
        ]);

        const newId = Number(result.rows[0]?.id);
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
        const baseOcc = baseOccupancy !== undefined ? Number(baseOccupancy) : (body.baseAdult !== undefined ? Number(body.baseAdult) : null);
        const maxOcc = maxOccupancy !== undefined ? Number(maxOccupancy) : (body.maxAdult !== undefined ? Number(body.maxAdult) : null);
        const maxChild = body.maxChild !== undefined ? Number(body.maxChild) : null;
        const rate = baseRate !== undefined ? Number(baseRate) : (body.basePrice !== undefined ? Number(body.basePrice) : null);
        const extraBed = body.extraBedRate !== undefined ? Number(body.extraBedRate) : (body.extraBedPrice !== undefined ? Number(body.extraBedPrice) : null);

        await pgPool.query(`
            UPDATE room_types
            SET code = COALESCE($1, code),
                name = COALESCE($2, name),
                base_occupancy = COALESCE($3, base_occupancy),
                max_adults = COALESCE($4, max_adults),
                max_children = COALESCE($5, max_children),
                base_rate = COALESCE($6, base_rate),
                extra_bed_rate = COALESCE($7, extra_bed_rate),
                description = COALESCE($8, description),
                size = COALESCE($9, size),
                extra_adult_price = COALESCE($10, extra_adult_price),
                extra_child_price = COALESCE($11, extra_child_price),
                pricing_unit = COALESCE($12, pricing_unit),
                pricing_basis = COALESCE($13, pricing_basis),
                extra_bed_allowed = COALESCE($14, extra_bed_allowed),
                extra_bed_quantity = COALESCE($15, extra_bed_quantity),
                baby_cot_allowed = COALESCE($16, baby_cot_allowed),
                bed_type = COALESCE($17, bed_type),
                view_type = COALESCE($18, view_type),
                smoking_policy = COALESCE($19, smoking_policy),
                amenities = COALESCE($20, amenities),
                photos = COALESCE($21, photos),
                videos = COALESCE($22, videos),
                is_connecting = COALESCE($23, is_connecting),
                show_on_website = COALESCE($24, show_on_website),
                status = COALESCE($25, status),
                raw_json = COALESCE($26, raw_json)
            WHERE id = $27
        `, [
            rtCode ? rtCode.toUpperCase() : null,
            name || null,
            baseOcc,
            maxOcc,
            maxChild,
            rate,
            extraBed,
            description || body.description || null,
            body.size !== undefined ? Number(body.size) : null,
            body.extraAdultPrice !== undefined ? Number(body.extraAdultPrice) : null,
            body.extraChildPrice !== undefined ? Number(body.extraChildPrice) : null,
            body.pricingUnit || null,
            body.pricingBasis || null,
            body.extraBedAllowed !== undefined ? (body.extraBedAllowed ? 1 : 0) : null,
            body.extraBedQuantity !== undefined ? Number(body.extraBedQuantity) : null,
            body.babyCotAllowed !== undefined ? (body.babyCotAllowed ? 1 : 0) : null,
            body.bedType || null,
            body.viewType || null,
            body.smokingPolicy || null,
            body.amenities ? (typeof body.amenities === 'string' ? body.amenities : JSON.stringify(body.amenities)) : null,
            body.photos ? (typeof body.photos === 'string' ? body.photos : JSON.stringify(body.photos)) : null,
            body.videos ? (typeof body.videos === 'string' ? body.videos : JSON.stringify(body.videos)) : null,
            body.isConnecting !== undefined ? (body.isConnecting ? 1 : 0) : null,
            body.showOnWebsite !== undefined ? (body.showOnWebsite ? 1 : 0) : null,
            body.status || null,
            JSON.stringify(body),
            roomTypeId
        ]);
        res.json({ success: true, message: 'Room type updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update room type' });
    }
});

// DELETE /api/properties/:id/room-types/:roomTypeId - Delete room type
router.delete('/:id/room-types/:roomTypeId', requireRole(['super_admin', 'general_manager']), async (req: Request, res: Response) => {
    try {
        const roomTypeId = Number(req.params.roomTypeId);
        // Check if active physical rooms are currently linked to this room type
        const assignedRes = await pgPool.query('SELECT room_number FROM rooms WHERE room_type_id = $1', [roomTypeId]);
        const assignedRooms = assignedRes.rows;
        if (assignedRooms.length > 0) {
            const roomNums = assignedRooms.map((r: any) => r.room_number).join(', ');
            return res.status(400).json({
                success: false,
                error: `Cannot delete room type: ${assignedRooms.length} room(s) (${roomNums}) are currently assigned to this room type. Please reassign those rooms first.`
            });
        }
        await pgPool.query('DELETE FROM room_types WHERE id = $1', [roomTypeId]);
        res.json({ success: true, message: 'Room type deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete room type' });
    }
});

// ==========================================
// HOLIDAY & PEAK GOVERNANCE API
// ==========================================

const mapHolidayRow = (r: any) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category,
    startDate: typeof r.start_date === 'string' ? r.start_date.slice(0, 10) : (r.start_date ? new Date(r.start_date).toISOString().slice(0, 10) : ''),
    endDate: typeof r.end_date === 'string' ? r.end_date.slice(0, 10) : (r.end_date ? new Date(r.end_date).toISOString().slice(0, 10) : ''),
    daysCount: Number(r.days_count) || 1,
    hasSurgeRate: Boolean(r.has_surge_rate),
    rateMultiplier: Number(r.rate_multiplier) || 1.0,
    minStayNights: Number(r.min_stay_nights) || 1,
    mandatoryGala: Boolean(r.mandatory_gala),
    galaDinnerFee: Number(r.gala_dinner_fee) || 0,
    staffWageMultiplier: Number(r.staff_wage_multiplier) || 2.0,
    compOffCredit: Boolean(r.comp_off_credit),
    minimumStaffingAlert: r.minimum_staffing_alert || 'STANDARD',
    isRecurring: Boolean(r.is_recurring),
    status: r.status || 'ACTIVE',
    description: r.description || '',
    createdAt: r.created_at
});

// GET /api/properties/:id/holidays - List all holidays for property
router.get('/:id/holidays', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const rowsRes = await pgPool.query(`
            SELECT * FROM holidays 
            WHERE property_id = $1 
            ORDER BY start_date ASC, code ASC
        `, [propertyId]);
        const rows = rowsRes.rows;

        res.json({
            success: true,
            data: rows.map(mapHolidayRow),
            count: rows.length
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch holidays' });
    }
});

// GET /api/properties/:id/holidays/countries - Complete global countries list supported by live holiday registries
router.get('/:id/holidays/countries', async (req: Request, res: Response) => {
    try {
        const countries = await fetchAllSupportedCountries();
        res.json({
            success: true,
            count: countries.length,
            data: countries
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch countries' });
    }
});

// GET /api/properties/:id/holidays/external-catalog - Live Government API & Festival Catalog by Year & Country
router.get('/:id/holidays/external-catalog', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const year = Number(req.query.year) || new Date().getFullYear();
        const country = (typeof req.query.country === 'string' ? req.query.country : 'BD').trim().toUpperCase();

        const existingRowsRes = await pgPool.query(`
            SELECT id, code, name, start_date, end_date, category 
            FROM holidays 
            WHERE property_id = $1
        `, [propertyId]);
        const existingRows = existingRowsRes.rows;

        const result = await getEnrichedCatalogForYear(year, country, existingRows);
        res.json({
            success: true,
            ...result
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch external holiday catalog' });
    }
});

// POST /api/properties/:id/holidays/bulk-import - Batch import with automatic duplicate protection
router.post('/:id/holidays/bulk-import', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const { holidays: candidates, skipDuplicates = true } = req.body;

        if (!Array.isArray(candidates) || candidates.length === 0) {
            return res.status(400).json({ success: false, error: 'No holidays provided for import' });
        }

        const existingRowsRes = await pgPool.query(`
            SELECT id, code, name, start_date, end_date, category 
            FROM holidays 
            WHERE property_id = $1
        `, [propertyId]);
        const existingRows: any[] = existingRowsRes.rows;

        const imported: any[] = [];
        const skipped: any[] = [];

        for (const item of candidates) {
            const dupCheck = checkIsDuplicate(item, existingRows);
            if (dupCheck.isDuplicate) {
                skipped.push({
                    code: item.code,
                    name: item.name,
                    startDate: item.startDate,
                    reason: dupCheck.reason || 'Already exists in hotel calendar'
                });
                if (skipDuplicates) {
                    continue; // Skip duplicate holiday!
                }
            }

            const holidayId = item.id || `hol-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            let daysCount = Number(item.daysCount) || 1;
            if (item.startDate && item.endDate) {
                const s = new Date(item.startDate);
                const e = new Date(item.endDate);
                const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
                if (diff > 0) daysCount = diff;
            }

            await pgPool.query(`
                INSERT INTO holidays (
                    id, property_id, code, name, category, start_date, end_date, days_count,
                    has_surge_rate, rate_multiplier, min_stay_nights, mandatory_gala, gala_dinner_fee,
                    staff_wage_multiplier, comp_off_credit, minimum_staffing_alert, is_recurring,
                    status, description, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8,
                    $9, $10, $11, $12, $13,
                    $14, $15, $16, $17,
                    $18, $19, CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO UPDATE SET
                    code = EXCLUDED.code,
                    name = EXCLUDED.name,
                    category = EXCLUDED.category,
                    start_date = EXCLUDED.start_date,
                    end_date = EXCLUDED.end_date,
                    days_count = EXCLUDED.days_count,
                    has_surge_rate = EXCLUDED.has_surge_rate,
                    rate_multiplier = EXCLUDED.rate_multiplier,
                    min_stay_nights = EXCLUDED.min_stay_nights,
                    mandatory_gala = EXCLUDED.mandatory_gala,
                    gala_dinner_fee = EXCLUDED.gala_dinner_fee,
                    staff_wage_multiplier = EXCLUDED.staff_wage_multiplier,
                    comp_off_credit = EXCLUDED.comp_off_credit,
                    minimum_staffing_alert = EXCLUDED.minimum_staffing_alert,
                    is_recurring = EXCLUDED.is_recurring,
                    status = EXCLUDED.status,
                    description = EXCLUDED.description,
                    updated_at = CURRENT_TIMESTAMP
            `, [
                holidayId,
                propertyId,
                item.code,
                item.name,
                item.category || 'PUBLIC',
                item.startDate,
                item.endDate || item.startDate,
                daysCount,
                item.hasSurgeRate ? 1 : 0,
                Number(item.rateMultiplier) || 1.0,
                Number(item.minStayNights) || 1,
                item.mandatoryGala ? 1 : 0,
                Number(item.galaDinnerFee) || 0,
                Number(item.staffWageMultiplier) || 2.0,
                item.compOffCredit !== false ? 1 : 0,
                item.minimumStaffingAlert || 'STANDARD',
                item.isRecurring ? 1 : 0,
                item.status || 'ACTIVE',
                item.description || null
            ]);

            // Record into local list to prevent intra-batch duplicates
            existingRows.push({
                id: holidayId,
                code: item.code,
                name: item.name,
                start_date: item.startDate,
                end_date: item.endDate || item.startDate
            });

            imported.push({
                id: holidayId,
                code: item.code,
                name: item.name,
                startDate: item.startDate,
                endDate: item.endDate || item.startDate
            });
        }

        const message = skipped.length > 0
            ? `Successfully imported ${imported.length} new holidays. ${skipped.length} duplicate entries were automatically skipped.`
            : `Successfully imported all ${imported.length} holidays.`;

        res.json({
            success: true,
            importedCount: imported.length,
            skippedCount: skipped.length,
            skipped,
            imported,
            message
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to bulk import holidays' });
    }
});

// POST /api/properties/:id/holidays - Create or upsert a holiday (with duplicate protection)
router.post('/:id/holidays', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const b = req.body;
        const holidayId = b.id || `hol-${Date.now()}`;

        // If this is a new holiday creation, verify duplicate protection
        if (!b.id && !b.allowDuplicate) {
            const existingRowsRes = await pgPool.query(`
                SELECT id, code, name, start_date, end_date 
                FROM holidays 
                WHERE property_id = $1
            `, [propertyId]);
            const existingRows: any[] = existingRowsRes.rows;

            const dup = checkIsDuplicate(b, existingRows);
            if (dup.isDuplicate) {
                return res.status(409).json({
                    success: false,
                    isDuplicate: true,
                    error: `Cannot add duplicate holiday: ${dup.reason}`,
                    matchedHolidayId: dup.matchedId
                });
            }
        }

        // Compute days count if not provided
        let daysCount = Number(b.daysCount) || 1;
        if (b.startDate && b.endDate) {
            const s = new Date(b.startDate);
            const e = new Date(b.endDate);
            const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
            if (diff > 0) daysCount = diff;
        }

        await pgPool.query(`
            INSERT INTO holidays (
                id, property_id, code, name, category, start_date, end_date, days_count,
                has_surge_rate, rate_multiplier, min_stay_nights, mandatory_gala, gala_dinner_fee,
                staff_wage_multiplier, comp_off_credit, minimum_staffing_alert, is_recurring,
                status, description, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13,
                $14, $15, $16, $17,
                $18, $19, CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                code = EXCLUDED.code,
                name = EXCLUDED.name,
                category = EXCLUDED.category,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                days_count = EXCLUDED.days_count,
                has_surge_rate = EXCLUDED.has_surge_rate,
                rate_multiplier = EXCLUDED.rate_multiplier,
                min_stay_nights = EXCLUDED.min_stay_nights,
                mandatory_gala = EXCLUDED.mandatory_gala,
                gala_dinner_fee = EXCLUDED.gala_dinner_fee,
                staff_wage_multiplier = EXCLUDED.staff_wage_multiplier,
                comp_off_credit = EXCLUDED.comp_off_credit,
                minimum_staffing_alert = EXCLUDED.minimum_staffing_alert,
                is_recurring = EXCLUDED.is_recurring,
                status = EXCLUDED.status,
                description = EXCLUDED.description,
                updated_at = CURRENT_TIMESTAMP
        `, [
            holidayId,
            propertyId,
            b.code,
            b.name,
            b.category || 'PUBLIC',
            b.startDate,
            b.endDate,
            daysCount,
            b.hasSurgeRate ? 1 : 0,
            Number(b.rateMultiplier) || 1.0,
            Number(b.minStayNights) || 1,
            b.mandatoryGala ? 1 : 0,
            Number(b.galaDinnerFee) || 0,
            Number(b.staffWageMultiplier) || 2.0,
            b.compOffCredit !== false ? 1 : 0,
            b.minimumStaffingAlert || 'STANDARD',
            b.isRecurring ? 1 : 0,
            b.status || 'ACTIVE',
            b.description || null
        ]);

        const createdRes = await pgPool.query('SELECT * FROM holidays WHERE id = $1', [holidayId]);
        const created = createdRes.rows[0];
        res.json({
            success: true,
            data: mapHolidayRow(created),
            message: 'Holiday saved successfully'
        });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to save holiday' });
    }
});

// PUT /api/properties/:id/holidays/:holidayId - Update holiday
router.put('/:id/holidays/:holidayId', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const holidayId = req.params.holidayId;
        const b = req.body;

        let daysCount = Number(b.daysCount) || 1;
        if (b.startDate && b.endDate) {
            const s = new Date(b.startDate);
            const e = new Date(b.endDate);
            const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
            if (diff > 0) daysCount = diff;
        }

        await pgPool.query(`
            UPDATE holidays SET
                code = COALESCE($1, code),
                name = COALESCE($2, name),
                category = COALESCE($3, category),
                start_date = COALESCE($4, start_date),
                end_date = COALESCE($5, end_date),
                days_count = COALESCE($6, days_count),
                has_surge_rate = COALESCE($7, has_surge_rate),
                rate_multiplier = COALESCE($8, rate_multiplier),
                min_stay_nights = COALESCE($9, min_stay_nights),
                mandatory_gala = COALESCE($10, mandatory_gala),
                gala_dinner_fee = COALESCE($11, gala_dinner_fee),
                staff_wage_multiplier = COALESCE($12, staff_wage_multiplier),
                comp_off_credit = COALESCE($13, comp_off_credit),
                minimum_staffing_alert = COALESCE($14, minimum_staffing_alert),
                is_recurring = COALESCE($15, is_recurring),
                status = COALESCE($16, status),
                description = COALESCE($17, description),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $18 AND property_id = $19
        `, [
            b.code || null,
            b.name || null,
            b.category || null,
            b.startDate || null,
            b.endDate || null,
            daysCount,
            b.hasSurgeRate !== undefined ? (b.hasSurgeRate ? 1 : 0) : null,
            b.rateMultiplier !== undefined ? Number(b.rateMultiplier) : null,
            b.minStayNights !== undefined ? Number(b.minStayNights) : null,
            b.mandatoryGala !== undefined ? (b.mandatoryGala ? 1 : 0) : null,
            b.galaDinnerFee !== undefined ? Number(b.galaDinnerFee) : null,
            b.staffWageMultiplier !== undefined ? Number(b.staffWageMultiplier) : null,
            b.compOffCredit !== undefined ? (b.compOffCredit ? 1 : 0) : null,
            b.minimumStaffingAlert || null,
            b.isRecurring !== undefined ? (b.isRecurring ? 1 : 0) : null,
            b.status || null,
            b.description !== undefined ? b.description : null,
            holidayId,
            propertyId
        ]);

        const updatedRes = await pgPool.query('SELECT * FROM holidays WHERE id = $1', [holidayId]);
        const updated = updatedRes.rows[0];
        res.json({
            success: true,
            data: mapHolidayRow(updated),
            message: 'Holiday updated successfully'
        });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update holiday' });
    }
});

// DELETE /api/properties/:id/holidays/:holidayId - Delete holiday
router.delete('/:id/holidays/:holidayId', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.params.id);
        const holidayId = req.params.holidayId;

        await pgPool.query('DELETE FROM holidays WHERE id = $1 AND property_id = $2', [holidayId, propertyId]);
        res.json({ success: true, message: 'Holiday deleted successfully' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete holiday' });
    }
});

export default router;
