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
    LayoutGrid
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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const datePopoverRef = useRef<HTMLDivElement>(null);
    const propertyPopoverRef = useRef<HTMLDivElement>(null);
    const { activeProperty, properties, setActivePropertyId } = useProperty();


    // Business System Date State (hydrated from localStorage or default '01 Jul 2026')
    const [systemDate, setSystemDate] = useState<string>(() => {
        return localStorage.getItem('hotel_system_date') || '01 Jul 2026';
    });
    const [tempDateInput, setTempDateInput] = useState<string>('2026-07-01');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (datePopoverRef.current && !datePopoverRef.current.contains(event.target as Node)) {
                setIsDatePopoverOpen(false);
            }
            if (propertyPopoverRef.current && !propertyPopoverRef.current.contains(event.target as Node)) {
                setIsPropertyPopoverOpen(false);
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

    // Format active page for breadcrumbs
    const pageTitle = activePage
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

    return (
        <>
            <header className="h-11 bg-white border-b border-gray-200/90 flex items-center justify-between px-3 sm:px-4 flex-shrink-0 z-40 sticky top-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none">
                {/* Left Side - Clean Page Context / Breadcrumb */}
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 min-w-0">
                    <span className="text-gray-400 flex items-center gap-1.5 font-semibold text-[11px] tracking-tight">
                        <Building2 size={13} className="text-blue-600" />
                        <span>HotelOS</span>
                    </span>
                    <span className="text-gray-300">/</span>
                    <span className="font-semibold text-gray-800 text-[11.5px] truncate max-w-[200px] sm:max-w-xs">
                        {pageTitle}
                    </span>
                </div>

                {/* Right Side - Active Hotel Switcher, System Date, Action Icons, and User Profile */}
                <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
                    {/* Active Hotel Property Switcher Pill */}
                    <div className="relative" ref={propertyPopoverRef}>
                        <button
                            type="button"
                            onClick={() => setIsPropertyPopoverOpen(!isPropertyPopoverOpen)}
                            className="h-7 px-2.5 rounded-md border border-gray-200/80 bg-white hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer select-none text-[11px] font-semibold"
                            title="Active Hotel Property (Click to switch)"
                        >
                            <Building2 size={12} className="text-blue-600 flex-shrink-0" />
                            <span className="max-w-[120px] truncate hidden md:inline">{activeProperty?.name || 'Grand Palace'}</span>
                            <span className="md:hidden font-mono text-[10px] font-bold text-blue-600">{activeProperty?.code || 'GPD'}</span>
                            <ChevronDown size={11} className="text-gray-400" />
                        </button>

                        {isPropertyPopoverOpen && (
                            <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in">
                                <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hotel Properties</span>
                                    <button 
                                        type="button"
                                        onClick={() => { setIsPropertyPopoverOpen(false); setActivePage('multi-property'); }}
                                        className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                                    >
                                        Chain Console →
                                    </button>
                                </div>
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
                                            className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                                                isSelected ? 'bg-blue-50/80 text-blue-900 font-bold' : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                                    {p.code}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-xs truncate">{p.name}</p>
                                                    <p className="text-[9.5px] text-gray-400 font-normal">{p.city} • {p.total_rooms || 0} rooms</p>
                                                </div>
                                            </div>
                                            {isSelected && <Check size={13} className="text-blue-600 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 1. System Date (Compact Pill Button) */}
                    <div className="relative" ref={datePopoverRef}>
                        <button
                            type="button"
                            onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
                            className="h-7 px-2.5 rounded-md border border-gray-200/80 bg-white hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center gap-1.5 text-gray-700 shadow-2xs cursor-pointer select-none"
                            title="PMS Operating System Date (Click to adjust)"
                        >
                            <Calendar size={12} className="text-gray-500" />
                            <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">System Date:</span>
                            <span className="text-[11px] font-bold text-gray-800 font-mono tracking-tight">{systemDate}</span>
                        </button>

                        {/* Date Adjustment Popover */}
                        {isDatePopoverOpen && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-3.5 z-50 animate-in fade-in zoom-in-95">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-blue-700" />
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
                                        className="h-6 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Check size={11} />
                                        <span>Update</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Compact Topbar Action Icons (w-7 h-7 rounded-md border border-gray-200/80) */}
                    <div className="flex items-center gap-1.5">
                        {/* Add Reservation Button (Direct navigation to /add-reservation, matching sidebar) */}
                        <button
                            type="button"
                            onClick={() => setActivePage('add-reservation')}
                            title="Add Reservation (/add-reservation)"
                            className={`w-7 h-7 rounded-md border transition-colors flex items-center justify-center shadow-2xs cursor-pointer group ${
                                activePage === 'add-reservation' || activePage === 'quick-reservation'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200/80 font-semibold shadow-2xs'
                                    : 'border-gray-200/80 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 transition-transform group-hover:scale-105" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v6m-3-3h6" />
                            </svg>
                        </button>

                        {/* Stay View Button */}
                        <button
                            type="button"
                            onClick={() => setActivePage('stay-view')}
                            title="Stay View Calendar"
                            className={`w-7 h-7 rounded-md border transition-colors flex items-center justify-center shadow-2xs cursor-pointer group ${
                                activePage === 'stay-view'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200/80 font-semibold shadow-2xs'
                                    : 'border-gray-200/80 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 transition-transform group-hover:scale-105" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>

                        {/* Room Rack Button */}
                        <button
                            type="button"
                            onClick={() => setActivePage('room-rack')}
                            title="Room Rack Grid"
                            className={`w-7 h-7 rounded-md border transition-colors flex items-center justify-center shadow-2xs cursor-pointer group ${
                                activePage === 'room-rack'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200/80 font-semibold shadow-2xs'
                                    : 'border-gray-200/80 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <LayoutGrid size={13} className="transition-transform group-hover:scale-105" />
                        </button>

                        {/* Reservation List Button */}
                        <button
                            type="button"
                            onClick={() => setActivePage('reservations')}
                            title="Reservations List"
                            className={`w-7 h-7 rounded-md border transition-colors flex items-center justify-center shadow-2xs cursor-pointer group ${
                                activePage === 'reservations' || activePage === 'reservations-view'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200/80 font-semibold shadow-2xs'
                                    : 'border-gray-200/80 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 transition-transform group-hover:scale-105" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14h.01M15 14h.01M12 14h.01M9 17h.01M12 17h.01M15 17h.01" />
                            </svg>
                        </button>

                        {/* Notifications Bell Button */}
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

                    {/* User Profile */}
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
                                    {user?.role || 'Admin'} • {activeProperty?.code || 'GPD'}
                                </span>
                            </div>

                            {/* Avatar with subtle online indicator */}
                            <div className="w-7 h-7 rounded-full border-2 border-emerald-500 p-0.5 overflow-hidden flex items-center justify-center bg-white shadow-2xs hover:scale-105 transition-transform flex-shrink-0">
                                {user?.image ? (
                                    <img
                                        src={user.image}
                                        alt="User"
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                                        {user?.name ? user.name.charAt(0) : <User size={12} />}
                                    </div>
                                )}
                            </div>
                            <ChevronDown size={11} className="text-gray-400 hidden sm:block" />
                        </div>

                        {/* User Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-lg shadow-lg border border-gray-200/80 py-1 animate-in fade-in slide-in-from-top-1 z-50">
                                <div className="px-3 py-1.5 border-b border-gray-100">
                                    <p className="text-[11px] font-bold text-gray-800 truncate">{user?.name || 'John Smith'}</p>
                                    <p className="text-[9px] text-gray-400 truncate">{user?.email || 'admin@hotelmanagement.os'}</p>
                                    <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-700 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span>Active: {activeProperty?.name ? (activeProperty.code + ' - ' + activeProperty.city) : 'Grand Palace'}</span>
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
                                        setActivePage('multi-property');
                                    }}
                                >
                                    <Building2 size={13} className="text-blue-600" />
                                    Switch Hotel Property
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

            {/* In-Place Reservation Modal */}
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