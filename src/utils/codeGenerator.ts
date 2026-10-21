/**
 * Hospitality ERP Smart Short Code Generator & Duplicate Prevention Utility
 * Automatically generates clean, standardized uppercase short codes from entity titles/names,
 * checks for collision against existing codes in the dataset, and ensures 100% uniqueness.
 */

// Well-known hospitality abbreviations dictionary for professional ERP codes
const HOSPITALITY_ABBREVIATIONS: Record<string, string> = {
    // Room Types & Categories
    'deluxe': 'DLX',
    'superior': 'SUP',
    'executive': 'EXEC',
    'standard': 'STND',
    'presidential': 'PRES',
    'penthouse': 'PNT',
    'suite': 'STE',
    'single': 'SGL',
    'double': 'DBL',
    'twin': 'TWN',
    'king': 'KNG',
    'queen': 'QN',
    'studio': 'STD',
    'apartment': 'APT',
    'bungalow': 'BNG',
    'cottage': 'CTG',
    'villa': 'VIL',
    'dormitory': 'DRM',
    'family': 'FAM',

    // Building & Property Structures
    'main': 'MN',
    'tower': 'TWR',
    'wing': 'WNG',
    'block': 'BLK',
    'annex': 'ANX',
    'ocean': 'OCN',
    'sea': 'SEA',
    'bay': 'BAY',
    'beach': 'BCH',
    'garden': 'GDN',
    'resort': 'RST',
    'atrium': 'ATR',
    'floor': 'FL',
    'level': 'LVL',
    'ground': 'GND',
    'basement': 'BSMT',
    'rooftop': 'ROOF',
    'sky': 'SKY',

    // Meal Plans & F&B
    'continental': 'CP',
    'european': 'EP',
    'american': 'AP',
    'modified': 'MAP',
    'breakfast': 'BB',
    'buffet': 'BUF',
    'lunch': 'LCH',
    'dinner': 'DNR',
    'brunch': 'BRN',

    // Packages & Marketing Plans
    'honeymoon': 'HNY',
    'corporate': 'CORP',
    'business': 'BIZ',
    'package': 'PKG',
    'weekend': 'WKND',
    'weekday': 'WKD',
    'holiday': 'HLD',
    'summer': 'SMR',
    'winter': 'WTR',
    'advance': 'ADV',
    'special': 'SPL',
    'promotional': 'PROMO',
    'non-refundable': 'NONREF',
    'refundable': 'REF',
    'bar': 'BAR',

    // Safety, Amenities & Operations
    'emergency': 'EMRG',
    'fire': 'FIRE',
    'exit': 'EXIT',
    'extinguisher': 'EXT',
    'smoke': 'SMK',
    'detector': 'DET',
    'sprinkler': 'SPRNK',
    'elevator': 'ELEV',
    'lift': 'LIFT',
    'wheelchair': 'ADA',
    'accessible': 'ACC',
    'ramp': 'RMP',
    'housekeeping': 'HK',
    'linen': 'LIN',
    'closet': 'CLST',
    'pantry': 'PNTR',
    'chute': 'CHUTE',
    'ice': 'ICE',
    'machine': 'MCH',
    'water': 'WTR',
    'filtered': 'FLTR',
    'security': 'SEC',
    'cctv': 'CCTV',
    'camera': 'CAM',
    'defibrillator': 'AED',
    'medical': 'MED',
    'first': '1ST',
    'aid': 'AID'
};

const STOP_WORDS = new Set(['and', 'or', 'the', 'of', 'for', 'with', 'in', 'at', 'on', 'a', 'an', '&', '-', '/']);

export interface CodeGeneratorOptions {
    prefix?: string;
    maxLength?: number;
    currentCode?: string; // If editing an existing item, its own code is not considered a collision
    preservePrefix?: boolean;
}

/**
 * Checks whether a short code is already in use by another entity.
 */
export function isShortCodeDuplicate(
    code: string,
    existingCodes: string[],
    currentCode?: string
): boolean {
    if (!code || !code.trim()) return false;
    const normalized = code.trim().toUpperCase();
    const normalizedCurrent = currentCode ? currentCode.trim().toUpperCase() : null;

    return existingCodes.some(existing => {
        if (!existing) return false;
        const normExisting = existing.trim().toUpperCase();
        if (normalizedCurrent && normExisting === normalizedCurrent) {
            return false; // Editing itself is allowed
        }
        return normExisting === normalized;
    });
}

/**
 * Generates a clean, unique short code from a name/title and guarantees zero duplicates.
 */
