import { Router, Request, Response } from 'express';
import { pgPool } from '../database/postgres.js';
import { broadcastServerEvent } from './realtime.routes.js';
import { NightAuditService } from '../services/nightAudit.service.js';

const router = Router();

function toPgQuery(sql: string): string {
    let out = '';
    let paramIndex = 1;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < sql.length; i++) {
        const c = sql[i];
        const next = sql[i + 1];

        if (inSingleQuote) {
            out += c;
            if (c === "'" && next === "'") {
                out += next;
                i++;
            } else if (c === "'") {
                inSingleQuote = false;
            }
        } else if (inDoubleQuote) {
            out += c;
            if (c === '"' && next === '"') {
                out += next;
                i++;
            } else if (c === '"') {
                inDoubleQuote = false;
            }
        } else if (inLineComment) {
            out += c;
            if (c === '\n') {
                inLineComment = false;
            }
        } else if (inBlockComment) {
            out += c;
            if (c === '*' && next === '/') {
                out += next;
                i++;
                inBlockComment = false;
            }
        } else {
            if (c === "'") {
                inSingleQuote = true;
                out += c;
            } else if (c === '"') {
                inDoubleQuote = true;
                out += c;
            } else if (c === '-' && next === '-') {
                inLineComment = true;
                out += c + next;
                i++;
            } else if (c === '/' && next === '*') {
                inBlockComment = true;
                out += c + next;
                i++;
            } else if (c === '?') {
                out += '$' + (paramIndex++);
            } else {
                out += c;
            }
        }
    }
    return out;
}

async function queryRows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const formatted = toPgQuery(sql);
    const res = await pgPool.query(formatted, params);
    return res.rows as T[];
}

async function queryRow<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const formatted = toPgQuery(sql);
    const res = await pgPool.query(formatted, params);
    return (res.rows[0] || null) as T | null;
}

async function queryExec(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; rowCount: number; rows: any[] }> {
    let formatted = toPgQuery(sql);
    if (/^\s*INSERT\s+INTO/i.test(formatted) && !/RETURNING/i.test(formatted)) {
        formatted += ' RETURNING id';
    }
    const res = await pgPool.query(formatted, params);
    return {
        lastInsertRowid: Number(res.rows[0]?.id || 0),
        rowCount: res.rowCount || 0,
        rows: res.rows
    };
}

// GET /api/accounting/chart-of-accounts - USALI Chart of Accounts
router.get('/chart-of-accounts', async (req: Request, res: Response) => {
    try {
        const accounts = await queryRows(`
            SELECT * FROM chart_of_accounts 
            ORDER BY account_code ASC
        `);

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
        const heads = await queryRows(`
            SELECT * FROM revenue_heads WHERE is_active = TRUE ORDER BY name ASC
        `);
        res.json({ success: true, data: heads });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch revenue heads' });
    }
});

// GET /api/accounting/currencies/rates - Multi-Currency Exchange Rates
router.get('/currencies/rates', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.query.propertyId || req.headers['x-property-id']) || 1;
        const rates = await queryRows(`
            SELECT id, property_id, from_currency, to_currency, exchange_rate, effective_date, source, updated_at
            FROM currency_exchange_rates
            WHERE property_id = ?
            ORDER BY from_currency ASC
        `, [propertyId]);

        res.json({
            success: true,
            data: rates.map((r: any) => ({
                id: r.id,
                fromCurrency: r.from_currency,
                toCurrency: r.to_currency,
                exchangeRate: parseFloat(r.exchange_rate),
                effectiveDate: r.effective_date,
                source: r.source
            }))
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch currency exchange rates' });
    }
});

