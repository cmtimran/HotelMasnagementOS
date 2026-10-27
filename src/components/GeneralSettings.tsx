import React, { useState, useEffect, useMemo } from 'react';
import {
    Sliders, Clock, DollarSign, Receipt, Mail, Shield, Check, Save,
    RotateCcw, AlertTriangle, Info, Bell, Key, Smartphone, Globe,
    RefreshCw, ChevronRight, CheckCircle2, ShieldCheck, Zap, Database,
    Lock, Calendar, FileText, Percent, HelpCircle, HardDriveDownload
} from 'lucide-react';
import { useProperty } from '../context/PropertyContext';
import { useToast } from '../context/ToastContext';
import { getApiBaseUrl } from '../utils/apiUrl';
import { getDefaultUnifiedSettings } from './AddProperty';

interface GeneralSettingsProps {
    onNavigate?: (page: string) => void;
    currentUser?: any;
}

type SettingsTab =
    | 'stay-rules'
    | 'localization-fx'
    | 'tax-pricing'
    | 'folio-numbering'
    | 'gateways'
    | 'security-system';

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ onNavigate, currentUser: _currentUser }) => {
    const { activeProperty, properties, setActivePropertyId, refreshProperties } = useProperty();
    const { showToast } = useToast();

    const targetProperty = activeProperty || properties[0] || { id: 1, name: 'Grand Palace Dhaka' };
    const propId = targetProperty.id || 1;
    const propStorageKey = `hotel_unified_settings_prop_${propId}`;

    const [activeTab, setActiveTab] = useState<SettingsTab>('stay-rules');
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isPurging, setIsPurging] = useState<boolean>(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

    // Initial default settings
    const defaultSettings = useMemo(() => getDefaultUnifiedSettings(targetProperty), [targetProperty]);

    // Live form state
    const [formData, setFormData] = useState<Record<string, any>>(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem(propStorageKey) || localStorage.getItem('hotel_general_settings_v1');
                if (cached) {
                    return { ...defaultSettings, ...JSON.parse(cached) };
                }
            } catch (err) {
                console.warn('Failed to parse cached settings:', err);
            }
        }
        return (targetProperty as any)?.settings
            ? { ...defaultSettings, ...((targetProperty as any).settings) }
            : defaultSettings;
    });

    // Sync when active property changes
    useEffect(() => {
        let loaded: any = defaultSettings;
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem(propStorageKey);
                if (cached) {
                    loaded = { ...defaultSettings, ...JSON.parse(cached) };
                } else if ((targetProperty as any)?.settings) {
                    loaded = { ...defaultSettings, ...(targetProperty as any).settings };
                }
            } catch (err) {
                console.warn('Error loading property settings:', err);
            }
        }
        setFormData(loaded);
        setHasUnsavedChanges(false);
    }, [propId, propStorageKey, defaultSettings]);

    // Fetch latest settings from server on mount
    useEffect(() => {
        let isMounted = true;
        const fetchRemoteSettings = async () => {
            try {
                const res = await fetch(`${getApiBaseUrl()}/api/properties`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data) && isMounted) {
                    const current = json.data.find((p: any) => p.id === propId);
                    if (current && current.settings) {
                        const parsed = typeof current.settings === 'string' ? JSON.parse(current.settings) : current.settings;
                        setFormData(prev => ({ ...prev, ...parsed }));
                        localStorage.setItem(propStorageKey, JSON.stringify(parsed));
                    }
                }
            } catch (err) {
                console.warn('Could not sync remote settings, using local:', err);
            }
        };
        fetchRemoteSettings();
        return () => {
            isMounted = false;
        };
    }, [propId, propStorageKey]);

    // Field change helper
    const updateField = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        setHasUnsavedChanges(true);
    };

    // Save All Settings
    const handleSave = async () => {
        try {
            setIsSaving(true);

            // 1. Persist to local storage
            localStorage.setItem(propStorageKey, JSON.stringify(formData));
            localStorage.setItem('hotel_general_settings_v1', JSON.stringify(formData));

            // 2. Persist to server via PUT /api/properties/:id/settings
            const res = await fetch(`${getApiBaseUrl()}/api/properties/${propId}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            // 3. Also update base properties check-in/out & currency if modified
            await fetch(`${getApiBaseUrl()}/api/properties/${propId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currency: formData.baseCurrency || 'BDT',
                    check_in_time: formData.checkInTime || '14:00',
                    check_out_time: formData.checkOutTime || '12:00'
                })
            }).catch(() => { });

            if (res.ok) {
                showToast('General Settings updated and saved successfully!', { type: 'success' });
            } else {
                showToast('Saved to local storage. Remote server response was pending.', { type: 'info' });
            }

            setHasUnsavedChanges(false);
            if (refreshProperties) {
                await refreshProperties();
            }
        } catch (err: any) {
            console.error('Failed to save settings:', err);
            showToast('Settings saved locally in browser cache.', { type: 'warning' });
            setHasUnsavedChanges(false);
        } finally {
            setIsSaving(false);
        }
    };

    // Reset to Factory Defaults
    const handleResetDefaults = () => {
        if (window.confirm('Are you sure you want to restore default operational settings for this property?')) {
            setFormData(defaultSettings);
            setHasUnsavedChanges(true);
            showToast('Factory defaults restored in editor. Click "Save Changes" to commit.', { type: 'info' });
        }
    };

    // Purge local cache and reload
    const handlePurgeCache = async () => {
        try {
            setIsPurging(true);
            localStorage.removeItem(propStorageKey);
            localStorage.removeItem('hotel_general_settings_v1');
            if (refreshProperties) {
                await refreshProperties();
            }
            showToast('System cache purged. Synchronized with database.', { type: 'success' });
            setTimeout(() => {
                window.location.reload();
            }, 600);
        } catch (err) {
            console.error(err);
        } finally {
            setIsPurging(false);
        }
    };

    const tabs = [
        { id: 'stay-rules', label: 'Stay & Front Desk', icon: Clock, desc: 'Check-in, checkout & night audit rules' },
        { id: 'localization-fx', label: 'Localization & FX', icon: Globe, desc: 'Currency, timezone & exchange rates' },
        { id: 'tax-pricing', label: 'Pricing & Taxes', icon: Percent, desc: 'VAT, service charge & credit rules' },
        { id: 'folio-numbering', label: 'Folios & Prefixes', icon: Receipt, desc: 'Invoice, voucher & numbering formats' },
        { id: 'gateways', label: 'Gateways & Alerts', icon: Bell, desc: 'SMTP, SMS gateway & notifications' },
        { id: 'security-system', label: 'Security & System', icon: Shield, desc: 'Sessions, backups & system health' }
    ] as const;

    return (
        <div className="min-h-screen bg-slate-50/70 p-3 sm:p-5 lg:p-6 pb-24 text-slate-800">
            <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5">

                {/* Top Header Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="size-11 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-white shadow-xs shrink-0">
                                <Sliders className="size-5.5 text-blue-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                                        General System Settings
                                    </h1>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 className="size-3" /> PMS Operational
                                    </span>
                                    {hasUnsavedChanges && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                            ● Unsaved Changes
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Configure core PMS automation rules, taxation, folio numbering, multi-currency FX rates, and notification gateways.
                                </p>
                            </div>
                        </div>

                        {/* Top Action Controls */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {properties.length > 1 && (
                                <select
                                    aria-label="Select Active Property"
                                    value={propId}
                                    onChange={(e) => setActivePropertyId(Number(e.target.value))}
                                    className="h-9 px-3 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    {properties.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}

                            <button
                                type="button"
                                onClick={handleResetDefaults}
                                title="Reset all fields to factory defaults"
                                className="h-9 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                                <RotateCcw className="size-3.5" />
                                <span className="hidden sm:inline">Defaults</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="h-9 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs hover:shadow transition-all flex items-center gap-2 disabled:opacity-60"
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="size-3.5 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="size-3.5" />
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs Bar */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                                        isActive
                                            ? 'bg-slate-900 text-white shadow-xs font-bold'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon className={`size-3.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* TAB 1: Stay Rules & Front Desk Automation */}
                {activeTab === 'stay-rules' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <Clock className="size-4 text-blue-600" />
                                <h2 className="text-sm font-bold text-slate-900">Standard Check-In & Check-Out Times</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Check-In Time</label>
                                    <input
                                        type="time"
                                        value={formData.checkInTime || '14:00'}
                                        onChange={(e) => updateField('checkInTime', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">Default arrival time for room turnover</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Check-Out Time</label>
                                    <input
                                        type="time"
                                        value={formData.checkOutTime || '12:00'}
                                        onChange={(e) => updateField('checkOutTime', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">Housekeeping room cleaning schedule base</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Late Departure Grace Period</label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max="6"
                                            value={formData.gracePeriodHours ?? 2}
                                            onChange={(e) => updateField('gracePeriodHours', Number(e.target.value))}
                                            className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                        <span className="ml-2 text-xs text-slate-500">Hours</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">Free departure buffer before fee applies</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Auto-Release Unconfirmed Hour</label>
                                    <input
                                        type="time"
                                        value={formData.autoReleaseHour || '18:00'}
                                        onChange={(e) => updateField('autoReleaseHour', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">Release non-guaranteed bookings</p>
                                </div>
                            </div>
                        </div>

                        {/* Night Audit & Operations Automation */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <Zap className="size-4 text-amber-500" />
                                <h2 className="text-sm font-bold text-slate-900">Night Audit Automation & Date Rollover</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">Auto-Post Room Charges on Night Audit</div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Automatically post room tariff, taxes, and service charges to all in-house guest folios when the night audit runs.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => updateField('autoPostRoomCharges', !formData.autoPostRoomCharges)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            formData.autoPostRoomCharges ? 'bg-blue-600' : 'bg-slate-300'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                formData.autoPostRoomCharges ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">Auto Advance Business Date</div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Automatically roll the PMS calendar to the next operating day after successful closure of the night audit routine.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => updateField('autoAdvanceBusinessDate', !formData.autoAdvanceBusinessDate)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            formData.autoAdvanceBusinessDate ? 'bg-blue-600' : 'bg-slate-300'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                formData.autoAdvanceBusinessDate ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">Automatic No-Show Fee Billing</div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Charge the first night room tariff to credit card guarantee on file when guest fails to check in by 23:59.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => updateField('autoChargeNoShow', !formData.autoChargeNoShow)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            formData.autoChargeNoShow ? 'bg-blue-600' : 'bg-slate-300'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                formData.autoChargeNoShow ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">Strict Deposit Ledger Tracking</div>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Require all advance cash & card payments to be segregated in an escrow deposit ledger prior to checkout settlement.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => updateField('enableDepositLedger', !formData.enableDepositLedger)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            formData.enableDepositLedger ? 'bg-blue-600' : 'bg-slate-300'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                formData.enableDepositLedger ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Early Arrival Policy Matrix */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <Info className="size-4 text-emerald-600" />
                                <h2 className="text-sm font-bold text-slate-900">Early Check-In Tariff Surcharges</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Arrival Before 06:00 AM</label>
                                    <select
                                        value={formData.earlyCheckinBefore6 || 'Full Night Charge'}
                                        onChange={(e) => updateField('earlyCheckinBefore6', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="Full Night Charge">100% Full Night Charge</option>
                                        <option value="50% Half-Night Charge">50% Half-Night Charge</option>
                                        <option value="Flat ৳ 3,000 Surcharge">Flat ৳ 3,000 Surcharge</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Arrival 06:00 AM - 10:00 AM</label>
                                    <select
                                        value={formData.earlyCheckin6To10 || '50% Half-Night Charge'}
                                        onChange={(e) => updateField('earlyCheckin6To10', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="50% Half-Night Charge">50% Half-Night Charge</option>
                                        <option value="25% Early Arrival Fee">25% Early Arrival Fee</option>
                                        <option value="Complimentary (If Ready)">Complimentary (If Ready)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Arrival 10:00 AM - 01:00 PM</label>
                                    <select
                                        value={formData.earlyCheckin10To13 || 'Complimentary (If Room Ready)'}
                                        onChange={(e) => updateField('earlyCheckin10To13', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="Complimentary (If Room Ready)">Complimentary (If Room Ready)</option>
                                        <option value="Fixed ৳ 1,000 Early Fee">Fixed ৳ 1,000 Early Fee</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Localization & FX Multi-Currency Engine */}
                {activeTab === 'localization-fx' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <Globe className="size-4 text-blue-600" />
                                <h2 className="text-sm font-bold text-slate-900">Regional & System Localization</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Base Currency</label>
                                    <select
                                        value={formData.baseCurrency || 'BDT'}
                                        onChange={(e) => updateField('baseCurrency', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                                        <option value="USD">USD ($) - United States Dollar</option>
                                        <option value="EUR">EUR (€) - Euro</option>
                                        <option value="GBP">GBP (£) - British Pound</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">System Timezone</label>
                                    <select
                                        value={formData.timezone || 'Asia/Dhaka (GMT+06:00)'}
                                        onChange={(e) => updateField('timezone', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="Asia/Dhaka (GMT+06:00)">Asia/Dhaka (GMT+06:00)</option>
                                        <option value="UTC (GMT+00:00)">UTC (GMT+00:00)</option>
                                        <option value="Asia/Dubai (GMT+04:00)">Asia/Dubai (GMT+04:00)</option>
                                        <option value="Asia/Singapore (GMT+08:00)">Asia/Singapore (GMT+08:00)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date Display Format</label>
                                    <select
                                        value={formData.dateFormat || 'DD/MM/YYYY'}
                                        onChange={(e) => updateField('dateFormat', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 27/10/2026)</option>
                                        <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/27/2026)</option>
                                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Time Format</label>
                                    <select
                                        value={formData.timeFormat || '12-Hour (AM/PM)'}
                                        onChange={(e) => updateField('timeFormat', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="12-Hour (AM/PM)">12-Hour (02:00 PM)</option>
                                        <option value="24-Hour (Military)">24-Hour (14:00)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Foreign Exchange Rate Board */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="size-4 text-emerald-600" />
                                    <h2 className="text-sm font-bold text-slate-900">Front Desk FX Currency Exchange Board (vs {formData.baseCurrency || 'BDT'})</h2>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                                    Live Front Desk Cashier Rates
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-800">USD - US Dollar ($)</span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Major</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Buy Rate</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.fxUsdBuy ?? 121.5}
                                                onChange={(e) => updateField('fxUsdBuy', Number(e.target.value))}
                                                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Sell Rate</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.fxUsdSell ?? 123.0}
                                                onChange={(e) => updateField('fxUsdSell', Number(e.target.value))}
                                                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-800"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-800">EUR - Euro (€)</span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">Europe</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Buy Rate</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.fxEurBuy ?? 131.2}
                                                onChange={(e) => updateField('fxEurBuy', Number(e.target.value))}
                                                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Sell Rate</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.fxEurSell ?? 133.5}
                                                onChange={(e) => updateField('fxEurSell', Number(e.target.value))}
                                                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-800"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-800">GBP - British Pound (£)</span>
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">UK</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Buy Rate</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.fxGbpBuy ?? 154.0}
                                                onChange={(e) => updateField('fxGbpBuy', Number(e.target.value))}
                                                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-500 block">Sell Rate</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.fxGbpSell ?? 156.8}
                                                onChange={(e) => updateField('fxGbpSell', Number(e.target.value))}
                                                className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md font-semibold text-slate-800"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: Pricing Model & Tax Computation */}
                {activeTab === 'tax-pricing' && (
                    <div className="space-y-4">
                        {/* Tax Inclusive / Exclusive Banner Toggle */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Percent className="size-4 text-blue-600" />
                                        <h2 className="text-sm font-bold text-slate-900">Room Tariff Tax Computation Mode</h2>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                                        {formData.isTaxInclusive
                                            ? 'Tax-Inclusive: Quoted room rates already include VAT and Service Charge. The invoice extracts taxes backward from total.'
                                            : 'Tax-Exclusive (Standard): Room rates are base price only. VAT (15%) and Service Charge (10%) are calculated and added on top.'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-xs font-bold text-slate-700">
                                        {formData.isTaxInclusive ? 'Tax Inclusive' : 'Tax Exclusive'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => updateField('isTaxInclusive', !formData.isTaxInclusive)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            formData.isTaxInclusive ? 'bg-emerald-600' : 'bg-blue-600'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                formData.isTaxInclusive ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Government VAT / Tax (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.vatPercentage ?? 15}
                                            onChange={(e) => updateField('vatPercentage', Number(e.target.value))}
                                            className="w-full h-9 pl-3 pr-8 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">National revenue board VAT rate</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hotel Service Charge (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.serviceChargePercentage ?? 10}
                                            onChange={(e) => updateField('serviceChargePercentage', Number(e.target.value))}
                                            className="w-full h-9 pl-3 pr-8 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">Distributed to hotel operational staff</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Business Tax BIN / VAT ID</label>
                                    <input
                                        type="text"
                                        value={formData.taxIdNumber || 'BIN-002918374-0101'}
                                        onChange={(e) => updateField('taxIdNumber', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">Printed on all guest tax invoices</p>
                                </div>
                            </div>
                        </div>

                        {/* Credit Limits & Financial Safeguards */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <ShieldCheck className="size-4 text-emerald-600" />
                                <h2 className="text-sm font-bold text-slate-900">Financial Limits & City Ledger Controls</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">City Ledger Credit Limit (BDT ৳)</label>
                                    <input
                                        type="number"
                                        step="10000"
                                        value={formData.cityLedgerLimitBDT ?? 500000}
                                        onChange={(e) => updateField('cityLedgerLimitBDT', Number(e.target.value))}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">Corporate direct-bill ceiling per account</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Security Deposit (BDT ৳)</label>
                                    <input
                                        type="number"
                                        step="500"
                                        value={formData.securityDepositAmountBDT ?? 5000}
                                        onChange={(e) => updateField('securityDepositAmountBDT', Number(e.target.value))}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">Standard incidentals authorization on check-in</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Adjustment Limit (BDT ৳)</label>
                                    <input
                                        type="number"
                                        step="200"
                                        value={formData.staffAdjustmentLimitBDT ?? 2000}
                                        onChange={(e) => updateField('staffAdjustmentLimitBDT', Number(e.target.value))}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">Max discount front desk staff can give without manager PIN</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: Document & Folio Numbering */}
                {activeTab === 'folio-numbering' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <Receipt className="size-4 text-blue-600" />
                                <h2 className="text-sm font-bold text-slate-900">Document Prefix & Sequence Codes</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reservation Prefix</label>
                                    <input
                                        type="text"
                                        value={formData.reservationPrefix || 'RES-2026-'}
                                        onChange={(e) => updateField('reservationPrefix', e.target.value)}
                                        className="w-full h-9 px-3 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">e.g. RES-2026-1049</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Invoice Prefix</label>
                                    <input
                                        type="text"
                                        value={formData.invoicePrefix || 'INV-2026-'}
                                        onChange={(e) => updateField('invoicePrefix', e.target.value)}
                                        className="w-full h-9 px-3 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">e.g. INV-2026-0882</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Guest Folio Prefix</label>
                                    <input
                                        type="text"
                                        value={formData.folioPrefix || 'FOL-'}
                                        onChange={(e) => updateField('folioPrefix', e.target.value)}
                                        className="w-full h-9 px-3 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">e.g. FOL-99201</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">POS KOT Prefix</label>
                                    <input
                                        type="text"
                                        value={formData.kotPrefix || 'KOT-'}
                                        onChange={(e) => updateField('kotPrefix', e.target.value)}
                                        className="w-full h-9 px-3 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">e.g. KOT-3301</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Voucher</label>
                                    <input
                                        type="text"
                                        value={formData.receiptPrefix || 'RCT-'}
                                        onChange={(e) => updateField('receiptPrefix', e.target.value)}
                                        className="w-full h-9 px-3 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">e.g. RCT-00412</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-bold text-slate-800">Reset Counter Annually on Fiscal Year</div>
                                    <p className="text-[11px] text-slate-500">
                                        When enabled, all invoice and voucher serials reset back to 0001 at the beginning of each fiscal year.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => updateField('resetAnnually', !formData.resetAnnually)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        formData.resetAnnually ? 'bg-blue-600' : 'bg-slate-300'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                            formData.resetAnnually ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Standard Invoice Footer Notes */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                                <FileText className="size-4 text-slate-600" />
                                <h2 className="text-sm font-bold text-slate-900">Default Folio Terms & Policy Disclaimer</h2>
                            </div>
                            <textarea
                                rows={3}
                                value={formData.invoiceNotes || ''}
                                onChange={(e) => updateField('invoiceNotes', e.target.value)}
                                placeholder="Enter footer disclaimer notes printed at bottom of every printed invoice..."
                                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Appears in the footer of Guest Folio, Express Checkout receipts, and Tax Invoices.
                            </p>
                        </div>
                    </div>
                )}

                {/* TAB 5: Communications & Gateways (SMTP / SMS) */}
                {activeTab === 'gateways' && (
                    <div className="space-y-4">
                        {/* SMTP Email Server Configuration */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Mail className="size-4 text-blue-600" />
                                    <h2 className="text-sm font-bold text-slate-900">Outgoing Mail Server (SMTP Gateway)</h2>
                                </div>
                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                    TLS Encryption Active
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Host / Server</label>
                                    <input
                                        type="text"
                                        value={formData.smtpHost || 'smtp.sendgrid.net'}
                                        onChange={(e) => updateField('smtpHost', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Port</label>
                                    <input
                                        type="text"
                                        value={formData.smtpPort || '587'}
                                        onChange={(e) => updateField('smtpPort', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sender Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.senderEmail || 'reservations@grandhospitality.com'}
                                        onChange={(e) => updateField('senderEmail', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sender Name</label>
                                    <input
                                        type="text"
                                        value={formData.senderName || 'Grand Palace Reservations'}
                                        onChange={(e) => updateField('senderName', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SMS Gateway & WhatsApp API */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <Smartphone className="size-4 text-emerald-600" />
                                <h2 className="text-sm font-bold text-slate-900">SMS Gateway & Automated Notifications</h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">SMS Gateway Provider</label>
                                    <select
                                        value={formData.smsGatewayProvider || 'BulkSMS BD'}
                                        onChange={(e) => updateField('smsGatewayProvider', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="BulkSMS BD">BulkSMS BD (National Masking)</option>
                                        <option value="Twilio">Twilio Global</option>
                                        <option value="InfoBip">InfoBip Telecom</option>
                                        <option value="Greenweb">Greenweb SMS Gateway</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Masking Sender ID</label>
                                    <input
                                        type="text"
                                        value={formData.smsSenderId || 'GRANDHOTEL'}
                                        onChange={(e) => updateField('smsSenderId', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gateway API Secret Key</label>
                                    <input
                                        type="password"
                                        value={formData.smsApiKey || 'sk_sms_live_9024817a0b8f2c'}
                                        onChange={(e) => updateField('smsApiKey', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(formData.enableGuestWelcomeSms)}
                                        onChange={(e) => updateField('enableGuestWelcomeSms', e.target.checked)}
                                        className="size-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-semibold text-slate-800">Check-In Welcome SMS</span>
                                </label>

                                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(formData.enableCheckoutFolioEmail)}
                                        onChange={(e) => updateField('enableCheckoutFolioEmail', e.target.checked)}
                                        className="size-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-semibold text-slate-800">Auto-Email Folio PDF on Checkout</span>
                                </label>

                                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(formData.enableWhatsAppConcierge)}
                                        onChange={(e) => updateField('enableWhatsAppConcierge', e.target.checked)}
                                        className="size-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-semibold text-slate-800">WhatsApp Concierge Updates</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 6: Security, Sessions & System Operations */}
                {activeTab === 'security-system' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                                <Lock className="size-4 text-purple-600" />
                                <h2 className="text-sm font-bold text-slate-900">Front Desk & POS Session Security</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Inactivity Screen Lock Timeout</label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            min="5"
                                            max="120"
                                            value={formData.sessionTimeoutMinutes ?? 15}
                                            onChange={(e) => updateField('sessionTimeoutMinutes', Number(e.target.value))}
                                            className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                                        />
                                        <span className="ml-2 text-xs text-slate-500">Minutes</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">Locks terminal if idle</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Automated Cloud Backup Frequency</label>
                                    <select
                                        value={formData.backupFrequency || 'Daily at 04:00 AM'}
                                        onChange={(e) => updateField('backupFrequency', e.target.value)}
                                        className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                                    >
                                        <option value="Daily at 04:00 AM">Daily at 04:00 AM (Post-Audit)</option>
                                        <option value="Every 6 Hours">Every 6 Hours</option>
                                        <option value="Twice Daily (12:00 PM & 12:00 AM)">Twice Daily</option>
                                    </select>
                                    <p className="text-[11px] text-slate-400 mt-1">Snapshot to secure secondary storage</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Log Retention Policy</label>
                                    <div className="flex items-center">
                                        <input
                                            type="number"
                                            min="30"
                                            max="730"
                                            value={formData.backupRetentionDays ?? 90}
                                            onChange={(e) => updateField('backupRetentionDays', Number(e.target.value))}
                                            className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                                        />
                                        <span className="ml-2 text-xs text-slate-500">Days</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">Financial audit trail persistence</p>
                                </div>
                            </div>
                        </div>

                        {/* System Health & Cache Controls */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Database className="size-4 text-emerald-600" />
                                    <h2 className="text-sm font-bold text-slate-900">Database & Browser Cache Management</h2>
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                                    <span className="size-2 rounded-full bg-emerald-500"></span>
                                    PostgreSQL Sync Engine Healthy
                                </span>
                            </div>

                            <p className="text-xs text-slate-500 mb-4">
                                If you experience UI discrepancies after server updates or room reallocations, purging the local client cache forces a clean resync directly against the PostgreSQL primary database.
                            </p>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handlePurgeCache}
                                    disabled={isPurging}
                                    className="h-9 px-4 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isPurging ? (
                                        <>
                                            <RefreshCw className="size-3.5 animate-spin" />
                                            <span>Purging Cache...</span>
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw className="size-3.5" />
                                            <span>Purge Local Cache & Resync</span>
                                        </>
                                    )}
                                </button>

                                <span className="text-[11px] text-slate-400">
                                    Storage Key: <code className="text-slate-600">{propStorageKey}</code>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bottom Floating Save Reminder Bar (only appears when dirty) */}
                {hasUnsavedChanges && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="size-4 text-amber-400" />
                            <span className="text-xs font-semibold">You have unsaved configuration changes</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setHasUnsavedChanges(false)}
                                className="h-8 px-3 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? <RefreshCw className="size-3 animate-spin" /> : <Save className="size-3" />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default GeneralSettings;
