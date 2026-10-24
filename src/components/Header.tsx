import React, { useState, useRef, useEffect } from 'react';
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
    ExternalLink
} from 'lucide-react';
import AddReservationModal from './modals/AddReservationModal';
import { useProperty } from '../context/PropertyContext';

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

    const dropdownRef = useRef<HTMLDivElement>(null);
    const datePopoverRef = useRef<HTMLDivElement>(null);
    const propertyPopoverRef = useRef<HTMLDivElement>(null);
    const alertsPopoverRef = useRef<HTMLDivElement>(null);

    const { activeProperty, properties, setActivePropertyId } = useProperty();

    // Business System Date State (hydrated from localStorage or default '01 Jul 2026')
    const [systemDate, setSystemDate] = useState<string>(() => {
        return localStorage.getItem('hotel_system_date') || '01 Jul 2026';
    });
    const [tempDateInput, setTempDateInput] = useState<string>('2026-07-01');

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

    // Format active page for breadcrumbs
    const pageTitle = activePage
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    const userInitial = user?.name ? user.name.trim()[0].toUpperCase() : 'A';
    const userRoleDisplay = user?.role ? user.role.replace('_', ' ').toUpperCase() : 'STAFF';

    return (
        <>
            <header className="h-14 sm:h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-3 sm:px-5 flex-shrink-0 z-30 sticky top-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)] select-none">
                {/* Left Side - Clean Page Context / Breadcrumb */}
                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500 min-w-0">
                    <button
                        type="button"
                        onClick={() => setActivePage('front-desk')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 transition cursor-pointer"
                        title="Go to Front Desk Overview"
                    >
                        <Building2 size={13} className="text-blue-600" />
                        <span className="font-bold text-[11px] tracking-tight">{activeProperty?.code || 'GPD'}</span>
                    </button>

                    <span className="text-slate-300 font-light">/</span>

                    <span className="font-bold text-slate-900 text-xs sm:text-[13px] truncate max-w-[200px] sm:max-w-xs">
                        {pageTitle}
                    </span>
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
                            <span className="max-w-[130px] sm:max-w-[160px] truncate hidden xs:inline">
                                {activeProperty?.name || 'Grand Palace Dhaka'}
                            </span>
                            <span className="xs:hidden font-mono text-[11px] font-bold text-blue-600">
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
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Select Hotel Context
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsPropertyPopoverOpen(false);
                                            setActivePage('multi-property');
                                        }}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 cursor-pointer"
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
                                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
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
                                setIsDatePopoverOpen(!isDatePopoverOpen);
                                setIsPropertyPopoverOpen(false);
                                setIsAlertsPopoverOpen(false);
                                setIsDropdownOpen(false);
                            }}
                            className="h-8 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer select-none text-xs font-semibold"
                            title="PMS Operating System Date (Click to adjust business date)"
                        >
                            <Calendar size={13} className="text-slate-500" />
                            <span className="text-[10px] text-slate-400 font-medium hidden md:inline">Date:</span>
                            <span className="text-[11.5px] font-bold text-slate-800 font-mono tracking-tight">{systemDate}</span>
                        </button>

                        {/* Date Adjustment Popover */}
                        {isDatePopoverOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-blue-600" />
                                        <span className="text-xs font-bold text-slate-900">PMS Business Date</span>
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
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
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
                                        className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
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
                                        <span className="text-xs font-bold text-slate-800">Operational Alerts</span>
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
                                                        <p className="text-[11.5px] font-bold text-slate-800 truncate">{a.title}</p>
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

                    {/* 5. USER PROFILE PILL & DROPDOWN (OrderlyRMS TopNavbar Avatar Style) */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsDropdownOpen(!isDropdownOpen);
                                setIsPropertyPopoverOpen(false);
                                setIsDatePopoverOpen(false);
                                setIsAlertsPopoverOpen(false);
                            }}
                            className="flex items-center gap-2 px-2 py-1 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs group"
                            title="User Account"
                        >
                            <div className="size-7 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                                {userInitial}
                            </div>
                            <div className="hidden sm:flex flex-col text-left max-w-[120px] leading-tight">
                                <span className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                    {user?.name || 'Alexander Vance'}
                                </span>
                                <span className="text-[9.5px] font-semibold text-blue-600 truncate">
                                    {userRoleDisplay}
                                </span>
                            </div>
                            <ChevronDown
                                size={11}
                                className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {/* User Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150 z-50">
                                <div className="px-3.5 py-2 border-b border-slate-100">
                                    <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Alexander Vance'}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{user?.email || 'superadmin@hotelmanagement.os'}</p>
                                    <div className="flex items-center gap-1.5 mt-1.5 text-[9.5px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                                        <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                        <span className="truncate">{activeProperty?.name || 'Grand Palace Dhaka'}</span>
                                    </div>
                                </div>

                                <div className="py-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setActivePage('user-management');
                                        }}
                                        className="w-full text-left px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer font-medium"
                                    >
                                        <User size={13} className="text-slate-400" />
                                        <span>My Profile & Staff</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setActivePage('multi-property');
                                        }}
                                        className="w-full text-left px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer font-medium"
                                    >
                                        <Building2 size={13} className="text-blue-600" />
                                        <span>Multi-Hotel Chain Console</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setActivePage('hotel-info');
                                        }}
                                        className="w-full text-left px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer font-medium"
                                    >
                                        <SlidersHorizontal size={13} className="text-slate-400" />
                                        <span>Hotel Profile & Specs</span>
                                    </button>
                                </div>

                                <div className="border-t border-slate-100 my-1"></div>

                                <div className="px-2 pb-0.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            onLogout();
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-2 cursor-pointer"
                                    >
                                        <LogOut size={13} />
                                        <span>Sign Out</span>
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
        </>
    );
};

export default Header;
