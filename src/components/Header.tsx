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
    FileText
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
        { id: 'dashboard', label: 'HMS Overview', icon: <LayoutDashboard size={14} /> },
        { id: 'front-desk', label: 'Front Desk', icon: <Monitor size={14} /> },
        { id: 'manage-room', label: 'Rooms', icon: <BedDouble size={14} /> },
        { id: 'pos', label: 'POS / Billing', icon: <UtensilsCrossed size={14} /> },
        { id: 'reports', label: 'Reports', icon: <FileText size={14} /> },
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
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 z-40 sticky top-0 shadow-sm">
            {/* Left Side - Shortcuts */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
                {shortcuts.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActivePage(item.id)}
                        className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap
                            ${activePage === item.id
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}
                        `}
                    >
                        <span className={activePage === item.id ? 'text-white' : 'text-gray-400'}>
                            {item.icon}
                        </span>
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Right Side - Actions & Profile */}
            <div className="flex items-center gap-4">

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActivePage('pos')}
                        className="w-9 h-9 rounded-full border border-blue-600/30 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition-colors"
                        title="Open POS"
                    >
                        <UtensilsCrossed size={16} />
                    </button>

                    <button
                        className="w-9 h-9 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        title="Orders / Reports"
                    >
                        <ClipboardList size={16} />
                    </button>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-200"></div>

                {/* User Profile */}
                <div className="relative" ref={dropdownRef}>
                    <div
                        className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-gray-800 leading-tight">{user?.name || 'Guest User'}</p>
                            <p className="text-[10px] text-gray-500 font-medium">{user?.role || 'Guest'}</p>
                            <p className="text-[10px] text-blue-800 font-medium">{user?.property || 'No Property'}</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border border-gray-200">
                            <img
                                src={user?.image || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                                alt="User"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 animate-in fade-in slide-in-from-top-2 z-50">
                            <button
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                onClick={() => setIsDropdownOpen(false)}
                            >
                                <User size={16} className="text-gray-400" />
                                My Profile
                            </button>
                            <button
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                onClick={() => setIsDropdownOpen(false)}
                            >
                                <Building2 size={16} className="text-gray-400" />
                                Switch Hotel
                            </button>
                            <div className="h-px bg-gray-100 my-1"></div>
                            <div className="px-2 pb-1">
                                <button
                                    className="w-full text-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-all hover:shadow-sm flex items-center justify-center gap-2"
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        onLogout();
                                    }}
                                >
                                    <LogOut size={16} />
                                    Logout
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
