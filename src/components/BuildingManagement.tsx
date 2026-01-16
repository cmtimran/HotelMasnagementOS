import { useState } from 'react';
import {
    Building2, MapPin, Layout, Activity, ChevronLeft, Plus, Save, Edit2, Trash2
} from 'lucide-react';

interface Building {
    id: number;
    title: string;
    shortCode: string;
    type: string;
    description: string;
    totalFloors: number;
    groundFloorLabel: string;
    hasBasement: boolean;
    hasElevator: boolean;
    wheelchairAccess: boolean;
    distanceFromLobby: string;
    mapCoordinates: string;
    specificAddress: string;
    status: string;
    openingDate: string;
    renovationEnds: string;
    remarks: string;
}

const BuildingManagement = () => {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [buildings, setBuildings] = useState<Building[]>([
        {
            id: 1,
            title: 'Ocean View Tower',
            shortCode: 'OCN',
            type: 'Main Tower',
            description: 'Main building with sea view rooms',
            totalFloors: 10,
            groundFloorLabel: 'Lobby',
            hasBasement: true,
            hasElevator: true,
            wheelchairAccess: true,
            distanceFromLobby: '0 mins',
            mapCoordinates: '23.8103, 90.4125',
            specificAddress: '123 Beach Road',
            status: 'Active',
            openingDate: '2020-01-01',
            renovationEnds: '',
            remarks: 'Primary guest accommodation'
        }
    ]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Building | null>(null);
    const [activeTab, setActiveTab] = useState('identity');

    const handleAddNew = () => {
        setEditingId(null);
        setFormData({
            id: Date.now(),
            title: '',
            shortCode: '',
            type: 'Main Tower',
            description: '',
            totalFloors: 1,
            groundFloorLabel: 'G',
            hasBasement: false,
            hasElevator: false,
            wheelchairAccess: false,
            distanceFromLobby: '',
            mapCoordinates: '',
            specificAddress: '',
            status: 'Active',
            openingDate: '',
            renovationEnds: '',
            remarks: ''
        });
        setView('form');
        setActiveTab('identity');
    };

    const handleEdit = (building: Building) => {
        setEditingId(building.id);
        setFormData({ ...building });
        setView('form');
        setActiveTab('identity');
    };

    const handleSave = () => {
        if (!formData) return;
        if (editingId) {
            setBuildings(buildings.map(b => b.id === editingId ? formData : b));
        } else {
            setBuildings([...buildings, formData]);
        }
        setView('list');
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this building?')) {
            setBuildings(buildings.filter(b => b.id !== id));
        }
    };

    const updateField = (field: keyof Building, value: any) => {
        if (formData) {
            setFormData({ ...formData, [field]: value });
        }
    };

    const tabs = [
        { id: 'identity', label: 'Basic Info', icon: <Building2 size={18} /> },
        { id: 'structure', label: 'Structure', icon: <Layout size={18} /> },
        { id: 'location', label: 'Location', icon: <MapPin size={18} /> },
        { id: 'status', label: 'Status', icon: <Activity size={18} /> },
    ];

    if (view === 'list') {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Floors & Buildings</h1>
                        <p className="text-sm text-gray-500">Manage property buildings and floor plans</p>
                    </div>
                    <button onClick={handleAddNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
                        <Plus size={18} /> Add Building
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {buildings.map(building => (
                        <div key={building.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${building.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {building.status}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-800 mt-2">{building.title}</h3>
                                    <p className="text-sm text-gray-500">{building.type} • {building.shortCode}</p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(building)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(building.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 border-t pt-4">
                                <div>
                                    <span className="block text-xs text-gray-400">Floors</span>
                                    <span className="font-medium">{building.totalFloors} (G: {building.groundFloorLabel})</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400">Elevator</span>
                                    <span className="font-medium">{building.hasElevator ? 'Yes' : 'No'}</span>
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
                        <h1 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Building' : 'Add Building'}</h1>
                        <p className="text-xs text-gray-500">Configure building details and structure</p>
                    </div>
                </div>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
                    <Save size={16} /> Save Changes
                </button>
            </header>

            <main className="max-w-5xl mx-auto p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Tabs */}
                    <div className="w-full md:w-64 flex-shrink-0">
                        <nav className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-4 text-sm font-medium transition-colors w-full text-left border-l-4 ${activeTab === tab.id
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[500px]">

                        {/* 1. Identity */}
                        {activeTab === 'identity' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Building2 size={20} className="text-gray-400" /> Basic Information</h2>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Building Title *</label>
                                        <input type="text" value={formData?.title} onChange={e => updateField('title', e.target.value)} placeholder="e.g. Ocean View Tower" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Short Code *</label>
                                            <input type="text" value={formData?.shortCode} onChange={e => updateField('shortCode', e.target.value)} placeholder="e.g. OCN" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Building Type</label>
                                            <select value={formData?.type} onChange={e => updateField('type', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Main Tower</option>
                                                <option>Annex</option>
                                                <option>Villa</option>
                                                <option>Cottage</option>
                                                <option>Staff Quarters</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Description</label>
                                        <textarea value={formData?.description} onChange={e => updateField('description', e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. Structure */}
                        {activeTab === 'structure' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Layout size={20} className="text-gray-400" /> Structure & Capacity</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Total Floors *</label>
                                        <input type="number" value={formData?.totalFloors} onChange={e => updateField('totalFloors', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Ground Floor Label</label>
                                        <input type="text" value={formData?.groundFloorLabel} onChange={e => updateField('groundFloorLabel', e.target.value)} placeholder="G, 0, or Lobby" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                    </div>

                                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input type="checkbox" checked={formData?.hasBasement} onChange={e => updateField('hasBasement', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                            <span className="text-sm font-medium">Has Basement?</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input type="checkbox" checked={formData?.hasElevator} onChange={e => updateField('hasElevator', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                            <span className="text-sm font-medium">Has Elevator?</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input type="checkbox" checked={formData?.wheelchairAccess} onChange={e => updateField('wheelchairAccess', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                            <span className="text-sm font-medium">Wheelchair Access?</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Location */}
                        {activeTab === 'location' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><MapPin size={20} className="text-gray-400" /> Location & Accessibility</h2>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Distance from Lobby</label>
                                        <input type="text" value={formData?.distanceFromLobby} onChange={e => updateField('distanceFromLobby', e.target.value)} placeholder="e.g. 5 mins walk" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Map Coordinates</label>
                                        <input type="text" value={formData?.mapCoordinates} onChange={e => updateField('mapCoordinates', e.target.value)} placeholder="Lat, Long" className="w-full px-3 py-2 border rounded-lg outline-none font-mono text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Specific Address</label>
                                        <textarea value={formData?.specificAddress} onChange={e => updateField('specificAddress', e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Status */}
                        {activeTab === 'status' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Activity size={20} className="text-gray-400" /> Operational Status</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Status *</label>
                                        <select value={formData?.status} onChange={e => updateField('status', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                            <option>Active</option>
                                            <option>Inactive</option>
                                            <option>Under Renovation</option>
                                            <option>Construction</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Opening Date</label>
                                        <input type="date" value={formData?.openingDate} onChange={e => updateField('openingDate', e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                    </div>
                                    {formData?.status === 'Under Renovation' && (
                                        <div className="space-y-1 animate-fadeIn">
                                            <label className="text-sm font-medium text-gray-700">Renovation Ends</label>
                                            <input type="date" value={formData?.renovationEnds} onChange={e => updateField('renovationEnds', e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                    )}
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Remarks</label>
                                        <textarea value={formData?.remarks} onChange={e => updateField('remarks', e.target.value)} rows={3} placeholder="Internal notes..." className="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
                                    </div>
                                </div>
                            </div>
                        )}

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

export default BuildingManagement;
