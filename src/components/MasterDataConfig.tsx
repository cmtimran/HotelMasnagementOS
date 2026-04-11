import { useState, useEffect } from 'react';
import {
    Coins,
    Globe,
    TrendingUp,
    Target,
    Users,
    Truck,
    Percent,
    Plus,
    ArrowLeft,
    Save,
    Tag,
    AlertCircle,
    Edit,
    Trash2
} from 'lucide-react';

type TabType = 'currency' | 'source' | 'charges' | 'discounts' | 'revenue';

interface RevenueGroup {
    id: number;
    code: string;
    description: string;
    department: 'F&B' | 'Rooms' | 'Laundry' | 'Transport' | 'Other';
    glCode: string; // General Ledger Code
}


interface Currency {
    id: number;
    name: string;
    code: string;
    symbol: string;
    isBase: boolean;
    acceptPayment: boolean;
    denominations: string; // e.g., "100, 50, 20, 10"
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

interface CorporateAgent {
    id: number;
    name: string;
    contact: string;
    creditLimit: string;
    paymentTerm: string;
    contractRates: string;
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
    applicableOn: string[]; // ['Room Rent', 'Food', 'Beverage', 'Other Services']
    requiresAuth: boolean;
    reasonRequired: boolean;
    active: boolean;
}

const MasterDataConfig = ({ initialTab = 'currency' }: { initialTab?: TabType }) => {
    const [activeTab, setActiveTab] = useState<TabType>(initialTab);

    // Currency States
    const [currencies, setCurrencies] = useState<Currency[]>([
        { id: 1, name: 'Bangladeshi Taka', code: 'BDT', symbol: '৳', isBase: true, acceptPayment: true, denominations: '1000, 500, 100, 50, 20, 10' },
        { id: 2, name: 'US Dollar', code: 'USD', symbol: '$', isBase: false, acceptPayment: true, denominations: '100, 50, 20, 10, 5, 1' }
    ]);
    const [currencyForm, setCurrencyForm] = useState({ name: '', code: '', symbol: '', isBase: false, acceptPayment: false, denominations: '' });
    const [showCurrencyForm, setShowCurrencyForm] = useState(false);

    // Exchange Rate States
    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([
        { id: 1, currencyCode: 'USD', currencyName: 'US Dollar', buyingRate: '110.00', sellingRate: '112.50', effectiveDate: '2026-01-16 09:00', autoUpdate: false },
        { id: 2, currencyCode: 'EUR', currencyName: 'Euro', buyingRate: '120.40', sellingRate: '123.00', effectiveDate: '2026-01-16 09:00', autoUpdate: true },
        { id: 3, currencyCode: 'GBP', currencyName: 'British Pound', buyingRate: '140.10', sellingRate: '144.00', effectiveDate: '2026-01-15 17:30', autoUpdate: false }
    ]);
    const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);

    // Market Code States
    const [marketCodes, setMarketCodes] = useState<MarketCode[]>([
        { id: 1, code: 'CORP', description: 'Corporate Accounts', reportGroup: 'Transient View' },
        { id: 2, code: 'OTA', description: 'Online Travel Agents', reportGroup: 'Transient View' },
        { id: 3, code: 'GRP', description: 'Group Bookings', reportGroup: 'Group / Event' }
    ]);
    const [marketForm, setMarketForm] = useState({ code: '', description: '', reportGroup: 'Transient View' });

    // Business Source States
    const [businessSources, setBusinessSources] = useState<BusinessSource[]>([
        { id: 1, name: 'Booking.com', type: 'OTA', commission: '15%', active: true, linkedRatePlan: 'OTA Rate' },
        { id: 2, name: 'Direct Website', type: 'Website', commission: '0%', active: true, linkedRatePlan: 'BAR' },
        { id: 3, name: 'Grameenphone', type: 'Corporate', commission: '0%', active: true, linkedRatePlan: 'Corp Rate' },
        { id: 4, name: 'Expedia', type: 'OTA', commission: '18%', active: false, linkedRatePlan: 'OTA Rate' }
    ]);
    const [sourceForm, setSourceForm] = useState({ name: '', type: 'OTA', commission: '0', linkedRatePlan: 'BAR' });
    const [showSourceForm, setShowSourceForm] = useState(false);

