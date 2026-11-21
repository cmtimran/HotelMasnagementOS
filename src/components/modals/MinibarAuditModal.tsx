import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    X, Wine, Plus, Minus, CheckCircle2, 
    AlertCircle, RefreshCw, Receipt,
    Search, Check, FolderPlus
} from 'lucide-react';

export interface MinibarItem {
    id: string;
    name: string;
    category: string;
    price: number;
    parStock?: number;
    isActive?: boolean;
}

export interface MinibarAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomNumber: string;
    guestName?: string;
    propertyId?: number | string;
    onChargePosted?: (result: any) => void;
}

const FALLBACK_MINIBAR_ITEMS: MinibarItem[] = [
    { id: 'mb-01', name: 'Evian Mineral Water (500ml)', category: 'Beverage', price: 150, parStock: 2 },
    { id: 'mb-02', name: 'Coca-Cola Can (330ml)', category: 'Beverage', price: 180, parStock: 2 },
    { id: 'mb-03', name: 'Sprite Lemon-Lime Can (330ml)', category: 'Beverage', price: 180, parStock: 2 },
    { id: 'mb-04', name: 'Red Bull Energy Drink (250ml)', category: 'Beverage', price: 350, parStock: 2 },
    { id: 'mb-05', name: 'Pringles Potato Crisps (Sour Cream & Onion)', category: 'Snack', price: 250, parStock: 1 },
    { id: 'mb-06', name: 'Cadbury Dairy Milk Silk Chocolate (60g)', category: 'Snack', price: 180, parStock: 2 },
    { id: 'mb-07', name: 'Mixed Roasted Cashew Nuts Jar (100g)', category: 'Snack', price: 280, parStock: 1 }
];

