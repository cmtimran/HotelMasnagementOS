import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    Car,
    BedDouble,
    Utensils,
    Gift,
    Sparkles,
    Clock,
    Plus,
    Trash2,
    Plane,
    MapPin,
    ShieldCheck,
    Check,
    RotateCcw,
    FileText,
    Cake,
    Heart,
    Coffee
} from 'lucide-react';
import type {
    RoomServicesBundle,
    ExtraBedConfig,
    PickupConfig,
    MealPlanConfig,
    CelebrationDecorConfig,
    SpaWellnessConfig,
    TimingFlexConfig,
    CustomAddonItem
} from '../../types/reservationServices';
import {
    DEFAULT_EXTRA_BED,
    DEFAULT_PICKUP,
    DEFAULT_MEAL_PLAN,
    DEFAULT_CELEBRATION,
    DEFAULT_SPA_WELLNESS,
    DEFAULT_TIMING_FLEX,
    getExtraBedTotal,
    getPickupTotal,
    getMealPlanTotal,
    getCelebrationTotal,
    getSpaWellnessTotal,
    getTimingFlexTotal,
    getCustomAddonsTotal
} from '../../types/reservationServices';

export type ServiceTabType = 'pickup' | 'extrabed' | 'mealplan' | 'celebration' | 'spa' | 'timing' | 'custom';

export interface RoomAddonServicesModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomNumber: string;
    roomType: string;
    baseRate: number;
    nights: number;
    roomsCount?: number;
    assignedRooms?: string[];
    initialTab?: ServiceTabType;
    currentServices?: RoomServicesBundle;
    currentExtraBed?: ExtraBedConfig;
    currentPickup?: PickupConfig;
    onSave: (bundle: RoomServicesBundle) => void;
}

