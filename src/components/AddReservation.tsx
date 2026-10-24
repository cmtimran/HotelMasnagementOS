import React, { useState, useMemo } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Copy,
    Trash2,
    User as UserIcon,
    MapPin,
    Briefcase,
    CheckCircle2,
    Check,
    Calendar,
    List,
    Plus,
    MoreVertical,
    Car,
    Plane,
    BedDouble,
    Utensils,
    Gift,
    Clock,
    Sparkles
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { StayPeriodPicker, getSystemDateISO, getNextDayISO } from './common/StayPeriodPicker';
import { ChildAgeSelector } from './common/ChildAgeSelector';
import { RoomAddonServicesModal, type ServiceTabType } from './modals/RoomAddonServicesModal';
import type {
    RoomServicesBundle,
    ExtraBedConfig,
    PickupConfig
} from '../types/reservationServices';
import {
    getExtraBedTotal,
    getMealPlanTotal,
    getCelebrationTotal,
    getSpaWellnessTotal,
    getTimingFlexTotal,
    getCustomAddonsTotal,
    getRoomBundleTotal
} from '../types/reservationServices';

interface RoomRow {
    id: number;
    roomType: string;
    roomsCount: number;
    ratePlan: string;
    roomNumber: string;
    adults: number;
    children: number;
    childrenAges?: number[];
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

const AVAILABLE_ROOMS_MAP: Record<string, string[]> = {
    'Deluxe Double': ['101', '102', '107', '108', '202', '205', '207', '301', '302'],
    'Superior King': ['103', '203', '305', '306', '307', '507'],
    'Executive Suite': ['104', '201', '206', '401', '402', '404', '502'],
    'Presidential Suite': ['501', '503'],
    'Winter Rate Plan': ['101', '102', '202', '505'],
    'Standard Single': ['105', '205', '208', '303']
};

const getAvailableRooms = (roomType: string): string[] => {
    return AVAILABLE_ROOMS_MAP[roomType] || ['101', '102', '103', '104', '105', '201', '202'];
};

export const AddReservation: React.FC = () => {
    const { setActivePage } = useNavigation();
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // ==========================================
    // STEP 1 STATE
    // ==========================================
    const [checkIn, setCheckIn] = useState<string>(() => getSystemDateISO());
    const [nights, setNights] = useState<number>(1);
    const [checkOut, setCheckOut] = useState<string>(() => getNextDayISO(getSystemDateISO(), 1));
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
            roomNumber: '101',
            adults: 2,
            children: 1,
            childrenAges: [5],
            rate: 3000,
            isAssign: true
        }
    ]);

    // Total actual room count across all rows (sums each row's roomsCount)
    const totalRoomsCount = useMemo(() => {
        return roomsList.reduce((acc, r) => acc + (Number(r.roomsCount) || 1), 0);
    }, [roomsList]);

    // Handle Day Use toggle
    const handleDayUseToggle = (isDayUse: boolean) => {
        setDayUse(isDayUse);
        if (isDayUse) {
            setCheckOut(checkIn);
            setNights(0);
        } else {
            const nextDay = getNextDayISO(checkIn, 1);
            setCheckOut(nextDay);
            setNights(1);
        }
    };

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
    const [idNumber, setIdNumber] = useState('');

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

    // Success State
    const [createdReservation, setCreatedReservation] = useState<any | null>(null);

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

    // Calculations
    const nightMultiplier = dayUse ? 1 : Math.max(1, nights);
    const roomBaseTotal = roomsList.reduce((acc, r) => acc + (r.rate * r.roomsCount * nightMultiplier), 0);
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
        const usedRooms = new Set(roomsList.map(r => r.roomNumber));
        const pool = getAvailableRooms('Deluxe Double');
        const nextRoom = pool.find(rn => !usedRooms.has(rn)) || String(100 + nextId);

        setRoomsList([
            ...roomsList,
            {
                id: nextId,
                roomType: 'Deluxe Double',
                roomsCount: 1,
                ratePlan: 'BAR Rack Rate',
                roomNumber: nextRoom,
                adults: 1,
                children: 0,
                childrenAges: [],
                rate: 3000,
                isAssign: true
            }
        ]);
    };

    const handleCopyRoomRow = (row: RoomRow) => {
        const nextId = Math.max(...roomsList.map(r => r.id)) + 1;
        const usedRooms = new Set(roomsList.map(r => r.roomNumber));
        const pool = getAvailableRooms(row.roomType);
        const nextRoom = pool.find(rn => !usedRooms.has(rn)) || String(100 + nextId);

        setRoomsList([
            ...roomsList,
            {
                ...row,
                id: nextId,
                roomNumber: nextRoom,
                childrenAges: [...(row.childrenAges || [])]
            }
        ]);
    };

    const handleRemoveRoomRow = (id: number) => {
        if (roomsList.length === 1) return;
        setRoomsList(roomsList.filter(r => r.id !== id));
    };

    const updateRoomRow = (id: number, field: keyof RoomRow, value: any) => {
        setRoomsList(prev => {
            // 1. Update target row
            const updated = prev.map(r => {
                if (r.id !== id) return r;
                if (field === 'roomType') {
                    const otherUsed = new Set(prev.filter(other => other.id !== id).map(other => other.roomNumber));
                    const pool = getAvailableRooms(value);
                    const nextRoom = pool.find(rn => !otherUsed.has(rn)) || pool[0] || '101';
                    return { ...r, roomType: value, roomNumber: nextRoom };
                }
                return { ...r, [field]: value };
            });

            // 2. Ensure complete uniqueness of room numbers across all rows
            const allocatedSet = new Set<string>();
            return updated.map((r, idx) => {
                const pool = getAvailableRooms(r.roomType);
                if (allocatedSet.has(r.roomNumber)) {
                    // Collision detected! Automatically assign next available room in the pool
                    const freeRoom = pool.find(rn => !allocatedSet.has(rn)) || String(100 + (idx + 1) * 2);
                    allocatedSet.add(freeRoom);
                    return { ...r, roomNumber: freeRoom };
                }
                allocatedSet.add(r.roomNumber);
                return r;
            });
        });
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
        
        // Auto assign available rooms upon saving for rows with isAssign === true
        const usedRoomsAcrossBooking = new Set<string>();

        // 1. Lock in manual selections first
        roomsList.forEach(r => {
            if (!r.isAssign && r.roomNumber) {
                usedRoomsAcrossBooking.add(r.roomNumber);
            }
        });

        // 2. Allocate auto rows from remaining pool
        const allocatedRoomNumbers = roomsList.map((r, idx) => {
            if (r.isAssign) {
                const pool = getAvailableRooms(r.roomType);
                const freeRoom = pool.find(rn => !usedRoomsAcrossBooking.has(rn)) || String(100 + idx);
                usedRoomsAcrossBooking.add(freeRoom);
                return freeRoom;
            }
            usedRoomsAcrossBooking.add(r.roomNumber);
            return r.roomNumber;
        });

        const mainRoom = roomsList[0] || { roomNumber: '101', roomType: 'Deluxe Double' };
        const primaryRoomNumber = allocatedRoomNumbers[0] || mainRoom.roomNumber;

        const newReservation = {
            id: Date.now(),
            reservationNumber,
            guestName: `${salutation} ${guestName.trim() || 'Valued Guest'}`,
            phone: mobile || phone || '+880 1711-000000',
            email: email || 'guest@hospitality.com',
            roomNumber: primaryRoomNumber,
            roomType: mainRoom.roomType,
            allocatedRooms: allocatedRoomNumbers,
            roomsCount: totalRoomsCount,
            checkIn,
            checkOut,
            nights,
            dayUse,
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
            idType,
            idNumber,
            specialRequests: remarksMap['Guest'] || '',
            roomsList: roomsList.map((r, i) => ({
                ...r,
                roomNumber: allocatedRoomNumbers[i] || r.roomNumber
            })),
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

        setCreatedReservation(newReservation);
    };

    const resetForm = () => {
        setStep(1);
        const sys = getSystemDateISO();
        setCheckIn(sys);
        setNights(1);
        setCheckOut(getNextDayISO(sys, 1));
        setDayUse(false);
        setGuestName('');
        setMobile('');
        setEmail('');
        setCreatedReservation(null);
    };

    return (
        <div className="p-2 sm:p-3 bg-[#f0f4f8] min-h-full flex flex-col gap-2.5 font-sans text-xs text-gray-800 animate-in fade-in duration-150">
            {/* Top Navigation & Breadcrumb Bar */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs px-3 py-1.5 flex items-center justify-between gap-2.5 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                        <Plus size={14} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xs font-bold text-gray-900 tracking-tight">Add New Reservation</h1>
                            <span className="px-1.5 py-0.2 text-[8.5px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                                3-Step Wizard
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500">
                            Check availability, allocate rooms, record guest profile, and settle advance tariffs.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActivePage('reservations')}
                        className="h-7.5 px-3 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="View All Reservations"
                    >
                        <List size={13} className="text-gray-500" />
                        <span>Reservations List</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActivePage('stay-view')}
                        className="h-7.5 px-3 bg-white border border-gray-200 hover:bg-gray-50 hover:border-blue-300 text-blue-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Open Stay View Calendar"
                    >
                        <Calendar size={13} className="text-blue-600" />
                        <span>Stay View</span>
                    </button>
                </div>
            </div>

            {/* Main Form Card Container */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs overflow-hidden flex flex-col flex-1">
                {/* Stepper Navigation: Responsive Segmented Track */}
                <div className="bg-slate-50/80 border-b border-gray-200/80 px-3 py-2 flex items-center justify-center select-none flex-shrink-0">
                    <div className="w-full max-w-[680px] grid grid-cols-3 gap-2">
                        {/* Step 1 */}
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg border text-xs transition-all cursor-pointer ${
                                step === 1
                                    ? 'bg-white border-blue-500 text-blue-900 font-bold shadow-xs ring-1 ring-blue-500/20'
                                    : step > 1
                                        ? 'bg-blue-50/60 border-blue-200 text-blue-800 font-medium hover:bg-blue-100/50'
                                        : 'bg-white/60 border-gray-200 text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0 transition-colors ${
                                step === 1
                                    ? 'bg-[#1e3a8a] text-white shadow-xs'
                                    : step > 1
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-600'
                            }`}>
                                {step > 1 ? <Check size={11} className="stroke-[3]" /> : '1'}
                            </div>
                            <span className="truncate tracking-tight">1. Check Availability</span>
                        </button>

                        {/* Step 2 */}
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg border text-xs transition-all cursor-pointer ${
                                step === 2
                                    ? 'bg-white border-blue-500 text-blue-900 font-bold shadow-xs ring-1 ring-blue-500/20'
                                    : step > 2
                                        ? 'bg-blue-50/60 border-blue-200 text-blue-800 font-medium hover:bg-blue-100/50'
                                        : 'bg-white/60 border-gray-200 text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0 transition-colors ${
                                step === 2
                                    ? 'bg-[#1e3a8a] text-white shadow-xs'
                                    : step > 2
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-600'
                            }`}>
                                {step > 2 ? <Check size={11} className="stroke-[3]" /> : '2'}
                            </div>
                            <span className="truncate tracking-tight">2. Guest Profile</span>
                        </button>

                        {/* Step 3 */}
                        <button
                            type="button"
                            onClick={() => setStep(3)}
                            className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg border text-xs transition-all cursor-pointer ${
                                step === 3
                                    ? 'bg-white border-blue-500 text-blue-900 font-bold shadow-xs ring-1 ring-blue-500/20'
                                    : 'bg-white/60 border-gray-200 text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0 transition-colors ${
                                step === 3
                                    ? 'bg-[#1e3a8a] text-white shadow-xs'
                                    : 'bg-gray-200 text-gray-600'
                            }`}>
                                3
                            </div>
                            <span className="truncate tracking-tight">3. Billing &amp; Pay</span>
                        </button>
                    </div>
                </div>

                {/* Form Step Body */}
                <div className="p-3 sm:p-3.5 flex-1 flex flex-col gap-3 overflow-y-auto">
                    {/* ========================================================
                        STEP 1: CHECK AVAILABILITY & ROOMS TABLE
                        ======================================================== */}
                    {step === 1 && (
                        <div className="space-y-3 animate-in fade-in duration-150">
                            {/* Parameters Card Container */}
                            <div className="bg-slate-50/70 border border-slate-200/90 rounded-lg p-3 shadow-2xs space-y-2.5">
                                {/* Top Parameters Row: Consolidated Stay Period Picker + Room(s) + Business Source + Business Agent */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                                    {/* Consolidated Single Stay Dates Controller (Spans 6 cols) */}
                                    <div className="md:col-span-6">
                                        <StayPeriodPicker
                                            checkIn={checkIn}
                                            checkOut={checkOut}
                                            nights={nights}
                                            dayUse={dayUse}
                                            onDateChange={(newIn, newOut, newNights) => {
                                                setCheckIn(newIn);
                                                if (dayUse) {
                                                    setCheckOut(newIn);
                                                    setNights(0);
                                                } else {
                                                    setCheckOut(newOut);
                                                    setNights(newNights);
                                                }
                                            }}
                                            label="Stay Period (Check In - Check Out)"
                                        />
                                    </div>

                                    {/* Room(s) (Spans 2 cols) - Displays total room count across all rows */}
                                    <div className="md:col-span-2 flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <span>Room(s)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={totalRoomsCount}
                                            disabled
                                            className="w-full h-8 px-2 border border-slate-200 rounded-md text-[11px] bg-slate-100 text-slate-600 cursor-not-allowed text-center font-bold"
                                        />
                                    </div>

                                    {/* Business Source (Spans 2 cols) */}
                                    <div className="md:col-span-2 flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <span>Business Source</span>
                                        </label>
                                        <select
                                            value={businessSource}
                                            onChange={e => setBusinessSource(e.target.value)}
                                            className="w-full h-8 px-2 border border-slate-200 rounded-md text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-medium transition-all"
                                        >
                                            <option value="Direct">Direct</option>
                                            <option value="Booking.com">Booking.com</option>
                                            <option value="Agoda">Agoda</option>
                                            <option value="Corporate">Corporate</option>
                                            <option value="Walk-In">Walk-In</option>
                                        </select>
                                    </div>

                                    {/* Business Agent (Spans 2 cols) */}
                                    <div className="md:col-span-2 flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <span>Business Agent</span>
                                        </label>
                                        <select
                                            value={businessAgent}
                                            onChange={e => setBusinessAgent(e.target.value)}
                                            className="w-full h-8 px-2 border border-slate-200 rounded-md text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-medium transition-all"
                                        >
                                            <option value="Direct">Direct</option>
                                            <option value="Front Desk">Front Desk</option>
                                            <option value="Expedia Partner">Expedia Partner</option>
                                            <option value="Corporate Manager">Corporate Manager</option>
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

                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer select-none hover:text-slate-900">
                                            <input
                                                type="radio"
                                                name="ratePerNight"
                                                checked={ratePerNight === 'Rate Per Night'}
                                                onChange={() => setRatePerNight('Rate Per Night')}
                                                className="text-blue-600 cursor-pointer"
                                            />
                                            <span>Rate Per Night</span>
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
                            </div>

                            {/* Rooms Configuration Table */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-[11px]">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold text-[10px] uppercase tracking-wider">
                                                <th className="p-1.5 pl-3">Room Type</th>
                                                <th className="p-1.5">Rooms</th>
                                                <th className="p-1.5">Rate Plan</th>
                                                <th className="p-1.5">Room</th>
                                                <th className="p-1.5">Adult</th>
                                                <th className="p-1.5">Child</th>
                                                <th className="p-1.5 text-right">Tariff (BDT)</th>
                                                <th className="p-1.5 text-right">Total</th>
                                                <th className="p-1.5 pr-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {roomsList.map(row => (
                                                <tr key={row.id} className="hover:bg-blue-50/20 transition-colors">
                                                    <td className="p-1.5 pl-3">
                                                        <select
                                                            value={row.roomType}
                                                            onChange={e => updateRoomRow(row.id, 'roomType', e.target.value)}
                                                            className="w-36 h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                        >
                                                            <option value="Deluxe Double">Deluxe Double</option>
                                                            <option value="Superior King">Superior King</option>
                                                            <option value="Executive Suite">Executive Suite</option>
                                                            <option value="Presidential Suite">Presidential Suite</option>
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
                                                                            title="Airport Pickup Configured (Arrival)"
                                                                        >
                                                                            <Car size={10} />
                                                                            <span>Pickup: {b.pickup.flightNumber ? b.pickup.flightNumber : 'Arrival'}</span>
                                                                            <span className="font-bold">{b.pickup.isComplimentary ? 'Free' : `৳${b.pickup.chargeAmount}`}</span>
                                                                        </button>
                                                                    )}
                                                                    {b.pickup?.dropEnabled && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'pickup' })}
                                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 cursor-pointer shadow-2xs"
                                                                            title="Airport Drop Configured (Departure)"
                                                                        >
                                                                            <Plane size={10} />
                                                                            <span>Drop: {b.pickup.dropFlightNumber ? b.pickup.dropFlightNumber : 'Departure'}</span>
                                                                            <span className="font-bold">{b.pickup.dropIsComplimentary ? 'Free' : `৳${b.pickup.dropChargeAmount || 0}`}</span>
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
                                                                            <span className="font-bold">{b.extraBed.isComplimentary ? 'Free' : `৳${getExtraBedTotal(b.extraBed, nightMultiplier)}`}</span>
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
                                                                            <span className="font-bold">+{getMealPlanTotal(b.mealPlan, nightMultiplier)}</span>
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
                                                    <td className="p-1.5">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={row.roomsCount}
                                                            onChange={e => updateRoomRow(row.id, 'roomsCount', Number(e.target.value))}
                                                            className="w-12 h-7 px-1 border border-gray-200 rounded text-[11px] text-center outline-none font-bold"
                                                        />
                                                    </td>
                                                    <td className="p-1.5">
                                                        <select
                                                            value={row.ratePlan}
                                                            onChange={e => updateRoomRow(row.id, 'ratePlan', e.target.value)}
                                                            className="w-36 h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                        >
                                                            <option value="Summer Vacation">Summer Vacation</option>
                                                            <option value="BAR Rack Rate">BAR Rack Rate</option>
                                                            <option value="Corporate Standard">Corporate Standard</option>
                                                            <option value="Weekend Special">Weekend Special</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-1.5 text-center">
                                                        {row.isAssign ? (
                                                            <div
                                                                className="w-20 h-7 px-1 border border-slate-200 bg-slate-100 text-slate-600 rounded text-[10.5px] font-bold flex items-center justify-center cursor-not-allowed select-none shadow-2xs mx-auto"
                                                                title="Auto-Assign active: Room(s) will be assigned automatically upon saving"
                                                            >
                                                                <span className="text-blue-700">Auto</span>
                                                                <span className="text-slate-500 ml-1 font-mono">
                                                                    {row.roomsCount > 1 ? `(${row.roomsCount} Rms)` : `(${row.roomNumber})`}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <select
                                                                value={row.roomNumber}
                                                                onChange={e => updateRoomRow(row.id, 'roomNumber', e.target.value)}
                                                                className="w-20 h-7 px-1 border border-blue-400 bg-white text-blue-900 rounded text-[11px] font-bold text-center outline-none cursor-pointer focus:ring-1 focus:ring-blue-500 shadow-2xs mx-auto"
                                                                title="Manual Room Selection: Select room"
                                                            >
                                                                {(() => {
                                                                    const otherRowsRooms = new Set(
                                                                        roomsList.filter(other => other.id !== row.id).map(other => other.roomNumber)
                                                                    );
                                                                    const pool = getAvailableRooms(row.roomType);
                                                                    return pool.map(rm => {
                                                                        const isTaken = otherRowsRooms.has(rm);
                                                                        return (
                                                                            <option
                                                                                key={rm}
                                                                                value={rm}
                                                                                disabled={isTaken}
                                                                                className={isTaken ? 'text-gray-400 bg-gray-100 italic' : 'text-blue-950 font-bold'}
                                                                            >
                                                                                Room {rm}{isTaken ? ' (In Use)' : ''}
                                                                            </option>
                                                                        );
                                                                    });
                                                                })()}
                                                            </select>
                                                        )}
                                                    </td>
                                                    <td className="p-1.5">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={row.adults}
                                                            onChange={e => updateRoomRow(row.id, 'adults', Number(e.target.value))}
                                                            className="w-11 h-7 px-1 border border-gray-200 rounded text-[11px] text-center outline-none"
                                                        />
                                                    </td>
                                                    <td className="p-1.5 text-center">
                                                        <ChildAgeSelector
                                                            childrenCount={row.children}
                                                            childrenAges={row.childrenAges}
                                                            onChange={(count, ages) => {
                                                                setRoomsList(prev => prev.map(r => r.id === row.id ? { ...r, children: count, childrenAges: ages } : r));
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="p-1.5 text-right">
                                                        <input
                                                            type="number"
                                                            value={row.rate}
                                                            onChange={e => updateRoomRow(row.id, 'rate', Number(e.target.value))}
                                                            className="w-20 h-7 px-1.5 border border-gray-200 rounded text-[11px] text-right outline-none font-medium"
                                                        />
                                                    </td>
                                                    {(() => {
                                                        const bundle = row.servicesBundle || { extraBed: row.extraBed, pickup: row.pickup };
                                                        const rowAddons = getRoomBundleTotal(bundle, nightMultiplier);
                                                        const rowBase = row.rate * row.roomsCount * nightMultiplier;
                                                        const rowTotal = rowBase + rowAddons;

                                                        return (
                                                            <td className="p-1.5 font-bold text-gray-900 text-right">
                                                                <div>{(rowTotal).toFixed(2)}</div>
                                                                {rowAddons > 0 && (
                                                                    <div className="text-[9px] text-slate-400 font-normal">
                                                                        Base: {rowBase.toFixed(0)} + Svc: {rowAddons.toFixed(0)}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })()}
                                                    <td className="p-1.5 pr-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <label className="flex items-center gap-1 text-[10.5px] text-gray-600 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={row.isAssign}
                                                                    onChange={e => updateRoomRow(row.id, 'isAssign', e.target.checked)}
                                                                    className="w-3 h-3 rounded text-blue-600"
                                                                />
                                                                <span>Assign</span>
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyRoomRow(row)}
                                                                title="Duplicate Row"
                                                                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded cursor-pointer"
                                                            >
                                                                <Copy size={12} />
                                                            </button>

                                                            {/* 3-dots Menu Button right after Copy */}
                                                            <div className="relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveMenuRowId(activeMenuRowId === row.id ? null : row.id)}
                                                                    title="Room Add-On Services (Transfer, Extra Bed, Meals, Spa, Romance, Flex)"
                                                                    className={`p-1 rounded cursor-pointer transition-all ${
                                                                        (row.servicesBundle || row.extraBed?.enabled || row.pickup?.enabled)
                                                                            ? 'text-blue-700 bg-blue-100/70 hover:bg-blue-200/70 ring-1 ring-blue-300'
                                                                            : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'
                                                                    }`}
                                                                >
                                                                    <MoreVertical size={13} />
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
                                                                    title="Delete Row"
                                                                    className="p-1 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded cursor-pointer"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-3 py-1.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-[10.5px] text-gray-500">
                                    <span>Total Allocated: <strong className="text-gray-800 font-bold">{totalRoomsCount} Room(s)</strong> across {roomsList.length} row(s)</span>
                                    <span>Rate Mode: <strong className="text-gray-800">{ratePerNight}</strong></span>
                                </div>
                            </div>

                            {/* Below-Table Action Bar with "+ Add Room" Button (Positioned lower with clean breathing room) */}
                            <div className="flex items-center justify-between pt-1">
                                <button
                                    type="button"
                                    onClick={handleAddRoomRow}
                                    className="h-8 px-3.5 bg-white border border-blue-400 hover:border-blue-600 hover:bg-blue-50/80 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                                >
                                    <Plus size={13} className="text-blue-600 stroke-[2.5]" />
                                    <span>Add Room</span>
                                </button>

                                <div className="text-xs text-gray-600">
                                    Total Estimated: <strong className="text-gray-900 font-mono text-sm font-bold">{grossTotal.toFixed(2)}</strong> BDT
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 2: GUEST INFORMATION & PREFERENCES
                        ======================================================== */}
                    {step === 2 && (
                        <div className="space-y-2.5 animate-in fade-in duration-150">
                            {/* 1. Guest Profile Accordion */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <div
                                    onClick={() => setOpenGuestProfile(!openGuestProfile)}
                                    className="flex items-center justify-between px-3 py-2 bg-gray-50/80 cursor-pointer border-b border-gray-100 select-none hover:bg-gray-100/70 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center">
                                            <UserIcon size={13} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-[11.5px] leading-tight">Guest Profile</h3>
                                            <p className="text-[9.5px] text-gray-500 leading-tight">Identity, contact, passport and travel information</p>
                                        </div>
                                    </div>
                                    {openGuestProfile ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>

                                {openGuestProfile && (
                                    <div className="p-3 space-y-2.5">
                                        {/* Row 1 */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">
                                                    FULL NAME <span className="text-red-500">*</span>
                                                </label>
                                                <div className="flex gap-1">
                                                    <select
                                                        value={salutation}
                                                        onChange={e => setSalutation(e.target.value)}
                                                        className="w-14 h-7 px-1 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                    >
                                                        <option value="Mr">Mr</option>
                                                        <option value="Ms">Ms</option>
                                                        <option value="Mrs">Mrs</option>
                                                        <option value="Dr">Dr</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder="Type guest name..."
                                                        value={guestName}
                                                        onChange={e => setGuestName(e.target.value)}
                                                        className="flex-1 h-7 px-2 border border-gray-200 rounded text-[11px] outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">PHONE</label>
                                                <input
                                                    type="text"
                                                    placeholder="Landline / Alt..."
                                                    value={phone}
                                                    onChange={e => setPhone(e.target.value)}
                                                    className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">
                                                    MOBILE <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="+880 1711..."
                                                    value={mobile}
                                                    onChange={e => setMobile(e.target.value)}
                                                    className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none focus:border-blue-500"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">EMAIL</label>
                                                <input
                                                    type="email"
                                                    placeholder="guest@mail.com"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 2 */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">VIP STATUS</label>
                                                <select
                                                    value={vipStatus}
                                                    onChange={e => setVipStatus(e.target.value)}
                                                    className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                >
                                                    <option value="">None</option>
                                                    <option value="VIP-1">VIP-1 (Silver)</option>
                                                    <option value="VIP-2">VIP-2 (Gold)</option>
                                                    <option value="VVIP">VVIP (Presidential)</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">GENDER</label>
                                                <select
                                                    value={gender}
                                                    onChange={e => setGender(e.target.value)}
                                                    className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                >
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">NATIONALITY</label>
                                                <input
                                                    type="text"
                                                    value={nationality}
                                                    onChange={e => setNationality(e.target.value)}
                                                    className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">GUEST TYPE</label>
                                                <select
                                                    value={guestType}
                                                    onChange={e => setGuestType(e.target.value)}
                                                    className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                >
                                                    <option value="Adult">Adult</option>
                                                    <option value="Child">Child</option>
                                                    <option value="Corporate">Corporate</option>
                                                    <option value="Diplomat">Diplomat</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">DATE OF BIRTH</label>
                                                <input
                                                    type="date"
                                                    value={dob}
                                                    onChange={e => setDob(e.target.value)}
                                                    className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 3 */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">BIRTH COUNTRY</label>
                                                <input
                                                    type="text"
                                                    value={birthCountry}
                                                    onChange={e => setBirthCountry(e.target.value)}
                                                    className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">BIRTH CITY</label>
                                                <input
                                                    type="text"
                                                    value={birthCity}
                                                    onChange={e => setBirthCity(e.target.value)}
                                                    className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">OCCUPATION</label>
                                                <input
                                                    type="text"
                                                    placeholder="Engineer, Doctor..."
                                                    value={occupation}
                                                    onChange={e => setOccupation(e.target.value)}
                                                    className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">PURPOSE OF VISIT</label>
                                                <select
                                                    value={purposeOfVisit}
                                                    onChange={e => setPurposeOfVisit(e.target.value)}
                                                    className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                >
                                                    <option value="Business">Business</option>
                                                    <option value="Leisure / Holiday">Leisure / Holiday</option>
                                                    <option value="Medical">Medical</option>
                                                    <option value="Official / Diplomatic">Official / Diplomatic</option>
                                                    <option value="Transit">Transit</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">ID TYPE</label>
                                                <select
                                                    value={idType}
                                                    onChange={e => setIdType(e.target.value)}
                                                    className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                >
                                                    <option value="National ID (NID)">National ID (NID)</option>
                                                    <option value="Passport">Passport</option>
                                                    <option value="Driving License">Driving License</option>
                                                    <option value="Birth Certificate">Birth Certificate</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[10px] font-semibold text-gray-700">ID / PASSPORT #</label>
                                                <input
                                                    type="text"
                                                    placeholder="ID number..."
                                                    value={idNumber}
                                                    onChange={e => setIdNumber(e.target.value)}
                                                    className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 2. Remarks & Preferences Card */}
                            <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-2xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-[11px] tracking-wider uppercase">REMARKS &amp; PREFERENCES</h4>
                                        <p className="text-[9.5px] text-gray-500">Keep guest-facing and internal operational notes organized.</p>
                                    </div>
                                    <span className="text-[8.5px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                        OPTIONAL
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 border-b border-gray-100 pb-1.5">
                                    {(['Guest', 'Check In', 'Check Out', 'House Keeping', 'Payment Note'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActivePrefTab(tab)}
                                            className={`px-2.5 py-0.5 rounded text-[10.5px] font-semibold transition-colors cursor-pointer ${
                                                activePrefTab === tab
                                                    ? 'bg-[#1e3a8a] text-white shadow-2xs'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    rows={2}
                                    placeholder={`Enter remarks for ${activePrefTab}...`}
                                    value={remarksMap[activePrefTab]}
                                    onChange={e => setRemarksMap({ ...remarksMap, [activePrefTab]: e.target.value })}
                                    className="w-full p-2 border border-gray-200 rounded text-[11px] outline-none focus:border-blue-500"
                                ></textarea>
                            </div>

                            {/* 3. Home Address Accordion */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <div
                                    onClick={() => setOpenAddress(!openAddress)}
                                    className="flex items-center justify-between px-3 py-2 bg-gray-50/80 cursor-pointer border-b border-gray-100 select-none hover:bg-gray-100/70 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                            <MapPin size={13} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-[11.5px] leading-tight">Home Address</h3>
                                            <p className="text-[9.5px] text-gray-500 leading-tight">Primary residence and emergency dispatch details</p>
                                        </div>
                                    </div>
                                    {openAddress ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>

                                {openAddress && (
                                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                        <div className="flex flex-col gap-0.5 lg:col-span-2">
                                            <label className="text-[10px] font-semibold text-gray-700">STREET ADDRESS</label>
                                            <input
                                                type="text"
                                                placeholder="House, Road, Area..."
                                                value={streetAddress}
                                                onChange={e => setStreetAddress(e.target.value)}
                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] font-semibold text-gray-700">CITY</label>
                                            <input
                                                type="text"
                                                placeholder="Dhaka..."
                                                value={homeCity}
                                                onChange={e => setHomeCity(e.target.value)}
                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] font-semibold text-gray-700">STATE / PROVINCE</label>
                                            <input
                                                type="text"
                                                placeholder="State..."
                                                value={homeState}
                                                onChange={e => setHomeState(e.target.value)}
                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] font-semibold text-gray-700">POSTAL CODE</label>
                                            <input
                                                type="text"
                                                placeholder="1200..."
                                                value={postalCode}
                                                onChange={e => setPostalCode(e.target.value)}
                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] font-semibold text-gray-700">COUNTRY</label>
                                            <input
                                                type="text"
                                                value={homeCountry}
                                                onChange={e => setHomeCountry(e.target.value)}
                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 4. Work Details Accordion */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <div
                                    onClick={() => setOpenWork(!openWork)}
                                    className="flex items-center justify-between px-3 py-2 bg-gray-50/80 cursor-pointer border-b border-gray-100 select-none hover:bg-gray-100/70 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center">
                                            <Briefcase size={13} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-[11.5px] leading-tight">Work &amp; Corporate Details</h3>
                                            <p className="text-[9.5px] text-gray-500 leading-tight">Organization, corporate contract and billing contact</p>
                                        </div>
                                    </div>
                                    {openWork ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>

                                {openWork && (
                                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] font-semibold text-gray-700">COMPANY NAME</label>
                                            <input
                                                type="text"
                                                placeholder="Grameenphone, Beximco..."
                                                value={companyName}
                                                onChange={e => setCompanyName(e.target.value)}
                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] font-semibold text-gray-700">DESIGNATION</label>
                                            <input
                                                type="text"
                                                placeholder="Director, Manager..."
                                                value={designation}
                                                onChange={e => setDesignation(e.target.value)}
                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] font-semibold text-gray-700">OFFICE PHONE</label>
                                            <input
                                                type="text"
                                                placeholder="+880 2..."
                                                value={officePhone}
                                                onChange={e => setOfficePhone(e.target.value)}
                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] font-semibold text-gray-700">CORPORATE EMAIL</label>
                                            <input
                                                type="email"
                                                placeholder="guest@company.com"
                                                value={corporateEmail}
                                                onChange={e => setCorporateEmail(e.target.value)}
                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[10px] font-semibold text-gray-700">TAX / VAT ID</label>
                                            <input
                                                type="text"
                                                placeholder="TIN / VAT..."
                                                value={taxVatId}
                                                onChange={e => setTaxVatId(e.target.value)}
                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 3: PAYMENTS & SUMMARY BOX
                        ======================================================== */}
                    {step === 3 && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 animate-in fade-in duration-150">
                            {/* Left Column: Discount & Payment Methods */}
                            <div className="lg:col-span-7 space-y-2.5">
                                {/* Discount Box */}
                                <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-2xs space-y-2">
                                    <h3 className="font-bold text-gray-900 text-[10.5px] uppercase tracking-wider">Discount</h3>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={discountType}
                                            onChange={e => setDiscountType(e.target.value as any)}
                                            className="w-28 h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                        >
                                            <option value="Fixed">Fixed Amount</option>
                                            <option value="Percentage">Percentage (%)</option>
                                        </select>
                                        <input
                                            type="number"
                                            min={0}
                                            value={discountValue}
                                            onChange={e => setDiscountValue(Number(e.target.value))}
                                            className="w-24 h-7 px-2 border border-gray-200 rounded text-[11px] font-bold outline-none"
                                        />
                                        {discountValue > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setDiscountValue(0)}
                                                className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                                                title="Remove Discount"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500">Remarks: Added promotional/corporate discount.</p>
                                </div>

                                {/* Payment Methods Box */}
                                <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-2xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-gray-900 text-[10.5px] uppercase tracking-wider">Payment Method</h3>
                                        <span className="text-[10px] text-gray-500">Add partial or multi-tender settlement</span>
                                    </div>

                                    <div className="space-y-1.5">
                                        {paymentRows.map((pRow, idx) => (
                                            <div
                                                key={pRow.id}
                                                onClick={() => setKeypadTargetIndex(idx)}
                                                className={`flex items-center gap-2 p-1.5 rounded-md border transition-colors ${
                                                    keypadTargetIndex === idx ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200 bg-white'
                                                }`}
                                            >
                                                <div className="w-36 flex flex-col gap-0.5">
                                                    <label className="text-[9.5px] font-bold text-gray-500">Method</label>
                                                    <select
                                                        value={pRow.method}
                                                        onChange={e => updatePaymentRow(pRow.id, 'method', e.target.value)}
                                                        className="h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                    >
                                                        <option value="Cash">Cash</option>
                                                        <option value="Card">Card (POS)</option>
                                                        <option value="bKash">bKash (MFS)</option>
                                                        <option value="Bank Transfer">Bank Transfer</option>
                                                    </select>
                                                </div>

                                                <div className="flex-1 flex flex-col gap-0.5">
                                                    <label className="text-[9.5px] font-bold text-gray-500">Amount</label>
                                                    <input
                                                        type="number"
                                                        value={pRow.amount}
                                                        onChange={e => updatePaymentRow(pRow.id, 'amount', Number(e.target.value))}
                                                        className="h-7 px-2 border border-gray-200 rounded text-[11px] font-bold text-gray-900 outline-none"
                                                    />
                                                </div>

                                                {paymentRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePaymentRow(pRow.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer self-end mb-0.5"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-0.5">
                                        <button
                                            type="button"
                                            onClick={handleAddPaymentRow}
                                            className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-blue-700 font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                        >
                                            <Plus size={12} />
                                            <span>Add New Payment Method</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Summary Box & Keypad */}
                            <div className="lg:col-span-5 space-y-2.5">
                                <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-2xs space-y-2">
                                    <h3 className="font-bold text-gray-900 text-[10.5px] uppercase tracking-wider border-b border-gray-100 pb-1.5 flex items-center justify-between">
                                        <span>Settlement Summary</span>
                                        {totalAllAddonsCharges > 0 && (
                                            <span className="text-[9.5px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                                                Addons: +৳{totalAllAddonsCharges.toFixed(0)}
                                            </span>
                                        )}
                                    </h3>

                                    <div className="space-y-1 text-[11px]">
                                        <div className="flex items-center justify-between py-0.5 text-gray-600">
                                            <span>Room Base Tariff:</span>
                                            <span className="font-bold text-gray-900 font-mono">৳ {roomBaseTotal.toFixed(2)}</span>
                                        </div>

                                        {totalPickupArrivalCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-blue-700">
                                                <span className="flex items-center gap-1">
                                                    <Car size={11} />
                                                    <span>Airport Pickup (Inbound):</span>
                                                </span>
                                                <span className="font-bold font-mono">+৳ {totalPickupArrivalCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalDropDepartureCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-sky-700">
                                                <span className="flex items-center gap-1">
                                                    <Plane size={11} />
                                                    <span>Airport Drop (Outbound):</span>
                                                </span>
                                                <span className="font-bold font-mono">+৳ {totalDropDepartureCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalExtraBedCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-indigo-700">
                                                <span className="flex items-center gap-1">
                                                    <BedDouble size={11} />
                                                    <span>Extra Bed / Cot Surcharge:</span>
                                                </span>
                                                <span className="font-bold font-mono">+৳ {totalExtraBedCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalMealPlanCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-amber-700">
                                                <span className="flex items-center gap-1">
                                                    <Utensils size={11} />
                                                    <span>Meal Plans &amp; Dining:</span>
                                                </span>
                                                <span className="font-bold font-mono">+৳ {totalMealPlanCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalCelebrationCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-rose-700">
                                                <span className="flex items-center gap-1">
                                                    <Gift size={11} />
                                                    <span>Celebration &amp; Room Decor:</span>
                                                </span>
                                                <span className="font-bold font-mono">+৳ {totalCelebrationCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalSpaCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-teal-700">
                                                <span className="flex items-center gap-1">
                                                    <Sparkles size={11} />
                                                    <span>Wellness &amp; Spa Treatments:</span>
                                                </span>
                                                <span className="font-bold font-mono">+৳ {totalSpaCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalTimingCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-sky-700">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} />
                                                    <span>Early / Late Check-In Flex:</span>
                                                </span>
                                                <span className="font-bold font-mono">+৳ {totalTimingCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalCustomCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-purple-700">
                                                <span>Custom Ancillary Add-Ons:</span>
                                                <span className="font-bold font-mono">+৳ {totalCustomCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between py-0.5 text-gray-700 border-t border-gray-100 pt-1 font-semibold">
                                            <span>Gross Total:</span>
                                            <span className="font-bold text-gray-900 font-mono">৳ {grossTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-0.5 text-gray-600">
                                            <span>Discounted Amount:</span>
                                            <span className="font-bold text-emerald-600 font-mono">-৳ {discountedAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-1.5 bg-blue-50/80 border border-blue-100 rounded text-blue-900 font-bold">
                                            <span>Net Payable:</span>
                                            <span className="font-mono text-xs">৳ {netTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-0.5 text-gray-600">
                                            <span>Total Paid:</span>
                                            <span className="font-bold text-blue-700 font-mono">৳ {totalPaid.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 bg-rose-50 border border-rose-200 rounded text-rose-800 font-bold">
                                            <span>Total Due Balance:</span>
                                            <span className="font-mono text-xs">৳ {totalDue.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Keypad Quick Entry */}
                                    <div className="pt-1.5 border-t border-gray-100">
                                        <div className="text-[9.5px] text-gray-500 font-medium mb-1 flex items-center justify-between">
                                            <span>Quick Keypad</span>
                                            <span className="font-bold text-blue-700 font-mono">Row #{keypadTargetIndex + 1}</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1">
                                            {['1', '2', '3', 'CLEAR'].map(btn => (
                                                <button
                                                    key={btn}
                                                    type="button"
                                                    onClick={() => handleKeypadPress(btn)}
                                                    className={`h-7 font-bold rounded text-[11px] transition-colors cursor-pointer ${
                                                        btn === 'CLEAR' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {btn}
                                                </button>
                                            ))}
                                            {['4', '5', '6', 'BACK'].map(btn => (
                                                <button
                                                    key={btn}
                                                    type="button"
                                                    onClick={() => handleKeypadPress(btn)}
                                                    className={`h-7 font-bold rounded text-[11px] transition-colors cursor-pointer ${
                                                        btn === 'BACK' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {btn === 'BACK' ? '⌫' : btn}
                                                </button>
                                            ))}
                                            {['7', '8', '9', 'FULL'].map(btn => (
                                                <button
                                                    key={btn}
                                                    type="button"
                                                    onClick={() => handleKeypadPress(btn)}
                                                    className={`h-7 font-bold rounded text-[11px] transition-colors cursor-pointer ${
                                                        btn === 'FULL' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {btn === 'FULL' ? 'Full Due' : btn}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action Buttons */}
                <div className="bg-gray-50/90 border-t border-gray-200 px-4 py-2 flex items-center justify-between select-none">
                    <div className="text-[11px] text-gray-500">
                        {step === 1 && `Rooms: ${roomsList.length} | Check-in: ${checkIn}`}
                        {step === 2 && `Guest: ${guestName || 'Not entered'} | Phone: ${mobile || 'N/A'}`}
                        {step === 3 && `Net: ${netTotal.toFixed(2)} | Paid: ${totalPaid.toFixed(2)} | Due: ${totalDue.toFixed(2)}`}
                    </div>

                    <div className="flex items-center gap-1.5">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep((step - 1) as any)}
                                className="h-7 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs"
                            >
                                Previous
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => setStep((step + 1) as any)}
                                className="h-7 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                                Next Step →
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleFinalizeBooking('hold')}
                                    className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs"
                                >
                                    Hold Till
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFinalizeBooking('checkin')}
                                    className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                                >
                                    Check In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFinalizeBooking('reserve')}
                                    className="h-7 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                                >
                                    Confirm Reserve
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Success Booking Confirmation Modal */}
            {createdReservation && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-[460px] w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={28} />
                        </div>

                        <div className="text-center space-y-1">
                            <h3 className="text-base font-bold text-gray-900">Reservation Confirmed!</h3>
                            <p className="text-xs text-gray-500">
                                Booking reference <strong className="font-mono text-blue-700">{createdReservation.reservationNumber}</strong> has been saved.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3.5 space-y-2 text-xs border border-gray-100">
                            <div className="flex justify-between text-gray-600">
                                <span>Guest Name:</span>
                                <strong className="text-gray-900">{createdReservation.guestName}</strong>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Room:</span>
                                <strong className="text-blue-700 font-mono">{createdReservation.roomNumber} ({createdReservation.roomType})</strong>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Stay Dates:</span>
                                <span className="font-medium text-gray-900">{createdReservation.checkIn} to {createdReservation.checkOut} ({createdReservation.nights} nights)</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Total Tariff:</span>
                                <strong className="text-gray-900 font-mono">{createdReservation.totalAmount.toFixed(2)} BDT</strong>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Status:</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {createdReservation.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setActivePage('reservations')}
                                className="w-full py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                            >
                                View in Reservations List
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActivePage('stay-view')}
                                    className="py-2 bg-white border border-gray-200 hover:bg-gray-50 text-blue-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                                >
                                    Stay View
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                                >
                                    New Booking
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

export default AddReservation;
