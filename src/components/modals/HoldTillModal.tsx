import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Clock,
    Calendar,
    AlertTriangle,
    Building2,
    Check,
    ArrowRight,
    Crown
} from 'lucide-react';
import { getOperatingSystemDate } from '../../utils/roomInventoryEngine';
import { getCurrencySymbol } from '../../utils/currencyUtils';

export type HoldGuaranteeTier = 'courtesy' | 'corporate' | 'vip' | 'group';

export interface HoldTillPayload {
    reservationNumber: string;
    holdStartDate: string;
    holdEndDate: string;
    holdUntilTime: string;
    holdUntilISO: string;
    holdTier: HoldGuaranteeTier;
    holdReason: string;
    depositRequired?: number;
    noAutoRelease: boolean;
}

export interface HoldTillModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservationNumber: string;
    guestName: string;
    roomNumber?: string;
    roomType?: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmount?: number;
    depositRequired?: number;
    initialHoldStartDate?: string;
    initialHoldEndDate?: string;
    initialHoldUntilTime?: string;
    initialHoldTier?: HoldGuaranteeTier;
    initialReason?: string;
    onConfirmHold: (payload: HoldTillPayload) => void;
}

export const HoldTillModal: React.FC<HoldTillModalProps> = ({
    isOpen,
    onClose,
    reservationNumber,
    guestName,
    roomNumber,
    roomType,
    checkInDate,
    checkOutDate,
    totalAmount = 0,
    depositRequired = 0,
    initialHoldStartDate,
    initialHoldEndDate,
    initialHoldUntilTime,
    initialHoldTier = 'courtesy',
    initialReason = '',
    onConfirmHold
}) => {
    const currencySymbol = useMemo(() => getCurrencySymbol(), []);
    const systemDate = getOperatingSystemDate();

    // Default: Start date is systemDate, End date is checkInDate (or systemDate if checkIn is today/past)
    const defaultStartDate = initialHoldStartDate || systemDate;
    const defaultEndDate = initialHoldEndDate || (checkInDate >= systemDate ? checkInDate : systemDate);
    const defaultTime = initialHoldUntilTime || '18:00:00';

    const [holdStartDate, setHoldStartDate] = useState(defaultStartDate);
    const [holdEndDate, setHoldEndDate] = useState(defaultEndDate);
    const [holdUntilTime, setHoldUntilTime] = useState(defaultTime);
    const [holdTier, setHoldTier] = useState<HoldGuaranteeTier>(initialHoldTier);
    const [holdReason, setHoldReason] = useState(initialReason);
    const [activePreset, setActivePreset] = useState<string>('6pm');

    // Synchronize defaults on open
    useEffect(() => {
        if (isOpen) {
            const start = initialHoldStartDate || systemDate;
            const end = initialHoldEndDate || (checkInDate >= systemDate ? checkInDate : systemDate);
            setHoldStartDate(start);
            setHoldEndDate(end);
            setHoldUntilTime(initialHoldUntilTime || '18:00:00');
            setHoldTier(initialHoldTier);
            setHoldReason(initialReason || 'Awaiting advance deposit transfer / payment confirmation.');
            setActivePreset('6pm');
        }
    }, [isOpen, initialHoldStartDate, initialHoldEndDate, initialHoldUntilTime, initialHoldTier, initialReason, checkInDate, systemDate]);

    // Calculate estimated deposit required (standard 1st night or 30% if not passed)
    const effectiveDeposit = depositRequired > 0 
        ? depositRequired 
        : Math.round(totalAmount > 0 ? totalAmount * 0.3 : 2000);

    // Apply Presets
    const handleApplyPreset = (presetKey: '6pm' | '4pm' | '24h' | '48h_prior' | 'noon') => {
        setActivePreset(presetKey);
        if (presetKey === '6pm') {
            setHoldEndDate(checkInDate >= systemDate ? checkInDate : systemDate);
            setHoldUntilTime('18:00:00');
        } else if (presetKey === '4pm') {
            setHoldEndDate(checkInDate >= systemDate ? checkInDate : systemDate);
            setHoldUntilTime('16:00:00');
        } else if (presetKey === 'noon') {
            setHoldEndDate(checkInDate >= systemDate ? checkInDate : systemDate);
            setHoldUntilTime('12:00:00');
        } else if (presetKey === '24h') {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            setHoldEndDate(tomorrow.toISOString().slice(0, 10));
            setHoldUntilTime(tomorrow.toTimeString().slice(0, 8));
        } else if (presetKey === '48h_prior') {
            const inDate = new Date(checkInDate);
            const prior = new Date(inDate.getTime() - 48 * 60 * 60 * 1000);
            const resolvedDate = prior.toISOString().slice(0, 10);
            setHoldEndDate(resolvedDate >= systemDate ? resolvedDate : systemDate);
            setHoldUntilTime('18:00:00');
        }
    };

    // Quick Reason Tags
    const quickReasons = [
        'Awaiting bKash / Bank Deposit',
        'Corporate PO / Voucher Pending',
        'Delayed Flight / Travel Transit',
        'VIP Management Courtesy Block',
        'Awaiting Guest ID Verification',
        'Group Allocation Tentative Hold'
    ];

    const handleSelectQuickReason = (reasonText: string) => {
        setHoldReason(reasonText);
    };

    // Compute remaining time countdown preview
    const countdownPreview = useMemo(() => {
        try {
            const targetISO = `${holdEndDate}T${holdUntilTime.length === 5 ? `${holdUntilTime}:00` : holdUntilTime}`;
            const targetMs = new Date(targetISO).getTime();
            const nowMs = new Date().getTime();
            const diffMs = targetMs - nowMs;

            if (isNaN(diffMs)) return null;
            if (diffMs <= 0) {
                return { text: 'Expired / Immediate Release Due', isExpired: true, isUrgent: true };
            }

            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const days = Math.floor(hours / 24);

            let text = '';
            if (days > 0) {
                text = `${days}d ${hours % 24}h remaining`;
            } else if (hours > 0) {
                text = `${hours}h ${minutes}m remaining`;
            } else {
                text = `${minutes}m remaining`;
            }

            return {
                text,
                isExpired: false,
                isUrgent: diffMs < 60 * 60 * 1000 // Under 1 hour
            };
        } catch {
            return null;
        }
    }, [holdEndDate, holdUntilTime]);

    const handleConfirm = () => {
        if (!holdReason.trim()) {
            return;
        }

        const cleanTime = holdUntilTime.length === 5 ? `${holdUntilTime}:00` : holdUntilTime;
        const holdUntilISO = `${holdEndDate}T${cleanTime}`;

        onConfirmHold({
            reservationNumber,
            holdStartDate,
            holdEndDate,
            holdUntilTime: cleanTime,
            holdUntilISO,
            holdTier,
            holdReason: holdReason.trim(),
            depositRequired: effectiveDeposit,
            noAutoRelease: holdTier === 'vip'
        });

        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div
                className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
            >
                {/* Header (Clean matching user screenshot) */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
                            <Clock size={16} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 leading-tight">Hold Till</h2>
                            <p className="text-[11px] text-slate-500">Set provisional cut-off date, time boundary and guarantee rules</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Context Strip (Guest, Room & Stay Dates) */}
                <div className="bg-slate-50/80 px-5 py-2.5 border-b border-slate-200/80 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-blue-900 bg-blue-100/60 px-2 py-0.5 rounded text-[10.5px]">
                            {reservationNumber}
                        </span>
                        <span className="font-semibold text-slate-800 truncate">{guestName}</span>
                        {roomNumber && (
                            <span className="text-slate-500 hidden sm:inline">
                                | Room <strong className="text-slate-700">{roomNumber}</strong> {roomType ? `(${roomType})` : ''}
                            </span>
                        )}
                    </div>
                    <div className="text-slate-600 text-[10.5px] font-mono flex-shrink-0">
                        Stay: <strong className="text-slate-800">{checkInDate}</strong> to <strong className="text-slate-800">{checkOutDate}</strong>
                    </div>
                </div>

                {/* Body Form */}
                <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
                    {/* 1. Hold Date Range (Unified single range input as requested in user's image) */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <span className="text-rose-500">*</span> Hold Date Range
                            </label>
                            <span className="text-[10px] text-slate-400">Inventory blocked during this period</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-blue-400 rounded-lg px-3 py-2 shadow-2xs focus-within:ring-2 focus-within:ring-blue-400">
                            <Calendar size={14} className="text-blue-600 shrink-0" />
                            <input
                                type="date"
                                value={holdStartDate}
                                onChange={e => setHoldStartDate(e.target.value)}
                                className="w-32 bg-transparent text-xs font-mono font-semibold text-slate-900 outline-none cursor-pointer"
                            />
                            <ArrowRight size={13} className="text-slate-400 mx-1 shrink-0" />
                            <input
                                type="date"
                                min={holdStartDate}
                                value={holdEndDate}
                                onChange={e => {
                                    setHoldEndDate(e.target.value);
                                    setActivePreset('custom');
                                }}
                                className="w-32 bg-transparent text-xs font-mono font-semibold text-slate-900 outline-none cursor-pointer"
                            />
                            <div className="flex-1" />
                            {(holdStartDate !== defaultStartDate || holdEndDate !== defaultEndDate) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHoldStartDate(defaultStartDate);
                                        setHoldEndDate(defaultEndDate);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
                                    title="Reset Date Range"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 2. Cut-Off Release Time (Strict Time Boundary) */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <span className="text-rose-500">*</span> Cut-Off Release Time (Property Local Time)
                            </label>
                            {countdownPreview && (
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                    countdownPreview.isExpired 
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                                        : countdownPreview.isUrgent
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                    ⏳ {countdownPreview.text}
                                </span>
                            )}
                        </div>

                        {/* Presets and Clock Input Grid */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-36">
                                    <Clock size={14} className="text-slate-500 shrink-0" />
                                    <input
                                        type="time"
                                        step="1"
                                        value={holdUntilTime}
                                        onChange={e => {
                                            setHoldUntilTime(e.target.value);
                                            setActivePreset('custom');
                                        }}
                                        className="w-full bg-transparent text-xs font-mono font-bold text-slate-900 outline-none cursor-pointer"
                                    />
                                </div>

                                {/* Front Desk Velocity Presets */}
                                <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset('6pm')}
                                        className={`px-2 py-1 rounded text-[10.5px] font-semibold border transition-all cursor-pointer ${
                                            activePreset === '6pm'
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        6:00 PM Release
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset('4pm')}
                                        className={`px-2 py-1 rounded text-[10.5px] font-semibold border transition-all cursor-pointer ${
                                            activePreset === '4pm'
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        4:00 PM
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset('24h')}
                                        className={`px-2 py-1 rounded text-[10.5px] font-semibold border transition-all cursor-pointer ${
                                            activePreset === '24h'
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        24h Window
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset('48h_prior')}
                                        className={`px-2 py-1 rounded text-[10.5px] font-semibold border transition-all cursor-pointer ${
                                            activePreset === '48h_prior'
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        48h Prior
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Hold Guarantee Tier */}
                    <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            Hold Guarantee Tier
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <label
                                className={`border rounded-lg p-2 flex flex-col gap-1 cursor-pointer transition-all ${
                                    holdTier === 'courtesy'
                                        ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400/30'
                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-900">Courtesy (FIT)</span>
                                    <input
                                        type="radio"
                                        name="holdTier"
                                        value="courtesy"
                                        checked={holdTier === 'courtesy'}
                                        onChange={() => setHoldTier('courtesy')}
                                        className="accent-amber-600"
                                    />
                                </div>
                                <span className="text-[9.5px] text-slate-500 leading-tight">
                                    Standard hold. Strict auto-release at cut-off.
                                </span>
                            </label>

                            <label
                                className={`border rounded-lg p-2 flex flex-col gap-1 cursor-pointer transition-all ${
                                    holdTier === 'corporate'
                                        ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-400/30'
                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                                        <Building2 size={11} className="text-blue-600" /> Corporate
                                    </span>
                                    <input
                                        type="radio"
                                        name="holdTier"
                                        value="corporate"
                                        checked={holdTier === 'corporate'}
                                        onChange={() => setHoldTier('corporate')}
                                        className="accent-blue-600"
                                    />
                                </div>
                                <span className="text-[9.5px] text-slate-500 leading-tight">
                                    Credit / PO pending. Sales desk follow-up.
                                </span>
                            </label>

                            <label
                                className={`border rounded-lg p-2 flex flex-col gap-1 cursor-pointer transition-all ${
                                    holdTier === 'vip'
                                        ? 'bg-purple-50/70 border-purple-400 ring-1 ring-purple-400/30'
                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                                        <Crown size={11} className="text-purple-600" /> VIP Block
                                    </span>
                                    <input
                                        type="radio"
                                        name="holdTier"
                                        value="vip"
                                        checked={holdTier === 'vip'}
                                        onChange={() => setHoldTier('vip')}
                                        className="accent-purple-600"
                                    />
                                </div>
                                <span className="text-[9.5px] text-slate-500 leading-tight">
                                    Protected block. Manager PIN required to drop.
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* 4. Hold Reason (Matching User's image with textarea and quick presets) */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                <span className="text-rose-500">*</span> Hold Reason
                            </label>
                            <span className="text-[10px] text-slate-400">Reason documented in guest folio</span>
                        </div>
                        <textarea
                            value={holdReason}
                            onChange={e => setHoldReason(e.target.value)}
                            rows={3}
                            placeholder="Enter hold reason (e.g. Awaiting corporate PO or advance bKash transfer)"
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 leading-relaxed resize-none"
                        />

                        {/* Quick Reason Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[9.5px] text-slate-400 font-medium mr-0.5">Quick Reasons:</span>
                            {quickReasons.map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => handleSelectQuickReason(r)}
                                    className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer border ${
                                        holdReason === r
                                            ? 'bg-blue-100 text-blue-900 border-blue-300 font-semibold'
                                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                    }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 5. Policy Notice Box */}
                    <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                            <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                            <span>Automated Inventory Release Policy</span>
                        </div>
                        <p className="text-[10.5px] text-amber-800/90 leading-relaxed">
                            {holdTier === 'vip' ? (
                                <span>
                                    <strong>VIP Protected Block</strong>: Room inventory will <strong>NOT</strong> be automatically dropped. Duty Manager manual review is required.
                                </span>
                            ) : (
                                <span>
                                    Unless an advance deposit of <strong className="font-mono">{currencySymbol} {effectiveDeposit.toLocaleString()}</strong> is received, Room <strong>{roomNumber || 'Assignment'}</strong> will be automatically released back to sellable inventory on <strong>{holdEndDate}</strong> at <strong>{holdUntilTime}</strong>.
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Footer Buttons (Cancel vs Confirm matching user's image) */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!holdReason.trim()}
                        className="px-5 py-2 bg-[#1a73e8] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                    >
                        <Check size={14} />
                        <span>Confirm Hold Till</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default HoldTillModal;
