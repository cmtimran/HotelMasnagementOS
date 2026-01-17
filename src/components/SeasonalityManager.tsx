import { useState } from 'react';
import { Calendar, TrendingUp, DollarSign, Plus, X, Save } from 'lucide-react';

interface Season {
    id: string;
    name: string;
    type: 'high' | 'low' | 'peak' | 'off-peak';
    startDate: string;
    endDate: string;
    rateMultiplier: number; // 1.5 = 150%, 0.8 = 80%
    color: string;
}

const SeasonalityManager = () => {
    const [seasons, setSeasons] = useState<Season[]>([
        {
            id: '1',
            name: 'Summer Peak',
            type: 'peak',
            startDate: '2024-06-01',
            endDate: '2024-08-31',
            rateMultiplier: 1.5,
            color: '#ef4444'
        },
        {
            id: '2',
            name: 'Winter High',
            type: 'high',
            startDate: '2024-12-15',
            endDate: '2025-01-15',
            rateMultiplier: 1.3,
            color: '#f59e0b'
        },
        {
            id: '3',
            name: 'Off Season',
            type: 'off-peak',
            startDate: '2024-09-01',
            endDate: '2024-11-30',
            rateMultiplier: 0.8,
            color: '#10b981'
        }
    ]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newSeason, setNewSeason] = useState<Partial<Season>>({
        name: '',
        type: 'high',
        startDate: '',
        endDate: '',
        rateMultiplier: 1.0,
        color: '#3b82f6'
    });

    const handleAddSeason = () => {
        if (newSeason.name && newSeason.startDate && newSeason.endDate) {
            const season: Season = {
                id: Date.now().toString(),
                name: newSeason.name,
                type: newSeason.type as Season['type'],
                startDate: newSeason.startDate,
                endDate: newSeason.endDate,
                rateMultiplier: newSeason.rateMultiplier || 1.0,
                color: newSeason.color || '#3b82f6'
            };
            setSeasons([...seasons, season]);
            setShowAddForm(false);
            setNewSeason({
                name: '',
                type: 'high',
                startDate: '',
                endDate: '',
                rateMultiplier: 1.0,
                color: '#3b82f6'
            });
        }
    };

    const deleteSeason = (id: string) => {
        setSeasons(seasons.filter(s => s.id !== id));
    };

    const getTypeLabel = (type: string) => {
        const labels = {
            'peak': 'Peak Season',
            'high': 'High Season',
            'low': 'Low Season',
            'off-peak': 'Off-Peak'
        };
        return labels[type as keyof typeof labels];
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Calendar size={28} />
                                Seasonality Management
                            </h1>
                            <p className="text-gray-600">Configure seasonal rates and pricing strategies</p>
                        </div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus size={18} />
                            Add Season
                        </button>
                    </div>
                </div>

                {/* Add Season Form */}
                {showAddForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Add New Season</h2>
                            <button onClick={() => setShowAddForm(false)}>
                                <X size={20} className="text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Season Name</label>
                                <input
                                    type="text"
                                    value={newSeason.name}
                                    onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Summer Peak"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Season Type</label>
                                <select
                                    value={newSeason.type}
                                    onChange={(e) => setNewSeason({ ...newSeason, type: e.target.value as Season['type'] })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="peak">Peak Season</option>
                                    <option value="high">High Season</option>
                                    <option value="low">Low Season</option>
                                    <option value="off-peak">Off-Peak</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={newSeason.startDate}
                                    onChange={(e) => setNewSeason({ ...newSeason, startDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={newSeason.endDate}
                                    onChange={(e) => setNewSeason({ ...newSeason, endDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Multiplier</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        max="3.0"
                                        value={newSeason.rateMultiplier}
                                        onChange={(e) => setNewSeason({ ...newSeason, rateMultiplier: parseFloat(e.target.value) })}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-600">
                                        ({((newSeason.rateMultiplier || 1) * 100).toFixed(0)}%)
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <input
                                    type="color"
                                    value={newSeason.color}
                                    onChange={(e) => setNewSeason({ ...newSeason, color: e.target.value })}
                                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAddSeason}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Save size={18} />
                            Save Season
                        </button>
                    </div>
                )}

                {/* Seasons List */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Configured Seasons</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {seasons.map((season) => (
                            <div key={season.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4 flex-1">
                                        <div
                                            className="w-4 h-4 rounded-full mt-1"
                                            style={{ backgroundColor: season.color }}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">{season.name}</h3>
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                    {getTypeLabel(season.type)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-600">Period</p>
                                                    <p className="font-medium text-gray-900">
                                                        {season.startDate} to {season.endDate}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Rate Adjustment</p>
                                                    <p className="font-medium text-gray-900 flex items-center gap-1">
                                                        {season.rateMultiplier > 1 ? (
                                                            <TrendingUp size={16} className="text-red-600" />
                                                        ) : (
                                                            <TrendingUp size={16} className="text-green-600 transform rotate-180" />
                                                        )}
                                                        {(season.rateMultiplier * 100).toFixed(0)}%
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Example (Base $100)</p>
                                                    <p className="font-medium text-gray-900 flex items-center gap-1">
                                                        <DollarSign size={16} />
                                                        {(100 * season.rateMultiplier).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteSeason(season.id)}
                                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {seasons.length === 0 && (
                            <div className="p-12 text-center text-gray-500">
                                <Calendar size={48} className="mx-auto mb-3 text-gray-400" />
                                <p>No seasons configured</p>
                                <p className="text-sm">Add your first season to start managing seasonal rates</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Rate Multiplier 1.5 = 150% of base rate (50% increase)</li>
                        <li>• Rate Multiplier 0.8 = 80% of base rate (20% discount)</li>
                        <li>• Seasons automatically apply to rate calendar</li>
                        <li>• Multiple seasons can overlap (highest multiplier wins)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SeasonalityManager;
