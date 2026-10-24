import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Trash2,
    X,
    Building2,
    MoreVertical,
    Car,
    Plane,
    BedDouble,
    Utensils,
    Gift,
    Clock,
    Sparkles
} from 'lucide-react';
import { StayPeriodPicker, getSystemDateISO, getNextDayISO } from '../common/StayPeriodPicker';
import { ChildAgeSelector } from '../common/ChildAgeSelector';
import { RoomAddonServicesModal, type ServiceTabType } from './RoomAddonServicesModal';
import type {
    RoomServicesBundle,
    ExtraBedConfig,
    PickupConfig
} from '../../types/reservationServices';
import {
    getExtraBedTotal,
    getMealPlanTotal,
    getCelebrationTotal,
    getSpaWellnessTotal,
    getTimingFlexTotal,
    getCustomAddonsTotal,
    getRoomBundleTotal
} from '../../types/reservationServices';

export interface QuickReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomInfo?: {
        room: string;
        startDate: string;
        endDate: string;
        nights: number;
        startIndex?: number;
        endIndex?: number;
    };
    onReserve?: (booking: {
        room: string;
        startIndex: number;
        endIndex: number;
        guestName: string;
        status: string;
    }) => void;
}

interface RoomItem {
    id: number;
    roomType: string;
    noOfRooms: number;
    ratePlan: string;
    roomNumber: string;
    adults: number;
    children: number;
    childrenAges?: number[];
    rate: number;
    servicesBundle?: RoomServicesBundle;
    extraBed?: ExtraBedConfig;
    pickup?: PickupConfig;
}

interface PaymentRow {
    id: number;
    method: 'Cash' | 'Card' | 'bKash' | 'Bank Transfer';
    amount: number;
}

