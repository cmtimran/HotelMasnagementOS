import React, { useState, useEffect } from 'react';
import { Layers, Edit3, X, Check } from 'lucide-react';

export const CATEGORY_ICON_MAP: Record<string, { emoji: string; label: string; bgLight: string; bgDark: string; textLight: string; textDark: string }> = {
    Utensils: { emoji: '🍴', label: 'Utensils', bgLight: 'bg-purple-100', bgDark: 'dark:bg-purple-900/30', textLight: 'text-primary', textDark: 'dark:text-purple-300' },
    Rice: { emoji: '🍚', label: 'Biryani & Rice', bgLight: 'bg-amber-100', bgDark: 'dark:bg-amber-900/30', textLight: 'text-amber-700', textDark: 'dark:text-amber-300' },
    Beef: { emoji: '🥩', label: 'Meat & Grill', bgLight: 'bg-rose-100', bgDark: 'dark:bg-rose-900/30', textLight: 'text-rose-700', textDark: 'dark:text-rose-300' },
    Soup: { emoji: '🍲', label: 'Curry & Soup', bgLight: 'bg-orange-100', bgDark: 'dark:bg-orange-900/30', textLight: 'text-orange-700', textDark: 'dark:text-orange-300' },
    Pizza: { emoji: '🍕', label: 'Pizza & Breads', bgLight: 'bg-yellow-100', bgDark: 'dark:bg-yellow-900/30', textLight: 'text-yellow-700', textDark: 'dark:text-yellow-300' },
    Burger: { emoji: '🍔', label: 'Burgers & Fast Food', bgLight: 'bg-amber-100', bgDark: 'dark:bg-amber-900/30', textLight: 'text-amber-600', textDark: 'dark:text-amber-400' },
    Sandwich: { emoji: '🥪', label: 'Sandwiches & Snacks', bgLight: 'bg-emerald-100', bgDark: 'dark:bg-emerald-900/30', textLight: 'text-emerald-700', textDark: 'dark:text-emerald-300' },
    Salad: { emoji: '🥗', label: 'Salads & Greens', bgLight: 'bg-green-100', bgDark: 'dark:bg-green-900/30', textLight: 'text-green-700', textDark: 'dark:text-green-300' },
    Fish: { emoji: '🐟', label: 'Seafood', bgLight: 'bg-cyan-100', bgDark: 'dark:bg-cyan-900/30', textLight: 'text-cyan-700', textDark: 'dark:text-cyan-300' },
    Coffee: { emoji: '☕', label: 'Coffee & Hot Tea', bgLight: 'bg-stone-200', bgDark: 'dark:bg-stone-800', textLight: 'text-stone-700', textDark: 'dark:text-stone-300' },
    GlassWater: { emoji: '🥤', label: 'Cold Drinks', bgLight: 'bg-blue-100', bgDark: 'dark:bg-blue-900/30', textLight: 'text-blue-700', textDark: 'dark:text-blue-300' },
    Beer: { emoji: '🍺', label: 'Beverages & Mocktails', bgLight: 'bg-amber-100', bgDark: 'dark:bg-amber-900/30', textLight: 'text-amber-800', textDark: 'dark:text-amber-300' },
    Cake: { emoji: '🍰', label: 'Pastry & Cakes', bgLight: 'bg-fuchsia-100', bgDark: 'dark:bg-fuchsia-900/30', textLight: 'text-fuchsia-700', textDark: 'dark:text-fuchsia-300' },
    IceCream: { emoji: '🍨', label: 'Desserts & Sweets', bgLight: 'bg-pink-100', bgDark: 'dark:bg-pink-900/30', textLight: 'text-pink-700', textDark: 'dark:text-pink-300' },
    Boxes: { emoji: '🍱', label: 'Set Meals & Combos', bgLight: 'bg-indigo-100', bgDark: 'dark:bg-indigo-900/30', textLight: 'text-indigo-700', textDark: 'dark:text-indigo-300' },
    Flame: { emoji: '🔥', label: 'Specials & Spicy', bgLight: 'bg-red-100', bgDark: 'dark:bg-red-900/30', textLight: 'text-red-700', textDark: 'dark:text-red-300' },
};

export function getCategoryIcon(iconName?: string) {
    if (iconName && CATEGORY_ICON_MAP[iconName]) {
        return CATEGORY_ICON_MAP[iconName];
    }
    return CATEGORY_ICON_MAP.Utensils;
}

