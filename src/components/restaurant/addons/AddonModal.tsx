import React, { useState, useEffect } from 'react';
import { Plus, Edit3, X, Check } from 'lucide-react';

export const PRESET_ADDON_IMAGES = [
    { label: '🧀 Extra Cheese', url: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=300' },
    { label: '🍳 Fried Egg', url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300' },
    { label: '🥚 Boiled Egg', url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300' },
    { label: '🥗 Fresh Salad', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300' },
    { label: '🫓 Naan Bread', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300' },
    { label: '🥤 Borhani / Drink', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300' },
    { label: '🥣 Gravy / Sauce', url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=300' },
    { label: '🍟 Crispy Fries', url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=300' },
    { label: '🍚 Steamed Rice', url: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=300' },
];

export interface AddonData {
    id: string;
    outlet_id: string;
    name: string;
    description?: string;
    price: number;
    cost_price?: number;
    sort_order?: number;
    image_url?: string;
    status: string;
}

interface AddonModalProps {
    isOpen: boolean;
    onClose: () => void;
    addon?: AddonData | null;
    activeOutletId: string;
    onSaved: () => void;
}

export const AddonModal: React.FC<AddonModalProps> = ({
    isOpen,
    onClose,
    addon,
    activeOutletId,
    onSaved
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('0.00');
    const [costPrice, setCostPrice] = useState('0.00');
    const [sortOrder, setSortOrder] = useState('0');
    const [imageUrl, setImageUrl] = useState('');
    const [status, setStatus] = useState('active');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (addon) {
            setName(addon.name || '');
            setDescription(addon.description || '');
            setPrice(String(addon.price ?? 0));
            setCostPrice(String(addon.cost_price ?? 0));
            setSortOrder(String(addon.sort_order ?? 0));
            setImageUrl(addon.image_url || '');
            setStatus(addon.status || 'active');
        } else {
            setName('');
            setDescription('');
            setPrice('0.00');
            setCostPrice('0.00');
            setSortOrder('0');
            setImageUrl('');
            setStatus('active');
        }
        setError(null);
    }, [addon, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const payload = {
            outletId: activeOutletId,
            name: name.trim(),
            description: description.trim(),
            price: Number(price) || 0,
            costPrice: Number(costPrice) || 0,
            sortOrder: Number(sortOrder) || 0,
            imageUrl: imageUrl.trim(),
            status
        };

        try {
            const url = addon ? `/api/restaurant/addons/${addon.id}` : '/api/restaurant/addons';
            const method = addon ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save addon');
            }
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Error occurred');
        } finally {
            setSaving(false);
        }
    };

    const profitMargin = Number(price) > 0 ? (((Number(price) - Number(costPrice)) / Number(price)) * 100).toFixed(1) : '0';

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
                            {addon ? <Edit3 className="size-4.5" /> : <Plus className="size-4.5" />}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                {addon ? 'Edit Add-on Item' : 'New Add-on / Modifier'}
                            </h2>
                            <p className="text-xs text-slate-400">
                                Configure toppings, sides, extra dips, or beverage add-ons.
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

                        {/* Addon Name */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Add-on Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                required
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Extra Melted Cheese, Fried Egg, Borhani 250ml..."
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Description
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g. Imported cheddar cheese melted over dish..."
                                className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary"
                            />
                        </div>

                        {/* Pricing & Cost */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Selling Price (৳) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="50.00"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                                        Cost / COGS (৳)
                                    </label>
                                    <span className="text-[10px] text-emerald-600 font-semibold">
                                        Margin: {profitMargin}%
                                    </span>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={costPrice}
                                    onChange={(e) => setCostPrice(e.target.value)}
                                    placeholder="20.00"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>

                        {/* Preset Quick Images */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Preset Thumbnail Icons
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {PRESET_ADDON_IMAGES.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => setImageUrl(preset.url)}
                                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer text-[11px] font-medium ${
                                            imageUrl === preset.url
                                                ? 'bg-primary/10 border-primary text-primary'
                                                : 'bg-slate-50 dark:bg-[#202028] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span>{preset.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom Image URL */}
                        <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Image URL
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://images.unsplash.com/..."
                                    className="flex-1 bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary font-mono text-[11px]"
                                />
                                {imageUrl && (
                                    <div className="size-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                                        <img src={imageUrl} alt="preview" className="size-full object-cover" />
                                    </div>
                                )}
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
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                />
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
                                    <option value="inactive">Inactive (Disabled)</option>
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
                                    <span>{addon ? 'Update Add-on' : 'Save Add-on'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
