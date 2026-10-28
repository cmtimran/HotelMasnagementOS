import { Router, Request, Response } from 'express';
import { db } from '../database/postgres.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

// GET /api/lost-and-found - List all items with search & status filters
router.get('/', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const propertyId = (req as any).propertyId ? Number((req as any).propertyId) : 1;
        const status = req.query.status ? String(req.query.status) : 'all';
        const search = req.query.search ? String(req.query.search).trim() : '';

        let query = `
            SELECT id, property_id as "propertyId", reference_no as "referenceNo",
                   item_name as "itemName", category, description,
                   found_date as "foundDate", found_time as "foundTime",
                   location_type as "locationType", room_number as "roomNumber",
                   area_details as "areaDetails", found_by as "foundBy",
                   finder_role as "finderRole", storage_location as "storageLocation",
                   storage_bin as "storageBin", is_valuable as "isValuable",
                   holding_period_days as "holdingPeriodDays", guest_name as "guestName",
                   guest_phone as "guestPhone", guest_email as "guestEmail",
                   reservation_id as "reservationId", notified_status as "notifiedStatus",
                   notified_at as "notifiedAt", notified_notes as "notifiedNotes",
                   status, claimed_by as "claimedBy", claimant_phone as "claimantPhone",
                   claimant_id_type as "claimantIdType", claimant_id_number as "claimantIdNumber",
                   released_by as "releasedBy", released_at as "releasedAt",
                   release_notes as "releaseNotes", shipping_tracking_number as "shippingTrackingNumber",
                   shipping_carrier as "shippingCarrier", disposal_reason as "disposalReason",
                   disposed_at as "disposedAt", disposed_by as "disposedBy",
                   created_by as "createdBy", created_at as "createdAt", updated_at as "updatedAt"
            FROM lost_and_found_items
            WHERE property_id = ?
        `;
        const params: any[] = [propertyId];

        if (status !== 'all') {
            query += ` AND status = ?`;
            params.push(status);
        }

        if (search) {
            query += ` AND (item_name ILIKE ? OR reference_no ILIKE ? OR room_number ILIKE ? OR guest_name ILIKE ? OR description ILIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }

        query += ` ORDER BY found_date DESC, id DESC`;

        const items = await db.prepare(query).all(...params);
        res.json({ success: true, data: items });
    } catch (e: any) {
        console.warn('Failed to fetch lost and found items:', e);
        res.status(500).json({ success: false, error: e?.message || 'Database query error' });
    }
});

// POST /api/lost-and-found - Register a new found item
router.post('/', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const propertyId = (req as any).propertyId ? Number((req as any).propertyId) : 1;
        const b = req.body || {};

        const year = new Date().getFullYear();
        const rand = Math.floor(100 + Math.random() * 900);
        const refNo = b.referenceNo || `LF-${year}-${Date.now().toString().slice(-4)}${rand}`;

        const itemName = String(b.itemName || b.item_name || '').trim();
        if (!itemName) {
            return res.status(400).json({ success: false, error: 'Item name is required' });
        }

        const category = b.category || 'Other';
        const description = b.description || '';
        const foundDate = b.foundDate || new Date().toISOString().slice(0, 10);
        const foundTime = b.foundTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const locationType = b.locationType || 'Guest Room';
        const roomNumber = b.roomNumber ? String(b.roomNumber).trim() : null;
        const areaDetails = b.areaDetails || '';
        const foundBy = b.foundBy || 'Housekeeping Staff';
        const finderRole = b.finderRole || 'Housekeeping Attendant';
        const storageLocation = b.storageLocation || 'Housekeeping Locker A';
        const storageBin = b.storageBin || '';
        const isValuable = Boolean(b.isValuable);
        const holdingPeriodDays = Number(b.holdingPeriodDays) || 90;

        const guestName = b.guestName || null;
        const guestPhone = b.guestPhone || null;
        const guestEmail = b.guestEmail || null;
        const reservationId = b.reservationId || null;
        const createdBy = b.createdBy || 'Staff';

        const insertQuery = `
            INSERT INTO lost_and_found_items (
                property_id, reference_no, item_name, category, description,
                found_date, found_time, location_type, room_number, area_details,
                found_by, finder_role, storage_location, storage_bin, is_valuable,
                holding_period_days, guest_name, guest_phone, guest_email, reservation_id,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        `;

        const result = await db.prepare(insertQuery).get(
            propertyId, refNo, itemName, category, description,
            foundDate, foundTime, locationType, roomNumber, areaDetails,
            foundBy, finderRole, storageLocation, storageBin, isValuable,
            holdingPeriodDays, guestName, guestPhone, guestEmail, reservationId,
            createdBy
        );

        res.status(201).json({
            success: true,
            data: { id: result.id, referenceNo: refNo },
            message: `Lost & found item logged successfully with Ref: ${refNo}`
        });
    } catch (e: any) {
        console.warn('Failed to insert lost and found item:', e);
        res.status(500).json({ success: false, error: e?.message || 'Database insert error' });
    }
});

// PUT /api/lost-and-found/:id/claim - Claim and return item to guest
router.put('/:id/claim', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const propertyId = (req as any).propertyId ? Number((req as any).propertyId) : 1;
        const b = req.body || {};

        const claimedBy = String(b.claimedBy || '').trim();
        if (!claimedBy) {
            return res.status(400).json({ success: false, error: 'Claimant name is required' });
        }

        const claimantPhone = b.claimantPhone || '';
        const claimantIdType = b.claimantIdType || 'National ID';
        const claimantIdNumber = b.claimantIdNumber || '';
        const releasedBy = b.releasedBy || 'Front Desk Duty Manager';
        const releaseNotes = b.releaseNotes || 'Claimed by guest with ID verification';

        await db.prepare(`
            UPDATE lost_and_found_items
            SET status = 'claimed',
                claimed_by = ?,
                claimant_phone = ?,
                claimant_id_type = ?,
                claimant_id_number = ?,
                released_by = ?,
                released_at = CURRENT_TIMESTAMP,
                release_notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND property_id = ?
        `).run(claimedBy, claimantPhone, claimantIdType, claimantIdNumber, releasedBy, releaseNotes, id, propertyId);

        res.json({ success: true, message: `Item successfully marked as claimed & returned to ${claimedBy}` });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to claim item' });
    }
});

// PUT /api/lost-and-found/:id/ship - Courier/Ship item to guest
router.put('/:id/ship', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const propertyId = (req as any).propertyId ? Number((req as any).propertyId) : 1;
        const b = req.body || {};

        const tracking = String(b.shippingTrackingNumber || '').trim();
        const carrier = b.shippingCarrier || 'DHL / Courier';
        const releasedBy = b.releasedBy || 'Front Desk Manager';
        const notes = b.releaseNotes || `Dispatched via ${carrier} (Tracking: ${tracking})`;

        await db.prepare(`
            UPDATE lost_and_found_items
            SET status = 'shipped',
                shipping_tracking_number = ?,
                shipping_carrier = ?,
                released_by = ?,
                released_at = CURRENT_TIMESTAMP,
                release_notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND property_id = ?
        `).run(tracking, carrier, releasedBy, notes, id, propertyId);

        res.json({ success: true, message: `Item dispatched via ${carrier}. Tracking: ${tracking}` });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to update shipping' });
    }
});

// PUT /api/lost-and-found/:id/dispose - Mark item disposed/donated after holding period
router.put('/:id/dispose', requirePermission('frontdesk.access'), async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const propertyId = (req as any).propertyId ? Number((req as any).propertyId) : 1;
        const b = req.body || {};

        const targetStatus = b.status === 'returned_to_finder' ? 'returned_to_finder' : (b.status === 'donated' ? 'donated' : 'disposed');
        const reason = b.disposalReason || 'Expired holding period without claim';
        const disposedBy = b.disposedBy || 'Housekeeping Executive';

        await db.prepare(`
            UPDATE lost_and_found_items
            SET status = ?,
                disposal_reason = ?,
                disposed_at = CURRENT_TIMESTAMP,
                disposed_by = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND property_id = ?
        `).run(targetStatus, reason, disposedBy, id, propertyId);

        res.json({ success: true, message: `Item marked as ${targetStatus}` });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to dispose item' });
    }
});

export default router;
