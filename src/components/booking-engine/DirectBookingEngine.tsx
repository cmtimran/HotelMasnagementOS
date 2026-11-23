import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, Users, Bed, Coffee, ShieldCheck, 
    CheckCircle2, Printer, Phone, 
    AlertCircle, Star
} from 'lucide-react';

interface RoomType {
    id: string;
    name: string;
    code: string;
    baseRate: number;
    baseOccupancy: number;
    maxAdults: number;
    maxChildren: number;
    bedType: string;
    viewType: string;
    description: string;
    amenities: string[];
    photos: string[];
}

interface MealPlan {
    id: string;
    name: string;
    code: string;
    description: string;
    pricePerPerson: number;
    hasBreakfast: boolean;
    hasLunch: boolean;
    hasDinner: boolean;
}

interface DirectBookingEngineProps {
    propertyId?: number | string;
    onBack?: () => void;
}

export const DirectBookingEngine: React.FC<DirectBookingEngineProps> = ({
    propertyId = 1,
    onBack
}) => {
    // Dates State
    const [checkIn, setCheckIn] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    });
    const [checkOut, setCheckOut] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().split('T')[0];
    });
    const [adults, setAdults] = useState<number>(2);
    const [children, setChildren] = useState<number>(0);

    // Data States
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
    const [hotelInfo, setHotelInfo] = useState<any>({
        name: 'Grand Palace Hotel & Resort',
        address: 'Plot 14, Diplomatic Enclave, Gulshan-2, Dhaka',
        phone: '+880 2 988-5500',
        email: 'reservations@grandpalacedhaka.com',
        base_currency: 'BDT',
        star_rating: 5
    });
    const [loading, setLoading] = useState<boolean>(true);

    // Selection States
    const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
    const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);

    // Guest Info Form States
    const [guestName, setGuestName] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [specialRequests, setSpecialRequests] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('PAY_AT_HOTEL');

    // Booking Submission States
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [bookingSuccess, setBookingSuccess] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');

    // Fetch Public Booking Engine Data
    useEffect(() => {
        const loadEngineData = async () => {
            try {
                setLoading(true);
                const [propRes, roomRes, mealRes] = await Promise.all([
                    fetch(`/api/booking-engine/property-info?propertyId=${propertyId}`),
                    fetch(`/api/booking-engine/room-types?propertyId=${propertyId}`),
                    fetch(`/api/booking-engine/meal-plans?propertyId=${propertyId}`)
                ]);

                const [propData, roomData, mealData] = await Promise.all([
                    propRes.json(),
                    roomRes.json(),
                    mealRes.json()
                ]);

                if (propData.success && propData.data) setHotelInfo(propData.data);
                if (roomData.success && Array.isArray(roomData.data)) {
                    setRoomTypes(roomData.data);
                    if (roomData.data.length > 0) setSelectedRoom(roomData.data[0]);
                }
                if (mealData.success && Array.isArray(mealData.data)) {
                    setMealPlans(mealData.data);
                    if (mealData.data.length > 0) setSelectedMealPlan(mealData.data[0]);
                }
            } catch (err) {
                console.warn('Error loading public booking engine data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadEngineData();
    }, [propertyId]);

    // Financial Calculations
    const nights = useMemo(() => {
        const inD = new Date(checkIn);
        const outD = new Date(checkOut);
        const diff = outD.getTime() - inD.getTime();
        return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }, [checkIn, checkOut]);

    const financials = useMemo(() => {
        const baseRate = selectedRoom?.baseRate || 0;
        const roomTotal = baseRate * nights;
        const mealPrice = selectedMealPlan?.pricePerPerson || 0;
        const mealsTotal = mealPrice * adults * nights;
        const subtotal = roomTotal + mealsTotal;
        const serviceCharge = Math.round(subtotal * 0.10);
        const vat = Math.round((subtotal + serviceCharge) * 0.15);
        const grandTotal = subtotal + serviceCharge + vat;

        return {
            baseRate,
            roomTotal,
            mealPrice,
            mealsTotal,
            subtotal,
            serviceCharge,
            vat,
            grandTotal
        };
    }, [selectedRoom, selectedMealPlan, nights, adults]);

    // Handle Reservation Form Submit
    const handleReserve = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoom) {
            setErrorMsg('Please select a room type');
            return;
        }
        if (!guestName.trim() || !phone.trim()) {
            setErrorMsg('Please provide your name and contact phone number');
            return;
        }

        setErrorMsg('');
        setSubmitting(true);

        try {
            const res = await fetch('/api/booking-engine/reserve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Property-Id': String(propertyId)
                },
                body: JSON.stringify({
                    propertyId,
                    guestName: guestName.trim(),
                    phone: phone.trim(),
                    email: email.trim(),
                    roomTypeId: selectedRoom.id,
                    roomTypeName: selectedRoom.name,
                    checkIn,
                    checkOut,
                    adults,
                    children,
                    mealPlanCode: selectedMealPlan?.code || 'EP',
                    mealPlanPrice: selectedMealPlan?.pricePerPerson || 0,
                    specialRequests,
                    paymentMethod
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to confirm reservation');
            }

            setBookingSuccess(data);
        } catch (err: any) {
            setErrorMsg(err.message || 'Error processing reservation. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Print Confirmation Slip
    const handlePrintConfirmation = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c0d12] text-slate-800 dark:text-slate-100 font-sans pb-16">
            
            {/* Top Brand Banner */}
            <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-lg">
                            ★
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-extrabold tracking-wide text-white">
                                    {hotelInfo.name}
                                </h1>
                                <span className="flex items-center text-amber-400 text-xs">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={11} fill="currentColor" />
                                    ))}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 flex items-center gap-2">
                                <span>{hotelInfo.address}</span>
                                <span>•</span>
                                <span className="text-amber-400 font-semibold">Direct Booking Guarantee</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs transition cursor-pointer"
                            >
                                ← Back to PMS
                            </button>
                        )}
                        <a
                            href={`tel:${hotelInfo.phone}`}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold"
                        >
                            <Phone size={13} />
                            {hotelInfo.phone}
                        </a>
                    </div>
                </div>
            </header>

            {/* Confirmation Screen State */}
            {bookingSuccess ? (
                <div className="max-w-3xl mx-auto px-4 py-12 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                        
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                                <CheckCircle2 size={36} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                Reservation Confirmed!
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Thank you, <strong className="text-slate-800 dark:text-white">{bookingSuccess.guestName}</strong>. Your luxury stay is reserved and registered in our hotel system.
                            </p>
                        </div>

                        {/* Confirmation Box */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Confirmation Number</span>
                                    <span className="text-xl font-mono font-black text-amber-600 dark:text-amber-400">
                                        {bookingSuccess.confirmationNumber}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Status</span>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                        {bookingSuccess.status}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Check-In</span>
                                    <strong className="text-slate-800 dark:text-white">{bookingSuccess.checkIn}</strong>
                                    <span className="text-[10px] text-slate-400 block">From 14:00</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Check-Out</span>
                                    <strong className="text-slate-800 dark:text-white">{bookingSuccess.checkOut}</strong>
                                    <span className="text-[10px] text-slate-400 block">Until 12:00</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Room Category</span>
                                    <strong className="text-slate-800 dark:text-white">{bookingSuccess.roomType}</strong>
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono block">Room {bookingSuccess.assignedRoom}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Total Tariff</span>
                                    <strong className="text-lg font-black text-slate-900 dark:text-white">৳{bookingSuccess.totalAmount.toLocaleString()}</strong>
                                    <span className="text-[10px] text-slate-400 block">{bookingSuccess.paymentMethod}</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-2">
                            <button
                                onClick={() => {
                                    setBookingSuccess(null);
                                    setGuestName('');
                                    setPhone('');
                                    setEmail('');
                                }}
                                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                                Book Another Stay
                            </button>

                            <button
                                onClick={handlePrintConfirmation}
                                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-600/20 transition cursor-pointer"
                            >
                                <Printer size={15} />
                                Print Confirmation Voucher
                            </button>
                        </div>

                    </div>
                </div>
            ) : (
                /* Main Booking Flow */
                <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                    
                    {/* Hero Dates & Search Strip */}
                    <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Calendar size={18} className="text-amber-600 dark:text-amber-400" />
                                Select Stay Dates & Guests
                            </h2>
                            <span className="text-xs text-slate-500 font-medium">
                                Stay Duration: <strong className="text-amber-600 dark:text-amber-400 font-bold">{nights} Night{nights > 1 ? 's' : ''}</strong>
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Check-In Date
                                </label>
                                <input
                                    type="date"
                                    value={checkIn}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setCheckIn(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Check-Out Date
                                </label>
                                <input
                                    type="date"
                                    value={checkOut}
                                    min={checkIn}
                                    onChange={(e) => setCheckOut(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Adults (12+ yrs)
                                </label>
                                <select
                                    value={adults}
                                    onChange={(e) => setAdults(Number(e.target.value))}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value={1}>1 Adult</option>
                                    <option value={2}>2 Adults</option>
                                    <option value={3}>3 Adults</option>
                                    <option value={4}>4 Adults</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Children
                                </label>
                                <select
                                    value={children}
                                    onChange={(e) => setChildren(Number(e.target.value))}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value={0}>0 Children</option>
                                    <option value={1}>1 Child</option>
                                    <option value={2}>2 Children</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Left 2 Cols: Room Selection & Meal Plans */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* Step 1: Available Room Categories */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-between">
                                    <span>Available Room Categories ({roomTypes.length})</span>
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                        <ShieldCheck size={14} /> Official Best Rate
                                    </span>
                                </h3>

                                <div className="space-y-4">
                                    {loading ? (
                                        <div className="p-8 text-center bg-white dark:bg-[#16161e] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                                            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                            <p className="text-xs font-bold text-slate-500">Checking live room availability & seasonal rates...</p>
                                        </div>
                                    ) : roomTypes.length === 0 ? (
                                        <div className="p-8 text-center bg-white dark:bg-[#16161e] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                                            <AlertCircle size={28} className="text-amber-500 mx-auto" />
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No room categories currently available online.</p>
                                            <p className="text-[11px] text-slate-500">Please contact front desk directly at {hotelInfo.phone}.</p>
                                        </div>
                                    ) : (
                                        roomTypes.map((room) => {
                                        const isSelected = selectedRoom?.id === room.id;
                                        return (
                                            <div
                                                key={room.id}
                                                onClick={() => setSelectedRoom(room)}
                                                className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                                                        : 'bg-white dark:bg-[#16161e] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                                                }`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                    
                                                    {/* Room Info */}
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-base font-black text-slate-900 dark:text-white">
                                                                {room.name}
                                                            </h4>
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                                {room.viewType}
                                                            </span>
                                                        </div>

                                                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                                            {room.description}
                                                        </p>

                                                        {/* Bed & Amenities Pills */}
                                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 flex items-center gap-1">
                                                                <Bed size={12} /> {room.bedType}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                                                                <Users size={12} /> Up to {room.maxAdults} Adults
                                                            </span>
                                                            {room.amenities.slice(0, 4).map((amenity, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                                    {amenity}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Price & Select Button */}
                                                    <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 block">From / Night</span>
                                                            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                                                ৳{room.baseRate.toLocaleString()}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 block">+ Taxes & Fees</span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className={`mt-2 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-amber-600 text-white shadow-md'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            {isSelected ? (
                                                                <>
                                                                    <CheckCircle2 size={14} /> Selected
                                                                </>
                                                            ) : (
                                                                'Select Room'
                                                            )}
                                                        </button>
                                                    </div>

                                                </div>
                                            </div>
                                        );
                                    }))}
                                </div>
                            </div>

                            {/* Step 2: Meal Plans & Dining Enhancements */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Coffee size={18} className="text-amber-600 dark:text-amber-400" />
                                    Choose Meal Plan & Inclusions
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {mealPlans.map((plan) => {
                                        const isSelected = selectedMealPlan?.id === plan.id;
                                        return (
                                            <div
                                                key={plan.id}
                                                onClick={() => setSelectedMealPlan(plan)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                                                    isSelected
                                                        ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-500 ring-1 ring-amber-500 shadow-xs'
                                                        : 'bg-white dark:bg-[#16161e] border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-black text-slate-900 dark:text-white">
                                                            {plan.code}
                                                        </span>
                                                        {plan.pricePerPerson === 0 ? (
                                                            <span className="text-[10px] font-bold text-emerald-600">Included</span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                                                +৳{plan.pricePerPerson.toLocaleString()}/pax
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                        {plan.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        {plan.description}
                                                    </p>
                                                </div>

                                                <div className="pt-3">
                                                    <div className={`w-full py-1 rounded-lg text-center text-[10px] font-bold ${
                                                        isSelected ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                    }`}>
                                                        {isSelected ? 'Applied' : 'Select Plan'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>

                        {/* Right 1 Col: Reservation Summary & Guest Checkout Form */}
                        <div className="space-y-6">
                            
                            {/* Sticky Checkout Card */}
                            <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 sticky top-20">
                                
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white pb-1 border-b border-slate-100 dark:border-slate-800">
                                        Booking Summary
                                    </h3>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {nights} Night stay • {adults} Adult{adults > 1 ? 's' : ''} {children > 0 ? `• ${children} Child` : ''}
                                    </p>
                                </div>

                                {/* Room Selected Preview */}
                                {selectedRoom && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-1 text-xs">
                                        <div className="font-bold text-slate-800 dark:text-white">
                                            {selectedRoom.name}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            Plan: <strong>{selectedMealPlan?.name || 'Standard EP'}</strong>
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            Dates: <strong>{checkIn}</strong> to <strong>{checkOut}</strong>
                                        </div>
                                    </div>
                                )}

                                {/* Price Breakdown */}
                                <div className="space-y-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Room Charges ({nights} nights)</span>
                                        <span className="font-mono font-semibold">৳{financials.roomTotal.toLocaleString()}</span>
                                    </div>

                                    {financials.mealsTotal > 0 && (
                                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                            <span>Meal Plan ({selectedMealPlan?.code})</span>
                                            <span className="font-mono font-semibold">৳{financials.mealsTotal.toLocaleString()}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Service Charge (10%)</span>
                                        <span className="font-mono">৳{financials.serviceCharge.toLocaleString()}</span>
                                    </div>

                                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                        <span>Govt VAT (15%)</span>
                                        <span className="font-mono">৳{financials.vat.toLocaleString()}</span>
                                    </div>

                                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-800">
                                        <div>
                                            <span className="font-bold text-sm text-slate-900 dark:text-white block">Total Payable</span>
                                            <span className="text-[10px] text-slate-400">All Taxes & Fees Included</span>
                                        </div>
                                        <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                                            ৳{financials.grandTotal.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Guest Details Form */}
                                <form onSubmit={handleReserve} className="space-y-3 pt-2">
                                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        Guest Information
                                    </div>

                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Primary Guest Full Name *"
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                            required
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="tel"
                                            placeholder="Mobile Number *"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            required
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                        />
                                        <input
                                            type="email"
                                            placeholder="Email Address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <textarea
                                            placeholder="Special Requests (e.g. Airport Transfer, High Floor, Extra Bed)"
                                            rows={2}
                                            value={specialRequests}
                                            onChange={(e) => setSpecialRequests(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>

                                    {/* Payment Method Selector */}
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-[11px] font-bold text-slate-500 block">Payment Method</span>
                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            <label className={`p-2 rounded-xl border flex items-center gap-1.5 cursor-pointer ${
                                                paymentMethod === 'PAY_AT_HOTEL' ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold' : 'border-slate-200 text-slate-600'
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="payMethod"
                                                    value="PAY_AT_HOTEL"
                                                    checked={paymentMethod === 'PAY_AT_HOTEL'}
                                                    onChange={() => setPaymentMethod('PAY_AT_HOTEL')}
                                                    className="accent-amber-600"
                                                />
                                                <span>Pay at Hotel</span>
                                            </label>

                                            <label className={`p-2 rounded-xl border flex items-center gap-1.5 cursor-pointer ${
                                                paymentMethod === 'BKASH' ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold' : 'border-slate-200 text-slate-600'
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="payMethod"
                                                    value="BKASH"
                                                    checked={paymentMethod === 'BKASH'}
                                                    onChange={() => setPaymentMethod('BKASH')}
                                                    className="accent-amber-600"
                                                />
                                                <span>bKash / Nagad</span>
                                            </label>
                                        </div>
                                    </div>

                                    {errorMsg && (
                                        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                                            <AlertCircle size={15} className="shrink-0" />
                                            <span>{errorMsg}</span>
                                        </div>
                                    )}

                                    {/* Confirm Button */}
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                                    >
                                        {submitting ? 'Confirming Stay...' : `Confirm Reservation • ৳${financials.grandTotal.toLocaleString()}`}
                                    </button>

                                    <p className="text-[10px] text-center text-slate-400">
                                        Instant Confirmation • Free cancellation up to 48h before check-in
                                    </p>
                                </form>

                            </div>

                        </div>

                    </div>

                </main>
            )}

        </div>
    );
};

export default DirectBookingEngine;
