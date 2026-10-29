/**
 * Hotel Room Out Of Order (OOO) & Out Of Service (OOS) Lifecycle Management Engine
 * 
 * Compliant with AHLA & International PMS Standards (Opera PMS / Cloudbeds / Micros):
 * 1. Out Of Order (OOO): Serious defect, strictly deducted from sellable inventory, impossible to book/assign.
 * 2. Out Of Service (OOS): Minor maintenance, NOT deducted from inventory, Front Desk can assign with warning.
 * 3. Date Range Management: Specific start and end dates with overlap detection.
 * 4. Overdue Handling: Auto-flags overdue maintenance (today > endDate); does NOT auto-release without inspection.
 * 5. Reassignment Guard: Pre-checks conflicting existing reservations and offers 1-click room move.
 * 6. Release to Housekeeping: Repairs return room to 'Dirty' (requires inspection) before entering sellable pool.
 */

import { getApiBaseUrl, getActivePropertyId } from './apiUrl';
import { getAllStoredReservations, broadcastPMSEvent, getCanonicalRooms, type StoredReservation } from './roomInventoryEngine';

export type MaintenanceBlockType = 'OOO' | 'OOS';

export type MaintenanceReasonCategory =
    | 'Plumbing'
    | 'Electrical'
    | 'HVAC / AC'
    | 'Deep Cleaning'
    | 'Furniture & Fixtures'
    | 'Renovation'
    | 'Pest Control'
    | 'Painting'
    | 'Flooring / Carpeting'
    | 'Window / Glass'
    | 'Electronic Lock'
    | 'Guest Damage / Incident'
    | 'Other';