    // Corporate Agent States
    const [corporateAgents, setCorporateAgents] = useState<CorporateAgent[]>([
        { id: 1, name: 'Unilever Bangladesh', contact: 'HR / Admin', creditLimit: '৳ 5,00,000', paymentTerm: 'Net 30', contractRates: 'Negotiated Rate A' },
        { id: 2, name: 'Grameenphone Ltd', contact: 'Business Dev', creditLimit: '৳ 10,00,000', paymentTerm: 'Net 15', contractRates: 'Corporate Rate B' }
    ]);
    const [agentForm, setAgentForm] = useState({ name: '', contact: '', creditLimit: '', paymentTerm: 'Net 30', contractRates: '' });
    const [showAgentForm, setShowAgentForm] = useState(false);

    // Extra Charge States
    const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([
        { id: 1, name: 'Airport Pickup', code: 'TRN-01', price: '1,500', rule: 'Flat Amount', taxApplicable: true, serviceCharge: false, revenueLedger: 'Transport Income' },
        { id: 2, name: 'Extra Bed', code: 'HSK-EB', price: '2,500', rule: 'Per Night', taxApplicable: true, serviceCharge: true, revenueLedger: 'Room Service' },
        { id: 3, name: 'Early Check-in', code: 'FO-ECI', price: '25%', rule: 'Room Rate %', taxApplicable: false, serviceCharge: false, revenueLedger: 'Room Revenue' }
    ]);
    const [chargeForm, setChargeForm] = useState({ name: '', code: '', price: '', rule: 'Flat Amount', taxApplicable: false, serviceCharge: false, revenueLedger: 'Other Income' });
    const [showChargeForm, setShowChargeForm] = useState(false);

    // Discount States
    const [discounts, setDiscounts] = useState<Discount[]>([
        { id: 1, name: 'Staff Meal', type: 'Percentage (%)', value: '100', maxLimit: '5000', applicableOn: ['Food', 'Beverage'], requiresAuth: false, reasonRequired: false, active: true },
        { id: 2, name: 'Manager Discount', type: 'Percentage (%)', value: '20', maxLimit: '10000', applicableOn: ['Room Rent', 'Food', 'Beverage'], requiresAuth: true, reasonRequired: true, active: true },
        { id: 3, name: 'Happy Hour', type: 'Percentage (%)', value: '15', maxLimit: '3000', applicableOn: ['Beverage'], requiresAuth: false, reasonRequired: false, active: false }
    ]);
    const [discountForm, setDiscountForm] = useState({ name: '', type: 'Percentage (%)', value: '', requiresAuth: false, reasonRequired: false, maxLimit: '2000', applicableOn: [] as string[] });
    const [showDiscountForm, setShowDiscountForm] = useState(false);

    // Revenue States
    const [revenueGroups] = useState<RevenueGroup[]>([
        { id: 1, code: 'REV-FB-BRK', description: 'Breakfast Sales', department: 'F&B', glCode: '40010' },
        { id: 2, code: 'REV-ROOM-FIT', description: 'Room Rent - Transient', department: 'Rooms', glCode: '10010' },
        { id: 3, code: 'REV-TRANS-GUEST', description: 'Guest Transportation', department: 'Transport', glCode: '50020' },
        { id: 4, code: 'REV-LND-VALET', description: 'Valet Laundry Service', department: 'Laundry', glCode: '60010' }
    ]);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const tabs = [
        { id: 'currency', label: 'Multi-Currency', icon: <Coins size={18} /> },
        { id: 'source', label: 'Source & Market', icon: <Target size={18} /> },
        { id: 'charges', label: 'Extra Charges', icon: <Plus size={18} /> },
        { id: 'discounts', label: 'Global Discounts', icon: <Percent size={18} /> },
        { id: 'revenue', label: 'Finance & Revenue', icon: <TrendingUp size={18} /> },
    ];

