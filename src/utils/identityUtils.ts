/**
 * Universal Polymorphic Identity & Blacklist Management Utilities
 * HotelManagementOS Enterprise PMS Engine
 */

export type IdentityType =
    | 'National ID (NID)'
    | 'Passport'
    | 'Driving License'
    | 'Diplomatic ID'
    | 'Birth Certificate'
    | 'Other';

export type BlacklistCategory =
    | 'Payment Default / Unpaid Folio'
    | 'Property Damage'
    | 'Disruptive Behavior / Harassment'
    | 'Fraud / Fake Identity'
    | 'Security Threat'
    | 'Manager Discretion'
    | 'Other';

export interface BlacklistInfo {
    isBlacklisted: boolean;
    reason?: string;
    category?: BlacklistCategory;
    blacklistedBy?: string;
    blacklistedAt?: string;
}

export interface PolymorphicIdentityData {
    idType: IdentityType;
    idNumber: string;
    normalizedId: string;

    // Date of Birth & Gender
    dob?: string;
    gender?: 'Male' | 'Female' | 'Other';

    // NID Attributes
    nidType?: 'Smart NID (10 Digits)' | 'Old NID (13/17 Digits)';
    fatherOrSpouseName?: string;

    // Passport & Visa Attributes
    passportCountry?: string;
    passportExpiry?: string;
    passportIssuePlace?: string;
    hasVisa?: boolean;
    visaNumber?: string;
    visaType?: 'Tourist' | 'Business' | 'Diplomatic' | 'Work / Employment' | 'Student' | 'Transit' | 'On-Arrival';
    visaExpiry?: string;
    entryPort?: string;
    entryDate?: string;

    // Driving License Attributes
    drivingAuthority?: string;
    vehicleClass?: 'Light' | 'Medium' | 'Heavy' | 'Motorcycle' | 'Professional';
    drivingExpiry?: string;

    // Diplomatic ID Attributes
    diplomaticMission?: string;
    officialDesignation?: string;
    diplomaticExpiry?: string;
}

export interface ProfileEditDiff {
    field: string;
    fieldLabel: string;
    oldValue: any;
    newValue: any;
}

export interface ProfileEditAuditEntry {
    id?: number | string;
    guestId: number;
    changedBy: string;
    changedAt: string;
    changeSummary: string;
    changes: ProfileEditDiff[];
}

/**
 * Maps Bengali numeral digits (০-৯) to standard English numerals (0-9)
 */
export function convertBengaliToEnglishDigits(input: string): string {
    if (!input) return '';
    const bengaliToEnglish: Record<string, string> = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    return input.replace(/[০-৯]/g, char => bengaliToEnglish[char] || char);
}

/**
 * Universal normalization for search and storage.
 * Strips whitespace, hyphens, slashes, and converts to uppercase standard.
 */
export function normalizeIdentityNumber(rawId: string | undefined | null, _idType?: string): string {
    if (!rawId) return '';
    const converted = convertBengaliToEnglishDigits(String(rawId));
    // Remove all whitespace, hyphens, slashes, dots
    const cleaned = converted.replace(/[\s\-_/.]/g, '').toUpperCase();
    return cleaned;
}

/**
 * Formats an identity number nicely for human readability
 */
export function formatIdentityDisplay(idNumber: string, idType: IdentityType | string): string {
    if (!idNumber) return '';
    const clean = normalizeIdentityNumber(idNumber, idType);

    if (idType === 'National ID (NID)') {
        // Smart NID 10-digit: XXX XXX XXXX
        if (clean.length === 10 && /^\d+$/.test(clean)) {
            return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
        }
        // Old 17-digit: XXXX XXXX XXXX XXXXX
        if (clean.length === 17 && /^\d+$/.test(clean)) {
            return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12)}`;
        }
        // Old 13-digit: XXXX XXXX XXXXX
        if (clean.length === 13 && /^\d+$/.test(clean)) {
            return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8)}`;
        }
    }

    if (idType === 'Passport') {
        // Standard Machine Readable Passport: [A-Z]{1,2}[0-9]{7,8}
        return clean;
    }

    if (idType === 'Driving License') {
        // e.g. DK0123456 -> DK-0123456
        if (/^[A-Z]{2}\d+$/.test(clean)) {
            return `${clean.slice(0, 2)}-${clean.slice(2)}`;
        }
    }

    return clean;
}

/**
 * Flexible comparison to check if two identity numbers match regardless of typing format
 */
export function isSameIdentityNumber(
    idA: string | undefined | null,
    idB: string | undefined | null
): boolean {
    if (!idA || !idB) return false;
    const normA = normalizeIdentityNumber(idA);
    const normB = normalizeIdentityNumber(idB);
    if (!normA || !normB) return false;
    return normA === normB;
}

/**
 * Validates whether an identity number matches standard criteria for its type
 */
export function validateIdentityNumber(
    idNumber: string,
    idType: IdentityType | string
): { isValid: boolean; warning?: string } {
    const clean = normalizeIdentityNumber(idNumber, idType);
    if (!clean) {
        return { isValid: false, warning: 'Identity number is required.' };
    }

    if (idType === 'National ID (NID)') {
        if (/^\d{10}$/.test(clean)) {
            return { isValid: true }; // Smart NID
        }
        if (/^\d{13}$/.test(clean) || /^\d{17}$/.test(clean)) {
            return { isValid: true }; // Traditional NID
        }
        return {
            isValid: false,
            warning: 'National ID should typically be 10 digits (Smart Card) or 13/17 digits (Classic NID).'
        };
    }

    if (idType === 'Passport') {
        if (clean.length >= 6 && clean.length <= 15) {
            return { isValid: true };
        }
        return {
            isValid: false,
            warning: 'Passport numbers are typically 6 to 12 alphanumeric characters.'
        };
    }

    if (idType === 'Driving License') {
        if (clean.length >= 6 && clean.length <= 20) {
            return { isValid: true };
        }
        return {
            isValid: false,
            warning: 'Driving License number appears incomplete or invalid.'
        };
    }

    return { isValid: clean.length >= 4 };
}
