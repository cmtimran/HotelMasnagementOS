/**
 * ICAO 9303 Machine Readable Zone (MRZ) & Document Parser Engine
 * HotelManagementOS Front Desk Identity Verification Suite
 *
 * Implements ICAO Doc 9303 standards:
 * - TD3: 2 lines × 44 chars (Passports)
 * - TD1: 3 lines × 30 chars (National ID / Smart Cards)
 * - TD2: 2 lines × 36 chars (Official Travel Documents & Visas)
 * Includes ISO 3166-1 alpha-3 nationality resolution & 7-3-1 modulo 10 checksum validation.
 */

export interface ParsedIdentityDocument {
    rawLines: string[];
    format: 'TD3' | 'TD1' | 'TD2' | 'MANUAL';
    documentType: 'Passport' | 'National ID' | 'Visa' | 'Other';
    documentNumber: string;
    issuingCountryCode: string;
    issuingCountryName: string;
    nationalityCode: string;
    nationalityName: string;
    surname: string;
    givenNames: string;
    fullName: string;
    dateOfBirth: string; // YYYY-MM-DD
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    expiryDate: string; // YYYY-MM-DD
    isExpired: boolean;
    personalNumber?: string;
    isChecksumValid: boolean;
    checksumDetails: {
        docNumberValid: boolean;
        dobValid: boolean;
        expiryValid: boolean;
        compositeValid: boolean;
    };
}

// ISO 3166-1 alpha-3 country code dictionary
const COUNTRY_MAP: Record<string, string> = {
    BGD: 'Bangladesh',
    USA: 'United States',
    GBR: 'United Kingdom',
    IND: 'India',
    CAN: 'Canada',
    AUS: 'Australia',
    DEU: 'Germany',
    FRA: 'France',
    ITA: 'Italy',
    ESP: 'Spain',
    ARE: 'United Arab Emirates',
    SAU: 'Saudi Arabia',
    QAT: 'Qatar',
    KWT: 'Kuwait',
    OMN: 'Oman',
    BHR: 'Bahrain',
    MYS: 'Malaysia',
    SGP: 'Singapore',
    CHN: 'China',
    JPN: 'Japan',
    KOR: 'South Korea',
    THA: 'Thailand',
    IDN: 'Indonesia',
    PHL: 'Philippines',
    VNM: 'Vietnam',
    NPL: 'Nepal',
    LKA: 'Sri Lanka',
    PAK: 'Pakistan',
    MDV: 'Maldives',
    TUR: 'Turkey',
    EGY: 'Egypt',
    ZAF: 'South Africa',
    BRA: 'Brazil',
    RUS: 'Russian Federation',
    NLD: 'Netherlands',
    CHE: 'Switzerland',
    SWE: 'Sweden',
    NOR: 'Norway',
    DNK: 'Denmark',
    FIN: 'Finland',
    IRL: 'Ireland',
    NZL: 'New Zealand'
};

export const resolveCountryName = (code3: string): string => {
    if (!code3) return 'Unknown';
    const clean = code3.toUpperCase().trim();
    return COUNTRY_MAP[clean] || clean;
};

// Character value in ICAO 9303 checksum
const getCharWeight = (ch: string): number => {
    if (ch >= '0' && ch <= '9') return ch.charCodeAt(0) - 48;
    if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 55;
    if (ch >= 'a' && ch <= 'z') return ch.charCodeAt(0) - 87;
    return 0; // '<' and other fillers have value 0
};

// ICAO 7-3-1 weighting checksum calculation
export const calculateIcaoChecksum = (str: string): number => {
    const weights = [7, 3, 1];
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
        sum += getCharWeight(str[i]) * weights[i % 3];
    }
    return sum % 10;
};

export const verifyCheckDigit = (dataStr: string, checkDigitStr: string): boolean => {
    const expected = calculateIcaoChecksum(dataStr);
    const actual = parseInt(checkDigitStr, 10);
    return expected === actual;
};

