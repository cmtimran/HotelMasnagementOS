import React, { useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Copy,
    Trash2,
    User as UserIcon,
    MapPin,
    Briefcase,
    CheckCircle2,
    Calendar,
    List,
    Plus
} from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

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
}

interface PaymentRow {
    id: number;
    method: 'Cash' | 'Card' | 'bKash' | 'Bank Transfer';
    amount: number;
}

export const AddReservation: React.FC = () => {
    const { setActivePage } = useNavigation();
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // ==========================================
    // STEP 1 STATE
    // ==========================================
    const [checkIn, setCheckIn] = useState<string>(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });
    const [nights, setNights] = useState<number>(1);
    const [checkOut, setCheckOut] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    });
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
            rate: 3000,
            isAssign: true
        }
    ]);

    // Update nights when checkout changes
    const handleCheckOutChange = (val: string) => {
        setCheckOut(val);
        const start = new Date(checkIn);
        const end = new Date(val);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        setNights(diff > 0 ? diff : 1);
    };

    // Update checkout when nights changes
    const handleNightsChange = (val: number) => {
        const n = Math.max(1, val);
        setNights(n);
        const start = new Date(checkIn);
        start.setDate(start.getDate() + n);
        setCheckOut(start.toISOString().split('T')[0]);
    };

    // Update checkout when checkIn changes
    const handleCheckInChange = (val: string) => {
        setCheckIn(val);
        const start = new Date(val);
        start.setDate(start.getDate() + nights);
        setCheckOut(start.toISOString().split('T')[0]);
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

    // Calculations
    const grossTotal = roomsList.reduce((acc, r) => acc + (r.rate * r.roomsCount * nights), 0);
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
            guestName: `${salutation} ${guestName.trim() || 'Valued Guest'}`,
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
            idType,
            idNumber,
            specialRequests: remarksMap['Guest'] || '',
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

                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActivePage('reservations')}
                        className="h-6.5 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded text-[11px] font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="View All Reservations"
                    >
                        <List size={12} className="text-gray-500" />
                        <span>Reservations List</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActivePage('stay-view')}
                        className="h-6.5 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-blue-700 rounded text-[11px] font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Open Stay View Calendar"
                    >
                        <Calendar size={12} className="text-blue-600" />
                        <span>Stay View</span>
                    </button>
                </div>
            </div>

            {/* Main Form Card Container */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs overflow-hidden flex flex-col flex-1">
                {/* Stepper Navigation */}
                <div className="bg-gray-50/70 border-b border-gray-200/80 px-4 py-1.5 flex items-center justify-center select-none flex-shrink-0">
                    <div className="flex items-center w-full max-w-[620px]">
                        {/* Step 1 */}
                        <div
                            onClick={() => setStep(1)}
                            className={`flex items-center gap-1.5 cursor-pointer ${step >= 1 ? 'opacity-100 font-semibold' : 'opacity-60'}`}
                        >
                            <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center font-bold text-[10px] transition-colors ${
                                step >= 1 ? 'bg-[#1e3a8a] text-white shadow-xs' : 'bg-gray-200 text-gray-600'
                            }`}>
                                1
                            </div>
                            <span className={`text-[11px] ${step === 1 ? 'text-[#1e3a8a] font-bold' : 'text-gray-600 font-medium'}`}>
                                Check Availability
                            </span>
                        </div>

                        <div className={`flex-1 h-0.5 mx-2.5 transition-colors ${step >= 2 ? 'bg-[#1e3a8a]' : 'bg-gray-200'}`}></div>

                        {/* Step 2 */}
                        <div
                            onClick={() => setStep(2)}
                            className={`flex items-center gap-1.5 cursor-pointer ${step >= 2 ? 'opacity-100 font-semibold' : 'opacity-60'}`}
                        >
                            <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center font-bold text-[10px] transition-colors ${
                                step >= 2 ? 'bg-[#1e3a8a] text-white shadow-xs' : 'bg-gray-200 text-gray-600'
                            }`}>
                                2
                            </div>
                            <span className={`text-[11px] ${step === 2 ? 'text-[#1e3a8a] font-bold' : 'text-gray-600 font-medium'}`}>
                                Guest Information
                            </span>
                        </div>

                        <div className={`flex-1 h-0.5 mx-2.5 transition-colors ${step >= 3 ? 'bg-[#1e3a8a]' : 'bg-gray-200'}`}></div>

                        {/* Step 3 */}
                        <div
                            onClick={() => setStep(3)}
                            className={`flex items-center gap-1.5 cursor-pointer ${step >= 3 ? 'opacity-100 font-semibold' : 'opacity-60'}`}
                        >
                            <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center font-bold text-[10px] transition-colors ${
                                step >= 3 ? 'bg-[#1e3a8a] text-white shadow-xs' : 'bg-gray-200 text-gray-600'
                            }`}>
                                3
                            </div>
                            <span className={`text-[11px] ${step === 3 ? 'text-[#1e3a8a] font-bold' : 'text-gray-600 font-medium'}`}>
                                Payments
                            </span>
                        </div>
                    </div>
                </div>

                {/* Form Step Body */}
                <div className="p-3 sm:p-3.5 flex-1 flex flex-col gap-3 overflow-y-auto">
                    {/* ========================================================
                        STEP 1: CHECK AVAILABILITY & ROOMS TABLE
                        ======================================================== */}
                    {step === 1 && (
                        <div className="space-y-3 animate-in fade-in duration-150">
                            {/* Top 6-Field Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[10px] font-semibold text-gray-700">
                                        Check in <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={checkIn}
                                        onChange={e => handleCheckInChange(e.target.value)}
                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[10px] font-semibold text-gray-700">Nights</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={nights}
                                        onChange={e => handleNightsChange(Number(e.target.value))}
                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white text-gray-800 outline-none text-center font-bold"
                                    />
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[10px] font-semibold text-gray-700">
                                        Check out <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={checkOut}
                                        onChange={e => handleCheckOutChange(e.target.value)}
                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[10px] font-semibold text-gray-700">Room(s)</label>
                                    <input
                                        type="text"
                                        value={roomsList.length}
                                        disabled
                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-gray-100 text-gray-500 cursor-not-allowed text-center font-bold"
                                    />
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[10px] font-semibold text-gray-700">Business Source</label>
                                    <select
                                        value={businessSource}
                                        onChange={e => setBusinessSource(e.target.value)}
                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="Direct">Direct</option>
                                        <option value="Booking.com">Booking.com</option>
                                        <option value="Agoda">Agoda</option>
                                        <option value="Corporate">Corporate</option>
                                        <option value="Walk-In">Walk-In</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[10px] font-semibold text-gray-700">Business Agent</label>
                                    <select
                                        value={businessAgent}
                                        onChange={e => setBusinessAgent(e.target.value)}
                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        <option value="Direct">Direct</option>
                                        <option value="Front Desk">Front Desk</option>
                                        <option value="Expedia Partner">Expedia Partner</option>
                                        <option value="Corporate Manager">Corporate Manager</option>
                                    </select>
                                </div>
                            </div>

                            {/* Options Row */}
                            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={dayUse}
                                        onChange={e => setDayUse(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                                    />
                                    <span>Day Use</span>
                                </label>

                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-1 text-[11px] text-gray-700 cursor-pointer select-none">
                                        <input
                                            type="radio"
                                            name="ratePerNight"
                                            checked={ratePerNight === 'Rate Per Night'}
                                            onChange={() => setRatePerNight('Rate Per Night')}
                                            className="text-blue-600 cursor-pointer"
                                        />
                                        <span>Rate Per Night</span>
                                    </label>

                                    <label className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={taxApplicable}
                                            onChange={e => setTaxApplicable(e.target.checked)}
                                            className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                                        />
                                        <span>Tax Applicable</span>
                                    </label>
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
                                                    <td className="p-1.5">
                                                        <input
                                                            type="text"
                                                            value={row.roomNumber}
                                                            onChange={e => updateRoomRow(row.id, 'roomNumber', e.target.value)}
                                                            className="w-14 h-7 px-1 border border-gray-200 rounded text-[11px] text-center font-bold outline-none"
                                                        />
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
                                                    <td className="p-1.5">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={row.children}
                                                            onChange={e => updateRoomRow(row.id, 'children', Number(e.target.value))}
                                                            className="w-11 h-7 px-1 border border-gray-200 rounded text-[11px] text-center outline-none"
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
                                                    <td className="p-1.5 font-bold text-gray-900 text-right">
                                                        {(row.rate * row.roomsCount * nights).toFixed(2)}
                                                    </td>
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
                                <div className="p-2 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={handleAddRoomRow}
                                        className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-blue-700 font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    >
                                        <Plus size={12} />
                                        <span>Add Room</span>
                                    </button>
                                    <div className="text-[11px] text-gray-600">
                                        Total Estimated: <strong className="text-gray-900 font-mono text-xs">{grossTotal.toFixed(2)}</strong> BDT
                                    </div>
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
                                    <h3 className="font-bold text-gray-900 text-[10.5px] uppercase tracking-wider border-b border-gray-100 pb-1.5">
                                        Settlement Summary
                                    </h3>

                                    <div className="space-y-1 text-[11px]">
                                        <div className="flex items-center justify-between py-0.5 text-gray-600">
                                            <span>Total Amount:</span>
                                            <span className="font-bold text-gray-900 font-mono">{grossTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-0.5 text-gray-600">
                                            <span>Discounted Amount:</span>
                                            <span className="font-bold text-emerald-600 font-mono">-{discountedAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-0.5 text-gray-600">
                                            <span>Net Payable:</span>
                                            <span className="font-bold text-gray-900 font-mono">{netTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-0.5 text-gray-600">
                                            <span>Total Paid:</span>
                                            <span className="font-bold text-blue-700 font-mono">{totalPaid.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 bg-rose-50 border border-rose-200 rounded text-rose-800 font-bold">
                                            <span>Total Due Balance:</span>
                                            <span className="font-mono text-xs">{totalDue.toFixed(2)}</span>
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
        </div>
    );
};

export default AddReservation;
