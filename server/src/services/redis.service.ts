import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;
const PMS_CHANNEL = 'HOTEL_PMS_REALTIME_BUS';

let pubClient: Redis | null = null;
let subClient: Redis | null = null;
let redisActive = false;

export const isRedisConnected = (): boolean => redisActive;

/**
 * Initialize Redis Pub/Sub cluster bus
 */
export async function initRedis(onMessageCallback?: (event: any) => void): Promise<boolean> {
    try {
        pubClient = new Redis(REDIS_URL, {
            lazyConnect: true,
            connectTimeout: 2500,
            maxRetriesPerRequest: 1,
            retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 1000, 3000))
        });

        subClient = new Redis(REDIS_URL, {
            lazyConnect: true,
            connectTimeout: 2500,
            maxRetriesPerRequest: 1,
            retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 1000, 3000))
        });

        pubClient.on('error', (err: any) => {
            if (redisActive) {
                console.warn(`[Redis] Pub connection error: ${err.message}`);
                redisActive = false;
            }
        });

        subClient.on('error', (err: any) => {
            if (redisActive) {
                console.warn(`[Redis] Sub connection error: ${err.message}`);
                redisActive = false;
            }
        });

        await Promise.all([pubClient.connect(), subClient.connect()]);

        redisActive = true;
        console.log(`🔴 [Redis 7] Cluster Bus connected successfully at ${REDIS_URL}!`);

        // Subscribe to cross-node cluster channel
        await subClient.subscribe(PMS_CHANNEL);
        console.log(`📡 [Redis 7] Subscribed to real-time sync channel: '${PMS_CHANNEL}'`);

        subClient.on('message', (channel: string, message: string) => {
            if (channel === PMS_CHANNEL && onMessageCallback) {
                try {
                    const parsed = JSON.parse(message);
                    onMessageCallback(parsed);
                } catch (e) {
                    console.error('[Redis] Failed to parse cluster message', e);
                }
            }
        });

        return true;
    } catch (err: any) {
        redisActive = false;
        console.warn(`ℹ️ [Redis 7] Server offline or unreachable (${err.message}).`);
        console.warn('   Using in-memory SSE event bus for local multi-terminal synchronization.');
        return false;
    }
}

/**
 * Publish real-time event across all server instances via Redis Pub/Sub
 */
export async function publishRedisEvent(event: any): Promise<boolean> {
    if (!redisActive || !pubClient) {
        return false;
    }

    try {
        const payload = JSON.stringify({
            ...event,
            nodeId: process.pid,
            redisTimestamp: Date.now()
        });
        await pubClient.publish(PMS_CHANNEL, payload);
        return true;
    } catch (err) {
        console.warn('[Redis] Failed to publish message', err);
        return false;
    }
}

export function getRedisClient(): Redis | null {
    return pubClient;
}