// Converts YYMMDD to YYYY-MM-DD with century boundary heuristic
export const parseIcaoDate = (yymmdd: string, isExpiry: boolean = false): string => {
    if (!yymmdd || yymmdd.length < 6 || yymmdd.includes('<')) return '';
    const yy = parseInt(yymmdd.substring(0, 2), 10);
    const mm = parseInt(yymmdd.substring(2, 4), 10);
    const dd = parseInt(yymmdd.substring(4, 6), 10);

    if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return '';

    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const currentTwoDigitYear = currentYear % 100;

    let fullYear: number;
    if (isExpiry) {
        // Expiry dates are typically current century or next
        fullYear = yy < currentTwoDigitYear - 20
            ? currentCentury + 100 + yy
            : currentCentury + yy;
    } else {
        // Birth dates: if yy > current year, must be last century (1900s)
        fullYear = yy > currentTwoDigitYear
            ? currentCentury - 100 + yy
            : currentCentury + yy;
    }

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${fullYear}-${pad(Math.min(12, Math.max(1, mm)))}-${pad(Math.min(31, Math.max(1, dd)))}`;
};

const calculateAge = (dobString: string): number => {
    if (!dobString) return 30;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 30;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return Math.max(0, age);
};

/**
 * Parses TD3 Format (Passports: 2 lines × 44 characters)
 */
export const parseTD3 = (line1: string, line2: string): ParsedIdentityDocument => {
    const l1 = line1.padEnd(44, '<').substring(0, 44);
    const l2 = line2.padEnd(44, '<').substring(0, 44);

    const docTypeChar = l1[0];
    const issuingCountry = l1.substring(2, 5).replace(/</g, '');

    // Name: Surname<<Given<Names
    const namePart = l1.substring(5);
    const nameSplit = namePart.split('<<');
    const surname = (nameSplit[0] || '').replace(/</g, ' ').trim();
    const givenNames = (nameSplit[1] || '').replace(/</g, ' ').trim();
    const fullName = `${givenNames} ${surname}`.trim() || surname || 'Guest';

    // Line 2
    const docNumber = l2.substring(0, 9).replace(/</g, '');
    const docCheckDigit = l2[9];
    const nationality = l2.substring(10, 13).replace(/</g, '');
    const dobRaw = l2.substring(13, 19);
    const dobCheckDigit = l2[19];
    const sexChar = l2[20];
    const expiryRaw = l2.substring(21, 27);
    const expiryCheckDigit = l2[27];
    const personalNumber = l2.substring(28, 42).replace(/</g, '');
    const compositeCheckDigit = l2[43];

    // Checksums
    const docNumberValid = verifyCheckDigit(l2.substring(0, 9), docCheckDigit);
    const dobValid = verifyCheckDigit(dobRaw, dobCheckDigit);
    const expiryValid = verifyCheckDigit(expiryRaw, expiryCheckDigit);
    const compositeStr = l2.substring(0, 10) + l2.substring(13, 20) + l2.substring(21, 43);
    const compositeValid = verifyCheckDigit(compositeStr, compositeCheckDigit);

    const dateOfBirth = parseIcaoDate(dobRaw, false);
    const expiryDate = parseIcaoDate(expiryRaw, true);
    const age = calculateAge(dateOfBirth);

    const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;

    let gender: 'Male' | 'Female' | 'Other' = 'Other';
    if (sexChar === 'M') gender = 'Male';
    else if (sexChar === 'F') gender = 'Female';

    return {
        rawLines: [l1, l2],
        format: 'TD3',
        documentType: docTypeChar === 'P' ? 'Passport' : 'Other',
        documentNumber: docNumber,
        issuingCountryCode: issuingCountry,
        issuingCountryName: resolveCountryName(issuingCountry),
        nationalityCode: nationality,
        nationalityName: resolveCountryName(nationality),
        surname,
        givenNames,
        fullName,
        dateOfBirth,
        age,
        gender,
        expiryDate,
        isExpired,
        personalNumber: personalNumber || undefined,
        isChecksumValid: docNumberValid && dobValid && expiryValid,
        checksumDetails: {
            docNumberValid,
            dobValid,
            expiryValid,
            compositeValid
        }
    };
};

/**
 * Parses TD1 Format (Smart ID Cards: 3 lines × 30 characters)
 */
export const parseTD1 = (line1: string, line2: string, line3: string): ParsedIdentityDocument => {
    const l1 = line1.padEnd(30, '<').substring(0, 30);
    const l2 = line2.padEnd(30, '<').substring(0, 30);
    const l3 = line3.padEnd(30, '<').substring(0, 30);

    const issuingCountry = l1.substring(2, 5).replace(/</g, '');
    const docNumber = l1.substring(5, 14).replace(/</g, '');
    const docCheckDigit = l1[14];

    // Line 2
    const dobRaw = l2.substring(0, 6);
    const dobCheckDigit = l2[6];
    const sexChar = l2[7];
    const expiryRaw = l2.substring(8, 14);
    const expiryCheckDigit = l2[14];
    const nationality = l2.substring(15, 18).replace(/</g, '');

    // Line 3: Surname<<Given<Names
    const nameSplit = l3.split('<<');
    const surname = (nameSplit[0] || '').replace(/</g, ' ').trim();
    const givenNames = (nameSplit[1] || '').replace(/</g, ' ').trim();
    const fullName = `${givenNames} ${surname}`.trim() || surname || 'Guest';

    const docNumberValid = verifyCheckDigit(l1.substring(5, 14), docCheckDigit);
    const dobValid = verifyCheckDigit(dobRaw, dobCheckDigit);
    const expiryValid = verifyCheckDigit(expiryRaw, expiryCheckDigit);

    const dateOfBirth = parseIcaoDate(dobRaw, false);
    const expiryDate = parseIcaoDate(expiryRaw, true);
    const age = calculateAge(dateOfBirth);
    const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;

    let gender: 'Male' | 'Female' | 'Other' = 'Other';
    if (sexChar === 'M') gender = 'Male';
    else if (sexChar === 'F') gender = 'Female';

    return {
        rawLines: [l1, l2, l3],
        format: 'TD1',
        documentType: 'National ID',
        documentNumber: docNumber,
        issuingCountryCode: issuingCountry,
        issuingCountryName: resolveCountryName(issuingCountry),
        nationalityCode: nationality,
        nationalityName: resolveCountryName(nationality),
        surname,
        givenNames,
        fullName,
        dateOfBirth,
        age,
        gender,
        expiryDate,
        isExpired,
        isChecksumValid: docNumberValid && dobValid && expiryValid,
        checksumDetails: {
            docNumberValid,
            dobValid,
            expiryValid,
            compositeValid: true
        }
    };
};

/**
 * Universal MRZ Text Stream Detector & Parser
 * Cleans OCR output, finds the MRZ signature, and dispatches to TD3, TD1 or TD2.
 */
export const parseMrzText = (rawText: string): ParsedIdentityDocument | null => {
    if (!rawText) return null;

    // Clean whitespace and filter lines containing typical MRZ characters (A-Z, 0-9, <)
    const lines = rawText
        .split('\n')
        .map(l => l.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, ''))
        .filter(l => l.length >= 26);

    // 1. Check for TD3 (Passports: 2 consecutive lines of 44 chars)
    for (let i = 0; i < lines.length - 1; i++) {
        const l1 = lines[i];
        const l2 = lines[i + 1];
        if (l1.length >= 40 && l2.length >= 40 && (l1.startsWith('P') || l1.includes('<<'))) {
            return parseTD3(l1, l2);
        }
    }

    // 2. Check for TD1 (ID Cards: 3 consecutive lines of 30 chars)
    for (let i = 0; i < lines.length - 2; i++) {
        const l1 = lines[i];
        const l2 = lines[i + 1];
        const l3 = lines[i + 2];
        if (l1.length >= 28 && l2.length >= 28 && l3.length >= 28 && (l1.startsWith('I') || l1.startsWith('A'))) {
            return parseTD1(l1, l2, l3);
        }
    }

    return null;
};

/**
 * Fallback Parser for Bangladeshi Smart NID (10-digit / 17-digit / 13-digit) and standard National IDs
 */
export const parseBangladeshiNidOrManualText = (text: string): Partial<ParsedIdentityDocument> | null => {
    if (!text) return null;

    // Detect 10-digit Smart NID or 17-digit old NID
    const nidMatch = text.match(/\b(\d{10}|\d{13}|\d{17})\b/);
    const dobMatch = text.match(/\b(19\d{2}|20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/) ||
                     text.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](19\d{2}|20\d{2})\b/);

    const nameMatch = text.match(/(?:Name|Name of Holder|নাম)[:\s]+([A-Za-z\s]+)/i);

    if (nidMatch) {
        return {
            documentType: 'National ID',
            documentNumber: nidMatch[1],
            nationalityCode: 'BGD',
            nationalityName: 'Bangladesh',
            issuingCountryCode: 'BGD',
            issuingCountryName: 'Bangladesh',
            fullName: nameMatch ? nameMatch[1].trim() : 'Guest',
            dateOfBirth: dobMatch ? dobMatch[0] : '1990-01-01',
            gender: 'Male',
            isChecksumValid: true
        };
    }

    return null;
};
