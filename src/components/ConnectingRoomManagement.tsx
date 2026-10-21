import { useState } from 'react';
import {
    Layers, Plus, Save, Edit2, Trash2, ChevronLeft, Link as LinkIcon, Check, ShieldCheck, Search, Filter
} from 'lucide-react';
import PageHeader from './common/PageHeader';

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
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

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

    const filteredConnectingRooms = connectingRooms.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.componentRooms.some(c => (c.roomNumbers || []).some(n => n.includes(searchTerm)));
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // KPI Metrics
    const totalSuites = connectingRooms.length;
    const activeSuites = connectingRooms.filter(r => r.status === 'Active').length;
    const totalLinkedRooms = connectingRooms.reduce((acc, r) =>
        acc + r.componentRooms.reduce((cAcc, c) => cAcc + (c.roomNumbers?.length || c.count || 1), 0), 0
    );
    const avgTariff = totalSuites > 0
        ? Math.round(connectingRooms.reduce((acc, r) => {
            const price = r.pricingStrategy === 'Fixed Rate' && r.fixedPrice ? r.fixedPrice : calculateSumPrice(r);
            return acc + price;
        }, 0) / totalSuites)
        : 0;

    if (view === 'list') {
        return (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
                {/* Standard Page Header */}
                <PageHeader
                    title="Connecting & Joint Rooms"
                    subtitle="Virtual interconnecting suites, parent-child inventory locks & synchronized pricing"
                    icon={<Layers className="size-6 text-primary" />}
                    actions={
                        <button
                            onClick={handleAddNew}
                            className="btn-primary flex items-center gap-2 cursor-pointer"
                        >
                            <Plus size={15} /> Add Connecting Suite
                        </button>
                    }
                />

                {/* 4 Standardized Thesis KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Suites</span>
                            <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                                <Layers size={16} />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{totalSuites}</div>
                        <div className="mt-1 text-[11px] text-slate-400 font-medium">Configured suites</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Suites</span>
                            <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <ShieldCheck size={16} />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-black text-emerald-600 tracking-tight">{activeSuites}</div>
                        <div className="mt-1 text-[11px] text-emerald-600/80 font-medium">Bookable across PMS</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked Units</span>
                            <div className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <LinkIcon size={16} />
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{totalLinkedRooms}</div>
                        <div className="mt-1 text-[11px] text-slate-400 font-medium">Physical rooms assigned</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Tariff</span>
                            <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs font-mono">
                                ৳
                            </div>
                        </div>
                        <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight font-mono">
                            ৳{avgTariff.toLocaleString()}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400 font-medium">Mean rate per night</div>
                    </div>
                </div>

                {/* Standardized Search & Filter Toolbar */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap gap-3 items-center justify-between">
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search suites, room numbers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-standard pl-10"
                        />
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Filter size={13} className="text-slate-400" />
                            <span>Status:</span>
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="select-standard !py-1.5 !text-xs !w-auto"
                        >
                            <option value="all">All Statuses ({totalSuites})</option>
                            <option value="Active">Active ({activeSuites})</option>
                            <option value="Inactive">Inactive ({totalSuites - activeSuites})</option>
                        </select>
                    </div>
                </div>

                {/* Suites Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredConnectingRooms.length === 0 ? (
                        <div className="col-span-full card-container p-12 text-center text-slate-400">
                            No connecting suites found matching your search.
                        </div>
                    ) : (
                        filteredConnectingRooms.map(room => {
                            const sumPrice = calculateSumPrice(room);
                            const displayPrice = room.pricingStrategy === 'Fixed Rate' && room.fixedPrice ? room.fixedPrice : sumPrice;

                            return (
                                <div key={room.id} className="card-container p-5 flex flex-col justify-between hover:border-primary/40 transition">
                                    <div>
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={room.status === 'Active' ? 'badge-status-active' : 'badge-status-inactive'}>
                                                {room.status}
                                            </span>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => handleEdit(room)}
                                                    className="btn-icon"
                                                    title="Edit Suite"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(room.id)}
                                                    className="btn-icon-danger"
                                                    title="Delete Suite"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-base font-bold text-slate-900 leading-snug">{room.name}</h3>

                                        <div className="mt-3.5 space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
                                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                <LinkIcon size={12} className="text-primary" /> Linked Physical Units
                                            </div>
                                            {room.componentRooms.map((comp, idx) => (
                                                <div key={idx} className="text-xs text-slate-700 flex items-center justify-between">
                                                    <span className="font-semibold text-slate-800">
                                                        {comp.count || comp.roomNumbers?.length || 1}x {getRoomTypeName(comp.roomTypeId)}
                                                    </span>
                                                    {comp.roomNumbers && comp.roomNumbers.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 justify-end">
                                                            {comp.roomNumbers.map((num) => (
                                                                <span key={num} className="badge-code">
                                                                    #{num}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 border-t border-slate-100 pt-3.5 mt-4">
                                        <div>
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">Rate Strategy</span>
                                            <span className="font-semibold text-slate-800">{room.pricingStrategy}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[10px] uppercase font-bold text-slate-400">Effective Rate</span>
                                            <span className="font-bold font-mono text-emerald-600 text-sm">৳{displayPrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    // FORM / CREATE VIEW
    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Form Page Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/90">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setView('list')}
                        className="btn-secondary !p-2 rounded-xl"
                        title="Back to list"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            {editingId ? 'Edit Connecting Suite' : 'Create New Connecting Suite'}
                        </h1>
                        <p className="text-xs text-slate-500">Configure virtual interconnected layout, component units and sync rules</p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => setView('list')}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn-primary flex items-center gap-1.5"
                    >
                        <Save size={15} /> Save Configuration
                    </button>
                </div>
            </div>

            <div className="card-container p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Layers size={15} className="text-primary" /> Basic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Joint Suite Name *</label>
                            <input
                                type="text"
                                value={formData?.name || ''}
                                onChange={e => updateField('name', e.target.value)}
                                placeholder="e.g. Family Connecting Deluxe (101-102)"
                                className="input-standard"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Operational Status *</label>
                            <select
                                value={formData?.status || 'Active'}
                                onChange={e => updateField('status', e.target.value)}
                                className="select-standard"
                            >
                                <option value="Active">Active (Bookable)</option>
                                <option value="Inactive">Inactive (Suspended)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Component Rooms */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <LinkIcon size={15} className="text-primary" /> Component Categories & Room Numbers
                        </h2>
                        <button
                            onClick={addComponentRoom}
                            className="btn-secondary !py-1 !px-2.5 !text-xs flex items-center gap-1 text-primary border-primary/30"
                        >
                            <Plus size={13} /> Add Category
                        </button>
                    </div>

                    <div className="space-y-3">
                        {formData?.componentRooms.map((comp, index) => {
                            const availableRooms = mockPhysicalRooms.filter(r => r.typeId === comp.roomTypeId);

                            return (
                                <div key={index} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                                    <div className="flex items-start gap-4">
                                        {/* Room Type Column */}
                                        <div className="w-1/3 min-w-[200px] space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Room Category</label>
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
                                                className="select-standard !text-xs font-semibold"
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
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                                <span>Assign Physical Rooms</span>
                                                {comp.roomNumbers && comp.roomNumbers.length > 0 && (
                                                    <span className="text-primary font-bold">({comp.roomNumbers.length} selected)</span>
                                                )}
                                            </label>

                                            {comp.roomTypeId && availableRooms.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5 min-h-[38px] items-center pt-0.5">
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
                                                                className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                                                                    isSelected
                                                                        ? 'bg-primary text-white border-primary shadow-2xs'
                                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                                                }`}
                                                            >
                                                                <span>#{room.number}</span>
                                                                {isSelected && <Check size={12} />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="h-[38px] flex items-center text-xs text-slate-400 italic">
                                                    {comp.roomTypeId ? 'No rooms configured for this category' : 'Select a room type first'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <button
                                            type="button"
                                            onClick={() => removeComponentRoom(index)}
                                            className="btn-icon-danger mt-6"
                                            title="Remove Category"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-primary bg-primary-subtle p-3.5 rounded-xl border border-primary-border font-medium">
                        <ShieldCheck size={18} className="text-primary shrink-0" />
                        <span><strong>Inventory Auto-Sync:</strong> Booking this joint suite will automatically lock and mark all component physical rooms as occupied across Front Desk and Room Rack.</span>
                    </div>
                </div>

                {/* Pricing Strategy */}
                <div className="space-y-4">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Save size={15} className="text-primary" /> Pricing & Billing Strategy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Pricing Mode</label>
                            <select
                                value={formData?.pricingStrategy || 'Sum of Rates'}
                                onChange={e => updateField('pricingStrategy', e.target.value)}
                                className="select-standard font-semibold"
                            >
                                <option value="Sum of Rates">Sum of Rates (Dynamic Aggregate)</option>
                                <option value="Fixed Rate">Fixed Rate (Package Combo Discount)</option>
                            </select>
                        </div>

                        {formData?.pricingStrategy === 'Sum of Rates' ? (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Calculated Suite Rate</label>
                                <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-mono font-bold text-sm flex items-center justify-between">
                                    <span>৳{calculateSumPrice().toLocaleString()}</span>
                                    <span className="text-xs font-normal text-emerald-600">Sum of component tariffs</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Fixed Suite Tariff (BDT)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
                                    <input
                                        type="number"
                                        value={formData?.fixedPrice || ''}
                                        onChange={e => updateField('fixedPrice', parseFloat(e.target.value) || 0)}
                                        placeholder="Enter combo rate"
                                        className="input-standard pl-8 font-bold font-mono text-primary text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectingRoomManagement;
