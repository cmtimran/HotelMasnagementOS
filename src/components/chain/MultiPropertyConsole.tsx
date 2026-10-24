import React from 'react';
import { 
    Building2, 
    MapPin, 
    Phone, 
    Mail, 
    Star, 
    RefreshCw, 
    CheckCircle2, 
    ArrowRight,
    TrendingUp,
    Users,
    BedDouble,
    Landmark,
    Calendar,
    Sparkles,
    ShieldCheck,
    Plus
} from 'lucide-react';
import { useProperty, type Property } from '../../context/PropertyContext';
import { useNavigation } from '../../context/NavigationContext';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../../context/PortalContext';

export const MultiPropertyConsole: React.FC = () => {
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
        showToast(`Switched active hotel to ${property.name}`, {
            type: 'success',
            title: 'Active Hotel Switched'
        });
    };

    const handleLaunchFrontDesk = (property: Property) => {
        showToast(`Switching to Property PMS for ${property.name}`, {
            type: 'info',
            title: 'Hotel Session Active'
        });
        switchToPropertyPMS(property.id, 'front-desk');
    };

    const handleLaunchStayView = (property: Property) => {
        showToast(`Opening StayView for ${property.name}`, {
            type: 'info',
            title: 'Hotel Session Active'
        });
        switchToPropertyPMS(property.id, 'stay-view');
    };

    const totalRooms = properties.reduce((sum, p) => sum + (p.total_rooms || 0), 0);
    const totalStaff = properties.reduce((sum, p) => sum + (p.total_staff || 0), 0);

    return (
        <div className="p-6 bg-slate-50 min-h-screen text-slate-800">
            {error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                    {error}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-200 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                Multi-Property Hotel Group Console
                            </h1>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                Grand Hospitality Group (GHG)
                            </span>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <ShieldCheck size={12} /> Cloud PostgreSQL Active
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Centralized Portfolio Governance, Active Property Session Switching, and Consolidated Chain Analytics
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setActivePage('property-create')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition cursor-pointer"
                    >
                        <Plus size={15} />
                        Add Property
                    </button>
                    <button 
                        onClick={() => refreshProperties()}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-xs transition cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh Portfolio
                    </button>
                </div>
            </div>

            {/* Enterprise Chain KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Group Portfolio</span>
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <Building2 size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">{properties.length} Active Hotels</div>
                    <div className="text-xs text-slate-500 mt-1">Dhaka City & Cox's Bazar Resort</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Chain Inventory</span>
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <BedDouble size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 mt-2">{totalRooms} Physical Rooms</div>
                    <div className="text-xs text-slate-500 mt-1">1NF–4NF Relational Inventory</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consolidated Personnel</span>
                        <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                            <Users size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">{totalStaff} Hotel Staff</div>
                    <div className="text-xs text-slate-500 mt-1">Cross-Property HR Rostering</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consolidated Revenue</span>
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-2">
                        ৳{chainOverview ? Number(chainOverview.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '248,500.00'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">USALI General Ledger Inflow</div>
                </div>
            </div>

            {/* Property Selector Cards */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Hotel Properties in Chain</h2>
                        <p className="text-xs text-slate-500">Click any hotel card to switch active operating context or launch operational views</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                        Current Session: <strong className="text-blue-600">{activeProperty?.name}</strong>
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {properties.map(property => {
                        const isSelected = property.id === activePropertyId;
                        return (
                            <div 
                                key={property.id}
                                className={`p-6 rounded-2xl border-2 transition relative bg-white shadow-xs hover:shadow-md flex flex-col justify-between ${
                                    isSelected 
                                        ? 'border-blue-600 ring-2 ring-blue-100/80 bg-linear-to-b from-blue-50/20 to-white' 
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div>
                                    {/* Active Session Badge */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-mono text-xs font-bold text-blue-600 uppercase px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                                            CODE: {property.code}
                                        </span>
                                        {isSelected ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white flex items-center gap-1 shadow-xs">
                                                <CheckCircle2 size={12} /> Active Hotel in Session
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400 font-medium">Ready to switch</span>
                                        )}
                                    </div>

                                    {/* Hotel Title & Rating */}
                                    <div className="flex items-start gap-3">
                                        <div className={`p-3 rounded-xl flex-shrink-0 ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                            <Building2 size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 leading-snug">{property.name}</h3>
                                            <div className="flex items-center gap-1 mt-1 text-amber-500">
                                                {[...Array(property.star_rating || 5)].map((_, i) => (
                                                    <Star key={i} size={14} fill="currentColor" />
                                                ))}
                                                <span className="text-xs text-slate-500 ml-1.5 font-medium">
                                                    {property.star_rating} Star {property.city === 'Dhaka' ? 'Business Hotel' : 'Beach Resort'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location & Contact Info */}
                                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                                            <span>{property.address}, {property.city}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-slate-400 flex-shrink-0" />
                                            <span className="font-mono">{property.phone}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-slate-400 flex-shrink-0" />
                                            <span>{property.email}</span>
                                        </div>
                                    </div>

                                    {/* Key Counts */}
                                    <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
                                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Physical Rooms</div>
                                            <div className="text-base font-bold text-slate-900 mt-0.5">{property.total_rooms || 0}</div>
                                        </div>
                                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Buildings/Wings</div>
                                            <div className="text-base font-bold text-slate-900 mt-0.5">{property.total_buildings || 0}</div>
                                        </div>
                                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Active Personnel</div>
                                            <div className="text-base font-bold text-slate-900 mt-0.5">{property.total_staff || 0}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Operational Action Buttons */}
                                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {!isSelected && (
                                            <button
                                                type="button"
                                                onClick={() => handleSwitchProperty(property)}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <CheckCircle2 size={13} />
                                                Set as Active Hotel
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleLaunchFrontDesk(property)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Sparkles size={13} className="text-blue-600" />
                                            Front Desk
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleLaunchStayView(property)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Calendar size={13} className="text-emerald-600" />
                                            StayView
                                        </button>
                                    </div>

                                    <span className="text-xs font-mono font-medium text-slate-400">
                                        Currency: <strong className="text-slate-700">{property.currency || 'BDT'}</strong>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Side-by-Side Property Comparison Matrix */}
            <div className="mt-10 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Landmark size={18} className="text-blue-600" />
                            Chain Portfolio Comparison Matrix
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Cross-property operational metrics and rack rate comparison
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Property</th>
                                <th className="px-4 py-3">Type & City</th>
                                <th className="px-4 py-3">Rooms</th>
                                <th className="px-4 py-3">Rack Rates Range</th>
                                <th className="px-4 py-3">Staff Team</th>
                                <th className="px-4 py-3">Database Isolation</th>
                                <th className="px-4 py-3 text-right">Quick Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {properties.map(p => {
                                const isCurrent = p.id === activePropertyId;
                                return (
                                    <tr key={p.id} className={isCurrent ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                                    {p.code}
                                                </span>
                                                <span className="font-bold text-slate-900">{p.name}</span>
                                                {isCurrent && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600">
                                            {p.city === 'Dhaka' ? '5★ Corporate Tower (Dhaka)' : '5★ Beachfront Resort (Cox\'s Bazar)'}
                                        </td>
                                        <td className="px-4 py-3.5 font-bold text-slate-900">
                                            {p.total_rooms || 0} Rooms ({p.total_buildings || 0} Wings)
                                        </td>
                                        <td className="px-4 py-3.5 font-mono text-slate-700">
                                            {p.city === 'Dhaka' ? '৳2,200 – ৳18,000' : '৳5,500 – ৳22,000'}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-700">
                                            {p.total_staff || 0} Active Personnel
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                                <ShieldCheck size={11} /> 1NF–4NF Scoped
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            {isCurrent ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePage('dashboard')}
                                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                                >
                                                    Open Desk <ArrowRight size={11} />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSwitchProperty(p)}
                                                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-[11px] font-bold cursor-pointer"
                                                >
                                                    Switch Hotel
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
        </div>
    );
};

export default MultiPropertyConsole;