    // Currency Handlers
    const handleAddCurrency = () => {
        if (!currencyForm.name || !currencyForm.code) return;
        const newCurrency: Currency = {
            id: Date.now(),
            ...currencyForm
        };
        setCurrencies([...currencies, newCurrency]);
        setCurrencyForm({ name: '', code: '', symbol: '', isBase: false, acceptPayment: false, denominations: '' });
        setShowCurrencyForm(false);
    };

    const handleDeleteCurrency = (id: number) => {
        setCurrencies(currencies.filter(c => c.id !== id));
    };

    // Exchange Rate Handlers
    const handleUpdateRate = (rate: ExchangeRate) => {
        setExchangeRates(exchangeRates.map(r => r.id === rate.id ? rate : r));
        setEditingRate(null);
    };

    // Market Code Handlers
    const handleAddMarketCode = () => {
        if (!marketForm.code) return;
        const newMarket: MarketCode = {
            id: Date.now(),
            ...marketForm
        };
        setMarketCodes([...marketCodes, newMarket]);
        setMarketForm({ code: '', description: '', reportGroup: 'Transient View' });
    };

    const handleDeleteMarketCode = (id: number) => {
        setMarketCodes(marketCodes.filter(m => m.id !== id));
    };

    // Business Source Handlers
    const toggleSourceActive = (id: number) => {
        setBusinessSources(businessSources.map(s => s.id === id ? { ...s, active: !s.active } : s));
    };

    const handleAddSource = () => {
        if (!sourceForm.name) return;
        const newSource: BusinessSource = {
            id: Date.now(),
            name: sourceForm.name,
            type: sourceForm.type,
            commission: sourceForm.commission + '%',
            linkedRatePlan: sourceForm.linkedRatePlan,
            active: true
        };
        setBusinessSources([...businessSources, newSource]);
        setSourceForm({ name: '', type: 'OTA', commission: '0', linkedRatePlan: 'BAR' });
        setShowSourceForm(false);
    };

    const handleDeleteSource = (id: number) => {
        setBusinessSources(businessSources.filter(s => s.id !== id));
    };

    // Corporate Agent Handlers
    const handleAddAgent = () => {
        if (!agentForm.name) return;
        const newAgent: CorporateAgent = {
            id: Date.now(),
            ...agentForm
        };
        setCorporateAgents([...corporateAgents, newAgent]);
        setAgentForm({ name: '', contact: '', creditLimit: '', paymentTerm: 'Net 30', contractRates: '' });
        setShowAgentForm(false);
    };

    const handleDeleteAgent = (id: number) => {
        setCorporateAgents(corporateAgents.filter(a => a.id !== id));
    };

    // Extra Charge Handlers
    const handleAddCharge = () => {
        if (!chargeForm.name || !chargeForm.code) return;
        const newCharge: ExtraCharge = {
            id: Date.now(),
            ...chargeForm
        };
        setExtraCharges([...extraCharges, newCharge]);
        setChargeForm({ name: '', code: '', price: '', rule: 'Flat Amount', taxApplicable: false, serviceCharge: false, revenueLedger: 'Other Income' });
        setShowChargeForm(false);
    };

    const handleDeleteCharge = (id: number) => {
        setExtraCharges(extraCharges.filter(c => c.id !== id));
    };

    // Discount Handlers
    const handleAddDiscount = () => {
        if (!discountForm.name || !discountForm.value) return;
        const newDiscount: Discount = {
            id: Date.now(),
            name: discountForm.name,
            type: discountForm.type,
            value: discountForm.value,
            maxLimit: discountForm.maxLimit,
            applicableOn: discountForm.applicableOn,
            requiresAuth: discountForm.requiresAuth,
            reasonRequired: discountForm.reasonRequired,
            active: true
        };
        setDiscounts([...discounts, newDiscount]);
        setDiscountForm({ name: '', type: 'Percentage (%)', value: '', requiresAuth: false, reasonRequired: false, maxLimit: '2000', applicableOn: [] as string[] });
        setShowDiscountForm(false);
    };