export interface CategoryData {
    id: string;
    outlet_id: string;
    name: string;
    sort_order: number;
    icon: string;
    parent_id?: string | null;
    parent?: { id: string; name: string } | null;
    status: string;
    items_count?: number;
}

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    category?: CategoryData | null;
    mainCategories: CategoryData[];
    activeOutletId: string;
    onSaved: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
    isOpen,
    onClose,
    category,
    mainCategories,
    activeOutletId,
    onSaved
}) => {
    const [hierarchyType, setHierarchyType] = useState<'main' | 'sub'>('main');
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState<string>('');
    const [icon, setIcon] = useState('Utensils');
    const [sortOrder, setSortOrder] = useState('0');
    const [status, setStatus] = useState('active');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (category) {
            setName(category.name || '');
            setIcon(category.icon || 'Utensils');
            setSortOrder(String(category.sort_order ?? 0));
            setStatus(category.status || 'active');
            if (category.parent_id) {
                setHierarchyType('sub');
                setParentId(category.parent_id);
            } else {
                setHierarchyType('main');
                setParentId('');
            }
        } else {
            setName('');
            setIcon('Utensils');
            setSortOrder('0');
            setStatus('active');
            setHierarchyType('main');
            setParentId('');
        }
        setError(null);
    }, [category, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const payload = {
            outletId: activeOutletId,
            name: name.trim(),
            sortOrder: Number(sortOrder) || 0,
            icon,
            parentId: hierarchyType === 'sub' && parentId ? parentId : null,
            status
        };

        try {
            const url = category ? `/api/restaurant/categories/${category.id}` : '/api/restaurant/categories';
            const method = category ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save category');
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
                            {category ? <Edit3 className="size-4.5" /> : <Layers className="size-4.5" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                {category ? 'Edit Category' : 'Create New Category'}
                            </h2>
                            <p className="text-xs text-slate-400">
                                Configure department hierarchy, emoji icon, and sorting order.
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

                        {/* Hierarchy Type Switcher */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Hierarchy Type
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHierarchyType('main');
                                        setParentId('');
                                    }}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                                        hierarchyType === 'main'
                                            ? 'bg-primary/10 dark:bg-primary/20 border-primary text-primary ring-2 ring-primary/20'
                                            : 'bg-slate-50 dark:bg-[#202028] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    <span>📁</span>
                                    <span>Main Category</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setHierarchyType('sub');
                                        if (!parentId && mainCategories.length > 0) {
                                            setParentId(mainCategories[0].id);
                                        }
                                    }}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                                        hierarchyType === 'sub'
                                            ? 'bg-primary/10 dark:bg-primary/20 border-primary text-primary ring-2 ring-primary/20'
                                            : 'bg-slate-50 dark:bg-[#202028] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    <span>🌿</span>
                                    <span>Sub-Category</span>
                                </button>
                            </div>
                        </div>

                        {/* Subcategory Parent Selector */}
                        {hierarchyType === 'sub' && (
                            <div className="p-3.5 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 space-y-1.5">
                                <label className="block font-semibold text-slate-800 dark:text-slate-200">
                                    Parent Category <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    value={parentId}
                                    onChange={(e) => setParentId(e.target.value)}
                                    className="w-full bg-white dark:bg-[#18181f] border border-primary/40 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                                >
                                    <option value="">Select parent category…</option>
                                    {mainCategories
                                        .filter((m) => !category || m.id !== category.id)
                                        .map((m) => (
                                            <option key={m.id} value={m.id}>
                                                📁 {m.name}
                                            </option>
                                        ))}
                                </select>
                                <p className="text-[11px] text-primary">
                                    This subcategory will appear grouped inside the selected parent category on the POS and menu screens.
                                </p>
                            </div>
                        )}

                        {/* Category Name */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Category Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Biryani & Rice, Charcoal Grill, Beverages..."
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </div>

                        {/* Emoji Visual Grid Picker */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="font-semibold text-slate-700 dark:text-slate-300">
                                    Visual Icon Picker
                                </label>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                    Selected: {CATEGORY_ICON_MAP[icon]?.emoji} {CATEGORY_ICON_MAP[icon]?.label}
                                </span>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-2 rounded-2xl bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto">
                                {Object.entries(CATEGORY_ICON_MAP).map(([key, info]) => {
                                    const isSelected = icon === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setIcon(key)}
                                            className={`p-2 rounded-xl flex flex-col items-center justify-center text-center transition cursor-pointer ${
                                                isSelected
                                                    ? 'bg-white dark:bg-slate-800 shadow-md ring-2 ring-primary border-primary scale-105'
                                                    : 'hover:bg-white/80 dark:hover:bg-slate-800/60'
                                            }`}
                                            title={info.label}
                                        >
                                            <span className="text-xl mb-0.5">{info.emoji}</span>
                                            <span className="text-[9px] text-slate-500 truncate max-w-full">
                                                {key}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sort Order & Status */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Sort Order
                                </label>
                                <input
                                    type="number"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    placeholder="0"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                />
                                <span className="text-[10px] text-slate-400">Lower numbers appear first</span>
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Active Status
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                                >
                                    <option value="active">Active (Visible)</option>
                                    <option value="inactive">Inactive (Hidden)</option>
                                </select>
                            </div>
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
                                    <span>{category ? 'Update Category' : 'Save Category'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
