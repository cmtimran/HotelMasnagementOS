import { useState } from 'react';
import { Wine, Plus, Minus, Save, X } from 'lucide-react';

interface MinibarItem {
    id: string;
    name: string;
    category: string;
    price: number;
    consumed: number;
}

interface MinibarPostingProps {
    roomNumber: string;
    onClose?: () => void;
    onPost?: (items: MinibarItem[], total: number) => void;
}

const MinibarPosting = ({ roomNumber, onClose, onPost }: MinibarPostingProps) => {
    const [items, setItems] = useState<MinibarItem[]>([
        { id: '1', name: 'Coca Cola', category: 'Beverages', price: 3.50, consumed: 0 },
        { id: '2', name: 'Mineral Water', category: 'Beverages', price: 2.00, consumed: 0 },
        { id: '3', name: 'Beer (Heineken)', category: 'Alcohol', price: 5.00, consumed: 0 },
        { id: '4', name: 'Red Wine', category: 'Alcohol', price: 12.00, consumed: 0 },
        { id: '5', name: 'Peanuts', category: 'Snacks', price: 4.00, consumed: 0 },
        { id: '6', name: 'Chocolate Bar', category: 'Snacks', price: 3.00, consumed: 0 },
        { id: '7', name: 'Chips', category: 'Snacks', price: 3.50, consumed: 0 },
    ]);

    const updateQuantity = (id: string, change: number) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const newConsumed = Math.max(0, item.consumed + change);
                return { ...item, consumed: newConsumed };
            }
            return item;
        }));
    };

    const total = items.reduce((sum, item) => sum + (item.price * item.consumed), 0);
    const consumedItems = items.filter(item => item.consumed > 0);

    const handlePost = () => {
        if (consumedItems.length === 0) {
            alert('No items consumed');
            return;
        }

        console.log('Posting minibar charges:', {
            roomNumber,
            items: consumedItems,
            total
        });

        onPost?.(consumedItems, total);
        alert(`Minibar charges ($${total.toFixed(2)}) posted to Room ${roomNumber}`);

        // Reset
        setItems(items.map(item => ({ ...item, consumed: 0 })));
    };

    const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, MinibarItem[]>);

    return (
        <div className="bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <Wine className="text-purple-600" size={24} />
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Minibar Posting</h2>
                        <p className="text-sm text-gray-600">Room {roomNumber}</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                )}
            </div>

            {/* Items */}
            <div className="p-6 max-h-96 overflow-y-auto">
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <div key={category} className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">{category}</h3>
                        <div className="space-y-2">
                            {categoryItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{item.name}</p>
                                        <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => updateQuantity(item.id, -1)}
                                            disabled={item.consumed === 0}
                                            className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="w-8 text-center font-semibold">{item.consumed}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, 1)}
                                            className="p-1 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                                        >
                                            <Plus size={16} />
                                        </button>
                                        <span className="w-20 text-right font-semibold text-gray-900">
                                            ${(item.price * item.consumed).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
                </div>

                {consumedItems.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">Items to post:</p>
                        <ul className="text-sm text-blue-700 space-y-1">
                            {consumedItems.map(item => (
                                <li key={item.id}>
                                    {item.consumed}x {item.name} - ${(item.price * item.consumed).toFixed(2)}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <button
                    onClick={handlePost}
                    disabled={consumedItems.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <Save size={20} />
                    Post to Folio
                </button>
            </div>
        </div>
    );
};

export default MinibarPosting;
