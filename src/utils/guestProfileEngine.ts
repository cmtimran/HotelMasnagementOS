import { isSamePhoneNumber } from './phoneUtils';
import { getAllStoredReservations, type StoredReservation } from './roomInventoryEngine';

export interface CanonicalGuestProfile {
    id: number | string;
    title: 'Mr.' | 'Mrs.' | 'Ms.' | 'Miss' | 'Dr.' | 'Prof.' | 'Engr.';
    name: string; // Clean guest name, free of duplicate title prefixes
    phone: string;
    altPhone?: string;
    email: string;
    vipTier: string;
    nationality: string;
    idType: string;
    idNumber: string;
    dob: string;
    gender: 'Male' | 'Female' | 'Other' | string;
    homeCity: string;
    homeCountry: string;
    address: string;
    postalCode: string;
    company?: string;
    designation?: string;
    corporateTaxId?: string;
    billingRoute?: string;
    totalStays: number;
    totalNights?: number;
    lifetimeSpendBDT: number;
    loyaltyPoints?: number;
    lastStayDate?: string;
    preferences?: Record<string, any>;
    emergencyContact?: {
        name: string;
        relationship: string;
        phone: string;
    };
    isBlacklisted: boolean;
    blacklistReason?: string;
    blacklistedBy?: string;
    blacklistedAt?: string;
    passportVisaNumber?: string;
    passportVisaType?: string;
    passportVisaExpiry?: string;
    passportEntryPort?: string;
    drivingVehicleClass?: string;
    fatherOrSpouseName?: string;
    idIssueDate?: string;
    idExpiryDate?: string;
    idIssueCountry?: string;
    idIssuePlace?: string;
    stayHistory?: any[];
}

/**
 * Robustly parses a guest's full name into a clean title and name.
 * Handles titles both with and without periods (e.g. "Mr Imran", "Mr. Imran", "Dr. John", "Prof Ali")
 * and strips any accidental duplicated prefixes (e.g. "Mr. Mr Imran" -> "Imran").
 */
export const parseTitleAndName = (fullName: string): { title: CanonicalGuestProfile['title']; cleanName: string } => {
    if (!fullName) return { title: 'Mr.', cleanName: 'Guest' };
    const raw = fullName.trim();
    const titleMatch = raw.match(/^(Mr|Mrs|Ms|Miss|Dr|Prof|Engr)\.?\s+/i);
    if (!titleMatch) {
        return { title: 'Mr.', cleanName: raw };
    }
    const rawTitle = titleMatch[1].toLowerCase();
    let title: CanonicalGuestProfile['title'] = 'Mr.';
    if (rawTitle === 'dr') title = 'Dr.';
    else if (rawTitle === 'ms' || rawTitle === 'miss') title = 'Ms.';
    else if (rawTitle === 'mrs') title = 'Mrs.';
    else if (rawTitle === 'prof') title = 'Prof.';
    else if (rawTitle === 'engr') title = 'Engr.';

    const afterFirstTitle = raw.substring(titleMatch[0].length).trim();
    // Clean any accidental duplicate title prefixes (e.g. "Mr. Mr Imran" or "Mr Imran")
    const cleanName = afterFirstTitle.replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof|Engr)\.?\s+/i, '').trim();
    return { title, cleanName: cleanName || raw };
};

/**
 * Retrieves explicit custom guest profiles saved directly in localStorage
 */
export const getSavedGuestProfiles = (): CanonicalGuestProfile[] => {
    try {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hotel_guest_profiles_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        }
    } catch {}
    return [];
};

/**
 * Returns the single source of truth for all guest profiles across the PMS.
 * Perfectly merges `hotel_guest_profiles_v2` with historical reservations,
 * de-duplicating by normalized phone number, verified email, and normalized clean name.
 * Prevents phantom duplicates (e.g., "Mr. Imran Hossain" vs "Mr. Mr Imran Hossain").
 */
