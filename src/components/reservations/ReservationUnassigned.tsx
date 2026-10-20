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

    // Active assignment modal
    const [assignTarget, setAssignTarget] = useState<UnassignedItem | null>(null);
    const [targetRoom, setTargetRoom] = useState('101');

    const handleConfirmAssign = () => {
        if (!assignTarget) return;

        setUnassignedList(prev => prev.filter(u => u.id !== assignTarget.id));
        showToast(`Room ${targetRoom} allocated to ${assignTarget.guestName} (${assignTarget.reservationNumber})!`);
        setAssignTarget(null);
    };

    const handleAutoAssignAll = () => {
        showToast(`Auto-assigned ${unassignedList.length} rooms based on Best Available Clean Inventory!`);
        setUnassignedList([]);
    };

    const filtered = unassignedList.filter(u =>
        u.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.reservationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.roomType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-3 sm:p-4 max-w-full space-y-2.5 animate-in fade-in duration-150 text-xs">
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Compact Header Bar */}
            <div className="bg-white rounded-lg border border-gray-200/90 shadow-2xs px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center flex-shrink-0">
                        <BedDouble size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                                Unassigned Rooms Queue
                            </h1>
                            <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-200">
                                Pending Allocation ({unassignedList.length})
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                            Confirmed bookings from OTAs and website engines awaiting physical room assignment.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {unassignedList.length > 0 && (
                        <button
                            type="button"
                            onClick={handleAutoAssignAll}
                            className="h-7 px-3 text-[11px] font-bold bg-[#1e3a8a] hover:bg-blue-900 text-white rounded shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                            <Check size={12} />
                            <span>Auto-Assign All</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Compact Filter Bar */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs px-3 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-gray-600">
                    Showing <strong className="text-gray-900">{filtered.length}</strong> Bookings Awaiting Room Allocation
                </span>

                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search unassigned bookings..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-7 pl-7 pr-2.5 text-[11px] border border-gray-200 rounded-md bg-white outline-none w-52 sm:w-60 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Compact Table View */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[900px] border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] font-bold text-gray-600 uppercase tracking-wider">
                                <th className="px-3 py-2">Res #</th>
                                <th className="px-3 py-2">Guest Name</th>
                                <th className="px-3 py-2">Room Type Reserved</th>
                                <th className="px-3 py-2">Arrival & Departure</th>
                                <th className="px-3 py-2">Nights</th>
                                <th className="px-3 py-2">Channel / Source</th>
                                <th className="px-3 py-2">Tariff Paid</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11.5px]">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                                        All confirmed reservations have physical rooms assigned!
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(u => (
                                    <tr key={u.id} className="hover:bg-rose-50/15 transition-colors">
                                        <td className="px-3 py-1.5 font-mono font-bold text-blue-700">
                                            {u.reservationNumber}
                                        </td>
                                        <td className="px-3 py-1.5 font-semibold text-gray-900">
                                            {u.guestName}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <span className="font-medium text-gray-800">{u.roomType}</span>
                                            <span className="ml-2 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                No Room #
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 whitespace-nowrap text-gray-600">
                                            {u.checkIn} → {u.checkOut}
                                        </td>
                                        <td className="px-3 py-1.5 font-mono text-gray-800">
                                            {u.nights}N
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600">
                                            {u.source}
                                        </td>
                                        <td className="px-3 py-1.5 font-mono font-bold text-emerald-700">
                                            ৳ {u.paidAmount.toLocaleString()}
                                        </td>
                                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAssignTarget(u);
                                                    setTargetRoom(u.roomType.includes('Suite') ? '203' : '101');
                                                }}
                                                className="h-5 px-2.5 text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                                title="Assign Room Number"
                                            >
                                                <span>Assign Room</span>
                                                <ArrowRight size={11} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Room Assignment Modal */}
            {assignTarget && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-4 py-3 bg-[#1e3a8a] text-white flex items-center justify-between">
                            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <BedDouble size={14} />
                                <span>Assign Room to {assignTarget.guestName}</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setAssignTarget(null)}
                                className="text-white/80 hover:text-white p-0.5 rounded"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 space-y-3 text-xs">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Reservation:</span>
                                    <span className="font-mono font-bold text-blue-700">{assignTarget.reservationNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Reserved Category:</span>
                                    <span className="font-bold text-gray-800">{assignTarget.roomType}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Stay Duration:</span>
                                    <span>{assignTarget.checkIn} → {assignTarget.checkOut} ({assignTarget.nights}N)</span>
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-gray-700 block mb-1">
                                    Select Clean Physical Room Number:
                                </label>
                                <select
                                    value={targetRoom}
                                    onChange={e => setTargetRoom(e.target.value)}
                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs outline-none font-bold text-blue-700 bg-white"
                                >
                                    <option value="101">Room 101 — Ground Floor (Deluxe Double, Clean)</option>
                                    <option value="102">Room 102 — Ground Floor (Deluxe Double, Inspected)</option>
                                    <option value="103">Room 103 — Ground Floor (Superior King, Clean)</option>
                                    <option value="104">Room 104 — Ground Floor (Executive Suite, Clean)</option>
                                    <option value="201">Room 201 — Floor 2 (Deluxe Double, Clean)</option>
                                    <option value="202">Room 202 — Floor 2 (Superior King, Clean)</option>
                                    <option value="203">Room 203 — Floor 2 (Executive Suite, Clean)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setAssignTarget(null)}
                                    className="h-7 px-3 border border-gray-300 text-gray-600 rounded text-xs font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmAssign}
                                    className="h-7 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer"
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
