import React, { useState, useEffect } from 'react';
import type { OrderReceipt } from './pos.types';
import { Printer, X, FileText, ShieldCheck } from 'lucide-react';
import { printThermalSlip } from './posPrintUtil';

export interface ReceiptModalProps {
    isOpen?: boolean;
    receipt: OrderReceipt | null;
    onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
    const [formatMode, setFormatMode] = useState<'standard' | 'mushak63'>('standard');

    const handlePrint = () => {
        const title =
            formatMode === 'mushak63'
                ? `Mushak 6.3 Challan #${receipt?.orderNumber}`
                : `Receipt #${receipt?.orderNumber}`;
        printThermalSlip('printable-thermal-receipt', title);
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
    }, [onClose, receipt, formatMode]);

    if (!receipt) return null;

    const restName = receipt.restaurantSettings?.restaurantName || 'Hotel Plaza Dining';
    const restAddress = receipt.restaurantSettings?.address || 'Level 1, Hotel Plaza';
    const restPhone = receipt.restaurantSettings?.phone || '+880 1700-000000';
    const binNumber = receipt.binNumber || 'BIN-003847291-01';

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#16161d] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
            >
                {/* Control Bar */}
                <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#1c1c24]/70">
                    <div className="flex items-center gap-2">
                        <span className="size-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                            ✓
                        </span>
                        <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                Order #{receipt.orderNumber} Settled
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {formatMode === 'mushak63' ? 'NBR Mushak 6.3 Tax Invoice' : 'Thermal POS Slip'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>

                {/* Format Switcher */}
                <div className="px-4 py-2 bg-slate-100/90 dark:bg-[#14141a] border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setFormatMode('standard')}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            formatMode === 'standard'
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        <FileText className="size-3.5" />
                        <span>Standard 80mm</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormatMode('mushak63')}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            formatMode === 'mushak63'
                                ? 'bg-primary text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        <ShieldCheck className="size-3.5" />
                        <span>NBR Mushak 6.3</span>
                    </button>
                </div>

                {/* Receipt Preview */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60 dark:bg-black/30">
                    <div
                        id="printable-thermal-receipt"
                        className="bg-white text-black p-5 rounded-2xl shadow-sm border border-slate-200 font-mono text-xs max-w-xs mx-auto space-y-2.5"
                        style={{ fontFamily: 'monospace' }}
                    >
                        {/* Header */}
                        <div className="text-center pb-2 border-b border-dashed border-slate-300 space-y-0.5">
                            <h2 className="text-sm font-extrabold uppercase">{restName}</h2>
                            <p className="text-[10px] text-slate-500">{restAddress}</p>
                            <p className="text-[10px] text-slate-500">Tel: {restPhone}</p>
                            <p className="text-[10px] font-bold text-slate-700">BIN: {binNumber}</p>
                            {formatMode === 'mushak63' && (
                                <div className="pt-1">
                                    <span className="inline-block px-2 py-0.5 rounded bg-black text-white font-extrabold text-[10px]">
                                        MUSHAK 6.3 TAX INVOICE
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Order & Token */}
                        <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-1">
                            <div className="flex justify-between font-bold">
                                <span>ORDER: #{receipt.orderNumber}</span>
                                <span>TOKEN: #{receipt.tokenNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Table: {receipt.table || 'Counter'}</span>
                                <span>Type: {receipt.orderType}</span>
                            </div>
                            {receipt.roomNumber && (
                                <div className="flex justify-between font-bold text-indigo-700">
                                    <span>Billed To Room:</span>
                                    <span>Room #{receipt.roomNumber}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Server: {receipt.waiter || 'Cashier'}</span>
                                <span>{receipt.timestamp}</span>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="py-2 border-b border-dashed border-slate-300 space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold border-b border-slate-200 pb-1">
                                <span>ITEM</span>
                                <span className="w-10 text-center">QTY</span>
                                <span className="text-right">PRICE</span>
                            </div>
                            {receipt.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between items-start text-[11px]">
                                    <div className="flex-1 pr-2 truncate">
                                        <span>{it.name}</span>
                                        {it.selectedVariation && (
                                            <div className="text-[9px] text-slate-500">
                                                Size: {it.selectedVariation.name}
                                            </div>
                                        )}
                                        {it.selectedAddons && it.selectedAddons.length > 0 && (
                                            <div className="text-[9px] text-slate-500">
                                                +{it.selectedAddons.map((a) => a.name).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <span className="w-10 text-center">{it.quantity}</span>
                                    <span className="text-right font-bold">
                                        ৳{(it.itemPrice * it.quantity).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>৳{receipt.subtotal.toFixed(2)}</span>
                            </div>
                            {receipt.discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-700">
                                    <span>Discount</span>
                                    <span>-৳{receipt.discountAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {receipt.serviceChargeAmount > 0 && (
                                <div className="flex justify-between">
                                    <span>Service Charge ({receipt.serviceChargePercent}%)</span>
                                    <span>৳{receipt.serviceChargeAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {receipt.vatAmount > 0 && (
                                <div className="flex justify-between">
                                    <span>VAT ({receipt.vatPercent}%)</span>
                                    <span>৳{receipt.vatAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {Number(receipt.cityTaxAmount || 0) > 0 && (
                                <div className="flex justify-between">
                                    <span>City Tourism Tax</span>
                                    <span>৳{Number(receipt.cityTaxAmount).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-slate-200">
                                <span>NET TOTAL</span>
                                <span>৳{receipt.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment Details */}
                        <div className="py-2 border-b border-dashed border-slate-300 text-[11px] space-y-0.5">
                            <div className="flex justify-between">
                                <span>Payment Mode</span>
                                <span className="font-bold">{receipt.paymentMethod}</span>
                            </div>
                            {receipt.paymentMethod === 'Cash' && (
                                <>
                                    <div className="flex justify-between">
                                        <span>Tendered Cash</span>
                                        <span>৳{receipt.amountTendered.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Change Given</span>
                                        <span>৳{receipt.changeAmount.toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                            {receipt.trxId && (
                                <div className="flex justify-between">
                                    <span>Trx ID / Auth</span>
                                    <span className="font-mono">{receipt.trxId}</span>
                                </div>
                            )}
                        </div>

                        {/* Barcode & Footer */}
                        <div className="pt-2 text-center space-y-1">
                            <p className="text-[10px] text-slate-600">
                                Thank you for dining with us! Please come again.
                            </p>
                            <p className="text-[9px] text-slate-400 font-mono">
                                Powered by HotelManagementOS POS
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
                        Done
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 transition cursor-pointer shadow-sm"
                    >
                        <Printer className="size-3.5" />
                        <span>Print Receipt (Ctrl+P)</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
