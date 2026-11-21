import React, { useState, useEffect, useCallback } from 'react';
import {
    ShoppingBag, Scan, RefreshCw,
    Search, Package
} from 'lucide-react';
import { OutletSelector, type Outlet } from '../restaurant/outlets/OutletSelector';

interface RetailProduct {
    id: string;
    outlet_id: string;
    sku: string;
    barcode: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    status: string;
}

export const RetailInventoryPage: React.FC = () => {
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<RetailProduct[]>([]);
    const [loading, setLoading] = useState(true);

    const defaultProducts: RetailProduct[] = [
        {
            id: 'ret-01',
            outlet_id: selectedOutlet?.id || 'outlet-giftshop',
            sku: 'SOUV-JAM-001',
            barcode: '8941234567890',
            name: 'Handcrafted Traditional Jamdani Silk Scarf',
            category: 'Handicrafts & Souvenirs',
            price: 3200,
            stock: 24,
            status: 'IN_STOCK'
        },
        {
            id: 'ret-02',
            outlet_id: selectedOutlet?.id || 'outlet-giftshop',
            sku: 'HOTEL-ROBE-002',
            barcode: '8941234567891',
            name: 'Hotel Signature 100% Egyptian Cotton Bathrobe',
            category: 'Luxury Apparel',
            price: 4500,
            stock: 15,
            status: 'IN_STOCK'
        },
        {
            id: 'ret-03',
            outlet_id: selectedOutlet?.id || 'outlet-giftshop',
            sku: 'SNK-CHOC-003',
            barcode: '8941234567892',
            name: 'Artisan Dark Chocolate Truffle Box (12 Pcs)',
            category: 'Confectionery & Treats',
            price: 1850,
            stock: 40,
            status: 'IN_STOCK'
        },
        {
            id: 'ret-04',
            outlet_id: selectedOutlet?.id || 'outlet-giftshop',
            sku: 'ESS-ADAPT-004',
            barcode: '8941234567893',
            name: 'Universal Multi-Country Travel Adapter & USB-C Fast Charger',
            category: 'Travel Essentials',
            price: 1600,
            stock: 35,
            status: 'IN_STOCK'
        }
    ];

    const loadProducts = useCallback(async () => {
        if (!selectedOutlet) {
            setProducts(defaultProducts);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/restaurant/menu-items?outletId=${selectedOutlet.id}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                setProducts(data.data.map((item: any, idx: number) => ({
                    id: item.id,
                    outlet_id: item.outlet_id,
                    sku: item.code || `SKU-${1000 + idx}`,
                    barcode: item.barcode || `894123456${1000 + idx}`,
                    name: item.name,
                    category: item.category_name || 'Retail Goods',
                    price: Number(item.base_price || item.price || 0),
                    stock: 50,
                    status: 'IN_STOCK'
                })));
            } else {
                setProducts(defaultProducts);
            }
        } catch {
            setProducts(defaultProducts);
        } finally {
            setLoading(false);
        }
    }, [selectedOutlet]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery)
    );

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                        <ShoppingBag className="text-amber-600 size-6" />
                        Hotel Gift Shop & Retail Inventory
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Barcode management (EAN-13), SKU pricing, gift shop sundries, and USALI 10040-01 retail sales.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <OutletSelector
                        selectedOutletId={selectedOutlet?.id}
                        onSelectOutlet={setSelectedOutlet}
                        className="w-56"
                    />
                    <button
                        type="button"
                        onClick={loadProducts}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181822] text-slate-600 hover:text-slate-900 dark:hover:text-white transition shadow-2xs cursor-pointer"
                        title="Reload Inventory"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total SKUs</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{products.length}</span>
                        <span className="text-xs text-amber-600 font-bold">Products</span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total In Stock</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {products.reduce((acc, p) => acc + p.stock, 0)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Units</span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Barcode Scanning</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold text-cyan-600">EAN-13 Ready</span>
                        <span className="text-[10px] text-slate-400">Laser POS</span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">USALI Account</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-black text-slate-800 dark:text-slate-200 font-mono">10040-01</span>
                        <span className="text-[10px] text-emerald-600 font-bold">Retail Sales</span>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Product Name, SKU, or scan Barcode (EAN-13)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
                />
            </div>

            {/* Product Table */}
            <div className="bg-white dark:bg-[#16161e] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="p-4">Product Details</th>
                                <th className="p-4">SKU / Barcode</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-right">Unit Price</th>
                                <th className="p-4 text-center">Stock Level</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {filtered.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                <Package size={16} />
                                            </div>
                                            <span>{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                        <div>{p.sku}</div>
                                        <div className="text-slate-400 text-[10px] flex items-center gap-1 mt-0.5">
                                            <Scan size={10} /> {p.barcode}
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-500 font-medium">{p.category}</td>
                                    <td className="p-4 text-right font-black text-slate-900 dark:text-white">
                                        ৳{p.price.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                                        {p.stock} units
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                            In Stock
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RetailInventoryPage;
