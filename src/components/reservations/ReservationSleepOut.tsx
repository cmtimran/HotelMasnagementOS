import React, { useState, useEffect } from 'react';
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

    const [form, setForm] = useState({
        reservationNumber: '',
        guestName: '',
        reason: '',
        roomType: 'Deluxe Double',
        roomNumber: '101',
        contact: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    });

    const handleOpenAdd = () => {
        setForm({
            reservationNumber: `RES-${Date.now().toString().slice(-6)}`,
            guestName: '',
            reason: '',
            roomType: 'Deluxe Double',
            roomNumber: '101',
            contact: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.guestName || !form.reason) return;

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
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-700 to-purple-800 text-white flex items-center justify-center shadow-md flex-shrink-0">
                        <Moon size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                                Sleep Out Registry (Guest Absence Tracker)
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                Night Audit Safety
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Keep track of in-house guests who have notified reception that they will sleep outside the property tonight to ensure accurate headcount during emergency audits.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="h-8 px-3.5 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <Plus size={14} />
                        <span>+ Log Sleep Out</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">
                    Showing {filtered.length} of {sleepOuts.length} Recorded Sleep Outs
                </span>
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search guest, room, reason..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white outline-none w-56 lg:w-64 focus:border-purple-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden text-xs">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[950px]">
                        <thead>
                            <tr className="bg-purple-900 text-white text-[10.5px] font-bold uppercase tracking-wider">
                                <th className="px-3.5 py-3">Reservation Number</th>
                                <th className="px-3.5 py-3">Guest Name</th>
                                <th className="px-3.5 py-3">Reason For Absence</th>
                                <th className="px-3.5 py-3">Room Type</th>
                                <th className="px-3.5 py-3">Room No</th>
                                <th className="px-3.5 py-3">Contact</th>
                                <th className="px-3.5 py-3">Absence Period</th>
                                <th className="px-3.5 py-3">Status</th>
                                <th className="px-3.5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                        No sleep-out records logged today.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-purple-50/20 transition-colors">
                                        <td className="px-3.5 py-2.5 font-mono font-bold text-purple-700">
                                            {s.reservationNumber}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-semibold text-gray-900">
                                            {s.guestName}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-600 max-w-xs">
                                            <div className="truncate" title={s.reason}>{s.reason}</div>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-700">
                                            {s.roomType}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-mono font-bold text-blue-700">
                                            {s.roomNumber}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-mono text-gray-600">
                                            {s.contact}
                                        </td>
                                        <td className="px-3.5 py-2.5 font-medium text-gray-800">
                                            {s.startDate} → {s.endDate}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'Sleeping Out' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {s.status === 'Sleeping Out' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMarkReturned(s.id)}
                                                        className="h-6 px-2 text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                                        title="Mark Guest Returned"
                                                    >
                                                        Mark Returned
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(s.id)}
                                                    className="p-1 text-gray-400 hover:text-rose-600 rounded"
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

            {/* Modal: Log Sleep Out */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-purple-900 text-white">
                            <h3 className="text-xs font-bold flex items-center gap-2">
                                <Moon size={15} />
                                <span>Log Guest Sleep-Out Notification</span>
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Reservation Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.reservationNumber}
                                        onChange={e => setForm({ ...form, reservationNumber: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Room Number *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.roomNumber}
                                        onChange={e => setForm({ ...form, roomNumber: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold text-blue-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Guest Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.guestName}
                                    onChange={e => setForm({ ...form, guestName: e.target.value })}
                                    placeholder="e.g. Tariqul Islam"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Emergency Contact Number</label>
                                <input
                                    type="text"
                                    value={form.contact}
                                    onChange={e => setForm({ ...form, contact: e.target.value })}
                                    placeholder="+880 17xx-xxxxxx"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Out Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.startDate}
                                        onChange={e => setForm({ ...form, startDate: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Expected Return *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.endDate}
                                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Reason For Overnight Absence *</label>
                                <textarea
                                    required
                                    rows={2}
                                    value={form.reason}
                                    onChange={e => setForm({ ...form, reason: e.target.value })}
                                    placeholder="e.g. Overnight travel to factory, returning tomorrow morning."
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
                                    className="h-8 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold shadow-2xs cursor-pointer"
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
