import { pgPool, initPostgres, isPostgresConnected } from './postgres.js';
import { getActiveTenantPool } from './tenantContext.js';
import { ensureCentralSchema } from './centralSchema.js';

export { pgPool, isPostgresConnected };

/**
 * Initialize Relational Database via Cloud PostgreSQL Engine and Central Control Plane
 */
export const initDatabase = async (): Promise<void> => {
    console.log('🐘 Initializing Sole Database Engine: Cloud PostgreSQL 17...');
    await initPostgres();
    // Initialize Central Multi-Tenant Registry & Schema
    await ensureCentralSchema(pgPool);
};

/**
 * Atomic Thread-Safe Daily Sequence Generator using Native PostgreSQL
 */
export async function getNextDailySequence(seqType: string, dateStr?: string): Promise<number> {
    const today = dateStr || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const pool = getActiveTenantPool(pgPool);
    try {
        const res = await pool.query(`
            INSERT INTO daily_sequences (seq_date, seq_type, current_val)
            VALUES ($1, $2, 1)
            ON CONFLICT (seq_date, seq_type)
            DO UPDATE SET current_val = daily_sequences.current_val + 1
            RETURNING current_val;
        `, [today, seqType]);
        return Number(res.rows[0]?.current_val) || 1;
    } catch (err: any) {
        console.warn('getNextDailySequence notice:', err?.message);
        return 1;
    }
}

export async function generateMasterReservationNumber(dateStr?: string): Promise<string> {
    const dStr = dateStr || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = await getNextDailySequence('RES', dStr);
    return `RES-${dStr}${String(seq).padStart(4, '0')}`;
}

export async function generateGroupCode(dateStr?: string): Promise<string> {
    const dStr = dateStr || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = await getNextDailySequence('GRP', dStr);
    return `GRP-${dStr}-${String(seq).padStart(4, '0')}`;
}

/**
 * Unified Database Client operating with Dynamic Multi-Tenant PostgreSQL Connection Routing
 */
export const db = {
    query: async (sql: string, params: any[] = []): Promise<any> => {
        const pool = getActiveTenantPool(pgPool);
        return await pool.query(sql, params);
    },

    all: async (sql: string, params: any[] = []): Promise<any[]> => {
        const pool = getActiveTenantPool(pgPool);
        const res = await pool.query(sql, params);
        return res.rows;
    },

    get: async (sql: string, params: any[] = []): Promise<any> => {
        const pool = getActiveTenantPool(pgPool);
        const res = await pool.query(sql, params);
        return res.rows[0] || null;
    },

    run: async (sql: string, params: any[] = []): Promise<{ lastInsertRowid?: number | string; rowCount: number; rows: any[] }> => {
        const pool = getActiveTenantPool(pgPool);
        const res = await pool.query(sql, params);
        return {
            lastInsertRowid: res.rows[0]?.id,
            rowCount: res.rowCount || 0,
            rows: res.rows
        };
    },

    exec: async (sql: string): Promise<void> => {
        const pool = getActiveTenantPool(pgPool);
        await pool.query(sql);
    }
};
