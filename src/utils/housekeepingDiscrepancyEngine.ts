/**
 * HotelManagementOS - Housekeeping & Front Desk Room Discrepancy Engine
 * 
 * Compliant with AHLA SOP & Global Industry Room Discrepancy Standards:
 * 
 * 1. Sleep Discrepancy: Front Desk says VACANT, but Housekeeper finds luggage / bed slept in.
 * 2. Skip Discrepancy (Skipper): Front Desk says OCCUPIED, but room is empty & guest absconded.
 * 3. Person Count Discrepancy: Front Desk recorded 1 person, but multiple occupants found.
 * 4. Luggage Unattended: Checkout time passed, room empty of guests but filled with belongings.
 */

import { broadcastPMSEvent } from './roomInventoryEngine';
import { getApiBaseUrl, getActivePropertyId } from './apiUrl';

const API_BASE = getApiBaseUrl();

export type DiscrepancyType = 
    | 'Sleep Discrepancy' 
    | 'Skip Discrepancy (Skipper)' 
    | 'Person Count Mismatch' 
    | 'Luggage Without Guest';

export interface RoomDiscrepancy {
    id: string;
    roomId?: number;
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

export const DEFAULT_DISCREPANCIES: RoomDiscrepancy[] = [];

export const getStoredDiscrepancies = (): RoomDiscrepancy[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY_DISCREPANCIES);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
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
 * Fetch discrepancies from PostgreSQL API
 */
export const fetchDiscrepanciesFromDB = async (propertyId?: number): Promise<RoomDiscrepancy[]> => {
    const propId = propertyId || getActivePropertyId();
    try {
        const res = await fetch(`${API_BASE}/api/housekeeping/discrepancies?status=all`, {
            headers: { 'x-property-id': String(propId) }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const mapped: RoomDiscrepancy[] = json.data.map((r: any) => ({
                id: String(r.id),
                roomId: r.room_id,
                roomNumber: r.room_number,
                discrepancyType: r.discrepancy_type,
                frontDeskStatus: r.front_desk_status,
                housekeepingFound: r.housekeeping_found,
                guestName: r.guest_name,
                reportedBy: r.reported_by,
                reportedAt: r.reported_at,
                notes: r.notes || '',
                status: (r.status || 'active').toLowerCase(),
                resolvedBy: r.resolved_by,
                resolvedAt: r.resolved_at,
                resolutionNotes: r.resolution_notes
            }));
            saveStoredDiscrepancies(mapped);
            return mapped;
        }
    } catch (err) {
        console.warn('Failed to fetch discrepancies from API:', err);
    }
    return getStoredDiscrepancies();
};

/**
 * Flag a new room discrepancy to PostgreSQL API
 */
export const flagRoomDiscrepancyToDB = async (data: {
    roomId?: number;
    roomNumber: string;
    discrepancyType: DiscrepancyType;
    frontDeskStatus: string;
    housekeepingFound: string;
    guestName?: string;
    reportedBy: string;
    notes: string;
    propertyId?: number;
}): Promise<RoomDiscrepancy> => {
    const propId = data.propertyId || getActivePropertyId();
    try {
        const res = await fetch(`${API_BASE}/api/housekeeping/discrepancies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-property-id': String(propId)
            },
            body: JSON.stringify({
                propertyId: propId,
                roomId: data.roomId || 1,
                roomNumber: data.roomNumber,
                discrepancyType: data.discrepancyType,
                frontDeskStatus: data.frontDeskStatus,
                housekeepingFound: data.housekeepingFound,
                guestName: data.guestName,
                reportedBy: data.reportedBy,
                notes: data.notes
            })
        });
        const json = await res.json();
        if (json.success && json.data) {
            console.log('Room discrepancy successfully saved to PostgreSQL:', json.data.id);
        }
    } catch (err) {
        console.warn('Failed to post discrepancy to API:', err);
    }

    return flagRoomDiscrepancy(data);
};

/**
 * Resolve a discrepancy in PostgreSQL API
 */
export const resolveRoomDiscrepancyInDB = async (
    id: string,
    resolvedBy: string,
    resolutionNotes: string,
    propertyId?: number
): Promise<RoomDiscrepancy | null> => {
    const propId = propertyId || getActivePropertyId();
    try {
        const res = await fetch(`${API_BASE}/api/housekeeping/discrepancies/${id}/resolve`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-property-id': String(propId)
            },
            body: JSON.stringify({
                resolvedBy,
                resolutionNotes
            })
        });
        const json = await res.json();
        if (json.success) {
            console.log(`Discrepancy #${id} resolved in PostgreSQL`);
        }
    } catch (err) {
        console.warn('Failed to resolve discrepancy in API:', err);
    }

    return resolveRoomDiscrepancy(id, resolvedBy, resolutionNotes);
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
