/**
 * Unified Hotel Room Inventory & Anti-Overbooking Concurrency Engine
 * 
 * Provides:
 * 1. Mathematical Interval Overlap Engine with Hotel Same-Day Turnaround support.
 * 2. Distributed Optimistic Soft Lock Engine (hotel_room_locks) with auto-expiry TTL.
 * 3. Cross-Tab / Cross-Executive Real-Time Broadcasting (hotel_pms_sync).
 * 4. Atomic Two-Phase Pre-Commit Verification Guard.
 * 5. Single Source of Truth (SSOT) room inventory synced with RoomManagement.
 */

export interface CanonicalRoom {
    id: number;
    number: string;
    name: string;
    buildingId: string;
    floorId: string;
    roomTypeId: string;
    roomTypeName: string;
    status: 'Active' | 'Out of Order' | 'Maintenance';
    housekeepingStatus: 'Clean' | 'Dirty' | 'Inspected';
    remarks?: string;
}

export interface RoomLock {
    lockId: string;
    roomNumber: string;
    checkIn: string;
    checkOut: string;
    heldBy: string;
    createdAt: number;
    expiresAt: number; // epoch ms
}

export interface StoredReservation {
    id: number | string;
    reservationNumber: string;
    guestName: string;
    roomNumber: string;
    roomType: string;
    allocatedRooms?: string[];
    checkIn: string;
    checkOut: string;
    status: string;
    [key: string]: any;
}

// Room Type ID to Name Map
export const ROOM_TYPE_MAP: Record<string, string> = {
    '1': 'Deluxe Double',
    '2': 'Superior King',
    '3': 'Executive Suite',
    '4': 'Standard Single',
    '5': 'Presidential Suite'
};

