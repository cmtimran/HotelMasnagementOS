import React, { useState, useEffect } from 'react';
import { Store, ChevronDown, Check } from 'lucide-react';

export interface Outlet {
    id: string;
    property_id: string;
    name: string;
    code: string;
    outlet_type: string;
    status: string;
    vat_rate?: number;
    service_charge_rate?: number;
    city_tax_rate?: number;
    department_category?: string;
    catalog_type?: string;
    allows_barcode_scan?: boolean;
    requires_appointment?: boolean;
    physical_location?: string;
    accepted_payment_methods?: string[];
    assigned_terminal_ids?: string[];
    hardware_settings?: any;
    venue_dimensions?: {
        lengthFeet?: number;
        widthFeet?: number;
        heightFeet?: number;
        totalSqFt?: number;
        carpetAreaSqFt?: number;
    };
    seating_capacities?: {
        theatre?: number;
        classroom?: number;
        banquet?: number;
        ushape?: number;
        cocktail?: number;
        boardroom?: number;
    };
    rental_tariffs?: {
        hourlyRate?: number;
        halfDayRate?: number;
        fullDayRate?: number;
        eveningRate?: number;
        cleaningFee?: number;
    };
}

export interface ExtendedOutletItem extends Outlet {
    description?: string;
    total_tables: number;
    total_menu_items: number;
    total_kitchen_stations: number;
    active_orders_count: number;
    tax_configuration_id?: string;
    revenue_head_code: string;
    requires_table?: boolean;
    allow_room_charge?: boolean;
    auto_generate_kot?: boolean;
    operating_hours?: {
        open?: string;
        close?: string;
        is24Hours?: boolean;
        days?: string[];
    };
}

export interface OutletSelectorProps {
    currentOutletId?: string;
    selectedOutletId?: string;
    onSelectOutlet?: (outlet: Outlet) => void;
    onOutletChange?: (outlet: Outlet) => void;
    className?: string;
}

export const OutletSelector: React.FC<OutletSelectorProps> = ({
    currentOutletId,
    selectedOutletId,
    onSelectOutlet,
    onOutletChange,
    className = ''
}) => {
    const activeId = selectedOutletId || currentOutletId;
    const notifySelect = (out: Outlet) => {
        if (onSelectOutlet) onSelectOutlet(out);
        if (onOutletChange) onOutletChange(out);
    };

    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        let mounted = true;
        fetch('/api/restaurant/outlets')
            .then(res => res.json())
            .then(data => {
                if (mounted && data.success && Array.isArray(data.data)) {
                    setOutlets(data.data);
                    if (!activeId && data.data.length > 0) {
                        notifySelect(data.data[0]);
                    }
                }
            })
            .catch(err => console.error('Failed to load outlets:', err))
            .finally(() => { if (mounted) setLoading(false); });

        return () => { mounted = false; };
    }, []);

    const activeOutlet = outlets.find(o => o.id === activeId) || outlets[0];

    return (
        <div className={`relative inline-block text-left ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition shadow-xs cursor-pointer"
            >
                <div className="w-5 h-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Store size={12} />
                </div>
                <div className="text-left">
                    <span className="block text-[10px] text-slate-400 uppercase tracking-wider leading-none">Outlet</span>
                    <span className="truncate max-w-[140px] block font-bold leading-tight">
                        {loading ? 'Loading...' : (activeOutlet?.name || 'Select Outlet')}
                    </span>
                </div>
                <ChevronDown size={14} className="text-slate-400 ml-1" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1a1a24] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 py-2 animate-in fade-in duration-100">
                        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dining Outlets</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-medium">
                                {outlets.length} Active
                            </span>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
                            {outlets.map((outlet) => {
                                const isSelected = outlet.id === activeOutlet?.id;
                                return (
                                    <button
                                        key={outlet.id}
                                        type="button"
                                        onClick={() => {
                                            notifySelect(outlet);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                                            isSelected 
                                                ? 'bg-primary/10 text-primary font-bold' 
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                                                isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                            }`}>
                                                {outlet.code?.slice(0, 2) || 'OT'}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900 dark:text-white leading-tight">{outlet.name}</div>
                                                <div className="text-[10px] text-slate-400">{outlet.outlet_type?.replace(/_/g, ' ')}</div>
                                            </div>
                                        </div>
                                        {isSelected && <Check size={14} className="text-primary" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default OutletSelector;
