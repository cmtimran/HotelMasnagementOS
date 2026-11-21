import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Mail, Building2, MapPin } from 'lucide-react';
import { useActiveCurrency } from '../../../utils/currencyUtils';
import { usePropertyLocalization } from '../../../utils/localizationEngine';
import type { FolioData } from '../folioTypes';
import type { AmendBookingData } from '../../modals/AmendStayModal';

interface FolioInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    folio: FolioData | null;
    booking?: AmendBookingData | null;
    viewMode?: 'invoice' | 'voucher';
    onOpenEmailModal?: () => void;
}

export const FolioInvoiceModal: React.FC<FolioInvoiceModalProps> = ({
    isOpen,
    onClose,
    folio,
    booking,
    viewMode = 'invoice',
    onOpenEmailModal
}) => {
    const { currencySymbol } = useActiveCurrency();
    const { formatDate, formatTime, formatDateTime, config: locConfig } = usePropertyLocalization();
    const invoiceRef = useRef<HTMLDivElement | null>(null);

    if (!isOpen || !folio) return null;

    const isVoucherOnly = viewMode === 'voucher';

    // Filter charges if voucher only
    const chargesToDisplay = isVoucherOnly
        ? folio.charges.filter(c => c.charge_code !== 'ROOM_CHG' && !c.description.toLowerCase().includes('room charge'))
        : folio.charges;

    const accommodationCharges = folio.charges.filter(c => c.charge_code === 'ROOM_CHG' || c.description.toLowerCase().includes('room charge'));
    const extraCharges = folio.charges.filter(c => c.charge_code !== 'ROOM_CHG' && !c.description.toLowerCase().includes('room charge'));

    const totalAccomBase = accommodationCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const totalExtraBase = extraCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const totalGrossCharges = chargesToDisplay.reduce((s, c) => s + (Number(c.total_amount) || Number(c.amount) || 0), 0);
    const totalPayments = folio.payments ? folio.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : 0;
    const netBalanceDue = Math.max(0, totalGrossCharges - (isVoucherOnly ? 0 : totalPayments));

    const totalVat = chargesToDisplay.reduce((s, c) => s + (Number(c.vat) || 0), 0);
    const totalSvcCharge = chargesToDisplay.reduce((s, c) => s + (Number(c.service_charge) || 0), 0);
    const totalCityTax = chargesToDisplay.reduce((s, c) => s + (Number(c.city_tax) || 0), 0);

    const issueDate = new Date().toISOString().split('T')[0];
    const guestName = folio.guest_name || booking?.guestName || 'Valued Guest';
    const roomNo = folio.room_number || booking?.roomNumber || '102';
    const roomType = folio.room_type || booking?.roomType || 'Deluxe Suite';
    const checkIn = folio.check_in || booking?.arrivalDate || '2026-07-02';
    const checkOut = folio.check_out || booking?.departureDate || '2026-07-04';
    const checkInTime = (folio as any)?.check_in_time || (booking as any)?.checkInTime || (booking as any)?.arrivalTime || locConfig.checkInTime || '14:00';
    const checkOutTime = (folio as any)?.check_out_time || (booking as any)?.checkOutTime || (booking as any)?.departureTime || locConfig.checkOutTime || '12:00';
    const resNo = folio.reservation_number || booking?.reservationNumber || 'RES-842365';
    const folioNo = folio.folio_number || `FOL-${resNo}`;

    const handlePrint = () => {
        const printContent = invoiceRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank', 'width=900,height=800');
        if (!printWindow) {
            window.print();
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${isVoucherOnly ? 'Extra Charges Voucher' : 'Folio Tax Invoice'} - ${folioNo}</title>
                    <meta charset="utf-8" />
                    <style>
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; font-size: 11px; line-height: 1.4; background: #fff; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
                        .hotel-title { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
                        .hotel-sub { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                        .hotel-meta { font-size: 10px; color: #475569; margin-top: 4px; line-height: 1.5; }
                        .invoice-meta { text-align: right; }
                        .invoice-title { font-size: 15px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; }
                        .meta-pill { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-top: 4px; }
                        .paid { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
                        .due { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
                        .details-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 20px; }
                        .col { width: 48%; }
                        .row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed #e2e8f0; }
                        .row-label { color: #64748b; font-weight: 600; font-size: 10px; text-transform: uppercase; }
                        .row-value { font-weight: 700; color: #0f172a; font-family: monospace; font-size: 11px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th { background: #0f172a; color: #fff; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
                        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; }
                        tr:nth-child(even) { background: #f8fafc; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .font-mono { font-family: monospace; }
                        .summary-box { display: flex; justify-content: flex-end; margin-bottom: 30px; }
                        .summary-table { width: 340px; }
                        .summary-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px; }
                        .grand-total { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 8px 0; font-weight: 800; font-size: 13px; margin-top: 6px; color: #0f172a; }
                        .net-due { font-weight: 900; font-size: 14px; color: #991b1b; padding-top: 6px; }
                        .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 15px; }
                        .sig-box { width: 40%; text-align: center; border-top: 1px solid #64748b; padding-top: 6px; font-size: 10px; color: #475569; font-weight: 600; }
                        .footer-note { text-align: center; font-size: 9px; color: #94a3b8; margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
                        @media print {
                            body { padding: 0; }
                            @page { margin: 15mm; size: A4; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 350);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100010] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
            {/* Modal Container */}
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 font-sans">
                {/* Control Header Bar */}
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0 shadow-md">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-400/30">
                            <Printer size={16} />
                        </div>
                        <div>
                            <h2 className="text-xs sm:text-sm font-bold tracking-wide uppercase">
                                {isVoucherOnly ? 'Extra Charges & Incidentals Voucher' : 'Official Guest Folio Tax Invoice'}
                            </h2>
                            <p className="text-[10px] text-slate-400 font-mono">
                                Folio: <span className="text-amber-300 font-bold">{folioNo}</span> • Res: {resNo}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            title="Print this invoice directly"
                        >
                            <Printer size={13} />
                            <span>Print (A4)</span>
                        </button>
                        {onOpenEmailModal && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenEmailModal();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer"
                                title="Email invoice directly to guest or company"
                            >
                                <Mail size={13} />
                                <span>Email Folio</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable Document Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-100 flex justify-center">
                    <div
                        ref={invoiceRef}
                        className="bg-white rounded-lg shadow-md border border-slate-200 p-8 w-full max-w-[800px] text-slate-800 text-xs"
                    >
                        {/* 1. Official Letterhead */}
                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Building2 size={20} className="text-blue-900" />
                                    <h1 className="text-lg font-extrabold text-slate-950 tracking-tight uppercase">
                                        Grand Palace Hotel & Resort
                                    </h1>
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                                    5-Star Luxury Suites & Hospitality
                                </p>
                                <div className="text-[9.5px] text-slate-600 mt-1.5 space-y-0.5 leading-relaxed">
                                    <p className="flex items-center gap-1">
                                        <MapPin size={10} className="text-slate-400 shrink-0" />
                                        <span>Plot 14, Road 3, Diplomatic Enclave, Gulshan-2, Dhaka-1212, Bangladesh</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span>Tel: +880 2 9887766</span>
                                        <span>•</span>
                                        <span>VAT / BIN: BIN-002918374-0101</span>
                                    </p>
                                    <p className="flex items-center gap-2 text-blue-700">
                                        <span>billing@grandpalacehotel.com</span>
                                        <span>•</span>
                                        <span>www.grandpalacehotel.com</span>
                                    </p>
                                </div>
                            </div>

                            <div className="text-right shrink-0">
                                <h2 className="text-sm font-black text-blue-950 uppercase tracking-wide">
                                    {isVoucherOnly ? 'Extra Charges Voucher' : 'Tax Invoice / Guest Folio'}
                                </h2>
                                <p className="text-[10px] font-mono font-bold text-slate-700 mt-1">
                                    Invoice No: <span className="text-slate-950">{folioNo}</span>
                                </p>
                                <p className="text-[9.5px] text-slate-500 font-mono">
                                    Date: {formatDate(issueDate)}
                                </p>
                                <div className="mt-2">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase tracking-wider font-mono border ${
                                        netBalanceDue <= 0
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                            : 'bg-rose-50 text-rose-800 border-rose-300'
                                    }`}>
                                        {netBalanceDue <= 0 ? '✓ Paid in Full' : `Payment Due: ${currencySymbol} ${netBalanceDue.toFixed(2)}`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Guest, Stay & Reservation Summary Box */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-50/80 border border-slate-200 rounded-lg p-3.5 mb-5 text-[10px]">
                            <div className="space-y-1.5">
                                <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                    <span className="text-slate-500 font-bold uppercase">Guest Name:</span>
                                    <span className="font-bold text-slate-950">{guestName}</span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                    <span className="text-slate-500 font-bold uppercase">Room Allocated:</span>
                                    <span className="font-bold text-slate-950">Room {roomNo} ({roomType})</span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                    <span className="text-slate-500 font-bold uppercase">Reservation No:</span>
                                    <span className="font-mono font-bold text-slate-900">{resNo}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-bold uppercase">Occupancy:</span>
                                    <span className="font-bold text-slate-900">2 Adults, 1 Child</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                    <span className="text-slate-500 font-bold uppercase">Check-In:</span>
                                    <span className="font-mono font-bold text-slate-900">{formatDate(checkIn)} ({formatTime(checkInTime)})</span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                    <span className="text-slate-500 font-bold uppercase">Check-Out:</span>
                                    <span className="font-mono font-bold text-slate-900">{formatDate(checkOut)} ({formatTime(checkOutTime)})</span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                                    <span className="text-slate-500 font-bold uppercase">Billing Party:</span>
                                    <span className="font-bold text-slate-900 truncate">{folio.bill_to || guestName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-bold uppercase">Rate Plan:</span>
                                    <span className="font-bold text-slate-900">{folio.market_code || 'Best Available Rate'}</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Itemized Transaction Ledger Table */}
                        <div className="mb-5 overflow-hidden rounded border border-slate-200">
                            <table className="w-full text-[10px] border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white font-bold text-[9px] uppercase tracking-wider">
                                        <th className="p-2 text-left w-20">Date</th>
                                        <th className="p-2 text-left w-24">Ref No</th>
                                        <th className="p-2 text-left">Description</th>
                                        <th className="p-2 text-left w-28">Head</th>
                                        <th className="p-2 text-right w-24">Amount ({currencySymbol})</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-slate-800">
                                    {chargesToDisplay.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-4 text-center text-slate-400 font-medium">
                                                No charges recorded on this folio.
                                            </td>
                                        </tr>
                                    ) : (
                                        chargesToDisplay.map((c, idx) => {
                                            const isAccom = c.charge_code === 'ROOM_CHG';
                                            return (
                                                <tr key={c.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                                    <td className="p-2 font-mono">{formatDate(c.charge_date || issueDate)}</td>
                                                    <td className="p-2 font-mono text-slate-600 font-semibold">{c.ref_no || `CHG-${c.id}`}</td>
                                                    <td className="p-2 font-medium">
                                                        <span>{c.description}</span>
                                                        {c.is_voided && <span className="ml-1 text-[8px] bg-rose-100 text-rose-700 px-1 rounded font-bold">VOIDED</span>}
                                                    </td>
                                                    <td className="p-2 text-slate-600 font-medium">{c.revenue_head || (isAccom ? 'Room Charges' : 'Incidentals')}</td>
                                                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                                                        {Number(c.total_amount || c.amount || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}

                                    {/* Payments Section on Invoice */}
                                    {!isVoucherOnly && folio.payments && folio.payments.length > 0 && (
                                        <>
                                            <tr className="bg-emerald-900 text-white font-bold text-[8.5px] uppercase tracking-wider">
                                                <th colSpan={3} className="p-1.5 pl-2 text-left">Payments / Settlement Receipts</th>
                                                <th className="p-1.5 text-left">Method</th>
                                                <th className="p-1.5 text-right pr-2">Paid ({currencySymbol})</th>
                                            </tr>
                                            {folio.payments.map((p, pIdx) => (
                                                <tr key={p.id || pIdx} className="bg-emerald-50/40 text-emerald-950">
                                                    <td className="p-2 font-mono">{formatDate(p.transaction_date || issueDate)}</td>
                                                    <td className="p-2 font-mono font-semibold">{p.payment_number || `PAY-${p.id}`}</td>
                                                    <td className="p-2 font-medium">Payment Received (Settled)</td>
                                                    <td className="p-2 font-medium">{p.payment_method || 'Cash / Gateway'}</td>
                                                    <td className="p-2 text-right font-mono font-bold text-emerald-700">
                                                        -{Number(p.amount || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 4. Financial Calculation Summary */}
                        <div className="flex justify-end mb-6">
                            <div className="w-80 space-y-1.5 text-[10.5px] font-mono">
                                {!isVoucherOnly && (
                                    <div className="flex justify-between text-slate-600">
                                        <span className="font-sans">Room Accommodation Base:</span>
                                        <span>{currencySymbol} {totalAccomBase.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-slate-600">
                                    <span className="font-sans">Incidentals & Extra Services:</span>
                                    <span>{currencySymbol} {totalExtraBase.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 border-t border-slate-200 pt-1">
                                    <span className="font-sans">Service Charge (10%):</span>
                                    <span>+{currencySymbol} {totalSvcCharge.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span className="font-sans">Statutory VAT / GST (15%):</span>
                                    <span>+{currencySymbol} {totalVat.toFixed(2)}</span>
                                </div>
                                {totalCityTax > 0 && (
                                    <div className="flex justify-between text-slate-600">
                                        <span className="font-sans">City Tourism Levy (1%):</span>
                                        <span>+{currencySymbol} {totalCityTax.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-slate-900 border-t-2 border-slate-900 pt-1 text-xs">
                                    <span className="font-sans">Total Gross Folio:</span>
                                    <span>{currencySymbol} {totalGrossCharges.toFixed(2)}</span>
                                </div>
                                {!isVoucherOnly && (
                                    <div className="flex justify-between text-emerald-700 font-bold">
                                        <span className="font-sans">Less Total Paid:</span>
                                        <span>-{currencySymbol} {totalPayments.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-extrabold text-sm border-t-2 border-slate-900 pt-1 text-rose-700">
                                    <span className="font-sans uppercase">Net Balance Due:</span>
                                    <span>{currencySymbol} {netBalanceDue.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* 5. Authorized Signatures & Disclaimer */}
                        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-[9px] text-slate-600 mt-6">
                            <div>
                                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                                <p className="font-bold uppercase tracking-wider text-slate-900">Guest Signature & Acknowledgment</p>
                                <p className="text-[8px] text-slate-400">I agree that my liability for this bill is not waived.</p>
                            </div>
                            <div>
                                <div className="h-10 border-b border-dashed border-slate-400 mb-1 flex items-end justify-center pb-1">
                                    <span className="text-[8.5px] font-mono text-slate-400">Front Desk Cashier Seal</span>
                                </div>
                                <p className="font-bold uppercase tracking-wider text-slate-900">Authorized Front Desk Officer</p>
                                <p className="text-[8px] text-slate-400">Grand Palace Hotel & Resort</p>
                            </div>
                        </div>

                        {/* 6. Footer Legal Note */}
                        <p className="text-[8px] text-center text-slate-400 mt-6 border-t border-slate-200 pt-2 leading-relaxed">
                            This is a computer-generated tax invoice issued by Grand Palace Hotel & Resort. For any billing adjustments or inquiries, please contact our Finance Department at billing@grandpalacehotel.com within 7 operational days.
                        </p>
                    </div>
                </div>

                {/* Bottom Dismiss Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-between items-center text-xs text-slate-600">
                    <span className="font-mono text-[10px]">
                        Printed on {formatDateTime(new Date())} • Certified Clean PMS Record
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
