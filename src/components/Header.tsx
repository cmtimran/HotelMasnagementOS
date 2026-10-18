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
    ChevronDown
} from 'lucide-react';

interface HeaderProps {
    activePage: string;
    setActivePage: (page: string) => void;
    onLogout: () => void;
    user: any;
}

const Header: React.FC<HeaderProps> = ({ activePage, setActivePage, onLogout, user }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const shortcuts = [
        { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={12} /> },
        { id: 'front-desk', label: 'Front Desk', icon: <Monitor size={12} /> },
        { id: 'stay-view', label: 'Stay View', icon: <Calendar size={12} /> },
        { id: 'manage-room', label: 'Rooms', icon: <BedDouble size={12} /> },
        { id: 'pos', label: 'POS Terminal', icon: <UtensilsCrossed size={12} /> },
        { id: 'reports', label: 'Reports', icon: <FileText size={12} /> },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <header className="h-11 bg-white border-b border-gray-200/90 flex items-center justify-between px-3 flex-shrink-0 z-40 sticky top-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none">
            {/* Left Side - Quick Module Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                {shortcuts.map((item) => {
                    const isActive = activePage === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            className={`
                                h-7 flex items-center gap-1.5 px-2.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap
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

            {/* Right Side - Property Info, Actions & Profile */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {/* Active Property Badge */}
                <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200/70 rounded-md text-[10.5px] text-gray-600 font-medium">
                    <Building2 size={12} className="text-gray-400" />
                    <span className="truncate max-w-[130px] font-semibold text-gray-700">{user?.property || 'Main Property'}</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                </div>

                {/* Quick Action Icons */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActivePage('pos')}
                        className="w-7 h-7 rounded-md border border-gray-200/80 text-gray-600 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                        title="Open POS Terminal"
                    >
                        <UtensilsCrossed size={13} />
                    </button>

                    <button
                        onClick={() => setActivePage('reports')}
                        className="w-7 h-7 rounded-md border border-gray-200/80 text-gray-600 flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        title="Reports Center"
                    >
                        <ClipboardList size={13} />
                    </button>

                    <button
                        className="w-7 h-7 rounded-md border border-gray-200/80 text-gray-600 flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-colors relative"
                        title="Notifications"
                    >
                        <Bell size={13} />
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    </button>
                </div>

                {/* Subtle Divider */}
                <div className="h-4 w-px bg-gray-200"></div>

                {/* Compact User Profile */}
                <div className="relative" ref={dropdownRef}>
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100/70 p-1 rounded-md transition-colors"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        title="User menu"
                    >
                        <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 overflow-hidden border border-gray-200/80 flex items-center justify-center flex-shrink-0">
                            {user?.image ? (
                                <img
                                    src={user.image}
                                    alt="User"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User size={13} />
                            )}
                        </div>
                        <div className="text-left hidden lg:block leading-none">
                            <p className="text-[11px] font-semibold text-gray-800 truncate max-w-[100px]">{user?.name || 'Admin User'}</p>
                            <p className="text-[9px] text-gray-400 font-medium capitalize mt-0.5">{user?.role || 'Manager'}</p>
                        </div>
                        <ChevronDown size={11} className="text-gray-400 hidden sm:block" />
                    </div>

                    {/* Compact Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-lg shadow-lg border border-gray-200/80 py-1 animate-in fade-in slide-in-from-top-1 z-50">
                            <div className="px-3 py-1.5 border-b border-gray-100">
                                <p className="text-[11px] font-bold text-gray-800 truncate">{user?.name || 'Admin User'}</p>
                                <p className="text-[9px] text-gray-400 truncate">{user?.email || 'admin@hotelmanagement.os'}</p>
                            </div>
                            <button
                                className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    setActivePage('user-management');
                                }}
                            >
                                <User size={13} className="text-gray-400" />
                                My Profile
                            </button>
                            <button
                                className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
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
                                    className="w-full text-center px-3 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded-md transition-all flex items-center justify-center gap-1.5"
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
    );
};

export default Header;