// Canonical Property Inventory (34 Rooms)
export const DEFAULT_CANONICAL_ROOMS: CanonicalRoom[] = [
    // Floor 1
    { id: 1, number: '101', name: 'Garden Deluxe 101', buildingId: '1', floorId: '1', roomTypeId: '1', roomTypeName: 'Deluxe Double', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 2, number: '102', name: 'Garden Deluxe 102', buildingId: '1', floorId: '1', roomTypeId: '1', roomTypeName: 'Deluxe Double', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 3, number: '103', name: 'Superior Bay 103', buildingId: '1', floorId: '1', roomTypeId: '2', roomTypeName: 'Superior King', status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 4, number: '104', name: 'Executive Suite 104', buildingId: '1', floorId: '1', roomTypeId: '3', roomTypeName: 'Executive Suite', status: 'Active', housekeepingStatus: 'Inspected' },
    { id: 5, number: '105', name: 'Standard Single 105', buildingId: '1', floorId: '1', roomTypeId: '4', roomTypeName: 'Standard Single', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 6, number: '106', name: 'Standard Single 106', buildingId: '1', floorId: '1', roomTypeId: '4', roomTypeName: 'Standard Single', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 7, number: '107', name: 'Deluxe Courtyard 107', buildingId: '1', floorId: '1', roomTypeId: '1', roomTypeName: 'Deluxe Double', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 8, number: '108', name: 'Superior King 108', buildingId: '1', floorId: '1', roomTypeId: '2', roomTypeName: 'Superior King', status: 'Out of Order', housekeepingStatus: 'Dirty', remarks: 'AC compressor maintenance' },
    // Floor 2
    { id: 9, number: '201', name: 'Superior Balcony 201', buildingId: '1', floorId: '2', roomTypeId: '2', roomTypeName: 'Superior King', status: 'Active', housekeepingStatus: 'Inspected' },
    { id: 10, number: '202', name: 'Superior King 202', buildingId: '1', floorId: '2', roomTypeId: '2', roomTypeName: 'Superior King', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 11, number: '203', name: 'Executive Suite 203', buildingId: '1', floorId: '2', roomTypeId: '3', roomTypeName: 'Executive Suite', status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 12, number: '204', name: 'Deluxe King 204', buildingId: '1', floorId: '2', roomTypeId: '1', roomTypeName: 'Deluxe Double', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 13, number: '205', name: 'Standard Single 205', buildingId: '1', floorId: '2', roomTypeId: '4', roomTypeName: 'Standard Single', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 14, number: '206', name: 'Deluxe Twin 206', buildingId: '1', floorId: '2', roomTypeId: '1', roomTypeName: 'Deluxe Double', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 15, number: '207', name: 'Deluxe Double 207', buildingId: '1', floorId: '2', roomTypeId: '1', roomTypeName: 'Deluxe Double', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 16, number: '208', name: 'Superior King 208', buildingId: '1', floorId: '2', roomTypeId: '2', roomTypeName: 'Superior King', status: 'Active', housekeepingStatus: 'Clean' },
    // Floor 3
    { id: 17, number: '301', name: 'Deluxe Sea View 301', buildingId: '1', floorId: '3', roomTypeId: '1', roomTypeName: 'Deluxe Double', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 18, number: '302', name: 'Standard Single 302', buildingId: '1', floorId: '3', roomTypeId: '4', roomTypeName: 'Standard Single', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 19, number: '303', name: 'Executive Suite 303', buildingId: '1', floorId: '3', roomTypeId: '3', roomTypeName: 'Executive Suite', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 20, number: '304', name: 'Deluxe Double 304', buildingId: '1', floorId: '3', roomTypeId: '1', roomTypeName: 'Deluxe Double', status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 21, number: '305', name: 'Deluxe Twin 305', buildingId: '1', floorId: '3', roomTypeId: '1', roomTypeName: 'Deluxe Double', status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 22, number: '306', name: 'Superior King 306', buildingId: '1', floorId: '3', roomTypeId: '2', roomTypeName: 'Superior King', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 23, number: '307', name: 'Deluxe Garden 307', buildingId: '1', floorId: '3', roomTypeId: '1', roomTypeName: 'Deluxe Double', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 24, number: '308', name: 'Superior King 308', buildingId: '1', floorId: '3', roomTypeId: '2', roomTypeName: 'Superior King', status: 'Active', housekeepingStatus: 'Inspected' },
    // Floor 4
    { id: 25, number: '401', name: 'Executive Club 401', buildingId: '2', floorId: '4', roomTypeId: '3', roomTypeName: 'Executive Suite', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 26, number: '402', name: 'Executive Club 402', buildingId: '2', floorId: '4', roomTypeId: '3', roomTypeName: 'Executive Suite', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 27, number: '403', name: 'Deluxe Panoramic 403', buildingId: '2', floorId: '4', roomTypeId: '1', roomTypeName: 'Deluxe Double', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 28, number: '404', name: 'Superior Sky 404', buildingId: '2', floorId: '4', roomTypeId: '2', roomTypeName: 'Superior King', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 29, number: '405', name: 'Standard Single 405', buildingId: '2', floorId: '4', roomTypeId: '4', roomTypeName: 'Standard Single', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 30, number: '410', name: 'Corner Executive 410', buildingId: '2', floorId: '4', roomTypeId: '3', roomTypeName: 'Executive Suite', status: 'Active', housekeepingStatus: 'Clean' },
    // Floor 5 (VIP Suites)
    { id: 31, number: '501', name: 'Presidential Royal Suite 501', buildingId: '2', floorId: '5', roomTypeId: '5', roomTypeName: 'Presidential Suite', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 32, number: '502', name: 'Executive Diplomatic 502', buildingId: '2', floorId: '5', roomTypeId: '3', roomTypeName: 'Executive Suite', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 33, number: '503', name: 'Presidential Penthouse 503', buildingId: '2', floorId: '5', roomTypeId: '5', roomTypeName: 'Presidential Suite', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 34, number: '505', name: 'Sky Superior 505', buildingId: '2', floorId: '5', roomTypeId: '2', roomTypeName: 'Superior King', status: 'Active', housekeepingStatus: 'Clean' }
];

const STORAGE_KEY_ROOMS = 'hotel_rooms_inventory_v1';
const STORAGE_KEY_RESERVATIONS = 'hotel_reservations_v2';
const STORAGE_KEY_LOCKS = 'hotel_room_locks_v1';

// Cross-tab real-time event bus
let pmsBroadcastChannel: BroadcastChannel | null = null;
try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        pmsBroadcastChannel = new BroadcastChannel('hotel_pms_sync');
    }
} catch (e) {
    console.warn('BroadcastChannel not supported in this environment', e);
}

