import React from 'react';
import type { HeldOrder } from './pos.types';
import { X, PlayCircle, Trash2, Clock, Utensils } from 'lucide-react';

interface HoldOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
    heldOrders: HeldOrder[];
    onResumeOrder: (order: HeldOrder) => void;
    onDeleteHeldOrder?: (id: string) => void;
    onDeleteOrder?: (id: string) => void;
}

export const HoldOrdersModal: React.FC<HoldOrdersModalProps> = ({
    isOpen,
    onClose,
    heldOrders,
    onResumeOrder,
    onDeleteHeldOrder,
    onDeleteOrder
}) => {
    if (!isOpen) return null;
    const handleDelete = onDeleteHeldOrder || onDeleteOrder || (() => {});

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#16161d] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-[#1c1c24]/60">
                    <div className="flex items-center gap-2.5">
                        <span className="size-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm">
                            ⏸
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Parked / Held Orders
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {heldOrders.length} order{heldOrders.length === 1 ? '' : 's'} on hold
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* List of Held Orders */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
                    {heldOrders.length === 0 ? (
                        <div className="py-14 text-center">
                            <div className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
                                <Utensils className="size-5" />
                            </div>
                            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                No orders currently on hold
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                                You can park active shopping carts using the "Hold" button on POS when a guest steps away.
                            </p>
                        </div>
                    ) : (
                        heldOrders.map((h) => {
                            const totalAmount = h.items.reduce(
                                (sum, item) => sum + item.itemPrice * item.quantity,
                                0
                            );
                            return (
                                <div
                                    key={h.id}
                                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1a24] shadow-2xs hover:border-primary/50 transition flex items-center justify-between gap-3"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                                                {h.customerName || 'Walk-in Guest'}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold">
                                                {h.orderType}
                                            </span>
                                            {h.table && (
                                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono">
                                                    Table: {h.table}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                            <span className="flex items-center gap-1">
                                                <Clock className="size-3" />
                                                {h.timestamp}
                                            </span>
                                            <span>•</span>
                                            <span>{h.items.length} dishes</span>
                                        </div>
                                        <div className="font-mono font-bold text-sm text-slate-900 dark:text-white pt-1">
                                            ৳{totalAmount.toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onResumeOrder(h);
                                                onClose();
                                            }}
                                            className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-95 shadow-sm transition cursor-pointer"
                                        >
                                            <PlayCircle className="size-3.5" />
                                            <span>Resume</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(h.id)}
                                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                            title="Discard order"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
