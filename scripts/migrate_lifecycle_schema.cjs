const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const connectionString = process.env.DATABASE_URL || 'postgresql://2ee5ogtas24zphhs.root:mX6wS33xX1K6wG1m@gateway01.us-east-1.prod.aws.pg.tidbcloud.com:4000/hotel_pms_db?sslmode=require';
const pool = new Pool({ connectionString });

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('--- Step 1: Upgrading GUESTS table with Lifetime CRM Stats ---');
        await client.query(`
            ALTER TABLE guests
            ADD COLUMN IF NOT EXISTS total_stays INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS lifetime_spend NUMERIC(12,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS last_stay_date DATE;
        `);
        console.log('✅ GUESTS table columns verified/added.');

        console.log('--- Step 2: Upgrading FOLIOS table with Closure Audit Columns ---');
        await client.query(`
            ALTER TABLE folios
            ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS closed_by VARCHAR(64),
            ADD COLUMN IF NOT EXISTS is_supplementary BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS parent_folio_id BIGINT;
        `);
        console.log('✅ FOLIOS table columns verified/added.');

        console.log('--- Step 3: Upgrading HOUSEKEEPING_TASKS with Reservation Attribution ---');
        await client.query(`
            ALTER TABLE housekeeping_tasks
            ADD COLUMN IF NOT EXISTS reservation_id BIGINT,
            ADD COLUMN IF NOT EXISTS guest_name VARCHAR(128);
        `);
        console.log('✅ HOUSEKEEPING_TASKS table columns verified/added.');

        console.log('--- Step 4: Upgrading KEYCARD_LOGS table with Operation Status ---');
        await client.query(`
            ALTER TABLE keycard_logs
            ADD COLUMN IF NOT EXISTS reservation_id BIGINT,
            ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;
        `);
        console.log('✅ KEYCARD_LOGS table columns verified/added.');

        console.log('🎉 All lifecycle schema migrations executed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
