import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    Settings,
    ChevronDown,
    UtensilsCrossed,
    Grid3X3,
    ChefHat,
    Building2,
    BedDouble,
    FileText,
    Briefcase,
    Utensils,
    Calendar,
    LayoutGrid,
    Plus,
    Sparkles,
    ClipboardList,
    TrendingUp,
    Database,
    Moon,
    Ticket,
    Search,
    X,
    Landmark,
    Wallet,
    Clock,
    Wrench,
    Printer,
    CalendarDays,
    Percent,
    Shield,
    Layers,
    Coffee,
    Scale,
    Monitor,
    DoorClosed,
    FolderKanban,
    MapPin,
    BarChart3,
    PanelLeftClose,
    PanelLeft
} from 'lucide-react';
import { useProperty } from '../context/PropertyContext';
import { usePortal } from '../context/PortalContext';

export interface SubMenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    badgeColor?: string;
}

export interface MenuItem {
    id?: string;
    label: string;
    icon: React.ReactNode;
    badge?: string;
    badgeColor?: string;
    children?: SubMenuItem[];
}

export interface MenuSection {
    title?: string;
    items: MenuItem[];
}

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    activePage,
    setActivePage,
    isCollapsed,
    toggleSidebar
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { activeProperty } = useProperty();
    const { currentUser } = usePortal();

    // Accordion state - persisted in localStorage
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem('hotel_sidebar_dropdowns');
            if (saved) return JSON.parse(saved);
        } catch {
            // fallback
        }
        return {
            'Menu Management': false,
            'Kitchen & Stations': false,
            'Settings': true,
        };
    });

    const toggleDropdown = (label: string) => {
        setOpenDropdowns(prev => {
            const updated = { ...prev, [label]: !prev[label] };
            try {
                localStorage.setItem('hotel_sidebar_dropdowns', JSON.stringify(updated));
            } catch {
                // ignore
            }
            return updated;
        });
    };

    // Auto-expand accordion when activePage is a child item
    useEffect(() => {
        if (['categories', 'products', 'addons', 'units'].includes(activePage)) {
            setOpenDropdowns(prev => ({ ...prev, 'Menu Management': true }));
        }
        if (['kitchens', 'counters', 'floor'].includes(activePage)) {
            setOpenDropdowns(prev => ({ ...prev, 'Kitchen & Stations': true }));
        }
        if ([
            'taxes-vat', 'tax-vat-settings', 'multi-property', 'properties', 'property-create',
            'printer-settings', 'policy-management', 'holiday-management',
            'general-settings'
        ].includes(activePage)) {
            setOpenDropdowns(prev => ({ ...prev, 'Settings': true }));
        }
    }, [activePage]);

    // Standard International Hotel PMS Navigation Sections (Clean, Intuitive Industry Terms)
    const sections: MenuSection[] = useMemo(() => [
        {
            items: [
                { id: 'front-desk', label: 'Front Desk', icon: <Briefcase size={14} /> },
                { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={14} /> },
            ]
        },
        {
            title: 'HOTEL OPERATIONS',
            items: [
                { id: 'stay-view', label: 'Stay View', icon: <CalendarDays size={14} />, badge: 'Live', badgeColor: 'bg-blue-100 text-blue-700' },
                { id: 'add-reservation', label: 'New Reservation', icon: <Plus size={14} />, badge: '+ New', badgeColor: 'bg-emerald-100 text-emerald-700' },
                { id: 'reservations', label: 'Reservations', icon: <ClipboardList size={14} /> },
                { id: 'room-rack', label: 'Room Rack', icon: <LayoutGrid size={14} /> },
                { id: 'folio-operations', label: 'Billing & Folios', icon: <Wallet size={14} />, badge: 'Billing', badgeColor: 'bg-blue-100 text-blue-700' },
                { id: 'floor-plan', label: 'Floor Plan', icon: <Layers size={14} /> },
                { id: 'occupancy-heatmap', label: 'Occupancy Matrix', icon: <Grid3X3 size={14} /> },
                { id: 'night-audit', label: 'Night Audit', icon: <Moon size={14} /> },
            ]
        },
        {
            title: 'RESTAURANT & F&B',
            items: [
                { id: 'pos', label: 'Restaurant POS', icon: <Utensils size={14} />, badge: 'POS', badgeColor: 'bg-blue-100 text-blue-700' },
                { id: 'kds', label: 'Kitchen Display (KDS)', icon: <ChefHat size={14} />, badge: 'Live', badgeColor: 'bg-amber-100 text-amber-700' },
                { id: 'table-layout', label: 'Table Layout', icon: <Grid3X3 size={14} /> },
                { id: 'waiters', label: 'Waiters & Staff', icon: <Users size={14} /> },
                {
                    label: 'Menu Management',
                    icon: <UtensilsCrossed size={14} />,
                    children: [
                        { id: 'categories', label: 'Categories', icon: <Layers size={12} /> },
                        { id: 'products', label: 'Menu Items', icon: <Coffee size={12} /> },
                        { id: 'addons', label: 'Addons & Modifiers', icon: <Plus size={12} /> },
                        { id: 'units', label: 'Measurement Units', icon: <Scale size={12} /> },
                    ]
                },
                {
                    label: 'Kitchen & Stations',
                    icon: <Monitor size={14} />,
                    children: [
                        { id: 'kitchens', label: 'Kitchen Stations', icon: <ChefHat size={12} /> },
                        { id: 'counters', label: 'Billing Counters', icon: <Printer size={12} /> },
                        { id: 'floor', label: 'Dining Areas', icon: <DoorClosed size={12} /> },
                    ]
                }
            ]
        },
        {
            title: 'ROOMS & RATES',
            items: [
                { id: 'manage-room-type', label: 'Room Types', icon: <BedDouble size={14} /> },
                { id: 'manage-room', label: 'All Rooms', icon: <Building2 size={14} /> },
                { id: 'joint-room', label: 'Connecting Rooms', icon: <FolderKanban size={14} /> },
                { id: 'rate-plans', label: 'Rate Plans', icon: <Percent size={14} /> },
                { id: 'package-builder', label: 'Packages & Offers', icon: <Ticket size={14} /> },
                { id: 'meal-plans', label: 'Meal Plans', icon: <Coffee size={14} /> },
                { id: 'rate-calendar', label: 'Rate Calendar', icon: <Calendar size={14} /> },
                { id: 'building-management', label: 'Floors & Wings', icon: <Building2 size={14} /> },
            ]
        },
        {
            title: 'HOUSEKEEPING',
            items: [
                { id: 'housekeeping', label: 'Housekeeping', icon: <Sparkles size={14} /> },
                { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={14} /> },
                { id: 'service-master', label: 'Laundry & Services', icon: <FileText size={14} /> },
            ]
        },
        {
            title: 'GUESTS',
            items: [
                { id: 'guest-profile', label: 'Guest Directory', icon: <Users size={14} /> },
                { id: 'service-vouchers', label: 'Gift Vouchers', icon: <Ticket size={14} /> },
                { id: 'allowance-checker', label: 'Guest Credits', icon: <Wallet size={14} /> },
            ]
        },
        {
            title: 'FINANCE & ACCOUNTING',
            items: [
                { id: 'advance-accounting', label: 'General Ledger', icon: <Landmark size={14} />, badge: 'USALI', badgeColor: 'bg-indigo-100 text-indigo-700' },
                { id: 'master-data', label: 'Chart of Accounts', icon: <Database size={14} /> },
                { id: 'revenue-dashboard', label: 'Revenue Analytics', icon: <TrendingUp size={14} /> },
                { id: 'revenue-heads', label: 'Revenue Accounts', icon: <Percent size={14} /> },
                { id: 'banking', label: 'Bank Accounts', icon: <Landmark size={14} /> },
                { id: 'corporate-profiles', label: 'Corporate Accounts', icon: <Building2 size={14} /> },
                { id: 'finance-overview', label: 'Financial Reports', icon: <BarChart3 size={14} /> },
            ]
        },
        {
            title: 'STAFF & HRM',
            items: [
                { id: 'hrm-dashboard', label: 'Staff Overview', icon: <Users size={14} /> },
                { id: 'user-management', label: 'Employees', icon: <Users size={14} /> },
                { id: 'departments', label: 'Departments', icon: <FolderKanban size={14} /> },
                { id: 'shifts', label: 'Work Shifts', icon: <Clock size={14} /> },
                { id: 'roles-permissions', label: 'Roles & Permissions', icon: <Shield size={14} /> },
            ]
        },
        {
            title: 'REPORTS',
            items: [
                { id: 'business-origins', label: 'Booking Sources', icon: <MapPin size={14} /> },
                { id: 'reports', label: 'Reports Center', icon: <FileText size={14} />, badge: '50+', badgeColor: 'bg-blue-100 text-blue-700' },
                { id: 'advanced-reports', label: 'Analytics', icon: <BarChart3 size={14} /> },
            ]
        },
        {
            title: 'SETTINGS',
            items: [
                {
                    label: 'Settings',
                    icon: <Settings size={14} />,
                    children: [
                        { id: 'taxes-vat', label: 'Taxes & VAT', icon: <Percent size={12} /> },
                        { id: 'multi-property', label: 'Chain Console', icon: <Building2 size={12} />, badge: 'HQ', badgeColor: 'bg-indigo-100 text-indigo-700' },
                        { id: 'properties', label: 'Properties', icon: <Building2 size={12} /> },
                        { id: 'property-create', label: 'Add Property', icon: <Plus size={12} />, badge: '+ New', badgeColor: 'bg-emerald-100 text-emerald-700' },
                        { id: 'printer-settings', label: 'Printers & Hardware', icon: <Printer size={12} /> },
                        { id: 'policy-management', label: 'Policies & Rules', icon: <FileText size={12} /> },
                        { id: 'holiday-management', label: 'Holiday Calendar', icon: <Calendar size={12} /> },
                        { id: 'general-settings', label: 'General Settings', icon: <Settings size={12} /> },
                    ]
                }
            ]
        }
    ], []);

    // Filter sections dynamically if user types in search bar
    const filteredSections = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return sections;

        return sections
            .map(sec => ({
                ...sec,
                items: sec.items.filter(item => {
                    const matchItem = item.label.toLowerCase().includes(query);
                    const matchChild = item.children?.some(c => c.label.toLowerCase().includes(query));
                    return matchItem || matchChild;
                })
            }))
            .filter(sec => sec.items.length > 0);
    }, [sections, searchQuery]);

    const userInitial = currentUser?.name ? currentUser.name.trim()[0].toUpperCase() : 'A';
    const userRoleDisplay = currentUser?.role ? currentUser.role.replace('_', ' ').toUpperCase() : 'ADMIN';

    // ========================================================================
    // RENDER: COLLAPSED ICON-ONLY SIDEBAR
    // ========================================================================
    if (isCollapsed) {
        return (
            <aside className="sticky top-0 hidden h-screen w-16 flex-col border-r border-slate-200 bg-white text-slate-800 md:flex select-none z-30 shrink-0 shadow-2xs">
                {/* Brand Logo & Expand Toggle */}
                <div className="h-14 border-b border-slate-100 flex items-center justify-center shrink-0">
                    <button
                        type="button"
                        onClick={toggleSidebar}
                        className="size-9 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition flex items-center justify-center cursor-pointer"
                        title="Expand sidebar"
                    >
                        <PanelLeft size={16} />
                    </button>
                </div>

                {/* Collapsed Nav Icons */}
                <div className="flex-1 overflow-y-auto py-2.5 px-2 space-y-1.5 scrollbar-none">
                    {sections.flatMap(s => s.items).map((item, idx) => {
                        const targetId = item.id || (item.children && item.children[0]?.id) || 'dashboard';
                        const isActive = activePage === item.id || (item.children && item.children.some(c => c.id === activePage));

                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setActivePage(targetId)}
                                className={`w-full py-2.5 rounded-xl flex flex-col items-center justify-center transition cursor-pointer relative group ${
                                    isActive
                                        ? 'bg-blue-50 text-blue-600 font-bold shadow-2xs'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                                title={item.label}
                            >
                                <span className={isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-900'}>
                                    {item.icon}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Footer User Avatar */}
                <div className="p-2 border-t border-slate-100 flex flex-col items-center justify-center shrink-0">
                    <div className="size-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                        {userInitial}
                    </div>
                </div>
            </aside>
        );
    }

    // ========================================================================
    // RENDER: EXPANDED FULL STANDARD SIDEBAR
    // ========================================================================
    return (
        <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-slate-200/90 bg-white text-slate-800 md:flex select-none z-30 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            {/* Top Brand Header */}
            <div className="h-14 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <button
                    type="button"
                    onClick={() => setActivePage('front-desk')}
                    className="flex items-center gap-2.5 text-left transition hover:opacity-90 cursor-pointer min-w-0"
                >
                    <div className="size-8 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs font-bold text-xs shrink-0">
                        <Building2 size={16} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xs font-bold text-slate-900 tracking-tight leading-tight truncate">
                            HotelManagementOS
                        </h1>
                        <p className="text-[9.5px] font-semibold text-blue-600 uppercase tracking-wider leading-tight truncate">
                            Enterprise PMS & RMS
                        </p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={toggleSidebar}
                    className="size-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title="Collapse sidebar"
                >
                    <PanelLeftClose size={15} />
                </button>
            </div>

            {/* Quick Search Input */}
            <div className="px-3 pt-3 pb-1.5 shrink-0">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search menu (e.g. POS, Folios, Rates)..."
                        className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation List */}
            <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-3 scrollbar-thin">
                {filteredSections.map((sec, sIdx) => (
                    <div key={sIdx} className="space-y-0.5">
                        {sec.title && (
                            <div className="px-2.5 pt-2 pb-1 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                                {sec.title}
                            </div>
                        )}

                        {sec.items.map((item, iIdx) => {
                            // Submenu / Accordion parent
                            if (item.children) {
                                const isOpen = searchQuery ? true : openDropdowns[item.label];
                                const hasActiveChild = item.children.some(c => c.id === activePage);

                                return (
                                    <div key={iIdx} className="space-y-0.5">
                                        <button
                                            type="button"
                                            onClick={() => toggleDropdown(item.label)}
                                            className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer group ${
                                                hasActiveChild
                                                    ? 'text-blue-600 font-bold bg-blue-50/50'
                                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className={hasActiveChild ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'}>
                                                    {item.icon}
                                                </span>
                                                <span className="truncate">{item.label}</span>
                                            </div>
                                            <ChevronDown
                                                size={12}
                                                className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                                            />
                                        </button>

                                        {isOpen && (
                                            <div className="relative ml-4 pl-3.5 border-l border-slate-200/80 space-y-0.5 pt-0.5 pb-1">
                                                {item.children.map((sub, subIdx) => {
                                                    const isSubActive = activePage === sub.id;
                                                    return (
                                                        <button
                                                            key={subIdx}
                                                            type="button"
                                                            onClick={() => setActivePage(sub.id)}
                                                            className={`relative group flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition cursor-pointer ${
                                                                isSubActive
                                                                    ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                                                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                {isSubActive && (
                                                                    <span className="absolute -left-[15px] top-1.5 bottom-1.5 w-[3px] rounded-full bg-blue-600" />
                                                                )}
                                                                <span className={isSubActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}>
                                                                    {sub.icon}
                                                                </span>
                                                                <span className="truncate text-[11.5px]">{sub.label}</span>
                                                            </div>
                                                            {sub.badge && (
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${sub.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                                                                    {sub.badge}
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Single Direct Item
                            const isActive = activePage === item.id;
                            return (
                                <button
                                    key={iIdx}
                                    type="button"
                                    onClick={() => item.id && setActivePage(item.id)}
                                    className={`relative flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer group ${
                                        isActive
                                            ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                                            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'}>
                                            {item.icon}
                                        </span>
                                        <span className="truncate">{item.label}</span>
                                    </div>
                                    {item.badge && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${item.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Sidebar Bottom Footer: User Profile & Quick Hotel Context */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="size-8 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                            {userInitial}
                        </div>
                        <div className="min-w-0 text-left">
                            <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                                {currentUser?.name || 'Alexander Vance'}
                            </p>
                            <p className="text-[10px] text-blue-600 font-semibold truncate leading-tight">
                                {userRoleDisplay} • {activeProperty?.code || 'GPD'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setActivePage('multi-property')}
                        className="size-7 rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 transition flex items-center justify-center shrink-0 border border-transparent hover:border-slate-200 cursor-pointer"
                        title="Chain Portfolio Console"
                    >
                        <Building2 size={13} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