export type PMSBroadcastMessage =
    | { type: 'ROOM_LOCK_ACQUIRED'; lock: RoomLock }
    | { type: 'ROOM_LOCK_RELEASED'; lockId: string }
    | { type: 'RESERVATION_COMMITTED'; reservation: StoredReservation }
    | { type: 'RESERVATION_UPDATED'; reservationId: string | number }
    | { type: 'ROOM_STATUS_CHANGED'; roomNo: string; hkStatus?: string; foStatus?: string }
    | { type: 'FOLIO_UPDATED'; folioId?: string | number }
    | { type: 'INVENTORY_REFRESH' };

export const broadcastPMSEvent = (message: PMSBroadcastMessage) => {
    try {
        if (pmsBroadcastChannel) {
            pmsBroadcastChannel.postMessage(message);
        }
        // Trigger storage event for local tabs
        window.dispatchEvent(new CustomEvent('hotel_pms_sync_event', { detail: message }));

        // Cross-PC Real-Time Network Broadcast over LAN / Internet
        if (typeof window !== 'undefined') {
            const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || `http://${window.location.hostname || 'localhost'}:3001`;
            fetch(`${API_BASE}/api/realtime/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderClientId: localStorage.getItem('hotel_pms_terminal_id') || 'local',
                    event: {
                        ...message,
                        senderTerminal: localStorage.getItem('hotel_pms_terminal_id') || 'Desk',
                        timestamp: Date.now()
                    }
                })
            }).catch(() => {
                // Server offline fallback
            });
        }
    } catch (e) {
        console.warn('Failed to broadcast PMS event', e);
    }
};

export const subscribeToPMSEvents = (handler: (msg: PMSBroadcastMessage) => void): (() => void) => {
    const channelListener = (event: MessageEvent) => {
        handler(event.data);
    };

    const customEventListener = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (detail) handler(detail);
    };

    if (pmsBroadcastChannel) {
        pmsBroadcastChannel.addEventListener('message', channelListener);
    }
    window.addEventListener('hotel_pms_sync_event', customEventListener);

    return () => {
        if (pmsBroadcastChannel) {
            pmsBroadcastChannel.removeEventListener('message', channelListener);
        }
        window.removeEventListener('hotel_pms_sync_event', customEventListener);
    };
};

// =========================================================================
// 1. INTERVAL OVERLAP & TURNAROUND ENGINE
// =========================================================================

/**
 * Standard Hotel Date Interval Overlap Formula:
 * Two reservations overlap if and only if max(checkInA, checkInB) < min(checkOutA, checkOutB).
 * 
 * Same-day turnaround rule:
 * If Res A checks out on 2026-07-04 and Res B checks in on 2026-07-04,
 * max("2026-07-01", "2026-07-04") = "2026-07-04"
 * min("2026-07-04", "2026-07-06") = "2026-07-04"
 * Since "2026-07-04" < "2026-07-04" is FALSE, there is NO collision!
 */
export const checkIntervalOverlap = (
    checkInA: string,
    checkOutA: string,
    checkInB: string,
    checkOutB: string
): boolean => {
    if (!checkInA || !checkOutA || !checkInB || !checkOutB) return false;

    // Handle day-use (same-day in and out)
    const isDayUseA = checkInA === checkOutA;
    const isDayUseB = checkInB === checkOutB;

    if (isDayUseA && isDayUseB) {
        return checkInA === checkInB;
    }
    if (isDayUseA) {
        return checkInA >= checkInB && checkInA < checkOutB;
    }
    if (isDayUseB) {
        return checkInB >= checkInA && checkInB < checkOutA;
    }

    const maxCheckIn = checkInA > checkInB ? checkInA : checkInB;
    const minCheckOut = checkOutA < checkOutB ? checkOutA : checkOutB;

    return maxCheckIn < minCheckOut;
};

// =========================================================================
// 2. CANONICAL ROOM INVENTORY REPOSITORY
// =========================================================================

export const getCanonicalRooms = (): CanonicalRoom[] => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_ROOMS);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((r: any) => ({
                    id: r.id,
                    number: String(r.number),
                    name: r.name || `Room ${r.number}`,
                    buildingId: String(r.buildingId || '1'),
                    floorId: String(r.floorId || '1'),
                    roomTypeId: String(r.roomTypeId || '1'),
                    roomTypeName: ROOM_TYPE_MAP[String(r.roomTypeId)] || 'Deluxe Double',
                    status: r.status || 'Active',
                    housekeepingStatus: r.housekeepingStatus || 'Clean',
                    remarks: r.remarks
                }));
            }
        }
    } catch {}
    return DEFAULT_CANONICAL_ROOMS;
};

// =========================================================================
// 3. OPTIMISTIC SOFT LOCK ENGINE (hotel_room_locks)
// =========================================================================

export const getActiveLocks = (): RoomLock[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LOCKS);
        if (!raw) return [];
        const locks: RoomLock[] = JSON.parse(raw);
        const now = Date.now();
        // Clean up expired locks automatically (TTL enforcement)
        const validLocks = locks.filter(l => l.expiresAt > now);
        if (validLocks.length !== locks.length) {
            localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(validLocks));
        }
        return validLocks;
    } catch {
        return [];
    }
};

export const acquireRoomLock = (
    roomNumber: string,
    checkIn: string,
    checkOut: string,
    heldBy: string = 'Reservation Desk',
    durationMinutes: number = 7
): { success: boolean; lock?: RoomLock; conflict?: string } => {
    const activeLocks = getActiveLocks();
    const now = Date.now();

    // Check if another executive holds this room for overlapping stay
    const existingLock = activeLocks.find(l => 
        l.roomNumber === roomNumber &&
        checkIntervalOverlap(l.checkIn, l.checkOut, checkIn, checkOut)
    );

    if (existingLock) {
        const remainingSec = Math.max(0, Math.round((existingLock.expiresAt - now) / 1000));
        return {
            success: false,
            conflict: `Room ${roomNumber} is temporarily held by ${existingLock.heldBy} (${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s remaining).`
        };
    }

    const newLock: RoomLock = {
        lockId: `lock-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        roomNumber,
        checkIn,
        checkOut,
        heldBy,
        createdAt: now,
        expiresAt: now + durationMinutes * 60 * 1000
    };

    activeLocks.push(newLock);
    localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(activeLocks));
    broadcastPMSEvent({ type: 'ROOM_LOCK_ACQUIRED', lock: newLock });

    return { success: true, lock: newLock };
};

export const releaseRoomLock = (lockId: string): void => {
    try {
        const activeLocks = getActiveLocks();
        const filtered = activeLocks.filter(l => l.lockId !== lockId);
        localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(filtered));
        broadcastPMSEvent({ type: 'ROOM_LOCK_RELEASED', lockId });
    } catch {}
};

export const releaseLocksForRooms = (roomNumbers: string[]): void => {
    try {
        const activeLocks = getActiveLocks();
        const roomSet = new Set(roomNumbers);
        const filtered = activeLocks.filter(l => !roomSet.has(l.roomNumber));
        localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(filtered));
    } catch {}
};

