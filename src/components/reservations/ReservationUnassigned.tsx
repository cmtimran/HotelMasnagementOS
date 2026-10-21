import React, { useState, useEffect, useMemo } from 'react';
import {
    BedDouble, Search, CheckCircle2, X, Check, ArrowRight,
    Sparkles, RefreshCw
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

export interface UnassignedItem {
    id: string | number;
    reservationNumber: string;
    guestName: string;
    phone?: string;
    email?: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    adults?: number;
    children?: number;
    source: string;
    totalAmount: number;
    paidAmount?: number;
    vip?: string;
    assignedRoom?: string;
    specialRequests?: string;
}

const INITIAL_UNASSIGNED: UnassignedItem[] = [
    { 
        id: 'un-1', 
        reservationNumber: 'RES-009290', 
        guestName: 'Naimur Rahman', 
        phone: '+880 1711-889900', 
        roomType: 'Deluxe Double', 
        checkIn: '2026-07-01', 
        checkOut: '2026-07-04', 
        nights: 3, 
        adults: 2, 
        children: 1, 
        source: 'Booking.com', 
        totalAmount: 9000, 
        paidAmount: 9000,
        vip: 'Gold VIP',
        specialRequests: 'Quiet room on higher floor, extra pillows'
    },
    { 
        id: 'un-2', 
        reservationNumber: 'RES-009291', 
        guestName: 'Tahmina Akter', 
        phone: '+880 1819-776655', 
        roomType: 'Superior King', 
        checkIn: '2026-07-01', 
        checkOut: '2026-07-03', 
        nights: 2, 
        adults: 2, 
        children: 0, 
        source: 'Agoda YCS', 
        totalAmount: 9000, 
        paidAmount: 9000,
        vip: 'VIP',
        specialRequests: 'Sea view preferred, anniversary celebration'
    },
    { 
        id: 'un-3', 
        reservationNumber: 'RES-009292', 
        guestName: 'Standard Chartered Exec', 
        phone: '+880 1912-334455', 
        roomType: 'Executive Suite', 
        checkIn: '2026-07-02', 
        checkOut: '2026-07-05', 
        nights: 3, 
        adults: 1, 
        children: 0, 
        source: 'Corporate Account', 
        totalAmount: 19500, 
        paidAmount: 19500,
        vip: 'Corporate Diamond',
        specialRequests: 'Airport pickup arranged, early check-in requested'
    },
    { 
        id: 'un-4', 
        reservationNumber: 'RES-009293', 
        guestName: 'Mahir Faisal', 
        phone: '+880 1611-223344', 
        roomType: 'Deluxe Double', 
        checkIn: '2026-07-03', 
        checkOut: '2026-07-05', 
        nights: 2, 
        adults: 2, 
        children: 0, 
        source: 'Direct Website', 
        totalAmount: 6000, 
        paidAmount: 3000,
        vip: 'Regular',
        specialRequests: 'Twin beds if available'
    }
];

const AVAILABLE_CLEAN_ROOMS_MAP: Record<string, Array<{ number: string; floor: number; status: 'clean' | 'inspected'; bed: string }>> = {
    'Deluxe Double': [
        { number: '102', floor: 1, status: 'clean', bed: 'Queen' },
        { number: '104', floor: 1, status: 'inspected', bed: 'King' },
        { number: '206', floor: 2, status: 'clean', bed: 'Twin' },
        { number: '207', floor: 2, status: 'clean', bed: 'King' },
        { number: '301', floor: 3, status: 'clean', bed: 'King' },
        { number: '403', floor: 4, status: 'clean', bed: 'King' }
    ],
    'Superior King': [
        { number: '201', floor: 2, status: 'inspected', bed: 'King' },
        { number: '306', floor: 3, status: 'clean', bed: 'King' },
        { number: '308', floor: 3, status: 'inspected', bed: 'King' },
        { number: '505', floor: 5, status: 'clean', bed: 'King' }
    ],
    'Executive Suite': [
        { number: '203', floor: 2, status: 'clean', bed: 'King' },
        { number: '401', floor: 4, status: 'clean', bed: 'King' },
        { number: '502', floor: 5, status: 'inspected', bed: 'King' }
    ],
    'Presidential Suite': [
        { number: '501', floor: 5, status: 'clean', bed: 'King' },
        { number: '503', floor: 5, status: 'inspected', bed: 'King' }
    ],
    'Standard Single': [
        { number: '105', floor: 1, status: 'clean', bed: 'Single' },
        { number: '106', floor: 1, status: 'clean', bed: 'Single' },
        { number: '205', floor: 2, status: 'clean', bed: 'Single' },
        { number: '302', floor: 3, status: 'clean', bed: 'Single' },
        { number: '405', floor: 4, status: 'clean', bed: 'Single' }
    ]
};

export const ReservationUnassigned: React.FC = () => {
    const { setActivePage } = useNavigation();
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterDate, setFilterDate] = useState('all');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state safely from localStorage
    const [unassignedList, setUnassignedList] = useState<UnassignedItem[]>(() => {
        try {
            const saved = localStorage.getItem('hotel_unassigned_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Failed to read unassigned bookings', e);
        }
        return INITIAL_UNASSIGNED;
    });

    useEffect(() => {
        try {
            localStorage.setItem('hotel_unassigned_v2', JSON.stringify(unassignedList));
        } catch (e) {
            console.error('Failed to save unassigned bookings', e);
        }
    }, [unassignedList]);

    // Active assignment modal
    const [assignTarget, setAssignTarget] = useState<UnassignedItem | null>(null);
    const [targetRoom, setTargetRoom] = useState<string>('');

    // Available rooms for current modal target
    const currentAvailableRooms = useMemo(() => {
        if (!assignTarget) return [];
        const typePool = AVAILABLE_CLEAN_ROOMS_MAP[assignTarget.roomType] || AVAILABLE_CLEAN_ROOMS_MAP['Deluxe Double'] || [];
        return typePool;
    }, [assignTarget]);

    useEffect(() => {
        if (currentAvailableRooms.length > 0) {
            setTargetRoom(currentAvailableRooms[0].number);
        } else {
            setTargetRoom('101');
        }
    }, [currentAvailableRooms]);

    // Handle Confirm Room Assignment
    const handleConfirmAssign = () => {
        if (!assignTarget || !targetRoom) return;

        // 1. Update unassigned list
        const remaining = unassignedList.filter(u => String(u.id) !== String(assignTarget.id));
        setUnassignedList(remaining);

        // 2. Sync to active reservations
        try {
            const existingResStr = localStorage.getItem('hotel_reservations_v2');
            const existingRes = existingResStr ? JSON.parse(existingResStr) : [];
            const newRes = {
                id: Date.now(),
                reservationNumber: assignTarget.reservationNumber,
                guestName: assignTarget.guestName,
                phone: assignTarget.phone || '+880 1711-000000',
                email: assignTarget.email || 'guest@hospitality.com',
                roomNumber: targetRoom,
                roomType: assignTarget.roomType,
                roomStatus: 'clean',
                checkIn: assignTarget.checkIn,
                checkOut: assignTarget.checkOut,
                nights: assignTarget.nights,
                adults: assignTarget.adults || 1,
                children: assignTarget.children || 0,
                totalAmount: assignTarget.totalAmount,
                paidAmount: assignTarget.paidAmount || assignTarget.totalAmount,
                dueAmount: Math.max(0, assignTarget.totalAmount - (assignTarget.paidAmount || assignTarget.totalAmount)),
                status: 'arriving',
                source: assignTarget.source,
                vip: assignTarget.vip || 'None',
                specialRequests: assignTarget.specialRequests || ''
            };
            existingRes.unshift(newRes);
            localStorage.setItem('hotel_reservations_v2', JSON.stringify(existingRes));
        } catch (e) {
            console.error('Failed to sync to hotel_reservations_v2', e);
        }

        showToast(`Room ${targetRoom} allocated to ${assignTarget.guestName} (${assignTarget.reservationNumber})!`);
        setAssignTarget(null);
    };

    // Auto-allocate all unassigned rooms
    const handleAutoAssignAll = () => {
        if (unassignedList.length === 0) return;

        const count = unassignedList.length;
        try {
            const existingResStr = localStorage.getItem('hotel_reservations_v2');
            const existingRes = existingResStr ? JSON.parse(existingResStr) : [];

            unassignedList.forEach((item, idx) => {
                const pool = AVAILABLE_CLEAN_ROOMS_MAP[item.roomType] || AVAILABLE_CLEAN_ROOMS_MAP['Deluxe Double'] || [{ number: '101' }];
                const allocated = pool[idx % pool.length]?.number || String(100 + idx);

                existingRes.unshift({
                    id: Date.now() + idx,
                    reservationNumber: item.reservationNumber,
                    guestName: item.guestName,
                    phone: item.phone || '+880 1711-000000',
                    email: item.email || 'guest@hospitality.com',
                    roomNumber: allocated,
                    roomType: item.roomType,
                    roomStatus: 'clean',
                    checkIn: item.checkIn,
                    checkOut: item.checkOut,
                    nights: item.nights,
                    adults: item.adults || 1,
                    children: item.children || 0,
                    totalAmount: item.totalAmount,
                    paidAmount: item.paidAmount || item.totalAmount,
                    dueAmount: Math.max(0, item.totalAmount - (item.paidAmount || item.totalAmount)),
                    status: 'arriving',
                    source: item.source,
                    vip: item.vip || 'None'
                });
            });

            localStorage.setItem('hotel_reservations_v2', JSON.stringify(existingRes));
        } catch (e) {
            console.error('Failed to batch auto-assign', e);
        }

        setUnassignedList([]);
        showToast(`Auto-assigned all ${count} unassigned reservations to Best Available Clean Rooms!`);
    };

    // Filter Logic
    const filtered = useMemo(() => {
        return unassignedList.filter(u => {
            const matchesQuery =
                u.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.reservationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.roomType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.source.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesCategory = filterCategory === 'all' || u.roomType === filterCategory;
            const matchesDate = 
                filterDate === 'all' || 
                (filterDate === 'today' && u.checkIn === '2026-07-01') ||
                (filterDate === 'upcoming' && u.checkIn > '2026-07-01');

            return matchesQuery && matchesCategory && matchesDate;
        });
    }, [unassignedList, searchQuery, filterCategory, filterDate]);

    // Metrics
    const totalRevenueAtRisk = useMemo(() => {
        return unassignedList.reduce((acc, u) => acc + (Number(u.totalAmount) || 0), 0);
    }, [unassignedList]);

    const dueTodayCount = useMemo(() => {
        return unassignedList.filter(u => u.checkIn === '2026-07-01').length;
    }, [unassignedList]);

    return (
        <div className="p-3 sm:p-4 max-w-[1400px] mx-auto space-y-3 font-sans select-none animate-in fade-in duration-150">
            {toastMessage && (
                <div className="fixed top-4 right-4 z-[99999] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Top Operational Header */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 text-white flex items-center justify-center font-bold shadow-xs flex-shrink-0">
                        <BedDouble size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none">
                                Unassigned Rooms Queue
                            </h1>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                                {unassignedList.length} Awaiting Room #
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-none mt-1">
                            Confirmed reservations from OTAs and website engines pending physical room allocation
                        </p>
                    </div>
                </div>

                {/* Primary Actions */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {unassignedList.length > 0 && (
                        <button
                            type="button"
                            onClick={handleAutoAssignAll}
                            className="h-8 px-3.5 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                            title="Auto-Assign all unassigned reservations to best available clean rooms"
                        >
                            <Sparkles size={13} className="text-blue-200" />
                            <span>Auto-Allocate All</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setActivePage('stay-view')}
                        className="h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                    >
                        <span>Stay View</span>
                        <ArrowRight size={13} />
                    </button>

                    <button
                        type="button"
                        onClick={() => setActivePage('front-desk')}
                        className="h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                    >
                        <span>Front Desk</span>
                        <ArrowRight size={13} />
                    </button>
                </div>
            </div>

            {/* Operational Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Unassigned</span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{unassignedList.length} Bookings</div>
                    <p className="text-[10px] text-slate-500 mt-1">Pending physical room keys</p>
                </div>

                <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Due In Today (Urgent)</span>
                    <div className="text-xl font-black text-rose-900 font-mono mt-0.5">{dueTodayCount} Guests</div>
                    <p className="text-[10px] text-rose-700 mt-1">Arriving on 01 Jul 2026</p>
                </div>

                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Clean Rooms in Stock</span>
                    <div className="text-xl font-black text-emerald-900 font-mono mt-0.5">18 Ready</div>
                    <p className="text-[10px] text-emerald-700 mt-1">100% capacity available to allocate</p>
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-[#1e3a8a] text-white p-3 rounded-xl shadow-xs">
                    <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">Revenue In Queue</span>
                    <div className="text-xl font-black font-mono mt-0.5">BDT {totalRevenueAtRisk.toLocaleString()}</div>
                    <p className="text-[10px] text-blue-200/80 mt-1">Guaranteed prepaid &amp; corporate tariffs</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 flex flex-col md:flex-row items-center justify-between gap-2.5">
                <div className="relative w-full md:w-80">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search Guest, Res #, Category, Channel..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full h-8 pl-8 pr-3 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Category:</span>
                        <select
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                        >
                            <option value="all">All Room Categories</option>
                            <option value="Deluxe Double">Deluxe Double</option>
                            <option value="Superior King">Superior King</option>
                            <option value="Executive Suite">Executive Suite</option>
                            <option value="Standard Single">Standard Single</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Arrival Date:</span>
                        <select
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                            className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today (01 Jul 2026)</option>
                            <option value="upcoming">Upcoming Check-Ins</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery('');
                            setFilterCategory('all');
                            setFilterDate('all');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Reset Filters"
                    >
                        <RefreshCw size={13} />
                    </button>
                </div>
            </div>

            {/* Unassigned Bookings Data Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs min-w-[1080px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                                <th className="py-2.5 px-3.5 w-60">Res # &amp; Guest</th>
                                <th className="py-2.5 px-3 w-48">Reserved Category</th>
                                <th className="py-2.5 px-3 w-40">Stay Period</th>
                                <th className="py-2.5 px-2.5 w-24 text-center">Pax</th>
                                <th className="py-2.5 px-3 w-36">Channel / Source</th>
                                <th className="py-2.5 px-3 w-36 text-right">Tariff / Balance</th>
                                <th className="py-2.5 px-3.5 w-44 text-right pr-4">Allocation Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length > 0 ? (
                                filtered.map(u => {
                                    const isToday = u.checkIn === '2026-07-01';

                                    return (
                                        <tr key={u.id} className="hover:bg-rose-50/15 transition-colors">
                                            {/* Res # & Guest */}
                                            <td className="py-2.5 px-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                        {u.guestName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-slate-900">{u.guestName}</span>
                                                            {u.vip && u.vip !== 'None' && u.vip !== 'Regular' && (
                                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                                                    {u.vip}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-0.5">
                                                            <span className="font-mono text-blue-700 font-semibold">{u.reservationNumber}</span>
                                                            {u.phone && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>{u.phone}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Reserved Category */}
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-slate-800">{u.roomType}</span>
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                                        No Room #
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[160px]">
                                                    {u.specialRequests || 'Standard room amenities'}
                                                </p>
                                            </td>

                                            {/* Stay Period */}
                                            <td className="py-2.5 px-3">
                                                <div className="text-[11px] font-semibold text-slate-800 leading-tight">
                                                    <span>{u.checkIn}</span> ➔ <span>{u.checkOut}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                    <span className="font-bold text-blue-700">{u.nights} Night{u.nights > 1 ? 's' : ''}</span>
                                                    {isToday && (
                                                        <span className="px-1 py-0.2 rounded bg-rose-100 text-rose-800 font-bold text-[9px]">
                                                            Today!
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Pax */}
                                            <td className="py-2.5 px-2.5 text-center font-bold text-slate-700">
                                                {u.adults || 1}A {(u.children || 0) > 0 ? `+ ${u.children}C` : ''}
                                            </td>

                                            {/* Source */}
                                            <td className="py-2.5 px-3">
                                                <span className="text-[11px] font-semibold text-slate-700 block">
                                                    {u.source}
                                                </span>
                                                <span className="text-[9.5px] text-slate-400">OTA Engine</span>
                                            </td>

                                            {/* Tariff */}
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="font-mono font-bold text-slate-900 text-xs">
                                                    ৳{u.totalAmount ? u.totalAmount.toLocaleString() : '0'}
                                                </div>
                                                <span className="text-[9.5px] text-emerald-700 font-semibold block mt-0.5">
                                                    Prepaid Guarantee
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-2.5 px-3.5 text-right pr-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setAssignTarget(u)}
                                                    className="h-7 px-3 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                                                >
                                                    <span>Assign Room</span>
                                                    <ArrowRight size={11} className="stroke-[2.5]" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-1.5">
                                            <CheckCircle2 size={26} className="text-emerald-500" />
                                            <p className="text-xs font-bold text-slate-700">All reservations have physical rooms assigned!</p>
                                            <p className="text-[11px] text-slate-400">Zero unassigned backlogs in queue.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Clean Physical Room Allocation Modal */}
            {assignTarget && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-[500px] w-full p-4.5 space-y-4 animate-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center font-bold">
                                    <BedDouble size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Assign Clean Room</h3>
                                    <p className="text-[11px] text-slate-500 font-mono">{assignTarget.reservationNumber} • {assignTarget.guestName}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAssignTarget(null)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Guest & Stay Context Summary */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Reserved Category:</span>
                                <strong className="text-blue-800 font-bold">{assignTarget.roomType}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Stay Duration:</span>
                                <span className="font-medium text-slate-800">{assignTarget.checkIn} ➔ {assignTarget.checkOut} ({assignTarget.nights} Nights)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Tariff Guaranteed:</span>
                                <span className="font-mono font-bold text-emerald-700">BDT {assignTarget.totalAmount.toLocaleString()}</span>
                            </div>
                            {assignTarget.specialRequests && (
                                <div className="border-t border-slate-200/60 pt-1 text-[11px] text-slate-600">
                                    <strong>Guest Requests:</strong> {assignTarget.specialRequests}
                                </div>
                            )}
                        </div>

                        {/* Room Selection from Live Clean Inventory */}
                        <div className="space-y-1.5 text-xs">
                            <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                                <span>Select Available Clean Room</span>
                                <span className="text-emerald-700 font-semibold">{currentAvailableRooms.length} rooms ready</span>
                            </label>

                            {currentAvailableRooms.length > 0 ? (
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                                    {currentAvailableRooms.map(rm => (
                                        <div
                                            key={rm.number}
                                            onClick={() => setTargetRoom(rm.number)}
                                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                                                targetRoom === rm.number
                                                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                                                    : 'border-slate-200 hover:border-blue-300 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-black font-mono text-slate-900">Room {rm.number}</span>
                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {rm.status === 'inspected' ? 'Inspected' : 'Clean'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-1">Floor {rm.floor} • {rm.bed} Bed</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
                                    No exact match found in current category. Room will be assigned from General Best Available Pool.
                                </div>
                            )}
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setAssignTarget(null)}
                                className="h-8 px-3.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAssign}
                                className="h-8 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                                <Check size={14} className="stroke-[3]" />
                                <span>Confirm Room {targetRoom}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReservationUnassigned;
