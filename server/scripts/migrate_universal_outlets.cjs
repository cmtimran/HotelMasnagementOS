const pg = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hotel_db';
const pool = new pg.Pool({ connectionString });

async function run() {
    console.log('Connecting to PostgreSQL database...');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Altering restaurant_outlets table to add universal multi-department columns...');

        await client.query(`
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS department_category VARCHAR(64) DEFAULT 'FOOD_BEVERAGE';
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS catalog_type VARCHAR(64) DEFAULT 'RESTAURANT_MENU';
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS allows_barcode_scan BOOLEAN DEFAULT FALSE;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS requires_appointment BOOLEAN DEFAULT FALSE;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS physical_location VARCHAR(255) DEFAULT '';
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS accepted_payment_methods JSONB DEFAULT '["Cash", "Card", "Room-Charge"]'::jsonb;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS assigned_terminal_ids JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS hardware_settings JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS venue_dimensions JSONB DEFAULT '{"lengthFeet": 0, "widthFeet": 0, "heightFeet": 0, "totalSqFt": 0, "carpetAreaSqFt": 0}'::jsonb;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS seating_capacities JSONB DEFAULT '{"theatre": 0, "classroom": 0, "banquet": 0, "ushape": 0, "cocktail": 0, "boardroom": 0}'::jsonb;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS rental_tariffs JSONB DEFAULT '{"hourlyRate": 0, "halfDayRate": 0, "fullDayRate": 0, "eveningRate": 0, "cleaningFee": 0}'::jsonb;
            CREATE INDEX IF NOT EXISTS idx_outlets_department ON restaurant_outlets(department_category);
        `);

        // If any existing outlets have NULL department_category, default them to FOOD_BEVERAGE
        await client.query(`
            UPDATE restaurant_outlets
            SET department_category = 'FOOD_BEVERAGE'
            WHERE department_category IS NULL;
        `);

        await client.query('COMMIT');
        console.log('SUCCESS: All universal outlet columns and indexes created successfully!');

        // Inspect columns to verify
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'restaurant_outlets'
            ORDER BY ordinal_position;
        `);
        console.log('Verified columns in restaurant_outlets:', res.rows.map(r => r.column_name).join(', '));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