export interface OutOfOrderBlock {
    id: string;
    propertyId: number;
    roomNumber: string;
    roomType: string;
    blockType: MaintenanceBlockType; // 'OOO' | 'OOS'
    startDate: string; // ISO date YYYY-MM-DD
    endDate: string; // ISO date YYYY-MM-DD
    reasonCategory: MaintenanceReasonCategory;
    description: string;
    assignedTo?: string; // staff or vendor
    status: 'active' | 'extended' | 'completed' | 'cancelled';
    returnToStatus: 'Dirty' | 'Inspected' | 'Clean';
    extensionNotes?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export const STORAGE_KEY_OOO_BLOCKS = 'hotel_ooo_blocks_v1';

/**
 * Normalizes ISO date string to YYYY-MM-DD
 */
export const normalizeDateStr = (d: string | Date | undefined): string => {
    if (!d) return '';
    if (typeof d === 'string') {
        return d.slice(0, 10);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Checks if two date ranges [startA, endA] and [startB, endB] overlap.
 * Uses hotel turnaround standard: check-out day turnaround allows check-in same day,
 * but maintenance during the day blocks stays whose stay nights overlap.
 */
export const isDateRangeOverlapping = (
    startA: string,
    endA: string,
    startB: string,
    endB: string
): boolean => {
    const sA = normalizeDateStr(startA);
    const eA = normalizeDateStr(endA);
    const sB = normalizeDateStr(startB);
    const eB = normalizeDateStr(endB);

    if (!sA || !eA || !sB || !eB) return false;
    // Overlap condition: startA < endB && endA > startB
    return sA < eB && eA > sB;
};

/**
 * Get all stored OOO/OOS blocks from localStorage
 */
export const getStoredOOOBlocks = (propertyId?: number): OutOfOrderBlock[] => {
    try {
        if (typeof window === 'undefined') return [];
        const propId = propertyId || getActivePropertyId();
        if (!propId) return [];
        const raw = localStorage.getItem(`${STORAGE_KEY_OOO_BLOCKS}_prop_${propId}`) || (propId === 1 ? localStorage.getItem(STORAGE_KEY_OOO_BLOCKS) : null);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.map((item: any) => ({
                ...item,
                id: String(item.id),
                propertyId: Number(item.propertyId || propId),
                startDate: normalizeDateStr(item.startDate),
                endDate: normalizeDateStr(item.endDate)
            }));
        }
        return [];
    } catch (e) {
        console.warn('Failed to parse OOO blocks from localStorage', e);
        return [];
    }
};

/**
 * Save OOO blocks to localStorage and broadcast sync event
 */
export const saveStoredOOOBlocks = (blocks: OutOfOrderBlock[], propertyId?: number): void => {
    try {
        if (typeof window === 'undefined') return;
        const propId = propertyId || getActivePropertyId();
        if (!propId) return;
        localStorage.setItem(`${STORAGE_KEY_OOO_BLOCKS}_prop_${propId}`, JSON.stringify(blocks));
        if (propId === 1) {
            localStorage.setItem(STORAGE_KEY_OOO_BLOCKS, JSON.stringify(blocks));
        }
        window.dispatchEvent(new CustomEvent('hotel_ooo_blocks_updated', { detail: { propertyId: propId, blocks } }));
        broadcastPMSEvent({ type: 'INVENTORY_REFRESH', propertyId: propId });
    } catch (e) {
        console.warn('Failed to save OOO blocks to localStorage', e);
    }
};

/**
 * Retrieve active or extended maintenance blocks
 */
export const getActiveOOOBlocks = (propertyId: number = 1): OutOfOrderBlock[] => {
    const all = getStoredOOOBlocks(propertyId);
    return all.filter(b => b.status === 'active' || b.status === 'extended');
};

/**
 * Retrieve maintenance blocks for a specific room
 */
export const getRoomOOOBlocks = (roomNumber: string, propertyId: number = 1): OutOfOrderBlock[] => {
    const cleanRoomNo = String(roomNumber || '').trim();
    return getStoredOOOBlocks(propertyId).filter(b => String(b.roomNumber).trim() === cleanRoomNo);
};

/**
 * Checks if a room has an active Out Of Order (OOO) block for the given stay window [checkIn, checkOut].
 * Out Of Order blocks STRICTLY prevent booking and deduct from inventory.
 */
export const isRoomOOOForDates = (
    roomNumber: string,
    checkIn: string,
    checkOut: string,
    propertyId: number = 1
): { isBlocked: boolean; block?: OutOfOrderBlock; reason?: string } => {
    const cleanRoomNo = String(roomNumber || '').trim();
    const activeBlocks = getActiveOOOBlocks(propertyId);

    const match = activeBlocks.find(b => {
        if (String(b.roomNumber).trim() !== cleanRoomNo) return false;
        if (b.blockType !== 'OOO') return false;
        return isDateRangeOverlapping(b.startDate, b.endDate, checkIn, checkOut);
    });

    if (match) {
        return {
            isBlocked: true,
            block: match,
            reason: `Out of Order (${match.reasonCategory}): ${match.description || 'Under maintenance'}`
        };
    }

    return { isBlocked: false };
};

/**
 * Checks if a room has an active Out Of Service (OOS) block for the given stay window [checkIn, checkOut].
 * Out Of Service does NOT hard-block inventory, but provides a front desk warning.
 */
export const isRoomOOSForDates = (
    roomNumber: string,
    checkIn: string,
    checkOut: string,
    propertyId: number = 1
): { isWarning: boolean; block?: OutOfOrderBlock; reason?: string } => {
    const cleanRoomNo = String(roomNumber || '').trim();
    const activeBlocks = getActiveOOOBlocks(propertyId);

    const match = activeBlocks.find(b => {
        if (String(b.roomNumber).trim() !== cleanRoomNo) return false;
        if (b.blockType !== 'OOS') return false;
        return isDateRangeOverlapping(b.startDate, b.endDate, checkIn, checkOut);
    });

    if (match) {
        return {
            isWarning: true,
            block: match,
            reason: `Out of Service (${match.reasonCategory}): ${match.description || 'Minor repair'}`
        };
    }

    return { isWarning: false };
};

/**
 * Determines whether a maintenance block is overdue (today > endDate and still active/extended).
 */
export const isBlockOverdue = (block: OutOfOrderBlock, todayStr?: string): boolean => {
    if (block.status !== 'active' && block.status !== 'extended') return false;
    const today = todayStr || new Date().toISOString().slice(0, 10);
    return block.endDate < today;
};

/**
 * Returns all active maintenance blocks that are currently overdue.
 */
export const getOverdueOOOBlocks = (todayStr?: string, propertyId: number = 1): OutOfOrderBlock[] => {
    const active = getActiveOOOBlocks(propertyId);
    return active.filter(b => isBlockOverdue(b, todayStr));
};

/**
 * Finds all active reservations that conflict with a proposed room maintenance window.
 */
export const findConflictingReservations = (
    roomNumber: string,
    startDate: string,
    endDate: string,
    propertyId: number = 1
): StoredReservation[] => {
    const cleanRoomNo = String(roomNumber || '').trim();
    const allReservations = getAllStoredReservations(propertyId);

    return allReservations.filter(res => {
        const normStatus = String(res.status || '').toLowerCase();
        if (normStatus === 'cancelled' || normStatus === 'voided' || normStatus === 'checked-out' || normStatus === 'completed') {
            return false;
        }

        // Check assigned rooms (single, multi-room, or allocatedRooms)
        let roomMatched = false;
        if (String(res.roomNumber || '').trim() === cleanRoomNo) {
            roomMatched = true;
        } else if (Array.isArray(res.allocatedRooms) && res.allocatedRooms.map(String).includes(cleanRoomNo)) {
            roomMatched = true;
        } else if (Array.isArray(res.roomsList)) {
            roomMatched = res.roomsList.some((r: any) =>
                String(r.assignedRoom || r.roomNumber || '').trim() === cleanRoomNo ||
                (Array.isArray(r.assignedRooms) && r.assignedRooms.map(String).includes(cleanRoomNo))
            );
        }

        if (!roomMatched) return false;

        // Check date overlap
        return isDateRangeOverlapping(res.checkIn, res.checkOut, startDate, endDate);
    });
};

/**
 * Syncs OOO blocks from the backend API into localStorage
 */
export const syncOOOBlocksFromBackend = async (propertyId: number = 1): Promise<OutOfOrderBlock[]> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/rooms/ooo-blocks?status=all`, {
            headers: {
                'x-property-id': String(propertyId),
                'x-user-role': 'admin'
            }
        });
        if (!res.ok) return getStoredOOOBlocks(propertyId);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const normalized: OutOfOrderBlock[] = json.data.map((item: any) => ({
                id: String(item.id),
                propertyId: Number(item.propertyId || propertyId),
                roomNumber: String(item.roomNumber),
                roomType: String(item.roomType || 'Room'),
                blockType: (item.blockType || 'OOO').toUpperCase() === 'OOS' ? 'OOS' : 'OOO',
                startDate: normalizeDateStr(item.startDate),
                endDate: normalizeDateStr(item.endDate),
                reasonCategory: item.reasonCategory || 'Maintenance',
                description: item.description || '',
                assignedTo: item.assignedTo || undefined,
                status: item.status || 'active',
                returnToStatus: item.returnToStatus || 'Dirty',
                extensionNotes: item.extensionNotes || undefined,
                createdBy: item.createdBy || 'Manager',
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: item.updatedAt || new Date().toISOString()
            }));
            saveStoredOOOBlocks(normalized, propertyId);
            return normalized;
        }
    } catch (e) {
        console.warn('Failed to sync OOO blocks from backend, using local cache', e);
    }
    return getStoredOOOBlocks(propertyId);
};

/**
 * Creates a new Out Of Order or Out Of Service block.
 * Automatically checks for reservation conflicts.
 */
export const createOOOBlock = async (
    blockData: Omit<OutOfOrderBlock, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
    force: boolean = false
): Promise<{
    success: boolean;
    data?: OutOfOrderBlock;
    conflict?: boolean;
    conflicts?: StoredReservation[];
    message?: string;
}> => {
    const propertyId = blockData.propertyId || getActivePropertyId();
    const startDate = normalizeDateStr(blockData.startDate);
    const endDate = normalizeDateStr(blockData.endDate);

    if (startDate > endDate) {
        return { success: false, message: 'Start date cannot be after end date' };
    }

    // 1. Conflict Check
    const conflicts = findConflictingReservations(blockData.roomNumber, startDate, endDate, propertyId);
    if (conflicts.length > 0 && !force) {
        return {
            success: false,
            conflict: true,
            conflicts,
            message: `Room ${blockData.roomNumber} has ${conflicts.length} overlapping reservation(s). Reassign them first or confirm with manager override.`
        };
    }

    const newId = `ooo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const newBlock: OutOfOrderBlock = {
        ...blockData,
        id: newId,
        startDate,
        endDate,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso
    };

    // 2. Persist locally first (Optimistic)
    const existing = getStoredOOOBlocks(propertyId);
    const updated = [newBlock, ...existing];
    saveStoredOOOBlocks(updated, propertyId);

    // 3. Persist to Backend API
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/rooms/ooo-blocks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-property-id': String(propertyId),
                'x-user-role': 'admin'
            },
            body: JSON.stringify({
                ...blockData,
                startDate,
                endDate,
                force: true
            })
        });
        if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
                newBlock.id = String(json.data.id || newId);
                const reUpdated = updated.map(b => b.id === newId ? { ...b, id: newBlock.id } : b);
                saveStoredOOOBlocks(reUpdated, propertyId);
            }
        }
    } catch (e) {
        console.warn('Failed to sync new OOO block to backend, saved locally', e);
    }

    return {
        success: true,
        data: newBlock,
        message: `Room ${blockData.roomNumber} successfully placed ${blockData.blockType === 'OOO' ? 'Out of Order' : 'Out of Service'}`
    };
};

