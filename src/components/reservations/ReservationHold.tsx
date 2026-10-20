import React, { useState, useEffect } from 'react';
import {
    Clock,
    Plus,
    Search,
    Trash2,
    CheckCircle2,
    X
} from 'lucide-react';

export interface HoldItem {
    id: number;
    reservationNumber: string;
    guestName: string;
    status: 'Hold' | 'Confirmed' | 'Expired';
    holdStartDate: string;
    holdEndDate: string;
    reason: string;
    reservationDate: string;
    checkInDate: string;
    checkOutDate: string;
    roomType: string;
    estimatedAmount: number;
}

const INITIAL_HOLDS: HoldItem[] = [
    { id: 1, reservationNumber: 'RES-000000000009', guestName: 'Brig. Gen. M. Haque', status: 'Hold', holdStartDate: '2026-07-14', holdEndDate: '2026-07-16', reason: 'Awaiting official government delegation clearance letter.', reservationDate: '2026-07-12', checkInDate: '2026-07-20', checkOutDate: '2026-07-25', roomType: 'Executive Suite', estimatedAmount: 37500 },
    { id: 2, reservationNumber: 'RES-000000000010', guestName: 'Beximco Pharma VIP Team', status: 'Hold', holdStartDate: '2026-07-15', holdEndDate: '2026-07-17', reason: 'Corporate purchase order pending final procurement signature.', reservationDate: '2026-07-13', checkInDate: '2026-07-22', checkOutDate: '2026-07-24', roomType: 'Deluxe Double', estimatedAmount: 21000 },
    { id: 3, reservationNumber: 'RES-000000000011', guestName: 'Mr. David Wilson (UK)', status: 'Hold', holdStartDate: '2026-07-10', holdEndDate: '2026-07-12', reason: 'Connecting flight confirmation from Dubai pending.', reservationDate: '2026-07-09', checkInDate: '2026-07-18', checkOutDate: '2026-07-21', roomType: 'Superior King', estimatedAmount: 13500 }
];

