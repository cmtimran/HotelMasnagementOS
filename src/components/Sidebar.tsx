import { useState } from 'react';
import {
    Users,
    Settings,
    ListOrdered,
    ChevronDown,
    ChevronUp,
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
    Circle,
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
    ShieldCheck
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
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        posManagement: false,
        frontOffice: false,
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
            key: 'posManagement',
            label: 'POS Management',
            icon: <UtensilsCrossed size={20} />,
            items: [
                { id: 'pos-dashboard', label: 'POS Dashboard', icon: <LayoutDashboard size={16} /> },
                { id: 'pos', label: 'POS / Billing', icon: <UtensilsCrossed size={16} /> },
                {
                    key: 'menuKey',
                    label: 'Menu Management',
                    icon: <ListOrdered size={16} />,
                    items: [
                        { id: 'categories', label: 'Categories', icon: <Tags size={16} /> },
                        { id: 'products', label: 'Products', icon: <Package size={16} /> },
                        { id: 'addons', label: 'Addons', icon: <Layers size={16} /> },
                        { id: 'units', label: 'Units', icon: <Scale size={16} /> },
                    ]
                },
                {
                    key: 'setupKey',
                    label: 'Restaurant Setup',
                    icon: <Settings size={16} />,
                    items: [
                        { id: 'tables', label: 'Tables', icon: <Grid3X3 size={16} /> },
                        { id: 'floor', label: 'Floor Plan', icon: <Map size={16} /> },
                        { id: 'front-desk', label: 'Front Desk', icon: <Monitor size={16} /> },
                        { id: 'counters', label: 'Counters', icon: <Monitor size={16} /> },
                        { id: 'kitchens', label: 'Kitchens', icon: <ChefHat size={16} /> },
                    ]
                },
                {
                    key: 'staffKey',
                    label: 'Staff & Users',
                    icon: <Users size={16} />,
                    items: [
                        { id: 'waiters', label: 'Waiters', icon: <User size={16} /> },
                        { id: 'pos-users', label: 'POS Users', icon: <CreditCard size={16} /> },
                        { id: 'admin-users', label: 'Admin Users', icon: <Shield size={16} /> },
                    ]
                }
            ]
        },
        {
            key: 'frontOffice',
            label: 'Front Office',
            icon: <BedDouble size={20} />,
            items: [
                { id: 'quick-reservation', label: 'Quick Reservation', icon: <Plus size={16} /> },
                { id: 'folio-operations', label: 'Folio Operations', icon: <FileText size={16} /> },
                { id: 'guest-profile', label: 'Guest Profile', icon: <User size={16} /> },
                { id: 'room-rack', label: 'Room Rack', icon: <LayoutGrid size={16} /> },
                { id: 'reservations', label: 'Reservations', icon: <Calendar size={16} /> },
                { id: 'stay-view', label: 'Stay View', icon: <Calendar size={16} /> },
                { id: 'floor-plan', label: 'Floor Plan', icon: <Map size={16} /> },
                { id: 'occupancy-heatmap', label: 'Occupancy Heatmap', icon: <Grid3X3 size={16} /> },
            ]
        },
        {
            key: 'premiumOps',
            label: 'Premium Operations',
            icon: <Sparkles size={20} />,
            items: [
                { id: 'night-audit', label: 'Night Audit (Auto Posting)', icon: <Moon size={16} /> },
                { id: 'service-vouchers', label: 'Digital Vouchers', icon: <Ticket size={16} /> },
                { id: 'allowance-checker', label: 'Allowance Engine', icon: <ShieldCheck size={16} /> },
            ]
        },
        {
            key: 'housekeeping',
            label: 'Housekeeping & Maintenance',
            icon: <Sparkles size={20} />,
            items: [
                { id: 'housekeeping', label: 'Housekeeping Grid', icon: <ClipboardList size={16} /> },
                { id: 'maintenance', label: 'Maintenance', icon: <Settings size={16} /> },
            ]
        },
        {
            key: 'propertyKey',
            label: 'Property Management',
            icon: <Building2 size={20} />,
            items: [
                { id: 'properties', label: 'Properties', icon: <Building2 size={16} /> },
                { id: 'hotel-info', label: 'Hotel Info', icon: <Info size={16} /> },
            ]
        },
        {
            key: 'roomKey',
            label: 'Room Management',
            icon: <BedDouble size={20} />,
            items: [
                { id: 'building-floor', label: 'Floors & Buildings', icon: <Building2 size={16} /> },
                { id: 'manage-room-type', label: 'Room Types', icon: <Tags size={16} /> },
                { id: 'manage-room', label: 'Rooms', icon: <BedDouble size={16} /> },
                { id: 'joint-room', label: 'Connecting Rooms', icon: <Layers size={16} /> },
            ]
        },
        {
            key: 'rateKey',
            label: 'Rate Management',
            icon: <Percent size={20} />,
            items: [
                { id: 'rate-plans', label: 'Rate Plans (Layer 3)', icon: <Tags size={16} /> },
                { id: 'package-builder', label: 'Package Builder (Layer 2)', icon: <Package size={16} /> },
                { id: 'meal-plans', label: 'Meal Plans (Layer 1)', icon: <Utensils size={16} /> },
                { id: 'service-master', label: 'Service Master (Layer 1)', icon: <Sparkles size={16} /> },
                { id: 'rate-calendar', label: 'Rate Calendar', icon: <Plus size={16} /> },
            ]
        },
        {
            key: 'userKey',
            label: 'User Management',
            icon: <UserCog size={20} />,
            items: [
                { id: 'user-management', label: 'Users', icon: <Users size={16} /> },
            ]
        },
        {
            key: 'settingsKey',
            label: 'Settings',
            icon: <Settings size={20} />,
            items: [
                { id: 'general-settings', label: 'General Settings', icon: <Settings size={16} /> },
            ]
        },
        {
            key: 'financeKey',
            label: 'Finance',
            icon: <BadgeDollarSign size={20} />,
            items: [
                { id: 'finance-overview', label: 'Overview', icon: <FileText size={16} /> },
            ]
        },
        {
            key: 'reportsKey',
            label: 'Reports',
            icon: <FileText size={20} />,
            items: [
                { id: 'reports', label: 'All Reports', icon: <ListOrdered size={16} />, newTab: true },
            ]
        },
        {
            key: 'b2b',
            label: 'B2B & Revenue',
            icon: <TrendingUp size={20} />,
            items: [
                { id: 'corporate-profiles', label: 'Corporate Profiles', icon: <Building2 size={16} /> },
                { id: 'business-origins', label: 'Business Origins', icon: <Target size={16} /> },
                { id: 'advanced-reports', label: 'Advanced Reports', icon: <BarChart3 size={16} /> },
            ]
        },
        {
            key: 'admin',
            label: 'Admin & Security',
            icon: <Shield size={20} />,
            items: [
                { id: 'users', label: 'Users', icon: <Users size={16} /> },
                { id: 'roles-permissions', label: 'Roles & Permissions', icon: <Shield size={16} /> },
                { id: 'master-data', label: 'Master Data Config', icon: <Database size={16} /> },
                { id: 'policy-management', label: 'Global Policy Settings', icon: <ShieldCheck size={16} /> },
            ]
        }
    ];

    const renderMenuItem = (item: MenuItem, depth: number = 0) => {
        const isOpen = item.key ? openMenus[item.key] : false;
        const hasChildren = item.items && item.items.length > 0;
        const isActive = item.id ? activePage === item.id : false;

        // Indentation logic
        const paddingLeft = depth * 12 + 12; // 12px per level + base 12px

        if (hasChildren) {
            return (
                <div key={item.key || item.label} className="mt-1">
                    <div
                        onClick={() => !isCollapsed && item.key && toggleMenu(item.key)}
                        className={`flex items-center justify-between px-3 py-2 text-gray-700 text-sm font-medium hover:bg-gray-50 rounded-lg transition-colors cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? item.label : ""}
                        style={!isCollapsed ? { paddingLeft: `${paddingLeft}px` } : {}}
                    >
                        <div className="flex items-center gap-3">
                            <div className="text-gray-500 flex-shrink-0">{item.icon || <Circle size={6} />}</div>
                            {!isCollapsed && <span>{item.label}</span>}
                        </div>
                        {(!isCollapsed) && (
                            isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                        )}
                    </div>

                    {/* Render Children */}
                    {
                        (isOpen || (isCollapsed && depth === 0)) && (
                            <div className={`${isCollapsed ? 'mt-1' : 'mt-1 space-y-1'}`}>
                                {!isCollapsed && item.items?.map(child => renderMenuItem(child, depth + 1))}
                            </div>
                        )
                    }
                </div >
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
                    flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-all
                    ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
                    ${isCollapsed ? 'justify-center px-0' : ''}
                `}
                title={isCollapsed ? item.label : ""}
                style={!isCollapsed ? { paddingLeft: `${paddingLeft}px` } : {}}
            >
                <div className="flex-shrink-0">{item.icon || <Circle size={6} />}</div>
                {!isCollapsed && <span>{item.label}</span>}
                {item.newTab && !isCollapsed && <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">New Tab</span>}
            </div>
        );
    };

    return (
        <aside
            className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 z-50`}
        >
            {/* Header / Logo Area */}
            <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <div className="cursor-pointer flex items-center gap-2" onClick={() => setActivePage('dashboard')}>
                        <img src="/logo.jpg" alt="Logo" className="h-10 w-auto object-contain" />
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold text-gray-800 tracking-tight leading-none">PMS</h1>
                            <p className="text-[9px] text-gray-500 font-medium leading-none mt-0.5">System</p>
                        </div>
                    </div>
                )}

                <button
                    onClick={toggleSidebar}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                >
                    {isCollapsed ? <Menu size={24} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 px-3 space-y-2 pb-4 overflow-y-auto overflow-x-hidden scrollbar-thin">

                {/* Global Dashboard Link */}
                <div
                    onClick={() => setActivePage('dashboard')}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${activePage === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'} ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? "Dashboard" : ""}
                >
                    <div className="flex-shrink-0"><LayoutDashboard size={20} /></div>
                    {!isCollapsed && <span>HMS Overview</span>}
                </div>

                {/* Manager Dashboard Link */}
                <div
                    onClick={() => setActivePage('manager-dashboard')}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${activePage === 'manager-dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'} ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? "Manager Dashboard" : ""}
                >
                    <div className="flex-shrink-0"><Briefcase size={20} /></div>
                    {!isCollapsed && <span>Manager Dashboard</span>}
                </div>

                <div className="border-t border-gray-100 my-2"></div>

                {menuGroups.map((group) => renderMenuItem(group, 0))}

            </nav>
        </aside>
    );
};

export default Sidebar;
