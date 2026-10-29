import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const isRemoteOrSsl = connectionString?.includes('tidbcloud') || 
                      connectionString?.includes('sslmode=require') || 
                      process.env.PGSSLMODE === 'require';

const pool = new Pool({
    connectionString,
    ssl: isRemoteOrSsl ? { rejectUnauthorized: false } : undefined
});

function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function setupSuperAdminAndCleanDb() {
    const client = await pool.connect();
    try {
        console.log('🚀 [Database Setup] Creating users table and cleaning database...');
        await client.query('BEGIN;');

        // 1. Create users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
                property_id BIGINT REFERENCES properties(id) ON DELETE SET NULL,
                name VARCHAR(128) NOT NULL,
                email VARCHAR(128) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(64) NOT NULL DEFAULT 'super_admin',
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                image TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Wipe all tables except organizations
        const tablesToClear = [
            'folio_charges',
            'payments',
            'folios',
            'journal_lines',
            'journal_entries',
            'chart_of_accounts',
            'room_stay_splits',
            'reservation_addons',
            'addon_services',
            'reservation_rooms',
            'reservations',
            'guest_edit_history',
            'guests',
            'corporate_accounts',
            'housekeeping_tasks',
            'maintenance_orders',
            'room_maintenance_blocks',
            'lost_and_found_items',
            'connecting_rooms',
            'room_amenities',
            'rate_calendar_overrides',
            'hotel_packages',
            'rate_plans',
            'meal_plans',
            'rooms',
            'room_types',
            'floors',
            'buildings',
            'payroll_items',
            'payroll_runs',
            'leave_requests',
            'attendance_records',
            'employee_shift_rosters',
            'employees',
            'shifts',
            'designations',
            'departments',
            'users',
            'properties'
        ];

        for (const table of tablesToClear) {
            try {
                await client.query(`TRUNCATE TABLE ${table} CASCADE;`);
                console.log(`  ✓ Truncated ${table}`);
            } catch (err: any) {
                console.log(`  - Note on ${table}: ${err.message}`);
            }
        }

        // 3. Ensure Organization 1 exists
        await client.query(`
            INSERT INTO organizations (id, code, name, tax_number, base_currency, headquarters_address)
            VALUES (1, 'CORP', 'Global Hospitality Group', 'BIN-001002003', 'USD', 'Corporate Headquarters')
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
        `);
        console.log('  ✓ Verified Organization 1 (Global Hospitality Group)');

        // 4. Create Single Super Admin User
        const adminEmail = 'superadmin@hotelmanagement.os';
        const passwordPlain = 'admin';
        const adminPassHash = hashPassword(passwordPlain);

        await client.query(`
            INSERT INTO users (organization_id, property_id, name, email, password_hash, role, is_active, image)
            VALUES (1, NULL, 'Super Administrator', $1, $2, 'super_admin', true, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80')
            ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'super_admin', is_active = true;
        `, [adminEmail, adminPassHash]);
        console.log(`  ✓ Created Super Admin user: ${adminEmail} (password: ${passwordPlain})`);

        await client.query('COMMIT;');
        console.log('✨ [Database Setup] Completed successfully! Zero mock data. 1 Organization, 0 Properties, 1 Super Admin User.');
    } catch (e: any) {
        await client.query('ROLLBACK;');
        console.error('❌ [Database Setup] Error:', e.message);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

setupSuperAdminAndCleanDb();
