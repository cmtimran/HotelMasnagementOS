import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Users,
    Edit3,
    Calendar,
    ChevronDown,
    Calculator,
    DollarSign,
    CreditCard,
    Wallet,
    Layers,
    Home,
    Printer
} from 'lucide-react';

export interface AmendBookingData {
    id: string;
    reservationNumber: string;
    guestName: string;
    roomNumber: string;
    roomType?: string;
    ratePlan?: string;
    arrivalDate: string;
    departureDate: string;
    nights: number;
    avgDailyRate?: number;
    status: string;
}

interface AmendStayModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: AmendBookingData | null;
    initialTargetDeparture?: string;
    initialTargetNights?: number;
    onSave: (bookingId: string, newDeparture: string, newNights: number) => void;
}

export const AmendStayModal: React.FC<AmendStayModalProps> = ({
    isOpen,
    onClose,
    booking,
    initialTargetDeparture,
    initialTargetNights,
    onSave
}) => {
    if (!isOpen || !booking) return null;

    // Local form state
    const [roomSelected, setRoomSelected] = useState(true);
    const [departureDate, setDepartureDate] = useState<string>(() => {
        return initialTargetDeparture || booking.departureDate;
    });
    const [nights, setNights] = useState<number>(() => {
        return initialTargetNights || booking.nights;
    });

    // Update whenever booking or target inputs change
    useEffect(() => {
        if (booking) {
            setDepartureDate(initialTargetDeparture || booking.departureDate);
            setNights(initialTargetNights || booking.nights);
            setRoomSelected(true);
        }
    }, [booking, initialTargetDeparture, initialTargetNights]);

    // When departure changes, recompute nights
    const handleDepartureChange = (newDep: string) => {
        setDepartureDate(newDep);
        if (!booking?.arrivalDate) return;
        const start = new Date(booking.arrivalDate);
        const end = new Date(newDep);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        setNights(diff > 0 ? diff : 1);
    };

    // When nights change, recompute departure
    const handleNightsChange = (newNights: number) => {
        const n = Math.max(1, newNights);
        setNights(n);
        if (!booking?.arrivalDate) return;
        const start = new Date(booking.arrivalDate);
        start.setDate(start.getDate() + n);
        setDepartureDate(start.toISOString().split('T')[0]);
    };

    const handleSave = () => {
        onSave(booking.id, departureDate, nights);
        onClose();
    };

    const dailyRate = booking.avgDailyRate || 3000;
    const totalAmount = nights * dailyRate;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-300 w-full max-w-[940px] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
                {/* 1. White Top Header Bar */}
                <div className="bg-white px-5 py-3 border-b border-gray-200 flex items-center justify-between select-none">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                            <Users size={16} />
                        </div>
                        <span className="font-extrabold text-gray-900 text-sm tracking-wider uppercase font-sans">
                            {booking.guestName}
                        </span>
                    </div>
                </div>

                {/* 2. Modal Body with Deep Blue Background */}
                <div className="bg-[#103592] text-white p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto select-none">
                    {/* Left Column (Overview & Financial Cards) */}
                    <div className="lg:col-span-7 space-y-3">
                        {/* Top Action Pills Toolbar */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="px-3.5 py-1.5 bg-white hover:bg-gray-100 text-[#103592] rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                                <Edit3 size={13} className="text-[#103592]" />
                                <span>Edit</span>
                            </button>
                            <button
                                type="button"
                                className="px-3.5 py-1.5 bg-white hover:bg-gray-100 text-[#103592] rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                                <Calendar size={13} className="text-[#103592]" />
                                <span>Amend Stay</span>
                                <ChevronDown size={13} className="text-[#103592]" />
                            </button>
                            <button
                                type="button"
                                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-[#103592] rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                                <span>select</span>
                                <ChevronDown size={13} className="text-[#103592]" />
                            </button>
                        </div>

                        {/* Row 1: Reservation # & Status */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/30 text-blue-200 flex items-center justify-center font-bold text-sm">
                                    #
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                                        Reservation #
                                    </div>
                                    <div className="text-xs font-bold text-white truncate font-mono">
                                        {booking.reservationNumber}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/30 text-amber-200 flex items-center justify-center">
                                    <Layers size={16} />
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                                        Status
                                    </div>
                                    <div className="mt-0.5">
                                        <span className="bg-white text-emerald-600 font-black text-[10.5px] px-2 py-0.5 rounded shadow-2xs uppercase">
                                            {booking.status || 'CONFIRMED'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Arrival, Nights, Departure */}
                        <div className="grid grid-cols-3 gap-2.5">
                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={14} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9.5px] uppercase font-bold text-blue-200">ARRIVAL</div>
                                    <div className="text-xs font-bold text-white truncate">{booking.arrivalDate}</div>
                                    <div className="text-[9px] text-blue-200">🕒 16:00:00</div>
                                </div>
                            </div>

                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
                                <div className="text-[9.5px] uppercase font-bold text-blue-200">NIGHTS</div>
                                <div className="text-xl font-extrabold text-white font-mono leading-tight">{nights}</div>
                            </div>

                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-rose-500/30 text-rose-200 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={14} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9.5px] uppercase font-bold text-blue-200">DEPARTURE</div>
                                    <div className="text-xs font-bold text-white truncate">{departureDate}</div>
                                    <div className="text-[9px] text-blue-200">🕒 12:00:00</div>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Room Details & Rate Plan */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/30 text-indigo-200 flex items-center justify-center flex-shrink-0">
                                    <Home size={16} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                                        Room Details
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">
                                        {booking.roomNumber} ({booking.roomType || 'Winter Rate Plan'})
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
                                    <Printer size={16} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                                        Rate Plan
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">
                                        {booking.ratePlan || 'Summer Vacation'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 4: Guests & Avg Daily Rate */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/30 text-cyan-200 flex items-center justify-center flex-shrink-0">
                                    <Users size={16} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                                        Guests (Pax)
                                    </div>
                                    <div className="text-xs font-bold text-white">
                                        2 Adults, 1 Child
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                    <DollarSign size={16} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                                        Avg Daily Rate
                                    </div>
                                    <div className="text-xs font-bold text-white font-mono">
                                        {dailyRate.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 5: Financial Overview Card */}
                        <div className="bg-[#183d9e]/90 border border-blue-400/20 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-blue-200">
                                    <div className="w-5 h-5 rounded bg-blue-500/30 text-blue-200 flex items-center justify-center">
                                        <Calculator size={12} />
                                    </div>
                                    <span>Room Total Amount</span>
                                </div>
                                <span className="font-mono font-bold text-white">{totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-blue-200">
                                    <div className="w-5 h-5 rounded bg-rose-500/30 text-rose-200 flex items-center justify-center">
                                        <DollarSign size={12} />
                                    </div>
                                    <span>Room Discount</span>
                                </div>
                                <span className="font-mono font-bold text-rose-300">0.00</span>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 text-blue-200">
                                    <div className="w-5 h-5 rounded bg-emerald-500/30 text-emerald-200 flex items-center justify-center">
                                        <CreditCard size={12} />
                                    </div>
                                    <span>Room Paid Amount</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-300">0.00</span>
                            </div>

                            <div className="pt-2 border-t border-blue-400/20 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <div className="w-6 h-6 rounded bg-emerald-500/30 text-emerald-400 flex items-center justify-center">
                                        <Wallet size={14} />
                                    </div>
                                    <span>Room Net Balance</span>
                                </div>
                                <span className="font-mono font-black text-emerald-400 text-base">
                                    {totalAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Amend Stay Form Panel) */}
                    <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                        <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-blue-400/20 pb-2.5">
                                <h2 className="text-base font-bold text-white">Amend Stay</h2>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1 text-blue-200 hover:text-white rounded transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Rooms Selection */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-white">
                                    <span>Rooms</span>
                                    <button
                                        type="button"
                                        onClick={() => setRoomSelected(!roomSelected)}
                                        className="text-[11px] px-2.5 py-0.5 border border-white/40 hover:bg-white/10 rounded font-medium text-white transition-colors cursor-pointer"
                                    >
                                        {roomSelected ? 'Unselect All' : 'Select All'}
                                    </button>
                                </div>

                                <div className="bg-[#1b43aa]/70 border border-blue-400/20 rounded-lg p-3 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={roomSelected}
                                        onChange={e => setRoomSelected(e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600 bg-white cursor-pointer accent-blue-500"
                                    />
                                    <span className="text-xs font-bold text-white font-mono">
                                        {booking.roomNumber} - {booking.reservationNumber}
                                    </span>
                                </div>
                            </div>

                            {/* Arrival & Departure Inputs */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-semibold text-white">Arrival:</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={booking.arrivalDate}
                                            disabled
                                            className="w-full h-8 px-2.5 border border-blue-400/30 rounded text-xs bg-[#153a8f] text-gray-200 cursor-not-allowed outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-semibold text-white">Departure:</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={departureDate}
                                            onChange={e => handleDepartureChange(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Nights Input */}
                            <div className="flex flex-col gap-1.5 w-1/2">
                                <label className="text-[11px] font-semibold text-white">Nights:</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={nights}
                                    onChange={e => handleNightsChange(Number(e.target.value))}
                                    className="w-full h-8 px-2.5 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                        </div>

                        {/* Bottom Action Buttons */}
                        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-blue-400/20">
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-8.5 px-4 bg-white hover:bg-gray-100 text-[#103592] font-bold rounded-lg text-xs cursor-pointer transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="h-8.5 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
                            >
                                <Edit3 size={13} />
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AmendStayModal;
