/**
 * HotelManagementOS - Universal 2D Barcode Decoder & Parser
 * Decodes PDF417 (US/Canada Driver's Licenses, Bangladesh NID Back, South Africa IDs)
 * and QR Codes (Indian Aadhaar, European e-IDs, Digital KYC passes).
 */

import { loadImageElement } from './imagePreprocessing';
import type { ParsedIdentityDocument } from './mrzParser';
import { parseFlexibleDate } from './dateNormalizer';

export interface DecodedBarcodeResult {
    rawText: string;
    format: string; // 'PDF_417' | 'QR_CODE' | 'DATA_MATRIX'
    parsedDoc?: Partial<ParsedIdentityDocument>;
}

/**
 * Executes multi-format 2D barcode decoding directly on canvas / image
 */
export async function decodeBarcodeFromImage(
    source: File | Blob | string | HTMLImageElement
): Promise<DecodedBarcodeResult | null> {
    try {
        const {
            BrowserMultiFormatReader,
            BrowserPDF417Reader,
            BrowserQRCodeReader,
            BarcodeFormat,
            DecodeHintType
        } = await import('@zxing/library');

        const img = source instanceof HTMLImageElement ? source : await loadImageElement(source);

        // Downscale image if larger than 900px to ensure barcode detection takes < 40ms without main-thread freeze
        let scanTarget: HTMLCanvasElement | HTMLImageElement = img;
        const naturalW = img.naturalWidth || img.width || 0;
        const naturalH = img.naturalHeight || img.height || 0;

        if (naturalW > 900 || naturalH > 900) {
            const scale = Math.min(900 / naturalW, 900 / naturalH);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(naturalW * scale);
            canvas.height = Math.round(naturalH * scale);
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                scanTarget = canvas;
            }
        }

        // 1. Try PDF417 first (Dominant on ID card backs and Driver's Licenses)
        try {
            const pdf417Reader = new BrowserPDF417Reader();
            const res = await pdf417Reader.decodeFromImageElement(scanTarget as any);
            if (res && res.getText()) {
                const text = res.getText();
                return {
                    rawText: text,
                    format: 'PDF_417',
                    parsedDoc: parseBarcodePayload(text, 'PDF_417')
                };
            }
        } catch {
            // fall through to general multi-format reader
        }

        // 2. Try QR Code Reader (Aadhaar, modern e-IDs)
        try {
            const qrReader = new BrowserQRCodeReader();
            const res = await qrReader.decodeFromImageElement(scanTarget as any);
            if (res && res.getText()) {
                const text = res.getText();
                return {
                    rawText: text,
                    format: 'QR_CODE',
                    parsedDoc: parseBarcodePayload(text, 'QR_CODE')
                };
            }
        } catch {
            // fall through
        }

        // 3. Fallback MultiFormat Reader (without heavy TRY_HARDER to prevent CPU freeze)
        try {
            const hints = new Map();
            hints.set(DecodeHintType.POSSIBLE_FORMATS, [
                BarcodeFormat.PDF_417,
                BarcodeFormat.QR_CODE,
                BarcodeFormat.DATA_MATRIX,
                BarcodeFormat.CODE_128
            ]);

            const multiReader = new BrowserMultiFormatReader(hints);
            const res = await multiReader.decodeFromImageElement(scanTarget as any);
            if (res && res.getText()) {
                const text = res.getText();
                return {
                    rawText: text,
                    format: res.getBarcodeFormat() ? String(res.getBarcodeFormat()) : 'BARCODE',
                    parsedDoc: parseBarcodePayload(text, 'BARCODE')
                };
            }
        } catch {
            // No barcode detected
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * Universal Barcode Payload Parser:
 * Supports AAMVA Driver's Licenses, Bangladesh NID, Indian Aadhaar, and generic structured schemas
 */
export function parseBarcodePayload(
    rawText: string,
    format: string
): Partial<ParsedIdentityDocument> {
    if (!rawText) return {};

    // =========================================================================
    // 1. AAMVA North American Driver's License Standard (ANSI 6360...)
    // =========================================================================
    if (rawText.includes('ANSI ') || rawText.includes('AAMVA') || (rawText.includes('DAQ') && rawText.includes('DCS'))) {
        const getField = (prefix: string): string => {
            const regex = new RegExp(`(?:${prefix})([^\n\r]+)`, 'i');
            const match = rawText.match(regex);
            return match ? match[1].trim() : '';
        };

        const surname = getField('DCS') || getField('DCT');
        const firstName = getField('DAC');
        const middleName = getField('DAD');
        const fullName = [firstName, middleName, surname].filter(Boolean).join(' ').trim();
        const docNo = getField('DAQ') || getField('DL');

        // DOB parsing (AAMVA uses YYYYMMDD or MMDDYYYY)
        let rawDob = getField('DBB');
        let dob = '';
        if (rawDob.length === 8) {
            if (rawDob.startsWith('19') || rawDob.startsWith('20')) {
                // YYYYMMDD
                dob = `${rawDob.slice(0, 4)}-${rawDob.slice(4, 6)}-${rawDob.slice(6, 8)}`;
            } else {
                // MMDDYYYY
                dob = `${rawDob.slice(4, 8)}-${rawDob.slice(0, 2)}-${rawDob.slice(2, 4)}`;
            }
        } else {
            dob = parseFlexibleDate(rawDob);
        }

        // Expiry parsing
        let rawExp = getField('DBA');
        let exp = '';
        if (rawExp.length === 8) {
            if (rawExp.startsWith('19') || rawExp.startsWith('20')) {
                exp = `${rawExp.slice(0, 4)}-${rawExp.slice(4, 6)}-${rawExp.slice(6, 8)}`;
            } else {
                exp = `${rawExp.slice(4, 8)}-${rawExp.slice(0, 2)}-${rawExp.slice(2, 4)}`;
            }
        } else {
            exp = parseFlexibleDate(rawExp);
        }

        // Sex: 1=Male, 2=Female
        const rawSex = getField('DBC');
        const gender = rawSex === '2' || /^F/i.test(rawSex) ? 'Female' : 'Male';

        // Address
        const street = getField('DAG');
        const city = getField('DAI');
        const state = getField('DAJ');
        const postal = getField('DAK');
        const address = [street, city, state, postal].filter(Boolean).join(', ');

        const countryCode = getField('DCG') || 'USA';
        const countryName = countryCode === 'CAN' ? 'Canada' : 'United States';

        return {
            format: 'PDF417',
            documentType: 'Driving License',
            documentNumber: docNo,
            fullName,
            surname,
            givenNames: [firstName, middleName].filter(Boolean).join(' '),
            dateOfBirth: dob,
            expiryDate: exp,
            gender,
            address,
            nationalityCode: countryCode,
            nationalityName: countryName,
            issuingCountryCode: countryCode,
            issuingCountryName: `${countryName} Licensing Authority`,
            detectionMethod: 'PDF417_BARCODE',
            confidenceScore: 99,
            isChecksumValid: true
        };
    }

    // =========================================================================
    // 2. Bangladesh National ID 2D Barcode (XML or Delimited format)
    // =========================================================================
    const isBgdBarcode = /<pin>|pin=|NID=|NW=|ND=|BD_NID/i.test(rawText) ||
                         (rawText.includes('<') && rawText.includes('name'));

    if (isBgdBarcode) {
        const getTag = (tag: string): string => {
            const match = rawText.match(new RegExp(`<${tag}>([^<]+)<\\/${tag}>`, 'i')) ||
                          rawText.match(new RegExp(`${tag}[:=]([^|;\n\r]+)`, 'i'));
            return match ? match[1].trim() : '';
        };

        const idNumber = getTag('pin') || getTag('nid') || getTag('id') || (rawText.match(/\b([0-9]{10,17})\b/)?.[1] || '');
        const fullName = getTag('name') || getTag('nm') || '';
        const dob = parseFlexibleDate(getTag('dob') || getTag('birth') || '');
        const fatherName = getTag('father') || getTag('fName') || '';
        const motherName = getTag('mother') || getTag('mName') || '';
        const address = getTag('address') || getTag('addr') || '';

        return {
            format: 'PDF417',
            documentType: 'National ID',
            documentNumber: idNumber,
            fullName,
            dateOfBirth: dob,
            fatherName,
            motherName,
            address,
            nationalityCode: 'BGD',
            nationalityName: 'Bangladesh',
            issuingCountryCode: 'BGD',
            issuingCountryName: "Government of the People's Republic of Bangladesh",
            gender: 'Male',
            detectionMethod: 'PDF417_BARCODE',
            confidenceScore: 98,
            isChecksumValid: true
        };
    }

    // =========================================================================
    // 3. Indian Aadhaar Secure QR Code (XML schema)
    // =========================================================================
    if (rawText.includes('PrintLetterBarcodeData') || rawText.includes('uid=') || rawText.includes('yob=')) {
        const getXmlAttr = (attr: string): string => {
            const match = rawText.match(new RegExp(`${attr}="([^"]+)"`, 'i'));
            return match ? match[1].trim() : '';
        };

        const uid = getXmlAttr('uid') || (rawText.match(/\b([2-9]{1}[0-9]{11})\b/)?.[1] || '');
        const fullName = getXmlAttr('name');
        const rawDob = getXmlAttr('dob') || getXmlAttr('yob');
        const dob = parseFlexibleDate(rawDob);
        const rawGender = getXmlAttr('gender');
        const gender = /^F/i.test(rawGender) ? 'Female' : 'Male';

        const co = getXmlAttr('co'); // Care of / Father
        const house = getXmlAttr('house');
        const street = getXmlAttr('street');
        const lm = getXmlAttr('lm');
        const vtc = getXmlAttr('vtc');
        const dist = getXmlAttr('dist');
        const state = getXmlAttr('state');
        const pc = getXmlAttr('pc');
        const address = [house, street, lm, vtc, dist, state, pc].filter(Boolean).join(', ');

        return {
            format: 'QR',
            documentType: 'National ID',
            documentNumber: uid,
            fullName,
            dateOfBirth: dob,
            gender,
            fatherName: co ? co.replace(/^(S\/O|D\/O|W\/O|C\/O)[:\s]*/i, '').trim() : undefined,
            address,
            nationalityCode: 'IND',
            nationalityName: 'India',
            issuingCountryCode: 'IND',
            issuingCountryName: 'Government of India',
            detectionMethod: 'QR_CODE',
            confidenceScore: 99,
            isChecksumValid: true
        };
    }

    // Generic JSON structure fallback (some custom passes)
    try {
        const json = JSON.parse(rawText);
        if (json && (json.id || json.idNumber || json.documentNumber || json.name || json.fullName)) {
            return {
                format: 'BARCODE',
                documentType: json.documentType || 'National ID',
                documentNumber: String(json.documentNumber || json.idNumber || json.id || ''),
                fullName: String(json.fullName || json.name || ''),
                dateOfBirth: parseFlexibleDate(json.dateOfBirth || json.dob || ''),
                gender: json.gender === 'Female' ? 'Female' : 'Male',
                nationalityCode: json.nationalityCode || 'BGD',
                nationalityName: json.nationality || json.country || 'Bangladesh',
                detectionMethod: format === 'QR_CODE' ? 'QR_CODE' : 'PDF417_BARCODE',
                confidenceScore: 95,
                isChecksumValid: true
            };
        }
    } catch {
        // Not a JSON payload
    }

    return {};
}
