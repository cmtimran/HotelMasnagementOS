import pg, { type Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pgPool } from './postgres.js';
import { ensureRatesAndExtendedTablesPostgres } from './ratesModules.js';
import type { TenantContext } from './tenantContext.js';

const PoolClass = pg.Pool;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPostgresSchemaSql(): string {
    const candidatePaths = [
        path.join(__dirname, 'schema.postgres.sql'),
        path.join(__dirname, '..', '..', 'src', 'database', 'schema.postgres.sql'),
        path.join(__dirname, '..', 'src', 'database', 'schema.postgres.sql'),
        path.join(process.cwd(), 'src', 'database', 'schema.postgres.sql'),
        path.join(process.cwd(), 'server', 'src', 'database', 'schema.postgres.sql')
    ];
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
            return fs.readFileSync(p, 'utf8');
        }
    }
    throw new Error('schema.postgres.sql file could not be located in source or distribution directories.');
}

interface CachedTenantPool {
    pool: Pool;
    lastAccessed: number;
    dbName: string;
    tenantName: string;
}

export class TenantConnectionManager {
    private static pools = new Map<string, CachedTenantPool>();
    private static MAX_POOLS = 20;
    private static IDLE_EVICTION_MS = 10 * 60 * 1000; // 10 minutes

    /**
     * Resolve TenantContext and retrieve or instantiate a managed connection pool
     */
    public static async resolveTenantContext(tenantSlug: string): Promise<TenantContext> {
        const cleanSlug = (tenantSlug || 'default').toLowerCase().trim();

        // 1. If master/default, return master pool
        if (cleanSlug === 'default' || cleanSlug === 'grand-palace') {
            return {
                tenantSlug: 'grand-palace',
                tenantName: 'Grand Palace Hotel & Resort (HQ)',
                dbName: 'postgres',
                pool: pgPool,
                isCentral: true
            };
        }

        // 2. Check LRU Cache
        const cached = this.pools.get(cleanSlug);
        if (cached) {
            cached.lastAccessed = Date.now();
            return {
                tenantSlug: cleanSlug,
                tenantName: cached.tenantName,
                dbName: cached.dbName,
                pool: cached.pool,
                isCentral: false
            };
        }

        // 3. Query Central Tenants Registry
        const res = await pgPool.query(
            `SELECT slug, name, db_name, db_host, db_port, db_user, db_pass, db_ssl, status 
             FROM central_tenants WHERE slug = $1`,
            [cleanSlug]
        );

        if (res.rows.length === 0) {
            throw new Error(`Tenant '${cleanSlug}' not found in Central Multi-Tenant Registry.`);
        }

        const t = res.rows[0];
        if (t.status === 'SUSPENDED') {
            throw new Error(`Tenant '${cleanSlug}' is currently suspended. Contact System Administrator.`);
        }

        // 4. Evict oldest pool if capacity exceeded
        if (this.pools.size >= this.MAX_POOLS) {
            this.evictOldestPool();
        }

        // 5. Construct isolated tenant connection pool
        const connString = `postgresql://${t.db_user}:${encodeURIComponent(t.db_pass)}@${t.db_host}:${t.db_port}/${t.db_name}${t.db_ssl ? '?sslmode=require' : ''}`;
        
        const tenantPool = new PoolClass({
            connectionString: connString,
            max: 5, // strict conservative pool per isolated tenant to prevent DB connection exhaustion
            idleTimeoutMillis: 15000,
            connectionTimeoutMillis: 8000,
            ssl: t.db_ssl ? { rejectUnauthorized: false } : undefined
        });

        // Test connection
        const client = await tenantPool.connect();
        try {
            await client.query('SELECT 1;');
        } finally {
            client.release();
        }

        this.pools.set(cleanSlug, {
            pool: tenantPool,
            lastAccessed: Date.now(),
            dbName: t.db_name,
            tenantName: t.name
        });

        return {
            tenantSlug: cleanSlug,
            tenantName: t.name,
            dbName: t.db_name,
            pool: tenantPool,
            isCentral: false
        };
    }

