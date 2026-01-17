import { useState } from 'react';
import { Package, Plus, Search, Camera, MapPin, Calendar, User } from 'lucide-react';

interface LostItem {
    id: string;
    itemName: string;
    description: string;
    locationFound: string;
    finderName: string;
    dateFound: string;
    category: string;
    status: 'unclaimed' | 'claimed' | 'disposed';
    expiryDate: string;
    photoUrl?: string;
}

const LostAndFound = () => {
    const [items] = useState<LostItem[]>([
        {
            id: '1',
            itemName: 'iPhone 13 Pro',
            description: 'Black iPhone with cracked screen protector',
            locationFound: 'Room 305',
            finderName: 'Maria (Housekeeping)',
            dateFound: '2024-01-15',
            category: 'Electronics',
            status: 'unclaimed',
            expiryDate: '2024-07-15'
        },
        {
            id: '2',
            itemName: 'Gold Watch',
            description: 'Rolex watch with leather strap',
            locationFound: 'Restaurant',
            finderName: 'John (Waiter)',
            dateFound: '2024-01-14',
            category: 'Jewelry',
            status: 'unclaimed',
            expiryDate: '2024-07-14'
        }
    ]);

    const [_showAddForm, _setShowAddForm] = useState(false);

    const getStatusBadge = (status: string) => {
        const colors = {
            unclaimed: 'bg-yellow-100 text-yellow-800',
            claimed: 'bg-green-100 text-green-800',
            disposed: 'bg-gray-100 text-gray-800'
        };
        return colors[status as keyof typeof colors];
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Lost & Found</h1>
                        <p className="text-gray-600">Track and manage lost items</p>
                    </div>
                    <button
                        onClick={() => _setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        Add Item
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Unclaimed Items</span>
                        <Package className="text-yellow-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                        {items.filter(i => i.status === 'unclaimed').length}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Claimed This Month</span>
                        <Package className="text-green-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">12</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Expiring Soon</span>
                        <Calendar className="text-red-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">3</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by item name, location, or finder..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>All Status</option>
                        <option>Unclaimed</option>
                        <option>Claimed</option>
                        <option>Disposed</option>
                    </select>
                </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="h-48 bg-gray-200 flex items-center justify-center">
                            {item.photoUrl ? (
                                <img src={item.photoUrl} alt={item.itemName} className="w-full h-full object-cover" />
                            ) : (
                                <Camera size={48} className="text-gray-400" />
                            )}
                        </div>
                        <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{item.itemName}</h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(item.status)}`}>
                                    {item.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span>{item.locationFound}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User size={16} className="text-gray-400" />
                                    <span>{item.finderName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-gray-400" />
                                    <span>Found: {item.dateFound}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-red-400" />
                                    <span className="text-red-600">Expires: {item.expiryDate}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                                    Mark Claimed
                                </button>
                                <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LostAndFound;
