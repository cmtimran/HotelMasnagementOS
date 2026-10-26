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
 * Sanitizes and converts legacy SQL dialects to standard ANSI / PostgreSQL Dialect
 */
export function convertSql(sql: string): string {
    let index = 1;
    // 1. Replace ? placeholders with $1, $2, $3...
    let converted = sql.replace(/\?/g, () => `$${index++}`);

    // 2. Convert date/time functions to standard PostgreSQL functions
    converted = converted.replace(/date\('now'\)/gi, 'CURRENT_DATE');
    converted = converted.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');

    // 3. Convert date arithmetic like date(col, '+2 days') to (col + INTERVAL '2 days')::date
    converted = converted.replace(/date\(\s*([a-zA-Z0-9_\.]+)\s*,\s*'\+(\d+)\s+days?'\s*\)/gi, "($1 + INTERVAL '$2 days')::date");
    converted = converted.replace(/date\(\s*([a-zA-Z0-9_\.]+)\s*\)/gi, '($1)::date');

    // 4. Convert legacy INSERT OR IGNORE / REPLACE
    converted = converted.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    converted = converted.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');

    return converted;
}

/**
 * Atomic Thread-Safe Daily Sequence Generator using PostgreSQL
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
 * Unified Database Client operating with Dynamic Multi-Tenant Database Routing
 */
export const db = {
    query: async (sql: string, params: any[] = []): Promise<any> => {
        const pool = getActiveTenantPool(pgPool);
        const converted = convertSql(sql);
        return await pool.query(converted, params);
    },

    all: async (sql: string, params: any[] = []): Promise<any[]> => {
        const pool = getActiveTenantPool(pgPool);
        const converted = convertSql(sql);
        const res = await pool.query(converted, params);
        return res.rows;
    },

    get: async (sql: string, params: any[] = []): Promise<any> => {
        const pool = getActiveTenantPool(pgPool);
        const converted = convertSql(sql);
        const res = await pool.query(converted, params);
        return res.rows[0] || null;
    },

    run: async (sql: string, params: any[] = []): Promise<{ lastInsertRowid?: number | string; rowCount: number; rows: any[] }> => {
        const pool = getActiveTenantPool(pgPool);
        let converted = convertSql(sql);
        const isInsert = /^\s*INSERT\s+INTO/i.test(converted);
        const hasReturning = /RETURNING/i.test(converted);
        if (isInsert && !hasReturning) {
            converted += ' RETURNING id';
        }
        try {
            const res = await pool.query(converted, params);
            const lastInsertRowid = res.rows[0]?.id;
            return {
                lastInsertRowid,
                rowCount: res.rowCount || 0,
                rows: res.rows
            };
        } catch (e: any) {
            // If RETURNING id failed because table has no id column, retry without RETURNING
            if (isInsert && !hasReturning && e?.code === '42703') { // undefined_column
                const retrySql = convertSql(sql);
                const retryRes = await pool.query(retrySql, params);
                return {
                    rowCount: retryRes.rowCount || 0,
                    rows: retryRes.rows
                };
            }
            throw e;
        }
    },

    exec: async (sql: string): Promise<void> => {
        const pool = getActiveTenantPool(pgPool);
        await pool.query(sql);
    },

    prepare: (sql: string) => {
        return {
            all: async (...params: any[]): Promise<any[]> => {
                const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
                return await db.all(sql, flatParams);
            },
            get: async (...params: any[]): Promise<any> => {
                const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
                return await db.get(sql, flatParams);
            },
            run: async (...params: any[]): Promise<{ lastInsertRowid?: number | string; rowCount: number; rows: any[] }> => {
                const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
                return await db.run(sql, flatParams);
            }
        };
    }
};
