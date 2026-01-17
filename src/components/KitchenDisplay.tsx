import { useState } from 'react';
import { Clock, CheckCircle, AlertCircle, ChefHat, Flame } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                            <ChefHat size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Kitchen Display System</h1>
                            <p className="text-sm text-gray-400">Real-time order management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/20">
                            <p className="text-white/70 text-xs font-medium mb-1">Active Orders</p>
                            <p className="text-3xl font-bold text-white">{orders.length}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/20">
                            <p className="text-white/70 text-xs font-medium mb-1">Current Time</p>
                            <p className="text-3xl font-bold text-white">14:35</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Order Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* New Orders */}
                <div>
                    <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-t-2xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Flame size={20} />
                                New Orders
                            </h2>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold text-white">
                                {newOrders.length}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-4 bg-gray-800/50 p-4 rounded-b-2xl min-h-[600px]">
                        {newOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-2xl p-5 shadow-xl border-l-4 border-red-500">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{order.orderNumber}</h3>
                                        <p className="text-sm text-gray-500 font-medium">{order.table}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-sm font-bold mb-1">
                                            <Clock size={14} className={getWaitTimeColor(order.waitTime)} />
                                            <span className={getWaitTimeColor(order.waitTime)}>{order.waitTime} min</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{order.orderTime}</p>
                                    </div>
                                </div>

                                {order.priority === 'urgent' && (
                                    <div className="bg-red-100 border border-red-300 rounded-lg p-2 mb-3 flex items-center gap-2">
                                        <AlertCircle size={16} className="text-red-600" />
                                        <span className="text-xs font-bold text-red-700 uppercase">Urgent Order</span>
                                    </div>
                                )}

                                <div className="space-y-2 mb-4">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex items-start justify-between bg-gray-50 p-3 rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                        {item.quantity}
                                                    </span>
                                                    <span className="font-bold text-gray-900">{item.name}</span>
                                                </div>
                                                {item.notes && (
                                                    <p className="text-xs text-amber-600 font-medium mt-1 ml-8">⚠️ {item.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg"
                                >
                                    Start Preparing
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Preparing Orders */}
                <div>
                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 rounded-t-2xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <ChefHat size={20} />
                                Preparing
                            </h2>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold text-white">
                                {preparingOrders.length}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-4 bg-gray-800/50 p-4 rounded-b-2xl min-h-[600px]">
                        {preparingOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-2xl p-5 shadow-xl border-l-4 border-amber-500">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{order.orderNumber}</h3>
                                        <p className="text-sm text-gray-500 font-medium">{order.table}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-sm font-bold mb-1">
                                            <Clock size={14} className={getWaitTimeColor(order.waitTime)} />
                                            <span className={getWaitTimeColor(order.waitTime)}>{order.waitTime} min</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{order.orderTime}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex items-start justify-between bg-gray-50 p-3 rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                        {item.quantity}
                                                    </span>
                                                    <span className="font-bold text-gray-900">{item.name}</span>
                                                </div>
                                                {item.notes && (
                                                    <p className="text-xs text-amber-600 font-medium mt-1 ml-8">⚠️ {item.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => updateOrderStatus(order.id, 'ready')}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg"
                                >
                                    Mark as Ready
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ready Orders */}
                <div>
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 rounded-t-2xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <CheckCircle size={20} />
                                Ready
                            </h2>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold text-white">
                                {readyOrders.length}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-4 bg-gray-800/50 p-4 rounded-b-2xl min-h-[600px]">
                        {readyOrders.map(order => (
                            <div key={order.id} className="bg-white rounded-2xl p-5 shadow-xl border-l-4 border-emerald-500">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{order.orderNumber}</h3>
                                        <p className="text-sm text-gray-500 font-medium">{order.table}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-sm font-bold mb-1">
                                            <Clock size={14} className={getWaitTimeColor(order.waitTime)} />
                                            <span className={getWaitTimeColor(order.waitTime)}>{order.waitTime} min</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{order.orderTime}</p>
                                    </div>
                                </div>

                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
                                    <p className="text-sm font-bold text-emerald-700 text-center">✓ Ready for Pickup</p>
                                </div>

                                <div className="space-y-2">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 text-sm">
                                            <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                {item.quantity}
                                            </span>
                                            <span className="font-semibold text-gray-700">{item.name}</span>
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
