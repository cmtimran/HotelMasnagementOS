/**
 * PMS Network Real-Time Synchronization Engine (Multi-PC / Multi-Terminal LAN & Cloud)
 * 
 * Enables nanosecond/millisecond real-time synchronization across multiple physical PCs
 * running StayView, Add Reservation, and Quick Reservation.
 * 
 * Features:
 * 1. Native HTTP Server-Sent Events (SSE) listener with automatic reconnect & exponential backoff.
 * 2. Instant non-blocking HTTP Broadcast emitter.
 * 3. Fallback to browser BroadcastChannel for local cross-tab communication.
 * 4. Distinct Terminal ID generation & peer presence detection.
 */

import { broadcastPMSEvent as localBroadcast, type PMSBroadcastMessage } from './roomInventoryEngine';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname || 'localhost'}:3001`;

// Get or generate persistent Terminal ID for this physical machine
export const getTerminalId = (): string => {
    let tid = localStorage.getItem('hotel_pms_terminal_id');
    if (!tid) {
        tid = `Terminal-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        localStorage.setItem('hotel_pms_terminal_id', tid);
    }
    return tid;
};

export interface SyncStatus {
    isConnected: boolean;
    mode: 'LAN/Cloud Network' | 'Local Browser Only';
    terminalId: string;
    connectedTerminalsCount: number;
    lastSyncedAt: number;
}

type SyncStatusListener = (status: SyncStatus) => void;
const statusListeners = new Set<SyncStatusListener>();

let currentStatus: SyncStatus = {
    isConnected: false,
    mode: 'Local Browser Only',
    terminalId: getTerminalId(),
    connectedTerminalsCount: 1,
    lastSyncedAt: Date.now()
};

const notifyStatus = () => {
    statusListeners.forEach(listener => {
        try {
            listener({ ...currentStatus });
        } catch (err) {
            console.error('Error in status listener:', err);
        }
    });
};

export const subscribeToSyncStatus = (callback: SyncStatusListener): (() => void) => {
    statusListeners.add(callback);
    callback({ ...currentStatus });
    return () => statusListeners.delete(callback);
};

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let clientId: string = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

/**
 * Initialize SSE connection to Backend PMS Gateway for cross-PC synchronization
 */
export const initNetworkSync = (): void => {
    if (typeof window === 'undefined') return;
    if (eventSource) return;

    const terminalId = getTerminalId();
    const streamUrl = `${API_BASE_URL}/api/realtime/stream?terminal=${encodeURIComponent(terminalId)}&clientId=${clientId}`;

    try {
        eventSource = new EventSource(streamUrl);

        eventSource.onopen = () => {
            currentStatus = {
                isConnected: true,
                mode: 'LAN/Cloud Network',
                terminalId,
                connectedTerminalsCount: Math.max(1, currentStatus.connectedTerminalsCount),
                lastSyncedAt: Date.now()
            };
            reconnectDelay = 1000;
            notifyStatus();
        };

        eventSource.onmessage = (messageEvent) => {
            try {
                const data = JSON.parse(messageEvent.data);
                currentStatus.lastSyncedAt = Date.now();

                if (data.type === 'SYNC_HANDSHAKE') {
                    if (data.clientId) clientId = data.clientId;
                    currentStatus.connectedTerminalsCount = data.connectedClientsCount || 1;
                    notifyStatus();
                    return;
                }

                if (data.type === 'TERMINAL_CONNECTED' || data.type === 'TERMINAL_DISCONNECTED') {
                    currentStatus.connectedTerminalsCount = data.connectedCount || 1;
                    notifyStatus();
                    return;
                }

                if (data.type === 'HEARTBEAT_PING') {
                    return;
                }

                // Discard events originating from this client (already dispatched locally)
                if (data.senderClientId && data.senderClientId === clientId) {
                    return;
                }

                // Ingest received cross-PC event and dispatch to local window
                window.dispatchEvent(new CustomEvent('hotel_pms_sync_event', { detail: data }));
            } catch (err) {
                console.error('[PMS Network Sync] Failed to parse event', err);
            }
        };

        eventSource.onerror = () => {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }

            currentStatus = {
                isConnected: false,
                mode: 'Local Browser Only',
                terminalId,
                connectedTerminalsCount: 1,
                lastSyncedAt: Date.now()
            };
            notifyStatus();

            // Schedule reconnect with exponential backoff (capped at 15s)
            if (!reconnectTimer) {
                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;
                    reconnectDelay = Math.min(reconnectDelay * 1.5, 15000);
                    initNetworkSync();
                }, reconnectDelay);
            }
        };
    } catch {
        currentStatus.isConnected = false;
        currentStatus.mode = 'Local Browser Only';
        notifyStatus();
    }
};

/**
 * Universal PMS Event Dispatcher:
 * 1. Broadcasts to local browser tabs immediately.
 * 2. Emits HTTP broadcast to Backend Gateway so all other PCs receive the update in real time.
 */
export const dispatchPMSNetworkEvent = (event: PMSBroadcastMessage): void => {
    // 1. Local broadcast across tabs on the same computer
    localBroadcast(event);

    // 2. Network broadcast to other PC terminals
    try {
        fetch(`${API_BASE_URL}/api/realtime/broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderClientId: clientId,
                event: {
                    ...event,
                    senderTerminal: getTerminalId(),
                    timestamp: Date.now()
                }
            })
        }).catch(() => {
            // Silently fall back if backend server is offline
        });
    } catch {
        // Fallback silently
    }
};
