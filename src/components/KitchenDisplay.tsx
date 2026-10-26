import { useState } from 'react';
import { Clock, CheckCircle, AlertCircle, ChefHat, Flame } from 'lucide-react';
import PageHeader from './common/PageHeader';

interface OrderItem {
    id: number;
    name: string;
    quantity: number;
    notes?: string;
}

interface KitchenOrder {
    id: number;
    orderNumber: string;
    table: string;
    items: OrderItem[];
    status: 'new' | 'preparing' | 'ready';
    orderTime: string;
    waitTime: number; // in minutes
    priority: 'normal' | 'urgent';
}

const KitchenDisplay = () => {
    const [orders, setOrders] = useState<KitchenOrder[]>([
        {
            id: 1,
            orderNumber: 'ORD-001',
            table: 'Table 5',
            items: [
                { id: 1, name: 'Chicken Biryani', quantity: 2 },
                { id: 2, name: 'Mutton Curry', quantity: 1, notes: 'Extra spicy' },
                { id: 3, name: 'Naan', quantity: 4 },
            ],
            status: 'new',
            orderTime: '14:30',
            waitTime: 2,
            priority: 'urgent',
        },
        {
            id: 2,
            orderNumber: 'ORD-002',
            table: 'Table 12',
            items: [
                { id: 4, name: 'Fish Fry', quantity: 1 },
                { id: 5, name: 'Vegetable Fried Rice', quantity: 2 },
            ],
            status: 'preparing',
            orderTime: '14:25',
            waitTime: 7,
            priority: 'normal',
        },
        {
            id: 3,
            orderNumber: 'ORD-003',
            table: 'Table 8',
            items: [
                { id: 6, name: 'Beef Steak', quantity: 1, notes: 'Medium rare' },
                { id: 7, name: 'Mashed Potato', quantity: 1 },
                { id: 8, name: 'Caesar Salad', quantity: 1 },
            ],
            status: 'preparing',
            orderTime: '14:20',
            waitTime: 12,
            priority: 'normal',
        },
        {
            id: 4,
            orderNumber: 'ORD-004',
            table: 'Table 3',
            items: [
                { id: 9, name: 'Pasta Carbonara', quantity: 2 },
                { id: 10, name: 'Garlic Bread', quantity: 1 },
            ],
            status: 'ready',
            orderTime: '14:15',
            waitTime: 17,
            priority: 'normal',
        },
        {
            id: 5,
            orderNumber: 'ORD-005',
            table: 'Table 15',
            items: [
                { id: 11, name: 'Chicken Tikka', quantity: 3 },
                { id: 12, name: 'Tandoori Roti', quantity: 6 },
            ],
            status: 'new',
            orderTime: '14:32',
            waitTime: 0,
            priority: 'normal',
        },
    ]);

    const updateOrderStatus = (orderId: number, newStatus: KitchenOrder['status']) => {
        setOrders(orders.map(order =>
            order.id === orderId ? { ...order, status: newStatus } : order
        ));
    };

    const getWaitTimeColor = (minutes: number) => {
        if (minutes >= 15) return 'text-red-600';
        if (minutes >= 10) return 'text-amber-600';
        return 'text-emerald-600';
    };

    const newOrders = orders.filter(o => o.status === 'new');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const readyOrders = orders.filter(o => o.status === 'ready');

    return (
        <div className="page-container">
            <PageHeader
                title="Kitchen Display System (KDS)"
                subtitle="Real-time KOT order preparation queue, station routing & pickup telemetry"
                icon={<ChefHat size={20} />}
                badge={<span className="badge-status-active">{orders.length} Active Orders</span>}
                actions={
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <Clock size={13} className="text-primary" />
                        <span>Kitchen Clock: <strong className="font-mono text-slate-900">14:35</strong></span>
                    </div>
                }
            />

            {/* KPI Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">New Orders (KOT)</p>
                        <p className="text-xl sm:text-2xl text-rose-600 mt-1">{newOrders.length}</p>
                        <p className="text-[11px] text-rose-600 font-medium mt-0.5">Awaiting fire</p>
                    </div>
                    <div className="size-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Flame size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Preparing</p>
                        <p className="text-xl sm:text-2xl text-amber-600 mt-1">{preparingOrders.length}</p>
                        <p className="text-[11px] text-amber-600 font-medium mt-0.5">On kitchen line</p>
                    </div>
                    <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <ChefHat size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Ready for Pickup</p>
                        <p className="text-xl sm:text-2xl text-emerald-600 mt-1">{readyOrders.length}</p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Pass / Expediter</p>
                    </div>
                    <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle size={17} />
                    </div>
                </div>
            </div>

            {/* Order Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* New Orders */}
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                        <h2 className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <Flame size={14} className="text-rose-600" />
                            New Orders
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-50 text-rose-700 border border-rose-200">
                            {newOrders.length}
                        </span>
                    </div>
                    <div className="space-y-3 bg-slate-50/40 p-3.5 flex-1 min-h-[460px]">
                        {newOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200/90 border-l-4 border-l-rose-500">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm text-slate-900">{order.orderNumber}</h3>
                                        <p className="text-xs text-slate-500 font-medium">{order.table}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-xs mb-0.5">
                                            <Clock size={12} className={getWaitTimeColor(order.waitTime)} />
                                            <span className={getWaitTimeColor(order.waitTime)}>{order.waitTime} min</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">{order.orderTime}</p>
                                    </div>
                                </div>

                                {order.priority === 'urgent' && (
                                    <div className="bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 mb-3 flex items-center gap-1.5">
                                        <AlertCircle size={13} className="text-rose-600" />
                                        <span className="text-[10px] text-rose-700 uppercase">Urgent Order</span>
                                    </div>
                                )}

                                <div className="space-y-1.5 mb-3">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex items-start justify-between bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-100">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="size-5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md flex items-center justify-center text-[11px] font-bold">
                                                        {item.quantity}
                                                    </span>
                                                    <span className="text-xs text-slate-800">{item.name}</span>
                                                </div>
                                                {item.notes && (
                                                    <p className="text-[11px] text-amber-700 font-medium mt-1 ml-7">Note: {item.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                                    className="btn-primary w-full"
                                >
                                    Start Preparing
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Preparing Orders */}
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                        <h2 className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <ChefHat size={14} className="text-amber-600" />
                            Preparing
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
                            {preparingOrders.length}
                        </span>
                    </div>
                    <div className="space-y-3 bg-slate-50/40 p-3.5 flex-1 min-h-[460px]">
                        {preparingOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200/90 border-l-4 border-l-amber-500">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm text-slate-900">{order.orderNumber}</h3>
                                        <p className="text-xs text-slate-500 font-medium">{order.table}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-xs mb-0.5">
                                            <Clock size={12} className={getWaitTimeColor(order.waitTime)} />
                                            <span className={getWaitTimeColor(order.waitTime)}>{order.waitTime} min</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">{order.orderTime}</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5 mb-3">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex items-start justify-between bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-100">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="size-5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md flex items-center justify-center text-[11px] font-bold">
                                                        {item.quantity}
                                                    </span>
                                                    <span className="text-xs text-slate-800">{item.name}</span>
                                                </div>
                                                {item.notes && (
                                                    <p className="text-[11px] text-amber-700 font-medium mt-1 ml-7">Note: {item.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => updateOrderStatus(order.id, 'ready')}
                                    className="btn-primary w-full !bg-emerald-600 hover:!bg-emerald-700"
                                >
                                    Mark as Ready
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ready Orders */}
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                        <h2 className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <CheckCircle size={14} className="text-emerald-600" />
                            Ready
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {readyOrders.length}
                        </span>
                    </div>
                    <div className="space-y-3 bg-slate-50/40 p-3.5 flex-1 min-h-[460px]">
                        {readyOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200/90 border-l-4 border-l-emerald-500">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm text-slate-900">{order.orderNumber}</h3>
                                        <p className="text-xs text-slate-500 font-medium">{order.table}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-xs mb-0.5">
                                            <Clock size={12} className={getWaitTimeColor(order.waitTime)} />
                                            <span className={getWaitTimeColor(order.waitTime)}>{order.waitTime} min</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">{order.orderTime}</p>
                                    </div>
                                </div>

                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg py-2 px-3 mb-3">
                                    <p className="text-xs text-emerald-700 text-center">✓ Ready for Service Pickup</p>
                                </div>

                                <div className="space-y-1.5">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 text-xs">
                                            <span className="size-5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md flex items-center justify-center text-[11px] font-bold">
                                                {item.quantity}
                                            </span>
                                            <span className="font-semibold text-slate-700">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KitchenDisplay;
