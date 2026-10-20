import React, { useState, useEffect } from 'react';
import {
    Coins,
    TrendingUp,
    Target,
    Percent,
    Plus,
    Trash2,
    Database,
    CheckCircle2,
    X,
    Receipt,
    RefreshCw,
    Edit2,
    Info
} from 'lucide-react';
import SecuritySettingsHubNav from './SecuritySettingsHubNav';

type TabType = 'currency' | 'source' | 'charges' | 'discounts' | 'revenue';

interface RevenueGroup {
    id: number;
    code: string;
    description: string;
    department: 'F&B' | 'Rooms' | 'Laundry' | 'Transport' | 'Other';
    glCode: string;
}

interface Currency {
    id: number;
    name: string;
    code: string;
    symbol: string;
    isBase: boolean;
    acceptPayment: boolean;
    denominations: string;
}

interface ExchangeRate {
    id: number;
    currencyCode: string;
    currencyName: string;
    buyingRate: string;
    sellingRate: string;
    effectiveDate: string;
    autoUpdate: boolean;
}

interface MarketCode {
    id: number;
    code: string;
    description: string;
    reportGroup: string;
}

interface BusinessSource {
    id: number;
    name: string;
    type: string;
    commission: string;
    active: boolean;
    linkedRatePlan: string;
}

interface ExtraCharge {
    id: number;
    name: string;
    code: string;
    price: string;
    rule: string;
    taxApplicable: boolean;
    serviceCharge: boolean;
    revenueLedger: string;
}

interface Discount {
    id: number;
    name: string;
    type: string;
    value: string;
    maxLimit: string;
    applicableOn: string[];
    requiresAuth: boolean;
    reasonRequired: boolean;
    active: boolean;
}

interface MasterDataConfigProps {
    initialTab?: TabType;
    onNavigate?: (page: string) => void;
}

