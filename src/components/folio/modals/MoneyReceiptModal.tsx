import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Building2, MapPin, Scissors, CheckCircle, FileText, ShieldCheck } from 'lucide-react';
import { useActiveCurrency } from '../../../utils/currencyUtils';
import { usePropertyLocalization } from '../../../utils/localizationEngine';
import { useProperty } from '../../../context/PropertyContext';
import type { FolioData, FolioPaymentItem } from '../folioTypes';
import type { AmendBookingData } from '../../modals/AmendStayModal';

export interface MoneyReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: FolioPaymentItem | any;
    folio: FolioData | null;
    booking?: AmendBookingData | null;
    isAdvance?: boolean;
}

export function convertAmountToWords(amount: number, currencyCode: string = 'BDT', currencySymbol: string = '৳'): string {
    if (isNaN(amount) || amount === 0) return `Zero Only`;

    const ones = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function numToWords(n: number): string {
        if (n === 0) return '';
        if (n < 20) return ones[n] + ' ';
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '') + ' ';
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + (n % 100 !== 0 ? numToWords(n % 100) : '');
        if (n < 100000) return numToWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? numToWords(n % 1000) : '');
        if (n < 10000000) return numToWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? numToWords(n % 100000) : '');
        return numToWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? numToWords(n % 10000000) : '');
    }

    let mainUnit = 'Taka';
    let subUnit = 'Paisa';

    if (currencySymbol === '$' || currencyCode === 'USD') {
        mainUnit = 'Dollars';
        subUnit = 'Cents';
    } else if (currencySymbol === '€' || currencyCode === 'EUR') {
        mainUnit = 'Euros';
        subUnit = 'Cents';
    } else if (currencySymbol === '£' || currencyCode === 'GBP') {
        mainUnit = 'Pounds';
        subUnit = 'Pence';
    } else if (currencySymbol === '₹' || currencyCode === 'INR') {
        mainUnit = 'Rupees';
        subUnit = 'Paise';
    }

    const absVal = Math.abs(amount);
    const intPart = Math.floor(absVal);
    const decPart = Math.round((absVal - intPart) * 100);

    let words = numToWords(intPart).trim() + ` ${mainUnit}`;
    if (decPart > 0) {
        words += ` and ${numToWords(decPart).trim()} ${subUnit}`;
    }
    return words + ' Only';
}

