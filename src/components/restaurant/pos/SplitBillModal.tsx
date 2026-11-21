import React, { useState } from 'react';
import {
    X,
    Split,
    Users,
    UtensilsCrossed
} from 'lucide-react';

export interface SplitOrderItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
}

export interface SplitBillModalProps {
    isOpen: boolean;
    totalAmount?: number;
    total?: number;
    orderId?: string;
    orderNumber?: number;
    items?: any[];
    orderItems?: SplitOrderItem[];
    onClose: () => void;
    onSplitConfirmed?: (splits: { guestName: string; amount: number; method: string }[]) => void;
    onConfirmSplit?: (splits: { customerName?: string; amount: number; paymentMethod: string }[]) => void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
    isOpen,
    totalAmount,
    total,
    orderId: _orderId,
    orderNumber = 1001,
    items,
    orderItems = [],
    onClose,
    onSplitConfirmed,
    onConfirmSplit
}) => {
    const effectiveTotal = totalAmount || total || 0;
    const effectiveItems: SplitOrderItem[] = orderItems.length > 0
        ? orderItems
        : (items || []).map((i: any) => ({
              id: i.cartItemId || i.id,
              name: i.name,
              quantity: i.quantity,
              price: i.itemPrice || i.price || 0
          }));

    const [splitMode, setSplitMode] = useState<'equal' | 'item-wise'>('equal');
    const [splitCount, setSplitCount] = useState<number>(2);

    const [guestNames, setGuestNames] = useState<Record<number, string>>({
        1: 'Guest 1',
        2: 'Guest 2',
        3: 'Guest 3',
        4: 'Guest 4',
        5: 'Guest 5',
        6: 'Guest 6'
    });

    const [itemAssignments, setItemAssignments] = useState<Record<string, number>>({});

    if (!isOpen) return null;

    const perPersonShare = +(effectiveTotal / splitCount).toFixed(2);

    const calculateItemWiseTotals = () => {
        const totals: Record<number, number> = {};
        for (let i = 1; i <= splitCount; i++) totals[i] = 0;

        effectiveItems.forEach((item) => {
            const assignedTo = itemAssignments[item.id] || 1;
            totals[assignedTo] = (totals[assignedTo] || 0) + item.price * item.quantity;
        });
        return totals;
    };

    const handleConfirm = () => {
        const splits: Array<{ guestName: string; amount: number; method: string }> = [];
        if (splitMode === 'equal') {
            for (let i = 1; i <= splitCount; i++) {
                splits.push({
                    guestName: guestNames[i] || `Guest ${i}`,
                    amount: perPersonShare,
                    method: 'Cash'
                });
            }
        } else {
            const itemTotals = calculateItemWiseTotals();
            for (let i = 1; i <= splitCount; i++) {
                splits.push({
                    guestName: guestNames[i] || `Guest ${i}`,
                    amount: +(itemTotals[i] || 0).toFixed(2),
                    method: 'Cash'
                });
            }
        }
        if (onSplitConfirmed) onSplitConfirmed(splits);
        if (onConfirmSplit) {
            onConfirmSplit(
                splits.map((s) => ({
                    customerName: s.guestName,
                    amount: s.amount,
                    paymentMethod: s.method
                }))
            );
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#16161d] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-[#1c1c24]/60">
                    <div className="flex items-center gap-2.5">
                        <span className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm">
                            <Split className="size-4" />
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Split Guest Bill
                            </h3>
                            <p className="text-xs text-slate-400">
                                Order #{orderNumber} • Total: ৳{effectiveTotal.toFixed(2)}
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

                {/* Body */}
                <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
                    {/* Split Mode Switcher */}
                    <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Select Split Strategy
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setSplitMode('equal')}
                                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                                    splitMode === 'equal'
                                        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 font-bold'
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1a24] text-slate-600 dark:text-slate-300'
                                }`}
                            >
                                <Users className="size-4" />
                                <div>
                                    <span className="block font-bold text-xs">Equal Split</span>
                                    <span className="text-[10px] text-slate-400">Split evenly among guests</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSplitMode('item-wise')}
                                className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                                    splitMode === 'item-wise'
                                        ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 font-bold'
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1a24] text-slate-600 dark:text-slate-300'
                                }`}
                            >
                                <UtensilsCrossed className="size-4" />
                                <div>
                                    <span className="block font-bold text-xs">Itemized Split</span>
                                    <span className="text-[10px] text-slate-400">Assign dishes per diner</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Guest Count Stepper */}
                    <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Number of Payers ({splitCount})
                        </label>
                        <div className="flex items-center gap-2">
                            {[2, 3, 4, 5, 6].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setSplitCount(num)}
                                    className={`flex-1 py-2 rounded-xl border text-xs font-bold font-mono transition cursor-pointer ${
                                        splitCount === num
                                            ? 'bg-primary text-white border-primary shadow-xs'
                                            : 'bg-slate-50 dark:bg-[#202028] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    {num} Diners
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Breakdown */}
                    {splitMode === 'equal' ? (
                        <div className="space-y-2">
                            <label className="block font-bold text-slate-700 dark:text-slate-300">
                                Equal Shares Breakdown
                            </label>
                            {Array.from({ length: splitCount }, (_, i) => i + 1).map((idx) => (
                                <div
                                    key={idx}
                                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                                >
                                    <input
                                        type="text"
                                        value={guestNames[idx] || `Guest ${idx}`}
                                        onChange={(e) =>
                                            setGuestNames({ ...guestNames, [idx]: e.target.value })
                                        }
                                        className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none w-36"
                                    />
                                    <span className="font-mono font-extrabold text-sm text-primary">
                                        ৳{perPersonShare.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="block font-bold text-slate-700 dark:text-slate-300">
                                Assign Dishes to Diners:
                            </label>
                            {effectiveItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                                >
                                    <div className="flex-1 truncate">
                                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                                            {item.name} ({item.quantity}×)
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            ৳{(item.price * item.quantity).toFixed(2)}
                                        </span>
                                    </div>

                                    <select
                                        value={itemAssignments[item.id] || 1}
                                        onChange={(e) =>
                                            setItemAssignments({
                                                ...itemAssignments,
                                                [item.id]: Number(e.target.value)
                                            })
                                        }
                                        className="bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold cursor-pointer"
                                    >
                                        {Array.from({ length: splitCount }, (_, i) => i + 1).map((idx) => (
                                            <option key={idx} value={idx}>
                                                {guestNames[idx] || `Guest ${idx}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1c1c24]/50 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:opacity-90 transition cursor-pointer shadow-sm"
                    >
                        Confirm Split Allocation
                    </button>
                </div>
            </div>
        </div>
    );
};
