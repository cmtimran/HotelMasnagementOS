import React, { useState, useEffect } from 'react';
import { Edit3, X, Check, Layers } from 'lucide-react';

export interface FloorData {
    id: string;
    outlet_id: string;
    name: string;
    floor_number: number;
    description?: string;
    is_main: boolean;
    status: string;
    tables_count?: number;
    total_capacity?: number;
}

interface FloorModalProps {
    isOpen: boolean;
    onClose: () => void;
    floor?: FloorData | null;
    activeOutletId: string;
    onSaved: () => void;
}

export const FloorModal: React.FC<FloorModalProps> = ({
    isOpen,
    onClose,
    floor,
    activeOutletId,
    onSaved
}) => {
    const [name, setName] = useState('');
    const [floorNumber, setFloorNumber] = useState('0');
    const [description, setDescription] = useState('');
    const [isMain, setIsMain] = useState(false);
    const [status, setStatus] = useState('active');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (floor) {
            setName(floor.name || '');
            setFloorNumber(String(floor.floor_number ?? 0));
            setDescription(floor.description || '');
            setIsMain(floor.is_main ?? false);
            setStatus(floor.status || 'active');
        } else {
            setName('');
            setFloorNumber('0');
            setDescription('');
            setIsMain(false);
            setStatus('active');
        }
        setError(null);
    }, [floor, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const payload = {
            outletId: activeOutletId,
            name: name.trim(),
            floorNumber: Number(floorNumber) || 0,
            description: description.trim(),
            isMain,
            status
        };

        try {
            const url = floor ? `/api/restaurant/floors/${floor.id}` : '/api/restaurant/floors';
            const method = floor ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save floor');
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
                className="w-full max-w-md bg-white dark:bg-[#18181f] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden my-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center text-base">
                            {floor ? <Edit3 className="size-4.5" /> : <Layers className="size-4.5" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                {floor ? 'Edit Dining Floor' : 'Create New Floor / Area'}
                            </h2>
                            <p className="text-xs text-slate-400">
                                Configure dining halls, terraces, rooftops or private sections.
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

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Floor / Area Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Ground Floor Main Hall, Mezzanine VIP Terrace..."
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Floor Level / Number
                                </label>
                                <input
                                    type="number"
                                    value={floorNumber}
                                    onChange={(e) => setFloorNumber(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary font-mono"
                                />
                                <span className="text-[10px] text-slate-400">0 = Ground, 18 = 18th floor</span>
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
                                    <option value="active">Active (Available)</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Description
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Central dining area adjacent to buffet counter..."
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                            />
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isMain}
                                    onChange={(e) => setIsMain(e.target.checked)}
                                    className="size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                                />
                                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                    Primary / Main Floor (Default view for Cashiers and Guests)
                                </span>
                            </label>
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
                                    <span>{floor ? 'Update Floor' : 'Save Floor'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
