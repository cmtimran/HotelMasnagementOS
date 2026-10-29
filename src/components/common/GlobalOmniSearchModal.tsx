import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Search,
    X,
    Calendar,
    BedDouble,
    Utensils,
    Building2,
    Users,
    Sparkles,
    FileText,
    ArrowRight,
    Command,
    CornerDownLeft,
    Shield,
    Receipt,
    Plus,
    Moon,
    LayoutGrid,
    CalendarDays,
    Check
} from 'lucide-react';
import {
    getCanonicalRooms,
    getAllStoredReservations,
    updateReservationStatusInDB,
    updateRoomHousekeepingInDB,
    syncReservationsFromDB,
    isRoomUnassigned,
    type StoredReservation,
    type CanonicalRoom
} from '../../utils/roomInventoryEngine';
import type { DrawerMode } from '../modals/ReservationActionDrawer';
import { toast } from '../../context/ToastContext';

export interface GlobalOmniSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    setActivePage: (page: string) => void;
    onOpenReservationDetails?: (res: StoredReservation, mode?: DrawerMode) => void;
}

type CategoryFilter = 'ALL' | 'RESERVATIONS' | 'ROOMS' | 'PAGES' | 'ACTIONS';

export const GlobalOmniSearchModal: React.FC<GlobalOmniSearchModalProps> = ({
    isOpen,
    onClose,
    setActivePage,
    onOpenReservationDetails
}) => {
    const [query, setQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Focus input on open & reset state
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setCategoryFilter('ALL');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Available system pages for fast navigation
    const systemPages = useMemo(() => [
        { id: 'front-desk', title: 'Front Desk Overview', subtitle: 'Live arrivals, departures, in-house guests & operational timeline', icon: <Sparkles size={14} className="text-blue-600" /> },
        { id: 'room-rack', title: 'Room Rack Grid', subtitle: 'Visual matrix of room statuses, clean/dirty & occupancy', icon: <LayoutGrid size={14} className="text-indigo-600" /> },
        { id: 'stay-view', title: 'StayView Tape Chart', subtitle: 'Interactive 30-day timeline calendar of all bookings', icon: <CalendarDays size={14} className="text-emerald-600" /> },
        { id: 'reservations', title: 'Reservations Management', subtitle: 'All booking records, payment statuses & folio histories', icon: <Calendar size={14} className="text-amber-600" /> },
        { id: 'housekeeping', title: 'Housekeeping Grid', subtitle: 'Room cleanliness, maid rosters & inspection workflows', icon: <Sparkles size={14} className="text-rose-600" /> },
        { id: 'pos', title: 'Restaurant POS Billing', subtitle: 'Dine-in, takeaway, room billing & KOT kitchen orders', icon: <Utensils size={14} className="text-orange-600" /> },
        { id: 'kds', title: 'Kitchen Display System (KDS)', subtitle: 'Real-time station order queue & live chef ticket timer', icon: <Utensils size={14} className="text-red-600" /> },
        { id: 'rate-calendar', title: 'Rate Calendar & Yield', subtitle: 'Dynamic seasonal pricing, rate plans & channel multiplier', icon: <Calendar size={14} className="text-teal-600" /> },
        { id: 'properties', title: 'Chain Properties Directory', subtitle: 'Multi-property hotel chain console, inventory & database isolation', icon: <Building2 size={14} className="text-indigo-600" /> },
        { id: 'hotel-profile', title: 'Hotel Profile & Configuration', subtitle: 'Policies, outlets, bank accounts, folio numbering & tax', icon: <Building2 size={14} className="text-blue-600" /> },
        { id: 'night-audit', title: 'Night Audit Automation', subtitle: 'End-of-day rollover, auto folio billing & room revenue posting', icon: <Moon size={14} className="text-purple-600" /> },
        { id: 'folio-operations', title: 'Guest Folio Operations', subtitle: 'Invoices, city ledgers, split folios & settlement receipts', icon: <Receipt size={14} className="text-emerald-600" /> },
        { id: 'advance-accounting', title: 'Advance Accounting & USALI', subtitle: 'General Ledger, Chart of Accounts, P&L & Cash Flow', icon: <FileText size={14} className="text-blue-700" /> },
        { id: 'hrm-dashboard', title: 'HRM Staff & Shifts', subtitle: 'Employee records, work shifts, designations & payroll', icon: <Users size={14} className="text-sky-600" /> },
        { id: 'policy-management', title: 'Policies & Cancellation Rules', subtitle: 'Child policy, pet rules, tax VAT policies & check-in limits', icon: <Shield size={14} className="text-amber-600" /> },
    ], []);

    // Load rooms & reservations dynamically
    const allRooms = useMemo(() => getCanonicalRooms(), [isOpen, refreshKey]);
    const allReservations = useMemo(() => getAllStoredReservations(), [isOpen, refreshKey]);

    // Quick Action Handlers for Reservations
    const handleViewDetails = (res: StoredReservation, mode: DrawerMode = 'overview') => {
        if (onOpenReservationDetails) {
            onOpenReservationDetails(res, mode);
        } else {
            setActivePage('reservations');
        }
        onClose();
    };

    const handleCheckIn = async (e: React.MouseEvent, res: StoredReservation) => {
        e.stopPropagation();
        if (isRoomUnassigned(res.roomNumber, res.allocatedRooms)) {
            toast.error(`Cannot check in guest "${res.guestName || 'Guest'}": Room is unassigned. Please assign a room first.`, {
                title: 'Room Unassigned'
            });
            return;
        }
        const resId = res.reservationNumber || res.id;
        const ok = await updateReservationStatusInDB(resId, 'in-house');
        if (ok) {
            await syncReservationsFromDB();
            toast.success(`Guest ${res.guestName || 'Guest'} successfully checked in to Room ${res.roomNumber || 'Assigned'}!`, {
                title: 'Check-In Complete'
            });
            setRefreshKey(k => k + 1);
        } else {
            toast.error('Failed to check in reservation. Please check room availability.');
        }
    };

    const handleCheckOut = async (e: React.MouseEvent, res: StoredReservation) => {
        e.stopPropagation();
        const resId = res.reservationNumber || res.id;
        const ok = await updateReservationStatusInDB(resId, 'checked-out');
        if (ok) {
            await syncReservationsFromDB();
            toast.success(`Reservation ${res.reservationNumber} successfully checked out. Room is now flagged for Housekeeping.`, {
                title: 'Check-Out Complete'
            });
            setRefreshKey(k => k + 1);
        } else {
            toast.error('Failed to check out reservation.');
        }
    };

    const handleCancel = async (e: React.MouseEvent, res: StoredReservation) => {
        e.stopPropagation();
        const confirmed = window.confirm(`Are you sure you want to cancel reservation ${res.reservationNumber} for ${res.guestName}?`);
        if (!confirmed) return;

        const resId = res.reservationNumber || res.id;
        const ok = await updateReservationStatusInDB(resId, 'cancelled');
        if (ok) {
            await syncReservationsFromDB();
            toast.warning(`Reservation ${res.reservationNumber} has been cancelled.`, {
                title: 'Reservation Cancelled'
            });
            setRefreshKey(k => k + 1);
        }
    };

    // Quick Action Handlers for Rooms
    const handleToggleHousekeeping = async (e: React.MouseEvent, room: CanonicalRoom) => {
        e.stopPropagation();
        const nextStatus: 'Clean' | 'Dirty' = room.housekeepingStatus === 'Clean' ? 'Dirty' : 'Clean';
        const ok = await updateRoomHousekeepingInDB(room.number, nextStatus);
        if (ok) {
            toast.info(`Room ${room.number} cleanliness updated to ${nextStatus.toUpperCase()}`, {
                title: 'Housekeeping Updated'
            });
            setRefreshKey(k => k + 1);
        }
    };

    const handleBookRoom = (e: React.MouseEvent, room: CanonicalRoom) => {
        e.stopPropagation();
        try {
            localStorage.setItem('pms_preselected_room', room.number);
        } catch {}
        setActivePage('add-reservation');
        onClose();
    };

    // Filter Items by Query & Category
    const { matchedReservations, matchedRooms, matchedPages, matchedActions } = useMemo(() => {
        const q = query.trim().toLowerCase();

        // 1. Matched Reservations
        const resList = allReservations.filter(res => {
            if (!q) return true;
            const matchesGuest = (res.guestName || '').toLowerCase().includes(q);
            const matchesCode = (res.reservationNumber || '').toLowerCase().includes(q);
            const matchesRoom = String(res.roomNumber || '').toLowerCase().includes(q);
            const matchesPhone = String(res.phone || '').toLowerCase().includes(q);
            const matchesStatus = String(res.status || '').toLowerCase().includes(q);
            return matchesGuest || matchesCode || matchesRoom || matchesPhone || matchesStatus;
        });

        // 2. Matched Rooms
        const roomList = allRooms.filter(room => {
            if (!q) return true;
            const matchesNum = String(room.number).toLowerCase().includes(q);
            const matchesName = (room.name || '').toLowerCase().includes(q);
            const matchesType = (room.roomTypeName || '').toLowerCase().includes(q);
            const matchesHk = (room.housekeepingStatus || '').toLowerCase().includes(q);
            return matchesNum || matchesName || matchesType || matchesHk;
        });

        // 3. Matched Pages
        const pageList = systemPages.filter(p => {
            if (!q) return true;
            return p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
        });

        // 4. Quick Actions
        const defaultActions = [
            {
                id: 'act-new-res',
                title: 'Create New Reservation',
                subtitle: 'Open the comprehensive booking creator modal with tariff & room allocation',
                icon: <Plus size={15} className="text-blue-600" />,
                badge: 'PMS ACTION',
                badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                action: () => { setActivePage('add-reservation'); onClose(); }
            },
            {
                id: 'act-new-prop',
                title: 'Onboard New Property',
                subtitle: 'Add a new hotel branch with isolated database tenant provisioning',
                icon: <Building2 size={15} className="text-indigo-600" />,
                badge: 'HQ CHAIN',
                badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                action: () => { setActivePage('property-create'); onClose(); }
            },
            {
                id: 'act-pos-sale',
                title: 'Open Restaurant POS',
                subtitle: 'Launch point-of-sale terminal for food & beverage bills & room charges',
                icon: <Utensils size={15} className="text-orange-600" />,
                badge: 'F&B POS',
                badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
                action: () => { setActivePage('pos'); onClose(); }
            },
            {
                id: 'act-night-audit',
                title: 'Run Night Audit Verification',
                subtitle: 'Initiate day-end close, room tax posting & rollover to next operating day',
                icon: <Moon size={15} className="text-purple-600" />,
                badge: 'SYSTEM AUDIT',
                badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
                action: () => { setActivePage('night-audit'); onClose(); }
            }
        ];

        const actionList = defaultActions.filter(a => {
            if (!q) return true;
            return a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q);
        });

        return {
            matchedReservations: resList,
            matchedRooms: roomList,
            matchedPages: pageList,
            matchedActions: actionList
        };
    }, [query, allReservations, allRooms, systemPages, setActivePage, onClose]);

    // Compute active items based on selected category tab
    const filteredItems = useMemo(() => {
        let items: Array<{
            type: 'RESERVATION' | 'ROOM' | 'PAGE' | 'ACTION';
            id: string;
            data: any;
            onSelect: () => void;
        }> = [];

        if (categoryFilter === 'ALL' || categoryFilter === 'RESERVATIONS') {
            items = items.concat(
                matchedReservations.slice(0, categoryFilter === 'RESERVATIONS' ? 30 : 6).map(res => ({
                    type: 'RESERVATION',
                    id: `res-${res.id || res.reservationNumber}`,
                    data: res,
                    onSelect: () => handleViewDetails(res, 'overview')
                }))
            );
        }

        if (categoryFilter === 'ALL' || categoryFilter === 'ROOMS') {
            items = items.concat(
                matchedRooms.slice(0, categoryFilter === 'ROOMS' ? 30 : 6).map(room => ({
                    type: 'ROOM',
                    id: `room-${room.number}`,
                    data: room,
                    onSelect: () => { setActivePage('room-rack'); onClose(); }
                }))
            );
        }

        if (categoryFilter === 'ALL' || categoryFilter === 'PAGES') {
            items = items.concat(
                matchedPages.slice(0, categoryFilter === 'PAGES' ? 30 : 5).map(p => ({
                    type: 'PAGE',
                    id: `page-${p.id}`,
                    data: p,
                    onSelect: () => { setActivePage(p.id); onClose(); }
                }))
            );
        }

        if (categoryFilter === 'ALL' || categoryFilter === 'ACTIONS') {
            items = items.concat(
                matchedActions.slice(0, categoryFilter === 'ACTIONS' ? 20 : 4).map(a => ({
                    type: 'ACTION',
                    id: a.id,
                    data: a,
                    onSelect: a.action
                }))
            );
        }

        return items;
    }, [categoryFilter, matchedReservations, matchedRooms, matchedPages, matchedActions, setActivePage, onClose]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredItems[selectedIndex]) {
                    filteredItems[selectedIndex].onSelect();
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                const tabs: CategoryFilter[] = ['ALL', 'RESERVATIONS', 'ROOMS', 'PAGES', 'ACTIONS'];
                const nextIdx = (tabs.indexOf(categoryFilter) + 1) % tabs.length;
                setCategoryFilter(tabs[nextIdx]);
                setSelectedIndex(0);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredItems, selectedIndex, categoryFilter, onClose]);

    if (!isOpen) return null;

    // Helper to format reservation status badge
    const getReservationStatusStyle = (rawStatus: string) => {
        const s = (rawStatus || 'CONFIRMED').toUpperCase().replace(/_/g, '-');
        if (s.includes('CONFIRM')) {
            return {
                text: 'CONFIRMED',
                style: 'bg-emerald-50 text-emerald-700 border-emerald-300'
            };
        }
        if (s.includes('IN-HOUSE') || s.includes('ARRIVED') || s.includes('CHECKED-IN') || s.includes('STAYOVER')) {
            return {
                text: 'IN-HOUSE',
                style: 'bg-blue-50 text-blue-700 border-blue-300'
            };
        }
        if (s.includes('CHECKED-OUT') || s.includes('COMPLETED')) {
            return {
                text: 'CHECKED-OUT',
                style: 'bg-slate-100 text-slate-700 border-slate-300'
            };
        }
        if (s.includes('CANCEL') || s.includes('VOID')) {
            return {
                text: 'CANCELLED',
                style: 'bg-rose-50 text-rose-700 border-rose-300'
            };
        }
        if (s.includes('HOLD') || s.includes('TENTATIVE')) {
            return {
                text: 'HOLD',
                style: 'bg-amber-50 text-amber-700 border-amber-300'
            };
        }
        return {
            text: s,
            style: 'bg-purple-50 text-purple-700 border-purple-200'
        };
    };

    return (
        <div className="fixed inset-0 z-[99990] flex items-start justify-center pt-10 sm:pt-16 px-3 sm:px-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div
                className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[84vh] animate-in zoom-in-98 duration-150"
                onClick={e => e.stopPropagation()}
            >
                {/* 1. SEARCH INPUT BAR */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white">
                    <Search size={20} className="text-blue-600 shrink-0 stroke-[2.2]" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Search guest name, booking #, room 101, page name, or quick actions..."
                        className="flex-1 bg-transparent text-sm sm:text-base text-slate-800 placeholder:text-slate-400 outline-none font-medium"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                inputRef.current?.focus();
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                        >
                            <X size={15} />
                        </button>
                    )}
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                        ESC
                    </span>
                </div>

                {/* 2. CATEGORY FILTER TABS (All, Reservations, Rooms, Pages, Actions) */}
                <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                    <button
                        type="button"
                        onClick={() => { setCategoryFilter('ALL'); setSelectedIndex(0); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            categoryFilter === 'ALL'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                        }`}
                    >
                        <span>All</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${categoryFilter === 'ALL' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                            {matchedReservations.length + matchedRooms.length + matchedPages.length + matchedActions.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setCategoryFilter('RESERVATIONS'); setSelectedIndex(0); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            categoryFilter === 'RESERVATIONS'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                        }`}
                    >
                        <Users size={13} />
                        <span>Bookings & Guests</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${categoryFilter === 'RESERVATIONS' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                            {matchedReservations.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setCategoryFilter('ROOMS'); setSelectedIndex(0); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            categoryFilter === 'ROOMS'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                        }`}
                    >
                        <BedDouble size={13} />
                        <span>Rooms & Rack</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${categoryFilter === 'ROOMS' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                            {matchedRooms.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setCategoryFilter('PAGES'); setSelectedIndex(0); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            categoryFilter === 'PAGES'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                        }`}
                    >
                        <LayoutGrid size={13} />
                        <span>Pages & Modules</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${categoryFilter === 'PAGES' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                            {matchedPages.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setCategoryFilter('ACTIONS'); setSelectedIndex(0); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                            categoryFilter === 'ACTIONS'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                        }`}
                    >
                        <Sparkles size={13} />
                        <span>Actions</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${categoryFilter === 'ACTIONS' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                            {matchedActions.length}
                        </span>
                    </button>
                </div>

                {/* 3. RESULTS LIST */}
                <div ref={listRef} className="overflow-y-auto flex-1 p-2.5 sm:p-3 space-y-2">
                    {filteredItems.length === 0 ? (
                        <div className="py-14 text-center text-slate-400 space-y-2">
                            <Search size={32} className="mx-auto text-slate-300 stroke-[1.5]" />
                            <p className="text-sm font-bold text-slate-700">No matching records found</p>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Try searching for guest name like &quot;Imran&quot;, booking number &quot;RES-&quot;, or room number &quot;101&quot;
                            </p>
                        </div>
                    ) : (
                        filteredItems.map((item, idx) => {
                            const isSelected = idx === selectedIndex;

                            // -------------------------------------------------------------
                            // A. RESERVATION ITEM CARD (Rich PMS Display & 1-Click Actions)
                            // -------------------------------------------------------------
                            if (item.type === 'RESERVATION') {
                                const res = item.data as StoredReservation;
                                const { text: statusText, style: statusStyle } = getReservationStatusStyle(res.status);
                                const total = Number(res.totalAmount || 0);
                                const paid = Number(res.paidAmount || 0);
                                const due = res.dueAmount !== undefined ? Number(res.dueAmount) : Math.max(0, total - paid);
                                const isConfirmedOrHold = ['CONFIRMED', 'HOLD', 'TENTATIVE', 'ARRIVING'].includes(statusText);
                                const isInHouse = ['IN-HOUSE', 'ARRIVED', 'STAYOVER'].includes(statusText);
                                const isCancellable = !['CANCELLED', 'CHECKED-OUT', 'COMPLETED', 'VOID'].includes(statusText);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={item.onSelect}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={`w-full text-left p-3 rounded-2xl transition border cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-50/70 border-blue-300 shadow-sm'
                                                : 'bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
                                        }`}
                                    >
                                        {/* Top Row: Guest Name, Code, VIP & Status Badge */}
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                                    isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                    <Users size={15} />
                                                </div>
                                                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-slate-900 truncate">
                                                        {res.guestName || 'Guest'}
                                                    </span>
                                                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                                                        {res.reservationNumber}
                                                    </span>
                                                    {res.vip && (
                                                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                                            VIP
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Large, High-Contrast Status Badge */}
                                            <span className={`text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border shadow-2xs shrink-0 ${statusStyle}`}>
                                                {statusText}
                                            </span>
                                        </div>

                                        {/* Middle Row: Room Details, Dates, Nights & Financials */}
                                        <div className="mt-2 pl-10.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                                <BedDouble size={13} className="text-blue-600 shrink-0" />
                                                <span>Room {res.roomNumber || 'Unassigned'}</span>
                                                <span className="text-slate-400 font-normal">({res.roomType || 'Standard Room'})</span>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <Calendar size={13} className="text-slate-400 shrink-0" />
                                                <span>{res.checkIn} → {res.checkOut}</span>
                                                <span className="text-[11px] font-bold text-slate-500">({res.nights || 1}N)</span>
                                            </div>

                                            <div className="flex items-center gap-2 ml-auto">
                                                <span className="text-slate-500 font-medium">Total:</span>
                                                <span className="font-bold text-slate-900">BDT {total.toLocaleString()}</span>
                                                {due > 0 ? (
                                                    <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[11px]">
                                                        Due: BDT {due.toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                                                        Paid
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bottom Row: Direct 1-Click PMS Action Buttons */}
                                        <div className="mt-2.5 pl-10.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {/* 1. View Details Primary Action */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleViewDetails(res, 'overview'); }}
                                                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                                                >
                                                    <FileText size={12} />
                                                    <span>View Details</span>
                                                </button>

                                                {/* 2. Check-In Button (if confirmed or hold) */}
                                                {isConfirmedOrHold && (() => {
                                                    const unassigned = isRoomUnassigned(res.roomNumber, res.allocatedRooms);
                                                    return (
                                                        <button
                                                            type="button"
                                                            disabled={unassigned}
                                                            onClick={(e) => {
                                                                if (unassigned) {
                                                                    toast.error(`Cannot check in guest "${res.guestName || 'Guest'}": Room is unassigned. Please assign a room first.`);
                                                                    return;
                                                                }
                                                                handleCheckIn(e, res);
                                                            }}
                                                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs flex items-center gap-1.5 transition ${
                                                                unassigned
                                                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                                                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 cursor-pointer'
                                                            }`}
                                                            title={unassigned ? 'Cannot check in: Room is unassigned. Assign a room first.' : 'Check In'}
                                                        >
                                                            <Check size={12} className="stroke-[2.5]" />
                                                            <span>Check In</span>
                                                            {unassigned && <span className="text-[8.5px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 ml-0.5 font-semibold">Unassigned</span>}
                                                        </button>
                                                    );
                                                })()}

                                                {/* 3. Check-Out Button (if in-house) */}
                                                {isInHouse && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCheckOut(e, res)}
                                                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                                                    >
                                                        <ArrowRight size={12} className="stroke-[2.5]" />
                                                        <span>Check Out</span>
                                                    </button>
                                                )}

                                                {/* 4. Folio & Pay */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleViewDetails(res, 'payment'); }}
                                                    className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Receipt size={12} className="text-slate-500" />
                                                    <span>Folio & Pay</span>
                                                </button>

                                                {/* 5. Amend Stay */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleViewDetails(res, 'amend'); }}
                                                    className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Calendar size={12} className="text-slate-500" />
                                                    <span>Amend Stay</span>
                                                </button>

                                                {/* 6. Cancel */}
                                                {isCancellable && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCancel(e, res)}
                                                        className="px-2 py-1 text-xs font-semibold rounded-lg hover:bg-rose-50 text-rose-600 transition flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <X size={12} />
                                                        <span>Cancel</span>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="text-[11px] font-medium text-slate-400 hidden sm:flex items-center gap-1">
                                                <span>↵ Open</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // -------------------------------------------------------------
                            // B. ROOM ITEM CARD (Inventory & Housekeeping Quick Actions)
                            // -------------------------------------------------------------
                            if (item.type === 'ROOM') {
                                const room = item.data as CanonicalRoom;
                                const isClean = room.housekeepingStatus === 'Clean';
                                const hkStyle = isClean
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : room.housekeepingStatus === 'Dirty'
                                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                                        : 'bg-blue-50 text-blue-700 border-blue-300';

                                return (
                                    <div
                                        key={item.id}
                                        onClick={item.onSelect}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={`w-full text-left p-3 rounded-2xl transition border cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-50/70 border-blue-300 shadow-sm'
                                                : 'bg-white hover:bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                                    isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                    <BedDouble size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-900 truncate">
                                                            Room {room.number}
                                                        </span>
                                                        <span className="text-xs text-slate-500 font-medium">
                                                            — {room.name || room.roomTypeName || 'Deluxe Room'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        Floor {room.floorId || 1} • Status: {room.status || 'Active'}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border shadow-2xs shrink-0 ${hkStyle}`}>
                                                {room.housekeepingStatus || 'CLEAN'}
                                            </span>
                                        </div>

                                        {/* Room Action Buttons */}
                                        <div className="mt-2.5 pl-10.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setActivePage('room-rack'); onClose(); }}
                                                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                                                >
                                                    <LayoutGrid size={12} />
                                                    <span>View Room Rack</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={(e) => handleToggleHousekeeping(e, room)}
                                                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                                                        isClean
                                                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                                    }`}
                                                >
                                                    <Sparkles size={12} />
                                                    <span>Mark {isClean ? 'Dirty' : 'Clean'}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={(e) => handleBookRoom(e, room)}
                                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer flex items-center gap-1"
                                                >
                                                    <Plus size={12} />
                                                    <span>Book Room</span>
                                                </button>
                                            </div>

                                            <ArrowRight size={13} className={isSelected ? 'text-blue-600' : 'text-slate-300'} />
                                        </div>
                                    </div>
                                );
                            }

                            // -------------------------------------------------------------
                            // C. PAGE OR ACTION ITEM CARD
                            // -------------------------------------------------------------
                            const isAction = item.type === 'ACTION';
                            const p = item.data;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={item.onSelect}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-50/80 text-blue-900 shadow-2xs border border-blue-200'
                                            : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                            isSelected
                                                ? 'bg-white border-blue-200 shadow-2xs'
                                                : 'bg-slate-50 border-slate-200/80 text-slate-600'
                                        }`}>
                                            {p.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs sm:text-[13px] font-bold truncate leading-tight text-slate-900">
                                                    {p.title}
                                                </p>
                                                <span className={`text-[9.5px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${
                                                    p.badgeColor || (isAction ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200')
                                                }`}>
                                                    {p.badge || (isAction ? 'ACTION' : 'MODULE')}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                                                {p.subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-1.5 text-slate-400">
                                        {isSelected && (
                                            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 bg-blue-100/70 px-2 py-0.5 rounded-md">
                                                <span>Open</span>
                                                <CornerDownLeft size={10} />
                                            </span>
                                        )}
                                        <ArrowRight size={13} className={isSelected ? 'text-blue-600' : 'text-slate-300'} />
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* 4. FOOTER STATUS BAR WITH COMMAND HINTS */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                            <span className="font-mono text-[9px] bg-white px-1.5 py-0.2 rounded border border-slate-200 font-bold">↑↓</span>
                            <span>navigate</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="font-mono text-[9px] bg-white px-1.5 py-0.2 rounded border border-slate-200 font-bold">↵</span>
                            <span>select / view</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="font-mono text-[9px] bg-white px-1.5 py-0.2 rounded border border-slate-200 font-bold">Tab</span>
                            <span>cycle tabs</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="font-mono text-[9px] bg-white px-1.5 py-0.2 rounded border border-slate-200 font-bold">Esc</span>
                            <span>close</span>
                        </span>
                    </div>

                    <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                        <Command size={10} />
                        <span>Ctrl + K</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default GlobalOmniSearchModal;
