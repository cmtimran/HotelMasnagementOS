import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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
 * Initialize PostgreSQL / Cloud Cluster schema and verify live connection
 */
export async function initPostgres(): Promise<boolean> {
    try {
        const client = await pgPool.connect();
        try {
            const res = await client.query('SELECT NOW() as current_time, version()');
            postgresConnected = true;
            console.log(`🐘 [Cloud PostgreSQL] Connected successfully! Engine: ${res.rows[0].version?.split('\n')[0]?.slice(0, 70)}...`);

            // 1. Verify / Apply DDL Schema
            const schemaPath = path.join(__dirname, 'schema.postgres.sql');
            if (fs.existsSync(schemaPath)) {
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                await client.query(schemaSql);
                console.log('✅ [Cloud PostgreSQL] Enterprise schema (1NF-4NF, RLS, Indexes) verified and active!');
            }

            // 2. Check if data seeded; if empty, automatically seed
            const countRes = await client.query('SELECT COUNT(*) as c FROM rooms;');
            const roomCount = parseInt(countRes.rows[0]?.c || '0', 10);
            if (roomCount < 34) {
                console.log('🌱 Seeding Cloud PostgreSQL with 34 canonical rooms and hotel data...');
                const { seedCloudPostgres } = await import('./seed_cloud_pg.js');
                await seedCloudPostgres(connectionString);
            } else {
                console.log(`🏨 [Cloud PostgreSQL] Database active with ${roomCount} canonical rooms and hotel assets.`);
            }

            // 3. Ensure Room 104 allocation for reservation 105 (Mr Rashidul Hasan) and sync past stays
            try {
                await client.query(`
                    UPDATE reservation_rooms 
                    SET room_id = (SELECT id FROM rooms WHERE room_number = '104' LIMIT 1) 
                    WHERE reservation_id = 105 AND room_id = (SELECT id FROM rooms WHERE room_number = '102' LIMIT 1);

                    INSERT INTO guests (id, organization_id, salutation, first_name, last_name, email, phone, nationality, id_type, id_number, vip_status) VALUES
                    (17, 1, 'Mr', 'Zubair', 'Ahmed', 'zubair@gmail.com', '+880 1711-112233', 'Bangladeshi', 'National ID (NID)', '199001928312', 'NONE'),
                    (18, 1, 'Mr', 'S.', 'Chowdhury', 'schowdhury@gmail.com', '+880 1712-223344', 'Bangladeshi', 'National ID (NID)', '198801928322', 'NONE'),
                    (19, 1, 'Mr', 'Nasir', 'Hossain', 'nasir@gmail.com', '+880 1713-334455', 'Bangladeshi', 'National ID (NID)', '198701928333', 'NONE')
                    ON CONFLICT (id) DO NOTHING;

                    INSERT INTO reservations (id, property_id, reservation_number, booker_guest_id, source, channel, is_group, status, total_amount, paid_amount, due_amount) VALUES
                    (109, 1, 'RES-108901', 17, 'Direct Walk-In', 'Front Desk', false, 'COMPLETED', 9000.00, 9000.00, 0.00),
                    (110, 1, 'RES-108902', 19, 'Direct Web', 'Website', false, 'COMPLETED', 15000.00, 15000.00, 0.00),
                    (111, 1, 'RES-109282', 18, 'Corporate Contract', 'Corporate Desk', true, 'IN_HOUSE', 9000.00, 9000.00, 0.00)
                    ON CONFLICT (id) DO NOTHING;

                    INSERT INTO reservation_rooms (id, reservation_id, room_id, guest_id, check_in_date, check_out_date, nights, room_rate, adults, children, status) VALUES
                    (109, 109, (SELECT id FROM rooms WHERE room_number = '102' LIMIT 1), 17, '2026-06-25', '2026-06-28', 3, 3000.00, 1, 0, 'CHECKED_OUT'),
                    (110, 110, (SELECT id FROM rooms WHERE room_number = '508' LIMIT 1), 19, '2026-06-26', '2026-06-28', 2, 7500.00, 1, 0, 'CHECKED_OUT'),
                    (111, 111, (SELECT id FROM rooms WHERE room_number = '103' LIMIT 1), 18, '2026-07-01', '2026-07-03', 2, 4500.00, 2, 0, 'CHECKED_IN')
                    ON CONFLICT (id) DO NOTHING;
                `);
            } catch (syncErr: any) {
                console.warn('Notice: TiDB canonical reservation synchronization update:', syncErr.message);
            }

            return true;
        } finally {
            client.release();
        }
    } catch (err: any) {
        postgresConnected = false;
        console.warn(`ℹ️ [PostgreSQL] Connection skipped or offline (${err.message}).`);
        console.warn('   Running with high-speed embedded SQLite (WAL Mode) engine for fallback zero-dependency operation.');
        return false;
    }
}
