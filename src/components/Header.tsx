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
    LayoutGrid,
    Utensils,
    ChefHat,
    Plus,
    CalendarDays,
    SlidersHorizontal,
    ExternalLink,
    Search,
    Shield,
    ArrowRight,
    Users
} from 'lucide-react';
import AddReservationModal from './modals/AddReservationModal';
import GlobalOmniSearchModal from './common/GlobalOmniSearchModal';
import ReservationActionDrawer, { type DrawerMode } from './modals/ReservationActionDrawer';
import UserProfileModal from './modals/UserProfileModal';
import type { AmendBookingData } from './modals/AmendStayModal';
import { useProperty } from '../context/PropertyContext';
import {
    formatToDisplayDate,
    formatToISODate,
    setOperatingSystemDate,
    getOperatingSystemDate,
    getCanonicalRooms,
    getAllStoredReservations,
    updateReservationStatusInDB,
    syncReservationsFromDB,
    type StoredReservation
} from '../utils/roomInventoryEngine';

interface HeaderProps {
    activePage: string;
    setActivePage: (page: string) => void;
    onLogout: () => void;
    user: any;
}

const Header: React.FC<HeaderProps> = ({ activePage, setActivePage, onLogout, user }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isAddReservationOpen, setIsAddReservationOpen] = useState(false);
    const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
    const [isPropertyPopoverOpen, setIsPropertyPopoverOpen] = useState(false);
    const [isAlertsPopoverOpen, setIsAlertsPopoverOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Global Reservation Action Drawer state (triggered from OmniSearch or Header actions)
    const [actionDrawerBooking, setActionDrawerBooking] = useState<AmendBookingData | null>(null);
    const [actionDrawerMode, setActionDrawerMode] = useState<DrawerMode>('overview');
    const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);

    const allRoomsForDrawer = useMemo(() => {
        return getCanonicalRooms().map(r => ({
            id: String(r.id),
            roomNumber: String(r.number),
            type: r.name || 'Standard',
            status: r.status || 'Available'
        }));
    }, [isActionDrawerOpen]);

    const handleOpenReservationDetails = (res: StoredReservation, mode: DrawerMode = 'overview') => {
        const rawStored: any = getAllStoredReservations().find(x => 
            x.reservationNumber === res.reservationNumber || String(x.id) === String(res.id)
        ) || res;

        const bookingData: AmendBookingData = {
            id: String(res.id),
            reservationNumber: res.reservationNumber,
            groupCode: res.groupCode,
            subBookingNumber: res.subBookingNumber,
            registrationNumber: res.registrationNumber,
            folioNumber: res.folioNumber,
            guestName: res.guestName,
            roomNumber: res.roomNumber,
            roomType: res.roomType || 'Standard Room',
            arrivalDate: res.checkIn,
            departureDate: res.checkOut,
            nights: Number(res.nights) || 1,
            adults: Number(res.adults) || 1,
            children: Number(res.children) || 0,
            status: res.status || 'confirmed',
            totalAmount: Number(res.totalAmount) || 0,
            paidAmount: Number(res.paidAmount) || 0,
            dueAmount: Number(res.dueAmount) || 0,
            ratePlan: rawStored.ratePlan || 'Standard Tariff',
            allocatedRooms: rawStored.allocatedRooms || [res.roomNumber],
            roomsList: rawStored.roomsList,
            groupRoomsList: rawStored.groupRoomsList,
            ...rawStored
        };

        setActionDrawerBooking(bookingData);
        setActionDrawerMode(mode);
        setIsActionDrawerOpen(true);
        setActivePage('reservations');
    };

    // Global Command Palette Shortcut (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsSearchModalOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const datePopoverRef = useRef<HTMLDivElement>(null);
    const propertyPopoverRef = useRef<HTMLDivElement>(null);
    const alertsPopoverRef = useRef<HTMLDivElement>(null);

    const { activeProperty, properties, setActivePropertyId } = useProperty();

    // Business System Date State (hydrated from localStorage or default '01 Jul 2026')
    const [systemDate, setSystemDate] = useState<string>(() => {
        const saved = typeof window !== 'undefined' ? (localStorage.getItem('hotel_system_date') || localStorage.getItem('hotel_system_date_iso')) : null;
        return formatToDisplayDate(saved);
    });
    const [tempDateInput, setTempDateInput] = useState<string>(() => getOperatingSystemDate());

    // Listen for cross-component / cross-tab System Date updates
    useEffect(() => {
        const handleSync = (e: any) => {
            const detail = e?.detail;
            if (detail?.type === 'SYSTEM_DATE_CHANGED' && detail?.displayDate) {
                setSystemDate(detail.displayDate);
                setTempDateInput(detail.systemDate);
            }
        };
        window.addEventListener('hotel_pms_sync_event', handleSync);
        return () => window.removeEventListener('hotel_pms_sync_event', handleSync);
    }, []);

    // Recent Operational Alerts
    const [alerts, setAlerts] = useState([
        { id: 1, title: 'New Table Order #1042', time: '2m ago', type: 'fnb', desc: 'Table 4 (Dine-in) - ৳ 1,450' },
        { id: 2, title: 'Express Check-in Ready', time: '15m ago', type: 'frontdesk', desc: 'Room 302 - Dr. Tariqul Islam' },
        { id: 3, title: 'Room Cleaned & Inspected', time: '34m ago', type: 'hk', desc: 'Room 205 (Executive Suite)' },
    ]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (dropdownRef.current && !dropdownRef.current.contains(target)) {
                setIsDropdownOpen(false);
            }
            if (datePopoverRef.current && !datePopoverRef.current.contains(target)) {
                setIsDatePopoverOpen(false);
            }
            if (propertyPopoverRef.current && !propertyPopoverRef.current.contains(target)) {
                setIsPropertyPopoverOpen(false);
            }
            if (alertsPopoverRef.current && !alertsPopoverRef.current.contains(target)) {
                setIsAlertsPopoverOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsDropdownOpen(false);
                setIsDatePopoverOpen(false);
                setIsPropertyPopoverOpen(false);
                setIsAlertsPopoverOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const handleApplyDate = () => {
        if (!tempDateInput) return;
        const iso = formatToISODate(tempDateInput);
        const display = formatToDisplayDate(iso);
        setSystemDate(display);
        setOperatingSystemDate(iso);
        setIsDatePopoverOpen(false);
    };

    const handleResetDate = () => {
        setOperatingSystemDate('2026-07-01');
        setSystemDate('01 Jul 2026');
        setTempDateInput('2026-07-01');
        setIsDatePopoverOpen(false);
    };

    // Standard Hospitality Industry Page Title Mapping
    const PAGE_TITLE_MAP: Record<string, string> = {
        'front-desk': 'Front Desk',
        'dashboard': 'Dashboard',
        'stay-view': 'Stay View',
        'add-reservation': 'New Reservation',
        'quick-reservation': 'Quick Reservation',
        'reservations': 'Reservations',
        'room-rack': 'Room Rack',
        'folio-operations': 'Billing & Folios',
        'floor-plan': 'Floor Plan',
        'occupancy-heatmap': 'Occupancy Matrix',
        'night-audit': 'Night Audit',
        'pos': 'Restaurant POS',
        'kds': 'Kitchen Display (KDS)',
        'table-layout': 'Table Layout',
        'tables': 'Restaurant Tables',
        'categories': 'Categories',
        'products': 'Menu Items',
        'addons': 'Addons & Modifiers',
        'units': 'Measurement Units',
        'kitchens': 'Kitchen Stations',
        'counters': 'Billing Counters',
        'floor': 'Dining Areas',
        'waiters': 'Waiters & Staff',
        'manage-room-type': 'Room Types',
        'manage-room': 'All Rooms',
        'joint-room': 'Connecting Rooms',
        'rate-plans': 'Rate Plans',
        'package-builder': 'Packages & Offers',
        'meal-plans': 'Meal Plans',
        'rate-calendar': 'Rate Calendar',
        'building-management': 'Floors & Wings',
        'housekeeping': 'Housekeeping',
        'maintenance': 'Maintenance',
        'service-master': 'Laundry & Services',
        'guest-profile': 'Guest Directory',
        'service-vouchers': 'Gift Vouchers',
        'allowance-checker': 'Guest Credits',
        'advance-accounting': 'General Ledger',
        'master-data': 'Chart of Accounts',
        'revenue-dashboard': 'Revenue Analytics',
        'revenue-heads': 'Revenue Accounts',
        'banking': 'Bank Accounts',
        'corporate-profiles': 'Corporate Accounts',
        'finance-overview': 'Financial Reports',
        'hrm-dashboard': 'Staff Overview',
        'user-management': 'Employees',
        'departments': 'Departments',
        'shifts': 'Work Shifts',
        'roles-permissions': 'Roles & Permissions',
        'business-origins': 'Booking Sources',
        'reports': 'Reports Center',
        'advanced-reports': 'Analytics',
        'taxes-vat': 'Taxes & VAT',
        'multi-property': 'Chain Console',
        'properties': 'Properties',
        'property-create': 'Add Property',
        'printer-settings': 'Printers & Hardware',
        'policy-management': 'Policies & Rules',
        'holiday-management': 'Holiday Calendar',
        'schema-explorer': 'Database Schema',
        'general-settings': 'General Settings',
        'hotel-info': 'Hotel Profile',
        'hotel-profile': 'Hotel Profile',
        'edit-property': 'Manage Property',
    };

    // Format active page for breadcrumbs
    const pageTitle = PAGE_TITLE_MAP[activePage] || activePage
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    // Dynamic user profile resolution (0 hardcoded mock names)
    const activeUserName = user?.name || user?.username || 'Hotel Manager';
    const activeUserEmail = user?.email || (user?.username ? `${user.username.toLowerCase()}@hotel.com` : 'admin@hotel.com');
    const userRoleDisplay = user?.role ? user.role.replace(/_/g, ' ').toUpperCase() : 'HOTEL ADMINISTRATOR';
    const userInitial = (activeUserName.trim()[0] || 'U').toUpperCase();

    return (
        <>
            <header className="h-14 sm:h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-5 flex-shrink-0 z-30 sticky top-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)] select-none">
                {/* Left Side - Clean Page Title */}
                <div className="flex items-center min-w-0">
                    <h1 className="text-slate-900 text-sm sm:text-base font-bold tracking-tight truncate max-w-[260px] sm:max-w-md">
                        {pageTitle}
                    </h1>
                </div>

                {/* Right Side - OrderlyRMS Branch Selector, System Date, Quick Actions, Alerts, and User Profile */}
                <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
                    {/* 1. ACTIVE PROPERTY / BRANCH SELECTOR (Matching OrderlyRMS branch picker) */}
                    <div className="relative" ref={propertyPopoverRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsPropertyPopoverOpen(!isPropertyPopoverOpen);
                                setIsDatePopoverOpen(false);
                                setIsAlertsPopoverOpen(false);
                                setIsDropdownOpen(false);
                            }}
                            className="h-8 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer select-none text-xs font-semibold"
                            title="Active Hotel Property (Click to switch branch/property)"
                        >
                            <Building2 size={13} className="text-blue-600 flex-shrink-0" />
                            <span className="max-w-[140px] md:max-w-[180px] truncate hidden sm:inline">
                                {activeProperty?.name || 'Grand Palace Dhaka'}
                            </span>
                            <span className="sm:hidden font-mono text-[11px] text-blue-600">
                                {activeProperty?.code || 'GPD'}
                            </span>
                            <ChevronDown
                                size={12}
                                className={`text-slate-400 transition-transform duration-200 ${isPropertyPopoverOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {/* Property Switcher Dropdown */}
                        {isPropertyPopoverOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                        Select Hotel Context
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPropertyPopoverOpen(false);
                                            setActivePage('multi-property');
                                        }}
                                        className="text-[10px] text-blue-600 hover:text-blue-800 transition flex items-center gap-1 cursor-pointer"
                                    >
                                        <span>Chain Console</span>
                                        <ExternalLink size={10} />
                                    </button>
                                </div>

                                <div className="py-1 max-h-64 overflow-y-auto">
                                    {properties.map(p => {
                                        const isSelected = p.id === activeProperty?.id;
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    setActivePropertyId(p.id);
                                                    setIsPropertyPopoverOpen(false);
                                                }}
                                                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                                                    isSelected ? 'bg-blue-50/80 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                        {p.code}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-xs truncate font-semibold">{p.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-normal">
                                                            {p.city} • {p.total_rooms || 0} rooms
                                                        </p>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"></span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="border-t border-slate-100 px-3 py-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPropertyPopoverOpen(false);
                                            setActivePage('property-create');
                                        }}
                                        className="w-full text-left px-2 py-1.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50/60 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Plus size={12} />
                                        <span>Register New Property</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. SYSTEM DATE PILL BUTTON */}
                    <div className="relative" ref={datePopoverRef}>
                        <button
                            type="button"
                            onClick={() => {
                                const nextOpen = !isDatePopoverOpen;
                                setIsDatePopoverOpen(nextOpen);
                                setIsPropertyPopoverOpen(false);
                                setIsAlertsPopoverOpen(false);
                                setIsDropdownOpen(false);
                                if (nextOpen) {
                                    setTempDateInput(formatToISODate(systemDate));
                                }
                            }}
                            className="h-8 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer select-none text-xs font-semibold"
                            title="PMS Operating System Date (Click to adjust business date)"
                        >
                            <Calendar size={13} className="text-slate-500" />
                            <span className="text-[10px] text-slate-400 font-medium hidden md:inline">Date:</span>
                            <span className="text-[11.5px] text-slate-800 font-mono tracking-tight">{systemDate}</span>
                        </button>

                        {/* Date Adjustment Popover */}
                        {isDatePopoverOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-blue-600" />
                                        <span className="text-xs text-slate-900">PMS Business Date</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsDatePopoverOpen(false)}
                                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>

                                <div className="py-3 space-y-2">
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Active business date for night audit, room occupancy timeline, and folio postings:
                                    </p>
                                    <input
                                        type="date"
                                        value={tempDateInput}
                                        onChange={e => setTempDateInput(e.target.value)}
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={handleResetDate}
                                        className="text-[10px] font-semibold text-slate-500 hover:text-blue-700 cursor-pointer"
                                    >
                                        Reset (01 Jul 2026)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApplyDate}
                                        className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                                    >
                                        <Check size={12} />
                                        <span>Update Date</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. QUICK ACTION SHORTCUT ICONS */}
                    <div className="hidden sm:flex items-center gap-1 bg-slate-50 p-0.5 rounded-xl border border-slate-200/80">
                        {/* Global Omni-Search Shortcut (Ctrl + K) */}
                        <button
                            type="button"
                            onClick={() => setIsSearchModalOpen(true)}
                            title="Global Omni-Search (Ctrl + K)"
                            className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                                isSearchModalOpen
                                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                            }`}
                        >
                            <Search size={13} />
                        </button>

                        {/* New Reservation Shortcut */}
                        <button
                            type="button"
                            onClick={() => setActivePage('add-reservation')}
                            title="Add Reservation"
                            className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                                activePage === 'add-reservation' || activePage === 'quick-reservation'
                                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                            }`}
                        >
                            <Plus size={14} />
                        </button>

                        {/* Stay View Tape Chart */}
                        <button
                            type="button"
                            onClick={() => setActivePage('stay-view')}
                            title="Stay View Tape Chart"
                            className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                                activePage === 'stay-view'
                                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                            }`}
                        >
                            <CalendarDays size={13} />
                        </button>

                        {/* Room Rack Grid */}
                        <button
                            type="button"
                            onClick={() => setActivePage('room-rack')}
                            title="Room Rack Grid"
                            className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                                activePage === 'room-rack'
                                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                            }`}
                        >
                            <LayoutGrid size={13} />
                        </button>

                        {/* Restaurant POS Shortcut */}
                        <button
                            type="button"
                            onClick={() => setActivePage('pos')}
                            title="Restaurant POS Terminal"
                            className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                                activePage === 'pos'
                                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                            }`}
                        >
                            <Utensils size={13} />
                        </button>

                        {/* Kitchen Display (KDS) */}
                        <button
                            type="button"
                            onClick={() => setActivePage('kds')}
                            title="Kitchen Display System (KDS)"
                            className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                                activePage === 'kds'
                                    ? 'bg-white text-blue-600 shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                            }`}
                        >
                            <ChefHat size={13} />
                        </button>
                    </div>

                    {/* 4. NOTIFICATIONS BELL */}
                    <div className="relative" ref={alertsPopoverRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsAlertsPopoverOpen(!isAlertsPopoverOpen);
                                setIsPropertyPopoverOpen(false);
                                setIsDatePopoverOpen(false);
                                setIsDropdownOpen(false);
                            }}
                            className="size-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition flex items-center justify-center relative cursor-pointer shadow-2xs"
                            title="Notifications & Live Alerts"
                        >
                            <Bell size={13} />
                            {alerts.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 size-1.5 bg-blue-600 rounded-full ring-2 ring-white"></span>
                            )}
                        </button>

                        {isAlertsPopoverOpen && (
                            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-800">Operational Alerts</span>
                                        <span className="text-[10px] text-slate-400">Live Hotel & F&B stream</span>
                                    </div>
                                    <button
                                        onClick={() => setAlerts([])}
                                        className="text-[11px] text-blue-600 font-semibold cursor-pointer hover:underline"
                                    >
                                        Clear all
                                    </button>
                                </div>
                                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                    {alerts.length > 0 ? (
                                        alerts.map(a => (
                                            <div
                                                key={a.id}
                                                className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start gap-2"
                                            >
                                                <span className="size-2 rounded-full mt-1 shrink-0 bg-blue-600" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[11.5px] text-slate-800 truncate">{a.title}</p>
                                                        <span className="text-[9.5px] text-slate-400">{a.time}</span>
                                                    </div>
                                                    <p className="text-[10.5px] text-slate-500 mt-0.5">{a.desc}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-6 text-center text-slate-400 text-xs">
                                            No pending notifications
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Subtle Divider */}
                    <div className="h-5 w-px bg-slate-200"></div>

                    {/* 5. USER AVATAR BUTTON & EXECUTIVE ACCOUNT POPOVER */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsDropdownOpen(!isDropdownOpen);
                                setIsPropertyPopoverOpen(false);
                                setIsDatePopoverOpen(false);
                                setIsAlertsPopoverOpen(false);
                            }}
                            className="size-8.5 rounded-full border border-slate-200/90 bg-white hover:border-blue-500 hover:ring-2 hover:ring-blue-100 transition-all cursor-pointer shadow-2xs flex items-center justify-center relative group"
                            title={`${activeUserName} (${userRoleDisplay})`}
                        >
                            <div className="size-7 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-inner">
                                {userInitial}
                            </div>
                            <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-white absolute bottom-0 right-0" />
                        </button>

                        {/* Executive Account Popover */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50">
                                {/* Top Banner: Executive Dark Navy */}
                                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-3.5 relative overflow-hidden">
                                    <div className="absolute -right-4 -bottom-4 size-20 rounded-full bg-blue-500/15 blur-lg pointer-events-none" />

                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="size-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white flex items-center justify-center text-sm font-black shadow-md border-2 border-white/20 shrink-0">
                                            {userInitial}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-white truncate">
                                                {activeUserName}
                                            </p>
                                            <p className="text-[10px] text-slate-300 font-mono truncate mt-0.5">
                                                {activeUserEmail}
                                            </p>
                                            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-extrabold tracking-wide uppercase">
                                                <Shield size={9} />
                                                <span>{userRoleDisplay}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Hotel Property Context */}
                                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Building2 size={13} className="text-blue-600 shrink-0" />
                                        <span className="text-[11px] font-bold text-slate-700 truncate">
                                            {activeProperty?.name || 'Grand Palace Hotel & Resort'}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 shrink-0 flex items-center gap-1">
                                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <span>Active</span>
                                    </span>
                                </div>

                                {/* Account Navigation Actions */}
                                <div className="p-1.5 space-y-0.5">
                                    {/* 1. Personal User Profile & Security Modal */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setIsProfileModalOpen(true);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 rounded-xl flex items-center justify-between transition cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-7 rounded-lg bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center transition">
                                                <User size={13} />
                                            </div>
                                            <div>
                                                <p className="leading-tight font-bold text-slate-900 group-hover:text-blue-700">My Profile & Security</p>
                                                <p className="text-[10px] text-slate-400 group-hover:text-blue-500 font-normal">Account, password & POS PIN</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={12} className="text-slate-300 group-hover:text-blue-600 transition" />
                                    </button>

                                    {/* 2. Hotel Staff & Employee Directory */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setActivePage('user-management');
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 rounded-xl flex items-center justify-between transition cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-7 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 flex items-center justify-center transition">
                                                <Users size={13} />
                                            </div>
                                            <div>
                                                <p className="leading-tight font-bold">Staff & Employee Directory</p>
                                                <p className="text-[10px] text-slate-400 group-hover:text-blue-500 font-normal">Team roster, roles & departments</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={12} className="text-slate-300 group-hover:text-blue-600 transition" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setActivePage('multi-property');
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 rounded-xl flex items-center justify-between transition cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-7 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 flex items-center justify-center transition">
                                                <Building2 size={13} />
                                            </div>
                                            <div>
                                                <p className="leading-tight font-bold">Hotel Chain Console</p>
                                                <p className="text-[10px] text-slate-400 group-hover:text-blue-500 font-normal">Multi-property portfolio</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            HQ
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setActivePage('hotel-info');
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 rounded-xl flex items-center justify-between transition cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-7 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 flex items-center justify-center transition">
                                                <SlidersHorizontal size={13} />
                                            </div>
                                            <div>
                                                <p className="leading-tight font-bold">Property Configuration</p>
                                                <p className="text-[10px] text-slate-400 group-hover:text-blue-500 font-normal">Policies, outlets & folio</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={12} className="text-slate-300 group-hover:text-blue-600 transition" />
                                    </button>
                                </div>

                                {/* Footer with Sign Out */}
                                <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            onLogout();
                                        }}
                                        className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-rose-200/50"
                                    >
                                        <LogOut size={13} />
                                        <span>Sign Out of Session</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* In-Place Add Reservation Modal */}
            <AddReservationModal
                isOpen={isAddReservationOpen}
                onClose={() => setIsAddReservationOpen(false)}
                onReservationCreated={() => {
                    setIsAddReservationOpen(false);
                    setActivePage('reservations');
                }}
            />

            {/* Global Omni-Search / Command Palette Modal */}
            <GlobalOmniSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
                setActivePage={setActivePage}
                onOpenReservationDetails={handleOpenReservationDetails}
            />

            {/* Unified Enterprise Reservation Action Drawer (Callable globally via OmniSearch or Header) */}
            <ReservationActionDrawer
                isOpen={isActionDrawerOpen}
                onClose={() => {
                    setIsActionDrawerOpen(false);
                    setActionDrawerBooking(null);
                    syncReservationsFromDB();
                }}
                booking={actionDrawerBooking}
                initialMode={actionDrawerMode}
                allRooms={allRoomsForDrawer}
                systemDate={getOperatingSystemDate()}
                onCheckIn={async (resNo) => {
                    await updateReservationStatusInDB(resNo, 'in-house');
                    await syncReservationsFromDB();
                }}
                onCheckOut={async (resNo) => {
                    await updateReservationStatusInDB(resNo, 'checked-out');
                    await syncReservationsFromDB();
                }}
            />

            {/* Logged-in User Profile & Security Modal */}
            <UserProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </>
    );
};

export default Header;
