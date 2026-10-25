import { useState, useMemo, useEffect } from 'react';
import {
    Search, Plus, Edit2, Trash2, Save, ChevronLeft,
    MapPin, Key, Layers, CheckCircle2, Building2, AlertTriangle, Sparkles
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { getApiBaseUrl } from '../utils/apiUrl';
import {
    getCanonicalRooms,
    getDynamicRoomTypes,
    syncRoomTypesAndRoomsFromDB,
    type DynamicRoomType
} from '../utils/roomInventoryEngine';

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

interface Building {
    id: string;
    name: string;
}

interface Floor {
    id: string;
    name: string;
    buildingId: string;
}

const STORAGE_KEY = 'hotel_rooms_inventory_v1';

const getStoredBuildings = (): Building[] => {
    try {
        const saved = localStorage.getItem('hotel_buildings_v2');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((b: any) => ({ id: String(b.id), name: b.title || b.name }));
            }
        }
    } catch {}
    return [];
};

const getStoredFloors = (): Floor[] => {
    try {
        const saved = localStorage.getItem('hotel_floors_v2');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((f: any) => ({ id: String(f.id), name: f.name, buildingId: String(f.buildingId) }));
            }
        }
    } catch {}
    return [];
};

export default function RoomManagement({ onBack }: { onBack: () => void }) {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [rooms, setRooms] = useState<Room[]>(() => getCanonicalRooms() as unknown as Room[]);

    const [availableBuildings, setAvailableBuildings] = useState<Building[]>(() => getStoredBuildings());
    const [availableFloors, setAvailableFloors] = useState<Floor[]>(() => getStoredFloors());
    const [availableRoomTypes, setAvailableRoomTypes] = useState<DynamicRoomType[]>(() => getDynamicRoomTypes());

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFloor, setSelectedFloor] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [activeTab, setActiveTab] = useState('location');

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

    // On mount: sync from DB and fetch property buildings/floors
    useEffect(() => {
        const syncData = async () => {
            try {
                // 1. Sync room types and rooms from DB
                const { roomTypes, rooms: dbRooms } = await syncRoomTypesAndRoomsFromDB(1);
                if (roomTypes && roomTypes.length > 0) {
                    setAvailableRoomTypes(roomTypes);
                }
                if (dbRooms && dbRooms.length > 0) {
                    setRooms(dbRooms as unknown as Room[]);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(dbRooms));
                } else {
                    // Fall back to canonical rooms from localStorage
                    const canonical = getCanonicalRooms();
                    if (canonical.length > 0) {
                        setRooms(canonical as unknown as Room[]);
                    }
                }

                // 2. Fetch property details for buildings and floors
                const API_BASE = getApiBaseUrl();
                const propRes = await fetch(`${API_BASE}/api/properties/1`);
                const propJson = await propRes.json();
                if (propJson.success && propJson.data) {
                    const { buildings, floors } = propJson.data;
                    if (Array.isArray(buildings) && buildings.length > 0) {
                        const mappedBuildings: Building[] = buildings.map((b: any) => ({
                            id: String(b.id),
                            name: b.title || b.name
                        }));
                        setAvailableBuildings(mappedBuildings);
                        localStorage.setItem('hotel_buildings_v2', JSON.stringify(buildings));
                    }
                    if (Array.isArray(floors) && floors.length > 0) {
                        const mappedFloors: Floor[] = floors.map((f: any) => ({
                            id: String(f.id),
                            name: f.name,
                            buildingId: String(f.building_id || f.buildingId || '1')
                        }));
                        setAvailableFloors(mappedFloors);
                        localStorage.setItem('hotel_floors_v2', JSON.stringify(floors));
                    }
                }
            } catch (err) {
                // Fallback to localStorage on network error
                console.warn('RoomManagement: API sync failed, using cached data', err);
                const cachedBuildings = getStoredBuildings();
                const cachedFloors = getStoredFloors();
                if (cachedBuildings.length > 0) setAvailableBuildings(cachedBuildings);
                if (cachedFloors.length > 0) setAvailableFloors(cachedFloors);
                const canonical = getCanonicalRooms();
                if (canonical.length > 0) setRooms(canonical as unknown as Room[]);
            }
        };

        syncData();
    }, []);

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
            buildingId: availableBuildings[0]?.id || '1',
            floorId: availableFloors[0]?.id || '1',
            roomTypeId: String(availableRoomTypes[0]?.id || '1'),
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

    const handleDelete = async (id: number) => {
        const target = rooms.find(r => r.id === id);
        if (window.confirm('Are you sure you want to delete this room from hotel inventory?')) {
            const updated = rooms.filter(r => r.id !== id);
            persistRooms(updated);
            if (target?.number) {
                try {
                    await fetch(`${getApiBaseUrl()}/api/rooms/${encodeURIComponent(target.number)}`, {
                        method: 'DELETE'
                    });
                } catch {}
            }
        }
    };

    const handleSave = async () => {
        if (!formData.number.trim()) {
            alert('Please specify a room number.');
            return;
        }

        const isNew = formData.id === 0;
        const API_BASE = getApiBaseUrl();

        try {
            if (isNew) {
                // POST new room to API
                const payload = {
                    number: formData.number,
                    name: formData.name,
                    buildingId: formData.buildingId,
                    floorId: formData.floorId,
                    roomTypeId: formData.roomTypeId,
                    phoneExt: formData.phoneExt,
                    lockId: formData.lockId,
                    isConnecting: formData.isConnecting,
                    connectedTo: formData.connectedTo,
                    smokingStatus: formData.smokingStatus,
                    nearElevator: formData.nearElevator,
                    status: formData.status,
                    housekeepingStatus: formData.housekeepingStatus,
                    remarks: formData.remarks
                };
                const res = await fetch(`${API_BASE}/api/rooms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                const savedRoom: Room = json.data
                    ? { ...formData, id: json.data.id || Date.now() }
                    : { ...formData, id: Date.now() };
                const updated = [...rooms, savedRoom];
                persistRooms(updated);
            } else {
                // Edit: PUT details + PATCH housekeeping status via API
                try {
                    await fetch(`${API_BASE}/api/rooms/${encodeURIComponent(formData.number)}/details`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            floorId: formData.floorId,
                            roomTypeId: formData.roomTypeId,
                            status: formData.status,
                            housekeepingStatus: formData.housekeepingStatus
                        })
                    });
                } catch {}
                const updated = rooms.map(r => r.id === formData.id ? formData : r);
                persistRooms(updated);
            }

            // Refresh rooms from DB after save
            try {
                const { rooms: dbRooms } = await syncRoomTypesAndRoomsFromDB(1);
                if (dbRooms && dbRooms.length > 0) {
                    setRooms(dbRooms as unknown as Room[]);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(dbRooms));
                }
            } catch {
                // Keep the locally persisted state on network failure
            }
        } catch (err) {
            // On any API failure, at minimum persist to localStorage
            console.warn('RoomManagement: API save failed, persisting to localStorage only', err);
            let updated: Room[];
            if (isNew) {
                updated = [...rooms, { ...formData, id: Date.now() }];
            } else {
                updated = rooms.map(r => r.id === formData.id ? formData : r);
            }
            persistRooms(updated);
        }

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

    const cleanCount = rooms.filter(r => r.housekeepingStatus === 'Clean' || r.housekeepingStatus === 'Inspected').length;
    const dirtyCount = rooms.filter(r => r.housekeepingStatus === 'Dirty').length;
    const oooCount = rooms.filter(r => r.status === 'Out of Order' || r.status === 'Maintenance').length;

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 font-sans animate-in fade-in duration-300">
            {/* Header */}
            <PageHeader
                title={view === 'list' ? 'Physical Room Inventory' : (formData.id === 0 ? 'Add Physical Room' : `Edit Room ${formData.number}`)}
                subtitle={view === 'list' ? 'Manage property room master, floor distributions, door locks & housekeeping status.' : 'Configure room details, technical devices and status'}
                icon={<Building2 className="size-6 text-primary" />}
                actions={
                    <div className="flex items-center gap-2.5">
                        {onBack && (
                            <button onClick={onBack} className="btn-secondary">
                                Back
                            </button>
                        )}
                        {view === 'list' ? (
                            <button
                                onClick={handleAddNew}
                                className="btn-primary"
                            >
                                <Plus className="size-4 mr-1.5" />
                                Add New Room
                            </button>
                        ) : (
                            <button
                                onClick={() => setView('list')}
                                className="btn-secondary"
                            >
                                <ChevronLeft className="size-4 mr-1.5" />
                                Return to List
                            </button>
                        )}
                    </div>
                }
            />

            {view === 'list' && (
                <>
                    {/* KPI Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-500">Total Rooms</span>
                                <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                                    <Building2 className="size-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">{rooms.length}</div>
                            <div className="text-[11px] text-slate-500 font-medium mt-1">Physical inventory units</div>
                        </div>

                        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-500">Clean / Inspected</span>
                                <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                    <CheckCircle2 className="size-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">{cleanCount}</div>
                            <div className="text-[11px] text-emerald-600 font-semibold mt-1">Ready for check-in</div>
                        </div>

                        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-500">Dirty / Turn-down</span>
                                <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                    <Sparkles className="size-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">{dirtyCount}</div>
                            <div className="text-[11px] text-amber-700 font-semibold mt-1">Pending housekeeping</div>
                        </div>

                        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-500">Out of Order (OOO)</span>
                                <div className="size-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                                    <AlertTriangle className="size-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">{oooCount}</div>
                            <div className="text-[11px] text-rose-600 font-semibold mt-1">Maintenance / Blocked</div>
                        </div>
                    </div>

                    {/* Filters & Floor Tabs Toolbar */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                                <input
                                    type="text"
                                    placeholder="Search by room #, name, extension..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-standard pl-9"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto justify-end text-xs text-slate-500 font-medium">
                                Showing <strong className="text-slate-800">{filteredRooms.length}</strong> of {rooms.length} rooms
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                            {/* Floor Filter */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Floor:</span>
                                <button
                                    onClick={() => setSelectedFloor('all')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                        selectedFloor === 'all'
                                            ? 'bg-primary text-white shadow-xs'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    All ({rooms.length})
                                </button>
                                {availableFloors.map(floor => (
                                    <button
                                        key={floor.id}
                                        onClick={() => setSelectedFloor(String(floor.id))}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                            selectedFloor === String(floor.id)
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {floor.name.includes('Floor') ? floor.name.split('(')[0].trim() : floor.name}
                                    </button>
                                ))}
                            </div>

                            {/* Status Filter */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
                                <button
                                    onClick={() => setSelectedStatus('all')}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                                        selectedStatus === 'all'
                                            ? 'bg-slate-900 text-white shadow-xs'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    All
                                </button>
                                {['Clean', 'Dirty', 'Inspected', 'Out of Order'].map(st => (
                                    <button
                                        key={st}
                                        onClick={() => setSelectedStatus(st)}
                                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                                            selectedStatus === st
                                                ? 'bg-slate-900 text-white shadow-xs'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Room Grid */}
                    {filteredRooms.length === 0 ? (
                        <div className="card-container p-12 text-center text-slate-400">
                            <Building2 className="size-8 mx-auto mb-2 text-slate-300" />
                            No rooms match the current search or filter criteria.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredRooms.map(room => {
                                const roomType = availableRoomTypes.find(t => String(t.id) === room.roomTypeId);
                                const floor = availableFloors.find(f => String(f.id) === room.floorId);

                                return (
                                    <div key={room.id} className="card-container p-4 hover:shadow-xs transition relative flex flex-col justify-between group">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-lg font-bold text-slate-900 tracking-tight font-mono">{room.number}</h3>
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusColor(room.status)}`}>
                                                            {room.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-primary font-semibold mt-0.5">{roomType?.name || 'Standard'}</p>
                                                </div>

                                                <div className="flex gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition">
                                                    <button onClick={() => handleEdit(room)} className="btn-icon" title="Edit Room">
                                                        <Edit2 className="size-3.5" />
                                                    </button>
                                                    <button onClick={() => handleDelete(room.id)} className="btn-icon-danger" title="Delete Room">
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 my-3 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-400">Location:</span>
                                                    <span className="font-semibold text-slate-800">{floor?.name.split(' (')[0] || `Floor ${room.floorId}`}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-400">Lock RFID:</span>
                                                    <span className="font-mono font-bold text-slate-700">{room.lockId || `KEY-${room.number}`}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-400">Phone Ext:</span>
                                                    <span className="font-mono font-semibold text-slate-700">{room.phoneExt || `2${room.number}`}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                                            <span className={`px-2 py-0.5 rounded-full font-bold ${getHousekeepingBadge(room.housekeepingStatus)}`}>
                                                HK: {room.housekeepingStatus}
                                            </span>
                                            {room.isConnecting && (
                                                <span className="text-primary font-bold bg-primary-subtle px-2 py-0.5 rounded-md text-[10px] border border-primary-border/40">
                                                    Connecting {room.connectedTo ? `(${room.connectedTo})` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Form View */}
            {view === 'form' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Navigation Tabs */}
                    <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs flex gap-2 overflow-x-auto text-xs font-semibold">
                        {[
                            { id: 'location', label: 'Location & Identity', icon: <MapPin className="size-4" /> },
                            { id: 'systems', label: 'Technical & Locks', icon: <Key className="size-4" /> },
                            { id: 'attributes', label: 'Connecting & Specs', icon: <Layers className="size-4" /> },
                            { id: 'status', label: 'Housekeeping & Status', icon: <CheckCircle2 className="size-4" /> },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-primary-subtle text-primary font-bold shadow-2xs'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Forms */}
                    <div className="card-container p-6 space-y-6">
                        {/* Tab 1: Location & Identity */}
                        {activeTab === 'location' && (
                            <div className="space-y-5">
                                <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                                    <MapPin className="size-5 text-primary" />
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Physical Location & Categorization</h3>
                                        <p className="text-xs text-slate-500">Building wing, floor elevation, and room inventory designation</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Room Number <span className="text-rose-500">*</span></label>
                                        <input
                                            type="text"
                                            value={formData.number}
                                            onChange={e => updateField('number', e.target.value)}
                                            className="input-standard font-mono font-bold"
                                            placeholder="e.g. 101"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Room Name / Alias (Optional)</label>
                                        <input
                                            type="text"
                                            value={formData.name || ''}
                                            onChange={e => updateField('name', e.target.value)}
                                            className="input-standard"
                                            placeholder="e.g. Bay View Suite"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Building Complex <span className="text-rose-500">*</span></label>
                                        <select
                                            value={formData.buildingId}
                                            onChange={e => updateField('buildingId', e.target.value)}
                                            className="select-standard"
                                        >
                                            {availableBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Floor Level <span className="text-rose-500">*</span></label>
                                        <select
                                            value={formData.floorId}
                                            onChange={e => updateField('floorId', e.target.value)}
                                            className="select-standard"
                                        >
                                            {availableFloors.map(f => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Room Category Type <span className="text-rose-500">*</span></label>
                                        <select
                                            value={formData.roomTypeId}
                                            onChange={e => updateField('roomTypeId', e.target.value)}
                                            className="select-standard font-semibold text-slate-800"
                                        >
                                            {availableRoomTypes.map(t => (
                                                <option key={t.id} value={String(t.id)}>{t.name} ({t.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Technical & Systems */}
                        {activeTab === 'systems' && (
                            <div className="space-y-5">
                                <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                                    <Key className="size-5 text-primary" />
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Door Locks & Communication Systems</h3>
                                        <p className="text-xs text-slate-500">RFID lock encoder bindings and in-room telephony extension</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">RFID Door Lock Encoder ID</label>
                                        <input
                                            type="text"
                                            value={formData.lockId || ''}
                                            onChange={e => updateField('lockId', e.target.value)}
                                            className="input-standard font-mono"
                                            placeholder="e.g. RFID-101"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">PBX Phone Extension</label>
                                        <input
                                            type="text"
                                            value={formData.phoneExt || ''}
                                            onChange={e => updateField('phoneExt', e.target.value)}
                                            className="input-standard font-mono"
                                            placeholder="e.g. 2101"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Connectivity & Attributes */}
                        {activeTab === 'attributes' && (
                            <div className="space-y-5">
                                <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                                    <Layers className="size-5 text-primary" />
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Interconnection & Room Specifications</h3>
                                        <p className="text-xs text-slate-500">Adjoining door connections, smoking compliance, and elevator proximity</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                                        <div>
                                            <span className="text-xs font-bold text-slate-800">Connecting Room Facility</span>
                                            <p className="text-[11px] text-slate-500">Has an internal connecting door to an adjoining room</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData.isConnecting}
                                            onChange={e => updateField('isConnecting', e.target.checked)}
                                            className="size-4 text-primary rounded"
                                        />
                                    </div>

                                    {formData.isConnecting && (
                                        <div className="space-y-1.5 p-3.5 bg-primary-subtle/30 rounded-2xl border border-primary-border/40">
                                            <label className="text-xs font-semibold text-slate-700">Connected With Adjoining Room #</label>
                                            <input
                                                type="text"
                                                value={formData.connectedTo || ''}
                                                onChange={e => updateField('connectedTo', e.target.value)}
                                                placeholder="e.g. 102"
                                                className="input-standard font-mono bg-white"
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700">Smoking Policy</label>
                                            <select
                                                value={formData.smokingStatus}
                                                onChange={e => updateField('smokingStatus', e.target.value)}
                                                className="select-standard"
                                            >
                                                <option value="Non-Smoking">Non-Smoking Throughout</option>
                                                <option value="Smoking">Smoking Permitted</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700">Elevator Proximity</label>
                                            <select
                                                value={formData.nearElevator ? 'yes' : 'no'}
                                                onChange={e => updateField('nearElevator', e.target.value === 'yes')}
                                                className="select-standard"
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
                            <div className="space-y-5">
                                <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                                    <CheckCircle2 className="size-5 text-primary" />
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Operational & Housekeeping States</h3>
                                        <p className="text-xs text-slate-500">Live inventory reservation eligibility and housekeeping approval</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Inventory Status <span className="text-rose-500">*</span></label>
                                        <select
                                            value={formData.status}
                                            onChange={e => updateField('status', e.target.value)}
                                            className="select-standard font-semibold text-slate-800"
                                        >
                                            <option value="Active">Active (Available for Reservation)</option>
                                            <option value="Out of Order">Out of Order (OOO)</option>
                                            <option value="Maintenance">Under Maintenance</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Housekeeping Cleanliness</label>
                                        <select
                                            value={formData.housekeepingStatus}
                                            onChange={e => updateField('housekeepingStatus', e.target.value)}
                                            className="select-standard font-semibold text-slate-800"
                                        >
                                            <option value="Clean">Clean (Ready for Check-In)</option>
                                            <option value="Dirty">Dirty (Needs Cleaning)</option>
                                            <option value="Inspected">Inspected (Supervisor Approved)</option>
                                        </select>
                                    </div>
                                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Maintenance Remarks / HK Log</label>
                                        <textarea
                                            value={formData.remarks || ''}
                                            onChange={e => updateField('remarks', e.target.value)}
                                            rows={3}
                                            className="input-standard resize-none py-2"
                                            placeholder="e.g. Deep carpet shampooing completed. AC thermostat calibrated."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                            <button
                                onClick={() => setView('list')}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn-primary"
                            >
                                <Save className="size-4 mr-1.5" />
                                <span>Save Room</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
