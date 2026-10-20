import React, { useState } from 'react';
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
    Info,
    Send,
    Database
} from 'lucide-react';
import SecuritySettingsHubNav from './SecuritySettingsHubNav';

interface GeneralSettingsProps {
    onNavigate?: (page: string) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'regional' | 'currency' | 'numbering' | 'operations' | 'communication' | 'backup'>('regional');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // State for Settings Form
    const [settings, setSettings] = useState({
        // Regional
        hotelName: 'The Grand Palace Hotel & Suites',
        legalEntity: 'Grand Hospitality Bangladesh PLC',
        starRating: '5 Star Deluxe',
        timezone: 'Asia/Dhaka (UTC+06:00)',
        dateFormat: 'DD/MM/YYYY (e.g. 20/01/2026)',
        timeFormat: '12-Hour (AM/PM)',
        fiscalYearStart: 'July (July - June)',
        primaryLanguage: 'English (US)',

        // Currency
        baseCurrency: 'BDT (৳ - Bangladeshi Taka)',
        decimalPlaces: 2,
        currencySymbolPosition: 'Left (৳ 1,500.00)',
        roundingRule: 'Nearest Whole Unit (0.00)',
        taxIdNumber: 'BIN-002918374-0101',
        vatPercentage: 15,
        serviceChargePercentage: 10,

        // Numbering
        reservationPrefix: 'RES-2026-',
        invoicePrefix: 'INV-2026-',
        folioPrefix: 'FOL-',
        kotPrefix: 'KOT-',
        receiptPrefix: 'RCT-',
        resetAnnually: true,

        // Front Desk & Night Audit
        checkInTime: '14:00',
        checkOutTime: '12:00',
        autoReleaseHour: '18:00',
        nightAuditTime: '02:30',
        autoPostRoomCharges: true,
        autoAdvanceBusinessDate: true,
        allowSameDayNoShowRelease: false,

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

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        showToast('System configuration & operating parameters deployed successfully.');
    };

    const handleReset = () => {
        showToast('Form reset to server operating baseline.');
    };

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans text-gray-800">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[120] bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 border border-gray-700">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Security & Settings Suite Unified Navigation */}
            <SecuritySettingsHubNav activeHub="general" onNavigate={onNavigate} />

            {/* Informative Micro-guide for Hotel Operations */}
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-3 rounded-xl border border-blue-200/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold shadow-2xs">
                        <Info size={16} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">Hotel Global Configuration & Regional Compliance</span>
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">BD NBR Compliant</span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                            এখানে কারেন্সি (৳ BDT), ১৫% ভ্যাট, ১০% সার্ভিস চার্জ, ইনভয়েস প্রিফিক্স ও ক্লাউড অটো-ব্যাকআপ শিডিউল সেন্ট্রালি কনফিগার করা থাকে।
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-600 flex-shrink-0 font-medium">
                    <button
                        type="button"
                        onClick={() => showToast('Test cloud backup executed: Snapshot synced to GCS (asia-south1).')}
                        className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 px-2 py-1 rounded-md border border-blue-200 shadow-2xs cursor-pointer transition-colors"
                    >
                        <Database size={11} className="text-blue-600" />
                        <span>Run Test Backup</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => showToast('Test SMS sent via BulkSMS BD API gateway (Mock OK).')}
                        className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 px-2 py-1 rounded-md border border-gray-200 shadow-2xs cursor-pointer transition-colors"
                    >
                        <Send size={11} className="text-gray-500" />
                        <span>Test SMS/Email</span>
                    </button>
                </div>
            </div>

            {/* Elevated Header Card */}
            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/80 flex items-center justify-center text-blue-700 font-bold text-sm shadow-2xs flex-shrink-0">
                            <Settings size={22} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight truncate">
                                    System & Property General Settings
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 flex-shrink-0">
                                    Global Core
                                </span>
                                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    v2.4.0 Production
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1 font-medium">
                                <span className="flex items-center gap-1">
                                    <Clock size={11} className="text-gray-400" />
                                    <span>Timezone: UTC+6 (Dhaka)</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <DollarSign size={11} className="text-gray-400" />
                                    <span>Base: BDT (৳)</span>
                                </span>
                                <span className="hidden sm:flex items-center gap-1">
                                    <Cloud size={11} className="text-gray-400" />
                                    <span>Backup: Automated Daily (04:00 AM)</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="h-7 px-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <RotateCcw size={12} className="text-gray-400" />
                            <span>Reset</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Save size={13} />
                            <span>Deploy Settings</span>
                        </button>
                    </div>
                </div>

                {/* Segmented Horizontal Navigation Tabs */}
                <div className="px-3 sm:px-4 py-2 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1 sm:gap-1.5">
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
                                className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === t.id
                                    ? 'bg-white text-blue-700 shadow-2xs border border-gray-200 font-bold'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
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
            <form onSubmit={handleSave} className="space-y-3 text-xs">
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

                            <div className="space-y-2 pt-2 sm:col-span-2">
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

                            <div className="space-y-2 pt-4">
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
                        className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                        <Save size={13} />
                        <span>Deploy Settings to Cloud</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GeneralSettings;
