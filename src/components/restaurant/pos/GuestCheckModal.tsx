import React, { useEffect } from 'react';
import type { GuestCheckData } from './pos.types';
import { Printer, X, FileText } from 'lucide-react';
import { printThermalSlip } from './posPrintUtil';

interface GuestCheckModalProps {
    isOpen?: boolean;
    guestCheck?: GuestCheckData | null;
    data?: GuestCheckData | null;
    onClose: () => void;
    onProceedToSettle?: () => void;
}

export const GuestCheckModal: React.FC<GuestCheckModalProps> = ({
    isOpen = true,
    guestCheck,
    data,
    onClose,
    onProceedToSettle
}) => {
    const activeCheck = guestCheck || data;
    const handlePrint = () => {
        printThermalSlip('printable-guest-check', `Guest Check #${activeCheck?.orderNumber}`);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                handlePrint();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, activeCheck]);

    if (!isOpen || !activeCheck) return null;

    const restName = activeCheck.restaurantSettings?.restaurantName || 'Hotel Plaza Dining';
    const restAddress = activeCheck.restaurantSettings?.address || 'Level 1, Hotel Plaza';
    const restPhone = activeCheck.restaurantSettings?.phone || '+880 1700-000000';

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#16161d] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
            >
                {/* Header Bar */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#1c1c24]/80">
                    <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <FileText className="size-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                    Guest Check
                                </h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                    {activeCheck.table || 'Dine-In'}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                Order #{activeCheck.orderNumber} • Provisional Review Slip
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Printable 80mm Slip Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/50 dark:bg-black/30">
                    <div
                        id="printable-guest-check"
                        className="bg-white text-black p-5 rounded-2xl shadow-sm border border-slate-200 font-mono text-xs max-w-xs mx-auto"
                        style={{ fontFamily: 'monospace' }}
                    >
                        <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
                            <h2 className="text-sm font-extrabold uppercase tracking-wider">{restName}</h2>
                            <p className="text-[10px] text-slate-500">{restAddress}</p>
                            <p className="text-[10px] text-slate-500">Tel: {restPhone}</p>
                            <div className="pt-1">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-black font-bold text-[10px] border border-slate-300">
                                    *** GUEST CHECK ***
                                </span>
                            </div>
                        </div>

                        {/* Meta info */}
                        <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
                            <div className="flex justify-between">
                                <span>Order #: {activeCheck.orderNumber}</span>
                                <span>{activeCheck.orderType}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Table: {activeCheck.table}</span>
                                <span>Server: {activeCheck.waiter || 'Cashier'}</span>
                            </div>
                            {activeCheck.roomNumber && (
                                <div className="flex justify-between font-bold">
                                    <span>Guest Room:</span>
                                    <span>Room #{activeCheck.roomNumber}</span>
                                </div>
                            )}
                            <div className="text-[10px] text-slate-500">{activeCheck.timestamp}</div>
                        </div>

                        {/* Items Table */}
                        <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold border-b border-slate-200 pb-1">
                                <span>ITEM</span>
                                <span className="w-10 text-center">QTY</span>
                                <span className="text-right">TOTAL</span>
                            </div>
                            {activeCheck.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between items-start text-[11px]">
                                    <div className="flex-1 pr-2 truncate">
                                        <span>{it.name}</span>
                                        {it.addons && it.addons.length > 0 && (
                                            <div className="text-[9px] text-slate-500">
                                                +{it.addons.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <span className="w-10 text-center">{it.quantity}</span>
                                    <span className="text-right font-bold">৳{Number(it.total).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Financial Totals */}
                        <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>৳{Number(activeCheck.subtotal).toFixed(2)}</span>
                            </div>
                            {Number(activeCheck.discountAmount || 0) > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                    <span>Discount</span>
                                    <span>-৳{Number(activeCheck.discountAmount).toFixed(2)}</span>
                                </div>
                            )}
                            {Number(activeCheck.serviceChargeAmount || 0) > 0 && (
                                <div className="flex justify-between">
                                    <span>Service Charge ({activeCheck.serviceChargePercent}%)</span>
                                    <span>৳{Number(activeCheck.serviceChargeAmount).toFixed(2)}</span>
                                </div>
                            )}
                            {Number(activeCheck.vatAmount || 0) > 0 && (
                                <div className="flex justify-between">
                                    <span>VAT ({activeCheck.vatPercent}%)</span>
                                    <span>৳{Number(activeCheck.vatAmount).toFixed(2)}</span>
                                </div>
                            )}
                            {Number(activeCheck.cityTaxAmount || 0) > 0 && (
                                <div className="flex justify-between">
                                    <span>City Tourism Tax ({activeCheck.cityTaxPercent}%)</span>
                                    <span>৳{Number(activeCheck.cityTaxAmount).toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        {/* Grand Total */}
                        <div className="pt-2 text-center">
                            <div className="flex justify-between items-center text-sm font-extrabold pb-2">
                                <span>TOTAL PAYABLE</span>
                                <span>৳{Number(activeCheck.grandTotal).toFixed(2)}</span>
                            </div>
                            <p className="text-[9px] text-slate-500">
                                Please review your bill with the server before making final payment.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#16161d] flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
                    >
                        Close
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer shadow-sm"
                        >
                            <Printer className="size-3.5" />
                            <span>Print Thermal Check</span>
                        </button>
                        {onProceedToSettle && (
                            <button
                                type="button"
                                onClick={onProceedToSettle}
                                className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:opacity-90 transition cursor-pointer shadow-sm"
                            >
                                Proceed to Settle
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
