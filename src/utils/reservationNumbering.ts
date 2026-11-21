/**
 * Hotel PMS Unified Reservation Numbering & Stay Relationship Engine
 * Grand Palace Hotel & Resort — Enterprise PMS & RMS
 * 
 * Standards implemented:
 * - Single Room: Master RES, no sub-booking suffix, 1 Folio, 1 Reg Card, no Group Code.
 * - Split Stay: Master RES, Leg segments (-L1, -L2), 1 Single Master Folio, 1 Reg Card, no Group Code.
 * - Connecting Suite: Master RES, physical rooms (101 + 102), 1 Folio, 1 Reg Card, no Group Code.
 * - Group Booking: Master RES, Group Code (GRP-...), Sub-rooms (-01, -02), Group Master Folio (-M) + Room Folios (-01, -02), Individual Reg Cards.
 */

export type StayClassification = 'SINGLE' | 'SPLIT_STAY' | 'CONNECTING_SUITE' | 'GROUP';

export interface RoomStaySegment {
    roomNumber: string;
    checkInDate?: string;
    checkOutDate?: string;
    nights?: number;
    roomType?: string;
    avgDailyRate?: number;
    roomRate?: number;
    adults?: number;
    children?: number;
    subBookingNumber?: string;
    folioNumber?: string;
    registrationNumber?: string;
}

/**
 * Clean reservation number prefix to extract pure identifier
 */
export function cleanReservationNumber(resNo: string): string {
    return String(resNo || '').replace(/^RES-/, '').replace(/^RES/, '').trim();
}

/**
 * Check if a list of room segments represents a sequential stay (Split Stay)
 * Condition: Leg 1 checkout is equal to Leg 2 checkin, and so on.
 */
export function areDatesSequential(rooms: Array<{ checkInDate?: string; checkOutDate?: string }>): boolean {
    if (!rooms || rooms.length <= 1) return false;

    // Filter valid dates
    const validRooms = rooms.filter(r => Boolean(r.checkInDate && r.checkOutDate));
    if (validRooms.length <= 1) return false;

    const sorted = [...validRooms].sort((a, b) => 
        new Date(a.checkInDate!).getTime() - new Date(b.checkInDate!).getTime()
    );

    for (let i = 0; i < sorted.length - 1; i++) {
        const outDate = String(sorted[i].checkOutDate).slice(0, 10);
        const nextInDate = String(sorted[i + 1].checkInDate).slice(0, 10);
        // Sequential if current checkout matches next checkin
        if (outDate !== nextInDate) {
            return false;
        }
    }
    return true;
}

/**
 * Check if rooms are concurrent (Group Booking)
 * Condition: Multiple rooms sharing identical or overlapping dates
 */
export function areDatesConcurrent(rooms: Array<{ checkInDate?: string; checkOutDate?: string }>): boolean {
    if (!rooms || rooms.length <= 1) return false;
    return !areDatesSequential(rooms);
}

/**
 * Universal Deterministic Classifier for Reservations
 */
export function classifyReservation(booking: {
    isConnectingSuite?: boolean;
    isGroup?: boolean;
    groupCode?: string | null;
    roomNumber?: string;
    roomType?: string;
    allocatedRooms?: string[];
    roomsCount?: number;
    roomsList?: Array<{ roomNumber?: string; checkInDate?: string; checkOutDate?: string }>;
}): StayClassification {
    if (!booking) return 'SINGLE';

    // 1. Explicit Connecting Suite
    if (booking.isConnectingSuite) return 'CONNECTING_SUITE';
    if (booking.roomType && (
        booking.roomType.toLowerCase().includes('connecting') || 
        booking.roomType.toLowerCase().includes('interconnecting')
    )) {
        return 'CONNECTING_SUITE';
    }
    if (booking.roomNumber && booking.roomNumber.includes('+')) {
        return 'CONNECTING_SUITE';
    }

    const rooms = booking.roomsList || [];
    const roomCount = rooms.length > 0 
        ? rooms.length 
        : (booking.allocatedRooms?.length || booking.roomsCount || 1);

    if (roomCount <= 1) return 'SINGLE';

    // 2. Explicit Group Flags
    if (booking.isGroup) return 'GROUP';
    if (booking.groupCode && String(booking.groupCode).trim() !== '' && booking.groupCode !== 'null') {
        return 'GROUP';
    }

    // 3. Date Sequence Analysis
    if (rooms.length > 1) {
        if (areDatesSequential(rooms)) {
            return 'SPLIT_STAY';
        }
        return 'GROUP';
    }

    // If allocatedRooms has multiple rooms without sequential roomList -> Group
    if (booking.allocatedRooms && booking.allocatedRooms.length > 1) {
        return 'GROUP';
    }

    return 'SINGLE';
}

