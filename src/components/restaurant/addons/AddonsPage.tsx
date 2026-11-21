import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Utensils,
    Layers,
    DollarSign,
    RefreshCw,
    TrendingUp
} from 'lucide-react';
import PageHeader from '../../common/PageHeader';
import { OutletSelector, type Outlet } from '../outlets/OutletSelector';
import { AddonModal, type AddonData } from './AddonModal';

export const AddonsPage: React.FC = () => {
    const [addons, setAddons] = useState<AddonData[]>([]);
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingAddon, setEditingAddon] = useState<AddonData | null>(null);

    const loadAddons = async () => {
        try {
            setLoading(true);
            const outletParam = selectedOutlet ? `?outletId=${selectedOutlet.id}` : '';
            const res = await fetch(`/api/restaurant/addons${outletParam}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setAddons(data.data);
            } else {
                setAddons([]);
            }
        } catch {
            setAddons([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAddons();
    }, [selectedOutlet]);

    const filteredAddons = useMemo(() => {
        return addons.filter(
            (a) =>
                a.name.toLowerCase().includes(search.toLowerCase()) ||
                (a.description && a.description.toLowerCase().includes(search.toLowerCase()))
        );
    }, [addons, search]);

    const handleDelete = async (addon: AddonData) => {
        if (!confirm(`Are you sure you want to delete add-on "${addon.name}"?`)) return;
        try {
            const res = await fetch(`/api/restaurant/addons/${addon.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadAddons();
            } else {
                alert(data.error || 'Failed to delete add-on');
            }
        } catch (err: any) {
            alert(err?.message || 'Error deleting add-on');
        }
    };

    const avgPrice = addons.length > 0 ? (addons.reduce((a, b) => a + Number(b.price || 0), 0) / addons.length).toFixed(2) : '0.00';

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <PageHeader
                    title="Menu Add-ons & Modifiers"
                    subtitle="Manage item extras, toppings, dips, and customization upgrades"
                />
                <div className="flex items-center gap-3">
                    <OutletSelector
                        selectedOutletId={selectedOutlet?.id}
                        onOutletChange={(outlet: Outlet) => setSelectedOutlet(outlet)}
                    />
                    <button
                        onClick={() => {
                            setEditingAddon(null);
                            setShowModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs flex items-center gap-2 hover:opacity-95 shadow-md shadow-primary/20 transition cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Add New Add-on</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Total Add-ons</span>
                        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Layers className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {addons.length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Available across menu items</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Average Add-on Price</span>
                        <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <DollarSign className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                        ৳{avgPrice}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Weighted average price</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Active Status</span>
                        <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <TrendingUp className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {addons.filter((a) => a.status === 'active').length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Ready for POS & Room Service</div>
                </div>
            </div>

            {/* Search & Actions Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs">
                <div className="relative flex-1 max-w-md">
                    <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search add-on modifiers by name or description…"
                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                </div>
                <button
                    onClick={loadAddons}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-500 cursor-pointer"
                    title="Refresh"
                >
                    <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Addons Grid */}
            {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading add-ons…</div>
            ) : filteredAddons.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white dark:bg-[#18181f] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <div className="size-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
                        <Utensils className="size-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                        No add-on modifiers found
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                        {search
                            ? `No add-ons matching "${search}".`
                            : 'Create add-ons like extra cheese, fried eggs, or drinks to upsell dishes.'}
                    </p>
                    <button
                        onClick={() => {
                            setEditingAddon(null);
                            setShowModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                        <Plus className="size-3.5" />
                        <span>Add First Add-on</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAddons.map((addon) => {
                        const margin =
                            Number(addon.price) > 0
                                ? (
                                      ((Number(addon.price) - Number(addon.cost_price || 0)) /
                                          Number(addon.price)) *
                                      100
                                  ).toFixed(0)
                                : '0';
                        return (
                            <div
                                key={addon.id}
                                className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="size-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                                            {addon.image_url ? (
                                                <img
                                                    src={addon.image_url}
                                                    alt={addon.name}
                                                    className="size-full object-cover group-hover:scale-105 transition duration-300"
                                                />
                                            ) : (
                                                <div className="size-full flex items-center justify-center text-slate-400">
                                                    <Utensils className="size-5" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditingAddon(addon);
                                                    setShowModal(true);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                                title="Edit"
                                            >
                                                <Edit3 className="size-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(addon)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                                title="Delete"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-primary transition">
                                        {addon.name}
                                    </h4>
                                    {addon.description && (
                                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                                            {addon.description}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                    <div>
                                        <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                                            ৳{Number(addon.price || 0).toFixed(2)}
                                        </span>
                                        {Number(addon.cost_price || 0) > 0 && (
                                            <span className="block text-[10px] text-slate-400 font-mono">
                                                Cost: ৳{Number(addon.cost_price).toFixed(2)} ({margin}% margin)
                                            </span>
                                        )}
                                    </div>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                            addon.status === 'active'
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                        }`}
                                    >
                                        {addon.status}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit Addon Modal */}
            <AddonModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                addon={editingAddon}
                activeOutletId={selectedOutlet?.id || 'outlet-main'}
                onSaved={loadAddons}
            />
        </div>
    );
};
