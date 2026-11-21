import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ensureRatesAndExtendedTablesPostgres } from './ratesModules.js';
import { ensureFolioExtendedSchema } from './folioSchema.js';
import { ensureMasterDataSchemaPostgres } from './masterDataSchema.js';
import { ensureChannelManagerSchema } from './channelManagerSchema.js';
import { ensureGuestCxSchema } from './guestCxSchema.js';
import { ensureHolidaySchemaPostgres } from './holidaySchema.js';
import { ensureRestaurantAndPosSchema } from './restaurantSchema.js';

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
const isServerless = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const isRemote = !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');
const isRemoteOrSsl = isRemote ||
                      connectionString.includes('tidbcloud') || 
                      connectionString.includes('sslmode=require') || 
                      process.env.PGSSLMODE === 'require';

export const pgPool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
    max: isServerless ? 5 : 20,
    ssl: isRemoteOrSsl ? { rejectUnauthorized: false } : undefined
});

// Handle idle connection errors without crashing Node.js process
pgPool.on('error', (err: any) => {
    console.warn('⚠️ [PostgreSQL Pool] Idle client connection closed or error:', err.message);
});

let postgresConnected = false;
let cachedDefaultPropertyId: string = '';

export const isPostgresConnected = () => postgresConnected;

/**
 * Dynamically query the database for the active property ID (zero hardcoding)
 */
export async function refreshDefaultActivePropertyId(): Promise<string> {
    try {
        const res = await pgPool.query('SELECT id FROM properties WHERE is_active = true ORDER BY id ASC LIMIT 1');
        if (res.rows.length > 0 && res.rows[0]?.id != null) {
            cachedDefaultPropertyId = String(res.rows[0].id);
        }
    } catch (e: any) {
        console.warn('Could not query active property ID from database:', e?.message);
    }
    return cachedDefaultPropertyId;
}

