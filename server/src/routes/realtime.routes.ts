import { Router, type Request, type Response } from 'express';
import { publishRedisEvent, isRedisConnected } from '../services/redis.service.js';
import { redlockService } from '../services/redlock.service.js';

const router = Router();

interface ConnectedClient {
    id: string;
    terminalName: string;
    propertyId: string;
    res: Response;
    connectedAt: number;
}

const clients = new Map<string, ConnectedClient>();

// Keep-alive heartbeat ping every 15 seconds to prevent network timeouts
setInterval(() => {
    const pingData = `data: ${JSON.stringify({ type: 'HEARTBEAT_PING', timestamp: Date.now() })}\n\n`;
    for (const [id, client] of clients.entries()) {
        try {
            client.res.write(pingData);
        } catch {
            clients.delete(id);
        }
    }
}, 15000);

/**
 * SSE Endpoint: PC-1, PC-2, PC-3 connect here to receive sub-second updates
 */
router.get('/stream', (req: Request, res: Response) => {
    const terminalName = (req.query.terminal as string) || `Terminal-${Math.random().toString(36).substring(2, 6)}`;
    const propertyId = (req.query.propertyId as string) || 'prop_grand_palace';
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    // Send initial handshake
    res.write(`data: ${JSON.stringify({
        type: 'SYNC_HANDSHAKE',
        clientId,
        terminalName,
        propertyId,
        connectedClientsCount: clients.size + 1,
        isRedisClustered: isRedisConnected(),
        timestamp: Date.now()
    })}\n\n`);

    clients.set(clientId, {
        id: clientId,
        terminalName,
        propertyId,
        res,
        connectedAt: Date.now()
    });

    // Notify other terminals that a new PC connected (scoped to property)
    const joinEvent = JSON.stringify({
        type: 'TERMINAL_CONNECTED',
        clientId,
        terminalName,
        propertyId,
        connectedCount: clients.size,
        timestamp: Date.now()
    });
    for (const [id, client] of clients.entries()) {
        if (id !== clientId && (!propertyId || !client.propertyId || String(client.propertyId) === String(propertyId))) {
            try {
                client.res.write(`data: ${joinEvent}\n\n`);
            } catch {
                clients.delete(id);
            }
        }
    }

    req.on('close', () => {
        clients.delete(clientId);
        const leaveEvent = JSON.stringify({
            type: 'TERMINAL_DISCONNECTED',
            clientId,
            terminalName,
            propertyId,
            connectedCount: clients.size,
            timestamp: Date.now()
        });
        for (const [id, client] of clients.entries()) {
            if (!propertyId || !client.propertyId || String(client.propertyId) === String(propertyId)) {
                try {
                    client.res.write(`data: ${leaveEvent}\n\n`);
                } catch {
                    clients.delete(id);
                }
            }
        }
    });
});

/**
 * Programmatic Server-Side Event Broadcaster
 * Can be called by controllers, services, or internal audit daemons to emit real-time events to all connected terminals.
 * Automatically fans out across the entire cluster using Redis Pub/Sub with Multi-Tenant isolation!
 */
export function broadcastServerEvent(event: any, senderClientId?: string): number {
    const payload = JSON.stringify({
        ...event,
        serverTimestamp: Date.now(),
        senderClientId: senderClientId || 'SERVER_DAEMON'
    });

    const targetPropertyId = event?.propertyId ? String(event.propertyId) : undefined;

    let deliveredCount = 0;
    for (const [id, client] of clients.entries()) {
        if (senderClientId && id === senderClientId) continue;

        // Multi-Tenant Isolation: If target propertyId specified, only send to terminals connected to same property
        if (targetPropertyId && client.propertyId && client.propertyId !== 'all' && String(client.propertyId) !== targetPropertyId) {
            continue;
        }

        try {
            client.res.write(`data: ${payload}\n\n`);
            deliveredCount++;
        } catch {
            clients.delete(id);
        }
    }

    // Propagate to other backend nodes across the cluster via Redis Pub/Sub
    if (senderClientId !== 'REDIS_CLUSTER') {
        publishRedisEvent(event).catch(() => {});
    }

    return deliveredCount;
}

/**
 * Broadcast Endpoint: Called when any PC creates, drags, resizes, or updates a reservation
 */
router.post('/broadcast', (req: Request, res: Response) => {
    const { senderClientId, event } = req.body;

    if (!event || !event.type) {
        res.status(400).json({ success: false, error: 'Invalid event payload' });
        return;
    }

    const deliveredCount = broadcastServerEvent(event, senderClientId);

    res.json({
        success: true,
        deliveredCount,
        totalConnected: clients.size,
        isRedisClustered: isRedisConnected(),
        timestamp: Date.now()
    });
});

/**
 * Active Status & Terminals list
 */
router.get('/status', (_req: Request, res: Response) => {
    const terminals = Array.from(clients.values()).map(c => ({
        id: c.id,
        terminalName: c.terminalName,
        propertyId: c.propertyId,
        connectedAt: c.connectedAt
    }));

    res.json({
        success: true,
        onlineCount: clients.size,
        isRedisClustered: isRedisConnected(),
        terminals
    });
});

// ============================================================================
// DISTRIBUTED REDLOCK ENDPOINTS (ZERO-OVERBOOKING ENGINE)
// ============================================================================

/**
 * POST /api/realtime/locks/acquire
 * Acquire distributed lock for a room or date inventory
 */
router.post('/locks/acquire', async (req: Request, res: Response) => {
    try {
        const { resource, holder, ttlMs } = req.body;
        if (!resource) {
            return res.status(400).json({ success: false, error: 'Resource name required' });
        }
        const result = await redlockService.acquireLock(resource, holder, ttlMs);
        if (!result.success) {
            return res.status(409).json({ success: false, error: result.reason });
        }
        res.json({ success: true, lock: result.lock });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

/**
 * POST /api/realtime/locks/release
 * Release distributed lock
 */
router.post('/locks/release', async (req: Request, res: Response) => {
    try {
        const { resource, lockToken } = req.body;
        if (!resource || !lockToken) {
            return res.status(400).json({ success: false, error: 'Resource and lockToken required' });
        }
        const released = await redlockService.releaseLock(resource, lockToken);
        res.json({ success: released });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

/**
 * GET /api/realtime/locks
 * List currently held distributed locks
 */
router.get('/locks', async (_req: Request, res: Response) => {
    try {
        const locks = await redlockService.getActiveLocks();
        res.json({ 
            success: true, 
            count: locks.length, 
            locks, 
            isRedisActive: isRedisConnected() 
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

export default router;
