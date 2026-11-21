import React, { useState, useEffect, useMemo } from 'react';
import {
    Layers,
    Plus,
    Search,
    LayoutGrid,
    List,
    Edit3,
    Trash2,
    FolderPlus,
    FolderTree,
    UtensilsCrossed,
    RefreshCw
} from 'lucide-react';
import PageHeader from '../../common/PageHeader';
import { OutletSelector, type Outlet } from '../outlets/OutletSelector';
import { CategoryModal, type CategoryData, getCategoryIcon } from './CategoryModal';

export const CategoriesPage: React.FC = () => {
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterView, setFilterView] = useState<'all' | 'main' | 'sub'>('all');
    const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const outletParam = selectedOutlet ? `?outletId=${selectedOutlet.id}` : '';
            const res = await fetch(`/api/restaurant/categories${outletParam}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setCategories(data.data);
            } else {
                setCategories([]);
            }
        } catch {
            setCategories([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, [selectedOutlet]);

    const mainCategories = useMemo(
        () => categories.filter((c) => !c.parent_id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        [categories]
    );

    const subCategories = useMemo(
        () => categories.filter((c) => !!c.parent_id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        [categories]
    );

    const filteredCategories = useMemo(() => {
        return categories.filter((c) => {
            const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
            if (!matchesSearch) return false;
            if (filterView === 'main') return !c.parent_id;
            if (filterView === 'sub') return !!c.parent_id;
            return true;
        });
    }, [categories, search, filterView]);

    const handleDelete = async (cat: CategoryData) => {
        if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
        try {
            const res = await fetch(`/api/restaurant/categories/${cat.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadCategories();
            } else {
                alert(data.error || 'Failed to delete category');
            }
        } catch (err: any) {
            alert(err?.message || 'Error deleting category');
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Bar with Outlet Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <PageHeader
                    title="Menu Categories"
                    subtitle="Organize dishes and beverages into departments, groups, and subcategories"
                />
                <div className="flex items-center gap-3">
                    <OutletSelector
                        selectedOutletId={selectedOutlet?.id}
                        onOutletChange={(outlet: Outlet) => setSelectedOutlet(outlet)}
                    />
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setShowModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs flex items-center gap-2 hover:opacity-95 shadow-md shadow-primary/20 transition cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Add Category</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Total Categories</span>
                        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Layers className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {categories.length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Across this outlet</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Main Categories</span>
                        <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <FolderPlus className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {mainCategories.length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Root departments</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Sub-Categories</span>
                        <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <FolderTree className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {subCategories.length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Nested groups</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Active Dishes</span>
                        <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <UtensilsCrossed className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {categories.reduce((acc, c) => acc + Number(c.items_count || 0), 0)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Linked menu items</div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
                <div className="relative flex-1 max-w-md">
                    <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search categories by name…"
                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {/* Filter Type Pills */}
                    <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center gap-1 text-xs font-semibold">
                        <button
                            onClick={() => setFilterView('all')}
                            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                                filterView === 'all'
                                    ? 'bg-white dark:bg-[#18181f] text-slate-900 dark:text-white shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            All ({categories.length})
                        </button>
                        <button
                            onClick={() => setFilterView('main')}
                            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                                filterView === 'main'
                                    ? 'bg-white dark:bg-[#18181f] text-slate-900 dark:text-white shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Main ({mainCategories.length})
                        </button>
                        <button
                            onClick={() => setFilterView('sub')}
                            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                                filterView === 'sub'
                                    ? 'bg-white dark:bg-[#18181f] text-slate-900 dark:text-white shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Sub ({subCategories.length})
                        </button>
                    </div>

                    {/* Grid vs Table Mode */}
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
                        onClick={loadCategories}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-500 cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Content Display */}
            {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading categories…</div>
            ) : filteredCategories.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white dark:bg-[#18181f] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <div className="size-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
                        <Layers className="size-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                        No categories found
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                        {search
                            ? `No categories matching "${search}".`
                            : 'Create your first menu category to start adding dishes and drinks.'}
                    </p>
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setShowModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                        <Plus className="size-3.5" />
                        <span>Add Category</span>
                    </button>
                </div>
            ) : layoutMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredCategories.map((cat) => {
                        const iconData = getCategoryIcon(cat.icon);
                        return (
                            <div
                                key={cat.id}
                                className="p-5 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition group flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between mb-3">
                                        <div
                                            className={`size-12 rounded-2xl flex items-center justify-center text-2xl ${iconData.bgLight} ${iconData.bgDark}`}
                                        >
                                            {iconData.emoji}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditingCategory(cat);
                                                    setShowModal(true);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                                title="Edit Category"
                                            >
                                                <Edit3 className="size-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cat)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                                title="Delete Category"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-primary transition">
                                        {cat.name}
                                    </h4>

                                    {cat.parent_id ? (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-medium mb-3">
                                            <span>Sub of: {cat.parent?.name || 'Main Category'}</span>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium mb-3">
                                            <span>📁 Main Department</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                                    <span>{Number(cat.items_count || 0)} Dishes</span>
                                    <span className="font-mono text-[10px]">Order: #{cat.sort_order ?? 0}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Table View */
                <div className="rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50/75 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="p-3.5 pl-4">Category</th>
                                <th className="p-3.5">Hierarchy</th>
                                <th className="p-3.5 text-center">Items</th>
                                <th className="p-3.5 text-center">Order</th>
                                <th className="p-3.5 text-center">Status</th>
                                <th className="p-3.5 pr-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filteredCategories.map((cat) => {
                                const iconData = getCategoryIcon(cat.icon);
                                return (
                                    <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                        <td className="p-3.5 pl-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`size-8 rounded-xl flex items-center justify-center text-lg ${iconData.bgLight} ${iconData.bgDark}`}
                                                >
                                                    {iconData.emoji}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                        {cat.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {cat.id}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3.5">
                                            {cat.parent_id ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-medium">
                                                    🌿 Subcategory ({cat.parent?.name})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium">
                                                    📁 Main Category
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                                            {Number(cat.items_count || 0)}
                                        </td>
                                        <td className="p-3.5 text-center font-mono text-slate-500">
                                            #{cat.sort_order ?? 0}
                                        </td>
                                        <td className="p-3.5 text-center">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    cat.status === 'active'
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                                }`}
                                            >
                                                {cat.status}
                                            </span>
                                        </td>
                                        <td className="p-3.5 pr-4 text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingCategory(cat);
                                                        setShowModal(true);
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                                    title="Edit"
                                                >
                                                    <Edit3 className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add / Edit Category Modal */}
            <CategoryModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                category={editingCategory}
                mainCategories={mainCategories}
                activeOutletId={selectedOutlet?.id || 'outlet-main'}
                onSaved={loadCategories}
            />
        </div>
    );
};
