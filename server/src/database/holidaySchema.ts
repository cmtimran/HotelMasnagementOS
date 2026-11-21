import type { Pool } from 'pg';

export async function ensureHolidaySchemaPostgres(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
        // Create holidays table
        await client.query(`
            CREATE TABLE IF NOT EXISTS holidays (
                id VARCHAR(64) PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                code VARCHAR(64) NOT NULL,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(32) NOT NULL DEFAULT 'PUBLIC',
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                days_count INT NOT NULL DEFAULT 1,
                has_surge_rate BOOLEAN NOT NULL DEFAULT FALSE,
                rate_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00,
                min_stay_nights INT NOT NULL DEFAULT 1,
                mandatory_gala BOOLEAN NOT NULL DEFAULT FALSE,
                gala_dinner_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
                staff_wage_multiplier NUMERIC(5,2) NOT NULL DEFAULT 2.00,
                comp_off_credit BOOLEAN NOT NULL DEFAULT TRUE,
                minimum_staffing_alert VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
                is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_holidays_prop_dates ON holidays(property_id, start_date, end_date, status);
        `);

        // Ensure columns exist for existing tables
        try {
            await client.query(`
                ALTER TABLE holidays ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE holidays ADD COLUMN IF NOT EXISTS min_stay_nights INT NOT NULL DEFAULT 1;
                ALTER TABLE holidays ADD COLUMN IF NOT EXISTS has_surge_rate BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE holidays ADD COLUMN IF NOT EXISTS rate_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00;
            `);
        } catch {}
    } finally {
        client.release();
    }
}