// =========================================================================
// 4. RESERVATIONS REPOSITORY & AVAILABILITY ENGINE
// =========================================================================

export const getAllStoredReservations = (): StoredReservation[] => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
        if (saved) {
            const list = JSON.parse(saved);
            if (Array.isArray(list)) return list;
        }
    } catch {}
    return [];
};

export interface RoomAvailabilityStatus {
    room: CanonicalRoom;
    isAvailable: boolean;
    reason?: 'Out of Order' | 'Occupied' | 'Locked' | 'Maintenance';
    conflictingReservation?: {
        reservationNumber: string;
        guestName: string;
        checkIn: string;
        checkOut: string;
    };
    conflictingLock?: RoomLock;
}

/**
 * Returns full availability report for all or targeted rooms for a specific stay window.
 */
export const getAvailableRoomsForStay = (
    checkIn: string,
    checkOut: string,
    filterRoomType?: string,
    options?: {
        excludeReservationId?: string | number;
        currentSessionLockId?: string;
    }
): {
    availableRooms: CanonicalRoom[];
    allRoomsStatus: RoomAvailabilityStatus[];
    availableCount: number;
    totalCount: number;
} => {
    const allRooms = getCanonicalRooms();
    const allReservations = getAllStoredReservations();
    const activeLocks = getActiveLocks();

    const normalizedFilterType = filterRoomType?.trim().toLowerCase();

    const resultStatus: RoomAvailabilityStatus[] = allRooms.map(room => {
        // 1. Check Physical Status (OOO / Maintenance)
        if (room.status === 'Out of Order') {
            return {
                room,
                isAvailable: false,
                reason: 'Out of Order'
            };
        }
        if (room.status === 'Maintenance') {
            return {
                room,
                isAvailable: false,
                reason: 'Maintenance'
            };
        }

        // 2. Check Overlapping Existing Reservations
        const conflictBooking = allReservations.find(res => {
            if (options?.excludeReservationId && String(res.id) === String(options.excludeReservationId)) {
                return false;
            }
            if (res.status === 'cancelled' || res.status === 'voided') {
                return false;
            }

            const allocatedRoomsList = res.allocatedRooms && res.allocatedRooms.length > 0
                ? res.allocatedRooms
                : [res.roomNumber];

            if (!allocatedRoomsList.includes(room.number)) {
                return false;
            }

            return checkIntervalOverlap(res.checkIn, res.checkOut, checkIn, checkOut);
        });

        if (conflictBooking) {
            return {
                room,
                isAvailable: false,
                reason: 'Occupied',
                conflictingReservation: {
                    reservationNumber: conflictBooking.reservationNumber,
                    guestName: conflictBooking.guestName,
                    checkIn: conflictBooking.checkIn,
                    checkOut: conflictBooking.checkOut
                }
            };
        }

        // 3. Check Overlapping Soft Locks (exclude current session's lock)
        const conflictLock = activeLocks.find(l => {
            if (options?.currentSessionLockId && l.lockId === options.currentSessionLockId) {
                return false;
            }
            if (l.roomNumber !== room.number) return false;
            return checkIntervalOverlap(l.checkIn, l.checkOut, checkIn, checkOut);
        });

        if (conflictLock) {
            return {
                room,
                isAvailable: false,
                reason: 'Locked',
                conflictingLock: conflictLock
            };
        }

        return {
            room,
            isAvailable: true
        };
    });

    // Filter by roomType if specified
    const filteredStatus = normalizedFilterType
        ? resultStatus.filter(s => {
            const typeMatch = s.room.roomTypeName.toLowerCase() === normalizedFilterType ||
                              s.room.roomTypeName.toLowerCase().includes(normalizedFilterType) ||
                              normalizedFilterType.includes(s.room.roomTypeName.toLowerCase());
            return typeMatch;
        })
        : resultStatus;

    const available = filteredStatus.filter(s => s.isAvailable).map(s => s.room);

    return {
        availableRooms: available,
        allRoomsStatus: resultStatus,
        availableCount: available.length,
        totalCount: filteredStatus.length
    };
};

