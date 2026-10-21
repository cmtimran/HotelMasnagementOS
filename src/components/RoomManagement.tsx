import { useState, useMemo } from 'react';
import {
    Search, Plus, Edit2, Trash2, Save, ChevronLeft,
    MapPin, Key, Layers, CheckCircle2
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

const STORAGE_KEY = 'hotel_rooms_inventory_v1';

const mockBuildings = [
    { id: '1', name: 'Main Tower (Ocean Front)' },
    { id: '2', name: 'Executive Wing' }
];

const mockFloors = [
    { id: '1', name: 'Floor 1 (Ground & Garden)', buildingId: '1' },
    { id: '2', name: 'Floor 2 (Standard & Deluxe)', buildingId: '1' },
    { id: '3', name: 'Floor 3 (Superior Wing)', buildingId: '1' },
    { id: '4', name: 'Floor 4 (Executive Club)', buildingId: '2' },
    { id: '5', name: 'Floor 5 (VIP Penthouse)', buildingId: '2' }
];

const getStoredBuildings = () => {
    try {
        const saved = localStorage.getItem('hotel_buildings_v2');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((b: any) => ({ id: String(b.id), name: b.title || b.name }));
            }
        }
    } catch {}
    return mockBuildings;
};

const getStoredFloors = () => {
    try {
        const saved = localStorage.getItem('hotel_floors_v2');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((f: any) => ({ id: String(f.id), name: f.name, buildingId: String(f.buildingId) }));
            }
        }
    } catch {}
    return mockFloors;
};

const mockRoomTypes = [
    { id: '1', name: 'Deluxe Double', code: 'DLX' },
    { id: '2', name: 'Superior King', code: 'SUPK' },
    { id: '3', name: 'Executive Suite', code: 'EXEC' },
    { id: '4', name: 'Standard Single', code: 'STND' },
    { id: '5', name: 'Presidential Suite', code: 'PRES' }
];

