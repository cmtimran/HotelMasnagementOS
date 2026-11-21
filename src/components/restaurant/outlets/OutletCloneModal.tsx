import React, { useState } from 'react';
import { X, Copy } from 'lucide-react';
import type { Outlet } from './OutletSelector';

interface OutletCloneModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceOutlet: Outlet | null;
    propertyId?: string | number;
    onCloned: () => void;
}

export const OutletCloneModal: React.FC<OutletCloneModalProps> = ({
    isOpen,
    onClose,
    sourceOutlet,
    propertyId,
    onCloned
}) => {
    const [targetName, setTargetName] = useState('');
    const [targetCode, setTargetCode] = useState('');
    const [priceMarkupPercent, setPriceMarkupPercent] = useState<number>(10);
    const [copyTables, setCopyTables] = useState(false);
    const [cloning, setCloning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (sourceOutlet) {
            setTargetName(`${sourceOutlet.name} (Copy)`);
            setTargetCode(`${sourceOutlet.code}-COPY`);
            setPriceMarkupPercent(10);
            setCopyTables(false);
        }
        setError(null);
    }, [sourceOutlet, isOpen]);

    if (!isOpen || !sourceOutlet) return null;

    const handleClone = async (e: React.FormEvent) => {
        e.preventDefault();
        setCloning(true);
        setError(null);

        try {
            const res = await fetch(`/api/restaurant/outlets/${sourceOutlet.id}/clone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: propertyId ? String(propertyId) : undefined,
                    targetOutletName: targetName,
                    targetOutletCode: targetCode.toUpperCase().trim(),
                    priceMarkupPercent,
                    copyTables
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to clone outlet');
            }
            onCloned();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Error cloning outlet');
        } finally {
            setCloning(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <Copy size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Clone Restaurant Outlet
                            </h2>
                            <p className="text-xs text-slate-400">
                                Duplicate full menu, categories, addons & stations to a new outlet
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleClone} className="p-6 space-y-4 text-xs">
                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
                            {error}
                        </div>
                    )}

                    {/* Source summary banner */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Source Outlet</span>
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{sourceOutlet.name}</span>
                        </div>
                        <span className="px-2.5 py-1 bg-primary/10 text-primary font-mono text-[11px] rounded-lg font-bold">
                            {sourceOutlet.code}
                        </span>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                New Outlet Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={targetName}
                                onChange={(e) => setTargetName(e.target.value)}
                                placeholder="e.g. Poolside Bistro & Lounge"
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs font-medium"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                New Outlet Code <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={targetCode}
                                onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
                                placeholder="OUTLET-POOLSIDE"
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs uppercase font-mono font-bold"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Price Markup / Discount (%)
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    step="1"
                                    value={priceMarkupPercent}
                                    onChange={(e) => setPriceMarkupPercent(Number(e.target.value))}
                                    className="w-32 bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs font-bold"
                                />
                                <span className="text-slate-500 text-[11px]">
                                    {priceMarkupPercent > 0 
                                        ? `+${priceMarkupPercent}% higher prices (e.g. ৳500 -> ৳${500 * (1 + priceMarkupPercent/100)})` 
                                        : priceMarkupPercent < 0 
                                        ? `${priceMarkupPercent}% discount` 
                                        : 'Exact same prices as source outlet'}
                                </span>
                            </div>
                        </div>

                        <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800">
                            <input
                                type="checkbox"
                                checked={copyTables}
                                onChange={(e) => setCopyTables(e.target.checked)}
                                className="size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                            />
                            <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Clone Tables and Floor Plan</span>
                                <span className="text-[11px] text-slate-400">Copy table numbers, capacities and 2D canvas positions</span>
                            </div>
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={cloning}
                            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20 cursor-pointer transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {cloning ? 'Cloning Outlet...' : 'Clone Outlet Now'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OutletCloneModal;