export const getCanonicalGuestProfiles = (): CanonicalGuestProfile[] => {
    const savedProfiles = getSavedGuestProfiles();
    const map = new Map<string, CanonicalGuestProfile>();

    // 1. First, seed the map with saved canonical profiles from hotel_guest_profiles_v2
    savedProfiles.forEach((p, idx) => {
        const { title, cleanName } = parseTitleAndName(p.name || '');
        const key = cleanName.toLowerCase();
        if (!key) return;

        map.set(key, {
            ...p,
            id: p.id || `profile-${idx + 1}`,
            title: p.title || title,
            name: cleanName,
            phone: p.phone || '',
            altPhone: p.altPhone || '',
            email: p.email || '',
            vipTier: p.vipTier || 'Regular',
            nationality: p.nationality || 'Bangladeshi',
            idType: p.idType || 'National ID (NID)',
            idNumber: p.idNumber || '',
            dob: p.dob || '',
            gender: p.gender || 'Male',
            homeCity: p.homeCity || '',
            homeCountry: p.homeCountry || 'Bangladesh',
            address: p.address || '',
            postalCode: p.postalCode || '',
            company: p.company || '',
            designation: p.designation || '',
            totalStays: p.totalStays || 1,
            lifetimeSpendBDT: p.lifetimeSpendBDT || 0,
            preferences: p.preferences || {},
            emergencyContact: p.emergencyContact,
            isBlacklisted: Boolean(p.isBlacklisted),
            blacklistReason: p.blacklistReason,
            blacklistedBy: p.blacklistedBy,
            blacklistedAt: p.blacklistedAt,
            passportVisaNumber: p.passportVisaNumber,
            passportVisaType: p.passportVisaType,
            passportVisaExpiry: p.passportVisaExpiry,
            passportEntryPort: p.passportEntryPort,
            drivingVehicleClass: p.drivingVehicleClass,
            fatherOrSpouseName: p.fatherOrSpouseName,
            idIssueDate: p.idIssueDate,
            idExpiryDate: p.idExpiryDate || (p as any).idExpiry,
            idIssueCountry: p.idIssueCountry,
            idIssuePlace: p.idIssuePlace,
            stayHistory: p.stayHistory || []
        });
    });

    // 2. Scan stored reservations and merge stays or add only genuinely new guests
    const reservations: StoredReservation[] = getAllStoredReservations();
    reservations.forEach((r, idx) => {
        const { title: detectedTitle, cleanName } = parseTitleAndName(r.guestName || `Guest ${idx + 1}`);
        const key = cleanName.toLowerCase();
        if (!key) return;

        const rawPhone = r.phone || (r as any).guestPhone || '';
        const cleanE = (r.email || (r as any).guestEmail || '').trim().toLowerCase();

        // Find match in map by normalized phone, verified email, or clean name
        let matchedKey: string | undefined;
        for (const [k, g] of map.entries()) {
            if (rawPhone && isSamePhoneNumber(rawPhone, g.phone)) {
                matchedKey = k;
                break;
            }
            if (cleanE && !cleanE.includes('guest.com') && !cleanE.includes('hospitality.com') && g.email && g.email.trim().toLowerCase() === cleanE) {
                matchedKey = k;
                break;
            }
            if (k === key) {
                matchedKey = k;
                break;
            }
        }

        const nights = Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86400000)) || 1;
        const spend = Number(r.totalAmount) || Number((r as any).totalRate) || 0;
        const stayItem = {
            resNumber: String(r.reservationNumber || r.id),
            roomNumber: r.roomNumber || (r as any).roomNo || (Array.isArray(r.allocatedRooms) ? r.allocatedRooms[0] : '101'),
            roomType: r.roomType || 'Deluxe',
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            nights,
            totalAmountBDT: spend,
            status: r.status === 'CANCELLED' ? 'Cancelled' : r.status === 'CHECKED_OUT' || r.status === 'checked-out' ? 'Checked-Out' : 'In-House'
        };

        const existing = matchedKey ? map.get(matchedKey) : undefined;
        if (existing) {
            existing.totalStays = (existing.totalStays || 0) + 1;
            existing.totalNights = (existing.totalNights || 0) + nights;
            existing.lifetimeSpendBDT = (existing.lifetimeSpendBDT || 0) + spend;
            existing.loyaltyPoints = Math.round(existing.lifetimeSpendBDT / 20);
            if (!existing.lastStayDate || r.checkIn > existing.lastStayDate) {
                existing.lastStayDate = r.checkIn;
            }
            if (!existing.stayHistory) existing.stayHistory = [];
            if (!existing.stayHistory.some((s: any) => s.resNumber === stayItem.resNumber)) {
                existing.stayHistory.push(stayItem);
            }
            // Keep phone, email, and ID up to date if missing on existing
            if (!existing.phone && rawPhone) existing.phone = rawPhone;
            if (!existing.email && cleanE) existing.email = cleanE;
            if (!existing.idNumber && ((r as any).idNumber || (r as any).passportNo || (r as any).nidNumber)) {
                existing.idNumber = (r as any).idNumber || (r as any).passportNo || (r as any).nidNumber;
            }
        } else {
            // Truly new guest not present in saved profiles
            map.set(key, {
                id: r.id || `res-guest-${idx + 1}`,
                title: detectedTitle,
                name: cleanName,
                phone: rawPhone || '+880 1711-000000',
                altPhone: '',
                email: cleanE || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.com`,
                vipTier: spend > 50000 ? 'Gold' : r.bookingSource === 'Corporate' ? 'Corporate VIP' : 'Regular',
                nationality: (r as any).nationality || 'Bangladeshi',
                idType: (r as any).passportNo ? 'Passport' : 'National ID (NID)',
                idNumber: (r as any).passportNo || (r as any).nidNumber || (r as any).idNumber || '',
                dob: '',
                gender: 'Male',
                homeCity: (r as any).homeCity || 'Dhaka',
                homeCountry: (r as any).homeCountry || 'Bangladesh',
                address: '',
                postalCode: '',
                company: (r as any).company || (r.bookingSource === 'Corporate' ? (r as any).source : ''),
                designation: '',
                totalStays: 1,
                totalNights: nights,
                lifetimeSpendBDT: spend,
                loyaltyPoints: Math.round(spend / 20),
                lastStayDate: r.checkIn,
                preferences: {},
                isBlacklisted: false,
                stayHistory: [stayItem]
            });
        }
    });

    return Array.from(map.values());
};