// POST /api/accounting/currencies/rates - Set / Update Exchange Rate
router.post('/currencies/rates', async (req: Request, res: Response) => {
    try {
        const propertyId = Number(req.body.propertyId || req.headers['x-property-id']) || 1;
        const { fromCurrency, toCurrency = 'BDT', exchangeRate, source = 'Treasury Rate Update' } = req.body;

        if (!fromCurrency || !exchangeRate || Number(exchangeRate) <= 0) {
            return res.status(400).json({ success: false, error: 'fromCurrency and positive exchangeRate are required' });
        }

        const cleanFrom = String(fromCurrency).toUpperCase().trim();
        const cleanTo = String(toCurrency).toUpperCase().trim();
        const numRate = Number(exchangeRate);

        const result = await queryRows(`
            INSERT INTO currency_exchange_rates (property_id, from_currency, to_currency, exchange_rate, effective_date, source)
            VALUES (?, ?, ?, ?, CURRENT_DATE, ?)
            ON CONFLICT (property_id, from_currency, to_currency, effective_date)
            DO UPDATE SET exchange_rate = EXCLUDED.exchange_rate, source = EXCLUDED.source, updated_at = CURRENT_TIMESTAMP
            RETURNING id, from_currency, to_currency, exchange_rate, effective_date;
        `, [propertyId, cleanFrom, cleanTo, numRate, source]);

        res.status(201).json({
            success: true,
            data: result[0],
            message: `Exchange rate set: 1 ${cleanFrom} = ${numRate} ${cleanTo}`
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to update currency exchange rate' });
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

        if (reservationIdParam && reservationNoParam) {
            const clean1 = reservationIdParam.replace(/^(res|fol)[-_~]/i, '');
            const clean2 = reservationNoParam.replace(/^(res|fol)[-_~]/i, '');
            whereClause += ` AND (f.reservation_id::text = ? OR UPPER(r.reservation_number) = UPPER(?) OR UPPER(r.reservation_number) = UPPER(?) OR r.reservation_number ILIKE ? OR r.reservation_number ILIKE ?)`;
            params.push(reservationIdParam, reservationIdParam, reservationNoParam, `%${clean1}%`, `%${clean2}%`);
        } else if (reservationIdParam) {
            const clean = reservationIdParam.replace(/^(res|fol)[-_~]/i, '');
            whereClause += ` AND (f.reservation_id::text = ? OR UPPER(r.reservation_number) = UPPER(?) OR r.reservation_number ILIKE ?)`;
            params.push(reservationIdParam, reservationIdParam, `%${clean}%`);
        } else if (reservationNoParam) {
            const clean = reservationNoParam.replace(/^(res|fol)[-_~]/i, '');
            whereClause += ` AND (UPPER(r.reservation_number) = UPPER(?) OR r.reservation_number ILIKE ?)`;
            params.push(reservationNoParam, `%${clean}%`);
        }

        // If queried for a specific reservation and no folio exists yet, auto-create master folio & room charges!
        if (reservationIdParam || reservationNoParam) {
            const targetClean = (reservationNoParam || reservationIdParam || '').replace(/^(res|fol)[-_~]/i, '');
            const targetRes = await queryRow(`
                SELECT r.*, g.first_name, g.last_name, g.phone, g.email 
                FROM reservations r 
                LEFT JOIN guests g ON g.id = r.booker_guest_id 
                WHERE r.id::text = ? 
                   OR UPPER(r.reservation_number) = UPPER(?) 
                   OR UPPER(r.reservation_number) = UPPER(?)
                   OR r.reservation_number ILIKE ?
                LIMIT 1
            `, [reservationIdParam || '', reservationIdParam || '', reservationNoParam || '', `%${targetClean}%`]) as any;

            if (targetRes) {
                const existingFolio = await queryRow(`SELECT id FROM folios WHERE reservation_id = ? LIMIT 1`, [targetRes.id]) as any;
                if (!existingFolio) {
                    const guestName = [targetRes.first_name, targetRes.last_name].filter(Boolean).join(' ') || 'Valued Guest';
                    const genFolioNo = `FN~${targetRes.reservation_number || targetRes.id} - ${guestName}`;
                    const createdFolio = await queryExec(`
                        INSERT INTO folios (
                            reservation_id, guest_id, folio_number, folio_type, status, balance,
                            bill_to, business_source, generate_invoice_on_checkout
                        ) VALUES (?, ?, ?, 'GUEST', 'OPEN', 0.00, ?, ?, TRUE)
                        RETURNING id, folio_number
                    `, [targetRes.id, targetRes.booker_guest_id, genFolioNo, guestName, targetRes.source || 'Direct']);

                    const newFolioId = createdFolio.lastInsertRowid;

                    // Automatically generate night-by-night room accommodation charges from reservation_rooms
                    const resRooms = await queryRows(`
                        SELECT rr.*, rm.room_number, rt.name as room_type_name
                        FROM reservation_rooms rr
                        JOIN rooms rm ON rm.id = rr.room_id
                        LEFT JOIN room_types rt ON rt.id = rr.room_type_id
                        WHERE rr.reservation_id = ?
                    `, [targetRes.id]) as any[];

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

                            await queryExec(`
                                INSERT INTO folio_charges (
                                    folio_id, reservation_room_id, charge_code, revenue_head, ref_no,
                                    description, amount, discount_amount, service_charge, vat, city_tax,
                                    total_tax, total_amount, charge_date, is_tax_applicable, user_name
                                ) VALUES (?, ?, 'ROOM_CHG', 'Room Charges', ?, ?, ?, 0.00, ?, ?, ?, ?, ?, ?, TRUE, 'System Auditor')
                            `, [newFolioId, rr.id, String(d + 1), `Room Charge - Room ${rr.room_number} (${rr.room_type_name || 'Standard'})`, baseAmt, svcCharge, vatAmt, cityTaxAmt, totalTax, grandAmt, chargeDateStr]);
                        }
                    }

                    // Update folio balance
                    await queryExec(`UPDATE folios SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [runningTotal, newFolioId]);

                    // Add initial audit log
                    await queryExec(`
                        INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
                        VALUES (?, ?, 'FOLIO_CREATED', ?, 'Front Desk')
                    `, [newFolioId, targetRes.id, `Master Folio ${genFolioNo} created for reservation ${targetRes.reservation_number}`]);
                }

                // If this reservation is part of a group, expand query to fetch all folios of the entire group!
                if (targetRes.group_code) {
                    whereClause = `(r.status NOT IN ('CANCELLED', 'VOID') OR r.status IS NULL) AND f.status = 'OPEN' AND (
                        f.reservation_id IN (SELECT id FROM reservations WHERE group_code = ?)
                        OR f.reservation_id = ?
                    )`;
                    params.length = 0;
                    params.push(targetRes.group_code, targetRes.id);
                    if (propertyId) {
                        whereClause += ` AND r.property_id = ?`;
                        params.push(propertyId);
                    }
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

        const folios = (params.length > 0 ? await queryRows(sql, params) : await queryRows(sql)) as any[];

        // Fetch charges, payments, rooms and audit logs for each folio
        const enrichedFolios = await Promise.all(folios.map(async f => {
            const charges = await queryRows(`
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
            `, [f.id]);

            const payments = await queryRows(`
                SELECT 
                    id, folio_id, property_id, payment_number, payment_method,
                    amount, reference_code, transaction_date,
                    'Settled' as status
                FROM payments 
                WHERE folio_id = ? 
                ORDER BY transaction_date ASC, id ASC
            `, [f.id]);

            const rooms = await queryRows(`
                SELECT rr.id, rr.sub_booking_number, rr.folio_number, rm.room_number, rt.name as room_type,
                       rr.check_in_date, rr.check_out_date, rr.room_rate, rr.rate_amount, rr.adults, rr.children,
                       rr.nights
                FROM reservation_rooms rr
                JOIN rooms rm ON rm.id = rr.room_id
                LEFT JOIN room_types rt ON rt.id = rm.room_type_id
                WHERE rr.reservation_id = ?
                ORDER BY rm.room_number ASC
            `, [f.reservation_id]);

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
        const folio = await queryRow(`
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
        `, [id, id]) as any;

        if (!folio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }

        const charges = await queryRows(`SELECT * FROM folio_charges WHERE folio_id = ? ORDER BY id DESC`, [folio.id]);
        const payments = await queryRows(`SELECT * FROM payments WHERE folio_id = ? ORDER BY id DESC`, [folio.id]);
        const rooms = await queryRows(`
            SELECT rr.id, rr.sub_booking_number, rr.folio_number, rm.room_number, rt.name as room_type, rr.check_in_date, rr.check_out_date, rr.room_rate
            FROM reservation_rooms rr
            JOIN rooms rm ON rm.id = rr.room_id
            JOIN room_types rt ON rt.id = rm.room_type_id
            WHERE rr.reservation_id = ?
            ORDER BY rm.room_number ASC
        `, [folio.reservation_id]);

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

// POST /api/accounting/folios - Create a New Sub-Folio for Guest / Reservation (matching Screenshot 1908f04f.png)
router.post('/folios', async (req: Request, res: Response) => {
    try {
        const {
            reservationId,
            reservationNumber,
            sharer,
            gstin,
            showTaxOnPrintedFolio = true,
            generateInvoiceOnCheckout = false,
            roomNumber,
            userName = 'Front Desk'
        } = req.body;

        let resId: any = reservationId;
        let resRecord: any = null;

        if (reservationId || reservationNumber) {
            resRecord = await queryRow(`
                SELECT * FROM reservations
                WHERE id::text = ? OR UPPER(reservation_number) = UPPER(?) OR reservation_number ILIKE ?
                LIMIT 1
            `, [reservationId || '', reservationNumber || '', `%${(reservationNumber || reservationId || '').replace(/^(res|fol)[-_~]/i, '')}%`]) as any;

            if (resRecord) {
                resId = resRecord.id;
            }
        }

        const guestName = (sharer || resRecord?.guest_name || 'Valued Guest').trim();
        const cleanName = guestName.replace(/^(Mr|Mrs|Ms|Dr|Prof)\.?\s+/i, '').trim() || guestName;

        // Generate next sequential folio number (e.g. "79 - Ms. Jobel Yubos")
        const maxIdResult = await queryRow(`SELECT MAX(id) as max_id FROM folios`) as any;
        const nextNum = (maxIdResult?.max_id || 70) + 1;
        const folioNumber = `${nextNum} - ${guestName}`;

        const insertRes = await queryExec(`
            INSERT INTO folios (
                reservation_id, folio_number, folio_type, status, balance,
                bill_to, gstin_number, generate_invoice_on_checkout
            )
            VALUES (?, ?, 'GUEST', 'OPEN', 0.00, ?, ?, ?)
            RETURNING *
        `, [resId, folioNumber, guestName, gstin || '', generateInvoiceOnCheckout ? 1 : 0]) as any;

        const newFolioId = insertRes?.lastInsertRowid || insertRes?.id || nextNum;

        // Audit Trail Log
        try {
            await queryExec(`
                INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
                VALUES (?, ?, 'FOLIO_CREATED', ?, ?)
            `, [newFolioId, resId, `New sub-folio [${folioNumber}] created for selected guest`, userName]);
        } catch {
            // Audit log optional
        }

        res.json({
            success: true,
            message: 'New folio has been created for selected guest.',
            data: {
                id: newFolioId,
                folio_number: folioNumber,
                reservation_id: resId,
                status: 'OPEN',
                balance: 0,
                guest_name: cleanName,
                room_number: roomNumber || resRecord?.room_number || '',
                bill_to: guestName,
                gstin: gstin || '',
                show_tax_on_printed_folio: showTaxOnPrintedFolio,
                generate_invoice_on_checkout: generateInvoiceOnCheckout,
                charges: [],
                payments: [],
                summary: {
                    totalCharges: 0,
                    totalPaid: 0,
                    totalDiscount: 0,
                    dueAmount: 0
                }
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to create new folio' });
    }
});

// POST /api/accounting/folios/route - Configure Folio Routing (Extra Charges & Taxes to separate folio, matching Screenshot be874197.png)
router.post('/folios/route', async (req: Request, res: Response) => {
    try {
        const {
            sourceFolioId,
            destFolioId,
            scope = 'ALL_FOLIOS',
            routeRoomCharges = false,
            routeInclusions = false,
            routeAllExtraCharges = false,
            routedExtraCharges = [],
            userName = 'Front Desk'
        } = req.body;

        const sourceFolio = await findFolioByIdOrRef(sourceFolioId);
        const destFolio = await findFolioByIdOrRef(destFolioId);

        if (!sourceFolio || !destFolio) {
            return res.status(404).json({ success: false, error: 'Source or destination folio not found' });
        }

        const sId = Number(sourceFolio.id);
        const dId = Number(destFolio.id);

        if (sId === dId) {
            return res.status(400).json({ success: false, error: 'Source and destination folios cannot be the same' });
        }

        // Move existing matching charges from source to destination folio
        const existingCharges = await queryRows(`
            SELECT * FROM folio_charges WHERE folio_id = ? AND (is_voided IS FALSE OR is_voided IS NULL)
        `, [sId]) as any[];

        let movedCount = 0;
        let movedSum = 0;

        for (const c of existingCharges) {
            const head = (c.revenue_head || '').trim().toLowerCase();
            const desc = (c.description || '').trim().toLowerCase();
            const code = (c.charge_code || '').trim().toLowerCase();
            const isRoom = code === 'room_chg' || head.includes('room charge') || head.includes('room tariff');
            const isInclusion = head.includes('inclusion') || code.includes('inclusion');

            let shouldMove = false;

            if (routeRoomCharges && isRoom) {
                shouldMove = true;
            } else if (routeInclusions && isInclusion) {
                shouldMove = true;
            } else if (routeAllExtraCharges && !isRoom) {
                shouldMove = true;
            } else if (Array.isArray(routedExtraCharges) && routedExtraCharges.length > 0) {
                const matchFound = routedExtraCharges.some(extra => {
                    const extraLower = extra.trim().toLowerCase();
                    return head === extraLower || desc.includes(extraLower) || head.includes(extraLower);
                });
                if (matchFound) {
                    shouldMove = true;
                }
            }

            if (shouldMove) {
                const amt = Number(c.total_amount || c.amount || 0);
                await queryExec(`UPDATE folio_charges SET folio_id = ? WHERE id = ?`, [dId, c.id]);
                movedCount++;
                movedSum += amt;
            }
        }

        if (movedSum > 0) {
            await queryExec(`UPDATE folios SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [movedSum, sId]);
            await queryExec(`UPDATE folios SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [movedSum, dId]);
        }

        // Log audit trail
        try {
            await queryExec(`
                INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
                VALUES (?, ?, 'FOLIO_ROUTING_CONFIGURED', ?, ?)
            `, [sId, sourceFolio.reservation_id, `Folio routing configured: ${movedCount} extra charge(s) routed to [${destFolio.folio_number}].`, userName]);
        } catch {}

        res.json({
            success: true,
            message: `Folio routing rule saved successfully. ${movedCount > 0 ? `${movedCount} charge(s) routed to ${destFolio.folio_number}.` : ''}`,
            sourceFolioId: sId,
            destFolioId: dId,
            movedCount,
            movedAmount: movedSum
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to configure folio routing' });
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
            applyToGroup = false
        } = req.body;

        const authenticatedName = (req as any).user?.name || 'Staff User';

        const rawAmount = Math.max(0, Number(amount) || 0);
        const discountAmt = Math.max(0, Number(discount) || 0);

        if (rawAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Charge amount must be greater than zero' });
        }

        if (discountAmt > rawAmount) {
            return res.status(400).json({ success: false, error: 'Discount amount cannot exceed charge amount' });
        }

        const netBase = Math.max(0, rawAmount - discountAmt);

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
        const targetFolio = await queryRow(`SELECT * FROM folios WHERE id = ?`, [folioId]) as any;
        if (!targetFolio) {
            return res.status(404).json({ success: false, error: 'Target folio not found' });
        }

        let effectiveFolioId = folioId;
        let isSupplementaryFolio = false;
        let supplementaryFolioNumber = '';

        if (targetFolio.status === 'CLOSED' || targetFolio.status === 'SETTLED') {
            const existingSupp = await queryRow(`
                SELECT id, folio_number FROM folios 
                WHERE reservation_id = ? AND is_supplementary = true AND status = 'OPEN' 
                LIMIT 1
            `, [targetFolio.reservation_id]) as any;

            if (existingSupp) {
                effectiveFolioId = Number(existingSupp.id);
                supplementaryFolioNumber = existingSupp.folio_number;
                isSupplementaryFolio = true;
            } else {
                supplementaryFolioNumber = `${targetFolio.folio_number || 'FOL'}-LATE-${Date.now().toString().slice(-4)}`;
                const suppInsert = await queryExec(`
                    INSERT INTO folios (
                        reservation_id, guest_id, corporate_account_id, folio_number,
                        folio_type, status, balance, is_supplementary, parent_folio_id
                    ) VALUES (?, ?, ?, ?, 'GUEST', 'OPEN', 0.00, true, ?)
                `, [
                    targetFolio.reservation_id,
                    targetFolio.guest_id,
                    targetFolio.corporate_account_id || null,
                    supplementaryFolioNumber,
                    targetFolio.id
                ]);
                effectiveFolioId = Number(suppInsert.lastInsertRowid);
                isSupplementaryFolio = true;
            }
        }

        const foliosToCharge: number[] = [effectiveFolioId];
        if (applyToGroup && targetFolio.reservation_id && !isSupplementaryFolio) {
            const groupFolios = await queryRows(`SELECT id FROM folios WHERE reservation_id = ? AND id != ?`, [targetFolio.reservation_id, folioId]) as any[];
            groupFolios.forEach(gf => foliosToCharge.push(Number(gf.id)));
        }

        let firstChargeId: any = null;
        for (const targetId of foliosToCharge) {
            const chargeInsert = await queryExec(`
                INSERT INTO folio_charges (
                    folio_id, charge_code, revenue_head, ref_no, description,
                    amount, discount_amount, service_charge, vat, city_tax,
                    total_tax, total_amount, charge_date, is_tax_applicable, user_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [targetId, code, revenueHead, refNo, description || `${revenueHead} Charge`, rawAmount, discountAmt, svcCharge, vatAmt, cityTaxAmt, totalTax, totalAmount, dateStr, isTaxActive, authenticatedName]);

            if (!firstChargeId) firstChargeId = chargeInsert.lastInsertRowid;

            // Update Folio balance
            await queryExec(`
                UPDATE folios 
                SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [totalAmount, targetId]);

            // Audit Trail Log
            await queryExec(`
                INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
                VALUES (?, ?, 'CHARGE_POSTED', ?, ?)
            `, [targetId, targetFolio.reservation_id, `Posted charge: ${revenueHead} (${description || ''}) - Net ৳${totalAmount.toFixed(2)} [Ref: ${refNo}]`, authenticatedName]);
        }

        // Look up propertyId for targeted multi-tenant broadcast
        const propLookup = await queryRow(`SELECT r.property_id FROM folios f JOIN reservations r ON r.id = f.reservation_id WHERE f.id = ?`, [folioId]) as any;
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
            refNo,
            isSupplementaryFolio,
            supplementaryFolioNumber: isSupplementaryFolio ? supplementaryFolioNumber : undefined
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
            comment = ''
        } = req.body;

        const user = (req as any).user;
        const authenticatedName = user?.name || 'Staff User';
        const role = user?.role;
        const isPrivileged = role === 'super_admin' || role === 'hotel_admin' || role === 'general_manager' || role === 'accountant' || role === 'auditor';

        const discAmt = Math.max(0, Number(discountAmount) || 0);
        if (discAmt <= 0) {
            return res.status(400).json({ success: false, error: 'Discount amount must be greater than zero' });
        }

        // Fraud Defense: Discounts exceeding ৳1,000 strictly require managerial authorization
        if (!isPrivileged && discAmt > 1000) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Discounts exceeding ৳1,000 require managerial authorization'
            });
        }

        const targetFolio = await queryRow(`SELECT * FROM folios WHERE id = ?`, [folioId]) as any;
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
        const insertRes = await queryExec(`
            INSERT INTO folio_charges (
                folio_id, charge_code, revenue_head, ref_no, description,
                amount, discount_amount, service_charge, vat, city_tax,
                total_tax, total_amount, charge_date, is_tax_applicable, user_name
            ) VALUES (?, 'DISCOUNT', 'Discount', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [folioId, refNo, comment || `Discount applied (${discountType})`, -discAmt, discAmt, -svcCharge, -vatAmt, -cityTaxAmt, -totalTax, -netDiscount, dateStr, isTaxActive, authenticatedName]);

        // Update folio balance
        await queryExec(`
            UPDATE folios 
            SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [netDiscount, folioId]);

        // Log audit trail
        await queryExec(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'DISCOUNT_APPLIED', ?, ?)
        `, [folioId, targetFolio.reservation_id, `Discount Applied: Discount of ৳${netDiscount.toFixed(2)} (${comment || discountType}) applied to folio ${targetFolio.folio_number}`, authenticatedName]);

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
            comment = ''
        } = req.body;

        const user = (req as any).user;
        const authenticatedName = user?.name || 'Staff User';
        const role = user?.role;
        const isPrivileged = role === 'super_admin' || role === 'hotel_admin' || role === 'general_manager' || role === 'accountant' || role === 'auditor';

        const adjAmount = Number(amount) || 0;
        if (adjAmount === 0) {
            return res.status(400).json({ success: false, error: 'Adjustment amount cannot be zero' });
        }

        // Fraud Defense: Arbitrary balance write-offs/adjustments exceeding ৳500 require managerial authorization
        if (!isPrivileged && Math.abs(adjAmount) > 500) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Balance adjustments exceeding ৳500 require managerial authorization'
            });
        }

        const targetFolio = await queryRow(`SELECT * FROM folios WHERE id = ?`, [folioId]) as any;
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

        const insertRes = await queryExec(`
            INSERT INTO folio_charges (
                folio_id, charge_code, revenue_head, ref_no, description,
                amount, discount_amount, service_charge, vat, city_tax,
                total_tax, total_amount, charge_date, is_tax_applicable, user_name
            ) VALUES (?, 'ADJUSTMENT', ?, ?, ?, ?, 0.00, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [folioId, revenueHead, refNo, comment || `Balance Adjustment (${revenueHead})`, adjAmount, svcCharge, vatAmt, cityTaxAmt, totalTax, totalAmount, dateStr, isTaxActive, authenticatedName]);

        // Update folio balance
        await queryExec(`
            UPDATE folios 
            SET balance = GREATEST(0, balance + ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [totalAmount, folioId]);

        // Log audit trail
        await queryExec(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'ADJUSTMENT_POSTED', ?, ?)
        `, [folioId, targetFolio.reservation_id, `Balance adjustment of ৳${totalAmount.toFixed(2)} applied (${comment || revenueHead}) to folio ${targetFolio.folio_number}`, authenticatedName]);

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

        const sourceFolio = await queryRow(`SELECT * FROM folios WHERE id = ?`, [Number(sourceFolioId)]) as any;
        if (!sourceFolio) {
            return res.status(404).json({ success: false, error: 'Source folio not found' });
        }

        let targetDestId = Number(destFolioId);
        if (transferToGroupOwner) {
            // Find group owner folio for this reservation
            const groupOwnerFolio = await queryRow(`
                SELECT id, folio_number FROM folios 
                WHERE reservation_id = ? AND (folio_type = 'MASTER' OR id != ?) 
                ORDER BY id ASC LIMIT 1
            `, [sourceFolio.reservation_id, sourceFolio.id]) as any;

            if (groupOwnerFolio) {
                targetDestId = Number(groupOwnerFolio.id);
            } else {
                return res.status(400).json({ success: false, error: 'Group Owner Folio not found for this booking' });
            }
        }

        const destFolio = await queryRow(`SELECT * FROM folios WHERE id = ?`, [targetDestId]) as any;
        if (!destFolio) {
            return res.status(404).json({ success: false, error: 'Destination folio not found' });
        }

        // Determine charges to move
        let targetCharges: any[] = [];
        if (Array.isArray(chargeIds) && chargeIds.length > 0) {
            const placeholders = chargeIds.map(() => '?').join(',');
            targetCharges = await queryRows(`SELECT * FROM folio_charges WHERE folio_id = ? AND id IN (${placeholders})`, [sourceFolio.id, ...chargeIds]);
        } else {
            targetCharges = await queryRows(`SELECT * FROM folio_charges WHERE folio_id = ? AND (is_voided IS FALSE OR is_voided IS NULL)`, [sourceFolio.id]);
        }

        if (targetCharges.length === 0) {
            return res.status(400).json({ success: false, error: 'No charges available to transfer' });
        }

        let transferredSum = 0;
        for (const c of targetCharges) {
            const amt = Number(c.total_amount || c.amount || 0);
            transferredSum += amt;
            await queryExec(`UPDATE folio_charges SET folio_id = ? WHERE id = ?`, [destFolio.id, c.id]);
        }

        // Rebalance source and destination folios
        await queryExec(`UPDATE folios SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [transferredSum, sourceFolio.id]);
        await queryExec(`UPDATE folios SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [transferredSum, destFolio.id]);

        // Audit Trail
        await queryExec(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'CHARGES_TRANSFERRED', ?, ?)
        `, [sourceFolio.id, sourceFolio.reservation_id, `Transferred ${targetCharges.length} charge(s) totaling ৳${transferredSum.toFixed(2)} to Folio ${destFolio.folio_number}`, userName]);

        await queryExec(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'CHARGES_RECEIVED', ?, ?)
        `, [destFolio.id, destFolio.reservation_id, `Received ${targetCharges.length} charge(s) totaling ৳${transferredSum.toFixed(2)} transferred from Folio ${sourceFolio.folio_number}`, userName]);

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

// POST /api/accounting/folios/transfer-to-owner - Transfer group charges to the group owner's folio
router.post('/folios/transfer-to-owner', async (req: Request, res: Response) => {
    try {
        const { sourceFolioIds = [], ownerFolioId, reservationId, reservationNumber, userName = 'Front Desk' } = req.body;

        let ownerFolio: any = null;
        if (ownerFolioId) {
            ownerFolio = await findFolioByIdOrRef(ownerFolioId);
        }
        if (!ownerFolio && (reservationId || reservationNumber)) {
            ownerFolio = await findFolioByIdOrRef(reservationNumber || reservationId);
        }

        if (!ownerFolio) {
            return res.status(404).json({ success: false, error: 'Group owner folio not found' });
        }

        const targetOwnerId = Number(ownerFolio.id);

        // Find which folios are being transferred from
        let targetSourceIds: number[] = [];
        if (Array.isArray(sourceFolioIds) && sourceFolioIds.length > 0) {
            targetSourceIds = sourceFolioIds.map(id => Number(id)).filter(id => !isNaN(id) && id !== targetOwnerId);
        } else if (ownerFolio.reservation_id) {
            // Check if group reservation
            const ownerRes = await queryRow(`SELECT id, group_code FROM reservations WHERE id = ?`, [ownerFolio.reservation_id]) as any;
            if (ownerRes?.group_code) {
                const groupFolios = await queryRows(`
                    SELECT f.id FROM folios f
                    JOIN reservations r ON r.id = f.reservation_id
                    WHERE r.group_code = ? AND f.id != ?
                `, [ownerRes.group_code, targetOwnerId]) as any[];
                targetSourceIds = groupFolios.map(g => Number(g.id));
            } else {
                const siblingFolios = await queryRows(`
                    SELECT id FROM folios WHERE reservation_id = ? AND id != ?
                `, [ownerFolio.reservation_id, targetOwnerId]) as any[];
                targetSourceIds = siblingFolios.map(s => Number(s.id));
            }
        }

        if (targetSourceIds.length === 0) {
            return res.status(400).json({ success: false, error: 'No sub-folios selected or found to transfer charges from' });
        }

        let totalTransferredCount = 0;
        let totalTransferredSum = 0;

        for (const sId of targetSourceIds) {
            const src = await queryRow(`SELECT * FROM folios WHERE id = ?`, [sId]) as any;
            if (!src) continue;

            const charges = await queryRows(`
                SELECT * FROM folio_charges WHERE folio_id = ? AND (is_voided IS FALSE OR is_voided IS NULL)
            `, [sId]) as any[];

            if (charges.length === 0) continue;

            let folioChargesSum = 0;
            for (const c of charges) {
                const amt = Number(c.total_amount || c.amount || 0);
                folioChargesSum += amt;
                await queryExec(`UPDATE folio_charges SET folio_id = ? WHERE id = ?`, [targetOwnerId, c.id]);
            }

            totalTransferredCount += charges.length;
            totalTransferredSum += folioChargesSum;

            // Update source folio balance
            await queryExec(`UPDATE folios SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [folioChargesSum, sId]);

            // Audit log on source
            await queryExec(`
                INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
                VALUES (?, ?, 'GROUP_CHARGES_TRANSFERRED_TO_OWNER', ?, ?)
            `, [sId, src.reservation_id, `Transferred ${charges.length} group charge(s) totaling ৳${folioChargesSum.toFixed(2)} to Group Owner Folio [${ownerFolio.folio_number}]`, userName]);
        }

        // Add transferred sum to owner folio balance
        await queryExec(`UPDATE folios SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [totalTransferredSum, targetOwnerId]);

        // Audit log on owner
        await queryExec(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'GROUP_CHARGES_RECEIVED_FROM_SUB_FOLIOS', ?, ?)
        `, [targetOwnerId, ownerFolio.reservation_id, `Received ${totalTransferredCount} group charge(s) totaling ৳${totalTransferredSum.toFixed(2)} transferred from ${targetSourceIds.length} sub-folio(s)`, userName]);

        // Clean owner folio display name for the notification
        let displayOwner = ownerFolio.folio_number || String(targetOwnerId);
        if (displayOwner.startsWith('FN~')) {
            displayOwner = displayOwner.replace(/^FN~/, '');
        }

        res.json({
            success: true,
            message: `Charges posted to Folio. ${displayOwner} successfully..`,
            ownerFolioId: targetOwnerId,
            ownerFolioNumber: ownerFolio.folio_number,
            transferredCount: totalTransferredCount,
            transferredAmount: totalTransferredSum
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to transfer group charges to owner' });
    }
});

// POST /api/accounting/folios/split - Cut / Split Folio (creates new secondary folio if needed)
router.post('/folios/split', async (req: Request, res: Response) => {
    try {
        const { sourceFolioId, destFolioId, chargeIds = [], newFolioName, userName = 'Front Desk' } = req.body;

        const sourceFolio = await queryRow(`SELECT * FROM folios WHERE id = ?`, [Number(sourceFolioId)]) as any;
        if (!sourceFolio) {
            return res.status(404).json({ success: false, error: 'Source folio not found' });
        }

        if (!Array.isArray(chargeIds) || chargeIds.length === 0) {
            return res.status(400).json({ success: false, error: 'Please select charges to move to the new/destination folio' });
        }

        let targetDestId = Number(destFolioId);
        let destFolio: any = null;

        if (targetDestId) {
            destFolio = await queryRow(`SELECT * FROM folios WHERE id = ?`, [targetDestId]) as any;
        }

        // If no destination folio was selected, auto-create a Cut Folio (Window 2) for this reservation
        if (!destFolio) {
            const cutNumber = `${sourceFolio.folio_number}-2`;
            const created = await queryExec(`
                INSERT INTO folios (
                    reservation_id, guest_id, folio_number, folio_type, status, balance,
                    bill_to, business_source, generate_invoice_on_checkout
                ) VALUES (?, ?, ?, 'GUEST', 'OPEN', 0.00, ?, ?, TRUE)
                RETURNING id, folio_number
            `, [sourceFolio.reservation_id, sourceFolio.guest_id, newFolioName || cutNumber, sourceFolio.bill_to || 'Guest Folio 2', sourceFolio.business_source || 'Direct']);
            targetDestId = Number(created.lastInsertRowid);
            destFolio = await queryRow(`SELECT * FROM folios WHERE id = ?`, [targetDestId]);
        }

        const placeholders = chargeIds.map(() => '?').join(',');
        const chargesToMove = await queryRows(`SELECT * FROM folio_charges WHERE folio_id = ? AND id IN (${placeholders})`, [sourceFolio.id, ...chargeIds]) as any[];

        let movedTotal = 0;
        for (const c of chargesToMove) {
            const amt = Number(c.total_amount || c.amount || 0);
            movedTotal += amt;
            await queryExec(`UPDATE folio_charges SET folio_id = ? WHERE id = ?`, [destFolio.id, c.id]);
        }

        // Update balances
        await queryExec(`UPDATE folios SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [movedTotal, sourceFolio.id]);
        await queryExec(`UPDATE folios SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [movedTotal, destFolio.id]);

        // Audit Trail Log
        await queryExec(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'FOLIO_SPLIT', ?, ?)
        `, [sourceFolio.id, sourceFolio.reservation_id, `Cut Folio: Split ${chargesToMove.length} charges (৳${movedTotal.toFixed(2)}) into Folio ${destFolio.folio_number}`, userName]);

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

        const charge = await queryRow(`SELECT * FROM folio_charges WHERE id = ?`, [chargeId]) as any;
        if (!charge) {
            return res.status(404).json({ success: false, error: 'Charge not found' });
        }

        if (charge.is_voided) {
            return res.status(400).json({ success: false, error: 'Charge is already voided' });
        }

        await queryExec(`
            UPDATE folio_charges 
            SET is_voided = TRUE, void_reason = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [voidReason, chargeId]).catch(() => {
            return queryExec(`UPDATE folio_charges SET is_voided = TRUE, void_reason = ? WHERE id = ?`, [voidReason, chargeId]);
        });

        const chargeTotal = Number(charge.total_amount || charge.amount || 0);

        // Deduct from folio balance
        await queryExec(`
            UPDATE folios 
            SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [chargeTotal, charge.folio_id]);

        // Audit Trail Log
        await queryExec(`
            INSERT INTO folio_audit_trail (folio_id, action_type, description, user_name)
            VALUES (?, 'CHARGE_VOIDED', ?, ?)
        `, [charge.folio_id, `Voided Charge: ${charge.revenue_head || charge.charge_code} (৳${chargeTotal.toFixed(2)}) - Reason: ${voidReason}`, userName]);

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

        const payment = await queryRow(`SELECT * FROM payments WHERE id = ?`, [paymentId]) as any;
        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment not found' });
        }

        // Delete payment or mark void
        await queryExec(`DELETE FROM payments WHERE id = ?`, [paymentId]);

        const paymentAmt = Number(payment.amount || 0);

        // Restore folio balance
        await queryExec(`
            UPDATE folios 
            SET balance = balance + ?, status = 'OPEN', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [paymentAmt, payment.folio_id]);

        // Audit Trail Log
        await queryExec(`
            INSERT INTO folio_audit_trail (folio_id, action_type, description, user_name)
            VALUES (?, 'PAYMENT_VOIDED', ?, ?)
        `, [payment.folio_id, `Voided Payment: ${payment.payment_method} ৳${paymentAmt.toFixed(2)} [${payment.payment_number}] - Reason: ${voidReason}`, userName]);

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

        const targetFolio = await queryRow(`SELECT * FROM folios WHERE id = ?`, [folioId]) as any;
        if (!targetFolio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }

        let chargesToExempt: any[] = [];
        if (Array.isArray(chargeIds) && chargeIds.length > 0) {
            const placeholders = chargeIds.map(() => '?').join(',');
            chargesToExempt = await queryRows(`SELECT * FROM folio_charges WHERE folio_id = ? AND id IN (${placeholders})`, [folioId, ...chargeIds]);
        } else {
            chargesToExempt = await queryRows(`SELECT * FROM folio_charges WHERE folio_id = ? AND is_tax_applicable = TRUE`, [folioId]);
        }

        let totalTaxRelieved = 0;
        for (const c of chargesToExempt) {
            const taxAmt = Number(c.total_tax || 0);
            totalTaxRelieved += taxAmt;
            const newTotal = Number(c.amount || 0) - Number(c.discount_amount || 0);
            await queryExec(`
                UPDATE folio_charges 
                SET is_tax_applicable = FALSE, tax_exemption_id = ?,
                    service_charge = 0.00, vat = 0.00, city_tax = 0.00, total_tax = 0.00,
                    total_amount = ?
                WHERE id = ?
            `, [taxExemptionId, newTotal, c.id]);
        }

        // Adjust folio balance
        await queryExec(`
            UPDATE folios 
            SET balance = GREATEST(0, balance - ?), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [totalTaxRelieved, folioId]);

        // Audit Trail Log
        await queryExec(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'TAX_EXEMPTION_APPLIED', ?, ?)
        `, [folioId, targetFolio.reservation_id, `Tax Exemption Applied: Tax Exemption ID [${taxExemptionId}] applied across ${chargesToExempt.length} charges. Relieved ৳${totalTaxRelieved.toFixed(2)} in taxes.`, userName]);

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

// Helper to safely find or auto-create a folio by numeric ID, folio_number, or reservation reference
async function findFolioByIdOrRef(rawId: any): Promise<any> {
    if (!rawId || rawId === 'undefined' || rawId === 'null') return null;
    const strId = String(rawId).trim();
    if (!strId) return null;

    const cleanId = strId.replace(/^(res|fol)[-_~]/i, '').trim();

    // 1. Direct match by numeric folio id
    const numId = Number(strId);
    if (!isNaN(numId) && isFinite(numId)) {
        const byId = await queryRow(`SELECT * FROM folios WHERE id = ?`, [numId]) as any;
        if (byId) return byId;
    }

    // 2. Direct match by clean numeric folio id (e.g. if passed 'fol-5' -> 5)
    const numClean = Number(cleanId);
    if (!isNaN(numClean) && isFinite(numClean) && numClean > 0) {
        const byCleanId = await queryRow(`SELECT * FROM folios WHERE id = ?`, [numClean]) as any;
        if (byCleanId) return byCleanId;
    }

    // 3. Match against folio_number, reservation_id, or reservation_number (case-insensitive & clean)
    const byRef = await queryRow(`
        SELECT f.* FROM folios f
        LEFT JOIN reservations r ON r.id = f.reservation_id
        WHERE f.folio_number ILIKE ? 
           OR f.folio_number ILIKE ?
           OR UPPER(r.reservation_number) = UPPER(?)
           OR UPPER(r.reservation_number) = UPPER(?)
           OR r.reservation_number ILIKE ?
           OR f.reservation_id::text = ?
           OR f.reservation_id::text = ?
           OR (? != '' AND r.id::text = ?)
        LIMIT 1
    `, [`%${strId}%`, `%${cleanId}%`, strId, cleanId, `%${cleanId}%`, strId, cleanId, !isNaN(numClean) && numClean > 0 ? String(numClean) : '', !isNaN(numClean) && numClean > 0 ? String(numClean) : '']) as any;
    if (byRef) return byRef;

    // 4. Auto-create if reservation exists without a folio yet
    const targetRes = await queryRow(`
        SELECT r.*, g.first_name, g.last_name, g.phone, g.email 
        FROM reservations r 
        LEFT JOIN guests g ON g.id = r.booker_guest_id 
        WHERE UPPER(r.reservation_number) = UPPER(?) 
           OR UPPER(r.reservation_number) = UPPER(?)
           OR r.reservation_number ILIKE ?
           OR r.id::text = ?
           OR (? != '' AND r.id::text = ?)
        LIMIT 1
    `, [strId, cleanId, `%${cleanId}%`, strId, !isNaN(numClean) && numClean > 0 ? String(numClean) : '', !isNaN(numClean) && numClean > 0 ? String(numClean) : '']) as any;

    if (targetRes) {
        // Double check if a folio exists for this reservation
        const existing = await queryRow(`SELECT * FROM folios WHERE reservation_id = ? LIMIT 1`, [targetRes.id]) as any;
        if (existing) return existing;

        const guestName = [targetRes.first_name, targetRes.last_name].filter(Boolean).join(' ') || 'Valued Guest';
        const genFolioNo = `FN~${targetRes.reservation_number || targetRes.id} - ${guestName}`;
        const created = await queryExec(`
            INSERT INTO folios (
                reservation_id, guest_id, folio_number, folio_type, status, balance,
                bill_to, business_source, generate_invoice_on_checkout
            ) VALUES (?, ?, ?, 'GUEST', 'OPEN', 0.00, ?, ?, TRUE)
            RETURNING id
        `, [targetRes.id, targetRes.booker_guest_id, genFolioNo, guestName, targetRes.source || 'Direct']);

        const newId = created.lastInsertRowid;
        return await queryRow(`SELECT * FROM folios WHERE id = ?`, [newId]) as any;
    }

    return null;
}

// PUT /api/accounting/folios/:id/booking-details - Update Booking & Source Info and Compliance Flags
router.put('/folios/:id/booking-details', async (req: Request, res: Response) => {
    try {
        const targetFolio = await findFolioByIdOrRef(req.params.id);
        if (!targetFolio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }
        const folioId = Number(targetFolio.id);
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

        const foliosToUpdate = [folioId];
        if (applyToGroup && targetFolio.reservation_id) {
            const others = await queryRows(`SELECT id FROM folios WHERE reservation_id = ? AND id != ?`, [targetFolio.reservation_id, folioId]) as any[];
            others.forEach(o => foliosToUpdate.push(Number(o.id)));
        }

        for (const fid of foliosToUpdate) {
            await queryExec(`
                UPDATE folios 
                SET bill_to = ?, market_code = ?, business_source = ?, business_agent = ?,
                    voucher_no = ?, commission_plan = ?, plan_value = ?, sales_person = ?,
                    send_mail = ?, checkout_mail = ?, suppress_rate_qr = ?, display_inclusion_separate = ?,
                    generate_invoice_on_checkout = ?, gstin_number = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [billTo || null, marketCode || null, businessSource || 'Direct', businessAgent || null, voucherNo || null, commissionPlan || null, Number(planValue) || 0, salesPerson || null, Boolean(sendMail), Boolean(checkoutMail), Boolean(suppressRateQr), Boolean(displayInclusionSeparate), Boolean(generateInvoiceOnCheckout), gstinNumber || null, fid]);
        }

        // Audit Trail Log
        await queryExec(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'BOOKING_DETAILS_UPDATED', ?, ?)
        `, [folioId, targetFolio.reservation_id, `Booking Details Updated: Bill To [${billTo || 'Default'}], Source [${businessSource || 'Direct'}], GSTIN [${gstinNumber || 'None'}]`, userName]);

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
        const targetFolio = await findFolioByIdOrRef(req.params.id);
        if (!targetFolio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }

        const folioId = Number(targetFolio.id);
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

        const safeAdults = isNaN(Number(adults)) ? 1 : Math.max(1, Number(adults));
        const safeChildren = isNaN(Number(children)) ? 0 : Math.max(0, Number(children));
        const safeRate = isNaN(Number(rate)) ? 0 : Math.max(0, Number(rate));
        const effectiveRate = isComplimentary ? 0 : safeRate;

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
            const existingCharge = await queryRow(`
                SELECT id FROM folio_charges 
                WHERE folio_id = ? AND charge_date = ? 
                AND (charge_code IN ('ROOM_CHG', 'ROOM_TARIFF') OR revenue_head IN ('Room Charges', 'Room Tariff'))
                AND (is_voided IS FALSE OR is_voided IS NULL)
                ORDER BY id ASC LIMIT 1
            `, [folioId, stayDate]) as any;

            if (existingCharge) {
                await queryExec(`
                    UPDATE folio_charges 
                    SET amount = ?, service_charge = ?, vat = ?, city_tax = ?, total_tax = ?, total_amount = ?
                    WHERE id = ?
                `, [baseAmount, serviceCharge, vat, cityTax, totalTax, grandTotal, existingCharge.id]);
                updatedChargesCount = 1;
            } else {
                await queryExec(`
                    INSERT INTO folio_charges (
                        folio_id, charge_code, revenue_head, ref_no, description, amount, discount_amount,
                        service_charge, vat, city_tax, total_tax, total_amount, charge_date, is_tax_applicable, user_name
                    ) VALUES (?, 'ROOM_CHG', 'Room Charges', 'RC-UPD', 'Room Charge', ?, 0, ?, ?, ?, ?, ?, ?, TRUE, ?)
                `, [folioId, baseAmount, serviceCharge, vat, cityTax, totalTax, grandTotal, stayDate, userName]);
                updatedChargesCount = 1;
            }
        } else {
            const result = await queryExec(`
                UPDATE folio_charges 
                SET amount = ?, service_charge = ?, vat = ?, city_tax = ?, total_tax = ?, total_amount = ?
                WHERE folio_id = ? 
                AND (charge_code IN ('ROOM_CHG', 'ROOM_TARIFF') OR revenue_head IN ('Room Charges', 'Room Tariff'))
                AND (is_voided IS FALSE OR is_voided IS NULL)
            `, [baseAmount, serviceCharge, vat, cityTax, totalTax, grandTotal, folioId]);
            updatedChargesCount = result.rowCount || 0;
        }

        if (targetFolio.reservation_id) {
            await queryExec(`
                UPDATE reservation_rooms 
                SET room_rate = ?, adults = ?, children = ?
                WHERE reservation_id = ?
            `, [grandTotal, safeAdults, safeChildren, targetFolio.reservation_id]);
        }

        await queryExec(`
            INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
            VALUES (?, ?, 'ROOM_CHARGES_UPDATED', ?, ?)
        `, [folioId, targetFolio.reservation_id, `Room Charges Updated: Rate ${effectiveRate} (${scope === 'WHOLE_STAY' ? 'Whole Stay' : stayDate}), Adults: ${safeAdults}, Children: ${safeChildren}${isComplimentary ? ' [Complimentary]' : ''}`, userName]);

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

// PUT /api/accounting/folios/:id/guest-details - Update guest list and primary guest contact details
router.put('/folios/:id/guest-details', async (req: Request, res: Response) => {
    try {
        const targetFolio = await findFolioByIdOrRef(req.params.id);
        if (!targetFolio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }
        const { guests = [], userName = 'Front Desk' } = req.body;
        if (Array.isArray(guests) && guests.length > 0) {
            const primary = guests[0];
            const rawName = (primary.guestName || '').trim();
            const nameParts = rawName.split(/\s+/);
            const firstName = nameParts[0] || 'Valued';
            const lastName = nameParts.slice(1).join(' ') || '';
            const salutation = primary.salutation || 'Mr';

            // Update primary guest profile if linked
            if (targetFolio.guest_id) {
                await queryExec(`
                    UPDATE guests 
                    SET salutation = ?, first_name = ?, last_name = ?, phone = ?, email = ?, updated_at = NOW()
                    WHERE id = ?
                `, [salutation, firstName, lastName, primary.mobile || '', primary.email || '', targetFolio.guest_id]);
            }

            // Update folio bill_to
            const fullGuestName = [salutation, firstName, lastName].filter(Boolean).join(' ');
            await queryExec(`
                UPDATE folios 
                SET bill_to = ?, updated_at = NOW()
                WHERE id = ?
            `, [fullGuestName, targetFolio.id]);

            // Audit Trail
            await queryExec(`
                INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
                VALUES (?, ?, 'GUEST_UPDATE', ?, ?)
            `, [targetFolio.id, targetFolio.reservation_id, `Guest Details Updated: ${fullGuestName} (${primary.mobile || 'No Phone'}), Total Sharers: ${guests.length - 1}`, userName]);
        }

        return res.json({ success: true, message: 'Guest roster and contact details saved successfully' });
    } catch (err: any) {
        console.error('Error updating guest details:', err);
        return res.status(500).json({ success: false, error: err.message || 'Failed to update guest details' });
    }
});

// GET /api/accounting/folios/:id/audit-trail - Chronological Audit Logs
router.get('/folios/:id/audit-trail', async (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const logs = await queryRows(`
            SELECT * FROM folio_audit_trail 
            WHERE folio_id = ? OR reservation_id = (SELECT reservation_id FROM folios WHERE id = ?)
            ORDER BY created_at DESC, id DESC
        `, [folioId, folioId]);

        res.json({
            success: true,
            data: logs
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch audit trail' });
    }
});

// POST /api/accounting/folios/:id/payments - Post payment/settlement to Folio
// POST /api/accounting/folios/group-payment - Take a Payment For a Group (Yanolja PMS Specification)
router.post('/folios/group-payment', async (req: Request, res: Response) => {
    try {
        const {
            allocations = [],
            paymentMethod = 'CASH',
            referenceCode = 'GROUP_PAYMENT',
            userName = 'Front Desk'
        } = req.body;
        const propertyId = Number(req.body.propertyId || req.headers['x-property-id']) || null;

        if (!Array.isArray(allocations) || allocations.length === 0) {
            return res.status(400).json({ success: false, error: 'No folio allocations provided' });
        }

        const validAllocations = allocations
            .map(a => ({ folioId: a.folioId, amount: Number(a.amount || 0), roomNumber: a.roomNumber }))
            .filter(a => !isNaN(a.amount) && a.amount > 0);

        if (validAllocations.length === 0) {
            return res.status(400).json({ success: false, error: 'Total allocated payment must be greater than 0' });
        }

        const groupPaymentRef = `GPAY-${Date.now().toString().slice(-8)}`;
        let processedCount = 0;
        let processedSum = 0;

        for (const item of validAllocations) {
            const targetFolio = await findFolioByIdOrRef(item.folioId);
            if (!targetFolio) continue;

            const fId = Number(targetFolio.id);
            const amt = item.amount;
            const subPaymentNo = `PAY-${Date.now().toString().slice(-6)}-${fId}`;

            await queryExec(`
                INSERT INTO payments (folio_id, property_id, payment_number, payment_method, amount, reference_code)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [fId, propertyId, subPaymentNo, paymentMethod.toUpperCase(), amt, `${referenceCode} (${groupPaymentRef})`]);

            await queryExec(`
                UPDATE folios 
                SET balance = GREATEST(0, balance - ?),
                    status = CASE WHEN (balance - ?) <= 0 THEN 'SETTLED' ELSE 'OPEN' END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [amt, amt, fId]);

            await queryExec(`
                INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
                VALUES (?, ?, 'GROUP_PAYMENT_RECEIVED', ?, ?)
            `, [fId, targetFolio.reservation_id, `Group payment of ৳${amt.toFixed(2)} received via ${paymentMethod} [Group Ref: ${groupPaymentRef}]`, userName]);

            processedCount++;
            processedSum += amt;
        }

        try {
            broadcastServerEvent({
                type: 'FOLIO_UPDATED',
                propertyId,
                reference: groupPaymentRef,
                amount: processedSum
            });
        } catch (err) {
            console.warn('Failed to broadcast group payment update', err);
        }

        res.json({
            success: true,
            message: `Group payment of ৳${processedSum.toFixed(2)} recorded successfully across ${processedCount} folio(s)`,
            groupPaymentRef,
            totalAllocated: processedSum,
            foliosCount: processedCount
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to process group payment' });
    }
});

router.post('/folios/:id/payments', async (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const { 
            paymentMethod = 'CASH', 
            amount, 
            referenceCode = 'FRONT_DESK_SETTLE',
            currency = 'BDT',
            customExchangeRate,
            userName = 'Front Desk'
        } = req.body;
        const propertyId = Number(req.body.propertyId || req.headers['x-property-id']) || 1;

        let normalizedMethod = String(paymentMethod || 'CASH').toUpperCase().trim();
        if (normalizedMethod === 'CARD' || normalizedMethod === 'CREDIT CARD' || normalizedMethod === 'DEBIT_CARD' || normalizedMethod === 'POS') {
            normalizedMethod = 'CREDIT_CARD';
        } else if (normalizedMethod === 'BANK' || normalizedMethod === 'TRANSFER') {
            normalizedMethod = 'BANK_TRANSFER';
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid payment amount' });
        }

        const transCurrency = String(currency || 'BDT').toUpperCase().trim();
        let exchangeRate = 1.0;

        if (transCurrency !== 'BDT') {
            if (customExchangeRate && Number(customExchangeRate) > 0) {
                exchangeRate = Number(customExchangeRate);
            } else {
                const rateRows = await queryRows(`
                    SELECT exchange_rate FROM currency_exchange_rates
                    WHERE property_id = ? AND from_currency = ? AND to_currency = 'BDT'
                    ORDER BY effective_date DESC LIMIT 1;
                `, [propertyId, transCurrency]);
                if (rateRows.length > 0) {
                    exchangeRate = parseFloat(rateRows[0].exchange_rate);
                }
            }
        }

        const baseCurrencyAmount = Math.round((numAmount * exchangeRate) * 100) / 100;
        const paymentNumber = `PAY-${Date.now().toString().slice(-8)}`;

        // 1. Insert payment with multi-currency tracking
        const payInsert = await queryExec(`
            INSERT INTO payments (
                folio_id, property_id, payment_number, payment_method, amount, 
                reference_code, transaction_currency, exchange_rate, base_currency_amount
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            folioId, propertyId, paymentNumber, normalizedMethod, numAmount, 
            referenceCode, transCurrency, exchangeRate, baseCurrencyAmount
        ]);

        // 2. Update Folio balance in base currency
        await queryExec(`
            UPDATE folios 
            SET balance = GREATEST(0, balance - ?),
                status = CASE WHEN (balance - ?) <= 0 THEN 'SETTLED' ELSE 'OPEN' END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [baseCurrencyAmount, baseCurrencyAmount, folioId]);

        // 3. Log into Folio Audit Trail
        try {
            await queryExec(`
                INSERT INTO folio_audit_trail (folio_id, action_type, description, user_name)
                VALUES (?, 'PAYMENT_RECEIVED', ?, ?)
            `, [
                folioId,
                `Payment of ${numAmount.toFixed(2)} ${transCurrency} (৳${baseCurrencyAmount.toFixed(2)} BDT @ ${exchangeRate}) received via ${normalizedMethod}`,
                userName
            ]);
        } catch {}

        // 4. Emit real-time event
        try {
            broadcastServerEvent({
                type: 'FOLIO_UPDATED',
                propertyId,
                folioId,
                paymentId: payInsert.lastInsertRowid,
                amount: baseCurrencyAmount,
                currency: transCurrency
            });
        } catch (err) {
            console.warn('Failed to broadcast payment update', err);
        }

        res.json({
            success: true,
            paymentId: payInsert.lastInsertRowid,
            paymentNumber,
            amount: numAmount,
            currency: transCurrency,
            exchangeRate,
            baseCurrencyAmount,
            message: `Recorded payment of ${numAmount.toFixed(2)} ${transCurrency} (৳${baseCurrencyAmount.toFixed(2)} BDT)`
        });
    } catch (e: any) {
        console.error('Error posting payment:', e);
        res.status(500).json({ success: false, error: e?.message || 'Failed to process payment' });
    }
});

// GET /api/accounting/journal-entries - Double-entry General Ledger audit journal
router.get('/journal-entries', async (req: Request, res: Response) => {
    try {
        const entries = await queryRows(`
            SELECT * FROM journal_entries ORDER BY entry_date DESC, id DESC
        `) as any[];

        const entriesWithLines = await Promise.all(entries.map(async entry => {
            const lines = await queryRows(`
                SELECT jl.*, coa.account_code, coa.account_name, coa.account_type
                FROM journal_lines jl
                JOIN chart_of_accounts coa ON coa.id = jl.account_id
                WHERE jl.journal_entry_id = ?
            `, [entry.id]);

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
        const result = await queryExec(`
            INSERT INTO journal_entries (organization_id, property_id, entry_number, entry_date, description, reference_type, is_posted, created_by)
            VALUES (1, ?, ?, ?, ?, 'MANUAL', true, ?)
        `, [propertyId, entryNumber, dateStr, description, createdBy]);
        const entryId = Number(result.lastInsertRowid);

        // Insert Lines
        for (const line of lines) {
            await queryExec(`
                INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, memo)
                VALUES (?, ?, ?, ?, ?)
            `, [
                entryId,
                line.accountId,
                Number(line.debit || 0),
                Number(line.credit || 0),
                line.memo || description
            ]);
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
        const rows = await queryRows(`
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
        `) as any[];

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
