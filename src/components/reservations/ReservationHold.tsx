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

    const [form, setForm] = useState({
        reservationNumber: '',
        guestName: '',
        holdStartDate: new Date().toISOString().split('T')[0],
        holdEndDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        reason: '',
        checkInDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        checkOutDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        roomType: 'Deluxe Double',
        estimatedAmount: 7000
    });

    const handleOpenAdd = () => {
        setForm({
            reservationNumber: `RES-${Date.now().toString().slice(-8)}`,
            guestName: '',
            holdStartDate: new Date().toISOString().split('T')[0],
            holdEndDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
            reason: '',
            checkInDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
            checkOutDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
            roomType: 'Deluxe Double',
            estimatedAmount: 7000
        });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
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
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                                Reservation Hold Registry
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Tentative Bookings
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Manage tentative room blocks with hold expiration deadlines to prevent dead inventory and auto-release expired locks.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="h-8 px-3.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <Plus size={14} />
                        <span>+ New Hold Booking</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">
                    Showing {filtered.length} of {holds.length} Tentative Hold Bookings
                </span>
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search hold by guest, res #..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white outline-none w-56 lg:w-64 focus:border-amber-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden text-xs">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[950px]">
                        <thead>
                            <tr className="bg-amber-800 text-white text-[10.5px] font-bold uppercase tracking-wider">
                                <th className="px-3.5 py-3">Reservation Number</th>
                                <th className="px-3.5 py-3">Guest / Corporate Name</th>
                                <th className="px-3.5 py-3">Status</th>
                                <th className="px-3.5 py-3">Hold Expiration</th>
                                <th className="px-3.5 py-3">Reason For Hold</th>
                                <th className="px-3.5 py-3">Stay Dates</th>
                                <th className="px-3.5 py-3">Room Type</th>
                                <th className="px-3.5 py-3">Est. Tariff</th>
                                <th className="px-3.5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                        No tentative hold bookings registered.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(h => (
                                    <tr key={h.id} className="hover:bg-amber-50/20 transition-colors">
                                        <td className="px-3.5 py-2.5 font-mono font-bold text-amber-800">
                                            {h.reservationNumber}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-semibold text-gray-900">
                                            {h.guestName}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.status === 'Hold' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                                                {h.status}
                                            </span>
                                        </td>
                                        <td className="px-3.5 py-2.5 font-medium text-rose-700">
                                            {h.holdEndDate}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-600 max-w-xs">
                                            <div className="truncate" title={h.reason}>{h.reason}</div>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-800 font-medium">
                                            {h.checkInDate} → {h.checkOutDate}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-700 font-medium">
                                            {h.roomType}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-bold text-gray-900">
                                            ৳ {h.estimatedAmount.toLocaleString()}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {h.status === 'Hold' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleConfirmBooking(h.id)}
                                                        className="h-6 px-2 text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                                        title="Confirm & Convert to Booking"
                                                    >
                                                        Confirm
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(h.id)}
                                                    className="p-1 text-gray-400 hover:text-rose-600 rounded"
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

            {/* Modal: Add Hold Booking */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-amber-600 text-white">
                            <h3 className="text-xs font-bold flex items-center gap-2">
                                <Clock size={15} />
                                <span>Create Tentative Hold Reservation</span>
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-3.5 text-xs">
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Guest or Corporate Group Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.guestName}
                                    onChange={e => setForm({ ...form, guestName: e.target.value })}
                                    placeholder="e.g. Beximco Pharma VIP Delegation"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Hold Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.holdStartDate}
                                        onChange={e => setForm({ ...form, holdStartDate: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Hold Expiration Deadline *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.holdEndDate}
                                        onChange={e => setForm({ ...form, holdEndDate: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-bold text-rose-700"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Expected Check-In</label>
                                    <input
                                        type="date"
                                        value={form.checkInDate}
                                        onChange={e => setForm({ ...form, checkInDate: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Expected Check-Out</label>
                                    <input
                                        type="date"
                                        value={form.checkOutDate}
                                        onChange={e => setForm({ ...form, checkOutDate: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Room Type</label>
                                    <select
                                        value={form.roomType}
                                        onChange={e => setForm({ ...form, roomType: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        <option value="Deluxe Double">Deluxe Double</option>
                                        <option value="Superior King">Superior King</option>
                                        <option value="Executive Suite">Executive Suite</option>
                                        <option value="Presidential Suite">Presidential Suite</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Estimated Total (BDT ৳)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.estimatedAmount}
                                        onChange={e => setForm({ ...form, estimatedAmount: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Reason For Hold *</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={form.reason}
                                    onChange={e => setForm({ ...form, reason: e.target.value })}
                                    placeholder="e.g. Awaiting flight confirmation / corporate purchase order."
                                    className="w-full p-2 border border-gray-200 rounded-lg outline-none text-xs"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-8 px-3.5 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 text-gray-700 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-2xs cursor-pointer"
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
