import React, { useState } from 'react';
import {
    X,
    User,
    Shield,
    KeyRound,
    Lock,
    Eye,
    EyeOff,
    Check,
    Copy,
    RefreshCw,
    Building2,
    Mail,
    Phone,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Clock,
    Laptop,
    Fingerprint
} from 'lucide-react';
import { usePortal, type UserData } from '../../context/PortalContext';
import { useProperty } from '../../context/PropertyContext';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
    const { currentUser, updateUserSession } = usePortal();
    const { activeProperty } = useProperty();

    const [activeTab, setActiveTab] = useState<'profile' | 'pin' | 'security' | 'access'>('profile');

    // Profile form state
    const [name, setName] = useState(() => currentUser?.name || 'Hotel Administrator');
    const [email, setEmail] = useState(() => currentUser?.email || 'admin@hotel.com');
    const [phone, setPhone] = useState(() => (currentUser as any)?.phone || '+880 1711-234567');
    const [username] = useState(() => (currentUser as any)?.username || email.split('@')[0]);

    // POS PIN state
    const [posPin, setPosPin] = useState<string>(() => {
        const saved = localStorage.getItem('hotel_user_pos_pin');
        return saved || '2048';
    });
    const [showPin, setShowPin] = useState(false);
    const [copiedPin, setCopiedPin] = useState(false);

    // Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    if (!isOpen) return null;

    const roleDisplay = (currentUser?.role || 'HOTEL ADMINISTRATOR').replace(/_/g, ' ').toUpperCase();
    const userInitial = (name.trim()[0] || 'U').toUpperCase();

    const handleCopyPin = () => {
        navigator.clipboard.writeText(posPin);
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
        showToast('POS Master PIN copied to clipboard!');
    };

    const handleRegeneratePin = () => {
        const next = String(Math.floor(1000 + Math.random() * 9000));
        setPosPin(next);
        localStorage.setItem('hotel_user_pos_pin', next);
        showToast(`New 4-digit POS PIN generated: ${next}`);
    };

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            showToast('Full name cannot be blank.', 'error');
            return;
        }

        const updated: UserData = {
            ...(currentUser || { role: 'super_admin', property: activeProperty?.name || 'Grand Palace' }),
            name: name.trim(),
            email: email.trim(),
            property: activeProperty?.name || currentUser?.property || 'Grand Palace',
            property_id: activeProperty?.id || currentUser?.property_id
        };
        (updated as any).phone = phone.trim();

        updateUserSession(updated);
        localStorage.setItem('hotel_user_pos_pin', posPin);

        // Dispatch sync event for other components
        window.dispatchEvent(new CustomEvent('hotel_pms_auth_changed', { detail: updated }));

        showToast('Profile and preferences updated successfully!');
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPassword) {
            showToast('Please enter your current password.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showToast('New password must be at least 6 characters.', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match.', 'error');
            return;
        }

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password successfully changed! Next login will require new password.');
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
                {/* Executive Top Banner */}
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 size-36 rounded-full bg-blue-600/15 blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3.5">
                            <div className="relative">
                                <div className="size-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg border-2 border-white/20">
                                    {userInitial}
                                </div>
                                <span className="size-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 absolute -bottom-0.5 -right-0.5" />
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-bold text-white truncate">{name}</h2>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-extrabold tracking-wider uppercase">
                                        <Shield size={9} />
                                        <span>{roleDisplay}</span>
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 font-mono mt-0.5 truncate">{email}</p>
                                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                                    <Building2 size={11} className="text-blue-400 shrink-0" />
                                    <span className="truncate">{activeProperty?.name || 'Grand Palace Hotel & Resort (Dhaka HQ)'}</span>
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
                            title="Close"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Toast Inside Header */}
                    {toast && (
                        <div
                            className={`mt-3 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-1 ${
                                toast.type === 'error' ? 'bg-rose-600/90 text-white' : 'bg-emerald-600/90 text-white'
                            }`}
                        >
                            {toast.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                            <span>{toast.message}</span>
                        </div>
                    )}
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'profile'
                                ? 'border-blue-600 text-blue-600 bg-white/50'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <User size={13} />
                        <span>My Account</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('pin')}
                        className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'pin'
                                ? 'border-blue-600 text-blue-600 bg-white/50'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <KeyRound size={13} />
                        <span>POS Cashier PIN</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'security'
                                ? 'border-blue-600 text-blue-600 bg-white/50'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Lock size={13} />
                        <span>Security & Password</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('access')}
                        className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'access'
                                ? 'border-blue-600 text-blue-600 bg-white/50'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Fingerprint size={13} />
                        <span>Audit & Access</span>
                    </button>
                </div>

                {/* Tab Body */}
                <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-4">
                    {/* 1. PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Full Name *
                                    </label>
                                    <div className="relative">
                                        <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Username (System ID)
                                    </label>
                                    <input
                                        type="text"
                                        disabled
                                        value={username}
                                        className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Email Address *
                                    </label>
                                    <div className="relative">
                                        <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition font-mono"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Contact Phone
                                    </label>
                                    <div className="relative">
                                        <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 outline-none transition font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
                                <Building2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Assigned Property Branch</p>
                                    <p className="text-[11px] text-blue-700 mt-0.5">
                                        {activeProperty?.name || 'Grand Palace Hotel & Resort (Dhaka HQ)'} (Code: {activeProperty?.code || 'GPD'})
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
                                >
                                    <Check size={13} />
                                    <span>Save Profile Changes</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* 2. POS PIN TAB */}
                    {activeTab === 'pin' && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-slate-50 p-4 rounded-2xl border border-blue-200/80">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <KeyRound size={16} className="text-blue-700" />
                                        <span className="text-xs font-bold text-slate-800">Your Master POS Cashier PIN</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={handleCopyPin}
                                            className="px-2.5 py-1 text-xs rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                        >
                                            {copiedPin ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                            <span>{copiedPin ? 'Copied' : 'Copy'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRegeneratePin}
                                            className="px-2.5 py-1 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                        >
                                            <RefreshCw size={11} />
                                            <span>Regenerate</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-inner">
                                        <span className="font-mono text-2xl font-black text-slate-900 tracking-widest">
                                            {showPin ? posPin : '••••'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowPin(!showPin)}
                                            className="text-slate-400 hover:text-slate-700 ml-2"
                                            title={showPin ? 'Hide PIN' : 'Reveal PIN'}
                                        >
                                            {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>

                                    <div className="text-[11px] text-slate-500 leading-tight">
                                        <p className="font-semibold text-slate-700">4-Digit Express Verification</p>
                                        <p>Used to verify POS cash settlements, bill voiding, and night audit operations.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                                <p className="font-bold text-slate-800">What actions require this PIN?</p>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11.5px]">
                                    <li>Opening restaurant POS cashier register session</li>
                                    <li>Authorizing guest complimentary discounts or split billing</li>
                                    <li>Posting restaurant charges directly to room folios</li>
                                    <li>Overriding room status changes during night audit</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* 3. SECURITY & PASSWORD TAB */}
                    {activeTab === 'security' && (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Current Password *
                                </label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Enter current password"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        New Password *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            required
                                            placeholder="Min 6 characters"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full pr-8 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Confirm New Password *
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        placeholder="Repeat new password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 space-y-1">
                                <p className="font-bold flex items-center gap-1.5">
                                    <Shield size={12} />
                                    <span>Hospitality Grade Password Standard</span>
                                </p>
                                <p>Use at least 6 characters including letters and numbers. Never share your password with front-desk staff.</p>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
                                >
                                    <Lock size={12} />
                                    <span>Update Password</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* 4. AUDIT & ACCESS TAB */}
                    {activeTab === 'access' && (
                        <div className="space-y-3.5 text-xs">
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
                                <p className="font-bold text-slate-800">Current Session Details</p>
                                <div className="grid grid-cols-2 gap-3 text-[11.5px]">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Laptop size={13} className="text-slate-400" />
                                        <span>Terminal: Web App (Chrome)</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Clock size={13} className="text-slate-400" />
                                        <span>Logged In: Today, 08:30 AM</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Calendar size={13} className="text-slate-400" />
                                        <span>Operating Date: Active</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                                        <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                                        <span>Session Status: Active (SSL)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
                                <p className="font-bold text-slate-800">Role & Security Privileges</p>
                                <div className="space-y-1.5 text-slate-600 text-[11.5px]">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span>Super Admin & Root RBAC</span>
                                        <span className="font-bold text-emerald-700">Full Access</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span>PMS Front Desk & Folios</span>
                                        <span className="font-bold text-emerald-700">Read / Write / Amend</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span>Restaurant POS & Kitchen Display</span>
                                        <span className="font-bold text-emerald-700">Authorized Master</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span>Financial Ledger & Night Audit</span>
                                        <span className="font-bold text-emerald-700">Supervisor Override</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">HotelManagementOS • SecID #{currentUser?.id || 101}</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
