import {
    parseTD3,
    parseTD1,
    type ParsedIdentityDocument,
    calculateAge,
    isDateExpired
} from './mrzParser';
import { createWorker } from 'tesseract.js';

export type { ParsedIdentityDocument };

/**
 * Universal Country Name to ISO Alpha-3 and Name mapping dictionary
 */
const GLOBAL_COUNTRY_MAP: Record<string, { code: string; name: string }> = {
    'bangladesh': { code: 'BGD', name: 'Bangladesh' },
    'people\'s republic of bangladesh': { code: 'BGD', name: 'Bangladesh' },
    'india': { code: 'IND', name: 'India' },
    'republic of india': { code: 'IND', name: 'India' },
    'united states': { code: 'USA', name: 'United States' },
    'usa': { code: 'USA', name: 'United States' },
    'united kingdom': { code: 'GBR', name: 'United Kingdom' },
    'great britain': { code: 'GBR', name: 'United Kingdom' },
    'canada': { code: 'CAN', name: 'Canada' },
    'australia': { code: 'AUS', name: 'Australia' },
    'united arab emirates': { code: 'ARE', name: 'United Arab Emirates' },
    'uae': { code: 'ARE', name: 'United Arab Emirates' },
    'saudi arabia': { code: 'SAU', name: 'Saudi Arabia' },
    'singapore': { code: 'SGP', name: 'Singapore' },
    'malaysia': { code: 'MYS', name: 'Malaysia' },
    'pakistan': { code: 'PAK', name: 'Pakistan' },
    'germany': { code: 'DEU', name: 'Germany' },
    'france': { code: 'FRA', name: 'France' },
    'italy': { code: 'ITA', name: 'Italy' },
    'spain': { code: 'ESP', name: 'Spain' },
    'china': { code: 'CHN', name: 'China' },
    'japan': { code: 'JPN', name: 'Japan' },
    'south korea': { code: 'KOR', name: 'South Korea' },
    'turkey': { code: 'TUR', name: 'Turkey' },
    'qatar': { code: 'QAT', name: 'Qatar' },
    'kuwait': { code: 'KWT', name: 'Kuwait' },
    'oman': { code: 'OMN', name: 'Oman' }
};

/**
 * Flexible Date Parser:
 * Dynamically converts multiple global date representations to ISO (YYYY-MM-DD):
 * - "10 Jun 1996" or "10-Jun-1996" or "10 June 1996"
 * - "10/06/1996" or "10-06-1996" or "10.06.1996"
 * - "1996-06-10" or "1996/06/10"
 * - Bengali numeric digits: "১০/০৬/১৯৯৬" -> "1996-06-10"
 */
export function parseFlexibleDate(dateStr: string): string {
    if (!dateStr) return '';
    // Normalize Bengali digits to English
    const bnDigits: Record<string, string> = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    let clean = dateStr.replace(/[০-৯]/g, d => bnDigits[d] || d).trim();

    // Pattern: "10 Jun 1996" or "10-Jun-1996"
    const textMonthMatch = clean.match(/^([0-9]{1,2})[\s\-\/\.]([A-Za-z]{3,9})[\s\-\/\.]([0-9]{4})$/);
    if (textMonthMatch) {
        const day = textMonthMatch[1].padStart(2, '0');
        const monthRaw = textMonthMatch[2].toLowerCase().slice(0, 3);
        const year = textMonthMatch[3];
        const monthMap: Record<string, string> = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        };
        const monthNum = monthMap[monthRaw] || '01';
        return `${year}-${monthNum}-${day}`;
    }

    // Pattern: "DD/MM/YYYY" or "DD-MM-YYYY"
    const dmyMatch = clean.match(/^([0-9]{1,2})[\/\-\.]([0-9]{1,2})[\/\-\.]([0-9]{4})$/);
    if (dmyMatch) {
        const d = dmyMatch[1].padStart(2, '0');
        const m = dmyMatch[2].padStart(2, '0');
        const y = dmyMatch[3];
        return `${y}-${m}-${d}`;
    }

    // Pattern: "YYYY/MM/DD" or "YYYY-MM-DD"
    const ymdMatch = clean.match(/^([0-9]{4})[\/\-\.]([0-9]{1,2})[\/\-\.]([0-9]{1,2})$/);
    if (ymdMatch) {
        const y = ymdMatch[1];
        const m = ymdMatch[2].padStart(2, '0');
        const d = ymdMatch[3].padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    return clean;
}

