import { useState } from 'react';
import { Percent, Plus, X, Save } from 'lucide-react';

interface CancellationRule {
    id: string;
    daysBeforeCheckIn: number;
    chargePercentage: number;
    description: string;
}

const TieredCancellation = () => {
    const [rules, setRules] = useState<CancellationRule[]>([
        { id: '1', daysBeforeCheckIn: 30, chargePercentage: 0, description: 'Free cancellation' },
        { id: '2', daysBeforeCheckIn: 7, chargePercentage: 50, description: '50% charge' },
        { id: '3', daysBeforeCheckIn: 3, chargePercentage: 100, description: 'Full charge' }
    ]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newRule, setNewRule] = useState({ daysBeforeCheckIn: 14, chargePercentage: 25, description: '' });

    const handleAdd = () => {
        if (newRule.daysBeforeCheckIn >= 0 && newRule.chargePercentage >= 0) {
            setRules([...rules, {
                id: Date.now().toString(),
                ...newRule,
                description: newRule.description || `${newRule.chargePercentage}% charge`
            }].sort((a, b) => b.daysBeforeCheckIn - a.daysBeforeCheckIn));
            setShowAddForm(false);
            setNewRule({ daysBeforeCheckIn: 14, chargePercentage: 25, description: '' });
        }
    };

    const deleteRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Percent size={28} />
                                Tiered Cancellation Rules
                            </h1>
                            <p className="text-gray-600">Configure flexible cancellation policies</p>
                        </div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Plus size={18} />
                            Add Rule
                        </button>
                    </div>
                </div>

                {showAddForm && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Add Cancellation Rule</h2>
                            <button onClick={() => setShowAddForm(false)}>
                                <X size={20} className="text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Days Before Check-in</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={newRule.daysBeforeCheckIn}
                                    onChange={(e) => setNewRule({ ...newRule, daysBeforeCheckIn: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Charge Percentage</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={newRule.chargePercentage}
                                    onChange={(e) => setNewRule({ ...newRule, chargePercentage: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={newRule.description}
                                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Optional description"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Save size={18} />
                            Save Rule
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Cancellation Policy</h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {rules.map((rule, index) => (
                                <div key={rule.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {rule.daysBeforeCheckIn === 0 ? 'Same day' : `${rule.daysBeforeCheckIn}+ days before`}
                                            </p>
                                            <p className="text-sm text-gray-600">{rule.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl font-bold text-blue-600">{rule.chargePercentage}%</span>
                                        <button
                                            onClick={() => deleteRule(rule.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Example Policy:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Cancel 30+ days before: Free cancellation (0% charge)</li>
                        <li>• Cancel 7-29 days before: 50% cancellation fee</li>
                        <li>• Cancel 3-6 days before: 100% cancellation fee</li>
                        <li>• Cancel 0-2 days before or no-show: Full charge</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TieredCancellation;