export const QuickReservationModal: React.FC<QuickReservationModalProps> = ({
    isOpen,
    onClose,
    roomInfo,
    onReserve
}) => {
    const [activeTab, setActiveTab] = useState<'reservation' | 'payment'>('reservation');

    // Options
    const [dayUse, setDayUse] = useState<boolean>(false);
    const [taxApplicable, setTaxApplicable] = useState<boolean>(true);

    // Reservation Details
    const [checkInDate, setCheckInDate] = useState<string>(() => getSystemDateISO());
    const [nights, setNights] = useState<number>(1);
    const [checkOutDate, setCheckOutDate] = useState<string>(() => getNextDayISO(getSystemDateISO(), 1));
    const [businessSource, setBusinessSource] = useState<string>('Direct');
    const [businessAgent, setBusinessAgent] = useState<string>('Direct');

    // Rooms list
    const [roomsList, setRoomsList] = useState<RoomItem[]>([
        {
            id: 1,
            roomType: 'Winter Rate Plan',
            noOfRooms: 1,
            ratePlan: 'Summer Vacation',
            roomNumber: '101',
            adults: 2,
            children: 1,
            childrenAges: [5],
            rate: 3000
        }
    ]);

    // Handle Day Use toggle
    const handleDayUseToggle = (isDayUse: boolean) => {
        setDayUse(isDayUse);
        if (isDayUse) {
            setCheckOutDate(checkInDate);
            setNights(0);
        } else {
            const nextDay = getNextDayISO(checkInDate, 1);
            setCheckOutDate(nextDay);
            setNights(1);
        }
    };

    // Guest Info
    const [title, setTitle] = useState<string>('Mr.');
    const [name, setName] = useState<string>('');
    const [mobile, setMobile] = useState<string>('');
    const [email, setEmail] = useState<string>('');

    // Payment Details
    const [discountType, setDiscountType] = useState<'Percentage' | 'Fixed'>('Fixed');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([
        { id: 1, method: 'Cash', amount: 3000 }
    ]);

    // Initialize from roomInfo prop when opened
    useEffect(() => {
        if (roomInfo) {
            if (roomInfo.startDate) setCheckInDate(roomInfo.startDate);
            if (roomInfo.endDate) setCheckOutDate(roomInfo.endDate);
            if (roomInfo.nights) setNights(roomInfo.nights);
            if (roomInfo.room) {
                setRoomsList(prev => [
                    {
                        ...prev[0],
                        roomNumber: roomInfo.room.replace(/[^0-9a-zA-Z-]/g, '') || '101'
                    }
                ]);
            }
        }
    }, [roomInfo, isOpen]);


    // Room Add-On Services (Full Bundle) State
    const [serviceModalConfig, setServiceModalConfig] = useState<{
        isOpen: boolean;
        rowId: number | null;
        initialTab: ServiceTabType;
    }>({
        isOpen: false,
        rowId: null,
        initialTab: 'pickup'
    });
    const [activeMenuRowId, setActiveMenuRowId] = useState<number | null>(null);

    const handleSaveRoomServices = (rowId: number, bundle: RoomServicesBundle) => {
        setRoomsList(prev => prev.map(r => r.id === rowId ? {
            ...r,
            servicesBundle: bundle,
            extraBed: bundle.extraBed,
            pickup: bundle.pickup
        } : r));
    };

    const activeRowForService = roomsList.find(r => r.id === serviceModalConfig.rowId);

    // Calculate financials
    const nightMultiplier = dayUse ? 1 : Math.max(1, nights);
    const roomBaseTotal = roomsList.reduce((acc, r) => acc + (r.rate * r.noOfRooms * nightMultiplier), 0);
    const totalExtraBedCharge = roomsList.reduce((acc, r) => acc + getExtraBedTotal(r.servicesBundle?.extraBed || r.extraBed, nightMultiplier), 0);
    const totalPickupArrivalCharge = roomsList.reduce((acc, r) => {
        const p = r.servicesBundle?.pickup || r.pickup;
        return acc + (p?.enabled && !p.isComplimentary ? (Number(p.chargeAmount) || 0) : 0);
    }, 0);
    const totalDropDepartureCharge = roomsList.reduce((acc, r) => {
        const p = r.servicesBundle?.pickup || r.pickup;
        return acc + (p?.dropEnabled && !p.dropIsComplimentary ? (Number(p.dropChargeAmount) || 0) : 0);
    }, 0);
    const totalPickupCharge = totalPickupArrivalCharge + totalDropDepartureCharge;
    const totalMealPlanCharge = roomsList.reduce((acc, r) => acc + getMealPlanTotal(r.servicesBundle?.mealPlan, nightMultiplier), 0);
    const totalCelebrationCharge = roomsList.reduce((acc, r) => acc + getCelebrationTotal(r.servicesBundle?.celebration), 0);
    const totalSpaCharge = roomsList.reduce((acc, r) => acc + getSpaWellnessTotal(r.servicesBundle?.spaWellness), 0);
    const totalTimingCharge = roomsList.reduce((acc, r) => acc + getTimingFlexTotal(r.servicesBundle?.timingFlex), 0);
    const totalCustomCharge = roomsList.reduce((acc, r) => acc + getCustomAddonsTotal(r.servicesBundle?.customAddons, nightMultiplier), 0);

    const totalAllAddonsCharges = totalExtraBedCharge + totalPickupCharge + totalMealPlanCharge + totalCelebrationCharge + totalSpaCharge + totalTimingCharge + totalCustomCharge;
    const totalAmount = roomBaseTotal + totalAllAddonsCharges;
    const discountedAmount = discountType === 'Percentage'
        ? (totalAmount * (discountValue || 0)) / 100
        : (discountValue || 0);
    const netTotal = Math.max(0, totalAmount - discountedAmount);
    const totalPaid = paymentRows.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalDue = Math.max(0, netTotal - totalPaid);

    // Keep payment row default in sync if only 1 cash row
    useEffect(() => {
        if (paymentRows.length === 1 && paymentRows[0].method === 'Cash') {
            setPaymentRows([{ id: 1, method: 'Cash', amount: netTotal }]);
        }
    }, [netTotal]);

    // Room handlers
    const handleAddRoom = () => {
        const nextId = roomsList.length > 0 ? Math.max(...roomsList.map(r => r.id)) + 1 : 1;
        const usedRooms = new Set(roomsList.map(r => r.roomNumber));
        const pool = ['101', '102', '107', '108', '201', '202', '205', '301', '302'];
        const nextRoom = pool.find(rn => !usedRooms.has(rn)) || String(100 + nextId);
        setRoomsList([
            ...roomsList,
            {
                id: nextId,
                roomType: 'Deluxe Double',
                noOfRooms: 1,
                ratePlan: 'Standard Rate',
                roomNumber: nextRoom,
                adults: 2,
                children: 0,
                rate: 3000
            }
        ]);
    };

    const handleRemoveRoom = (id: number) => {
        if (roomsList.length <= 1) return;
        setRoomsList(roomsList.filter(r => r.id !== id));
    };

    const handleRoomFieldChange = <K extends keyof RoomItem>(id: number, field: K, value: RoomItem[K]) => {
        setRoomsList(roomsList.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    // Payment handlers
    const handleAddPaymentRow = () => {
        const nextId = paymentRows.length > 0 ? Math.max(...paymentRows.map(p => p.id)) + 1 : 1;
        setPaymentRows([
            ...paymentRows,
            { id: nextId, method: 'Cash', amount: totalDue > 0 ? totalDue : 0 }
        ]);
    };

    const handleRemovePaymentRow = (id: number) => {
        if (paymentRows.length <= 1) return;
        setPaymentRows(paymentRows.filter(p => p.id !== id));
    };

    const handlePaymentRowChange = <K extends keyof PaymentRow>(id: number, field: K, value: PaymentRow[K]) => {
        setPaymentRows(paymentRows.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    // Submit reservation action
    const handleCompleteReservation = (status: 'hold' | 'confirmed' | 'stayover' | 'arrived') => {
        const guestDisplayName = name.trim() ? `${title} ${name.trim()}` : `Walk-In Guest (${roomsList[0]?.roomNumber || '101'})`;
        const primaryRoom = roomsList[0]?.roomNumber || roomInfo?.room || '101';

        // Save to localStorage for full application persistence
        const newRecord = {
            id: Date.now(),
            reservationNumber: `RES-${Date.now().toString().slice(-6)}`,
            guestName: guestDisplayName,
            phone: mobile || 'N/A',
            roomNumber: primaryRoom,
            roomType: roomsList[0]?.roomType || 'Standard Room',
            checkIn: checkInDate,
            checkOut: checkOutDate,
            nights,
            adults: roomsList.reduce((acc, r) => acc + r.adults, 0),
            children: roomsList.reduce((acc, r) => acc + r.children, 0),
            status,
            totalAmount: netTotal,
            paidAmount: status === 'hold' ? 0 : totalPaid,
            dueAmount: status === 'hold' ? netTotal : totalDue,
            source: businessSource,
            roomsList: [...roomsList],
            servicesBundle: roomsList[0]?.servicesBundle || { extraBed: roomsList[0]?.extraBed, pickup: roomsList[0]?.pickup },
            extraBed: roomsList[0]?.servicesBundle?.extraBed || roomsList[0]?.extraBed || null,
            pickup: roomsList[0]?.servicesBundle?.pickup || roomsList[0]?.pickup || null,
            mealPlan: roomsList[0]?.servicesBundle?.mealPlan || null,
            celebration: roomsList[0]?.servicesBundle?.celebration || null,
            spaWellness: roomsList[0]?.servicesBundle?.spaWellness || null,
            timingFlex: roomsList[0]?.servicesBundle?.timingFlex || null,
            customAddons: roomsList[0]?.servicesBundle?.customAddons || [],
            addonCharges: {
                extraBed: totalExtraBedCharge,
                pickup: totalPickupArrivalCharge,
                drop: totalDropDepartureCharge,
                transferTotal: totalPickupCharge,
                mealPlan: totalMealPlanCharge,
                celebration: totalCelebrationCharge,
                spa: totalSpaCharge,
                timingFlex: totalTimingCharge,
                custom: totalCustomCharge,
                total: totalAllAddonsCharges
            },
            createdAt: new Date().toISOString()
        };

        try {
            const existing = localStorage.getItem('hotel_reservations_v2');
            const list = existing ? JSON.parse(existing) : [];
            list.unshift(newRecord);
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(list));
        } catch (e) {
            console.error('Failed to sync to local storage', e);
        }

        // Call parent callback
        if (onReserve && roomInfo?.startIndex !== undefined && roomInfo?.endIndex !== undefined) {
            onReserve({
                room: primaryRoom,
                startIndex: roomInfo.startIndex,
                endIndex: roomInfo.endIndex,
                guestName: guestDisplayName,
                status
            });
        }

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
            <div className="bg-white w-[96%] max-w-[880px] max-h-[88vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
                {/* Modern Light Header */}
                <div className="bg-slate-50/90 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center font-bold shadow-xs flex-shrink-0">
                            <CalendarIcon size={14} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-800 tracking-tight m-0">Quick Reservation</h2>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    Express Mode
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 m-0 font-medium">Fast Front Desk Walk-In &amp; Express Booking</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Close Modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Compact Segmented Tabs */}
                <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div className="flex p-0.5 bg-slate-100/90 rounded-lg border border-slate-200/80">
                        <button
                            type="button"
                            onClick={() => setActiveTab('reservation')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                                activeTab === 'reservation'
                                    ? 'bg-white text-blue-900 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            1. Reservation Details
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('payment')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                                activeTab === 'payment'
                                    ? 'bg-white text-blue-900 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            2. Payment &amp; Billing
                        </button>
                    </div>

                    <div className="text-[11px] font-medium text-slate-500 hidden sm:block">
                        Total: <strong className="text-slate-900 font-bold">BDT {netTotal.toLocaleString()}</strong>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 bg-white space-y-3.5">
                    {activeTab === 'reservation' && (
                        <div className="space-y-3 animate-in fade-in duration-100">
                            {/* Parameters Card Container (matching Add Reservation) */}
                            <div className="bg-slate-50/70 border border-slate-200/90 rounded-lg p-3 shadow-2xs space-y-2.5">
                                {/* Top Grid Fields: Consolidated Stay Period Picker + Source + Agent */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                                    {/* Consolidated Single Stay Dates Controller */}
                                    <div className="md:col-span-6">
                                        <StayPeriodPicker
                                            checkIn={checkInDate}
                                            checkOut={checkOutDate}
                                            nights={nights}
                                            dayUse={dayUse}
                                            onDateChange={(newIn, newOut, newNights) => {
                                                setCheckInDate(newIn);
                                                if (dayUse) {
                                                    setCheckOutDate(newIn);
                                                    setNights(0);
                                                } else {
                                                    setCheckOutDate(newOut);
                                                    setNights(newNights);
                                                }
                                            }}
                                            compact
                                            label="Stay Period (Check In - Check Out)"
                                        />
                                    </div>

                                    <div className="md:col-span-3 flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <span>Source</span>
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={businessSource}
                                            onChange={e => setBusinessSource(e.target.value)}
                                            className="w-full h-7.5 px-2 border border-slate-200 rounded-md text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-medium transition-all"
                                        >
                                            <option value="Direct">Direct</option>
                                            <option value="Booking.com">Booking.com</option>
                                            <option value="Agoda">Agoda</option>
                                            <option value="Expedia">Expedia</option>
                                            <option value="Corporate">Corporate</option>
                                            <option value="Walk-In">Walk-In</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-3 flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <span>Agent</span>
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={businessAgent}
                                            onChange={e => setBusinessAgent(e.target.value)}
                                            className="w-full h-7.5 px-2 border border-slate-200 rounded-md text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-medium transition-all"
                                        >
                                            <option value="Direct">Direct</option>
                                            <option value="Front Desk">Front Desk</option>
                                            <option value="Agent A">Agent A</option>
                                            <option value="Corporate Rep">Corporate Rep</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Options Row */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer select-none hover:text-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={dayUse}
                                            onChange={e => handleDayUseToggle(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span>Day Use</span>
                                    </label>

                                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer select-none hover:text-slate-900">
                                        <input
                                            type="checkbox"
                                            checked={taxApplicable}
                                            onChange={e => setTaxApplicable(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <span>Tax Applicable</span>
                                    </label>
                                </div>
                            </div>

                            {/* Rooms Table (Compact & Perfectly Sized - Zero Horizontal Overflow) */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <div className="overflow-x-hidden">
                                    <table className="w-full text-left border-collapse text-[11px] table-auto">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                                                <th className="py-2 px-2.5 min-w-[120px]">Room Type</th>
                                                <th className="py-2 px-1 text-center w-11">Qty</th>
                                                <th className="py-2 px-2 min-w-[120px]">Rate Plan</th>
                                                <th className="py-2 px-1 text-center w-16">Room No.</th>
                                                <th className="py-2 px-1 text-center w-11">Adult</th>
                                                <th className="py-2 px-1 text-center w-22">Child</th>
                                                <th className="py-2 px-1.5 text-right w-20">Rate</th>
                                                <th className="py-2 px-2 text-right w-24">Total</th>
                                                <th className="py-2 px-1.5 text-center w-16">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {roomsList.map(item => {
                                                const bundle = item.servicesBundle || { extraBed: item.extraBed, pickup: item.pickup };
                                                const itemAddons = getRoomBundleTotal(bundle, nightMultiplier);
                                                const baseLineTotal = item.rate * item.noOfRooms * nightMultiplier;
                                                const lineTotal = baseLineTotal + itemAddons;

                                                return (
                                                    <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                                                        <td className="py-1.5 px-2.5">
                                                            <select
                                                                value={item.roomType}
                                                                onChange={e => handleRoomFieldChange(item.id, 'roomType', e.target.value)}
                                                                className="w-full min-w-[105px] max-w-[130px] h-7 px-1.5 border border-slate-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                            >
                                                                <option value="Winter Rate Plan">Winter Rate Plan</option>
                                                                <option value="Deluxe Double">Deluxe Double</option>
                                                                <option value="Executive Suite">Executive Suite</option>
                                                                <option value="Standard Single">Standard Single</option>
                                                            </select>
                                                            {/* Active Room Add-on Badges */}
                                                            {(() => {
                                                                const b = item.servicesBundle || { extraBed: item.extraBed, pickup: item.pickup };
                                                                const hasServices = b.pickup?.enabled || b.extraBed?.enabled || b.mealPlan?.enabled || b.celebration?.enabled || b.spaWellness?.enabled || b.timingFlex?.earlyCheckIn || b.timingFlex?.lateCheckOut || (b.customAddons && b.customAddons.length > 0);
                                                                if (!hasServices) return null;

                                                                return (
                                                                    <div className="flex flex-wrap items-center gap-1 mt-1 max-w-[210px]">
                                                                        {b.pickup?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'pickup' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer shadow-2xs"
                                                                                title="Airport Transfer Configured"
                                                                            >
                                                                                <Car size={10} />
                                                                                <span>{b.pickup.flightNumber ? b.pickup.flightNumber : 'Transfer'}</span>
                                                                                <span className="font-bold">{b.pickup.isComplimentary ? 'Free' : `৳${b.pickup.chargeAmount}`}</span>
                                                                            </button>
                                                                        )}
                                                                        {b.extraBed?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'extrabed' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer shadow-2xs"
                                                                                title="Extra Bed Configured"
                                                                            >
                                                                                <BedDouble size={10} />
                                                                                <span>{b.extraBed.quantity}x Bed</span>
                                                                                <span className="font-bold">{b.extraBed.isComplimentary ? 'Free' : `৳${getExtraBedTotal(b.extraBed, nightMultiplier)}`}</span>
                                                                            </button>
                                                                        )}
                                                                        {b.mealPlan?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'mealplan' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer shadow-2xs"
                                                                                title="Meal Plan Configured"
                                                                            >
                                                                                <Utensils size={10} />
                                                                                <span>{b.mealPlan.planType.split(' ')[0]}</span>
                                                                            </button>
                                                                        )}
                                                                        {b.celebration?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'celebration' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer shadow-2xs"
                                                                                title="Celebration Setup Configured"
                                                                            >
                                                                                <Gift size={10} />
                                                                                <span>Decor</span>
                                                                            </button>
                                                                        )}
                                                                        {b.spaWellness?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'spa' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 cursor-pointer shadow-2xs"
                                                                                title="Spa Treatment Configured"
                                                                            >
                                                                                <Sparkles size={10} />
                                                                                <span>Spa</span>
                                                                            </button>
                                                                        )}
                                                                        {(b.timingFlex?.earlyCheckIn || b.timingFlex?.lateCheckOut) && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'timing' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 cursor-pointer shadow-2xs"
                                                                                title="Early/Late Check-in/out Flex"
                                                                            >
                                                                                <Clock size={10} />
                                                                                <span>Flex</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="py-1.5 px-1 text-center">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={item.noOfRooms}
                                                                onChange={e => handleRoomFieldChange(item.id, 'noOfRooms', parseInt(e.target.value) || 1)}
                                                                className="w-9 h-7 px-0.5 border border-slate-200 rounded text-[11px] text-center font-bold outline-none mx-auto block"
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-2">
                                                            <select
                                                                value={item.ratePlan}
                                                                onChange={e => handleRoomFieldChange(item.id, 'ratePlan', e.target.value)}
                                                                className="w-full min-w-[115px] max-w-[140px] h-7 px-1.5 border border-slate-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                            >
                                                                <option value="Summer Vacation">Summer Vacation</option>
                                                                <option value="Standard EP">Standard EP (Room Only)</option>
                                                                <option value="Corporate CP">Corporate CP (Bed & Breakfast)</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-1.5 px-1 text-center">
                                                            <input
                                                                type="text"
                                                                value={item.roomNumber}
                                                                onChange={e => handleRoomFieldChange(item.id, 'roomNumber', e.target.value)}
                                                                className="w-14 h-7 px-1 border border-slate-200 rounded text-[11px] font-mono font-bold text-blue-700 outline-none text-center mx-auto block"
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-1 text-center">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={item.adults}
                                                                onChange={e => handleRoomFieldChange(item.id, 'adults', parseInt(e.target.value) || 1)}
                                                                className="w-9 h-7 px-0.5 border border-slate-200 rounded text-[11px] text-center outline-none mx-auto block"
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-1 text-center">
                                                            <ChildAgeSelector
                                                                childrenCount={item.children}
                                                                childrenAges={item.childrenAges}
                                                                onChange={(count, ages) => {
                                                                    setRoomsList(prev => prev.map(r => r.id === item.id ? { ...r, children: count, childrenAges: ages } : r));
                                                                }}
                                                                compact
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-1.5 text-right">
                                                            <input
                                                                type="number"
                                                                value={item.rate}
                                                                onChange={e => handleRoomFieldChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                                                className="w-16 h-7 px-1 border border-slate-200 rounded text-[11px] font-semibold text-right outline-none ml-auto block"
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-2 text-right font-bold text-slate-800 whitespace-nowrap text-[11px]">
                                                            <div>৳{lineTotal.toLocaleString()}</div>
                                                            {itemAddons > 0 && (
                                                                <div className="text-[9px] text-slate-400 font-normal">
                                                                    Base: {baseLineTotal.toLocaleString()} + Svc: {itemAddons.toLocaleString()}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-1.5 px-1.5 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                {/* 3-dots Menu Button */}
                                                                <div className="relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveMenuRowId(activeMenuRowId === item.id ? null : item.id)}
                                                                        title="Room Add-On Services (Transfer, Bed, Meals, Spa, Romance, Flex)"
                                                                        className={`p-1 rounded cursor-pointer transition-all ${
                                                                            (item.servicesBundle || item.extraBed?.enabled || item.pickup?.enabled)
                                                                                ? 'text-blue-700 bg-blue-100/70 hover:bg-blue-200/70 ring-1 ring-blue-300'
                                                                                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                                                                        }`}
                                                                    >
                                                                        <MoreVertical size={13} />
                                                                    </button>

                                                                    {activeMenuRowId === item.id && (
                                                                        <>
                                                                            <div 
                                                                                className="fixed inset-0 z-20"
                                                                                onClick={() => setActiveMenuRowId(null)}
                                                                            />
                                                                            <div 
                                                                                className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-left animate-in fade-in zoom-in-95 duration-100"
                                                                                onClick={e => e.stopPropagation()}
                                                                            >
                                                                                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                                                                    <span>Room #{item.roomNumber || item.id} Services</span>
                                                                                    <span className="text-[9px] text-blue-600 font-semibold">Addons</span>
                                                                                </div>
                                                                                
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'pickup' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <Car size={13} className="text-blue-600" />
                                                                                        <span>Airport Pickup (Arrival)</span>
                                                                                    </span>
                                                                                    {item.servicesBundle?.pickup?.enabled || item.pickup?.enabled ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'pickup' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <Plane size={13} className="text-sky-600" />
                                                                                        <span>Airport Drop (Departure)</span>
                                                                                    </span>
                                                                                    {item.servicesBundle?.pickup?.dropEnabled || item.pickup?.dropEnabled ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'extrabed' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                    >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <BedDouble size={13} className="text-indigo-600" />
                                                                                        <span>Extra Bed &amp; Baby Cot</span>
                                                                                    </span>
                                                                                    {item.servicesBundle?.extraBed?.enabled || item.extraBed?.enabled ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'mealplan' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <Utensils size={13} className="text-amber-600" />
                                                                                        <span>Meal Plans &amp; Dining</span>
                                                                                    </span>
                                                                                    {item.servicesBundle?.mealPlan?.enabled ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'celebration' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <Gift size={13} className="text-rose-600" />
                                                                                        <span>Honeymoon &amp; Decor</span>
                                                                                    </span>
                                                                                    {item.servicesBundle?.celebration?.enabled ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'timing' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <Clock size={13} className="text-sky-600" />
                                                                                        <span>Early / Late Check-Out</span>
                                                                                    </span>
                                                                                    {item.servicesBundle?.timingFlex?.earlyCheckIn || item.servicesBundle?.timingFlex?.lateCheckOut ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <div className="my-1 border-t border-slate-100" />

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'pickup' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 transition-colors"
                                                                                >
                                                                                    <Sparkles size={13} />
                                                                                    <span>Manage All Services...</span>
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveRoom(item.id)}
                                                                    disabled={roomsList.length <= 1}
                                                                    className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1 transition-colors"
                                                                    title="Delete Room Row"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleAddRoom}
                                className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md shadow-2xs cursor-pointer inline-flex items-center gap-1 transition-colors"
                            >
                                + Add Room
                            </button>

                            {/* Guest Quick Info */}
                            <div className="bg-slate-50/50 border border-slate-200/90 rounded-lg p-3 shadow-2xs space-y-2">
                                <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider m-0">
                                    Guest Profile
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-slate-600">Title</label>
                                        <select
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            className="w-full h-7.5 px-2 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500"
                                        >
                                            <option value="Mr.">Mr.</option>
                                            <option value="Mrs.">Mrs.</option>
                                            <option value="Ms.">Ms.</option>
                                            <option value="Dr.">Dr.</option>
                                            <option value="Prof.">Prof.</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-slate-600">
                                            Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Guest full name..."
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full h-7.5 px-2.5 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500 font-medium"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-slate-600">
                                            Mobile No. <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 01712-345678"
                                            value={mobile}
                                            onChange={e => setMobile(e.target.value)}
                                            className="w-full h-7.5 px-2.5 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-slate-600">Email</label>
                                        <input
                                            type="email"
                                            placeholder="guest@example.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full h-7.5 px-2.5 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="animate-in fade-in duration-100">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                                {/* Left: Discount & Payment Methods (7 cols) */}
                                <div className="lg:col-span-7 space-y-3.5">
                                    {/* Discount Section */}
                                    <div className="bg-slate-50/70 border border-slate-200/90 rounded-lg p-3 shadow-2xs">
                                        <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-2">Discount</h3>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={discountType}
                                                onChange={e => setDiscountType(e.target.value as any)}
                                                className="w-32 h-7.5 px-2 border border-slate-200 rounded-md text-[11px] bg-white outline-none cursor-pointer"
                                            >
                                                <option value="Fixed">Fixed (BDT)</option>
                                                <option value="Percentage">Percentage (%)</option>
                                            </select>
                                            <input
                                                type="number"
                                                min={0}
                                                value={discountValue || ''}
                                                onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                                className="flex-1 h-7.5 px-2.5 border border-slate-200 rounded-md text-[11px] bg-white outline-none font-bold"
                                            />
                                            {discountValue > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDiscountValue(0)}
                                                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                                    title="Clear Discount"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Method Section */}
                                    <div className="bg-slate-50/70 border border-slate-200/90 rounded-lg p-3 shadow-2xs">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Payment Method</h3>
                                            <button
                                                type="button"
                                                onClick={handleAddPaymentRow}
                                                className="text-[#1e3a8a] hover:text-blue-900 text-[11px] font-semibold cursor-pointer"
                                            >
                                                + Add Method
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {paymentRows.map(row => (
                                                <div
                                                    key={row.id}
                                                    className="flex items-center gap-2 bg-white p-2 border border-slate-200/80 rounded-md"
                                                >
                                                    <div className="w-1/2 flex flex-col gap-0.5">
                                                        <label className="text-[9.5px] font-semibold text-slate-500">Method</label>
                                                        <select
                                                            value={row.method}
                                                            onChange={e => handlePaymentRowChange(row.id, 'method', e.target.value as any)}
                                                            className="w-full h-7 px-2 border border-slate-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                        >
                                                            <option value="Cash">Cash</option>
                                                            <option value="Card">Card</option>
                                                            <option value="bKash">bKash</option>
                                                            <option value="Bank Transfer">Bank Transfer</option>
                                                        </select>
                                                    </div>

                                                    <div className="w-1/2 flex flex-col gap-0.5">
                                                        <label className="text-[9.5px] font-semibold text-slate-500">Amount (BDT)</label>
                                                        <input
                                                            type="number"
                                                            value={row.amount || ''}
                                                            onChange={e => handlePaymentRowChange(row.id, 'amount', parseFloat(e.target.value) || 0)}
                                                            placeholder="0.00"
                                                            className="w-full h-7 px-2 border border-slate-200 rounded text-[11px] bg-white outline-none font-bold"
                                                        />
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePaymentRow(row.id)}
                                                        disabled={paymentRows.length <= 1}
                                                        className="text-red-400 hover:text-red-600 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer self-end mb-0.5 p-1"
                                                        title="Delete Payment Row"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Summary Box (5 cols) */}
                                <div className="lg:col-span-5">
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3 shadow-2xs">
                                        <div className="space-y-1 text-[11px]">
                                            <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                                                <span>Room Base ({nights}N)</span>
                                                <span className="font-semibold text-slate-900">৳{roomBaseTotal.toLocaleString()}</span>
                                            </div>

                                            {totalPickupArrivalCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-blue-700">
                                                    <span className="flex items-center gap-1"><Car size={11} /> Airport Pickup (Inbound)</span>
                                                    <span className="font-bold font-mono">+৳{totalPickupArrivalCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalDropDepartureCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-sky-700">
                                                    <span className="flex items-center gap-1"><Plane size={11} /> Airport Drop (Outbound)</span>
                                                    <span className="font-bold font-mono">+৳{totalDropDepartureCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalExtraBedCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-indigo-700">
                                                    <span className="flex items-center gap-1"><BedDouble size={11} /> Extra Bed &amp; Cot</span>
                                                    <span className="font-bold font-mono">+৳{totalExtraBedCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalMealPlanCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-amber-700">
                                                    <span className="flex items-center gap-1"><Utensils size={11} /> Meal Plans</span>
                                                    <span className="font-bold font-mono">+৳{totalMealPlanCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalCelebrationCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-rose-700">
                                                    <span className="flex items-center gap-1"><Gift size={11} /> Decor &amp; Romance</span>
                                                    <span className="font-bold font-mono">+৳{totalCelebrationCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalSpaCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-teal-700">
                                                    <span className="flex items-center gap-1"><Sparkles size={11} /> Wellness &amp; Spa</span>
                                                    <span className="font-bold font-mono">+৳{totalSpaCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalTimingCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-sky-700">
                                                    <span className="flex items-center gap-1"><Clock size={11} /> Time Flex</span>
                                                    <span className="font-bold font-mono">+৳{totalTimingCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between py-1 border-t border-slate-200 text-slate-700 font-semibold">
                                                <span>Total Gross</span>
                                                <span className="font-bold text-slate-900">৳{totalAmount.toLocaleString()}</span>
                                            </div>

                                            <div className="flex justify-between py-1 text-slate-600">
                                                <span>Discount</span>
                                                <span className="font-semibold text-emerald-700">-৳{discountedAmount.toLocaleString()}</span>
                                            </div>

                                            <div className="flex justify-between py-1 text-slate-800 font-bold border-t border-dashed border-slate-200">
                                                <span>Net Payable</span>
                                                <span className="font-bold text-blue-900">৳{netTotal.toLocaleString()}</span>
                                            </div>

                                            <div className="flex justify-between py-1 text-slate-600">
                                                <span>Total Paid</span>
                                                <span className="font-bold text-emerald-700">৳{totalPaid.toLocaleString()}</span>
                                            </div>

                                            <div className="bg-white -mx-3 -mb-3 px-3 py-2.5 flex justify-between font-bold text-xs border-t border-slate-200 rounded-b-lg">
                                                <span className="text-slate-800">Remaining Balance:</span>
                                                <span className={totalDue > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                                                    ৳{totalDue.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modern Compact Footer */}
                <div className="border-t border-slate-200 px-4 py-2.5 bg-slate-50/70 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Building2 size={14} className="text-blue-700" />
                        <span>Room: <strong className="text-slate-900 font-mono">{roomsList[0]?.roomNumber || '101'}</strong> ({nights} Night{nights > 1 ? 's' : ''})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCompleteReservation('hold')}
                            className="bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                            Hold
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCompleteReservation('confirmed')}
                            className="bg-[#1e3a8a] hover:bg-blue-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                        >
                            Reserve
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCompleteReservation('arrived')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                        >
                            Check In
                        </button>
                    </div>
                </div>
            </div>

            {/* Room Add-On Services Modal (All Services Bundle) */}
            {serviceModalConfig.isOpen && activeRowForService && (
                <RoomAddonServicesModal
                    isOpen={serviceModalConfig.isOpen}
                    onClose={() => setServiceModalConfig(prev => ({ ...prev, isOpen: false, rowId: null }))}
                    roomNumber={activeRowForService.roomNumber}
                    roomType={activeRowForService.roomType}
                    baseRate={activeRowForService.rate}
                    nights={nightMultiplier}
                    initialTab={serviceModalConfig.initialTab}
                    currentServices={activeRowForService.servicesBundle}
                    currentExtraBed={activeRowForService.extraBed}
                    currentPickup={activeRowForService.pickup}
                    onSave={(bundle) => handleSaveRoomServices(activeRowForService.id, bundle)}
                />
            )}
        </div>
    );
};

export default QuickReservationModal;