export function generateUniqueShortCode(
    name: string,
    existingCodes: string[],
    options: CodeGeneratorOptions = {}
): string {
    const { prefix = '', maxLength = 8, currentCode } = options;

    if (!name || !name.trim()) {
        let base = prefix ? `${prefix}-01` : 'ITEM-01';
        return ensureUnique(base, existingCodes, currentCode);
    }

    // Clean and split words
    const cleaned = name
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const rawWords = cleaned.split(' ').filter(w => w.length > 0);
    const words = rawWords.filter(w => !STOP_WORDS.has(w.toLowerCase()));
    const effectiveWords = words.length > 0 ? words : rawWords;

    // Check if name contains a number (e.g. "Floor 1", "Tower 2", "Room 101")
    const numberMatch = cleaned.match(/\b\d+\b/);
    const embeddedNumber = numberMatch ? numberMatch[0] : null;

    let candidate = '';

    // Strategy 1: Dictionary check for first word + subsequent acronym
    if (effectiveWords.length === 1) {
        const lower = effectiveWords[0].toLowerCase();
        if (HOSPITALITY_ABBREVIATIONS[lower]) {
            candidate = HOSPITALITY_ABBREVIATIONS[lower];
        } else if (lower.length <= 4) {
            candidate = lower.toUpperCase();
        } else {
            // Remove vowels except leading vowel
            const first = lower[0].toUpperCase();
            const restConsonants = lower.slice(1).replace(/[aeiou]/gi, '').toUpperCase();
            candidate = (first + restConsonants).slice(0, 4);
            if (candidate.length < 3) {
                candidate = lower.slice(0, 4).toUpperCase();
            }
        }
    } else if (effectiveWords.length === 2) {
        const w1 = effectiveWords[0].toLowerCase();
        const w2 = effectiveWords[1].toLowerCase();

        const abb1 = HOSPITALITY_ABBREVIATIONS[w1];
        const abb2 = HOSPITALITY_ABBREVIATIONS[w2];

        if (abb1 && abb2) {
            candidate = `${abb1}-${abb2}`;
        } else if (abb1) {
            candidate = `${abb1}-${w2.slice(0, 3).toUpperCase()}`;
        } else if (abb2) {
            candidate = `${w1.slice(0, 3).toUpperCase()}-${abb2}`;
        } else {
            // Take 2 chars of each or acronym
            candidate = `${w1.slice(0, 3).toUpperCase()}-${w2.slice(0, 3).toUpperCase()}`;
        }
    } else {
        // >= 3 words: Multi-word acronym or hybrid
        const acronym = effectiveWords.map(w => {
            const lower = w.toLowerCase();
            if (HOSPITALITY_ABBREVIATIONS[lower]) {
                return HOSPITALITY_ABBREVIATIONS[lower].slice(0, 2);
            }
            return w[0].toUpperCase();
        }).join('');

        if (acronym.length >= 3 && acronym.length <= 6) {
            candidate = acronym;
        } else {
            // Take first word abbreviated + next words initials
            const firstWordAbb = HOSPITALITY_ABBREVIATIONS[effectiveWords[0].toLowerCase()] || effectiveWords[0].slice(0, 3).toUpperCase();
            const restInitials = effectiveWords.slice(1).map(w => w[0].toUpperCase()).join('');
            candidate = `${firstWordAbb}-${restInitials}`;
        }
    }

    // If an embedded number exists and is not yet in candidate (e.g. "Floor 1" -> "FL-01")
    if (embeddedNumber && !candidate.includes(embeddedNumber)) {
        const paddedNum = embeddedNumber.length === 1 ? `0${embeddedNumber}` : embeddedNumber;
        candidate = `${candidate}-${paddedNum}`;
    }

    if (prefix && !candidate.startsWith(prefix)) {
        candidate = `${prefix}-${candidate}`;
    }

    // Clean up hyphens and trim to max length
    candidate = candidate
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '')
        .toUpperCase();

    if (candidate.length > maxLength) {
        candidate = candidate.slice(0, maxLength).replace(/-$/, '');
    }

    return ensureUnique(candidate, existingCodes, currentCode);
}

/**
 * Ensures code uniqueness by appending incremental numerical suffixes if duplicate is found.
 */
function ensureUnique(
    baseCode: string,
    existingCodes: string[],
    currentCode?: string
): string {
    const cleanBase = baseCode.trim().toUpperCase();
    if (!isShortCodeDuplicate(cleanBase, existingCodes, currentCode)) {
        return cleanBase;
    }

    // If collision exists, try base-2, base-3 or increment existing trailing number
    let counter = 2;
    let uniqueCandidate = `${cleanBase}-${counter}`;

    // If cleanBase already ends in a number like "FL-01", increment that number
    const match = cleanBase.match(/^(.*?)(\d+)$/);
    if (match) {
        const textPart = match[1];
        let numPart = parseInt(match[2], 10);
        while (isShortCodeDuplicate(`${textPart}${numPart}`, existingCodes, currentCode)) {
            numPart++;
        }
        return `${textPart}${numPart}`;
    }

    while (isShortCodeDuplicate(uniqueCandidate, existingCodes, currentCode)) {
        counter++;
        uniqueCandidate = `${cleanBase}-${counter}`;
    }

    return uniqueCandidate;
}
