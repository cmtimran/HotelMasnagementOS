import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    User,
    Building2,
    LogOut,
    Calendar,
    Bell,
    ChevronDown,
    X,
    Check,
    Plus,
    Search,
    LayoutGrid,
    ClipboardList,
    Clock,
    Sparkles,
    ArrowRight,
    FileText
} from 'lucide-react';
import AddReservationModal from './modals/AddReservationModal';

interface HeaderProps {
    activePage: string;
    setActivePage: (page: string) => void;
    onLogout: () => void;
    user: any;
}

interface NotificationItem {
    id: string;
    title: string;
    time: string;
    type: 'booking' | 'room' | 'system';
    read: boolean;
}

// Module mapping for dynamic breadcrumbs
const PAGE_MODULE_MAP: Record<string, { module: string; icon: string }> = {
    'dashboard': { module: 'Overview', icon: '📊' },
    'stay-view': { module: 'Front Office', icon: '📅' },
    'add-reservation': { module: 'Front Office', icon: '➕' },
    'quick-reservation': { module: 'Front Office', icon: '➕' },
    'reservations': { module: 'Front Office', icon: '📋' },
    'reservations-view': { module: 'Front Office', icon: '📋' },
    'reservations-sleep-out': { module: 'Front Office', icon: '🌙' },
    'reservations-hold': { module: 'Front Office', icon: '⏳' },
    'reservations-unassigned': { module: 'Front Office', icon: '❓' },
    'reservations-cancel': { module: 'Front Office', icon: '❌' },
    'front-desk': { module: 'Front Office', icon: '🖥️' },
    'room-rack': { module: 'Front Office', icon: '🗂️' },
    'folio-operations': { module: 'Front Office', icon: '🧾' },
    'guest-profile': { module: 'Front Office', icon: '👤' },
    'floor-plan': { module: 'Front Office', icon: '🗺️' },
    'occupancy-heatmap': { module: 'Front Office', icon: '📈' },
    'night-audit': { module: 'Front Office', icon: '🌙' },
    'housekeeping': { module: 'Housekeeping', icon: '🧹' },
    'service-master': { module: 'Housekeeping', icon: '🧺' },
    'maintenance': { module: 'Maintenance', icon: '🔧' },
    'building-floor': { module: 'Maintenance', icon: '🏢' },
    'pos': { module: 'F&B POS', icon: '🍽️' },
    'kitchen-display': { module: 'F&B POS', icon: '👨‍🍳' },
    'reports': { module: 'Reports', icon: '📊' },
    'advanced-reports': { module: 'Reports', icon: '📈' },
    'general-settings': { module: 'Settings', icon: '⚙️' },
    'admin-security': { module: 'Settings', icon: '🛡️' }
};

