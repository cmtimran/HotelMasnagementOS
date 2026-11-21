import React, { useState, useEffect } from 'react';
import {
    Plus,
    Edit3,
    X,
    Check,
    UtensilsCrossed,
    Clock,
    CheckSquare,
    Square,
    Trash2
} from 'lucide-react';
import type { CategoryData } from '../categories/CategoryModal';
import type { AddonData } from '../addons/AddonModal';

export const PRESET_DISH_IMAGES = [
    { label: '🍚 Kacchi Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400' },
    { label: '🍗 Chicken Dum Biryani', url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400' },
    { label: '🥩 Seekh Kebab Grill', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400' },
    { label: '🍲 Butter Chicken Curry', url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400' },
    { label: '🍕 Woodfire Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' },
    { label: '🍔 Gourmet Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
    { label: '🥗 Caesar Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400' },
    { label: '🍹 Mocktail / Beverage', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400' },
    { label: '🍰 Chocolate Mousse Cake', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400' },
];

export const ALLERGEN_OPTIONS = ['Dairy', 'Gluten', 'Tree Nuts', 'Peanuts', 'Seafood', 'Shellfish', 'Eggs', 'Soy', 'Mustard'];
export const TAG_OPTIONS = ['Bestseller', 'Chef Special', 'Popular', 'Spicy', 'Halal', 'Vegetarian', 'Vegan', 'Signature'];

export interface VariationItem {
    id: string;
    name: string;
    price: number;
    isDefault?: boolean;
}

export interface MenuItemData {
    id: string;
    outlet_id: string;
    name: string;
    description?: string;
    price: number;
    product_code?: string;
    slug?: string;
    category_id: string;
    category?: { id: string; name: string };
    prep_station?: string;
    prep_time_estimate?: number;
    sort_order?: number;
    is_available: boolean;
    is_featured: boolean;
    image_url?: string;
    allergens?: string[];
    tags?: string[];
    variations?: VariationItem[];
    addons?: string[];
    status?: string;
}

interface MenuItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item?: MenuItemData | null;
    categories: CategoryData[];
    availableAddons: AddonData[];
    kitchenStations: { id: string; name: string; code: string }[];
    activeOutletId: string;
    onSaved: () => void;
}

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
    isOpen,
    onClose,
    item,
    categories,
    availableAddons,
    kitchenStations,
    activeOutletId,
    onSaved
}) => {
    const [activeTab, setActiveTab] = useState<'general' | 'variations' | 'addons' | 'tags'>('general');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form fields
    const [name, setName] = useState('');
    const [productCode, setProductCode] = useState('');
    const [slug, setSlug] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('0.00');
    const [prepStation, setPrepStation] = useState('GRILL_HOT');
    const [prepTimeEstimate, setPrepTimeEstimate] = useState('15');
    const [sortOrder, setSortOrder] = useState('0');
    const [isAvailable, setIsAvailable] = useState(true);
    const [isFeatured, setIsFeatured] = useState(false);
    const [imageUrl, setImageUrl] = useState('');

    // Variations builder
    const [variations, setVariations] = useState<VariationItem[]>([]);
    const [newVarName, setNewVarName] = useState('');
    const [newVarPrice, setNewVarPrice] = useState('');

    // Addons & Allergens & Tags
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    useEffect(() => {
        if (item) {
            setName(item.name || '');
            setProductCode(item.product_code || '');
            setSlug(item.slug || '');
            setCategoryId(item.category_id || (categories[0]?.id || ''));
            setDescription(item.description || '');
            setPrice(String(item.price ?? 0));
            setPrepStation(item.prep_station || 'GRILL_HOT');
            setPrepTimeEstimate(String(item.prep_time_estimate ?? 15));
            setSortOrder(String(item.sort_order ?? 0));
            setIsAvailable(item.is_available ?? true);
            setIsFeatured(item.is_featured ?? false);
            setImageUrl(item.image_url || '');

            setVariations(Array.isArray(item.variations) ? item.variations : []);
            setSelectedAddons(Array.isArray(item.addons) ? item.addons : []);
            setSelectedAllergens(Array.isArray(item.allergens) ? item.allergens : []);
            setSelectedTags(Array.isArray(item.tags) ? item.tags : []);
        } else {
            setName('');
            setProductCode('');
            setSlug('');
            setCategoryId(categories[0]?.id || '');
            setDescription('');
            setPrice('0.00');
            setPrepStation('GRILL_HOT');
            setPrepTimeEstimate('15');
            setSortOrder('0');
            setIsAvailable(true);
            setIsFeatured(false);
            setImageUrl('');
            setVariations([]);
            setSelectedAddons([]);
            setSelectedAllergens([]);
            setSelectedTags(['Popular']);
        }
        setError(null);
        setActiveTab('general');
    }, [item, isOpen, categories]);

    if (!isOpen) return null;

    const handleAddVariation = () => {
        if (!newVarName.trim()) return;
        const newVar: VariationItem = {
            id: `v-${Date.now()}`,
            name: newVarName.trim(),
            price: Number(newVarPrice) || Number(price) || 0,
            isDefault: variations.length === 0
        };
        setVariations([...variations, newVar]);
        setNewVarName('');
        setNewVarPrice('');
    };

    const handleRemoveVariation = (id: string) => {
        setVariations(variations.filter((v) => v.id !== id));
    };

    const toggleAddon = (addonId: string) => {
        if (selectedAddons.includes(addonId)) {
            setSelectedAddons(selectedAddons.filter((id) => id !== addonId));
        } else {
            setSelectedAddons([...selectedAddons, addonId]);
        }
    };

    const toggleAllergen = (allergen: string) => {
        if (selectedAllergens.includes(allergen)) {
            setSelectedAllergens(selectedAllergens.filter((a) => a !== allergen));
        } else {
            setSelectedAllergens([...selectedAllergens, allergen]);
        }
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const payload = {
            outletId: activeOutletId,
            name: name.trim(),
            productCode: productCode.trim().toUpperCase(),
            slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            categoryId,
            description: description.trim(),
            price: Number(price) || 0,
            prepStation,
            prepTimeEstimate: Number(prepTimeEstimate) || 15,
            sortOrder: Number(sortOrder) || 0,
            isAvailable,
            isFeatured,
            imageUrl: imageUrl.trim(),
            allergens: selectedAllergens,
            tags: selectedTags,
            variations,
            addons: selectedAddons
        };

        try {
            const url = item ? `/api/restaurant/items/${item.id}` : '/api/restaurant/items';
            const method = item ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save menu item');
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
                className="w-full max-w-2xl bg-white dark:bg-[#18181f] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden my-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center text-base">
                            {item ? <Edit3 className="size-4.5" /> : <UtensilsCrossed className="size-4.5" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                {item ? 'Edit Menu Dish' : 'Create New Menu Item'}
                            </h2>
                            <p className="text-xs text-slate-400">
                                Configure recipe details, portions, addons, prep stations and pricing.
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

                {/* Tabs Switcher */}
                <div className="flex items-center px-5 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/30 gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`py-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
                            activeTab === 'general'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        General Details
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('variations')}
                        className={`py-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
                            activeTab === 'variations'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        Variations & Portions ({variations.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('addons')}
                        className={`py-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
                            activeTab === 'addons'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        Linked Add-ons ({selectedAddons.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('tags')}
                        className={`py-3 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
                            activeTab === 'tags'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        Dietary & Tags
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                        {error && (
                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs">
                                {error}
                            </div>
                        )}

                        {activeTab === 'general' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Item Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={name}
                                            onChange={(e) => {
                                                setName(e.target.value);
                                                if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
                                                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                                                }
                                            }}
                                            placeholder="e.g. Kacchi Biryani (Basmati)"
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Product Code / SKU
                                        </label>
                                        <input
                                            type="text"
                                            value={productCode}
                                            onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                                            placeholder="e.g. BIR-01"
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white uppercase font-mono focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Category <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            required
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                                        >
                                            <option value="">Select category…</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.parent_id ? `  ↳ ${c.name}` : `📁 ${c.name}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Base Selling Price (৳) <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            placeholder="480.00"
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Description & Ingredients
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="e.g. Fragrant Basmati rice layered with tender marinated mutton, alu bukhara, saffron..."
                                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary resize-none"
                                    />
                                </div>

                                {/* Kitchen Routing & Prep */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Kitchen Prep Station (KDS & KOT)
                                        </label>
                                        <select
                                            value={prepStation}
                                            onChange={(e) => setPrepStation(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                                        >
                                            {kitchenStations.length > 0 ? (
                                                kitchenStations.map((ks) => (
                                                    <option key={ks.id} value={ks.code}>
                                                        🍳 {ks.name} ({ks.code})
                                                    </option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="GRILL_HOT">🍳 Kabab Ghor (Hot Grill & Tandoor)</option>
                                                    <option value="CURRY_POT">🍲 Biryani & Curry Counter</option>
                                                    <option value="BAR">🍹 Beverage & Juice Bar</option>
                                                    <option value="COLD_PREP">🥗 Cold Prep & Salad Section</option>
                                                    <option value="PASTRY_DESSERT">🍰 Pastry & Dessert Station</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Estimated Prep Time (Minutes)
                                        </label>
                                        <div className="relative">
                                            <Clock className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="number"
                                                min="1"
                                                value={prepTimeEstimate}
                                                onChange={(e) => setPrepTimeEstimate(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Availability & Featured */}
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAvailable}
                                            onChange={(e) => setIsAvailable(e.target.checked)}
                                            className="size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                                        />
                                        <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                            Active & Available for Ordering (Enable on POS & Menus)
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isFeatured}
                                            onChange={(e) => setIsFeatured(e.target.checked)}
                                            className="size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                                        />
                                        <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                            ⭐ Mark as Chef's Special / Featured Item
                                        </span>
                                    </label>
                                </div>

                                {/* Image Preview & Presets */}
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Dish Image & Quick Presets
                                    </label>
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                        {PRESET_DISH_IMAGES.slice(0, 6).map((preset) => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() => setImageUrl(preset.url)}
                                                className={`p-2 rounded-xl border text-left flex items-center gap-1.5 transition cursor-pointer text-[11px] font-medium ${
                                                    imageUrl === preset.url
                                                        ? 'bg-primary/10 border-primary text-primary'
                                                        : 'bg-slate-50 dark:bg-[#202028] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>{preset.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="url"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            placeholder="Paste image URL https://..."
                                            className="flex-1 bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-primary"
                                        />
                                        {imageUrl && (
                                            <div className="size-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                                                <img src={imageUrl} alt="preview" className="size-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'variations' && (
                            <div className="space-y-4">
                                <div className="p-3.5 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
                                    <p className="text-xs text-primary font-medium">
                                        Variations allow guests to pick portion sizes (e.g. Regular, Platter, Full) or preparation styles. If variations are added, the cashier can select the portion on POS.
                                    </p>
                                </div>

                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Portion Name
                                        </label>
                                        <input
                                            type="text"
                                            value={newVarName}
                                            onChange={(e) => setNewVarName(e.target.value)}
                                            placeholder="e.g. Platter (2 Persons), 1:2 Share..."
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div className="w-32">
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Price (৳)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={newVarPrice}
                                            onChange={(e) => setNewVarPrice(e.target.value)}
                                            placeholder="920.00"
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddVariation}
                                        className="px-4 py-2 bg-primary text-white font-semibold rounded-xl text-xs hover:opacity-95 transition cursor-pointer flex items-center gap-1 shrink-0"
                                    >
                                        <Plus className="size-3.5" />
                                        <span>Add</span>
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {variations.map((v, idx) => (
                                        <div
                                            key={v.id}
                                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-slate-400 text-xs">#{idx + 1}</span>
                                                <span className="font-bold text-slate-900 dark:text-white">{v.name}</span>
                                                {v.isDefault && (
                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                                    ৳{Number(v.price).toFixed(2)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveVariation(v.id)}
                                                    className="p-1 rounded text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {variations.length === 0 && (
                                        <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                            No portion variations yet. This dish uses the standard Base Price of ৳{price}.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'addons' && (
                            <div className="space-y-3">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Select which modifiers/add-ons are available when ordering this dish:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto">
                                    {availableAddons.map((add) => {
                                        const isSelected = selectedAddons.includes(add.id);
                                        return (
                                            <div
                                                key={add.id}
                                                onClick={() => toggleAddon(add.id)}
                                                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                                    isSelected
                                                        ? 'bg-primary/5 dark:bg-primary/10 border-primary ring-1 ring-primary/30'
                                                        : 'bg-slate-50 dark:bg-[#202028] border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="size-8 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                                                        {add.image_url ? (
                                                            <img src={add.image_url} alt="" className="size-full object-cover" />
                                                        ) : (
                                                            <div className="size-full flex items-center justify-center text-xs">🧀</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white block text-xs">
                                                            {add.name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            +৳{Number(add.price).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isSelected ? (
                                                    <CheckSquare className="size-4 text-primary" />
                                                ) : (
                                                    <Square className="size-4 text-slate-400" />
                                                )}
                                            </div>
                                        );
                                    })}
                                    {availableAddons.length === 0 && (
                                        <div className="col-span-2 p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                            No add-on modifiers created yet. You can create them in the Add-ons tab.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'tags' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Marketing & Menu Tags
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {TAG_OPTIONS.map((tag) => {
                                            const isSelected = selectedTags.includes(tag);
                                            return (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => toggleTag(tag)}
                                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-primary text-white border-primary shadow-xs'
                                                            : 'bg-slate-50 dark:bg-[#202028] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {tag}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Allergens Declaration (NBR & Health Compliance)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {ALLERGEN_OPTIONS.map((allergen) => {
                                            const isSelected = selectedAllergens.includes(allergen);
                                            return (
                                                <button
                                                    key={allergen}
                                                    type="button"
                                                    onClick={() => toggleAllergen(allergen)}
                                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                                                            : 'bg-slate-50 dark:bg-[#202028] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    ⚠️ Contains {allergen}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
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
                                    <span>{item ? 'Update Menu Item' : 'Save Dish'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