    const toggleDiscountActive = (id: number) => {
        setDiscounts(discounts.map(d => d.id === id ? { ...d, active: !d.active } : d));
    };

    const handleDeleteDiscount = (id: number) => {
        setDiscounts(discounts.filter(d => d.id !== id));
    };

    const renderCurrencyTab = () => (
        <div className="space-y-6">
            {/* Currency Setup section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Currency Setup</h3>
                        <p className="text-gray-500 text-xs mt-1">One-time configuration for accepted payment currencies.</p>
                    </div>
                    <button
                        onClick={() => setShowCurrencyForm(!showCurrencyForm)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-sm font-medium"
                    >
                        <Plus size={18} /> Add Currency
                    </button>
                </div>

                {showCurrencyForm && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Currency Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. US Dollar"
                                    value={currencyForm.name}
                                    onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Currency Code *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. USD"
                                    value={currencyForm.code}
                                    onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Symbol</label>
                                <input
                                    type="text"
                                    placeholder="e.g. $"
                                    value={currencyForm.symbol}
                                    onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={currencyForm.isBase}
                                    onChange={(e) => setCurrencyForm({ ...currencyForm, isBase: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Base Currency</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={currencyForm.acceptPayment}
                                    onChange={(e) => setCurrencyForm({ ...currencyForm, acceptPayment: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Accept Payments</span>
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAddCurrency} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                                Save Currency
                            </button>
                            <button onClick={() => setShowCurrencyForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Currency List */}
                <div className="space-y-3">
                    {currencies.map(currency => (
                        <div key={currency.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
                                    {currency.symbol || currency.code}
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900">{currency.name}</h4>
                                    <p className="text-xs text-gray-500">{currency.code}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {currency.isBase && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">Base</span>}
                                {currency.acceptPayment && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">Accepts Payment</span>}
                                <button
                                    onClick={() => handleDeleteCurrency(currency.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Daily Exchange Rates section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Daily Exchange Rates</h3>
                        <p className="text-gray-500 text-xs mt-1">Updates for front desk currency conversions.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                        Live API: Active
                    </div>
                </div>

                <div className="space-y-3">
                    {exchangeRates.map(rate => (
                        <div key={rate.id}>
                            {editingRate?.id === rate.id ? (
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="grid grid-cols-2 gap-4 mb-3">
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 block mb-1">Buying Rate</label>
                                            <input
                                                type="number"
                                                value={editingRate.buyingRate}
                                                onChange={(e) => setEditingRate({ ...editingRate, buyingRate: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-700 block mb-1">Selling Rate</label>
                                            <input
                                                type="number"
                                                value={editingRate.sellingRate}
                                                onChange={(e) => setEditingRate({ ...editingRate, sellingRate: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdateRate(editingRate)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
                                            Save
                                        </button>
                                        <button onClick={() => setEditingRate(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-white border border-gray-200 hover:border-blue-200 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-gray-700 shadow-sm border border-gray-200">
                                            {rate.currencyCode}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900">{rate.currencyName}</h4>
                                            <p className="text-xs text-gray-500">Valid From: {rate.effectiveDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 text-right">
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase">Buying Rate</p>
                                            <p className="text-sm font-bold text-emerald-600">৳ {rate.buyingRate}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-500 uppercase">Selling Rate</p>
                                            <p className="text-sm font-bold text-rose-600">৳ {rate.sellingRate}</p>
                                        </div>
                                        <button
                                            onClick={() => setEditingRate(rate)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderSourceTab = () => (
        <div className="space-y-6">
            {/* Market Codes section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Market Segmentation</h3>
                        <p className="text-gray-500 text-xs mt-1">Categorize guest types for statistical reporting and pie charts.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700">Market Code *</label>
                        <input
                            type="text"
                            placeholder="e.g. CORP"
                            value={marketForm.code}
                            onChange={(e) => setMarketForm({ ...marketForm, code: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700">Description</label>
                        <input
                            type="text"
                            placeholder="e.g. Corporate Accounts"
                            value={marketForm.description}
                            onChange={(e) => setMarketForm({ ...marketForm, description: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700">Report Group</label>
                        <select
                            value={marketForm.reportGroup}
                            onChange={(e) => setMarketForm({ ...marketForm, reportGroup: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        >
                            <option>Transient View</option>
                            <option>Group / Event</option>
                            <option>Complimentary</option>
                        </select>
                    </div>
                </div>
                <button onClick={handleAddMarketCode} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                    Add Market Code
                </button>

                {/* Market Code List */}
                <div className="mt-4 space-y-2">
                    {marketCodes.map(market => (
                        <div key={market.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div>
                                <span className="font-semibold text-gray-900 text-sm">{market.code}</span>
                                <span className="text-gray-500 text-sm ml-2">- {market.description}</span>
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{market.reportGroup}</span>
                            </div>
                            <button
                                onClick={() => handleDeleteMarketCode(market.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Business Source section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">Business Origins (OTAs)</h3>
                    <button
                        onClick={() => setShowSourceForm(!showSourceForm)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-sm font-medium"
                    >
                        <Plus size={18} /> Add Source
                    </button>
                </div>

                {showSourceForm && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Source Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Agoda"
                                    value={sourceForm.name}
                                    onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Source Type</label>
                                <select
                                    value={sourceForm.type}
                                    onChange={(e) => setSourceForm({ ...sourceForm, type: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                >
                                    <option>OTA</option>
                                    <option>Corporate</option>
                                    <option>Travel Agent</option>
                                    <option>Website</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Commission %</label>
                                <input
                                    type="number"
                                    placeholder="15"
                                    value={sourceForm.commission}
                                    onChange={(e) => setSourceForm({ ...sourceForm, commission: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Linked Rate Plan</label>
                                <input
                                    type="text"
                                    placeholder="e.g. OTA Rate"
                                    value={sourceForm.linkedRatePlan}
                                    onChange={(e) => setSourceForm({ ...sourceForm, linkedRatePlan: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAddSource} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                                Save Source
                            </button>
                            <button onClick={() => setShowSourceForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {businessSources.map(src => (
                        <div key={src.id} className={`p-4 rounded-lg border flex items-center justify-between transition-all ${src.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${src.active ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                    <Globe size={16} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-800">{src.name}</h4>
                                    <p className="text-xs text-gray-500 font-medium uppercase">{src.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-900">{src.commission} Commission</p>
                                    <p className="text-xs text-blue-600 font-medium">{src.linkedRatePlan}</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={src.active}
                                        onChange={() => toggleSourceActive(src.id)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                                <button
                                    onClick={() => handleDeleteSource(src.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Business Agents section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Users size={18} className="text-blue-600" /> Corporate Profiles (City Ledger)
                    </h3>
                    <button
                        onClick={() => setShowAgentForm(!showAgentForm)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 text-sm font-medium"
                    >
                        <Plus size={18} /> Add Company
                    </button>
                </div>

                {showAgentForm && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Company Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. BRAC Bank Ltd"
                                    value={agentForm.name}
                                    onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Contact Person</label>
                                <input
                                    type="text"
                                    placeholder="e.g. HR Manager"
                                    value={agentForm.contact}
                                    onChange={(e) => setAgentForm({ ...agentForm, contact: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Credit Limit</label>
                                <input
                                    type="text"
                                    placeholder="e.g. ৳ 3,00,000"
                                    value={agentForm.creditLimit}
                                    onChange={(e) => setAgentForm({ ...agentForm, creditLimit: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-700">Payment Term</label>
                                <select
                                    value={agentForm.paymentTerm}
                                    onChange={(e) => setAgentForm({ ...agentForm, paymentTerm: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                >
                                    <option>Net 7</option>
                                    <option>Net 15</option>
                                    <option>Net 30</option>
                                    <option>Net 45</option>
                                    <option>Net 60</option>
                                </select>
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-medium text-gray-700">Contract Rates</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Corporate Rate A"
                                    value={agentForm.contractRates}
                                    onChange={(e) => setAgentForm({ ...agentForm, contractRates: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAddAgent} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                                Save Company
                            </button>
                            <button onClick={() => setShowAgentForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-700">
                            <tr>
                                <th className="px-6 py-3">Company Name</th>
                                <th className="px-6 py-3">Credit Limit</th>
                                <th className="px-6 py-3">Payment Term</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {corporateAgents.map(corp => (
                                <tr key={corp.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-800">{corp.name}</div>
                                        <div className="text-xs text-gray-500">{corp.contact}</div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-700">{corp.creditLimit}</td>
                                    <td className="px-6 py-4 text-gray-600">{corp.paymentTerm} Days</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-xs text-gray-500">{corp.contractRates}</span>
                                            <button
                                                onClick={() => handleDeleteAgent(corp.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderChargesTab = () => (
        <div className="space-y-6">
            <div className="bg-blue-600 rounded-lg p-8 text-white relative overflow-hidden shadow-sm">
                <div className="relative z-10 max-w-lg">
                    <h3 className="text-2xl font-bold mb-2">Ancillary Revenue Rules</h3>
                    <p className="text-blue-100 text-sm leading-relaxed">Configure automatic charges for services like airport transfers, extra bedding, or early check-in fees. These post directly to guest folios.</p>
                </div>
                <Truck className="absolute -right-8 -bottom-8 w-48 h-48 text-blue-500/30 rotate-12" />
            </div>

            {showChargeForm && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-800 mb-4">Add New Charge</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700">Charge Name *</label>
                            <input
                                type="text"
                                placeholder="e.g. Late Checkout"
                                value={chargeForm.name}
                                onChange={(e) => setChargeForm({ ...chargeForm, name: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700">Charge Code *</label>
                            <input
                                type="text"
                                placeholder="e.g. FO-LC"
                                value={chargeForm.code}
                                onChange={(e) => setChargeForm({ ...chargeForm, code: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700">Price</label>
                            <input
                                type="text"
                                placeholder="e.g. 1500 or 25%"
                                value={chargeForm.price}
                                onChange={(e) => setChargeForm({ ...chargeForm, price: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700">Calculation Rule</label>
                            <select
                                value={chargeForm.rule}
                                onChange={(e) => setChargeForm({ ...chargeForm, rule: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                                <option>Flat Amount</option>
                                <option>Per Night</option>
                                <option>Room Rate %</option>
                                <option>Per Person</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAddCharge} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                            Save Charge
                        </button>
                        <button onClick={() => setShowChargeForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {extraCharges.map(charge => (
                    <div key={charge.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:border-blue-300 transition-all group cursor-pointer relative overflow-hidden">
                        <button
                            onClick={() => handleDeleteCharge(charge.id)}
                            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <TrendingUp size={20} />
                        </div>
                        <h4 className="font-bold text-gray-800">{charge.name}</h4>
                        <p className="text-xs text-gray-500 font-medium mb-3 uppercase">{charge.code}</p>
                        <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-100">
                            <div>
                                <span className="text-gray-500 block mb-0.5 text-xs">Price / Logic</span>
                                <span className="font-bold text-gray-900">৳ {charge.price}</span>
                            </div>
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded font-medium uppercase text-xs">{charge.rule}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderDiscountsTab = () => (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Percent size={20} className="text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-800">Standard Discount Policies</h3>
                </div>

                <div className="space-y-6">
                    {showDiscountForm ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-700">Discount Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Manager Appreciation"
                                        value={discountForm.name}
                                        onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-xs font-medium text-gray-700">Type</label>
                                        <select
                                            value={discountForm.type}
                                            onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg outline-none font-medium text-sm"
                                        >
                                            <option>Percentage (%)</option>
                                            <option>Flat Amount</option>
                                        </select>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-xs font-medium text-gray-700">Value</label>
                                        <input
                                            type="text"
                                            placeholder="20"
                                            value={discountForm.value}
                                            onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg outline-none font-medium text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-medium text-gray-700 block">Policy Controls</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={discountForm.requiresAuth}
                                                onChange={(e) => setDiscountForm({ ...discountForm, requiresAuth: e.target.checked })}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Requires Auth</span>
                                        </label>
                                        <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={discountForm.reasonRequired}
                                                onChange={(e) => setDiscountForm({ ...discountForm, reasonRequired: e.target.checked })}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Reason Req</span>
                                        </label>
                                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200 col-span-2">
                                            <AlertCircle size={14} className="text-blue-600" />
                                            <span className="text-sm font-medium text-gray-700">Max Limit: ৳ {discountForm.maxLimit}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddDiscount}
                                        className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium text-sm shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
                                    >
                                        Add Policy Code
                                    </button>
                                    <button
                                        onClick={() => setShowDiscountForm(false)}
                                        className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowDiscountForm(true)}
                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 font-medium text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={18} /> Add New Discount Policy
                        </button>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {discounts.map(disc => (
                            <div key={disc.id} className={`p-4 rounded-lg border flex justify-between items-center ${disc.active ? 'bg-white border-gray-200' : 'bg-gray-50 opacity-60'}`}>
                                <div className="flex items-center gap-3">
                                    <Tag className={disc.active ? 'text-blue-600' : 'text-gray-400'} size={18} />
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-800">{disc.name}</h4>
                                        <p className="text-xs font-medium text-gray-500 uppercase">{disc.value} Benefit</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {disc.requiresAuth && <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs font-medium rounded uppercase">Needs Auth</span>}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={disc.active}
                                            onChange={() => toggleDiscountActive(disc.id)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                    </label>
                                    <button
                                        onClick={() => handleDeleteDiscount(disc.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
    const renderRevenueTab = () => (
        <div className="p-6 space-y-6">
            <div className="bg-gray-900 rounded-xl p-8 text-white relative overflow-hidden shadow-lg border border-gray-800">
                <div className="relative z-10 max-w-xl">
                    <h3 className="text-2xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 font-sans tracking-tight">Financial Blueprint</h3>
                    <p className="text-gray-400 text-sm leading-relaxed font-medium">Link service departments to General Ledger (GL) codes. This provides the <span className="text-blue-400 font-black">NICE HMS Allowance Engine</span> with the logic needed for automated department balancing.</p>
                </div>
                <TrendingUp className="absolute -right-8 -bottom-8 w-48 h-48 text-blue-500/10 rotate-12" />
            </div>

            <div className="grid grid-cols-1 gap-3">
                {revenueGroups.map(group => (
                    <div key={group.id} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between hover:border-blue-300 transition-all group shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center font-black text-blue-600 text-[10px] border border-gray-100 uppercase">
                                {group.department}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm tracking-tight">{group.description}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100 uppercase tracking-tighter">{group.code}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GL: {group.glCode}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-all">
                                <Edit size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'currency': return renderCurrencyTab();
            case 'source': return renderSourceTab();
            case 'charges': return renderChargesTab();
            case 'discounts': return renderDiscountsTab();
            case 'revenue': return renderRevenueTab();
            default: return renderCurrencyTab();
        }
    };

    return (
        <div className="min-h-screen bg-gray-100/50 text-gray-800 font-sans">
            <header className="bg-white border-b sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors border border-gray-100">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">System Master Data</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Finance, Ops & Localization</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-blue-600 transition-all font-bold text-sm shadow-lg shadow-gray-900/10 flex items-center gap-2">
                        <Save size={18} />
                        Update Infrastructure
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8">
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-64 flex-shrink-0">
                        <nav className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 sticky top-28 space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={`flex items-center gap-3 px-4 py-3 text-xs font-black transition-all w-full text-left rounded-xl uppercase tracking-widest ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20'
                                        : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="flex-1 min-w-0 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MasterDataConfig;
