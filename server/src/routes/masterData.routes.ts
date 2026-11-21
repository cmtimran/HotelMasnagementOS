import { Router, Request, Response } from 'express';
import { pgPool } from '../database/postgres.js';
import { broadcastServerEvent } from './realtime.routes.js';

const router = Router();

// ==========================================
// 1. CURRENCIES & EXCHANGE RATES
// ==========================================

// GET /api/master-data/currencies
router.get('/currencies', async (req: Request, res: Response) => {
    try {
        const client = await pgPool.connect();
        try {
            const result = await client.query(`
                SELECT id, code, name, symbol, exchange_rate, is_base, is_active, updated_at
                FROM system_currencies
                ORDER BY is_base DESC, code ASC;
            `);
            res.json({ success: true, data: result.rows });
        } finally {
            client.release();
        }
    } catch (e: any) {
        console.error('Fetch currencies error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/master-data/currencies
router.post('/currencies', async (req: Request, res: Response) => {
    try {
        const { code, name, symbol, exchangeRate, isBase } = req.body;
        if (!code || !name) {
            return res.status(400).json({ success: false, error: 'Currency code and name are required' });
        }

        const client = await pgPool.connect();
        try {
            if (isBase) {
                await client.query('UPDATE system_currencies SET is_base = FALSE;');
            }

            const result = await client.query(`
                INSERT INTO system_currencies (code, name, symbol, exchange_rate, is_base, is_active, updated_at)
                VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP)
                ON CONFLICT (code) DO UPDATE
                SET name = EXCLUDED.name,
                    symbol = EXCLUDED.symbol,
                    exchange_rate = EXCLUDED.exchange_rate,
                    is_base = EXCLUDED.is_base,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *;
            `, [code.toUpperCase(), name, symbol || code, Number(exchangeRate) || 1.0, Boolean(isBase)]);

            broadcastServerEvent({
                type: 'MASTER_DATA_UPDATED',
                entity: 'currencies',
                data: result.rows[0]
            });

            res.json({ success: true, data: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// PUT /api/master-data/currencies/:id/rate
router.put('/currencies/:id/rate', async (req: Request, res: Response) => {
    try {
        const { rate } = req.body;
        const id = Number(req.params.id);
        const client = await pgPool.connect();
        try {
            const result = await client.query(`
                UPDATE system_currencies 
                SET exchange_rate = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *;
            `, [Number(rate), id]);

            broadcastServerEvent({
                type: 'MASTER_DATA_UPDATED',
                entity: 'currencies',
                data: result.rows[0]
            });

            res.json({ success: true, data: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 2. PROMOTIONAL DISCOUNTS
// ==========================================

// GET /api/master-data/discounts
router.get('/discounts', async (req: Request, res: Response) => {
    try {
        const propId = Number(req.query.propertyId || req.headers['x-property-id'] || 1);
        const client = await pgPool.connect();
        try {
            const result = await client.query(`
                SELECT id, property_id, code, title, discount_type, value, applies_to, valid_from, valid_until, is_active, updated_at
                FROM system_discounts
                WHERE property_id = $1 OR property_id = 1
                ORDER BY id ASC;
            `, [propId]);
            res.json({ success: true, data: result.rows });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/master-data/discounts
router.post('/discounts', async (req: Request, res: Response) => {
    try {
        const propId = Number(req.body.propertyId || req.headers['x-property-id'] || 1);
        const { id, code, title, discountType, type, value, appliesTo, validFrom, validUntil, isActive } = req.body;

        const effectiveType = discountType || type || 'percentage';
        const client = await pgPool.connect();
        try {
            let result;
            if (id) {
                result = await client.query(`
                    UPDATE system_discounts
                    SET code = $1, title = $2, discount_type = $3, value = $4, applies_to = $5,
                        valid_from = $6, valid_until = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $9
                    RETURNING *;
                `, [code, title, effectiveType, Number(value), appliesTo || 'all', validFrom || null, validUntil || null, isActive !== false, id]);
            } else {
                result = await client.query(`
                    INSERT INTO system_discounts (property_id, code, title, discount_type, value, applies_to, valid_from, valid_until, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING *;
                `, [propId, code, title, effectiveType, Number(value), appliesTo || 'all', validFrom || null, validUntil || null, isActive !== false]);
            }

            broadcastServerEvent({
                type: 'MASTER_DATA_UPDATED',
                entity: 'discounts',
                data: result.rows[0]
            });

            res.json({ success: true, data: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/master-data/discounts/:id
router.delete('/discounts/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const client = await pgPool.connect();
        try {
            await client.query('DELETE FROM system_discounts WHERE id = $1;', [id]);
            broadcastServerEvent({ type: 'MASTER_DATA_UPDATED', entity: 'discounts', deletedId: id });
            res.json({ success: true, message: 'Discount deleted successfully' });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 3. EXTRA CHARGES
// ==========================================

// GET /api/master-data/extra-charges
router.get('/extra-charges', async (req: Request, res: Response) => {
    try {
        const propId = Number(req.query.propertyId || req.headers['x-property-id'] || 1);
        const client = await pgPool.connect();
        try {
            const result = await client.query(`
                SELECT id, property_id, code, name, charge_type, amount, taxable, is_active, updated_at
                FROM system_extra_charges
                WHERE property_id = $1 OR property_id = 1
                ORDER BY id ASC;
            `, [propId]);
            res.json({ success: true, data: result.rows });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/master-data/extra-charges
router.post('/extra-charges', async (req: Request, res: Response) => {
    try {
        const propId = Number(req.body.propertyId || req.headers['x-property-id'] || 1);
        const { id, code, name, chargeType, type, amount, taxable, isActive } = req.body;

        const effectiveType = chargeType || type || 'flat';
        const client = await pgPool.connect();
        try {
            let result;
            if (id) {
                result = await client.query(`
                    UPDATE system_extra_charges
                    SET code = $1, name = $2, charge_type = $3, amount = $4, taxable = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $7
                    RETURNING *;
                `, [code, name, effectiveType, Number(amount), taxable !== false, isActive !== false, id]);
            } else {
                result = await client.query(`
                    INSERT INTO system_extra_charges (property_id, code, name, charge_type, amount, taxable, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *;
                `, [propId, code, name, effectiveType, Number(amount), taxable !== false, isActive !== false]);
            }

            broadcastServerEvent({
                type: 'MASTER_DATA_UPDATED',
                entity: 'extra-charges',
                data: result.rows[0]
            });

            res.json({ success: true, data: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/master-data/extra-charges/:id
router.delete('/extra-charges/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const client = await pgPool.connect();
        try {
            await client.query('DELETE FROM system_extra_charges WHERE id = $1;', [id]);
            broadcastServerEvent({ type: 'MASTER_DATA_UPDATED', entity: 'extra-charges', deletedId: id });
            res.json({ success: true, message: 'Extra charge deleted successfully' });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 4. BANK ACCOUNTS & MFS WALLETS
// ==========================================

// GET /api/master-data/banks
router.get('/banks', async (req: Request, res: Response) => {
    try {
        const propId = Number(req.query.propertyId || req.headers['x-property-id'] || 1);
        const client = await pgPool.connect();
        try {
            const result = await client.query(`
                SELECT id, property_id, account_name, bank_name, account_number, branch, routing_number, swift_code, currency, current_balance, account_type, is_active, updated_at
                FROM bank_accounts
                WHERE property_id = $1 OR property_id = 1
                ORDER BY id ASC;
            `, [propId]);
            res.json({ success: true, data: result.rows });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/master-data/banks
router.post('/banks', async (req: Request, res: Response) => {
    try {
        const propId = Number(req.body.propertyId || req.headers['x-property-id'] || 1);
        const { id, accountName, bankName, accountNumber, branch, routingNumber, swiftCode, currency, currentBalance, accountType, isActive } = req.body;

        const client = await pgPool.connect();
        try {
            let result;
            if (id) {
                result = await client.query(`
                    UPDATE bank_accounts
                    SET account_name = $1, bank_name = $2, account_number = $3, branch = $4,
                        routing_number = $5, swift_code = $6, currency = $7, current_balance = $8,
                        account_type = $9, is_active = $10, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $11
                    RETURNING *;
                `, [accountName, bankName, accountNumber, branch || '', routingNumber || '', swiftCode || '', currency || 'BDT', Number(currentBalance) || 0, accountType || 'bank', isActive !== false, id]);
            } else {
                result = await client.query(`
                    INSERT INTO bank_accounts (property_id, account_name, bank_name, account_number, branch, routing_number, swift_code, currency, current_balance, account_type, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING *;
                `, [propId, accountName, bankName, accountNumber, branch || '', routingNumber || '', swiftCode || '', currency || 'BDT', Number(currentBalance) || 0, accountType || 'bank', isActive !== false]);
            }

            broadcastServerEvent({
                type: 'MASTER_DATA_UPDATED',
                entity: 'banks',
                data: result.rows[0]
            });

            res.json({ success: true, data: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/master-data/banks/:id
router.delete('/banks/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const client = await pgPool.connect();
        try {
            await client.query('DELETE FROM bank_accounts WHERE id = $1;', [id]);
            broadcastServerEvent({ type: 'MASTER_DATA_UPDATED', entity: 'banks', deletedId: id });
            res.json({ success: true, message: 'Bank account deleted successfully' });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 5. CORPORATE PROFILES (corporate_accounts)
// ==========================================

// GET /api/master-data/corporate-profiles
router.get('/corporate-profiles', async (req: Request, res: Response) => {
    try {
        const client = await pgPool.connect();
        try {
            const result = await client.query(`
                SELECT 
                    id,
                    company_name as "companyName",
                    COALESCE(account_type, 'Corporate') as "accountType",
                    credit_limit as "creditLimit",
                    payment_terms_days as "paymentTermsDays",
                    CASE 
                        WHEN payment_terms_days = 15 THEN 'Net 15 Days'
                        WHEN payment_terms_days = 45 THEN 'Net 45 Days'
                        WHEN payment_terms_days = 60 THEN 'Net 60 Days'
                        ELSE 'Net 30 Days'
                    END as "paymentTerm",
                    COALESCE(tax_id, trade_license, '') as "taxRegistration",
                    contact_person as "contactPerson",
                    COALESCE(billing_email, email) as "billingEmail",
                    COALESCE(linked_rate_code, 'CORP') as "linkedRateCode",
                    COALESCE(is_blacklisted, FALSE) as "isBlacklisted",
                    COALESCE(current_outstanding, 0) as "currentBalance",
                    phone,
                    COALESCE(address, 'Dhaka, Bangladesh') as address,
                    COALESCE(contract_start_date::text, '2025-01-01') as "contractStartDate",
                    COALESCE(contract_end_date::text, '2026-12-31') as "contractEndDate",
                    COALESCE(special_terms, '') as "specialTerms",
                    is_active as "isActive"
                FROM corporate_accounts
                ORDER BY id ASC;
            `);
            res.json({ success: true, count: result.rows.length, data: result.rows });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/master-data/corporate-profiles
router.post('/corporate-profiles', async (req: Request, res: Response) => {
    try {
        const {
            companyName, accountType, creditLimit, paymentTerm, taxRegistration,
            contactPerson, billingEmail, linkedRateCode, phone, address,
            contractStartDate, contractEndDate, specialTerms
        } = req.body;

        if (!companyName) {
            return res.status(400).json({ success: false, error: 'Company name is required' });
        }

        let days = 30;
        if (paymentTerm === 'Net 15 Days') days = 15;
        if (paymentTerm === 'Net 45 Days') days = 45;
        if (paymentTerm === 'Net 60 Days') days = 60;

        const client = await pgPool.connect();
        try {
            const result = await client.query(`
                INSERT INTO corporate_accounts (
                    organization_id, company_name, account_type, credit_limit, payment_terms_days, credit_days,
                    tax_id, trade_license, contact_person, billing_email, linked_rate_code,
                    phone, email, address, contract_start_date, contract_end_date, special_terms, is_active
                ) VALUES (
                    1, $1, $2, $3, $4, $4,
                    $5, $5, $6, $7, $8,
                    $9, $7, $10, $11, $12, $13, TRUE
                )
                RETURNING *;
            `, [
                companyName, accountType || 'Corporate', Number(creditLimit) || 100000, days,
                taxRegistration || '', contactPerson || '', billingEmail || '', linkedRateCode || 'CORP',
                phone || '', address || '', contractStartDate || null, contractEndDate || null, specialTerms || ''
            ]);

            broadcastServerEvent({
                type: 'MASTER_DATA_UPDATED',
                entity: 'corporate-profiles',
                data: result.rows[0]
            });

            res.json({ success: true, data: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// PUT /api/master-data/corporate-profiles/:id
router.put('/corporate-profiles/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const {
            companyName, accountType, creditLimit, paymentTerm, taxRegistration,
            contactPerson, billingEmail, linkedRateCode, phone, address,
            contractStartDate, contractEndDate, specialTerms, isBlacklisted
        } = req.body;

        let days = 30;
        if (paymentTerm === 'Net 15 Days') days = 15;
        if (paymentTerm === 'Net 45 Days') days = 45;
        if (paymentTerm === 'Net 60 Days') days = 60;

        const client = await pgPool.connect();
        try {
            const result = await client.query(`
                UPDATE corporate_accounts SET
                    company_name = COALESCE($1, company_name),
                    account_type = COALESCE($2, account_type),
                    credit_limit = COALESCE($3, credit_limit),
                    payment_terms_days = COALESCE($4, payment_terms_days),
                    credit_days = COALESCE($4, credit_days),
                    tax_id = COALESCE($5, tax_id),
                    trade_license = COALESCE($5, trade_license),
                    contact_person = COALESCE($6, contact_person),
                    billing_email = COALESCE($7, billing_email),
                    email = COALESCE($7, email),
                    linked_rate_code = COALESCE($8, linked_rate_code),
                    phone = COALESCE($9, phone),
                    address = COALESCE($10, address),
                    contract_start_date = COALESCE($11, contract_start_date),
                    contract_end_date = COALESCE($12, contract_end_date),
                    special_terms = COALESCE($13, special_terms),
                    is_blacklisted = COALESCE($14, is_blacklisted)
                WHERE id = $15
                RETURNING *;
            `, [
                companyName, accountType, creditLimit !== undefined ? Number(creditLimit) : null, days,
                taxRegistration, contactPerson, billingEmail, linkedRateCode,
                phone, address, contractStartDate || null, contractEndDate || null, specialTerms,
                isBlacklisted !== undefined ? Boolean(isBlacklisted) : null, id
            ]);

            broadcastServerEvent({
                type: 'MASTER_DATA_UPDATED',
                entity: 'corporate-profiles',
                data: result.rows[0]
            });

            res.json({ success: true, data: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/master-data/corporate-profiles/:id/blacklist
router.post('/corporate-profiles/:id/blacklist', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const client = await pgPool.connect();
        try {
            const result = await client.query(`
                UPDATE corporate_accounts
                SET is_blacklisted = NOT COALESCE(is_blacklisted, FALSE)
                WHERE id = $1
                RETURNING id, company_name, is_blacklisted;
            `, [id]);

            broadcastServerEvent({
                type: 'MASTER_DATA_UPDATED',
                entity: 'corporate-profiles',
                data: result.rows[0]
            });

            res.json({ success: true, data: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/master-data/corporate-profiles/:id
router.delete('/corporate-profiles/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const client = await pgPool.connect();
        try {
            await client.query('DELETE FROM corporate_accounts WHERE id = $1;', [id]);
            broadcastServerEvent({ type: 'MASTER_DATA_UPDATED', entity: 'corporate-profiles', deletedId: id });
            res.json({ success: true, message: 'Corporate profile deleted successfully' });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 6. BUSINESS SOURCES & MARKET SEGMENTS
// ==========================================

// GET /api/master-data/business-sources
router.get('/business-sources', async (req: Request, res: Response) => {
    try {
        const propId = Number(req.query.propertyId || req.headers['x-property-id'] || 1);
        const client = await pgPool.connect();
        try {
            const result = await client.query(`
                SELECT id, property_id, source_name as "sourceName", source_group as "sourceGroup",
                       commission_type as "commissionType", commission_value as "commissionValue",
                       voucher_required as "voucherRequired", linked_rate_code as "linkedRateCode",
                       contact_email as "contactEmail", contract_number as "contractNumber",
                       notes, is_active as "active"
                FROM business_sources
                WHERE property_id = $1 OR property_id = 1
                ORDER BY id ASC;
            `, [propId]);
            res.json({ success: true, count: result.rows.length, data: result.rows });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/master-data/business-sources
router.post('/business-sources', async (req: Request, res: Response) => {
    try {
        const propId = Number(req.body.propertyId || req.headers['x-property-id'] || 1);
        const { sourceName, sourceGroup, commissionType, commissionValue, voucherRequired, linkedRateCode, contactEmail, contractNumber, notes, active } = req.body;

        const client = await pgPool.connect();
        try {
            const result = await client.query(`
                INSERT INTO business_sources (
                    property_id, source_name, source_group, commission_type, commission_value,
                    voucher_required, linked_rate_code, contact_email, contract_number, notes, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *;
            `, [
                propId, sourceName, sourceGroup || 'OTA', commissionType || 'Percentage', Number(commissionValue) || 0,
                Boolean(voucherRequired), linkedRateCode || '', contactEmail || '', contractNumber || '', notes || '', active !== false
            ]);

            broadcastServerEvent({
                type: 'MASTER_DATA_UPDATED',
                entity: 'business-sources',
                data: result.rows[0]
            });

            res.json({ success: true, data: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /api/master-data/business-sources/:id
router.delete('/business-sources/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const client = await pgPool.connect();
        try {
            await client.query('DELETE FROM business_sources WHERE id = $1;', [id]);
            broadcastServerEvent({ type: 'MASTER_DATA_UPDATED', entity: 'business-sources', deletedId: id });
            res.json({ success: true, message: 'Business source deleted successfully' });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
