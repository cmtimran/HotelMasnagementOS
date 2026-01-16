import { useState } from 'react';
import {
    Search, Plus, Filter, Edit2, Trash2, Save, X, ChevronLeft,
    MapPin, Wifi, Key, Layers, Info, CheckCircle, AlertCircle
} from 'lucide-react';

interface Room {
    id: number;
    number: string;
    name?: string;
    buildingId: string;
    floorId: string;
    roomTypeId: string;
    sortOrder: number;

    // Technical
    phoneExt: string;
    lockId?: string;
    wifiVoucher?: string;
    qrString?: string;

    // Attributes
    isConnecting: boolean;
    connectedTo?: string;
    viewOverride?: string;
    smokingStatus: 'Smoking' | 'Non-Smoking';
    nearElevator: boolean;

    // Status
    status: 'Active' | 'Out of Order' | 'Maintenance';
    housekeepingStatus: 'Clean' | 'Dirty' | 'Inspected';
    remarks?: string;
}

const mockBuildings = [
    { id: '1', name: 'Main Tower' },
    { id: '2', name: 'Ocean Wing' }
];

const mockFloors = [
    { id: '1', name: '1st Floor', buildingId: '1' },
    { id: '2', name: '2nd Floor', buildingId: '1' },
    { id: '3', name: '1st Floor', buildingId: '2' }
];

const mockRoomTypes = [
    { id: '1', name: 'Deluxe King', code: 'DLX' },
    { id: '2', name: 'Twin Room', code: 'TWN' },
    { id: '3', name: 'Suite', code: 'SUT' }
];

const initialRooms: Room[] = [
    {
        id: 1,
        number: '101',
        name: '',
        buildingId: '1',
        floorId: '1',
        roomTypeId: '1',
        sortOrder: 1,
        phoneExt: '2101',
        lockId: 'KEY_101',
        wifiVoucher: '',
        qrString: '',
        isConnecting: false,
        smokingStatus: 'Non-Smoking',
        nearElevator: true,
        status: 'Active',
        housekeepingStatus: 'Clean',
        remarks: ''
    },
    {
        id: 2,
        number: '102',
        name: '',
        buildingId: '1',
        floorId: '1',
        roomTypeId: '1',
        sortOrder: 2,
        phoneExt: '2102',
        lockId: 'KEY_102',
        wifiVoucher: '',
        qrString: '',
        isConnecting: true,
        connectedTo: '103',
        smokingStatus: 'Non-Smoking',
        nearElevator: false,
        status: 'Active',
        housekeepingStatus: 'Dirty',
        remarks: 'Guest requested extra pillows'
    }
];

