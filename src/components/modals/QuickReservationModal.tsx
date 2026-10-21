import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Trash2,
    X,
    Building2
} from 'lucide-react';
import { StayPeriodPicker, getSystemDateISO, getNextDayISO } from '../common/StayPeriodPicker';
import { ChildAgeSelector } from '../common/ChildAgeSelector';

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


    // Calculate financials
    const nightMultiplier = dayUse ? 1 : Math.max(1, nights);
    const totalAmount = roomsList.reduce((acc, r) => acc + (r.rate * r.noOfRooms * nightMultiplier), 0);
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
        setRoomsList([
            ...roomsList,
            {
                id: nextId,
                roomType: 'Deluxe Double',
                noOfRooms: 1,
                ratePlan: 'Standard Rate',
                roomNumber: '102',
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
            <div className="bg-white w-[96%] max-w-[840px] max-h-[88vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
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

                            {/* Rooms Table */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-[11px]">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                                                <th className="py-2 px-3">Room Type</th>
                                                <th className="py-2 px-2 text-center">Qty</th>
                                                <th className="py-2 px-2.5">Rate Plan</th>
                                                <th className="py-2 px-2.5">Room No.</th>
                                                <th className="py-2 px-2 text-center">Adult</th>
                                                <th className="py-2 px-2 text-center">Child</th>
                                                <th className="py-2 px-2.5 text-right">Rate</th>
                                                <th className="py-2 px-2.5 text-right">Total</th>
                                                <th className="py-2 px-2 text-center">Del</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {roomsList.map(item => {
                                                const lineTotal = item.rate * item.noOfRooms * (dayUse ? 1 : Math.max(1, nights));
                                                return (
                                                    <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                                                        <td className="py-1.5 px-3">
                                                            <select
                                                                value={item.roomType}
                                                                onChange={e => handleRoomFieldChange(item.id, 'roomType', e.target.value)}
                                                                className="w-32 h-7 px-1.5 border border-slate-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                            >
                                                                <option value="Winter Rate Plan">Winter Rate Plan</option>
                                                                <option value="Deluxe Double">Deluxe Double</option>
                                                                <option value="Executive Suite">Executive Suite</option>
                                                                <option value="Standard Single">Standard Single</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-1.5 px-2 text-center">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={item.noOfRooms}
                                                                onChange={e => handleRoomFieldChange(item.id, 'noOfRooms', parseInt(e.target.value) || 1)}
                                                                className="w-10 h-7 px-1 border border-slate-200 rounded text-[11px] text-center font-bold outline-none"
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-2.5">
                                                            <select
                                                                value={item.ratePlan}
                                                                onChange={e => handleRoomFieldChange(item.id, 'ratePlan', e.target.value)}
                                                                className="w-32 h-7 px-1.5 border border-slate-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                            >
                                                                <option value="Summer Vacation">Summer Vacation</option>
                                                                <option value="Standard EP">Standard EP (Room Only)</option>
                                                                <option value="Corporate CP">Corporate CP (Bed & Breakfast)</option>
                                                            </select>
                                                        </td>
                                                        <td className="py-1.5 px-2.5">
                                                            <input
                                                                type="text"
                                                                value={item.roomNumber}
                                                                onChange={e => handleRoomFieldChange(item.id, 'roomNumber', e.target.value)}
                                                                className="w-20 h-7 px-1.5 border border-slate-200 rounded text-[11px] font-mono font-bold text-blue-700 outline-none text-center"
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-2 text-center">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={item.adults}
                                                                onChange={e => handleRoomFieldChange(item.id, 'adults', parseInt(e.target.value) || 1)}
                                                                className="w-10 h-7 px-1 border border-slate-200 rounded text-[11px] text-center outline-none"
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-2 text-center">
                                                            <ChildAgeSelector
                                                                childrenCount={item.children}
                                                                childrenAges={item.childrenAges}
                                                                onChange={(count, ages) => {
                                                                    setRoomsList(prev => prev.map(r => r.id === item.id ? { ...r, children: count, childrenAges: ages } : r));
                                                                }}
                                                                compact
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-2.5 text-right">
                                                            <input
                                                                type="number"
                                                                value={item.rate}
                                                                onChange={e => handleRoomFieldChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                                                className="w-20 h-7 px-1.5 border border-slate-200 rounded text-[11px] font-semibold text-right outline-none"
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-2.5 text-right font-bold text-slate-800">
                                                            ৳{lineTotal.toLocaleString()}
                                                        </td>
                                                        <td className="py-1.5 px-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveRoom(item.id)}
                                                                disabled={roomsList.length <= 1}
                                                                className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1 transition-colors"
                                                                title="Delete Room Row"
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
                                        <div className="divide-y divide-slate-200/80 text-[11px]">
                                            <div className="flex justify-between py-1.5 text-slate-600">
                                                <span>Subtotal ({nights}N)</span>
                                                <span className="font-semibold text-slate-900">৳{totalAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between py-1.5 text-slate-600">
                                                <span>Discount</span>
                                                <span className="font-semibold text-emerald-700">-৳{discountedAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between py-1.5 text-slate-600">
                                                <span>Net Payable</span>
                                                <span className="font-bold text-slate-900">৳{netTotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between py-1.5 text-slate-600">
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
        </div>
    );
};

export default QuickReservationModal;
