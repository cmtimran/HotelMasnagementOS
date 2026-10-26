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
        'rate_plans', 'meal_plans', 'hotel_packages', 'rate_calendar_overrides'
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

            // 3. Check if data seeded; if empty, automatically seed
            const countRes = await client.query('SELECT COUNT(*) as c FROM rooms;');
            const roomCount = parseInt(countRes.rows[0]?.c || '0', 10);
            if (roomCount < 34) {
                console.log('🌱 Seeding Cloud PostgreSQL with 34 canonical rooms and hotel data...');
                const { seedCloudPostgres } = await import('./seed_cloud_pg.js');
                await seedCloudPostgres(connectionString);
            } else {
                console.log(`🏨 [Cloud PostgreSQL] Database active with ${roomCount} canonical rooms and hotel assets.`);
            }

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
