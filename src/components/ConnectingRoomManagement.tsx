import { useState } from 'react';
import {
    Layers, Plus, Save, Edit2, Trash2, ChevronLeft, Link, Info, Check
} from 'lucide-react';

interface ComponentRoom {
    roomTypeId: string;
    count: number;
    roomNumbers: string[];
}

interface ConnectingRoom {
    id: number;
    name: string;
    componentRooms: ComponentRoom[];
    inventoryLogic: string;
    pricingStrategy: string;
    fixedPrice?: number;
    status: string;
}

const ConnectingRoomManagement = () => {
    const [view, setView] = useState<'list' | 'form'>('list');

    // Mock Data for existing Room Types
    const existingRoomTypes = [
        { id: '1', name: 'Super Deluxe King', code: 'SDLX', price: 15000 },
        { id: '2', name: 'Deluxe Twin', code: 'DLXT', price: 12000 },
        { id: '3', name: 'Executive Suite', code: 'EXEC', price: 25000 },
    ];

    const mockPhysicalRooms = [
        { id: '101', number: '101', typeId: '1' },
        { id: '102', number: '102', typeId: '1' },
        { id: '103', number: '103', typeId: '1' },
        { id: '201', number: '201', typeId: '2' },
        { id: '202', number: '202', typeId: '2' },
        { id: '301', number: '301', typeId: '3' },
        { id: '302', number: '302', typeId: '3' },
    ];

    const [connectingRooms, setConnectingRooms] = useState<ConnectingRoom[]>([
        {
            id: 1,
            name: 'Family Connecting Suite',
            componentRooms: [
                { roomTypeId: '1', count: 1, roomNumbers: ['101'] },
                { roomTypeId: '2', count: 1, roomNumbers: ['201'] }
            ],
            inventoryLogic: 'Auto-Sync',
            pricingStrategy: 'Sum of Rates',
            status: 'Active'
        }
    ]);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<ConnectingRoom | null>(null);

    const handleAddNew = () => {
        setEditingId(null);
        setFormData({
            id: Date.now(),
            name: '',
            componentRooms: [{ roomTypeId: '', count: 0, roomNumbers: [] }],
            inventoryLogic: 'Auto-Sync',
            pricingStrategy: 'Sum of Rates',
            status: 'Active'
        });
        setView('form');
    };

    const handleEdit = (room: ConnectingRoom) => {
        setEditingId(room.id);
        setFormData({ ...room });
        setView('form');
    };

    const handleSave = () => {
        if (!formData) return;
        if (editingId) {
            setConnectingRooms(connectingRooms.map(r => r.id === editingId ? formData : r));
        } else {
            setConnectingRooms([...connectingRooms, formData]);
        }
        setView('list');
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this connecting room setup?')) {
            setConnectingRooms(connectingRooms.filter(r => r.id !== id));
        }
    };

    const updateField = (field: keyof ConnectingRoom, value: any) => {
        if (formData) {
            setFormData({ ...formData, [field]: value });
        }
    };

    const addComponentRoom = () => {
        if (formData) {
            updateField('componentRooms', [...formData.componentRooms, { roomTypeId: '', count: 0, roomNumbers: [] }]);
        }
    };

    const removeComponentRoom = (index: number) => {
        if (formData) {
            updateField('componentRooms', formData.componentRooms.filter((_, i) => i !== index));
        }
    };


    const calculateSumPrice = () => {
        if (!formData) return 0;
        return formData.componentRooms.reduce((acc, comp) => {
            const roomType = existingRoomTypes.find(rt => rt.id === comp.roomTypeId);
            return acc + (roomType ? roomType.price * comp.count : 0);
        }, 0);
    };

    const getRoomTypeName = (id: string) => existingRoomTypes.find(rt => rt.id === id)?.name || 'Unknown Room';

    if (view === 'list') {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Connecting Rooms</h1>
                        <p className="text-sm text-gray-500">Manage virtual room combinations and suites</p>
                    </div>
                    <button onClick={handleAddNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
                        <Plus size={18} /> Add Connecting Room
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {connectingRooms.map(room => (
                        <div key={room.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${room.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {room.status}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-800 mt-2">{room.name}</h3>
                                    <div className="mt-2 space-y-1">
                                        {room.componentRooms.map((comp, idx) => (
                                            <div key={idx} className="text-sm text-gray-500 flex items-center gap-2">
                                                <Link size={12} />
                                                <span>
                                                    {comp.count}x {getRoomTypeName(comp.roomTypeId)}
                                                    {comp.roomNumbers && comp.roomNumbers.length > 0 && (
                                                        <span className="text-xs text-gray-400 ml-1">
                                                            ({comp.roomNumbers.join(', ')})
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(room)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(room.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 border-t pt-4">
                                <div>
                                    <span className="block text-xs text-gray-400">Pricing Strategy</span>
                                    <span className="font-medium">{room.pricingStrategy}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400">Inventory</span>
                                    <span className="font-medium">{room.inventoryLogic}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Connecting Room' : 'Add Connecting Room'}</h1>
                        <p className="text-xs text-gray-500">Configure virtual room setup and components</p>
                    </div>
                </div>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
                    <Save size={16} /> Save Changes
                </button>
            </header>

            <main className="max-w-3xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-8">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-2"><Layers size={20} className="text-gray-400" /> Basic Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Joint Room Name *</label>
                                <input
                                    type="text"
                                    value={formData?.name}
                                    onChange={e => updateField('name', e.target.value)}
                                    placeholder="e.g. Family Connecting Suite"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Status *</label>
                                <select
                                    value={formData?.status}
                                    onChange={e => updateField('status', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none"
                                >
                                    <option>Active</option>
                                    <option>Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Component Rooms */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h2 className="text-lg font-semibold flex items-center gap-2"><Link size={20} className="text-gray-400" /> Component Rooms</h2>
                            <button onClick={addComponentRoom} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <Plus size={14} /> Add Room Type
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData?.componentRooms.map((comp, index) => {
                                const availableRooms = mockPhysicalRooms.filter(r => r.typeId === comp.roomTypeId);

                                return (
                                    <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                                        <div className="flex items-start gap-4">
                                            {/* Room Type Column */}
                                            <div className="w-1/3 min-w-[200px] space-y-1">
                                                <label className="text-xs font-medium text-gray-500">Room Type</label>
                                                <select
                                                    value={comp.roomTypeId}
                                                    onChange={e => {
                                                        if (formData) {
                                                            const updatedComponents = formData.componentRooms.map((c, i) =>
                                                                i === index ? { ...c, roomTypeId: e.target.value, roomNumbers: [], count: 0 } : c
                                                            );
                                                            updateField('componentRooms', updatedComponents);
                                                        }
                                                    }}
                                                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none text-sm"
                                                >
                                                    <option value="">Select Room Type</option>
                                                    {existingRoomTypes.map(rt => (
                                                        <option key={rt.id} value={rt.id}>{rt.name} ({rt.code})</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Room Selection Column */}
                                            <div className="flex-1 space-y-1">
                                                <label className="text-xs font-medium text-gray-500">Select Rooms {comp.count > 0 && <span className="text-blue-600">({comp.count})</span>}</label>

                                                {comp.roomTypeId && availableRooms.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2 min-h-[38px] items-center">
                                                        {availableRooms.map(room => {
                                                            const isSelected = comp.roomNumbers?.includes(room.number);
                                                            return (
                                                                <button
                                                                    key={room.id}
                                                                    onClick={() => {
                                                                        if (formData) {
                                                                            const newNumbers = isSelected
                                                                                ? (comp.roomNumbers || []).filter(n => n !== room.number)
                                                                                : [...(comp.roomNumbers || []), room.number];

                                                                            const updatedComponents = formData.componentRooms.map((c, i) =>
                                                                                i === index ? { ...c, roomNumbers: newNumbers, count: newNumbers.length } : c
                                                                            );
                                                                            updateField('componentRooms', updatedComponents);
                                                                        }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-all ${isSelected
                                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                                                        }`}
                                                                >
                                                                    {room.number}
                                                                    {isSelected && <Check size={12} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="h-[38px] flex items-center text-xs text-gray-400 italic px-2 border border-transparent">
                                                        {comp.roomTypeId ? 'No rooms available' : 'Select a room type first'}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <button
                                                onClick={() => removeComponentRoom(index)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg mt-6"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-3 rounded border border-blue-100">
                            <Info size={14} />
                            <span>Inventory Logic: Auto-Sync enabled. Booking this suite automatically reduces availability of component rooms.</span>
                        </div>
                    </div>

                    {/* Pricing Strategy */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-2"><Save size={20} className="text-gray-400" /> Pricing Strategy</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Strategy Type</label>
                                <select
                                    value={formData?.pricingStrategy}
                                    onChange={e => updateField('pricingStrategy', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none"
                                >
                                    <option>Sum of Rates</option>
                                    <option>Fixed Rate</option>
                                </select>
                            </div>

                            {formData?.pricingStrategy === 'Sum of Rates' ? (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Calculated Price</label>
                                    <div className="px-3 py-2 bg-gray-100 border rounded-lg text-gray-600 font-mono">
                                        {calculateSumPrice()} (Auto-calculated)
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1 animate-fadeIn">
                                    <label className="text-sm font-medium text-gray-700">Fixed Combo Rate</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            value={formData?.fixedPrice || ''}
                                            onChange={e => updateField('fixedPrice', parseFloat(e.target.value))}
                                            placeholder="Enter rate"
                                            className="w-full pl-8 pr-3 py-2 border rounded-lg outline-none font-semibold text-blue-600"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ConnectingRoomManagement;
