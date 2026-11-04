import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { broadcastServerEvent } from './realtime.routes.js';

const router = Router();

/**
 * Normalizes any phone number (domestic or international) into clean digits.
 * Strips formatting, spaces, brackets, hyphens, and international trunk prefix (00).
 */
export function normalizePhone(raw: string | null | undefined): string {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    }
    return digits;
}

/**
 * Universal phone matcher across all domestic and international formats.
 * Accurately matches:
 * - Direct digit matches: "12125551234" === "12125551234"
 * - Domestic zero vs international country code:
 *   e.g. Bangladesh (+880): "01775167948" vs "+8801775167948"
 *   e.g. UK (+44): "07911123456" vs "+447911123456"
 *   e.g. USA/Canada (+1): "2125551234" vs "+12125551234"
 *   e.g. India (+91): "09876543210" vs "+919876543210"
 *   e.g. UAE (+971): "0501234567" vs "+971501234567"
 *   e.g. Australia (+61): "0412345678" vs "+61412345678"
 */
export function isSamePhoneNumber(rawA: string | null | undefined, rawB: string | null | undefined): boolean {
    if (!rawA || !rawB) return false;
    const a = normalizePhone(rawA);
    const b = normalizePhone(rawB);
    if (a.length < 6 || b.length < 6) return false;
    if (a === b) return true;

    // Compare without leading domestic zeros
    const trimA = a.replace(/^0+/, '');
    const trimB = b.replace(/^0+/, '');
    if (trimA === trimB) return true;

    // Check if one is a suffix of the other with significant length (at least 8 digits)
    const minLen = Math.min(trimA.length, trimB.length);
    if (minLen >= 8) {
        if (trimA.endsWith(trimB) || trimB.endsWith(trimA)) return true;
    }

    // Match last 9 significant subscriber digits
    if (trimA.length >= 9 && trimB.length >= 9) {
        if (trimA.slice(-9) === trimB.slice(-9)) return true;
    }

    return false;
}

