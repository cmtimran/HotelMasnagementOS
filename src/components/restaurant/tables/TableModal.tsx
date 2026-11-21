import React, { useState, useEffect } from 'react';
import { Plus, Edit3, X, Check, Star } from 'lucide-react';
import type { TableItem } from './FloorPlanVisualBuilder';

interface TableModalProps {
    isOpen: boolean;
    onClose: () => void;
    table?: TableItem | null;
    floors: { id: string; name: string }[];
    activeOutletId: string;
    activeFloorId?: string;
    onSaved: () => void;
}

export const TableModal: React.FC<TableModalProps> = ({
    isOpen,
    onClose,
    table,
    floors,
    activeOutletId,
    activeFloorId,
    onSaved
}) => {
    const [tableNumber, setTableNumber] = useState('1');
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [floorId, setFloorId] = useState('');
    const [capacity, setCapacity] = useState('4');
    const [isVip, setIsVip] = useState(false);
    const [status, setStatus] = useState('VACANT');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (table) {
            setTableNumber(String(table.table_number || 1));
            setCode(table.code || '');
            setName(table.name || '');
            setFloorId(table.floor_id || (floors[0]?.id || ''));
            setCapacity(String(table.capacity || 4));
            setIsVip(table.is_vip ?? false);
            setStatus(table.status || 'VACANT');
        } else {
            setTableNumber('');
            setCode('');
            setName('');
            setFloorId(activeFloorId || floors[0]?.id || '');
            setCapacity('4');
            setIsVip(false);
            setStatus('VACANT');
        }
        setError(null);
    }, [table, isOpen, floors, activeFloorId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const num = Number(tableNumber) || 1;
        const payload = {
            outletId: activeOutletId,
            floorId: floorId || null,
            tableNumber: num,
            code: code.trim().toUpperCase() || `T-${num}`,
            name: name.trim() || `Table ${num}`,
            capacity: Number(capacity) || 4,
            isVip,
            status
        };

        try {
            const url = table ? `/api/restaurant/tables/${table.id}` : '/api/restaurant/tables';
            const method = table ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save table');
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
                            {table ? <Edit3 className="size-4.5" /> : <Plus className="size-4.5" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                {table ? 'Edit Dining Table' : 'Add New Dining Table'}
                            </h2>
                            <p className="text-xs text-slate-400">
                                Configure table number, capacity, VIP classification and floor.
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

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Table Number <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    value={tableNumber}
                                    onChange={(e) => {
                                        setTableNumber(e.target.value);
                                        if (!code || code === `T-${tableNumber}`) {
                                            setCode(`T-${e.target.value}`);
                                        }
                                        if (!name || name === `Table ${tableNumber}`) {
                                            setName(`Table ${e.target.value}`);
                                        }
                                    }}
                                    placeholder="1"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Code / Identifier <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="T-01"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white uppercase font-mono focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Window Booth 1, Center Family Table..."
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Dining Floor / Section
                                </label>
                                <select
                                    value={floorId}
                                    onChange={(e) => setFloorId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                                >
                                    {floors.map((fl) => (
                                        <option key={fl.id} value={fl.id}>
                                            {fl.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Max Capacity (Seats)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={capacity}
                                    onChange={(e) => setCapacity(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Current Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer font-semibold"
                            >
                                <option value="VACANT">🟢 Available / Vacant</option>
                                <option value="OCCUPIED">🔴 Occupied (In-Service)</option>
                                <option value="RESERVED">🔵 Reserved for Guest</option>
                                <option value="CLEANING">🟡 Cleaning / Maintenance</option>
                            </select>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isVip}
                                    onChange={(e) => setIsVip(e.target.checked)}
                                    className="size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                                />
                                <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                    VIP Dining Table (Priority Service / Private Booth)
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
                                    <span>{table ? 'Update Table' : 'Save Table'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
