import React, { useState, useEffect, useMemo } from 'react';
import {
    Clock, Plus, Search, CheckCircle2, X,
    ArrowRight, Check, RefreshCw
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import PageHeader from '../common/PageHeader';

export interface HoldItem {
    id: number;
    reservationNumber: string;
    guestName: string;
    contact?: string;
    status: 'Hold' | 'Confirmed' | 'Expired';
    holdStartDate: string;
    holdEndDate: string;
    reason: string;
    reservationDate: string;
    checkInDate: string;
    checkOutDate: string;
    roomType: string;
    estimatedAmount: number;
    depositRequiredBDT?: number;
}

const INITIAL_HOLDS: HoldItem[] = [
    { 
        id: 1, 
        reservationNumber: 'HLD-2026-001', 
        guestName: 'Brig. Gen. M. Haque', 
        contact: '+880 1711-123456', 
        status: 'Hold', 
        holdStartDate: '2026-06-29', 
        holdEndDate: '2026-07-02', 
        reason: 'Awaiting official government defense delegation travel clearance letter.', 
        reservationDate: '2026-06-29', 
        checkInDate: '2026-07-10', 
        checkOutDate: '2026-07-15', 
        roomType: 'Executive Suite', 
        estimatedAmount: 32500,
        depositRequiredBDT: 10000
    },
    { 
        id: 2, 
        reservationNumber: 'HLD-2026-002', 
        guestName: 'Beximco Pharma VIP Team', 
        contact: '+880 1819-234567', 
        status: 'Hold', 
        holdStartDate: '2026-06-30', 
        holdEndDate: '2026-07-01', 
        reason: 'Corporate purchase order pending final regional finance director signature.', 
        reservationDate: '2026-06-30', 
        checkInDate: '2026-07-05', 
        checkOutDate: '2026-07-08', 
        roomType: 'Deluxe Double', 
        estimatedAmount: 18000,
        depositRequiredBDT: 6000
    },
    { 
        id: 3, 
        reservationNumber: 'HLD-2026-003', 
        guestName: 'Mr. David Wilson (UK Embassy)', 
        contact: '+44 7911-123456', 
        status: 'Hold', 
        holdStartDate: '2026-07-01', 
        holdEndDate: '2026-07-03', 
        reason: 'Connecting Emirates flight confirmation from Dubai pending arrival visa issue.', 
        reservationDate: '2026-07-01', 
        checkInDate: '2026-07-12', 
        checkOutDate: '2026-07-16', 
        roomType: 'Superior King', 
        estimatedAmount: 18000,
        depositRequiredBDT: 9000
    }
];

export const ReservationHold: React.FC = () => {
    const { setActivePage } = useNavigation();
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'Hold' | 'Confirmed' | 'Expired'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state
    const [holds, setHolds] = useState<HoldItem[]>(() => {
        try {
            const saved = localStorage.getItem('hotel_holds_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error(e);
        }
        return INITIAL_HOLDS;
    });

    useEffect(() => {
        try {
            localStorage.setItem('hotel_holds_v2', JSON.stringify(holds));
        } catch (e) {
            console.error(e);
        }
    }, [holds]);

    // Modal Form State
    const [form, setForm] = useState({
        reservationNumber: `HLD-2026-00${holds.length + 1}`,
        guestName: '',
        contact: '',
        holdStartDate: '2026-07-01',
        holdEndDate: '2026-07-03',
        checkInDate: '2026-07-08',
        checkOutDate: '2026-07-11',
        roomType: 'Deluxe Double',
        estimatedAmount: 9000,
        depositRequiredBDT: 3000,
        reason: 'Awaiting formal corporate confirmation & advance payment.'
    });

    const handleCreateHold = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.guestName || !form.reason) return;

        const newItem: HoldItem = {
            id: Date.now(),
            reservationNumber: `HLD-2026-${String(Math.floor(100 + Math.random() * 900))}`,
            guestName: form.guestName,
            contact: form.contact || '+880 1711-000000',
            status: 'Hold',
            holdStartDate: form.holdStartDate,
            holdEndDate: form.holdEndDate,
            reason: form.reason,
            reservationDate: new Date().toISOString().split('T')[0],
            checkInDate: form.checkInDate,
            checkOutDate: form.checkOutDate,
            roomType: form.roomType,
            estimatedAmount: form.estimatedAmount,
            depositRequiredBDT: form.depositRequiredBDT
        };

        setHolds(prev => [newItem, ...prev]);
        showToast(`Hold reservation ${newItem.reservationNumber} created for ${newItem.guestName}`);
        setIsModalOpen(false);
    };

    const handleConfirmBooking = (item: HoldItem) => {
        // Convert hold to confirmed reservation
        setHolds(prev =>
            prev.map(h => h.id === item.id ? { ...h, status: 'Confirmed' } : h)
        );

        // Also push into active reservations in hotel_reservations_v2
        try {
            const existingResStr = localStorage.getItem('hotel_reservations_v2');
            const existingRes = existingResStr ? JSON.parse(existingResStr) : [];
            const newRes = {
                id: Date.now(),
                reservationNumber: `RES-${String(Math.floor(100000 + Math.random() * 900000))}`,
                guestName: item.guestName,
                phone: item.contact || '+880 1711-000000',
                roomNumber: '102',
                roomType: item.roomType,
                roomStatus: 'clean',
                checkIn: item.checkInDate,
                checkOut: item.checkOutDate,
                nights: 3,
                adults: 2,
                children: 0,
                totalAmount: item.estimatedAmount,
                paidAmount: item.depositRequiredBDT || 0,
                dueAmount: Math.max(0, item.estimatedAmount - (item.depositRequiredBDT || 0)),
                status: 'arriving',
                source: 'Confirmed from Hold',
                vip: 'VIP',
                specialRequests: `Converted from Hold ${item.reservationNumber}`
            };
            existingRes.unshift(newRes);
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(existingRes));
        } catch (e) {
            console.error('Failed to convert hold to reservation', e);
        }

        showToast(`Hold ${item.reservationNumber} converted to active Confirmed Reservation!`);
    };

    const handleReleaseHold = (id: number) => {
        if (window.confirm('Release and cancel this hold booking? Room inventory will be freed for public sale.')) {
            setHolds(prev => prev.filter(h => h.id !== id));
            showToast('Hold reservation released. Room inventory unlocked.');
        }
    };

    // Filter Logic
    const filtered = useMemo(() => {
        const q = (searchQuery || '').toLowerCase().trim();
        return holds.filter(h => {
            const matchesQuery = !q ||
                (h.guestName || '').toLowerCase().includes(q) ||
                (h.reservationNumber || '').toLowerCase().includes(q) ||
                (h.roomType || '').toLowerCase().includes(q) ||
                (h.reason || '').toLowerCase().includes(q);
            const matchesStatus = filterStatus === 'all' || h.status === filterStatus;
            return matchesQuery && matchesStatus;
        });
    }, [holds, searchQuery, filterStatus]);

    const activeHolds = useMemo(() => holds.filter(h => h.status === 'Hold'), [holds]);
    const expiringTodayCount = useMemo(() => holds.filter(h => h.status === 'Hold' && h.holdEndDate <= '2026-07-01').length, [holds]);
    const totalPotentialRevenue = useMemo(() => holds.reduce((acc, h) => acc + (Number(h.estimatedAmount) || 0), 0), [holds]);

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
                title="Reservation Hold & Tentative Block Queue"
                subtitle="Manages tentative room blocks pending purchase orders, embassy visas, or advance bank transfers"
                icon={<Clock size={22} />}
                badge={
                    <span className="badge-status-active">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {activeHolds.length} Active Holds
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
                            <span>New Hold Block</span>
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
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Active Holds</span>
                    <div className="text-2xl font-black text-amber-900 font-mono mt-1">{activeHolds.length} Rooms</div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Temporarily blocked from sale</p>
                </div>

                <div className="card-container p-4">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Expiring Today</span>
                    <div className="text-2xl font-black text-rose-700 font-mono mt-1">{expiringTodayCount} Deadline</div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Requires confirmation or release</p>
                </div>

                <div className="card-container p-4">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Converted to Confirmed</span>
                    <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                        {holds.filter(h => h.status === 'Confirmed').length} Bookings
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Successfully booked</p>
                </div>

                <div className="card-container p-4">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Potential Revenue</span>
                    <div className="text-2xl font-black text-slate-900 font-mono mt-1">BDT {totalPotentialRevenue.toLocaleString()}</div>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">Held inventory value</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col md:flex-row items-center justify-between gap-2.5">
                <div className="relative w-full md:w-80">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Guest, Hold #, Room Type, Reason..."
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
                            <option value="all">All Holds</option>
                            <option value="Hold">Active Hold</option>
                            <option value="Confirmed">Confirmed Bookings</option>
                            <option value="Expired">Expired</option>
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

            {/* Hold Register Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[1080px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                                <th className="py-2.5 px-3.5 w-60">Guest &amp; Reference</th>
                                <th className="py-2.5 px-3 w-40">Room Category</th>
                                <th className="py-2.5 px-3 w-40">Intended Stay</th>
                                <th className="py-2.5 px-3 w-48">Hold Expiry Deadline</th>
                                <th className="py-2.5 px-3 min-w-[180px]">Hold Reason</th>
                                <th className="py-2.5 px-3 w-36 text-right">Tariff Value</th>
                                <th className="py-2.5 px-3.5 w-44 text-right pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length > 0 ? (
                                filtered.map(h => {
                                    const isHold = h.status === 'Hold';
                                    const isExpiring = isHold && h.holdEndDate <= '2026-07-01';

                                    return (
                                        <tr key={h.id} className="hover:bg-amber-50/15 transition-colors">
                                            {/* Guest & Reference */}
                                            <td className="py-2.5 px-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center text-xs flex-shrink-0">
                                                        {h.guestName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-900">{h.guestName}</div>
                                                        <div className="text-[10.5px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                            <span className="font-mono text-blue-700 font-semibold">{h.reservationNumber}</span>
                                                            {h.contact && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>{h.contact}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="py-2.5 px-3">
                                                <span className="text-slate-800">{h.roomType}</span>
                                                <span className="text-[10px] text-slate-400 block mt-0.5">Tentative Lock</span>
                                            </td>

                                            {/* Stay Dates */}
                                            <td className="py-2.5 px-3">
                                                <div className="text-[11px] font-semibold text-slate-800 leading-tight">
                                                    <span>{h.checkInDate}</span> ➔ <span>{h.checkOutDate}</span>
                                                </div>
                                            </td>

                                            {/* Hold Deadline */}
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-amber-900 text-xs">{h.holdEndDate}</span>
                                                    {isExpiring && (
                                                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] animate-pulse">
                                                            Expires Today!
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-400 block mt-0.5">Auto-release at 18:00</span>
                                            </td>

                                            {/* Reason */}
                                            <td className="py-2.5 px-3">
                                                <p className="text-[11px] text-slate-700 max-w-[240px] leading-relaxed truncate">
                                                    {h.reason}
                                                </p>
                                            </td>

                                            {/* Tariff */}
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="font-mono text-slate-900 text-xs">
                                                    ৳{h.estimatedAmount.toLocaleString()}
                                                </div>
                                                <span className="text-[9.5px] text-slate-400 block mt-0.5">
                                                    Dep: ৳{(h.depositRequiredBDT || 0).toLocaleString()}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-2.5 px-3.5 text-right pr-4">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isHold ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleConfirmBooking(h)}
                                                                className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                                                title="Convert Hold into Confirmed Active Booking"
                                                            >
                                                                <Check size={11} className="stroke-[3]" />
                                                                <span>Confirm</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleReleaseHold(h.id)}
                                                                className="h-7 px-2 border border-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold rounded-lg text-[10.5px] cursor-pointer transition-colors"
                                                                title="Release Room back to General Sale"
                                                            >
                                                                Release
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            {h.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                            <Clock size={26} className="text-slate-300" />
                                            <p className="text-xs text-slate-700">No hold reservations in queue</p>
                                            <p className="text-[11px] text-slate-400">All room inventory is available for direct reservation.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Hold Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-[520px] w-full overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
                        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-sm ring-2 ring-amber-100">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Create Tentative Hold Block</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Temporarily reserve room pending payment confirmation</p>
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

                        <form onSubmit={handleCreateHold} className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Guest / Group Name</label>
                                    <input
                                        type="text"
                                        value={form.guestName}
                                        onChange={e => setForm({ ...form, guestName: e.target.value })}
                                        placeholder="e.g. Beximco Delegation"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Mobile Number</label>
                                    <input
                                        type="text"
                                        value={form.contact}
                                        onChange={e => setForm({ ...form, contact: e.target.value })}
                                        placeholder="+880 1711-000000"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Room Category</label>
                                    <select
                                        value={form.roomType}
                                        onChange={e => setForm({ ...form, roomType: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                                    >
                                        <option value="Deluxe Double">Deluxe Double</option>
                                        <option value="Superior King">Superior King</option>
                                        <option value="Executive Suite">Executive Suite</option>
                                        <option value="Standard Single">Standard Single</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Hold Release Deadline</label>
                                    <input
                                        type="date"
                                        value={form.holdEndDate}
                                        onChange={e => setForm({ ...form, holdEndDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-amber-900 font-medium outline-none focus:border-blue-500 shadow-2xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Target Check-In</label>
                                    <input
                                        type="date"
                                        value={form.checkInDate}
                                        onChange={e => setForm({ ...form, checkInDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Target Check-Out</label>
                                    <input
                                        type="date"
                                        value={form.checkOutDate}
                                        onChange={e => setForm({ ...form, checkOutDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Estimated Total (BDT)</label>
                                    <input
                                        type="number"
                                        value={form.estimatedAmount}
                                        onChange={e => setForm({ ...form, estimatedAmount: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Deposit Needed (BDT)</label>
                                    <input
                                        type="number"
                                        value={form.depositRequiredBDT}
                                        onChange={e => setForm({ ...form, depositRequiredBDT: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Hold Justification / Reason</label>
                                <textarea
                                    rows={2}
                                    value={form.reason}
                                    onChange={e => setForm({ ...form, reason: e.target.value })}
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs resize-none placeholder:text-slate-400"
                                    placeholder="Enter authorization notes or company details..."
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
                                    className="h-9 px-4.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                                >
                                    <Check size={14} className="stroke-[3]" />
                                    <span>Create Hold Block</span>
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