// GET /api/guests - List all guest profiles with aggregated stay stats
router.get('/', async (req: Request, res: Response) => {
    try {
        const rows = await db.prepare(`
            SELECT 
                g.*,
                (SELECT COUNT(DISTINCT r.id) FROM reservations r WHERE r.booker_guest_id = g.id AND r.status NOT IN ('CANCELLED', 'VOID')) as total_stays,
                (SELECT COALESCE(SUM(r.total_amount), 0) FROM reservations r WHERE r.booker_guest_id = g.id AND r.status NOT IN ('CANCELLED', 'VOID')) as total_spend,
                (SELECT COALESCE(SUM(rr.nights), 0) FROM reservation_rooms rr JOIN reservations r ON r.id = rr.reservation_id WHERE r.booker_guest_id = g.id AND r.status NOT IN ('CANCELLED', 'VOID')) as total_nights,
                (SELECT MAX(rr.check_in_date) FROM reservation_rooms rr JOIN reservations r ON r.id = rr.reservation_id WHERE r.booker_guest_id = g.id) as last_stay_date
            FROM guests g
            ORDER BY g.id DESC
        `).all() as any[];

        res.json({
            success: true,
            data: rows.map(r => {
                const spend = Number(r.total_spend) || 0;
                const stays = Number(r.total_stays) || 0;
                const nights = Number(r.total_nights) || stays;
                const points = Math.round(spend / 20);
                return {
                    id: Number(r.id),
                    salutation: r.salutation || 'Mr',
                    firstName: r.first_name,
                    lastName: r.last_name,
                    name: `${r.salutation ? r.salutation + ' ' : ''}${r.first_name} ${r.last_name}`.trim(),
                    email: r.email || '',
                    phone: r.phone || '',
                    normalizedPhone: normalizePhone(r.phone),
                    nationality: r.nationality || 'Bangladeshi',
                    idType: r.id_type || 'National ID (NID)',
                    idNumber: r.id_number || '',
                    vipStatus: r.vip_status || (spend > 50000 ? 'VVIP' : spend > 20000 ? 'VIP' : 'NONE'),
                    address: r.address || '',
                    city: r.city || '',
                    country: r.country || 'Bangladesh',
                    totalStays: stays,
                    totalNights: nights,
                    totalSpend: spend,
                    loyaltyPoints: points,
                    lastStayDate: r.last_stay_date || null,
                    isBlacklisted: Boolean(r.is_blacklisted),
                    blacklistReason: r.blacklist_reason || null,
                    blacklistedBy: r.blacklisted_by || null,
                    blacklistedAt: r.blacklisted_at || null,
                    dob: r.dob ? String(r.dob).slice(0, 10) : null,
                    gender: r.gender || 'Male',
                    idIssueDate: r.id_issue_date ? String(r.id_issue_date).slice(0, 10) : null,
                    idExpiryDate: r.id_expiry_date ? String(r.id_expiry_date).slice(0, 10) : null,
                    idIssueCountry: r.id_issue_country || null,
                    idIssuePlace: r.id_issue_place || null,
                    passportVisaNumber: r.passport_visa_number || null,
                    passportVisaType: r.passport_visa_type || null,
                    passportVisaExpiry: r.passport_visa_expiry ? String(r.passport_visa_expiry).slice(0, 10) : null,
                    passportEntryPort: r.passport_entry_port || null,
                    drivingVehicleClass: r.driving_vehicle_class || null,
                    identityMetadata: typeof r.identity_metadata === 'object' ? r.identity_metadata : {},
                    tags: Array.isArray(r.tags) ? r.tags : []
                };
            })
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch guests' });
    }
});

// GET /api/guests/:id/history - Full stay, reservation, and folio ledger for this guest across all properties
router.get('/:id/history', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const rows = await db.prepare(`
            SELECT 
                r.id as reservation_id,
                r.reservation_number,
                r.property_id,
                COALESCE(p.name, 'Main Hotel') as property_name,
                r.status,
                r.source,
                r.channel,
                COALESCE(r.total_amount, 0) as total_amount,
                COALESCE(r.paid_amount, 0) as paid_amount,
                COALESCE(r.due_amount, 0) as due_amount,
                r.created_at,
                rr.id as room_stay_id,
                rr.sub_booking_number,
                rr.room_id,
                COALESCE(rm.room_number, 'Assigned') as room_number,
                COALESCE(rt.name, 'Deluxe Room') as room_type,
                COALESCE(rr.check_in_date, r.created_at::date::text) as check_in,
                COALESCE(rr.check_out_date, (r.created_at + interval '1 day')::date::text) as check_out,
                COALESCE(rr.nights, 1) as nights,
                COALESCE(rr.room_rate, r.total_amount, 0) as room_rate,
                f.folio_number
            FROM reservations r
            LEFT JOIN properties p ON p.id = r.property_id
            LEFT JOIN reservation_rooms rr ON rr.reservation_id = r.id
            LEFT JOIN rooms rm ON rm.id = rr.room_id
            LEFT JOIN room_types rt ON rt.id = rm.room_type_id OR rt.id = rr.room_type_id
            LEFT JOIN (
                SELECT DISTINCT ON (reservation_id) reservation_id, folio_number 
                FROM folios
                ORDER BY reservation_id, id ASC
            ) f ON f.reservation_id = r.id
            WHERE r.booker_guest_id = ? OR rr.guest_id = ?
            ORDER BY r.id DESC, rr.id ASC
        `).all(id, id) as any[];

        res.json({
            success: true,
            data: rows
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch guest history' });
    }
});

// GET /api/guests/duplicates - Detect duplicate guest clusters based on phone, email, or ID number
router.get('/duplicates', async (req: Request, res: Response) => {
    try {
        const rows = await db.prepare(`
            SELECT id, salutation, first_name, last_name, email, phone, id_type, id_number, vip_status,
                (SELECT COUNT(DISTINCT r.id) FROM reservations r WHERE r.booker_guest_id = guests.id AND r.status NOT IN ('CANCELLED', 'VOID')) as total_stays,
                (SELECT COALESCE(SUM(r.total_amount), 0) FROM reservations r WHERE r.booker_guest_id = guests.id AND r.status NOT IN ('CANCELLED', 'VOID')) as total_spend
            FROM guests
            ORDER BY id ASC
        `).all() as any[];

        const emailMap = new Map<string, any[]>();
        const idMap = new Map<string, any[]>();

        for (const g of rows) {
            const cleanEmail = (g.email || '').trim().toLowerCase();
            if (cleanEmail && !cleanEmail.includes('hospitality.com') && !cleanEmail.includes('guest.com')) {
                const list = emailMap.get(cleanEmail) || [];
                list.push(g);
                emailMap.set(cleanEmail, list);
            }

            const cleanId = (g.id_number || '').trim().toLowerCase();
            if (cleanId && cleanId.length >= 4) {
                const list = idMap.get(cleanId) || [];
                list.push(g);
                idMap.set(cleanId, list);
            }
        }

        const duplicateClusters: any[] = [];
        const seenPairKeys = new Set<string>();

        // 1. Phone duplicates (Universal International and Domestic comparison)
        const phoneGroups: any[][] = [];
        for (const g of rows) {
            if (!g.phone) continue;
            let added = false;
            for (const grp of phoneGroups) {
                if (grp.some(existing => isSamePhoneNumber(existing.phone, g.phone))) {
                    grp.push(g);
                    added = true;
                    break;
                }
            }
            if (!added) {
                phoneGroups.push([g]);
            }
        }

        for (const group of phoneGroups) {
            if (group.length > 1) {
                const key = group.map(x => x.id).sort().join('-');
                if (!seenPairKeys.has(key)) {
                    seenPairKeys.add(key);
                    duplicateClusters.push({
                        reason: 'Matching Phone Number',
                        matchValue: group[0].phone,
                        guests: group
                    });
                }
            }
        }

        // 2. Email duplicates
        for (const [email, group] of emailMap.entries()) {
            if (group.length > 1) {
                const key = group.map(x => x.id).sort().join('-');
                if (!seenPairKeys.has(key)) {
                    seenPairKeys.add(key);
                    duplicateClusters.push({
                        reason: 'Matching Email Address',
                        matchValue: email,
                        guests: group
                    });
                }
            }
        }

        // 3. ID Number duplicates
        for (const [idNum, group] of idMap.entries()) {
            if (group.length > 1) {
                const key = group.map(x => x.id).sort().join('-');
                if (!seenPairKeys.has(key)) {
                    seenPairKeys.add(key);
                    duplicateClusters.push({
                        reason: 'Matching Government ID / Passport Number',
                        matchValue: idNum,
                        guests: group
                    });
                }
            }
        }

        // 4. Clean Name duplicates
        const nameMap = new Map<string, any[]>();
        for (const g of rows) {
            const clean = `${g.first_name || ''} ${g.last_name || ''}`.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            if (clean && clean.length >= 4 && clean !== 'valuedguest' && clean !== 'standardguest') {
                const list = nameMap.get(clean) || [];
                list.push(g);
                nameMap.set(clean, list);
            }
        }
        for (const [, group] of nameMap.entries()) {
            if (group.length > 1) {
                const key = group.map(x => x.id).sort().join('-');
                if (!seenPairKeys.has(key)) {
                    seenPairKeys.add(key);
                    duplicateClusters.push({
                        reason: 'Identical Full Legal Name',
                        matchValue: `${group[0].first_name} ${group[0].last_name}`,
                        guests: group
                    });
                }
            }
        }

        res.json({
            success: true,
            totalClusters: duplicateClusters.length,
            data: duplicateClusters
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to detect duplicates' });
    }
});

// POST /api/guests - Create new guest profile with duplicate prevention check
router.post('/', async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const organizationId = Number(body.organizationId || body.organization_id || 1);
        const salutation = body.salutation || 'Mr';
        const firstName = String(body.firstName || body.first_name || '').trim();
        const lastName = String(body.lastName || body.last_name || '').trim();
        const email = String(body.email || '').trim();
        const phone = String(body.phone || '').trim();
        const idType = body.idType || body.id_type || 'National ID (NID)';
        const idNumber = String(body.idNumber || body.id_number || '').trim();

        if (!firstName || !phone) {
            return res.status(400).json({ success: false, error: 'First name and phone number are required.' });
        }

        const normPhone = normalizePhone(phone);
        const cleanEmail = email.toLowerCase();

        // Check for duplicates
        const allGuests = await db.prepare('SELECT id, first_name, last_name, phone, email, id_number FROM guests').all() as any[];
        const conflict = allGuests.find(g => {
            const pMatch = isSamePhoneNumber(phone, g.phone);
            const eMatch = cleanEmail && g.email && g.email.trim().toLowerCase() === cleanEmail;
            const idMatch = idNumber && g.id_number && g.id_number.trim().toLowerCase() === idNumber.toLowerCase();
            return pMatch || eMatch || idMatch;
        });

        if (conflict) {
            return res.status(409).json({
                success: false,
                duplicate: true,
                existingGuest: {
                    id: conflict.id,
                    name: `${conflict.first_name} ${conflict.last_name}`,
                    phone: conflict.phone,
                    email: conflict.email
                },
                error: `Duplicate guest profile detected! A profile already exists for "${conflict.first_name} ${conflict.last_name}" with matching phone (${conflict.phone}) or email.`
            });
        }

        const result = await db.prepare(`
            INSERT INTO guests (
                organization_id, salutation, first_name, last_name, email, phone, nationality, id_type, id_number,
                vip_status, address, city, country, dob, gender, id_issue_date, id_expiry_date, id_issue_country,
                id_issue_place, passport_visa_number, passport_visa_type, passport_visa_expiry, passport_entry_port,
                driving_vehicle_class, identity_metadata, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            organizationId,
            salutation,
            firstName,
            lastName || firstName,
            email || null,
            phone,
            body.nationality || 'Bangladeshi',
            idType,
            idNumber || null,
            body.vipStatus || body.vip_status || 'NONE',
            body.address || null,
            body.city || null,
            body.country || 'Bangladesh',
            body.dob || null,
            body.gender || 'Male',
            body.idIssueDate || body.id_issue_date || null,
            body.idExpiryDate || body.id_expiry_date || null,
            body.idIssueCountry || body.id_issue_country || null,
            body.idIssuePlace || body.id_issue_place || null,
            body.passportVisaNumber || body.passport_visa_number || null,
            body.passportVisaType || body.passport_visa_type || null,
            body.passportVisaExpiry || body.passport_visa_expiry || null,
            body.passportEntryPort || body.passport_entry_port || null,
            body.drivingVehicleClass || body.driving_vehicle_class || null,
            JSON.stringify(body.identityMetadata || body.identity_metadata || {}),
            body.tags || []
        );

        const newId = Number(result.lastInsertRowid);
        const created = await db.prepare('SELECT * FROM guests WHERE id = ?').get(newId);

        // Record initial profile creation in audit trail
        const actor = body.changedBy || body.staffName || 'System / Front Desk';
        await db.prepare(`
            INSERT INTO guest_edit_history (guest_id, changed_by, change_summary, changes)
            VALUES (?, ?, ?, ?)
        `).run(
            newId,
            actor,
            'Initial Guest Profile Created',
            JSON.stringify([
                { field: 'profile', fieldLabel: 'Profile Created', oldValue: null, newValue: `${salutation} ${firstName} ${lastName}` }
            ])
        );

        broadcastServerEvent({ type: 'GUESTS_UPDATED', guestId: newId });

        res.status(201).json({
            success: true,
            data: created,
            message: `Guest profile created successfully for ${firstName} ${lastName}`
        });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create guest profile' });
    }
});

// PUT /api/guests/:id - Update existing guest profile with conflict check and audit history
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body || {};
        const current = await db.prepare('SELECT * FROM guests WHERE id = ?').get(id) as any;
        if (!current) {
            return res.status(404).json({ success: false, error: 'Guest not found' });
        }

        const firstName = String(body.firstName || body.first_name || current.first_name || '').trim();
        const lastName = String(body.lastName || body.last_name || current.last_name || '').trim();
        const email = String(body.email !== undefined ? body.email : current.email || '').trim();
        const phone = String(body.phone !== undefined ? body.phone : current.phone || '').trim();
        const idNumber = String(body.idNumber !== undefined ? body.idNumber : current.id_number || '').trim();

        const cleanEmail = email.toLowerCase();

        // Conflict check against other guests
        if (phone || cleanEmail || idNumber) {
            const others = await db.prepare('SELECT id, first_name, last_name, phone, email, id_number FROM guests WHERE id != ?').all(id) as any[];
            const conflict = others.find(g => {
                const pMatch = phone && isSamePhoneNumber(phone, g.phone);
                const eMatch = cleanEmail && g.email && g.email.trim().toLowerCase() === cleanEmail;
                const idMatch = idNumber && g.id_number && g.id_number.trim().toLowerCase() === idNumber.toLowerCase();
                return pMatch || eMatch || idMatch;
            });

            if (conflict) {
                return res.status(409).json({
                    success: false,
                    duplicate: true,
                    existingGuest: conflict,
                    error: `Update rejected! Another guest profile ("${conflict.first_name} ${conflict.last_name}", ID: ${conflict.id}) already uses this phone/email/ID.`
                });
            }
        }

        // Calculate diffs for audit trail
        const diffs: any[] = [];
        const checkDiff = (field: string, label: string, oldVal: any, newVal: any) => {
            if (newVal !== undefined && newVal !== null && String(newVal).trim() !== '' && String(oldVal ?? '').trim() !== String(newVal).trim()) {
                diffs.push({
                    field,
                    fieldLabel: label,
                    oldValue: oldVal ?? 'None',
                    newValue: newVal
                });
            }
        };

        checkDiff('first_name', 'First Name', current.first_name, firstName);
        checkDiff('last_name', 'Last Name', current.last_name, lastName);
        checkDiff('salutation', 'Title / Salutation', current.salutation, body.salutation);
        checkDiff('phone', 'Phone Number', current.phone, phone);
        checkDiff('email', 'Email Address', current.email, email);
        checkDiff('vip_status', 'VIP Status', current.vip_status, body.vipStatus || body.vip_status);
        checkDiff('id_type', 'ID Type', current.id_type, body.idType || body.id_type);
        checkDiff('id_number', 'ID Number', current.id_number, idNumber);
        checkDiff('nationality', 'Nationality', current.nationality, body.nationality);
        checkDiff('dob', 'Date of Birth', current.dob, body.dob);
        checkDiff('gender', 'Gender', current.gender, body.gender);
        checkDiff('address', 'Street Address', current.address, body.address);
        checkDiff('city', 'City', current.city, body.city);
        checkDiff('country', 'Country', current.country, body.country);
        checkDiff('passport_visa_number', 'Visa Number', current.passport_visa_number, body.passportVisaNumber || body.passport_visa_number);
        checkDiff('passport_visa_type', 'Visa Type', current.passport_visa_type, body.passportVisaType || body.passport_visa_type);
        checkDiff('id_expiry_date', 'ID Expiry Date', current.id_expiry_date, body.idExpiryDate || body.id_expiry_date);
        checkDiff('driving_vehicle_class', 'Driving Vehicle Class', current.driving_vehicle_class, body.drivingVehicleClass || body.driving_vehicle_class);

        await db.prepare(`
            UPDATE guests
            SET salutation = COALESCE(?, salutation),
                first_name = COALESCE(?, first_name),
                last_name = COALESCE(?, last_name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                nationality = COALESCE(?, nationality),
                id_type = COALESCE(?, id_type),
                id_number = COALESCE(?, id_number),
                vip_status = COALESCE(?, vip_status),
                address = COALESCE(?, address),
                city = COALESCE(?, city),
                country = COALESCE(?, country),
                dob = COALESCE(?, dob),
                gender = COALESCE(?, gender),
                id_issue_date = COALESCE(?, id_issue_date),
                id_expiry_date = COALESCE(?, id_expiry_date),
                id_issue_country = COALESCE(?, id_issue_country),
                id_issue_place = COALESCE(?, id_issue_place),
                passport_visa_number = COALESCE(?, passport_visa_number),
                passport_visa_type = COALESCE(?, passport_visa_type),
                passport_visa_expiry = COALESCE(?, passport_visa_expiry),
                passport_entry_port = COALESCE(?, passport_entry_port),
                driving_vehicle_class = COALESCE(?, driving_vehicle_class),
                identity_metadata = COALESCE(?, identity_metadata),
                tags = COALESCE(?, tags),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            body.salutation || null,
            firstName || null,
            lastName || null,
            email || null,
            phone || null,
            body.nationality || null,
            body.idType || body.id_type || null,
            idNumber || null,
            body.vipStatus || body.vip_status || null,
            body.address || null,
            body.city || null,
            body.country || null,
            body.dob || null,
            body.gender || null,
            body.idIssueDate || body.id_issue_date || null,
            body.idExpiryDate || body.id_expiry_date || null,
            body.idIssueCountry || body.id_issue_country || null,
            body.idIssuePlace || body.id_issue_place || null,
            body.passportVisaNumber || body.passport_visa_number || null,
            body.passportVisaType || body.passport_visa_type || null,
            body.passportVisaExpiry || body.passport_visa_expiry || null,
            body.passportEntryPort || body.passport_entry_port || null,
            body.drivingVehicleClass || body.driving_vehicle_class || null,
            body.identityMetadata ? JSON.stringify(body.identityMetadata) : null,
            body.tags ? body.tags : null,
            id
        );

        if (diffs.length > 0) {
            const actor = body.changedBy || body.staffName || 'Front Desk Staff';
            const summary = `Updated ${diffs.map(d => d.fieldLabel).join(', ')}`;
            await db.prepare(`
                INSERT INTO guest_edit_history (guest_id, changed_by, change_summary, changes)
                VALUES (?, ?, ?, ?)
            `).run(id, actor, summary, JSON.stringify(diffs));
        }

        const updated = await db.prepare('SELECT * FROM guests WHERE id = ?').get(id);
        broadcastServerEvent({ type: 'GUESTS_UPDATED', guestId: id });

        res.json({
            success: true,
            data: updated,
            message: 'Guest profile updated successfully',
            diffsRecorded: diffs.length
        });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update guest profile' });
    }
});

// POST /api/guests/:id/blacklist - Blacklist or Unblacklist a guest with audit log
router.post('/:id/blacklist', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { isBlacklisted, reason, category, staffName } = req.body;
        const current = await db.prepare('SELECT is_blacklisted, blacklist_reason, blacklisted_by FROM guests WHERE id = ?').get(id) as any;
        if (!current) return res.status(404).json({ success: false, error: 'Guest not found' });

        const actor = staffName || 'Security / Duty Manager';
        const flag = Boolean(isBlacklisted);
        const fullReason = flag ? (category ? `[${category}] ${reason || 'Flagged by Management'}` : (reason || 'Flagged by Management')) : null;

        await db.prepare(`
            UPDATE guests
            SET is_blacklisted = ?,
                blacklist_reason = ?,
                blacklisted_by = ?,
                blacklisted_at = CASE WHEN ? = TRUE THEN CURRENT_TIMESTAMP ELSE NULL END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            flag,
            fullReason,
            flag ? actor : null,
            flag,
            id
        );

        // Record in audit log
        const actionText = flag ? 'Guest Blacklisted / Blocked' : 'Guest Unblocked / Restored to Active';
        const diffs = [
            {
                field: 'is_blacklisted',
                fieldLabel: 'Status',
                oldValue: current.is_blacklisted ? 'BLOCKED' : 'ACTIVE',
                newValue: flag ? 'BLOCKED' : 'ACTIVE'
            },
            {
                field: 'blacklist_reason',
                fieldLabel: 'Block Reason',
                oldValue: current.blacklist_reason || 'N/A',
                newValue: fullReason || 'Restored to Active'
            }
        ];

        await db.prepare(`
            INSERT INTO guest_edit_history (guest_id, changed_by, change_summary, changes)
            VALUES (?, ?, ?, ?)
        `).run(
            id,
            actor,
            `${actionText}: ${reason || 'Status updated'}`,
            JSON.stringify(diffs)
        );

        const updated = await db.prepare('SELECT * FROM guests WHERE id = ?').get(id);
        broadcastServerEvent({ type: 'GUESTS_UPDATED', guestId: id });

        res.json({
            success: true,
            data: updated,
            message: `Guest successfully ${flag ? 'blocked / blacklisted' : 'unblocked'}`
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to update blacklist status' });
    }
});

// GET /api/guests/:id/edit-history - Complete profile edit history audit trail
router.get('/:id/edit-history', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const rows = await db.prepare(`
            SELECT id, guest_id, changed_by, changed_at, change_summary, changes
            FROM guest_edit_history
            WHERE guest_id = ?
            ORDER BY changed_at DESC
        `).all(id) as any[];

        res.json({
            success: true,
            data: rows.map(r => ({
                id: Number(r.id),
                guestId: Number(r.guest_id),
                changedBy: r.changed_by,
                changedAt: r.changed_at,
                changeSummary: r.change_summary,
                changes: typeof r.changes === 'string' ? JSON.parse(r.changes) : (r.changes || [])
            }))
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch edit history' });
    }
});

// GET /api/guests/lookup - Quick verification and blacklist lookup by phone, id_number, or email
router.get('/lookup', async (req: Request, res: Response) => {
    try {
        const query = String(req.query.q || '').trim();
        if (!query || query.length < 3) {
            return res.json({ success: true, data: null });
        }

        const normQ = query.replace(/[\s\-_]/g, '').toLowerCase();
        const all = await db.prepare(`
            SELECT id, salutation, first_name, last_name, email, phone, id_type, id_number,
                   is_blacklisted, blacklist_reason, blacklisted_by, blacklisted_at, vip_status,
                   dob, gender, id_issue_country, passport_visa_number, passport_visa_type
            FROM guests
        `).all() as any[];

        const match = all.find(g => {
            const p = (g.phone || '').replace(/[\s\-_]/g, '');
            const idNum = (g.id_number || '').replace(/[\s\-_]/g, '').toLowerCase();
            const em = (g.email || '').toLowerCase();
            const fullName = `${g.first_name || ''} ${g.last_name || ''}`.toLowerCase();

            return (p && (p.includes(normQ) || normQ.includes(p))) ||
                   (idNum && (idNum === normQ || idNum.includes(normQ))) ||
                   (em && em === normQ) ||
                   (fullName && fullName.includes(query.toLowerCase()));
        });

        res.json({
            success: true,
            data: match ? {
                id: Number(match.id),
                salutation: match.salutation,
                firstName: match.first_name,
                lastName: match.last_name,
                name: `${match.salutation ? match.salutation + ' ' : ''}${match.first_name} ${match.last_name}`.trim(),
                email: match.email,
                phone: match.phone,
                idType: match.id_type,
                idNumber: match.id_number,
                vipStatus: match.vip_status,
                isBlacklisted: Boolean(match.is_blacklisted),
                blacklistReason: match.blacklist_reason,
                blacklistedBy: match.blacklisted_by,
                blacklistedAt: match.blacklisted_at,
                dob: match.dob,
                gender: match.gender,
                idIssueCountry: match.id_issue_country,
                passportVisaNumber: match.passport_visa_number,
                passportVisaType: match.passport_visa_type
            } : null
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Lookup failed' });
    }
});

// POST /api/guests/lookup-by-document - Real-Time Passport & National ID Deduplication Engine
router.post('/lookup-by-document', async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const docNumber = String(body.documentNumber || '').replace(/[\s\-_]/g, '').trim();
        const docType = String(body.documentType || 'Passport').trim();
        const fullName = String(body.fullName || '').trim().toLowerCase();
        const dob = String(body.dob || '').trim();
        const phone = String(body.phone || '').trim();

        if (!docNumber && !fullName && !phone) {
            return res.json({ success: true, matchType: 'NONE', guest: null });
        }

        const all = await db.prepare(`
            SELECT 
                g.*,
                (SELECT COUNT(DISTINCT r.id) FROM reservations r WHERE r.booker_guest_id = g.id AND r.status NOT IN ('CANCELLED', 'VOIDED')) as total_stays,
                (SELECT COALESCE(SUM(r.total_amount), 0) FROM reservations r WHERE r.booker_guest_id = g.id AND r.status NOT IN ('CANCELLED', 'VOIDED')) as total_spend,
                (SELECT MAX(rr.check_in_date) FROM reservation_rooms rr JOIN reservations r ON r.id = rr.reservation_id WHERE r.booker_guest_id = g.id) as last_stay_date,
                (SELECT rm.room_number FROM reservation_rooms rr JOIN reservations r ON r.id = rr.reservation_id JOIN rooms rm ON rm.id = rr.room_id WHERE r.booker_guest_id = g.id ORDER BY rr.check_in_date DESC LIMIT 1) as last_room_number
            FROM guests g
        `).all() as any[];

        let match: any = null;
        let matchType: 'EXACT_ID' | 'PHONE' | 'DEMOGRAPHICS' | 'NONE' = 'NONE';

        // 1. Exact Document Number Match
        if (docNumber && docNumber.length >= 4) {
            match = all.find(g => {
                const cleanId = String(g.id_number || '').replace(/[\s\-_]/g, '').toLowerCase();
                const cleanPass = String(g.passport_visa_number || '').replace(/[\s\-_]/g, '').toLowerCase();
                const target = docNumber.toLowerCase();
                return cleanId === target || cleanPass === target;
            });
            if (match) matchType = 'EXACT_ID';
        }

        // 2. Phone Number Match (if provided)
        if (!match && phone && phone.length >= 6) {
            match = all.find(g => isSamePhoneNumber(phone, g.phone));
            if (match) matchType = 'PHONE';
        }

        // 3. Demographic Match (DOB + Full Name)
        if (!match && dob && fullName && fullName.length >= 4) {
            match = all.find(g => {
                const gDob = g.dob ? String(g.dob).slice(0, 10) : '';
                const gName = `${g.first_name || ''} ${g.last_name || ''}`.trim().toLowerCase();
                const dobMatch = gDob === dob;
                const nameMatch = gName.includes(fullName) || fullName.includes(gName);
                return dobMatch && nameMatch;
            });
            if (match) matchType = 'DEMOGRAPHICS';
        }

        if (!match) {
            return res.json({ success: true, matchType: 'NONE', guest: null });
        }

        const spend = Number(match.total_spend) || 0;
        const stays = Number(match.total_stays) || 0;
        const points = Math.round(spend / 20);

        res.json({
            success: true,
            matchType,
            guest: {
                id: Number(match.id),
                salutation: match.salutation || 'Mr',
                firstName: match.first_name,
                lastName: match.last_name,
                name: `${match.salutation ? match.salutation + ' ' : ''}${match.first_name} ${match.last_name}`.trim(),
                email: match.email || '',
                phone: match.phone || '',
                nationality: match.nationality || 'Bangladeshi',
                idType: match.id_type || docType,
                idNumber: match.id_number || docNumber,
                vipStatus: match.vip_status || (spend > 50000 ? 'VVIP' : spend > 20000 ? 'VIP' : 'STANDARD'),
                address: match.address || '',
                city: match.city || '',
                country: match.country || 'Bangladesh',
                totalStays: stays,
                totalSpend: spend,
                loyaltyPoints: points,
                lastStayDate: match.last_stay_date || null,
                lastRoomNumber: match.last_room_number || null,
                isBlacklisted: Boolean(match.is_blacklisted),
                blacklistReason: match.blacklist_reason || null,
                dob: match.dob ? String(match.dob).slice(0, 10) : null,
                gender: match.gender || 'Male',
                idIssueCountry: match.id_issue_country || null,
                idExpiryDate: match.id_expiry_date ? String(match.id_expiry_date).slice(0, 10) : null,
                passportVisaNumber: match.passport_visa_number || null,
                identityMetadata: typeof match.identity_metadata === 'object' ? match.identity_metadata : {}
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Document lookup failed' });
    }
});

// POST /api/guests/scan-auto-create-or-update - Seamless Auto-Create or Update from Scanner
router.post('/scan-auto-create-or-update', async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const action = body.action || 'CREATE'; // 'CREATE' | 'UPDATE_EXISTING'
        const actor = body.staffName || 'Front Desk Scanner';

        // Helper to cleanly link the guest to the target reservation without referencing nonexistent columns
        const linkReservationGuest = async (guestId: number) => {
            const resIdent = body.reservationNumber || body.reservationId;
            if (!resIdent) return;

            let resRecord: any = null;
            // 1. Check by reservation_number (e.g. 'RES-681508')
            resRecord = await db.prepare('SELECT id FROM reservations WHERE reservation_number = ?').get(String(resIdent));

            // 2. Fallback check by numeric id if not found by number
            if (!resRecord && !isNaN(Number(resIdent))) {
                resRecord = await db.prepare('SELECT id FROM reservations WHERE id = ?').get(Number(resIdent));
            }

            if (resRecord && resRecord.id) {
                // Update booker on reservations table (schema column: booker_guest_id)
                await db.prepare('UPDATE reservations SET booker_guest_id = ? WHERE id = ?').run(guestId, resRecord.id);
                // Update guest on reservation_rooms table (schema columns: guest_id, reservation_id)
                await db.prepare('UPDATE reservation_rooms SET guest_id = ? WHERE reservation_id = ?').run(guestId, resRecord.id);
            }
        };

        if (action === 'UPDATE_EXISTING' && body.guestId) {
            const guestId = Number(body.guestId);
            const updates = body.documentData || {};

            await db.prepare(`
                UPDATE guests
                SET id_number = COALESCE(?, id_number),
                    id_type = COALESCE(?, id_type),
                    id_expiry_date = COALESCE(?, id_expiry_date),
                    id_issue_country = COALESCE(?, id_issue_country),
                    passport_visa_number = COALESCE(?, passport_visa_number),
                    nationality = COALESCE(?, nationality),
                    dob = COALESCE(?, dob),
                    gender = COALESCE(?, gender),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(
                updates.idNumber || null,
                updates.idType || null,
                updates.idExpiryDate || null,
                updates.idIssueCountry || null,
                updates.passportVisaNumber || updates.idNumber || null,
                updates.nationality || null,
                updates.dob || null,
                updates.gender || null,
                guestId
            );

            // Audit history
            await db.prepare(`
                INSERT INTO guest_edit_history (guest_id, changed_by, change_summary, changes)
                VALUES (?, ?, ?, ?)
            `).run(
                guestId,
                actor,
                'Updated identity document via Passport/ID Scanner',
                JSON.stringify(updates)
            );

            // Link reservation if requested
            await linkReservationGuest(guestId);

            const updatedGuest = await db.prepare('SELECT * FROM guests WHERE id = ?').get(guestId) as any;
            const normalizedUpdated = updatedGuest ? {
                ...updatedGuest,
                name: `${updatedGuest.first_name || ''} ${updatedGuest.last_name || ''}`.trim(),
                fullName: `${updatedGuest.first_name || ''} ${updatedGuest.last_name || ''}`.trim()
            } : null;

            broadcastServerEvent({ type: 'GUEST_UPDATED', guestId, updatedBy: actor });

            return res.json({
                success: true,
                message: `Guest profile #${guestId} updated successfully with scanned passport/ID.`,
                guest: normalizedUpdated
            });
        }

        // CREATE NEW GUEST PROFILE (With Strict Deduplication Pre-flight Check)
        const doc = body.documentData || body;
        const fullName = String(doc.fullName || doc.name || 'Valued Guest').trim();
        const parts = fullName.split(' ');
        const salutation = doc.salutation || (doc.gender === 'Female' ? 'Ms' : 'Mr');
        const firstName = doc.firstName || parts[0] || 'Guest';
        const lastName = doc.lastName || parts.slice(1).join(' ') || firstName;
        const phone = doc.phone && String(doc.phone).trim().length > 3 ? String(doc.phone).trim() : null;

        // Atomic Deduplication Guard: Check if guest with this ID or Demographics already exists in DB
        const cleanDocNo = String(doc.idNumber || doc.documentNumber || '').replace(/[\s\-_]/g, '').trim();
        let existingGuest: any = null;

        if (cleanDocNo && cleanDocNo.length >= 4) {
            existingGuest = await db.prepare(`
                SELECT * FROM guests 
                WHERE REPLACE(REPLACE(REPLACE(LOWER(COALESCE(id_number, '')), ' ', ''), '-', ''), '_', '') = LOWER(?)
                   OR REPLACE(REPLACE(REPLACE(LOWER(COALESCE(passport_visa_number, '')), ' ', ''), '-', ''), '_', '') = LOWER(?)
                LIMIT 1
            `).get(cleanDocNo, cleanDocNo);
        }

        if (!existingGuest && doc.dob && fullName.length >= 4) {
            existingGuest = await db.prepare(`
                SELECT * FROM guests 
                WHERE dob = ? AND (
                    LOWER(first_name || ' ' || last_name) = LOWER(?) OR
                    LOWER(last_name || ' ' || first_name) = LOWER(?)
                )
                LIMIT 1
            `).get(doc.dob, fullName, fullName);
        }

        if (existingGuest) {
            const guestId = Number(existingGuest.id);
            // Update any missing KYC attributes on the existing master profile
            await db.prepare(`
                UPDATE guests 
                SET id_number = COALESCE(?, id_number),
                    id_type = COALESCE(?, id_type),
                    id_expiry_date = COALESCE(?, id_expiry_date),
                    id_issue_country = COALESCE(?, id_issue_country),
                    dob = COALESCE(?, dob),
                    gender = COALESCE(?, gender),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(
                doc.idNumber || null,
                doc.idType || null,
                doc.idExpiryDate || null,
                doc.idIssueCountry || null,
                doc.dob || null,
                doc.gender || null,
                guestId
            );

            // Link reservation if requested
            await linkReservationGuest(guestId);

            const refreshed = await db.prepare('SELECT * FROM guests WHERE id = ?').get(guestId) as any;
            const normalized = refreshed ? {
                ...refreshed,
                name: `${refreshed.first_name || ''} ${refreshed.last_name || ''}`.trim(),
                fullName: `${refreshed.first_name || ''} ${refreshed.last_name || ''}`.trim()
            } : null;

            broadcastServerEvent({ type: 'GUEST_UPDATED', guestId, updatedBy: actor });

            return res.json({
                success: true,
                isExisting: true,
                message: `Existing guest profile #${guestId} (${normalized?.fullName}) found and linked to stay.`,
                guest: normalized
            });
        }

        // Truly New Guest: Insert clean record
        const result = await db.prepare(`
            INSERT INTO guests (
                organization_id, salutation, first_name, last_name, email, phone, nationality, id_type, id_number,
                vip_status, address, city, country, dob, gender, id_issue_date, id_expiry_date, id_issue_country,
                passport_visa_number, identity_metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            1,
            salutation,
            firstName,
            lastName,
            doc.email || null,
            phone,
            doc.nationality || 'Bangladeshi',
            doc.idType || 'Passport',
            doc.idNumber || null,
            'STANDARD',
            doc.address || null,
            doc.city || null,
            doc.country || doc.nationality || 'Bangladesh',
            doc.dob || null,
            doc.gender || 'Male',
            doc.idIssueDate || null,
            doc.idExpiryDate || null,
            doc.idIssueCountry || doc.nationality || null,
            doc.idType === 'Passport' ? doc.idNumber : null,
            JSON.stringify({ source: 'PASSPORT_SCANNER', scannedAt: new Date().toISOString() })
        );

        const newGuestId = Number(result.lastInsertRowid);

        // Link reservation if requested
        await linkReservationGuest(newGuestId);

        const createdGuest = await db.prepare('SELECT * FROM guests WHERE id = ?').get(newGuestId) as any;
        const normalizedCreated = createdGuest ? {
            ...createdGuest,
            name: `${createdGuest.first_name || ''} ${createdGuest.last_name || ''}`.trim(),
            fullName: `${createdGuest.first_name || ''} ${createdGuest.last_name || ''}`.trim()
        } : null;

        broadcastServerEvent({ type: 'GUEST_CREATED', guestId: newGuestId, name: `${firstName} ${lastName}` });

        return res.json({
            success: true,
            isExisting: false,
            message: `New guest profile #${newGuestId} automatically created from document scan.`,
            guest: normalizedCreated
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to auto-create guest profile' });
    }
});

// POST /api/guests/merge - Profile Merge Engine: Consolidates duplicate profiles into a master profile
router.post('/merge', async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const primaryGuestId = Number(body.primaryGuestId);
        const rawSecondaries = Array.isArray(body.secondaryGuestIds) ? body.secondaryGuestIds : [body.secondaryGuestId];
        const secondaryGuestIds = rawSecondaries.map((n: any) => Number(n)).filter((n: number) => !isNaN(n) && n > 0 && n !== primaryGuestId);

        if (!primaryGuestId || secondaryGuestIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid primaryGuestId and at least one secondaryGuestId to merge.'
            });
        }

        const primary = await db.prepare('SELECT * FROM guests WHERE id = ?').get(primaryGuestId) as any;
        if (!primary) {
            return res.status(404).json({ success: false, error: 'Primary guest profile not found' });
        }

        const targetFields = body.targetFields || {};

        // 1. Re-link reservations
        for (const secId of secondaryGuestIds) {
            await db.prepare('UPDATE reservations SET booker_guest_id = ? WHERE booker_guest_id = ?').run(primaryGuestId, secId);
            await db.prepare('UPDATE reservation_rooms SET guest_id = ? WHERE guest_id = ?').run(primaryGuestId, secId);
            await db.prepare('UPDATE folios SET guest_id = ? WHERE guest_id = ?').run(primaryGuestId, secId);
        }

        // 2. Update primary guest with preferred master fields
        await db.prepare(`
            UPDATE guests
            SET salutation = COALESCE(?, salutation),
                first_name = COALESCE(?, first_name),
                last_name = COALESCE(?, last_name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                nationality = COALESCE(?, nationality),
                id_type = COALESCE(?, id_type),
                id_number = COALESCE(?, id_number),
                vip_status = COALESCE(?, vip_status),
                address = COALESCE(?, address),
                city = COALESCE(?, city),
                country = COALESCE(?, country),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            targetFields.salutation || null,
            targetFields.firstName || targetFields.first_name || null,
            targetFields.lastName || targetFields.last_name || null,
            targetFields.email || null,
            targetFields.phone || null,
            targetFields.nationality || null,
            targetFields.idType || targetFields.id_type || null,
            targetFields.idNumber || targetFields.id_number || null,
            targetFields.vipStatus || targetFields.vip_status || null,
            targetFields.address || null,
            targetFields.city || null,
            targetFields.country || null,
            primaryGuestId
        );

        // 3. Remove duplicate secondary records
        for (const secId of secondaryGuestIds) {
            await db.prepare('DELETE FROM guests WHERE id = ?').run(secId);
        }

        const consolidated = await db.prepare('SELECT * FROM guests WHERE id = ?').get(primaryGuestId) as any;

        // 4. Realtime broadcast to all terminals
        broadcastServerEvent({
            type: 'GUESTS_UPDATED',
            primaryGuestId,
            mergedIds: secondaryGuestIds,
            reason: 'GUEST_PROFILE_MERGE'
        });
        broadcastServerEvent({ type: 'INVENTORY_REFRESH' });

        res.json({
            success: true,
            message: `Successfully merged ${secondaryGuestIds.length} duplicate profile(s) into Master Profile #${primaryGuestId} (${consolidated.first_name} ${consolidated.last_name})! All reservations and folios have been unified.`,
            data: consolidated
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to merge guest profiles' });
    }
});

export default router;
