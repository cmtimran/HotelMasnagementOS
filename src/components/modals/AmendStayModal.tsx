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
    Printer,
    Settings,
    MoveHorizontal,
    CheckSquare,
    Receipt,
    Printer as PrintIcon,
    AlertCircle
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
    onRoomMove?: (booking: AmendBookingData) => void;
    onEdit?: (booking: AmendBookingData) => void;
}

export const AmendStayModal: React.FC<AmendStayModalProps> = ({
    isOpen,
    onClose,
    booking,
    initialTargetDeparture,
    initialTargetNights,
    onSave,
    onRoomMove,
    onEdit
}) => {
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);

    // Local form state
    const [roomSelected, setRoomSelected] = useState(true);
    const [departureDate, setDepartureDate] = useState<string>(() => {
        return initialTargetDeparture || booking?.departureDate || '';
    });
    const [nights, setNights] = useState<number>(() => {
        return initialTargetNights || booking?.nights || 1;
    });

    // Update whenever booking or target inputs change
    useEffect(() => {
        if (booking) {
            setDepartureDate(initialTargetDeparture || booking.departureDate);
            setNights(initialTargetNights || booking.nights);
            setRoomSelected(true);
        }
    }, [booking, initialTargetDeparture, initialTargetNights]);

    if (!isOpen || !booking) return null;

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
        <div className="fixed inset-0 z-[99999] overflow-hidden select-none font-sans">
            {/* Backdrop Overlay covering remaining Stay View area */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Right-Side Docked Drawer - Exact 2-Column Layout */}
            <div className="fixed top-0 bottom-0 right-0 w-full md:w-[62%] lg:w-[58%] min-w-[700px] max-w-[960px] bg-[#0e3592] text-white shadow-2xl flex flex-col border-l border-blue-900 animate-in slide-in-from-right duration-200 z-[100000]">
                {/* 1. White Top Header Bar with Edit & Options Actions */}
                <div className="px-3.5 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors cursor-pointer flex-shrink-0"
                            title="Close"
                        >
                            <X size={17} />
                        </button>
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold flex-shrink-0">
                            <Users size={14} />
                        </div>
                        <span className="font-extrabold text-gray-900 text-sm tracking-wide uppercase truncate font-sans">
                            {booking.guestName}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[9.5px] px-2 py-0.5 rounded uppercase shadow-2xs ml-1">
                            {booking.status || 'CONFIRMED'}
                        </span>
                    </div>

                    {/* Right Action Buttons in Header */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (onEdit) onEdit(booking);
                            }}
                            className="h-7 px-2.5 bg-white hover:bg-gray-50 text-[#0e3592] border border-blue-300/80 rounded text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Edit3 size={11} className="text-[#0e3592]" />
                            <span>Edit</span>
                        </button>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                                className="h-7 px-2.5 bg-white hover:bg-gray-50 text-[#0e3592] border border-blue-300/80 rounded text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                                <Settings size={11} className="text-[#0e3592]" />
                                <span>Options</span>
                                <ChevronDown size={11} className={`transition-transform duration-200 ${isOptionsOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isOptionsOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-lg shadow-2xl border border-gray-200 py-1.5 z-[100002] text-gray-800 animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOptionsOpen(false);
                                            if (onRoomMove) onRoomMove(booking);
                                        }}
                                        className="w-full px-3 py-1.5 text-left text-xs font-bold hover:bg-blue-50 text-[#0e3592] flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                        <MoveHorizontal size={13} className="text-blue-600" />
                                        <span>Room Move</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsOptionsOpen(false)}
                                        className="w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-gray-50 text-gray-700 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                        <CheckSquare size={13} className="text-emerald-600" />
                                        <span>Check In / Out</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsOptionsOpen(false)}
                                        className="w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-gray-50 text-gray-700 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                        <Receipt size={13} className="text-purple-600" />
                                        <span>Folio & Billing</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsOptionsOpen(false)}
                                        className="w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-gray-50 text-gray-700 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                        <PrintIcon size={13} className="text-gray-600" />
                                        <span>Registration Card</span>
                                    </button>
                                    <div className="h-px bg-gray-100 my-1" />
                                    <button
                                        type="button"
                                        onClick={() => setIsOptionsOpen(false)}
                                        className="w-full px-3 py-1.5 text-left text-xs font-medium hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                        <AlertCircle size={13} className="text-rose-600" />
                                        <span>Cancel Reservation</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Drawer Body: 2 Columns Side-by-Side */}
                <div className="flex-1 overflow-y-auto p-3.5 grid grid-cols-12 gap-3.5 bg-[#0e3592]">
                    {/* LEFT COLUMN (~57% width): Overview Cards & Financial Card */}
                    <div className="col-span-7 flex flex-col gap-2">
                        {/* Row 1: Reservation # & Status */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-blue-500/30 text-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                    #
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
                                        Reservation #
                                    </div>
                                    <div className="text-xs font-bold text-white truncate font-mono">
                                        {booking.reservationNumber}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
                                    <Layers size={13} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
                                        Status
                                    </div>
                                    <div className="mt-0.5">
                                        <span className="bg-white text-emerald-600 font-black text-[9.5px] px-2 py-0.2 rounded shadow-2xs uppercase">
                                            {booking.status || 'CONFIRMED'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Arrival, Nights, Departure */}
                        <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={12} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8.5px] uppercase font-bold text-blue-200">ARRIVAL</div>
                                    <div className="text-[11.5px] font-bold text-white truncate">{booking.arrivalDate}</div>
                                    <div className="text-[8.5px] text-blue-200">🕒 16:00:00</div>
                                </div>
                            </div>

                            <div className="col-span-2 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-2xs">
                                <div className="text-[8px] uppercase font-bold text-blue-200">NIGHTS</div>
                                <div className="text-base font-black text-white font-mono leading-none">{nights}</div>
                            </div>

                            <div className="col-span-5 bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-rose-500/30 text-rose-200 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={12} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[8.5px] uppercase font-bold text-blue-200">DEPARTURE</div>
                                    <div className="text-[11.5px] font-bold text-white truncate">{departureDate}</div>
                                    <div className="text-[8.5px] text-blue-200">🕒 12:00:00</div>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Room Details & Rate Plan */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-indigo-500/30 text-indigo-200 flex items-center justify-center flex-shrink-0">
                                    <Home size={13} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
                                        Room Details
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">
                                        {booking.roomNumber} ({booking.roomType || 'Winter Rate Plan'})
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
                                    <Printer size={13} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
                                        Rate Plan
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">
                                        {booking.ratePlan || 'Summer Vacation'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 4: Guests & Avg Daily Rate */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-cyan-500/30 text-cyan-200 flex items-center justify-center flex-shrink-0">
                                    <Users size={13} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
                                        Guests (Pax)
                                    </div>
                                    <div className="text-xs font-bold text-white truncate">
                                        2 Adults, 1 Child
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                                <div className="w-6 h-6 rounded bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                    <DollarSign size={13} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9px] uppercase font-bold text-blue-200 tracking-wider">
                                        Avg Daily Rate
                                    </div>
                                    <div className="text-xs font-bold text-white font-mono">
                                        {dailyRate.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Overview Card */}
                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 space-y-1.5 text-xs shadow-2xs">
                            <div className="flex items-center justify-between text-blue-100 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-blue-500/30 flex items-center justify-center text-blue-200">
                                        <Calculator size={11} />
                                    </div>
                                    <span>Room Total Amount</span>
                                </div>
                                <span className="font-mono font-bold text-white">{totalAmount.toFixed(2)}</span>
                            </div>

                            <div className="flex items-center justify-between text-blue-100 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-rose-500/30 flex items-center justify-center text-rose-300">
                                        <DollarSign size={11} />
                                    </div>
                                    <span>Room Discount</span>
                                </div>
                                <span className="font-mono font-bold text-rose-300">0.00</span>
                            </div>

                            <div className="flex items-center justify-between text-blue-100 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-300">
                                        <CreditCard size={11} />
                                    </div>
                                    <span>Room Paid Amount</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-300">0.00</span>
                            </div>
                        </div>

                        {/* Separate Room Net Balance Card */}
                        <div className="bg-[#1942aa]/80 border border-blue-400/20 rounded-xl p-2.5 flex items-center justify-between font-bold shadow-2xs">
                            <div className="flex items-center gap-2 text-white">
                                <div className="w-5 h-5 rounded bg-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <Wallet size={12} />
                                </div>
                                <span className="text-xs">Room Net Balance</span>
                            </div>
                            <span className="font-mono font-black text-emerald-400 text-sm">
                                {totalAmount.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (~43% width): Amend Stay Form, Date Controls & Buttons */}
                    <div className="col-span-5 flex flex-col justify-between space-y-3">
                        <div className="space-y-2.5">
                            {/* Header Row */}
                            <div className="flex items-center justify-between border-b border-blue-400/20 pb-2">
                                <h2 className="text-sm font-bold text-white">Amend Stay</h2>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1 text-blue-200 hover:text-white rounded transition-colors cursor-pointer"
                                    title="Close"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Rooms Selection */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-white">
                                    <span>Rooms</span>
                                    <button
                                        type="button"
                                        onClick={() => setRoomSelected(!roomSelected)}
                                        className="text-[10px] px-2 py-0.5 border border-white/40 hover:bg-white/10 rounded font-medium text-white transition-colors cursor-pointer"
                                    >
                                        {roomSelected ? 'Unselect All' : 'Select All'}
                                    </button>
                                </div>

                                <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-lg p-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={roomSelected}
                                        onChange={e => setRoomSelected(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-blue-600 bg-white cursor-pointer accent-blue-500"
                                    />
                                    <span className="text-xs font-bold text-white font-mono truncate">
                                        {booking.roomNumber} - {booking.reservationNumber}
                                    </span>
                                </div>
                            </div>

                            {/* Arrival & Departure Inputs */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-blue-100">Arrival:</label>
                                    <input
                                        type="date"
                                        value={booking.arrivalDate}
                                        disabled
                                        className="w-full h-7 px-2 border border-blue-400/30 rounded text-[11px] bg-[#122e75] text-gray-300 cursor-not-allowed outline-none font-medium"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-white">Departure:</label>
                                    <input
                                        type="date"
                                        value={departureDate}
                                        onChange={e => handleDepartureChange(e.target.value)}
                                        className="w-full h-7 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {/* Nights Input */}
                            <div className="flex flex-col gap-1 w-1/2">
                                <label className="text-[10px] font-semibold text-white">Nights:</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={nights}
                                    onChange={e => handleNightsChange(Number(e.target.value))}
                                    className="w-full h-7 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                        </div>

                        {/* Bottom Action Buttons (Pinned Right) */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-blue-400/20">
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-7.5 px-3.5 bg-white hover:bg-gray-100 text-[#0e3592] font-bold rounded text-xs cursor-pointer transition-colors shadow-2xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="h-7.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
                            >
                                <Edit3 size={12} />
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
