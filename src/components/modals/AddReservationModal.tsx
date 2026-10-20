import React, { useState } from 'react';
import {
    X,
    Calendar,
    CreditCard,
    Check,
    ArrowRight,
    ArrowLeft,
    Clock
} from 'lucide-react';

export interface AddReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReservationCreated?: (res: any) => void;
    initialRoom?: string;
    initialStartDate?: string;
    initialEndDate?: string;
}

export const AddReservationModal: React.FC<AddReservationModalProps> = ({
    isOpen,
    onClose,
    onReservationCreated,
    initialRoom = '101',
    initialStartDate = new Date().toISOString().split('T')[0],
    initialEndDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [activePrefTab, setActivePrefTab] = useState<'Guest' | 'Billing' | 'Corporate'>('Guest');

    // Step 1: Availability & Room Selection
    const [checkIn, setCheckIn] = useState(initialStartDate);
    const [checkOut, setCheckOut] = useState(initialEndDate);
    const [nights, setNights] = useState(2);
    const [roomCount, setRoomCount] = useState(1);
    const [businessSource, setBusinessSource] = useState('Direct');
    const [businessAgent, setBusinessAgent] = useState('Front Desk Walk-In');
    const [isDayUse, setIsDayUse] = useState(false);
    const [isComplimentary, setIsComplimentary] = useState(false);
    const [selectedRoomType, setSelectedRoomType] = useState('Deluxe Double');
    const [selectedRoomNumber, setSelectedRoomNumber] = useState(initialRoom);

    // Step 2: Guest Details
    const [salutation, setSalutation] = useState('Mr.');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [country, setCountry] = useState('Bangladesh');
    const [city, setCity] = useState('Dhaka');
    const [address, setAddress] = useState('');
    const [vipLevel, setVipLevel] = useState('None');
    const [purposeOfVisit, setPurposeOfVisit] = useState('Business');
    const [specialRequests, setSpecialRequests] = useState('');
    const [billingInstruction, setBillingInstruction] = useState('Guest Direct Settlement');

    // Step 3: Payments & Summary
    const [discountAmount, setDiscountAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit Card' | 'bKash Merchant' | 'Bank Transfer'>('Cash');
    const [paidAmount, setPaidAmount] = useState(3500);

    if (!isOpen) return null;

    const roomTypes = [
        { name: 'Deluxe Double', rate: 3500, maxGuests: 2, available: 6, tag: 'Popular', inclusions: 'Complimentary Buffet Breakfast, High-Speed WiFi' },
        { name: 'Executive Suite', rate: 7500, maxGuests: 3, available: 3, tag: 'Luxury', inclusions: 'Airport Pickup, Lounge Access, Free Mini-Bar' },
        { name: 'Superior King', rate: 4500, maxGuests: 2, available: 4, tag: 'Best Value', inclusions: 'Breakfast Included, Balcony View' },
        { name: 'Family Interconnecting', rate: 9000, maxGuests: 4, available: 2, tag: 'Spacious', inclusions: '2 King Beds, Free Pool & Gym Pass' },
    ];

    const currentRoomObj = roomTypes.find(r => r.name === selectedRoomType) || roomTypes[0];
    const computedTotal = (currentRoomObj.rate * nights * roomCount) - discountAmount;
    const computedDue = Math.max(0, computedTotal - paidAmount);

    const handleKeypadPress = (val: string) => {
        if (val === 'C') {
            setPaidAmount(0);
        } else if (val === 'FULL') {
            setPaidAmount(computedTotal);
        } else {
            const str = paidAmount.toString();
            const next = Number(str + val);
            if (!isNaN(next)) setPaidAmount(next);
        }
    };

    const handleFinalizeBooking = (actionType: 'reserve' | 'checkin' | 'hold') => {
        if (!firstName && !lastName) {
            alert('Please provide guest name in Step 2.');
            setStep(2);
            return;
        }

        const newReservation = {
            id: Date.now(),
            reservationNumber: `RES-${Date.now().toString().slice(-6)}`,
            guestName: `${salutation} ${firstName} ${lastName}`.trim() || 'Walk-in Guest',
            phone: mobile || 'N/A',
            email: email || 'N/A',
            roomNumber: selectedRoomNumber,
            roomType: selectedRoomType,
            checkIn,
            checkOut,
            nights,
            adults: currentRoomObj.maxGuests,
            children: 0,
            status: actionType === 'checkin' ? 'in-house' : actionType === 'hold' ? 'hold' : 'confirmed',
            totalAmount: computedTotal,
            paidAmount: actionType === 'hold' ? 0 : paidAmount,
            dueAmount: actionType === 'hold' ? computedTotal : computedDue,
            source: businessSource,
            agent: businessAgent,
            vip: vipLevel,
            purpose: purposeOfVisit,
            specialRequests,
            createdAt: new Date().toISOString()
        };

        // Persist to local storage
        try {
            const existing = localStorage.getItem('hotel_reservations_v2');
            const list = existing ? JSON.parse(existing) : [];
            list.unshift(newReservation);
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(list));
        } catch (e) {
            console.error('Failed to save reservation', e);
        }

        if (onReservationCreated) {
            onReservationCreated(newReservation);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <Calendar size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm md:text-base font-bold">Add New Reservation (PMS Booking Engine)</h2>
                            <p className="text-[11px] text-blue-200">Front Desk 3-Step Availability, Guest 360 & Folio Payment Setup</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Stepper Header */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-center gap-2 md:gap-8 text-xs font-semibold">
                    <div
                        onClick={() => setStep(1)}
                        className={`flex items-center gap-2 cursor-pointer transition-colors ${step >= 1 ? 'text-blue-700' : 'text-gray-400'}`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            1
                        </div>
                        <span className="hidden sm:inline">Check Availability</span>
                    </div>

                    <div className={`w-8 md:w-16 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>

                    <div
                        onClick={() => setStep(2)}
                        className={`flex items-center gap-2 cursor-pointer transition-colors ${step >= 2 ? 'text-blue-700' : 'text-gray-400'}`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            2
                        </div>
                        <span className="hidden sm:inline">Guest Information</span>
                    </div>

                    <div className={`w-8 md:w-16 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>

                    <div
                        onClick={() => setStep(3)}
                        className={`flex items-center gap-2 cursor-pointer transition-colors ${step >= 3 ? 'text-blue-700' : 'text-gray-400'}`}
                    >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            3
                        </div>
                        <span className="hidden sm:inline">Payments & Folio</span>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto max-h-[70vh] text-xs space-y-4">
                    {/* STEP 1: AVAILABILITY & ROOMS */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200">
                                <div className="space-y-1 md:col-span-2">
                                    <label className="font-semibold text-gray-700">Check-in Date *</label>
                                    <input
                                        type="date"
                                        value={checkIn}
                                        onChange={e => setCheckIn(e.target.value)}
                                        className="w-full h-8 px-2.5 bg-white border border-gray-200 rounded-lg outline-none font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Nights</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={nights}
                                        onChange={e => setNights(Number(e.target.value))}
                                        className="w-full h-8 px-2 bg-white border border-gray-200 rounded-lg text-center font-bold text-gray-800"
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="font-semibold text-gray-700">Check-out Date *</label>
                                    <input
                                        type="date"
                                        value={checkOut}
                                        onChange={e => setCheckOut(e.target.value)}
                                        className="w-full h-8 px-2.5 bg-white border border-gray-200 rounded-lg outline-none font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Rooms</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={roomCount}
                                        onChange={e => setRoomCount(Number(e.target.value))}
                                        className="w-full h-8 px-2 bg-white border border-gray-200 rounded-lg text-center font-bold text-gray-800"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={isDayUse}
                                            onChange={e => setIsDayUse(e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Day Use (Early/Late Slot)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={isComplimentary}
                                            onChange={e => setIsComplimentary(e.target.checked)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Complimentary (House / GM)</span>
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500 font-semibold">Source:</span>
                                        <select
                                            value={businessSource}
                                            onChange={e => setBusinessSource(e.target.value)}
                                            className="h-7 px-2 border border-gray-200 rounded-lg bg-white outline-none font-medium"
                                        >
                                            <option value="Direct">Direct Hotel</option>
                                            <option value="OTA">OTA (Booking.com, Agoda)</option>
                                            <option value="Corporate">Corporate Account</option>
                                            <option value="Travel Agent">Travel Agent</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500 font-semibold">Agent:</span>
                                        <input
                                            type="text"
                                            value={businessAgent}
                                            onChange={e => setBusinessAgent(e.target.value)}
                                            placeholder="Agent / Channel"
                                            className="h-7 w-28 px-2 border border-gray-200 rounded-lg bg-white outline-none font-medium text-gray-700"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500 font-semibold">Room No:</span>
                                        <input
                                            type="text"
                                            value={selectedRoomNumber}
                                            onChange={e => setSelectedRoomNumber(e.target.value)}
                                            placeholder="Room #"
                                            className="h-7 w-20 px-2 border border-gray-200 rounded-lg bg-white outline-none font-bold text-blue-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Room Type Selector Cards */}
                            <div className="space-y-2 pt-2">
                                <span className="font-bold text-gray-900 block text-xs uppercase tracking-wider">
                                    Select Room Category & Best Available Rate (BAR)
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {roomTypes.map(rt => {
                                        const isSelected = selectedRoomType === rt.name;
                                        return (
                                            <div
                                                key={rt.name}
                                                onClick={() => {
                                                    setSelectedRoomType(rt.name);
                                                }}
                                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${isSelected ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-gray-900 text-sm">{rt.name}</h4>
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                                                {rt.tag}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                                                            <span>Max: {rt.maxGuests} Guests</span>
                                                            <span>•</span>
                                                            <span className="text-emerald-700 font-semibold">{rt.available} Rooms Vacant</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-blue-700">৳ {rt.rate.toLocaleString()}</div>
                                                        <span className="text-[10px] text-gray-400">/ night</span>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-gray-100 text-[10.5px] text-gray-600">
                                                    {rt.inclusions}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: GUEST INFORMATION & PREFERENCES */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Title</label>
                                    <select
                                        value={salutation}
                                        onChange={e => setSalutation(e.target.value)}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        <option value="Mr.">Mr.</option>
                                        <option value="Mrs.">Mrs.</option>
                                        <option value="Ms.">Ms.</option>
                                        <option value="Dr.">Dr.</option>
                                        <option value="Prof.">Prof.</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">First Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                        placeholder="e.g. Tariqul"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Last Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                        placeholder="e.g. Islam"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">VIP Status</label>
                                    <select
                                        value={vipLevel}
                                        onChange={e => setVipLevel(e.target.value)}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg outline-none bg-white font-semibold text-amber-700"
                                    >
                                        <option value="None">Standard Guest</option>
                                        <option value="VIP-1">VIP 1 (Corporate CXO)</option>
                                        <option value="VIP-2">VIP 2 (Diplomat / Celebrity)</option>
                                        <option value="VIP-GM">GM Special Welcome</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Mobile Phone *</label>
                                    <input
                                        type="text"
                                        value={mobile}
                                        onChange={e => setMobile(e.target.value)}
                                        placeholder="+880 1711-xxxxxx"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="guest@company.com"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Purpose of Visit</label>
                                    <select
                                        value={purposeOfVisit}
                                        onChange={e => setPurposeOfVisit(e.target.value)}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg outline-none bg-white"
                                    >
                                        <option value="Business">Business / Conference</option>
                                        <option value="Leisure">Holiday & Leisure</option>
                                        <option value="Transit">Airport Transit</option>
                                        <option value="Family">Family Vacation</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Nationality / Country</label>
                                    <input
                                        type="text"
                                        value={country}
                                        onChange={e => setCountry(e.target.value)}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">City</label>
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={e => setCity(e.target.value)}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Residential Address</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        placeholder="Street, District"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                            </div>

                            {/* Preference Tabs */}
                            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2">
                                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                                    {(['Guest', 'Billing', 'Corporate'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActivePrefTab(tab)}
                                            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${activePrefTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                                        >
                                            {tab} Preferences
                                        </button>
                                    ))}
                                </div>

                                {activePrefTab === 'Guest' && (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="font-semibold text-gray-700">Special Guest Notes & Housekeeping Requests</label>
                                        <textarea
                                            rows={2}
                                            value={specialRequests}
                                            onChange={e => setSpecialRequests(e.target.value)}
                                            placeholder="e.g. Non-smoking floor preferred, extra foam pillows, quiet corner room away from elevator."
                                            className="w-full p-2 border border-gray-200 rounded-lg bg-white outline-none text-xs"
                                        />
                                    </div>
                                )}

                                {activePrefTab === 'Billing' && (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="font-semibold text-gray-700">Folio Routing & Billing Instructions</label>
                                        <input
                                            type="text"
                                            value={billingInstruction}
                                            onChange={e => setBillingInstruction(e.target.value)}
                                            placeholder="e.g. Room & Tax to Company City Ledger, Extras to Guest Credit Card"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs"
                                        />
                                    </div>
                                )}

                                {activePrefTab === 'Corporate' && (
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">Company Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Grameenphone / Unilever"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">Corporate Tax / BIN Number</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. BIN-002938172"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PAYMENTS, KEYPAD & FOLIO SUMMARY */}
                    {step === 3 && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                            {/* Left Side: Payment Method & Calculator */}
                            <div className="md:col-span-7 space-y-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                                    <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <CreditCard size={14} className="text-blue-600" />
                                        <span>Payment Method & Initial Deposit</span>
                                    </h4>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">Payment Channel</label>
                                            <select
                                                value={paymentMethod}
                                                onChange={e => setPaymentMethod(e.target.value as any)}
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-medium"
                                            >
                                                <option value="Cash">Cash at Desk</option>
                                                <option value="Credit Card">Credit / Debit Card</option>
                                                <option value="bKash Merchant">bKash Merchant Gateway</option>
                                                <option value="Bank Transfer">Direct Bank Transfer</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">Deposit Paid (BDT ৳)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={paidAmount}
                                                onChange={e => setPaidAmount(Number(e.target.value))}
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-bold text-emerald-700 text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Discount override */}
                                    <div className="flex items-center gap-3 pt-1">
                                        <label className="text-gray-600 font-medium">Discount / Allowance (BDT):</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={discountAmount}
                                            onChange={e => setDiscountAmount(Number(e.target.value))}
                                            className="h-7 w-28 px-2 border border-gray-200 rounded-md bg-white font-bold"
                                        />
                                    </div>
                                </div>

                                {/* Numeric Keypad Helper */}
                                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-gray-500">Quick Keypad Input</span>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('FULL')}
                                                className="h-6 px-2 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200"
                                            >
                                                Pay Full
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('C')}
                                                className="h-6 px-2 text-[10px] font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1.5">
                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', '500'].map(key => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => handleKeypadPress(key)}
                                                className="h-9 font-bold text-sm bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg border border-gray-200 text-gray-800 transition-colors"
                                            >
                                                {key}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Folio Breakdown Box */}
                            <div className="md:col-span-5 flex flex-col justify-between bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 rounded-xl border border-gray-200">
                                <div className="space-y-3">
                                    <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider border-b border-gray-200 pb-2">
                                        Folio Settlement Summary
                                    </h4>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between text-gray-600">
                                            <span>Room Category:</span>
                                            <span className="font-semibold text-gray-900">{selectedRoomType}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                            <span>Assigned Room #:</span>
                                            <span className="font-mono font-bold text-blue-700 bg-white px-1.5 py-0.2 rounded border border-gray-200">
                                                {selectedRoomNumber}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                            <span>Stay Duration:</span>
                                            <span>{nights} Nights ({checkIn} → {checkOut})</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                            <span>Gross Room Tariff:</span>
                                            <span className="font-bold text-gray-900">৳ {(currentRoomObj.rate * nights * roomCount).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                            <span>Rebate / Discount:</span>
                                            <span className="font-semibold text-rose-600">- ৳ {discountAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600 pt-2 border-t border-gray-200">
                                            <span className="font-bold text-gray-800">Net Payable:</span>
                                            <span className="font-bold text-gray-900 text-sm">৳ {computedTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-700 font-semibold">
                                            <span>Deposit Paid Today:</span>
                                            <span>৳ {paidAmount.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-white rounded-xl border-2 border-dashed border-blue-200 text-center">
                                        <span className="text-[10px] text-gray-500 uppercase font-semibold">Balance Due Upon Checkout</span>
                                        <div className="text-xl font-black text-rose-600 mt-0.5">
                                            ৳ {computedDue.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-[10.5px] text-gray-400 mt-3 text-center">
                                    All charges comply with USALI Folio GL-4001 and NBR 15% VAT / 10% SC.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/80">
                    <div>
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep((step - 1) as any)}
                                className="h-8 px-3.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer"
                            >
                                <ArrowLeft size={14} />
                                <span>Previous Step</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => setStep((step + 1) as any)}
                                className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                                <span>Next Step</span>
                                <ArrowRight size={14} />
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleFinalizeBooking('hold')}
                                    className="h-8 px-3 border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                    <Clock size={13} />
                                    <span>Hold Till (Tentative)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFinalizeBooking('reserve')}
                                    className="h-8 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                                >
                                    <span>Reserve Confirmed</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFinalizeBooking('checkin')}
                                    className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                                >
                                    <Check size={14} />
                                    <span>Instant Check-In</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddReservationModal;