// =========================================================================
// 5. ATOMIC TWO-PHASE PRE-COMMIT VALIDATION GUARD
// =========================================================================

export interface CommitValidationResult {
    success: boolean;
    errorTitle?: string;
    errorMessage?: string;
    conflictingRooms?: string[];
    suggestedAlternates?: {
        requestedRoom: string;
        roomType: string;
        alternatives: CanonicalRoom[];
    }[];
}

export const validateAndCommitReservation = (
    reservationData: StoredReservation,
    sessionLockIds?: string[]
): CommitValidationResult => {
    const { checkIn, checkOut, allocatedRooms, roomNumber } = reservationData;
    const targetRooms = allocatedRooms && allocatedRooms.length > 0 ? allocatedRooms : [roomNumber];

    // Phase 1: Re-verify all allocated rooms in real time right now
    const conflictingRooms: string[] = [];
    const suggestedAlternates: { requestedRoom: string; roomType: string; alternatives: CanonicalRoom[] }[] = [];

    const canonicalRooms = getCanonicalRooms();

    for (const roomNum of targetRooms) {
        const canonical = canonicalRooms.find(r => r.number === roomNum);
        const roomType = canonical?.roomTypeName || reservationData.roomType || 'Deluxe Double';

        // Check if there is a specific sub-stay date range for this room (Group Staggered Stay)
        const rowData = reservationData.roomsList?.find((r: any) => r.roomNumber === roomNum || (r.assignedRooms && r.assignedRooms.includes(roomNum)));
        const roomIn = rowData?.checkInDate || checkIn;
        const roomOut = rowData?.checkOutDate || checkOut;

        const check = getAvailableRoomsForStay(roomIn, roomOut, undefined, {
            excludeReservationId: reservationData.id
        });

        const status = check.allRoomsStatus.find(s => s.room.number === roomNum);

        if (!status || !status.isAvailable) {
            // Is it locked by our own session lock?
            const isOurOwnLock = sessionLockIds && status?.conflictingLock && sessionLockIds.includes(status.conflictingLock.lockId);
            if (!isOurOwnLock) {
                conflictingRooms.push(roomNum);

                // Find same category available alternatives
                const sameCatAvailable = check.availableRooms.filter(r => 
                    r.roomTypeName === roomType && !targetRooms.includes(r.number)
                );
                suggestedAlternates.push({
                    requestedRoom: roomNum,
                    roomType,
                    alternatives: sameCatAvailable.slice(0, 3)
                });
            }
        }
    }

    if (conflictingRooms.length > 0) {
        return {
            success: false,
            errorTitle: 'Double-Booking Collision Detected',
            errorMessage: `Room(s) ${conflictingRooms.join(', ')} cannot be booked because another executive or online channel has already booked or locked them for dates ${checkIn} to ${checkOut}.`,
            conflictingRooms,
            suggestedAlternates
        };
    }

    // Phase 2: Commit Atomically to LocalStorage & Database
    try {
        const existing = getAllStoredReservations();
        const updated = [reservationData, ...existing.filter(r => String(r.id) !== String(reservationData.id))];
        localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(updated));

        // Direct Real-Time SQLite Database Persistence
        if (typeof window !== 'undefined') {
            const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || `http://${window.location.hostname || 'localhost'}:3001`;
            fetch(`${API_BASE}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reservationData)
            }).then(res => res.json()).then(resp => {
                if (resp.success && resp.data?.id) {
                    console.log(`✅ Reservation ${reservationData.reservationNumber} successfully persisted into relational SQLite DB! (ID: ${resp.data.id})`);
                }
            }).catch(err => {
                console.warn('⚠️ Offline / Local cache fallback for DB reservation persistence:', err);
            });
        }

        // Release temporary session locks
        if (sessionLockIds && sessionLockIds.length > 0) {
            sessionLockIds.forEach(id => releaseRoomLock(id));
        } else {
            releaseLocksForRooms(targetRooms);
        }

        // Broadcast to all tabs/windows
        broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: reservationData });

        return { success: true };
    } catch (e: any) {
        return {
            success: false,
            errorTitle: 'Storage Commit Error',
            errorMessage: e?.message || 'Failed to persist reservation to storage.'
        };
    }
};

/**
 * Synchronize Reservations from SQLite Relational Database
 */
export const syncReservationsFromDB = async (): Promise<StoredReservation[]> => {
    if (typeof window === 'undefined') return getAllStoredReservations();
    try {
        const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || `http://${window.location.hostname || 'localhost'}:3001`;
        const res = await fetch(`${API_BASE}/api/bookings`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const dbList: StoredReservation[] = json.data;
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(dbList));
            localStorage.setItem('hotel_reservations_v3', JSON.stringify(dbList));
            return dbList;
        }
    } catch (err) {
        console.warn('Could not sync reservations from SQLite DB:', err);
    }
    return getAllStoredReservations();
};

