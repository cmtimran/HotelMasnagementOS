import React, { useState, useEffect } from 'react';
import { toast } from '../../context/ToastContext';
import {
    Moon,
    Plus,
    Search,
    Trash2,
    CheckCircle2,
    X
} from 'lucide-react';

export interface SleepOutItem {
    id: number;
    reservationNumber: string;
    guestName: string;
    reason: string;
    roomType: string;
    roomCode: string;
    roomNumber: string;
    contact: string;
    startDate: string;
    endDate: string;
    status: 'Sleeping Out' | 'Returned';
}

const INITIAL_SLEEPOUTS: SleepOutItem[] = [
    { id: 1, reservationNumber: 'RES-009281', guestName: 'Md. Tariqul Islam', reason: 'Midnight executive meeting in Chittagong, returning tomorrow morning.', roomType: 'Deluxe Double', roomCode: 'DLX-101', roomNumber: '101', contact: '+880 1711-928371', startDate: '2026-07-02', endDate: '2026-07-03', status: 'Sleeping Out' },
    { id: 2, reservationNumber: 'RES-009285', guestName: 'Dr. Jean Dupont', reason: 'Emergency medical consultation trip outside Dhaka.', roomType: 'Executive Suite', roomCode: 'SUT-203', roomNumber: '203', contact: '+33 612-384920', startDate: '2026-07-03', endDate: '2026-07-04', status: 'Sleeping Out' }
];

export const ReservationSleepOut: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state
    const [sleepOuts, setSleepOuts] = useState<SleepOutItem[]>(() => {
        const saved = localStorage.getItem('hotel_sleepouts_v2');
        return saved ? JSON.parse(saved) : INITIAL_SLEEPOUTS;
    });

    useEffect(() => {
        localStorage.setItem('hotel_sleepouts_v2', JSON.stringify(sleepOuts));
    }, [sleepOuts]);

    // Modal Form State
    const [form, setForm] = useState({
        reservationNumber: '',
        guestName: '',
        roomNumber: '101',
        roomType: 'Deluxe Double',
        contact: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        reason: ''
    });

    const handleCreateSleepOut = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.guestName || !form.reservationNumber) {
            toast.warning('Please provide guest name and reservation number.');
            return;
        }

        const newItem: SleepOutItem = {
            id: Date.now(),
            reservationNumber: form.reservationNumber,
            guestName: form.guestName,
            reason: form.reason,
            roomType: form.roomType,
            roomCode: `RM-${form.roomNumber}`,
            roomNumber: form.roomNumber,
            contact: form.contact || '+880 1700-000000',
            startDate: form.startDate,
            endDate: form.endDate,
            status: 'Sleeping Out'
        };

        setSleepOuts(prev => [newItem, ...prev]);
        showToast(`Sleep-out logged for ${newItem.guestName}`);
        setIsModalOpen(false);
    };

    const handleMarkReturned = (id: number) => {
        setSleepOuts(prev =>
            prev.map(s => s.id === id ? { ...s, status: 'Returned' } : s)
        );
        showToast('Guest marked as returned to room.');
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Delete this sleep out record?')) {
            setSleepOuts(prev => prev.filter(s => s.id !== id));
            showToast('Sleep out record removed.');
        }
    };

    const filtered = sleepOuts.filter(s =>
        s.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.reservationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roomNumber.includes(searchQuery) ||
        s.reason.toLowerCase().includes(searchQuery.toLowerCase())
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
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center flex-shrink-0">
                        <Moon size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                                Sleep Out Registry (Guest Absence Tracker)
                            </h1>
                            <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-purple-50 text-purple-700 border border-purple-200">
                                Night Safety
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                            Track checked-in guests spending the night off property for duty-of-care.
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
                        <span>Log Sleep Out</span>
                    </button>
                </div>
            </div>

            {/* Compact Controls Bar */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs px-3 py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium text-[11px]">Active Away:</span>
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold font-mono text-[11px]">
                        {sleepOuts.filter(s => s.status === 'Sleeping Out').length} Guests
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500 font-medium text-[11px]">Returned:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px]">
                        {sleepOuts.filter(s => s.status === 'Returned').length}
                    </span>
                </div>

                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search guest, room, reason..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-7 pl-7 pr-2.5 text-[11px] border border-gray-200 rounded-md bg-white outline-none w-52 sm:w-60 focus:border-purple-500"
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
                                <th className="px-3 py-2">Room</th>
                                <th className="px-3 py-2">Emergency Contact</th>
                                <th className="px-3 py-2">Absence Dates</th>
                                <th className="px-3 py-2">Reason / Itinerary</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11.5px]">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                                        No sleep out records found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-purple-50/20 transition-colors">
                                        <td className="px-3 py-1.5 font-mono font-bold text-purple-800">
                                            {s.reservationNumber}
                                        </td>
                                        <td className="px-3 py-1.5 font-semibold text-gray-900">
                                            {s.guestName}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <span className="px-1.5 py-0.2 bg-purple-50 text-purple-800 rounded font-bold font-mono">
                                                {s.roomNumber}
                                            </span>
                                            <span className="text-[10px] text-gray-500 ml-1.5">{s.roomType}</span>
                                        </td>
                                        <td className="px-3 py-1.5 font-mono text-gray-600">
                                            {s.contact}
                                        </td>
                                        <td className="px-3 py-1.5 whitespace-nowrap text-gray-700">
                                            {s.startDate} → {s.endDate}
                                        </td>
                                        <td className="px-3 py-1.5 text-gray-600 max-w-xs truncate" title={s.reason}>
                                            {s.reason}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                s.status === 'Sleeping Out'
                                                    ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {s.status === 'Sleeping Out' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMarkReturned(s.id)}
                                                        className="h-5 px-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                                        title="Mark Guest Returned"
                                                    >
                                                        Mark Returned
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(s.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded cursor-pointer"
                                                    title="Delete Record"
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

            {/* Log Sleep Out Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="px-4 py-3 bg-[#1e3a8a] text-white flex items-center justify-between">
                            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <Moon size={14} />
                                <span>Record Guest Sleep Out</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-white/80 hover:text-white p-0.5 rounded"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSleepOut} className="p-4 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-gray-700">Res Number *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="RES-009..."
                                        value={form.reservationNumber}
                                        onChange={e => setForm({ ...form, reservationNumber: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700">Guest Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Full Name"
                                        value={form.guestName}
                                        onChange={e => setForm({ ...form, guestName: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-gray-700">Room Number</label>
                                    <input
                                        type="text"
                                        value={form.roomNumber}
                                        onChange={e => setForm({ ...form, roomNumber: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700">Contact Number</label>
                                    <input
                                        type="text"
                                        value={form.contact}
                                        onChange={e => setForm({ ...form, contact: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-gray-700">Start Date</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={e => setForm({ ...form, startDate: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-gray-700">Expected Return</label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs mt-1 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-gray-700">Reason / Temporary Destination</label>
                                <textarea
                                    required
                                    rows={2}
                                    placeholder="Explain travel purpose, emergency trip, or location..."
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
                                    Save Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReservationSleepOut;
