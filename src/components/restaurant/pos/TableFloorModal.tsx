import React, { useState, useMemo } from 'react';
import type { DiningTableData } from './pos.types';
import {
    X,
    LayoutGrid,
    Users,
    Star
} from 'lucide-react';

interface TableFloorModalProps {
    isOpen: boolean;
    tables: DiningTableData[];
    selectedTableId: string;
    onSelectTable: (tableId: string) => void;
    onClose: () => void;
}

export const TableFloorModal: React.FC<TableFloorModalProps> = ({
    isOpen,
    tables,
    selectedTableId,
    onSelectTable,
    onClose
}) => {
    const [activeFloor, setActiveFloor] = useState<string>('All');

    const floors = useMemo(() => {
        const list = new Set<string>(['All']);
        tables.forEach((t) => {
            if (t.floor) list.add(t.floor);
        });
        return Array.from(list);
    }, [tables]);

    const filteredTables = useMemo(() => {
        if (activeFloor === 'All') return tables;
        return tables.filter((t) => t.floor === activeFloor);
    }, [tables, activeFloor]);

    const stats = useMemo(() => {
        let available = 0;
        let occupied = 0;
        let reserved = 0;

        tables.forEach((t) => {
            const st = (t.status || '').toUpperCase();
            if (st === 'OCCUPIED') occupied++;
            else if (st === 'RESERVED') reserved++;
            else available++;
        });

        return { available, occupied, reserved, total: tables.length };
    }, [tables]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#16161d] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#1c1c24]/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <LayoutGrid className="size-5 text-primary" />
                            <span>Select Dining Table</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Pick an open dining table for dine-in guest service.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Status Bar & Floor Switcher */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/30 dark:bg-slate-900/20">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                        {floors.map((fl) => (
                            <button
                                key={fl}
                                onClick={() => setActiveFloor(fl)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                    activeFloor === fl
                                        ? 'bg-primary text-white shadow-xs'
                                        : 'bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {fl}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="flex items-center gap-1 text-emerald-600">
                            <span className="size-2 rounded-full bg-emerald-500"></span>
                            {stats.available} Available
                        </span>
                        <span className="flex items-center gap-1 text-rose-600">
                            <span className="size-2 rounded-full bg-rose-500"></span>
                            {stats.occupied} Occupied
                        </span>
                        <span className="flex items-center gap-1 text-blue-600">
                            <span className="size-2 rounded-full bg-blue-500"></span>
                            {stats.reserved} Reserved
                        </span>
                    </div>
                </div>

                {/* Tables Grid */}
                <div className="p-5 overflow-y-auto max-h-[60vh] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredTables.map((t) => {
                        const isSelected = selectedTableId === t.id;
                        const st = (t.status || '').toUpperCase();
                        const isOccupied = st === 'OCCUPIED';
                        const isReserved = st === 'RESERVED';

                        let statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        if (isOccupied) statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                        else if (isReserved) statusBadge = 'bg-blue-50 text-blue-700 border-blue-200';

                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                    onSelectTable(t.id);
                                    onClose();
                                }}
                                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer h-28 relative ${
                                    isSelected
                                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md'
                                        : isOccupied
                                        ? 'border-rose-200/80 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 hover:border-rose-300'
                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1a24] hover:border-primary/50 hover:shadow-xs'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-1">
                                        <span className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">
                                            {t.code || `T-${t.number}`}
                                        </span>
                                        {t.isVip && (
                                            <Star className="size-3 fill-amber-500 text-amber-500" />
                                        )}
                                    </div>
                                    <span
                                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${statusBadge}`}
                                    >
                                        {isOccupied ? 'Occupied' : isReserved ? 'Reserved' : 'Vacant'}
                                    </span>
                                </div>

                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                    {t.name || `Table ${t.number}`}
                                </span>

                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                    <span className="flex items-center gap-1">
                                        <Users className="size-3" />
                                        {t.capacity}p
                                    </span>
                                    <span>{t.floor}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#1c1c24]/50 flex items-center justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