/**
 * Get active property numbering settings from unified settings store
 */
export function getActivePropertyNumberingSettings() {
    const defaults = {
        reservationPrefix: 'RES-{YYYY}-',
        invoicePrefix: 'INV-{YYYY}-',
        folioPrefix: 'FOL-',
        groupPrefix: 'GRP-{YYYY}-',
        registrationPrefix: 'REG-',
        creditNotePrefix: 'CRN-{YYYY}-',
        kotPrefix: 'KOT-',
        receiptPrefix: 'RCT-',
        sequencePadding: 5
    };
    if (typeof window === 'undefined') return defaults;
    try {
        const propId = Number(localStorage.getItem('hotel_active_property_id') || localStorage.getItem('active_property_id')) || 1;
        const saved = localStorage.getItem(`hotel_unified_settings_prop_${propId}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            const s = parsed?.settings || {};
            return {
                reservationPrefix: s.reservationPrefix || defaults.reservationPrefix,
                invoicePrefix: s.invoicePrefix || defaults.invoicePrefix,
                folioPrefix: s.folioPrefix || defaults.folioPrefix,
                groupPrefix: s.groupPrefix || defaults.groupPrefix,
                registrationPrefix: s.registrationPrefix || defaults.registrationPrefix,
                creditNotePrefix: s.creditNotePrefix || defaults.creditNotePrefix,
                kotPrefix: s.kotPrefix || defaults.kotPrefix,
                receiptPrefix: s.receiptPrefix || defaults.receiptPrefix,
                sequencePadding: Number(s.sequencePadding) || defaults.sequencePadding
            };
        }
    } catch {}
    return defaults;
}

export function resolveNumberingTemplate(template: string, date: Date = new Date()): string {
    const yyyy = String(date.getFullYear());
    const yy = yyyy.slice(2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return (template || '')
        .replace(/\{YYYY\}/g, yyyy)
        .replace(/\{YY\}/g, yy)
        .replace(/\{MM\}/g, mm);
}

/**
 * Generate Master Reservation Number
 * Dynamically resolves property's configured prefix and tokens
 */
export function generateMasterReservationNumber(dateStr?: string): string {
    const settings = getActivePropertyNumberingSettings();
    const prefix = resolveNumberingTemplate(settings.reservationPrefix || 'RES-{YYYY}-');
    const today = dateStr || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const suffix = prefix.includes(today.slice(0, 4)) ? `${today.slice(4)}${rand}` : `${today}${rand}`;
    return `${prefix}${suffix}`;
}

/**
 * Generate Group Code
 * Dynamically resolves property's configured prefix and tokens
 */
export function generateGroupCode(dateStr?: string): string {
    const settings = getActivePropertyNumberingSettings();
    const prefix = resolveNumberingTemplate(settings.groupPrefix || 'GRP-{YYYY}-');
    const today = dateStr || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const suffix = prefix.includes(today.slice(0, 4)) ? `${today.slice(4)}-${rand}` : `${today}-${rand}`;
    return `${prefix}${suffix}`;
}

/**
 * Generate Sub-Booking Number per Room / Segment
 */
export function generateSubBookingNumber(
    masterResNo: string,
    roomIndex: number,
    type: StayClassification
): string {
    const base = masterResNo || 'RES';
    switch (type) {
        case 'SPLIT_STAY':
            // Leg 1, Leg 2 sequential move of same guest
            return `${base}-L${roomIndex + 1}`;
        case 'GROUP':
            // Room 01, Room 02 of multi-room group
            return `${base}-${String(roomIndex + 1).padStart(2, '0')}`;
        case 'CONNECTING_SUITE':
        case 'SINGLE':
        default:
            return base;
    }
}

/**
 * Generate Folio Number
 * Dynamically resolves property's configured folio prefix
 */
export function generateFolioNumber(
    masterResNo: string,
    roomIndex: number = 0,
    type: StayClassification = 'SINGLE',
    isMasterFolio: boolean = false
): string {
    const settings = getActivePropertyNumberingSettings();
    const prefix = resolveNumberingTemplate(settings.folioPrefix || 'FOL-');
    const clean = cleanReservationNumber(masterResNo);
    switch (type) {
        case 'GROUP':
            if (isMasterFolio) {
                return `${prefix}${clean}-M`;
            }
            return `${prefix}${clean}-${String(roomIndex + 1).padStart(2, '0')}`;
        case 'SPLIT_STAY':
            // Split stays ALWAYS share a single master folio
            return `${prefix}${clean}`;
        case 'CONNECTING_SUITE':
        case 'SINGLE':
        default:
            return `${prefix}${clean}`;
    }
}

/**
 * Generate Registration Card Number
 * Dynamically resolves property's configured registration prefix
 */
export function generateRegistrationNumber(
    masterResNo: string,
    roomIndex: number = 0,
    type: StayClassification = 'SINGLE'
): string {
    const settings = getActivePropertyNumberingSettings();
    const prefix = resolveNumberingTemplate(settings.registrationPrefix || 'REG-');
    const clean = cleanReservationNumber(masterResNo);
    switch (type) {
        case 'GROUP':
            // Each group room has distinct guest KYC
            return `${prefix}${clean}-${String(roomIndex + 1).padStart(2, '0')}`;
        case 'SPLIT_STAY':
            // Guest signs 1 registration card for their entire journey
            return `${prefix}${clean}`;
        case 'CONNECTING_SUITE':
        case 'SINGLE':
        default:
            return `${prefix}${clean}`;
    }
}

/**
 * Format Room Display for UI Headers, Pills, and Badges
 */
export function formatRoomsDisplay(
    type: StayClassification,
    roomNumbers: string[]
): {
    badgeText: string;
    displayString: string;
    isSequential: boolean;
    isGroup: boolean;
} {
    const clean = (roomNumbers || []).map(r => String(r).trim()).filter(Boolean);
    if (clean.length === 0) {
        return {
            badgeText: 'Unassigned',
            displayString: 'Unassigned',
            isSequential: false,
            isGroup: false
        };
    }

    if (type === 'SPLIT_STAY') {
        const route = clean.join(' → ');
        return {
            badgeText: `Split Stay: ${route}`,
            displayString: route,
            isSequential: true,
            isGroup: false
        };
    }

    if (type === 'CONNECTING_SUITE') {
        const suite = clean.join(' + ');
        return {
            badgeText: `Connecting Suite (${clean.length} Rooms)`,
            displayString: suite,
            isSequential: false,
            isGroup: false
        };
    }

    if (type === 'GROUP') {
        const groupRooms = clean.join(', ');
        return {
            badgeText: `Group: ${clean.length} Rooms (${groupRooms})`,
            displayString: groupRooms,
            isSequential: false,
            isGroup: true
        };
    }

    return {
        badgeText: `Room ${clean[0]}`,
        displayString: clean[0],
        isSequential: false,
        isGroup: false
    };
}
