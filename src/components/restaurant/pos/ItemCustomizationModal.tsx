import React, { useState } from 'react';
import type { MenuItemData, AddonItem, CartItem, Variation } from './pos.types';
import { X, Plus, Minus, Check, Sparkles } from 'lucide-react';

interface ItemCustomizationModalProps {
    isOpen?: boolean;
    item: MenuItemData;
    allAddons?: AddonItem[];
    availableAddons?: AddonItem[];
    onClose: () => void;
    onAddToCart: (cartItem: CartItem) => void;
}

export const ItemCustomizationModal: React.FC<ItemCustomizationModalProps> = ({
    isOpen,
    item,
    allAddons = [],
    availableAddons = [],
    onClose,
    onAddToCart
}) => {
    if (isOpen === false) return null;
    const activeAddons = allAddons.length > 0 ? allAddons : availableAddons;
    const variations = item.variations && item.variations.length > 0 ? item.variations : [];
    const [selectedVariation, setSelectedVariation] = useState<Variation | undefined>(
        variations.length > 0 ? variations[0] : undefined
    );

    const relevantAddons =
        item.addons && item.addons.length > 0
            ? activeAddons.filter((a) => item.addons!.includes(a.id))
            : activeAddons;

    const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');

    const toggleAddon = (addonId: string) => {
        setSelectedAddonIds((prev) =>
            prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
        );
    };

    const currentBasePrice = selectedVariation ? Number(selectedVariation.price) : Number(item.price);
    const chosenAddons = activeAddons.filter((a) => selectedAddonIds.includes(a.id));
    const addonsTotal = chosenAddons.reduce((sum, a) => sum + Number(a.price || 0), 0);
    const singleItemPrice = currentBasePrice + addonsTotal;
    const totalItemPrice = singleItemPrice * quantity;

    const handleConfirm = () => {
        const cartItemId = `${item.id}-${selectedVariation?.id || 'base'}-${selectedAddonIds.sort().join('_')}-${Date.now()}`;
        const cartItem: CartItem = {
            cartItemId,
            menuItemId: item.id,
            name: item.name,
            basePrice: item.price,
            selectedVariation,
            selectedAddons: chosenAddons,
            itemPrice: singleItemPrice,
            quantity,
            notes: notes.trim() || undefined,
            prepStation: item.prepStation
        };
        onAddToCart(cartItem);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#16161d] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between bg-slate-50/50 dark:bg-[#1c1c24]/50">
                    <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                            <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="size-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                            />
                        ) : (
                            <div className="size-14 rounded-2xl bg-primary text-white font-bold flex items-center justify-center text-xs text-center p-1 shadow-2xs shrink-0">
                                {item.name.slice(0, 3).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {item.name}
                                </h3>
                                {item.isFeatured && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1">
                                        <Sparkles className="size-2.5" /> Chef Special
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                {item.description || item.category}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Portion Variations */}
                    {variations.length > 0 && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                Select Portion Size
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {variations.map((v) => {
                                    const isSelected = selectedVariation?.id === v.id;
                                    return (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => setSelectedVariation(v)}
                                            className={`p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                                                isSelected
                                                    ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-[#1a1a24]'
                                            }`}
                                        >
                                            <div>
                                                <span className="block text-xs font-bold text-slate-900 dark:text-white">
                                                    {v.name}
                                                </span>
                                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                                    ৳{Number(v.price).toFixed(2)}
                                                </span>
                                            </div>
                                            {isSelected && (
                                                <div className="size-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                                                    <Check className="size-3" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Addons Selection */}
                    {relevantAddons.length > 0 && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                Extra Toppings & Add-ons
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {relevantAddons.map((add) => {
                                    const isSelected = selectedAddonIds.includes(add.id);
                                    return (
                                        <button
                                            key={add.id}
                                            type="button"
                                            onClick={() => toggleAddon(add.id)}
                                            className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                                                isSelected
                                                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-[#1a1a24]'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {add.imageUrl ? (
                                                    <img
                                                        src={add.imageUrl}
                                                        alt={add.name}
                                                        className="size-8 rounded-lg object-cover"
                                                    />
                                                ) : (
                                                    <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs">
                                                        🧀
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="block text-xs font-semibold text-slate-900 dark:text-white">
                                                        {add.name}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-500">
                                                        +৳{Number(add.price).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                className={`size-4 rounded-md border flex items-center justify-center ${
                                                    isSelected
                                                        ? 'bg-primary border-primary text-white'
                                                        : 'border-slate-300 dark:border-slate-600'
                                                }`}
                                            >
                                                {isSelected && <Check className="size-3" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Cooking Instructions / Notes */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Kitchen Notes / Instructions
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Less spicy, no onions, extra crispy..."
                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>

                {/* Footer with Quantity Stepper & Add Button */}
                <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#1c1c24]/50 flex items-center justify-between gap-4">
                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-2 bg-white dark:bg-[#14141c] border border-slate-200 dark:border-slate-700 rounded-2xl p-1 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
                        >
                            <Minus className="size-3.5" />
                        </button>
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white w-6 text-center">
                            {quantity}
                        </span>
                        <button
                            type="button"
                            onClick={() => setQuantity(quantity + 1)}
                            className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
                        >
                            <Plus className="size-3.5" />
                        </button>
                    </div>

                    {/* Add to Cart CTA */}
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 py-3 px-5 rounded-2xl bg-primary text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-primary/25 hover:opacity-95 transition cursor-pointer"
                    >
                        <span>Add to Order</span>
                        <span className="font-mono text-sm">৳{totalItemPrice.toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
