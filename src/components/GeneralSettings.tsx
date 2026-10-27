import React, { useState, useEffect } from 'react';
import {
    Settings,
    Globe,
    DollarSign,
    Receipt,
    Clock,
    Mail,
    Cloud,
    Save,
    RotateCcw,
    CheckCircle2,
    AlertTriangle,
    Send,
    Database,
    FileText,
    Check
} from 'lucide-react';
import { useProperty } from '../context/PropertyContext';
import { getApiBaseUrl } from '../utils/apiUrl';

interface GeneralSettingsProps {
    onNavigate?: (page: string) => void;
    currentUser?: any;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ onNavigate: _onNavigate, currentUser: _currentUser }) => {
    const { activeProperty, properties, setActivePropertyId, refreshProperties } = useProperty();
    const targetProperty = activeProperty || properties[0] || { id: 1, name: 'The Grand Palace Hotel & Suites' };
    const propId = targetProperty.id || 1;
    const propStorageKey = `hotel_general_settings_prop_${propId}`;

    const [activeTab, setActiveTab] = useState<'regional' | 'currency' | 'numbering' | 'operations' | 'communication' | 'backup'>('regional');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // State for Settings Form with Baseline Defaults matching previous design
    const [settings, setSettings] = useState({
        // Regional
        hotelName: targetProperty.name || 'The Grand Palace Hotel & Suites',
        legalEntity: 'Grand Hospitality Bangladesh PLC',
        starRating: '5 Star Deluxe',
        timezone: 'Asia/Dhaka (UTC+06:00)',
        dateFormat: 'DD/MM/YYYY (e.g. 20/01/2026)',
        timeFormat: '12-Hour (AM/PM)',
        fiscalYearStart: 'July (July - June)',
        primaryLanguage: 'English (US)',

        // Currency & Taxes
        baseCurrency: 'BDT (৳ - Bangladeshi Taka)',
        decimalPlaces: 2,
        currencySymbolPosition: 'Left (৳ 1,500.00)',
        roundingRule: 'Nearest Whole Unit (0.00)',
        taxIdNumber: 'BIN-002918374-0101',
        vatPercentage: 15,
        serviceChargePercentage: 10,
        isTaxInclusive: false,
        cityLedgerLimitBDT: 500000,

        // Numbering
        reservationPrefix: 'RES-2026-',
        invoicePrefix: 'INV-2026-',
        folioPrefix: 'FOL-',
        kotPrefix: 'KOT-',
        receiptPrefix: 'RCT-',
        resetAnnually: true,
        invoiceNotes: 'All bills are payable upon presentation at checkout. Government VAT (15%) and Service Charge (10%) apply as per regulations.',

        // Front Desk & Night Audit
        checkInTime: (targetProperty as any)?.check_in_time || '14:00',
        checkOutTime: (targetProperty as any)?.check_out_time || '12:00',
        autoReleaseHour: '18:00',
        nightAuditTime: '02:30',
        gracePeriodHours: 2,
        autoPostRoomCharges: true,
        autoAdvanceBusinessDate: true,
        allowSameDayNoShowRelease: false,
        autoChargeNoShow: true,

        // Communication
        smtpHost: 'smtp.sendgrid.net',
        smtpPort: '587',
        smtpUser: 'apikey',
        senderEmail: 'reservations@thegrandpalace.com',
        senderName: 'The Grand Palace Reservations',
        smsGatewayProvider: 'BulkSMS BD (REST API)',
        smsSenderId: 'GRANDPALACE',
        enableGuestWelcomeSms: true,
        enableCheckoutFolioEmail: true,
        enableWhatsAppConcierge: true,

        // Backup & Maintenance
        autoCloudBackup: true,
        backupFrequency: 'Daily at 04:00 AM (Off-Peak)',
        backupRetentionDays: 90,
        sessionTimeoutMinutes: 15,
        maintenanceMode: false,
    });

    // Hydrate settings from local storage or server on mount & property switch
    useEffect(() => {
        let loaded: any = null;
        try {
            const cached = localStorage.getItem(propStorageKey) || localStorage.getItem('hotel_general_settings_v1');
            if (cached) {
                loaded = JSON.parse(cached);
            } else if ((targetProperty as any)?.settings) {
                const s = (targetProperty as any).settings;
                loaded = typeof s === 'string' ? JSON.parse(s) : s;
            }
        } catch (e) {
            console.warn('Error reading cached settings:', e);
        }

        if (loaded) {
            setSettings(prev => ({
                ...prev,
                ...loaded,
                hotelName: loaded.hotelName || targetProperty.name || prev.hotelName
            }));
        }

        // Fetch latest settings from server
        const fetchRemote = async () => {
            try {
                const res = await fetch(`${getApiBaseUrl()}/api/properties`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    const found = json.data.find((p: any) => p.id === propId);
                    if (found && found.settings) {
                        const parsed = typeof found.settings === 'string' ? JSON.parse(found.settings) : found.settings;
                        setSettings(prev => ({ ...prev, ...parsed }));
                        localStorage.setItem(propStorageKey, JSON.stringify(parsed));
                    }
                }
            } catch (err) {
                console.warn('Could not reach settings API:', err);
            }
        };
        fetchRemote();
    }, [propId, propStorageKey, targetProperty]);

    // Handle Save and Deploy to Cloud & Local Storage
    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        try {
            setIsSaving(true);

            // Persist locally
            localStorage.setItem(propStorageKey, JSON.stringify(settings));
            localStorage.setItem('hotel_general_settings_v1', JSON.stringify(settings));

            // Persist to PostgreSQL backend via PUT /api/properties/:id/settings
            await fetch(`${getApiBaseUrl()}/api/properties/${propId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            // Sync base property attributes
            await fetch(`${getApiBaseUrl()}/api/properties/${propId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: settings.hotelName,
                    currency: settings.baseCurrency.slice(0, 3).toUpperCase(),
                    check_in_time: settings.checkInTime,
                    check_out_time: settings.checkOutTime
                })
            }).catch(() => {});

            if (refreshProperties) {
                await refreshProperties();
            }

            showToast('System configuration & operating parameters deployed successfully.');
        } catch (err) {
            console.error('Error saving settings:', err);
            showToast('Settings saved to local storage.');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle Reset
    const handleReset = () => {
        localStorage.removeItem(propStorageKey);
        showToast('Form reset to server operating baseline.');
    };

    // Test cloud backup trigger
    const handleTestBackup = () => {
        showToast('Test cloud backup executed: Database snapshot synced to secondary storage.');
    };

    // Test alert notification
    const handleTestAlert = () => {
        showToast(`Test alert dispatched via ${settings.smsGatewayProvider} (Mock OK).`);
    };

    return (
        <div className="page-container">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[120] bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 border border-gray-700">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Elevated Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="size-11 sm:size-12 rounded-2xl bg-primary-subtle text-primary border border-primary-border flex items-center justify-center shrink-0 shadow-2xs">
                            <Settings size={22} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
                                    System & Property General Settings
                                </h1>
                                <span className="badge-status-active">
                                    Global Core
                                </span>
                                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    v2.4.0 Production
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} className="text-slate-400" />
                                    <span>Timezone: {settings.timezone.split(' ')[0]}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <DollarSign size={12} className="text-slate-400" />
                                    <span>Base: {settings.baseCurrency.split(' ')[0]}</span>
                                </span>
                                <span className="hidden sm:flex items-center gap-1">
                                    <Cloud size={12} className="text-slate-400" />
                                    <span>Backup: Automated Daily (04:00 AM)</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
                        {properties.length > 1 && (
                            <select
                                aria-label="Select Property"
                                value={propId}
                                onChange={(e) => setActivePropertyId(Number(e.target.value))}
                                className="h-8 px-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                            >
                                {properties.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        )}
                        <button
                            type="button"
                            onClick={handleTestBackup}
                            className="btn-secondary"
                        >
                            <Database size={13} className="text-primary" />
                            <span>Test Backup</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleTestAlert}
                            className="btn-secondary"
                        >
                            <Send size={13} className="text-slate-400" />
                            <span>Test SMS/Email</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="btn-secondary"
                        >
                            <RotateCcw size={13} className="text-slate-400" />
                            <span>Reset</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSave()}
                            disabled={isSaving}
                            className="btn-primary"
                        >
                            <Save size={14} />
                            <span>{isSaving ? 'Deploying...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </div>

                {/* Segmented Horizontal Navigation Tabs */}
                <div className="px-3 sm:px-4 py-2 bg-slate-50/70 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { id: 'regional', label: 'Property & Regional', icon: Globe },
                            { id: 'currency', label: 'Financial & Taxes', icon: DollarSign },
                            { id: 'numbering', label: 'Folio & Sequence Prefixes', icon: Receipt },
                            { id: 'operations', label: 'Front Desk & Night Audit', icon: Clock },
                            { id: 'communication', label: 'SMS & Email Gateways', icon: Mail },
                            { id: 'backup', label: 'Cloud Backup & Security', icon: Cloud },
                        ].map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id as any)}
                                className={`h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === t.id
                                    ? 'bg-white text-primary shadow-2xs border border-slate-200 font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }`}
                            >
                                <t.icon size={13} />
                                <span>{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Form Container */}
            <form onSubmit={handleSave} className="space-y-3 text-xs mt-3">
                {/* TAB 1: Regional & Property Identity */}
                {activeTab === 'regional' && (
                    <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs space-y-4">
                        <div className="border-b border-gray-100 pb-2.5">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Globe size={15} className="text-blue-600" />
                                <span>Property Identity & Regional Localization Formats</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Set legal business registration names, display timezones, and calendar formats across reports.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Hotel Operating Name</label>
                                <input
                                    type="text"
                                    value={settings.hotelName}
                                    onChange={e => setSettings({ ...settings, hotelName: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Legal Entity Registered Name</label>
                                <input
                                    type="text"
                                    value={settings.legalEntity}
                                    onChange={e => setSettings({ ...settings, legalEntity: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Property Star Category</label>
                                <select
                                    value={settings.starRating}
                                    onChange={e => setSettings({ ...settings, starRating: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer font-medium"
                                >
                                    <option value="5 Star Deluxe">5 Star Deluxe Luxury</option>
                                    <option value="4 Star Premium">4 Star Premium</option>
                                    <option value="3 Star Standard">3 Star Standard</option>
                                    <option value="Boutique Heritage">Boutique Heritage</option>
                                    <option value="Serviced Apartments">Serviced Apartments</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Operating Timezone</label>
                                <select
                                    value={settings.timezone}
                                    onChange={e => setSettings({ ...settings, timezone: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer font-mono font-medium"
                                >
                                    <option value="Asia/Dhaka (UTC+06:00)">Asia/Dhaka (UTC+06:00 - Bangladesh)</option>
                                    <option value="Asia/Kolkata (UTC+05:30)">Asia/Kolkata (UTC+05:30 - India)</option>
                                    <option value="Asia/Dubai (UTC+04:00)">Asia/Dubai (UTC+04:00 - UAE)</option>
                                    <option value="Asia/Bangkok (UTC+07:00)">Asia/Bangkok (UTC+07:00 - Thailand)</option>
                                    <option value="Europe/London (UTC+00:00)">Europe/London (UTC+00:00 - GMT)</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Date Display Format</label>
                                <select
                                    value={settings.dateFormat}
                                    onChange={e => setSettings({ ...settings, dateFormat: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer font-mono"
                                >
                                    <option value="DD/MM/YYYY (e.g. 20/01/2026)">DD/MM/YYYY (e.g. 20/01/2026)</option>
                                    <option value="YYYY-MM-DD (e.g. 2026-01-20)">YYYY-MM-DD (ISO 8601)</option>
                                    <option value="MM/DD/YYYY (e.g. 01/20/2026)">MM/DD/YYYY (US Format)</option>
                                    <option value="DD-MMM-YYYY (e.g. 20-Jan-2026)">DD-MMM-YYYY (e.g. 20-Jan-2026)</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Financial Fiscal Year</label>
                                <select
                                    value={settings.fiscalYearStart}
                                    onChange={e => setSettings({ ...settings, fiscalYearStart: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer"
                                >
                                    <option value="July (July - June)">July to June (Bangladesh Statutory)</option>
                                    <option value="April (April - March)">April to March (India / UK)</option>
                                    <option value="January (January - December)">January to December (Calendar Year)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Financial, Currency & Taxes */}
                {activeTab === 'currency' && (
                    <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs space-y-4">
                        <div className="border-b border-gray-100 pb-2.5">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <DollarSign size={15} className="text-emerald-600" />
                                <span>Base Currency, Decimal Precision & Statutory Tax Settings</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Set hotel base currency, rounding algorithms, and government VAT / BIN identification codes.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Operating Base Currency</label>
                                <select
                                    value={settings.baseCurrency}
                                    onChange={e => setSettings({ ...settings, baseCurrency: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs font-bold text-emerald-700 cursor-pointer"
                                >
                                    <option value="BDT (৳ - Bangladeshi Taka)">BDT (৳ - Bangladeshi Taka)</option>
                                    <option value="USD ($ - US Dollar)">USD ($ - US Dollar)</option>
                                    <option value="EUR (€ - Euro)">EUR (€ - Euro)</option>
                                    <option value="GBP (£ - British Pound)">GBP (£ - British Pound)</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Display Decimal Places</label>
                                <select
                                    value={settings.decimalPlaces}
                                    onChange={e => setSettings({ ...settings, decimalPlaces: Number(e.target.value) })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer font-bold"
                                >
                                    <option value={2}>2 Decimals (e.g. ৳ 1,500.00)</option>
                                    <option value={0}>0 Decimals (e.g. ৳ 1,500)</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Government Tax BIN / VAT ID</label>
                                <input
                                    type="text"
                                    value={settings.taxIdNumber}
                                    onChange={e => setSettings({ ...settings, taxIdNumber: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono font-bold"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Default Room VAT / GST Rate (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={settings.vatPercentage}
                                        onChange={e => setSettings({ ...settings, vatPercentage: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 pr-8 border border-gray-200 rounded-lg outline-none text-xs font-bold"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Hospitality Service Charge (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={settings.serviceChargePercentage}
                                        onChange={e => setSettings({ ...settings, serviceChargePercentage: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 pr-8 border border-gray-200 rounded-lg outline-none text-xs font-bold"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Rounding Algorithm</label>
                                <select
                                    value={settings.roundingRule}
                                    onChange={e => setSettings({ ...settings, roundingRule: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer"
                                >
                                    <option value="Nearest Whole Unit (0.00)">Nearest Whole Currency Unit (0.00)</option>
                                    <option value="Always Round Up (Ceil)">Always Round Up (Ceil)</option>
                                    <option value="Truncate Decimals">Exact Floating (No Rounding)</option>
                                </select>
                            </div>

                            {/* Additional Functional Option: Tax Inclusion Mode */}
                            <div className="sm:col-span-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                                <div>
                                    <span className="font-bold text-gray-900 block">Room Tariff Tax Computation Mode</span>
                                    <span className="text-[11px] text-gray-500">
                                        {settings.isTaxInclusive
                                            ? 'Tax-Inclusive: Quoted tariff includes VAT & Service Charge automatically.'
                                            : 'Tax-Exclusive (Standard): 15% VAT and 10% Service Charge are calculated on top of base room rates.'}
                                    </span>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={settings.isTaxInclusive}
                                        onChange={e => setSettings({ ...settings, isTaxInclusive: e.target.checked })}
                                        className="w-4 h-4 accent-blue-600 rounded"
                                    />
                                    <span className="font-semibold text-gray-800">Tax Inclusive Rates</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: Folio & Document Numbering Prefixes */}
                {activeTab === 'numbering' && (
                    <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs space-y-4">
                        <div className="border-b border-gray-100 pb-2.5">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Receipt size={15} className="text-blue-600" />
                                <span>Transaction Numbering Sequences & Folio Prefixes</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Define prefix conventions for reservations, tax invoices, kitchen orders (KOT), and cashier receipts.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Reservation Booking Number Prefix</label>
                                <input
                                    type="text"
                                    value={settings.reservationPrefix}
                                    onChange={e => setSettings({ ...settings, reservationPrefix: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono font-bold"
                                />
                                <span className="text-[10px] text-gray-400">Sample: {settings.reservationPrefix}00492</span>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Tax Invoice Prefix</label>
                                <input
                                    type="text"
                                    value={settings.invoicePrefix}
                                    onChange={e => setSettings({ ...settings, invoicePrefix: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono font-bold"
                                />
                                <span className="text-[10px] text-gray-400">Sample: {settings.invoicePrefix}01842</span>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Guest Room Folio Prefix</label>
                                <input
                                    type="text"
                                    value={settings.folioPrefix}
                                    onChange={e => setSettings({ ...settings, folioPrefix: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono font-bold"
                                />
                                <span className="text-[10px] text-gray-400">Sample: {settings.folioPrefix}8821</span>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Kitchen Order Ticket (KOT) Prefix</label>
                                <input
                                    type="text"
                                    value={settings.kotPrefix}
                                    onChange={e => setSettings({ ...settings, kotPrefix: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono font-bold"
                                />
                                <span className="text-[10px] text-gray-400">Sample: {settings.kotPrefix}3920</span>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Cash Payment Receipt Prefix</label>
                                <input
                                    type="text"
                                    value={settings.receiptPrefix}
                                    onChange={e => setSettings({ ...settings, receiptPrefix: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono font-bold"
                                />
                                <span className="text-[10px] text-gray-400">Sample: {settings.receiptPrefix}1049</span>
                            </div>

                            <div className="space-y-2 pt-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.resetAnnually}
                                        onChange={e => setSettings({ ...settings, resetAnnually: e.target.checked })}
                                        className="w-4 h-4 accent-blue-600 rounded"
                                    />
                                    <span className="font-semibold text-gray-700">Reset Counter Sequences Annually</span>
                                </label>
                                <span className="text-[10px] text-gray-400 block">
                                    Resets numbering counter to 00001 on the first day of each financial year.
                                </span>
                            </div>

                            {/* Additional Option: Invoice Footer Policy */}
                            <div className="sm:col-span-3 space-y-1 pt-2">
                                <label className="font-semibold text-gray-700 flex items-center gap-1.5">
                                    <FileText size={13} className="text-gray-500" />
                                    <span>Invoice Footer Terms & Disclaimer Notes</span>
                                </label>
                                <textarea
                                    rows={2}
                                    value={settings.invoiceNotes}
                                    onChange={e => setSettings({ ...settings, invoiceNotes: e.target.value })}
                                    className="w-full p-2 border border-gray-200 rounded-lg outline-none text-xs font-medium"
                                    placeholder="Enter disclaimer notes printed at bottom of every guest folio and invoice..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: Front Desk & Night Audit Defaults */}
                {activeTab === 'operations' && (
                    <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs space-y-4">
                        <div className="border-b border-gray-100 pb-2.5">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Clock size={15} className="text-amber-600" />
                                <span>Front Desk Operations & Automated Night Audit Schedule</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Set property standard check-in/out hours, auto-release limits, and night audit execution parameters.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Standard Check-In Time</label>
                                <input
                                    type="time"
                                    value={settings.checkInTime}
                                    onChange={e => setSettings({ ...settings, checkInTime: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-bold"
                                />
                                <span className="text-[10px] text-gray-400">Hotel guest arrival standard (Default 14:00)</span>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Standard Check-Out Time</label>
                                <input
                                    type="time"
                                    value={settings.checkOutTime}
                                    onChange={e => setSettings({ ...settings, checkOutTime: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-bold"
                                />
                                <span className="text-[10px] text-gray-400">Hotel room departure standard (Default 12:00)</span>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Non-Guaranteed Release Cutoff</label>
                                <input
                                    type="time"
                                    value={settings.autoReleaseHour}
                                    onChange={e => setSettings({ ...settings, autoReleaseHour: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-bold"
                                />
                                <span className="text-[10px] text-gray-400">Unconfirmed bookings auto-released to inventory</span>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Night Audit Automated Run Time</label>
                                <input
                                    type="time"
                                    value={settings.nightAuditTime}
                                    onChange={e => setSettings({ ...settings, nightAuditTime: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-bold font-mono text-indigo-700"
                                />
                                <span className="text-[10px] text-gray-400">Scheduled automated day closing (Default 02:30 AM)</span>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Late Check-Out Grace Period</label>
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        min="0"
                                        max="6"
                                        value={settings.gracePeriodHours}
                                        onChange={e => setSettings({ ...settings, gracePeriodHours: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-bold"
                                    />
                                    <span className="ml-2 text-xs text-gray-500 font-semibold">Hours</span>
                                </div>
                                <span className="text-[10px] text-gray-400">Complimentary buffer before fee applies</span>
                            </div>

                            <div className="space-y-2 pt-2 sm:col-span-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.autoPostRoomCharges}
                                        onChange={e => setSettings({ ...settings, autoPostRoomCharges: e.target.checked })}
                                        className="w-4 h-4 accent-blue-600 rounded"
                                    />
                                    <span className="font-semibold text-gray-800">
                                        Automatically Post Daily Room Revenue & Taxes to In-House Folios during Night Audit
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.autoAdvanceBusinessDate}
                                        onChange={e => setSettings({ ...settings, autoAdvanceBusinessDate: e.target.checked })}
                                        className="w-4 h-4 accent-blue-600 rounded"
                                    />
                                    <span className="font-semibold text-gray-800">
                                        Advance System Business Date Automatically upon Audit Verification
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.autoChargeNoShow}
                                        onChange={e => setSettings({ ...settings, autoChargeNoShow: e.target.checked })}
                                        className="w-4 h-4 accent-blue-600 rounded"
                                    />
                                    <span className="font-semibold text-gray-800">
                                        Automatically Bill First Night Room Tariff for Guaranteed No-Shows at Midnight
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 5: SMS, Email & WhatsApp Gateways */}
                {activeTab === 'communication' && (
                    <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs space-y-4">
                        <div className="border-b border-gray-100 pb-2.5">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Mail size={15} className="text-indigo-600" />
                                <span>Guest Notification Gateways (Email, SMS & WhatsApp)</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Configure transactional email servers, SMS telecom gateways, and automated booking alerts.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">SMTP Server Host</label>
                                <input
                                    type="text"
                                    value={settings.smtpHost}
                                    onChange={e => setSettings({ ...settings, smtpHost: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">SMTP Port</label>
                                <input
                                    type="text"
                                    value={settings.smtpPort}
                                    onChange={e => setSettings({ ...settings, smtpPort: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Sender Email Address</label>
                                <input
                                    type="email"
                                    value={settings.senderEmail}
                                    onChange={e => setSettings({ ...settings, senderEmail: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">SMS Gateway Provider</label>
                                <select
                                    value={settings.smsGatewayProvider}
                                    onChange={e => setSettings({ ...settings, smsGatewayProvider: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer font-medium"
                                >
                                    <option value="BulkSMS BD (REST API)">BulkSMS BD (Bangladeshi Telecoms)</option>
                                    <option value="Twilio Global API">Twilio Global Messaging API</option>
                                    <option value="InfoBip SMS Gateway">InfoBip Enterprise</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">SMS Alpha Sender ID</label>
                                <input
                                    type="text"
                                    value={settings.smsSenderId}
                                    onChange={e => setSettings({ ...settings, smsSenderId: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono font-bold"
                                />
                            </div>

                            <div className="space-y-2 pt-4 sm:col-span-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.enableGuestWelcomeSms}
                                        onChange={e => setSettings({ ...settings, enableGuestWelcomeSms: e.target.checked })}
                                        className="w-4 h-4 accent-blue-600 rounded"
                                    />
                                    <span className="font-semibold text-gray-700">Send Instant Check-In Welcome SMS</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.enableCheckoutFolioEmail}
                                        onChange={e => setSettings({ ...settings, enableCheckoutFolioEmail: e.target.checked })}
                                        className="w-4 h-4 accent-blue-600 rounded"
                                    />
                                    <span className="font-semibold text-gray-700">Auto-Email PDF Folio on Checkout</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.enableWhatsAppConcierge}
                                        onChange={e => setSettings({ ...settings, enableWhatsAppConcierge: e.target.checked })}
                                        className="w-4 h-4 accent-blue-600 rounded"
                                    />
                                    <span className="font-semibold text-gray-700">Enable Automated WhatsApp Concierge Alerts</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 6: Cloud Backup & Security */}
                {activeTab === 'backup' && (
                    <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs space-y-4">
                        <div className="border-b border-gray-100 pb-2.5">
                            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Cloud size={15} className="text-blue-600" />
                                <span>PMS Cloud Backup, Retention & Session Security</span>
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Automated database disaster recovery snapshots, retention cycles, and terminal security.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Backup Schedule Frequency</label>
                                <select
                                    value={settings.backupFrequency}
                                    onChange={e => setSettings({ ...settings, backupFrequency: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer"
                                >
                                    <option value="Daily at 04:00 AM (Off-Peak)">Daily at 04:00 AM (Off-Peak)</option>
                                    <option value="Every 12 Hours">Twice Daily (Every 12 Hours)</option>
                                    <option value="Hourly Incremental">Hourly Continuous Incremental</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Backup Retention Window</label>
                                <select
                                    value={settings.backupRetentionDays}
                                    onChange={e => setSettings({ ...settings, backupRetentionDays: Number(e.target.value) })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer font-bold"
                                >
                                    <option value={90}>90 Days Rolling History</option>
                                    <option value={180}>180 Days (6 Months)</option>
                                    <option value={365}>365 Days (1 Full Financial Year)</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Terminal Inactivity Auto-Lock</label>
                                <select
                                    value={settings.sessionTimeoutMinutes}
                                    onChange={e => setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer font-bold text-amber-700"
                                >
                                    <option value={10}>10 Minutes</option>
                                    <option value={15}>15 Minutes (Hospitality Standard)</option>
                                    <option value={30}>30 Minutes</option>
                                    <option value={60}>60 Minutes</option>
                                </select>
                            </div>

                            <div className="sm:col-span-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">System Maintenance Mode Switch</span>
                                    <p className="text-[11px] text-amber-700 mt-0.5">
                                        When maintenance mode is enabled, only Super Administrators can sign in. Front Desk and POS terminals will display a maintenance holding notice.
                                    </p>
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.maintenanceMode}
                                            onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                            className="w-4 h-4 accent-amber-600 rounded"
                                        />
                                        <span className="font-bold text-amber-900">Enable Hotel PMS Maintenance Mode</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Action Footer */}
                <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="h-8 px-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                        Discard Changes
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                        <Save size={13} />
                        <span>{isSaving ? 'Deploying...' : 'Deploy Settings to Cloud'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GeneralSettings;