export function getDefaultActivePropertyId(): string {
    return cachedDefaultPropertyId;
}

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
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS stop_room_move BOOLEAN DEFAULT FALSE;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS stop_room_move_reason TEXT;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS registration_card_signed BOOLEAN DEFAULT FALSE;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS registration_card_signed_at TIMESTAMPTZ;');
                await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS signature_data TEXT;');

                await client.query('ALTER TABLE reservation_rooms ADD COLUMN IF NOT EXISTS sub_booking_number VARCHAR(64);');
                await client.query('ALTER TABLE reservation_rooms ADD COLUMN IF NOT EXISTS registration_number VARCHAR(64);');
                await client.query('ALTER TABLE reservation_rooms ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP;');
                await client.query('ALTER TABLE reservation_rooms ADD COLUMN IF NOT EXISTS folio_number VARCHAR(64);');

                // Ensure room_types has all columns needed for complete RoomType management
                await client.query(`
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS size INT DEFAULT 350;
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS extra_adult_price NUMERIC(12,2) DEFAULT 1000.00;
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS extra_child_price NUMERIC(12,2) DEFAULT 500.00;
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS bed_type VARCHAR(50) DEFAULT 'King';
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS view_type VARCHAR(50) DEFAULT 'City View';
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS smoking_policy VARCHAR(50) DEFAULT 'Non-Smoking';
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS amenities TEXT DEFAULT '[]';
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS photos TEXT DEFAULT '[]';
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS videos TEXT DEFAULT '[]';
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS is_connecting BOOLEAN DEFAULT FALSE;
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT TRUE;
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 1;
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS pricing_unit VARCHAR(50) DEFAULT 'Per Room';
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS pricing_basis VARCHAR(50) DEFAULT 'Per Room';
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS extra_bed_allowed BOOLEAN DEFAULT FALSE;
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS extra_bed_quantity INT DEFAULT 0;
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS baby_cot_allowed BOOLEAN DEFAULT TRUE;
                    ALTER TABLE room_types ADD COLUMN IF NOT EXISTS raw_json TEXT;
                `);

                await client.query(`
                    CREATE TABLE IF NOT EXISTS folio_routing_rules (
                        id SERIAL PRIMARY KEY,
                        property_id BIGINT DEFAULT 1,
                        reservation_id VARCHAR(100) NOT NULL,
                        source_folio_id INTEGER NOT NULL,
                        dest_folio_id INTEGER NOT NULL,
                        scope VARCHAR(100) DEFAULT 'All folio of this guest',
                        route_room_charges BOOLEAN DEFAULT FALSE,
                        route_inclusions BOOLEAN DEFAULT FALSE,
                        route_all_extra_charges BOOLEAN DEFAULT FALSE,
                        routed_extra_charges TEXT[] DEFAULT '{}',
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        created_by VARCHAR(100) NOT NULL DEFAULT 'Front Desk'
                    );
                `);

                await client.query(`
                    CREATE TABLE IF NOT EXISTS daily_sequences (
                        seq_date VARCHAR(16) NOT NULL,
                        seq_type VARCHAR(32) NOT NULL,
                        current_val INT NOT NULL DEFAULT 0,
                        PRIMARY KEY (seq_date, seq_type)
                    );
                `);

                // Ensure night audit run lock table exists to prevent duplicate execution
                await client.query(`
                    CREATE TABLE IF NOT EXISTS night_audit_runs (
                        id BIGSERIAL PRIMARY KEY,
                        property_id BIGINT NOT NULL,
                        business_date DATE NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
                        started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMPTZ,
                        performed_by VARCHAR(100) DEFAULT 'System Night Audit',
                        summary_json TEXT,
                        UNIQUE (property_id, business_date)
                    );
                `);

                // Seed Standard USALI Chart of Accounts baseline
                await client.query(`
                    INSERT INTO chart_of_accounts (organization_id, property_id, account_code, account_name, account_type, usali_department)
                    VALUES
                        (1, 1, '10001-01', 'Cash on Hand - Front Desk', 'ASSET', 'ROOMS'),
                        (1, 1, '10002-01', 'Bank / POS Card Settlement', 'ASSET', 'ROOMS'),
                        (1, 1, '10003-01', 'MFS Clearing (bKash / Nagad)', 'ASSET', 'ROOMS'),
                        (1, 1, '11010-01', 'Guest Ledger Accounts Receivable', 'ASSET', 'ROOMS'),
                        (1, 1, '10010-01', 'Master Room Rent Revenue', 'REVENUE', 'ROOMS'),
                        (1, 1, '10020-01', 'Food & Beverage Revenue', 'REVENUE', 'F_AND_B'),
                        (1, 1, '10030-01', 'Add-on & Service Revenue', 'REVENUE', 'ROOMS'),
                        (1, 1, '22010-01', 'Govt Output VAT (15%)', 'LIABILITY', 'NON_OPERATING'),
                        (1, 1, '22020-01', 'Hotel Service Charge (10%)', 'LIABILITY', 'NON_OPERATING'),
                        (1, 1, '22030-01', 'City Tax Payable (1%)', 'LIABILITY', 'NON_OPERATING'),
                        (1, 1, '50010-01', 'Card MDR & Bank Processing Fee', 'EXPENSE', 'ADMIN_GENERAL')
                    ON CONFLICT (organization_id, account_code) DO NOTHING;
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

            // 2.1 Ensure enterprise folio extended schema & revenue heads exist
            try {
                await ensureFolioExtendedSchema(pgPool);
            } catch (folioErr: any) {
                console.warn('Folio schema warning in PostgreSQL:', folioErr?.message);
            }

            // 2.2 Ensure master data schema (currencies, discounts, charges, banks, corporate accounts, business sources)
            try {
                await ensureMasterDataSchemaPostgres(pgPool);
            } catch (masterDataErr: any) {
                console.warn('Master data schema warning in PostgreSQL:', masterDataErr?.message);
            }

            // 2.3 Ensure channel manager schema (connections, mappings, ARI overrides, inbound bookings)
            try {
                await ensureChannelManagerSchema(pgPool);
            } catch (channelErr: any) {
                console.warn('Channel manager schema warning in PostgreSQL:', channelErr?.message);
            }

            // 2.4 Ensure GuestFlow (StayPulse) omnichannel CX schema
            try {
                await ensureGuestCxSchema(pgPool);
            } catch (cxErr: any) {
                console.warn('GuestFlow CX schema warning in PostgreSQL:', cxErr?.message);
            }

            // 2.5 Ensure Holiday & Peak Governance schema exists in PostgreSQL
            try {
                await ensureHolidaySchemaPostgres(pgPool);
                console.log('✅ [Cloud PostgreSQL] Holiday & Peak Governance schema and seed data active!');
            } catch (holidayErr: any) {
                console.warn('Holiday schema warning in PostgreSQL:', holidayErr?.message);
            }

            // 2.6 Ensure Restaurant Outlets, POS & KDS schema exists in PostgreSQL
            try {
                await ensureRestaurantAndPosSchema(pgPool);
                console.log('✅ [Cloud PostgreSQL] Restaurant & POS enterprise multi-outlet schema active!');
            } catch (restErr: any) {
                console.warn('Restaurant & POS schema warning in PostgreSQL:', restErr?.message);
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

            // 5. Cache default active property ID dynamically from database
            await refreshDefaultActivePropertyId();

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
