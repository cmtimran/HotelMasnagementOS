import { useState } from 'react';
import { Building2, Plus, Save, Trash2 } from 'lucide-react';

interface Floor {
    id: string;
    floorNumber: number;
    name: string;
    roomCount: number;
}

const AutoFloorGeneration = () => {
    const [totalFloors, setTotalFloors] = useState(5);
    const [startingFloor, setStartingFloor] = useState(1);
    const [roomsPerFloor, setRoomsPerFloor] = useState(10);
    const [namePattern, setNamePattern] = useState('Floor {n}');
    const [generatedFloors, setGeneratedFloors] = useState<Floor[]>([]);

    const handleGenerate = () => {
        const floors: Floor[] = [];
        for (let i = 0; i < totalFloors; i++) {
            const floorNum = startingFloor + i;
            floors.push({
                id: `floor-${floorNum}`,
                floorNumber: floorNum,
                name: namePattern.replace('{n}', floorNum.toString()),
                roomCount: roomsPerFloor
            });
        }
        setGeneratedFloors(floors);
    };

    const handleSave = () => {
        console.log('Saving floors:', generatedFloors);
        alert(`${generatedFloors.length} floors created successfully!`);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Building2 size={28} />
                        Auto-Floor Generation
                    </h1>
                    <p className="text-gray-600">Automatically generate multiple floors with one click</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Floors</label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={totalFloors}
                                onChange={(e) => setTotalFloors(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Starting Floor Number</label>
                            <input
                                type="number"
                                value={startingFloor}
                                onChange={(e) => setStartingFloor(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rooms Per Floor</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={roomsPerFloor}
                                onChange={(e) => setRoomsPerFloor(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name Pattern</label>
                            <input
                                type="text"
                                value={namePattern}
                                onChange={(e) => setNamePattern(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Floor {n}"
                            />
                            <p className="text-xs text-gray-500 mt-1">Use {'{n}'} for floor number</p>
                        </div>
                    </div>
                    <button
                        onClick={handleGenerate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        Generate Floors
                    </button>
                </div>

                {generatedFloors.length > 0 && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Preview ({generatedFloors.length} floors)</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setGeneratedFloors([])}
                                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    <Trash2 size={16} />
                                    Clear
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    <Save size={16} />
                                    Save All Floors
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {generatedFloors.map((floor) => (
                                    <div key={floor.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-500">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-lg font-semibold text-gray-900">{floor.name}</span>
                                            <span className="text-sm text-gray-500">#{floor.floorNumber}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">{floor.roomCount} rooms</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Examples:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• 5 floors starting from 1: Floor 1, Floor 2, Floor 3, Floor 4, Floor 5</li>
                        <li>• 3 floors starting from 10: Floor 10, Floor 11, Floor 12</li>
                        <li>• Pattern "Level {'{n}'}": Level 1, Level 2, Level 3...</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AutoFloorGeneration;