export const ReservationHold: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state
    const [holds, setHolds] = useState<HoldItem[]>(() => {
        const saved = localStorage.getItem('hotel_holds_v2');
        return saved ? JSON.parse(saved) : INITIAL_HOLDS;
    });

    useEffect(() => {
        localStorage.setItem('hotel_holds_v2', JSON.stringify(holds));
    }, [holds]);

    // Form Modal State
    const [form, setForm] = useState({
        reservationNumber: `RES-${String(Math.floor(100000000000 + Math.random() * 900000000000))}`,
        guestName: '',
        holdStartDate: new Date().toISOString().split('T')[0],
        holdEndDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        checkInDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        checkOutDate: new Date(Date.now() + 86400000 * 8).toISOString().split('T')[0],
        roomType: 'Deluxe Double',
        estimatedAmount: 10500,
        reason: ''
    });

    const handleCreateHold = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.guestName || !form.reason) return;

        const newItem: HoldItem = {
            id: Date.now(),
            reservationNumber: form.reservationNumber,
            guestName: form.guestName,
            status: 'Hold',
            holdStartDate: form.holdStartDate,
            holdEndDate: form.holdEndDate,
            reason: form.reason,
            reservationDate: new Date().toISOString().split('T')[0],
            checkInDate: form.checkInDate,
            checkOutDate: form.checkOutDate,
            roomType: form.roomType,
            estimatedAmount: form.estimatedAmount
        };

        setHolds(prev => [newItem, ...prev]);
        showToast(`Hold reservation created for ${newItem.guestName}`);
        setIsModalOpen(false);
    };

    const handleConfirmBooking = (id: number) => {
        setHolds(prev =>
            prev.map(h => h.id === id ? { ...h, status: 'Confirmed' } : h)
        );
        showToast('Hold reservation successfully converted to Confirmed Booking!');
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Are you sure you want to release and delete this hold booking?')) {
            setHolds(prev => prev.filter(h => h.id !== id));
            showToast('Hold reservation released.');
        }
    };

    const filtered = holds.filter(h =>
        h.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.reservationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.reason.toLowerCase().includes(searchQuery.toLowerCase())
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
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center flex-shrink-0">
                        <Clock size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                                Tentative Reservation Hold List
                            </h1>
                            <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Auto-Release Guard
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                            Track tentative room blocks awaiting payment or confirmation with auto-release deadlines.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="h-7 px-3 text-[11px] font-bold bg-[#1e3a8a] hover:bg-blue-900 text-white rounded shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                        <Plus size={13} />
                        <span>Create Hold</span>
                    </button>
                </div>
            </div>

            {/* Compact Controls Bar */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs px-3 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium text-[11px]">Active Holds:</span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold font-mono text-[11px]">
                        {holds.filter(h => h.status === 'Hold').length} Pending
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500 font-medium text-[11px]">Confirmed:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px]">
                        {holds.filter(h => h.status === 'Confirmed').length}
                    </span>
                </div>

                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search guest, res #, reason..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-7 pl-7 pr-2.5 text-[11px] border border-gray-200 rounded-md bg-white outline-none w-52 sm:w-60 focus:border-amber-500"
                    />
                </div>
            </div>

            {/* Compact Table View */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[900px] border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] font-bold text-gray-600 uppercase tracking-wider">
                                <th className="px-3 py-2">Hold Res #</th>
                                <th className="px-3 py-2">Guest / Entity</th>
                                <th className="px-3 py-2">Room Type</th>
                                <th className="px-3 py-2">Planned Stay</th>
                                <th className="px-3 py-2">Hold Expiration Window</th>
                                <th className="px-3 py-2">Hold Reason & Notes</th>
                                <th className="px-3 py-2">Est. Tariff</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11.5px]">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                                        No hold reservations found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(h => (
                                    <tr key={h.id} className="hover:bg-amber-50/20 transition-colors">
                                        <td className="px-3 py-1.5 font-mono font-bold text-amber-800">
                                            {h.reservationNumber}
                                        </td>
                                        <td className="px-3 py-1.5 font-semibold text-gray-900">
                                            {h.guestName}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-700">
                                            {h.roomType}
                                        </td>
                                        <td className="px-3 py-1.5 whitespace-nowrap text-gray-600">
                                            {h.checkInDate} → {h.checkOutDate}
                                        </td>
                                        <td className="px-3 py-1.5 whitespace-nowrap font-mono text-[10.5px] text-amber-900 font-semibold">
                                            {h.holdStartDate} → {h.holdEndDate}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600 max-w-xs truncate" title={h.reason}>
                                            {h.reason}
                                        </td>
                                        <td className="px-3 py-1.5 font-mono font-bold text-gray-900 whitespace-nowrap">
                                            ৳ {h.estimatedAmount.toLocaleString()}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                h.status === 'Hold'
                                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            }`}>
                                                {h.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {h.status === 'Hold' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleConfirmBooking(h.id)}
                                                        className="h-5 px-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                                        title="Convert to Confirmed Reservation"
                                                    >
                                                        Confirm
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(h.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded cursor-pointer"
                                                    title="Release Hold"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Hold Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-4 py-3 bg-[#1e3a8a] text-white flex items-center justify-between">
                            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <Clock size={14} />
                                <span>Create Tentative Reservation Hold</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-white/80 hover:text-white p-0.5 rounded"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateHold} className="p-4 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-gray-700">Guest Name / Entity *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Full Name / Company"
                                        value={form.guestName}
                                        onChange={e => setForm({ ...form, guestName: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700">Room Category</label>
                                    <select
                                        value={form.roomType}
                                        onChange={e => setForm({ ...form, roomType: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none"
                                    >
                                        <option value="Deluxe Double">Deluxe Double</option>
                                        <option value="Executive Suite">Executive Suite</option>
                                        <option value="Superior King">Superior King</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-gray-700">Planned Check-In</label>
                                    <input
                                        type="date"
                                        value={form.checkInDate}
                                        onChange={e => setForm({ ...form, checkInDate: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700">Planned Check-Out</label>
                                    <input
                                        type="date"
                                        value={form.checkOutDate}
                                        onChange={e => setForm({ ...form, checkOutDate: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-gray-700">Hold Active From</label>
                                    <input
                                        type="date"
                                        value={form.holdStartDate}
                                        onChange={e => setForm({ ...form, holdStartDate: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700">Release Deadline</label>
                                    <input
                                        type="date"
                                        value={form.holdEndDate}
                                        onChange={e => setForm({ ...form, holdEndDate: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none font-bold text-amber-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-gray-700">Hold Reason & Justification *</label>
                                <textarea
                                    required
                                    rows={2}
                                    placeholder="Explain why room is held without deposit (e.g. government clearance, PO pending)..."
                                    value={form.reason}
                                    onChange={e => setForm({ ...form, reason: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded text-xs mt-1 outline-none resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-7 px-3 border border-gray-300 text-gray-600 rounded text-xs font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-7 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-xs font-bold cursor-pointer"
                                >
                                    Create Hold Lock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReservationHold;
