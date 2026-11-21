import React, { useState, useEffect } from 'react';
import type { CashRegisterSession } from './pos.types';
import {
    X,
    Wallet,
    Lock,
    Unlock
} from 'lucide-react';

export interface CashRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    outletId: string;
    cashierName?: string;
    session: CashRegisterSession | null;
    stats?: {
        cashSales: number;
        cardSales: number;
        digitalSales: number;
        roomCharges: number;
        totalOrders: number;
    };
    onSessionUpdated?: () => void;
    onUpdateSession?: () => void;
}

export const CashRegisterModal: React.FC<CashRegisterModalProps> = ({
    isOpen,
    onClose,
    outletId,
    cashierName = 'Cashier',
    session,
    stats: propStats,
    onSessionUpdated,
    onUpdateSession
}) => {
    const notifyUpdated = () => {
        if (onSessionUpdated) onSessionUpdated();
        if (onUpdateSession) onUpdateSession();
    };
    // Open shift inputs
    const [openingFloat, setOpeningFloat] = useState<string>('5000.00');
    const [openNotes, setOpenNotes] = useState<string>('');

    // Close shift inputs
    const [actualCountedCash, setActualCountedCash] = useState<string>('0.00');
    const [closeNotes, setCloseNotes] = useState<string>('');

    // Live session stats
    const [sessionStats, setSessionStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSessionOpen = session && session.isOpen;

    const loadSessionStats = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/pos/registers/current?outletId=${outletId}&cashierId=staff-01`);
            const data = await res.json();
            if (data.success && data.data) {
                setSessionStats(data.data);
                if (data.data.isOpen && data.data.stats) {
                    const expected = Number(data.data.stats.expected_cash || 0);
                    setActualCountedCash(expected.toFixed(2));
                }
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setError(null);
            loadSessionStats();
        }
    }, [isOpen, outletId]);

    if (!isOpen) return null;

    const handleOpenShift = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/pos/registers/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    outletId,
                    cashierId: 'staff-01',
                    cashierName,
                    openingBalance: Number(openingFloat) || 0,
                    notes: openNotes
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to open shift');
            }
            notifyUpdated();
            loadSessionStats();
        } catch (err: any) {
            setError(err?.message || 'Error opening shift');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseShift = async () => {
        if (!session?.shiftId && !sessionStats?.session?.id) return;
        setLoading(true);
        setError(null);
        try {
            const sessionId = session?.shiftId || sessionStats?.session?.id;
            const res = await fetch('/api/pos/registers/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    actualClosingCash: Number(actualCountedCash) || 0,
                    notes: closeNotes
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to close shift');
            }
            notifyUpdated();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Error closing shift');
        } finally {
            setLoading(false);
        }
    };

    const stats = sessionStats?.stats || propStats || {};
    const expectedCash = Number(stats.expected_cash || 0);
    const countedCash = parseFloat(actualCountedCash) || 0;
    const discrepancy = countedCash - expectedCash;

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#16161d] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#1c1c24]/70">
                    <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Wallet className="size-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Cash Register Shift & Drawer
                            </h3>
                            <p className="text-xs text-slate-400">
                                Cashier: {cashierName} • {isSessionOpen ? 'Shift In Progress' : 'No Active Shift'}
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
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600">
                            {error}
                        </div>
                    )}

                    {!isSessionOpen ? (
                        /* Open Shift Drawer Form */
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 flex items-center gap-3">
                                <Lock className="size-6 text-amber-600 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                                        Cash Drawer is Locked
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                        Open a new cashier shift with your initial cash float before taking orders.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Opening Cash Float (৳) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={openingFloat}
                                    onChange={(e) => setOpeningFloat(e.target.value)}
                                    placeholder="5000.00"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono font-bold text-base focus:outline-none focus:border-primary"
                                />
                                <span className="text-[10px] text-slate-400">
                                    Starting change in the physical cash drawer.
                                </span>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Shift Notes / Remarks
                                </label>
                                <input
                                    type="text"
                                    value={openNotes}
                                    onChange={(e) => setOpenNotes(e.target.value)}
                                    placeholder="e.g. Morning Shift - Front Desk POS Drawer"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenShift}
                                disabled={loading}
                                className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition cursor-pointer"
                            >
                                <Unlock className="size-4" />
                                <span>{loading ? 'Opening Shift…' : 'Start Shift & Unlock Register'}</span>
                            </button>
                        </div>
                    ) : (
                        /* Live Active Shift Reconciliation & Closing */
                        <div className="space-y-4">
                            {/* Live Sales Breakdown */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-200 dark:border-slate-800 space-y-2.5">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                        Shift Sales Reconciliation
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[10px]">
                                        LIVE SESSION
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700">
                                        <span className="text-[10px] text-slate-400 block">Opening Float</span>
                                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                                            ৳{Number(sessionStats?.session?.opening_balance || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700">
                                        <span className="text-[10px] text-slate-400 block">Cash Sales</span>
                                        <span className="font-mono font-bold text-sm text-emerald-600">
                                            ৳{Number(stats.cash_sales || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700">
                                        <span className="text-[10px] text-slate-400 block">Card Sales</span>
                                        <span className="font-mono font-bold text-sm text-blue-600">
                                            ৳{Number(stats.card_sales || 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700">
                                        <span className="text-[10px] text-slate-400 block">Room Folio Charges</span>
                                        <span className="font-mono font-bold text-sm text-indigo-600">
                                            ৳{Number(stats.room_charges || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-primary block">
                                            Expected Cash in Drawer
                                        </span>
                                        <span className="font-mono font-black text-lg text-slate-900 dark:text-white">
                                            ৳{expectedCash.toFixed(2)}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">
                                        Float + Cash Collected
                                    </span>
                                </div>
                            </div>

                            {/* Actual Physical Cash Count */}
                            <div className="p-4 rounded-2xl bg-white dark:bg-[#1a1a24] border border-slate-200 dark:border-slate-800 space-y-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Actual Counted Cash in Drawer (৳) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={actualCountedCash}
                                        onChange={(e) => setActualCountedCash(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono font-bold text-base focus:outline-none focus:border-primary"
                                    />
                                </div>

                                {/* Discrepancy (Over / Short) Display */}
                                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700">
                                    <span className="font-semibold text-slate-500">Drawer Discrepancy:</span>
                                    <span
                                        className={`font-mono font-black text-sm ${
                                            discrepancy === 0
                                                ? 'text-emerald-600'
                                                : discrepancy > 0
                                                ? 'text-blue-600'
                                                : 'text-rose-600'
                                        }`}
                                    >
                                        {discrepancy === 0
                                            ? '৳0.00 (Balanced)'
                                            : discrepancy > 0
                                            ? `+৳${discrepancy.toFixed(2)} (Cash Over)`
                                            : `-৳${Math.abs(discrepancy).toFixed(2)} (Cash Short)`}
                                    </span>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Closing Notes / Handover Reason
                                    </label>
                                    <input
                                        type="text"
                                        value={closeNotes}
                                        onChange={(e) => setCloseNotes(e.target.value)}
                                        placeholder="e.g. End of morning shift, handover to Evening Cashier"
                                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseShift}
                                disabled={loading}
                                className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                            >
                                <Lock className="size-4" />
                                <span>{loading ? 'Reconciling…' : 'Close Shift & Reconcile Z-Report'}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1c1c24]/50 flex items-center justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};
