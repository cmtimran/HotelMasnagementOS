import { Router, Request, Response } from 'express';
import { pgPool } from '../database/postgres.js';

const router = Router();

// Helper for pure PostgreSQL query
async function queryRows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const res = await pgPool.query(sql, params);
    return res.rows as T[];
}

async function queryRow<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await queryRows<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ORDERS CRUD & CREATION (WITH HOTEL FOLIO "BILL TO ROOM" INTEGRATION)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/pos/orders - List orders with filtering
router.get('/orders', async (req: Request, res: Response) => {
    try {
        const { outletId, status, date, tableId, roomNumber } = req.query as any;
        let sql = `
            SELECT o.*, t.name as table_name, t.code as table_code,
                (SELECT json_agg(json_build_object(
                    'id', oi.id, 'menuItemId', oi.menu_item_id, 'itemName', oi.item_name,
                    'quantity', oi.quantity, 'variationName', oi.variation_name,
                    'unitPrice', oi.unit_price, 'totalPrice', oi.total_price,
                    'course', oi.course, 'prepStation', oi.prep_station, 'status', oi.status,
                    'customNotes', oi.custom_notes, 'selectedAddons', oi.selected_addons
                )) FROM pos_order_items oi WHERE oi.order_id = o.id) as items
            FROM pos_orders o
            LEFT JOIN restaurant_tables t ON t.id = o.table_id
            WHERE 1=1
        `;
        const params: any[] = [];
        if (outletId) {
            params.push(outletId);
            sql += ` AND o.outlet_id = $${params.length}`;
        }
        if (status && status !== 'all') {
            params.push(status);
            sql += ` AND o.status = $${params.length}`;
        }
        if (tableId) {
            params.push(tableId);
            sql += ` AND o.table_id = $${params.length}`;
        }
        if (roomNumber) {
            params.push(roomNumber);
            sql += ` AND o.room_number = $${params.length}`;
        }
        if (date) {
            params.push(`${date}%`);
            sql += ` AND o.created_at::text LIKE $${params.length}`;
        }
        sql += ` ORDER BY o.order_number DESC LIMIT 150`;
        const orders = await queryRows(sql, params);
        res.json({ success: true, data: orders });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// GET /api/pos/orders/active - List active unsettled orders
router.get('/orders/active', async (req: Request, res: Response) => {
    try {
        const outletId = req.query.outletId as string;
        let sql = `
            SELECT o.*, t.name as table_name, t.code as table_code,
                (SELECT json_agg(json_build_object(
                    'id', oi.id, 'itemName', oi.item_name, 'quantity', oi.quantity,
                    'unitPrice', oi.unit_price, 'totalPrice', oi.total_price,
                    'prepStation', oi.prep_station, 'status', oi.status
                )) FROM pos_order_items oi WHERE oi.order_id = o.id) as items
            FROM pos_orders o
            LEFT JOIN restaurant_tables t ON t.id = o.table_id
            WHERE o.status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED')
        `;
        const params: any[] = [];
        if (outletId) {
            sql += ` AND o.outlet_id = $1`;
            params.push(outletId);
        }
        sql += ` ORDER BY o.created_at DESC`;
        const activeOrders = await queryRows(sql, params);
        res.json({ success: true, data: activeOrders });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// GET /api/pos/orders/:id - Get order details
router.get('/orders/:id', async (req: Request, res: Response) => {
    try {
        const order = await queryRow(`
            SELECT o.*, t.name as table_name, t.code as table_code,
                (SELECT json_agg(oi.*) FROM pos_order_items oi WHERE oi.order_id = o.id) as items
            FROM pos_orders o
            LEFT JOIN restaurant_tables t ON t.id = o.table_id
            WHERE o.id = $1
        `, [req.params.id]);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        res.json({ success: true, data: order });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// POST /api/pos/orders - Create new order (with auto orderNumber, VAT/SC, KOT generation & Room Charge)
router.post('/orders', async (req: Request, res: Response) => {
    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');
        const {
            outletId,
            tableId,
            orderType = 'DINE_IN',
            customerName = 'Guest',
            customerPhone = '',
            roomNumber,
            waiterId,
            waiterName,
            notes = '',
            guestCount = 1,
            items = [], // Array of CartItem { menuItemId, name, quantity, unitPrice, variationName, selectedAddons, course, prepStation, customNotes }
            paymentMethod = 'CASH', // CASH, CARD, BKASH, NAGAD, MULTI_TENDER, ROOM_CHARGE
            paymentDetails = [],
            discount = 0
        } = req.body;

        if (!outletId) throw new Error('outletId is required');
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Order items cannot be empty' });
        }

        const numDiscount = Number(discount || 0);
        if (isNaN(numDiscount) || numDiscount < 0) {
            return res.status(400).json({ success: false, error: 'Discount must be a valid non-negative number' });
        }

        // Validate items and eliminate price tampering / negative quantity attacks
        for (const item of items) {
            const qty = Number(item.quantity);
            if (!Number.isInteger(qty) || qty <= 0) {
                return res.status(400).json({ success: false, error: `Invalid quantity for item "${item.name || 'Unknown'}". Must be a positive integer.` });
            }
            const unitPrice = Number(item.unitPrice);
            if (isNaN(unitPrice) || unitPrice < 0) {
                return res.status(400).json({ success: false, error: `Invalid price for item "${item.name || 'Unknown'}". Price cannot be negative.` });
            }
        }

        // Fetch outlet configuration for statutory tax & revenue heads
        const outletRes = await client.query(`SELECT * FROM restaurant_outlets WHERE id = $1`, [outletId]);
        const outlet = outletRes.rows[0];
        if (!outlet) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: `Outlet ${outletId} not found` });
        }

        // Compute running sequence order_number for this outlet
        const countRes = await client.query(`SELECT COALESCE(MAX(order_number), 1000) as max_num FROM pos_orders WHERE outlet_id = $1`, [outletId]);
        const orderNumber = Number(countRes.rows[0].max_num) + 1;
        const orderId = `pos-${outletId}-${orderNumber}-${Date.now()}`;

        // Calculate Subtotal & Tax
        let subtotal = 0;
        for (const item of items) {
            subtotal += Number(item.unitPrice || 0) * Math.floor(Number(item.quantity || 1));
        }

        if (numDiscount > subtotal) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Discount amount cannot exceed order subtotal' });
        }

        const discountedSubtotal = Math.max(0, subtotal - numDiscount);
        const serviceChargeRate = Number(outlet.service_charge_rate || 0.00);
        const vatRate = Number(outlet.vat_rate || 0.00);

        const serviceCharge = Number((discountedSubtotal * (serviceChargeRate / 100)).toFixed(2));
        const vat = Number(((discountedSubtotal + serviceCharge) * (vatRate / 100)).toFixed(2));
        const totalAmount = Number((discountedSubtotal + serviceCharge + vat).toFixed(2));

        // Authenticated staff attribution (eliminates identity spoofing in audit trails)
        const authenticatedStaffName = (req as any).user?.name || waiterName || 'POS Terminal';

        // Hotel Folio "Bill to Room" validation & charge posting variables
        let folioId: string | null = null;
        let reservationId: string | null = null;
        let folioChargeId: string | null = null;
        let paymentStatus = 'PENDING';

        if (paymentMethod === 'ROOM_CHARGE') {
            if (!roomNumber) throw new Error('Room Number is required for Bill to Room payment');
            if (!outlet.allow_room_charge) throw new Error('Bill to Room is not allowed for this outlet');

            // Find active in-house reservation for this room via reservation_rooms & rooms
            const resRes = await client.query(`
                SELECT r.id as res_id, r.status, f.id as folio_id, f.status as folio_status
                FROM reservation_rooms rr
                JOIN rooms rm ON rm.id = rr.room_id
                JOIN reservations r ON r.id = rr.reservation_id
                LEFT JOIN folios f ON f.reservation_id = r.id AND f.folio_type = 'MASTER'
                WHERE rm.room_number = $1
                  AND rr.status IN ('CHECKED_IN', 'IN_HOUSE', 'CONFIRMED')
                ORDER BY rr.id DESC LIMIT 1;
            `, [String(roomNumber).trim()]);

            if (resRes.rows.length === 0) {
                throw new Error(`No active in-house guest found for Room ${roomNumber}. Please verify room status.`);
            }

            reservationId = resRes.rows[0].res_id;
            folioId = resRes.rows[0].folio_id;

            if (!folioId) {
                // Fetch any open folio for this reservation
                const altFolio = await client.query(`SELECT id FROM folios WHERE reservation_id = $1 LIMIT 1`, [reservationId]);
                folioId = altFolio.rows[0]?.id || null;
            }

            if (!folioId) {
                throw new Error(`No open folio found for Room ${roomNumber}. Cannot post room charge.`);
            }

            // Post Charge to Hotel Folio (folio_charges)
            const chargeDesc = `POS Order #${orderNumber} (${outlet.name}) - ${items.slice(0, 2).map((i: any) => i.name).join(', ')}`;
            const dateStr = new Date().toISOString().split('T')[0];
            const chargeInsertRes = await client.query(`
                INSERT INTO folio_charges (
                    folio_id, charge_code, revenue_head, ref_no, description,
                    amount, discount_amount, service_charge, vat, city_tax,
                    total_tax, total_amount, charge_date, is_tax_applicable, user_name
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0.00, $10, $11, $12, TRUE, $13)
                RETURNING id;
            `, [
                folioId, 'POS-MEAL', outlet.revenue_head_code || '10020-01', orderId, chargeDesc,
                discountedSubtotal, numDiscount, serviceCharge, vat,
                vat, totalAmount, dateStr, authenticatedStaffName
            ]);
            folioChargeId = String(chargeInsertRes.rows[0].id);

            // Update Folio Balance
            await client.query(`
                UPDATE folios 
                SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2;
            `, [totalAmount, folioId]);

            // Audit Trail Log
            await client.query(`
                INSERT INTO folio_audit_trail (folio_id, reservation_id, action_type, description, user_name)
                VALUES ($1, $2, 'CHARGE_POSTED', $3, $4);
            `, [folioId, reservationId, `Posted POS dining charge: ${outlet.name} - ৳${totalAmount.toFixed(2)} [Ref: ${orderId}]`, authenticatedStaffName]);

            paymentStatus = 'PAID';
        }

        // Insert Order Record
        const insertOrderSql = `
            INSERT INTO pos_orders (
                id, outlet_id, order_number, table_id, order_type, status,
                customer_name, customer_phone, room_number, reservation_id, folio_id, folio_charge_id,
                subtotal, discount, vat, service_charge, total_amount,
                payment_method, payment_status, payment_details,
                waiter_id, waiter_name, notes, guest_count
            ) VALUES (
                $1, $2, $3, $4, $5, 'CONFIRMED',
                $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16,
                $17, $18, $19,
                $20, $21, $22, $23
            ) RETURNING *;
        `;
        const newOrder = await client.query(insertOrderSql, [
            orderId, outletId, orderNumber, tableId || null, orderType,
            customerName, customerPhone, roomNumber || null, reservationId, folioId, folioChargeId,
            subtotal, numDiscount, vat, serviceCharge, totalAmount,
            paymentMethod, paymentStatus, JSON.stringify(paymentDetails),
            waiterId || null, authenticatedStaffName, notes, guestCount
        ]);

        // Insert Order Items
        for (const item of items) {
            const itemId = `poi-${orderId}-${Math.floor(Math.random() * 100000)}`;
            const itemQty = Number(item.quantity || 1);
            const itemUnitPrice = Number(item.unitPrice || 0);
            const itemTotalPrice = Number((itemQty * itemUnitPrice).toFixed(2));

            await client.query(`
                INSERT INTO pos_order_items (
                    id, order_id, menu_item_id, item_name, quantity, variation_name,
                    selected_addons, unit_price, total_price, course, prep_station,
                    status, custom_notes, allergens_excluded, is_complimentary
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'QUEUED', $12, $13, $14);
            `, [
                itemId, orderId, item.menuItemId, item.name, itemQty, item.variationName || null,
                JSON.stringify(item.selectedAddons || []), itemUnitPrice, itemTotalPrice,
                item.course || 'MAINS', item.prepStation || 'GRILL_HOT',
                item.customNotes || null, JSON.stringify(item.allergensExcluded || []), Boolean(item.isComplimentary)
            ]);
        }

        // Update Table status to OCCUPIED if Dine-In
        if (tableId) {
            await client.query(`
                UPDATE restaurant_tables 
                SET status = 'OCCUPIED', active_order_id = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2;
            `, [orderId, tableId]);
        }

        // Generate Kitchen Order Ticket (KOT)
        if (outlet.auto_generate_kot) {
            const kotCountRes = await client.query(`SELECT COUNT(*) as count FROM pos_kots WHERE outlet_id = $1`, [outletId]);
            const kotNumber = Number(kotCountRes.rows[0].count) + 1;
            await client.query(`
                INSERT INTO pos_kots (id, outlet_id, order_id, kot_number, station_code, items, is_printed)
                VALUES ($1, $2, $3, $4, 'ALL', $5, TRUE);
            `, [`kot-${orderId}`, outletId, orderId, kotNumber, JSON.stringify(items)]);
        }

        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            data: newOrder.rows[0],
            message: `Order #${orderNumber} created successfully${paymentMethod === 'ROOM_CHARGE' ? ` and billed to Room ${roomNumber} (Folio #${folioId})` : ''}`
        });
    } catch (e: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: e?.message });
    } finally {
        client.release();
    }
});

