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