export const RoomAddonServicesModal: React.FC<RoomAddonServicesModalProps> = ({
    isOpen,
    onClose,
    roomNumber,
    roomType,
    baseRate,
    nights,
    roomsCount,
    assignedRooms,
    initialTab = 'pickup',
    currentServices,
    currentExtraBed,
    currentPickup,
    onSave
}) => {
    const [activeTab, setActiveTab] = useState<ServiceTabType>(initialTab);

    // Derived assigned rooms list for multi-room bookings
    const assignedRoomsList = useMemo(() => {
        if (assignedRooms && assignedRooms.length > 0) return assignedRooms;
        if (roomNumber && roomNumber.includes(',')) {
            return roomNumber.split(',').map(s => s.trim()).filter(Boolean);
        }
        return roomNumber ? [roomNumber] : ['101'];
    }, [assignedRooms, roomNumber]);

    const isMultiRoomRow = (roomsCount && roomsCount > 1) || assignedRoomsList.length > 1;

    const [targetRoomScope, setTargetRoomScope] = useState<string>(() => {
        return currentServices?.targetRoomNumber || 'all';
    });

    // Individual states
    const [pickup, setPickup] = useState<PickupConfig>(() => ({
        ...DEFAULT_PICKUP,
        ...(currentServices?.pickup || currentPickup || {})
    }));

    const [extraBed, setExtraBed] = useState<ExtraBedConfig>(() => ({
        ...DEFAULT_EXTRA_BED,
        ...(currentServices?.extraBed || currentExtraBed || {})
    }));

    const [mealPlan, setMealPlan] = useState<MealPlanConfig>(() => ({
        ...DEFAULT_MEAL_PLAN,
        ...(currentServices?.mealPlan || {})
    }));

    const [celebration, setCelebration] = useState<CelebrationDecorConfig>(() => ({
        ...DEFAULT_CELEBRATION,
        ...(currentServices?.celebration || {})
    }));

    const [spaWellness, setSpaWellness] = useState<SpaWellnessConfig>(() => ({
        ...DEFAULT_SPA_WELLNESS,
        ...(currentServices?.spaWellness || {})
    }));

    const [timingFlex, setTimingFlex] = useState<TimingFlexConfig>(() => ({
        ...DEFAULT_TIMING_FLEX,
        ...(currentServices?.timingFlex || {})
    }));

    const [customAddons, setCustomAddons] = useState<CustomAddonItem[]>(() => 
        currentServices?.customAddons ? [...currentServices.customAddons] : []
    );

    // Sync on open
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            setPickup({ ...DEFAULT_PICKUP, ...(currentServices?.pickup || currentPickup || {}) });
            setExtraBed({ ...DEFAULT_EXTRA_BED, ...(currentServices?.extraBed || currentExtraBed || {}) });
            setMealPlan({ ...DEFAULT_MEAL_PLAN, ...(currentServices?.mealPlan || {}) });
            setCelebration({ ...DEFAULT_CELEBRATION, ...(currentServices?.celebration || {}) });
            setSpaWellness({ ...DEFAULT_SPA_WELLNESS, ...(currentServices?.spaWellness || {}) });
            setTimingFlex({ ...DEFAULT_TIMING_FLEX, ...(currentServices?.timingFlex || {}) });
            setCustomAddons(currentServices?.customAddons ? [...currentServices.customAddons] : []);
            setTargetRoomScope(currentServices?.targetRoomNumber || 'all');
        }
    }, [isOpen, initialTab, currentServices, currentExtraBed, currentPickup]);

    if (!isOpen) return null;

    // Financial calculations
    const currentBundle: RoomServicesBundle = {
        pickup,
        extraBed,
        mealPlan,
        celebration,
        spaWellness,
        timingFlex,
        customAddons,
        allocationScope: targetRoomScope === 'all' ? 'all' : 'specific',
        targetRoomNumber: targetRoomScope === 'all' ? 'All Rooms' : targetRoomScope
    };

    const extraBedSubtotal = getExtraBedTotal(extraBed, nights);
    const pickupSubtotal = getPickupTotal(pickup);
    const mealPlanSubtotal = getMealPlanTotal(mealPlan, nights);
    const celebrationSubtotal = getCelebrationTotal(celebration);
    const spaSubtotal = getSpaWellnessTotal(spaWellness);
    const timingSubtotal = getTimingFlexTotal(timingFlex);
    const customSubtotal = getCustomAddonsTotal(customAddons, nights);

    const totalAddonsCharge = extraBedSubtotal + pickupSubtotal + mealPlanSubtotal + celebrationSubtotal + spaSubtotal + timingSubtotal + customSubtotal;
    const roomStayTotal = (Number(baseRate) || 0) * Math.max(1, nights);
    const grandRowTotal = roomStayTotal + totalAddonsCharge;

    const handleSave = () => {
        onSave({
            ...currentBundle,
            allocationScope: targetRoomScope === 'all' ? 'all' : 'specific',
            targetRoomNumber: targetRoomScope === 'all' ? 'All Rooms' : targetRoomScope
        });
        onClose();
    };

    const handleResetAll = () => {
        setPickup({ ...DEFAULT_PICKUP });
        setExtraBed({ ...DEFAULT_EXTRA_BED });
        setMealPlan({ ...DEFAULT_MEAL_PLAN });
        setCelebration({ ...DEFAULT_CELEBRATION });
        setSpaWellness({ ...DEFAULT_SPA_WELLNESS });
        setTimingFlex({ ...DEFAULT_TIMING_FLEX });
        setCustomAddons([]);
    };

    // Custom Addon Helpers
    const handleAddCustomItem = () => {
        setCustomAddons(prev => [
            ...prev,
            {
                id: `addon-${Date.now()}`,
                title: 'Express Laundry Service',
                chargeType: 'once',
                amount: 800,
                quantity: 1,
                isComplimentary: false
            }
        ]);
    };

    const handleRemoveCustomItem = (id: string) => {
        setCustomAddons(prev => prev.filter(item => item.id !== id));
    };

    const handleUpdateCustomItem = (id: string, field: keyof CustomAddonItem, value: any) => {
        setCustomAddons(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    // Active counts
    const activeTabsCount = [
        pickup.enabled,
        extraBed.enabled,
        mealPlan.enabled,
        celebration.enabled,
        spaWellness.enabled,
        timingFlex.earlyCheckIn || timingFlex.lateCheckOut,
        customAddons.length > 0
    ].filter(Boolean).length;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-150">
            <div className="bg-white w-[98%] max-w-[860px] max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
                {/* Header */}
                <div className="bg-slate-50/95 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight m-0">
                                    Hotel Room Add-On Services
                                </h2>
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100/70 text-blue-800 border border-blue-200">
                                    Room #{roomNumber || 'Auto'} • {roomType}
                                </span>
                                {activeTabsCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        {activeTabsCount} Active
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 m-0 font-medium">
                                Configure Airport Transfer, Extra Bed, Dining, Romance/Decor, Spa &amp; Early/Late Check-In
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-2 rounded-xl transition-colors cursor-pointer"
                        title="Close Modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Multi-Room Target Scope Banner (Enterprise Hotel Standard) */}
                {isMultiRoomRow && (
                    <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border-b border-blue-200/70 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse flex-shrink-0"></span>
                            <span className="text-slate-800">
                                <strong>Multi-Room Booking ({roomsCount || assignedRoomsList.length} Rooms: {assignedRoomsList.join(', ') || roomNumber})</strong>: Specify how add-ons apply:
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-700">Target Room:</span>
                            <select
                                value={targetRoomScope}
                                onChange={e => setTargetRoomScope(e.target.value)}
                                className="h-7 px-2 border border-blue-300 rounded-md bg-white text-xs font-semibold text-blue-900 outline-none cursor-pointer shadow-2xs focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="all">🌐 All Rooms in Group ({assignedRoomsList.join(', ')})</option>
                                {assignedRoomsList.map((rm: string) => (
                                    <option key={rm} value={rm}>🚪 Room {rm} Only (Master/Target)</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Nav Tabs Bar */}
                <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 overflow-x-auto scrollbar-none flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveTab('pickup')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                            activeTab === 'pickup'
                                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <Car size={13} className={activeTab === 'pickup' ? 'text-blue-600' : 'text-slate-400'} />
                        <span>Airport Transfer</span>
                        {pickup.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('extrabed')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                            activeTab === 'extrabed'
                                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <BedDouble size={13} className={activeTab === 'extrabed' ? 'text-indigo-600' : 'text-slate-400'} />
                        <span>Extra Bed / Cot</span>
                        {extraBed.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('mealplan')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                            activeTab === 'mealplan'
                                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <Utensils size={13} className={activeTab === 'mealplan' ? 'text-amber-600' : 'text-slate-400'} />
                        <span>Meal Plans</span>
                        {mealPlan.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('celebration')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                            activeTab === 'celebration'
                                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <Gift size={13} className={activeTab === 'celebration' ? 'text-rose-600' : 'text-slate-400'} />
                        <span>Decor &amp; Romance</span>
                        {celebration.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('spa')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                            activeTab === 'spa'
                                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <Sparkles size={13} className={activeTab === 'spa' ? 'text-teal-600' : 'text-slate-400'} />
                        <span>Wellness &amp; Spa</span>
                        {spaWellness.enabled && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('timing')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                            activeTab === 'timing'
                                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <Clock size={13} className={activeTab === 'timing' ? 'text-blue-600' : 'text-slate-400'} />
                        <span>Early/Late Flex</span>
                        {(timingFlex.earlyCheckIn || timingFlex.lateCheckOut) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('custom')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                            activeTab === 'custom'
                                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <Plus size={13} className={activeTab === 'custom' ? 'text-blue-600' : 'text-slate-400'} />
                        <span>Custom Add-Ons</span>
                        {customAddons.length > 0 && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                {customAddons.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab Content Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {/* TAB 1: AIRPORT PICKUP & DROP TRANSFER */}
                    {activeTab === 'pickup' && (
                        <div className="space-y-4 animate-in fade-in duration-100">
                            {/* Service Mode Selector */}
                            <div className="p-1.5 bg-slate-100/80 rounded-xl border border-slate-200/90 flex flex-wrap gap-1">
                                <button
                                    type="button"
                                    onClick={() => setPickup(prev => ({ ...prev, enabled: false, dropEnabled: false }))}
                                    className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                                        !pickup.enabled && !pickup.dropEnabled
                                            ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    None (Disabled)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPickup(prev => ({ ...prev, enabled: true, dropEnabled: false }))}
                                    className={`flex-1 min-w-[130px] py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        pickup.enabled && !pickup.dropEnabled
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-700 hover:text-blue-700 hover:bg-white/60'
                                    }`}
                                >
                                    <Car size={13} />
                                    <span>Pickup Only (Arrival)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPickup(prev => ({ ...prev, enabled: false, dropEnabled: true }))}
                                    className={`flex-1 min-w-[130px] py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        !pickup.enabled && pickup.dropEnabled
                                            ? 'bg-sky-600 text-white shadow-xs'
                                            : 'text-slate-700 hover:text-sky-700 hover:bg-white/60'
                                    }`}
                                >
                                    <Plane size={13} />
                                    <span>Drop Only (Departure)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPickup(prev => ({ ...prev, enabled: true, dropEnabled: true }))}
                                    className={`flex-1 min-w-[150px] py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                        pickup.enabled && pickup.dropEnabled
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'text-slate-700 hover:text-emerald-700 hover:bg-white/60'
                                    }`}
                                >
                                    <Sparkles size={13} />
                                    <span>Round Trip (Both Legs)</span>
                                </button>
                            </div>

                            {/* Section 1: Inbound Airport Pickup */}
                            <div className={`p-4 rounded-xl border transition-all ${
                                pickup.enabled ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50/40 border-slate-200 opacity-80'
                            }`}>
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                                            pickup.enabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            <Car size={14} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                                                <span>1. Inbound Airport / Station Pickup (Arrival Transfer)</span>
                                                {pickup.enabled && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-blue-100 text-blue-800">
                                                        Active
                                                    </span>
                                                )}
                                            </label>
                                            <p className="text-[10.5px] text-slate-500 m-0">
                                                Chauffeur airport pickup greeting with guest name placard at terminal exit
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={pickup.enabled}
                                            onChange={e => setPickup(prev => ({ ...prev, enabled: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {pickup.enabled && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center gap-1">
                                                <Plane size={11} className="text-blue-600" />
                                                <span>Arrival Flight / Train #</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. BG-084"
                                                value={pickup.flightNumber || ''}
                                                onChange={e => setPickup(prev => ({ ...prev, flightNumber: e.target.value }))}
                                                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-mono font-bold uppercase"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                                                Airline / Transport Carrier
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Biman Bangladesh, Emirates"
                                                value={pickup.airline || ''}
                                                onChange={e => setPickup(prev => ({ ...prev, airline: e.target.value }))}
                                                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center gap-1">
                                                <Clock size={11} className="text-blue-600" />
                                                <span>Estimated Arrival Date &amp; Time</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={pickup.pickupDateTime || ''}
                                                onChange={e => setPickup(prev => ({ ...prev, pickupDateTime: e.target.value }))}
                                                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-mono"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center gap-1">
                                                <MapPin size={11} className="text-blue-600" />
                                                <span>Pickup Terminal / Point</span>
                                            </label>
                                            <select
                                                value={pickup.pickupLocation || 'Hazrat Shahjalal Intl Airport (DAC) - Terminal 1'}
                                                onChange={e => setPickup(prev => ({ ...prev, pickupLocation: e.target.value }))}
                                                className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-medium"
                                            >
                                                <option value="Hazrat Shahjalal Intl Airport (DAC) - Terminal 1">Hazrat Shahjalal Intl (DAC) - Terminal 1</option>
                                                <option value="Hazrat Shahjalal Intl Airport (DAC) - Terminal 2">Hazrat Shahjalal Intl (DAC) - Terminal 2</option>
                                                <option value="Hazrat Shahjalal Intl Airport (DAC) - Domestic Terminal">Domestic Terminal (DAC)</option>
                                                <option value="Kamalapur Railway Station">Kamalapur Railway Station</option>
                                                <option value="Custom Location">Custom Location / Address</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                                                Vehicle Type
                                            </label>
                                            <select
                                                value={pickup.vehicleType}
                                                onChange={e => setPickup(prev => ({ ...prev, vehicleType: e.target.value as any }))}
                                                className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-medium"
                                            >
                                                <option value="Executive Sedan (Premio/Allion)">Executive Sedan (Premio / Allion - 3 Pax)</option>
                                                <option value="Luxury SUV (Prado/Harrier)">Luxury SUV (Prado / Harrier - 4 Pax)</option>
                                                <option value="VIP Microbus (HiAce 7-10 pax)">VIP Microbus (HiAce Super GL - 7-10 Pax)</option>
                                                <option value="VIP Limousine">VIP Presidential Limousine</option>
                                            </select>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-0.5">
                                                <label className="text-[11px] font-bold text-slate-700">Pickup Charge (BDT)</label>
                                                <label className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={pickup.isComplimentary}
                                                        onChange={e => setPickup(prev => ({ ...prev, isComplimentary: e.target.checked }))}
                                                        className="w-3 h-3 rounded text-emerald-600"
                                                    />
                                                    <span>Free (৳0)</span>
                                                </label>
                                            </div>
                                            <input
                                                type="number"
                                                disabled={pickup.isComplimentary}
                                                value={pickup.isComplimentary ? 0 : pickup.chargeAmount}
                                                onChange={e => setPickup(prev => ({ ...prev, chargeAmount: parseFloat(e.target.value) || 0 }))}
                                                className={`w-full h-8 px-2.5 rounded-lg border text-xs font-bold font-mono text-right ${
                                                    pickup.isComplimentary ? 'bg-slate-100 text-slate-400' : 'bg-white text-blue-700'
                                                }`}
                                            />
                                        </div>

                                        <div className="sm:col-span-2 lg:col-span-3">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                                                Arrival Chauffeur Instructions / Placard Name
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Placard: Mr. Imran Hossain | Guest will call driver upon clearing customs"
                                                value={pickup.driverInstructions || ''}
                                                onChange={e => setPickup(prev => ({ ...prev, driverInstructions: e.target.value }))}
                                                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Outbound Airport Drop */}
                            <div className={`p-4 rounded-xl border transition-all ${
                                pickup.dropEnabled ? 'bg-sky-50/40 border-sky-200' : 'bg-slate-50/40 border-slate-200 opacity-80'
                            }`}>
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                                            pickup.dropEnabled ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            <Plane size={14} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                                                <span>2. Outbound Airport / Station Drop (Departure Transfer)</span>
                                                {pickup.dropEnabled && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-sky-100 text-sky-800">
                                                        Active
                                                    </span>
                                                )}
                                            </label>
                                            <p className="text-[10.5px] text-slate-500 m-0">
                                                Hotel departure chauffeur to airport or railway station with luggage assistance
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(pickup.dropEnabled)}
                                            onChange={e => setPickup(prev => ({ ...prev, dropEnabled: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                                    </label>
                                </div>

                                {pickup.dropEnabled && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center gap-1">
                                                <Plane size={11} className="text-sky-600" />
                                                <span>Departure Flight / Train #</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. EK-582"
                                                value={pickup.dropFlightNumber || ''}
                                                onChange={e => setPickup(prev => ({ ...prev, dropFlightNumber: e.target.value }))}
                                                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-mono font-bold uppercase"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                                                Outbound Airline / Carrier
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Emirates, Saudia, Qatar"
                                                value={pickup.dropAirline || ''}
                                                onChange={e => setPickup(prev => ({ ...prev, dropAirline: e.target.value }))}
                                                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center gap-1">
                                                <Clock size={11} className="text-sky-600" />
                                                <span>Hotel Lobby Departure Time</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={pickup.dropDateTime || ''}
                                                onChange={e => setPickup(prev => ({ ...prev, dropDateTime: e.target.value }))}
                                                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-mono"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center gap-1">
                                                <MapPin size={11} className="text-sky-600" />
                                                <span>Destination Drop Terminal</span>
                                            </label>
                                            <select
                                                value={pickup.dropLocation || 'Hazrat Shahjalal Intl Airport (DAC) - Terminal 1'}
                                                onChange={e => setPickup(prev => ({ ...prev, dropLocation: e.target.value }))}
                                                className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-medium"
                                            >
                                                <option value="Hazrat Shahjalal Intl Airport (DAC) - Terminal 1">Hazrat Shahjalal Intl (DAC) - Terminal 1</option>
                                                <option value="Hazrat Shahjalal Intl Airport (DAC) - Terminal 2">Hazrat Shahjalal Intl (DAC) - Terminal 2</option>
                                                <option value="Hazrat Shahjalal Intl Airport (DAC) - Domestic Terminal">Domestic Terminal (DAC)</option>
                                                <option value="Kamalapur Railway Station">Kamalapur Railway Station</option>
                                                <option value="Custom Location">Custom Drop-off Address</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                                                Vehicle Type
                                            </label>
                                            <select
                                                value={pickup.dropVehicleType || 'Executive Sedan (Premio/Allion)'}
                                                onChange={e => setPickup(prev => ({ ...prev, dropVehicleType: e.target.value as any }))}
                                                className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-medium"
                                            >
                                                <option value="Executive Sedan (Premio/Allion)">Executive Sedan (Premio / Allion - 3 Pax)</option>
                                                <option value="Luxury SUV (Prado/Harrier)">Luxury SUV (Prado / Harrier - 4 Pax)</option>
                                                <option value="VIP Microbus (HiAce 7-10 pax)">VIP Microbus (HiAce Super GL - 7-10 Pax)</option>
                                                <option value="VIP Limousine">VIP Presidential Limousine</option>
                                            </select>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-0.5">
                                                <label className="text-[11px] font-bold text-slate-700">Drop Charge (BDT)</label>
                                                <label className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(pickup.dropIsComplimentary)}
                                                        onChange={e => setPickup(prev => ({ ...prev, dropIsComplimentary: e.target.checked }))}
                                                        className="w-3 h-3 rounded text-emerald-600"
                                                    />
                                                    <span>Free (৳0)</span>
                                                </label>
                                            </div>
                                            <input
                                                type="number"
                                                disabled={pickup.dropIsComplimentary}
                                                value={pickup.dropIsComplimentary ? 0 : (pickup.dropChargeAmount || 0)}
                                                onChange={e => setPickup(prev => ({ ...prev, dropChargeAmount: parseFloat(e.target.value) || 0 }))}
                                                className={`w-full h-8 px-2.5 rounded-lg border text-xs font-bold font-mono text-right ${
                                                    pickup.dropIsComplimentary ? 'bg-slate-100 text-slate-400' : 'bg-white text-sky-700'
                                                }`}
                                            />
                                        </div>

                                        <div className="sm:col-span-2 lg:col-span-3">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                                                Departure Chauffeur Instructions / Notes
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Porter luggage pickup from room at 10:30 AM | Direct drop at Departure Gate 3"
                                                value={pickup.dropDriverInstructions || ''}
                                                onChange={e => setPickup(prev => ({ ...prev, dropDriverInstructions: e.target.value }))}
                                                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-800"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Cost Summary Banner */}
                            {(pickup.enabled || pickup.dropEnabled) && (
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <ShieldCheck size={16} className="text-blue-600" />
                                        <span>
                                            Transfer Total:{' '}
                                            {pickup.enabled && (
                                                <strong className="text-blue-700">
                                                    Inbound Pickup ({pickup.isComplimentary ? 'Free' : `৳${pickup.chargeAmount}`})
                                                </strong>
                                            )}
                                            {pickup.enabled && pickup.dropEnabled && ' + '}
                                            {pickup.dropEnabled && (
                                                <strong className="text-sky-700">
                                                    Outbound Drop ({pickup.dropIsComplimentary ? 'Free' : `৳${pickup.dropChargeAmount}`})
                                                </strong>
                                            )}
                                        </span>
                                    </div>
                                    <div className="font-bold text-slate-900 font-mono text-sm">
                                        = ৳{pickupSubtotal.toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: EXTRA BED & BABY COT */}
                    {activeTab === 'extrabed' && (
                        <div className="space-y-4 animate-in fade-in duration-100">
                            <div className={`p-4 rounded-xl border transition-all ${
                                extraBed.enabled ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50/70 border-slate-200'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                            extraBed.enabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            <BedDouble size={16} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                                                <span>Enable Extra Bed / Baby Cot</span>
                                                {extraBed.enabled && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                        Active
                                                    </span>
                                                )}
                                            </label>
                                            <p className="text-xs text-slate-500 m-0">
                                                Allocate rollaway adult bed, foldable mattress, or infant crib with linens
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={extraBed.enabled}
                                            onChange={e => setExtraBed(prev => ({ ...prev, enabled: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>

                            {extraBed.enabled && (
                                <div className="space-y-3.5 pt-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Bed Configuration / Type
                                            </label>
                                            <select
                                                value={extraBed.bedType}
                                                onChange={e => {
                                                    const val = e.target.value as ExtraBedConfig['bedType'];
                                                    const defaultRate = val === 'Baby Cot / Crib' ? 0 : 1500;
                                                    setExtraBed(prev => ({
                                                        ...prev,
                                                        bedType: val,
                                                        chargePerNight: defaultRate
                                                    }));
                                                }}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                            >
                                                <option value="Rollaway Adult Bed">Rollaway Adult Bed (Full Size Spring Mattress)</option>
                                                <option value="Baby Cot / Crib">Baby Cot / Crib (Infant safety cradle)</option>
                                                <option value="Extra Mattress">Extra Floor Mattress (With premium linen set)</option>
                                                <option value="Sofa Bed Setup">Sofa Bed Setup (Convertible bed setup)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Quantity (Max 2 per room)
                                            </label>
                                            <select
                                                value={extraBed.quantity}
                                                onChange={e => setExtraBed(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                            >
                                                <option value={1}>1 Bed / Cot</option>
                                                <option value={2}>2 Beds / Cots (Maximum Hotel Policy)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-bold text-slate-700">
                                                    Rate Per Night (BDT)
                                                </label>
                                                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={extraBed.isComplimentary}
                                                        onChange={e => setExtraBed(prev => ({ ...prev, isComplimentary: e.target.checked }))}
                                                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span>Complimentary (৳0)</span>
                                                </label>
                                            </div>
                                            <input
                                                type="number"
                                                disabled={extraBed.isComplimentary}
                                                value={extraBed.isComplimentary ? 0 : extraBed.chargePerNight}
                                                onChange={e => setExtraBed(prev => ({ ...prev, chargePerNight: parseFloat(e.target.value) || 0 }))}
                                                className={`w-full h-9 px-3 rounded-lg border text-xs font-bold font-mono text-right ${
                                                    extraBed.isComplimentary
                                                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                                        : 'bg-white border-slate-300 text-blue-700 focus:ring-2 focus:ring-blue-500'
                                                }`}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Meal &amp; Amenity Inclusions
                                            </label>
                                            <div className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={extraBed.includesBreakfast}
                                                        onChange={e => setExtraBed(prev => ({ ...prev, includesBreakfast: e.target.checked }))}
                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span>Include Breakfast for Extra Guest</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <ShieldCheck size={16} className="text-blue-600" />
                                            <span>
                                                Formula: <strong>{extraBed.quantity} Bed(s)</strong> ×{' '}
                                                <strong>{nights} Night(s)</strong> @{' '}
                                                <strong>{extraBed.isComplimentary ? '৳0 (Free)' : `৳${extraBed.chargePerNight}/Night`}</strong>
                                            </span>
                                        </div>
                                        <div className="font-bold text-slate-900 font-mono">
                                            = ৳{extraBedSubtotal.toLocaleString()}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                            <FileText size={13} className="text-slate-500" />
                                            <span>Housekeeping &amp; Setup Instructions</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Set up prior to 2:00 PM check-in | Extra hypoallergenic pillows"
                                            value={extraBed.remarks || ''}
                                            onChange={e => setExtraBed(prev => ({ ...prev, remarks: e.target.value }))}
                                            className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: MEAL PLANS & DINING UPGRADES */}
                    {activeTab === 'mealplan' && (
                        <div className="space-y-4 animate-in fade-in duration-100">
                            <div className={`p-4 rounded-xl border transition-all ${
                                mealPlan.enabled ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/70 border-slate-200'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                            mealPlan.enabled ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            <Utensils size={16} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                                                <span>Meal Plan &amp; Dining Upgrade</span>
                                                {mealPlan.enabled && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                        Active
                                                    </span>
                                                )}
                                            </label>
                                            <p className="text-xs text-slate-500 m-0">
                                                Upgrade to Buffet Breakfast, Half Board (MAP), Full Board (AP) or Romantic Dinner
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={mealPlan.enabled}
                                            onChange={e => setMealPlan(prev => ({ ...prev, enabled: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                                    </label>
                                </div>
                            </div>

                            {mealPlan.enabled && (
                                <div className="space-y-3.5 pt-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Meal Plan Package
                                            </label>
                                            <select
                                                value={mealPlan.planType}
                                                onChange={e => {
                                                    const val = e.target.value as MealPlanConfig['planType'];
                                                    let rate = 750;
                                                    if (val === 'Half Board (Breakfast + Dinner - MAP)') rate = 1800;
                                                    else if (val === 'Full Board (All Meals - AP)') rate = 2800;
                                                    else if (val === 'Romantic Candlelight Dinner Setup') rate = 4500;
                                                    setMealPlan(prev => ({
                                                        ...prev,
                                                        planType: val,
                                                        ratePerGuestPerNight: rate
                                                    }));
                                                }}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                                            >
                                                <option value="Buffet Breakfast (CP)">Buffet Breakfast (CP - ৳750/person/day)</option>
                                                <option value="Half Board (Breakfast + Dinner - MAP)">Half Board: Breakfast + Dinner (MAP - ৳1,800/person/day)</option>
                                                <option value="Full Board (All Meals - AP)">Full Board: 3 Meals (AP - ৳2,800/person/day)</option>
                                                <option value="Romantic Candlelight Dinner Setup">Romantic Candlelight Dinner (৳4,500/couple setup)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Cover / Guest Count
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={mealPlan.guestsCount}
                                                onChange={e => setMealPlan(prev => ({ ...prev, guestsCount: parseInt(e.target.value) || 1 }))}
                                                className="w-full h-9 px-3 text-center rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-bold"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-bold text-slate-700">
                                                    Rate Per Person / Event (BDT)
                                                </label>
                                                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={mealPlan.isComplimentary}
                                                        onChange={e => setMealPlan(prev => ({ ...prev, isComplimentary: e.target.checked }))}
                                                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span>Complimentary (৳0)</span>
                                                </label>
                                            </div>
                                            <input
                                                type="number"
                                                disabled={mealPlan.isComplimentary}
                                                value={mealPlan.isComplimentary ? 0 : mealPlan.ratePerGuestPerNight}
                                                onChange={e => setMealPlan(prev => ({ ...prev, ratePerGuestPerNight: parseFloat(e.target.value) || 0 }))}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-bold font-mono text-right text-slate-800"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Dietary Preferences &amp; Allergies
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Halal strict, Vegan, Nut allergy, Jain food"
                                                value={mealPlan.dietaryNotes || ''}
                                                onChange={e => setMealPlan(prev => ({ ...prev, dietaryNotes: e.target.value }))}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-amber-900">
                                            <Coffee size={15} className="text-amber-700" />
                                            <span>
                                                Meal Total: <strong>{mealPlan.guestsCount} Guest(s)</strong> ×{' '}
                                                <strong>{mealPlan.planType === 'Romantic Candlelight Dinner Setup' ? '1 Event' : `${nights} Night(s)`}</strong>
                                            </span>
                                        </div>
                                        <div className="font-bold text-amber-950 font-mono text-sm">
                                            = ৳{mealPlanSubtotal.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: CELEBRATION & ROOM ROMANCE DECOR */}
                    {activeTab === 'celebration' && (
                        <div className="space-y-4 animate-in fade-in duration-100">
                            <div className={`p-4 rounded-xl border transition-all ${
                                celebration.enabled ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/70 border-slate-200'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                            celebration.enabled ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            <Gift size={16} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                                                <span>Celebration &amp; Romance Room Decor</span>
                                                {celebration.enabled && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                        Active
                                                    </span>
                                                )}
                                            </label>
                                            <p className="text-xs text-slate-500 m-0">
                                                Honeymoon swan towels, fresh rose petals, birthday cake, balloons &amp; welcome platter
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={celebration.enabled}
                                            onChange={e => setCelebration(prev => ({ ...prev, enabled: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                                    </label>
                                </div>
                            </div>

                            {celebration.enabled && (
                                <div className="space-y-3.5 pt-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Celebration Package
                                            </label>
                                            <select
                                                value={celebration.packageType}
                                                onChange={e => {
                                                    const val = e.target.value as CelebrationDecorConfig['packageType'];
                                                    let charge = 2500;
                                                    if (val === 'Birthday Celebration (Cake, Balloons & Card)') charge = 2000;
                                                    else if (val === 'VIP Welcome Fruit & Artisan Chocolates Platter') charge = 1200;
                                                    else if (val === 'Anniversary Special Setup') charge = 3000;
                                                    setCelebration(prev => ({
                                                        ...prev,
                                                        packageType: val,
                                                        chargeAmount: charge
                                                    }));
                                                }}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                                            >
                                                <option value="Honeymoon Romantic Floral & Swan Decor">Honeymoon Romantic Floral &amp; Swan Decor (৳2,500)</option>
                                                <option value="Birthday Celebration (Cake, Balloons & Card)">Birthday Celebration: Cake, Balloons &amp; Greeting (৳2,000)</option>
                                                <option value="Anniversary Special Setup">Anniversary Special: Bed Roses &amp; Sparkling Drink (৳3,000)</option>
                                                <option value="VIP Welcome Fruit & Artisan Chocolates Platter">VIP Welcome Fruit &amp; Artisan Chocolates (৳1,200)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Execution Timing
                                            </label>
                                            <select
                                                value={celebration.executionTime || 'Prior to Check-in'}
                                                onChange={e => setCelebration(prev => ({ ...prev, executionTime: e.target.value }))}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                            >
                                                <option value="Prior to Check-in">Ready in Room Prior to Guest Check-in</option>
                                                <option value="During Evening Turndown Service">During Evening Turndown (7:00 PM - 8:30 PM)</option>
                                                <option value="Midnight Surprise (12:00 AM)">Midnight Birthday Surprise (12:00 AM)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                                <Cake size={13} className="text-rose-600" />
                                                <span>Cake Flavor / Preference</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Belgian Chocolate Truffle, Red Velvet, Vanilla"
                                                value={celebration.cakeFlavor || ''}
                                                onChange={e => setCelebration(prev => ({ ...prev, cakeFlavor: e.target.value }))}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-bold text-slate-700">
                                                    Package Charge (BDT)
                                                </label>
                                                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={celebration.isComplimentary}
                                                        onChange={e => setCelebration(prev => ({ ...prev, isComplimentary: e.target.checked }))}
                                                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span>Complimentary (৳0)</span>
                                                </label>
                                            </div>
                                            <input
                                                type="number"
                                                disabled={celebration.isComplimentary}
                                                value={celebration.isComplimentary ? 0 : celebration.chargeAmount}
                                                onChange={e => setCelebration(prev => ({ ...prev, chargeAmount: parseFloat(e.target.value) || 0 }))}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-bold font-mono text-right text-rose-700"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                            <Heart size={13} className="text-rose-500" />
                                            <span>Card Inscription / Cake Text Message</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 'Happy 5th Anniversary Imran & Sarah!' or 'Happy Birthday Dad!'"
                                            value={celebration.customMessage || ''}
                                            onChange={e => setCelebration(prev => ({ ...prev, customMessage: e.target.value }))}
                                            className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 5: WELLNESS, SPA & HYDROTHERAPY */}
                    {activeTab === 'spa' && (
                        <div className="space-y-4 animate-in fade-in duration-100">
                            <div className={`p-4 rounded-xl border transition-all ${
                                spaWellness.enabled ? 'bg-teal-50/50 border-teal-200' : 'bg-slate-50/70 border-slate-200'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                            spaWellness.enabled ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>
                                            <Sparkles size={16} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                                                <span>Hotel Wellness &amp; Spa Experience</span>
                                                {spaWellness.enabled && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                        Active
                                                    </span>
                                                )}
                                            </label>
                                            <p className="text-xs text-slate-500 m-0">
                                                Reserve luxury spa sessions, Swedish massages, sauna &amp; jacuzzi passes
                                            </p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={spaWellness.enabled}
                                            onChange={e => setSpaWellness(prev => ({ ...prev, enabled: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>
                            </div>

                            {spaWellness.enabled && (
                                <div className="space-y-3.5 pt-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Treatment / Spa Service
                                            </label>
                                            <select
                                                value={spaWellness.serviceType}
                                                onChange={e => {
                                                    const val = e.target.value as SpaWellnessConfig['serviceType'];
                                                    let charge = 3500;
                                                    if (val === 'Couples Rejuvenation Spa (90 min)') charge = 6500;
                                                    else if (val === 'Deep Tissue Therapeutic Massage (60 min)') charge = 4000;
                                                    else if (val === 'Steam, Sauna & Jacuzzi Day Pass') charge = 1000;
                                                    setSpaWellness(prev => ({
                                                        ...prev,
                                                        serviceType: val,
                                                        chargeAmount: charge
                                                    }));
                                                }}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                                            >
                                                <option value="Signature Swedish Aromatherapy (60 min)">Signature Swedish Aromatherapy 60m (৳3,500)</option>
                                                <option value="Couples Rejuvenation Spa (90 min)">Couples Rejuvenation Ritual 90m (৳6,500)</option>
                                                <option value="Deep Tissue Therapeutic Massage (60 min)">Deep Tissue Therapeutic Massage 60m (৳4,000)</option>
                                                <option value="Steam, Sauna & Jacuzzi Day Pass">Steam, Sauna &amp; Hydro-Jacuzzi Pass (৳1,000)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Number of Persons
                                            </label>
                                            <select
                                                value={spaWellness.personsCount}
                                                onChange={e => setSpaWellness(prev => ({ ...prev, personsCount: parseInt(e.target.value) || 1 }))}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                                            >
                                                <option value={1}>1 Person</option>
                                                <option value={2}>2 Persons (Couple / Pair)</option>
                                                <option value={3}>3 Persons</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Preferred Appointment Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={spaWellness.preferredDateTime || ''}
                                                onChange={e => setSpaWellness(prev => ({ ...prev, preferredDateTime: e.target.value }))}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs font-bold text-slate-700">
                                                    Total Spa Charge (BDT)
                                                </label>
                                                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={spaWellness.isComplimentary}
                                                        onChange={e => setSpaWellness(prev => ({ ...prev, isComplimentary: e.target.checked }))}
                                                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span>Complimentary (৳0)</span>
                                                </label>
                                            </div>
                                            <input
                                                type="number"
                                                disabled={spaWellness.isComplimentary}
                                                value={spaWellness.isComplimentary ? 0 : spaWellness.chargeAmount}
                                                onChange={e => setSpaWellness(prev => ({ ...prev, chargeAmount: parseFloat(e.target.value) || 0 }))}
                                                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-bold font-mono text-right text-teal-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 6: EARLY CHECK-IN & LATE CHECK-OUT */}
                    {activeTab === 'timing' && (
                        <div className="space-y-4 animate-in fade-in duration-100">
                            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 m-0">
                                            Guaranteed Early Check-In &amp; Late Check-Out (Time-Flex)
                                        </h3>
                                        <p className="text-xs text-slate-500 m-0">
                                            Guarantee room readiness before standard 2:00 PM or extended departure beyond 12:00 PM
                                        </p>
                                    </div>
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={timingFlex.isComplimentary}
                                            onChange={e => setTimingFlex(prev => ({ ...prev, isComplimentary: e.target.checked }))}
                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>Complimentary (VIP)</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    {/* Early Check In Card */}
                                    <div className={`p-3.5 rounded-xl border transition-all ${
                                        timingFlex.earlyCheckIn ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-200'
                                    }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={timingFlex.earlyCheckIn}
                                                    onChange={e => setTimingFlex(prev => ({ ...prev, earlyCheckIn: e.target.checked }))}
                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>Guaranteed Early Check-In</span>
                                            </label>
                                            <span className="text-[10px] font-bold text-blue-700 font-mono">
                                                {timingFlex.isComplimentary ? 'Free' : `৳${timingFlex.earlyCheckInCharge}`}
                                            </span>
                                        </div>

                                        {timingFlex.earlyCheckIn && (
                                            <div className="space-y-2 pt-1">
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                                        Estimated Arrival Time
                                                    </label>
                                                    <select
                                                        value={timingFlex.earlyCheckInTime || '09:00 AM'}
                                                        onChange={e => setTimingFlex(prev => ({ ...prev, earlyCheckInTime: e.target.value }))}
                                                        className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-medium"
                                                    >
                                                        <option value="06:00 AM - 08:00 AM">06:00 AM - 08:00 AM (Early Morning Flight)</option>
                                                        <option value="09:00 AM">09:00 AM (Standard Early Arrival)</option>
                                                        <option value="11:00 AM">11:00 AM (Pre-Noon Arrival)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                                        Early Check-In Surcharge (BDT)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        disabled={timingFlex.isComplimentary}
                                                        value={timingFlex.isComplimentary ? 0 : timingFlex.earlyCheckInCharge}
                                                        onChange={e => setTimingFlex(prev => ({ ...prev, earlyCheckInCharge: parseFloat(e.target.value) || 0 }))}
                                                        className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-right"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Late Check Out Card */}
                                    <div className={`p-3.5 rounded-xl border transition-all ${
                                        timingFlex.lateCheckOut ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-200'
                                    }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={timingFlex.lateCheckOut}
                                                    onChange={e => setTimingFlex(prev => ({ ...prev, lateCheckOut: e.target.checked }))}
                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>Guaranteed Late Check-Out</span>
                                            </label>
                                            <span className="text-[10px] font-bold text-blue-700 font-mono">
                                                {timingFlex.isComplimentary ? 'Free' : `৳${timingFlex.lateCheckOutCharge}`}
                                            </span>
                                        </div>

                                        {timingFlex.lateCheckOut && (
                                            <div className="space-y-2 pt-1">
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                                        Requested Departure Time
                                                    </label>
                                                    <select
                                                        value={timingFlex.lateCheckOutTime || '04:00 PM'}
                                                        onChange={e => setTimingFlex(prev => ({ ...prev, lateCheckOutTime: e.target.value }))}
                                                        className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 font-medium"
                                                    >
                                                        <option value="02:00 PM">Up to 02:00 PM (+2 hrs)</option>
                                                        <option value="04:00 PM">Up to 04:00 PM (+4 hrs)</option>
                                                        <option value="06:00 PM">Up to 06:00 PM (Late Flight Departure)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                                        Late Check-Out Surcharge (BDT)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        disabled={timingFlex.isComplimentary}
                                                        value={timingFlex.isComplimentary ? 0 : timingFlex.lateCheckOutCharge}
                                                        onChange={e => setTimingFlex(prev => ({ ...prev, lateCheckOutCharge: parseFloat(e.target.value) || 0 }))}
                                                        className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs font-mono font-bold text-right"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 7: CUSTOM ADD-ONS & ANCILLARY CHARGES */}
                    {activeTab === 'custom' && (
                        <div className="space-y-4 animate-in fade-in duration-100">
                            <div className="flex items-center justify-between bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 m-0">Custom Add-on Services</h3>
                                    <p className="text-xs text-slate-500 m-0">
                                        Add arbitrary hotel amenities, laundry packages, city tours, or meeting room rentals
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddCustomItem}
                                    className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                                >
                                    <Plus size={13} className="stroke-[2.5]" />
                                    <span>Add Custom Service</span>
                                </button>
                            </div>

                            {customAddons.length > 0 ? (
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                                                <th className="py-2 px-3">Service Title / Description</th>
                                                <th className="py-2 px-2 text-center w-28">Billing Mode</th>
                                                <th className="py-2 px-2 text-center w-16">Qty</th>
                                                <th className="py-2 px-2 text-right w-24">Price (BDT)</th>
                                                <th className="py-2 px-2 text-center w-24">Free?</th>
                                                <th className="py-2 px-2 text-right w-24">Total</th>
                                                <th className="py-2 px-2 text-center w-10">Del</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {customAddons.map(item => {
                                                const dur = item.chargeType === 'per_night' ? Math.max(1, nights) : 1;
                                                const line = item.isComplimentary ? 0 : (item.amount * item.quantity * dur);
                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                                        <td className="py-2 px-3">
                                                            <input
                                                                type="text"
                                                                value={item.title}
                                                                onChange={e => handleUpdateCustomItem(item.id, 'title', e.target.value)}
                                                                placeholder="e.g. Express Laundry Bundle, City Tour"
                                                                className="w-full h-8 px-2 border border-slate-200 rounded text-xs outline-none focus:border-blue-400"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-2 text-center">
                                                            <select
                                                                value={item.chargeType}
                                                                onChange={e => handleUpdateCustomItem(item.id, 'chargeType', e.target.value)}
                                                                className="h-8 px-2 border border-slate-200 rounded text-xs bg-white outline-none cursor-pointer"
                                                            >
                                                                <option value="once">One-Time Fee</option>
                                                                <option value="per_night">Per Night</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-2 px-2 text-center">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={item.quantity}
                                                                onChange={e => handleUpdateCustomItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                                className="w-12 h-8 px-1 text-center border border-slate-200 rounded text-xs font-bold"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-2 text-right">
                                                            <input
                                                                type="number"
                                                                value={item.amount}
                                                                onChange={e => handleUpdateCustomItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                                                                className="w-20 h-8 px-2 text-right border border-slate-200 rounded text-xs font-mono font-bold"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-2 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.isComplimentary}
                                                                onChange={e => handleUpdateCustomItem(item.id, 'isComplimentary', e.target.checked)}
                                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                                                            ৳{line.toLocaleString()}
                                                        </td>
                                                        <td className="py-2 px-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveCustomItem(item.id)}
                                                                className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                                                                title="Delete Item"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                                    <Sparkles size={28} className="mx-auto text-slate-300 mb-1.5" />
                                    <p className="text-xs font-bold text-slate-700 m-0">No Custom Add-On Items Added</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto mb-3">
                                        Click the button above to add tailor-made amenities like laundry packages, excursions, or meeting room hours.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleAddCustomItem}
                                        className="h-8 px-3.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                                    >
                                        + Add First Custom Service
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Financial Breakdown & Action Buttons */}
                <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex flex-col">
                            <span className="text-[9.5px] uppercase font-bold text-slate-400">Room Base</span>
                            <span className="font-semibold text-slate-700 font-mono">৳{roomStayTotal.toLocaleString()}</span>
                        </div>
                        <span className="text-slate-300 font-bold">+</span>
                        <div className="flex flex-col">
                            <span className="text-[9.5px] uppercase font-bold text-slate-400">All Add-Ons</span>
                            <span className={`font-semibold font-mono ${totalAddonsCharge > 0 ? 'text-blue-700' : 'text-slate-500'}`}>
                                ৳{totalAddonsCharge.toLocaleString()}
                            </span>
                        </div>
                        <span className="text-slate-300 font-bold">=</span>
                        <div className="flex flex-col bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[9.5px] uppercase font-bold text-blue-600">Total Room Charge</span>
                            <span className="font-bold text-slate-900 font-mono text-sm">৳{grandRowTotal.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={handleResetAll}
                            className="h-8 px-3 text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 font-medium rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                            <RotateCcw size={13} />
                            <span>Reset</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-8 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer transition-colors shadow-2xs"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                        >
                            <Check size={14} className="stroke-[2.5]" />
                            <span>Apply All Services</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
