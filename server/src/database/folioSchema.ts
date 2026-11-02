import { Pool } from 'pg';

export async function ensureFolioExtendedSchema(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(`
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS bill_to VARCHAR(100);
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS market_code VARCHAR(100);
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS business_source VARCHAR(100) DEFAULT 'Direct';
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS business_agent VARCHAR(100);
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS voucher_no VARCHAR(100);
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS commission_plan VARCHAR(100);
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS plan_value NUMERIC(12,2) DEFAULT 0.00;
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS sales_person VARCHAR(100);
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS send_mail BOOLEAN DEFAULT FALSE;
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS checkout_mail BOOLEAN DEFAULT FALSE;
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS suppress_rate_qr BOOLEAN DEFAULT FALSE;
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS display_inclusion_separate BOOLEAN DEFAULT FALSE;
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS generate_invoice_on_checkout BOOLEAN DEFAULT TRUE;
            ALTER TABLE folios ADD COLUMN IF NOT EXISTS gstin_number VARCHAR(100);

            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS revenue_head VARCHAR(100) DEFAULT 'Room Charges';
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS ref_no VARCHAR(50);
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS user_name VARCHAR(100) DEFAULT 'Front Desk';
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0.00;
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS service_charge NUMERIC(12,2) DEFAULT 0.00;
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS vat NUMERIC(12,2) DEFAULT 0.00;
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS city_tax NUMERIC(12,2) DEFAULT 0.00;
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS total_tax NUMERIC(12,2) DEFAULT 0.00;
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS is_tax_applicable BOOLEAN DEFAULT TRUE;
            ALTER TABLE folio_charges ADD COLUMN IF NOT EXISTS tax_exemption_id VARCHAR(100);

            CREATE TABLE IF NOT EXISTS folio_audit_trail (
                id BIGSERIAL PRIMARY KEY,
                folio_id BIGINT REFERENCES folios(id) ON DELETE CASCADE,
                reservation_id BIGINT,
                action_type VARCHAR(100) NOT NULL,
                before_state TEXT,
                after_state TEXT,
                description TEXT,
                user_name VARCHAR(100) DEFAULT 'Front Desk',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS revenue_heads (
                id BIGSERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) DEFAULT 'OTHER',
                is_active BOOLEAN DEFAULT TRUE
            );

            INSERT INTO revenue_heads (code, name, category) VALUES
                ('ROOM_CHG', 'Room Charges', 'ROOM'),
                ('CITY_CHG', 'City Chargee', 'CHARGE'),
                ('NEW_HEAD_123', 'NEW HEAD 123', 'OTHER'),
                ('TEST_01', 'Test 01', 'OTHER'),
                ('EXTRA_BED', 'Extra Bed', 'ROOM'),
                ('BANQUET', 'Banquet Venue Charges', 'EVENTS'),
                ('LAUNDRY', 'Laundry', 'SERVICE'),
                ('MINIBAR', 'Minibar', 'F_AND_B'),
                ('EARLY_CI', 'Early Check In', 'ROOM'),
                ('LATE_CO', 'Late Check Out', 'ROOM'),
                ('ROOM_SRV', 'Room Service (F&B)', 'F_AND_B'),
                ('AIRPORT_TR', 'Airport Transfer', 'TRANSPORT'),
                ('SPA', 'Spa & Wellness', 'SERVICE')
            ON CONFLICT (code) DO NOTHING;
        `);
        console.log('✔ [PostgreSQL] Enterprise Folio extended schema and audit trail verified active.');
    } finally {
        client.release();
    }
}
