import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ensureRatesAndExtendedTablesPostgres } from './ratesModules.js';

// Ensure environment variables are loaded immediately regardless of ESM import hoisting
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();

const { Pool } = pg;
// Prevent node-postgres from converting PostgreSQL DATE (OID 1082) into local midnight Date objects that shift by -1 day on .toISOString()
pg.types.setTypeParser(1082, (val: string) => val);

function getConnectionString(): string {
    return process.env.DATABASE_URL || 
        `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'hotel_pms'}`;
}

const connectionString = getConnectionString();
const isRemoteOrSsl = connectionString.includes('tidbcloud') || 
                      connectionString.includes('sslmode=require') || 
                      process.env.PGSSLMODE === 'require';

export const pgPool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    max: 20,
    ssl: isRemoteOrSsl ? { rejectUnauthorized: false } : undefined
});

// Handle idle connection errors without crashing Node.js process
pgPool.on('error', (err: any) => {
    console.warn('⚠️ [PostgreSQL Pool] Idle client connection closed or error:', err.message);
});

let postgresConnected = false;

export const isPostgresConnected = () => postgresConnected;

/**
 * Synchronize auto-increment sequence counters with existing IDs across all tables
 */
async function syncAllSequences(client: any): Promise<void> {
    const tables = [
        'organizations', 'properties', 'buildings', 'floors', 'room_types', 'rooms',
        'amenities', 'guests', 'corporate_accounts', 'reservations', 'reservation_rooms',
        'addon_services', 'reservation_addons', 'room_stay_splits', 'chart_of_accounts',
        'folios', 'folio_charges', 'payments', 'journal_entries', 'journal_lines',
        'departments', 'designations', 'employees', 'shifts', 'employee_shift_rosters',
        'attendance_records', 'leave_types', 'leave_requests', 'payroll_runs',
        'payroll_items', 'housekeeping_tasks', 'maintenance_orders', 'connecting_rooms',
        'rate_plans', 'meal_plans', 'hotel_packages', 'rate_calendar_overrides', 'users'
    ];
    for (const table of tables) {
        try {
            await client.query(`
                SELECT setval(
                    pg_get_serial_sequence($1, 'id'),
                    COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1,
                    false
                );
            `, [table]);
        } catch {}
    }
}

/**
 * Initialize PostgreSQL / Cloud Cluster schema and verify live connection
 */
export async function initPostgres(): Promise<boolean> {
    try {
        const client = await pgPool.connect();
        try {
            const res = await client.query('SELECT NOW() as current_time, version()');
            postgresConnected = true;
            console.log(`🐘 [Sole Database Engine: Cloud PostgreSQL] Connected successfully! Engine: ${res.rows[0].version?.split('\n')[0]?.slice(0, 70)}...`);

            // 1. Verify / Apply DDL Schema
            const schemaPath = path.join(__dirname, 'schema.postgres.sql');
            if (fs.existsSync(schemaPath)) {
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                await client.query(schemaSql);
                console.log('✅ [Cloud PostgreSQL] Enterprise schema (1NF-4NF, RLS, Indexes) verified and active!');
            }

            // Ensure group_code, registration and folio columns exist in PostgreSQL
            try {
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS group_code VARCHAR(64);');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS registration_number VARCHAR(64);');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS folio_number VARCHAR(64);');
                await client.query('ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_status_check;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS hold_type VARCHAR(50) DEFAULT \'SIX_PM_RELEASE\';');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS hold_start_date DATE;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS hold_until TIMESTAMPTZ;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS hold_reason TEXT;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deposit_required NUMERIC(14,2) DEFAULT 0.00;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS auto_release BOOLEAN DEFAULT TRUE;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_guaranteed BOOLEAN DEFAULT FALSE;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS hold_released_at TIMESTAMPTZ;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS hold_released_by BIGINT;');

                await client.query('ALTER TABLE reservation_rooms ADD COLUMN IF NOT EXISTS sub_booking_number VARCHAR(64);');
                await client.query('ALTER TABLE reservation_rooms ADD COLUMN IF NOT EXISTS registration_number VARCHAR(64);');
                await client.query('ALTER TABLE reservation_rooms ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP;');
                await client.query('ALTER TABLE reservation_rooms ADD COLUMN IF NOT EXISTS folio_number VARCHAR(64);');

                await client.query(`
                    CREATE TABLE IF NOT EXISTS daily_sequences (
                        seq_date VARCHAR(16) NOT NULL,
                        seq_type VARCHAR(32) NOT NULL,
                        current_val INT NOT NULL DEFAULT 0,
                        PRIMARY KEY (seq_date, seq_type)
                    );
                `);
            } catch (colErr: any) {
                console.warn('PostgreSQL column check warning:', colErr?.message);
            }

            // 2. Ensure rate plans, meal plans, packages, connecting rooms and extended columns exist in PostgreSQL
            try {
                await ensureRatesAndExtendedTablesPostgres(pgPool);
                console.log('✅ [Cloud PostgreSQL] Rate plans, meal plans, packages and connecting rooms active!');
            } catch (ratesErr: any) {
                console.warn('Rates tables warning in PostgreSQL:', ratesErr?.message);
            }

            // 3. Ensure baseline Organization 1 and single Super Admin exist (Zero properties/rooms hardcoded)
            const orgCountRes = await client.query('SELECT COUNT(*) as c FROM organizations WHERE id = 1;');
            if (parseInt(orgCountRes.rows[0]?.c || '0', 10) === 0) {
                await client.query(`
                    INSERT INTO organizations (id, code, name, tax_number, base_currency, headquarters_address)
                    VALUES (1, 'CORP', 'Global Hospitality Group', 'BIN-001002003', 'USD', 'Corporate Headquarters')
                    ON CONFLICT (id) DO NOTHING;
                `);
            }

            // Ensure users table and single Super Admin user exist
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

            const adminEmail = 'superadmin@hotelmanagement.os';
            const adminPassHash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // sha256('admin')
            await client.query(`
                INSERT INTO users (organization_id, property_id, name, email, password_hash, role, is_active)
                VALUES (1, NULL, 'Super Administrator', $1, $2, 'super_admin', true)
                ON CONFLICT (email) DO NOTHING;
            `, [adminEmail, adminPassHash]);

            const propCountRes = await client.query('SELECT COUNT(*) as c FROM properties;');
            const propCount = parseInt(propCountRes.rows[0]?.c || '0', 10);
            const roomCountRes = await client.query('SELECT COUNT(*) as c FROM rooms;');
            const roomCount = parseInt(roomCountRes.rows[0]?.c || '0', 10);
            console.log(`🏨 [Cloud PostgreSQL] Database active. Configured Properties: ${propCount}. Active Rooms: ${roomCount}. Super Admin ready.`);

            // 4. Synchronize all table sequence values to prevent duplicate key errors
            await syncAllSequences(client);

            return true;
        } finally {
            client.release();
        }
    } catch (err: any) {
        postgresConnected = false;
        console.error(`🚨 [Cloud PostgreSQL] Failed to connect to database: ${err.message}`);
        throw err;
    }
}
