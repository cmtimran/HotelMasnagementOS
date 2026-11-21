import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Store, Plus, Copy, Edit3, Trash2,
    Clock, Percent,
    CreditCard, Utensils, BedDouble, Coffee,
    RefreshCw, CheckCircle2, ChefHat,
    LayoutGrid, DollarSign, Building2, Sparkles, Dumbbell,
    ShoppingBag, Tag, Maximize2, Calendar, Scan
} from 'lucide-react';
import { OutletModal } from './OutletModal';
import { OutletCloneModal } from './OutletCloneModal';
import type { ExtendedOutletItem } from './OutletSelector';
import {
    getPropertyPaymentConfig,
    type PaymentOutletId
} from '../../../utils/propertyPaymentMethodEngine';

export interface OutletConfigurationTabProps {
    propertyId?: string | number;
    propertyName?: string;
    onNavigate?: (pageId: string, params?: any) => void;
    onSwitchTab?: (tabId: string) => void;
}

export const OutletConfigurationTab: React.FC<OutletConfigurationTabProps> = ({
    propertyId,
    propertyName,
    onNavigate,
    onSwitchTab
}) => {
    const [outlets, setOutlets] = useState<ExtendedOutletItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOutlet, setSelectedOutlet] = useState<ExtendedOutletItem | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCloneOpen, setIsCloneOpen] = useState(false);
    const [cloneSource, setCloneSource] = useState<ExtendedOutletItem | null>(null);

    // Department Filter Tab
    const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');

    const numericPropertyId = useMemo(() => {
        if (!propertyId) return undefined;
        const n = Number(propertyId);
        return isNaN(n) ? undefined : n;
    }, [propertyId]);

    // Payment Config for resolving EDC card terminals and active tenders
    const paymentConfig = useMemo(() => {
        return getPropertyPaymentConfig(numericPropertyId);
    }, [numericPropertyId]);

    const loadOutlets = useCallback(async () => {
        try {
            setLoading(true);
            const queryParam = propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : '';
            const res = await fetch(`/api/restaurant/outlets${queryParam}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setOutlets(data.data);
            } else {
                setOutlets([]);
            }
        } catch (err) {
            console.error('Failed to load restaurant outlets:', err);
            setOutlets([]);
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    useEffect(() => {
        loadOutlets();
    }, [loadOutlets]);

    const handleDelete = async (outlet: ExtendedOutletItem) => {
        if (Number(outlet.active_orders_count || 0) > 0) {
            alert(
                `Cannot delete "${outlet.name}" because it currently has ${outlet.active_orders_count} active orders in service. Please settle or void them in POS first.`
            );
            return;
        }

        if (!window.confirm(`Are you sure you want to delete commercial outlet "${outlet.name}" (${outlet.code})? All associated menus, configurations, and allocations will be removed.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/restaurant/outlets/${outlet.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.error || 'Failed to delete outlet');
                return;
            }

            // Dispatch reactive event so Sidebar updates immediately
            window.dispatchEvent(new CustomEvent('hotel_outlets_updated'));
            loadOutlets();
        } catch (err: any) {
            alert(err?.message || 'Error deleting outlet');
        }
    };

    const getDepartmentBadge = (dept?: string) => {
        switch ((dept || 'FOOD_BEVERAGE').toUpperCase()) {
            case 'BANQUET_EVENTS':
                return {
                    label: 'Banquet & Events',
                    color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
                    icon: <Building2 className="size-3" />
                };
            case 'SPA_WELLNESS':
                return {
                    label: 'Spa & Wellness',
                    color: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
                    icon: <Sparkles className="size-3" />
                };
            case 'FITNESS_RECREATION':
                return {
                    label: 'Fitness & Pool',
                    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
                    icon: <Dumbbell className="size-3" />
                };
            case 'RETAIL_SHOP':
                return {
                    label: 'Gift Shop & Retail',
                    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
                    icon: <ShoppingBag className="size-3" />
                };
            case 'FRONT_OFFICE':
                return {
                    label: 'Front Office Mini POS',
                    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
                    icon: <Tag className="size-3" />
                };
            case 'ENTERTAINMENT':
                return {
                    label: 'Entertainment',
                    color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                    icon: <Calendar className="size-3" />
                };
            case 'FOOD_BEVERAGE':
            default:
                return {
                    label: 'Food & Beverage',
                    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                    icon: <Utensils className="size-3" />
                };
        }
    };

    const resolvePaymentInfo = (outlet: ExtendedOutletItem) => {
        const isRoomService = outlet.outlet_type?.toUpperCase() === 'ROOM_SERVICE';
        const targetOutletId: PaymentOutletId = isRoomService ? 'ROOM_SERVICE' : 'FOOD_AND_BEVERAGE';

        const assignedTerminals = (paymentConfig.posTerminals || []).filter(
            (t) => t.status === 'Active' && t.assignedOutlets.includes(targetOutletId)
        );

        const activeTenders = (paymentConfig.methods || []).filter(
            (m) => m.enabled && m.allowedOutlets.includes(targetOutletId)
        );

        return {
            targetOutletId,
            assignedTerminals,
            activeTenders
        };
    };

    const handleJumpToPaymentMethods = () => {
        if (onSwitchTab) {
            onSwitchTab('payment-methods');
        } else if (onNavigate) {
            onNavigate('general-settings', { tab: 'payment-methods' });
        }
    };

    // Filter outlets by department
    const filteredOutlets = useMemo(() => {
        if (selectedDepartment === 'ALL') return outlets;
        return outlets.filter(o => (o.department_category || 'FOOD_BEVERAGE') === selectedDepartment);
    }, [outlets, selectedDepartment]);

    // Statistics
    const totalBanquets = useMemo(() => outlets.filter(o => o.department_category === 'BANQUET_EVENTS').length, [outlets]);
    const totalFnB = useMemo(() => outlets.filter(o => !o.department_category || o.department_category === 'FOOD_BEVERAGE').length, [outlets]);
    const totalWellnessRetail = useMemo(() => outlets.filter(o => ['SPA_WELLNESS', 'FITNESS_RECREATION', 'RETAIL_SHOP', 'FRONT_OFFICE'].includes(o.department_category || '')).length, [outlets]);
    const totalActiveOrders = useMemo(() => outlets.reduce((sum, o) => sum + Number(o.active_orders_count || 0), 0), [outlets]);

    return (
        <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header & Metric Banners */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Store className="text-primary size-5" />
                        Universal Hotel Commercial Outlets Hub
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Central configuration engine for Banquets, Restaurants, Spa, Gym, Retail Shops, and Front Office POS for {propertyName || 'this property'}.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={loadOutlets}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181822] text-slate-600 hover:text-slate-900 dark:hover:text-white transition shadow-2xs cursor-pointer"
                        title="Reload Outlets"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedOutlet(null);
                            setIsCreateOpen(true);
                        }}
                        className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold shadow-sm shadow-primary/25 flex items-center gap-2 transition cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Add Commercial Outlet</span>
                    </button>
                </div>
            </div>

            {/* Department Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                    { id: 'ALL', label: 'All Outlets', count: outlets.length },
                    { id: 'FOOD_BEVERAGE', label: 'Food & Beverage', count: totalFnB },
                    { id: 'BANQUET_EVENTS', label: 'Banquets & Events', count: totalBanquets },
                    { id: 'SPA_WELLNESS', label: 'Spa & Wellness', count: outlets.filter(o => o.department_category === 'SPA_WELLNESS').length },
                    { id: 'FITNESS_RECREATION', label: 'Fitness & Pool', count: outlets.filter(o => o.department_category === 'FITNESS_RECREATION').length },
                    { id: 'RETAIL_SHOP', label: 'Gift Shop & Retail', count: outlets.filter(o => o.department_category === 'RETAIL_SHOP').length },
                    { id: 'FRONT_OFFICE', label: 'Front Office Mini POS', count: outlets.filter(o => o.department_category === 'FRONT_OFFICE').length }
                ].map(dept => {
                    const isActive = selectedDepartment === dept.id;
                    return (
                        <button
                            key={dept.id}
                            type="button"
                            onClick={() => setSelectedDepartment(dept.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                                isActive
                                    ? 'bg-primary text-white shadow-xs font-bold'
                                    : 'bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                        >
                            <span>{dept.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                                {dept.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Outlets</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{outlets.length}</span>
                        <span className="text-[10px] text-emerald-600 font-bold">Active in PMS</span>
                    </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Banquets & Halls</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">{totalBanquets}</span>
                        <span className="text-[10px] text-purple-600 font-medium">Event Venues</span>
                    </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spa, Fitness & Retail</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">{totalWellnessRetail}</span>
                        <span className="text-[10px] text-slate-400">Services & Shops</span>
                    </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#16161e] border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Orders / Service</span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-xl sm:text-2xl font-black ${totalActiveOrders > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                            {totalActiveOrders}
                        </span>
                        <span className="text-[10px] text-slate-400">Open Tickets</span>
                    </div>
                </div>
            </div>

            {/* Outlets List / Grid */}
            {loading ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                    <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary/60" />
                    <span>Loading hotel outlets configuration...</span>
                </div>
            ) : filteredOutlets.length === 0 ? (
                <div className="py-16 text-center bg-white dark:bg-[#16161e] rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-3">
                    <Store className="size-10 mx-auto text-slate-300 dark:text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Commercial Outlets Found</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {selectedDepartment === 'ALL'
                            ? 'Configure your first banquet hall, restaurant, spa, gym, or hotel gift shop to activate POS billing and PMS folio settlement.'
                            : `No active outlets configured under ${selectedDepartment.replace(/_/g, ' ')}. Create one now.`}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedOutlet(null);
                            setIsCreateOpen(true);
                        }}
                        className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                        Create Outlet Now
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredOutlets.map((outlet) => {
                        const { assignedTerminals, activeTenders } = resolvePaymentInfo(outlet);
                        const hours = outlet.operating_hours || {};
                        const deptBadge = getDepartmentBadge(outlet.department_category);
                        const isBanquet = outlet.department_category === 'BANQUET_EVENTS';
                        const isSpa = outlet.department_category === 'SPA_WELLNESS';
                        const isRetail = outlet.department_category === 'RETAIL_SHOP' || outlet.department_category === 'FRONT_OFFICE';
                        const venueDims = outlet.venue_dimensions || {};
                        const seating = outlet.seating_capacities || {};

                        return (
                            <div
                                key={outlet.id}
                                className="bg-white dark:bg-[#16161e] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-2xs hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4 group"
                            >
                                <div className="space-y-3">
                                    {/* Top Row: Type & Department Badges */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs font-mono">
                                                {outlet.code?.slice(0, 3) || 'OUT'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                                                        {outlet.name}
                                                    </h3>
                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                        {outlet.code}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${deptBadge.color}`}>
                                                        {deptBadge.icon}
                                                        {deptBadge.label}
                                                    </span>
                                                    {outlet.physical_location && (
                                                        <span className="text-[11px] text-slate-400">
                                                            📍 {outlet.physical_location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    outlet.status === 'ACTIVE'
                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {outlet.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {outlet.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {outlet.description}
                                        </p>
                                    )}

                                    {/* Banquet Venue Specs (If Banquet) */}
                                    {isBanquet && (venueDims.totalSqFt || seating.banquet || seating.theatre) && (
                                        <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                                                    <Maximize2 size={13} />
                                                    {venueDims.totalSqFt ? `${venueDims.totalSqFt.toLocaleString()} sq ft` : 'Banquet Hall'}
                                                </span>
                                                {venueDims.lengthFeet && venueDims.widthFeet ? (
                                                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                                        ({venueDims.lengthFeet}ft × {venueDims.widthFeet}ft)
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                                                {seating.theatre ? (
                                                    <div className="p-1 rounded bg-white/70 dark:bg-purple-900/40">
                                                        <span className="text-slate-400 block">Theatre</span>
                                                        <span className="font-bold text-purple-900 dark:text-purple-200">{seating.theatre} Pax</span>
                                                    </div>
                                                ) : null}
                                                {seating.banquet ? (
                                                    <div className="p-1 rounded bg-white/70 dark:bg-purple-900/40">
                                                        <span className="text-slate-400 block">Banquet</span>
                                                        <span className="font-bold text-purple-900 dark:text-purple-200">{seating.banquet} Pax</span>
                                                    </div>
                                                ) : null}
                                                {seating.cocktail ? (
                                                    <div className="p-1 rounded bg-white/70 dark:bg-purple-900/40">
                                                        <span className="text-slate-400 block">Cocktail</span>
                                                        <span className="font-bold text-purple-900 dark:text-purple-200">{seating.cocktail} Pax</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}

                                    {/* Metadata Badges (Hours, Taxes, USALI) */}
                                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                                            <Clock className="size-3.5 text-slate-400 shrink-0" />
                                            <div className="truncate">
                                                <span className="text-[10px] text-slate-400 block font-medium">Service Hours</span>
                                                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                                    {hours.is24Hours
                                                        ? '24 / 7 Operations'
                                                        : `${hours.open || '07:00'} - ${hours.close || '23:30'}`}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1a1a24] border border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                                            <Percent className="size-3.5 text-slate-400 shrink-0" />
                                            <div className="truncate">
                                                <span className="text-[10px] text-slate-400 block font-medium">Statutory Taxes</span>
                                                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                                    VAT {Number(outlet.vat_rate || 0)}% · SC {Number(outlet.service_charge_rate || 0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Operational Rules Flags */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        {outlet.allows_barcode_scan && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 flex items-center gap-1">
                                                <Scan className="size-3" />
                                                Barcode Scanner
                                            </span>
                                        )}

                                        {outlet.requires_appointment && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 flex items-center gap-1">
                                                <Calendar className="size-3" />
                                                Appointment Booking
                                            </span>
                                        )}

                                        <span
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                                outlet.requires_table
                                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                            }`}
                                        >
                                            <CheckCircle2 className="size-3" />
                                            {outlet.requires_table ? 'Table Seating Plan' : 'Quick Counter'}
                                        </span>

                                        <span
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 ${
                                                outlet.allow_room_charge
                                                    ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                            }`}
                                        >
                                            <BedDouble className="size-3" />
                                            {outlet.allow_room_charge ? 'Bill to Room' : 'Direct Pay'}
                                        </span>

                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                                            <DollarSign className="size-3" />
                                            USALI: {outlet.revenue_head_code || '10020-01'}
                                        </span>
                                    </div>

                                    {/* Hardware & Tenders Summary */}
                                    <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-[#1a1a24]/70 border border-slate-200/80 dark:border-slate-800 text-xs flex items-center justify-between">
                                        <div className="flex items-center gap-2 truncate">
                                            <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                                <CreditCard className="size-3.5" />
                                            </div>
                                            <div className="truncate">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                                        {assignedTerminals.length > 0
                                                            ? `${assignedTerminals.length} Assigned EDC Terminal${assignedTerminals.length > 1 ? 's' : ''}`
                                                            : 'No EDC Terminals Assigned'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        ({activeTenders.length} Active Tenders)
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 truncate block">
                                                    Cash, Cards, Room Charge & MFS configured
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleJumpToPaymentMethods}
                                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/10 transition cursor-pointer shrink-0"
                                            title="Configure card machines & payment tenders"
                                        >
                                            Manage Terminals →
                                        </button>
                                    </div>

                                    {/* Department Specific Stats */}
                                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                                            <span className="text-[9.5px] text-slate-400 block font-medium">
                                                {isBanquet ? 'Capacity' : 'Tables'}
                                            </span>
                                            <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                                                {isBanquet ? (seating.theatre || seating.banquet || '—') : outlet.total_tables}
                                            </span>
                                        </div>
                                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                                            <span className="text-[9.5px] text-slate-400 block font-medium">
                                                {isBanquet ? 'Packages' : isSpa ? 'Services' : isRetail ? 'Items' : 'Dishes'}
                                            </span>
                                            <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                                                {outlet.total_menu_items}
                                            </span>
                                        </div>
                                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                                            <span className="text-[9.5px] text-slate-400 block font-medium">Prep Stations</span>
                                            <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                                                {outlet.total_kitchen_stations}
                                            </span>
                                        </div>
                                        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                                            <span className="text-[9.5px] text-slate-400 block font-medium">In Service</span>
                                            <span className={`font-extrabold text-xs ${
                                                Number(outlet.active_orders_count || 0) > 0 ? 'text-amber-600' : 'text-slate-400'
                                            }`}>
                                                {outlet.active_orders_count}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Operational & Management Toolbar */}
                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedOutlet(outlet);
                                                setIsCreateOpen(true);
                                            }}
                                            className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                                        >
                                            <Edit3 className="size-3.5" />
                                            <span>Configure Outlet</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCloneSource(outlet);
                                                setIsCloneOpen(true);
                                            }}
                                            className="py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                                            title="1-Click Menu & Settings Cloner"
                                        >
                                            <Copy className="size-3.5" />
                                            <span>Clone</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(outlet)}
                                            className="py-1.5 px-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-[11px] font-semibold transition cursor-pointer"
                                            title="Delete Outlet"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>

                                    {/* Direct Cross-Module Launchers */}
                                    <div className="grid grid-cols-4 gap-1 text-[10px]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isBanquet) {
                                                    onNavigate && onNavigate('banquet-pos', { outletId: outlet.id });
                                                } else if (isSpa) {
                                                    onNavigate && onNavigate('spa-pos', { outletId: outlet.id });
                                                } else if (isRetail) {
                                                    onNavigate && onNavigate('retail-pos', { outletId: outlet.id });
                                                } else {
                                                    onNavigate && onNavigate('pos', { outletId: outlet.id });
                                                }
                                            }}
                                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-100 transition flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <Store className="size-3" />
                                            <span>POS</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onNavigate && onNavigate('products', { outletId: outlet.id })}
                                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <Coffee className="size-3" />
                                            <span>Catalog</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onNavigate && onNavigate('kds', { outletId: outlet.id })}
                                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <ChefHat className="size-3" />
                                            <span>Prep/KDS</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isBanquet) {
                                                    onNavigate && onNavigate('banquet-venues', { outletId: outlet.id });
                                                } else {
                                                    onNavigate && onNavigate('table-layout', { outletId: outlet.id });
                                                }
                                            }}
                                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                                        >
                                            <LayoutGrid className="size-3" />
                                            <span>{isBanquet ? 'Venues' : 'Tables'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Outlet Creation / Edit Modal */}
            <OutletModal
                isOpen={isCreateOpen}
                onClose={() => {
                    setIsCreateOpen(false);
                    setSelectedOutlet(null);
                }}
                outlet={selectedOutlet}
                propertyId={propertyId}
                onSaved={loadOutlets}
            />

            {/* Outlet Cloner Modal */}
            {cloneSource && (
                <OutletCloneModal
                    isOpen={isCloneOpen}
                    onClose={() => {
                        setIsCloneOpen(false);
                        setCloneSource(null);
                    }}
                    sourceOutlet={cloneSource}
                    propertyId={propertyId}
                    onCloned={loadOutlets}
                />
            )}
        </div>
    );
};

export default OutletConfigurationTab;
