import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Trash2,
    X,
    Building2
} from 'lucide-react';

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
    const [checkInDate, setCheckInDate] = useState<string>('2026-07-01');
    const [nights, setNights] = useState<number>(1);
    const [checkOutDate, setCheckOutDate] = useState<string>('2026-07-02');
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
            rate: 3000
        }
    ]);

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

    // Update Checkout date when check-in or nights change
    const handleCheckInChange = (newDate: string) => {
        setCheckInDate(newDate);
        try {
            const d = new Date(newDate);
            d.setDate(d.getDate() + nights);
            setCheckOutDate(d.toISOString().split('T')[0]);
        } catch {
            // keep existing
        }
    };

    const handleNightsChange = (newNights: number) => {
        const safeNights = Math.max(1, newNights);
        setNights(safeNights);
        try {
            const d = new Date(checkInDate);
            d.setDate(d.getDate() + safeNights);
            setCheckOutDate(d.toISOString().split('T')[0]);
        } catch {
            // keep existing
        }
    };

    // Calculate financials
    const totalAmount = roomsList.reduce((acc, r) => acc + (r.rate * r.noOfRooms * nights), 0);
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 select-none animate-in fade-in duration-200">
            <div className="bg-white w-[96%] max-w-[1100px] h-[86vh] max-h-[850px] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-gray-200">
                {/* Header */}
                <div className="bg-[#3b42b5] text-white px-4 py-3 flex items-center justify-between shadow-xs">
                    <h2 className="text-base font-semibold tracking-tight m-0">Quick Reservation</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 px-4 pt-3 pb-0 bg-white border-b-2 border-[#e2e8f0]">
                    <button
                        type="button"
                        onClick={() => setActiveTab('reservation')}
                        className={`pb-2.5 text-xs font-semibold cursor-pointer relative transition-colors ${
                            activeTab === 'reservation'
                                ? 'text-[#3b82f6] border-b-2 border-[#3b82f6] -mb-[2px]'
                                : 'text-[#64748b] hover:text-gray-800'
                        }`}
                    >
                        Reservation Details
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('payment')}
                        className={`pb-2.5 text-xs font-semibold cursor-pointer relative transition-colors ${
                            activeTab === 'payment'
                                ? 'text-[#3b82f6] border-b-2 border-[#3b82f6] -mb-[2px]'
                                : 'text-[#64748b] hover:text-gray-800'
                        }`}
                    >
                        Payment Details
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-white space-y-4">
                    {activeTab === 'reservation' && (
                        <div className="space-y-4 animate-in fade-in duration-100">
                            {/* Options Row */}
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 text-xs font-medium text-[#334155] cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={dayUse}
                                        onChange={e => setDayUse(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span>Day Use</span>
                                </label>
                                <label className="flex items-center gap-2 text-xs font-medium text-[#334155] cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={taxApplicable}
                                        onChange={e => setTaxApplicable(e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span>Tax Applicable</span>
                                </label>
                            </div>

                            {/* Top 5 Grid Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-semibold text-[#334155]">
                                        Check-in Date <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            type="date"
                                            value={checkInDate}
                                            onChange={e => handleCheckInChange(e.target.value)}
                                            className="w-full h-8 pl-8 pr-2.5 border border-[#e2e8f0] rounded-md text-xs bg-white text-[#1e293b] outline-none focus:border-blue-500"
                                        />
                                        <CalendarIcon size={14} className="absolute left-2.5 text-[#94a3b8] pointer-events-none" />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-semibold text-[#334155]">Nights</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={nights}
                                        onChange={e => handleNightsChange(parseInt(e.target.value) || 1)}
                                        className="w-full h-8 px-2.5 border border-[#e2e8f0] rounded-md text-xs bg-white text-[#1e293b] text-center font-bold outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-semibold text-[#334155]">
                                        Check-out Date <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            type="date"
                                            value={checkOutDate}
                                            onChange={e => setCheckOutDate(e.target.value)}
                                            className="w-full h-8 pl-8 pr-2.5 border border-[#e2e8f0] rounded-md text-xs bg-white text-[#1e293b] outline-none focus:border-blue-500"
                                        />
                                        <CalendarIcon size={14} className="absolute left-2.5 text-[#94a3b8] pointer-events-none" />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-semibold text-[#334155]">
                                        Business Source <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={businessSource}
                                        onChange={e => setBusinessSource(e.target.value)}
                                        className="w-full h-8 px-2 border border-[#e2e8f0] rounded-md text-xs bg-white text-[#1e293b] outline-none focus:border-blue-500"
                                    >
                                        <option value="Direct">Direct</option>
                                        <option value="Booking.com">Booking.com</option>
                                        <option value="Agoda">Agoda</option>
                                        <option value="Expedia">Expedia</option>
                                        <option value="Corporate">Corporate</option>
                                        <option value="Walk-In">Walk-In</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-semibold text-[#334155]">
                                        Business Agent <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={businessAgent}
                                        onChange={e => setBusinessAgent(e.target.value)}
                                        className="w-full h-8 px-2 border border-[#e2e8f0] rounded-md text-xs bg-white text-[#1e293b] outline-none focus:border-blue-500"
                                    >
                                        <option value="Direct">Direct</option>
                                        <option value="Agent A">Agent A</option>
                                        <option value="Agent B">Agent B</option>
                                        <option value="In-House Sales">In-House Sales</option>
                                    </select>
                                </div>
                            </div>

                            {/* Rooms Table */}
                            <div className="bg-white border border-[#f1f5f9] rounded-lg overflow-x-auto shadow-2xs">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-[#f8fafc] text-[#475569] font-semibold border-b border-[#e2e8f0]">
                                            <th className="py-2.5 px-3">Room Type</th>
                                            <th className="py-2.5 px-2 text-center">No. of Rooms</th>
                                            <th className="py-2.5 px-3">
                                                Rate Type/Package <span className="text-red-500">*</span>
                                            </th>
                                            <th className="py-2.5 px-3">Room Number</th>
                                            <th className="py-2.5 px-2 text-center">Adult</th>
                                            <th className="py-2.5 px-2 text-center">Child</th>
                                            <th className="py-2.5 px-3">Rate</th>
                                            <th className="py-2.5 px-3">Total</th>
                                            <th className="py-2.5 px-2 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f1f5f9]">
                                        {roomsList.map(item => {
                                            const lineTotal = item.rate * item.noOfRooms * nights;
                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50/50">
                                                    <td className="py-2 px-3">
                                                        <select
                                                            value={item.roomType}
                                                            onChange={e => handleRoomFieldChange(item.id, 'roomType', e.target.value)}
                                                            className="w-full h-7 px-2 border border-[#cbd5e1] rounded text-xs bg-white outline-none"
                                                        >
                                                            <option value="Winter Rate Plan">Winter Rate Plan</option>
                                                            <option value="Deluxe Double">Deluxe Double</option>
                                                            <option value="Executive Suite">Executive Suite</option>
                                                            <option value="Standard Single">Standard Single</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={item.noOfRooms}
                                                            onChange={e => handleRoomFieldChange(item.id, 'noOfRooms', parseInt(e.target.value) || 1)}
                                                            className="w-12 h-7 px-1 border border-[#cbd5e1] rounded text-xs text-center outline-none"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <select
                                                            value={item.ratePlan}
                                                            onChange={e => handleRoomFieldChange(item.id, 'ratePlan', e.target.value)}
                                                            className="w-full h-7 px-2 border border-[#cbd5e1] rounded text-xs bg-white outline-none"
                                                        >
                                                            <option value="Summer Vacation">Summer Vacation</option>
                                                            <option value="Standard EP">Standard EP (Room Only)</option>
                                                            <option value="Corporate CP">Corporate CP (Bed & Breakfast)</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <input
                                                            type="text"
                                                            value={item.roomNumber}
                                                            onChange={e => handleRoomFieldChange(item.id, 'roomNumber', e.target.value)}
                                                            className="w-24 h-7 px-2 border border-[#cbd5e1] rounded text-xs font-mono font-bold text-blue-700 outline-none"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={item.adults}
                                                            onChange={e => handleRoomFieldChange(item.id, 'adults', parseInt(e.target.value) || 1)}
                                                            className="w-12 h-7 px-1 border border-[#cbd5e1] rounded text-xs text-center outline-none"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={item.children}
                                                            onChange={e => handleRoomFieldChange(item.id, 'children', parseInt(e.target.value) || 0)}
                                                            className="w-12 h-7 px-1 border border-[#cbd5e1] rounded text-xs text-center outline-none"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <input
                                                            type="number"
                                                            value={item.rate}
                                                            onChange={e => handleRoomFieldChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                                            className="w-20 h-7 px-2 border border-[#cbd5e1] rounded text-xs font-semibold outline-none"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-3 font-bold text-[#0f172a]">
                                                        {lineTotal.toFixed(2)}
                                                    </td>
                                                    <td className="py-2 px-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveRoom(item.id)}
                                                            disabled={roomsList.length <= 1}
                                                            className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1"
                                                            title="Delete Room Row"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                type="button"
                                onClick={handleAddRoom}
                                className="border border-[#e2e8f0] hover:bg-[#f8fafc] text-[#0f172a] text-xs font-semibold px-3 py-1.5 rounded-md shadow-2xs cursor-pointer inline-flex items-center gap-1"
                            >
                                + Add Room
                            </button>

                            {/* Guest Quick Info */}
                            <div className="pt-2">
                                <h3 className="text-xs font-bold text-[#1e293b] mb-2 uppercase tracking-wider">
                                    Guest Quick Info
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-[#334155]">Title</label>
                                        <select
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            className="w-full h-8 px-2 border border-[#cbd5e1] rounded-md text-xs bg-white outline-none focus:border-blue-500"
                                        >
                                            <option value="Mr.">Mr.</option>
                                            <option value="Mrs.">Mrs.</option>
                                            <option value="Ms.">Ms.</option>
                                            <option value="Dr.">Dr.</option>
                                            <option value="Prof.">Prof.</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-[#334155]">
                                            Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Type guest name or select from list..."
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-[#cbd5e1] rounded-md text-xs bg-white outline-none focus:border-blue-500 font-medium"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-[#334155]">
                                            Mobile No. <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. +880 1712-345678"
                                            value={mobile}
                                            onChange={e => setMobile(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-[#cbd5e1] rounded-md text-xs bg-white outline-none focus:border-blue-500 font-bold text-gray-800"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-[#334155]">Email</label>
                                        <input
                                            type="email"
                                            placeholder="guest@example.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-[#cbd5e1] rounded-md text-xs bg-white outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="animate-in fade-in duration-100">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                {/* Left: Discount & Payment Methods (7 cols) */}
                                <div className="lg:col-span-7 space-y-5">
                                    {/* Discount Section */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-[#1e293b] mb-2">Discount</h3>
                                        <div className="flex items-center gap-2.5">
                                            <select
                                                value={discountType}
                                                onChange={e => setDiscountType(e.target.value as any)}
                                                className="w-36 h-8 px-2 border border-[#cbd5e1] rounded-md text-xs bg-white outline-none"
                                            >
                                                <option value="Fixed">Fixed</option>
                                                <option value="Percentage">Percentage</option>
                                            </select>
                                            <input
                                                type="number"
                                                min={0}
                                                value={discountValue || ''}
                                                onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                                className="w-48 h-8 px-2.5 border border-[#cbd5e1] rounded-md text-xs bg-white outline-none font-bold"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setDiscountValue(0)}
                                                className="p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                                                title="Clear Discount"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-[#64748b] mt-1.5">Remarks: Added discount</p>
                                    </div>

                                    {/* Payment Method Section */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-[#1e293b] mb-2">Payment Method</h3>
                                        <div className="space-y-2.5">
                                            {paymentRows.map(row => (
                                                <div
                                                    key={row.id}
                                                    className="flex items-center gap-3 bg-[#fafafa] p-3 border border-[#f1f5f9] rounded-lg"
                                                >
                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <label className="text-[11px] font-semibold text-gray-700">Method</label>
                                                        <select
                                                            value={row.method}
                                                            onChange={e => handlePaymentRowChange(row.id, 'method', e.target.value as any)}
                                                            className="w-full h-8 px-2 border border-[#cbd5e1] rounded-md text-xs bg-white outline-none"
                                                        >
                                                            <option value="Cash">Cash</option>
                                                            <option value="Card">Card</option>
                                                            <option value="bKash">bKash</option>
                                                            <option value="Bank Transfer">Bank Transfer</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex-1 flex flex-col gap-1">
                                                        <label className="text-[11px] font-semibold text-gray-700">Amount</label>
                                                        <input
                                                            type="number"
                                                            value={row.amount || ''}
                                                            onChange={e => handlePaymentRowChange(row.id, 'amount', parseFloat(e.target.value) || 0)}
                                                            placeholder="0.00"
                                                            className="w-full h-8 px-2.5 border border-[#cbd5e1] rounded-md text-xs bg-white outline-none font-bold"
                                                        />
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePaymentRow(row.id)}
                                                        disabled={paymentRows.length <= 1}
                                                        className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer self-end mb-1 p-1"
                                                        title="Delete Payment Method"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-end mt-3">
                                            <button
                                                type="button"
                                                onClick={handleAddPaymentRow}
                                                className="bg-[#2643a6] hover:bg-[#1e3687] text-white px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                                            >
                                                Add New Payment Method
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Summary Box (5 cols) */}
                                <div className="lg:col-span-5">
                                    <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4 shadow-2xs">
                                        <div className="divide-y divide-[#f1f5f9] text-xs">
                                            <div className="flex justify-between py-2 text-[#64748b]">
                                                <span>Total Amount</span>
                                                <span className="font-bold text-gray-900">{totalAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between py-2 text-[#64748b]">
                                                <span>Discounted Amount</span>
                                                <span className="font-bold text-gray-900">{discountedAmount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between py-2 text-[#64748b]">
                                                <span>Total Paid</span>
                                                <span className="font-bold text-emerald-700">{totalPaid.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between py-2.5 text-sm font-bold text-gray-900">
                                                <span>Total Due</span>
                                                <span className="text-red-600">{totalDue.toFixed(2)}</span>
                                            </div>
                                            <div className="bg-[#f1f5f9] -mx-4 px-4 py-2.5 flex justify-between font-bold text-xs text-gray-800">
                                                <span>Amount</span>
                                                <span>{totalPaid.toFixed(2)}</span>
                                            </div>
                                            <div className="bg-white -mx-4 -mb-4 px-4 py-3 flex justify-between font-extrabold text-sm text-[#0f172a] border-t border-[#e2e8f0] rounded-b-lg">
                                                <span>Remaining Amount</span>
                                                <span className={totalDue > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                                                    {totalDue.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-[#e2e8f0] px-4 py-2.5 bg-white flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Building2 size={15} className="text-blue-600" />
                        <span>Room: <strong className="text-gray-900 font-mono">{roomsList[0]?.roomNumber || '101'}</strong> ({nights} Night{nights > 1 ? 's' : ''})</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleCompleteReservation('hold')}
                            className="bg-white border border-[#cbd5e1] hover:bg-[#f8fafc] text-[#3b82f6] px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                        >
                            Hold Till
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCompleteReservation('confirmed')}
                            className="bg-white border border-[#3b82f6] hover:bg-[#eff6ff] text-[#3b82f6] px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                        >
                            Temporary Reserve
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCompleteReservation('confirmed')}
                            className="bg-[#2643a6] hover:bg-[#1e3687] text-white px-4 py-1.5 rounded-md text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
                        >
                            Reserve
                        </button>
                        <button
                            type="button"
                            onClick={() => handleCompleteReservation('arrived')}
                            className="bg-[#2643a6] hover:bg-[#1e3687] text-white px-4 py-1.5 rounded-md text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
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
