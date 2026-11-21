import React, { useState, useEffect } from 'react';
import { Edit3, X, Check, ChefHat, Printer, CheckSquare, Square } from 'lucide-react';
import type { CategoryData } from '../categories/CategoryModal';

export interface KitchenStationData {
    id: string;
    outlet_id: string;
    name: string;
    code: string;
    description?: string;
    printer_ip?: string;
    category_routing?: string[];
    status: string;
}

interface KitchenStationModalProps {
    isOpen: boolean;
    onClose: () => void;
    station?: KitchenStationData | null;
    categories: CategoryData[];
    activeOutletId: string;
    onSaved: () => void;
}

export const KitchenStationModal: React.FC<KitchenStationModalProps> = ({
    isOpen,
    onClose,
    station,
    categories,
    activeOutletId,
    onSaved
}) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [printerIp, setPrinterIp] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [status, setStatus] = useState('active');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (station) {
            setName(station.name || '');
            setCode(station.code || '');
            setDescription(station.description || '');
            setPrinterIp(station.printer_ip || '');
            setSelectedCategories(Array.isArray(station.category_routing) ? station.category_routing : []);
            setStatus(station.status || 'active');
        } else {
            setName('');
            setCode('');
            setDescription('');
            setPrinterIp('192.168.1.101');
            setSelectedCategories([]);
            setStatus('active');
        }
        setError(null);
    }, [station, isOpen]);

    if (!isOpen) return null;

    const toggleCategory = (catId: string) => {
        if (selectedCategories.includes(catId)) {
            setSelectedCategories(selectedCategories.filter((id) => id !== catId));
        } else {
            setSelectedCategories([...selectedCategories, catId]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const payload = {
            outletId: activeOutletId,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim(),
            printerIp: printerIp.trim(),
            categoryRouting: selectedCategories,
            status
        };

        try {
            const url = station ? `/api/restaurant/kitchens/${station.id}` : '/api/restaurant/kitchens';
            const method = station ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save kitchen station');
            }
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Error occurred');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-white dark:bg-[#18181f] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden my-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center text-base">
                            {station ? <Edit3 className="size-4.5" /> : <ChefHat className="size-4.5" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                {station ? 'Edit Kitchen Station' : 'Create Kitchen Prep Station'}
                            </h2>
                            <p className="text-xs text-slate-400">
                                Configure dedicated prep counter, KOT network printer IP, and category dispatch.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white size-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                        {error && (
                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Station Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (!code || code === name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')) {
                                            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]+/g, '_'));
                                        }
                                    }}
                                    placeholder="e.g. Hot Grill & Tandoori"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Station Code / Tag <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="GRILL_HOT"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white uppercase font-mono focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Thermal KOT Printer IP Address
                            </label>
                            <div className="relative">
                                <Printer className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={printerIp}
                                    onChange={(e) => setPrinterIp(e.target.value)}
                                    placeholder="192.168.1.101"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-primary"
                                />
                            </div>
                            <span className="text-[10px] text-slate-400">Network ESC/POS kitchen thermal slip printer</span>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Description
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Charcoal kebabs, biryanis, sizzlers, naan..."
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                            />
                        </div>

                        {/* Category Routing Dispatch */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Auto KOT Category Routing
                            </label>
                            <p className="text-[11px] text-slate-400 mb-2">
                                Orders containing items from checked categories will automatically print tickets to this station's KOT printer and appear on this KDS screen.
                            </p>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-[#202028] rounded-2xl border border-slate-200 dark:border-slate-700">
                                {categories.map((cat) => {
                                    const isChecked = selectedCategories.includes(cat.id);
                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => toggleCategory(cat.id)}
                                            className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs ${
                                                isChecked
                                                    ? 'bg-primary/10 border-primary text-primary font-bold'
                                                    : 'bg-white dark:bg-[#18181f] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <span className="truncate">{cat.name}</span>
                                            {isChecked ? (
                                                <CheckSquare className="size-3.5 shrink-0 text-primary" />
                                            ) : (
                                                <Square className="size-3.5 shrink-0 text-slate-400" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                            >
                                <option value="active">Active (Online)</option>
                                <option value="inactive">Inactive (Temporarily Offline)</option>
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:opacity-90 transition flex items-center gap-2 cursor-pointer shadow-sm shadow-primary/30"
                        >
                            {saving ? (
                                <span>Saving…</span>
                            ) : (
                                <>
                                    <Check className="size-4" />
                                    <span>{station ? 'Update Station' : 'Save Station'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