    /**
     * Evict oldest pool in LRU cache
     */
    private static evictOldestPool(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        for (const [key, item] of this.pools.entries()) {
            if (item.lastAccessed < oldestTime) {
                oldestTime = item.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            const evicted = this.pools.get(oldestKey);
            if (evicted) {
                evicted.pool.end().catch(() => {});
            }
            this.pools.delete(oldestKey);
            console.log(`🧹 [LRU Connection Manager] Evicted tenant pool '${oldestKey}' to preserve connection limits.`);
        }
    }

    /**
     * Automated Provisioning: Creates an isolated physical PostgreSQL database for a new Tenant,
     * installs DDL schemas, creates default property inventory, and registers with central control plane.
     */
    public static async provisionTenantDatabase(params: {
        slug: string;
        name: string;
        adminName?: string;
        adminEmail?: string;
        address?: string;
        city?: string;
        totalRooms?: number;
    }): Promise<{ success: boolean; tenantSlug: string; dbName: string; message: string }> {
        const rawSlug = params.slug.toLowerCase().replace(/[^a-z0-9_-]/g, '').trim();
        if (!rawSlug || rawSlug.length < 3) {
            throw new Error('Tenant slug must be at least 3 alphanumeric characters.');
        }

        // Check if slug already exists
        const existing = await pgPool.query('SELECT slug FROM central_tenants WHERE slug = $1', [rawSlug]);
        if (existing.rows.length > 0) {
            throw new Error(`Tenant slug '${rawSlug}' is already registered in Central Directory.`);
        }

        const dbName = `tenant_${rawSlug.replace(/-/g, '_')}`;

        // 1. Create isolated physical database on cluster
        console.log(`🏗️ [Tenant Provisioning] Creating isolated physical database: ${dbName}...`);
        await pgPool.query(`CREATE DATABASE "${dbName}";`);

        // Extract connection details from master database
        const masterHost = process.env.PGHOST || '2ee5ogtas24zphhs.gateway01.us-east-1.prod.aws.pg.tidbcloud.com';
        const masterPort = parseInt(process.env.PGPORT || '5432', 10);
        const masterUser = process.env.PGUSER || '2ee5ogtas24zphhs.postgres';
        const masterPass = process.env.PGPASSWORD || 'eG15kbUDFmqKTqH6oig7B2dmh9ZruSCm';
        const isSsl = true;

        const newDbConnectionString = `postgresql://${masterUser}:${encodeURIComponent(masterPass)}@${masterHost}:${masterPort}/${dbName}?sslmode=require`;

        const newDbPool = new PoolClass({
            connectionString: newDbConnectionString,
            ssl: { rejectUnauthorized: false }
        });

        try {
            const client = await newDbPool.connect();
            try {
                // 2. Install DDL Schema
                console.log(`📐 [Tenant Provisioning] Installing DDL Schema into ${dbName}...`);
                const schemaSql = getPostgresSchemaSql();
                await client.query(schemaSql);

                // 3. Seed initial isolated tenant organization and property first
                console.log(`🌱 [Tenant Provisioning] Seeding isolated property master data...`);
                const orgRes = await client.query(`
                    INSERT INTO organizations (code, name, base_currency, subscription_plan)
                    VALUES ($1, $2, 'BDT', 'ENTERPRISE')
                    RETURNING id;
                `, [`ORG-${rawSlug.toUpperCase()}`, params.name]);
                const orgId = orgRes.rows[0].id;

                const propRes = await client.query(`
                    INSERT INTO properties (organization_id, code, name, address, city, phone, email, currency)
                    VALUES ($1, $2, $3, $4, $5, '+880 1700-000000', $6, 'BDT')
                    RETURNING id;
                `, [
                    orgId,
                    `PROP-${rawSlug.toUpperCase()}`,
                    params.name,
                    params.address || `${params.city || 'Cox\'s Bazar'}, Bangladesh`,
                    params.city || 'Cox\'s Bazar',
                    params.adminEmail || `${rawSlug}@hotel.com`
                ]);
                const propId = propRes.rows[0].id;

                // 4. Install Extended Rates, Packages, and Connecting Rooms (now that property 1 exists)
                await ensureRatesAndExtendedTablesPostgres(newDbPool);

                // Create initial buildings and floors
                const bldRes = await client.query(`
                    INSERT INTO buildings (property_id, code, name)
                    VALUES ($1, 'BLD-1', 'Main Tower')
                    RETURNING id;
                `, [propId]);
                const bldId = bldRes.rows[0].id;

                const flr1Res = await client.query(`
                    INSERT INTO floors (building_id, floor_number, name)
                    VALUES ($1, 1, 'Floor 1 - Executive')
                    RETURNING id;
                `, [bldId]);
                const flr1Id = flr1Res.rows[0].id;

                // Create default room types
                const rtRes = await client.query(`
                    INSERT INTO room_types (property_id, code, name, base_occupancy, max_adults, max_children, base_rate, extra_bed_rate)
                    VALUES ($1, 'DLX-KNG', 'Deluxe King', 2, 2, 1, 4500.00, 1000.00),
                           ($1, 'SUP-TWN', 'Superior Twin', 2, 2, 0, 3800.00, 1000.00),
                           ($1, 'EXE-STE', 'Executive Suite', 2, 3, 2, 8500.00, 1500.00)
                    RETURNING id;
                `, [propId]);
                const defaultRtId = rtRes.rows[0].id;

                // Seed initial starter rooms
                const roomCount = Math.min(params.totalRooms || 12, 30);
                for (let i = 1; i <= roomCount; i++) {
                    const roomNo = `1${String(i).padStart(2, '0')}`;
                    await client.query(`
                        INSERT INTO rooms (property_id, building_id, floor_id, room_type_id, room_number, name, status, housekeeping_status)
                        VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', 'CLEAN')
                        ON CONFLICT DO NOTHING;
                    `, [propId, bldId, flr1Id, defaultRtId, roomNo, `Room ${roomNo}`]);
                }

                console.log(`✅ [Tenant Provisioning] ${roomCount} initial rooms seeded in ${dbName}.`);
            } finally {
                client.release();
            }
        } finally {
            await newDbPool.end();
        }

        // 5. Register in Central Registry
        await pgPool.query(`
            INSERT INTO central_tenants (
                slug, name, db_name, db_host, db_port, db_user, db_pass, db_ssl, 
                status, subscription_tier, admin_name, admin_email
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', 'ENTERPRISE', $9, $10);
        `, [
            rawSlug,
            params.name,
            dbName,
            masterHost,
            masterPort,
            masterUser,
            masterPass,
            isSsl,
            params.adminName || 'Property General Manager',
            params.adminEmail || `${rawSlug}@hotel.com`
        ]);

        // 6. Record Initial Metrics
        await pgPool.query(`
            INSERT INTO central_tenant_metrics (tenant_slug, total_rooms, occupied_rooms, revenue_bdt)
            VALUES ($1, $2, 0, 0.00)
            ON CONFLICT (tenant_slug) DO NOTHING;
        `, [rawSlug, params.totalRooms || 12]);

        return {
            success: true,
            tenantSlug: rawSlug,
            dbName,
            message: `Isolated database '${dbName}' created and provisioned with DDL schema and hotel assets!`
        };
    }

    /**
     * Execute an isolated migration or SQL command exclusively within a target Tenant Database
     */
    public static async executeTenantMigration(tenantSlug: string, sql: string): Promise<{ success: boolean; rowsAffected: number; output: string }> {
        const context = await this.resolveTenantContext(tenantSlug);
        const client = await context.pool.connect();
        try {
            await client.query('BEGIN');
            const res = await client.query(sql);
            await client.query('COMMIT');
            return {
                success: true,
                rowsAffected: res.rowCount || 0,
                output: `Successfully executed in isolated database '${context.dbName}'.`
            };
        } catch (err: any) {
            await client.query('ROLLBACK');
            throw new Error(`Migration failed on tenant database '${context.dbName}': ${err.message}`);
        } finally {
            client.release();
        }
    }

    /**
     * Inspect tenant isolated database health, latency and room counts
     */
    public static async checkTenantHealth(tenantSlug: string): Promise<{
        status: string;
        tenantSlug: string;
        dbName: string;
        latencyMs: number;
        roomCount: number;
        bookingCount: number;
    }> {
        const start = Date.now();
        const context = await this.resolveTenantContext(tenantSlug);
        const client = await context.pool.connect();
        try {
            const roomRes = await client.query('SELECT COUNT(*) as c FROM rooms;');
            const bookRes = await client.query('SELECT COUNT(*) as c FROM reservations;');
            const latencyMs = Date.now() - start;

            return {
                status: 'HEALTHY',
                tenantSlug,
                dbName: context.dbName,
                latencyMs,
                roomCount: parseInt(roomRes.rows[0]?.c || '0', 10),
                bookingCount: parseInt(bookRes.rows[0]?.c || '0', 10)
            };
        } finally {
            client.release();
        }
    }

    /**
     * Terminate connections, drop physical database, and unregister from Central Directory
     */
    public static async dropTenantDatabase(tenantSlug: string): Promise<{ success: boolean; message: string }> {
        const cleanSlug = tenantSlug.toLowerCase().trim();
        if (cleanSlug === 'default' || cleanSlug === 'grand-palace') {
            throw new Error('Cannot drop the primary/central master database!');
        }

        // Close pool if cached
        const cached = this.pools.get(cleanSlug);
        if (cached) {
            await cached.pool.end().catch(() => {});
            this.pools.delete(cleanSlug);
        }

        const res = await pgPool.query('SELECT db_name FROM central_tenants WHERE slug = $1', [cleanSlug]);
        const dbName = res.rows[0]?.db_name || `tenant_${cleanSlug.replace(/-/g, '_')}`;

        // Terminate any active connections to the target DB
        try {
            await pgPool.query(`
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = $1 AND pid <> pg_backend_pid();
            `, [dbName]);
        } catch {}

        // Drop physical database
        await pgPool.query(`DROP DATABASE IF EXISTS "${dbName}";`);

        // Remove from central tables
        await pgPool.query('DELETE FROM central_tenants WHERE slug = $1', [cleanSlug]);

        return {
            success: true,
            message: `Isolated database '${dbName}' dropped and tenant '${cleanSlug}' unregistered.`
        };
    }
}