/**
 * Extends the duration of an existing maintenance block with mandatory log reason.
 */
export const extendOOOBlock = async (
    blockId: string,
    newEndDate: string,
    reason: string,
    extendedBy: string = 'Manager'
): Promise<{ success: boolean; message?: string }> => {
    const normEndDate = normalizeDateStr(newEndDate);
    const existing = getStoredOOOBlocks();
    const index = existing.findIndex(b => String(b.id) === String(blockId));
    if (index === -1) {
        return { success: false, message: 'Maintenance block not found' };
    }

    const target = existing[index];
    const propertyId = target.propertyId || getActivePropertyId();
    const noteEntry = `[${new Date().toISOString().slice(0, 16).replace('T', ' ')}] Extended from ${target.endDate} to ${normEndDate} by ${extendedBy}. Reason: ${reason || 'Work delayed'}`;
    const updatedNotes = target.extensionNotes ? `${target.extensionNotes}\n${noteEntry}` : noteEntry;

    const updatedBlock: OutOfOrderBlock = {
        ...target,
        endDate: normEndDate,
        status: 'extended',
        extensionNotes: updatedNotes,
        updatedAt: new Date().toISOString()
    };

    existing[index] = updatedBlock;
    saveStoredOOOBlocks(existing, propertyId);

    // Call Backend
    try {
        const API_BASE = getApiBaseUrl();
        await fetch(`${API_BASE}/api/rooms/ooo-blocks/${blockId}/extend`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-property-id': String(propertyId),
                'x-user-role': 'admin'
            },
            body: JSON.stringify({
                newEndDate: normEndDate,
                reason,
                extendedBy
            })
        });
    } catch (e) {
        console.warn('Backend extend failed, local updated', e);
    }

    return {
        success: true,
        message: `Maintenance period extended to ${normEndDate}`
    };
};

