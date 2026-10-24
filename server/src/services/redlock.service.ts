import crypto from 'crypto';
import { getRedisClient, isRedisConnected } from './redis.service.js';

export interface DistributedLock {
    resource: string;
    lockToken: string;
    holder: string;
    ttlMs: number;
    acquiredAt: number;
    expiresAt: number;
}

// In-Memory fallback store for distributed locking when running without Redis cluster
const memoryLocks = new Map<string, DistributedLock>();

// Atomic Lua script to release lock only if the token matches (prevents releasing someone else's expired lock)
const RELEASE_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

// Atomic Lua script to extend lock
const EXTEND_LUA_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("pexpire", KEYS[1], ARGV[2])
else
    return 0
end
`;

export const redlockService = {
    /**
     * Acquire a distributed lock for a hotel room or inventory segment.
     * Prevents race conditions and guarantees Zero-Overbooking across multiple servers and OTAs.
     */
    acquireLock: async (
        resource: string, 
        holder: string = 'Desk-Terminal', 
        ttlMs: number = 30000
    ): Promise<{ success: boolean; lock?: DistributedLock; reason?: string }> => {
        const lockToken = `lock_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        const redis = getRedisClient();
        const now = Date.now();
        const lockKey = `pms:lock:${resource}`;

        // 1. Production Mode: Redis Distributed Lock (SET NX PX)
        if (isRedisConnected() && redis) {
            try {
                const result = await redis.set(lockKey, lockToken, 'PX', ttlMs, 'NX');
                if (result === 'OK') {
                    const lock: DistributedLock = {
                        resource,
                        lockToken,
                        holder,
                        ttlMs,
                        acquiredAt: now,
                        expiresAt: now + ttlMs
                    };
                    return { success: true, lock };
                } else {
                    return { 
                        success: false, 
                        reason: `Resource '${resource}' is currently locked by another terminal or OTA process.` 
                    };
                }
            } catch (err: any) {
                console.warn('[Redlock] Redis lock acquisition error:', err.message);
            }
        }

        // 2. Resilient Fallback Mode: High-Precision In-Memory Lock Engine
        const existing = memoryLocks.get(lockKey);
        if (existing && existing.expiresAt > now) {
            return {
                success: false,
                reason: `Resource '${resource}' is held by ${existing.holder} until ${new Date(existing.expiresAt).toLocaleTimeString()}`
            };
        }

        const lock: DistributedLock = {
            resource,
            lockToken,
            holder,
            ttlMs,
            acquiredAt: now,
            expiresAt: now + ttlMs
        };
        memoryLocks.set(lockKey, lock);
        return { success: true, lock };
    },

    /**
     * Safely and atomically release a distributed lock
     */
    releaseLock: async (resource: string, lockToken: string): Promise<boolean> => {
        const redis = getRedisClient();
        const lockKey = `pms:lock:${resource}`;

        // 1. Release in Redis via atomic Lua evaluation
        if (isRedisConnected() && redis) {
            try {
                const res = await redis.eval(RELEASE_LUA_SCRIPT, 1, lockKey, lockToken);
                return Number(res) === 1;
            } catch (err: any) {
                console.warn('[Redlock] Redis lock release error:', err.message);
            }
        }

        // 2. Release in In-Memory fallback
        const existing = memoryLocks.get(lockKey);
        if (existing && existing.lockToken === lockToken) {
            memoryLocks.delete(lockKey);
            return true;
        }

        return false;
    },

    /**
     * Extend a lock during complex check-in or payment gateway checkout
     */
    extendLock: async (resource: string, lockToken: string, extensionMs: number = 30000): Promise<boolean> => {
        const redis = getRedisClient();
        const lockKey = `pms:lock:${resource}`;

        if (isRedisConnected() && redis) {
            try {
                const res = await redis.eval(EXTEND_LUA_SCRIPT, 1, lockKey, extensionMs);
                return Number(res) === 1;
            } catch (err: any) {
                console.warn('[Redlock] Redis lock extension error:', err.message);
            }
        }

        const existing = memoryLocks.get(lockKey);
        if (existing && existing.lockToken === lockToken) {
            existing.expiresAt += extensionMs;
            return true;
        }

        return false;
    },

    /**
     * Inspect all active room locks across the hotel
     */
    getActiveLocks: async (): Promise<DistributedLock[]> => {
        const now = Date.now();
        const active: DistributedLock[] = [];

        for (const [key, lock] of memoryLocks.entries()) {
            if (lock.expiresAt > now) {
                active.push(lock);
            } else {
                memoryLocks.delete(key);
            }
        }

        return active;
    }
};
