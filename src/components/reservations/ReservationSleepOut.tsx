import React, { useState, useEffect, useMemo } from 'react';
import {
    Moon, Plus, Search, Trash2, CheckCircle2, X,
    Printer, RefreshCw, ArrowRight, Check
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import PageHeader from '../common/PageHeader';

export interface SleepOutItem {
    id: number;
    reservationNumber: string;
    guestName: string;
    reason: string;
    roomType: string;
    roomNumber: string;
    contact: string;
    startDate: string;
    endDate: string;
    expectedReturnTime?: string;
    status: 'Sleeping Out' | 'Returned';
    keyCardLocation: 'Held at Front Desk' | 'With Guest';
    securityPassNo: string;
}

const INITIAL_SLEEPOUTS: SleepOutItem[] = [
    { 
        id: 1, 
        reservationNumber: 'RES-892104', 
        guestName: 'Zubair Ahmed', 
        reason: 'Midnight executive board meeting in Chittagong, returning tomorrow morning.', 
        roomType: 'Deluxe Double', 
        roomNumber: '101', 
        contact: '+880 1611-987654', 
        startDate: '2026-07-01', 
        endDate: '2026-07-02', 
        expectedReturnTime: '09:00 AM', 
        status: 'Sleeping Out',
        keyCardLocation: 'Held at Front Desk',
        securityPassNo: 'SO-2026-042'
    },
    { 
        id: 2, 
        reservationNumber: 'RES-892105', 
        guestName: 'Mim Akter', 
        reason: 'Emergency research consultation outside Dhaka division.', 
        roomType: 'Executive Suite', 
        roomNumber: '410', 
        contact: '+880 1733-456789', 
        startDate: '2026-06-30', 
        endDate: '2026-07-01', 
        expectedReturnTime: '12:00 PM', 
        status: 'Sleeping Out',
        keyCardLocation: 'With Guest',
        securityPassNo: 'SO-2026-041'
    }
];

export const ReservationSleepOut: React.FC = () => {
    const { setActivePage } = useNavigation();
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'Sleeping Out' | 'Returned'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [printPassTarget, setPrintPassTarget] = useState<SleepOutItem | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state
    const [sleepOuts, setSleepOuts] = useState<SleepOutItem[]>(() => {
        try {
            const saved = localStorage.getItem('hotel_sleepouts_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error(e);
        }
        return INITIAL_SLEEPOUTS;
    });

    useEffect(() => {
        try {
            localStorage.setItem('hotel_sleepouts_v2', JSON.stringify(sleepOuts));
        } catch (e) {
            console.error(e);
        }
    }, [sleepOuts]);

    // Modal Form State
    const [form, setForm] = useState({
        reservationNumber: 'RES-892101',
        guestName: 'Mahmudul Hasan',
        roomNumber: '102',
        roomType: 'Deluxe Double',
        contact: '+880 1711-234567',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        expectedReturnTime: '10:00 AM',
        reason: 'Out-of-town business trip. Room remains booked and billed.',
        keyCardLocation: 'Held at Front Desk' as const
    });

    const handleCreateSleepOut = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.guestName || !form.reservationNumber) return;

        const newItem: SleepOutItem = {
            id: Date.now(),
            reservationNumber: form.reservationNumber,
            guestName: form.guestName,
            reason: form.reason,
            roomType: form.roomType,
            roomNumber: form.roomNumber,
            contact: form.contact || '+880 1700-000000',
            startDate: form.startDate,
            endDate: form.endDate,
            expectedReturnTime: form.expectedReturnTime,
            status: 'Sleeping Out',
            keyCardLocation: form.keyCardLocation,
            securityPassNo: `SO-2026-${String(Math.floor(100 + Math.random() * 900))}`
        };

        setSleepOuts(prev => [newItem, ...prev]);
        showToast(`Sleep-out pass registered for ${newItem.guestName} (Room ${newItem.roomNumber})`);
        setIsModalOpen(false);
    };

    const handleMarkReturned = (id: number) => {
        setSleepOuts(prev =>
            prev.map(s => s.id === id ? { ...s, status: 'Returned' } : s)
        );
        showToast('Guest marked as returned to room. Security pass closed.');
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Delete this sleep out record?')) {
            setSleepOuts(prev => prev.filter(s => s.id !== id));
            showToast('Sleep out record removed.');
        }
    };

    // Filter Logic
    const filtered = useMemo(() => {
        const q = (searchQuery || '').toLowerCase().trim();
        return sleepOuts.filter(s => {
            const matchesQuery = !q ||
                (s.guestName || '').toLowerCase().includes(q) ||
                (s.reservationNumber || '').toLowerCase().includes(q) ||
                (s.roomNumber || '').toLowerCase().includes(q) ||
                (s.reason || '').toLowerCase().includes(q);
            const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
            return matchesQuery && matchesStatus;
        });
    }, [sleepOuts, searchQuery, filterStatus]);

    const activeOutCount = useMemo(() => sleepOuts.filter(s => s.status === 'Sleeping Out').length, [sleepOuts]);

    return (
        <div className="p-3 sm:p-4 max-w-[1400px] mx-auto space-y-3 font-sans select-none animate-in fade-in duration-150">
            {toastMessage && (
                <div className="fixed top-4 right-4 z-[99999] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Standardized Thesis Page Header */}
            <PageHeader
                title="Sleep Out Register & Security Ledger"
                subtitle="Tracks checked-in guests sleeping away from property while retaining room billing & key security"
                icon={<Moon size={22} />}
                badge={
                    <span className="badge-status-active">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {activeOutCount} Active Out
                    </span>
                }
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary"
                        >
                            <Plus size={14} className="stroke-[2.5]" />
                            <span>Log Sleep Out</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActivePage('front-desk')}
                            className="btn-secondary"
                        >
                            <span>Front Desk</span>
                            <ArrowRight size={13} />
                        </button>
                    </>
                }
            />

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card-container p-4">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Active Sleep-Outs</span>
                    <div className="text-2xl font-black text-slate-900 font-mono mt-1">{activeOutCount} Rooms</div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Currently away from hotel</p>
                </div>

                <div className="card-container p-4">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Key Cards Secured</span>
                    <div className="text-2xl font-black text-primary font-mono mt-1">
                        {sleepOuts.filter(s => s.status === 'Sleeping Out' && s.keyCardLocation === 'Held at Front Desk').length} Keys
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Held at Front Desk safe</p>
                </div>

                <div className="card-container p-4">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Returned &amp; Closed</span>
                    <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                        {sleepOuts.filter(s => s.status === 'Returned').length} Records
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Safely re-occupied</p>
                </div>

                <div className="card-container p-4">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Night Audit Policy</span>
                    <div className="text-2xl font-black text-slate-900 font-mono mt-1">Active Billing</div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Tariff posting continues as in-house</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col md:flex-row items-center justify-between gap-2.5">
                <div className="relative w-full md:w-80">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Guest, Room #, Pass #, Reason..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 uppercase">Status:</span>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value as any)}
                            className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                        >
                            <option value="all">All Sleep-Outs</option>
                            <option value="Sleeping Out">Currently Sleeping Out</option>
                            <option value="Returned">Returned to Room</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery('');
                            setFilterStatus('all');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Reset Filters"
                    >
                        <RefreshCw size={13} />
                    </button>
                </div>
            </div>

            {/* Sleep Out Ledger Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[1050px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                                <th className="py-2.5 px-3.5 w-64">Guest &amp; Room</th>
                                <th className="py-2.5 px-3 w-52">Pass &amp; Dates</th>
                                <th className="py-2.5 px-3 min-w-[200px]">Reason / Purpose</th>
                                <th className="py-2.5 px-3 w-40">Key Card Location</th>
                                <th className="py-2.5 px-3 w-32 text-center">Status</th>
                                <th className="py-2.5 px-4 w-40 text-right pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length > 0 ? (
                                filtered.map(s => {
                                    const isOut = s.status === 'Sleeping Out';
                                    const cardLocation = s.keyCardLocation || 'Held at Front Desk';

                                    return (
                                        <tr key={s.id} className="hover:bg-indigo-50/15 transition-colors">
                                            {/* Guest & Room */}
                                            <td className="py-2.5 px-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center justify-center text-xs flex-shrink-0">
                                                        {s.guestName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-900">{s.guestName}</span>
                                                            <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 text-[10.5px]">
                                                                Room {s.roomNumber}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10.5px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                            <span className="font-mono">{s.reservationNumber}</span>
                                                            <span>•</span>
                                                            <span>{s.contact}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Pass & Dates */}
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-indigo-700 text-xs">{s.securityPassNo}</span>
                                                </div>
                                                <p className="text-[10.5px] text-slate-600 mt-0.5">
                                                    {s.startDate} ➔ {s.endDate} ({s.expectedReturnTime || 'Morning'})
                                                </p>
                                            </td>

                                            {/* Reason */}
                                            <td className="py-2.5 px-3">
                                                <p className="text-[11px] text-slate-700 max-w-[280px] leading-relaxed">
                                                    {s.reason}
                                                </p>
                                            </td>

                                            {/* Key Card Location */}
                                            <td className="py-2.5 px-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] border inline-block ${
                                                    cardLocation === 'Held at Front Desk'
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}>
                                                    {cardLocation}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="py-2.5 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] border ${
                                                    isOut
                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-2.5 px-4 text-right pr-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isOut && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleMarkReturned(s.id)}
                                                            className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                                            title="Mark Guest Returned to Room"
                                                        >
                                                            <Check size={11} className="stroke-[3]" />
                                                            <span>Returned</span>
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => setPrintPassTarget(s)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                        title="Print Security Gate Pass"
                                                    >
                                                        <Printer size={13} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(s.id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                            <Moon size={26} className="text-slate-300" />
                                            <p className="text-xs text-slate-700">No sleep out records found</p>
                                            <p className="text-[11px] text-slate-400">All in-house guests are logged as staying on-property.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Sleep Out Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-[500px] w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
                        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold shadow-sm ring-2 ring-indigo-100">
                                    <Moon size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Log Guest Sleep-Out Pass</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Official Front Desk &amp; Security Registry</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSleepOut} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Room Number</label>
                                    <input
                                        type="text"
                                        value={form.roomNumber}
                                        onChange={e => setForm({ ...form, roomNumber: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-blue-500 shadow-2xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Res #</label>
                                    <input
                                        type="text"
                                        value={form.reservationNumber}
                                        onChange={e => setForm({ ...form, reservationNumber: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-blue-500 shadow-2xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Guest Full Name</label>
                                    <input
                                        type="text"
                                        value={form.guestName}
                                        onChange={e => setForm({ ...form, guestName: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Emergency Mobile</label>
                                    <input
                                        type="text"
                                        value={form.contact}
                                        onChange={e => setForm({ ...form, contact: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Away Start Date</label>
                                    <input
                                        type="date"
                                        value={form.startDate}
                                        onChange={e => setForm({ ...form, startDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Expected Return Date</label>
                                    <input
                                        type="date"
                                        value={form.endDate}
                                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Key Card Handling</label>
                                <select
                                    value={form.keyCardLocation}
                                    onChange={e => setForm({ ...form, keyCardLocation: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                                >
                                    <option value="Held at Front Desk">Held at Front Desk (Safe Storage)</option>
                                    <option value="With Guest">Guest Keeping Key Card</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Reason / Purpose for Absence</label>
                                <textarea
                                    rows={2}
                                    value={form.reason}
                                    onChange={e => setForm({ ...form, reason: e.target.value })}
                                    placeholder="e.g. Traveling to Chittagong for business, returning tomorrow morning."
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs resize-none placeholder:text-slate-400"
                                    required
                                />
                            </div>

                            <div className="pt-3 -mx-6 -mb-6 px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-9 px-4 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-9 px-4.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                                >
                                    <Check size={14} className="stroke-[3]" />
                                    <span>Register Sleep-Out</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Printable Security Gate Pass */}
            {printPassTarget && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-[500px] w-full p-5 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="border border-slate-300 p-4 rounded-lg space-y-3">
                            <div className="flex justify-between items-center border-b pb-2 border-slate-200">
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">HotelOS Security Gate Pass</h3>
                                    <p className="text-[10px] text-slate-500">Guest Sleep-Out Authorization Voucher</p>
                                </div>
                                <span className="font-mono text-indigo-700 text-xs">{printPassTarget.securityPassNo}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Guest Name</span>
                                    <p className="text-slate-900">{printPassTarget.guestName}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Room &amp; Category</span>
                                    <p className="text-blue-700 font-mono">Room {printPassTarget.roomNumber} ({printPassTarget.roomType})</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Departure Date</span>
                                    <p className="font-medium text-slate-800">{printPassTarget.startDate}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Expected Return</span>
                                    <p className="font-medium text-slate-800">{printPassTarget.endDate} ({printPassTarget.expectedReturnTime || 'Morning'})</p>
                                </div>
                            </div>

                            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-700">
                                <strong>Reason:</strong> {printPassTarget.reason}
                            </div>

                            <div className="pt-4 flex justify-between text-center text-[10px] text-slate-400 border-t border-slate-200">
                                <div className="border-t border-slate-400 pt-1 w-32">Duty Officer Sign</div>
                                <div className="border-t border-slate-400 pt-1 w-32">Guest Signature</div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPrintPassTarget(null)}
                                className="h-8 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="btn-primary"
                            >
                                <Printer size={13} />
                                <span>Print Pass</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReservationSleepOut;