/**
 * Releases a room from maintenance and returns it to Housekeeping.
 * As per hotel standard, default return status is 'Dirty' so housekeeping cleans and inspects.
 */
export const releaseOOOBlock = async (
    blockId: string,
    returnStatus: 'Dirty' | 'Inspected' | 'Clean' = 'Dirty',
    releasedBy: string = 'Manager',
    notes: string = ''
): Promise<{ success: boolean; message?: string }> => {
    const existing = getStoredOOOBlocks();
    const index = existing.findIndex(b => String(b.id) === String(blockId));
    if (index === -1) {
        return { success: false, message: 'Maintenance block not found' };
    }

    const target = existing[index];
    const propertyId = target.propertyId || getActivePropertyId();
    const releaseEntry = `[${new Date().toISOString().slice(0, 16).replace('T', ' ')}] Released by ${releasedBy} with status ${returnStatus}. Note: ${notes || 'Work completed'}`;
    const updatedNotes = target.extensionNotes ? `${target.extensionNotes}\n${releaseEntry}` : releaseEntry;

    const updatedBlock: OutOfOrderBlock = {
        ...target,
        status: 'completed',
        returnToStatus: returnStatus,
        extensionNotes: updatedNotes,
        updatedAt: new Date().toISOString()
    };

    existing[index] = updatedBlock;
    saveStoredOOOBlocks(existing, propertyId);

    // Also update canonical room status if stored locally
    try {
        const rooms = getCanonicalRooms(propertyId);
        const rIndex = rooms.findIndex(r => String(r.number).trim() === String(target.roomNumber).trim());
        if (rIndex !== -1) {
            rooms[rIndex].status = 'Active';
            rooms[rIndex].housekeepingStatus = returnStatus;
            localStorage.setItem('hotel_rooms_inventory_v1', JSON.stringify(rooms));
            broadcastPMSEvent({
                type: 'ROOM_STATUS_CHANGED',
                roomNo: target.roomNumber,
                hkStatus: returnStatus,
                foStatus: 'Vacant',
                propertyId
            });
        }
    } catch (e) {
        console.warn('Failed to update canonical room on release', e);
    }

    // Call Backend
    try {
        const API_BASE = getApiBaseUrl();
        await fetch(`${API_BASE}/api/rooms/ooo-blocks/${blockId}/release`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-property-id': String(propertyId),
                'x-user-role': 'admin'
            },
            body: JSON.stringify({
                returnStatus,
                releasedBy,
                notes
            })
        });
    } catch (e) {
        console.warn('Backend release failed, local updated', e);
    }

    return {
        success: true,
        message: `Room ${target.roomNumber} successfully released to Housekeeping as ${returnStatus}`
    };
};

