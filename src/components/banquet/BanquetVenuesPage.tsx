import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Building2, Plus, Maximize2, Users,
    RefreshCw, Edit3, Calendar, FileText
} from 'lucide-react';
import { OutletModal } from '../restaurant/outlets/OutletModal';
import { BanquetEventOrderModal } from './BanquetEventOrderModal';
import type { ExtendedOutletItem } from '../restaurant/outlets/OutletSelector';

interface BanquetVenuesPageProps {
    onNavigate?: (pageId: string, params?: any) => void;
}

export const BanquetVenuesPage: React.FC<BanquetVenuesPageProps> = ({ onNavigate }) => {
    const [venues, setVenues] = useState<ExtendedOutletItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVenue, setSelectedVenue] = useState<ExtendedOutletItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBeoModalOpen, setIsBeoModalOpen] = useState(false);
    const [selectedBeoVenueId, setSelectedBeoVenueId] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('ALL');

    const loadVenues = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/restaurant/outlets?department=BANQUET_EVENTS');
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setVenues(data.data);
            } else {
                setVenues([]);
            }
        } catch (e) {
            console.error('Failed to load banquet venues:', e);
            setVenues([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadVenues();
        const handleUpdate = () => loadVenues();
        window.addEventListener('hotel_outlets_updated', handleUpdate);
        return () => window.removeEventListener('hotel_outlets_updated', handleUpdate);
    }, [loadVenues]);

    const filteredVenues = useMemo(() => {
        if (filterType === 'ALL') return venues;
        return venues.filter(v => v.outlet_type === filterType);
    }, [venues, filterType]);

    // Summary calculations
    const totalSqFt = useMemo(() => {
        return venues.reduce((acc, v) => acc + Number(v.venue_dimensions?.totalSqFt || 0), 0);
    }, [venues]);

    const maxCapacity = useMemo(() => {
        return venues.reduce((acc, v) => {
            const caps = v.seating_capacities || {};
            const venueMax = Math.max(
                Number(caps.theatre || 0),
                Number(caps.banquet || 0),
                Number(caps.cocktail || 0)
            );
            return acc + venueMax;
        }, 0);
    }, [venues]);

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Building2 className="text-purple-600 size-6" />
                        Banquet Venues & Event Halls
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Convention center ballrooms, executive meeting spaces, seating style capacities, and BEO tariffs.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={loadVenues}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181822] text-slate-600 hover:text-slate-900 dark:hover:text-white transition shadow-2xs cursor-pointer"
                        title="Refresh Venues"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedBeoVenueId(venues[0]?.id || '');
                            setIsBeoModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition cursor-pointer"
                    >
                        <FileText className="size-4" />
                        <span>Create BEO Sheet</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedVenue(null);
                            setIsModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-2 transition cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Add Banquet Venue</span>
                    </button>
                </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Venues</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{venues.length}</span>
                        <span className="text-xs text-purple-600 font-bold">Halls & Spaces</span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Event Area</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{totalSqFt.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 font-medium">Sq. Feet</span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Max Guest Capacity</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{maxCapacity.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 font-medium">Simultaneous Pax</span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">USALI Revenue Head</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-black text-slate-800 dark:text-slate-200 font-mono">10050-01</span>
                        <span className="text-[10px] text-emerald-600 font-bold">Banquets</span>
                    </div>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                    { id: 'ALL', label: 'All Event Spaces' },
                    { id: 'GRAND_BALLROOM', label: 'Grand Ballrooms' },
                    { id: 'BANQUET_HALL', label: 'Banquet Halls' },
                    { id: 'CONFERENCE_ROOM', label: 'Conference Rooms' },
                    { id: 'BOARDROOM', label: 'Executive Boardrooms' },
                    { id: 'OPEN_LAWN', label: 'Open Gardens & Lawns' },
                    { id: 'POOLSIDE_DECK', label: 'Poolside Event Decks' },
                ].map(pill => (
                    <button
                        key={pill.id}
                        type="button"
                        onClick={() => setFilterType(pill.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                            filterType === pill.id
                                ? 'bg-purple-600 text-white shadow-xs font-bold'
                                : 'bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        {pill.label}
                    </button>
                ))}
            </div>

            {/* Venues Grid */}
            {loading ? (
                <div className="py-20 text-center text-slate-400 text-xs">
                    <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <span>Loading banquet venues & capacities...</span>
                </div>
            ) : filteredVenues.length === 0 ? (
                <div className="py-20 text-center bg-white dark:bg-[#16161e] rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-4">
                    <Building2 className="size-12 mx-auto text-slate-300 dark:text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Banquet Venues Configured</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Create your Grand Ballroom, Banquet Hall, or Executive Boardroom to set dimensions, guest capacities, and rental rates.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedVenue(null);
                            setIsModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md"
                    >
                        Create Banquet Venue
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {filteredVenues.map(venue => {
                        const dims = venue.venue_dimensions || {};
                        const caps = venue.seating_capacities || {};
                        const tariffs = venue.rental_tariffs || {};

                        return (
                            <div
                                key={venue.id}
                                className="bg-white dark:bg-[#16161e] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-2xs hover:shadow-md transition duration-200 flex flex-col justify-between space-y-5"
                            >
                                <div className="space-y-4">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-black text-sm">
                                                <Building2 size={24} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                                                        {venue.name}
                                                    </h3>
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                                                        {venue.code}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                                    <span>{venue.outlet_type.replace(/_/g, ' ')}</span>
                                                    {venue.physical_location && (
                                                        <span>• 📍 {venue.physical_location}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedVenue(venue);
                                                setIsModalOpen(true);
                                            }}
                                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                            title="Edit Venue Specifications"
                                        >
                                            <Edit3 size={15} />
                                        </button>
                                    </div>

                                    {/* Dimensions Banner */}
                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <Maximize2 size={15} className="text-purple-600" />
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-medium">Floor Area</span>
                                                <span className="font-black text-slate-900 dark:text-white text-sm">
                                                    {Number(dims.totalSqFt || 0).toLocaleString()} sq ft
                                                </span>
                                            </div>
                                        </div>
                                        {dims.lengthFeet && dims.widthFeet ? (
                                            <div className="text-right">
                                                <span className="text-[10px] text-slate-400 block font-medium">Dimensions</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    {dims.lengthFeet} ft × {dims.widthFeet} ft {dims.heightFeet ? `(${dims.heightFeet} ft height)` : ''}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Seating Style Capacities */}
                                    <div>
                                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Users size={12} /> Seating Arrangements & Guest Capacities
                                        </h4>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                                            <div className="p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/60 dark:border-purple-900/30">
                                                <span className="text-[9.5px] text-slate-400 block">Theatre</span>
                                                <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs">
                                                    {caps.theatre || '—'}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/60 dark:border-purple-900/30">
                                                <span className="text-[9.5px] text-slate-400 block">Classroom</span>
                                                <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs">
                                                    {caps.classroom || '—'}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/60 dark:border-purple-900/30">
                                                <span className="text-[9.5px] text-slate-400 block">Banquet</span>
                                                <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs">
                                                    {caps.banquet || '—'}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/60 dark:border-purple-900/30">
                                                <span className="text-[9.5px] text-slate-400 block">U-Shape</span>
                                                <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs">
                                                    {caps.ushape || '—'}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/60 dark:border-purple-900/30">
                                                <span className="text-[9.5px] text-slate-400 block">Cocktail</span>
                                                <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs">
                                                    {caps.cocktail || '—'}
                                                </span>
                                            </div>
                                            <div className="p-2 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/60 dark:border-purple-900/30">
                                                <span className="text-[9.5px] text-slate-400 block">Boardroom</span>
                                                <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs">
                                                    {caps.boardroom || '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rental Tariffs */}
                                    <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-[#1a1a24]/70 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
                                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rental Tariffs</span>
                                            <span className="text-[10px] text-emerald-600 font-bold">BDT (৳)</span>
                                        </div>
                                        <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 text-xs pt-0.5">
                                            <span>Half-Day: <strong>৳{Number(tariffs.halfDayRate || 0).toLocaleString()}</strong></span>
                                            <span>Full-Day: <strong>৳{Number(tariffs.fullDayRate || 0).toLocaleString()}</strong></span>
                                            <span>Evening Gala: <strong>৳{Number(tariffs.eveningRate || 0).toLocaleString()}</strong></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Toolbar */}
                                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => onNavigate && onNavigate('banquet-pos', { outletId: venue.id })}
                                        className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-purple-600/20 cursor-pointer"
                                    >
                                        <Calendar size={14} />
                                        <span>Book Event & POS Billing</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedBeoVenueId(venue.id);
                                            setIsBeoModalOpen(true);
                                        }}
                                        className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-indigo-200/50"
                                        title="Create Banquet Event Order (BEO) PDF"
                                    >
                                        <FileText size={14} />
                                        <span>BEO</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onNavigate && onNavigate('products', { outletId: venue.id })}
                                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                                    >
                                        Catering Menus
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Banquet Event Order (BEO) Modal */}
            <BanquetEventOrderModal
                isOpen={isBeoModalOpen}
                onClose={() => setIsBeoModalOpen(false)}
                venues={venues}
                defaultVenueId={selectedBeoVenueId}
                onSaved={() => {
                    loadVenues();
                }}
            />

            {/* Modal */}
            <OutletModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedVenue(null);
                }}
                outlet={selectedVenue}
                onSaved={loadVenues}
            />
        </div>
    );
};

export default BanquetVenuesPage;
