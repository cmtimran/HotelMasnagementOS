import React, { useState, useMemo } from 'react';
import { 
    Building2, 
    MapPin, 
    Phone, 
    Mail, 
    Star, 
    RefreshCw, 
    CheckCircle2, 
    TrendingUp,
    Users,
    BedDouble,
    Landmark,
    Calendar,
    Sparkles,
    ShieldCheck,
    Plus,
    Database,
    Search,
    ChevronRight
} from 'lucide-react';
import { useProperty, type Property } from '../../context/PropertyContext';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../../context/PortalContext';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import TenantIsolationHub from './TenantIsolationHub';

export const MultiPropertyConsole: React.FC = () => {
    const [consoleView, setConsoleView] = useState<'portfolio' | 'isolation'>('portfolio');
    const [searchQuery, setSearchQuery] = useState('');
    const [cityFilter, setCityFilter] = useState('ALL');

    const { 
        properties, 
        activeProperty, 
        activePropertyId, 
        setActivePropertyId, 
        chainOverview, 
        loading, 
        error, 
        refreshProperties 
    } = useProperty();

    const { setActivePage } = useNavigation();
    const { showToast } = useToast();
    const { switchToPropertyPMS } = usePortal();

    const handleSwitchProperty = (property: Property) => {
        setActivePropertyId(property.id);
        showToast(`Active operational context switched to ${property.name}`, {
            type: 'success',
            title: 'Hotel Switched'
        });
    };

    const handleLaunchFrontDesk = (property: Property) => {
        showToast(`Launching Front Desk for ${property.name}`, {
            type: 'info',
            title: 'Hotel PMS Session'
        });
        switchToPropertyPMS(property.id, 'front-desk');
    };

    const handleLaunchStayView = (property: Property) => {
        showToast(`Opening StayView Rack for ${property.name}`, {
            type: 'info',
            title: 'StayView Calendar'
        });
        switchToPropertyPMS(property.id, 'stay-view');
    };

    const totalRooms = properties.reduce((sum, p) => sum + (p.total_rooms || 0), 0);
    const totalStaff = properties.reduce((sum, p) => sum + (p.total_staff || 0), 0);

    // Filter properties
    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.city || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCity = cityFilter === 'ALL' || p.city === cityFilter;
            return matchesSearch && matchesCity;
        });
    }, [properties, searchQuery, cityFilter]);

    const cities = useMemo(() => {
        const set = new Set<string>();
        properties.forEach(p => { if (p.city) set.add(p.city); });
        return Array.from(set);
    }, [properties]);

    return (
        <div className="min-h-screen bg-slate-50/70 text-slate-800 pb-16">
            {error && (
                <div className="mx-6 sm:mx-8 mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between shadow-xs">
                    <span>{error}</span>
                    <button onClick={() => refreshProperties()} className="text-xs font-bold underline hover:text-rose-800 cursor-pointer">Retry</button>
                </div>
            )}

            {/* Top Luxury Executive Banner */}
            <div className="bg-white border-b border-gray-200/80 shadow-2xs">
                <div className="max-w-7xl mx-auto px-3 py-1.5">
                    <div className="flex items-center justify-between gap-2.5">
                        
                        {/* Title & Brand Identity */}
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] flex items-center justify-center text-white shadow-xs shrink-0">
                                <Building2 size={14} className="stroke-[2.2]" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                                        Multi-Property Hotel Chain Console
                                    </h1>
                                    <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/80 leading-none">
                                        GHG Group
                                    </span>
                                    <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 hidden md:inline-flex items-center gap-1 leading-none">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        TiDB Cloud Active
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 truncate hidden sm:block mt-0.5 leading-tight">
                                    Centralized Hotel Group Governance, Cross-Property Operations &amp; Database Isolation
                                </p>
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                            <button 
                                type="button"
                                onClick={() => setActivePage('property-create')}
                                className="flex items-center gap-1.5 h-8 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-98"
                            >
                                <Plus size={14} className="stroke-[2.5]" />
                                <span>Onboard Hotel</span>
                            </button>
                            <button 
                                type="button"
                                onClick={() => refreshProperties()}
                                className="flex items-center gap-1.5 h-8 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                                title="Sync live database portfolio"
                            >
                                <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : 'text-slate-500'} />
                                <span className="hidden sm:inline">Sync</span>
                            </button>
                        </div>

                    </div>

                    {/* View Switcher Tabs Bar */}
                    <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-slate-100">
                        <div className="p-0.5 bg-slate-100/90 rounded-lg flex items-center gap-1 border border-slate-200/70">
                            <button
                                type="button"
                                onClick={() => setConsoleView('portfolio')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                    consoleView === 'portfolio'
                                        ? 'bg-white text-blue-700 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <Building2 size={13} />
                                <span>Portfolio</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-blue-700 font-extrabold border border-blue-200">
                                    {properties.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setConsoleView('isolation')}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                    consoleView === 'isolation'
                                        ? 'bg-white text-blue-700 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <Database size={13} />
                                <span>Database Isolation Hub</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 hidden sm:inline-flex items-center gap-1">
                                    <ShieldCheck size={10} /> 10,000+ Scale
                                </span>
                            </button>
                        </div>

                        {consoleView === 'portfolio' && (
                            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
                                <span className="text-[11px]">Active Hotel Session:</span>
                                <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1.5 font-mono text-[11px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    {activeProperty?.name || 'Grand Palace Hotel (HQ)'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 space-y-4">

                {consoleView === 'isolation' ? (
                    <TenantIsolationHub />
                ) : (
                    <>
                        {/* 4 HIGH-END EXECUTIVE METRIC CARDS */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            
                            {/* Metric 1 */}
                            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Group Portfolio</span>
                                    <div className="size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                        <Building2 size={14} />
                                    </div>
                                </div>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">{properties.length}</span>
                                    <span className="text-[10.5px] font-semibold text-slate-500">Properties</span>
                                </div>
                                <div className="mt-1 text-[10.5px] text-slate-500 flex items-center gap-1">
                                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                        <TrendingUp size={11} /> 100%
                                    </span>
                                    <span className="truncate">Active Uptime</span>
                                </div>
                            </div>

                            {/* Metric 2 */}
                            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room Inventory</span>
                                    <div className="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                        <BedDouble size={14} />
                                    </div>
                                </div>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                    <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight font-mono">{totalRooms}</span>
                                    <span className="text-[10.5px] font-semibold text-slate-500">Rooms</span>
                                </div>
                                <div className="mt-1 text-[10.5px] text-slate-500 flex items-center gap-1 truncate">
                                    <span className="px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold font-mono text-[9.5px]">
                                        1NF–4NF
                                    </span>
                                    <span className="truncate">Relational DB</span>
                                </div>
                            </div>

                            {/* Metric 3 */}
                            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
                                    <div className="size-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                        <Users size={14} />
                                    </div>
                                </div>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">{totalStaff}</span>
                                    <span className="text-[10.5px] font-semibold text-slate-500">Personnel</span>
                                </div>
                                <div className="mt-1 text-[10.5px] text-slate-500 flex items-center gap-1 truncate">
                                    <span className="text-purple-600 font-bold">Cross-Property</span>
                                    <span className="truncate">HRM Roster</span>
                                </div>
                            </div>

                            {/* Metric 4 */}
                            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue Inflow</span>
                                    <div className="size-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                        <TrendingUp size={14} />
                                    </div>
                                </div>
                                <div className="mt-1 flex items-baseline gap-1">
                                    <span className="text-xs font-bold text-amber-600">{getCurrencySymbol(activeProperty?.currency || properties[0]?.currency || 'USD')}</span>
                                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                                        {chainOverview ? Number(chainOverview.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}
                                    </span>
                                </div>
                                <div className="mt-1 text-[10.5px] text-slate-500 flex items-center gap-1 truncate">
                                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                        <TrendingUp size={11} /> +14.8%
                                    </span>
                                    <span className="truncate">USALI Inflow</span>
                                </div>
                            </div>

                        </div>

                        {/* SEARCH & FILTER BAR */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
                            <div className="relative w-full sm:w-72">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search hotel name, code or city..."
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 focus:bg-white transition"
                                />
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Region:</span>
                                <div className="flex items-center gap-1 overflow-x-auto">
                                    <button
                                        type="button"
                                        onClick={() => setCityFilter('ALL')}
                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                            cityFilter === 'ALL'
                                                ? 'bg-blue-600 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        All ({properties.length})
                                    </button>
                                    {cities.map(city => (
                                        <button
                                            key={city}
                                            type="button"
                                            onClick={() => setCityFilter(city)}
                                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                                cityFilter === city
                                                    ? 'bg-blue-600 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {city}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* HOTEL PROPERTIES GRID */}
                        {filteredProperties.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
                                <div className="size-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">No Hotel Properties Found</h3>
                                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                        You are logged in as Super Admin. Get started by creating your first hotel property to configure buildings, room types, and inventory.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActivePage('add-property')}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                                >
                                    <Plus size={14} />
                                    <span>Create Your First Property</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {filteredProperties.map(property => {
                                    const isSelected = property.id === activePropertyId;
                                    const starCount = property.star_rating || 5;

                                    return (
                                        <div 
                                            key={property.id}
                                            className={`rounded-xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative ${
                                                isSelected 
                                                    ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-500/10' 
                                                    : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300'
                                            }`}
                                        >
                                        {/* Top Accent Strip */}
                                        <div className={`h-1 w-full ${
                                            isSelected 
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
                                                : 'bg-slate-200'
                                        }`} />

                                        <div className="p-4 space-y-3">
                                            {/* Header Row: Code & Session State */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                                        {property.code}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        ID #{property.id}
                                                    </span>
                                                </div>

                                                {isSelected ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white flex items-center gap-1.5 shadow-2xs">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                                        Active Session
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                                        Standby Context
                                                    </span>
                                                )}
                                            </div>

                                            {/* Hotel Title, Star & Location */}
                                            <div className="flex items-start gap-3">
                                                <div className={`size-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                                                    isSelected 
                                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white' 
                                                        : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700'
                                                }`}>
                                                    {property.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="space-y-0.5 min-w-0">
                                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug truncate">
                                                        {property.name}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <div className="flex items-center gap-0.5 text-amber-500">
                                                            {[...Array(starCount)].map((_, i) => (
                                                                <Star key={i} size={11} fill="currentColor" />
                                                            ))}
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-slate-600">
                                                            {starCount}-Star {property.city === 'Dhaka' ? 'Business Hotel' : 'Luxury Resort'}
                                                        </span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-[10.5px] text-slate-500 font-mono">
                                                            Currency: <strong>{property.currency || 'BDT'}</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Address & Contact Chips */}
                                            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 space-y-1 text-[11px] text-slate-600">
                                                <div className="flex items-center gap-2 truncate">
                                                    <MapPin size={12} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{property.address}, {property.city}, {property.country || 'Bangladesh'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px]">
                                                    <div className="flex items-center gap-1 font-mono text-slate-600">
                                                        <Phone size={11} className="text-slate-400 shrink-0" />
                                                        <span>{property.phone}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 truncate text-slate-600">
                                                        <Mail size={11} className="text-slate-400 shrink-0" />
                                                        <span className="truncate">{property.email}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3 Metric Mini-Cards */}
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                                                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Physical Rooms</span>
                                                    <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                                                        {property.total_rooms || 0}
                                                    </span>
                                                </div>
                                                <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                                                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Wings / Towers</span>
                                                    <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                                                        {property.total_buildings || 1}
                                                    </span>
                                                </div>
                                                <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                                                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Staff Roster</span>
                                                    <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                                                        {property.total_staff || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Bar Footer */}
                                        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                {!isSelected ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSwitchProperty(property)}
                                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
                                                    >
                                                        <CheckCircle2 size={12} />
                                                        <span>Switch</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                                        <CheckCircle2 size={13} className="text-blue-600" />
                                                        <span>Active</span>
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleLaunchFrontDesk(property)}
                                                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                                >
                                                    <Sparkles size={11} className="text-blue-600" />
                                                    <span>Front Desk</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleLaunchStayView(property)}
                                                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                                >
                                                    <Calendar size={11} className="text-emerald-600" />
                                                    <span>StayView</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleSwitchProperty(property);
                                                        setActivePage('hotel-profile');
                                                    }}
                                                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                                    title="Configure Hotel Profile, Policies, Outlets & Numbering"
                                                >
                                                    <Building2 size={11} className="text-indigo-600" />
                                                    <span>Profile</span>
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleSwitchProperty(property);
                                                    setConsoleView('isolation');
                                                }}
                                                className="text-[11px] font-semibold text-slate-500 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer transition"
                                                title="View Database Isolation Specs"
                                            >
                                                <Database size={11} />
                                                <span>DB Isolation</span>
                                                <ChevronRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                        {/* CHAIN COMPARISON MATRIX TABLE */}
                        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                                <div>
                                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        <Landmark size={15} className="text-blue-600" />
                                        <span>Consolidated Hotel Chain Comparison Matrix</span>
                                    </h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Standardized multi-property performance metrics, rack rate schedules, and database isolation scope
                                    </p>
                                </div>
                                <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 w-fit">
                                    {properties.length} Properties Analyzed
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                        <tr>
                                            <th className="px-3.5 py-2.5">Property Name</th>
                                            <th className="px-3.5 py-2.5">Category &amp; Location</th>
                                            <th className="px-3.5 py-2.5">Physical Inventory</th>
                                            <th className="px-3.5 py-2.5">Currency</th>
                                            <th className="px-3.5 py-2.5">HRM Personnel</th>
                                            <th className="px-3.5 py-2.5">Database Architecture</th>
                                            <th className="px-3.5 py-2.5 text-right">Operational Switch</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {properties.map(p => {
                                            const isCurrent = p.id === activePropertyId;
                                            return (
                                                <tr key={p.id} className={`transition ${isCurrent ? 'bg-blue-50/50' : 'hover:bg-slate-50/60'}`}>
                                                    <td className="px-3.5 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                                {p.code}
                                                            </span>
                                                            <span className="font-bold text-slate-900">{p.name}</span>
                                                            {isCurrent && (
                                                                <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-blue-600 text-white shadow-2xs">
                                                                    Active
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-slate-600">
                                                        {`${p.star_rating || 5}★ ${p.city ? `${p.city}` : 'Standard Property'}`}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-slate-900 font-semibold font-mono">
                                                        {p.total_rooms || 0} Rooms ({p.total_buildings || 1} Wing)
                                                    </td>
                                                    <td className="px-3.5 py-2.5 font-mono text-slate-700 font-semibold">
                                                        {p.currency || 'BDT'}
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-slate-700 font-mono">
                                                        {p.total_staff || 0} Staff
                                                    </td>
                                                    <td className="px-3.5 py-2.5">
                                                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                            <ShieldCheck size={11} /> 1NF–4NF Clustered
                                                        </span>
                                                    </td>
                                                    <td className="px-3.5 py-2.5 text-right">
                                                        {isCurrent ? (
                                                            <span className="text-xs font-bold text-blue-600">Active</span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSwitchProperty(p)}
                                                                className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 rounded-md text-xs font-semibold transition cursor-pointer shadow-2xs"
                                                            >
                                                                Switch
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
};

export default MultiPropertyConsole;
