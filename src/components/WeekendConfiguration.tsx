import { useState } from 'react';
import { Calendar, Save } from 'lucide-react';

interface WeekendConfig {
    weekendDays: string[];
    applyWeekendRates: boolean;
    weekendRateMultiplier: number;
}

const WeekendConfiguration = () => {
    const [config, setConfig] = useState<WeekendConfig>({
        weekendDays: ['Saturday', 'Sunday'],
        applyWeekendRates: true,
        weekendRateMultiplier: 1.2
    });

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const toggleDay = (day: string) => {
        if (config.weekendDays.includes(day)) {
            setConfig({
                ...config,
                weekendDays: config.weekendDays.filter(d => d !== day)
            });
        } else {
            setConfig({
                ...config,
                weekendDays: [...config.weekendDays, day]
            });
        }
    };

    const handleSave = () => {
        console.log('Saving weekend configuration:', config);
        alert('Weekend configuration saved successfully!');
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Calendar size={28} />
                        Weekend Configuration
                    </h1>
                    <p className="text-gray-600">Configure weekend days and pricing rules</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekend Days Selection</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Select which days are considered weekends in your region
                    </p>
                    <div className="grid grid-cols-7 gap-2">
                        {allDays.map((day) => {
                            const isWeekend = config.weekendDays.includes(day);
                            return (
                                <button
                                    key={day}
                                    onClick={() => toggleDay(day)}
                                    className={`p-3 rounded-lg text-center transition-colors ${isWeekend
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    <div className="text-xs font-medium">{day.slice(0, 3)}</div>
                                    <div className="text-xs mt-1">{day}</div>
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-900">
                            <strong>Selected weekends:</strong> {config.weekendDays.join(', ')}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekend Rate Settings</h2>

                    <div className="mb-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.applyWeekendRates}
                                onChange={(e) => setConfig({ ...config, applyWeekendRates: e.target.checked })}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div>
                                <span className="font-medium text-gray-900">Apply Weekend Rates</span>
                                <p className="text-sm text-gray-600">Automatically adjust rates on weekend days</p>
                            </div>
                        </label>
                    </div>

                    {config.applyWeekendRates && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Weekend Rate Multiplier
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={config.weekendRateMultiplier}
                                    onChange={(e) => setConfig({ ...config, weekendRateMultiplier: parseFloat(e.target.value) })}
                                    className="flex-1"
                                />
                                <div className="text-right min-w-[100px]">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {(config.weekendRateMultiplier * 100).toFixed(0)}%
                                    </div>
                                    <div className="text-xs text-gray-600">of base rate</div>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-white rounded border border-gray-200">
                                    <p className="text-gray-600 mb-1">Weekday Rate</p>
                                    <p className="text-xl font-bold text-gray-900">$100.00</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                                    <p className="text-blue-600 mb-1">Weekend Rate</p>
                                    <p className="text-xl font-bold text-blue-900">
                                        ${(100 * config.weekendRateMultiplier).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSave}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Save size={20} />
                    Save Configuration
                </button>

                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Common Configurations:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• <strong>Western:</strong> Saturday, Sunday</li>
                        <li>• <strong>Middle East:</strong> Friday, Saturday</li>
                        <li>• <strong>Custom:</strong> Select any combination</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default WeekendConfiguration;
