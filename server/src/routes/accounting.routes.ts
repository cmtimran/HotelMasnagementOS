import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { broadcastServerEvent } from './realtime.routes.js';

const router = Router();

// GET /api/accounting/chart-of-accounts - USALI Chart of Accounts
router.get('/chart-of-accounts', (req: Request, res: Response) => {
    try {
        const accounts = db.prepare(`
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

// GET /api/accounting/folios - List active folios with itemized charges & payments
router.get('/folios', (req: Request, res: Response) => {
    try {
        const folios = db.prepare(`
            SELECT 
                f.*,
                r.reservation_number,
                (SELECT rr.room_id FROM reservation_rooms rr WHERE rr.reservation_id = r.id LIMIT 1) as room_id,
                (SELECT rm.room_number FROM rooms rm JOIN reservation_rooms rr ON rr.room_id = rm.id WHERE rr.reservation_id = r.id LIMIT 1) as room_number,
                (SELECT rt.name FROM room_types rt JOIN rooms rm ON rm.room_type_id = rt.id JOIN reservation_rooms rr ON rr.room_id = rm.id WHERE rr.reservation_id = r.id LIMIT 1) as room_type,
                (SELECT MIN(rr.check_in_date) FROM reservation_rooms rr WHERE rr.reservation_id = r.id) as check_in,
                (SELECT MAX(rr.check_out_date) FROM reservation_rooms rr WHERE rr.reservation_id = r.id) as check_out,
                g.first_name || ' ' || g.last_name as guest_name,
                g.phone as guest_phone,
                g.email as guest_email,
                (SELECT COALESCE(SUM(total_amount), 0) FROM folio_charges WHERE folio_id = f.id AND is_voided = 0) as total_charges,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE folio_id = f.id) as total_payments
            FROM folios f
            LEFT JOIN reservations r ON r.id = f.reservation_id
            LEFT JOIN guests g ON g.id = f.guest_id
            ORDER BY f.id DESC
        `).all() as any[];

        // Fetch charges and payments for each folio
        const enrichedFolios = folios.map(f => {
            const charges = db.prepare(`
                SELECT * FROM folio_charges WHERE folio_id = ? ORDER BY id DESC
            `).all(f.id);

            const payments = db.prepare(`
                SELECT * FROM payments WHERE folio_id = ? ORDER BY id DESC
            `).all(f.id);

            return {
                ...f,
                charges,
                payments,
                calculatedBalance: Number(f.total_charges) - Number(f.total_payments)
            };
        });

        res.json({
            success: true,
            data: enrichedFolios
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch folios' });
    }
});

// GET /api/accounting/folios/:id - Single folio details
router.get('/folios/:id', (req: Request, res: Response) => {
    try {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = String(rawId || '');
        const folio = db.prepare(`
            SELECT 
                f.*,
                r.reservation_number,
                (SELECT rm.room_number FROM rooms rm JOIN reservation_rooms rr ON rr.room_id = rm.id WHERE rr.reservation_id = r.id LIMIT 1) as room_number,
                (SELECT rt.name FROM room_types rt JOIN rooms rm ON rm.room_type_id = rt.id JOIN reservation_rooms rr ON rr.room_id = rm.id WHERE rr.reservation_id = r.id LIMIT 1) as room_type,
                g.first_name || ' ' || g.last_name as guest_name,
                g.phone as guest_phone,
                g.email as guest_email
            FROM folios f
            LEFT JOIN reservations r ON r.id = f.reservation_id
            LEFT JOIN guests g ON g.id = f.guest_id
            WHERE f.id = ? OR f.folio_number = ?
        `).get(id, id) as any;

        if (!folio) {
            return res.status(404).json({ success: false, error: 'Folio not found' });
        }

        const charges = db.prepare(`SELECT * FROM folio_charges WHERE folio_id = ? ORDER BY id DESC`).all(folio.id);
        const payments = db.prepare(`SELECT * FROM payments WHERE folio_id = ? ORDER BY id DESC`).all(folio.id);

        res.json({
            success: true,
            data: {
                ...folio,
                charges,
                payments
            }
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch folio' });
    }
});

// POST /api/accounting/folios/:id/charges - Post a charge to Folio and General Ledger
router.post('/folios/:id/charges', (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const { chargeCode = 'ROOM_SRV', description, amount, taxAmount = 0, chargeDate } = req.body;

        const numAmount = Number(amount);
        const numTax = Number(taxAmount);
        const totalAmount = numAmount + numTax;

        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid charge amount' });
        }

        const dateStr = chargeDate || new Date().toISOString().split('T')[0];

        // 1. Insert into folio_charges
        const chargeInsert = db.prepare(`
            INSERT INTO folio_charges (folio_id, charge_code, description, amount, tax_amount, total_amount, charge_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(folioId, chargeCode, description || 'Department Charge', numAmount, numTax, totalAmount, dateStr);

        // 2. Update Folio balance
        db.prepare(`
            UPDATE folios 
            SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(totalAmount, folioId);

        // 3. Emit real-time event
        try {
            broadcastServerEvent({
                type: 'FOLIO_UPDATED',
                folioId,
                chargeId: chargeInsert.lastInsertRowid,
                amount: totalAmount
            });
        } catch (err) {
            console.warn('Failed to broadcast folio update', err);
        }

        res.json({
            success: true,
            message: `Charge of ৳${totalAmount.toFixed(2)} posted successfully`,
            chargeId: chargeInsert.lastInsertRowid
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to post charge' });
    }
});

// POST /api/accounting/folios/:id/payments - Post payment/settlement to Folio
router.post('/folios/:id/payments', (req: Request, res: Response) => {
    try {
        const folioId = Number(req.params.id);
        const { paymentMethod = 'CASH', amount, referenceCode = 'FRONT_DESK_SETTLE', propertyId = 1 } = req.body;

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid payment amount' });
        }

        const paymentNumber = `PAY-${Date.now().toString().slice(-8)}`;

        // 1. Insert payment
        const payInsert = db.prepare(`
            INSERT INTO payments (folio_id, property_id, payment_number, payment_method, amount, reference_code)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(folioId, propertyId, paymentNumber, paymentMethod.toUpperCase(), numAmount, referenceCode);

        // 2. Update Folio balance & status
        db.prepare(`
            UPDATE folios 
            SET balance = MAX(0, balance - ?),
                status = CASE WHEN (balance - ?) <= 0 THEN 'SETTLED' ELSE 'OPEN' END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(numAmount, numAmount, folioId);

        // 3. Emit real-time event
        try {
            broadcastServerEvent({
                type: 'FOLIO_UPDATED',
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
router.get('/journal-entries', (req: Request, res: Response) => {
    try {
        const entries = db.prepare(`
            SELECT * FROM journal_entries ORDER BY entry_date DESC, id DESC
        `).all() as any[];

        const entriesWithLines = entries.map(entry => {
            const lines = db.prepare(`
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
        });

        res.json({
            success: true,
            data: entriesWithLines
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch journal entries' });
    }
});

// POST /api/accounting/journal-entries - Post a new balanced double-entry transaction
router.post('/journal-entries', (req: Request, res: Response) => {
    try {
        const { propertyId = 1, description, entryDate, lines = [], createdBy = 'Manual Entry' } = req.body;

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
            VALUES (1, ?, ?, ?, ?, 'MANUAL', 1, ?)
        `);
        const result = insertEntry.run(propertyId, entryNumber, dateStr, description, createdBy);
        const entryId = Number(result.lastInsertRowid);

        // Insert Lines
        const insertLine = db.prepare(`
            INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, memo)
            VALUES (?, ?, ?, ?, ?)
        `);

        for (const line of lines) {
            insertLine.run(
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
router.get('/trial-balance', (req: Request, res: Response) => {
    try {
        const rows = db.prepare(`
            SELECT 
                coa.id as account_id,
                coa.account_code,
                coa.account_name,
                coa.account_type,
                COALESCE(SUM(jl.debit), 0) as total_debit,
                COALESCE(SUM(jl.credit), 0) as total_credit
            FROM chart_of_accounts coa
            LEFT JOIN journal_lines jl ON jl.account_id = coa.id
            LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.is_posted = 1
            GROUP BY coa.id
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

export default router;
