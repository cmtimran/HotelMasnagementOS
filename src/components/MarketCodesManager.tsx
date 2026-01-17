import { useState } from 'react';
import { Tag, Plus, X, Save, TrendingUp } from 'lucide-react';

interface MarketCode {
    id: string;
    code: string;
    name: string;
    description: string;
    color: string;
    isActive: boolean;
}

const MarketCodesManager = () => {
    const [marketCodes, setMarketCodes] = useState<MarketCode[]>([
        { id: '1', code: 'VIP', name: 'VIP Guests', description: 'High-value VIP guests', color: '#fbbf24', isActive: true },
        { id: '2', code: 'CORP', name: 'Corporate', description: 'Business travelers', color: '#3b82f6', isActive: true },
        { id: '3', code: 'OTA', name: 'Online Travel Agency', description: 'Booking.com, Expedia, etc.', color: '#10b981', isActive: true },
        { id: '4', code: 'LEISURE', name: 'Leisure', description: 'Vacation travelers', color: '#8b5cf6', isActive: true },
        { id: '5', code: 'GROUP', name: 'Group Booking', description: 'Tour groups, conferences', color: '#ef4444', isActive: true }
    ]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newCode, setNewCode] = useState({
        code: '',
        name: '',
        description: '',
        color: '#3b82f6'
    });

    const handleAdd = () => {
        if (newCode.code && newCode.name) {
            const marketCode: MarketCode = {
                id: Date.now().toString(),
                code: newCode.code.toUpperCase(),
                name: newCode.name,
                description: newCode.description,
                color: newCode.color,
                isActive: true
            };
            setMarketCodes([...marketCodes, marketCode]);
            setShowAddForm(false);
            setNewCode({ code: '', name: '', description: '', color: '#3b82f6' });
        }
    };

    const toggleActive = (id: string) => {
        setMarketCodes(marketCodes.map(mc =>
            mc.id === id ? { ...mc, isActive: !mc.isActive } : mc
        ));
    };

    const deleteCode = (id: string) => {
        setMarketCodes(marketCodes.filter(mc => mc.id !== id));
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Tag size={28} />
                                Market Codes
                            </h1>
                            <p className="text-gray-600">Categorize guests for reporting and analysis</p>
                        </div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus size={18} />
                            Add Market Code
                        </button>
                    </div>
                </div>

                {showAddForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Add Market Code</h2>
                            <button onClick={() => setShowAddForm(false)}>
                                <X size={20} className="text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                                <input
                                    type="text"
                                    value={newCode.code}
                                    onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                                    placeholder="e.g., VIP"
                                    maxLength={10}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newCode.name}
                                    onChange={(e) => setNewCode({ ...newCode, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., VIP Guests"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={newCode.description}
                                    onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., High-value VIP guests"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <input
                                    type="color"
                                    value={newCode.color}
                                    onChange={(e) => setNewCode({ ...newCode, color: e.target.value })}
                                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Save size={18} />
                            Save Market Code
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Market Segments</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {marketCodes.map((mc) => (
                            <div key={mc.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: mc.color }}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-semibold text-gray-900">{mc.name}</h3>
                                                <span className="px-2 py-1 text-xs font-mono font-bold rounded bg-gray-100 text-gray-700">
                                                    {mc.code}
                                                </span>
                                                {!mc.isActive && (
                                                    <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">{mc.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleActive(mc.id)}
                                            className={`px-3 py-1 text-sm rounded-lg ${mc.isActive
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                }`}
                                        >
                                            {mc.isActive ? 'Active' : 'Inactive'}
                                        </button>
                                        <button
                                            onClick={() => deleteCode(mc.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <TrendingUp size={18} />
                        Usage in Reports:
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Revenue by Market Segment</li>
                        <li>• Occupancy by Guest Type</li>
                        <li>• ADR comparison across segments</li>
                        <li>• Marketing campaign effectiveness</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default MarketCodesManager;
