import React, { useState, useEffect, useMemo } from 'react';
import {
    ChefHat,
    Clock,
    CheckCircle2,
    Maximize2,
    Volume2,
    VolumeX,
    RefreshCw,
    Check
} from 'lucide-react';
import PageHeader from '../../common/PageHeader';
import { OutletSelector, type Outlet } from '../outlets/OutletSelector';

interface OrderItem {
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    variationName?: string;
    prepStation?: string;
    status: string; // PENDING, PREPARING, READY, SERVED
    customNotes?: string;
    selectedAddons?: string[];
}

interface ActiveOrder {
    id: string;
    order_number: number;
    outlet_id: string;
    table_id?: string;
    table_name?: string;
    table_code?: string;
    order_type: string;
    customer_name?: string;
    room_number?: string;
    waiter_name?: string;
    notes?: string;
    status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED';
    created_at: string;
    items?: OrderItem[];
}

export const KitchenDisplayPage: React.FC = () => {
    const [orders, setOrders] = useState<ActiveOrder[]>([]);
    const [stations, setKitchenStations] = useState<{ id: string; name: string; code: string }[]>([]);
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
    const [activeStationFilter, setActiveStationFilter] = useState<string>('ALL');
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Update timer every 10 seconds for elapsed countdowns
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const outletParam = selectedOutlet ? `?outletId=${selectedOutlet.id}` : '';
            const [ordersRes, stationsRes] = await Promise.all([
                fetch(`/api/pos/orders/active${outletParam}`),
                fetch(`/api/restaurant/kitchens${outletParam}`).catch(() => null)
            ]);

            const ordersData = await ordersRes.json();
            const stationsData = stationsRes ? await stationsRes.json() : null;

            if (ordersData.success && Array.isArray(ordersData.data)) {
                setOrders(ordersData.data);
            } else {
                setOrders([]);
            }

            if (stationsData?.success && Array.isArray(stationsData.data)) {
                setKitchenStations(stationsData.data);
            }
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    // Polling every 15 seconds for live kitchen updates
    useEffect(() => {
        loadData();
        const poll = setInterval(() => {
            loadData();
        }, 15000);
        return () => clearInterval(poll);
    }, [selectedOutlet]);

    const handleUpdateOrderStatus = async (orderId: string, status: string) => {
        try {
            const res = await fetch(`/api/pos/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                setOrders(
                    orders.map((o) => (o.id === orderId ? { ...o, status: status as any } : o))
                );
            }
        } catch {
            alert('Failed to update order status');
        }
    };

    const handleBumpItem = async (orderId: string, itemId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'READY' ? 'PREPARING' : 'READY';
        try {
            const res = await fetch(`/api/pos/order-items/${itemId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus })
            });
            const data = await res.json();
            if (data.success) {
                setOrders(
                    orders.map((o) => {
                        if (o.id !== orderId) return o;
                        const newItems = (o.items || []).map((it) =>
                            it.id === itemId ? { ...it, status: nextStatus } : it
                        );
                        return { ...o, items: newItems };
                    })
                );
            }
        } catch {
            alert('Failed to bump item status');
        }
    };

    const filteredOrders = useMemo(() => {
        if (activeStationFilter === 'ALL') return orders;
        return orders.filter((o) =>
            o.items?.some((i) => (i.prepStation || '').toUpperCase() === activeStationFilter.toUpperCase())
        );
    }, [orders, activeStationFilter]);

    const getElapsedTime = (createdDate: string) => {
        const diffMs = currentTime - new Date(createdDate).getTime();
        const mins = Math.floor(diffMs / 60000);
        return mins;
    };

    const getTimerColor = (mins: number) => {
        if (mins < 10) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200';
        if (mins < 20) return 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200';
        return 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 animate-pulse';
    };

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <PageHeader
                    title="Kitchen Display System (KDS)"
                    subtitle="Live kitchen production screen, ticket bumping, preparation timers, and station routing"
                />
                <div className="flex items-center gap-3">
                    <OutletSelector
                        selectedOutletId={selectedOutlet?.id}
                        onOutletChange={(outlet: Outlet) => setSelectedOutlet(outlet)}
                    />

                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer ${
                            soundEnabled
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'border-slate-200 text-slate-400'
                        }`}
                        title={soundEnabled ? 'Audio Alerts Enabled' : 'Audio Alerts Muted'}
                    >
                        {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                    </button>

                    <button
                        onClick={() => {
                            if (!document.fullscreenElement) {
                                document.documentElement.requestFullscreen?.();
                            } else {
                                document.exitFullscreen?.();
                            }
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-500 cursor-pointer"
                        title="Fullscreen Mode for Kitchen Monitor"
                    >
                        <Maximize2 className="size-4" />
                    </button>

                    <button
                        onClick={loadData}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-500 cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Station Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                    onClick={() => setActiveStationFilter('ALL')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                        activeStationFilter === 'ALL'
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'bg-white dark:bg-[#18181f] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                >
                    All Stations ({orders.length})
                </button>
                {stations.map((st) => (
                    <button
                        key={st.id}
                        onClick={() => setActiveStationFilter(st.code)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                            activeStationFilter === st.code
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'bg-white dark:bg-[#18181f] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        <span>🍳 {st.name}</span>
                    </button>
                ))}
            </div>

            {/* Live KDS Ticket Grid */}
            {filteredOrders.length === 0 ? (
                <div className="p-16 rounded-3xl bg-white dark:bg-[#18181f] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <div className="size-16 rounded-3xl bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                        <CheckCircle2 className="size-8" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                        All Orders Clear!
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        No pending tickets at this station. New dining and room service orders will appear instantly with auditory alerts.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredOrders.map((order) => {
                        const elapsedMins = getElapsedTime(order.created_at);
                        const timerStyle = getTimerColor(elapsedMins);

                        return (
                            <div
                                key={order.id}
                                className="rounded-3xl bg-white dark:bg-[#18181f] border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden flex flex-col justify-between"
                            >
                                {/* Ticket Top Header */}
                                <div>
                                    <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-extrabold text-lg text-slate-900 dark:text-white font-mono">
                                                    #{order.order_number}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary">
                                                    {order.order_type}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                                {order.table_code ? (
                                                    <span>Table {order.table_code}</span>
                                                ) : order.room_number ? (
                                                    <span>Room {order.room_number}</span>
                                                ) : (
                                                    <span>Takeaway</span>
                                                )}
                                                {order.waiter_name && <span> • {order.waiter_name}</span>}
                                            </div>
                                        </div>

                                        <div
                                            className={`px-2.5 py-1 rounded-xl border text-xs font-bold font-mono flex items-center gap-1 ${timerStyle}`}
                                        >
                                            <Clock className="size-3.5" />
                                            <span>{elapsedMins}m</span>
                                        </div>
                                    </div>

                                    {/* Order Items List */}
                                    <div className="p-4 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                                        {(order.items || []).map((item) => {
                                            const isReady = item.status === 'READY';
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleBumpItem(order.id, item.id, item.status)}
                                                    className={`pt-2.5 first:pt-0 flex items-start justify-between gap-2 cursor-pointer transition select-none ${
                                                        isReady ? 'opacity-40 line-through' : ''
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className="font-extrabold text-sm text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded-md shrink-0">
                                                            {item.quantity}×
                                                        </span>
                                                        <div>
                                                            <span className="font-bold text-slate-900 dark:text-white text-xs block">
                                                                {item.itemName}
                                                            </span>
                                                            {item.variationName && (
                                                                <span className="text-[10px] text-slate-400 block">
                                                                    Size: {item.variationName}
                                                                </span>
                                                            )}
                                                            {item.customNotes && (
                                                                <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-semibold">
                                                                    Note: {item.customNotes}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className={`size-6 rounded-lg flex items-center justify-center shrink-0 transition ${
                                                            isReady
                                                                ? 'bg-emerald-500 text-white'
                                                                : 'border border-slate-300 dark:border-slate-700 text-slate-400 hover:border-primary'
                                                        }`}
                                                    >
                                                        <Check className="size-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {order.notes && (
                                        <div className="mx-4 mb-3 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-[10px]">
                                            <strong>Guest Note:</strong> {order.notes}
                                        </div>
                                    )}
                                </div>

                                {/* Ticket Bottom Actions */}
                                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                                    {order.status !== 'READY' ? (
                                        <button
                                            onClick={() => handleUpdateOrderStatus(order.id, 'READY')}
                                            className="col-span-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                                        >
                                            <CheckCircle2 className="size-4" />
                                            <span>Mark Order Ready</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleUpdateOrderStatus(order.id, 'SERVED')}
                                            className="col-span-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                                        >
                                            <ChefHat className="size-4" />
                                            <span>Dish Picked Up (Served)</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
