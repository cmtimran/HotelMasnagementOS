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
    CalendarDays
} from 'lucide-react';
import { getCanonicalRooms, getAllStoredReservations } from '../../utils/roomInventoryEngine';

interface GlobalOmniSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    setActivePage: (page: string) => void;
}

interface SearchResultItem {
    id: string;
    category: 'PAGES' | 'ROOMS' | 'RESERVATIONS' | 'ACTIONS';
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    badge?: string;
    badgeColor?: string;
    onSelect: () => void;
}

export const GlobalOmniSearchModal: React.FC<GlobalOmniSearchModalProps> = ({
    isOpen,
    onClose,
    setActivePage
}) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Focus input on open & reset state
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Available pages for fast navigation
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
    const allRooms = useMemo(() => getCanonicalRooms(), [isOpen]);
    const allReservations = useMemo(() => getAllStoredReservations(), [isOpen]);

    // Compute search results categorized
    const results = useMemo<SearchResultItem[]>(() => {
        const q = query.trim().toLowerCase();

        // When query is empty: show quick actions and popular pages
        if (!q) {
            const defaultActions: SearchResultItem[] = [
                {
                    id: 'act-new-res',
                    category: 'ACTIONS',
                    title: 'New Reservation',
                    subtitle: 'Create a new guest booking with instant room allocation',
                    icon: <Plus size={14} className="text-blue-600" />,
                    badge: 'Shortcut',
                    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                    onSelect: () => { setActivePage('add-reservation'); onClose(); }
                },
                {
                    id: 'act-new-prop',
                    category: 'ACTIONS',
                    title: 'Onboard New Property',
                    subtitle: 'Add a new hotel branch with database tenant provisioning',
                    icon: <Building2 size={14} className="text-indigo-600" />,
                    badge: 'HQ',
                    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    onSelect: () => { setActivePage('property-create'); onClose(); }
                },
                {
                    id: 'act-pos-sale',
                    category: 'ACTIONS',
                    title: 'Open Restaurant POS',
                    subtitle: 'Launch point-of-sale terminal for food & beverage bills',
                    icon: <Utensils size={14} className="text-orange-600" />,
                    badge: 'F&B',
                    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
                    onSelect: () => { setActivePage('pos'); onClose(); }
                }
            ];

            const popularPages: SearchResultItem[] = systemPages.slice(0, 5).map(p => ({
                id: `page-${p.id}`,
                category: 'PAGES',
                title: p.title,
                subtitle: p.subtitle,
                icon: p.icon,
                onSelect: () => { setActivePage(p.id); onClose(); }
            }));

            return [...defaultActions, ...popularPages];
        }

        const items: SearchResultItem[] = [];

        // 1. Pages Search
        systemPages.forEach(p => {
            if (p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) {
                items.push({
                    id: `page-${p.id}`,
                    category: 'PAGES',
                    title: p.title,
                    subtitle: p.subtitle,
                    icon: p.icon,
                    badge: 'Module',
                    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
                    onSelect: () => { setActivePage(p.id); onClose(); }
                });
            }
        });

        // 2. Rooms Search
        allRooms.forEach(room => {
            const matchesNum = String(room.number).toLowerCase().includes(q);
            const matchesType = (room.name || '').toLowerCase().includes(q) || (room.remarks || '').toLowerCase().includes(q);
            if (matchesNum || matchesType) {
                const statusColor = room.housekeepingStatus === 'Clean'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : room.housekeepingStatus === 'Dirty'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200';

                items.push({
                    id: `room-${room.number}`,
                    category: 'ROOMS',
                    title: `Room ${room.number} — ${room.name}`,
                    subtitle: `Floor ${room.floorId || 1} • Status: ${room.status || 'AVAILABLE'} • Housekeeping: ${room.housekeepingStatus || 'CLEAN'}`,
                    icon: <BedDouble size={14} className="text-blue-600" />,
                    badge: room.housekeepingStatus || 'ROOM',
                    badgeColor: statusColor,
                    onSelect: () => { setActivePage('room-rack'); onClose(); }
                });
            }
        });

        // 3. Reservations & Guests Search
        allReservations.forEach(res => {
            const matchesGuest = (res.guestName || '').toLowerCase().includes(q);
            const matchesCode = (res.reservationNumber || '').toLowerCase().includes(q);
            const matchesRoom = String(res.roomNumber || '').toLowerCase().includes(q);

            if (matchesGuest || matchesCode || matchesRoom) {
                items.push({
                    id: `res-${res.id || res.reservationNumber}`,
                    category: 'RESERVATIONS',
                    title: `${res.guestName || 'Guest'} (${res.reservationNumber})`,
                    subtitle: `Room: ${res.roomNumber || 'Unassigned'} • ${res.checkIn} to ${res.checkOut} • ${res.status || 'Active'}`,
                    icon: <Users size={14} className="text-indigo-600" />,
                    badge: res.status || 'BOOKING',
                    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
                    onSelect: () => { setActivePage('reservations'); onClose(); }
                });
            }
        });

        // 4. Quick Actions Search
        if ('new reservation'.includes(q) || 'book'.includes(q) || 'reservation'.includes(q)) {
            items.push({
                id: 'act-new-res',
                category: 'ACTIONS',
                title: 'Create New Reservation',
                subtitle: 'Open the comprehensive booking creator modal',
                icon: <Plus size={14} className="text-blue-600" />,
                badge: 'Action',
                badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                onSelect: () => { setActivePage('add-reservation'); onClose(); }
            });
        }

        return items.slice(0, 15);
    }, [query, systemPages, allRooms, allReservations, setActivePage, onClose]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % (results.length || 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + results.length) % (results.length || 1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (results[selectedIndex]) {
                    results[selectedIndex].onSelect();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-98 duration-150"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Bar Input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-white">
                    <Search size={18} className="text-blue-600 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Search guests, room #, bookings, pages, or commands (Ctrl + K)..."
                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none font-medium"
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
                            <X size={14} />
                        </button>
                    )}
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                        ESC
                    </span>
                </div>

                {/* Results List */}
                <div ref={listRef} className="overflow-y-auto flex-1 p-2 space-y-1 divide-y divide-slate-50">
                    {results.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 space-y-2">
                            <Search size={28} className="mx-auto text-slate-300 stroke-[1.5]" />
                            <p className="text-xs font-semibold text-slate-600">No matching results found</p>
                            <p className="text-[11px] text-slate-400">
                                Try searching guest name, room number like &quot;101&quot;, or module name like &quot;POS&quot;
                            </p>
                        </div>
                    ) : (
                        results.map((item, idx) => {
                            const isSelected = idx === selectedIndex;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={item.onSelect}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-50/90 text-blue-900 shadow-2xs'
                                            : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                            isSelected
                                                ? 'bg-white border-blue-200 shadow-2xs'
                                                : 'bg-slate-50 border-slate-200/80 text-slate-600'
                                        }`}>
                                            {item.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold truncate leading-tight">
                                                    {item.title}
                                                </p>
                                                {item.badge && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                                                {item.subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-1.5 text-slate-400">
                                        {isSelected && (
                                            <span className="text-[10px] font-medium text-blue-600 flex items-center gap-1">
                                                <span>Select</span>
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

                {/* Footer Command Hints */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <span className="font-mono text-[9px] bg-white px-1 py-0.2 rounded border border-slate-200">↑↓</span>
                            <span>to navigate</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="font-mono text-[9px] bg-white px-1 py-0.2 rounded border border-slate-200">↵</span>
                            <span>to select</span>
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
