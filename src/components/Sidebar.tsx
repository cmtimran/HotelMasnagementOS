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
    Shield,
    LayoutDashboard,
    Building2,
    BedDouble,
    Percent,
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
    CheckCircle,
    DollarSign,
    PackageSearch,
    Wine,
    UserCheck,
    Tag
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
        dashboardKey: false,
        posManagement: false,
        frontOffice: false,
        housekeeping: false,
        b2b: false,
        admin: false,
        menuKey: false,
        setupKey: false,
        staffKey: false,
        propertyKey: false,
        roomKey: false,
        rateKey: false,
        financeKey: false,
        reportsKey: false,
    });

    const toggleMenu = (key: string) => {
        setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const menuGroups: MenuItem[] = [
        // Dashboard - Top Level
        {
            key: 'dashboardKey',
            label: 'Dashboard',
            icon: <LayoutDashboard size={20} />,
            items: [
                { id: 'dashboard', label: 'HMS Overview', icon: <LayoutDashboard size={16} /> },
                { id: 'manager-dashboard', label: 'Manager Dashboard', icon: <BarChart3 size={16} /> },
            ]
        },
        {
            key: 'posManagement',
            label: 'POS Management',
            icon: <UtensilsCrossed size={20} />,
            items: [
                { id: 'pos-dashboard', label: 'POS Dashboard', icon: <LayoutDashboard size={16} /> },
                { id: 'pos', label: 'POS / Billing', icon: <UtensilsCrossed size={16} /> },
                { id: 'kds', label: 'Kitchen Display', icon: <Monitor size={16} /> },
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
                { id: 'enhanced-checkin', label: 'Enhanced Check-In', icon: <UserCheck size={16} /> },
                { id: 'group-booking', label: 'Group Booking', icon: <Users size={16} /> },
                { id: 'folio-operations', label: 'Folio Operations', icon: <FileText size={16} /> },
                { id: 'guest-profile', label: 'Guest Profile', icon: <User size={16} /> },
                { id: 'room-rack', label: 'Room Rack', icon: <LayoutGrid size={16} /> },
                { id: 'reservations', label: 'Reservations', icon: <Calendar size={16} /> },
                { id: 'stay-view', label: 'Stay View', icon: <Calendar size={16} /> },
                { id: 'floor-plan', label: 'Floor Plan', icon: <Map size={16} /> },
                { id: 'minibar-posting', label: 'Minibar Posting', icon: <Wine size={16} /> },
            ]
        },
        {
            key: 'housekeeping',
            label: 'Housekeeping & Maintenance',
            icon: <Sparkles size={20} />,
            items: [
                { id: 'housekeeping', label: 'Housekeeping Grid', icon: <ClipboardList size={16} /> },
                { id: 'maintenance', label: 'Maintenance', icon: <Settings size={16} /> },
                { id: 'lost-and-found', label: 'Lost & Found', icon: <PackageSearch size={16} /> },
            ]
        },
        {
            key: 'propertyKey',
            label: 'Property Management',
            icon: <Building2 size={20} />,
            items: [
                { id: 'properties', label: 'Properties', icon: <Building2 size={16} /> },
                { id: 'hotel-info', label: 'Hotel Info', icon: <Info size={16} /> },
                { id: 'property-setup', label: 'Property Setup', icon: <Settings size={16} /> },
                { id: 'buildings-floors', label: 'Buildings & Floors', icon: <Building2 size={16} /> },
                { id: 'auto-floor', label: 'Auto-Floor Generation', icon: <Layers size={16} /> },
            ]
        },
        {
            key: 'roomKey',
            label: 'Room Management',
            icon: <BedDouble size={20} />,
            items: [
                { id: 'room-types', label: 'Room Types', icon: <BedDouble size={16} /> },
                { id: 'physical-rooms', label: 'Physical Rooms', icon: <LayoutGrid size={16} /> },
                { id: 'joint-room', label: 'Connecting Rooms', icon: <Layers size={16} /> },
            ]
        },
        {
            key: 'rateManagementKey',
            label: 'Rate Management',
            icon: <Percent size={20} />,
            items: [
                { id: 'rate-plans', label: 'Rate Plans', icon: <Tags size={16} /> },
                { id: 'meal-plans', label: 'Meal Plans', icon: <Utensils size={16} /> },
                { id: 'rate-calendar', label: 'Rate Calendar', icon: <Calendar size={16} /> },
                { id: 'occupancy-heatmap', label: 'Occupancy Heatmap', icon: <Target size={16} /> },
                { id: 'seasonality', label: 'Seasonality', icon: <TrendingUp size={16} /> },
                { id: 'weekend-config', label: 'Weekend Config', icon: <Calendar size={16} /> },
                { id: 'tiered-cancellation', label: 'Cancellation Rules', icon: <Percent size={16} /> },
            ]
        },


        {
            key: 'financeKey',
            label: 'Finance',
            icon: <BadgeDollarSign size={20} />,
            items: [
                { id: 'night-audit', label: 'Night Audit', icon: <Moon size={16} /> },
                { id: 'city-ledger', label: 'City Ledger (AR)', icon: <DollarSign size={16} /> },
                { id: 'revenue-dashboard', label: 'Revenue Dashboard', icon: <TrendingUp size={16} /> },
                { id: 'approval-center', label: 'Approval Center', icon: <CheckCircle size={16} /> },
                { id: 'multiple-folio', label: 'Multiple Folio', icon: <FileText size={16} /> },
            ]
        },
        {
            key: 'reportsKey',
            label: 'Reports',
            icon: <FileText size={20} />,
            items: [
                { id: 'advanced-reports', label: 'Advanced Reports', icon: <BarChart3 size={16} /> },
                { id: 'police-report', label: 'Police Report (C-Form)', icon: <Shield size={16} /> },
                { id: 'occupancy-forecast', label: 'Occupancy Forecast', icon: <TrendingUp size={16} /> },
                { id: 'staff-meal', label: 'Staff Meal Tracking', icon: <Utensils size={16} /> },
            ]
        },
        {
            key: 'b2b',
            label: 'B2B & Revenue',
            icon: <TrendingUp size={20} />,
            items: [
                { id: 'corporate-profiles', label: 'Corporate Profiles', icon: <Building2 size={16} /> },
                { id: 'business-origins', label: 'Business Origins', icon: <Target size={16} /> },
            ]
        },
        {
            key: 'adminKey',
            label: 'Admin & Security',
            icon: <Shield size={20} />,
            items: [
                { id: 'users', label: 'Users', icon: <Users size={16} /> },
                { id: 'roles-permissions', label: 'Roles & Permissions', icon: <Shield size={16} /> },
                { id: 'audit-logs', label: 'Audit Logs', icon: <FileText size={16} /> },
                { id: 'market-codes', label: 'Market Codes', icon: <Tag size={16} /> },
                { id: 'guest-360', label: 'Guest 360 View', icon: <User size={16} /> },
                { id: 'blacklist', label: 'Blacklist Management', icon: <Shield size={16} /> },
                { id: 'master-data', label: 'Master Data Config', icon: <Database size={16} /> },
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
                                {/* If collapsed, we don't strictly show children unless we want a popover. 
                                For now, I'll follow the previous pattern: if collapsed, maybe don't show children inline 
                                or show them if they are top-level. 
                                The previous implementation showed children with indentation if manually expanded, 
                                BUT if collapsed, it showed them in a weird way?
                                user request: "add all restaurant related menu under the POS Section"
                                If collapsed, recursive menus are tricky. 
                                For simplicity: hide deep children if collapsed, or just show top level icons.
                                Let's assume standard behavior: if collapsed, only icons shown.
                                If the user clicks a group in collapsed mode, we might need to expand sidebar.
                                For now, I will render children.
                             */}
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
