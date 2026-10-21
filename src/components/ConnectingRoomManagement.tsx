import { useState } from 'react';
import {
    Layers, Plus, Save, Edit2, Trash2, ChevronLeft, Link, Check, ShieldCheck, Search
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

const STORAGE_KEY = 'hotel_connecting_rooms_v1';

// Real property room types
const existingRoomTypes = [
    { id: '1', name: 'Deluxe Double', code: 'DLX', price: 3000 },
    { id: '2', name: 'Superior King', code: 'SUPK', price: 4500 },
    { id: '3', name: 'Executive Suite', code: 'EXEC', price: 6500 },
    { id: '4', name: 'Standard Single', code: 'STND', price: 2200 },
    { id: '5', name: 'Presidential Suite', code: 'PRES', price: 18000 },
];

// Physical rooms mapping to actual hotel inventory
const mockPhysicalRooms = [
    // Floor 1
    { id: '101', number: '101', typeId: '1' },
    { id: '102', number: '102', typeId: '1' },
    { id: '103', number: '103', typeId: '2' },
    { id: '104', number: '104', typeId: '3' },
    { id: '105', number: '105', typeId: '4' },
    { id: '106', number: '106', typeId: '4' },
    { id: '107', number: '107', typeId: '1' },
    { id: '108', number: '108', typeId: '2' },
    // Floor 2
    { id: '201', number: '201', typeId: '2' },
    { id: '202', number: '202', typeId: '2' },
    { id: '203', number: '203', typeId: '3' },
    { id: '204', number: '204', typeId: '1' },
    { id: '205', number: '205', typeId: '4' },
    { id: '206', number: '206', typeId: '1' },
    { id: '207', number: '207', typeId: '1' },
    { id: '208', number: '208', typeId: '2' },
    // Floor 3
    { id: '301', number: '301', typeId: '1' },
    { id: '302', number: '302', typeId: '4' },
    { id: '303', number: '303', typeId: '3' },
    { id: '304', number: '304', typeId: '1' },
    { id: '305', number: '305', typeId: '1' },
    { id: '306', number: '306', typeId: '2' },
    { id: '307', number: '307', typeId: '1' },
    { id: '308', number: '308', typeId: '2' },
    // Floor 4 & 5
    { id: '401', number: '401', typeId: '3' },
    { id: '402', number: '402', typeId: '3' },
    { id: '403', number: '403', typeId: '1' },
    { id: '404', number: '404', typeId: '2' },
    { id: '501', number: '501', typeId: '5' },
    { id: '502', number: '502', typeId: '3' },
];

const INITIAL_CONNECTING_ROOMS: ConnectingRoom[] = [
    {
        id: 1,
        name: 'Family Interconnecting Deluxe Suite (101-102)',
        componentRooms: [
            { roomTypeId: '1', count: 1, roomNumbers: ['101'] },
            { roomTypeId: '1', count: 1, roomNumbers: ['102'] }
        ],
        inventoryLogic: 'Auto-Sync',
        pricingStrategy: 'Sum of Rates',
        status: 'Active'
    },
    {
        id: 2,
        name: 'Executive & Superior Adjoining Suite (201-202)',
        componentRooms: [
            { roomTypeId: '2', count: 1, roomNumbers: ['201'] },
            { roomTypeId: '2', count: 1, roomNumbers: ['202'] }
        ],
        inventoryLogic: 'Auto-Sync',
        pricingStrategy: 'Fixed Rate',
        fixedPrice: 8500,
        status: 'Active'
    }
];

const ConnectingRoomManagement = () => {
    const [view, setView] = useState<'list' | 'form'>('list');

    const [connectingRooms, setConnectingRooms] = useState<ConnectingRoom[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch {
            // ignore
        }
        return INITIAL_CONNECTING_ROOMS;
    });

    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<ConnectingRoom | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const persistRooms = (updated: ConnectingRoom[]) => {
        setConnectingRooms(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
            // ignore
        }
    };

    const handleAddNew = () => {
        setEditingId(null);
        setFormData({
            id: Date.now(),
            name: '',
            componentRooms: [{ roomTypeId: '1', count: 1, roomNumbers: ['101'] }],
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
        if (!formData || !formData.name.trim()) {
            alert('Please provide a name for the connecting room suite.');
            return;
        }
        let updated: ConnectingRoom[];
        if (editingId) {
            updated = connectingRooms.map(r => r.id === editingId ? formData : r);
        } else {
            updated = [...connectingRooms, formData];
        }
        persistRooms(updated);
        setView('list');
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Are you sure you want to remove this connecting room setup?')) {
            const updated = connectingRooms.filter(r => r.id !== id);
            persistRooms(updated);
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

    const calculateSumPrice = (roomToCalc?: ConnectingRoom | null) => {
        const target = roomToCalc || formData;
        if (!target) return 0;
        return target.componentRooms.reduce((acc, comp) => {
            const roomType = existingRoomTypes.find(rt => rt.id === comp.roomTypeId);
            return acc + (roomType ? roomType.price * (comp.count || comp.roomNumbers?.length || 1) : 0);
        }, 0);
    };

    const getRoomTypeName = (id: string) => existingRoomTypes.find(rt => rt.id === id)?.name || 'Unknown Room';

    const filteredConnectingRooms = connectingRooms.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.componentRooms.some(c => (c.roomNumbers || []).some(n => n.includes(searchTerm)))
    );

    if (view === 'list') {
        return (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200/90 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Layers size={20} />
                            </span>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Connecting & Joint Rooms</h1>
                                <p className="text-xs sm:text-sm text-gray-500">Virtual interconnecting suites, parent-child inventory locks & synchronized pricing</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input
                                type="text"
                                placeholder="Search suites, room #..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-60 shadow-2xs"
                            />
                        </div>
                        <button
                            onClick={handleAddNew}
                            className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-700 font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                        >
                            <Plus size={15} /> Add Connecting Suite
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredConnectingRooms.length === 0 ? (
                        <div className="col-span-full bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-400">
                            No connecting suites found matching your search.
                        </div>
                    ) : (
                        filteredConnectingRooms.map(room => {
                        const sumPrice = calculateSumPrice(room);
                        const displayPrice = room.pricingStrategy === 'Fixed Rate' && room.fixedPrice ? room.fixedPrice : sumPrice;

                        return (
                            <div key={room.id} className="bg-white p-5 rounded-xl shadow-xs border border-gray-200 hover:shadow-md transition-shadow group flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${room.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                                            {room.status}
                                        </span>
                                        <div className="flex gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(room)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(room.id)}
                                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-base font-bold text-gray-900 leading-snug">{room.name}</h3>

                                    <div className="mt-3 space-y-1.5 bg-gray-50/80 p-3 rounded-lg border border-gray-100">
                                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Link size={12} className="text-blue-600" /> Linked Physical Rooms
                                        </div>
                                        {room.componentRooms.map((comp, idx) => (
                                            <div key={idx} className="text-xs text-gray-700 flex items-center justify-between">
                                                <span className="font-medium text-gray-800">
                                                    {comp.count || comp.roomNumbers?.length || 1}x {getRoomTypeName(comp.roomTypeId)}
                                                </span>
                                                {comp.roomNumbers && comp.roomNumbers.length > 0 && (
                                                    <span className="text-[11px] font-mono font-semibold bg-white border border-gray-200 px-1.5 py-0.5 rounded text-blue-700">
                                                        Rooms {comp.roomNumbers.join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 border-t border-gray-100 pt-3 mt-4">
                                    <div>
                                        <span className="block text-[10px] uppercase font-bold text-gray-400">Rate Strategy</span>
                                        <span className="font-semibold text-gray-800">{room.pricingStrategy}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] uppercase font-bold text-gray-400">Effective Rate</span>
                                        <span className="font-bold font-mono text-emerald-700 text-sm">৳{displayPrice.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    }))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-xs">
                <div className="flex items-center gap-3">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Connecting Suite' : 'Create New Connecting Suite'}</h1>
                        <p className="text-xs text-gray-500">Configure virtual interconnected layout, component units and sync rules</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm flex items-center gap-2 shadow-xs transition-colors"
                >
                    <Save size={16} /> Save Configuration
                </button>
            </header>

            <main className="max-w-3xl mx-auto p-4 sm:p-6">
                <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                            <Layers size={16} className="text-blue-600" /> Basic Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Joint Suite Name *</label>
                                <input
                                    type="text"
                                    value={formData?.name || ''}
                                    onChange={e => updateField('name', e.target.value)}
                                    placeholder="e.g. Family Connecting Deluxe (101-102)"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Operational Status *</label>
                                <select
                                    value={formData?.status || 'Active'}
                                    onChange={e => updateField('status', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Component Rooms */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Link size={16} className="text-blue-600" /> Component Rooms & Numbers
                            </h2>
                            <button
                                onClick={addComponentRoom}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-md"
                            >
                                <Plus size={13} /> Add Room Category
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData?.componentRooms.map((comp, index) => {
                                const availableRooms = mockPhysicalRooms.filter(r => r.typeId === comp.roomTypeId);

                                return (
                                    <div key={index} className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200">
                                        <div className="flex items-start gap-4">
                                            {/* Room Type Column */}
                                            <div className="w-1/3 min-w-[180px] space-y-1">
                                                <label className="text-[11px] font-bold text-gray-500 uppercase">Room Category</label>
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
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none text-xs font-semibold text-gray-800"
                                                >
                                                    <option value="">Select Room Type</option>
                                                    {existingRoomTypes.map(rt => (
                                                        <option key={rt.id} value={rt.id}>
                                                            {rt.name} (৳{rt.price.toLocaleString()})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Room Selection Column */}
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[11px] font-bold text-gray-500 uppercase flex items-center justify-between">
                                                    <span>Assign Physical Rooms</span>
                                                    {comp.roomNumbers && comp.roomNumbers.length > 0 && (
                                                        <span className="text-blue-600 font-bold">({comp.roomNumbers.length} selected)</span>
                                                    )}
                                                </label>

                                                {comp.roomTypeId && availableRooms.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 min-h-[38px] items-center pt-1">
                                                        {availableRooms.map(room => {
                                                            const isSelected = comp.roomNumbers?.includes(room.number);
                                                            return (
                                                                <button
                                                                    key={room.id}
                                                                    type="button"
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
                                                                    className={`px-2.5 py-1 rounded-md text-xs font-bold border flex items-center gap-1 transition-all ${
                                                                        isSelected
                                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                                                    }`}
                                                                >
                                                                    <span>{room.number}</span>
                                                                    {isSelected && <Check size={12} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="h-[38px] flex items-center text-xs text-gray-400 italic px-2">
                                                        {comp.roomTypeId ? 'No rooms configured for this category' : 'Select a room type first'}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <button
                                                type="button"
                                                onClick={() => removeComponentRoom(index)}
                                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg mt-5 transition-colors"
                                                title="Remove Category"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50/80 p-3 rounded-lg border border-blue-100 font-medium">
                            <ShieldCheck size={16} className="text-blue-600 shrink-0" />
                            <span><strong>Inventory Auto-Sync:</strong> Booking this joint suite will automatically lock and mark all component physical rooms as occupied across Front Desk and Room Rack.</span>
                        </div>
                    </div>

                    {/* Pricing Strategy */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2">
                            <Save size={16} className="text-blue-600" /> Pricing & Billing Strategy
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Pricing Mode</label>
                                <select
                                    value={formData?.pricingStrategy || 'Sum of Rates'}
                                    onChange={e => updateField('pricingStrategy', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none font-semibold text-gray-800"
                                >
                                    <option value="Sum of Rates">Sum of Rates (Dynamic Aggregate)</option>
                                    <option value="Fixed Rate">Fixed Rate (Package Combo Discount)</option>
                                </select>
                            </div>

                            {formData?.pricingStrategy === 'Sum of Rates' ? (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Calculated Suite Rate</label>
                                    <div className="px-3 py-2 bg-emerald-50/80 border border-emerald-200 rounded-lg text-emerald-800 font-mono font-bold text-sm">
                                        ৳{calculateSumPrice().toLocaleString()} <span className="text-xs font-normal text-emerald-600">(Sum of component tariffs)</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Fixed Suite Tariff (BDT)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500 font-bold">৳</span>
                                        <input
                                            type="number"
                                            value={formData?.fixedPrice || ''}
                                            onChange={e => updateField('fixedPrice', parseFloat(e.target.value) || 0)}
                                            placeholder="Enter combo rate"
                                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg outline-none font-bold text-blue-600 text-sm focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default ConnectingRoomManagement;