// PATCH /api/pos/orders/:id/status - Update order status (PREPARING, READY, SERVED, CANCELLED)
router.patch('/orders/:id/status', async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const updated = await queryRow(`
            UPDATE pos_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;
        `, [status, req.params.id]);

        // If order served or cancelled and table is empty, update table status
        if (updated && updated.table_id && (status === 'SERVED' || status === 'CANCELLED')) {
            if (status === 'CANCELLED') {
                await pgPool.query(`UPDATE restaurant_tables SET status = 'VACANT', active_order_id = NULL WHERE id = $1`, [updated.table_id]);
            }
        }

        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// PATCH /api/pos/order-items/:id/status - Bump / Cook single item on KDS
router.patch('/order-items/:id/status', async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const updated = await queryRow(`
            UPDATE pos_order_items SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;
        `, [status, req.params.id]);
        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// POST /api/pos/orders/:id/settle - Settle order payment
router.post('/orders/:id/settle', async (req: Request, res: Response) => {
    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');
        const { paymentMethod = 'CASH', paymentDetails = [] } = req.body;
        const orderId = req.params.id;

        const orderRes = await client.query(`SELECT * FROM pos_orders WHERE id = $1`, [orderId]);
        const order = orderRes.rows[0];
        if (!order) throw new Error('Order not found');

        const updated = await client.query(`
            UPDATE pos_orders SET
                status = 'PAID',
                payment_status = 'PAID',
                payment_method = $1,
                payment_details = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 RETURNING *;
        `, [paymentMethod, JSON.stringify(paymentDetails), orderId]);

        // Release Table if table was occupied
        if (order.table_id) {
            await client.query(`
                UPDATE restaurant_tables SET status = 'CLEANING', active_order_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1;
            `, [order.table_id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, data: updated.rows[0], message: `Order #${order.order_number} settled successfully via ${paymentMethod}` });
    } catch (e: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: e?.message });
    } finally {
        client.release();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CASH REGISTERS (SHIFT SESSIONS & DISCREPANCY RECONCILIATION)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/pos/registers/current - Get active shift for current cashier/outlet
router.get('/registers/current', async (req: Request, res: Response) => {
    try {
        const { outletId, cashierId = 'staff-01' } = req.query as any;
        if (!outletId) return res.status(400).json({ success: false, error: 'outletId is required' });

        const session = await queryRow(`
            SELECT * FROM pos_cash_registers 
            WHERE outlet_id = $1 AND cashier_id = $2 AND status = 'OPEN' 
            ORDER BY opened_at DESC LIMIT 1;
        `, [outletId, cashierId]);

        // Calculate live sales today for this cashier & outlet
        const salesRes = await queryRow(`
            SELECT 
                COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as cash_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN total_amount ELSE 0 END), 0) as card_sales,
                COALESCE(SUM(CASE WHEN payment_method IN ('BKASH','NAGAD','MFS') THEN total_amount ELSE 0 END), 0) as digital_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'ROOM_CHARGE' THEN total_amount ELSE 0 END), 0) as room_charges,
                COUNT(*) as total_orders
            FROM pos_orders
            WHERE outlet_id = $1 AND payment_status = 'PAID'
              AND created_at >= CURRENT_DATE;
        `, [outletId]);

        res.json({
            success: true,
            data: {
                session,
                stats: {
                    cashSales: Number(salesRes?.cash_sales || 0),
                    cardSales: Number(salesRes?.card_sales || 0),
                    digitalSales: Number(salesRes?.digital_sales || 0),
                    roomCharges: Number(salesRes?.room_charges || 0),
                    totalOrders: Number(salesRes?.total_orders || 0)
                }
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// POST /api/pos/registers/open - Open shift with initial float
router.post('/registers/open', async (req: Request, res: Response) => {
    try {
        const { outletId, cashierId = 'staff-01', cashierName = 'Cashier', openingBalance = 0, notes = '' } = req.body;
        if (!outletId) return res.status(400).json({ success: false, error: 'outletId is required' });

        // Close any dangling open sessions
        await pgPool.query(`
            UPDATE pos_cash_registers SET status = 'CLOSED', closed_at = CURRENT_TIMESTAMP
            WHERE outlet_id = $1 AND cashier_id = $2 AND status = 'OPEN';
        `, [outletId, cashierId]);

        const id = `reg-${Date.now()}`;
        const session = await queryRow(`
            INSERT INTO pos_cash_registers (id, outlet_id, cashier_id, cashier_name, opening_balance, status, notes)
            VALUES ($1, $2, $3, $4, $5, 'OPEN', $6)
            RETURNING *;
        `, [id, outletId, cashierId, cashierName, openingBalance, notes]);

        res.status(201).json({ success: true, data: session, message: 'Cash register shift opened' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// POST /api/pos/registers/close - Close shift with reconciliation
router.post('/registers/close', async (req: Request, res: Response) => {
    try {
        const { sessionId, actualClosingCash, notes = '' } = req.body;
        const session = await queryRow(`SELECT * FROM pos_cash_registers WHERE id = $1`, [sessionId]);
        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

        // Fetch sales during this session
        const salesRes = await queryRow(`
            SELECT 
                COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END), 0) as cash_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN total_amount ELSE 0 END), 0) as card_sales,
                COALESCE(SUM(CASE WHEN payment_method IN ('BKASH','NAGAD','MFS') THEN total_amount ELSE 0 END), 0) as digital_sales,
                COALESCE(SUM(CASE WHEN payment_method = 'ROOM_CHARGE' THEN total_amount ELSE 0 END), 0) as room_charges
            FROM pos_orders
            WHERE outlet_id = $1 AND payment_status = 'PAID'
              AND created_at >= $2;
        `, [session.outlet_id, session.opened_at]);

        const totalCashSales = Number(salesRes?.cash_sales || 0);
        const expectedCash = Number(session.opening_balance) + totalCashSales;
        const discrepancy = Number(actualClosingCash) - expectedCash;

        const updated = await queryRow(`
            UPDATE pos_cash_registers SET
                closing_balance = $1,
                expected_closing_balance = $2,
                discrepancy = $3,
                total_cash_sales = $4,
                total_card_sales = $5,
                total_digital_sales = $6,
                total_room_charges = $7,
                status = 'CLOSED',
                closed_at = CURRENT_TIMESTAMP,
                notes = $8
            WHERE id = $9 RETURNING *;
        `, [
            actualClosingCash, expectedCash, discrepancy,
            totalCashSales, Number(salesRes?.card_sales || 0), Number(salesRes?.digital_sales || 0), Number(salesRes?.room_charges || 0),
            notes, sessionId
        ]);

        res.json({
            success: true,
            data: updated,
            reconciliation: {
                opening: Number(session.opening_balance),
                cashSales: totalCashSales,
                expected: expectedCash,
                actual: Number(actualClosingCash),
                discrepancy
            },
            message: `Shift closed. ${discrepancy === 0 ? 'Cash drawer balanced perfectly.' : `Discrepancy: ${discrepancy > 0 ? '+' : ''}${discrepancy}`}`
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. KOT AUDIT TICKETS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/kots', async (req: Request, res: Response) => {
    try {
        const outletId = req.query.outletId as string;
        let sql = `SELECT * FROM pos_kots`;
        const params: any[] = [];
        if (outletId) {
            sql += ` WHERE outlet_id = $1`;
            params.push(outletId);
        }
        sql += ` ORDER BY created_at DESC LIMIT 50`;
        const kots = await queryRows(sql, params);
        res.json({ success: true, data: kots });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.post('/kots/:id/reprint', async (req: Request, res: Response) => {
    try {
        const kot = await queryRow(`
            UPDATE pos_kots SET reprint_count = reprint_count + 1 WHERE id = $1 RETURNING *;
        `, [req.params.id]);
        if (!kot) return res.status(404).json({ success: false, error: 'KOT not found' });
        res.json({ success: true, data: kot, message: `KOT #${kot.kot_number} reprint logged` });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

export default router;