// Full property 34-room inventory
const INITIAL_PROPERTY_ROOMS: Room[] = [
    // Floor 1
    { id: 1, number: '101', name: 'Garden Deluxe 101', buildingId: '1', floorId: '1', roomTypeId: '1', sortOrder: 1, phoneExt: '2101', lockId: 'RFID-101', isConnecting: true, connectedTo: '102', smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 2, number: '102', name: 'Garden Deluxe 102', buildingId: '1', floorId: '1', roomTypeId: '1', sortOrder: 2, phoneExt: '2102', lockId: 'RFID-102', isConnecting: true, connectedTo: '101', smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 3, number: '103', name: 'Superior Bay 103', buildingId: '1', floorId: '1', roomTypeId: '2', sortOrder: 3, phoneExt: '2103', lockId: 'RFID-103', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 4, number: '104', name: 'Executive Suite 104', buildingId: '1', floorId: '1', roomTypeId: '3', sortOrder: 4, phoneExt: '2104', lockId: 'RFID-104', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: true, status: 'Active', housekeepingStatus: 'Inspected' },
    { id: 5, number: '105', name: 'Standard Single 105', buildingId: '1', floorId: '1', roomTypeId: '4', sortOrder: 5, phoneExt: '2105', lockId: 'RFID-105', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: true, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 6, number: '106', name: 'Standard Single 106', buildingId: '1', floorId: '1', roomTypeId: '4', sortOrder: 6, phoneExt: '2106', lockId: 'RFID-106', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: true, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 7, number: '107', name: 'Deluxe Courtyard 107', buildingId: '1', floorId: '1', roomTypeId: '1', sortOrder: 7, phoneExt: '2107', lockId: 'RFID-107', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 8, number: '108', name: 'Superior King 108', buildingId: '1', floorId: '1', roomTypeId: '2', sortOrder: 8, phoneExt: '2108', lockId: 'RFID-108', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Out of Order', housekeepingStatus: 'Dirty', remarks: 'AC compressor maintenance' },

    // Floor 2
    { id: 9, number: '201', name: 'Superior Balcony 201', buildingId: '1', floorId: '2', roomTypeId: '2', sortOrder: 9, phoneExt: '2201', lockId: 'RFID-201', isConnecting: true, connectedTo: '202', smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Inspected' },
    { id: 10, number: '202', name: 'Superior King 202', buildingId: '1', floorId: '2', roomTypeId: '2', sortOrder: 10, phoneExt: '2202', lockId: 'RFID-202', isConnecting: true, connectedTo: '201', smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 11, number: '203', name: 'Executive Suite 203', buildingId: '1', floorId: '2', roomTypeId: '3', sortOrder: 11, phoneExt: '2203', lockId: 'RFID-203', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 12, number: '204', name: 'Deluxe King 204', buildingId: '1', floorId: '2', roomTypeId: '1', sortOrder: 12, phoneExt: '2204', lockId: 'RFID-204', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 13, number: '205', name: 'Standard Single 205', buildingId: '1', floorId: '2', roomTypeId: '4', sortOrder: 13, phoneExt: '2205', lockId: 'RFID-205', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: true, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 14, number: '206', name: 'Deluxe Twin 206', buildingId: '1', floorId: '2', roomTypeId: '1', sortOrder: 14, phoneExt: '2206', lockId: 'RFID-206', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: true, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 15, number: '207', name: 'Deluxe Double 207', buildingId: '1', floorId: '2', roomTypeId: '1', sortOrder: 15, phoneExt: '2207', lockId: 'RFID-207', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 16, number: '208', name: 'Superior King 208', buildingId: '1', floorId: '2', roomTypeId: '2', sortOrder: 16, phoneExt: '2208', lockId: 'RFID-208', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },

    // Floor 3
    { id: 17, number: '301', name: 'Deluxe Sea View 301', buildingId: '1', floorId: '3', roomTypeId: '1', sortOrder: 17, phoneExt: '2301', lockId: 'RFID-301', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 18, number: '302', name: 'Standard Single 302', buildingId: '1', floorId: '3', roomTypeId: '4', sortOrder: 18, phoneExt: '2302', lockId: 'RFID-302', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: true, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 19, number: '303', name: 'Executive Suite 303', buildingId: '1', floorId: '3', roomTypeId: '3', sortOrder: 19, phoneExt: '2303', lockId: 'RFID-303', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 20, number: '304', name: 'Deluxe Double 304', buildingId: '1', floorId: '3', roomTypeId: '1', sortOrder: 20, phoneExt: '2304', lockId: 'RFID-304', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 21, number: '305', name: 'Deluxe Twin 305', buildingId: '1', floorId: '3', roomTypeId: '1', sortOrder: 21, phoneExt: '2305', lockId: 'RFID-305', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 22, number: '306', name: 'Superior King 306', buildingId: '1', floorId: '3', roomTypeId: '2', sortOrder: 22, phoneExt: '2306', lockId: 'RFID-306', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 23, number: '307', name: 'Deluxe Garden 307', buildingId: '1', floorId: '3', roomTypeId: '1', sortOrder: 23, phoneExt: '2307', lockId: 'RFID-307', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 24, number: '308', name: 'Superior King 308', buildingId: '1', floorId: '3', roomTypeId: '2', sortOrder: 24, phoneExt: '2308', lockId: 'RFID-308', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Inspected' },

    // Floor 4
    { id: 25, number: '401', name: 'Executive Club 401', buildingId: '2', floorId: '4', roomTypeId: '3', sortOrder: 25, phoneExt: '2401', lockId: 'RFID-401', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 26, number: '402', name: 'Executive Club 402', buildingId: '2', floorId: '4', roomTypeId: '3', sortOrder: 26, phoneExt: '2402', lockId: 'RFID-402', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 27, number: '403', name: 'Deluxe Panoramic 403', buildingId: '2', floorId: '4', roomTypeId: '1', sortOrder: 27, phoneExt: '2403', lockId: 'RFID-403', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 28, number: '404', name: 'Superior Sky 404', buildingId: '2', floorId: '4', roomTypeId: '2', sortOrder: 28, phoneExt: '2404', lockId: 'RFID-404', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 29, number: '405', name: 'Standard Single 405', buildingId: '2', floorId: '4', roomTypeId: '4', sortOrder: 29, phoneExt: '2405', lockId: 'RFID-405', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: true, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 30, number: '410', name: 'Corner Executive 410', buildingId: '2', floorId: '4', roomTypeId: '3', sortOrder: 30, phoneExt: '2410', lockId: 'RFID-410', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },

    // Floor 5 (VIP Suites)
    { id: 31, number: '501', name: 'Presidential Royal Suite 501', buildingId: '2', floorId: '5', roomTypeId: '5', sortOrder: 31, phoneExt: '2501', lockId: 'VIP-501', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 32, number: '502', name: 'Executive Diplomatic 502', buildingId: '2', floorId: '5', roomTypeId: '3', sortOrder: 32, phoneExt: '2502', lockId: 'VIP-502', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 33, number: '503', name: 'Presidential Penthouse 503', buildingId: '2', floorId: '5', roomTypeId: '5', sortOrder: 33, phoneExt: '2503', lockId: 'VIP-503', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' },
    { id: 34, number: '505', name: 'Sky Superior 505', buildingId: '2', floorId: '5', roomTypeId: '2', sortOrder: 34, phoneExt: '2505', lockId: 'VIP-505', isConnecting: false, smokingStatus: 'Non-Smoking', nearElevator: false, status: 'Active', housekeepingStatus: 'Clean' }
];

export default function RoomManagement({ onBack }: { onBack: () => void }) {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [rooms, setRooms] = useState<Room[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch {
            // fallback
        }
        return INITIAL_PROPERTY_ROOMS;
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFloor, setSelectedFloor] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [activeTab, setActiveTab] = useState('location');

    const availableBuildings = useMemo(() => getStoredBuildings(), []);
    const availableFloors = useMemo(() => getStoredFloors(), []);

    const [formData, setFormData] = useState<Room>({
        id: 0,
        number: '',
        buildingId: '1',
        floorId: '1',
        roomTypeId: '1',
        sortOrder: 0,
        phoneExt: '',
        isConnecting: false,
        smokingStatus: 'Non-Smoking',
        nearElevator: false,
        status: 'Active',
        housekeepingStatus: 'Clean'
    });

    const persistRooms = (updated: Room[]) => {
        setRooms(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
            // fallback
        }
    };

    const handleAddNew = () => {
        setFormData({
            id: 0,
            number: '',
            name: '',
            buildingId: '1',
            floorId: '1',
            roomTypeId: '1',
            sortOrder: rooms.length + 1,
            phoneExt: `2${rooms.length + 101}`,
            lockId: `RFID-${rooms.length + 101}`,
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
        if (window.confirm('Are you sure you want to delete this room from hotel inventory?')) {
            const updated = rooms.filter(r => r.id !== id);
            persistRooms(updated);
        }
    };

    const handleSave = () => {
        if (!formData.number.trim()) {
            alert('Please specify a room number.');
            return;
        }
        let updated: Room[];
        if (formData.id === 0) {
            updated = [...rooms, { ...formData, id: Date.now() }];
        } else {
            updated = rooms.map(r => r.id === formData.id ? formData : r);
        }
        persistRooms(updated);
        setView('list');
    };

    const updateField = (field: keyof Room, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const filteredRooms = useMemo(() => {
        return rooms.filter(r => {
            const matchesSearch = r.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                r.phoneExt.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFloor = selectedFloor === 'all' || r.floorId === selectedFloor;
            const matchesStatus = selectedStatus === 'all' || r.housekeepingStatus === selectedStatus || r.status === selectedStatus;

            return matchesSearch && matchesFloor && matchesStatus;
        });
    }, [rooms, searchTerm, selectedFloor, selectedStatus]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Out of Order': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'Maintenance': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getHousekeepingBadge = (hk: string) => {
        switch (hk) {
            case 'Clean': return 'bg-emerald-50 text-emerald-700';
            case 'Dirty': return 'bg-rose-50 text-rose-700';
            case 'Inspected': return 'bg-blue-50 text-blue-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 h-[calc(100vh-100px)] flex flex-col font-sans">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3 bg-gray-50/70">
                <div className="flex items-center gap-3">
                    {view === 'form' && (
                        <button onClick={() => setView('list')} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                                {view === 'list' ? 'Physical Room Inventory' : (formData.id === 0 ? 'Add Physical Room' : `Edit Room ${formData.number}`)}
                            </h1>
                            {view === 'list' && (
                                <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                                    {rooms.length} Total Units
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            {view === 'list' ? 'Manage property room master, floor distributions, door locks & hardware extensions' : 'Configure room details, technical devices and status'}
                        </p>
                    </div>
                </div>

                {view === 'list' && (
                    <div className="flex items-center gap-2">
                        <button onClick={onBack} className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-semibold transition-colors">
                            Back
                        </button>
                        <button
                            onClick={handleAddNew}
                            className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-semibold transition-colors shadow-2xs"
                        >
                            <Plus size={15} />
                            <span>Add New Room</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4 sm:p-5">
                {view === 'list' ? (
                    <div className="space-y-4">
                        {/* Filters & Floor Tabs */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/80 p-2.5 rounded-xl border border-gray-200/80">
                            <div className="relative flex-1 min-w-[220px] max-w-sm">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search by room #, name, extension..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Floor:</span>
                                <button
                                    onClick={() => setSelectedFloor('all')}
                                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${selectedFloor === 'all' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                                >
                                    All ({rooms.length})
                                </button>
                                {availableFloors.map(floor => (
                                    <button
                                        key={floor.id}
                                        onClick={() => setSelectedFloor(String(floor.id))}
                                        className={`px-2.5 py-1 rounded-md font-bold transition-all ${selectedFloor === String(floor.id) ? 'bg-blue-600 text-white shadow-2xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        {floor.name.includes('Floor') ? floor.name.split('(')[0].trim() : floor.name}
                                    </button>
                                ))}

                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-2 mr-1">Status:</span>
                                <button
                                    onClick={() => setSelectedStatus('all')}
                                    className={`px-2.5 py-1 rounded-md font-bold transition-all ${selectedStatus === 'all' ? 'bg-gray-900 text-white shadow-2xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                                >
                                    All
                                </button>
                                {['Clean', 'Dirty', 'Inspected', 'Out of Order'].map(st => (
                                    <button
                                        key={st}
                                        onClick={() => setSelectedStatus(st)}
                                        className={`px-2 py-1 rounded-md font-semibold transition-all ${selectedStatus === st ? 'bg-gray-900 text-white shadow-2xs' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Room Grid */}
                        {filteredRooms.length === 0 ? (
                            <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-400">
                                No rooms match the current search or filter criteria.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredRooms.map(room => {
                                const roomType = mockRoomTypes.find(t => t.id === room.roomTypeId);
                                const floor = availableFloors.find(f => f.id === room.floorId) || mockFloors.find(f => f.id === room.floorId);

                                return (
                                    <div key={room.id} className="group border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all bg-white relative flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-lg font-bold text-gray-900 tracking-tight font-mono">{room.number}</h3>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(room.status)}`}>
                                                            {room.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-blue-600 font-semibold">{roomType?.name || 'Standard'}</p>
                                                </div>

                                                <div className="flex gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(room)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(room.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg" title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 my-3 text-xs text-gray-600 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-gray-400">Location:</span>
                                                    <span className="font-semibold text-gray-800">{floor?.name.split(' (')[0] || `Floor ${room.floorId}`}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-gray-400">Lock RFID:</span>
                                                    <span className="font-mono font-bold text-gray-700">{room.lockId || `KEY-${room.number}`}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-gray-400">Phone Ext:</span>
                                                    <span className="font-mono font-semibold text-gray-700">{room.phoneExt || `2${room.number}`}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                                            <span className={`px-2 py-0.5 rounded-full font-bold ${getHousekeepingBadge(room.housekeepingStatus)}`}>
                                                HK: {room.housekeepingStatus}
                                            </span>
                                            {room.isConnecting && (
                                                <span className="text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded text-[10px]">
                                                    Connecting {room.connectedTo ? `(${room.connectedTo})` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto space-y-5">
                        {/* Tabs */}
                        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-1 text-xs font-bold">
                            {[
                                { id: 'location', label: 'Location & Identity', icon: <MapPin size={14} /> },
                                { id: 'systems', label: 'Technical & Locks', icon: <Key size={14} /> },
                                { id: 'attributes', label: 'Interconnection & Attributes', icon: <Layers size={14} /> },
                                { id: 'status', label: 'Housekeeping & Status', icon: <CheckCircle2 size={14} /> },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${
                                        activeTab === tab.id ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Forms */}
                        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">

                            {/* Tab 1: Location & Identity */}
                            {activeTab === 'location' && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                                        <MapPin className="text-blue-600" size={16} /> Physical Location & Categorization
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Room Number *</label>
                                            <input
                                                type="text"
                                                value={formData.number}
                                                onChange={e => updateField('number', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                                                placeholder="e.g. 101"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Room Alias / Name (Optional)</label>
                                            <input
                                                type="text"
                                                value={formData.name || ''}
                                                onChange={e => updateField('name', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
                                                placeholder="e.g. Presidential Bay Suite"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Building *</label>
                                            <select
                                                value={formData.buildingId}
                                                onChange={e => updateField('buildingId', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
                                            >
                                                {availableBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Floor Level *</label>
                                            <select
                                                value={formData.floorId}
                                                onChange={e => updateField('floorId', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
                                            >
                                                {availableFloors.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Room Category Type *</label>
                                            <select
                                                value={formData.roomTypeId}
                                                onChange={e => updateField('roomTypeId', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none font-semibold text-gray-800"
                                            >
                                                {mockRoomTypes.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Technical & Systems */}
                            {activeTab === 'systems' && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                                        <Key className="text-blue-600" size={16} /> Door Locks & Communication Systems
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">RFID Door Lock Encoder ID</label>
                                            <input
                                                type="text"
                                                value={formData.lockId || ''}
                                                onChange={e => updateField('lockId', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none font-mono"
                                                placeholder="e.g. RFID-101"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">PBX Phone Extension</label>
                                            <input
                                                type="text"
                                                value={formData.phoneExt || ''}
                                                onChange={e => updateField('phoneExt', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none font-mono"
                                                placeholder="e.g. 2101"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Connectivity & Attributes */}
                            {activeTab === 'attributes' && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                                        <Layers className="text-blue-600" size={16} /> Interconnection & Room Specifications
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                                            <div>
                                                <span className="text-xs font-bold text-gray-800">Connecting Room Facility</span>
                                                <p className="text-[11px] text-gray-500">Has an internal connecting door to an adjoining room</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={formData.isConnecting}
                                                onChange={e => updateField('isConnecting', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                        </div>

                                        {formData.isConnecting && (
                                            <div className="space-y-1 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                                <label className="text-xs font-semibold text-gray-700">Connected With Room #</label>
                                                <input
                                                    type="text"
                                                    value={formData.connectedTo || ''}
                                                    onChange={e => updateField('connectedTo', e.target.value)}
                                                    placeholder="e.g. 102"
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none font-mono bg-white"
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-700">Smoking Policy</label>
                                                <select
                                                    value={formData.smokingStatus}
                                                    onChange={e => updateField('smokingStatus', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
                                                >
                                                    <option value="Non-Smoking">Non-Smoking</option>
                                                    <option value="Smoking">Smoking Permitted</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-700">Elevator Proximity</label>
                                                <select
                                                    value={formData.nearElevator ? 'yes' : 'no'}
                                                    onChange={e => updateField('nearElevator', e.target.value === 'yes')}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
                                                >
                                                    <option value="no">Quiet Area (Away from Elevator)</option>
                                                    <option value="yes">Near Elevator / Lift Lobby</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: Operational Status */}
                            {activeTab === 'status' && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                                        <CheckCircle2 className="text-blue-600" size={16} /> Operational & Housekeeping States
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Inventory Status *</label>
                                            <select
                                                value={formData.status}
                                                onChange={e => updateField('status', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none font-semibold text-gray-800"
                                            >
                                                <option value="Active">Active (Available for Reservation)</option>
                                                <option value="Out of Order">Out of Order (OOO)</option>
                                                <option value="Maintenance">Under Maintenance</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Housekeeping Cleanliness</label>
                                            <select
                                                value={formData.housekeepingStatus}
                                                onChange={e => updateField('housekeepingStatus', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none font-semibold text-gray-800"
                                            >
                                                <option value="Clean">Clean (Ready for Check-In)</option>
                                                <option value="Dirty">Dirty (Needs Cleaning)</option>
                                                <option value="Inspected">Inspected (Supervisor Approved)</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Maintenance Remarks / HK Log</label>
                                            <textarea
                                                value={formData.remarks || ''}
                                                onChange={e => updateField('remarks', e.target.value)}
                                                rows={3}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g. Deep carpet shampooing completed. AC thermostat calibrated."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-4 border-t flex justify-end gap-2.5">
                                <button
                                    onClick={() => setView('list')}
                                    className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-xs font-bold shadow-xs transition-colors"
                                >
                                    <Save size={15} />
                                    <span>Save Room</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
