import React, { useState, useEffect, useMemo } from 'react';
import {
    UtensilsCrossed,
    Plus,
    Search,
    LayoutGrid,
    List,
    Edit3,
    Trash2,
    Star,
    Clock,
    RefreshCw,
    CheckCircle2,
    Tag
} from 'lucide-react';
import PageHeader from '../../common/PageHeader';
import { OutletSelector, type Outlet } from '../outlets/OutletSelector';
import { MenuItemModal, type MenuItemData } from './MenuItemModal';
import type { CategoryData } from '../categories/CategoryModal';
import type { AddonData } from '../addons/AddonModal';

export const MenuItemsPage: React.FC = () => {
    const [items, setItems] = useState<MenuItemData[]>([]);
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [addons, setAddons] = useState<AddonData[]>([]);
    const [kitchenStations, setKitchenStations] = useState<{ id: string; name: string; code: string }[]>([]);
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE' | 'FEATURED'>('ALL');
    const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const outletParam = selectedOutlet ? `?outletId=${selectedOutlet.id}` : '';
            const [itemsRes, catsRes, addonsRes, kitchensRes] = await Promise.all([
                fetch(`/api/restaurant/items${outletParam}`),
                fetch(`/api/restaurant/categories${outletParam}`),
                fetch(`/api/restaurant/addons${outletParam}`),
                fetch(`/api/restaurant/kitchens${outletParam}`).catch(() => null)
            ]);

            const itemsData = await itemsRes.json();
            const catsData = await catsRes.json();
            const addonsData = await addonsRes.json();
            const kitchensData = kitchensRes ? await kitchensRes.json() : null;

            if (itemsData.success && Array.isArray(itemsData.data)) {
                setItems(itemsData.data);
            } else {
                setItems([]);
            }

            if (catsData.success && Array.isArray(catsData.data)) {
                setCategories(catsData.data);
            }

            if (addonsData.success && Array.isArray(addonsData.data)) {
                setAddons(addonsData.data);
            }

            if (kitchensData?.success && Array.isArray(kitchensData.data)) {
                setKitchenStations(kitchensData.data);
            }
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedOutlet]);

    const filteredItems = useMemo(() => {
        return items.filter((it) => {
            const matchesSearch =
                it.name.toLowerCase().includes(search.toLowerCase()) ||
                (it.description && it.description.toLowerCase().includes(search.toLowerCase())) ||
                (it.product_code && it.product_code.toLowerCase().includes(search.toLowerCase()));
            if (!matchesSearch) return false;

            if (categoryFilter !== 'ALL' && it.category_id !== categoryFilter) return false;

            if (statusFilter === 'AVAILABLE' && !it.is_available) return false;
            if (statusFilter === 'UNAVAILABLE' && it.is_available) return false;
            if (statusFilter === 'FEATURED' && !it.is_featured) return false;

            return true;
        });
    }, [items, search, categoryFilter, statusFilter]);

    const handleToggleAvailability = async (item: MenuItemData) => {
        const newStatus = !item.is_available;
        try {
            const res = await fetch(`/api/restaurant/items/${item.id}/availability`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAvailable: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                setItems(items.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i)));
            }
        } catch (err: any) {
            alert('Failed to update availability');
        }
    };

    const handleDelete = async (item: MenuItemData) => {
        if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
        try {
            const res = await fetch(`/api/restaurant/items/${item.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadData();
            } else {
                alert(data.error || 'Failed to delete dish');
            }
        } catch (err: any) {
            alert(err?.message || 'Error deleting dish');
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <PageHeader
                    title="Menu Dishes & Pricing"
                    subtitle="Manage dishes, portion variations, addons, allergens, and kitchen stations"
                />
                <div className="flex items-center gap-3">
                    <OutletSelector
                        selectedOutletId={selectedOutlet?.id}
                        onOutletChange={(outlet: Outlet) => setSelectedOutlet(outlet)}
                    />
                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setShowModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs flex items-center gap-2 hover:opacity-95 shadow-md shadow-primary/20 transition cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Add New Dish</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Total Menu Items</span>
                        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <UtensilsCrossed className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {items.length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Dishes in outlet</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Active Available</span>
                        <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {items.filter((i) => i.is_available).length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Ready for guest orders</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Chef Specials</span>
                        <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <Star className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {items.filter((i) => i.is_featured).length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Highlighted on menu</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Linked Add-ons</span>
                        <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <Tag className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {addons.length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Customization options</div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search dishes or code…"
                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                        />
                    </div>

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer font-medium"
                    >
                        <option value="ALL">All Categories ({categories.length})</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer font-medium"
                    >
                        <option value="ALL">All Status</option>
                        <option value="AVAILABLE">Active Available Only</option>
                        <option value="UNAVAILABLE">Unavailable / 86'd</option>
                        <option value="FEATURED">⭐ Chef's Specials Only</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center gap-1">
                        <button
                            onClick={() => setLayoutMode('grid')}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                                layoutMode === 'grid'
                                    ? 'bg-white dark:bg-[#18181f] text-primary shadow-2xs'
                                    : 'text-slate-400 hover:text-slate-700'
                            }`}
                            title="Grid View"
                        >
                            <LayoutGrid className="size-4" />
                        </button>
                        <button
                            onClick={() => setLayoutMode('table')}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                                layoutMode === 'table'
                                    ? 'bg-white dark:bg-[#18181f] text-primary shadow-2xs'
                                    : 'text-slate-400 hover:text-slate-700'
                            }`}
                            title="Table View"
                        >
                            <List className="size-4" />
                        </button>
                    </div>

                    <button
                        onClick={loadData}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-500 cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Dishes Content */}
            {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading menu dishes…</div>
            ) : filteredItems.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white dark:bg-[#18181f] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <div className="size-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
                        <UtensilsCrossed className="size-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                        No menu items found
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                        {search
                            ? `No dishes matching "${search}".`
                            : 'Add your first menu item or culinary specialty to this outlet.'}
                    </p>
                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setShowModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                        <Plus className="size-3.5" />
                        <span>Add First Dish</span>
                    </button>
                </div>
            ) : layoutMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map((item) => (
                        <div
                            key={item.id}
                            className="rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition overflow-hidden flex flex-col justify-between group"
                        >
                            <div>
                                {/* Dish Image Header */}
                                <div className="h-36 relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="size-full object-cover group-hover:scale-105 transition duration-500"
                                        />
                                    ) : (
                                        <div className="size-full flex items-center justify-center text-slate-400">
                                            <UtensilsCrossed className="size-8" />
                                        </div>
                                    )}

                                    {/* Badges on image */}
                                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                        {item.is_featured && (
                                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] shadow-sm flex items-center gap-1">
                                                <Star className="size-3 fill-white" />
                                                Chef Special
                                            </span>
                                        )}
                                        {item.product_code && (
                                            <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white font-mono text-[10px]">
                                                {item.product_code}
                                            </span>
                                        )}
                                    </div>

                                    {/* Availability Switch */}
                                    <button
                                        onClick={() => handleToggleAvailability(item)}
                                        className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md transition cursor-pointer backdrop-blur-xs ${
                                            item.is_available
                                                ? 'bg-emerald-500/90 text-white hover:bg-emerald-600'
                                                : 'bg-rose-500/90 text-white hover:bg-rose-600'
                                        }`}
                                    >
                                        {item.is_available ? 'Available' : 'Unavailable (86)'}
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-primary transition line-clamp-1">
                                            {item.name}
                                        </h4>
                                    </div>

                                    {item.description && (
                                        <p className="text-xs text-slate-400 line-clamp-2">
                                            {item.description}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                                            📁 {item.category?.name || 'Dish'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-1">
                                            <Clock className="size-2.5" />
                                            {item.prep_time_estimate || 15}m
                                        </span>
                                        {item.variations && item.variations.length > 0 && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-medium">
                                                {item.variations.length} Sizes
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-slate-400 block text-[10px]">Price</span>
                                    <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                                        ৳{Number(item.price || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            setEditingItem(item);
                                            setShowModal(true);
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                        title="Edit"
                                    >
                                        <Edit3 className="size-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                        title="Delete"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div className="rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="p-3.5 pl-4">Dish</th>
                                <th className="p-3.5">Category</th>
                                <th className="p-3.5">Prep Station</th>
                                <th className="p-3.5 text-right">Price</th>
                                <th className="p-3.5 text-center">Availability</th>
                                <th className="p-3.5 pr-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                    <td className="p-3.5 pl-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt="" className="size-full object-cover" />
                                                ) : (
                                                    <div className="size-full flex items-center justify-center text-slate-400">
                                                        <UtensilsCrossed className="size-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                        {item.name}
                                                    </span>
                                                    {item.is_featured && (
                                                        <Star className="size-3 fill-amber-500 text-amber-500" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {item.product_code || item.id}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                                        {item.category?.name || 'Dish'}
                                    </td>
                                    <td className="p-3.5 font-mono text-[11px] text-slate-500">
                                        {item.prep_station || 'GRILL_HOT'} ({item.prep_time_estimate || 15}m)
                                    </td>
                                    <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white font-mono text-sm">
                                        ৳{Number(item.price || 0).toFixed(2)}
                                    </td>
                                    <td className="p-3.5 text-center">
                                        <button
                                            onClick={() => handleToggleAvailability(item)}
                                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                                                item.is_available
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
                                                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100'
                                            }`}
                                        >
                                            {item.is_available ? 'Available' : 'Unavailable (86)'}
                                        </button>
                                    </td>
                                    <td className="p-3.5 pr-4 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditingItem(item);
                                                    setShowModal(true);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                                title="Edit"
                                            >
                                                <Edit3 className="size-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                                title="Delete"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Dish Modal */}
            <MenuItemModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                item={editingItem}
                categories={categories}
                availableAddons={addons}
                kitchenStations={kitchenStations}
                activeOutletId={selectedOutlet?.id || 'outlet-main'}
                onSaved={loadData}
            />
        </div>
    );
};
