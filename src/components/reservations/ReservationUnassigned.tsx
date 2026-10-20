import React, { useState, useEffect } from 'react';
import {
    BedDouble,
    Search,
    CheckCircle2,
    X,
    Check,
    ArrowRight
} from 'lucide-react';

export interface UnassignedItem {
    id: number;
    reservationNumber: string;
    guestName: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    source: string;
    totalAmount: number;
    paidAmount: number;
    assignedRoom?: string;
}

const INITIAL_UNASSIGNED: UnassignedItem[] = [
    { id: 1, reservationNumber: 'RES-009290', guestName: 'Naimur Rahman', roomType: 'Deluxe Double', checkIn: '2026-07-02', checkOut: '2026-07-04', nights: 2, source: 'Booking.com', totalAmount: 7000, paidAmount: 7000 },
    { id: 2, reservationNumber: 'RES-009291', guestName: 'Tahmina Akter', roomType: 'Superior King', checkIn: '2026-07-03', checkOut: '2026-07-06', nights: 3, source: 'Agoda YCS', totalAmount: 13500, paidAmount: 13500 },
    { id: 3, reservationNumber: 'RES-009292', guestName: 'Standard Chartered Exec', roomType: 'Executive Suite', checkIn: '2026-07-02', checkOut: '2026-07-05', nights: 3, source: 'Corporate Account', totalAmount: 22500, paidAmount: 22500 },
    { id: 4, reservationNumber: 'RES-009293', guestName: 'Mahir Faisal', roomType: 'Deluxe Double', checkIn: '2026-07-04', checkOut: '2026-07-06', nights: 2, source: 'Direct Website', totalAmount: 7000, paidAmount: 3500 }
];

export const ReservationUnassigned: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state
    const [unassignedList, setUnassignedList] = useState<UnassignedItem[]>(() => {
        const saved = localStorage.getItem('hotel_unassigned_v2');
        return saved ? JSON.parse(saved) : INITIAL_UNASSIGNED;
    });

    useEffect(() => {
        localStorage.setItem('hotel_unassigned_v2', JSON.stringify(unassignedList));
    }, [unassignedList]);

    // Modal state for assigning a room
    const [selectedItem, setSelectedItem] = useState<UnassignedItem | null>(null);
    const [targetRoom, setTargetRoom] = useState('101');

    const availableRooms: Record<string, string[]> = {
        'Deluxe Double': ['101', '102', '201', '204'],
        'Superior King': ['103', '202', '305'],
        'Executive Suite': ['104', '203', '501']
    };

    const handleOpenAssign = (item: UnassignedItem) => {
        setSelectedItem(item);
        const options = availableRooms[item.roomType] || ['101', '102'];
        setTargetRoom(options[0]);
    };

    const handleConfirmAssign = () => {
        if (!selectedItem) return;

        setUnassignedList(prev => prev.filter(x => x.id !== selectedItem.id));
        showToast(`Room ${targetRoom} successfully assigned to ${selectedItem.guestName}.`);
        setSelectedItem(null);
    };

    const handleAutoAssignAll = () => {
        setUnassignedList([]);
        showToast('All pending reservations have been auto-assigned best available rooms!');
    };

    const filtered = unassignedList.filter(u =>
        u.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.reservationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.roomType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-150">
            {toastMessage && (
                <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start md:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600 to-rose-700 text-white flex items-center justify-center shadow-md flex-shrink-0">
                        <BedDouble size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                                Unassigned Rooms Queue
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                Pending Allocation ({unassignedList.length})
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Confirmed and guaranteed bookings from OTAs and website engines awaiting physical room number assignment before guest arrival.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {unassignedList.length > 0 && (
                        <button
                            type="button"
                            onClick={handleAutoAssignAll}
                            className="h-8 px-3.5 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <Check size={14} />
                            <span>Auto-Assign All</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">
                    Showing {filtered.length} Bookings Awaiting Room Allocation
                </span>
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search unassigned bookings..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white outline-none w-56 lg:w-64 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden text-xs">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[950px]">
                        <thead>
                            <tr className="bg-gray-800 text-white text-[10.5px] font-bold uppercase tracking-wider">
                                <th className="px-3.5 py-3">Reservation #</th>
                                <th className="px-3.5 py-3">Guest Name</th>
                                <th className="px-3.5 py-3">Booked Room Category</th>
                                <th className="px-3.5 py-3">Stay Dates</th>
                                <th className="px-3.5 py-3">Nights</th>
                                <th className="px-3.5 py-3">Channel / Source</th>
                                <th className="px-3.5 py-3">Payment Status</th>
                                <th className="px-3.5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-1">
                                            <CheckCircle2 size={24} className="text-emerald-500 mb-1" />
                                            <span className="font-bold text-gray-800">All Rooms Assigned!</span>
                                            <p className="text-[11px] text-gray-400">There are no pending reservations without room assignments.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(u => (
                                    <tr key={u.id} className="hover:bg-rose-50/20 transition-colors">
                                        <td className="px-3.5 py-2.5 font-mono font-bold text-blue-700">
                                            {u.reservationNumber}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-semibold text-gray-900">
                                            {u.guestName}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-medium text-gray-800">
                                            {u.roomType}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-700">
                                            {u.checkIn} → {u.checkOut}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-bold text-gray-900">
                                            {u.nights} Night{u.nights > 1 ? 's' : ''}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-600 font-medium">
                                            {u.source}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.paidAmount >= u.totalAmount ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                                {u.paidAmount >= u.totalAmount ? 'Pre-Paid' : 'Deposit Partial'}
                                            </span>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenAssign(u)}
                                                className="h-7 px-3 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                            >
                                                <span>Assign Room</span>
                                                <ArrowRight size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Assign Room */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-900 text-white">
                            <h3 className="text-xs font-bold flex items-center gap-2">
                                <BedDouble size={15} />
                                <span>Assign Room to {selectedItem.guestName}</span>
                            </h3>
                            <button type="button" onClick={() => setSelectedItem(null)} className="text-white/70 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 space-y-3.5 text-xs">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1">
                                <div className="text-gray-500">Booked Category: <strong className="text-gray-900">{selectedItem.roomType}</strong></div>
                                <div className="text-gray-500">Stay: <strong className="text-gray-900">{selectedItem.checkIn} → {selectedItem.checkOut} ({selectedItem.nights} Nights)</strong></div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Select Available Clean Room *</label>
                                <select
                                    value={targetRoom}
                                    onChange={e => setTargetRoom(e.target.value)}
                                    className="w-full h-9 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-mono font-bold text-blue-700 text-sm"
                                >
                                    {(availableRooms[selectedItem.roomType] || ['101', '102', '201']).map(rm => (
                                        <option key={rm} value={rm}>Room {rm} (Clean & Inspected)</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedItem(null)}
                                    className="h-8 px-3.5 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 text-gray-700 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmAssign}
                                    className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-2xs cursor-pointer"
                                >
                                    Confirm Room {targetRoom}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReservationUnassigned;
