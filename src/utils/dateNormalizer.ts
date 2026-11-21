/**
 * HotelManagementOS - Universal Robust Date Normalizer
 * Converts diverse international, multi-script, textual, and noisy OCR dates to ISO (YYYY-MM-DD).
 */

const MULTILINGUAL_MONTH_MAP: Record<string, string> = {
    // English & Common OCR Noise Variants
    jan: '01', january: '01', jon: '01', jn: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10', woct: '10', oet: '10',
    nov: '11', november: '11',
    dec: '12', december: '12',
    // French
    janv: '01', janvier: '01',
    fevr: '02', févr: '02', fevrier: '02', février: '02',
    mars: '03',
    avr: '04', avril: '04',
    mai: '05',
    juin: '06',
    juil: '07', juillet: '07',
    aout: '08', août: '08',
    déc: '12', decembre: '12', décembre: '12',
    // Spanish / Portuguese
    ene: '01', enero: '01',
    febr: '02', febrero: '02', fevereiro: '02',
    marzo: '03', marco: '03', março: '03',
    abril: '04',
    mayo: '05', maio: '05',
    junio: '06', junho: '06',
    julio: '07', julho: '07',
    agosto: '08', agos: '08', ago: '08',
    septiembre: '09', setiembre: '09', setembro: '09',
    octubre: '10', outubro: '10',
    noviembre: '11', novembro: '11',
    diciembre: '12', dezembro: '12', dic: '12', dez: '12',
    // German
    märz: '03', marz: '03',
    okt: '10', oktober: '10'
};

const BN_DIGITS: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

const AR_DIGITS: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

const BN_MONTHS: Record<string, string> = {
    'জানুয়ারি': '01', 'ফেব্রুয়ারি': '02', 'মার্চ': '03', 'এপ্রিল': '04',
    'মে': '05', 'জুন': '06', 'জুলাই': '07', 'আগস্ট': '08',
    'সেপ্টেম্বর': '09', 'অক্টোবর': '10', 'নভেম্বর': '11', 'ডিসেম্বর': '12'
};

/**
 * Normalizes any date string found in identity documents to standard ISO (YYYY-MM-DD).
 * Handles OCR noise, multiple spaces, trailing punctuation, month names, and various digit scripts.
 */
export function parseFlexibleDate(dateStr: string): string {
    if (!dateStr) return '';

    // 1. Replace Bengali & Arabic digits with standard ASCII 0-9
    let clean = dateStr
        .replace(/[০-৯]/g, d => BN_DIGITS[d] || d)
        .replace(/[٠-٩]/g, d => AR_DIGITS[d] || d)
        .replace(/[,;]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // 2. Check Bengali month names
    for (const [bnM, num] of Object.entries(BN_MONTHS)) {
        if (clean.includes(bnM)) {
            const m = clean.match(/([0-9]{1,2})\s+[^\s0-9]+\s+([0-9]{4})/);
            if (m) {
                return `${m[2]}-${num}-${m[1].padStart(2, '0')}`;
            }
        }
    }

    // 3. Textual month formats: e.g. "10 Jun 1996", "10-June-1996", "10.Jun.1996", "10 Juin 1996"
    const textMonthDayFirst = clean.match(/(?:^|\D)([0-9]{1,2})[\s\-\/\.]+([A-Za-z\u00C0-\u017F]{3,12})[\s\-\/\.]+([0-9]{2,4})(?:\D|$)/);
    if (textMonthDayFirst) {
        const day = textMonthDayFirst[1].padStart(2, '0');
        const monthRaw = textMonthDayFirst[2].toLowerCase();
        let year = textMonthDayFirst[3];
        if (year.length === 2) {
            year = Number(year) > 40 ? `19${year}` : `20${year}`;
        }
        const monthNum = MULTILINGUAL_MONTH_MAP[monthRaw] ||
                         MULTILINGUAL_MONTH_MAP[monthRaw.slice(0, 4)] ||
                         MULTILINGUAL_MONTH_MAP[monthRaw.slice(0, 3)];
        if (monthNum && Number(day) >= 1 && Number(day) <= 31) {
            return `${year}-${monthNum}-${day}`;
        }
    }

    // 4. US textual format: e.g. "Jun 10, 1996" or "June 10 1996"
    const textMonthMonthFirst = clean.match(/(?:^|\D)([A-Za-z\u00C0-\u017F]{3,12})[\s\-\/\.]+([0-9]{1,2})[\s\-\/\,]+([0-9]{2,4})(?:\D|$)/);
    if (textMonthMonthFirst) {
        const monthRaw = textMonthMonthFirst[1].toLowerCase();
        const day = textMonthMonthFirst[2].padStart(2, '0');
        let year = textMonthMonthFirst[3];
        if (year.length === 2) {
            year = Number(year) > 40 ? `19${year}` : `20${year}`;
        }
        const monthNum = MULTILINGUAL_MONTH_MAP[monthRaw] ||
                         MULTILINGUAL_MONTH_MAP[monthRaw.slice(0, 4)] ||
                         MULTILINGUAL_MONTH_MAP[monthRaw.slice(0, 3)];
        if (monthNum && Number(day) >= 1 && Number(day) <= 31) {
            return `${year}-${monthNum}-${day}`;
        }
    }

    // 5. Numeric: "YYYY/MM/DD" or "YYYY-MM-DD" or "YYYY.MM.DD"
    const ymdMatch = clean.match(/(?:^|\D)([12][0-9]{3})[\s\/\-\.]+([0-9]{1,2})[\s\/\-\.]+([0-9]{1,2})(?:\D|$)/);
    if (ymdMatch) {
        const y = ymdMatch[1];
        const m = ymdMatch[2].padStart(2, '0');
        const d = ymdMatch[3].padStart(2, '0');
        if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
            return `${y}-${m}-${d}`;
        }
    }

    // 6. Numeric: "DD/MM/YYYY" or "DD-MM-YYYY" or "DD.MM.YYYY"
    const dmyMatch = clean.match(/(?:^|\D)([0-9]{1,2})[\s\/\-\.]+([0-9]{1,2})[\s\/\-\.]+([12][0-9]{3})(?:\D|$)/);
    if (dmyMatch) {
        const part1 = Number(dmyMatch[1]);
        const part2 = Number(dmyMatch[2]);
        const y = dmyMatch[3];

        if (part1 > 12 && part2 <= 12) {
            return `${y}-${String(part2).padStart(2, '0')}-${String(part1).padStart(2, '0')}`;
        }
        if (part2 > 12 && part1 <= 12) {
            return `${y}-${String(part1).padStart(2, '0')}-${String(part2).padStart(2, '0')}`;
        }
        return `${y}-${String(part2).padStart(2, '0')}-${String(part1).padStart(2, '0')}`;
    }

    // 7. Compact 8-digit numeric: "YYYYMMDD"
    const compact8 = clean.match(/\b([12][0-9]{3})(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])\b/);
    if (compact8) {
        return `${compact8[1]}-${compact8[2]}-${compact8[3]}`;
    }

    return clean.replace(/[^0-9A-Za-z\-\/\.\s]/g, '').trim();
}