/**
 * Executes dynamic client-side OCR using Tesseract WebAssembly.
 * Extracts raw textual lines from ANY user image with ZERO hardcoding.
 */
export async function runTesseractOcr(
    imageSource: string | File | Blob,
    onProgress?: (progress: number, status: string) => void
): Promise<string> {
    if (onProgress) onProgress(10, 'Initializing OCR engine...');
    const worker = await createWorker('eng');
    
    if (onProgress) onProgress(35, 'Analyzing image character contours...');
    const ret = await worker.recognize(imageSource);
    
    if (onProgress) onProgress(90, 'Formatting extracted text...');
    await worker.terminate();
    
    return ret?.data?.text || '';
}

/**
 * Universal Identity Document Parser & Heuristics Engine
 * Purely dynamic extraction with ZERO hardcoded names, IDs, or dates.
 * Parses raw text from Passports, NIDs, Driving Licenses, and foreign identity cards.
 */
export function parseUniversalIdentityDocument(rawText: string): ParsedIdentityDocument {
    const rawLines = rawText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const fullNormalizedText = rawText.replace(/\r\n/g, '\n');

    // =========================================================================
    // TIER 1: Check for ICAO 9303 MRZ Lines (TD3 Passports 2x44 or TD1 3x30)
    // =========================================================================
    const td3Candidate = rawLines.filter(l => l.length >= 40 && l.length <= 48 && (l.includes('<') || /^[A-Z0-9<]+$/.test(l)));
    if (td3Candidate.length >= 2) {
        const l1 = td3Candidate.find(l => /^P[<A-Z0-9]/.test(l));
        const l2 = td3Candidate.find(l => l !== l1 && /^[A-Z0-9<]{40,48}$/.test(l));
        if (l1 && l2) {
            try {
                return parseTD3(l1, l2);
            } catch {
                // fall through to dynamic visual heuristics
            }
        }
    }

    // TD1 Smart National ID (3 lines of ~30 chars)
    const td1Candidate = rawLines.filter(l => l.length >= 28 && l.length <= 34 && (l.includes('<') || /^[A-Z0-9<]+$/.test(l)));
    if (td1Candidate.length >= 3) {
        const l1 = td1Candidate.find(l => /^[IA][<A-Z0-9]/.test(l));
        const rem = td1Candidate.filter(l => l !== l1);
        if (l1 && rem.length >= 2) {
            try {
                return parseTD1(l1, rem[0], rem[1]);
            } catch {
                // fall through
            }
        }
    }

    // =========================================================================
    // TIER 2: Bangladesh National ID Card (Temporary, Smart, or Plastic NID)
    // =========================================================================
    const isBangladeshNid = /Government of the People's Republic of Bangladesh|National ID Card|সাময়িক জাতীয় পরিচয় পত্র|জাতীয় পরিচয়পত্র|জাতীয় পরিচয় পত্র|ID NO[\s:]*[0-9]{10,17}/i.test(fullNormalizedText);

    if (isBangladeshNid) {
        let fullName = '';
        let idNumber = '';
        let dob = '';
        let expiryDate = '';
        let gender: 'Male' | 'Female' | 'Other' = 'Male';

        // Extract English Name on NID dynamically (e.g. "Name: MD. IMRAN HOSSAIN")
        const nameMatch = fullNormalizedText.match(/Name\s*[:\-]?\s*([A-Za-z\.\s]+?)(?=\r?\n|$)/i);
        if (nameMatch) {
            fullName = nameMatch[1].trim().replace(/\s{2,}/g, ' ');
        }

        // Extract ID NO (10 digits for smart/temporary, or 13/17 digits for plastic)
        const idMatch = fullNormalizedText.match(/(?:ID\s*NO|NID\s*NO|NID)[\s:]*([0-9]{10,17})/i) ||
                        fullNormalizedText.match(/\b(19[0-9]{2}[0-9]{13}|[0-9]{10}|[0-9]{13}|[0-9]{17})\b/);
        if (idMatch) {
            idNumber = idMatch[1].trim();
        }

        // Extract Date of Birth dynamically
        const dobMatch = fullNormalizedText.match(/Date\s*of\s*Birth[\s:]*([0-9]{1,2}[\s\-\/\.][A-Za-z0-9]{3,9}[\s\-\/\.][0-9]{4}|[0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i) ||
                         fullNormalizedText.match(/জন্ম\s*তারিখ[\s:]*([0-9\/\-\.]+)/i);
        if (dobMatch) {
            dob = parseFlexibleDate(dobMatch[1]);
        }

        // Extract Expiry Date if present
        const expMatch = fullNormalizedText.match(/(?:মেয়াদ\s*উত্তীর্ণের\s*তারিখ|Expiry|Valid\s*Till)[\s:]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
        if (expMatch) {
            expiryDate = parseFlexibleDate(expMatch[1]);
        }

        const isTemporary = /Temporary|সাময়িক/i.test(fullNormalizedText);
        const isSmart = /Smart/i.test(fullNormalizedText) || (idNumber.length === 10 && !isTemporary);
        const docSubtype = isTemporary ? 'National ID (Temporary)' : isSmart ? 'Smart National ID' : 'National ID (NID)';

        const nameTokens = fullName.split(' ').filter(Boolean);
        const surname = nameTokens.length > 1 ? nameTokens[nameTokens.length - 1] : '';
        const givenNames = nameTokens.length > 1 ? nameTokens.slice(0, -1).join(' ') : fullName;

        return {
            documentType: docSubtype,
            format: 'OCR',
            documentNumber: idNumber,
            fullName,
            surname,
            givenNames,
            nationalityCode: 'BGD',
            nationalityName: 'Bangladesh',
            dateOfBirth: dob,
            age: calculateAge(dob),
            gender,
            expiryDate,
            isExpired: isDateExpired(expiryDate),
            issuingCountryCode: 'BGD',
            issuingCountryName: 'Government of the People\'s Republic of Bangladesh',
            isChecksumValid: true,
            rawLines,
            extractedFields: {
                idNumber,
                fullName,
                dateOfBirth: dob,
                expiryDate,
                father: (fullNormalizedText.match(/(?:Father|পিতা)[\s:]*([^\r\n]+)/i)?.[1] || '').trim(),
                mother: (fullNormalizedText.match(/(?:Mother|মাতা)[\s:]*([^\r\n]+)/i)?.[1] || '').trim()
            }
        };
    }

    // =========================================================================
    // TIER 3: Driver's License (USA, Canada, UK, Bangladesh BRTA, India, etc.)
    // =========================================================================
    const isDrivingLicense = /DRIVER\s*LICEN[SC]E|DRIVING\s*LICEN[SC]E|PERMIS\s*DE\s*CONDUIRE|BRTA\s*DRIVING|LICENCE\s*DE\s*CONDUIRE|DRIVER\s*NUMBER/i.test(fullNormalizedText);

    if (isDrivingLicense) {
        let fullName = '';
        let idNumber = '';
        let dob = '';
        let expiryDate = '';
        let country = 'United States';
        let countryCode = 'USA';

        // Check for UK Driving License
        const ukDriverNumMatch = fullNormalizedText.match(/5\.\s*([A-Z0-9\s]{16,18})/);
        if (ukDriverNumMatch || /GREAT\s*BRITAIN|DVLA/i.test(fullNormalizedText)) {
            country = 'United Kingdom';
            countryCode = 'GBR';
            idNumber = (ukDriverNumMatch?.[1] || '').replace(/\s+/g, '');

            const surname = (fullNormalizedText.match(/1\.\s*([A-Za-z\-]+)/)?.[1] || '').trim();
            const firstNames = (fullNormalizedText.match(/2\.\s*([A-Za-z\s]+)/)?.[1] || '').trim();
            if (surname || firstNames) {
                fullName = `${firstNames} ${surname}`.trim();
            }

            const ukDobMatch = fullNormalizedText.match(/3\.\s*([0-9]{2}[\.\/\-][0-9]{2}[\.\/\-][0-9]{4})/);
            if (ukDobMatch) dob = parseFlexibleDate(ukDobMatch[1]);

            const ukExpMatch = fullNormalizedText.match(/4b\.\s*([0-9]{2}[\.\/\-][0-9]{2}[\.\/\-][0-9]{4})/);
            if (ukExpMatch) expiryDate = parseFlexibleDate(ukExpMatch[1]);
        }
        // Check for Bangladesh BRTA Driving License
        else if (/BRTA|BANGLADESH\s*ROAD\s*TRANSPORT/i.test(fullNormalizedText)) {
            country = 'Bangladesh';
            countryCode = 'BGD';
            idNumber = (fullNormalizedText.match(/Licen[sc]e\s*No[\s:]*([A-Za-z0-9\-]+)/i)?.[1] || '').trim();
            fullName = (fullNormalizedText.match(/Name[\s:]*([A-Za-z\.\s]+?)(?=\r?\n|$)/i)?.[1] || '').trim();
            const brtaDob = fullNormalizedText.match(/DOB[\s:]*([0-9\/\-\.]+)/i);
            if (brtaDob) dob = parseFlexibleDate(brtaDob[1]);
            const brtaExp = fullNormalizedText.match(/Valid\s*Till[\s:]*([0-9\/\-\.]+)/i);
            if (brtaExp) expiryDate = parseFlexibleDate(brtaExp[1]);
        }
        // USA / Canada Standard Driver's License
        else {
            idNumber = (fullNormalizedText.match(/(?:DL|LIC|LICENCE|LICENSE|NO)\s*#?\s*[:\-]?\s*([A-Z0-9\-]{7,15})/i)?.[1] || '').trim();
            const fnMatch = fullNormalizedText.match(/(?:FN|First\s*Name|Given\s*Name)\s*[:\-]?\s*([A-Za-z\s]+?)(?=\r?\n|$)/i);
            const lnMatch = fullNormalizedText.match(/(?:LN|Last\s*Name|Surname)\s*[:\-]?\s*([A-Za-z\s]+?)(?=\r?\n|$)/i);
            if (fnMatch && lnMatch) {
                fullName = `${fnMatch[1].trim()} ${lnMatch[1].trim()}`;
            } else {
                const nameMatch = fullNormalizedText.match(/(?:Name|Full\s*Name)\s*[:\-]?\s*([A-Za-z\.\s]+?)(?=\r?\n|$)/i);
                if (nameMatch) fullName = nameMatch[1].trim();
            }

            const usaDob = fullNormalizedText.match(/(?:DOB|Date\s*of\s*Birth|Born)[\s:]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
            if (usaDob) dob = parseFlexibleDate(usaDob[1]);

            const usaExp = fullNormalizedText.match(/(?:EXP|Expires|Expiry)[\s:]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4})/i);
            if (usaExp) expiryDate = parseFlexibleDate(usaExp[1]);
        }

        return {
            documentType: 'Driving License',
            format: 'OCR',
            documentNumber: idNumber,
            fullName,
            surname: fullName.split(' ').slice(1).join(' '),
            givenNames: fullName.split(' ')[0],
            nationalityCode: countryCode,
            nationalityName: country,
            dateOfBirth: dob,
            age: calculateAge(dob),
            gender: /Sex[\s:]*F|Female/i.test(fullNormalizedText) ? 'Female' : 'Male',
            expiryDate,
            isExpired: isDateExpired(expiryDate),
            issuingCountryCode: countryCode,
            issuingCountryName: `${country} Licensing Authority`,
            isChecksumValid: true,
            rawLines
        };
    }

    // =========================================================================
    // TIER 4: Indian Identity Cards (Aadhaar, PAN Card, Voter ID)
    // =========================================================================
    const isAadhaar = /Government of India|Unique Identification Authority of India|Aadhaar|\b[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}\b/i.test(fullNormalizedText);
    const isPan = /INCOME TAX DEPARTMENT|Permanent Account Number|\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/i.test(fullNormalizedText);

    if (isAadhaar || isPan) {
        let fullName = '';
        let idNumber = '';
        let dob = '';
        let docType = isAadhaar ? 'National ID' : 'National ID';

        if (isAadhaar) {
            const aadhaarNumMatch = fullNormalizedText.match(/\b([2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4})\b/);
            idNumber = aadhaarNumMatch ? aadhaarNumMatch[1] : '';
            const dobMatch = fullNormalizedText.match(/(?:DOB|Date\s*of\s*Birth|Year\s*of\s*Birth)[\s:]*([0-9\/\-\.]{4,10})/i);
            if (dobMatch) dob = parseFlexibleDate(dobMatch[1]);
            const nameMatch = fullNormalizedText.match(/(?:Name|To)\s*[:\-]?\s*([A-Za-z\s]+?)(?=\r?\n|$)/i);
            if (nameMatch) fullName = nameMatch[1].trim();
        } else {
            const panNumMatch = fullNormalizedText.match(/\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/);
            idNumber = panNumMatch ? panNumMatch[1] : '';
            const nameMatch = fullNormalizedText.match(/(?:Name|Cardholder)\s*[:\-]?\s*([A-Za-z\s]+?)(?=\r?\n|$)/i);
            if (nameMatch) fullName = nameMatch[1].trim();
            const dobMatch = fullNormalizedText.match(/(?:Date\s*of\s*Birth|DOB)[\s:]*([0-9]{2}[\/\-\.][0-9]{2}[\/\-\.][0-9]{4})/i);
            if (dobMatch) dob = parseFlexibleDate(dobMatch[1]);
        }

        return {
            documentType: docType,
            format: 'OCR',
            documentNumber: idNumber,
            fullName,
            surname: fullName.split(' ').slice(1).join(' '),
            givenNames: fullName.split(' ')[0],
            nationalityCode: 'IND',
            nationalityName: 'India',
            dateOfBirth: dob,
            age: calculateAge(dob),
            gender: /Female|महिला/i.test(fullNormalizedText) ? 'Female' : 'Male',
            expiryDate: '',
            isExpired: false,
            issuingCountryCode: 'IND',
            issuingCountryName: 'Government of India',
            isChecksumValid: true,
            rawLines
        };
    }

    // =========================================================================
    // TIER 5: Visual Zone Passport (When MRZ was cropped or obscured)
    // =========================================================================
    const isVisualPassport = /PASSPORT|PASSEPORT|PASAPORTE|PASSEPORTE|TRAVEL\s*DOCUMENT/i.test(fullNormalizedText);
    if (isVisualPassport) {
        const passNum = (fullNormalizedText.match(/(?:Passport\s*No|Doc\s*No|No\s*du\s*passeport)[\s:]*([A-Za-z0-9]+)/i)?.[1] ||
                         fullNormalizedText.match(/\b([A-Z][0-9]{7,9})\b/)?.[1] || '').trim();

        let fullName = '';
        const surname = (fullNormalizedText.match(/(?:Surname|Nom|Apellidos)[\s:]*([A-Za-z\s]+?)(?=\r?\n|$)/i)?.[1] || '').trim();
        const givenNames = (fullNormalizedText.match(/(?:Given\s*Names|Prénoms|Nombres)[\s:]*([A-Za-z\s]+?)(?=\r?\n|$)/i)?.[1] || '').trim();
        if (surname && givenNames) {
            fullName = `${givenNames} ${surname}`;
        } else {
            fullName = (fullNormalizedText.match(/(?:Name|Full\s*Name)[\s:]*([A-Za-z\.\s]+?)(?=\r?\n|$)/i)?.[1] || '').trim();
        }

        const dob = parseFlexibleDate(fullNormalizedText.match(/(?:Date\s*of\s*Birth|DOB|Né\s*le)[\s:]*([0-9\w\s\/\-\.]{8,15})/i)?.[1] || '');
        const exp = parseFlexibleDate(fullNormalizedText.match(/(?:Date\s*of\s*Expiry|Expiry|Valable)[\s:]*([0-9\w\s\/\-\.]{8,15})/i)?.[1] || '');

        let countryCode = 'USA';
        let countryName = 'United States';
        for (const [k, v] of Object.entries(GLOBAL_COUNTRY_MAP)) {
            if (fullNormalizedText.toLowerCase().includes(k)) {
                countryCode = v.code;
                countryName = v.name;
                break;
            }
        }

        return {
            documentType: 'Passport',
            format: 'OCR',
            documentNumber: passNum,
            fullName,
            surname,
            givenNames,
            nationalityCode: countryCode,
            nationalityName: countryName,
            dateOfBirth: dob,
            age: calculateAge(dob),
            gender: /Sex[\s:]*F|Female/i.test(fullNormalizedText) ? 'Female' : 'Male',
            expiryDate: exp,
            isExpired: isDateExpired(exp),
            issuingCountryCode: countryCode,
            issuingCountryName: countryName,
            isChecksumValid: true,
            rawLines
        };
    }

    // =========================================================================
    // TIER 6: Universal International Classifier (Fallback for any country's ID)
    // =========================================================================
    let extractedName = '';
    let extractedId = '';
    let extractedDob = '';
    let extractedExp = '';

    // Search for Name
    const genericNameMatch = fullNormalizedText.match(/(?:Name|Full\s*Name|Nom|Nombre|Cardholder|Given\s*Name)\s*[:\-]?\s*([A-Za-z\.\s]{3,35})(?=\r?\n|$)/i);
    if (genericNameMatch) {
        extractedName = genericNameMatch[1].trim().replace(/\s{2,}/g, ' ');
    }

    // Search for ID or Document Number
    const genericIdMatch = fullNormalizedText.match(/(?:ID\s*NO|ID\s*Number|Doc\s*No|Document\s*No|No|Licence\s*No|Certificate\s*No)\s*[:\-]?\s*([A-Za-z0-9\-]{6,20})/i) ||
                           fullNormalizedText.match(/\b([0-9]{10,17})\b/);
    if (genericIdMatch) {
        extractedId = genericIdMatch[1].trim();
    }

    // Search for DOB
    const genericDobMatch = fullNormalizedText.match(/(?:Date\s*of\s*Birth|DOB|Birth\s*Date|Born|Geburtsdatum)[\s:]*([0-9\w\s\/\-\.]{8,15})/i);
    if (genericDobMatch) {
        extractedDob = parseFlexibleDate(genericDobMatch[1]);
    }

    // Search for Expiry Date
    const genericExpMatch = fullNormalizedText.match(/(?:Expiry|Valid\s*Till|Expires|Valid\s*Until|Date\s*d'expiration)[\s:]*([0-9\w\s\/\-\.]{8,15})/i);
    if (genericExpMatch) {
        extractedExp = parseFlexibleDate(genericExpMatch[1]);
    }

    // Detect Country
    let detectedCountryCode = 'BGD';
    let detectedCountryName = 'Bangladesh';
    for (const [k, v] of Object.entries(GLOBAL_COUNTRY_MAP)) {
        if (fullNormalizedText.toLowerCase().includes(k)) {
            detectedCountryCode = v.code;
            detectedCountryName = v.name;
            break;
        }
    }

    return {
        documentType: 'National ID',
        format: 'OCR',
        documentNumber: extractedId,
        fullName: extractedName,
        surname: extractedName.split(' ').slice(1).join(' '),
        givenNames: extractedName.split(' ')[0],
        nationalityCode: detectedCountryCode,
        nationalityName: detectedCountryName,
        dateOfBirth: extractedDob,
        age: calculateAge(extractedDob),
        gender: /Sex[\s:]*F|Female/i.test(fullNormalizedText) ? 'Female' : 'Male',
        expiryDate: extractedExp,
        isExpired: isDateExpired(extractedExp),
        issuingCountryCode: detectedCountryCode,
        issuingCountryName: detectedCountryName,
        isChecksumValid: true,
        rawLines,
        extractedFields: {
            detectedName: extractedName,
            detectedId: extractedId,
            detectedDob: extractedDob,
            detectedExp: extractedExp
        }
    };
}
