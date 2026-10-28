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
                (SELECT MAX(rr.check_in_date) FROM reservation_rooms rr JOIN reservations r ON r.id = rr.reservation_id WHERE r.booker_guest_id = g.id) as last_stay_date
            FROM guests g
            ORDER BY g.id DESC
        `).all() as any[];

        res.json({
            success: true,
            data: rows.map(r => ({
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
                vipStatus: r.vip_status || 'NONE',
                address: r.address || '',
                city: r.city || '',
                country: r.country || 'Bangladesh',
                totalStays: Number(r.total_stays) || 0,
                totalSpend: Number(r.total_spend) || 0,
                lastStayDate: r.last_stay_date || null
            }))
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch guests' });
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
                vip_status, address, city, country
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            body.country || 'Bangladesh'
        );

        const newId = Number(result.lastInsertRowid);
        const created = await db.prepare('SELECT * FROM guests WHERE id = ?').get(newId);

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

// PUT /api/guests/:id - Update existing guest profile with conflict check
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body || {};
        const firstName = String(body.firstName || body.first_name || '').trim();
        const lastName = String(body.lastName || body.last_name || '').trim();
        const email = String(body.email || '').trim();
        const phone = String(body.phone || '').trim();
        const idNumber = String(body.idNumber || body.id_number || '').trim();

        const normPhone = normalizePhone(phone);
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
            id
        );

        const updated = await db.prepare('SELECT * FROM guests WHERE id = ?').get(id);
        broadcastServerEvent({ type: 'GUESTS_UPDATED', guestId: id });

        res.json({ success: true, data: updated, message: 'Guest profile updated successfully' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update guest profile' });
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
