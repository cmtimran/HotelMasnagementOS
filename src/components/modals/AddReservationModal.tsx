import React, { useState, useMemo } from 'react';
import {
    X,
    ChevronDown,
    ChevronUp,
    Copy,
    Trash2,
    User as UserIcon,
    MapPin,
    Briefcase,
    Delete,
    MoreVertical,
    Car,
    Plane,
    BedDouble,
    Utensils,
    Gift,
    Clock,
    Sparkles
} from 'lucide-react';
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

export interface AddReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReservationCreated?: (res: any) => void;
    initialRoom?: string;
    initialStartDate?: string;
    initialEndDate?: string;
}

interface RoomRow {
    id: number;
    roomType: string;
    roomsCount: number;
    ratePlan: string;
    roomNumber: string;
    adults: number;
    children: number;
    rate: number;
    isAssign: boolean;
    servicesBundle?: RoomServicesBundle;
    extraBed?: ExtraBedConfig;
    pickup?: PickupConfig;
}

interface PaymentRow {
    id: number;
    method: 'Cash' | 'Card' | 'bKash' | 'Bank Transfer';
    amount: number;
}

export const AddReservationModal: React.FC<AddReservationModalProps> = ({
    isOpen,
    onClose,
    onReservationCreated,
    initialRoom = '101',
    initialStartDate = '2026-07-01',
    initialEndDate = '2026-07-02'
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // ==========================================
    // STEP 1 STATE
    // ==========================================
    const [checkIn, setCheckIn] = useState(initialStartDate);
    const [nights, setNights] = useState(1);
    const [checkOut, setCheckOut] = useState(initialEndDate);
    const [roomsCountInput] = useState(1);
    const [businessSource, setBusinessSource] = useState('Direct');
    const [businessAgent, setBusinessAgent] = useState('Direct');
    const [dayUse, setDayUse] = useState(false);
    const [ratePerNight, setRatePerNight] = useState('Rate Per Night');
    const [taxApplicable, setTaxApplicable] = useState(true);

    const [roomsList, setRoomsList] = useState<RoomRow[]>([
        {
            id: 1,
            roomType: 'Deluxe Double',
            roomsCount: 1,
            ratePlan: 'Summer Vacation',
            roomNumber: initialRoom || '101',
            adults: 2,
            children: 1,
            rate: 3000,
            isAssign: true
        }
    ]);

    // ==========================================
    // STEP 2 STATE
    // ==========================================
    const [openGuestProfile, setOpenGuestProfile] = useState(true);
    const [openAddress, setOpenAddress] = useState(false);
    const [openWork, setOpenWork] = useState(false);

    // Guest Profile
    const [salutation, setSalutation] = useState('Mr');
    const [guestName, setGuestName] = useState('');
    const [phone, setPhone] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [vipStatus, setVipStatus] = useState('');
    const [gender, setGender] = useState('Male');
    const [nationality, setNationality] = useState('Bangladeshi');
    const [guestType, setGuestType] = useState('Adult');
    const [dob, setDob] = useState('');
    const [birthCountry, setBirthCountry] = useState('Bangladesh');
    const [birthCity, setBirthCity] = useState('Dhaka');
    const [occupation, setOccupation] = useState('');
    const [purposeOfVisit, setPurposeOfVisit] = useState('Business');
    const [idType, setIdType] = useState('National ID (NID)');

    // Remarks & Preferences Tabs
    const [activePrefTab, setActivePrefTab] = useState<'Guest' | 'Check In' | 'Check Out' | 'House Keeping' | 'Payment Note'>('Guest');
    const [remarksMap, setRemarksMap] = useState<Record<string, string>>({
        Guest: '',
        'Check In': '',
        'Check Out': '',
        'House Keeping': '',
        'Payment Note': ''
    });

    // Home Address
    const [streetAddress, setStreetAddress] = useState('');
    const [homeCity, setHomeCity] = useState('');
    const [homeState, setHomeState] = useState('');
    const [homeCountry, setHomeCountry] = useState('Bangladesh');
    const [postalCode, setPostalCode] = useState('');

    // Work Details
    const [companyName, setCompanyName] = useState('');
    const [designation, setDesignation] = useState('');
    const [officePhone, setOfficePhone] = useState('');
    const [corporateEmail, setCorporateEmail] = useState('');
    const [taxVatId, setTaxVatId] = useState('');

    // ==========================================
    // STEP 3 STATE
    // ==========================================
    const [discountType, setDiscountType] = useState<'Percentage' | 'Fixed'>('Fixed');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([
        { id: 1, method: 'Cash', amount: 3000 }
    ]);
    const [keypadTargetIndex, setKeypadTargetIndex] = useState<number>(0);

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

    const activeRowForService = useMemo(() => {
        return roomsList.find(r => r.id === serviceModalConfig.rowId);
    }, [roomsList, serviceModalConfig.rowId]);

    if (!isOpen) return null;

    // Calculations
    const roomBaseTotal = roomsList.reduce((acc, r) => acc + (r.rate * r.roomsCount * nights), 0);
    const totalExtraBedCharge = roomsList.reduce((acc, r) => acc + getExtraBedTotal(r.servicesBundle?.extraBed || r.extraBed, nights), 0);
    const totalPickupArrivalCharge = roomsList.reduce((acc, r) => {
        const p = r.servicesBundle?.pickup || r.pickup;
        return acc + (p?.enabled && !p.isComplimentary ? (Number(p.chargeAmount) || 0) : 0);
    }, 0);
    const totalDropDepartureCharge = roomsList.reduce((acc, r) => {
        const p = r.servicesBundle?.pickup || r.pickup;
        return acc + (p?.dropEnabled && !p.dropIsComplimentary ? (Number(p.dropChargeAmount) || 0) : 0);
    }, 0);
    const totalPickupCharge = totalPickupArrivalCharge + totalDropDepartureCharge;
    const totalMealPlanCharge = roomsList.reduce((acc, r) => acc + getMealPlanTotal(r.servicesBundle?.mealPlan, nights), 0);
    const totalCelebrationCharge = roomsList.reduce((acc, r) => acc + getCelebrationTotal(r.servicesBundle?.celebration), 0);
    const totalSpaCharge = roomsList.reduce((acc, r) => acc + getSpaWellnessTotal(r.servicesBundle?.spaWellness), 0);
    const totalTimingCharge = roomsList.reduce((acc, r) => acc + getTimingFlexTotal(r.servicesBundle?.timingFlex), 0);
    const totalCustomCharge = roomsList.reduce((acc, r) => acc + getCustomAddonsTotal(r.servicesBundle?.customAddons, nights), 0);

    const totalAllAddonsCharges = totalExtraBedCharge + totalPickupCharge + totalMealPlanCharge + totalCelebrationCharge + totalSpaCharge + totalTimingCharge + totalCustomCharge;
    const grossTotal = roomBaseTotal + totalAllAddonsCharges;

    const discountedAmount = discountType === 'Percentage'
        ? (grossTotal * discountValue) / 100
        : discountValue;
    const netTotal = Math.max(0, grossTotal - discountedAmount);
    const totalPaid = paymentRows.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalDue = Math.max(0, netTotal - totalPaid);

    // Handlers
    const handleAddRoomRow = () => {
        const nextId = roomsList.length > 0 ? Math.max(...roomsList.map(r => r.id)) + 1 : 1;
        setRoomsList([
            ...roomsList,
            {
                id: nextId,
                roomType: 'Deluxe Double',
                roomsCount: 1,
                ratePlan: 'BAR Rack Rate',
                roomNumber: '102',
                adults: 1,
                children: 0,
                rate: 3000,
                isAssign: true
            }
        ]);
    };

    const handleCopyRoomRow = (row: RoomRow) => {
        const nextId = Math.max(...roomsList.map(r => r.id)) + 1;
        setRoomsList([...roomsList, { ...row, id: nextId }]);
    };

    const handleRemoveRoomRow = (id: number) => {
        if (roomsList.length === 1) return;
        setRoomsList(roomsList.filter(r => r.id !== id));
    };

    const updateRoomRow = (id: number, field: keyof RoomRow, value: any) => {
        setRoomsList(roomsList.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    // Payment Handlers
    const handleAddPaymentRow = () => {
        const nextId = paymentRows.length > 0 ? Math.max(...paymentRows.map(p => p.id)) + 1 : 1;
        setPaymentRows([...paymentRows, { id: nextId, method: 'Cash', amount: totalDue }]);
    };

    const handleRemovePaymentRow = (id: number) => {
        if (paymentRows.length === 1) return;
        setPaymentRows(paymentRows.filter(p => p.id !== id));
    };

    const updatePaymentRow = (id: number, field: keyof PaymentRow, value: any) => {
        setPaymentRows(paymentRows.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    // Keypad Handler
    const handleKeypadPress = (val: string) => {
        const currentTarget = paymentRows[keypadTargetIndex] || paymentRows[0];
        if (!currentTarget) return;

        let currentStr = String(currentTarget.amount || '');
        if (val === 'CLEAR') {
            updatePaymentRow(currentTarget.id, 'amount', 0);
        } else if (val === 'BACK') {
            const trimmed = currentStr.slice(0, -1);
            updatePaymentRow(currentTarget.id, 'amount', Number(trimmed) || 0);
        } else if (val === 'FULL') {
            updatePaymentRow(currentTarget.id, 'amount', netTotal);
        } else {
            if (currentStr === '0') currentStr = '';
            const newStr = currentStr + val;
            updatePaymentRow(currentTarget.id, 'amount', Number(newStr));
        }
    };

    // Save Reservation to LocalStorage
    const handleFinalizeBooking = (actionType: 'reserve' | 'checkin' | 'hold') => {
        const reservationNumber = `RES-${String(Math.floor(100000 + Math.random() * 900000))}`;
        const mainRoom = roomsList[0] || { roomNumber: '101', roomType: 'Deluxe Double' };

        const newReservation = {
            id: Date.now(),
            reservationNumber,
            guestName: `${salutation} ${guestName || 'Valued Guest'}`,
            phone: mobile || phone || '+880 1711-000000',
            email: email || 'guest@hospitality.com',
            roomNumber: mainRoom.roomNumber,
            roomType: mainRoom.roomType,
            checkIn,
            checkOut,
            nights,
            adults: mainRoom.adults,
            children: mainRoom.children,
            status: actionType === 'checkin' ? 'in-house' : actionType === 'hold' ? 'hold' : 'arriving',
            totalAmount: netTotal,
            paidAmount: actionType === 'hold' ? 0 : totalPaid,
            dueAmount: actionType === 'hold' ? netTotal : totalDue,
            source: businessSource,
            agent: businessAgent,
            vip: vipStatus || 'None',
            purpose: purposeOfVisit,
            specialRequests: remarksMap['Guest'] || '',
            servicesBundle: mainRoom.servicesBundle || { extraBed: mainRoom.extraBed, pickup: mainRoom.pickup },
            extraBed: mainRoom.servicesBundle?.extraBed || mainRoom.extraBed || null,
            pickup: mainRoom.servicesBundle?.pickup || mainRoom.pickup || null,
            mealPlan: mainRoom.servicesBundle?.mealPlan || null,
            celebration: mainRoom.servicesBundle?.celebration || null,
            spaWellness: mainRoom.servicesBundle?.spaWellness || null,
            timingFlex: mainRoom.servicesBundle?.timingFlex || null,
            customAddons: mainRoom.servicesBundle?.customAddons || [],
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
            list.unshift(newReservation);
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(list));

            // If hold, also push to holds list
            if (actionType === 'hold') {
                const holdsExisting = localStorage.getItem('hotel_holds_v2');
                const holdsList = holdsExisting ? JSON.parse(holdsExisting) : [];
                holdsList.unshift({
                    id: Date.now(),
                    reservationNumber,
                    guestName: newReservation.guestName,
                    status: 'Hold',
                    holdStartDate: checkIn,
                    holdEndDate: checkOut,
                    reason: remarksMap['Guest'] || 'Tentative booking on hold',
                    reservationDate: new Date().toISOString().split('T')[0],
                    checkInDate: checkIn,
                    checkOutDate: checkOut,
                    roomType: mainRoom.roomType,
                    estimatedAmount: netTotal
                });
                localStorage.setItem('hotel_holds_v2', JSON.stringify(holdsList));
            }
        } catch (e) {
            console.error('Failed to save reservation', e);
        }

        if (onReservationCreated) {
            onReservationCreated(newReservation);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
            <div className="bg-white w-[95%] max-w-[1300px] h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* 1. Header (Exact hotel-management background #1e3a8a) */}
                <div className="bg-[#1e3a8a] text-white px-6 py-4 flex items-center justify-between flex-shrink-0 select-none">
                    <h2 className="text-base sm:text-lg font-semibold tracking-tight">Add New Reservation</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 2. Scrollable Modal Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#fafafa] flex flex-col gap-6 text-xs text-gray-800">
                    {/* Stepper (Exact 3-step design with connecting lines) */}
                    <div className="flex items-center max-w-[800px] select-none">
                        <div
                            onClick={() => setStep(1)}
                            className={`flex items-center gap-2.5 cursor-pointer ${step >= 1 ? 'opacity-100 font-semibold' : 'opacity-60'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 1 ? 'bg-[#1e3a8a] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                1
                            </div>
                            <span className={`text-sm ${step === 1 ? 'text-[#0f172a] font-bold' : 'text-gray-600 font-medium'}`}>
                                Check Availability
                            </span>
                        </div>

                        <div className={`flex-1 h-0.5 mx-4 ${step >= 2 ? 'bg-[#1e3a8a]' : 'bg-gray-200'}`}></div>

                        <div
                            onClick={() => setStep(2)}
                            className={`flex items-center gap-2.5 cursor-pointer ${step >= 2 ? 'opacity-100 font-semibold' : 'opacity-60'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 2 ? 'bg-[#1e3a8a] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                2
                            </div>
                            <span className={`text-sm ${step === 2 ? 'text-[#0f172a] font-bold' : 'text-gray-600 font-medium'}`}>
                                Guest Information
                            </span>
                        </div>

                        <div className={`flex-1 h-0.5 mx-4 ${step >= 3 ? 'bg-[#1e3a8a]' : 'bg-gray-200'}`}></div>

                        <div
                            onClick={() => setStep(3)}
                            className={`flex items-center gap-2.5 cursor-pointer ${step >= 3 ? 'opacity-100 font-semibold' : 'opacity-60'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 3 ? 'bg-[#1e3a8a] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                3
                            </div>
                            <span className={`text-sm ${step === 3 ? 'text-[#0f172a] font-bold' : 'text-gray-600 font-medium'}`}>
                                Payments
                            </span>
                        </div>
                    </div>

                    {/* ========================================================
                        STEP 1: CHECK AVAILABILITY & ROOMS TABLE
                        ======================================================== */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in duration-150">
                            {/* Top 6-Field Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">
                                        Check in <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            type="date"
                                            value={checkIn}
                                            onChange={e => setCheckIn(e.target.value)}
                                            className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">Nights</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={nights}
                                        onChange={e => setNights(Math.max(1, Number(e.target.value)))}
                                        className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 outline-none text-center font-bold"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">
                                        Check out <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            type="date"
                                            value={checkOut}
                                            onChange={e => setCheckOut(e.target.value)}
                                            className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">Room(s)</label>
                                    <input
                                        type="text"
                                        value={roomsCountInput}
                                        disabled
                                        className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-gray-100 text-gray-500 cursor-not-allowed text-center font-bold"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">Business Source</label>
                                    <select
                                        value={businessSource}
                                        onChange={e => setBusinessSource(e.target.value)}
                                        className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 outline-none focus:border-blue-500"
                                    >
                                        <option value="Direct">Direct</option>
                                        <option value="Booking.com">Booking.com</option>
                                        <option value="Agoda">Agoda</option>
                                        <option value="Corporate">Corporate</option>
                                        <option value="Walk-In">Walk-In</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">Business Agent</label>
                                    <select
                                        value={businessAgent}
                                        onChange={e => setBusinessAgent(e.target.value)}
                                        className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 outline-none focus:border-blue-500"
                                    >
                                        <option value="Direct">Direct</option>
                                        <option value="Front Desk">Front Desk</option>
                                        <option value="Expedia Partner">Expedia Partner</option>
                                        <option value="Corporate Manager">Corporate Manager</option>
                                    </select>
                                </div>
                            </div>

                            {/* Options Row */}
                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={dayUse}
                                        onChange={e => setDayUse(e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600"
                                    />
                                    <span>Day Use</span>
                                </label>

                                <div className="flex items-center gap-3">
                                    <select
                                        value={ratePerNight}
                                        onChange={e => setRatePerNight(e.target.value)}
                                        className="h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                    >
                                        <option value="Rate Per Night">Rate Per Night</option>
                                        <option value="Package Rate">Package Rate</option>
                                    </select>

                                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={taxApplicable}
                                            onChange={e => setTaxApplicable(e.target.checked)}
                                            className="w-4 h-4 rounded text-blue-600"
                                        />
                                        <span>Tax Applicable</span>
                                    </label>
                                </div>
                            </div>

                            {/* Exact Rooms Table */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[850px]">
                                        <thead>
                                            <tr className="bg-[#f8fafc] border-b border-gray-200 text-[11px] font-semibold text-gray-600">
                                                <th className="p-3">Room Type</th>
                                                <th className="p-3">No. of Rooms</th>
                                                <th className="p-3">Rate Type/Plan</th>
                                                <th className="p-3">Room #</th>
                                                <th className="p-3">Adult</th>
                                                <th className="p-3">Child</th>
                                                <th className="p-3">Rate</th>
                                                <th className="p-3">Total</th>
                                                <th className="p-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {roomsList.map((row) => (
                                                <tr key={row.id} className="hover:bg-blue-50/20">
                                                        <td className="p-3">
                                                            <select
                                                                value={row.roomType}
                                                                onChange={e => updateRoomRow(row.id, 'roomType', e.target.value)}
                                                                className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none font-medium"
                                                            >
                                                                <option value="Deluxe Double">Deluxe Double</option>
                                                                <option value="Executive Suite">Executive Suite</option>
                                                                <option value="Superior King">Superior King</option>
                                                                <option value="Family Interconnecting">Family Interconnecting</option>
                                                                <option value="Winter Rate Plan">Winter Rate Plan</option>
                                                            </select>
                                                            {/* Active Room Add-on Badges */}
                                                            {(() => {
                                                                const b = row.servicesBundle || { extraBed: row.extraBed, pickup: row.pickup };
                                                                const hasServices = b.pickup?.enabled || b.extraBed?.enabled || b.mealPlan?.enabled || b.celebration?.enabled || b.spaWellness?.enabled || b.timingFlex?.earlyCheckIn || b.timingFlex?.lateCheckOut || (b.customAddons && b.customAddons.length > 0);
                                                                if (!hasServices) return null;

                                                                return (
                                                                    <div className="flex flex-wrap items-center gap-1 mt-1 max-w-[210px]">
                                                                        {b.pickup?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'pickup' })}
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
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'extrabed' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer shadow-2xs"
                                                                                title="Extra Bed Configured"
                                                                            >
                                                                                <BedDouble size={10} />
                                                                                <span>{b.extraBed.quantity}x Bed</span>
                                                                                <span className="font-bold">{b.extraBed.isComplimentary ? 'Free' : `৳${getExtraBedTotal(b.extraBed, nights)}`}</span>
                                                                            </button>
                                                                        )}
                                                                        {b.mealPlan?.enabled && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'mealplan' })}
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
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'celebration' })}
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
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'spa' })}
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
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'timing' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 cursor-pointer shadow-2xs"
                                                                                title="Early/Late Check-in/out Flex"
                                                                            >
                                                                                <Clock size={10} />
                                                                                <span>Flex</span>
                                                                            </button>
                                                                        )}
                                                                        {b.customAddons && b.customAddons.length > 0 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'custom' })}
                                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer shadow-2xs"
                                                                                title="Custom Addons"
                                                                            >
                                                                                <span>+{b.customAddons.length} Custom</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={row.roomsCount}
                                                                onChange={e => updateRoomRow(row.id, 'roomsCount', Number(e.target.value))}
                                                                className="w-16 h-8 px-2 border border-gray-300 rounded text-xs text-center font-bold"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <select
                                                                value={row.ratePlan}
                                                                onChange={e => updateRoomRow(row.id, 'ratePlan', e.target.value)}
                                                                className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                            >
                                                                <option value="Summer Vacation">Summer Vacation</option>
                                                                <option value="Standard BAR">Standard BAR</option>
                                                                <option value="Corporate Special">Corporate Special</option>
                                                                <option value="Complimentary">Complimentary</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-3">
                                                            <select
                                                                value={row.roomNumber}
                                                                onChange={e => updateRoomRow(row.id, 'roomNumber', e.target.value)}
                                                                className="w-24 h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none font-bold text-blue-700"
                                                            >
                                                                <option value="101">101</option>
                                                                <option value="102">102</option>
                                                                <option value="103">103</option>
                                                                <option value="104">104</option>
                                                                <option value="201">201</option>
                                                                <option value="202">202</option>
                                                                <option value="203">203</option>
                                                                <option value="506 (A)">506 (A)</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={row.adults}
                                                                onChange={e => updateRoomRow(row.id, 'adults', Number(e.target.value))}
                                                                className="w-14 h-8 px-2 border border-gray-300 rounded text-xs text-center"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={row.children}
                                                                onChange={e => updateRoomRow(row.id, 'children', Number(e.target.value))}
                                                                className="w-14 h-8 px-2 border border-gray-300 rounded text-xs text-center"
                                                            />
                                                        </td>
                                                        <td className="p-3">
                                                            <input
                                                                type="number"
                                                                value={row.rate}
                                                                onChange={e => updateRoomRow(row.id, 'rate', Number(e.target.value))}
                                                                className="w-20 h-8 px-2 border border-gray-300 rounded text-xs font-bold text-gray-800"
                                                            />
                                                        </td>
                                                        {(() => {
                                                            const bundle = row.servicesBundle || { extraBed: row.extraBed, pickup: row.pickup };
                                                            const rowAddons = getRoomBundleTotal(bundle, nights);
                                                            const rowBase = row.rate * row.roomsCount * nights;
                                                            const computedTotal = rowBase + rowAddons;
                                                            return (
                                                                <td className="p-3 font-bold text-gray-900 font-mono">
                                                                    <div>৳ {computedTotal.toFixed(2)}</div>
                                                                    {rowAddons > 0 && (
                                                                        <div className="text-[10px] text-slate-400 font-normal">
                                                                            Base: {rowBase.toFixed(0)} + Svc: {rowAddons.toFixed(0)}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        })()}
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2">
                                                                <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={row.isAssign}
                                                                        onChange={e => updateRoomRow(row.id, 'isAssign', e.target.checked)}
                                                                        className="w-3.5 h-3.5 rounded text-blue-600"
                                                                    />
                                                                    <span>Is Assign</span>
                                                                </label>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyRoomRow(row)}
                                                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded cursor-pointer"
                                                                    title="Duplicate Room Row"
                                                                >
                                                                    <Copy size={14} />
                                                                </button>

                                                                {/* 3-dots Menu Button right after Copy */}
                                                                <div className="relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveMenuRowId(activeMenuRowId === row.id ? null : row.id)}
                                                                        title="Room Add-On Services (Transfer, Bed, Dining, Spa, Romance, Flex)"
                                                                        className={`p-1 rounded cursor-pointer transition-all ${
                                                                            (row.servicesBundle || row.extraBed?.enabled || row.pickup?.enabled)
                                                                                ? 'text-blue-700 bg-blue-100/70 hover:bg-blue-200/70 ring-1 ring-blue-300'
                                                                                : 'text-gray-400 hover:text-blue-600 hover:bg-gray-100'
                                                                        }`}
                                                                    >
                                                                        <MoreVertical size={14} />
                                                                    </button>

                                                                    {activeMenuRowId === row.id && (
                                                                        <>
                                                                            <div 
                                                                                className="fixed inset-0 z-20"
                                                                                onClick={() => setActiveMenuRowId(null)}
                                                                            />
                                                                            <div 
                                                                                className="absolute right-0 top-full mt-1 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-left animate-in fade-in zoom-in-95 duration-100"
                                                                                onClick={e => e.stopPropagation()}
                                                                            >
                                                                                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                                                                    <span>Room #{row.roomNumber || row.id} Services</span>
                                                                                    <span className="text-[9px] text-blue-600 font-semibold">Expert Addons</span>
                                                                                </div>
                                                                                
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'pickup' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <Car size={13} className="text-blue-600" />
                                                                                        <span>Airport Pickup (Arrival)</span>
                                                                                    </span>
                                                                                    {row.servicesBundle?.pickup?.enabled || row.pickup?.enabled ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'pickup' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <Plane size={13} className="text-sky-600" />
                                                                                        <span>Airport Drop (Departure)</span>
                                                                                    </span>
                                                                                    {row.servicesBundle?.pickup?.dropEnabled || row.pickup?.dropEnabled ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'extrabed' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <BedDouble size={13} className="text-indigo-600" />
                                                                                        <span>Extra Bed &amp; Baby Cot</span>
                                                                                    </span>
                                                                                    {row.servicesBundle?.extraBed?.enabled || row.extraBed?.enabled ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'mealplan' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <Utensils size={13} className="text-amber-600" />
                                                                                        <span>Meal Plans &amp; Dining</span>
                                                                                    </span>
                                                                                    {row.servicesBundle?.mealPlan?.enabled ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'celebration' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <Gift size={13} className="text-rose-600" />
                                                                                        <span>Honeymoon &amp; Decor</span>
                                                                                    </span>
                                                                                    {row.servicesBundle?.celebration?.enabled ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'spa' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <Sparkles size={13} className="text-teal-600" />
                                                                                        <span>Spa &amp; Wellness Pass</span>
                                                                                    </span>
                                                                                    {row.servicesBundle?.spaWellness?.enabled ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'timing' });
                                                                                        setActiveMenuRowId(null);
                                                                                    }}
                                                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                                                >
                                                                                    <span className="flex items-center gap-2">
                                                                                        <Clock size={13} className="text-sky-600" />
                                                                                        <span>Early / Late Check-Out</span>
                                                                                    </span>
                                                                                    {row.servicesBundle?.timingFlex?.earlyCheckIn || row.servicesBundle?.timingFlex?.lateCheckOut ? (
                                                                                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                                                    ) : (
                                                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                                                    )}
                                                                                </button>

                                                                                <div className="my-1 border-t border-slate-100" />

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'pickup' });
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

                                                                {roomsList.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveRoomRow(row.id)}
                                                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded cursor-pointer"
                                                                        title="Remove Room Row"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-3 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={handleAddRoomRow}
                                        className="h-8 px-3.5 border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                                    >
                                        + Add Room
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 2: GUEST INFORMATION & ACCORDIONS
                        ======================================================== */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            {/* Accordion 1: Guest Profile */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                                <div
                                    onClick={() => setOpenGuestProfile(!openGuestProfile)}
                                    className="p-4 flex items-center justify-between cursor-pointer border-b border-gray-100 select-none hover:bg-gray-50/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#eff6ff] text-[#3b82f6] flex items-center justify-center">
                                            <UserIcon size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900">Guest Profile</h3>
                                            <p className="text-[11px] text-gray-500">Identity, contact and travel information</p>
                                        </div>
                                    </div>
                                    <div className="text-gray-400">
                                        {openGuestProfile ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>

                                {openGuestProfile && (
                                    <div className="p-5 bg-[#f8fafc] space-y-4">
                                        {/* Row 1: Name, Phone, Mobile, Email */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">
                                                    FULL NAME <span className="text-red-500">*</span>
                                                </label>
                                                <div className="flex gap-1.5">
                                                    <select
                                                        value={salutation}
                                                        onChange={e => setSalutation(e.target.value)}
                                                        className="w-16 h-8 px-1.5 border border-gray-300 rounded text-xs bg-white outline-none font-medium"
                                                    >
                                                        <option value="Mr">Mr</option>
                                                        <option value="Mrs">Mrs</option>
                                                        <option value="Ms">Ms</option>
                                                        <option value="Dr">Dr</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder="Type guest name..."
                                                        value={guestName}
                                                        onChange={e => setGuestName(e.target.value)}
                                                        className="flex-1 h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">PHONE</label>
                                                <input
                                                    type="text"
                                                    value={phone}
                                                    onChange={e => setPhone(e.target.value)}
                                                    placeholder="Phone number..."
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">
                                                    MOBILE <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={mobile}
                                                    onChange={e => setMobile(e.target.value)}
                                                    placeholder="Mobile number..."
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none font-bold text-gray-800"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">EMAIL</label>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    placeholder="guest@domain.com"
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 2: VIP, Gender, Nationality, Guest Type, DOB */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">VIP STATUS</label>
                                                <select
                                                    value={vipStatus}
                                                    onChange={e => setVipStatus(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                >
                                                    <option value="">Standard</option>
                                                    <option value="VIP-1">VIP-1 (Corporate)</option>
                                                    <option value="VIP-2">VIP-2 (Executive)</option>
                                                    <option value="VIP-GM">VIP-GM</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">GENDER</label>
                                                <select
                                                    value={gender}
                                                    onChange={e => setGender(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                >
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">NATIONALITY</label>
                                                <input
                                                    type="text"
                                                    value={nationality}
                                                    onChange={e => setNationality(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">GUEST TYPE</label>
                                                <select
                                                    value={guestType}
                                                    onChange={e => setGuestType(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                >
                                                    <option value="Adult">Adult</option>
                                                    <option value="Child">Child</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">DATE OF BIRTH</label>
                                                <input
                                                    type="date"
                                                    value={dob}
                                                    onChange={e => setDob(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 3: Country, City, Occupation, Purpose, ID */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">BIRTH COUNTRY</label>
                                                <input
                                                    type="text"
                                                    value={birthCountry}
                                                    onChange={e => setBirthCountry(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">BIRTH CITY</label>
                                                <input
                                                    type="text"
                                                    value={birthCity}
                                                    onChange={e => setBirthCity(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">OCCUPATION</label>
                                                <input
                                                    type="text"
                                                    value={occupation}
                                                    onChange={e => setOccupation(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">PURPOSE OF VISIT</label>
                                                <select
                                                    value={purposeOfVisit}
                                                    onChange={e => setPurposeOfVisit(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                >
                                                    <option value="Business">Business</option>
                                                    <option value="Leisure">Leisure</option>
                                                    <option value="Transit">Transit</option>
                                                    <option value="Medical">Medical</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">ID TYPE</label>
                                                <select
                                                    value={idType}
                                                    onChange={e => setIdType(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                >
                                                    <option value="National ID (NID)">National ID (NID)</option>
                                                    <option value="Passport">Passport</option>
                                                    <option value="Driving License">Driving License</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Remarks & Preferences Box */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            REMARKS & PREFERENCES
                                        </h4>
                                        <p className="text-[11px] text-gray-400">Keep guest-facing and internal notes organized.</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-blue-600 font-bold text-[10px] tracking-wider">
                                        OPTIONAL
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 border-b border-gray-200">
                                    {(['Guest', 'Check In', 'Check Out', 'House Keeping', 'Payment Note'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActivePrefTab(tab)}
                                            className={`pb-2 text-xs font-medium cursor-pointer relative ${
                                                activePrefTab === tab
                                                    ? 'text-blue-600 font-bold border-b-2 border-blue-600 -mb-[1px]'
                                                    : 'text-gray-500 hover:text-gray-800'
                                            }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    value={remarksMap[activePrefTab] || ''}
                                    onChange={e => setRemarksMap({ ...remarksMap, [activePrefTab]: e.target.value })}
                                    placeholder={`Enter remarks for ${activePrefTab}...`}
                                    className="w-full min-h-[90px] p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 resize-y"
                                />
                            </div>

                            {/* Accordion 2: Home Address */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                                <div
                                    onClick={() => setOpenAddress(!openAddress)}
                                    className="p-4 flex items-center justify-between cursor-pointer border-b border-gray-100 select-none hover:bg-gray-50/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#ecfeff] text-[#06b6d4] flex items-center justify-center">
                                            <MapPin size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900">Home Address</h3>
                                            <p className="text-[11px] text-gray-500">Primary residence and location details</p>
                                        </div>
                                    </div>
                                    <div className="text-gray-400">
                                        {openAddress ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>

                                {openAddress && (
                                    <div className="p-5 bg-[#f8fafc] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                        <div className="flex flex-col gap-1 sm:col-span-2">
                                            <label className="text-[11px] font-semibold text-gray-700">Street Address</label>
                                            <input
                                                type="text"
                                                value={streetAddress}
                                                onChange={e => setStreetAddress(e.target.value)}
                                                className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-semibold text-gray-700">City</label>
                                            <input
                                                type="text"
                                                value={homeCity}
                                                onChange={e => setHomeCity(e.target.value)}
                                                className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-semibold text-gray-700">State / Division</label>
                                            <input
                                                type="text"
                                                value={homeState}
                                                onChange={e => setHomeState(e.target.value)}
                                                className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-semibold text-gray-700">Country</label>
                                            <input
                                                type="text"
                                                value={homeCountry}
                                                onChange={e => setHomeCountry(e.target.value)}
                                                className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-semibold text-gray-700">Postal Code</label>
                                            <input
                                                type="text"
                                                value={postalCode}
                                                onChange={e => setPostalCode(e.target.value)}
                                                className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Accordion 3: Work Details */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                                <div
                                    onClick={() => setOpenWork(!openWork)}
                                    className="p-4 flex items-center justify-between cursor-pointer border-b border-gray-100 select-none hover:bg-gray-50/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#f3e8ff] text-[#a855f7] flex items-center justify-center">
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900">Work Details</h3>
                                            <p className="text-[11px] text-gray-500">Organization and business contact information</p>
                                        </div>
                                    </div>
                                    <div className="text-gray-400">
                                        {openWork ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>

                                <div className="p-5 bg-[#f8fafc] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-gray-700">Company Name</label>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={e => setCompanyName(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-gray-700">Designation</label>
                                        <input
                                            type="text"
                                            value={designation}
                                            onChange={e => setDesignation(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-gray-700">Office Phone</label>
                                        <input
                                            type="text"
                                            value={officePhone}
                                            onChange={e => setOfficePhone(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-gray-700">Corporate Email</label>
                                        <input
                                            type="email"
                                            value={corporateEmail}
                                            onChange={e => setCorporateEmail(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-gray-700">Tax / VAT ID</label>
                                        <input
                                            type="text"
                                            value={taxVatId}
                                            onChange={e => setTaxVatId(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 3: PAYMENTS (2-COLUMN WITH KEYPAD)
                        ======================================================== */}
                    {step === 3 && (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-150">
                            {/* Left Column (3 cols) */}
                            <div className="lg:col-span-3 space-y-6">
                                {/* Discount Section */}
                                <div className="space-y-2">
                                    <h3 className="text-base font-bold text-gray-900">Discount</h3>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={discountType}
                                            onChange={e => setDiscountType(e.target.value as any)}
                                            className="w-36 h-9 px-2.5 border border-gray-300 rounded-md text-xs bg-white outline-none font-medium"
                                        >
                                            <option value="Percentage">Percentage (%)</option>
                                            <option value="Fixed">Fixed (BDT ৳)</option>
                                        </select>

                                        <input
                                            type="number"
                                            min={0}
                                            value={discountValue}
                                            onChange={e => setDiscountValue(Number(e.target.value))}
                                            className="w-44 h-9 px-3 border border-gray-300 rounded-md text-xs font-bold bg-white text-gray-800 outline-none"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setDiscountValue(0)}
                                            className="p-2 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                                            title="Clear Discount"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-gray-500">Remarks: Added discount</p>
                                </div>

                                {/* Payment Method Section */}
                                <div className="space-y-3">
                                    <h3 className="text-base font-bold text-gray-900">Payment Method</h3>

                                    <div className="space-y-2.5">
                                        {paymentRows.map((p, idx) => (
                                            <div
                                                key={p.id}
                                                onClick={() => setKeypadTargetIndex(idx)}
                                                className={`p-3 bg-white border rounded-lg flex items-center gap-3 transition-colors ${
                                                    keypadTargetIndex === idx ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-gray-200'
                                                }`}
                                            >
                                                <div className="flex-1 flex flex-col gap-1">
                                                    <label className="text-[10.5px] font-semibold text-gray-600">Method</label>
                                                    <select
                                                        value={p.method}
                                                        onChange={e => updatePaymentRow(p.id, 'method', e.target.value)}
                                                        className="h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none font-medium"
                                                    >
                                                        <option value="Cash">Cash at Desk</option>
                                                        <option value="Card">Credit / Debit Card</option>
                                                        <option value="bKash">bKash Merchant Pay</option>
                                                        <option value="Bank Transfer">Bank Transfer</option>
                                                    </select>
                                                </div>

                                                <div className="flex-1 flex flex-col gap-1">
                                                    <label className="text-[10.5px] font-semibold text-gray-600">Amount (৳)</label>
                                                    <input
                                                        type="number"
                                                        value={p.amount}
                                                        onChange={e => updatePaymentRow(p.id, 'amount', Number(e.target.value))}
                                                        className="h-8 px-2.5 border border-gray-300 rounded text-xs font-bold text-emerald-700"
                                                    />
                                                </div>

                                                {paymentRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePaymentRow(p.id)}
                                                        className="self-end mb-1 p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                                                        title="Delete Row"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-1">
                                        <button
                                            type="button"
                                            onClick={handleAddPaymentRow}
                                            className="h-8 px-3.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-xs font-semibold cursor-pointer shadow-2xs"
                                        >
                                            Add New Payment Method
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column (2 cols): Summary Box & Numeric Keypad */}
                            <div className="lg:col-span-2">
                                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                                        <span>Room Base Tariff</span>
                                        <span className="font-bold text-gray-900 font-mono">৳ {roomBaseTotal.toFixed(2)}</span>
                                    </div>

                                    {totalPickupArrivalCharge > 0 && (
                                        <div className="flex justify-between py-1 text-blue-700">
                                            <span className="flex items-center gap-1"><Car size={11} /> Airport Pickup (Inbound)</span>
                                            <span className="font-bold font-mono">+৳ {totalPickupArrivalCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalDropDepartureCharge > 0 && (
                                        <div className="flex justify-between py-1 text-sky-700">
                                            <span className="flex items-center gap-1"><Plane size={11} /> Airport Drop (Outbound)</span>
                                            <span className="font-bold font-mono">+৳ {totalDropDepartureCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalExtraBedCharge > 0 && (
                                        <div className="flex justify-between py-1 text-indigo-700">
                                            <span className="flex items-center gap-1"><BedDouble size={11} /> Extra Bed &amp; Cot</span>
                                            <span className="font-bold font-mono">+৳ {totalExtraBedCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalMealPlanCharge > 0 && (
                                        <div className="flex justify-between py-1 text-amber-700">
                                            <span className="flex items-center gap-1"><Utensils size={11} /> Meal Plans</span>
                                            <span className="font-bold font-mono">+৳ {totalMealPlanCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalCelebrationCharge > 0 && (
                                        <div className="flex justify-between py-1 text-rose-700">
                                            <span className="flex items-center gap-1"><Gift size={11} /> Decor &amp; Romance</span>
                                            <span className="font-bold font-mono">+৳ {totalCelebrationCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalSpaCharge > 0 && (
                                        <div className="flex justify-between py-1 text-teal-700">
                                            <span className="flex items-center gap-1"><Sparkles size={11} /> Spa Treatment</span>
                                            <span className="font-bold font-mono">+৳ {totalSpaCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalTimingCharge > 0 && (
                                        <div className="flex justify-between py-1 text-sky-700">
                                            <span className="flex items-center gap-1"><Clock size={11} /> Time Flex</span>
                                            <span className="font-bold font-mono">+৳ {totalTimingCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalCustomCharge > 0 && (
                                        <div className="flex justify-between py-1 text-purple-700">
                                            <span>Custom Services</span>
                                            <span className="font-bold font-mono">+৳ {totalCustomCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between py-1.5 border-t border-dashed border-gray-200 text-gray-700 font-semibold">
                                        <span>Total Gross</span>
                                        <span className="font-bold text-gray-900 font-mono">৳ {grossTotal.toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between py-1 border-b border-dashed border-gray-200 text-gray-600">
                                        <span>Discounted Amount</span>
                                        <span className="font-bold text-emerald-600 font-mono">-৳ {discountedAmount.toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between py-1 text-gray-800 font-bold">
                                        <span>Net Payable</span>
                                        <span className="font-mono text-blue-900 font-bold">৳ {netTotal.toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between py-1 border-b border-dashed border-gray-200 text-gray-600">
                                        <span>Total Paid</span>
                                        <span className="font-bold text-emerald-700 font-mono">৳ {totalPaid.toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between py-1.5 text-sm text-gray-900 font-bold">
                                        <span>Total Due</span>
                                        <span className="text-rose-600 font-mono">৳ {totalDue.toFixed(2)}</span>
                                    </div>

                                    <div className="bg-[#f8fafc] -mx-5 px-5 py-3 border-y border-gray-200 flex justify-between items-center text-sm font-bold">
                                        <span className="text-gray-700">Active Amount</span>
                                        <span className="text-[#1e3a8a] text-base font-mono">
                                            ৳ {(paymentRows[keypadTargetIndex]?.amount || 0).toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Numeric Keypad Grid */}
                                    <div className="pt-2">
                                        <p className="text-[11px] text-gray-500 mb-2 font-medium">Select an input to start or tap keypad:</p>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('1')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                1
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('2')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                2
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('3')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                3
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('CLEAR')}
                                                className="h-10 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-bold hover:bg-red-100 cursor-pointer"
                                            >
                                                Clear
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('4')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                4
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('5')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                5
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('6')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                6
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('BACK')}
                                                className="h-10 bg-gray-100 text-gray-700 border border-gray-200 rounded text-sm font-bold hover:bg-gray-200 flex items-center justify-center cursor-pointer"
                                            >
                                                <Delete size={18} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('7')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                7
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('8')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                8
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('9')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                9
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('0')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                0
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleKeypadPress('FULL')}
                                            className="w-full mt-2 h-7 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded text-[11px] font-bold cursor-pointer"
                                        >
                                            Pay Full Due (৳ {totalDue.toFixed(2)})
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Footer (Exact hotel-management buttons) */}
                <div className="px-6 py-3.5 border-t border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
                    <div></div>

                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep((step - 1) as any)}
                                className="h-9 px-5 border border-gray-300 text-blue-600 hover:bg-gray-50 rounded-md text-sm font-semibold cursor-pointer transition-colors"
                            >
                                Previous
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => setStep((step + 1) as any)}
                                className="h-9 px-6 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-md text-sm font-semibold cursor-pointer shadow-2xs transition-colors"
                            >
                                Next
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleFinalizeBooking('hold')}
                                    className="h-9 px-5 border border-gray-300 text-blue-600 hover:bg-gray-50 rounded-md text-sm font-semibold cursor-pointer transition-colors"
                                >
                                    Hold Till
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFinalizeBooking('checkin')}
                                    className="h-9 px-6 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-md text-sm font-semibold cursor-pointer shadow-2xs transition-colors"
                                >
                                    CheckIn
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFinalizeBooking('reserve')}
                                    className="h-9 px-6 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-md text-sm font-semibold cursor-pointer shadow-2xs transition-colors"
                                >
                                    Reserve
                                </button>
                            </>
                        )}
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
                    nights={nights}
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

export default AddReservationModal;
