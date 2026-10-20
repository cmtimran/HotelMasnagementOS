import React from 'react';
import {
    Users,
    Shield,
    Database,
    ShieldCheck,
    Settings,
    Lock
} from 'lucide-react';

export type SecurityHubTab = 'users' | 'roles' | 'master-data' | 'policy' | 'general';

interface SecuritySettingsHubNavProps {
    activeHub: SecurityHubTab;
    onNavigate?: (page: string) => void;
}

export const SecuritySettingsHubNav: React.FC<SecuritySettingsHubNavProps> = ({
    activeHub,
    onNavigate,
}) => {
    const hubItems: { id: SecurityHubTab; routeId: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
        { id: 'users', routeId: 'user-management', label: 'Users & Staff', icon: Users },
        { id: 'roles', routeId: 'roles-permissions', label: 'Roles & RBAC', icon: Shield },
        { id: 'master-data', routeId: 'master-data', label: 'Master Data Config', icon: Database },
        { id: 'policy', routeId: 'policy-management', label: 'Policy Settings', icon: ShieldCheck },
        { id: 'general', routeId: 'general-settings', label: 'System Settings', icon: Settings },
    ];

    const handleClick = (routeId: string) => {
        if (onNavigate) {
            onNavigate(routeId);
        } else {
            // Fallback: direct slug navigation
            const slugMap: Record<string, string> = {
                'user-management': '/users',
                'roles-permissions': '/roles-permissions',
                'master-data': '/master-data',
                'policy-management': '/policy-settings',
                'general-settings': '/general-settings',
            };
            window.history.pushState({}, '', slugMap[routeId] || '/dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    };

    return (
        <div className="bg-white px-3 py-2 rounded-xl border border-gray-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider mr-1 hidden md:inline">
                    Settings Suite:
                </span>
                {hubItems.map(item => {
                    const isActive = activeHub === item.id;
                    const IconComponent = item.icon;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => handleClick(item.routeId)}
                            className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${isActive
                                ? 'bg-blue-600 text-white shadow-2xs font-bold'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 bg-gray-50/70 border border-gray-200/60'
                                }`}
                        >
                            <IconComponent size={12} className={isActive ? 'text-white' : 'text-gray-500'} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="hidden lg:flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 text-[10px]">
                    <Lock size={10} />
                    <span>ISO-27001 & PCI-DSS Shielded</span>
                </span>
            </div>
        </div>
    );
};

export default SecuritySettingsHubNav;
