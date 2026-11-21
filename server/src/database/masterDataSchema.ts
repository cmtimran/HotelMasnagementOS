import type { Pool } from 'pg';

/**
 * Master Data Database Schema & Initial Enterprise Seed Data
 * Persists Currencies, Discounts, Extra Charges, Bank/MFS Accounts, 
 * Corporate Accounts, and Business Sources to Cloud PostgreSQL.
 */
export async function ensureMasterDataSchemaPostgres(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
        // 1. Currencies & Exchange Rates
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_currencies (
                id BIGSERIAL PRIMARY KEY,
                code VARCHAR(10) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                symbol VARCHAR(10) NOT NULL,
                exchange_rate NUMERIC(12,4) NOT NULL DEFAULT 1.0000,
                is_base BOOLEAN NOT NULL DEFAULT FALSE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed initial currencies if table is empty
        const currCount = await client.query('SELECT COUNT(*) FROM system_currencies;');
        if (parseInt(currCount.rows[0].count, 10) === 0) {
            await client.query(`
                INSERT INTO system_currencies (code, name, symbol, exchange_rate, is_base, is_active) VALUES
                ('BDT', 'Bangladeshi Taka', '৳', 1.0000, TRUE, TRUE),
                ('USD', 'US Dollar', '$', 121.5000, FALSE, TRUE),
                ('EUR', 'Euro', '€', 131.2000, FALSE, TRUE),
                ('GBP', 'British Pound', '£', 153.8000, FALSE, TRUE),
                ('SAR', 'Saudi Riyal', '﷼', 32.4000, FALSE, TRUE),
                ('INR', 'Indian Rupee', '₹', 1.4500, FALSE, TRUE);
            `);
        }

        // 2. Promotional Discounts & Vouchers
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_discounts (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1,
                code VARCHAR(50) NOT NULL,
                title VARCHAR(150) NOT NULL,
                discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' or 'flat'
                value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                applies_to VARCHAR(50) NOT NULL DEFAULT 'all', -- 'all', 'room', 'food', 'spa'
                valid_from DATE,
                valid_until DATE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const discCount = await client.query('SELECT COUNT(*) FROM system_discounts;');
        if (parseInt(discCount.rows[0].count, 10) === 0) {
            await client.query(`
                INSERT INTO system_discounts (property_id, code, title, discount_type, value, applies_to, is_active) VALUES
                (1, 'EARLYBIRD', 'Early Bird Booking Discount', 'percentage', 15.00, 'room', TRUE),
                (1, 'WEEKEND20', 'Weekend Getaway Offer', 'percentage', 20.00, 'room', TRUE),
                (1, 'CORP10', 'Corporate Partner Privilege', 'percentage', 10.00, 'all', TRUE),
                (1, 'FLAT1000', 'VIP Welcome Credit', 'flat', 1000.00, 'all', TRUE);
            `);
        }

        // 3. Extra Charges
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_extra_charges (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1,
                code VARCHAR(50) NOT NULL,
                name VARCHAR(150) NOT NULL,
                charge_type VARCHAR(20) NOT NULL DEFAULT 'flat', -- 'flat' or 'percentage'
                amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                taxable BOOLEAN NOT NULL DEFAULT TRUE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const chgCount = await client.query('SELECT COUNT(*) FROM system_extra_charges;');
        if (parseInt(chgCount.rows[0].count, 10) === 0) {
            await client.query(`
                INSERT INTO system_extra_charges (property_id, code, name, charge_type, amount, taxable, is_active) VALUES
                (1, 'AIRPORT_PICKUP', 'Airport Luxury Sedan Pickup', 'flat', 2500.00, TRUE, TRUE),
                (1, 'EXTRA_BED', 'Rollaway Extra Bed per Night', 'flat', 1500.00, TRUE, TRUE),
                (1, 'LATE_CHECKOUT', 'Late Check-out Fee (Past 2 PM)', 'flat', 2000.00, TRUE, TRUE),
                (1, 'LAUNDRY_EXPRESS', 'Express Laundry Surcharge', 'percentage', 50.00, FALSE, TRUE);
            `);
        }

        // 4. Bank Accounts & MFS Wallets
        await client.query(`
            CREATE TABLE IF NOT EXISTS bank_accounts (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1,
                account_name VARCHAR(150) NOT NULL,
                bank_name VARCHAR(150) NOT NULL,
                account_number VARCHAR(100) NOT NULL,
                branch VARCHAR(100),
                routing_number VARCHAR(100),
                swift_code VARCHAR(50),
                currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
                current_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                account_type VARCHAR(20) NOT NULL DEFAULT 'bank', -- 'bank' or 'mfs'
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const bankCount = await client.query('SELECT COUNT(*) FROM bank_accounts;');
        if (parseInt(bankCount.rows[0].count, 10) === 0) {
            await client.query(`
                INSERT INTO bank_accounts (property_id, account_name, bank_name, account_number, branch, routing_number, swift_code, currency, current_balance, account_type, is_active) VALUES
                (1, 'Hotel Operations Main', 'City Bank Ltd', '1102938475001', 'Gulshan Avenue', '225271890', 'CIBLBDDH', 'BDT', 2540000.00, 'bank', TRUE),
                (1, 'Hotel USD Settlement', 'Standard Chartered Bank', '189201948101', 'Gulshan-2', '060271822', 'SCBLBDDX', 'USD', 45000.00, 'bank', TRUE),
                (1, 'bKash Merchant Gateway', 'bKash Limited', '01711000000', 'Corporate Head Office', '', '', 'BDT', 345000.00, 'mfs', TRUE),
                (1, 'Nagad Merchant Express', 'Nagad Post Office', '01811000000', 'Dhaka GPO', '', '', 'BDT', 120000.00, 'mfs', TRUE);
            `);
        }

        // 5. Ensure extended columns on corporate_accounts
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'corporate_accounts' AND column_name = 'address') THEN
                    ALTER TABLE corporate_accounts ADD COLUMN address TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'corporate_accounts' AND column_name = 'billing_email') THEN
                    ALTER TABLE corporate_accounts ADD COLUMN billing_email VARCHAR(150);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'corporate_accounts' AND column_name = 'linked_rate_code') THEN
                    ALTER TABLE corporate_accounts ADD COLUMN linked_rate_code VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'corporate_accounts' AND column_name = 'is_blacklisted') THEN
                    ALTER TABLE corporate_accounts ADD COLUMN is_blacklisted BOOLEAN DEFAULT FALSE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'corporate_accounts' AND column_name = 'special_terms') THEN
                    ALTER TABLE corporate_accounts ADD COLUMN special_terms TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'corporate_accounts' AND column_name = 'contract_start_date') THEN
                    ALTER TABLE corporate_accounts ADD COLUMN contract_start_date DATE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'corporate_accounts' AND column_name = 'contract_end_date') THEN
                    ALTER TABLE corporate_accounts ADD COLUMN contract_end_date DATE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'corporate_accounts' AND column_name = 'account_type') THEN
                    ALTER TABLE corporate_accounts ADD COLUMN account_type VARCHAR(50) DEFAULT 'Corporate';
                END IF;
            END $$;
        `);

        // Seed corporate_accounts if empty
        const corpCount = await client.query('SELECT COUNT(*) FROM corporate_accounts;');
        if (parseInt(corpCount.rows[0].count, 10) === 0) {
            await client.query(`
                INSERT INTO corporate_accounts (
                    organization_id, company_name, account_type, credit_limit, payment_terms_days, credit_days,
                    tax_id, contact_person, billing_email, linked_rate_code, is_blacklisted, current_outstanding,
                    phone, email, address, contract_start_date, contract_end_date, special_terms, is_active
                ) VALUES
                (
                    1, 'Unilever Bangladesh Ltd', 'Corporate', 500000.00, 30, 30,
                    'BIN-000123456', 'Mr. Rahman (HR Manager)', 'accounts@unilever.com.bd', 'CORP_UL', FALSE, 125000.00,
                    '+880 1711-123456', 'accounts@unilever.com.bd', 'Gulshan-1, Dhaka', '2025-01-01', '2026-12-31',
                    '20% discount on BAR, Free breakfast for 2', TRUE
                ),
                (
                    1, 'Grameenphone Ltd', 'Corporate', 1000000.00, 15, 15,
                    'BIN-000987654', 'Ms. Sultana (Business Dev)', 'billing@grameenphone.com', 'CORP_GP', FALSE, 0.00,
                    '+880 1700-987654', 'billing@grameenphone.com', 'Bashundhara, Dhaka', '2024-06-01', '2026-05-31',
                    'Direct company billing with formal Purchase Order voucher', TRUE
                );
            `);
        }

        // 6. Business Sources (OTAs & Direct Channels)
        await client.query(`
            CREATE TABLE IF NOT EXISTS business_sources (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1,
                source_name VARCHAR(150) NOT NULL,
                source_group VARCHAR(50) NOT NULL DEFAULT 'OTA', -- 'OTA', 'Direct', 'Corporate', 'Walk-in'
                commission_type VARCHAR(20) NOT NULL DEFAULT 'Percentage',
                commission_value NUMERIC(8,2) NOT NULL DEFAULT 0.00,
                voucher_required BOOLEAN NOT NULL DEFAULT FALSE,
                linked_rate_code VARCHAR(50),
                contact_email VARCHAR(150),
                contract_number VARCHAR(100),
                notes TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const srcCount = await client.query('SELECT COUNT(*) FROM business_sources;');
        if (parseInt(srcCount.rows[0].count, 10) === 0) {
            await client.query(`
                INSERT INTO business_sources (property_id, source_name, source_group, commission_type, commission_value, voucher_required, linked_rate_code, contact_email, contract_number, notes, is_active) VALUES
                (1, 'Booking.com', 'OTA', 'Percentage', 15.00, TRUE, 'OTA_BAR', 'partner@booking.com', 'BDC-2024-001', 'Standard OTA commission, monthly settlement', TRUE),
                (1, 'Agoda', 'OTA', 'Percentage', 18.00, TRUE, 'OTA_BAR', 'partners@agoda.com', 'AGD-2024-089', 'Prepaid voucher model', TRUE),
                (1, 'Expedia Partner Solutions', 'OTA', 'Percentage', 16.00, TRUE, 'OTA_EXP', 'support@expedia.com', 'EXP-2024-55', 'Hotel Collect & Expedia Collect', TRUE),
                (1, 'Direct Front Desk Walk-In', 'Walk-in', 'Percentage', 0.00, FALSE, 'BAR', 'frontdesk@hotelms.com', 'DIR-WALK', 'Direct walk-in guests with zero commission', TRUE),
                (1, 'Official Hotel Website Engine', 'Direct', 'Percentage', 0.00, FALSE, 'WEB_DIRECT', 'reservations@hotelms.com', 'DIR-WEB', 'Direct online reservations with zero commission', TRUE);
            `);
        }

        console.log('✅ [Master Data Schema] All master data PostgreSQL tables and seed verified.');
    } catch (err: any) {
        console.error('❌ [Master Data Schema] Setup failed:', err.message);
    } finally {
        client.release();
    }
}
