import React, { useState, useEffect } from 'react';
import { 
    Building2, 
    MapPin, 
    Phone, 
    Mail, 
    Star, 
    RefreshCw, 
    CheckCircle2, 
    ArrowRight
} from 'lucide-react';

interface Property {
    id: number;
    code: string;
    name: string;
    star_rating: number;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    currency: string;
    organization_name: string;
    total_rooms: number;
    total_buildings: number;
    total_staff: number;
}

export const MultiPropertyConsole: React.FC = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [activePropertyId, setActivePropertyId] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadProperties = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('http://localhost:3001/api/properties');
            const data = await res.json();
            if (data.success) {
                setProperties(data.data);
            }
        } catch (err: any) {
            setError(err.message || 'Error loading properties');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProperties();
    }, []);

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
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Multi-Property Hotel Group Console
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                                Grand Hospitality Group (GHG)
                            </span>
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Centralized Multi-Tenant Portfolio Management, Property Switching, and Enterprise Aggregation
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={loadProperties}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-sm transition"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh Portfolio
                    </button>
                </div>
            </div>

            {/* Enterprise KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Group Portfolio</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{properties.length} Active Hotels</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Chain Inventory</div>
                    <div className="text-2xl font-bold text-blue-600 mt-1">{totalRooms} Physical Rooms</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consolidated Staff</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{totalStaff} Hotel Personnel</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chain Headquarter</div>
                    <div className="text-base font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                        <MapPin size={16} className="text-blue-600" /> Gulshan-2, Dhaka
                    </div>
                </div>
            </div>

            {/* Property Selector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {properties.map(property => {
                    const isSelected = property.id === activePropertyId;
                    return (
                        <div 
                            key={property.id}
                            onClick={() => setActivePropertyId(property.id)}
                            className={`p-6 rounded-2xl border-2 cursor-pointer transition relative bg-white shadow-sm hover:shadow-md ${
                                isSelected ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {isSelected && (
                                <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Active Property in Session
                                </span>
                            )}

                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl ${isSelected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <span className="font-mono text-xs font-bold text-blue-600 uppercase">CODE: {property.code}</span>
                                    <h3 className="text-lg font-bold text-slate-900">{property.name}</h3>
                                    <div className="flex items-center gap-1 mt-1 text-amber-500">
                                        {[...Array(property.star_rating || 5)].map((_, i) => (
                                            <Star key={i} size={14} fill="currentColor" />
                                        ))}
                                        <span className="text-xs text-slate-500 ml-1.5 font-medium">{property.star_rating} Star Luxury Property</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-slate-400" />
                                    <span>{property.address}, {property.city}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" />
                                    <span className="font-mono">{property.phone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-slate-400" />
                                    <span>{property.email}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 text-center">
                                <div className="p-2 bg-slate-50 rounded-xl">
                                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Rooms</div>
                                    <div className="text-base font-bold text-slate-900 mt-0.5">{property.total_rooms}</div>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-xl">
                                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Buildings</div>
                                    <div className="text-base font-bold text-slate-900 mt-0.5">{property.total_buildings}</div>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-xl">
                                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Active Staff</div>
                                    <div className="text-base font-bold text-slate-900 mt-0.5">{property.total_staff}</div>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500">Currency: {property.currency}</span>
                                <span className={`text-xs font-bold flex items-center gap-1 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                                    Switch Property Console <ArrowRight size={14} />
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MultiPropertyConsole;
