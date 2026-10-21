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
        <div className="fixed inset-0 z-[99999] overflow-hidden select-none font-sans">
            {/* Backdrop Overlay */}
            <div
                className="fixed inset-0 bg-black/45 backdrop-blur-[1.5px] transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Right-Side Compact Drawer (Full Viewport Height top-0 bottom-0, 0px gap) */}
            <div className="fixed top-0 bottom-0 right-0 w-full sm:w-[390px] bg-[#103592] text-white shadow-2xl flex flex-col border-l border-blue-900 animate-in slide-in-from-right duration-200 z-[100000]">
                {/* 1. White Header Bar */}
                <div className="px-3.5 py-2.5 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900 transition-colors cursor-pointer flex-shrink-0"
                            title="Close"
                        >
                            <X size={16} />
                        </button>
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold flex-shrink-0">
                            <Users size={13} />
                        </div>
                        <span className="font-extrabold text-gray-900 text-xs tracking-wider uppercase truncate">
                            {booking.guestName}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[9.5px] px-2 py-0.5 rounded uppercase">
                            {booking.status || 'CONFIRMED'}
                        </span>
                    </div>
                </div>

                {/* 2. Scrollable Body Content */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                    {/* Top Action Toolbar */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#103592] rounded text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Edit3 size={11} />
                            <span>Edit</span>
                        </button>
                        <button
                            type="button"
                            className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#103592] rounded text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Calendar size={11} />
                            <span>Amend Stay</span>
                            <ChevronDown size={11} />
                        </button>
                        <button
                            type="button"
                            className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#103592] rounded text-[10.5px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                            <span>select</span>
                            <ChevronDown size={11} />
                        </button>
                    </div>

                    {/* Amend Stay Form Card (Priority 1) */}
                    <div className="bg-[#183d9e] border border-blue-400/25 rounded-xl p-3 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between border-b border-blue-400/20 pb-1.5">
                            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Calendar size={13} className="text-blue-200" />
                                <span>Amend Stay (Extend Dates)</span>
                            </h3>
                            <span className="text-[9.5px] font-bold text-blue-200 bg-blue-900/60 px-1.5 py-0.5 rounded">
                                Right Drawer
                            </span>
                        </div>

                        {/* Room Selector */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-blue-100">
                                <span>Rooms:</span>
                                <button
                                    type="button"
                                    onClick={() => setRoomSelected(!roomSelected)}
                                    className="text-[10px] px-2 py-0.2 border border-white/30 hover:bg-white/10 rounded font-medium text-white transition-colors cursor-pointer"
                                >
                                    {roomSelected ? 'Unselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={roomSelected}
                                    onChange={e => setRoomSelected(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-blue-600 bg-white cursor-pointer accent-blue-500"
                                />
                                <span className="text-xs font-bold text-white font-mono">
                                    {booking.roomNumber} - {booking.reservationNumber}
                                </span>
                            </div>
                        </div>

                        {/* Arrival & Departure Inputs */}
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-blue-100">Arrival (Check-in):</label>
                                <input
                                    type="date"
                                    value={booking.arrivalDate}
                                    disabled
                                    className="w-full h-7 px-2 border border-blue-400/30 rounded text-[11px] bg-[#122e75] text-gray-300 cursor-not-allowed outline-none font-medium"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-white">Departure (Extend):</label>
                                <input
                                    type="date"
                                    value={departureDate}
                                    onChange={e => handleDepartureChange(e.target.value)}
                                    className="w-full h-7 px-2 border border-blue-300 rounded text-[11px] bg-white text-gray-900 font-bold outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Nights Count */}
                        <div className="flex items-center justify-between pt-0.5">
                            <label className="text-[10.5px] font-semibold text-white">Nights Stay:</label>
                            <div className="w-24">
                                <input
                                    type="number"
                                    min={1}
                                    value={nights}
                                    onChange={e => handleNightsChange(Number(e.target.value))}
                                    className="w-full h-7 px-2 border border-blue-300 rounded text-xs bg-white text-gray-900 font-bold text-center outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2-Column Info Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-lg p-2 flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-blue-500/30 text-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                #
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200">Res #</div>
                                <div className="text-[11px] font-bold text-white truncate font-mono">{booking.reservationNumber}</div>
                            </div>
                        </div>

                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-lg p-2 flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-indigo-500/30 text-indigo-200 flex items-center justify-center flex-shrink-0">
                                <Home size={12} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200">Room</div>
                                <div className="text-[11px] font-bold text-white truncate">{booking.roomNumber} ({booking.roomType || 'Deluxe'})</div>
                            </div>
                        </div>

                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-lg p-2 flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-emerald-500/30 text-emerald-200 flex items-center justify-center flex-shrink-0">
                                <Calendar size={12} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200">Arrival</div>
                                <div className="text-[11px] font-bold text-white truncate">{booking.arrivalDate}</div>
                            </div>
                        </div>

                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-lg p-2 flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-rose-500/30 text-rose-200 flex items-center justify-center flex-shrink-0">
                                <Calendar size={12} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200">Departure</div>
                                <div className="text-[11px] font-bold text-white truncate">{departureDate}</div>
                            </div>
                        </div>

                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-lg p-2 flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-amber-500/30 text-amber-200 flex items-center justify-center flex-shrink-0">
                                <Printer size={12} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200">Rate Plan</div>
                                <div className="text-[11px] font-bold text-white truncate">{booking.ratePlan || 'Summer Vacation'}</div>
                            </div>
                        </div>

                        <div className="bg-[#1b43aa]/80 border border-blue-400/20 rounded-lg p-2 flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-cyan-500/30 text-cyan-200 flex items-center justify-center flex-shrink-0">
                                <Users size={12} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[9px] uppercase font-bold text-blue-200">Guests</div>
                                <div className="text-[11px] font-bold text-white truncate">2 Adults, 1 Child</div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Summary Box */}
                    <div className="bg-[#183d9e]/90 border border-blue-400/20 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-blue-100 text-[11px]">
                            <div className="flex items-center gap-1.5">
                                <Calculator size={11} className="text-blue-300" />
                                <span>Room Total Amount</span>
                            </div>
                            <span className="font-mono font-bold text-white">{totalAmount.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center justify-between text-blue-100 text-[11px]">
                            <div className="flex items-center gap-1.5">
                                <DollarSign size={11} className="text-rose-300" />
                                <span>Room Discount</span>
                            </div>
                            <span className="font-mono font-bold text-rose-300">0.00</span>
                        </div>

                        <div className="flex items-center justify-between text-blue-100 text-[11px]">
                            <div className="flex items-center gap-1.5">
                                <CreditCard size={11} className="text-emerald-300" />
                                <span>Room Paid Amount</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-300">0.00</span>
                        </div>

                        <div className="pt-1.5 border-t border-blue-400/20 flex items-center justify-between font-bold">
                            <div className="flex items-center gap-1.5 text-white">
                                <Wallet size={13} className="text-emerald-400" />
                                <span className="text-xs">Room Net Balance</span>
                            </div>
                            <span className="font-mono font-black text-emerald-400 text-sm">
                                {totalAmount.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Bottom Action Footer */}
                <div className="p-3 bg-[#0c2870] border-t border-blue-900/60 flex items-center justify-end gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-7.5 px-3.5 bg-white hover:bg-gray-100 text-[#103592] font-bold rounded text-xs transition-colors cursor-pointer shadow-2xs"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="h-7.5 px-4.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                    >
                        <Edit3 size={12} />
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AmendStayModal;
