import { useState, useMemo, useEffect } from 'react';
import {
    Users,
    Settings,
    ListOrdered,
    ChevronDown,
    ChevronRight,
    UtensilsCrossed,
    ChevronLeft,
    Menu,
    Tags,
    Package,
    Layers,
    Scale,
    Grid3X3,
    Map,
    Monitor,
    ChefHat,
    User,
    CreditCard,
    Shield,
    LayoutDashboard,
    Building2,
    BedDouble,
    Percent,
    UserCog,
    Info,
    FileText,
    Briefcase,
    Utensils,
    Calendar,
    LayoutGrid,
    Plus,
    Sparkles,
    ClipboardList,
    TrendingUp,
    Target,
    BarChart3,
    Database,
    Moon,
    Ticket,
    ShieldCheck,
    Search,
    X,
    Landmark,
    Wallet,
    Clock,
    Wrench,
    ExternalLink
} from 'lucide-react';
import { getRouteByPageId } from '../navigation/routesRegistry';

export interface MenuItem {
    id?: string;
    key?: string;
    label: string;
    icon?: React.ReactNode;
    items?: MenuItem[];
    newTab?: boolean;
    badge?: string;
    badgeColor?: string;
}

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

export const Sidebar = ({ activePage, setActivePage, isCollapsed, toggleSidebar }: SidebarProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        frontOffice: true, // front office open by default for hospitality operations
        premiumOps: false,
        housekeeping: false,
        posManagement: false,
        menuKey: false,
        setupKey: false,
        staffKey: false,
        rateKey: false,
        roomKey: false,
        financeKey: false,
        b2b: false,
        propertyKey: false,
        reportsKey: false,
        admin: false,
    });

    const toggleMenu = (key: string) => {
        setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // ========================================================================
    // COMPLETE EXPERT MENU ARCHITECTURE (USALI & 5-STAR PMS STANDARD)
    // ========================================================================
    const menuGroups: MenuItem[] = [
        // 1. Front Desk & Reception Operations
        {
            key: 'frontOffice',
            label: 'Front Desk',
            icon: <BedDouble size={14} />,
            items: [
                { id: 'front-desk', label: 'Front Desk Dashboard', icon: <Monitor size={12} /> },
                { id: 'quick-reservation', label: 'Quick Reservation', icon: <Plus size={12} /> },
                { id: 'room-rack', label: 'Room Rack Grid', icon: <LayoutGrid size={12} /> },
                { id: 'reservations', label: 'Reservations List', icon: <Calendar size={12} /> },
                { id: 'stay-view', label: 'Stay View Calendar', icon: <Calendar size={12} /> },
                { id: 'folio-operations', label: 'Folio & Billing', icon: <FileText size={12} /> },
                { id: 'guest-profile', label: 'Guest Profiles 360', icon: <User size={12} /> },
                { id: 'floor-plan', label: 'Floor Plan View', icon: <Map size={12} /> },
                { id: 'occupancy-heatmap', label: 'Occupancy Heatmap', icon: <Grid3X3 size={12} /> },
            ]
        },

        // 2. Night Audit & Front Office Governance
        {
            key: 'premiumOps',
            label: 'Night Audit & Ops',
            icon: <Sparkles size={14} />,
            items: [
                { id: 'night-audit', label: 'Night Audit Pipeline', icon: <Moon size={12} />, badge: 'EOD', badgeColor: 'bg-purple-100 text-purple-700' },
                { id: 'service-vouchers', label: 'Digital Guest Vouchers', icon: <Ticket size={12} /> },
                { id: 'allowance-checker', label: 'Allowance & Credit Check', icon: <ShieldCheck size={12} /> },
            ]
        },

        // 3. Housekeeping & Engineering
        {
            key: 'housekeeping',
            label: 'Housekeeping',
            icon: <ClipboardList size={14} />,
            items: [
                { id: 'housekeeping', label: 'Room Cleanliness Grid', icon: <ClipboardList size={12} /> },
                { id: 'maintenance', label: 'Maintenance Kanban', icon: <Wrench size={12} /> },
            ]
        },

        // 4. Rate & Distribution Master
        {
            key: 'rateKey',
            label: 'Rate & Channel Master',
            icon: <Percent size={14} />,
            items: [
                { id: 'rate-plans', label: 'Rate Plans (BAR & Corp)', icon: <Tags size={12} /> },
                { id: 'package-builder', label: 'Package Master (L2)', icon: <Package size={12} /> },
                { id: 'meal-plans', label: 'Meal Plans (EP, CP, MAP)', icon: <Utensils size={12} /> },
                { id: 'service-master', label: 'Service Master (L1)', icon: <Sparkles size={12} /> },
                { id: 'rate-calendar', label: 'Rate & Availability Board', icon: <Calendar size={12} /> },
                { id: 'discounts', label: 'Discount Policies', icon: <Percent size={12} /> },
            ]
        },

        // 5. Room Inventory & Physical Units
        {
            key: 'roomKey',
            label: 'Room Inventory',
            icon: <Layers size={14} />,
            items: [
                { id: 'manage-room-type', label: 'Room Types & Classes', icon: <Tags size={12} /> },
                { id: 'manage-room', label: 'Physical Rooms Master', icon: <BedDouble size={12} /> },
                { id: 'joint-room', label: 'Connecting Rooms', icon: <Layers size={12} /> },
                { id: 'building-floor', label: 'Floors & Buildings', icon: <Building2 size={12} /> },
            ]
        },

        // 6. Food & Beverage POS & KDS
        {
            key: 'posManagement',
            label: 'F&B POS & KDS',
            icon: <UtensilsCrossed size={14} />,
            items: [
                { id: 'pos-dashboard', label: 'POS Terminal Overview', icon: <LayoutDashboard size={12} /> },
                { id: 'pos', label: 'Cashier Terminal', icon: <UtensilsCrossed size={12} /> },
                {
                    key: 'menuKey',
                    label: 'Menu Configuration',
                    icon: <ListOrdered size={12} />,
                    items: [
                        { id: 'categories', label: 'Food Categories', icon: <Tags size={12} /> },
                        { id: 'products', label: 'Menu Items & Pricing', icon: <Package size={12} /> },
                        { id: 'addons', label: 'Modifiers & Addons', icon: <Layers size={12} /> },
                        { id: 'units', label: 'Portion Units', icon: <Scale size={12} /> },
                    ]
                },
                {
                    key: 'setupKey',
                    label: 'Dining & Kitchen Setup',
                    icon: <Settings size={12} />,
                    items: [
                        { id: 'tables', label: 'Tables Master', icon: <Grid3X3 size={12} /> },
                        { id: 'table-layout', label: 'Interactive Table Layout', icon: <Map size={12} /> },
                        { id: 'kds', label: 'Kitchen Display (KDS)', icon: <ChefHat size={12} />, badge: 'Live', badgeColor: 'bg-emerald-100 text-emerald-700' },
                        { id: 'counters', label: 'POS Billing Stations', icon: <Monitor size={12} /> },
                        { id: 'kitchens', label: 'Kitchen Stations', icon: <ChefHat size={12} /> },
                        { id: 'floor', label: 'Dining Areas & Zones', icon: <Map size={12} /> },
                    ]
                },
                {
                    key: 'staffKey',
                    label: 'F&B Service Staff',
                    icon: <Users size={12} />,
                    items: [
                        { id: 'waiters', label: 'Waiters & Captains', icon: <User size={12} /> },
                        { id: 'pos-users', label: 'POS Cashiers', icon: <CreditCard size={12} /> },
                        { id: 'admin-users', label: 'F&B Supervisors', icon: <Shield size={12} /> },
                    ]
                }
            ]
        },

        // 7. Finance, Banking & USALI ERP
        {
            key: 'financeKey',
            label: 'Finance & USALI ERP',
            icon: <Landmark size={14} />,
            items: [
                { id: 'revenue-dashboard', label: 'Revenue KPIs (ADR/RevPAR)', icon: <TrendingUp size={12} /> },
                { id: 'master-data', label: 'Master Data & GL Mapping', icon: <Database size={12} />, badge: 'ERP', badgeColor: 'bg-blue-100 text-blue-700' },
                { id: 'revenue-heads', label: 'Revenue Heads & Groups', icon: <TrendingUp size={12} />, badge: 'USALI', badgeColor: 'bg-emerald-100 text-emerald-700' },
                { id: 'banking', label: 'Bank Accounts & MFS', icon: <Wallet size={12} />, badge: 'MFS', badgeColor: 'bg-indigo-100 text-indigo-700' },
                { id: 'extra-charges', label: 'Extra Charges & Add-ons', icon: <Plus size={12} /> },
                { id: 'discounts', label: 'Discounts & Rebates (GL-4990)', icon: <Percent size={12} /> },
                { id: 'finance-overview', label: 'General Ledger Accounts', icon: <FileText size={12} /> },
            ]
        },

        // 8. B2B Corporate & Revenue
        {
            key: 'b2b',
            label: 'B2B & Sales Accounts',
            icon: <TrendingUp size={14} />,
            items: [
                { id: 'corporate-profiles', label: 'Corporate Accounts (City Ledger)', icon: <Building2 size={12} /> },
                { id: 'business-origins', label: 'Business Origins & Sources', icon: <Target size={12} /> },
                { id: 'advanced-reports', label: 'Advanced Analytics', icon: <BarChart3 size={12} /> },
            ]
        },

        // 9. Properties & Locations
        {
            key: 'propertyKey',
            label: 'Properties & Chain',
            icon: <Building2 size={14} />,
            items: [
                { id: 'properties', label: 'All Hotel Properties', icon: <Building2 size={12} /> },
                { id: 'hotel-info', label: 'Property Profile & Info', icon: <Info size={12} /> },
                { id: 'property-create', label: 'Register New Property', icon: <Plus size={12} /> },
            ]
        },

        // 10. Audit Reports Center
        {
            key: 'reportsKey',
            label: 'Audit & Reports',
            icon: <FileText size={14} />,
            items: [
                { id: 'reports', label: 'Report Center & Packs', icon: <ListOrdered size={12} />, newTab: true, badge: 'Packs', badgeColor: 'bg-gray-100 text-gray-700' },
            ]
        },

        // 11. Organization, Staff & Security Settings
        {
            key: 'admin',
            label: 'Security & Settings',
            icon: <Shield size={14} />,
            items: [
                { id: 'user-management', label: 'Users & Staff Directory', icon: <UserCog size={12} /> },
                { id: 'roles-permissions', label: 'Roles & RBAC Matrix', icon: <Shield size={12} /> },
                { id: 'departments', label: 'Department Management', icon: <Building2 size={12} /> },
                { id: 'shifts', label: '24/7 Work Shifts', icon: <Clock size={12} /> },
                { id: 'policy-management', label: 'Policy Engine & Rules', icon: <ShieldCheck size={12} /> },
                { id: 'general-settings', label: 'System Configuration', icon: <Settings size={12} /> },
            ]
        }
    ];

    // ========================================================================
    // AUTO-EXPAND ACTIVE PARENT MENU GROUP ON NAVIGATION
    // ========================================================================
    useEffect(() => {
        if (!activePage) return;

        // Recursive search for parent keys containing activePage
        const findParentKeys = (items: MenuItem[], parentKey?: string): string[] => {
            let keys: string[] = [];
            for (const item of items) {
                if (item.id === activePage && parentKey) {
                    keys.push(parentKey);
                }
                if (item.items && item.key) {
                    const nested = findParentKeys(item.items, item.key);
                    if (nested.length > 0) {
                        keys.push(item.key);
                        if (parentKey) keys.push(parentKey);
                    }
                }
            }
            return keys;
        };

        const matchedParents = findParentKeys(menuGroups);
        if (matchedParents.length > 0) {
            setOpenMenus(prev => {
                const updated = { ...prev };
                matchedParents.forEach(k => {
                    updated[k] = true;
                });
                return updated;
            });
        }
    }, [activePage]);

    // ========================================================================
    // FILTER MENU ITEMS WITH SEARCH
    // ========================================================================
    const filteredMenuGroups = useMemo(() => {
        if (!searchTerm.trim()) return menuGroups;
        const term = searchTerm.toLowerCase();

        const filterItems = (items: MenuItem[]): MenuItem[] => {
            const result: MenuItem[] = [];
            for (const item of items) {
                const matchesLabel = item.label.toLowerCase().includes(term);
                if (item.items) {
                    const matchedChildren = filterItems(item.items);
                    if (matchesLabel || matchedChildren.length > 0) {
                        result.push({
                            ...item,
                            items: matchedChildren.length > 0 ? matchedChildren : item.items
                        });
                    }
                } else if (matchesLabel) {
                    result.push(item);
                }
            }
            return result;
        };

        return filterItems(menuGroups);
    }, [searchTerm]);

    // ========================================================================
    // RECURSIVE RENDER MENU ITEM
    // ========================================================================
    const renderMenuItem = (item: MenuItem, depth: number = 0) => {
        const isOpen = item.key ? (openMenus[item.key] || searchTerm.trim().length > 0) : false;
        const hasChildren = item.items && item.items.length > 0;
        const isActive = item.id ? activePage === item.id : false;

        if (hasChildren) {
            return (
                <div key={item.key || item.label} className="mt-0.5">
                    <button
                        type="button"
                        onClick={() => !isCollapsed && item.key && toggleMenu(item.key)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 text-gray-700 text-[11.5px] font-semibold hover:bg-gray-100/70 rounded-md transition-colors cursor-pointer group select-none ${isCollapsed ? 'justify-center px-0' : ''}`}
                        title={isCollapsed ? item.label : ""}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0">
                                {item.icon}
                            </span>
                            {!isCollapsed && (
                                <span className="truncate text-left">{item.label}</span>
                            )}
                        </div>
                        {!isCollapsed && (
                            <span className="text-gray-400 group-hover:text-gray-600 transition-transform">
                                {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            </span>
                        )}
                    </button>

                    {/* Children with sleek compact tree line */}
                    {isOpen && !isCollapsed && item.items && (
                        <div className={`mt-0.5 space-y-0.5 ${depth === 0 ? 'ml-3 pl-1.5 border-l border-gray-200/60' : 'ml-2 pl-1 border-l border-gray-100'}`}>
                            {item.items.map(child => renderMenuItem(child, depth + 1))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div
                key={item.id}
                onClick={() => {
                    if (item.id) {
                        if (item.newTab) {
                            const byId = getRouteByPageId(item.id);
                            const slug = byId ? byId.slug : `/${item.id}`;
                            window.open(slug, '_blank');
                        } else {
                            setActivePage(item.id);
                        }
                    }
                }}
                className={`
                    flex items-center gap-2 px-2 py-1 text-[11px] font-medium rounded-md cursor-pointer transition-all select-none
                    ${isActive 
                        ? 'bg-blue-50 text-blue-700 font-bold shadow-xs' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'}
                    ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}
                `}
                title={isCollapsed ? item.label : ""}
            >
                <span className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                    {item.icon}
                </span>
                {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                )}
                {!isCollapsed && item.badge && (
                    <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider flex-shrink-0 ${item.badgeColor || 'bg-blue-50 text-blue-700 border border-blue-200/60'}`}>
                        {item.badge}
                    </span>
                )}
                {!isCollapsed && item.newTab && (
                    <span className="text-gray-400 hover:text-gray-600 ml-1">
                        <ExternalLink size={10} />
                    </span>
                )}
            </div>
        );
    };

    return (
        <aside
            className={`${isCollapsed ? 'w-14' : 'w-56'} bg-white border-r border-gray-200/90 h-screen sticky top-0 flex flex-col transition-all duration-200 ease-in-out flex-shrink-0 z-50 select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)]`}
        >
            {/* Header / Brand Area */}
            <div className={`h-11 px-2.5 flex items-center border-b border-gray-100 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <div 
                        className="cursor-pointer flex items-center gap-2 min-w-0" 
                        onClick={() => setActivePage('dashboard')}
                        title="HotelManagementOS"
                    >
                        <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                            <Building2 size={13} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none truncate">HotelOS</h1>
                            <p className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider leading-none mt-0.5">Enterprise</p>
                        </div>
                    </div>
                )}

                <button
                    onClick={toggleSidebar}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 cursor-pointer"
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <Menu size={16} /> : <ChevronLeft size={15} />}
                </button>
            </div>

            {/* Quick Search (Expanded Only) */}
            {!isCollapsed && (
                <div className="px-2 pt-2 pb-1 border-b border-gray-50">
                    <div className="relative flex items-center">
                        <Search size={11} className="absolute left-2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Quick jump..."
                            className="w-full text-[11px] bg-gray-50/80 hover:bg-gray-100/60 focus:bg-white border border-gray-200/70 focus:border-blue-400 rounded-md py-1 pl-6 pr-6 text-gray-700 placeholder-gray-400 focus:outline-none transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-1.5 p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                                <X size={10} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Navigation Body */}
            <nav className="flex-1 px-1.5 py-1.5 space-y-0.5 overflow-y-auto overflow-x-hidden scrollbar-thin">
                {/* Global Dashboard Link */}
                <div
                    onClick={() => setActivePage('dashboard')}
                    className={`flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium rounded-md cursor-pointer transition-colors ${activePage === 'dashboard' ? 'bg-blue-50 text-blue-700 font-bold shadow-xs' : 'text-gray-700 hover:bg-gray-100/70'} ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}`}
                    title={isCollapsed ? "HMS Overview" : ""}
                >
                    <span className={`flex-shrink-0 ${activePage === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <LayoutDashboard size={14} />
                    </span>
                    {!isCollapsed && <span className="truncate">HMS Overview</span>}
                </div>

                {/* Manager Dashboard Link */}
                <div
                    onClick={() => setActivePage('manager-dashboard')}
                    className={`flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium rounded-md cursor-pointer transition-colors ${activePage === 'manager-dashboard' ? 'bg-blue-50 text-blue-700 font-bold shadow-xs' : 'text-gray-700 hover:bg-gray-100/70'} ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}`}
                    title={isCollapsed ? "Manager Dashboard" : ""}
                >
                    <span className={`flex-shrink-0 ${activePage === 'manager-dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <Briefcase size={14} />
                    </span>
                    {!isCollapsed && <span className="truncate">Manager KPIs</span>}
                </div>

                {/* Primary Front Desk Shortcut */}
                <div
                    onClick={() => setActivePage('front-desk')}
                    className={`flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium rounded-md cursor-pointer transition-colors ${activePage === 'front-desk' ? 'bg-blue-50 text-blue-700 font-bold shadow-xs' : 'text-gray-700 hover:bg-gray-100/70'} ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}`}
                    title={isCollapsed ? "Front Desk Operations" : ""}
                >
                    <span className={`flex-shrink-0 ${activePage === 'front-desk' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <Monitor size={14} />
                    </span>
                    {!isCollapsed && (
                        <div className="flex items-center justify-between w-full min-w-0">
                            <span className="truncate">Front Desk Operations</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-100 my-1"></div>

                {/* Group Accordions */}
                {filteredMenuGroups.map((group) => renderMenuItem(group, 0))}

                {filteredMenuGroups.length === 0 && (
                    <div className="py-4 text-center text-gray-400 text-[10px]">
                        No menu items found
                    </div>
                )}
            </nav>

            {/* Footer / System Status indicator */}
            <div className="h-8 px-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 bg-gray-50/50">
                {!isCollapsed && (
                    <>
                        <span className="flex items-center gap-1.5 text-[9px] font-medium text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online (ERP Core)
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">v4.2</span>
                    </>
                )}
                {isCollapsed && (
                    <div className="w-full flex justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="System Online"></span>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
