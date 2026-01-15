import React from 'react';
import { UtensilsCrossed, ClipboardList } from 'lucide-react';

interface HeaderProps {
    setActivePage: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ setActivePage }) => {
    return (
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 z-40 sticky top-0">
            {/* Left Side - Global Search (Optional placeholder based on common UI patterns) */}
            <div className="flex-1 max-w-xl">
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
                <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-gray-800 leading-tight">John Smith</p>
                        <p className="text-[10px] text-gray-500 font-medium">Admin</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border border-gray-200">
                        <img
                            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                            alt="User"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

            </div>
        </header>
    );
};

export default Header;
