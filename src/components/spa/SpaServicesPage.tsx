import React, { useState, useEffect, useCallback } from 'react';
import {
    Sparkles, Clock, RefreshCw
} from 'lucide-react';
import { OutletSelector, type Outlet } from '../restaurant/outlets/OutletSelector';

interface SpaTreatment {
    id: string;
    outlet_id: string;
    name: string;
    category: string;
    duration_mins: number;
    price: number;
    description: string;
    is_active: boolean;
}

export const SpaServicesPage: React.FC = () => {
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
    const [treatments, setTreatments] = useState<SpaTreatment[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial default treatments
    const defaultTreatments: SpaTreatment[] = [
        {
            id: 'spa-01',
            outlet_id: selectedOutlet?.id || 'outlet-spa',
            name: 'Traditional Ayurvedic Abhyanga Full-Body Massage',
            category: 'Ayurveda & Holistic',
            duration_mins: 75,
            price: 5500,
            description: 'Synchronized medicated herbal warm oil therapy to balance doshas and relieve stress.',
            is_active: true
        },
        {
            id: 'spa-02',
            outlet_id: selectedOutlet?.id || 'outlet-spa',
            name: 'Deep Tissue Muscle Recovery Therapy',
            category: 'Massage & Bodywork',
            duration_mins: 60,
            price: 4800,
            description: 'Focused firm pressure targeting deep muscle layers, tension knots, and fatigue.',
            is_active: true
        },
        {
            id: 'spa-03',
            outlet_id: selectedOutlet?.id || 'outlet-spa',
            name: 'Radiance 24K Gold Luxury Facial',
            category: 'Facial & Skincare',
            duration_mins: 60,
            price: 6200,
            description: 'Anti-aging cell renewal treatment with 24-carat gold leaf serum and collagen infusion.',
            is_active: true
        },
        {
            id: 'spa-04',
            outlet_id: selectedOutlet?.id || 'outlet-spa',
            name: 'Herbal Steam Bath & Himalayan Salt Scrub',
            category: 'Hydrotherapy & Scrub',
            duration_mins: 45,
            price: 3500,
            description: 'Detoxifying aromatic steam bath followed by mineral-rich Himalayan pink salt body polish.',
            is_active: true
        }
    ];

    const loadServices = useCallback(async () => {
        if (!selectedOutlet) {
            setTreatments(defaultTreatments);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/restaurant/menu-items?outletId=${selectedOutlet.id}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                setTreatments(data.data.map((item: any) => ({
                    id: item.id,
                    outlet_id: item.outlet_id,
                    name: item.name,
                    category: item.category_name || 'Wellness Treatments',
                    duration_mins: 60,
                    price: Number(item.base_price || item.price || 0),
                    description: item.description || '',
                    is_active: item.status === 'active' || item.status === 'available'
                })));
            } else {
                setTreatments(defaultTreatments);
            }
        } catch {
            setTreatments(defaultTreatments);
        } finally {
            setLoading(false);
        }
    }, [selectedOutlet]);

    useEffect(() => {
        loadServices();
    }, [loadServices]);

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Sparkles className="text-pink-600 size-6" />
                        Spa Treatments & Therapist Services
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Manage holistic wellness therapies, massage durations, luxury facial packages, and USALI 10030-01 rates.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <OutletSelector
                        selectedOutletId={selectedOutlet?.id}
                        onSelectOutlet={setSelectedOutlet}
                        className="w-56"
                    />
                    <button
                        type="button"
                        onClick={loadServices}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181822] text-slate-600 hover:text-slate-900 dark:hover:text-white transition shadow-2xs cursor-pointer"
                        title="Reload"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Services</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{treatments.length}</span>
                        <span className="text-xs text-pink-600 font-bold">Treatments</span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Duration</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-pink-600 dark:text-pink-400">60</span>
                        <span className="text-xs text-slate-400 font-medium">Minutes</span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">USALI Account</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-black text-slate-800 dark:text-slate-200 font-mono">10030-01</span>
                        <span className="text-[10px] text-emerald-600 font-bold">Spa Ledger</span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Appointment Sync</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold text-emerald-600">Enabled</span>
                        <span className="text-[10px] text-slate-400">Therapist POS</span>
                    </div>
                </div>
            </div>

            {/* Treatments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {treatments.map((t) => (
                    <div
                        key={t.id}
                        className="p-5 rounded-3xl bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3"
                    >
                        <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 px-2 py-0.5 rounded-md">
                                        {t.category}
                                    </span>
                                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-1.5">
                                        {t.name}
                                    </h3>
                                </div>
                                <span className="text-base font-black text-slate-900 dark:text-white">
                                    ৳{t.price.toLocaleString()}
                                </span>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                {t.description}
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                                <Clock size={14} className="text-slate-400" />
                                <span>{t.duration_mins} Minutes Session</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                Active Treatment
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpaServicesPage;
