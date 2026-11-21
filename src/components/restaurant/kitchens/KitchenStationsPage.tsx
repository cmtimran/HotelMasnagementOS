import React, { useState, useEffect, useMemo } from 'react';
import {
    ChefHat,
    Plus,
    Search,
    Edit3,
    Trash2,
    RefreshCw,
    Printer,
    CheckCircle2
} from 'lucide-react';
import PageHeader from '../../common/PageHeader';
import { OutletSelector, type Outlet } from '../outlets/OutletSelector';
import { KitchenStationModal, type KitchenStationData } from './KitchenStationModal';
import type { CategoryData } from '../categories/CategoryModal';

export const KitchenStationsPage: React.FC = () => {
    const [stations, setStations] = useState<KitchenStationData[]>([]);
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingStation, setEditingStation] = useState<KitchenStationData | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const outletParam = selectedOutlet ? `?outletId=${selectedOutlet.id}` : '';
            const [stRes, catRes] = await Promise.all([
                fetch(`/api/restaurant/kitchens${outletParam}`),
                fetch(`/api/restaurant/categories${outletParam}`)
            ]);

            const stData = await stRes.json();
            const catData = await catRes.json();

            if (stData.success && Array.isArray(stData.data)) {
                setStations(stData.data);
            } else {
                setStations([]);
            }

            if (catData.success && Array.isArray(catData.data)) {
                setCategories(catData.data);
            }
        } catch {
            setStations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedOutlet]);

    const filteredStations = useMemo(() => {
        return stations.filter(
            (s) =>
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.code.toLowerCase().includes(search.toLowerCase())
        );
    }, [stations, search]);

    const handleDelete = async (station: KitchenStationData) => {
        if (!confirm(`Are you sure you want to delete kitchen station "${station.name}"?`)) return;
        try {
            const res = await fetch(`/api/restaurant/kitchens/${station.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadData();
            } else {
                alert(data.error || 'Failed to delete station');
            }
        } catch (err: any) {
            alert(err?.message || 'Error deleting station');
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <PageHeader
                    title="Kitchen Prep Stations & Routing"
                    subtitle="Manage production counters, thermal KOT printers, and automated food order dispatch"
                />
                <div className="flex items-center gap-3">
                    <OutletSelector
                        selectedOutletId={selectedOutlet?.id}
                        onOutletChange={(outlet: Outlet) => setSelectedOutlet(outlet)}
                    />
                    <button
                        onClick={() => {
                            setEditingStation(null);
                            setShowModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs flex items-center gap-2 hover:opacity-95 shadow-md shadow-primary/20 transition cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Add Kitchen Station</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Active Prep Counters</span>
                        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <ChefHat className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {stations.length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Dispatched kitchen stations</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">KOT Printers Linked</span>
                        <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <Printer className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {stations.filter((s) => s.printer_ip).length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Network slip printers</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Online Status</span>
                        <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <CheckCircle2 className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {stations.filter((s) => s.status === 'active').length} Active
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Ready for live order prep</div>
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
                        placeholder="Search kitchen stations by name or code…"
                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                </div>
                <button
                    onClick={loadData}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-500 cursor-pointer"
                    title="Refresh"
                >
                    <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stations Grid */}
            {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading kitchen stations…</div>
            ) : filteredStations.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white dark:bg-[#18181f] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <div className="size-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
                        <ChefHat className="size-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                        No kitchen stations found
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                        {search
                            ? `No stations matching "${search}".`
                            : 'Set up kitchen stations like Grill, Curry, Bar, or Salad prep to route KOT tickets.'}
                    </p>
                    <button
                        onClick={() => {
                            setEditingStation(null);
                            setShowModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                        <Plus className="size-3.5" />
                        <span>Add First Station</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStations.map((station) => (
                        <div
                            key={station.id}
                            className="p-5 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
                        >
                            <div>
                                <div className="flex items-start justify-between mb-3">
                                    <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                                        🍳
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingStation(station);
                                                setShowModal(true);
                                            }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                            title="Edit"
                                        >
                                            <Edit3 className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(station)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                            title="Delete"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-primary transition">
                                        {station.name}
                                    </h4>
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                                        {station.code}
                                    </span>
                                </div>

                                {station.description && (
                                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                                        {station.description}
                                    </p>
                                )}

                                <div className="space-y-1.5 py-2">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Printer className="size-3.5 text-slate-400" />
                                        <span className="font-mono font-medium text-[11px]">
                                            {station.printer_ip ? `IP: ${station.printer_ip}` : 'No printer attached'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                                <span className="text-[11px] text-slate-400">
                                    {Array.isArray(station.category_routing) && station.category_routing.length > 0
                                        ? `${station.category_routing.length} Categories Routed`
                                        : 'Global Station'}
                                </span>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        station.status === 'active'
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                    }`}
                                >
                                    {station.status === 'active' ? 'Active' : 'Offline'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Station Modal */}
            <KitchenStationModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                station={editingStation}
                categories={categories}
                activeOutletId={selectedOutlet?.id || 'outlet-main'}
                onSaved={loadData}
            />
        </div>
    );
};
