import React, { useState, useRef, useEffect } from 'react';
import {
    UtensilsCrossed,
    ClipboardList,
    User,
    Building2,
    LogOut,
    LayoutDashboard,
    Monitor,
    BedDouble,
    FileText,
    Calendar,
    Bell,
    ChevronDown,
    X,
    Check
} from 'lucide-react';
import AddReservationModal from './modals/AddReservationModal';

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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const datePopoverRef = useRef<HTMLDivElement>(null);

    // Business System Date State (hydrated from localStorage or default '01 Jul 2026' from hotel-management)
    const [systemDate, setSystemDate] = useState<string>(() => {
        return localStorage.getItem('hotel_system_date') || '01 Jul 2026';
    });
    const [tempDateInput, setTempDateInput] = useState<string>('2026-07-01');

    const shortcuts = [
        { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={12} /> },
        { id: 'front-desk', label: 'Front Desk', icon: <Monitor size={12} /> },
        { id: 'manage-room', label: 'Rooms', icon: <BedDouble size={12} /> },
        { id: 'pos', label: 'POS Terminal', icon: <UtensilsCrossed size={12} /> },
        { id: 'reports', label: 'Reports', icon: <FileText size={12} /> },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (datePopoverRef.current && !datePopoverRef.current.contains(event.target as Node)) {
                setIsDatePopoverOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
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

    return (
        <>
            <header className="h-12 bg-white border-b border-gray-200/90 flex items-center justify-between px-3 sm:px-4 flex-shrink-0 z-40 sticky top-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none">
                {/* Left Side - Quick Module Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                    {shortcuts.map((item) => {
                        const isActive = activePage === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActivePage(item.id)}
                                className={`
                                    h-7 flex items-center gap-1.5 px-2.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer
                                    ${isActive
                                        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/80 shadow-2xs'
                                        : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'}
                                `}
                            >
                                <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Right Side - System Date, Topbar Icons, Actions & Profile */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {/* 1. System Date (HMS hotel-management style) */}
                    <div className="relative" ref={datePopoverRef}>
                        <button
                            type="button"
                            onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
                            className="flex flex-col items-end justify-center px-2 py-0.5 rounded-md hover:bg-gray-50 transition-colors cursor-pointer select-none leading-none group text-right"
                            title="PMS Operating System Date (Click to adjust)"
                        >
                            <span className="text-[10px] text-gray-500 font-medium">System Date</span>
                            <span className="text-[12.5px] font-bold text-[#1e3a8a] mt-0.5 tracking-tight font-mono group-hover:text-blue-700">
                                {systemDate}
                            </span>
                        </button>

                        {/* Date Popover Modal */}
                        {isDatePopoverOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-3.5 z-50 animate-in fade-in zoom-in-95">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-[#1e3a8a]" />
                                        <span className="text-xs font-bold text-gray-900">PMS System Date</span>
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
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg text-xs font-bold text-[#1e3a8a] outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={handleResetDate}
                                        className="text-[10px] font-semibold text-gray-500 hover:text-blue-700 cursor-pointer"
                                    >
                                        Reset to 01 Jul 2026
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApplyDate}
                                        className="h-6 px-3 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Check size={11} />
                                        <span>Update</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Topbar Action Icons (hotel-management: Add Reservation, Stay View, Reservation List) */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Add Reservation (Calendar with Plus) */}
                        <button
                            type="button"
                            onClick={() => setIsAddReservationOpen(true)}
                            title="ADD RESERVATION"
                            className="w-8 h-8 rounded-full border border-[#1e3a8a] flex items-center justify-center text-[#1e3a8a] hover:bg-blue-50/80 transition-all shadow-2xs active:scale-95 cursor-pointer group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v6m-3-3h6" />
                            </svg>
                        </button>

                        {/* Stay View (Simple Calendar) */}
                        <button
                            type="button"
                            onClick={() => setActivePage('stay-view')}
                            title="STAY VIEW"
                            className={`w-8 h-8 rounded-full border border-[#1e3a8a] flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer group ${
                                activePage === 'stay-view'
                                    ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                                    : 'text-[#1e3a8a] hover:bg-blue-50/80'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>

                        {/* Reservation List (Calendar with Dots / List) */}
                        <button
                            type="button"
                            onClick={() => setActivePage('reservations')}
                            title="RESERVATIONS"
                            className={`w-8 h-8 rounded-full border border-[#1e3a8a] flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer group ${
                                activePage === 'reservations' || activePage === 'reservations-view'
                                    ? 'bg-[#1e3a8a] text-white border-[#1e3a8a]'
                                    : 'text-[#1e3a8a] hover:bg-blue-50/80'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14h.01M15 14h.01M12 14h.01M9 17h.01M12 17h.01M15 17h.01" />
                            </svg>
                        </button>
                    </div>

                    {/* Quick Access Utility Icons (Reports & Notifications) */}
                    <div className="hidden sm:flex items-center gap-1">
                        <button
                            onClick={() => setActivePage('reports')}
                            className="w-7 h-7 rounded-md border border-gray-200/80 text-gray-600 flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
                            title="Reports Center"
                        >
                            <ClipboardList size={13} />
                        </button>

                        <button
                            className="w-7 h-7 rounded-md border border-gray-200/80 text-gray-600 flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-colors relative cursor-pointer"
                            title="Notifications"
                        >
                            <Bell size={13} />
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                        </button>
                    </div>

                    {/* Subtle Divider */}
                    <div className="h-4 w-px bg-gray-200"></div>

                    {/* User Profile (hotel-management style: User Info + Avatar with Green Online Ring) */}
                    <div className="relative" ref={dropdownRef}>
                        <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-100/70 p-1 rounded-md transition-colors"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            title="User Account"
                        >
                            <div className="text-right hidden md:flex flex-col leading-tight">
                                <span className="text-[11px] font-bold text-gray-800 truncate max-w-[110px]">
                                    {user?.name || 'John Smith'}
                                </span>
                                <span className="text-[9.5px] text-gray-500 font-medium truncate max-w-[110px]">
                                    {user?.role || 'Admin'} • {user?.property || 'Nice Hotel'}
                                </span>
                            </div>

                            {/* Avatar with green online ring (#00c853) */}
                            <div className="w-8 h-8 rounded-full border-2 border-[#00c853] p-0.5 overflow-hidden flex items-center justify-center bg-white shadow-2xs hover:scale-105 transition-transform flex-shrink-0">
                                {user?.image ? (
                                    <img
                                        src={user.image}
                                        alt="User"
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                        {user?.name ? user.name.charAt(0) : <User size={13} />}
                                    </div>
                                )}
                            </div>
                            <ChevronDown size={11} className="text-gray-400 hidden sm:block" />
                        </div>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-lg shadow-lg border border-gray-200/80 py-1 animate-in fade-in slide-in-from-top-1 z-50">
                                <div className="px-3 py-1.5 border-b border-gray-100">
                                    <p className="text-[11px] font-bold text-gray-800 truncate">{user?.name || 'John Smith'}</p>
                                    <p className="text-[9px] text-gray-400 truncate">{user?.email || 'admin@hotelmanagement.os'}</p>
                                    <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-700 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span>Active Session ({user?.property || 'Nice Hotel'})</span>
                                    </div>
                                </div>
                                <button
                                    className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setActivePage('user-management');
                                    }}
                                >
                                    <User size={13} className="text-gray-400" />
                                    My Profile
                                </button>
                                <button
                                    className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer"
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setActivePage('properties');
                                    }}
                                >
                                    <Building2 size={13} className="text-gray-400" />
                                    Switch Property
                                </button>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <div className="px-1.5 pb-0.5">
                                    <button
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

            {/* Global Add Reservation Modal (Triggered by Topbar Circular Button) */}
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