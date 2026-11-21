import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Building2, MapPin, Scissors, AlertCircle, FileText, ShieldAlert } from 'lucide-react';
import { useActiveCurrency } from '../../../utils/currencyUtils';
import { usePropertyLocalization } from '../../../utils/localizationEngine';
import { useProperty } from '../../../context/PropertyContext';
import { convertAmountToWords } from './MoneyReceiptModal';

export interface RefundVoucherData {
    voucherNumber?: string;
    originalReceiptNumber?: string;
    date?: string;
    guestName: string;
    roomNumber?: string;
    roomType?: string;
    reservationNumber?: string;
    folioNumber?: string;
    originalDepositAmount?: number;
    retentionAmount?: number;
    refundAmount: number;
    disbursementMethod: string;
    reason: string;
    authorizedBy?: string;
    cashierName?: string;
}

export interface RefundVoucherModalProps {
    isOpen: boolean;
    onClose: () => void;
    refundData: RefundVoucherData;
}

export const RefundVoucherModal: React.FC<RefundVoucherModalProps> = ({
    isOpen,
    onClose,
    refundData
}) => {
    const { currencySymbol, currencyCode } = useActiveCurrency();
    const { formatDate, formatTime, formatDateTime } = usePropertyLocalization();
    const { activeProperty } = useProperty();
    const voucherContainerRef = useRef<HTMLDivElement | null>(null);

    const [printLayout, setPrintLayout] = useState<'double_a4' | 'single_guest' | 'single_accounts'>('double_a4');

    if (!isOpen || !refundData) return null;

    // Date generation for daily sequential standard: RFV-YYYYMMDD-XXXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const voucherNumber = refundData.voucherNumber || `RFV-${dateStr}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const rawDate = refundData.date || now.toISOString();
    const formattedDateTimeStr = formatDateTime ? formatDateTime(rawDate) : `${formatDate(rawDate)} ${formatTime(rawDate)}`;

    // Hotel info
    const hotelName = activeProperty?.name || 'Grand Palace Hotel & Resort';
    const hotelAddress = activeProperty?.address || 'Plot 14, Road 3, Diplomatic Enclave, Gulshan-2';
    const hotelCity = activeProperty?.city ? `${activeProperty.city}, ${activeProperty.country || 'Bangladesh'}` : 'Dhaka-1212, Bangladesh';
    const hotelPhone = activeProperty?.phone || '+880 2 9887766';
    const hotelEmail = activeProperty?.email || 'accounts@grandpalacehotel.com';
    const taxBin = 'BIN-002918374-0101';

    const netRefund = Number(refundData.refundAmount || 0);
    const amountInWords = convertAmountToWords(netRefund, currencyCode, currencySymbol);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=950,height=850');
        if (!printWindow) {
            window.print();
            return;
        }

        const isDoubleA4 = printLayout === 'double_a4';
        const showGuest = printLayout === 'double_a4' || printLayout === 'single_guest';
        const showAccounts = printLayout === 'double_a4' || printLayout === 'single_accounts';

        const renderHtmlVoucher = (copyType: 'GUEST COPY' | 'ACCOUNTS / AUDIT COPY', isCompact: boolean) => `
            <div class="voucher-card ${isCompact ? 'compact' : ''}">
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
                    <div class="voucher-badge-col">
                        <div class="copy-badge ${copyType === 'GUEST COPY' ? 'badge-guest' : 'badge-accounts'}">
                            ${copyType}
                        </div>
                        <div class="voucher-title">REFUND DISBURSEMENT VOUCHER</div>
                        <div class="voucher-no">Voucher No: <strong>${voucherNumber}</strong></div>
                        <div class="voucher-date">Date: ${formattedDateTimeStr}</div>
                    </div>
                </div>

                <!-- Info Grid -->
                <div class="info-grid">
                    <div class="info-cell full-width">
                        <span class="label">Refund Paid To:</span>
                        <span class="value-guest">${refundData.guestName}</span>
                    </div>
                    <div class="info-cell">
                        <span class="label">Room / Category:</span>
                        <span class="value">Room ${refundData.roomNumber || 'N/A'} (${refundData.roomType || 'Standard'})</span>
                    </div>
                    <div class="info-cell">
                        <span class="label">Original Receipt Ref:</span>
                        <span class="value font-mono font-bold text-blue">${refundData.originalReceiptNumber || 'N/A (Pre-Stay Deposit)'}</span>
                    </div>
                    <div class="info-cell">
                        <span class="label">Reservation No:</span>
                        <span class="value font-mono">${refundData.reservationNumber || 'N/A'}</span>
                    </div>
                    <div class="info-cell">
                        <span class="label">Folio Number:</span>
                        <span class="value font-mono">${refundData.folioNumber || 'N/A'}</span>
                    </div>
                    <div class="info-cell">
                        <span class="label">Refund Tender:</span>
                        <span class="value">${refundData.disbursementMethod || 'Cash'}</span>
                    </div>
                    <div class="info-cell full-width">
                        <span class="label">Reason for Refund:</span>
                        <span class="value text-rose">${refundData.reason || 'Cancellation policy refund / Security deposit settlement'}</span>
                    </div>
                </div>

                <!-- Financial Breakdown -->
                ${(refundData.originalDepositAmount || 0) > 0 ? `
                    <div class="breakdown-table">
                        <div class="breakdown-row">
                            <span>Original Deposit Received:</span>
                            <span class="font-mono font-bold">${currencySymbol} ${(refundData.originalDepositAmount || 0).toFixed(2)}</span>
                        </div>
                        ${(refundData.retentionAmount || 0) > 0 ? `
                            <div class="breakdown-row text-rose">
                                <span>Less: Cancellation Fee / Retention:</span>
                                <span class="font-mono font-bold">- ${currencySymbol} ${(refundData.retentionAmount || 0).toFixed(2)}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <!-- Amount Box -->
                <div class="amount-container">
                    <div class="words-col">
                        <span class="words-label">Net Refund Amount in Words:</span>
                        <div class="words-text">${amountInWords}</div>
                    </div>
                    <div class="amount-col">
                        <span class="amount-label">NET REFUND DISBURSED</span>
                        <div class="amount-figure">${currencySymbol} ${netRefund.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div class="status-pill">DISBURSED &amp; CLOSED</div>
                    </div>
                </div>

                <!-- Guest Acknowledgment Declaration -->
                <div class="legal-box">
                    I hereby acknowledge receipt of the refund amount stated above in full and final settlement of this transaction.
                </div>

                <!-- Signatures -->
                <div class="signatures-row">
                    <div class="sig-block">
                        <div class="sig-line"></div>
                        <div class="sig-title">Guest's Signature (Acknowledged)</div>
                    </div>
                    <div class="sig-block">
                        <div class="sig-line"></div>
                        <div class="sig-title">Disbursed by Cashier (${refundData.cashierName || 'Front Desk'})</div>
                    </div>
                    <div class="sig-block">
                        <div class="sig-line"></div>
                        <div class="sig-title">Approved by Duty Manager (${refundData.authorizedBy || 'Manager'})</div>
                    </div>
                </div>

                <!-- Footer note -->
                <div class="card-footer-note">
                    Official Financial Audit Record &bull; Grand Palace Hotel PMS &bull; Strict Disbursed Vault Audit Trail
                </div>
            </div>
        `;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Refund Voucher - ${voucherNumber} (${refundData.guestName})</title>
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

                        .voucher-card {
                            border: 1.5px solid #991b1b;
                            border-radius: 8px;
                            padding: 10px 14px;
                            background: #ffffff;
                            position: relative;
                            ${isDoubleA4 ? 'max-height: 136mm; flex: 1;' : ''}
                        }

                        .voucher-card.compact {
                            padding: 8px 12px;
                        }

                        .header-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            border-bottom: 1.5px solid #991b1b;
                            padding-bottom: 6px;
                            margin-bottom: 6px;
                        }

                        .hotel-title {
                            font-size: 15px;
                            font-weight: 800;
                            color: #0f172a;
                            letter-spacing: -0.3px;
                            text-transform: uppercase;
                        }

                        .hotel-meta {
                            font-size: 8px;
                            color: #475569;
                            line-height: 1.3;
                            margin-top: 2px;
                        }

                        .voucher-badge-col {
                            text-align: right;
                        }

                        .copy-badge {
                            display: inline-block;
                            padding: 2px 7px;
                            border-radius: 4px;
                            font-size: 8.5px;
                            font-weight: 800;
                            letter-spacing: 0.5px;
                            text-transform: uppercase;
                            margin-bottom: 2px;
                        }

                        .badge-guest {
                            background: #fef2f2;
                            color: #991b1b;
                            border: 1px solid #fecaca;
                        }

                        .badge-accounts {
                            background: #f1f5f9;
                            color: #1e293b;
                            border: 1px solid #cbd5e1;
                        }

                        .voucher-title {
                            font-size: 11.5px;
                            font-weight: 900;
                            color: #991b1b;
                            letter-spacing: 0.5px;
                        }

                        .voucher-no {
                            font-size: 9px;
                            color: #334155;
                            font-family: monospace;
                            margin-top: 1px;
                        }

                        .voucher-date {
                            font-size: 8px;
                            color: #64748b;
                            font-family: monospace;
                        }

                        .info-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 4px 10px;
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-radius: 5px;
                            padding: 6px 8px;
                            margin-bottom: 6px;
                        }

                        .info-cell {
                            display: flex;
                            align-items: baseline;
                            gap: 5px;
                            font-size: 9px;
                        }

                        .info-cell.full-width {
                            grid-column: span 2;
                        }

                        .label {
                            color: #64748b;
                            font-size: 8px;
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
                            font-size: 11px;
                        }

                        .text-rose {
                            color: #b91c1c;
                        }

                        .text-blue {
                            color: #1d4ed8;
                        }

                        .font-mono {
                            font-family: monospace;
                        }

                        .breakdown-table {
                            background: #fff;
                            border: 1px dashed #cbd5e1;
                            border-radius: 4px;
                            padding: 4px 8px;
                            margin-bottom: 6px;
                            font-size: 8.5px;
                        }

                        .breakdown-row {
                            display: flex;
                            justify-content: space-between;
                            padding: 1px 0;
                        }

                        .amount-container {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            border: 1.5px solid #991b1b;
                            border-radius: 6px;
                            padding: 6px 10px;
                            background: #fffaf0;
                            margin-bottom: 6px;
                        }

                        .words-col {
                            flex: 1;
                            padding-right: 10px;
                        }

                        .words-label {
                            font-size: 7.5px;
                            font-weight: 800;
                            color: #78350f;
                            text-transform: uppercase;
                            display: block;
                            margin-bottom: 1px;
                        }

                        .words-text {
                            font-size: 10px;
                            font-weight: 700;
                            color: #0f172a;
                            font-style: italic;
                        }

                        .amount-col {
                            text-align: right;
                            border-left: 1px dashed #fed7aa;
                            padding-left: 10px;
                            min-width: 140px;
                        }

                        .amount-label {
                            font-size: 7.5px;
                            font-weight: 800;
                            color: #991b1b;
                            display: block;
                        }

                        .amount-figure {
                            font-size: 15px;
                            font-weight: 900;
                            color: #991b1b;
                            font-family: monospace;
                        }

                        .status-pill {
                            display: inline-block;
                            font-size: 7.5px;
                            font-weight: 800;
                            padding: 1px 5px;
                            background: #fef2f2;
                            color: #991b1b;
                            border-radius: 3px;
                            border: 1px solid #fecaca;
                        }

                        .legal-box {
                            font-size: 7.5px;
                            font-style: italic;
                            color: #475569;
                            border-left: 2px solid #991b1b;
                            padding-left: 6px;
                            margin-bottom: 8px;
                            line-height: 1.25;
                        }

                        .signatures-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                            margin-top: 10px;
                        }

                        .sig-block {
                            width: 31%;
                            text-align: center;
                        }

                        .sig-line {
                            border-top: 1px solid #475569;
                            margin-bottom: 2px;
                        }

                        .sig-title {
                            font-size: 7.5px;
                            font-weight: 700;
                            color: #475569;
                            text-transform: uppercase;
                        }

                        .card-footer-note {
                            text-align: center;
                            font-size: 7px;
                            color: #94a3b8;
                            margin-top: 4px;
                        }

                        .perforated-divider {
                            margin: 8px 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            position: relative;
                            text-align: center;
                        }

                        .divider-line {
                            border-bottom: 1.5px dashed #b91c1c;
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
                            padding: 1px 10px;
                            border: 1px solid #fecaca;
                            border-radius: 10px;
                            font-size: 7px;
                            font-weight: 800;
                            color: #991b1b;
                            text-transform: uppercase;
                        }

                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-wrapper">
                        ${showGuest ? renderHtmlVoucher('GUEST COPY', isDoubleA4) : ''}
                        
                        ${isDoubleA4 ? `
                            <div class="perforated-divider">
                                <div class="divider-line"></div>
                                <div class="divider-badge">&#9986; CUT / TEAR ALONG THIS LINE &bull; ACCOUNTS &amp; VAULT COPY BELOW &#9986;</div>
                            </div>
                        ` : ''}

                        ${showAccounts ? renderHtmlVoucher('ACCOUNTS / AUDIT COPY', isDoubleA4) : ''}
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

    const renderVoucherCard = (copyType: 'GUEST COPY' | 'ACCOUNTS / AUDIT COPY') => {
        const isGuest = copyType === 'GUEST COPY';
        return (
            <div className="bg-white rounded-xl border-2 border-rose-800 p-4 sm:p-5 shadow-xs relative text-slate-800 font-sans">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-rose-800 pb-3 mb-3 gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <Building2 className="size-5 text-rose-700" />
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
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}>
                            {copyType}
                        </span>
                        <h4 className="text-xs font-black text-rose-800 uppercase tracking-wide mt-1">
                            REFUND DISBURSEMENT VOUCHER
                        </h4>
                        <p className="text-[11px] font-mono font-bold text-slate-900">
                            Voucher: <span className="text-rose-700 font-extrabold">{voucherNumber}</span>
                        </p>
                        <p className="text-[9.5px] font-mono text-slate-500">
                            Date: {formattedDateTimeStr}
                        </p>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/90 border border-slate-200 rounded-lg p-3 mb-3 text-xs">
                    <div className="sm:col-span-2 flex items-baseline gap-2 border-b border-dashed border-slate-200 pb-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Refund Disbursed To:
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 truncate">
                            {refundData.guestName}
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Room / Category:
                        </span>
                        <span className="font-semibold text-slate-800">
                            Room {refundData.roomNumber || 'N/A'} <span className="text-slate-500 font-normal">({refundData.roomType || 'Standard'})</span>
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Original Receipt Ref:
                        </span>
                        <span className="font-mono font-bold text-blue-700">
                            {refundData.originalReceiptNumber || 'N/A (Pre-Stay Deposit)'}
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Reservation No:
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                            {refundData.reservationNumber || 'N/A'}
                        </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Disbursement Tender:
                        </span>
                        <span className="font-bold text-slate-900">
                            {refundData.disbursementMethod || 'Cash'}
                        </span>
                    </div>

                    <div className="sm:col-span-2 flex items-baseline gap-2 pt-1 border-t border-dashed border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Reason for Refund:
                        </span>
                        <span className="text-rose-700 font-semibold text-[11px]">
                            {refundData.reason || 'Cancellation policy refund / Security deposit settlement'}
                        </span>
                    </div>
                </div>

                {/* Financial Breakdown (if applicable) */}
                {(refundData.originalDepositAmount || 0) > 0 && (
                    <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-2.5 mb-3 text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-slate-600 font-medium">Original Deposit Received:</span>
                            <span className="font-mono font-bold text-slate-900">{currencySymbol} {(refundData.originalDepositAmount || 0).toFixed(2)}</span>
                        </div>
                        {(refundData.retentionAmount || 0) > 0 && (
                            <div className="flex justify-between text-rose-700">
                                <span className="font-medium">Less Cancellation Retention:</span>
                                <span className="font-mono font-bold">- {currencySymbol} {(refundData.retentionAmount || 0).toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Amount Box */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-2 border-rose-800 rounded-lg p-3 bg-rose-50/30 mb-3 gap-3">
                    <div className="flex-1 pr-0 sm:pr-4">
                        <span className="text-[9px] font-bold text-rose-800 uppercase tracking-wider block">
                            Net Refund Amount in Words:
                        </span>
                        <p className="text-xs font-bold text-slate-900 italic mt-0.5 leading-relaxed">
                            {amountInWords}
                        </p>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-rose-200 pt-2 sm:pt-0 sm:pl-4 shrink-0 min-w-[170px]">
                        <span className="text-[9px] font-extrabold text-rose-700 uppercase tracking-wider block">
                            NET REFUND DISBURSED
                        </span>
                        <div className="text-xl font-black font-mono text-rose-800 mt-0.5">
                            {currencySymbol} {netRefund.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 mt-1">
                            <AlertCircle className="size-2.5" /> DISBURSED &amp; RECORDED
                        </span>
                    </div>
                </div>

                {/* Legal acknowledgment */}
                <p className="text-[10px] text-slate-600 italic border-l-2 border-rose-800 pl-2 mb-3 leading-relaxed">
                    &ldquo;I hereby acknowledge receipt of the refund amount stated above in full and final settlement of this transaction.&rdquo;
                </p>

                {/* 3-Column Signatures */}
                <div className="grid grid-cols-3 gap-3 pt-3 text-[10px]">
                    <div className="text-center">
                        <div className="border-t border-slate-500 pt-1 font-bold text-slate-700">
                            Guest&apos;s Signature
                        </div>
                        <span className="text-[8.5px] text-slate-400 block">(Acknowledged)</span>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-slate-500 pt-1 font-bold text-slate-700">
                            Cashier ({refundData.cashierName || 'Front Desk'})
                        </div>
                        <span className="text-[8.5px] text-slate-400 block">(Disbursed By)</span>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-slate-500 pt-1 font-bold text-slate-700">
                            Manager ({refundData.authorizedBy || 'Duty Mgr'})
                        </div>
                        <span className="text-[8.5px] text-slate-400 block">(Audit Approved)</span>
                    </div>
                </div>

                <div className="text-center text-[9px] text-slate-400 mt-3 pt-1 border-t border-dashed border-slate-200">
                    Official Disbursement Voucher &bull; Grand Palace Hotel PMS &bull; Financial Audit Compliant
                </div>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[100020] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
            {/* Modal Box */}
            <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden text-slate-800 font-sans">
                {/* Control Header Bar */}
                <div className="bg-rose-950 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-400/30">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold tracking-wide uppercase flex items-center gap-2">
                                <span>Official Refund Voucher</span>
                                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                    {refundData.disbursementMethod || 'Cash'}
                                </span>
                            </h2>
                            <p className="text-[11px] text-rose-300 font-mono">
                                Voucher: <span className="text-amber-300 font-bold">{voucherNumber}</span> &bull; Guest: {refundData.guestName}
                            </p>
                        </div>
                    </div>

                    {/* Print Layout Switcher + Actions */}
                    <div className="flex items-center gap-2.5">
                        <div className="hidden sm:flex bg-rose-900/60 p-0.5 rounded-lg border border-rose-800 text-xs">
                            <button
                                type="button"
                                onClick={() => setPrintLayout('double_a4')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                                    printLayout === 'double_a4'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'text-rose-200 hover:text-white'
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
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'text-rose-200 hover:text-white'
                                }`}
                                title="Print single A5 voucher for Guest"
                            >
                                Guest Copy (A5)
                            </button>
                            <button
                                type="button"
                                onClick={() => setPrintLayout('single_accounts')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                                    printLayout === 'single_accounts'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'text-rose-200 hover:text-white'
                                }`}
                                title="Print single A5 voucher for Accounts"
                            >
                                Accounts Copy (A5)
                            </button>
                        </div>

                        {/* Print Button */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                            <Printer size={14} />
                            <span>Print Voucher</span>
                        </button>

                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-900 rounded-lg transition-colors cursor-pointer"
                            title="Close modal"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Modal Body / Scrollable Preview */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200/70">
                    <div ref={voucherContainerRef} className="max-w-2xl mx-auto space-y-4">
                        {/* Audit Alert */}
                        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="size-4 text-rose-600 shrink-0" />
                                <span>
                                    Audit Requirement: Cash/digital refunds require the signed Accounts Copy to be filed in the cashier vault drawer.
                                </span>
                            </div>
                            <span className="font-mono font-bold text-rose-700 shrink-0">
                                {currencySymbol} {netRefund.toFixed(2)}
                            </span>
                        </div>

                        {/* Top / Guest Copy */}
                        {(printLayout === 'double_a4' || printLayout === 'single_guest') && (
                            renderVoucherCard('GUEST COPY')
                        )}

                        {/* Perforated Divider */}
                        {printLayout === 'double_a4' && (
                            <div className="relative py-2 select-none">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t-2 border-dashed border-rose-400"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-slate-200 px-4 py-1 rounded-full text-[10px] font-black text-rose-800 tracking-wider uppercase flex items-center gap-2 border border-rose-300 shadow-2xs">
                                        <Scissors className="size-3 text-rose-600" />
                                        <span>Cut / Tear Line (Accounts &amp; Vault Copy Below)</span>
                                        <Scissors className="size-3 text-rose-600 rotate-180" />
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Bottom / Accounts Copy */}
                        {(printLayout === 'double_a4' || printLayout === 'single_accounts') && (
                            renderVoucherCard('ACCOUNTS / AUDIT COPY')
                        )}
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>Disbursement Completed &bull; Sign-off Ready</span>
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
                            className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
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