/**
 * Cancels a maintenance block and restores room to active state.
 */
export const cancelOOOBlock = async (
    blockId: string,
    reason: string = 'Cancelled by manager'
): Promise<{ success: boolean; message?: string }> => {
    const existing = getStoredOOOBlocks();
    const index = existing.findIndex(b => String(b.id) === String(blockId));
    if (index === -1) {
        return { success: false, message: 'Maintenance block not found' };
    }

    const target = existing[index];
    const propertyId = target.propertyId || getActivePropertyId();
    const cancelEntry = `[${new Date().toISOString().slice(0, 16).replace('T', ' ')}] Cancelled. Reason: ${reason}`;
    const updatedNotes = target.extensionNotes ? `${target.extensionNotes}\n${cancelEntry}` : cancelEntry;

    const updatedBlock: OutOfOrderBlock = {
        ...target,
        status: 'cancelled',
        extensionNotes: updatedNotes,
        updatedAt: new Date().toISOString()
    };

    existing[index] = updatedBlock;
    saveStoredOOOBlocks(existing, propertyId);

    // Call Backend
    try {
        const API_BASE = getApiBaseUrl();
        await fetch(`${API_BASE}/api/rooms/ooo-blocks/${blockId}`, {
            method: 'DELETE',
            headers: {
                'x-property-id': String(propertyId),
                'x-user-role': 'admin'
            }
        });
    } catch (e) {
        console.warn('Backend cancel failed, local updated', e);
    }

    return {
        success: true,
        message: `Maintenance block cancelled for Room ${target.roomNumber}`
    };
};
