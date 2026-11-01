import React, { useState, useEffect, useMemo } from 'react';
import {
    X, GitMerge, ShieldCheck, CheckCircle2,
    Phone, Mail, FileText
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiUrl';
import { toast } from '../../context/ToastContext';

export interface CandidateGuest {
    id: number;
    title?: string;
    salutation?: string;
    firstName?: string;
    lastName?: string;
    name: string;
    phone: string;
    email?: string;
    idType?: string;
    idNumber?: string;
    vipTier?: string;
    vipStatus?: string;
    nationality?: string;
    address?: string;
    city?: string;
    totalStays?: number;
    totalSpend?: number;
    lifetimeSpendBDT?: number;
}

interface MergeGuestModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidateGuests: CandidateGuest[];
    mergeReason?: string;
    onMergeSuccess: (mergedProfile: any) => void;
}

export const MergeGuestModal: React.FC<MergeGuestModalProps> = ({
    isOpen,
    onClose,
    candidateGuests = [],
    mergeReason,
    onMergeSuccess
}) => {
    // Pick highest stay count or first candidate as default primary (computed unconditionally for hooks)
    const defaultPrimaryId = useMemo(() => {
        if (!candidateGuests || candidateGuests.length === 0) return 0;
        return [...candidateGuests].sort((a, b) => 
            (Number(b.totalStays || 0) + Number(b.totalSpend || b.lifetimeSpendBDT || 0)) -
            (Number(a.totalStays || 0) + Number(a.totalSpend || a.lifetimeSpendBDT || 0))
        )[0]?.id || candidateGuests[0]?.id || 0;
    }, [candidateGuests]);

    const [primaryId, setPrimaryId] = useState<number>(defaultPrimaryId);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const primaryGuest = (candidateGuests && candidateGuests.find(g => g.id === primaryId)) || (candidateGuests && candidateGuests[0]);
    const secondaryGuests = candidateGuests ? candidateGuests.filter(g => g.id !== primaryId) : [];

    // Form fields to keep on primary
    const [selectedName, setSelectedName] = useState(primaryGuest?.name || '');
    const [selectedPhone, setSelectedPhone] = useState(primaryGuest?.phone || '');
    const [selectedEmail, setSelectedEmail] = useState(primaryGuest?.email || '');
    const [selectedIdNumber, setSelectedIdNumber] = useState(primaryGuest?.idNumber || '');
    const [selectedVip, setSelectedVip] = useState(primaryGuest?.vipTier || primaryGuest?.vipStatus || 'Regular');

    useEffect(() => {
        if (candidateGuests && candidateGuests.length > 0) {
            setPrimaryId(defaultPrimaryId);
            const p = candidateGuests.find(g => g.id === defaultPrimaryId) || candidateGuests[0];
            if (p) {
                setSelectedName(p.name || '');
                setSelectedPhone(p.phone || '');
                setSelectedEmail(p.email || '');
                setSelectedIdNumber(p.idNumber || '');
                setSelectedVip(p.vipTier || p.vipStatus || 'Regular');
            }
        }
    }, [candidateGuests, defaultPrimaryId]);

    if (!isOpen || !candidateGuests || candidateGuests.length < 2) return null;

    const handleSelectPrimary = (id: number) => {
        setPrimaryId(id);
        const g = candidateGuests.find(c => c.id === id);
        if (g) {
            setSelectedName(g.name);
            setSelectedPhone(g.phone);
            setSelectedEmail(g.email || '');
            setSelectedIdNumber(g.idNumber || '');
            setSelectedVip(g.vipTier || g.vipStatus || 'Regular');
        }
    };

    const handleConfirmMerge = async () => {
        setIsSubmitting(true);
        try {
            const API_BASE = getApiBaseUrl();
            const nameParts = selectedName.replace(/^(Mr|Mrs|Ms|Dr|Prof|Engr)\.?\s+/i, '').trim().split(' ');
            const firstName = nameParts[0] || 'Valued';
            const lastName = nameParts.slice(1).join(' ') || 'Guest';
            const salutation = selectedName.match(/^(Mr|Mrs|Ms|Dr|Prof|Engr)\.?/i)?.[0] || primaryGuest.title || primaryGuest.salutation || 'Mr';

            const payload = {
                primaryGuestId: primaryId,
                secondaryGuestIds: secondaryGuests.map(g => g.id),
                targetFields: {
                    salutation,
                    firstName,
                    lastName,
                    phone: selectedPhone,
                    email: selectedEmail,
                    idNumber: selectedIdNumber,
                    vipStatus: selectedVip
                }
            };

            const res = await fetch(`${API_BASE}/api/guests/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                toast.success(json.message || 'Guest profiles consolidated successfully!');
                onMergeSuccess(json.data);
                onClose();
            } else {
                toast.error(json.error || 'Failed to merge profiles.');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Error occurred while merging guest profiles.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalCombinedStays = candidateGuests.reduce((acc, g) => acc + (Number(g.totalStays) || 0), 0);
    const totalCombinedSpend = candidateGuests.reduce((acc, g) => acc + (Number(g.totalSpend || g.lifetimeSpendBDT) || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                            <GitMerge size={17} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-white tracking-tight">
                                    Merge Duplicate Guest Profiles
                                </h2>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase">
                                    Golden Record
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-300">
                                {mergeReason || 'Consolidate multiple duplicate accounts into one unified master profile.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                    {/* Guidance Alert */}
                    <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-[11px] text-blue-900 flex items-start gap-2.5">
                        <ShieldCheck size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Hospitality Golden Record Consolidation:</span> Select the surviving <strong>Primary Master Profile</strong> below. All historical and active bookings, folios, billing ledgers, and KYC documents from the other {secondaryGuests.length} profile(s) will be transferred to this profile automatically.
                        </div>
                    </div>

                    {/* Step 1: Select Master Profile */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                            1. Select Primary Master Profile (Surviving Record)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {candidateGuests.map(g => {
                                const isPrimary = g.id === primaryId;
                                return (
                                    <div
                                        key={g.id}
                                        onClick={() => handleSelectPrimary(g.id)}
                                        className={`p-3 rounded-lg border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                                            isPrimary
                                                ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500/20'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    checked={isPrimary}
                                                    onChange={() => handleSelectPrimary(g.id)}
                                                    className="w-3.5 h-3.5 text-indigo-600 cursor-pointer"
                                                />
                                                <span className="font-bold text-gray-900 text-xs">
                                                    {g.name}
                                                </span>
                                            </div>
                                            {isPrimary ? (
                                                <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-bold uppercase">
                                                    Master
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-semibold border border-rose-200">
                                                    Will Merge
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-2 space-y-1 text-[10.5px] text-gray-600">
                                            <div className="flex items-center gap-1.5 font-mono">
                                                <Phone size={11} className="text-gray-400" />
                                                <span>{g.phone || 'No phone'}</span>
                                            </div>
                                            {g.email && (
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <Mail size={11} className="text-gray-400" />
                                                    <span className="truncate">{g.email}</span>
                                                </div>
                                            )}
                                            {g.idNumber && (
                                                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                                    <FileText size={11} className="text-gray-400" />
                                                    <span>{g.idType || 'ID'}: {g.idNumber}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                                            <span className="font-semibold text-gray-500">Stays: {g.totalStays || 0}</span>
                                            <span className="font-mono font-bold text-emerald-700">
                                                ৳ {Number(g.totalSpend || g.lifetimeSpendBDT || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 2: Consolidated Master Profile Attributes */}
                    <div className="space-y-2 pt-2 border-t border-gray-200">
                        <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                            2. Review & Confirm Final Master Profile Details
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div>
                                <label className="text-[10px] font-semibold text-gray-600 block mb-1">Full Legal Name</label>
                                <input
                                    type="text"
                                    value={selectedName}
                                    onChange={e => setSelectedName(e.target.value)}
                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs bg-white outline-none focus:border-indigo-600 font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-semibold text-gray-600 block mb-1">Primary Phone Number</label>
                                <input
                                    type="text"
                                    value={selectedPhone}
                                    onChange={e => setSelectedPhone(e.target.value)}
                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs bg-white outline-none focus:border-indigo-600 font-mono font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-semibold text-gray-600 block mb-1">Primary Email</label>
                                <input
                                    type="email"
                                    value={selectedEmail}
                                    onChange={e => setSelectedEmail(e.target.value)}
                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs bg-white outline-none focus:border-indigo-600 font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-semibold text-gray-600 block mb-1">Government ID / Passport</label>
                                <input
                                    type="text"
                                    value={selectedIdNumber}
                                    onChange={e => setSelectedIdNumber(e.target.value)}
                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs bg-white outline-none focus:border-indigo-600 font-mono font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Consolidated Metrics Summary */}
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <span className="font-semibold text-emerald-900">
                                Resulting Consolidated Stay History:
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-emerald-950 font-medium text-[11.5px]">
                            <span>Total Stays: <strong className="font-bold">{totalCombinedStays}</strong></span>
                            <span>Total Lifetime Spend: <strong className="font-bold font-mono">৳ {totalCombinedSpend.toLocaleString()}</strong></span>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary !h-8 px-4 text-xs font-semibold"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleConfirmMerge}
                        className="btn-primary !h-8 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                        <GitMerge size={14} />
                        <span>{isSubmitting ? 'Consolidating...' : `Confirm & Merge into Master Profile`}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
export default MergeGuestModal;