export const MoneyReceiptModal: React.FC<MoneyReceiptModalProps> = ({
    isOpen,
    onClose,
    payment,
    folio,
    booking,
    isAdvance: propIsAdvance
}) => {
    const { currencySymbol, currencyCode } = useActiveCurrency();
    const { formatDate, formatTime, formatDateTime } = usePropertyLocalization();
    const { activeProperty } = useProperty();
    const receiptContainerRef = useRef<HTMLDivElement | null>(null);

    const [printLayout, setPrintLayout] = useState<'double_a4' | 'single_guest' | 'single_accounts'>('double_a4');

    if (!isOpen || !payment) return null;

    // Detect Advance vs In-Stay Settlement
    const isAdvance = Boolean(
        propIsAdvance || 
        payment.isAdvance || 
        payment.is_advance || 
        String(payment.payment_number || '').startsWith('AR-') ||
        payment.type === 'advance' ||
        payment.transactionType === 'ADVANCE'
    );
    const receiptTitle = isAdvance ? 'ADVANCE DEPOSIT RECEIPT' : 'MONEY RECEIPT';

    // Daily Sequential Prefix Standard: AR-YYYYMMDD-XXXXX or MR-YYYYMMDD-XXXXX
    const now = new Date();
    const dateFormattedCompact = now.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = isAdvance ? 'AR' : 'MR';
    const fallbackSeq = String(payment.id || Math.floor(1000 + Math.random() * 9000));
    const receiptNumber = payment.payment_number || payment.refNo || payment.ref_no || `${prefix}-${dateFormattedCompact}-${fallbackSeq}`;
    const rawDate = payment.transaction_date || payment.date || new Date().toISOString();
    const formattedDate = formatDate(rawDate);
    const formattedTime = formatTime(rawDate);
    const formattedDateTimeStr = formatDateTime ? formatDateTime(rawDate) : `${formattedDate} ${formattedTime}`;

    const amountPaid = Number(payment.amount || 0);
    const paymentMethod = payment.payment_method || payment.revenueHead || 'Cash';
    const referenceCode = payment.reference_code || payment.ref_no || payment.rawItem?.reference_code || '';
    const cashierName = payment.user || payment.user_name || payment.rawItem?.user_name || 'Front Desk Cashier';
    const status = payment.status || 'Settled';

    // Guest & Stay details
    const guestName = folio?.guest_name || booking?.guestName || (folio as any)?.guest?.name || 'Valued Guest';
    const roomNumber = folio?.room_number || booking?.roomNumber || '101';
    const roomType = folio?.room_type || booking?.roomType || 'Standard Room';
    const folioNumber = folio?.folio_number || (folio?.id ? `FN~${folio.id}` : 'FN~1001');
    const reservationNumber = folio?.reservation_number || booking?.reservationNumber || 'RES-1001';

    // Hotel details
    const hotelName = activeProperty?.name || 'Grand Palace Hotel & Resort';
    const hotelAddress = activeProperty?.address || 'Plot 14, Road 3, Diplomatic Enclave, Gulshan-2';
    const hotelCity = activeProperty?.city ? `${activeProperty.city}, ${activeProperty.country || 'Bangladesh'}` : 'Dhaka-1212, Bangladesh';
    const hotelPhone = activeProperty?.phone || '+880 2 9887766';
    const hotelEmail = activeProperty?.email || 'accounts@grandpalacehotel.com';
    const taxBin = 'BIN-002918374-0101';

    const amountInWords = convertAmountToWords(amountPaid, currencyCode, currencySymbol);

    // Build print HTML for separate window
    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=950,height=850');
        if (!printWindow) {
            window.print();
            return;
        }

        const isDoubleA4 = printLayout === 'double_a4';
        const showGuest = printLayout === 'double_a4' || printLayout === 'single_guest';
        const showAccounts = printLayout === 'double_a4' || printLayout === 'single_accounts';

        const renderHtmlReceipt = (copyType: 'GUEST COPY' | 'ACCOUNTS COPY', isCompact: boolean) => `
            <div class="receipt-card ${isCompact ? 'compact' : ''}">
                <!-- Header -->
                <div class="header-row">
                    <div class="hotel-info">
                        <div class="hotel-brand">
                            <span class="hotel-title">${hotelName}</span>
                        </div>
                        <div class="hotel-meta">
                            ${hotelAddress}, ${hotelCity}<br/>
                            Tel: ${hotelPhone} &bull; Email: ${hotelEmail}<br/>
                            VAT / BIN: ${taxBin}
                        </div>
                    </div>
                    <div class="receipt-badge-col">
                        <div class="copy-badge ${copyType === 'GUEST COPY' ? 'badge-guest' : 'badge-accounts'}">
                            ${copyType}
                        </div>
                        <div class="receipt-title">${receiptTitle}</div>
                        <div class="receipt-no">No: <strong>${receiptNumber}</strong></div>
                        <div class="receipt-date">Date: ${formattedDateTimeStr}</div>
                    </div>
                </div>

                <!-- Info Grid -->
                <div class="info-grid">
                    <div class="info-cell full-width">
                        <span class="label">Received with Thanks From:</span>
                        <span class="value-guest">${guestName}</span>
                    </div>
                    <div class="info-cell">
                        <span class="label">Room Allocated:</span>
                        <span class="value">Room ${roomNumber} (${roomType})</span>
                    </div>
                    <div class="info-cell">
                        <span class="label">Folio Number:</span>
                        <span class="value font-mono">${folioNumber}</span>
                    </div>
                    <div class="info-cell">
                        <span class="label">Reservation No:</span>
                        <span class="value font-mono">${reservationNumber}</span>
                    </div>
                    <div class="info-cell">
                        <span class="label">Payment Mode:</span>
                        <span class="value">${paymentMethod} ${referenceCode ? `(Ref: ${referenceCode})` : ''}</span>
                    </div>
                    <div class="info-cell full-width">
                        <span class="label">Payment Towards:</span>
                        <span class="value">Room Tariff, Incidentals & Service Charges Settlement</span>
                    </div>
                </div>

                <!-- Amount Box -->
                <div class="amount-container">
                    <div class="words-col">
                        <span class="words-label">Amount in Words:</span>
                        <div class="words-text">${amountInWords}</div>
                    </div>
                    <div class="amount-col">
                        <span class="amount-label">AMOUNT RECEIVED</span>
                        <div class="amount-figure">${currencySymbol} ${amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div class="status-pill">${status.toUpperCase()}</div>
                    </div>
                </div>

                <!-- Signatures -->
                <div class="signatures-row">
                    <div class="sig-block">
                        <div class="sig-line"></div>
                        <div class="sig-title">Guest's Signature</div>
                    </div>
                    <div class="sig-block">
                        <div class="sig-seal">VERIFIED &amp; POSTED</div>
                        <div class="sig-line"></div>
                        <div class="sig-title">Authorized Signatory / Cashier (${cashierName})</div>
                    </div>
                </div>

                <!-- Footer note -->
                <div class="card-footer-note">
                    Official Computer Generated Receipt &bull; Valid without physical stamp if signed by authorized cashier.
                </div>
            </div>
        `;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Money Receipt - ${receiptNumber} (${guestName})</title>
                    <meta charset="utf-8" />
                    <style>
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                            color: #0f172a;
                            background: #fff;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }

                        @page {
                            size: ${isDoubleA4 ? 'A4 portrait' : 'A5 landscape'};
                            margin: ${isDoubleA4 ? '6mm 8mm' : '8mm 10mm'};
                        }

                        .print-wrapper {
                            width: 100%;
                            ${isDoubleA4 ? 'height: 100%; display: flex; flex-direction: column; justify-content: space-between;' : ''}
                        }

                        .receipt-card {
                            border: 1.5px solid #0f172a;
                            border-radius: 8px;
                            padding: 12px 16px;
                            background: #ffffff;
                            position: relative;
                            ${isDoubleA4 ? 'max-height: 136mm; flex: 1;' : ''}
                        }

                        .receipt-card.compact {
                            padding: 10px 14px;
                        }

                        .header-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            border-bottom: 1.5px solid #0f172a;
                            padding-bottom: 8px;
                            margin-bottom: 8px;
                        }

                        .hotel-title {
                            font-size: 16px;
                            font-weight: 800;
                            color: #0f172a;
                            letter-spacing: -0.3px;
                            text-transform: uppercase;
                        }

                        .hotel-meta {
                            font-size: 8.5px;
                            color: #475569;
                            line-height: 1.35;
                            margin-top: 3px;
                        }

                        .receipt-badge-col {
                            text-align: right;
                        }

                        .copy-badge {
                            display: inline-block;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-size: 9px;
                            font-weight: 800;
                            letter-spacing: 0.5px;
                            text-transform: uppercase;
                            margin-bottom: 3px;
                        }

                        .badge-guest {
                            background: #e0f2fe;
                            color: #0369a1;
                            border: 1px solid #7dd3fc;
                        }

                        .badge-accounts {
                            background: #f1f5f9;
                            color: #334155;
                            border: 1px solid #cbd5e1;
                        }

                        .receipt-title {
                            font-size: 13px;
                            font-weight: 900;
                            color: #0f172a;
                            letter-spacing: 0.5px;
                        }

                        .receipt-no {
                            font-size: 9.5px;
                            color: #334155;
                            font-family: monospace;
                            margin-top: 1px;
                        }

                        .receipt-date {
                            font-size: 8.5px;
                            color: #64748b;
                            font-family: monospace;
                        }

                        .info-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 5px 12px;
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-radius: 6px;
                            padding: 8px 10px;
                            margin-bottom: 8px;
                        }

                        .info-cell {
                            display: flex;
                            align-items: baseline;
                            gap: 6px;
                            font-size: 9.5px;
                        }

                        .info-cell.full-width {
                            grid-column: span 2;
                        }

                        .label {
                            color: #64748b;
                            font-size: 8.5px;
                            font-weight: 700;
                            text-transform: uppercase;
                            white-space: nowrap;
                        }

                        .value {
                            color: #0f172a;
                            font-weight: 600;
                        }

                        .value-guest {
                            color: #0f172a;
                            font-weight: 800;
                            font-size: 11.5px;
                        }

                        .font-mono {
                            font-family: monospace;
                        }

                        .amount-container {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            border: 1.5px solid #0f172a;
                            border-radius: 6px;
                            padding: 8px 12px;
                            background: #fcfcfd;
                            margin-bottom: 8px;
                        }

                        .words-col {
                            flex: 1;
                            padding-right: 15px;
                        }

                        .words-label {
                            font-size: 8px;
                            font-weight: 800;
                            color: #64748b;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            display: block;
                            margin-bottom: 2px;
                        }

                        .words-text {
                            font-size: 10.5px;
                            font-weight: 700;
                            color: #0f172a;
                            font-style: italic;
                            line-height: 1.3;
                        }

                        .amount-col {
                            text-align: right;
                            border-left: 1px dashed #cbd5e1;
                            padding-left: 15px;
                            min-width: 140px;
                        }

                        .amount-label {
                            font-size: 8px;
                            font-weight: 800;
                            color: #64748b;
                            letter-spacing: 0.5px;
                            display: block;
                        }

                        .amount-figure {
                            font-size: 16px;
                            font-weight: 900;
                            color: #0f172a;
                            font-family: monospace;
                            margin: 1px 0;
                        }

                        .status-pill {
                            display: inline-block;
                            font-size: 8px;
                            font-weight: 800;
                            padding: 1px 6px;
                            background: #dcfce7;
                            color: #15803d;
                            border-radius: 3px;
                            border: 1px solid #bbf7d0;
                        }

                        .signatures-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                            margin-top: 14px;
                            padding-top: 4px;
                        }

                        .sig-block {
                            width: 38%;
                            text-align: center;
                        }

                        .sig-seal {
                            font-size: 7.5px;
                            font-weight: 800;
                            color: #0369a1;
                            letter-spacing: 1px;
                            margin-bottom: 2px;
                        }

                        .sig-line {
                            border-top: 1px solid #475569;
                            margin-bottom: 3px;
                        }

                        .sig-title {
                            font-size: 8px;
                            font-weight: 700;
                            color: #475569;
                            text-transform: uppercase;
                        }

                        .card-footer-note {
                            text-align: center;
                            font-size: 7.5px;
                            color: #94a3b8;
                            margin-top: 6px;
                        }

                        /* Perforated divider between copies */
                        .perforated-divider {
                            margin: 10px 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            position: relative;
                            text-align: center;
                        }

                        .divider-line {
                            border-bottom: 1.5px dashed #64748b;
                            width: 100%;
                            position: absolute;
                            top: 50%;
                            left: 0;
                            z-index: 1;
                        }

                        .divider-badge {
                            position: relative;
                            z-index: 2;
                            background: #ffffff;
                            padding: 1px 12px;
                            border: 1px solid #cbd5e1;
                            border-radius: 12px;
                            font-size: 7.5px;
                            font-weight: 800;
                            color: #475569;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }

                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-wrapper">
                        ${showGuest ? renderHtmlReceipt('GUEST COPY', isDoubleA4) : ''}
                        
                        ${isDoubleA4 ? `
                            <div class="perforated-divider">
                                <div class="divider-line"></div>
                                <div class="divider-badge">&#9986; CUT / TEAR ALONG THIS LINE &bull; ACCOUNTS COPY BELOW &#9986;</div>
                            </div>
                        ` : ''}

                        ${showAccounts ? renderHtmlReceipt('ACCOUNTS COPY', isDoubleA4) : ''}
                    </div>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    };

    // Render single receipt inside modal preview
    const renderReceiptCard = (copyType: 'GUEST COPY' | 'ACCOUNTS COPY') => {
        const isGuest = copyType === 'GUEST COPY';
        return (
            <div className="bg-white rounded-xl border-2 border-slate-900 p-4 sm:p-5 shadow-xs relative text-slate-800 font-sans">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-3 mb-3 gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <Building2 className="size-5 text-blue-700" />
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                                {hotelName}
                            </h3>
                        </div>
                        <div className="text-[10px] text-slate-600 mt-1 space-y-0.5 leading-snug">
                            <p className="flex items-center gap-1">
                                <MapPin className="size-3 text-slate-400 shrink-0" />
                                <span>{hotelAddress}, {hotelCity}</span>
                            </p>
                            <p className="text-[9.5px]">
                                <span>Tel: {hotelPhone}</span> &bull; <span>Email: {hotelEmail}</span> &bull; <span>VAT / BIN: {taxBin}</span>
                            </p>
                        </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                            isGuest
                                ? 'bg-sky-50 text-sky-700 border-sky-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                            {copyType}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mt-1">
                            {receiptTitle}
                        </h4>
                        <p className="text-[11px] font-mono font-bold text-slate-800">
                            No: <span className="text-blue-700 font-extrabold">{receiptNumber}</span>
                        </p>
                        <p className="text-[9.5px] font-mono text-slate-500">
                            Date: {formattedDateTimeStr}
                        </p>
                    </div>
                </div>

                {/* Guest & Reservation Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/90 border border-slate-200 rounded-lg p-3 mb-3 text-xs">
                    <div className="sm:col-span-2 flex items-baseline gap-2 border-b border-dashed border-slate-200 pb-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Received with Thanks From:
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 truncate">
                            {guestName}
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Room Allocated:
                        </span>
                        <span className="font-semibold text-slate-800">
                            Room {roomNumber} <span className="text-slate-500 font-normal">({roomType})</span>
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Folio Number:
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                            {folioNumber}
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Reservation No:
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                            {reservationNumber}
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Payment Mode:
                        </span>
                        <span className="font-bold text-slate-900">
                            {paymentMethod} {referenceCode ? <span className="text-slate-500 font-normal font-mono text-[10px]">(Ref: {referenceCode})</span> : ''}
                        </span>
                    </div>

                    <div className="sm:col-span-2 flex items-baseline gap-2 pt-1 border-t border-dashed border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Payment Towards:
                        </span>
                        <span className="text-slate-700 text-[11px]">
                            Room Accommodation &amp; Incidentals Settlement
                        </span>
                    </div>
                </div>

                {/* Amount Box */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-2 border-slate-900 rounded-lg p-3 bg-white mb-4 gap-3">
                    <div className="flex-1 pr-0 sm:pr-4">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                            Amount in Words:
                        </span>
                        <p className="text-xs font-bold text-slate-900 italic mt-0.5 leading-relaxed">
                            {amountInWords}
                        </p>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4 shrink-0 min-w-[160px]">
                        <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block">
                            AMOUNT RECEIVED
                        </span>
                        <div className="text-xl font-black font-mono text-slate-950 mt-0.5">
                            {currencySymbol} {amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 mt-1">
                            <CheckCircle className="size-2.5" /> {status.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between items-end pt-3 text-[10px]">
                    <div className="w-[35%] text-center">
                        <div className="border-t border-slate-500 pt-1 font-bold text-slate-700">
                            Guest&apos;s Signature
                        </div>
                    </div>
                    <div className="w-[45%] text-center">
                        <div className="text-[9px] text-blue-700 font-bold uppercase tracking-wider mb-0.5">
                            Verified &amp; Posted
                        </div>
                        <div className="border-t border-slate-500 pt-1 font-bold text-slate-700">
                            Authorized Signatory / Cashier ({cashierName})
                        </div>
                    </div>
                </div>

                <div className="text-center text-[9px] text-slate-400 mt-3 pt-1 border-t border-dashed border-slate-200">
                    Official Computer Generated Receipt &bull; Grand Palace Hotel PMS
                </div>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[100020] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
            {/* Modal Box */}
            <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden text-slate-800 font-sans">
                {/* Control Header Bar */}
                <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold tracking-wide uppercase flex items-center gap-2">
                                <span>{isAdvance ? 'Advance Deposit Receipt' : 'Official Money Receipt'}</span>
                                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                                    {paymentMethod}
                                </span>
                            </h2>
                            <p className="text-[11px] text-slate-400 font-mono">
                                Receipt No: <span className="text-amber-300 font-bold">{receiptNumber}</span> &bull; Folio: {folioNumber}
                            </p>
                        </div>
                    </div>

                    {/* Print Layout Switcher + Actions */}
                    <div className="flex items-center gap-2.5">
                        {/* Layout Selector */}
                        <div className="hidden sm:flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                            <button
                                type="button"
                                onClick={() => setPrintLayout('double_a4')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                                    printLayout === 'double_a4'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-300 hover:text-white'
                                }`}
                                title="Print A4 sheet with 2 copies (Guest + Accounts) divided in middle"
                            >
                                Double Copy (A4)
                            </button>
                            <button
                                type="button"
                                onClick={() => setPrintLayout('single_guest')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                                    printLayout === 'single_guest'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-300 hover:text-white'
                                }`}
                                title="Print single A5 receipt for Guest"
                            >
                                Guest Copy (A5)
                            </button>
                            <button
                                type="button"
                                onClick={() => setPrintLayout('single_accounts')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                                    printLayout === 'single_accounts'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-300 hover:text-white'
                                }`}
                                title="Print single A5 receipt for Accounts"
                            >
                                Accounts Copy (A5)
                            </button>
                        </div>

                        {/* Print Button */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                            <Printer size={14} />
                            <span>Print Receipt</span>
                        </button>

                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Close modal"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Modal Body / Scrollable Preview */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200/70">
                    <div ref={receiptContainerRef} className="max-w-2xl mx-auto space-y-4">
                        {/* Notification Banner */}
                        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="size-4 text-blue-600 shrink-0" />
                                <span>
                                    {printLayout === 'double_a4' 
                                        ? 'A4 Double-Copy Mode: Top is Guest Copy, Bottom is Accounts Copy with tear divider.' 
                                        : printLayout === 'single_guest' 
                                            ? 'A5 Guest Copy Mode: Single receipt for guest acknowledgement.' 
                                            : 'A5 Accounts Copy Mode: Single receipt for accounting & audit archive.'}
                                </span>
                            </div>
                            <span className="font-mono font-bold text-blue-700 shrink-0">
                                {currencySymbol} {amountPaid.toFixed(2)}
                            </span>
                        </div>

                        {/* Top / Guest Copy */}
                        {(printLayout === 'double_a4' || printLayout === 'single_guest') && (
                            renderReceiptCard('GUEST COPY')
                        )}

                        {/* Perforated Divider */}
                        {printLayout === 'double_a4' && (
                            <div className="relative py-2 select-none">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t-2 border-dashed border-slate-400"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-slate-200 px-4 py-1 rounded-full text-[10px] font-black text-slate-700 tracking-wider uppercase flex items-center gap-2 border border-slate-300 shadow-2xs">
                                        <Scissors className="size-3 text-slate-600" />
                                        <span>Cut / Tear Line (Accounts Copy Below)</span>
                                        <Scissors className="size-3 text-slate-600 rotate-180" />
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Bottom / Accounts Copy */}
                        {(printLayout === 'double_a4' || printLayout === 'single_accounts') && (
                            renderReceiptCard('ACCOUNTS COPY')
                        )}
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Official Guest Receipt Generation &bull; Ready to Print</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                            <Printer size={13} />
                            <span>Print Double Copy</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
