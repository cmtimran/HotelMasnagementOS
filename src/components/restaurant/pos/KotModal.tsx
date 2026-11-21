import React, { useEffect } from 'react';
import type { KotTicketData } from './pos.types';
import { Printer, X, ChefHat } from 'lucide-react';
import { printThermalSlip } from './posPrintUtil';

interface KotModalProps {
    isOpen?: boolean;
    kotData?: KotTicketData | null;
    ticket?: KotTicketData | null;
    onClose: () => void;
    onReprint?: () => void;
}

export const KotModal: React.FC<KotModalProps> = ({
    isOpen = true,
    kotData,
    ticket,
    onClose,
    onReprint
}) => {
    const activeKot = kotData || ticket;
    const handlePrint = () => {
        if (onReprint) {
            onReprint();
        }
        printThermalSlip('printable-kot-ticket', `KOT #${activeKot?.orderNumber}`);
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
    }, [onClose, activeKot]);

    if (!isOpen || !activeKot) return null;

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
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#1c1c24]/80">
                    <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <ChefHat className="size-5" />
                        </div>
                        <div>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                                Kitchen Order Ticket (KOT)
                            </span>
                            <span className="text-[11px] text-slate-400">
                                Order #{activeKot.orderNumber} • Token #{activeKot.tokenNumber}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Printable 80mm KOT Ticket */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/50 dark:bg-black/30">
                    <div
                        id="printable-kot-ticket"
                        className="bg-white text-black p-5 rounded-2xl shadow-sm border border-slate-200 font-mono text-xs max-w-xs mx-auto"
                        style={{ fontFamily: 'monospace' }}
                    >
                        <div className="text-center pb-3 border-b-2 border-dashed border-black space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded bg-black text-white font-extrabold text-xs">
                                *** KITCHEN TICKET (KOT) ***
                            </span>
                            <div className="text-2xl font-black font-mono pt-1">
                                TOKEN #{activeKot.tokenNumber}
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="py-2.5 border-b border-dashed border-black text-xs space-y-1">
                            <div className="flex justify-between font-bold">
                                <span>ORDER: #{activeKot.orderNumber}</span>
                                <span>{activeKot.orderType}</span>
                            </div>
                            <div className="flex justify-between font-extrabold text-sm">
                                <span>TABLE: {activeKot.table || 'COUNTER'}</span>
                                {activeKot.roomNumber && <span>ROOM: {activeKot.roomNumber}</span>}
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-600">
                                <span>SERVER: {activeKot.waiter || 'Cashier'}</span>
                                <span>TIME: {activeKot.timestamp}</span>
                            </div>
                        </div>

                        {/* Dishes to cook */}
                        <div className="py-3 border-b-2 border-dashed border-black space-y-2">
                            <div className="flex justify-between text-[11px] font-extrabold border-b border-slate-300 pb-1">
                                <span>QTY</span>
                                <span className="flex-1 pl-3">DISH & INSTRUCTIONS</span>
                            </div>
                            {activeKot.items.map((it, idx) => (
                                <div key={idx} className="flex items-start text-xs">
                                    <span className="font-extrabold text-sm w-7 shrink-0">{it.quantity}×</span>
                                    <div className="flex-1 pl-2">
                                        <span className="font-extrabold block text-sm">{it.name}</span>
                                        {it.variationName && (
                                            <span className="text-[11px] block font-semibold text-slate-700">
                                                Size: {it.variationName}
                                            </span>
                                        )}
                                        {it.addons && it.addons.length > 0 && (
                                            <span className="text-[10px] block text-slate-600">
                                                Addons: {it.addons.join(', ')}
                                            </span>
                                        )}
                                        {it.notes && (
                                            <span className="text-[11px] block font-bold text-red-600">
                                                ⚠️ NOTE: {it.notes}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 text-center text-[10px] text-slate-600">
                            Printed for Kitchen Expediter & Station Chef
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#16161d] flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
                    >
                        Dismiss
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 transition cursor-pointer shadow-sm"
                    >
                        <Printer className="size-3.5" />
                        <span>Print KOT Slip</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
