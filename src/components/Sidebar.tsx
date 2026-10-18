import { useState, useMemo } from 'react';
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
    BadgeDollarSign,
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
    X
} from 'lucide-react';

interface MenuItem {
    id?: string;
    key?: string;
    label: string;
    icon?: React.ReactNode;
    items?: MenuItem[];
    newTab?: boolean;
}

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

const Sidebar = ({ activePage, setActivePage, isCollapsed, toggleSidebar }: SidebarProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        posManagement: false,
        frontOffice: true, // front office open by default for hospitality front desk
        housekeeping: false,
        premiumOps: false,
        b2b: false,
        admin: false,
        menuKey: false,
        setupKey: false,
        staffKey: false,
        propertyKey: false,
        roomKey: false,
        rateKey: false,
        userKey: false,
        settingsKey: false,
        financeKey: false,
        reportsKey: false,
    });

    const toggleMenu = (key: string) => {
        setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const menuGroups: MenuItem[] = [
        {
            key: 'frontOffice',
            label: 'Front Desk',
            icon: <BedDouble size={14} />,
            items: [
                { id: 'quick-reservation', label: 'Quick Reservation', icon: <Plus size={12} /> },
                { id: 'folio-operations', label: 'Folio Operations', icon: <FileText size={12} /> },
                { id: 'guest-profile', label: 'Guest Profile', icon: <User size={12} /> },
                { id: 'room-rack', label: 'Room Rack', icon: <LayoutGrid size={12} /> },
                { id: 'reservations', label: 'Reservations', icon: <Calendar size={12} /> },
                { id: 'stay-view', label: 'Stay View', icon: <Calendar size={12} /> },
                { id: 'floor-plan', label: 'Floor Plan', icon: <Map size={12} /> },
                { id: 'occupancy-heatmap', label: 'Occupancy Heatmap', icon: <Grid3X3 size={12} /> },
            ]
        },
        {
            key: 'premiumOps',
            label: 'Night Audit & Ops',
            icon: <Sparkles size={14} />,
            items: [
                { id: 'night-audit', label: 'Night Audit Pipeline', icon: <Moon size={12} /> },
                { id: 'service-vouchers', label: 'Digital Vouchers', icon: <Ticket size={12} /> },
                { id: 'allowance-checker', label: 'Allowance Engine', icon: <ShieldCheck size={12} /> },
            ]
        },
        {
            key: 'housekeeping',
            label: 'Housekeeping',
            icon: <ClipboardList size={14} />,
            items: [
                { id: 'housekeeping', label: 'Housekeeping Grid', icon: <ClipboardList size={12} /> },
                { id: 'maintenance', label: 'Maintenance Kanban', icon: <Settings size={12} /> },
            ]
        },
        {
            key: 'posManagement',
            label: 'F&B POS & KDS',
            icon: <UtensilsCrossed size={14} />,
            items: [
                { id: 'pos-dashboard', label: 'POS Dashboard', icon: <LayoutDashboard size={12} /> },
                { id: 'pos', label: 'POS Terminal', icon: <UtensilsCrossed size={12} /> },
                {
                    key: 'menuKey',
                    label: 'Menu Config',
                    icon: <ListOrdered size={12} />,
                    items: [
                        { id: 'categories', label: 'Categories', icon: <Tags size={12} /> },
                        { id: 'products', label: 'Products', icon: <Package size={12} /> },
                        { id: 'addons', label: 'Addons', icon: <Layers size={12} /> },
                        { id: 'units', label: 'Units', icon: <Scale size={12} /> },
                    ]
                },
                {
                    key: 'setupKey',
                    label: 'Restaurant Setup',
                    icon: <Settings size={12} />,
                    items: [
                        { id: 'tables', label: 'Tables', icon: <Grid3X3 size={12} /> },
                        { id: 'floor', label: 'Floor Plan', icon: <Map size={12} /> },
                        { id: 'front-desk', label: 'Front Counter', icon: <Monitor size={12} /> },
                        { id: 'counters', label: 'Counters', icon: <Monitor size={12} /> },
                        { id: 'kitchens', label: 'Kitchen KDS', icon: <ChefHat size={12} /> },
                    ]
                },
                {
                    key: 'staffKey',
                    label: 'Staff & Roles',
                    icon: <Users size={12} />,
                    items: [
                        { id: 'waiters', label: 'Waiters', icon: <User size={12} /> },
                        { id: 'pos-users', label: 'POS Cashiers', icon: <CreditCard size={12} /> },
                        { id: 'admin-users', label: 'Admins', icon: <Shield size={12} /> },
                    ]
                }
            ]
        },
        {
            key: 'rateKey',
            label: 'Rate & Channel Master',
            icon: <Percent size={14} />,
            items: [
                { id: 'rate-plans', label: 'Rate Plans (L3)', icon: <Tags size={12} /> },
                { id: 'package-builder', label: 'Packages (L2)', icon: <Package size={12} /> },
                { id: 'meal-plans', label: 'Meal Plans (L1)', icon: <Utensils size={12} /> },
                { id: 'service-master', label: 'Service Master (L1)', icon: <Sparkles size={12} /> },
                { id: 'rate-calendar', label: 'Rate Calendar', icon: <Calendar size={12} /> },
            ]
        },
        {
            key: 'roomKey',
            label: 'Room Inventory',
            icon: <Layers size={14} />,
            items: [
                { id: 'building-floor', label: 'Floors & Buildings', icon: <Building2 size={12} /> },
                { id: 'manage-room-type', label: 'Room Types', icon: <Tags size={12} /> },
                { id: 'manage-room', label: 'Physical Rooms', icon: <BedDouble size={12} /> },
                { id: 'joint-room', label: 'Connecting Rooms', icon: <Layers size={12} /> },
            ]
        },
        {
            key: 'propertyKey',
            label: 'Properties',
            icon: <Building2 size={14} />,
            items: [
                { id: 'properties', label: 'All Properties', icon: <Building2 size={12} /> },
                { id: 'hotel-info', label: 'Hotel Profile', icon: <Info size={12} /> },
            ]
        },
        {
            key: 'b2b',
            label: 'B2B & Revenue',
            icon: <TrendingUp size={14} />,
            items: [
                { id: 'corporate-profiles', label: 'Corporate Profiles', icon: <Building2 size={12} /> },
                { id: 'business-origins', label: 'Business Origins', icon: <Target size={12} /> },
                { id: 'advanced-reports', label: 'Advanced Analytics', icon: <BarChart3 size={12} /> },
            ]
        },
        {
            key: 'financeKey',
            label: 'Finance & ERP',
            icon: <BadgeDollarSign size={14} />,
            items: [
                { id: 'finance-overview', label: 'General Ledger', icon: <FileText size={12} /> },
            ]
        },
        {
            key: 'reportsKey',
            label: 'Audit Reports',
            icon: <FileText size={14} />,
            items: [
                { id: 'reports', label: 'Report Center', icon: <ListOrdered size={12} />, newTab: true },
            ]
        },
        {
            key: 'admin',
            label: 'Security & Settings',
            icon: <Shield size={14} />,
            items: [
                { id: 'user-management', label: 'Users & Staff', icon: <UserCog size={12} /> },
                { id: 'roles-permissions', label: 'Roles & RBAC', icon: <Shield size={12} /> },
                { id: 'master-data', label: 'Master Data Config', icon: <Database size={12} /> },
                { id: 'policy-management', label: 'Policy Settings', icon: <ShieldCheck size={12} /> },
                { id: 'general-settings', label: 'System Settings', icon: <Settings size={12} /> },
            ]
        }
    ];

    // Filter menu items if search is active
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

                    {/* Render Children with sleek compact tree line */}
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
                            window.open(`?page=${item.id}`, '_blank');
                        } else {
                            setActivePage(item.id);
                        }
                    }
                }}
                className={`
                    flex items-center gap-2 px-2 py-1 text-[11px] font-medium rounded-md cursor-pointer transition-all select-none
                    ${isActive 
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'}
                    ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}
                `}
                title={isCollapsed ? item.label : ""}
            >
                <span className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                    {item.icon}
                </span>
                {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                {item.newTab && !isCollapsed && (
                    <span className="ml-auto text-[8px] uppercase tracking-wider bg-gray-100 text-gray-400 px-1 py-0.2 rounded font-semibold">
                        Tab
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
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
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
                                className="absolute right-1.5 p-0.5 text-gray-400 hover:text-gray-600"
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
                    className={`flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium rounded-md cursor-pointer transition-colors ${activePage === 'dashboard' ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs' : 'text-gray-700 hover:bg-gray-100/70'} ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}`}
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
                    className={`flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium rounded-md cursor-pointer transition-colors ${activePage === 'manager-dashboard' ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs' : 'text-gray-700 hover:bg-gray-100/70'} ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}`}
                    title={isCollapsed ? "Manager Dashboard" : ""}
                >
                    <span className={`flex-shrink-0 ${activePage === 'manager-dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
                        <Briefcase size={14} />
                    </span>
                    {!isCollapsed && <span className="truncate">Manager KPIs</span>}
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
                            Online
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">v4.0</span>
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