const Header: React.FC<HeaderProps> = ({ activePage, setActivePage, onLogout, user }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isAddReservationOpen, setIsAddReservationOpen] = useState(false);
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isAddOptionsOpen, setIsAddOptionsOpen] = useState(false);
    
    // Quick Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const datePopoverRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    const addOptionsRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Business System Date State (hydrated from localStorage or default '01 Jul 2026')
    const [systemDate, setSystemDate] = useState<string>(() => {
        return localStorage.getItem('hotel_system_date') || '01 Jul 2026';
    });
    const [tempDateInput, setTempDateInput] = useState<string>('2026-07-01');

    // Notifications state
    const [notifications, setNotifications] = useState<NotificationItem[]>([
        { id: '1', title: 'New Web Booking #RES-9402 (Standard Room)', time: '5m ago', type: 'booking', read: false },
        { id: '2', title: 'Room 204 Cleanliness inspected & approved', time: '18m ago', type: 'room', read: false },
        { id: '3', title: 'Night Audit scheduled run at 02:00 AM', time: '1h ago', type: 'system', read: true },
    ]);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Handle global clicks outside popovers
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (datePopoverRef.current && !datePopoverRef.current.contains(event.target as Node)) {
                setIsDatePopoverOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
            if (addOptionsRef.current && !addOptionsRef.current.contains(event.target as Node)) {
                setIsAddOptionsOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Keyboard shortcut for quick search: Ctrl+K or Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                setIsSearchFocused(true);
            }
            if (e.key === 'Escape') {
                setIsSearchFocused(false);
                setSearchQuery('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleApplyDate = () => {
        if (!tempDateInput) return;
        const d = new Date(tempDateInput);
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formatted = `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
        setSystemDate(formatted);
        localStorage.setItem('hotel_system_date', formatted);
        setIsDatePopoverOpen(false);
    };

    const handleResetDate = () => {
        setSystemDate('01 Jul 2026');
        setTempDateInput('2026-07-01');
        localStorage.setItem('hotel_system_date', '01 Jul 2026');
        setIsDatePopoverOpen(false);
    };

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    // Breadcrumb text calculations
    const moduleInfo = PAGE_MODULE_MAP[activePage] || { module: 'Operations', icon: '🏨' };
    const pageTitle = activePage
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    // Quick Search sample data (from reservations / rooms)
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        
        // Mock reservation items
        const pool = [
            { type: 'reservation', label: 'Johnathan Davis (#RES-1049)', sub: 'Room 101 • Deluxe Single • In-House', target: 'reservations' },
            { type: 'reservation', label: 'Sarah Jenkins (#RES-1050)', sub: 'Room 102 • Super Deluxe • Arriving', target: 'reservations' },
            { type: 'reservation', label: 'Apex Tech Solutions (#GRP-881)', sub: 'Rooms 201-205 • Group Booking', target: 'reservations' },
            { type: 'room', label: 'Room 101 (Deluxe Single)', sub: 'Occupied • Clean • Floor 1', target: 'room-rack' },
            { type: 'room', label: 'Room 102 (Super Deluxe Double)', sub: 'Reserved • Clean • Floor 1', target: 'room-rack' },
            { type: 'room', label: 'Room 201 (Executive Suite)', sub: 'Vacant • Inspected • Floor 2', target: 'room-rack' },
            { type: 'action', label: 'Create New Reservation', sub: 'Open 3-Step Reservation Wizard', target: 'add-reservation' },
            { type: 'action', label: 'Open Stay View Calendar', sub: '15-Day Room Timeline Chart', target: 'stay-view' },
            { type: 'action', label: 'Night Audit Pipeline', sub: 'End of Day Financial Reconciliation', target: 'night-audit' },
        ];

        return pool.filter(item => 
            item.label.toLowerCase().includes(q) || 
            item.sub.toLowerCase().includes(q)
        ).slice(0, 6);
    }, [searchQuery]);

    return (
        <>
            <header className="h-11 bg-white border-b border-gray-200/90 flex items-center justify-between px-2.5 sm:px-4 flex-shrink-0 z-40 sticky top-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] select-none">
                {/* ========================================================================= */}
                {/* LEFT: Clean Breadcrumb & Context (Aligned with Sidebar Aesthetics) */}
                {/* ========================================================================= */}
                <div className="flex items-center gap-2 min-w-0">
                    <div 
                        onClick={() => setActivePage('dashboard')}
                        className="flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-blue-700 transition-colors"
                        title="Go to Dashboard"
                    >
                        <div className="w-5 h-5 rounded bg-[#1e3a8a] text-white flex items-center justify-center shadow-2xs">
                            <Building2 size={11} />
                        </div>
                        <span className="font-bold text-[11.5px] text-gray-800 tracking-tight hidden sm:inline">HotelOS</span>
                    </div>

                    <span className="text-gray-300 text-xs">/</span>

                    <span className="text-[11px] font-medium text-gray-500 hidden md:inline truncate max-w-[110px]">
                        {moduleInfo.module}
                    </span>

                    <span className="text-gray-300 text-xs hidden md:inline">/</span>

                    {/* Active Page Pill Badge */}
                    <div className="flex items-center gap-1.5 bg-blue-50/70 text-[#1e3a8a] border border-blue-200/60 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-2xs truncate">
                        <span className="text-[10px]">{moduleInfo.icon}</span>
                        <span className="truncate max-w-[130px] sm:max-w-[180px]">{pageTitle}</span>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* CENTER: Compact Omni Quick Search (Guest, Room #, Folio) */}
                {/* ========================================================================= */}
                <div className="relative hidden lg:block max-w-xs w-64 mx-2" ref={searchRef}>
                    <div className="relative flex items-center">
                        <Search size={12} className="absolute left-2.5 text-gray-400 pointer-events-none" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            placeholder="Search guest, room #, folio... (Ctrl+K)"
                            className="w-full h-7 pl-7 pr-8 text-[11px] bg-gray-50/80 hover:bg-gray-100/70 focus:bg-white border border-gray-200/80 focus:border-blue-500 rounded-md text-gray-800 placeholder-gray-400 outline-none transition-all shadow-2xs"
                        />
                        {searchQuery ? (
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                                className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                            >
                                <X size={11} />
                            </button>
                        ) : (
                            <kbd className="absolute right-2 text-[9px] font-mono text-gray-400 bg-gray-100 border border-gray-200 px-1 rounded pointer-events-none">
                                ⌘K
                            </kbd>
                        )}
                    </div>

                    {/* Quick Search Results Dropdown */}
                    {isSearchFocused && searchQuery.trim() && (
                        <div className="absolute left-0 mt-1.5 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                            <div className="px-3 py-1 border-b border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-semibold uppercase">
                                <span>Quick Jump Results</span>
                                <span>{searchResults.length} matches</span>
                            </div>
                            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                                {searchResults.length > 0 ? (
                                    searchResults.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setActivePage(item.target);
                                                setIsSearchFocused(false);
                                                setSearchQuery('');
                                            }}
                                            className="px-3 py-1.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors group"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-[11.5px] font-semibold text-gray-800 group-hover:text-blue-700 truncate">
                                                    {item.label}
                                                </p>
                                                <p className="text-[9.5px] text-gray-400 truncate">{item.sub}</p>
                                            </div>
                                            <ArrowRight size={11} className="text-gray-300 group-hover:text-blue-600 flex-shrink-0 ml-2" />
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-3 py-4 text-center text-xs text-gray-400">
                                        No matching reservations or rooms found
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ========================================================================= */}
                {/* RIGHT: Add Reservation Button, Quick PMS Icons, System Date & User */}
                {/* ========================================================================= */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

                    {/* 1. PRIMARY ACTION: Add Reservation (Elevated Compact PMS Button) */}
                    <div className="relative flex items-center" ref={addOptionsRef}>
                        <button
                            type="button"
                            onClick={() => setActivePage('add-reservation')}
                            className={`h-7 pl-2 pr-2.5 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs select-none active:scale-[0.98] ${
                                activePage === 'add-reservation'
                                    ? 'bg-[#152a65] text-white ring-2 ring-blue-400/50'
                                    : 'bg-[#1e3a8a] hover:bg-[#152a65] text-white'
                            }`}
                            title="Create New Reservation (/add-reservation)"
                        >
                            <Plus size={12} strokeWidth={2.5} className="flex-shrink-0 text-white" />
                            <span className="tracking-tight">Add Reservation</span>
                        </button>

                        {/* Quick options dropdown trigger */}
                        <button
                            type="button"
                            onClick={() => setIsAddOptionsOpen(!isAddOptionsOpen)}
                            className="h-7 px-1 bg-[#1e3a8a] hover:bg-[#152a65] text-blue-200 hover:text-white rounded-r-md border-l border-blue-900/40 -ml-1 transition-colors cursor-pointer flex items-center justify-center"
                            title="More reservation options"
                        >
                            <ChevronDown size={11} />
                        </button>

                        {/* Add Reservation Options Menu */}
                        {isAddOptionsOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                                <div className="px-3 py-1 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Reservation Actions
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddOptionsOpen(false);
                                        setActivePage('add-reservation');
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                    <FileText size={12} className="text-[#1e3a8a]" />
                                    <span>Full 3-Step Wizard</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddOptionsOpen(false);
                                        setIsAddReservationOpen(true);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                    <Sparkles size={12} className="text-amber-500" />
                                    <span>Quick Modal Popup</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddOptionsOpen(false);
                                        setActivePage('reservations');
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 cursor-pointer transition-colors border-t border-gray-50 mt-1"
                                >
                                    <ClipboardList size={12} className="text-emerald-600" />
                                    <span>View Reservations List</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Subtle Separator */}
                    <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>

                    {/* 2. CORE PMS NAVIGATION ICONS (Stay View, Reservations, Room Rack) */}
                    <div className="flex items-center gap-1">
                        {/* Stay View Button */}
                        <button
                            type="button"
                            onClick={() => setActivePage('stay-view')}
                            title="Stay View Calendar"
                            className={`h-7 px-2 rounded-md border text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                activePage === 'stay-view'
                                    ? 'bg-blue-50 text-[#1e3a8a] border-blue-300 font-bold'
                                    : 'border-gray-200/80 text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 bg-white'
                            }`}
                        >
                            <Calendar size={12} className={activePage === 'stay-view' ? 'text-[#1e3a8a]' : 'text-gray-500'} />
                            <span className="hidden xl:inline text-[11px]">Stay View</span>
                        </button>

                        {/* Reservations List Button */}
                        <button
                            type="button"
                            onClick={() => setActivePage('reservations')}
                            title="Reservations List"
                            className={`h-7 px-2 rounded-md border text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                activePage === 'reservations' || activePage === 'reservations-view'
                                    ? 'bg-blue-50 text-[#1e3a8a] border-blue-300 font-bold'
                                    : 'border-gray-200/80 text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 bg-white'
                            }`}
                        >
                            <ClipboardList size={12} className={activePage === 'reservations' ? 'text-[#1e3a8a]' : 'text-gray-500'} />
                            <span className="hidden xl:inline text-[11px]">Reservations</span>
                        </button>

                        {/* Room Rack Button */}
                        <button
                            type="button"
                            onClick={() => setActivePage('room-rack')}
                            title="Room Rack Grid"
                            className={`h-7 px-2 rounded-md border text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                                activePage === 'room-rack'
                                    ? 'bg-blue-50 text-[#1e3a8a] border-blue-300 font-bold'
                                    : 'border-gray-200/80 text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 bg-white'
                            }`}
                        >
                            <LayoutGrid size={12} className={activePage === 'room-rack' ? 'text-[#1e3a8a]' : 'text-gray-500'} />
                            <span className="hidden xl:inline text-[11px]">Room Rack</span>
                        </button>
                    </div>

                    {/* Subtle Separator */}
                    <div className="h-4 w-px bg-gray-200"></div>

                    {/* 3. SYSTEM BUSINESS DATE (Compact PMS Date Widget) */}
                    <div className="relative" ref={datePopoverRef}>
                        <button
                            type="button"
                            onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
                            className="h-7 px-2 sm:px-2.5 rounded-md border border-gray-200/80 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center gap-1.5 text-gray-700 shadow-2xs cursor-pointer select-none"
                            title="Operating Business Date (Click to adjust)"
                        >
                            <Calendar size={12} className="text-[#1e3a8a]" />
                            <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">System:</span>
                            <span className="text-[11px] font-bold text-gray-900 font-mono tracking-tight">{systemDate}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Business Day Active"></span>
                        </button>

                        {/* Date Adjustment Popover */}
                        {isDatePopoverOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-3.5 z-50 animate-in fade-in zoom-in-95">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-[#1e3a8a]" />
                                        <span className="text-xs font-bold text-gray-900">PMS Operating Date</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsDatePopoverOpen(false)}
                                        className="text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>

                                <div className="py-2.5 space-y-2">
                                    <p className="text-[11px] text-gray-500 leading-relaxed">
                                        Active business date for night audit, room occupancy timeline, and folio postings:
                                    </p>
                                    <input
                                        type="date"
                                        value={tempDateInput}
                                        onChange={e => setTempDateInput(e.target.value)}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg text-xs font-bold text-blue-900 outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={handleResetDate}
                                        className="text-[10px] font-semibold text-gray-500 hover:text-blue-700 cursor-pointer"
                                    >
                                        Reset (01 Jul 2026)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApplyDate}
                                        className="h-6 px-3 bg-[#1e3a8a] hover:bg-[#152a65] text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Check size={11} />
                                        <span>Update</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4. NOTIFICATIONS BELL (With Interactive Popover) */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            type="button"
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            className="w-7 h-7 rounded-md border border-gray-200/80 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center transition-colors relative cursor-pointer shadow-2xs"
                            title="System Notifications"
                        >
                            <Bell size={12} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Popover */}
                        {isNotificationOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95">
                                <div className="px-3 pb-2 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Bell size={12} className="text-[#1e3a8a]" />
                                        <span className="text-xs font-bold text-gray-900">Notifications</span>
                                        {unreadCount > 0 && (
                                            <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded-full">
                                                {unreadCount} new
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleMarkAllRead}
                                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                                    >
                                        Mark all read
                                    </button>
                                </div>

                                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                                    {notifications.map(n => (
                                        <div
                                            key={n.id}
                                            className={`px-3 py-2 text-left hover:bg-gray-50/80 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <p className="text-[11px] font-semibold text-gray-800 leading-tight">
                                                    {n.title}
                                                </p>
                                                {!n.read && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 flex-shrink-0"></span>
                                                )}
                                            </div>
                                            <p className="text-[9.5px] text-gray-400 mt-0.5">{n.time}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="px-3 pt-2 border-t border-gray-100 text-center">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsNotificationOpen(false);
                                            setActivePage('dashboard');
                                        }}
                                        className="text-[10.5px] font-semibold text-[#1e3a8a] hover:underline cursor-pointer"
                                    >
                                        View Full System Activity
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Subtle Separator */}
                    <div className="h-4 w-px bg-gray-200"></div>

                    {/* 5. USER PROFILE & PROPERTY CONTEXT */}
                    <div className="relative" ref={dropdownRef}>
                        <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-md transition-colors border border-transparent hover:border-gray-200/60"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            title="Active User Account"
                        >
                            <div className="text-right hidden md:flex flex-col leading-tight">
                                <span className="text-[11px] font-bold text-gray-800 truncate max-w-[110px]">
                                    {user?.name || 'John Smith'}
                                </span>
                                <span className="text-[9.5px] text-gray-500 font-medium truncate max-w-[110px]">
                                    {user?.role || 'Admin'} • {user?.property || 'Nice Hotel'}
                                </span>
                            </div>

                            {/* Avatar with subtle online indicator */}
                            <div className="w-7 h-7 rounded-full border border-emerald-500/80 p-0.5 overflow-hidden flex items-center justify-center bg-white shadow-2xs hover:scale-105 transition-transform flex-shrink-0 relative">
                                {user?.image ? (
                                    <img
                                        src={user.image}
                                        alt="User"
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-blue-100 text-[#1e3a8a] flex items-center justify-center font-bold text-[11px]">
                                        {user?.name ? user.name.charAt(0) : <User size={12} />}
                                    </div>
                                )}
                                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white"></span>
                            </div>
                            <ChevronDown size={11} className="text-gray-400 hidden sm:block" />
                        </div>

                        {/* User Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-lg shadow-xl border border-gray-200/90 py-1.5 animate-in fade-in slide-in-from-top-1 z-50">
                                <div className="px-3 py-1.5 border-b border-gray-100">
                                    <p className="text-[11.5px] font-bold text-gray-800 truncate">{user?.name || 'John Smith'}</p>
                                    <p className="text-[9.5px] text-gray-400 truncate">{user?.email || 'admin@hotelmanagement.os'}</p>
                                    <div className="flex items-center gap-1.5 mt-1 text-[9.5px] text-emerald-700 font-semibold bg-emerald-50/80 px-1.5 py-0.5 rounded">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span className="truncate">{user?.property || 'Nice Hotel'} (Main Branch)</span>
                                    </div>
                                </div>

                                <div className="py-1">
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setActivePage('add-reservation');
                                        }}
                                    >
                                        <Plus size={12} className="text-[#1e3a8a]" />
                                        New Reservation Form
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setActivePage('properties');
                                        }}
                                    >
                                        <Building2 size={12} className="text-gray-500" />
                                        Switch Property
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setActivePage('night-audit');
                                        }}
                                    >
                                        <Clock size={12} className="text-gray-500" />
                                        Night Audit Automation
                                    </button>
                                </div>

                                <div className="h-px bg-gray-100 my-1"></div>

                                <div className="px-1.5 pb-0.5">
                                    <button
                                        type="button"
                                        className="w-full text-center px-3 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            onLogout();
                                        }}
                                    >
                                        <LogOut size={12} />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Quick In-Place Reservation Modal */}
            <AddReservationModal
                isOpen={isAddReservationOpen}
                onClose={() => setIsAddReservationOpen(false)}
                onReservationCreated={() => {
                    setIsAddReservationOpen(false);
                    setActivePage('reservations');
                }}
            />
        </>
    );
};

export default Header;