export default function RoomManagement({ onBack }: { onBack: () => void }) {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [rooms, setRooms] = useState<Room[]>(initialRooms);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('location');
    const [formData, setFormData] = useState<Room>({
        id: 0,
        number: '',
        buildingId: '',
        floorId: '',
        roomTypeId: '',
        sortOrder: 0,
        phoneExt: '',
        isConnecting: false,
        smokingStatus: 'Non-Smoking',
        nearElevator: false,
        status: 'Active',
        housekeepingStatus: 'Clean'
    });

    const handleAddNew = () => {
        setFormData({
            id: 0,
            number: '',
            buildingId: '',
            floorId: '',
            roomTypeId: '',
            sortOrder: rooms.length + 1,
            phoneExt: '',
            isConnecting: false,
            smokingStatus: 'Non-Smoking',
            nearElevator: false,
            status: 'Active',
            housekeepingStatus: 'Clean'
        });
        setView('form');
        setActiveTab('location');
    };

    const handleEdit = (room: Room) => {
        setFormData({ ...room });
        setView('form');
        setActiveTab('location');
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this room?')) {
            setRooms(rooms.filter(r => r.id !== id));
        }
    };

    const handleSave = () => {
        if (formData.id === 0) {
            setRooms([...rooms, { ...formData, id: Date.now() }]);
        } else {
            setRooms(rooms.map(r => r.id === formData.id ? formData : r));
        }
        setView('list');
    };

    const updateField = (field: keyof Room, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const filteredRooms = rooms.filter(r =>
        r.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-700';
            case 'Out of Order': return 'bg-red-100 text-red-700';
            case 'Maintenance': return 'bg-orange-100 text-orange-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                    {view === 'form' && (
                        <button onClick={() => setView('list')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <ChevronLeft size={20} className="text-gray-600" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">
                            {view === 'list' ? 'Room Management' : (formData.id === 0 ? 'New Room' : `Edit Room ${formData.number}`)}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {view === 'list' ? 'Manage physical room inventory and status' : 'Configure room details and systems'}
                        </p>
                    </div>
                </div>
                {view === 'list' && (
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors">
                            Back
                        </button>
                        <button
                            onClick={handleAddNew}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus size={18} />
                            <span>Add Room</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {view === 'list' ? (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="flex gap-3 mb-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by Room Number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-600">
                                <Filter size={18} />
                                <span>Filters</span>
                            </button>
                        </div>

                        {/* List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredRooms.map(room => (
                                <div key={room.id} className="group border rounded-xl p-4 hover:shadow-md transition-all bg-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-gradient-to-l from-white via-white to-transparent pl-8">
                                        <button onClick={() => handleEdit(room)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(room.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-gray-900">{room.number}</h3>
                                                {room.name && <span className="text-xs text-gray-500">({room.name})</span>}
                                            </div>
                                            <p className="text-sm text-gray-500 font-medium">{mockRoomTypes.find(t => t.id === room.roomTypeId)?.name}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getStatusColor(room.status)}`}>
                                            {room.status}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-600 mb-3">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-gray-400" />
                                            <span>{mockBuildings.find(b => b.id === room.buildingId)?.name} • {mockFloors.find(f => f.id === room.floorId)?.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Key size={14} className="text-gray-400" />
                                            <span>Lock: {room.lockId || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t flex justify-between items-center text-xs">
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${room.housekeepingStatus === 'Clean' ? 'bg-green-50 text-green-700' :
                                                room.housekeepingStatus === 'Dirty' ? 'bg-red-50 text-red-700' :
                                                    'bg-blue-50 text-blue-700'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${room.housekeepingStatus === 'Clean' ? 'bg-green-500' :
                                                    room.housekeepingStatus === 'Dirty' ? 'bg-red-500' :
                                                        'bg-blue-500'
                                                }`} />
                                            {room.housekeepingStatus}
                                        </div>
                                        {room.isConnecting && (
                                            <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                                <Layers size={12} />
                                                Connecting
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto">
                        {/* Tabs */}
                        <div className="flex gap-2 mb-6 border-b overflow-x-auto pb-1">
                            <button
                                onClick={() => setActiveTab('location')}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'location' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Location & Identity
                            </button>
                            <button
                                onClick={() => setActiveTab('systems')}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'systems' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Technical & Systems
                            </button>
                            <button
                                onClick={() => setActiveTab('attributes')}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'attributes' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Connectivity & Attributes
                            </button>
                            <button
                                onClick={() => setActiveTab('status')}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'status' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Operational Status
                            </button>
                        </div>

                        {/* Forms */}
                        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">

                            {/* Tab 1: Location & Identity */}
                            {activeTab === 'location' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <MapPin className="text-blue-500" size={20} />
                                        Physical Location
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Room Number *</label>
                                            <input
                                                type="text"
                                                value={formData.number}
                                                onChange={e => updateField('number', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                placeholder="e.g. 101"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Room Name (Optional)</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => updateField('name', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                placeholder="e.g. Honeymoon Suite"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Building *</label>
                                            <select
                                                value={formData.buildingId}
                                                onChange={e => updateField('buildingId', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                                            >
                                                <option value="">Select Building</option>
                                                {mockBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Floor *</label>
                                            <select
                                                value={formData.floorId}
                                                onChange={e => updateField('floorId', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                                            >
                                                <option value="">Select Floor</option>
                                                {mockFloors.filter(f => !formData.buildingId || f.buildingId === formData.buildingId).map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Room Type *</label>
                                            <select
                                                value={formData.roomTypeId}
                                                onChange={e => updateField('roomTypeId', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white"
                                            >
                                                <option value="">Select Type</option>
                                                {mockRoomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name} ({rt.code})</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Sort Order</label>
                                            <input
                                                type="number"
                                                value={formData.sortOrder}
                                                onChange={e => updateField('sortOrder', parseInt(e.target.value))}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Technical & Systems */}
                            {activeTab === 'systems' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Wifi className="text-blue-500" size={20} />
                                        Hardware & Integration
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Phone Extension *</label>
                                            <input
                                                type="text"
                                                value={formData.phoneExt}
                                                onChange={e => updateField('phoneExt', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                placeholder="e.g. 2101"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Lock ID / Key Alias</label>
                                            <input
                                                type="text"
                                                value={formData.lockId}
                                                onChange={e => updateField('lockId', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                placeholder="Door Lock System ID"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Wi-Fi Voucher ID</label>
                                            <input
                                                type="text"
                                                value={formData.wifiVoucher}
                                                onChange={e => updateField('wifiVoucher', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                placeholder="Router Specific ID"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">QR Code String</label>
                                            <input
                                                type="text"
                                                value={formData.qrString}
                                                onChange={e => updateField('qrString', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
                                                placeholder="Scan to Order code"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Connectivity & Attributes */}
                            {activeTab === 'attributes' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Layers className="text-blue-500" size={20} />
                                        Attributes & Features
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isConnecting}
                                                    onChange={e => updateField('isConnecting', e.target.checked)}
                                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <label className="font-medium text-gray-800">Is Connecting Room?</label>
                                            </div>
                                            {formData.isConnecting && (
                                                <div className="flex-1 flex items-center gap-2 animate-fadeIn">
                                                    <span className="text-sm text-gray-500">Connects with:</span>
                                                    <select
                                                        value={formData.connectedTo}
                                                        onChange={e => updateField('connectedTo', e.target.value)}
                                                        className="flex-1 px-3 py-2 border rounded-lg bg-white text-sm"
                                                    >
                                                        <option value="">Select Neighbor Room</option>
                                                        {rooms.filter(r => r.number !== formData.number).map(r => (
                                                            <option key={r.id} value={r.number}>Room {r.number}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">View Override</label>
                                                <select
                                                    value={formData.viewOverride}
                                                    onChange={e => updateField('viewOverride', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none"
                                                >
                                                    <option value="">Default (Same as Room Type)</option>
                                                    <option value="Sea View">Sea View</option>
                                                    <option value="Garden View">Garden View</option>
                                                    <option value="City View">City View</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-700">Smoking Status</label>
                                                <select
                                                    value={formData.smokingStatus}
                                                    onChange={e => updateField('smokingStatus', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg bg-white outline-none"
                                                >
                                                    <option value="Non-Smoking">Non-Smoking</option>
                                                    <option value="Smoking">Smoking</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.nearElevator}
                                                onChange={e => updateField('nearElevator', e.target.checked)}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <div className="text-sm">
                                                <p className="font-medium text-gray-800">Near Elevator / Noisy Area?</p>
                                                <p className="text-gray-500 text-xs">Flag this room if it might be noisy for guests who prefer quiet.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: Operational Status */}
                            {activeTab === 'status' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Info className="text-blue-500" size={20} />
                                        Status & Maintenance
                                    </h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Room Status *</label>
                                            <select
                                                value={formData.status}
                                                onChange={e => updateField('status', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg bg-white outline-none"
                                            >
                                                <option value="Active">Active (Ready for Sale)</option>
                                                <option value="Out of Order">Out of Order (Broken)</option>
                                                <option value="Maintenance">Under Maintenance</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Housekeeping Status</label>
                                            <select
                                                value={formData.housekeepingStatus}
                                                onChange={e => updateField('housekeepingStatus', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg bg-white outline-none"
                                            >
                                                <option value="Clean">Clean</option>
                                                <option value="Dirty">Dirty</option>
                                                <option value="Inspected">Inspected</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Remarks / Internal Notes</label>
                                            <textarea
                                                value={formData.remarks}
                                                onChange={e => updateField('remarks', e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 outline-none h-24 resize-none"
                                                placeholder="e.g. Carpet stain in corner, scheduled for steam cleaning."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-6 border-t flex justify-end gap-3">
                                <button
                                    onClick={() => setView('list')}
                                    className="px-6 py-2 border rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-md transition-all active:scale-95"
                                >
                                    <Save size={18} />
                                    Save Room
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
