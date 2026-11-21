import React, { useState } from 'react';
import {
    X,
    GitMerge
} from 'lucide-react';

export interface ActiveOrderCandidate {
    id: string;
    orderNumber: number;
    customerName?: string | null;
    totalAmount: number;
    tableCode?: string | null;
    items?: any[];
}

interface MergeOrderModalProps {
    isOpen: boolean;
    currentOrder: ActiveOrderCandidate | null;
    activeOrders: ActiveOrderCandidate[];
    onClose: () => void;
    onMergeSuccess: (message: string) => void;
}

export const MergeOrderModal: React.FC<MergeOrderModalProps> = ({
    isOpen,
    currentOrder,
    activeOrders,
    onClose,
    onMergeSuccess
}) => {
    const [selectedSourceId, setSelectedSourceId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!isOpen || !currentOrder) return null;

    const candidateOrders = activeOrders.filter((o) => o.id !== currentOrder.id);
    const selectedCandidate = candidateOrders.find((o) => o.id === selectedSourceId);

    const handleMerge = async () => {
        if (!selectedSourceId) {
            setErrorMsg('Please select an order to merge');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            // Settle or merge orders locally or call API
            onMergeSuccess(`Orders #${currentOrder.orderNumber} & #${selectedCandidate?.orderNumber} successfully merged!`);
            onClose();
        } catch (err: any) {
            setErrorMsg(err?.message || 'Error merging orders');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#16161d] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-[#1c1c24]/60">
                    <div className="flex items-center gap-2.5">
                        <span className="size-8 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-primary flex items-center justify-center text-sm">
                            <GitMerge className="size-4" />
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Merge Table Orders
                            </h3>
                            <p className="text-xs text-slate-400">
                                Combine items from another active table ticket into Order #{currentOrder.orderNumber}
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
                <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
                    {errorMsg && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600">
                            {errorMsg}
                        </div>
                    )}

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                            Target Master Order (Preserved)
                        </span>
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">
                                    Order #{currentOrder.orderNumber}
                                </span>
                                <span className="block text-slate-500 text-xs">
                                    {currentOrder.tableCode ? `Table ${currentOrder.tableCode}` : 'Dine In'}
                                </span>
                            </div>
                            <span className="font-mono font-bold text-sm text-primary">
                                ৳{Number(currentOrder.totalAmount).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Select Source Order to Merge Into Target:
                        </label>
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                            {candidateOrders.map((cand) => {
                                const isSelected = selectedSourceId === cand.id;
                                return (
                                    <div
                                        key={cand.id}
                                        onClick={() => setSelectedSourceId(cand.id)}
                                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                            isSelected
                                                ? 'bg-primary/10 border-primary ring-1 ring-primary'
                                                : 'bg-white dark:bg-[#18181f] border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                        }`}
                                    >
                                        <div>
                                            <span className="font-bold text-slate-900 dark:text-white font-mono block">
                                                Order #{cand.orderNumber}
                                            </span>
                                            <span className="text-slate-400 text-[11px]">
                                                {cand.tableCode ? `Table ${cand.tableCode}` : 'Dine In'} • {cand.customerName || 'Guest'}
                                            </span>
                                        </div>
                                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                            ৳{Number(cand.totalAmount).toFixed(2)}
                                        </span>
                                    </div>
                                );
                            })}
                            {candidateOrders.length === 0 && (
                                <div className="p-6 text-center text-slate-400 border border-dashed rounded-xl">
                                    No other active unsettled orders available for merging.
                                </div>
                            )}
                        </div>
                    </div>
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
                        onClick={handleMerge}
                        disabled={isSubmitting || !selectedSourceId}
                        className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                        {isSubmitting ? 'Merging…' : 'Confirm Merge'}
                    </button>
                </div>
            </div>
        </div>
    );
};
