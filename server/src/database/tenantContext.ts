import { AsyncLocalStorage } from 'async_hooks';
import type { Pool } from 'pg';

export interface TenantContext {
    tenantSlug: string;
    tenantName: string;
    dbName: string;
    pool: Pool;
    isCentral?: boolean;
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Returns the currently active tenant execution context, or undefined if outside a tenant request
 */
export function getActiveTenantContext(): TenantContext | undefined {
    return tenantLocalStorage.getStore();
}

/**
 * Returns the active tenant connection pool, or gracefully falls back to the default master pool
 */
export function getActiveTenantPool(fallbackPool: Pool): Pool {
    const store = tenantLocalStorage.getStore();
    return store?.pool || fallbackPool;
}

/**
 * Returns the active tenant slug
 */
export function getActiveTenantSlug(): string {
    const store = tenantLocalStorage.getStore();
    return store?.tenantSlug || 'default';
}
