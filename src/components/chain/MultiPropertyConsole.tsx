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
            <div className="bg-white border-b border-slate-200/80 shadow-2xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        
                        {/* Title & Brand Identity */}
                        <div className="flex items-start gap-4">
                            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-50 shrink-0">
                                <Building2 size={26} className="stroke-[2.2]" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                        Multi-Property Hotel Chain Console
                                    </h1>
                                    <span className="text-[11px] font-bold px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                                        Grand Hospitality Group (GHG)
                                    </span>
                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        TiDB Cloud PostgreSQL Active
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 max-w-2xl font-normal leading-relaxed">
                                    Centralized Hotel Group Governance, Cross-Property Operations, High-Density Partitioning &amp; Enterprise Database Isolation.
                                </p>
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            <button 
                                type="button"
                                onClick={() => setActivePage('property-create')}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/20 hover:shadow-md transition-all cursor-pointer active:scale-98"
                            >
                                <Plus size={16} className="stroke-[2.5]" />
                                <span>Onboard New Hotel</span>
                            </button>
                            <button 
                                type="button"
                                onClick={() => refreshProperties()}
                                className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
                                title="Sync live database portfolio"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : 'text-slate-500'} />
                                <span className="hidden sm:inline">Sync Portfolio</span>
                            </button>
                        </div>

                    </div>

                    {/* View Switcher Tabs Bar */}
                    <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
                        <div className="p-1 bg-slate-100/80 rounded-xl flex items-center gap-1 border border-slate-200/70">
                            <button
                                type="button"
                                onClick={() => setConsoleView('portfolio')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    consoleView === 'portfolio'
                                        ? 'bg-white text-blue-700 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <Building2 size={15} />
                                <span>Hotel Chain Portfolio</span>
                                <span className="px-2 py-0.2 rounded-full text-[10.5px] bg-blue-50 text-blue-700 font-extrabold border border-blue-200">
                                    {properties.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setConsoleView('isolation')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    consoleView === 'isolation'
                                        ? 'bg-white text-blue-700 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <Database size={15} />
                                <span>Tenant Database Isolation Hub</span>
                                <span className="px-2 py-0.2 rounded-full text-[10.5px] bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 flex items-center gap-1">
                                    <ShieldCheck size={11} /> 10,000+ Scale
                                </span>
                            </button>
                        </div>

                        {consoleView === 'portfolio' && (
                            <div className="ml-auto hidden md:flex items-center gap-2 text-xs text-slate-500">
                                <span>Active Hotel Session:</span>
                                <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 font-mono text-[11px]">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    {activeProperty?.name || 'Grand Palace Hotel (HQ)'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">

                {consoleView === 'isolation' ? (
                    <TenantIsolationHub />
                ) : (
                    <>
                        {/* 4 HIGH-END EXECUTIVE METRIC CARDS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            
                            {/* Metric 1 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition relative overflow-hidden group">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Group Portfolio</span>
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <Building2 size={18} />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">{properties.length}</span>
                                    <span className="text-xs font-semibold text-slate-500">Active Properties</span>
                                </div>
                                <div className="mt-2 text-[11.5px] text-slate-500 flex items-center gap-1.5">
                                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                        <TrendingUp size={12} /> 100%
                                    </span>
                                    <span>Operational Uptime</span>
                                </div>
                            </div>

                            {/* Metric 2 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition relative overflow-hidden group">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chain Room Inventory</span>
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <BedDouble size={18} />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-emerald-600 tracking-tight font-mono">{totalRooms}</span>
                                    <span className="text-xs font-semibold text-slate-500">Total Rooms</span>
                                </div>
                                <div className="mt-2 text-[11.5px] text-slate-500 flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold font-mono text-[10.5px]">
                                        1NF–4NF Scoped
                                    </span>
                                    <span>Relational Database</span>
                                </div>
                            </div>

                            {/* Metric 3 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition relative overflow-hidden group">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consolidated Staff</span>
                                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <Users size={18} />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">{totalStaff}</span>
                                    <span className="text-xs font-semibold text-slate-500">Personnel</span>
                                </div>
                                <div className="mt-2 text-[11.5px] text-slate-500 flex items-center gap-1.5">
                                    <span className="text-purple-600 font-bold">Cross-Property</span>
                                    <span>HRM &amp; Shift Rosters</span>
                                </div>
                            </div>

                            {/* Metric 4 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition relative overflow-hidden group">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Group Revenue Inflow</span>
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <TrendingUp size={18} />
                                    </div>
                                </div>
                                <div className="mt-3 flex items-baseline gap-1">
                                    <span className="text-xs font-bold text-amber-600">৳</span>
                                    <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                                        {chainOverview ? Number(chainOverview.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '248,500'}
                                    </span>
                                </div>
                                <div className="mt-2 text-[11.5px] text-slate-500 flex items-center gap-1.5">
                                    <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                        <TrendingUp size={12} /> +14.8%
                                    </span>
                                    <span>USALI Ledger Inflow</span>
                                </div>
                            </div>

                        </div>

                        {/* SEARCH & FILTER BAR */}
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="relative w-full sm:w-80">
                                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search hotel name, code or city..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500 focus:bg-white transition"
                                />
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <span className="text-xs text-slate-400 font-medium hidden sm:inline">Filter Region:</span>
                                <div className="flex items-center gap-1 overflow-x-auto">
                                    <button
                                        type="button"
                                        onClick={() => setCityFilter('ALL')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {filteredProperties.map(property => {
                                const isSelected = property.id === activePropertyId;
                                const starCount = property.star_rating || 5;

                                return (
                                    <div 
                                        key={property.id}
                                        className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative ${
                                            isSelected 
                                                ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-500/10' 
                                                : 'bg-white border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300'
                                        }`}
                                    >
                                        {/* Top Accent Strip */}
                                        <div className={`h-1.5 w-full ${
                                            isSelected 
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
                                                : 'bg-slate-200'
                                        }`} />

                                        <div className="p-5 sm:p-6 space-y-5">
                                            {/* Header Row: Code & Session State */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                                                        {property.code}
                                                    </span>
                                                    <span className="text-xs text-slate-400 font-medium">
                                                        ID #{property.id}
                                                    </span>
                                                </div>

                                                {isSelected ? (
                                                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-600 text-white flex items-center gap-1.5 shadow-2xs">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                                        Active Hotel Session
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400 font-medium bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200">
                                                        Standby Context
                                                    </span>
                                                )}
                                            </div>

                                            {/* Hotel Title, Star & Location */}
                                            <div className="flex items-start gap-4">
                                                <div className={`w-13 h-13 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 shadow-sm ${
                                                    isSelected 
                                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white' 
                                                        : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700'
                                                }`}>
                                                    {property.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                                                        {property.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <div className="flex items-center gap-0.5 text-amber-500">
                                                            {[...Array(starCount)].map((_, i) => (
                                                                <Star key={i} size={13} fill="currentColor" />
                                                            ))}
                                                        </div>
                                                        <span className="text-[11.5px] font-semibold text-slate-600">
                                                            {starCount}-Star {property.city === 'Dhaka' ? 'Business Hotel' : 'Luxury Resort'}
                                                        </span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-[11px] text-slate-500 font-mono">
                                                            Currency: <strong>{property.currency || 'BDT'}</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Address & Contact Chips */}
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
                                                <div className="flex items-center gap-2 truncate">
                                                    <MapPin size={13} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{property.address}, {property.city}, {property.country || 'Bangladesh'}</span>
                                                </div>
                                                <div className="flex items-center gap-4 text-[11.5px]">
                                                    <div className="flex items-center gap-1.5 font-mono text-slate-600">
                                                        <Phone size={12} className="text-slate-400 shrink-0" />
                                                        <span>{property.phone}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 truncate text-slate-600">
                                                        <Mail size={12} className="text-slate-400 shrink-0" />
                                                        <span className="truncate">{property.email}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3 Metric Mini-Cards */}
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Physical Rooms</span>
                                                    <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                                                        {property.total_rooms || 0}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Wings / Towers</span>
                                                    <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                                                        {property.total_buildings || 1}
                                                    </span>
                                                </div>
                                                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Roster</span>
                                                    <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                                                        {property.total_staff || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Bar Footer */}
                                        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2.5">
                                            <div className="flex items-center gap-2">
                                                {!isSelected ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSwitchProperty(property)}
                                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
                                                    >
                                                        <CheckCircle2 size={13} />
                                                        <span>Switch Context</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                                                        <CheckCircle2 size={14} className="text-blue-600" />
                                                        <span>Operating</span>
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleLaunchFrontDesk(property)}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                                >
                                                    <Sparkles size={12} className="text-blue-600" />
                                                    <span>Front Desk</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleLaunchStayView(property)}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                                >
                                                    <Calendar size={12} className="text-emerald-600" />
                                                    <span>StayView</span>
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleSwitchProperty(property);
                                                    setConsoleView('isolation');
                                                }}
                                                className="text-[11.5px] font-semibold text-slate-500 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition"
                                                title="View Database Isolation Specs"
                                            >
                                                <Database size={12} />
                                                <span>DB Isolation</span>
                                                <ChevronRight size={13} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* CHAIN COMPARISON MATRIX TABLE */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Landmark size={17} className="text-blue-600" />
                                        <span>Consolidated Hotel Chain Comparison Matrix</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Standardized multi-property performance metrics, rack rate schedules, and database isolation scope
                                    </p>
                                </div>
                                <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 w-fit">
                                    {properties.length} Properties Analyzed
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="bg-slate-50 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Property Name</th>
                                            <th className="px-4 py-3">Category &amp; Location</th>
                                            <th className="px-4 py-3">Physical Inventory</th>
                                            <th className="px-4 py-3">Rack Rate Range</th>
                                            <th className="px-4 py-3">HRM Personnel</th>
                                            <th className="px-4 py-3">Database Architecture</th>
                                            <th className="px-4 py-3 text-right">Operational Switch</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {properties.map(p => {
                                            const isCurrent = p.id === activePropertyId;
                                            return (
                                                <tr key={p.id} className={`transition ${isCurrent ? 'bg-blue-50/50' : 'hover:bg-slate-50/60'}`}>
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                                {p.code}
                                                            </span>
                                                            <span className="font-bold text-slate-900">{p.name}</span>
                                                            {isCurrent && (
                                                                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-600 text-white shadow-2xs">
                                                                    Active
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-600">
                                                        {p.city === 'Dhaka' ? '5★ Corporate Tower (Dhaka)' : `${p.star_rating || 5}★ Luxury Resort (${p.city})`}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-900 font-semibold font-mono">
                                                        {p.total_rooms || 0} Rooms ({p.total_buildings || 1} Wing)
                                                    </td>
                                                    <td className="px-4 py-3.5 font-mono text-slate-700 font-bold">
                                                        {p.city === 'Dhaka' ? '৳2,200 – ৳18,000' : '৳5,500 – ৳22,000'}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-700 font-mono">
                                                        {p.total_staff || 0} Staff
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                                            <ShieldCheck size={11} /> 1NF–4NF Clustered
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        {isCurrent ? (
                                                            <span className="text-xs font-bold text-blue-600">Active</span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSwitchProperty(p)}
                                                                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
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
