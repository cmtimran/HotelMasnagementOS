import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getActivePropertyId } from '../../utils/apiUrl';
import {
    MessageSquare,
    Plus,
    Trash2,
    RefreshCw,
    Copy,
    Check,
    X,
    Clock,
    ShieldAlert,
    Bell,
    Sparkles,
    Save,
    Zap
} from 'lucide-react';

export interface ConnectedAccount {
    id: number;
    property_id: number;
    channel_type: 'WHATSAPP' | 'FACEBOOK_PAGE' | 'INSTAGRAM_BUSINESS';
    account_name: string;
    account_identifier: string;
    page_username?: string;
    phone_number?: string;
    ai_mode: 'OFF' | 'SUGGEST' | 'AUTOPILOT';
    auto_reply_comments: boolean;
    send_private_dm_on_comment: boolean;
    comment_ai_prompt?: string;
    is_active: boolean;
    created_at: string;
}

interface MultiChannelSettingsPanelProps {
    propertyId?: number | string;
    showToast?: (msg: string, opts?: any) => void;
}

export const MultiChannelSettingsPanel: React.FC<MultiChannelSettingsPanelProps> = ({
    propertyId,
    showToast
}) => {
    const activePropId = propertyId || getActivePropertyId();
    const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'HOLD_ENGINE'>('ACCOUNTS');

    // Connected Accounts State
    const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);

    // AI Courtesy Hold & Auto-Cancel Engine State
    const [holdDurationHours, setHoldDurationHours] = useState<number>(24);
    const [autoCancelHolds, setAutoCancelHolds] = useState<boolean>(true);
    const [holdFollowUpEnabled, setHoldFollowUpEnabled] = useState<boolean>(true);
    const [holdFollowUpLeadHours, setHoldFollowUpLeadHours] = useState<number>(2);
    const [notifyOnRelease, setNotifyOnRelease] = useState<boolean>(true);
    const [savingSettings, setSavingSettings] = useState<boolean>(false);
    const [triggeringCheck, setTriggeringCheck] = useState<boolean>(false);

    // Form State for Adding Account
    const [formChannelType, setFormChannelType] = useState<'WHATSAPP' | 'FACEBOOK_PAGE' | 'INSTAGRAM_BUSINESS'>('WHATSAPP');
    const [formAccountName, setFormAccountName] = useState<string>('');
    const [formAccountIdentifier, setFormAccountIdentifier] = useState<string>('');
    const [formPageUsername, setFormPageUsername] = useState<string>('');
    const [formPhoneNumber, setFormPhoneNumber] = useState<string>('');
    const [formAccessToken, setFormAccessToken] = useState<string>('');
    const [formVerifyToken, setFormVerifyToken] = useState<string>('');
    const [formAppSecret, setFormAppSecret] = useState<string>('');
    const [formAiMode, setFormAiMode] = useState<'OFF' | 'SUGGEST' | 'AUTOPILOT'>('SUGGEST');
    const [formAutoReplyComments, setFormAutoReplyComments] = useState<boolean>(true);
    const [formSendPrivateDm, setFormSendPrivateDm] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);

    const webhookUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/cx/webhook`
        : '/api/cx/webhook';

    // 1. Fetch Connected Accounts
    const fetchAccounts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`${getApiBaseUrl()}/api/cx/accounts?propertyId=${activePropId}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setAccounts(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch accounts:', err);
        } finally {
            setLoading(false);
        }
    }, [activePropId]);

    // 2. Fetch AI Hold & Auto-Cancel Settings
    const fetchHoldSettings = useCallback(async () => {
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/cx/settings?propertyId=${activePropId}`);
            const data = await res.json();
            if (data.success && data.data) {
                setHoldDurationHours(Number(data.data.aiCourtesyHoldDurationHours) || 24);
                setAutoCancelHolds(data.data.aiAutoCancelHolds !== false);
                setHoldFollowUpEnabled(data.data.aiHoldFollowUpEnabled !== false);
                setHoldFollowUpLeadHours(Number(data.data.aiHoldFollowUpLeadHours) || 2);
                setNotifyOnRelease(data.data.aiNotifyGuestOnRelease !== false);
            }
        } catch (err) {
            console.error('Failed to fetch CX hold settings:', err);
        }
    }, [activePropId]);

    useEffect(() => {
        fetchAccounts();
        fetchHoldSettings();
    }, [fetchAccounts, fetchHoldSettings]);

    // Save AI Courtesy Hold Settings
    const handleSaveHoldSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/cx/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: activePropId,
                    aiCourtesyHoldDurationHours: holdDurationHours,
                    aiAutoCancelHolds: autoCancelHolds,
                    aiHoldFollowUpEnabled: holdFollowUpEnabled,
                    aiHoldFollowUpLeadHours: holdFollowUpLeadHours,
                    aiNotifyGuestOnRelease: notifyOnRelease
                })
            });
            const data = await res.json();
            if (data.success) {
                if (showToast) showToast('AI Courtesy Hold & Auto-Cancel settings saved successfully!', { type: 'success' });
                else alert('Settings saved successfully!');
            } else {
                alert(data.error || 'Failed to save settings');
            }
        } catch (err) {
            console.error('Failed to save hold settings:', err);
            alert('Failed to save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    // Trigger Manual Lifecycle Check
    const handleTriggerLifecycleCheck = async () => {
        setTriggeringCheck(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/cx/process-holds`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId: activePropId })
            });
            const data = await res.json();
            if (data.success) {
                const { remindersSent, holdsReleased } = data.data || {};
                const msg = `Hold Lifecycle Engine executed successfully!\n• Pre-cancellation WhatsApp reminders sent: ${remindersSent || 0}\n• Expired holds auto-cancelled & rooms released: ${holdsReleased || 0}`;
                if (showToast) showToast(`Processed: ${remindersSent || 0} reminders, ${holdsReleased || 0} released`, { type: 'success' });
                else alert(msg);
            } else {
                alert(data.error || 'Execution failed');
            }
        } catch (err) {
            console.error('Failed to trigger lifecycle check:', err);
            alert('Failed to trigger check');
        } finally {
            setTriggeringCheck(false);
        }
    };

    // Copy Webhook URL
    const handleCopyWebhook = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(webhookUrl);
            setCopiedWebhook(true);
            setTimeout(() => setCopiedWebhook(false), 2000);
            if (showToast) showToast('Meta Webhook URL copied to clipboard!', { type: 'success' });
        }
    };

    // Submit Add Account
    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formAccountName.trim() || !formAccountIdentifier.trim() || !formAccessToken.trim()) {
            alert('Please fill in Account Name, Identifier (ID), and Access Token.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/cx/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: activePropId,
                    channelType: formChannelType,
                    accountName: formAccountName.trim(),
                    accountIdentifier: formAccountIdentifier.trim(),
                    pageUsername: formPageUsername.trim() || undefined,
                    phoneNumber: formPhoneNumber.trim() || undefined,
                    accessToken: formAccessToken.trim(),
                    verifyToken: formVerifyToken.trim() || undefined,
                    appSecret: formAppSecret.trim() || undefined,
                    aiMode: formAiMode,
                    autoReplyComments: formAutoReplyComments,
                    sendPrivateDmOnComment: formSendPrivateDm
                })
            });

            const data = await res.json();
            if (data.success) {
                setShowAddModal(false);
                setFormAccountName('');
                setFormAccountIdentifier('');
                setFormPageUsername('');
                setFormPhoneNumber('');
                setFormAccessToken('');
                fetchAccounts();
                if (showToast) showToast('Account connected successfully!', { type: 'success' });
            } else {
                alert(data.error || 'Failed to connect account');
            }
        } catch (err) {
            console.error('Error adding account:', err);
            alert('Failed to save account');
        } finally {
            setSaving(false);
        }
    };

    // Delete / Disconnect Account
    const handleDeleteAccount = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to disconnect "${name}"?`)) return;

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/cx/accounts/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setAccounts(prev => prev.filter(a => a.id !== id));
                if (showToast) showToast('Account disconnected', { type: 'success' });
            }
        } catch (err) {
            console.error('Failed to delete account:', err);
        }
    };

    // Quick AI Mode Toggle
    const handleToggleAiMode = async (account: ConnectedAccount, mode: 'OFF' | 'SUGGEST' | 'AUTOPILOT') => {
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/cx/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: account.property_id,
                    channelType: account.channel_type,
                    accountName: account.account_name,
                    accountIdentifier: account.account_identifier,
                    accessToken: 'UNCHANGED',
                    aiMode: mode,
                    autoReplyComments: account.auto_reply_comments,
                    sendPrivateDmOnComment: account.send_private_dm_on_comment
                })
            });
            const data = await res.json();
            if (data.success) {
                setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, ai_mode: mode } : a));
            }
        } catch (err) {
            console.error('Failed to toggle AI mode:', err);
        }
    };

    return (
        <div className="space-y-5">
            {/* Navigation Tabs Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('ACCOUNTS')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'ACCOUNTS'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Connected Accounts ({accounts.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('HOLD_ENGINE')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'HOLD_ENGINE'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>AI Courtesy Hold & Auto-Cancel Engine</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-800 font-extrabold border border-emerald-400/40">
                            Active
                        </span>
                    </button>
                </div>

                {activeTab === 'ACCOUNTS' ? (
                    <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Connect New Account</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleTriggerLifecycleCheck}
                        disabled={triggeringCheck}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        title="Force check hold expiration cutoff and dispatch pre-cancellation reminders"
                    >
                        <Zap className={`w-3.5 h-3.5 ${triggeringCheck ? 'animate-spin' : ''}`} />
                        <span>{triggeringCheck ? 'Checking...' : 'Run Lifecycle Check Now'}</span>
                    </button>
                )}
            </div>

            {/* TAB 1: CONNECTED ACCOUNTS & META WEBHOOK */}
            {activeTab === 'ACCOUNTS' && (
                <div className="space-y-6">
                    {/* Webhook URL Bar */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2 truncate">
                            <span className="font-semibold text-slate-700 whitespace-nowrap">Meta Webhook URL:</span>
                            <code className="text-[11px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200 truncate">
                                {webhookUrl}
                            </code>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyWebhook}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1 cursor-pointer whitespace-nowrap shadow-2xs"
                        >
                            {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{copiedWebhook ? 'Copied' : 'Copy URL'}</span>
                        </button>
                    </div>

                    {/* Connected Accounts List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                                Live Connected Channels ({accounts.length})
                            </h4>
                            <button
                                type="button"
                                onClick={fetchAccounts}
                                className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                                <span>Refresh</span>
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                                Loading connected channels...
                            </div>
                        ) : accounts.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border-2 border-dashed border-slate-200 space-y-2">
                                <p className="font-semibold">No social channels connected yet.</p>
                                <p className="text-slate-400">Click &quot;Connect New Account&quot; to link your WhatsApp Business Number, Facebook Page, or Instagram account.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {accounts.map((acc) => (
                                    <div
                                        key={acc.id}
                                        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center space-x-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        acc.channel_type === 'WHATSAPP'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : acc.channel_type === 'FACEBOOK_PAGE'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-pink-100 text-pink-800'
                                                    }`}>
                                                        {acc.channel_type.replace('_', ' ')}
                                                    </span>
                                                    <span className="font-bold text-slate-800 text-sm">{acc.account_name}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-mono">
                                                    {acc.phone_number || acc.page_username || acc.account_identifier}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAccount(acc.id, acc.account_name)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                title="Disconnect account"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">AI Copilot Mode:</span>
                                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-bold">
                                                {(['OFF', 'SUGGEST', 'AUTOPILOT'] as const).map((m) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => handleToggleAiMode(acc, m)}
                                                        className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                                                            acc.ai_mode === m
                                                                ? 'bg-white text-emerald-700 shadow-2xs'
                                                                : 'text-slate-600 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        {m === 'SUGGEST' ? 'Suggest' : m === 'AUTOPILOT' ? 'Autopilot' : 'Off'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: AI COURTESY HOLD & AUTO-CANCEL ENGINE */}
            {activeTab === 'HOLD_ENGINE' && (
                <form onSubmit={handleSaveHoldSettings} className="space-y-6 animate-in fade-in duration-150">
                    {/* Main Settings Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-2xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-emerald-600" />
                                    StayPulse AI Courtesy Hold Duration & Rules
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Configure how long guest rooms are held when reserved via WhatsApp/Omnichannel AI, and manage automated follow-ups.
                                </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Dynamic Engine
                            </span>
                        </div>

                        {/* Row 1: Hold Duration Selector */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                                    <span>AI Provisional Courtesy Hold Duration (Hours)</span>
                                    <span className="text-[11px] font-mono text-emerald-700 font-bold">{holdDurationHours} Hours</span>
                                </label>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {[2, 6, 12, 24, 48].map((h) => (
                                        <button
                                            key={h}
                                            type="button"
                                            onClick={() => setHoldDurationHours(h)}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                                holdDurationHours === h
                                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                                            }`}
                                        >
                                            {h}h {h === 24 ? '(Def)' : ''}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    When a guest confirms a reservation via chat, AI creates an unassigned room hold with this expiration timeframe.
                                </p>
                            </div>

                            {/* Custom Hours Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-800">
                                    Custom Hold Duration (Direct Input)
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="168"
                                        value={holdDurationHours}
                                        onChange={(e) => setHoldDurationHours(Math.max(1, parseInt(e.target.value) || 24))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Hours</span>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    Supported range: 1 hour to 168 hours (7 days).
                                </p>
                            </div>
                        </div>

                        {/* Row 2: Auto-Cancel & Inventory Release Policy */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                        Auto-Cancel Expired Courtesy Holds
                                    </span>
                                    <p className="text-[11px] text-slate-500">
                                        When the hold deadline passes without deposit or confirmation, automatically cancel the hold and return the room to available inventory.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoCancelHolds}
                                        onChange={(e) => setAutoCancelHolds(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Row 3: Automated Pre-Cancellation Follow-up Reminder */}
                        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                        <Bell className="w-3.5 h-3.5 text-emerald-700" />
                                        Automated WhatsApp Pre-Cancellation Follow-up
                                    </span>
                                    <p className="text-[11px] text-emerald-700">
                                        AI concierge automatically sends a reminder message to the guest before cancelling the hold, offering a Fast-Pass pre-check-in link.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={holdFollowUpEnabled}
                                        onChange={(e) => setHoldFollowUpEnabled(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>

                            {holdFollowUpEnabled && (
                                <div className="pt-3 border-t border-emerald-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-emerald-900">
                                            Follow-Up Reminder Lead Time (Hours before cancellation):
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            {[1, 2, 3, 4].map((lead) => (
                                                <button
                                                    key={lead}
                                                    type="button"
                                                    onClick={() => setHoldFollowUpLeadHours(lead)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                                        holdFollowUpLeadHours === lead
                                                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                                            : 'bg-white hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                                    }`}
                                                >
                                                    {lead} Hour{lead > 1 ? 's' : ''} {lead === 2 ? '(Rec)' : ''}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Live Template Preview */}
                                    <div className="bg-white rounded-xl border border-emerald-200 p-3 space-y-2">
                                        <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 flex items-center gap-1">
                                            <Sparkles className="w-3 h-3 text-emerald-600" />
                                            WhatsApp Follow-up Message Preview:
                                        </span>
                                        <div className="p-2.5 bg-emerald-50/70 rounded-lg text-xs font-sans text-slate-800 leading-relaxed border border-emerald-100 font-medium space-y-1.5">
                                            <p>
                                                আসসালামু আলাইকুম <strong>Imran Hossain</strong> স্যার! Grand Palace Hotel & Resort-এ আপনার <strong>Deluxe Suite</strong> রুমের প্রি-বুকিং সৌজন্য হোল্ডটির (Ref: <strong>RES-2026-81859</strong>) সময়সীমা আর মাত্র <strong>{holdFollowUpLeadHours} ঘণ্টার</strong> মধ্যে শেষ হতে চলেছে। ⏳
                                            </p>
                                            <p>
                                                আপনি কি আপনার বুকিংটি নিশ্চিত করতে চান? রুমটি শতভাগ সুরক্ষিত রাখতে নিচের লিংকে ক্লিক করে ডিজিটাল প্রি-চেক-ইন অথবা অগ্রিম ডিপোজিট সম্পন্ন করুন:
                                            </p>
                                            <code className="text-[11px] text-blue-700 block font-mono">
                                                👉 http://localhost:5173/guestflow?precheckin=RES-2026-81859
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Row 4: Courteous Release Notice */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-slate-900">
                                        Send Courteous Notice to Guest Upon Room Release
                                    </span>
                                    <p className="text-[11px] text-slate-500">
                                        If the hold is cancelled due to deadline expiry, send a polite message welcoming the guest to book again anytime.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notifyOnRelease}
                                        onChange={(e) => setNotifyOnRelease(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Actions Bar */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <span className="text-xs text-slate-400">
                                Settings apply automatically to all incoming WhatsApp & Omnichannel AI bookings.
                            </span>
                            <button
                                type="submit"
                                disabled={savingSettings}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 text-xs"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{savingSettings ? 'Saving...' : 'Save Hold Settings'}</span>
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Modal for Adding New Social / Messaging Account */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">Connect Social / Messaging Channel</h3>
                                <p className="text-xs text-slate-500">Provide official Meta Cloud API credentials</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddAccount} className="space-y-4 text-xs">
                            {/* Channel Type */}
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Select Channel Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { type: 'WHATSAPP', label: 'WhatsApp' },
                                        { type: 'FACEBOOK_PAGE', label: 'Facebook Page' },
                                        { type: 'INSTAGRAM_BUSINESS', label: 'Instagram' }
                                    ].map((c) => (
                                        <button
                                            key={c.type}
                                            type="button"
                                            onClick={() => setFormChannelType(c.type as any)}
                                            className={`py-2 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                                                formChannelType === c.type
                                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                                    : 'border-slate-200 bg-white text-slate-600'
                                            }`}
                                        >
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Account Name & Identifier */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Account Display Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Grand Palace FrontDesk"
                                        value={formAccountName}
                                        onChange={(e) => setFormAccountName(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">
                                        {formChannelType === 'WHATSAPP' ? 'Phone Number ID' : 'Page / IG Account ID'}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 104829104928"
                                        value={formAccountIdentifier}
                                        onChange={(e) => setFormAccountIdentifier(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-[11px]"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Phone / Username */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Display Phone Number (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="+8801700000000"
                                        value={formPhoneNumber}
                                        onChange={(e) => setFormPhoneNumber(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Username / Handle (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="@grandpalacehotel"
                                        value={formPageUsername}
                                        onChange={(e) => setFormPageUsername(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Meta Access Token */}
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    Meta Graph Access Token (Page or System User Token)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="EAAG... (Requires whatsapp_business_messaging, pages_messaging, or instagram_manage_comments)"
                                    value={formAccessToken}
                                    onChange={(e) => setFormAccessToken(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono resize-none text-[11px]"
                                    required
                                />
                            </div>

                            {/* Verify Token & App Secret */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Webhook Verify Token</label>
                                    <input
                                        type="text"
                                        placeholder="Secret Verify Token"
                                        value={formVerifyToken}
                                        onChange={(e) => setFormVerifyToken(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Meta App Secret</label>
                                    <input
                                        type="password"
                                        placeholder="App Secret"
                                        value={formAppSecret}
                                        onChange={(e) => setFormAppSecret(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Post Comment Automations (For FB & IG) */}
                            {formChannelType !== 'WHATSAPP' && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                    <span className="font-bold text-slate-800 block">Post & Reel Comment Automation</span>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formAutoReplyComments}
                                            onChange={(e) => setFormAutoReplyComments(e.target.checked)}
                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>Auto-reply publicly to comments inquiring about price or availability</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formSendPrivateDm}
                                            onChange={(e) => setFormSendPrivateDm(e.target.checked)}
                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>Automatically dispatch private DM with room categories & reservation link</span>
                                    </label>
                                </div>
                            )}

                            {/* AI Mode */}
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Default AI Reply Mode</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { m: 'OFF', label: 'Human Only' },
                                        { m: 'SUGGEST', label: 'Copilot (Suggest)' },
                                        { m: 'AUTOPILOT', label: 'Autopilot' }
                                    ].map((mode) => (
                                        <button
                                            key={mode.m}
                                            type="button"
                                            onClick={() => setFormAiMode(mode.m as any)}
                                            className={`py-2 rounded-xl border text-center font-bold text-xs cursor-pointer ${
                                                formAiMode === mode.m
                                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                                    : 'border-slate-200 bg-white text-slate-600'
                                            }`}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-sm disabled:opacity-50 cursor-pointer"
                                >
                                    {saving ? 'Connecting...' : 'Save & Connect'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiChannelSettingsPanel;