export const MinibarAuditModal: React.FC<MinibarAuditModalProps> = ({
    isOpen,
    onClose,
    roomNumber,
    guestName,
    propertyId = 1,
    onChargePosted
}) => {
    // Dynamic catalog items state
    const [minibarItems, setMinibarItems] = useState<MinibarItem[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);
    
    // Consumption selection state (itemId -> quantity)
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    
    // Search & Category Filtering
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    // Dynamic Item Entry Form State
    const [showAddForm, setShowAddForm] = useState<boolean>(false);
    const [newItemName, setNewItemName] = useState<string>('');
    const [newItemCategory, setNewItemCategory] = useState<string>('Beverage');
    const [newItemPrice, setNewItemPrice] = useState<string>('');
    const [newItemParStock, setNewItemParStock] = useState<string>('2');
    const [saveToCatalog, setSaveToCatalog] = useState<boolean>(true);
    const [addingItem, setAddingItem] = useState<boolean>(false);

    // Posting & Feedback State
    const [posting, setPosting] = useState<boolean>(false);
    const [successData, setSuccessData] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');

    // Fetch dynamic minibar items from database
    const loadCatalog = useCallback(async () => {
        try {
            setLoadingCatalog(true);
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/api/housekeeping/minibar-items?propertyId=${encodeURIComponent(propertyId)}`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'X-Property-Id': String(propertyId)
                }
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                setMinibarItems(data.data);
            } else {
                setMinibarItems(FALLBACK_MINIBAR_ITEMS);
            }
        } catch (err) {
            console.warn('Could not load minibar items from backend, using default items:', err);
            setMinibarItems(FALLBACK_MINIBAR_ITEMS);
        } finally {
            setLoadingCatalog(false);
        }
    }, [propertyId]);

    useEffect(() => {
        if (isOpen) {
            loadCatalog();
            setQuantities({});
            setSuccessData(null);
            setErrorMsg('');
            setShowAddForm(false);
        }
    }, [isOpen, loadCatalog]);

    // Categories list for tabs
    const categories = useMemo(() => {
        const set = new Set<string>();
        minibarItems.forEach(i => {
            if (i.category) set.add(i.category);
        });
        return ['ALL', ...Array.from(set)];
    }, [minibarItems]);

    // Filtered items based on search and category
    const filteredItems = useMemo(() => {
        return minibarItems.filter(item => {
            const matchesCategory = selectedCategory === 'ALL' || item.category.toLowerCase() === selectedCategory.toLowerCase();
            const matchesSearch = !searchQuery.trim() || 
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.category.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [minibarItems, selectedCategory, searchQuery]);

    const handleIncrement = (id: string) => {
        setQuantities(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    };

    const handleDecrement = (id: string) => {
        setQuantities(prev => {
            const current = prev[id] || 0;
            if (current <= 1) {
                const next = { ...prev };
                delete next[id];
                return next;
            }
            return { ...prev, [id]: current - 1 };
        });
    };

    // Handle adding dynamic item
    const handleAddNewItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newItemName.trim();
        const priceNum = parseFloat(newItemPrice);

        if (!trimmedName) {
            setErrorMsg('Please enter an item name');
            return;
        }
        if (isNaN(priceNum) || priceNum < 0) {
            setErrorMsg('Please enter a valid unit price');
            return;
        }

        setErrorMsg('');
        setAddingItem(true);

        try {
            let createdItem: MinibarItem;

            if (saveToCatalog) {
                // Post to database catalog
                const token = localStorage.getItem('auth_token');
                const res = await fetch('/api/housekeeping/minibar-items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : '',
                        'X-Property-Id': String(propertyId)
                    },
                    body: JSON.stringify({
                        name: trimmedName,
                        category: newItemCategory,
                        price: priceNum,
                        parStock: parseInt(newItemParStock, 10) || 2
                    })
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.error || 'Failed to save item to catalog');
                }
                createdItem = data.data;
            } else {
                // Temporary item for this audit session
                createdItem = {
                    id: `temp-${Date.now()}`,
                    name: trimmedName,
                    category: newItemCategory,
                    price: priceNum,
                    parStock: parseInt(newItemParStock, 10) || 2
                };
            }

            // Append item to minibar items and set quantity to 1
            setMinibarItems(prev => [createdItem, ...prev]);
            setQuantities(prev => ({ ...prev, [createdItem.id]: 1 }));

            // Reset form
            setNewItemName('');
            setNewItemPrice('');
            setShowAddForm(false);
        } catch (err: any) {
            setErrorMsg(err.message || 'Error creating dynamic minibar item');
        } finally {
            setAddingItem(false);
        }
    };

    // Calculate total consumed amount
    const totalConsumedAmount = useMemo(() => {
        return Object.entries(quantities).reduce((sum, [id, qty]) => {
            const item = minibarItems.find(i => i.id === id);
            return sum + (item ? item.price * qty : 0);
        }, 0);
    }, [quantities, minibarItems]);

    const totalItemCount = useMemo(() => {
        return Object.values(quantities).reduce((sum, q) => sum + q, 0);
    }, [quantities]);

    const handlePostCharge = async () => {
        if (totalConsumedAmount <= 0) return;
        setPosting(true);
        setErrorMsg('');

        try {
            const token = localStorage.getItem('auth_token');
            const itemsToPost = Object.entries(quantities).map(([id, qty]) => {
                const item = minibarItems.find(i => i.id === id);
                return {
                    name: item?.name || 'Minibar Item',
                    quantity: qty,
                    price: item?.price || 0
                };
            });

            const res = await fetch('/api/housekeeping/minibar-post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                    'X-Property-Id': String(propertyId)
                },
                body: JSON.stringify({
                    roomNumber: String(roomNumber),
                    items: itemsToPost,
                    attendedBy: 'Housekeeping Attendant'
                })
            });

            const data = await res.json();
            if (data.success) {
                setSuccessData(data);
                if (onChargePosted) onChargePosted(data);
            } else {
                setErrorMsg(data.error || 'Failed to post minibar charges');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Network error communicating with housekeeping service');
        } finally {
            setPosting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl bg-white dark:bg-[#16161e] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-amber-700 via-orange-800 to-slate-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                            <Wine size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-white tracking-wide">In-Room Minibar Billing</h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                                    Dynamic Catalog
                                </span>
                            </div>
                            <p className="text-xs text-amber-200/80">Audit consumed minibar items and post charges directly to Guest Folio</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-4 text-slate-700 dark:text-slate-300 text-xs">
                    
                    {/* Room & Guest Status Badge */}
                    <div className="flex items-center justify-between bg-amber-50/70 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-800/40">
                        <div>
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">Inspecting Room</span>
                            <span className="text-xl font-black text-slate-900 dark:text-white">Room {roomNumber}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">In-House Guest</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{guestName || 'Active Guest'}</span>
                        </div>
                    </div>

                    {/* Search & Dynamic Entry Header Controls */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            {/* Search Box */}
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search minibar catalog..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            {/* Add Dynamic Item Button */}
                            <button
                                type="button"
                                onClick={() => setShowAddForm(prev => !prev)}
                                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs transition cursor-pointer shrink-0 ${
                                    showAddForm 
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300' 
                                        : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                }`}
                            >
                                <Plus size={14} />
                                {showAddForm ? 'Cancel Add' : 'Dynamic Entry'}
                            </button>
                        </div>

                        {/* Category Badges Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                                        selectedCategory === cat
                                            ? 'bg-amber-600 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {cat === 'ALL' ? 'All Items' : cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Item Entry Collapsible Form */}
                    {showAddForm && (
                        <form onSubmit={handleAddNewItem} className="p-4 bg-amber-50/50 dark:bg-[#1f1e29] border border-amber-300/80 dark:border-amber-800/60 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-800/40">
                                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                    <FolderPlus size={15} />
                                    Add Dynamic Minibar Item
                                </span>
                                <span className="text-[10px] text-amber-700 dark:text-amber-400">Instantly available for billing</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        Item Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. San Pellegrino (500ml)"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        required
                                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={newItemCategory}
                                        onChange={(e) => setNewItemCategory(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                    >
                                        <option value="Beverage">Beverage</option>
                                        <option value="Snack">Snack</option>
                                        <option value="Alcohol">Alcohol / Spirits</option>
                                        <option value="Essentials">Essentials / Personal</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        Unit Price (৳ BDT) *
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 250"
                                        min="0"
                                        step="0.01"
                                        value={newItemPrice}
                                        onChange={(e) => setNewItemPrice(e.target.value)}
                                        required
                                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        Par Stock (Per Room)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newItemParStock}
                                        onChange={(e) => setNewItemParStock(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400">
                                    <input
                                        type="checkbox"
                                        checked={saveToCatalog}
                                        onChange={(e) => setSaveToCatalog(e.target.checked)}
                                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <span>Save permanently to Hotel Minibar Catalog in Database</span>
                                </label>

                                <button
                                    type="submit"
                                    disabled={addingItem}
                                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    {addingItem ? (
                                        <>
                                            <RefreshCw size={13} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={13} />
                                            Add & Select Item
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Minibar Items List */}
                    <div className="space-y-2">
                        <div className="font-bold text-slate-800 dark:text-white text-xs flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                            <span>Available Minibar Items ({filteredItems.length})</span>
                            <span className="text-slate-500 text-[11px]">Tap + to record consumed quantity</span>
                        </div>

                        {loadingCatalog ? (
                            <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
                                <RefreshCw size={20} className="animate-spin text-amber-500" />
                                <span>Loading minibar catalog from database...</span>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                <Wine size={28} className="mx-auto mb-2 text-slate-400" />
                                <p className="font-semibold">No minibar items match your filter</p>
                                <p className="text-[11px] mt-1">Use the "Dynamic Entry" button above to register new items</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {filteredItems.map((item) => {
                                    const qty = quantities[item.id] || 0;
                                    return (
                                        <div 
                                            key={item.id}
                                            className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                                                qty > 0 
                                                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 ring-1 ring-amber-400/30' 
                                                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                                                        {item.name}
                                                    </span>
                                                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                        {item.category}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                                                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                                                        ৳{item.price.toLocaleString()}
                                                    </span>
                                                    <span>•</span>
                                                    <span>Par: {item.parStock || 2} pcs</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 shrink-0">
                                                {qty > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDecrement(item.id)}
                                                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition cursor-pointer"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                )}

                                                <span className={`w-6 text-center font-bold text-xs ${qty > 0 ? 'text-amber-800 dark:text-amber-300 text-sm' : 'text-slate-400'}`}>
                                                    {qty}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => handleIncrement(item.id)}
                                                    className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center transition shadow-2xs cursor-pointer"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Consumed Total Bar */}
                    <div className="p-3.5 bg-slate-900 dark:bg-[#0f0e14] text-white rounded-2xl flex items-center justify-between border border-slate-800 shadow-md">
                        <div>
                            <span className="text-slate-400 text-[11px] block">Items Consumed</span>
                            <span className="font-bold text-sm text-amber-300">{totalItemCount} Items Selected</span>
                        </div>
                        <div className="text-right">
                            <span className="text-slate-400 text-[11px] block">Total Charge (Net)</span>
                            <span className="text-xl font-black text-white">৳{totalConsumedAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Success Banner */}
                    {successData && (
                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-1 text-emerald-900 dark:text-emerald-300">
                            <div className="flex items-center gap-2 font-bold text-xs">
                                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                                {successData.message}
                            </div>
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                                Voucher Ref: {successData.refNo} • Guest Folio #{successData.folioId}
                            </div>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-2 text-red-800 dark:text-red-400 text-xs">
                            <AlertCircle size={16} className="text-red-600 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl cursor-pointer"
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        onClick={handlePostCharge}
                        disabled={posting || totalConsumedAmount <= 0}
                        className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded-xl shadow-md shadow-amber-600/20 transition flex items-center gap-2 cursor-pointer"
                    >
                        {posting ? (
                            <>
                                <RefreshCw size={14} className="animate-spin" />
                                Posting to Folio...
                            </>
                        ) : (
                            <>
                                <Receipt size={14} />
                                Post ৳{totalConsumedAmount.toLocaleString()} to Folio
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};
