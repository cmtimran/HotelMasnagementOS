import React, { useState, useEffect } from 'react';
import {
    Palette,
    RotateCcw,
    Save,
    Check,
    CheckCircle2
} from 'lucide-react';
import {
    useStatusColors,
    DEFAULT_STATUS_COLORS,
    getContrastTextColor,
    getDarkenedBorderColor,
    type StatusColorConfig
} from '../utils/statusColorEngine';
import { useProperty } from '../context/PropertyContext';
import { toast } from '../context/ToastContext';
import { confirmModal } from '../context/ConfirmModalContext';
import PageHeader from './common/PageHeader';

// Ordered list of key PMS statuses
const STATUS_LIST: { key: string; name: string; category: string; hint: string }[] = [
    { key: 'confirmed', name: 'Confirmed', category: 'Reservation', hint: 'Guaranteed booking ready for arrival' },
    { key: 'in-house', name: 'In-House / Checked In', category: 'Front Desk', hint: 'Physically checked in and currently staying in room' },
    { key: 'arriving', name: 'Arriving / Due In', category: 'Front Desk', hint: 'Expected check-in on current PMS business date' },
    { key: 'departing', name: 'Due Out / Departing', category: 'Front Desk', hint: 'Scheduled check-out on current PMS business date' },
    { key: 'stayover', name: 'Stayover', category: 'Front Desk', hint: 'Continuing guest on a multi-night stay' },
    { key: 'hold', name: 'Courtesy Hold', category: 'Reservation', hint: 'Time-limited hold pending payment or auto-release' },
    { key: 'tentative', name: 'Tentative / Unconfirmed', category: 'Reservation', hint: 'Preliminary booking inquiry with unverified payment' },
    { key: 'checked-out', name: 'Checked Out / Departed', category: 'Front Desk', hint: 'Vacated, stay completed and folio closed' },
    { key: 'day-use', name: 'Day Use', category: 'Reservation', hint: 'Same-day arrival and departure without overnight stay' },
    { key: 'out-of-order', name: 'Out of Order (OOO)', category: 'Room Inventory', hint: 'Major maintenance defect; removed from sellable rooms' },
    { key: 'out-of-service', name: 'Out of Service (OOS)', category: 'Room Inventory', hint: 'Minor inspection or maintenance; remains in gross inventory' },
    { key: 'cancelled', name: 'Cancelled / Void', category: 'Reservation', hint: 'Cancelled reservation or voided booking' }
];

// Quick palette colors for 1-click selection
const QUICK_PALETTE = [
    '#2563EB', // Royal Blue
    '#0284C7', // Sky Blue
    '#059669', // Emerald Green
    '#0D9488', // Teal
    '#EA580C', // Vibrant Orange
    '#D97706', // Amber Gold
    '#DC2626', // Crimson Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#475569', // Charcoal Slate
    '#64748B', // Cool Slate
    '#10B981'  // Mint Green
];

