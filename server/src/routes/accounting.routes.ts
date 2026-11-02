import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { broadcastServerEvent } from './realtime.routes.js';
import { NightAuditService } from '../services/nightAudit.service.js';

const router = Router();

// GET /api/accounting/chart-of-accounts - USALI Chart of Accounts
router.get('/chart-of-accounts', async (req: Request, res: Response) => {
    try {
        const accounts = await db.prepare(`
            SELECT * FROM chart_of_accounts 
            ORDER BY account_code ASC
        `).all();

        const grouped = {
            ASSET: accounts.filter((a: any) => a.account_type === 'ASSET'),
            LIABILITY: accounts.filter((a: any) => a.account_type === 'LIABILITY'),
            EQUITY: accounts.filter((a: any) => a.account_type === 'EQUITY'),
            REVENUE: accounts.filter((a: any) => a.account_type === 'REVENUE'),
            EXPENSE: accounts.filter((a: any) => a.account_type === 'EXPENSE')
        };

        res.json({
            success: true,
            data: accounts,
            grouped,
            count: accounts.length
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch chart of accounts' });
    }
});

// GET /api/accounting/revenue-heads - Active PMS Revenue Heads
router.get('/revenue-heads', async (_req: Request, res: Response) => {
    try {
        const heads = await db.prepare(`
            SELECT * FROM revenue_heads WHERE is_active = TRUE ORDER BY name ASC
        `).all();
        res.json({ success: true, data: heads });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch revenue heads' });
    }
});

// GET /api/accounting/folios - List active folios with itemized charges & payments scoped by property or reservation
router.get('/folios', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.query.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = rawPropId ? Number(rawPropId) : undefined;
        const reservationIdParam = req.query.reservationId ? String(req.query.reservationId) : undefined;
        const reservationNoParam = req.query.reservationNumber ? String(req.query.reservationNumber) : undefined;

        let whereClause = "(r.status NOT IN ('CANCELLED', 'VOID') OR r.status IS NULL) AND f.status = 'OPEN'";
        const params: any[] = [];

        if (propertyId) {
            whereClause += ` AND r.property_id = ?`;
            params.push(propertyId);
        }

        if (reservationIdParam) {
            whereClause += ` AND (f.reservation_id = ? OR r.reservation_number = ?)`;
            params.push(reservationIdParam, reservationIdParam);
        } else if (reservationNoParam) {
            whereClause += ` AND r.reservation_number = ?`;
            params.push(reservationNoParam);
        }

        // If queried for a specific reservation and no folio exists yet, auto-create master folio & room charges!
        if (reservationIdParam || reservationNoParam) {
            const resLookupSql = reservationIdParam
                ? `SELECT r.*, g.first_name, g.last_name, g.phone, g.email FROM reservations r LEFT JOIN guests g ON g.id = r.booker_guest_id WHERE r.id::text = ? OR r.reservation_number = ? LIMIT 1`
                : `SELECT r.*, g.first_name, g.last_name, g.phone, g.email FROM reservations r LEFT JOIN guests g ON g.id = r.booker_guest_id WHERE r.reservation_number = ? LIMIT 1`;
            const resLookupParams = reservationIdParam ? [reservationIdParam, reservationIdParam] : [reservationNoParam];
            const targetRes = await db.prepare(resLookupSql).get(...resLookupParams) as any;

            if (targetRes) {
                const existingFolio = await db.prepare(`SELECT id FROM folios WHERE reservation_id = ? LIMIT 1`).get(targetRes.id) as any;
                if (!existingFolio) {
                    const guestName = [targetRes.first_name, targetRes.last_name].filter(Boolean).join(' ') || 'Valued Guest';
                    const genFolioNo = `FN~${targetRes.reservation_number || targetRes.id} - ${guestName}`;
                    const createdFolio = await db.prepare(`
                        INSERT INTO folios (
                            reservation_id, guest_id, folio_number, folio_type, status, balance,
                            bill_to, business_source, generate_invoice_on_checkout
                        ) VALUES (?, ?, ?, 'GUEST', 'OPEN', 0.00, ?, ?, TRUE)
                        RETURNING id, folio_number
                    `).run(targetRes.id, targetRes.booker_guest_id, genFolioNo, guestName, targetRes.source || 'Direct');

                    const newFolioId = createdFolio.lastInsertRowid;

                    // Automatically generate night-by-night room accommodation charges from reservation_rooms
                    const resRooms = await db.prepare(`
                        SELECT rr.*, rm.room_number, rt.name as room_type_name
                        FROM reservation_rooms rr
                        JOIN rooms rm ON rm.id = rr.room_id
                        LEFT JOIN room_types rt ON rt.id = rr.room_type_id
                        WHERE rr.reservation_id = ?
                    `).all(targetRes.id) as any[];

                    let runningTotal = 0;
                    for (const rr of resRooms) {
                        const checkIn = new Date(rr.check_in_date);
                        const checkOut = new Date(rr.check_out_date);
                        const diffTime = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
                        const dailyRate = Number(rr.room_rate || rr.rate_amount || 3000);

                        for (let d = 0; d < diffTime; d++) {
                            const nightDate = new Date(checkIn);
                            nightDate.setDate(nightDate.getDate() + d);
                            const chargeDateStr = nightDate.toISOString().split('T')[0];
                            const baseAmt = dailyRate;
                            const svcCharge = Math.round(baseAmt * 0.10 * 100) / 100;
                            const vatAmt = Math.round(baseAmt * 0.15 * 100) / 100;
                            const cityTaxAmt = Math.round(baseAmt * 0.01 * 100) / 100;
                            const totalTax = svcCharge + vatAmt + cityTaxAmt;
                            const grandAmt = baseAmt + totalTax;
                            runningTotal += grandAmt;

                            await db.prepare(`
                                INSERT INTO folio_charges (
                                    folio_id, reservation_room_id, charge_code, revenue_head, ref_no,
                                    description, amount, discount_amount, service_charge, vat, city_tax,
                                    total_tax, total_amount, charge_date, is_tax_applicable, user_name
                                ) VALUES (?, ?, 'ROOM_CHG', 'Room Charges', ?, ?, ?, 0.00, ?, ?, ?, ?, ?, ?, TRUE, 'System Auditor')
                            `).run(
                                newFolioId,
                                rr.id,
                                String(d + 1),
                                `Room Charge - Room ${rr.room_number} (${rr.room_type_name || 'Standard'})`,
                                baseAmt,
                                svcCharge,
                                vatAmt,
                                cityTaxAmt,
                                totalTax,
                                grandAmt,
                                chargeDateStr
                            );
                        }
                    }

                    // Update folio balance
                    await db.prepare(`UPDATE folios SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(runningTotal, newFolioId);

                    // Add initial audit log
                    await db.prepare(`
                        INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
                        VALUES (?, ?, 'FOLIO_CREATED', ?, 'Front Desk')
                    `).run(newFolioId, targetRes.id, `Master Folio ${genFolioNo} created for reservation ${targetRes.reservation_number}`);
                }
            }
        }

        const sql = `
            SELECT 
                f.*,
                r.reservation_number,
                r.source as reservation_source,
                r.agent as reservation_agent,
                (SELECT rr.room_id FROM reservation_rooms rr WHERE rr.reservation_id = r.id LIMIT 1) as room_id,
                (SELECT string_agg(rm.room_number, ', ' ORDER BY rm.room_number) FROM rooms rm JOIN reservation_rooms rr ON rr.room_id = rm.id WHERE rr.reservation_id = r.id) as room_number,
                (SELECT string_agg(DISTINCT rt.name, ', ') FROM room_types rt JOIN rooms rm ON rm.room_type_id = rt.id JOIN reservation_rooms rr ON rr.room_id = rm.id WHERE rr.reservation_id = r.id) as room_type,
                (SELECT MIN(rr.check_in_date) FROM reservation_rooms rr WHERE rr.reservation_id = r.id) as check_in,
                (SELECT MAX(rr.check_out_date) FROM reservation_rooms rr WHERE rr.reservation_id = r.id) as check_out,
                COALESCE(g.first_name || ' ' || g.last_name, 'Valued Guest') as guest_name,
                g.phone as guest_phone,
                g.email as guest_email,
                (SELECT COALESCE(SUM(total_amount), 0) FROM folio_charges WHERE folio_id = f.id AND (is_voided IS FALSE OR is_voided IS NULL)) as total_charges,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE folio_id = f.id) as total_payments
            FROM folios f
            LEFT JOIN reservations r ON r.id = f.reservation_id
            LEFT JOIN guests g ON g.id = f.guest_id
            WHERE ${whereClause}
            ORDER BY f.id DESC
        `;

        const folios = (params.length > 0 ? await db.prepare(sql).all(...params) : await db.prepare(sql).all()) as any[];

        // Fetch charges, payments, rooms and audit logs for each folio
        const enrichedFolios = await Promise.all(folios.map(async f => {
            const charges = await db.prepare(`
                SELECT 
                    id, folio_id, reservation_room_id, charge_code, revenue_head,
                    COALESCE(ref_no, id::text) as ref_no,
                    description, amount, discount_amount, service_charge, vat, city_tax,
                    total_tax, total_amount, charge_date, is_tax_applicable, tax_exemption_id,
                    user_name, is_voided, void_reason, created_at,
                    CASE WHEN is_voided THEN 'Voided' ELSE 'Posted' END as status
                FROM folio_charges 
                WHERE folio_id = ? 
                ORDER BY charge_date ASC, id ASC
            `).all(f.id);

            const payments = await db.prepare(`
                SELECT 
                    id, folio_id, property_id, payment_number, payment_method,
                    amount, reference_code, transaction_date,
                    'Settled' as status
                FROM payments 
                WHERE folio_id = ? 
                ORDER BY transaction_date ASC, id ASC
            `).all(f.id);

            const rooms = await db.prepare(`
                SELECT rr.id, rr.sub_booking_number, rr.folio_number, rm.room_number, rt.name as room_type,
                       rr.check_in_date, rr.check_out_date, rr.room_rate, rr.rate_amount, rr.adults, rr.children,
                       rr.nights
                FROM reservation_rooms rr
                JOIN rooms rm ON rm.id = rr.room_id
                LEFT JOIN room_types rt ON rt.id = rm.room_type_id
                WHERE rr.reservation_id = ?
                ORDER BY rm.room_number ASC
            `).all(f.reservation_id);

            // Calculate precise accounting totals
            let activeChargesSum = 0;
            let activeDiscountsSum = 0;
            let activeServiceChargeSum = 0;
            let activeVatSum = 0;
            let activeCityTaxSum = 0;
            let activeTotalTaxSum = 0;

            charges.forEach((c: any) => {
                if (!c.is_voided) {
                    activeChargesSum += Number(c.total_amount || c.amount || 0);
                    activeDiscountsSum += Number(c.discount_amount || 0);
                    activeServiceChargeSum += Number(c.service_charge || 0);
                    activeVatSum += Number(c.vat || 0);
                    activeCityTaxSum += Number(c.city_tax || 0);
                    activeTotalTaxSum += Number(c.total_tax || 0);
                }
            });

            const paymentsSum = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
            const calculatedDue = Math.max(0, activeChargesSum - paymentsSum);

            return {
                ...f,
                rooms,
                charges,
                payments,
                summary: {
                    totalCharges: activeChargesSum,
                    totalPaid: paymentsSum,
                    totalDiscount: activeDiscountsSum,
                    serviceCharge: activeServiceChargeSum,
                    vat: activeVatSum,
                    cityTax: activeCityTaxSum,
                    totalTax: activeTotalTaxSum,
                    dueAmount: calculatedDue
                },
                calculatedBalance: calculatedDue
            };
        }));

        res.json({
            success: true,
            data: enrichedFolios
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch folios' });
    }
});

// GET /api/accounting/folios/:id - Single folio details
router.get('/folios/:id', async (req: Request, res: Response) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = String(rawId || '');
        const folio = await db.prepare(`
            SELECT 
                f.*,
                r.reservation_number,
                (SELECT string_agg(rm.room_number, ', ' ORDER BY rm.room_number) FROM rooms rm JOIN reservation_rooms rr ON rr.room_id = rm.id WHERE rr.reservation_id = r.id) as room_number,
                (SELECT string_agg(DISTINCT rt.name, ', ') FROM room_types rt JOIN rooms rm ON rm.room_type_id = rt.id JOIN reservation_rooms rr ON rr.room_id = rm.id WHERE rr.reservation_id = r.id) as room_type,
                (SELECT MIN(rr.check_in_date) FROM reservation_rooms rr WHERE rr.reservation_id = r.id) as check_in,
                (SELECT MAX(rr.check_out_date) FROM reservation_rooms rr WHERE rr.reservation_id = r.id) as check_out,
                COALESCE(g.first_name || ' ' || g.last_name, 'Valued Guest') as guest_name,
                g.phone as guest_phone,
                g.email as guest_email
            FROM folios f
            LEFT JOIN reservations r ON r.id = f.reservation_id
            LEFT JOIN guests g ON g.id = f.guest_id
            WHERE CAST(f.id AS TEXT) = ? OR f.folio_number = ?
        `).get(id, id) as any;

        if (!folio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }

        const charges = await db.prepare(`SELECT * FROM folio_charges WHERE folio_id = ? ORDER BY id DESC`).all(folio.id);
        const payments = await db.prepare(`SELECT * FROM payments WHERE folio_id = ? ORDER BY id DESC`).all(folio.id);
        const rooms = await db.prepare(`
            SELECT rr.id, rr.sub_booking_number, rr.folio_number, rm.room_number, rt.name as room_type, rr.check_in_date, rr.check_out_date, rr.room_rate
            FROM reservation_rooms rr
            JOIN rooms rm ON rm.id = rr.room_id
            JOIN room_types rt ON rt.id = rm.room_type_id
            WHERE rr.reservation_id = ?
            ORDER BY rm.room_number ASC
        `).all(folio.reservation_id);

        res.json({
            success: true,
            data: {
                ...folio,
                rooms,
                charges,
                payments
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch folio' });
    }
});

// POST /api/accounting/folios/:id/charges - Post a charge to Folio with Tax & Discount calculation
router.post('/folios/:id/charges', async (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const {
            chargeCode,
            revenueHead = 'Room Charges',
            description,
            amount = 0,
            discount = 0,
            taxApplicable = true,
            chargeDate,
            applyToGroup = false,
            userName = 'Front Desk'
        } = req.body;

        const rawAmount = Math.max(0, Number(amount) || 0);
        const discountAmt = Math.max(0, Number(discount) || 0);
        const netBase = Math.max(0, rawAmount - discountAmt);

        if (rawAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Charge amount must be greater than zero' });
        }

        const isTaxActive = Boolean(taxApplicable);
        const svcCharge = isTaxActive ? Math.round(netBase * 0.10 * 100) / 100 : 0;
        const vatAmt = isTaxActive ? Math.round(netBase * 0.15 * 100) / 100 : 0;
        const cityTaxAmt = isTaxActive ? Math.round(netBase * 0.01 * 100) / 100 : 0;
        const totalTax = svcCharge + vatAmt + cityTaxAmt;
        const totalAmount = netBase + totalTax;

        const dateStr = chargeDate || new Date().toISOString().split('T')[0];
        const refNo = `CHG-${Date.now().toString().slice(-6)}`;
        const code = chargeCode || revenueHead.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20);

        // Fetch parent reservation if applyToGroup is requested
        const targetFolio = await db.prepare(`SELECT * FROM folios WHERE id = ?`).get(folioId) as any;
        if (!targetFolio) {
            return res.status(404).json({ success: false, error: 'Target folio not found' });
        }

        const foliosToCharge: number[] = [folioId];
        if (applyToGroup && targetFolio.reservation_id) {
            const groupFolios = await db.prepare(`SELECT id FROM folios WHERE reservation_id = ? AND id != ?`).all(targetFolio.reservation_id, folioId) as any[];
            groupFolios.forEach(gf => foliosToCharge.push(Number(gf.id)));
        }

        let firstChargeId: any = null;
        for (const targetId of foliosToCharge) {
            const chargeInsert = await db.prepare(`
                INSERT INTO folio_charges (
                    folio_id, charge_code, revenue_head, ref_no, description,
                    amount, discount_amount, service_charge, vat, city_tax,
                    total_tax, total_amount, charge_date, is_tax_applicable, user_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                targetId,
                code,
                revenueHead,
                refNo,
                description || `${revenueHead} Charge`,
                rawAmount,
                discountAmt,
                svcCharge,
                vatAmt,
                cityTaxAmt,
                totalTax,
                totalAmount,
                dateStr,
                isTaxActive,
                userName
            );

            if (!firstChargeId) firstChargeId = chargeInsert.lastInsertRowid;

            // Update Folio balance
            await db.prepare(`
                UPDATE folios 
                SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(totalAmount, targetId);

            // Audit Trail Log
            await db.prepare(`
                INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
                VALUES (?, ?, 'CHARGE_POSTED', ?, ?)
            `).run(
                targetId,
                targetFolio.reservation_id,
                `Posted charge: ${revenueHead} (${description || ''}) - Net ৳${totalAmount.toFixed(2)} [Ref: ${refNo}]`,
                userName
            );
        }

        // Look up propertyId for targeted multi-tenant broadcast
        const propLookup = await db.prepare(`SELECT r.property_id FROM folios f JOIN reservations r ON r.id = f.reservation_id WHERE f.id = ?`).get(folioId) as any;
        const targetPropId = propLookup?.property_id || 1;

        // Emit real-time event
        try {
            broadcastServerEvent({
                type: 'FOLIO_UPDATED',
                propertyId: targetPropId,
                folioId,
                amount: totalAmount
            });
        } catch (err) {
            console.warn('Failed to broadcast folio update', err);
        }

        res.json({
            success: true,
            message: `Charge of ৳${totalAmount.toFixed(2)} posted successfully across ${foliosToCharge.length} folio(s)`,
            chargeId: firstChargeId,
            refNo
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to post charge' });
    }
});

// POST /api/accounting/folios/:id/discounts - Apply a discount to Folio
router.post('/folios/:id/discounts', async (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const {
            discountType = 'PROMOTIONAL',
            revenueHead = 'Discount',
            taxApplicable = false,
            discountAmount = 0,
            comment = '',
            userName = 'Front Desk'
        } = req.body;

        const discAmt = Math.max(0, Number(discountAmount) || 0);
        if (discAmt <= 0) {
            return res.status(400).json({ success: false, error: 'Discount amount must be greater than zero' });
        }

        const targetFolio = await db.prepare(`SELECT * FROM folios WHERE id = ?`).get(folioId) as any;
        if (!targetFolio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }

        const isTaxActive = Boolean(taxApplicable);
        const svcCharge = isTaxActive ? Math.round(discAmt * 0.10 * 100) / 100 : 0;
        const vatAmt = isTaxActive ? Math.round(discAmt * 0.15 * 100) / 100 : 0;
        const cityTaxAmt = isTaxActive ? Math.round(discAmt * 0.01 * 100) / 100 : 0;
        const totalTax = svcCharge + vatAmt + cityTaxAmt;
        const netDiscount = discAmt + totalTax;

        const dateStr = new Date().toISOString().split('T')[0];
        const refNo = `DISC-${Date.now().toString().slice(-6)}`;

        // Post as discount transaction in folio_charges (with negative amount or discount flag)
        const insertRes = await db.prepare(`
            INSERT INTO folio_charges (
                folio_id, charge_code, revenue_head, ref_no, description,
                amount, discount_amount, service_charge, vat, city_tax,
                total_tax, total_amount, charge_date, is_tax_applicable, user_name
            ) VALUES (?, 'DISCOUNT', 'Discount', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            folioId,
            refNo,
            comment || `Discount applied (${discountType})`,
            -discAmt,
            discAmt,
            -svcCharge,
            -vatAmt,
            -cityTaxAmt,
            -totalTax,
            -netDiscount,
            dateStr,
            isTaxActive,
            userName
        );

        // Update folio balance
        await db.prepare(`
            UPDATE folios 
            SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(netDiscount, folioId);

        // Log audit trail
        await db.prepare(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'DISCOUNT_APPLIED', ?, ?)
        `).run(
            folioId,
            targetFolio.reservation_id,
            `Discount Applied: Discount of ৳${netDiscount.toFixed(2)} (${comment || discountType}) applied to folio ${targetFolio.folio_number}`,
            userName
        );

        res.json({
            success: true,
            message: `Discount of ৳${netDiscount.toFixed(2)} applied successfully`,
            chargeId: insertRes.lastInsertRowid
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to apply discount' });
    }
});

// POST /api/accounting/folios/:id/adjustments - Adjustment Posting (Positive/Negative)
router.post('/folios/:id/adjustments', async (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const {
            revenueHead = 'Adjustments',
            amount = 0,
            taxApplicable = false,
            comment = '',
            userName = 'Front Desk'
        } = req.body;

        const adjAmount = Number(amount) || 0;
        if (adjAmount === 0) {
            return res.status(400).json({ success: false, error: 'Adjustment amount cannot be zero' });
        }

        const targetFolio = await db.prepare(`SELECT * FROM folios WHERE id = ?`).get(folioId) as any;
        if (!targetFolio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }

        const isTaxActive = Boolean(taxApplicable);
        const absAmt = Math.abs(adjAmount);
        const sign = adjAmount > 0 ? 1 : -1;
        const svcCharge = isTaxActive ? Math.round(absAmt * 0.10 * 100) / 100 * sign : 0;
        const vatAmt = isTaxActive ? Math.round(absAmt * 0.15 * 100) / 100 * sign : 0;
        const cityTaxAmt = isTaxActive ? Math.round(absAmt * 0.01 * 100) / 100 * sign : 0;
        const totalTax = svcCharge + vatAmt + cityTaxAmt;
        const totalAmount = adjAmount + totalTax;

        const dateStr = new Date().toISOString().split('T')[0];
        const refNo = `ADJ-${Date.now().toString().slice(-6)}`;

        const insertRes = await db.prepare(`
            INSERT INTO folio_charges (
                folio_id, charge_code, revenue_head, ref_no, description,
                amount, discount_amount, service_charge, vat, city_tax,
                total_tax, total_amount, charge_date, is_tax_applicable, user_name
            ) VALUES (?, 'ADJUSTMENT', ?, ?, ?, ?, 0.00, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            folioId,
            revenueHead,
            refNo,
            comment || `Balance Adjustment (${revenueHead})`,
            adjAmount,
            svcCharge,
            vatAmt,
            cityTaxAmt,
            totalTax,
            totalAmount,
            dateStr,
            isTaxActive,
            userName
        );

        // Update folio balance
        await db.prepare(`
            UPDATE folios 
            SET balance = GREATEST(0, balance + ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(totalAmount, folioId);

        // Audit Trail Log
        await db.prepare(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'ADJUSTMENT_POSTED', ?, ?)
        `).run(
            folioId,
            targetFolio.reservation_id,
            `Adjustment Posted: ${adjAmount > 0 ? '+' : ''}৳${totalAmount.toFixed(2)} (${comment || revenueHead}) on folio ${targetFolio.folio_number}`,
            userName
        );

        res.json({
            success: true,
            message: `Adjustment of ৳${totalAmount.toFixed(2)} posted successfully`,
            chargeId: insertRes.lastInsertRowid
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to post adjustment' });
    }
});

// POST /api/accounting/folios/transfer - Transfer Folio Charges to another folio or Group Owner
router.post('/folios/transfer', async (req: Request, res: Response) => {
    try {
        const { sourceFolioId, destFolioId, chargeIds = [], transferToGroupOwner = false, userName = 'Front Desk' } = req.body;

        const sourceFolio = await db.prepare(`SELECT * FROM folios WHERE id = ?`).get(Number(sourceFolioId)) as any;
        if (!sourceFolio) {
            return res.status(404).json({ success: false, error: 'Source folio not found' });
        }

        let targetDestId = Number(destFolioId);
        if (transferToGroupOwner) {
            // Find group owner folio for this reservation
            const groupOwnerFolio = await db.prepare(`
                SELECT id, folio_number FROM folios 
                WHERE reservation_id = ? AND (folio_type = 'MASTER' OR id != ?) 
                ORDER BY id ASC LIMIT 1
            `).get(sourceFolio.reservation_id, sourceFolio.id) as any;

            if (groupOwnerFolio) {
                targetDestId = Number(groupOwnerFolio.id);
            } else {
                return res.status(400).json({ success: false, error: 'Group Owner Folio not found for this booking' });
            }
        }

        const destFolio = await db.prepare(`SELECT * FROM folios WHERE id = ?`).get(targetDestId) as any;
        if (!destFolio) {
            return res.status(404).json({ success: false, error: 'Destination folio not found' });
        }

        // Determine charges to move
        let targetCharges: any[] = [];
        if (Array.isArray(chargeIds) && chargeIds.length > 0) {
            const placeholders = chargeIds.map(() => '?').join(',');
            targetCharges = await db.prepare(`SELECT * FROM folio_charges WHERE folio_id = ? AND id IN (${placeholders})`).all(sourceFolio.id, ...chargeIds);
        } else {
            targetCharges = await db.prepare(`SELECT * FROM folio_charges WHERE folio_id = ? AND (is_voided IS FALSE OR is_voided IS NULL)`).all(sourceFolio.id);
        }

        if (targetCharges.length === 0) {
            return res.status(400).json({ success: false, error: 'No charges available to transfer' });
        }

        let transferredSum = 0;
        for (const c of targetCharges) {
            const amt = Number(c.total_amount || c.amount || 0);
            transferredSum += amt;
            await db.prepare(`UPDATE folio_charges SET folio_id = ? WHERE id = ?`).run(destFolio.id, c.id);
        }

        // Rebalance source and destination folios
        await db.prepare(`UPDATE folios SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(transferredSum, sourceFolio.id);
        await db.prepare(`UPDATE folios SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(transferredSum, destFolio.id);

        // Audit Trail
        await db.prepare(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'CHARGES_TRANSFERRED', ?, ?)
        `).run(
            sourceFolio.id,
            sourceFolio.reservation_id,
            `Transferred ${targetCharges.length} charge(s) totaling ৳${transferredSum.toFixed(2)} to Folio ${destFolio.folio_number}`,
            userName
        );

        await db.prepare(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'CHARGES_RECEIVED', ?, ?)
        `).run(
            destFolio.id,
            destFolio.reservation_id,
            `Received ${targetCharges.length} charge(s) totaling ৳${transferredSum.toFixed(2)} transferred from Folio ${sourceFolio.folio_number}`,
            userName
        );

        res.json({
            success: true,
            message: `Successfully transferred ${targetCharges.length} charges (৳${transferredSum.toFixed(2)}) to Folio ${destFolio.folio_number}`,
            transferredCount: targetCharges.length,
            transferredAmount: transferredSum
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to transfer charges' });
    }
});

// POST /api/accounting/folios/split - Cut / Split Folio (creates new secondary folio if needed)
router.post('/folios/split', async (req: Request, res: Response) => {
    try {
        const { sourceFolioId, destFolioId, chargeIds = [], newFolioName, userName = 'Front Desk' } = req.body;

        const sourceFolio = await db.prepare(`SELECT * FROM folios WHERE id = ?`).get(Number(sourceFolioId)) as any;
        if (!sourceFolio) {
            return res.status(404).json({ success: false, error: 'Source folio not found' });
        }

        if (!Array.isArray(chargeIds) || chargeIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Please select charges to move to the new/destination folio' });
        }

        let targetDestId = Number(destFolioId);
        let destFolio: any = null;

        if (targetDestId) {
            destFolio = await db.prepare(`SELECT * FROM folios WHERE id = ?`).get(targetDestId) as any;
        }

        // If no destination folio was selected, auto-create a Cut Folio (Window 2) for this reservation
        if (!destFolio) {
            const cutNumber = `${sourceFolio.folio_number}-2`;
            const created = await db.prepare(`
                INSERT INTO folios (
                    reservation_id, guest_id, folio_number, folio_type, status, balance,
                    bill_to, business_source, generate_invoice_on_checkout
                ) VALUES (?, ?, ?, 'GUEST', 'OPEN', 0.00, ?, ?, TRUE)
                RETURNING id, folio_number
            `).run(
                sourceFolio.reservation_id,
                sourceFolio.guest_id,
                newFolioName || cutNumber,
                sourceFolio.bill_to || 'Guest Folio 2',
                sourceFolio.business_source || 'Direct'
            );
            targetDestId = Number(created.lastInsertRowid);
            destFolio = await db.prepare(`SELECT * FROM folios WHERE id = ?`).get(targetDestId);
        }

        const placeholders = chargeIds.map(() => '?').join(',');
        const chargesToMove = await db.prepare(`SELECT * FROM folio_charges WHERE folio_id = ? AND id IN (${placeholders})`).all(sourceFolio.id, ...chargeIds) as any[];

        let movedTotal = 0;
        for (const c of chargesToMove) {
            const amt = Number(c.total_amount || c.amount || 0);
            movedTotal += amt;
            await db.prepare(`UPDATE folio_charges SET folio_id = ? WHERE id = ?`).run(destFolio.id, c.id);
        }

        // Update balances
        await db.prepare(`UPDATE folios SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(movedTotal, sourceFolio.id);
        await db.prepare(`UPDATE folios SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(movedTotal, destFolio.id);

        // Audit Trail Log
        await db.prepare(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'FOLIO_SPLIT', ?, ?)
        `).run(
            sourceFolio.id,
            sourceFolio.reservation_id,
            `Cut Folio: Split ${chargesToMove.length} charges (৳${movedTotal.toFixed(2)}) into Folio ${destFolio.folio_number}`,
            userName
        );

        res.json({
            success: true,
            message: `Successfully split ${chargesToMove.length} charges into Folio ${destFolio.folio_number}`,
            destinationFolioId: destFolio.id,
            destinationFolioNumber: destFolio.folio_number,
            movedCount: chargesToMove.length,
            movedAmount: movedTotal
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to split folio' });
    }
});

// POST /api/accounting/folios/charges/:id/void - Void an extra charge with mandatory audit reason
router.post('/folios/charges/:id/void', async (req: Request, res: Response) => {
    try {
        const chargeId = Number(req.params.id);
        const { voidReason = 'Erroneous posting', userName = 'Front Desk' } = req.body;

        const charge = await db.prepare(`SELECT * FROM folio_charges WHERE id = ?`).get(chargeId) as any;
        if (!charge) {
            return res.status(404).json({ success: false, error: 'Charge not found' });
        }

        if (charge.is_voided) {
            return res.status(400).json({ success: false, error: 'Charge is already voided' });
        }

        await db.prepare(`
            UPDATE folio_charges 
            SET is_voided = TRUE, void_reason = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(voidReason, chargeId).catch(() => {
            return db.prepare(`UPDATE folio_charges SET is_voided = TRUE, void_reason = ? WHERE id = ?`).run(voidReason, chargeId);
        });

        const chargeTotal = Number(charge.total_amount || charge.amount || 0);

        // Deduct from folio balance
        await db.prepare(`
            UPDATE folios 
            SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(chargeTotal, charge.folio_id);

        // Audit Trail Log
        await db.prepare(`
            INSERT INTO folio_audit_trail (folio_id, action_type, description, user_name)
            VALUES (?, 'CHARGE_VOIDED', ?, ?)
        `).run(
            charge.folio_id,
            `Voided Charge: ${charge.revenue_head || charge.charge_code} (৳${chargeTotal.toFixed(2)}) - Reason: ${voidReason}`,
            userName
        );

        res.json({
            success: true,
            message: `Charge #${chargeId} successfully voided`,
            voidedAmount: chargeTotal
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to void charge' });
    }
});

// POST /api/accounting/folios/payments/:id/void - Void a payment transaction with mandatory audit reason
router.post('/folios/payments/:id/void', async (req: Request, res: Response) => {
    try {
        const paymentId = Number(req.params.id);
        const { voidReason = 'Erroneous payment entry', userName = 'Front Desk' } = req.body;

        const payment = await db.prepare(`SELECT * FROM payments WHERE id = ?`).get(paymentId) as any;
        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment not found' });
        }

        // Delete payment or mark void
        await db.prepare(`DELETE FROM payments WHERE id = ?`).run(paymentId);

        const paymentAmt = Number(payment.amount || 0);

        // Restore folio balance
        await db.prepare(`
            UPDATE folios 
            SET balance = balance + ?, status = 'OPEN', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(paymentAmt, payment.folio_id);

        // Audit Trail Log
        await db.prepare(`
            INSERT INTO folio_audit_trail (folio_id, action_type, description, user_name)
            VALUES (?, 'PAYMENT_VOIDED', ?, ?)
        `).run(
            payment.folio_id,
            `Voided Payment: ${payment.payment_method} ৳${paymentAmt.toFixed(2)} [${payment.payment_number}] - Reason: ${voidReason}`,
            userName
        );

        res.json({
            success: true,
            message: `Payment ${payment.payment_number} successfully voided`,
            restoredAmount: paymentAmt
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to void payment' });
    }
});

// POST /api/accounting/folios/:id/tax-exempt - Apply Tax Exemption with Exemption ID
router.post('/folios/:id/tax-exempt', async (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const { taxExemptionId = 'MILITARY_NGO_EXEMPT', chargeIds = [], userName = 'Front Desk' } = req.body;

        const targetFolio = await db.prepare(`SELECT * FROM folios WHERE id = ?`).get(folioId) as any;
        if (!targetFolio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }

        let chargesToExempt: any[] = [];
        if (Array.isArray(chargeIds) && chargeIds.length > 0) {
            const placeholders = chargeIds.map(() => '?').join(',');
            chargesToExempt = await db.prepare(`SELECT * FROM folio_charges WHERE folio_id = ? AND id IN (${placeholders})`).all(folioId, ...chargeIds);
        } else {
            chargesToExempt = await db.prepare(`SELECT * FROM folio_charges WHERE folio_id = ? AND is_tax_applicable = TRUE`).all(folioId);
        }

        let totalTaxRelieved = 0;
        for (const c of chargesToExempt) {
            const taxAmt = Number(c.total_tax || 0);
            totalTaxRelieved += taxAmt;
            const newTotal = Number(c.amount || 0) - Number(c.discount_amount || 0);
            await db.prepare(`
                UPDATE folio_charges 
                SET is_tax_applicable = FALSE, tax_exemption_id = ?,
                    service_charge = 0.00, vat = 0.00, city_tax = 0.00, total_tax = 0.00,
                    total_amount = ?
                WHERE id = ?
            `).run(taxExemptionId, newTotal, c.id);
        }

        // Adjust folio balance
        await db.prepare(`
            UPDATE folios 
            SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(totalTaxRelieved, folioId);

        // Audit Trail Log
        await db.prepare(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'TAX_EXEMPTION_APPLIED', ?, ?)
        `).run(
            folioId,
            targetFolio.reservation_id,
            `Tax Exemption Applied: Tax Exemption ID [${taxExemptionId}] applied across ${chargesToExempt.length} charges. Relieved ৳${totalTaxRelieved.toFixed(2)} in taxes.`,
            userName
        );

        res.json({
            success: true,
            message: `Tax exemption applied successfully to ${chargesToExempt.length} charges`,
            exemptedChargesCount: chargesToExempt.length,
            taxRelieved: totalTaxRelieved
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to apply tax exemption' });
    }
});

// PUT /api/accounting/folios/:id/booking-details - Update Booking & Source Info and Compliance Flags
router.put('/folios/:id/booking-details', async (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const {
            billTo,
            marketCode,
            businessSource,
            businessAgent,
            voucherNo,
            commissionPlan,
            planValue = 0,
            salesPerson,
            sendMail = false,
            checkoutMail = false,
            suppressRateQr = false,
            displayInclusionSeparate = false,
            generateInvoiceOnCheckout = true,
            gstinNumber,
            applyToGroup = false,
            userName = 'Front Desk'
        } = req.body;

        const targetFolio = await db.prepare(`SELECT * FROM folios WHERE id = ?`).get(folioId) as any;
        if (!targetFolio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }

        const foliosToUpdate = [folioId];
        if (applyToGroup && targetFolio.reservation_id) {
            const others = await db.prepare(`SELECT id FROM folios WHERE reservation_id = ? AND id != ?`).all(targetFolio.reservation_id, folioId) as any[];
            others.forEach(o => foliosToUpdate.push(Number(o.id)));
        }

        for (const fid of foliosToUpdate) {
            await db.prepare(`
                UPDATE folios 
                SET bill_to = ?, market_code = ?, business_source = ?, business_agent = ?,
                    voucher_no = ?, commission_plan = ?, plan_value = ?, sales_person = ?,
                    send_mail = ?, checkout_mail = ?, suppress_rate_qr = ?, display_inclusion_separate = ?,
                    generate_invoice_on_checkout = ?, gstin_number = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(
                billTo || null,
                marketCode || null,
                businessSource || 'Direct',
                businessAgent || null,
                voucherNo || null,
                commissionPlan || null,
                Number(planValue) || 0,
                salesPerson || null,
                Boolean(sendMail),
                Boolean(checkoutMail),
                Boolean(suppressRateQr),
                Boolean(displayInclusionSeparate),
                Boolean(generateInvoiceOnCheckout),
                gstinNumber || null,
                fid
            );
        }

        // Audit Trail Log
        await db.prepare(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'BOOKING_DETAILS_UPDATED', ?, ?)
        `).run(
            folioId,
            targetFolio.reservation_id,
            `Booking Details Updated: Bill To [${billTo || 'Default'}], Source [${businessSource || 'Direct'}], GSTIN [${gstinNumber || 'None'}]`,
            userName
        );

        res.json({
            success: true,
            message: `Booking & billing details updated successfully across ${foliosToUpdate.length} folio(s)`
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to update booking details' });
    }
});

// PUT /api/accounting/folios/:id/room-charges - Update Details (Rate, Pax, Scope, Complimentary, Inclusive Tax)
router.put('/folios/:id/room-charges', async (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const {
            stayDate,
            adults = 1,
            children = 0,
            isComplimentary = false,
            rate = 0,
            ratesInclusiveTax = false,
            scope = 'SELECTED_DATES',
            userName = 'Front Desk'
        } = req.body;

        const targetFolio = await db.prepare(`SELECT * FROM folios WHERE id = ?`).get(folioId) as any;
        if (!targetFolio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }

        const effectiveRate = isComplimentary ? 0 : Math.max(0, Number(rate));
        let baseAmount = effectiveRate;
        let serviceCharge = 0;
        let vat = 0;
        let cityTax = 0;
        let totalTax = 0;
        let grandTotal = effectiveRate;

        if (effectiveRate > 0) {
            if (ratesInclusiveTax) {
                baseAmount = Math.round((effectiveRate / 1.26) * 100) / 100;
                serviceCharge = Math.round(baseAmount * 0.10 * 100) / 100;
                vat = Math.round(baseAmount * 0.15 * 100) / 100;
                cityTax = Math.round(baseAmount * 0.01 * 100) / 100;
                totalTax = serviceCharge + vat + cityTax;
                grandTotal = baseAmount + totalTax;
            } else {
                baseAmount = effectiveRate;
                serviceCharge = Math.round(baseAmount * 0.10 * 100) / 100;
                vat = Math.round(baseAmount * 0.15 * 100) / 100;
                cityTax = Math.round(baseAmount * 0.01 * 100) / 100;
                totalTax = serviceCharge + vat + cityTax;
                grandTotal = baseAmount + totalTax;
            }
        }

        let updatedChargesCount = 0;
        if (scope === 'SELECTED_DATES' && stayDate) {
            const existingCharge = await db.prepare(`
                SELECT id FROM folio_charges 
                WHERE folio_id = ? AND charge_date = ? AND charge_code = 'ROOM_CHG' AND (is_voided IS FALSE OR is_voided IS NULL)
            `).get(folioId, stayDate) as any;

            if (existingCharge) {
                await db.prepare(`
                    UPDATE folio_charges 
                    SET amount = ?, service_charge = ?, vat = ?, city_tax = ?, total_tax = ?, total_amount = ?
                    WHERE id = ?
                `).run(baseAmount, serviceCharge, vat, cityTax, totalTax, grandTotal, existingCharge.id);
                updatedChargesCount = 1;
            } else {
                await db.prepare(`
                    INSERT INTO folio_charges (
                        folio_id, charge_code, revenue_head, ref_no, description, amount, discount_amount,
                        service_charge, vat, city_tax, total_tax, total_amount, charge_date, is_tax_applicable, user_name
                    ) VALUES (?, 'ROOM_CHG', 'Room Charges', 'RC-UPD', 'Room Charge', ?, 0, ?, ?, ?, ?, ?, ?, TRUE, ?)
                `).run(folioId, baseAmount, serviceCharge, vat, cityTax, totalTax, grandTotal, stayDate, userName);
                updatedChargesCount = 1;
            }
        } else {
            const result = await db.prepare(`
                UPDATE folio_charges 
                SET amount = ?, service_charge = ?, vat = ?, city_tax = ?, total_tax = ?, total_amount = ?
                WHERE folio_id = ? AND charge_code = 'ROOM_CHG' AND (is_voided IS FALSE OR is_voided IS NULL)
            `).run(baseAmount, serviceCharge, vat, cityTax, totalTax, grandTotal, folioId);
            updatedChargesCount = result.rowCount || 0;
        }

        if (targetFolio.reservation_id) {
            await db.prepare(`
                UPDATE reservation_rooms 
                SET room_rate = ?, adults = ?, children = ?
                WHERE reservation_id = ?
            `).run(grandTotal, adults, children, targetFolio.reservation_id);
        }

        await db.prepare(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'ROOM_CHARGES_UPDATED', ?, ?)
        `).run(
            folioId,
            targetFolio.reservation_id,
            `Room Charges Updated: Rate ${effectiveRate} (${scope === 'WHOLE_STAY' ? 'Whole Stay' : stayDate}), Adults: ${adults}, Children: ${children}${isComplimentary ? ' [Complimentary]' : ''}`,
            userName
        );

        res.json({
            success: true,
            message: `Room charges updated successfully (${scope === 'WHOLE_STAY' ? 'Whole stay' : stayDate})`,
            updatedChargesCount,
            newRate: grandTotal
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to update room charges' });
    }
});

// GET /api/accounting/folios/:id/audit-trail - Chronological Audit Logs
router.get('/folios/:id/audit-trail', async (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const logs = await db.prepare(`
            SELECT * FROM folio_audit_trail 
            WHERE folio_id = ? OR reservation_id = (SELECT reservation_id FROM folios WHERE id = ?)
            ORDER BY created_at DESC, id DESC
        `).all(folioId, folioId);

        res.json({
            success: true,
            data: logs
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch audit trail' });
    }
});

// POST /api/accounting/folios/:id/payments - Post payment/settlement to Folio
router.post('/folios/:id/payments', async (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const { paymentMethod = 'CASH', amount, referenceCode = 'FRONT_DESK_SETTLE' } = req.body;
        const propertyId = Number(req.body.propertyId || req.headers['x-property-id']) || null;

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid payment amount' });
        }

        const paymentNumber = `PAY-${Date.now().toString().slice(-8)}`;

        // 1. Insert payment
        const payInsert = await db.prepare(`
            INSERT INTO payments (folio_id, property_id, payment_number, payment_method, amount, reference_code)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(folioId, propertyId, paymentNumber, paymentMethod.toUpperCase(), numAmount, referenceCode);

        // 2. Update Folio balance & status
        await db.prepare(`
            UPDATE folios 
            SET balance = GREATEST(0, balance - ?),
                status = CASE WHEN (balance - ?) <= 0 THEN 'SETTLED' ELSE 'OPEN' END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(numAmount, numAmount, folioId);

        // 3. Emit real-time event
        try {
            broadcastServerEvent({
                type: 'FOLIO_UPDATED',
                propertyId,
                folioId,
                paymentId: payInsert.lastInsertRowid,
                amount: numAmount
            });
        } catch (err) {
            console.warn('Failed to broadcast payment update', err);
        }

        res.json({
            success: true,
            message: `Payment of ৳${numAmount.toFixed(2)} recorded successfully`,
            paymentNumber
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to record payment' });
    }
});

// GET /api/accounting/journal-entries - Double-entry General Ledger audit journal
router.get('/journal-entries', async (req: Request, res: Response) => {
    try {
        const entries = await db.prepare(`
            SELECT * FROM journal_entries ORDER BY entry_date DESC, id DESC
        `).all() as any[];

        const entriesWithLines = await Promise.all(entries.map(async entry => {
            const lines = await db.prepare(`
                SELECT jl.*, coa.account_code, coa.account_name, coa.account_type
                FROM journal_lines jl
                JOIN chart_of_accounts coa ON coa.id = jl.account_id
                WHERE jl.journal_entry_id = ?
            `).all(entry.id);

            const totalDebit = lines.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0);
            const totalCredit = lines.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0);
            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

            return {
                ...entry,
                lines,
                totalDebit,
                totalCredit,
                isBalanced
            };
        }));

        res.json({
            success: true,
            data: entriesWithLines
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch journal entries' });
    }
});

// POST /api/accounting/journal-entries - Post a new balanced double-entry transaction
router.post('/journal-entries', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.body.propertyId || req.headers['x-property-id']) || null;
        const { description, entryDate, lines = [], createdBy = 'Manual Entry' } = req.body;

        if (!lines || !Array.isArray(lines) || lines.length < 2) {
            return res.status(400).json({ success: false, error: 'A valid journal entry must contain at least 2 lines (debit & credit).' });
        }

        const totalDebit = lines.reduce((sum: number, l: any) => sum + Number(l.debit || 0), 0);
        const totalCredit = lines.reduce((sum: number, l: any) => sum + Number(l.credit || 0), 0);

        if (Math.abs(totalDebit - totalCredit) >= 0.01) {
            return res.status(400).json({
                success: false,
                error: `Unbalanced entry! Total Debits (৳${totalDebit.toFixed(2)}) must equal Total Credits (৳${totalCredit.toFixed(2)}). Difference: ৳${Math.abs(totalDebit - totalCredit).toFixed(2)}`
            });
        }

        const entryNumber = `JV-${Date.now().toString().slice(-8)}`;
        const dateStr = entryDate || new Date().toISOString().split('T')[0];

        // Insert Header
        const insertEntry = db.prepare(`
            INSERT INTO journal_entries (organization_id, property_id, entry_number, entry_date, description, reference_type, is_posted, created_by)
            VALUES (1, ?, ?, ?, ?, 'MANUAL', true, ?)
        `);
        const result = await insertEntry.run(propertyId, entryNumber, dateStr, description, createdBy);
        const entryId = Number(result.lastInsertRowid);

        // Insert Lines
        const insertLine = db.prepare(`
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, memo)
            VALUES (?, ?, ?, ?, ?)
        `);

        for (const line of lines) {
            await insertLine.run(
                entryId,
                line.accountId,
                Number(line.debit || 0),
                Number(line.credit || 0),
                line.memo || description
            );
        }

        res.json({
            success: true,
            message: `Journal Entry ${entryNumber} successfully posted to General Ledger!`,
            data: {
                id: entryId,
                entryNumber,
                totalAmount: totalDebit
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to post journal entry' });
    }
});

// GET /api/accounting/trial-balance - Live General Ledger Trial Balance
router.get('/trial-balance', async (req: Request, res: Response) => {
    try {
        const rows = await db.prepare(`
            SELECT 
                coa.id as account_id,
                coa.account_code,
                coa.account_name,
                coa.account_type,
                COALESCE(SUM(jl.debit), 0) as total_debit,
                COALESCE(SUM(jl.credit), 0) as total_credit
            FROM chart_of_accounts coa
            LEFT JOIN journal_lines jl ON jl.account_id = coa.id
            LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND (je.is_posted = 1 OR je.is_posted = TRUE)
            GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
            ORDER BY coa.account_code ASC
        `).all() as any[];

        let grandDebit = 0;
        let grandCredit = 0;

        const trialBalance = rows.map(r => {
            const debit = Number(r.total_debit || 0);
            const credit = Number(r.total_credit || 0);
            grandDebit += debit;
            grandCredit += credit;

            let netDebit = 0;
            let netCredit = 0;
            if (['ASSET', 'EXPENSE'].includes(r.account_type)) {
                const diff = debit - credit;
                if (diff >= 0) netDebit = diff;
                else netCredit = Math.abs(diff);
            } else {
                const diff = credit - debit;
                if (diff >= 0) netCredit = diff;
                else netDebit = Math.abs(diff);
            }

            return {
                ...r,
                debit,
                credit,
                netDebit,
                netCredit
            };
        });

        res.json({
            success: true,
            data: trialBalance,
            summary: {
                grandDebit,
                grandCredit,
                isBalanced: Math.abs(grandDebit - grandCredit) < 0.01,
                difference: Math.abs(grandDebit - grandCredit)
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to generate trial balance' });
    }
});

// GET /api/accounting/night-audit/status - Get current business date & night audit readiness
router.get('/night-audit/status', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.query.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = rawPropId ? Number(rawPropId) : 1;

        const preflight = await NightAuditService.getPreFlightStatus(propertyId);
        res.json({
            success: true,
            data: {
                propertyId,
                inHouseReservationsCount: preflight.inHouseCount,
                pendingNoShowsCount: preflight.pendingArrivalsCount,
                serverDate: preflight.operationalDate,
                isReadyForAudit: preflight.isReady,
                blockers: preflight.blockers,
                preflight
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to get audit status' });
    }
});

// POST /api/accounting/night-audit/run - Authoritative Backend Night Audit Engine
router.post('/night-audit/run', async (req: Request, res: Response) => {
    try {
        const rawPropId = req.body.propertyId || req.headers['x-property-id'] || (req as any).propertyId;
        const propertyId = rawPropId ? Number(rawPropId) : 1;
        const forceOverride = req.body.forceOverride !== undefined ? Boolean(req.body.forceOverride) : true;

        const result = await NightAuditService.executeNightAudit(propertyId, {
            forceOverride,
            autoDirtyRooms: true,
            performedBy: req.body.performedBy || 'System Admin'
        });

        res.json({
            success: true,
            data: result
        });
    } catch (e: any) {
        console.error('Night audit failure:', e);
        res.status(400).json({ success: false, error: e?.message || 'Night audit failed' });
    }
});

export default router;
