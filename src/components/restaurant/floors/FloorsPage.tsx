import React, { useState, useEffect, useMemo } from 'react';
import {
    Layers,
    Plus,
    Search,
    Edit3,
    Trash2,
    RefreshCw,
    Map,
    Users
} from 'lucide-react';
import PageHeader from '../../common/PageHeader';
import { OutletSelector, type Outlet } from '../outlets/OutletSelector';
import { FloorModal, type FloorData } from './FloorModal';

export const FloorsPage: React.FC = () => {
    const [floors, setFloors] = useState<FloorData[]>([]);
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingFloor, setEditingFloor] = useState<FloorData | null>(null);

    const loadFloors = async () => {
        try {
            setLoading(true);
            const outletParam = selectedOutlet ? `?outletId=${selectedOutlet.id}` : '';
            const res = await fetch(`/api/restaurant/floors${outletParam}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setFloors(data.data);
            } else {
                setFloors([]);
            }
        } catch {
            setFloors([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFloors();
    }, [selectedOutlet]);

    const filteredFloors = useMemo(() => {
        return floors.filter(
            (f) =>
                f.name.toLowerCase().includes(search.toLowerCase()) ||
                (f.description && f.description.toLowerCase().includes(search.toLowerCase()))
        );
    }, [floors, search]);

    const handleDelete = async (floor: FloorData) => {
        if (!confirm(`Are you sure you want to delete floor "${floor.name}"? Note: Tables on this floor may also be affected.`)) return;
        try {
            const res = await fetch(`/api/restaurant/floors/${floor.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadFloors();
            } else {
                alert(data.error || 'Failed to delete floor');
            }
        } catch (err: any) {
            alert(err?.message || 'Error deleting floor');
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <PageHeader
                    title="Dining Floors & Areas"
                    subtitle="Manage multi-story dining layouts, banquet halls, open terraces, and VIP suites"
                />
                <div className="flex items-center gap-3">
                    <OutletSelector
                        selectedOutletId={selectedOutlet?.id}
                        onOutletChange={(outlet: Outlet) => setSelectedOutlet(outlet)}
                    />
                    <button
                        onClick={() => {
                            setEditingFloor(null);
                            setShowModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs flex items-center gap-2 hover:opacity-95 shadow-md shadow-primary/20 transition cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Add New Floor</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Total Dining Floors</span>
                        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Layers className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {floors.length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Levels in active outlet</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Allocated Tables</span>
                        <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <Map className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {floors.reduce((acc, f) => acc + Number(f.tables_count || 0), 0)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Placed on 2D floor plans</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Total Guest Capacity</span>
                        <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <Users className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {floors.reduce((acc, f) => acc + Number(f.total_capacity || 0), 0)} Seats
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Maximum concurrent diners</div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs">
                <div className="relative flex-1 max-w-md">
                    <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search floors by name or description…"
                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                </div>
                <button
                    onClick={loadFloors}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-500 cursor-pointer"
                    title="Refresh"
                >
                    <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Floors Grid */}
            {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading floors…</div>
            ) : filteredFloors.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white dark:bg-[#18181f] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <div className="size-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
                        <Layers className="size-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                        No dining floors found
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                        {search
                            ? `No floors matching "${search}".`
                            : 'Create dining floors like Main Dining Hall, Mezzanine or Rooftop to arrange tables.'}
                    </p>
                    <button
                        onClick={() => {
                            setEditingFloor(null);
                            setShowModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                        <Plus className="size-3.5" />
                        <span>Add First Floor</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFloors.map((floor) => (
                        <div
                            key={floor.id}
                            className="p-5 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
                        >
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold font-mono">
                                        L{floor.floor_number ?? 0}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingFloor(floor);
                                                setShowModal(true);
                                            }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                            title="Edit"
                                        >
                                            <Edit3 className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(floor)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                            title="Delete"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-primary transition">
                                        {floor.name}
                                    </h4>
                                    {floor.is_main && (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold">
                                            Main Floor
                                        </span>
                                    )}
                                </div>

                                {floor.description && (
                                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">
                                        {floor.description}
                                    </p>
                                )}
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                                    <Map className="size-3.5 text-primary" />
                                    {Number(floor.tables_count || 0)} Tables
                                </span>
                                <span className="flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white">
                                    <Users className="size-3.5 text-emerald-600" />
                                    {Number(floor.total_capacity || 0)} Seats
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Floor Modal */}
            <FloorModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                floor={editingFloor}
                activeOutletId={selectedOutlet?.id || 'outlet-main'}
                onSaved={loadFloors}
            />
        </div>
    );
};
