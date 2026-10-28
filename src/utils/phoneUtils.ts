/**
 * Universal Phone Number Normalization & International Matching Utilities
 * 
 * Supports domestic formats and international E.164 formats for any country:
 * USA/Canada (+1), UK (+44), India (+91), Bangladesh (+880), UAE (+971),
 * Saudi Arabia (+966), Malaysia (+60), Singapore (+65), Australia (+61), etc.
 */

/**
 * Normalizes phone numbers (domestic or international) into clean digits.
 * Strips formatting, spaces, brackets, hyphens, and international call prefix (00).
 */
export function normalizePhone(raw: string | null | undefined): string {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    }
    return digits;
}

/**
 * Universal phone matcher across all domestic and international formats.
 * 
 * Accurately matches:
 * 1. Exact pure digits: "12125551234" === "12125551234"
 * 2. Domestic leading zero vs international country code:
 *    - Bangladesh (+880): "01775167948" vs "+8801775167948"
 *    - UK (+44): "07911123456" vs "+447911123456"
 *    - USA/Canada (+1): "2125551234" vs "+12125551234"
 *    - India (+91): "09876543210" vs "+919876543210"
 *    - UAE (+971): "0501234567" vs "+971501234567"
 *    - Australia (+61): "0412345678" vs "+61412345678"
 */
export function isSamePhoneNumber(rawA: string | null | undefined, rawB: string | null | undefined): boolean {
    if (!rawA || !rawB) return false;
    const a = normalizePhone(rawA);
    const b = normalizePhone(rawB);
    if (a.length < 6 || b.length < 6) return false;
    if (a === b) return true;

    // Compare without leading domestic zeros
    const trimA = a.replace(/^0+/, '');
    const trimB = b.replace(/^0+/, '');
    if (trimA === trimB) return true;

    // Check if one is a suffix of the other with significant length (at least 8 digits)
    const minLen = Math.min(trimA.length, trimB.length);
    if (minLen >= 8) {
        if (trimA.endsWith(trimB) || trimB.endsWith(trimA)) return true;
    }

    // Match last 9 significant subscriber digits
    if (trimA.length >= 9 && trimB.length >= 9) {
        if (trimA.slice(-9) === trimB.slice(-9)) return true;
    }

    return false;
}