export const MasterDataConfig: React.FC<MasterDataConfigProps> = ({
    initialTab = 'currency',
    onNavigate,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    // Currency States
    const [currencies, setCurrencies] = useState<Currency[]>([
        { id: 1, name: 'Bangladeshi Taka', code: 'BDT', symbol: '৳', isBase: true, acceptPayment: true, denominations: '1000, 500, 100, 50, 20, 10' },
        { id: 2, name: 'US Dollar', code: 'USD', symbol: '$', isBase: false, acceptPayment: true, denominations: '100, 50, 20, 10, 5, 1' },
        { id: 3, name: 'Euro', code: 'EUR', symbol: '€', isBase: false, acceptPayment: true, denominations: '500, 200, 100, 50, 20, 10' },
        { id: 4, name: 'British Pound', code: 'GBP', symbol: '£', isBase: false, acceptPayment: true, denominations: '50, 20, 10, 5' }
    ]);
    const [currencyForm, setCurrencyForm] = useState({ name: '', code: '', symbol: '', isBase: false, acceptPayment: true, denominations: '' });
    const [showCurrencyForm, setShowCurrencyForm] = useState(false);

    // Exchange Rate States
    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([
        { id: 1, currencyCode: 'USD', currencyName: 'US Dollar', buyingRate: '121.50', sellingRate: '123.00', effectiveDate: 'Today 09:00 AM', autoUpdate: true },
        { id: 2, currencyCode: 'EUR', currencyName: 'Euro', buyingRate: '131.20', sellingRate: '133.50', effectiveDate: 'Today 09:00 AM', autoUpdate: true },
        { id: 3, currencyCode: 'GBP', currencyName: 'British Pound', buyingRate: '154.10', sellingRate: '157.00', effectiveDate: 'Today 09:00 AM', autoUpdate: false }
    ]);
    const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);

    // Market Codes
    const [marketCodes, setMarketCodes] = useState<MarketCode[]>([
        { id: 1, code: 'CORP', description: 'Corporate Multinational Accounts', reportGroup: 'Commercial Transient' },
        { id: 2, code: 'OTA', description: 'Online Travel Agencies (Expedia, Booking.com)', reportGroup: 'Wholesale / OTA' },
        { id: 3, code: 'GRP', description: 'MICE & Group Conventions', reportGroup: 'Group / Banquet' },
        { id: 4, code: 'DIR', description: 'Direct Hotel Walk-in & Web Booking', reportGroup: 'Retail Direct' }
    ]);
    const [showMarketForm, setShowMarketForm] = useState(false);
    const [marketForm, setMarketForm] = useState({ code: '', description: '', reportGroup: 'Commercial Transient' });

    // Business Sources
    const [businessSources, setBusinessSources] = useState<BusinessSource[]>([
        { id: 1, name: 'Booking.com Direct XML', type: 'OTA', commission: '15%', active: true, linkedRatePlan: 'OTA Standard' },
        { id: 2, name: 'Official Hotel Web Engine', type: 'Direct Web', commission: '0%', active: true, linkedRatePlan: 'Best Available Rate (BAR)' },
        { id: 3, name: 'Standard Chartered Corporate', type: 'Corporate', commission: '0%', active: true, linkedRatePlan: 'Negotiated Corp-A' },
        { id: 4, name: 'Agoda YCS v4', type: 'OTA', commission: '18%', active: true, linkedRatePlan: 'OTA Standard' }
    ]);
    const [showSourceForm, setShowSourceForm] = useState(false);
    const [sourceForm, setSourceForm] = useState({ name: '', type: 'OTA', commission: '15%', linkedRatePlan: 'BAR' });

    // Extra Charges
    const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([
        { id: 1, name: 'VIP Airport Limousine Transfer', code: 'TRN-LIMO', price: '3,500', rule: 'Flat Amount', taxApplicable: true, serviceCharge: false, revenueLedger: '40030 - Transport Revenue' },
        { id: 2, name: 'Rollaway Extra Bed & Bedding', code: 'HSK-EXBED', price: '2,500', rule: 'Per Night', taxApplicable: true, serviceCharge: true, revenueLedger: '10020 - Room Extra Revenue' },
        { id: 3, name: 'Early Morning Check-In (06:00-10:00)', code: 'FO-EARLY', price: '50%', rule: 'Room Rate %', taxApplicable: true, serviceCharge: false, revenueLedger: '10010 - Room Tariff' },
        { id: 4, name: 'High-Speed Business Dedicated Internet', code: 'IT-FIBER', price: '800', rule: 'Per 24h', taxApplicable: true, serviceCharge: false, revenueLedger: '60040 - Guest IT Revenue' }
    ]);
    const [chargeForm, setChargeForm] = useState({ name: '', code: '', price: '', rule: 'Flat Amount', taxApplicable: true, serviceCharge: false, revenueLedger: '10020 - Room Extra Revenue' });
    const [showChargeForm, setShowChargeForm] = useState(false);

    // Discounts
    const [discounts, setDiscounts] = useState<Discount[]>([
        { id: 1, name: 'Staff & Family Meal Allowance', type: 'Percentage (%)', value: '100%', maxLimit: '5000', applicableOn: ['Food', 'Beverage'], requiresAuth: false, reasonRequired: false, active: true },
        { id: 2, name: 'Manager Goodwill Courtesy Rebate', type: 'Percentage (%)', value: '25%', maxLimit: '15000', applicableOn: ['Room Rent', 'Food', 'Beverage'], requiresAuth: true, reasonRequired: true, active: true },
        { id: 3, name: 'Happy Hour Beverage Promotion', type: 'Percentage (%)', value: '20%', maxLimit: '4000', applicableOn: ['Beverage'], requiresAuth: false, reasonRequired: false, active: true }
    ]);

    // Revenue Groups (GL Mapped)
    const [revenueGroups, setRevenueGroups] = useState<RevenueGroup[]>([
        { id: 1, code: 'REV-ROOM-FIT', description: 'Transient & Suite Room Revenue', department: 'Rooms', glCode: '10010' },
        { id: 2, code: 'REV-FB-DINE', description: 'Restaurant, Bar & Room Service Dining', department: 'F&B', glCode: '20010' },
        { id: 3, code: 'REV-LND-VALET', description: 'Guest Valet & Dry Cleaning Service', department: 'Laundry', glCode: '30010' },
        { id: 4, code: 'REV-TRN-FLEET', description: 'Airport Transfers & Chauffeur Services', department: 'Transport', glCode: '40010' },
        { id: 5, code: 'REV-SPA-WELL', description: 'Luxury Spa & Wellness Treatments', department: 'Other', glCode: '50010' }
    ]);
    const [showRevenueForm, setShowRevenueForm] = useState(false);
    const [revenueForm, setRevenueForm] = useState({ code: '', description: '', department: 'Rooms' as const, glCode: '' });

    // Handlers
    const handleAddCurrency = () => {
        if (!currencyForm.name || !currencyForm.code) return;
        const newCurr: Currency = {
            id: Date.now(),
            ...currencyForm
        };
        setCurrencies([...currencies, newCurr]);
        setCurrencyForm({ name: '', code: '', symbol: '', isBase: false, acceptPayment: true, denominations: '' });
        setShowCurrencyForm(false);
        showToast(`Currency ${newCurr.code} added successfully.`);
    };

    const handleUpdateRate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingRate) return;
        const formData = new FormData(e.currentTarget);
        const buyingRate = formData.get('buyingRate') as string;
        const sellingRate = formData.get('sellingRate') as string;
        const autoUpdate = formData.get('autoUpdate') === 'on';

        setExchangeRates(prev =>
            prev.map(r =>
                r.id === editingRate.id
                    ? { ...r, buyingRate, sellingRate, autoUpdate, effectiveDate: 'Just updated' }
                    : r
            )
        );
        showToast(`Exchange rate for ${editingRate.currencyCode} updated.`);
        setEditingRate(null);
    };

    const handleAddMarketCode = () => {
        if (!marketForm.code || !marketForm.description) return;
        const newMarket: MarketCode = {
            id: Date.now(),
            ...marketForm
        };
        setMarketCodes([...marketCodes, newMarket]);
        setMarketForm({ code: '', description: '', reportGroup: 'Commercial Transient' });
        setShowMarketForm(false);
        showToast(`Market code "${newMarket.code}" created.`);
    };

    const handleAddSource = () => {
        if (!sourceForm.name) return;
        const newSrc: BusinessSource = {
            id: Date.now(),
            name: sourceForm.name,
            type: sourceForm.type,
            commission: sourceForm.commission,
            linkedRatePlan: sourceForm.linkedRatePlan,
            active: true
        };
        setBusinessSources([...businessSources, newSrc]);
        setSourceForm({ name: '', type: 'OTA', commission: '15%', linkedRatePlan: 'BAR' });
        setShowSourceForm(false);
        showToast(`Business source "${newSrc.name}" registered.`);
    };

    const handleAddCharge = () => {
        if (!chargeForm.name || !chargeForm.code) return;
        const newCharge: ExtraCharge = {
            id: Date.now(),
            ...chargeForm
        };
        setExtraCharges([...extraCharges, newCharge]);
        setChargeForm({ name: '', code: '', price: '', rule: 'Flat Amount', taxApplicable: true, serviceCharge: false, revenueLedger: '10020 - Room Extra Revenue' });
        setShowChargeForm(false);
        showToast(`Extra Charge ${newCharge.name} registered.`);
    };

    const handleDeleteCharge = (id: number) => {
        setExtraCharges(extraCharges.filter(c => c.id !== id));
        showToast('Charge deleted.');
    };

    const toggleDiscountActive = (id: number) => {
        setDiscounts(discounts.map(d => d.id === id ? { ...d, active: !d.active } : d));
    };

    const handleAddRevenueGroup = () => {
        if (!revenueForm.code || !revenueForm.description || !revenueForm.glCode) return;
        const newRev: RevenueGroup = {
            id: Date.now(),
            code: revenueForm.code,
            description: revenueForm.description,
            department: revenueForm.department,
            glCode: revenueForm.glCode
        };
        setRevenueGroups([...revenueGroups, newRev]);
        setRevenueForm({ code: '', description: '', department: 'Rooms', glCode: '' });
        setShowRevenueForm(false);
        showToast(`Revenue group "${newRev.code}" linked to GL ${newRev.glCode}.`);
    };

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans text-gray-800">
            {/* Top Suite Hub Navigation Bar */}
            <SecuritySettingsHubNav activeHub="master-data" onNavigate={onNavigate} />

            {/* Informative Micro-guide for Finance & Revenue Operations */}
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-3 rounded-xl border border-blue-200/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold shadow-2xs">
                        <Info size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">Hotel Master Data & GL Chart of Accounts Mapping</span>
                            <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">Financial Backbone</span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                            এখানে বৈদেশিক মুদ্রার বিনিময় হার (FX Rates), মার্কেট সেগমেন্ট কোড, ফোলিও চার্জেস এবং চার্ট অব একাউন্টস (GL Code) একীভূতভাবে পরিচালিত হয়।
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-600 flex-shrink-0 font-medium">
                    <span className="inline-flex items-center gap-1 text-blue-700 bg-white px-2 py-1 rounded-md border border-blue-200 shadow-2xs">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        <span>GL Auto-Reconciliation</span>
                    </span>
                </div>
            </div>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[120] bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 border border-gray-700">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Elevated Header Card */}
            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/80 flex items-center justify-center text-blue-700 font-bold text-sm shadow-2xs flex-shrink-0">
                            <Database size={22} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight truncate">
                                    Master Data & Financial Configuration
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 flex-shrink-0">
                                    ERP Core Master
                                </span>
                                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    GL Ledger Mapped
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1 font-medium">
                                <span className="flex items-center gap-1">
                                    <Coins size={11} className="text-gray-400" />
                                    <span>Base: BDT (৳) + {currencies.length - 1} Foreign Currencies</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Target size={11} className="text-gray-400" />
                                    <span>{marketCodes.length} Market Codes</span>
                                </span>
                                <span className="hidden sm:flex items-center gap-1">
                                    <Receipt size={11} className="text-gray-400" />
                                    <span>{extraCharges.length} Extra Folio Add-ons</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowCurrencyForm(true)}
                            className="h-7 px-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus size={12} className="text-blue-600" />
                            <span>+ Currency</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowChargeForm(true)}
                            className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus size={13} />
                            <span>+ Add Charge</span>
                        </button>
                    </div>
                </div>

                {/* Segmented Navigation Tabs */}
                <div className="px-3 sm:px-4 py-2 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        {[
                            { id: 'currency', label: 'Currencies & FX Rates', icon: Coins, count: currencies.length },
                            { id: 'source', label: 'Market Codes & Business Sources', icon: Target, count: businessSources.length },
                            { id: 'charges', label: 'Extra Charges & Add-ons', icon: Receipt, count: extraCharges.length },
                            { id: 'discounts', label: 'Global Discounts & Rebates', icon: Percent, count: discounts.length },
                            { id: 'revenue', label: 'Revenue Groups & GL Ledger', icon: TrendingUp, count: revenueGroups.length },
                        ].map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id as TabType)}
                                className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === t.id
                                    ? 'bg-white text-blue-700 shadow-2xs border border-gray-200 font-bold'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                    }`}
                            >
                                <t.icon size={13} />
                                <span>{t.label}</span>
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                    {t.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* TAB 1: CURRENCY & FX RATES */}
            {activeTab === 'currency' && (
                <div className="space-y-3">
                    {/* User-friendly Explanatory Callout */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
                        <Info size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">How Hotel Currency & Exchange Rates Work:</span>
                            <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                                <strong>Base Currency:</strong> All hotel accounts, room tariffs, and night audit balances are kept in <strong>Bangladeshi Taka (BDT ৳)</strong>. 
                                Foreign currencies allow front desk receptionists to accept payments from international guests in USD, EUR, or GBP, which the PMS automatically converts to BDT using your live buying rate.
                            </p>
                        </div>
                    </div>

                    {/* Add Currency Drawer */}
                    {showCurrencyForm && (
                        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                    <Coins size={14} className="text-blue-600" />
                                    <span>Register New Settlement Currency</span>
                                </h3>
                                <button type="button" onClick={() => setShowCurrencyForm(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={15} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Currency Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Australian Dollar"
                                        value={currencyForm.name}
                                        onChange={e => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Currency Code *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. AUD"
                                        value={currencyForm.code}
                                        onChange={e => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Symbol</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. A$"
                                        value={currencyForm.symbol}
                                        onChange={e => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-bold"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCurrencyForm(false)}
                                    className="h-7 px-3 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddCurrency}
                                    className="h-7 px-3 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                                >
                                    Save Currency
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Currencies Table */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                Accepted Hotel Settlement Currencies
                            </h3>
                            <span className="text-[11px] text-gray-400">Operating Base Currency: BDT (৳)</span>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-2">Currency Name</th>
                                        <th className="px-3 py-2">ISO Code</th>
                                        <th className="px-3 py-2">Symbol</th>
                                        <th className="px-3 py-2">Role in Ledger</th>
                                        <th className="px-3 py-2">Front Desk Status</th>
                                        <th className="px-3 py-2">Standard Banknotes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {currencies.map(c => (
                                        <tr key={c.id} className="hover:bg-blue-50/20">
                                            <td className="px-3 py-2 font-semibold text-gray-800">{c.name}</td>
                                            <td className="px-3 py-2 font-mono font-bold text-gray-900">{c.code}</td>
                                            <td className="px-3 py-2 font-bold text-blue-600 text-sm">{c.symbol}</td>
                                            <td className="px-3 py-2">
                                                {c.isBase ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        Primary Base Currency (All Accounts)
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 text-[11px]">Secondary Settlement FX</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                    Payment Accepted at Desk
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 font-mono text-[11px] text-gray-400">{c.denominations}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Exchange Rates Live Board */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <TrendingUp size={14} className="text-emerald-600" />
                                    <span>Front Desk FX Currency Board (Exchange Rates vs BDT)</span>
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Buying Rate: How much BDT the hotel gives for 1 unit of foreign currency. Selling Rate: Rate for foreign folio billing.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => showToast('Exchange rates synced with Bangladesh Bank official feed.')}
                                className="h-6 px-2 text-[11px] bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded font-semibold flex items-center gap-1 cursor-pointer"
                            >
                                <RefreshCw size={11} /> Sync Rates
                            </button>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-2">Currency Pair</th>
                                        <th className="px-3 py-2">Buying Rate (Guest pays FX)</th>
                                        <th className="px-3 py-2">Selling Rate (Hotel sells FX)</th>
                                        <th className="px-3 py-2">Effective Timestamp</th>
                                        <th className="px-3 py-2">Auto-Feed</th>
                                        <th className="px-3 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {exchangeRates.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50/50">
                                            <td className="px-3 py-2 font-bold text-gray-900">
                                                {r.currencyCode} / BDT <span className="font-normal text-gray-400 text-[11px]">({r.currencyName})</span>
                                            </td>
                                            <td className="px-3 py-2 font-mono font-bold text-emerald-700">৳ {r.buyingRate}</td>
                                            <td className="px-3 py-2 font-mono font-bold text-blue-700">৳ {r.sellingRate}</td>
                                            <td className="px-3 py-2 font-mono text-gray-500 text-[11px]">{r.effectiveDate}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${r.autoUpdate ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                                                    {r.autoUpdate ? 'Live API Feed' : 'Manual Lock'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingRate(r)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                    title="Adjust FX Rate"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Edit Exchange Rate Modal */}
                    {editingRate && (
                        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 space-y-3 text-xs border border-gray-200">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h3 className="font-bold text-gray-900">Edit FX Rate for {editingRate.currencyCode}</h3>
                                    <button type="button" onClick={() => setEditingRate(null)} className="text-gray-400">
                                        <X size={15} />
                                    </button>
                                </div>
                                <form onSubmit={handleUpdateRate} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Buying Rate (BDT given to guest for 1 {editingRate.currencyCode})</label>
                                        <input
                                            type="text"
                                            name="buyingRate"
                                            required
                                            defaultValue={editingRate.buyingRate}
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Selling Rate (BDT charged to guest for 1 {editingRate.currencyCode})</label>
                                        <input
                                            type="text"
                                            name="sellingRate"
                                            required
                                            defaultValue={editingRate.sellingRate}
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                                        <input
                                            type="checkbox"
                                            name="autoUpdate"
                                            defaultChecked={editingRate.autoUpdate}
                                            className="w-4 h-4 accent-blue-600 rounded"
                                        />
                                        <span className="font-semibold text-gray-700">Allow Live API Feed to Auto-Update this Rate Daily</span>
                                    </label>
                                    <div className="flex justify-end gap-2 pt-2 border-t">
                                        <button type="button" onClick={() => setEditingRate(null)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold">
                                            Cancel
                                        </button>
                                        <button type="submit" className="h-7 px-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                                            Save Rate
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: MARKET CODES & BUSINESS SOURCES */}
            {activeTab === 'source' && (
                <div className="space-y-3">
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
                        <Info size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">USALI Hotel Market Segmentation:</span>
                            <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                                Market codes track <em>why</em> the guest is staying (Corporate business vs Leisure vacation), while Business Sources track <em>where</em> the booking came from (Booking.com, Walk-in, Direct Website).
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Market Codes Card */}
                        <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Market Segmentation Codes</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowMarketForm(true)}
                                    className="h-6 px-2 text-[10.5px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold cursor-pointer"
                                >
                                    + Add Code
                                </button>
                            </div>

                            {showMarketForm && (
                                <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Code (e.g. WED)"
                                            value={marketForm.code}
                                            onChange={e => setMarketForm({ ...marketForm, code: e.target.value.toUpperCase() })}
                                            className="h-7 px-2 border rounded font-mono font-bold"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Description (e.g. Wedding Events)"
                                            value={marketForm.description}
                                            onChange={e => setMarketForm({ ...marketForm, description: e.target.value })}
                                            className="h-7 px-2 border rounded"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setShowMarketForm(false)} className="h-6 px-2 border rounded text-gray-600">Cancel</button>
                                        <button type="button" onClick={handleAddMarketCode} className="h-6 px-2 bg-blue-600 text-white rounded font-semibold">Save</button>
                                    </div>
                                </div>
                            )}

                            <div className="divide-y divide-gray-100 text-xs">
                                {marketCodes.map(m => (
                                    <div key={m.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                                                    {m.code}
                                                </span>
                                                <span className="font-bold text-gray-800">{m.description}</span>
                                            </div>
                                            <span className="text-[10.5px] text-gray-400 block mt-0.5">{m.reportGroup}</span>
                                        </div>
                                        <span className="text-[10px] text-emerald-600 font-bold uppercase">Active</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Business Sources Card */}
                        <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Business Origin & OTA Channels</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowSourceForm(true)}
                                    className="h-6 px-2 text-[10.5px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold cursor-pointer"
                                >
                                    + Add Source
                                </button>
                            </div>

                            {showSourceForm && (
                                <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-2 text-xs">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Source Name (e.g. Trip.com)"
                                            value={sourceForm.name}
                                            onChange={e => setSourceForm({ ...sourceForm, name: e.target.value })}
                                            className="h-7 px-2 border rounded"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Commission (e.g. 15%)"
                                            value={sourceForm.commission}
                                            onChange={e => setSourceForm({ ...sourceForm, commission: e.target.value })}
                                            className="h-7 px-2 border rounded"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setShowSourceForm(false)} className="h-6 px-2 border rounded text-gray-600">Cancel</button>
                                        <button type="button" onClick={handleAddSource} className="h-6 px-2 bg-blue-600 text-white rounded font-semibold">Save</button>
                                    </div>
                                </div>
                            )}

                            <div className="divide-y divide-gray-100 text-xs">
                                {businessSources.map(s => (
                                    <div key={s.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                        <div>
                                            <div className="font-bold text-gray-900">{s.name}</div>
                                            <div className="text-[10.5px] text-gray-500 mt-0.5">
                                                Channel: <strong>{s.type}</strong> • Comm: <strong className="text-rose-600">{s.commission}</strong> • Rate: {s.linkedRatePlan}
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            2-Way Live
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: EXTRA CHARGES & ADD-ONS */}
            {activeTab === 'charges' && (
                <div className="space-y-3">
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
                        <Info size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Front Desk Folio Add-on Services:</span>
                            <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                                Extra charges allow receptionists to quickly bill common guest requests (airport transfers, rollaway beds, extra breakfast, early check-in fees) directly to the guest folio with pre-configured tax & GL accounting.
                            </p>
                        </div>
                    </div>

                    {showChargeForm && (
                        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs space-y-3 text-xs">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
                                    <Receipt size={14} className="text-blue-600" />
                                    <span>Create New Extra Folio Charge Code</span>
                                </h3>
                                <button type="button" onClick={() => setShowChargeForm(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={15} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Charge Title *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Airport Limousine Drop"
                                        value={chargeForm.name}
                                        onChange={e => setChargeForm({ ...chargeForm, name: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Charge Code *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. TRN-AIRDROP"
                                        value={chargeForm.code}
                                        onChange={e => setChargeForm({ ...chargeForm, code: e.target.value.toUpperCase() })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Price / Tariff (৳ or %)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2,000"
                                        value={chargeForm.price}
                                        onChange={e => setChargeForm({ ...chargeForm, price: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Calculation Rule</label>
                                    <select
                                        value={chargeForm.rule}
                                        onChange={e => setChargeForm({ ...chargeForm, rule: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer"
                                    >
                                        <option value="Flat Amount">Flat Amount</option>
                                        <option value="Per Night">Per Night</option>
                                        <option value="Room Rate %">Room Rate %</option>
                                        <option value="Per Person">Per Person</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setShowChargeForm(false)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="button" onClick={handleAddCharge} className="h-7 px-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                                    Save Charge
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                        {extraCharges.map(charge => (
                            <div
                                key={charge.id}
                                className="bg-white p-3.5 rounded-xl border border-gray-200/90 shadow-2xs hover:border-blue-200 transition-all flex flex-col justify-between space-y-2 group relative"
                            >
                                <button
                                    type="button"
                                    onClick={() => handleDeleteCharge(charge.id)}
                                    className="absolute top-2 right-2 p-1 text-gray-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                >
                                    <Trash2 size={13} />
                                </button>
                                <div>
                                    <span className="font-mono text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                        {charge.code}
                                    </span>
                                    <h4 className="font-bold text-gray-900 mt-1">{charge.name}</h4>
                                    <div className="text-[10px] text-gray-400 mt-0.5">{charge.revenueLedger}</div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <span className="font-bold text-gray-900 text-sm">৳ {charge.price}</span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                                        {charge.rule}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 4: DISCOUNTS & REBATES */}
            {activeTab === 'discounts' && (
                <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden text-xs">
                    <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Percent size={14} className="text-blue-600" />
                                <span>Standard Pre-configured Discount Policies</span>
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Staff can only apply discounts up to their role's authorized threshold without supervisor PIN.
                            </p>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {discounts.map(disc => (
                            <div key={disc.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                                        %
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{disc.name}</div>
                                        <div className="text-[10.5px] text-gray-500 mt-0.5">
                                            Value: <strong className="text-blue-700">{disc.value}</strong> • Applicable: {disc.applicableOn.join(', ')} • Max Limit: ৳ {disc.maxLimit}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {disc.requiresAuth && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                            Manager PIN Required
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => toggleDiscountActive(disc.id)}
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${disc.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}
                                    >
                                        {disc.active ? 'Active' : 'Inactive'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 5: REVENUE GROUPS & GL CODES */}
            {activeTab === 'revenue' && (
                <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden text-xs">
                    <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-emerald-600" />
                                <span>Revenue Centers & General Ledger (GL) Code Mappings</span>
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Links room charges, restaurant bills, and laundry vouchers directly to your external accounting chart of accounts.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowRevenueForm(true)}
                            className="h-6 px-2 text-[10.5px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold cursor-pointer"
                        >
                            + Add Revenue Group
                        </button>
                    </div>

                    {showRevenueForm && (
                        <div className="p-3 bg-gray-50 border-b border-gray-200 space-y-2 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                <input
                                    type="text"
                                    placeholder="Code (e.g. REV-BANQ)"
                                    value={revenueForm.code}
                                    onChange={e => setRevenueForm({ ...revenueForm, code: e.target.value.toUpperCase() })}
                                    className="h-7 px-2 border rounded font-mono font-bold"
                                />
                                <input
                                    type="text"
                                    placeholder="Description (e.g. Banquet Hall Hire)"
                                    value={revenueForm.description}
                                    onChange={e => setRevenueForm({ ...revenueForm, description: e.target.value })}
                                    className="h-7 px-2 border rounded"
                                />
                                <select
                                    value={revenueForm.department}
                                    onChange={e => setRevenueForm({ ...revenueForm, department: e.target.value as any })}
                                    className="h-7 px-2 border rounded bg-white"
                                >
                                    <option value="Rooms">Rooms</option>
                                    <option value="F&B">F&B</option>
                                    <option value="Laundry">Laundry</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Other">Other</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="GL Code (e.g. 70010)"
                                    value={revenueForm.glCode}
                                    onChange={e => setRevenueForm({ ...revenueForm, glCode: e.target.value })}
                                    className="h-7 px-2 border rounded font-mono font-bold"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowRevenueForm(false)} className="h-6 px-2 border rounded text-gray-600">Cancel</button>
                                <button type="button" onClick={handleAddRevenueGroup} className="h-6 px-2 bg-blue-600 text-white rounded font-semibold">Save GL Mapping</button>
                            </div>
                        </div>
                    )}

                    <div className="divide-y divide-gray-100">
                        {revenueGroups.map(group => (
                            <div key={group.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <span className="w-16 h-6 rounded bg-gray-100 text-gray-700 font-bold text-[10px] flex items-center justify-center uppercase font-mono">
                                        {group.department}
                                    </span>
                                    <div>
                                        <div className="font-bold text-gray-900">{group.description}</div>
                                        <span className="font-mono text-[10.5px] text-gray-400 font-semibold">{group.code}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        GL: {group.glCode}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterDataConfig;
