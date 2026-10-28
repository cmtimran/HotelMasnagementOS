/**
 * HotelManagementOS - Housekeeping & Front Desk Room Discrepancy Engine
 * 
 * Compliant with AHLA SOP & Opera Cloud / eZee Room Discrepancy Standards:
 * 
 * 1. Sleep Discrepancy: Front Desk says VACANT, but Housekeeper finds luggage / bed slept in.
 * 2. Skip Discrepancy (Skipper): Front Desk says OCCUPIED, but room is empty & guest absconded.
 * 3. Person Count Discrepancy: Front Desk recorded 1 person, but multiple occupants found.
 * 4. Luggage Unattended: Checkout time passed, room empty of guests but filled with belongings.
 */

import { broadcastPMSEvent } from './roomInventoryEngine';

export type DiscrepancyType = 
    | 'Sleep Discrepancy' 
    | 'Skip Discrepancy (Skipper)' 
    | 'Person Count Mismatch' 
    | 'Luggage Without Guest';

export interface RoomDiscrepancy {
    id: string;
    roomNumber: string;
    discrepancyType: DiscrepancyType;
    frontDeskStatus: string; // e.g. "Vacant Clean" or "Occupied Dirty"
    housekeepingFound: string; // e.g. "Luggage found, bed used" or "Empty room, keys left"
    guestName?: string;
    reportedBy: string;
    reportedAt: string;
    notes: string;
    status: 'active' | 'investigating' | 'resolved';
    resolvedBy?: string;
    resolvedAt?: string;
    resolutionNotes?: string;
}

const STORAGE_KEY_DISCREPANCIES = 'hotel_housekeeping_discrepancies_v1';

const DEFAULT_DISCREPANCIES: RoomDiscrepancy[] = [
    {
        id: 'DISC-01',
        roomNumber: '205',
        discrepancyType: 'Sleep Discrepancy',
        frontDeskStatus: 'Vacant Dirty (Expected Empty)',
        housekeepingFound: 'Bed slept in, 2 open suitcases and laptop on desk',
        guestName: 'Unregistered Occupant',
        reportedBy: 'Fatima Begum (Housekeeper)',
        reportedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        notes: 'Front Desk system showed room checked-out at 11 AM, but room is occupied with personal effects.',
        status: 'active'
    }
];

export const getStoredDiscrepancies = (): RoomDiscrepancy[] => {
    if (typeof window === 'undefined') return DEFAULT_DISCREPANCIES;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_DISCREPANCIES);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY_DISCREPANCIES, JSON.stringify(DEFAULT_DISCREPANCIES));
            return DEFAULT_DISCREPANCIES;
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_DISCREPANCIES;
    } catch {
        return DEFAULT_DISCREPANCIES;
    }
};

export const saveStoredDiscrepancies = (discrepancies: RoomDiscrepancy[]): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_DISCREPANCIES, JSON.stringify(discrepancies));
        window.dispatchEvent(new CustomEvent('pms_discrepancy_updated', { detail: { discrepancies } }));
    } catch (e) {
        console.warn('Failed to save discrepancies:', e);
    }
};

/**
 * Flag a new room discrepancy
 */
export const flagRoomDiscrepancy = (data: {
    roomNumber: string;
    discrepancyType: DiscrepancyType;
    frontDeskStatus: string;
    housekeepingFound: string;
    guestName?: string;
    reportedBy: string;
    notes: string;
}): RoomDiscrepancy => {
    const existing = getStoredDiscrepancies();
    const newDiscrepancy: RoomDiscrepancy = {
        id: `DISC-${Date.now().toString().slice(-4)}`,
        roomNumber: data.roomNumber.trim(),
        discrepancyType: data.discrepancyType,
        frontDeskStatus: data.frontDeskStatus,
        housekeepingFound: data.housekeepingFound,
        guestName: data.guestName || '',
        reportedBy: data.reportedBy,
        reportedAt: new Date().toISOString(),
        notes: data.notes,
        status: 'active'
    };

    const updated = [newDiscrepancy, ...existing];
    saveStoredDiscrepancies(updated);

    // Broadcast live PMS alert
    broadcastPMSEvent({
        type: 'ROOM_STATUS_CHANGED',
        roomNo: data.roomNumber,
        hkStatus: 'dirty'
    });

    return newDiscrepancy;
};

/**
 * Resolve a discrepancy
 */
export const resolveRoomDiscrepancy = (
    id: string,
    resolvedBy: string,
    resolutionNotes: string
): RoomDiscrepancy | null => {
    const list = getStoredDiscrepancies();
    const idx = list.findIndex(d => d.id === id);
    if (idx === -1) return null;

    const updated: RoomDiscrepancy = {
        ...list[idx],
        status: 'resolved',
        resolvedBy,
        resolvedAt: new Date().toISOString(),
        resolutionNotes
    };

    list[idx] = updated;
    saveStoredDiscrepancies(list);
    return updated;
};

/**
 * Get active discrepancy for a specific room
 */
export const getActiveDiscrepancyForRoom = (roomNumber: string): RoomDiscrepancy | undefined => {
    const list = getStoredDiscrepancies();
    return list.find(d => d.roomNumber === roomNumber && (d.status === 'active' || d.status === 'investigating'));
};
