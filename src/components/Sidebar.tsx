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
    ExternalLink,
    HelpCircle,
    XCircle,
    Printer,
    CalendarDays
} from 'lucide-react';
import { getRouteByPageId } from '../navigation/routesRegistry';
import { useProperty } from '../context/PropertyContext';
import { usePortal } from '../context/PortalContext';

export interface MenuItem {
    id?: string;
    key?: string;
    label: string;
    icon?: React.ReactNode;
    items?: MenuItem[];
    newTab?: boolean;
    badge?: string;
    badgeColor?: string;
    sectionHeader?: string;
}

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

export const Sidebar = ({ activePage, setActivePage, isCollapsed, toggleSidebar }: SidebarProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { activeProperty } = useProperty();
    const { portalMode, switchToSuperAdmin, switchToPropertyPMS, isSuperAdmin } = usePortal();

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        // Super Admin defaults
        chainPortfolio: true,
        corpFinance: true,
        corpTax: false,
        corpHrm: false,
        corpSystem: false,
        corpAudit: false,

        // Property PMS defaults
        frontOffice: true,
        housekeeping: false,
        maintenanceMod: false,
        posManagement: false,
        menuKey: false,
        setupKey: false,
        inventoryMod: false,
        localHrm: false,
        reportsMod: false,
        propertySettings: false,
    });

    const toggleMenu = (key: string) => {
        setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        const inventoryPages = [
            'rate-plans', 'package-builder', 'meal-plans', 'rate-calendar',
            'manage-room-type', 'manage-room', 'joint-room',
            'building-management', 'floor-management', 'amenities-safety', 'amenities', 'safety',
            'building-floor', 'buildings', 'floors', 'buildings-floors'
        ];
        if (inventoryPages.includes(activePage)) {
            setOpenMenus(prev => ({ ...prev, inventoryMod: true }));
        }
    }, [activePage]);

    // ========================================================================
    // PANEL 1: SUPER ADMIN MASTER CONSOLE (HQ / MULTI-PROPERTY / GOVERNANCE)
    // ========================================================================
    const superAdminMenuGroups: MenuItem[] = [
        // MODULE: MULTI-HOTEL CHAIN & PROPERTIES
        {
            key: 'chainPortfolio',
            label: 'Chain & Portfolio',
            icon: <Building2 size={14} />,
            sectionHeader: 'Corporate & Portfolio',
            items: [
                { id: 'multi-property', label: 'Multi-Hotel Chain Console', icon: <Building2 size={12} />, badge: 'All Hotels', badgeColor: 'bg-indigo-100 text-indigo-700' },
                { id: 'properties', label: 'All Hotel Properties', icon: <Building2 size={12} /> },
                { id: 'hotel-info', label: 'Property Profile & Info', icon: <Info size={12} /> },
                { id: 'property-create', label: 'Register New Property', icon: <Plus size={12} />, badge: '+ Add', badgeColor: 'bg-emerald-100 text-emerald-700' },
                { id: 'manager-dashboard', label: 'Corporate Executive KPIs', icon: <Briefcase size={12} /> },
                { id: 'occupancy-heatmap', label: 'Consolidated Heatmap', icon: <Grid3X3 size={12} /> },
            ]
        },

        // MODULE: CORPORATE FINANCE & USALI ERP
        {
            key: 'corpFinance',
            label: 'Finance & USALI ERP',
            icon: <Landmark size={14} />,
            sectionHeader: 'Finance & Accounts',
            items: [
                { id: 'advance-accounting', label: 'USALI General Ledger & Journals', icon: <Landmark size={12} />, badge: 'GL/JV', badgeColor: 'bg-emerald-100 text-emerald-700' },
                { id: 'master-data', label: 'USALI Chart of Accounts', icon: <Database size={12} />, badge: 'USALI', badgeColor: 'bg-emerald-100 text-emerald-700' },
                { id: 'revenue-dashboard', label: 'Financial Revenue KPIs', icon: <TrendingUp size={12} />, badge: 'RevPAR', badgeColor: 'bg-blue-100 text-blue-700' },
                { id: 'revenue-heads', label: 'Revenue Heads & Groups', icon: <TrendingUp size={12} /> },
                { id: 'banking', label: 'Bank Accounts & MFS', icon: <Wallet size={12} />, badge: 'MFS', badgeColor: 'bg-indigo-100 text-indigo-700' },
                { id: 'corporate-profiles', label: 'City Ledger (Accounts Receivable)', icon: <Building2 size={12} /> },
                { id: 'finance-overview', label: 'Trial Balance & Balance Sheet', icon: <FileText size={12} /> },
            ]
        },

        // MODULE: TAXES, VAT & COMPLIANCE
        {
            key: 'corpTax',
            label: 'Taxes, VAT & Policy',
            icon: <Percent size={14} />,
            sectionHeader: 'Compliance & Rules',
            items: [
                { id: 'taxes-vat', label: 'Taxes, VAT & Service Charges', icon: <Percent size={12} />, badge: 'Simulator', badgeColor: 'bg-rose-100 text-rose-700' },
                { id: 'holiday-management', label: 'Holiday & Peak Calendar', icon: <CalendarDays size={12} />, badge: 'Gov', badgeColor: 'bg-amber-100 text-amber-700' },
                { id: 'policy-management', label: 'Group Policy Governance', icon: <ShieldCheck size={12} />, badge: 'Rules', badgeColor: 'bg-emerald-100 text-emerald-700' },
            ]
        },

        // MODULE: CORPORATE HRM & RBAC GOVERNANCE
        {
            key: 'corpHrm',
            label: 'HRM & Security Matrix',
            icon: <Users size={14} />,
            sectionHeader: 'Personnel & Security',
            items: [
                { id: 'hrm-dashboard', label: 'Workforce & 24/7 Shifts Suite', icon: <Users size={12} />, badge: 'Payroll', badgeColor: 'bg-purple-100 text-purple-700' },
                { id: 'user-management', label: 'Staff & User Directory', icon: <UserCog size={12} />, badge: 'Staff', badgeColor: 'bg-sky-100 text-sky-700' },
                { id: 'roles-permissions', label: 'Roles & RBAC Access Matrix', icon: <Shield size={12} />, badge: 'RBAC', badgeColor: 'bg-blue-100 text-blue-700' },
                { id: 'departments', label: 'Corporate Cost Centers & Depts', icon: <Building2 size={12} /> },
                { id: 'shifts', label: '24/7 Work Shifts & Handover', icon: <Clock size={12} /> },
            ]
        },

        // MODULE: ARCHITECTURE & SYSTEM GOVERNANCE
        {
            key: 'corpSystem',
            label: 'System & Database',
            icon: <Database size={14} />,
            sectionHeader: 'Engineering & Schema',
            items: [
                { id: 'schema-explorer', label: 'Relational DB & 1NF-4NF Schema', icon: <Database size={12} />, badge: 'PG 17', badgeColor: 'bg-indigo-100 text-indigo-700' },
                { id: 'printer-settings', label: 'Hardware & POS Printer Settings', icon: <Printer size={12} />, badge: 'ESC/POS', badgeColor: 'bg-indigo-100 text-indigo-700' },
                { id: 'general-settings', label: 'System Configuration', icon: <Settings size={12} /> },
            ]
        },

        // MODULE: AUDIT & ANALYTICS
        {
            key: 'corpAudit',
            label: 'Audit & Analytics',
            icon: <BarChart3 size={14} />,
            sectionHeader: 'Reports & Audits',
            items: [
                { id: 'advanced-reports', label: 'Executive BI Analytics', icon: <BarChart3 size={12} /> },
                { id: 'reports', label: 'Report Center & Audit Packs', icon: <ListOrdered size={12} />, newTab: true, badge: '50+ Packs', badgeColor: 'bg-gray-100 text-gray-700' },
            ]
        }
    ];

    // ========================================================================
    // PANEL 2: PROPERTY STAFF PMS PANEL (FRONT OFFICE / HOTEL OPERATIONS)
    // ========================================================================
    const propertyPmsMenuGroups: MenuItem[] = [
        // MODULE: FRONT OFFICE
        {
            key: 'frontOffice',
            label: 'Front Office',
            icon: <BedDouble size={14} />,
            sectionHeader: 'Front Office Operations',
            items: [
                { id: 'front-desk', label: 'Front Desk Dashboard', icon: <Monitor size={12} />, badge: 'Live', badgeColor: 'bg-emerald-100 text-emerald-700' },
                { id: 'stay-view', label: 'Stay View Calendar', icon: <Calendar size={12} />, badge: 'Tape', badgeColor: 'bg-blue-100 text-blue-700' },
                { id: 'add-reservation', label: 'Add Reservation', icon: <Plus size={12} /> },
                { id: 'reservations', label: 'Reservations List', icon: <Calendar size={12} /> },
                { id: 'room-rack', label: 'Room Rack Grid', icon: <LayoutGrid size={12} /> },
                { id: 'folio-operations', label: 'Folio & Guest Invoicing', icon: <FileText size={12} />, badge: 'Billing', badgeColor: 'bg-emerald-100 text-emerald-700' },
                { id: 'guest-profile', label: 'Guest Profiles 360', icon: <User size={12} /> },
                { id: 'floor-plan', label: 'Floor Plan View', icon: <Map size={12} /> },
                { id: 'occupancy-heatmap', label: 'Occupancy Heatmap', icon: <Grid3X3 size={12} /> },
                { id: 'night-audit', label: 'Night Audit Pipeline', icon: <Moon size={12} />, badge: 'EOD', badgeColor: 'bg-purple-100 text-purple-700' },
                { id: 'service-vouchers', label: 'Digital Guest Vouchers', icon: <Ticket size={12} /> },
                { id: 'allowance-checker', label: 'Credit & Allowance', icon: <ShieldCheck size={12} /> },
                { id: 'reservations-sleep-out', label: 'Sleep Out List', icon: <Moon size={12} /> },
                { id: 'reservations-hold', label: 'Reservation Hold', icon: <Clock size={12} /> },
                { id: 'reservations-unassigned', label: 'Unassigned Rooms', icon: <HelpCircle size={12} /> },
                { id: 'reservations-cancel', label: 'Cancelled List', icon: <XCircle size={12} /> },
            ]
        },

        // MODULE: HOUSEKEEPING
        {
            key: 'housekeeping',
            label: 'Housekeeping',
            icon: <ClipboardList size={14} />,
            sectionHeader: 'Rooms & Cleanliness',
            items: [
                { id: 'housekeeping', label: 'Room Cleanliness Grid', icon: <ClipboardList size={12} />, badge: 'Live', badgeColor: 'bg-emerald-100 text-emerald-700' },
                { id: 'maintenance', label: 'Work Orders Kanban', icon: <Wrench size={12} />, badge: 'Tickets', badgeColor: 'bg-amber-100 text-amber-700' },
                { id: 'service-master', label: 'Linen & Laundry Valet', icon: <Sparkles size={12} /> },
                { id: 'addons', label: 'Room Amenities & Minibar', icon: <Layers size={12} /> },
            ]
        },

        // MODULE: F&B POS & KDS
        {
            key: 'posManagement',
            label: 'F&B POS & Dining',
            icon: <UtensilsCrossed size={14} />,
            sectionHeader: 'Restaurant & Dining',
            items: [
                { id: 'pos', label: 'Cashier Terminal', icon: <UtensilsCrossed size={12} />, badge: 'Cashier', badgeColor: 'bg-blue-100 text-blue-700' },
                { id: 'pos-dashboard', label: 'POS Terminal Overview', icon: <LayoutDashboard size={12} /> },
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
                    key: 'menuKey',
                    label: 'Menu Master',
                    icon: <ListOrdered size={12} />,
                    items: [
                        { id: 'categories', label: 'Food Categories', icon: <Tags size={12} /> },
                        { id: 'products', label: 'Menu Items & Recipes', icon: <Package size={12} /> },
                        { id: 'addons', label: 'Modifiers & Addons', icon: <Layers size={12} /> },
                        { id: 'units', label: 'Portion Units', icon: <Scale size={12} /> },
                    ]
                }
            ]
        },

        // MODULE: ROOMS & RATES INVENTORY
        {
            key: 'inventoryMod',
            label: 'Rooms & Rates',
            icon: <Layers size={14} />,
            sectionHeader: 'Inventory & Rates',
            items: [
                { id: 'manage-room-type', label: 'Room Types', icon: <Tags size={12} /> },
                { id: 'manage-room', label: 'Rooms Master', icon: <BedDouble size={12} /> },
                { id: 'joint-room', label: 'Connecting Rooms', icon: <Layers size={12} /> },
                { id: 'rate-plans', label: 'Rate Plans', icon: <Tags size={12} /> },
                { id: 'package-builder', label: 'Package Builder', icon: <Package size={12} /> },
                { id: 'meal-plans', label: 'Meal Plans', icon: <Utensils size={12} /> },
                { id: 'rate-calendar', label: 'Rate & Availability', icon: <Calendar size={12} /> },
                { id: 'building-management', label: 'Building Wings', icon: <Building2 size={12} /> },
                { id: 'floor-management', label: 'Floors & Corridors', icon: <Layers size={12} /> },
                { id: 'amenities-safety', label: 'Amenities & Safety', icon: <ShieldCheck size={12} /> },
            ]
        },

        // MODULE: LOCAL SHIFTS & ROSTER
        {
            key: 'localHrm',
            label: 'Staff Shifts & Roster',
            icon: <Clock size={14} />,
            sectionHeader: 'Shift Roster',
            items: [
                { id: 'shifts', label: '24/7 Work Shifts & Handover', icon: <Clock size={12} />, badge: 'Shifts', badgeColor: 'bg-purple-100 text-purple-700' },
                { id: 'user-management', label: 'Hotel Staff Directory', icon: <UserCog size={12} /> },
            ]
        },

        // MODULE: B2B & REPORTS
        {
            key: 'reportsMod',
            label: 'B2B & Reports',
            icon: <FileText size={14} />,
            sectionHeader: 'Daily Reports',
            items: [
                { id: 'corporate-profiles', label: 'Corporate Accounts (B2B)', icon: <Building2 size={12} /> },
                { id: 'business-origins', label: 'Business Origins & Sources', icon: <Target size={12} /> },
                { id: 'reports', label: 'Report Center & Audit Packs', icon: <ListOrdered size={12} />, newTab: true, badge: 'Packs', badgeColor: 'bg-gray-100 text-gray-700' },
            ]
        },

        // MODULE: PROPERTY SETTINGS & CONFIGURATION
        {
            key: 'propertySettings',
            label: 'Property Settings',
            icon: <Settings size={14} />,
            sectionHeader: 'Local Setup',
            items: [
                { id: 'hotel-info', label: 'Hotel Profile & Contacts', icon: <Info size={12} /> },
                { id: 'policy-management', label: 'Hotel Policies & Rules', icon: <ShieldCheck size={12} /> },
                { id: 'printer-settings', label: 'Receipt & ESC/POS Printers', icon: <Printer size={12} />, badge: 'Hardware', badgeColor: 'bg-indigo-100 text-indigo-700' },
                { id: 'general-settings', label: 'System Configuration', icon: <Settings size={12} /> },
            ]
        }
    ];

    // Select Active Menu Groups according to Portal Mode
    const menuGroups = useMemo(() => {
        return portalMode === 'super_admin' ? superAdminMenuGroups : propertyPmsMenuGroups;
    }, [portalMode]);

    // ========================================================================
    // AUTO-EXPAND ACTIVE PARENT MENU GROUP ON NAVIGATION
    // ========================================================================
    useEffect(() => {
        if (!activePage) return;

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
    }, [activePage, menuGroups]);

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
    }, [searchTerm, menuGroups]);

    // ========================================================================
    // RECURSIVE RENDER MENU ITEM
    // ========================================================================
    const renderMenuItem = (item: MenuItem, depth: number = 0) => {
        const isOpen = item.key ? (openMenus[item.key] || searchTerm.trim().length > 0) : false;
        const hasChildren = item.items && item.items.length > 0;
        const isItemActive = (id?: string) => {
            if (!id) return false;
            if (activePage === id) return true;
            if (id === 'building-management' && (activePage === 'buildings' || activePage === 'building-floor' || activePage === 'buildings-floors' || activePage === 'building-management')) return true;
            if (id === 'floor-management' && (activePage === 'floors' || activePage === 'floor-management')) return true;
            if (id === 'amenities-safety' && (activePage === 'amenities-safety' || activePage === 'amenities' || activePage === 'safety')) return true;
            return false;
        };
        const isActive = isItemActive(item.id);

        if (hasChildren) {
            return (
                <div key={item.key || item.label} className="mt-0.5">
                    {/* Section Header */}
                    {item.sectionHeader && !isCollapsed && depth === 0 && (
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 px-2 pt-3 pb-1 select-none">
                            {item.sectionHeader}
                        </div>
                    )}

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

                    {/* Children */}
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
                        ? (portalMode === 'super_admin' ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs' : 'bg-blue-50 text-blue-700 font-bold shadow-xs')
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'}
                    ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}
                `}
                title={isCollapsed ? item.label : ""}
            >
                <span className={`flex-shrink-0 ${isActive ? (portalMode === 'super_admin' ? 'text-indigo-600' : 'text-blue-600') : 'text-gray-400'}`}>
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
            {/* Header / Brand Area tailored by Portal Mode */}
            <div className={`h-11 px-2.5 flex items-center border-b border-gray-100 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <div 
                        className="cursor-pointer flex items-center gap-2 min-w-0" 
                        onClick={() => {
                            if (portalMode === 'super_admin') {
                                setActivePage('multi-property');
                            } else {
                                setActivePage('front-desk');
                            }
                        }}
                        title={portalMode === 'super_admin' ? "Super Admin Master Console" : activeProperty?.name}
                    >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-white shadow-xs flex-shrink-0 ${
                            portalMode === 'super_admin' ? 'bg-indigo-600' : 'bg-emerald-600'
                        }`}>
                            {portalMode === 'super_admin' ? <Shield size={13} /> : <Building2 size={13} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none truncate">
                                {portalMode === 'super_admin' ? 'HotelOS Master' : (activeProperty?.code || 'GPD') + ' Operations'}
                            </h1>
                            <p className={`text-[8px] font-bold uppercase tracking-wider leading-none mt-0.5 ${
                                portalMode === 'super_admin' ? 'text-indigo-600' : 'text-emerald-600'
                            }`}>
                                {portalMode === 'super_admin' ? 'Super Admin HQ' : 'Property Staff PMS'}
                            </p>
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
                            placeholder={portalMode === 'super_admin' ? "Search HQ modules..." : "Search PMS operations..."}
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
                {/* Mode-Specific Primary Quick Link 1 */}
                {portalMode === 'super_admin' ? (
                    <div
                        onClick={() => setActivePage('multi-property')}
                        className={`flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium rounded-md cursor-pointer transition-colors ${activePage === 'multi-property' ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs' : 'text-gray-700 hover:bg-gray-100/70'} ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}`}
                        title={isCollapsed ? "Multi-Hotel Chain Console" : ""}
                    >
                        <span className={`flex-shrink-0 ${activePage === 'multi-property' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <Building2 size={14} />
                        </span>
                        {!isCollapsed && (
                            <div className="flex items-center justify-between w-full min-w-0">
                                <span className="truncate">Multi-Hotel Console</span>
                                <span className="text-[8px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider bg-indigo-100 text-indigo-700">HQ</span>
                            </div>
                        )}
                    </div>
                ) : (
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
                )}

                {/* Mode-Specific Primary Quick Link 2 */}
                {portalMode === 'super_admin' ? (
                    <div
                        onClick={() => setActivePage('advance-accounting')}
                        className={`flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium rounded-md cursor-pointer transition-colors ${activePage === 'advance-accounting' ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs' : 'text-gray-700 hover:bg-gray-100/70'} ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}`}
                        title={isCollapsed ? "USALI Accounting" : ""}
                    >
                        <span className={`flex-shrink-0 ${activePage === 'advance-accounting' ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <Landmark size={14} />
                        </span>
                        {!isCollapsed && <span className="truncate">USALI General Ledger</span>}
                    </div>
                ) : (
                    <div
                        onClick={() => setActivePage('stay-view')}
                        className={`flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium rounded-md cursor-pointer transition-colors ${activePage === 'stay-view' ? 'bg-blue-50 text-blue-700 font-bold shadow-xs' : 'text-gray-700 hover:bg-gray-100/70'} ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}`}
                        title={isCollapsed ? "Stay View Calendar" : ""}
                    >
                        <span className={`flex-shrink-0 ${activePage === 'stay-view' ? 'text-blue-600' : 'text-gray-400'}`}>
                            <Calendar size={14} />
                        </span>
                        {!isCollapsed && <span className="truncate">Stay View Calendar</span>}
                    </div>
                )}

                {/* Overview Dashboard link */}
                <div
                    onClick={() => setActivePage(portalMode === 'super_admin' ? 'manager-dashboard' : 'dashboard')}
                    className={`flex items-center gap-2 px-2 py-1 text-[11.5px] font-medium rounded-md cursor-pointer transition-colors ${(activePage === 'dashboard' || activePage === 'manager-dashboard') ? 'bg-blue-50 text-blue-700 font-bold shadow-xs' : 'text-gray-700 hover:bg-gray-100/70'} ${isCollapsed ? 'justify-center px-0 py-1.5' : ''}`}
                    title={isCollapsed ? (portalMode === 'super_admin' ? "Executive KPIs" : "HMS Overview") : ""}
                >
                    <span className={`flex-shrink-0 ${(activePage === 'dashboard' || activePage === 'manager-dashboard') ? 'text-blue-600' : 'text-gray-400'}`}>
                        {portalMode === 'super_admin' ? <Briefcase size={14} /> : <LayoutDashboard size={14} />}
                    </span>
                    {!isCollapsed && (
                        <span className="truncate">
                            {portalMode === 'super_admin' ? 'Executive KPIs' : 'HMS Overview'}
                        </span>
                    )}
                </div>

                {/* Module-Wise Accordions */}
                {filteredMenuGroups.map((group) => renderMenuItem(group, 0))}

                {filteredMenuGroups.length === 0 && (
                    <div className="py-4 text-center text-gray-400 text-[10px]">
                        No menu items found
                    </div>
                )}
            </nav>

            {/* Quick Jumper Button between Super Admin and Property PMS - ONLY VISIBLE TO SUPER ADMINS */}
            {!isCollapsed && isSuperAdmin && (
                <div className="p-2 border-t border-gray-100 bg-gray-50/70">
                    {portalMode === 'super_admin' ? (
                        <button
                            type="button"
                            onClick={() => switchToPropertyPMS(activeProperty?.id, 'front-desk')}
                            className="w-full py-1.5 px-2 rounded-lg bg-white border border-emerald-200/80 text-emerald-800 hover:bg-emerald-50 text-[11px] font-bold flex items-center justify-between shadow-2xs transition-colors cursor-pointer group"
                            title={`Inspect Property Staff PMS for ${activeProperty?.name}`}
                        >
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Building2 size={12} className="text-emerald-600 flex-shrink-0" />
                                <span className="truncate">Open Hotel PMS ({activeProperty?.code})</span>
                            </div>
                            <span className="text-[10px] text-emerald-600 group-hover:translate-x-0.5 transition-transform">→</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => switchToSuperAdmin('multi-property')}
                            className="w-full py-1.5 px-2 rounded-lg bg-white border border-indigo-200/80 text-indigo-800 hover:bg-indigo-50 text-[11px] font-bold flex items-center justify-between shadow-2xs transition-colors cursor-pointer group"
                            title="Return to Super Admin Master HQ"
                        >
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Shield size={12} className="text-indigo-600 flex-shrink-0" />
                                <span className="truncate">Return to Master HQ</span>
                            </div>
                            <span className="text-[10px] text-indigo-600 group-hover:translate-x-0.5 transition-transform">→</span>
                        </button>
                    )}
                </div>
            )}

            {/* Footer / System Status indicator */}
            <div className="h-8 px-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 bg-gray-50/50">
                {!isCollapsed && (
                    <>
                        <span className="flex items-center gap-1.5 text-[9px] font-medium text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {portalMode === 'super_admin' ? 'Master HQ Online' : `${activeProperty?.code || 'PMS'} Online`}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">v4.3</span>
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