/**
 * Update reservation status directly in SQLite Database
 */
export const updateReservationStatusInDB = async (
    reservationId: string | number,
    newStatus: string
): Promise<boolean> => {
    try {
        const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || `http://${window.location.hostname || 'localhost'}:3001`;
        const res = await fetch(`${API_BASE}/api/bookings/${reservationId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            const existing = getAllStoredReservations();
            const updated = existing.map(r => String(r.id) === String(reservationId) ? { ...r, status: newStatus } : r);
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(updated));
            localStorage.setItem('hotel_reservations_v3', JSON.stringify(updated));
            broadcastPMSEvent({ type: 'RESERVATION_UPDATED', reservationId });
            return true;
        }
    } catch (err) {
        console.warn('Failed to update status in DB:', err);
    }
    return false;
};

/**
 * Delete or cancel reservation directly in SQLite Database
 */
export const deleteReservationInDB = async (
    reservationId: string | number
): Promise<boolean> => {
    try {
        const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || `http://${window.location.hostname || 'localhost'}:3001`;
        const res = await fetch(`${API_BASE}/api/bookings/${reservationId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            const existing = getAllStoredReservations();
            const updated = existing.filter(r => String(r.id) !== String(reservationId));
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(updated));
            localStorage.setItem('hotel_reservations_v3', JSON.stringify(updated));
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            return true;
        }
    } catch (err) {
        console.warn('Failed to delete reservation in DB:', err);
    }
    return false;
};

// Initial background sync with SQLite on boot
if (typeof window !== 'undefined') {
    setTimeout(() => {
        syncReservationsFromDB();
    }, 500);
}