export const StatusColorManagement: React.FC = () => {
    const { activeProperty } = useProperty();
    const propertyId = activeProperty?.id ? Number(activeProperty.id) : 1;
    const { colors, saveColors, resetColors } = useStatusColors(propertyId);

    const [colorState, setColorState] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        STATUS_LIST.forEach(s => {
            initial[s.key] = colors[s.key]?.bg || DEFAULT_STATUS_COLORS[s.key]?.bg || '#2563EB';
        });
        return initial;
    });

    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Synchronize if parent colors update
    useEffect(() => {
        const next: Record<string, string> = {};
        STATUS_LIST.forEach(s => {
            next[s.key] = colors[s.key]?.bg || DEFAULT_STATUS_COLORS[s.key]?.bg || '#2563EB';
        });
        setColorState(next);
    }, [colors]);

    const handleColorPick = (key: string, hexColor: string) => {
        const formatted = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
        setColorState(prev => ({
            ...prev,
            [key]: formatted
        }));
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload: Record<string, Partial<StatusColorConfig>> = {};
            Object.entries(colorState).forEach(([key, hex]) => {
                payload[key] = {
                    bg: hex,
                    text: getContrastTextColor(hex),
                    border: getDarkenedBorderColor(hex)
                };
            });
            await saveColors(payload);
            setHasUnsavedChanges(false);
            setIsSaving(false);
            toast.success('Status colors saved and synchronized across all timeline modules.');
        } catch (err: any) {
            setIsSaving(false);
            toast.error(`Error saving colors: ${err?.message || 'Failed'}`);
        }
    };

    const handleReset = async () => {
        const confirmed = await confirmModal({
            title: 'Reset Status Colors to Defaults?',
            message: 'Are you sure you want to restore all reservation, stay, and room status colors to the standard hotel industry defaults? Your custom color overrides will be cleared.',
            confirmText: 'Reset Defaults',
            variant: 'warning'
        });
        if (!confirmed) return;

        resetColors();
        const resetMap: Record<string, string> = {};
        STATUS_LIST.forEach(s => {
            resetMap[s.key] = DEFAULT_STATUS_COLORS[s.key]?.bg || '#2563EB';
        });
        setColorState(resetMap);
        setHasUnsavedChanges(false);
        toast.info('All status colors have been reset to industry standards.');
    };

    return (
        <div className="space-y-3 font-sans animate-in fade-in duration-200">
            {/* Standard Thesis Compact Page Header */}
            <PageHeader
                title="Status & Timeline Colors"
                subtitle="Select a single color per status. Contrast text and borders are calibrated automatically and updated across StayView, FrontDesk, and Reservations."
                icon={<Palette className="size-5 text-white" />}
                badge={
                    hasUnsavedChanges ? (
                        <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-amber-50 text-amber-700 border border-amber-300 font-semibold animate-pulse">
                            Unsaved Changes
                        </span>
                    ) : undefined
                }
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="btn-secondary !h-8 !py-1 !px-2.5 text-xs flex items-center gap-1.5 cursor-pointer"
                            title="Reset all colors to hotel industry defaults"
                        >
                            <RotateCcw size={13} />
                            <span>Reset Defaults</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`!h-8 !py-1 !px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                hasUnsavedChanges
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                        >
                            {isSaving ? (
                                <span>Saving...</span>
                            ) : hasUnsavedChanges ? (
                                <>
                                    <Save size={13} />
                                    <span>Save Changes</span>
                                </>
                            ) : (
                                <>
                                    <Check size={13} />
                                    <span>Saved</span>
                                </>
                            )}
                        </button>
                    </div>
                }
            />

            {/* Clean Status Color Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {STATUS_LIST.map(item => {
                    const currentColor = colorState[item.key] || '#2563EB';
                    const textColor = getContrastTextColor(currentColor);
                    const borderColor = getDarkenedBorderColor(currentColor);

                    return (
                        <div
                            key={item.key}
                            className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between gap-3 hover:border-slate-300 transition-all"
                        >
                            {/* Top: Status Identity & Live Preview */}
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-xs font-bold text-slate-900">
                                            {item.name}
                                        </h4>
                                        <span className="text-[9.5px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                            {item.category}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1">{item.hint}</p>
                                </div>

                                {/* Live Preview Pill & StayView Bar */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">Preview</span>
                                    <div
                                        className="px-2.5 py-0.5 rounded text-[10px] font-bold shadow-2xs border flex items-center gap-1 min-w-[75px] justify-center"
                                        style={{
                                            backgroundColor: currentColor,
                                            color: textColor,
                                            borderColor: borderColor
                                        }}
                                    >
                                        <CheckCircle2 size={10} />
                                        <span>{item.name.split(' ')[0]}</span>
                                    </div>
                                    <div
                                        className="h-2 w-16 rounded-xs shadow-2xs border-l-2"
                                        style={{
                                            backgroundColor: currentColor,
                                            borderLeftColor: borderColor
                                        }}
                                        title="StayView Timeline Bar preview"
                                    />
                                </div>
                            </div>

                            {/* Bottom: 1-Click Color Selector */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                                {/* Color Picker Input + Hex Display */}
                                <div className="flex items-center gap-2">
                                    <div className="relative flex items-center">
                                        <input
                                            type="color"
                                            value={currentColor}
                                            onChange={(e) => handleColorPick(item.key, e.target.value)}
                                            className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer overflow-hidden p-0 m-0 bg-transparent flex-shrink-0"
                                            title="Click to open color picker"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={currentColor.toUpperCase()}
                                        onChange={(e) => handleColorPick(item.key, e.target.value)}
                                        maxLength={7}
                                        className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-semibold text-slate-800 text-center uppercase focus:bg-white focus:border-blue-500 focus:outline-hidden"
                                    />
                                </div>

                                {/* Quick Color Dot Palette */}
                                <div className="flex items-center gap-1">
                                    {QUICK_PALETTE.slice(0, 7).map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => handleColorPick(item.key, c)}
                                            className={`w-4 h-4 rounded-full transition-transform hover:scale-125 border ${
                                                currentColor.toUpperCase() === c.toUpperCase()
                                                    ? 'ring-2 ring-blue-600 ring-offset-1 scale-110 border-white'
                                                    : 'border-black/10'
                                            }`}
                                            style={{ backgroundColor: c }}
                                            title={`Set ${c}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom floating save bar when changes are pending */}
            {hasUnsavedChanges && (
                <div className="sticky bottom-4 bg-slate-900 text-white rounded-xl p-3 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 z-30">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span className="text-xs font-medium">You have unsaved color changes. Click save to apply them globally.</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                    >
                        <Save size={13} />
                        <span>Save Changes</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default StatusColorManagement;
