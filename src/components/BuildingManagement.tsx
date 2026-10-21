import React, { useState, useEffect, useMemo } from 'react';
import {
    Building2, Layers, MapPin, Plus, Search, Edit2, Trash2,
    Save, X, LayoutGrid, Table as TableIcon,
    ArrowRight, BedDouble, ShieldCheck, RefreshCw,
    Sparkles, Compass
} from 'lucide-react';

// ============================================================================
// DATA MODELS & INTERFACES
// ============================================================================

export interface Building {
    id: string;
    title: string;
    shortCode: string;
    type: 'Main Tower' | 'Executive Block' | 'Annex' | 'Villa' | 'Resort Cottage' | 'Service Wing';
    description: string;
    totalFloors: number;
    groundFloorLabel: string;
    hasBasement: boolean;
    hasElevator: boolean;
    wheelchairAccess: boolean;
    distanceFromLobby: string;
    mapCoordinates: string;
    specificAddress: string;
    status: 'Active' | 'Under Renovation' | 'Inactive' | 'Planned';
    openingDate: string;
    renovationEnds?: string;
    remarks: string;
}

export interface Floor {
    id: string;
    name: string;
    floorNumber: number;
    code: string;
    buildingId: string;
    category: 'Guest Rooms' | 'Public & Guest' | 'Executive Club' | 'VIP Penthouse' | 'Service & Admin';
    roomCapacity: number;
    hasElevatorAccess: boolean;
    hasFireExit: boolean;
    hasLinenCloset: boolean;
    hasServiceStation: boolean;
    hasIceMachine: boolean;
    status: 'Open' | 'Maintenance' | 'Restricted' | 'Closed';
    description: string;
    sortOrder: number;
}

interface RoomSummary {
    id: number;
    number: string;
    buildingId: string;
    floorId: string;
    status: string;
    housekeepingStatus: string;
}

// ============================================================================
// INITIAL SEED DATA (Synchronized with 34-room Hotel Master)
// ============================================================================

export const INITIAL_BUILDINGS: Building[] = [
    {
        id: '1',
        title: 'Main Tower (Ocean Front)',
        shortCode: 'MT-OCN',
        type: 'Main Tower',
        description: 'Primary beach-facing tower housing guest reception, grand lobby, standard and superior suites.',
        totalFloors: 3,
        groundFloorLabel: 'G (Lobby & Garden)',
        hasBasement: true,
        hasElevator: true,
        wheelchairAccess: true,
        distanceFromLobby: '0 mins (Connected)',
        mapCoordinates: '21.4272° N, 91.9805° E',
        specificAddress: 'Wing A, Sea Breeze Boulevard, Marine Drive',
        status: 'Active',
        openingDate: '2021-01-15',
        remarks: 'Main accommodation hub with 24 guest rooms across Floors 1-3'
    },
    {
        id: '2',
        title: 'Executive Wing',
        shortCode: 'EW-VIP',
        type: 'Executive Block',
        description: 'Exclusive private wing featuring private keycard elevators, executive lounge, and VIP penthouses.',
        totalFloors: 2,
        groundFloorLabel: 'Private Atrium L4',
        hasBasement: false,
        hasElevator: true,
        wheelchairAccess: true,
        distanceFromLobby: '2 mins (Skybridge)',
        mapCoordinates: '21.4276° N, 91.9810° E',
        specificAddress: 'Wing B, East Garden Promenade',
        status: 'Active',
        openingDate: '2022-06-01',
        remarks: 'High-yield VIP suite wing with 10 club rooms & penthouses across Floors 4-5'
    }
];

export const INITIAL_FLOORS: Floor[] = [
    {
        id: '1',
        name: 'Floor 1 (Ground & Garden)',
        floorNumber: 1,
        code: 'FL-01',
        buildingId: '1',
        category: 'Public & Guest',
        roomCapacity: 8,
        hasElevatorAccess: true,
        hasFireExit: true,
        hasLinenCloset: true,
        hasServiceStation: true,
        hasIceMachine: true,
        status: 'Open',
        description: 'Ground garden veranda access rooms with direct walkway to the pool & courtyard.',
        sortOrder: 1
    },
    {
        id: '2',
        name: 'Floor 2 (Standard & Deluxe)',
        floorNumber: 2,
        code: 'FL-02',
        buildingId: '1',
        category: 'Guest Rooms',
        roomCapacity: 8,
        hasElevatorAccess: true,
        hasFireExit: true,
        hasLinenCloset: true,
        hasServiceStation: true,
        hasIceMachine: true,
        status: 'Open',
        description: 'Mid-level standard and deluxe balcony guest rooms overlooking the bay.',
        sortOrder: 2
    },
    {
        id: '3',
        name: 'Floor 3 (Superior Wing)',
        floorNumber: 3,
        code: 'FL-03',
        buildingId: '1',
        category: 'Guest Rooms',
        roomCapacity: 8,
        hasElevatorAccess: true,
        hasFireExit: true,
        hasLinenCloset: true,
        hasServiceStation: true,
        hasIceMachine: false,
        status: 'Open',
        description: 'Upper floor superior view rooms with quiet zone acoustical doors.',
        sortOrder: 3
    },
    {
        id: '4',
        name: 'Floor 4 (Executive Club)',
        floorNumber: 4,
        code: 'FL-04',
        buildingId: '2',
        category: 'Executive Club',
        roomCapacity: 6,
        hasElevatorAccess: true,
        hasFireExit: true,
        hasLinenCloset: true,
        hasServiceStation: true,
        hasIceMachine: true,
        status: 'Open',
        description: 'Executive club level with dedicated concierge station and private breakfast lounge.',
        sortOrder: 4
    },
    {
        id: '5',
        name: 'Floor 5 (VIP Penthouse)',
        floorNumber: 5,
        code: 'FL-05',
        buildingId: '2',
        category: 'VIP Penthouse',
        roomCapacity: 4,
        hasElevatorAccess: true,
        hasFireExit: true,
        hasLinenCloset: true,
        hasServiceStation: true,
        hasIceMachine: true,
        status: 'Open',
        description: 'Top-tier luxury presidential suites with private Jacuzzi terraces and butler quarters.',
        sortOrder: 5
    }
];

const STORAGE_KEY_BUILDINGS = 'hotel_buildings_v2';
const STORAGE_KEY_FLOORS = 'hotel_floors_v2';
const STORAGE_KEY_ROOMS = 'hotel_rooms_inventory_v1';

// Initial fallback rooms if localStorage is empty
const INITIAL_ROOM_SUMMARIES: RoomSummary[] = [
    { id: 1, number: '101', buildingId: '1', floorId: '1', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 2, number: '102', buildingId: '1', floorId: '1', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 3, number: '103', buildingId: '1', floorId: '1', status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 4, number: '104', buildingId: '1', floorId: '1', status: 'Active', housekeepingStatus: 'Inspected' },
    { id: 5, number: '105', buildingId: '1', floorId: '1', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 6, number: '106', buildingId: '1', floorId: '1', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 7, number: '107', buildingId: '1', floorId: '1', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 8, number: '108', buildingId: '1', floorId: '1', status: 'Out of Order', housekeepingStatus: 'Dirty' },
    { id: 9, number: '201', buildingId: '1', floorId: '2', status: 'Active', housekeepingStatus: 'Inspected' },
    { id: 10, number: '202', buildingId: '1', floorId: '2', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 11, number: '203', buildingId: '1', floorId: '2', status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 12, number: '204', buildingId: '1', floorId: '2', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 13, number: '205', buildingId: '1', floorId: '2', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 14, number: '206', buildingId: '1', floorId: '2', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 15, number: '207', buildingId: '1', floorId: '2', status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 16, number: '208', buildingId: '1', floorId: '2', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 17, number: '301', buildingId: '1', floorId: '3', status: 'Active', housekeepingStatus: 'Inspected' },
    { id: 18, number: '302', buildingId: '1', floorId: '3', status: 'Active', housekeepingStatus: 'Inspected' },
    { id: 19, number: '303', buildingId: '1', floorId: '3', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 20, number: '304', buildingId: '1', floorId: '3', status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 21, number: '305', buildingId: '1', floorId: '3', status: 'Active', housekeepingStatus: 'Dirty' },
    { id: 22, number: '306', buildingId: '1', floorId: '3', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 23, number: '307', buildingId: '1', floorId: '3', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 24, number: '308', buildingId: '1', floorId: '3', status: 'Active', housekeepingStatus: 'Inspected' },
    { id: 25, number: '401', buildingId: '2', floorId: '4', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 26, number: '402', buildingId: '2', floorId: '4', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 27, number: '403', buildingId: '2', floorId: '4', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 28, number: '404', buildingId: '2', floorId: '4', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 29, number: '405', buildingId: '2', floorId: '4', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 30, number: '410', buildingId: '2', floorId: '4', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 31, number: '501', buildingId: '2', floorId: '5', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 32, number: '502', buildingId: '2', floorId: '5', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 33, number: '503', buildingId: '2', floorId: '5', status: 'Active', housekeepingStatus: 'Clean' },
    { id: 34, number: '505', buildingId: '2', floorId: '5', status: 'Active', housekeepingStatus: 'Clean' }
];

interface BuildingManagementProps {
    initialTab?: 'buildings' | 'floors' | 'matrix';
}

const BuildingManagement: React.FC<BuildingManagementProps> = ({ initialTab = 'buildings' }) => {
    // Navigation / View Tabs
    const [mainTab, setMainTab] = useState<'buildings' | 'floors' | 'matrix'>(initialTab);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Keep mainTab in sync if parent changes initialTab
    useEffect(() => {
        if (initialTab) {
            setMainTab(initialTab);
        }
    }, [initialTab]);

    // State: Buildings
    const [buildings, setBuildings] = useState<Building[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_BUILDINGS);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Failed to load buildings', e);
        }
        return INITIAL_BUILDINGS;
    });

    // State: Floors
    const [floors, setFloors] = useState<Floor[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_FLOORS);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Failed to load floors', e);
        }
        return INITIAL_FLOORS;
    });

    // State: Rooms (Read from actual hotel room inventory)
    const [rooms, setRooms] = useState<RoomSummary[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_ROOMS);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Failed to load rooms', e);
        }
        return INITIAL_ROOM_SUMMARIES;
    });

    // Refresh rooms whenever component is focused
    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const saved = localStorage.getItem(STORAGE_KEY_ROOMS);
                if (saved) setRooms(JSON.parse(saved));
            } catch {}
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Filters & Search
    const [buildingSearch, setBuildingSearch] = useState('');
    const [buildingStatusFilter, setBuildingStatusFilter] = useState<string>('all');
    const [buildingTypeFilter, setBuildingTypeFilter] = useState<string>('all');

    const [floorSearch, setFloorSearch] = useState('');
    const [floorBuildingFilter, setFloorBuildingFilter] = useState<string>('all');
    const [floorCategoryFilter, setFloorCategoryFilter] = useState<string>('all');
    const [floorStatusFilter, setFloorStatusFilter] = useState<string>('all');

    // Modals
    const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
    const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
    const [buildingFormTab, setBuildingFormTab] = useState<'basic' | 'specs' | 'location' | 'status'>('basic');

    const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
    const [editingFloor, setEditingFloor] = useState<Floor | null>(null);

    // Toast notification
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Save helper: Buildings
    const saveBuildings = (updated: Building[]) => {
        setBuildings(updated);
        try {
            localStorage.setItem(STORAGE_KEY_BUILDINGS, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save buildings to localStorage', e);
        }
    };

    // Save helper: Floors
    const saveFloors = (updated: Floor[]) => {
        setFloors(updated);
        try {
            localStorage.setItem(STORAGE_KEY_FLOORS, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save floors to localStorage', e);
        }
    };

    // ========================================================================
    // DERIVED COMPUTATIONS & METRICS
    // ========================================================================

    const buildingMetrics = useMemo(() => {
        const totalBuildings = buildings.length;
        const activeBuildings = buildings.filter(b => b.status === 'Active').length;
        const totalFloors = floors.length;
        const totalRooms = rooms.length;
        const cleanRooms = rooms.filter(r => r.housekeepingStatus === 'Clean' || r.housekeepingStatus === 'Inspected').length;
        const readinessRate = totalRooms > 0 ? Math.round((cleanRooms / totalRooms) * 100) : 100;

        return {
            totalBuildings,
            activeBuildings,
            totalFloors,
            totalRooms,
            readinessRate
        };
    }, [buildings, floors, rooms]);

    // Filtered Buildings
    const filteredBuildings = useMemo(() => {
        return buildings.filter(b => {
            const matchesSearch = b.title.toLowerCase().includes(buildingSearch.toLowerCase()) ||
                b.shortCode.toLowerCase().includes(buildingSearch.toLowerCase()) ||
                b.specificAddress.toLowerCase().includes(buildingSearch.toLowerCase());
            const matchesStatus = buildingStatusFilter === 'all' || b.status === buildingStatusFilter;
            const matchesType = buildingTypeFilter === 'all' || b.type === buildingTypeFilter;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [buildings, buildingSearch, buildingStatusFilter, buildingTypeFilter]);

    // Filtered Floors
    const filteredFloors = useMemo(() => {
        return floors.filter(f => {
            const matchesSearch = f.name.toLowerCase().includes(floorSearch.toLowerCase()) ||
                f.code.toLowerCase().includes(floorSearch.toLowerCase()) ||
                f.description.toLowerCase().includes(floorSearch.toLowerCase());
            const matchesBuilding = floorBuildingFilter === 'all' || f.buildingId === floorBuildingFilter;
            const matchesCategory = floorCategoryFilter === 'all' || f.category === floorCategoryFilter;
            const matchesStatus = floorStatusFilter === 'all' || f.status === floorStatusFilter;
            return matchesSearch && matchesBuilding && matchesCategory && matchesStatus;
        }).sort((a, b) => a.sortOrder - b.sortOrder);
    }, [floors, floorSearch, floorBuildingFilter, floorCategoryFilter, floorStatusFilter]);

    // Helper: Rooms by Floor
    const getRoomsForFloor = (floorId: string) => {
        return rooms.filter(r => r.floorId === floorId);
    };

    // Helper: Rooms by Building
    const getRoomsForBuilding = (buildingId: string) => {
        return rooms.filter(r => r.buildingId === buildingId);
    };

    // Helper: Housekeeping badge color
    const getHkBadgeClass = (status: string) => {
        switch (status) {
            case 'Clean': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Dirty': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'Inspected': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Out of Order': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    // ========================================================================
    // BUILDING CRUD HANDLERS
    // ========================================================================

    const handleOpenAddBuilding = () => {
        const nextId = String(Date.now());
        setEditingBuilding({
            id: nextId,
            title: '',
            shortCode: '',
            type: 'Main Tower',
            description: '',
            totalFloors: 1,
            groundFloorLabel: 'G',
            hasBasement: false,
            hasElevator: true,
            wheelchairAccess: true,
            distanceFromLobby: '0 mins',
            mapCoordinates: '21.4272° N, 91.9805° E',
            specificAddress: '',
            status: 'Active',
            openingDate: new Date().toISOString().split('T')[0],
            remarks: ''
        });
        setBuildingFormTab('basic');
        setIsBuildingModalOpen(true);
    };

    const handleOpenEditBuilding = (b: Building) => {
        setEditingBuilding({ ...b });
        setBuildingFormTab('basic');
        setIsBuildingModalOpen(true);
    };

    const handleSaveBuilding = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBuilding) return;
        if (!editingBuilding.title.trim()) {
            alert('Building Title is required');
            return;
        }

        const exists = buildings.some(b => b.id === editingBuilding.id);
        let updated: Building[];
        if (exists) {
            updated = buildings.map(b => b.id === editingBuilding.id ? editingBuilding : b);
            showToast(`Building "${editingBuilding.title}" updated successfully!`);
        } else {
            updated = [...buildings, editingBuilding];
            showToast(`Building "${editingBuilding.title}" added to property structure!`);
        }

        saveBuildings(updated);
        setIsBuildingModalOpen(false);
        setEditingBuilding(null);
    };

    const handleDeleteBuilding = (building: Building) => {
        const attachedFloors = floors.filter(f => f.buildingId === building.id);
        const attachedRooms = rooms.filter(r => r.buildingId === building.id);

        if (attachedRooms.length > 0) {
            if (!confirm(`Warning: Building "${building.title}" currently has ${attachedRooms.length} physical room(s) assigned. Deleting this building will orphan these room records. Are you sure you want to proceed?`)) {
                return;
            }
        } else if (attachedFloors.length > 0) {
            if (!confirm(`Building "${building.title}" has ${attachedFloors.length} configured floor(s). Are you sure you want to delete this building?`)) {
                return;
            }
        } else {
            if (!confirm(`Delete building "${building.title}"?`)) return;
        }

        const updatedBuildings = buildings.filter(b => b.id !== building.id);
        saveBuildings(updatedBuildings);
        showToast(`Building "${building.title}" removed.`);
    };

    // Quick navigation: Jump from Building Card to Floor Tab with pre-filter
    const handleJumpToFloorsForBuilding = (buildingId: string) => {
        setFloorBuildingFilter(buildingId);
        setMainTab('floors');
    };

    // ========================================================================
    // FLOOR CRUD HANDLERS
    // ========================================================================

    const handleOpenAddFloor = (preselectedBuildingId?: string) => {
        const defaultBId = preselectedBuildingId || (buildings[0]?.id ?? '1');
        const nextFloorNum = floors.filter(f => f.buildingId === defaultBId).length + 1;
        setEditingFloor({
            id: String(Date.now()),
            name: `Floor ${nextFloorNum}`,
            floorNumber: nextFloorNum,
            code: `FL-0${nextFloorNum}`,
            buildingId: defaultBId,
            category: 'Guest Rooms',
            roomCapacity: 8,
            hasElevatorAccess: true,
            hasFireExit: true,
            hasLinenCloset: true,
            hasServiceStation: true,
            hasIceMachine: false,
            status: 'Open',
            description: `Floor ${nextFloorNum} guest rooms`,
            sortOrder: floors.length + 1
        });
        setIsFloorModalOpen(true);
    };

    const handleOpenEditFloor = (f: Floor) => {
        setEditingFloor({ ...f });
        setIsFloorModalOpen(true);
    };

    const handleSaveFloor = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingFloor) return;
        if (!editingFloor.name.trim()) {
            alert('Floor Name is required');
            return;
        }

        const exists = floors.some(f => f.id === editingFloor.id);
        let updated: Floor[];
        if (exists) {
            updated = floors.map(f => f.id === editingFloor.id ? editingFloor : f);
            showToast(`Floor "${editingFloor.name}" updated successfully!`);
        } else {
            updated = [...floors, editingFloor];
            showToast(`Floor "${editingFloor.name}" added to building!`);
        }

        saveFloors(updated);
        setIsFloorModalOpen(false);
        setEditingFloor(null);
    };

    const handleDeleteFloor = (floor: Floor) => {
        const attachedRooms = rooms.filter(r => r.floorId === floor.id);
        if (attachedRooms.length > 0) {
            if (!confirm(`Warning: Floor "${floor.name}" currently has ${attachedRooms.length} room(s) assigned (${attachedRooms.map(r => r.number).join(', ')}). Are you sure you want to delete this floor?`)) {
                return;
            }
        } else {
            if (!confirm(`Delete floor "${floor.name}"?`)) return;
        }

        const updatedFloors = floors.filter(f => f.id !== floor.id);
        saveFloors(updatedFloors);
        showToast(`Floor "${floor.name}" deleted.`);
    };

    return (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 min-h-[calc(100vh-100px)] flex flex-col font-sans">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-semibold animate-bounce">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* TOP HEADER */}
            <div className="p-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-3 bg-gray-50/70">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Property Structure & Architecture</h1>
                        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                            {buildingMetrics.totalBuildings} Buildings • {buildingMetrics.totalFloors} Floors
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Manage wings, towers, building metadata, floor levels, amenities, and room capacity distribution
                    </p>
                </div>

                {/* Primary Action Buttons & Tab Switchers */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Main Tab Switcher */}
                    <div className="bg-gray-200/80 p-0.5 rounded-lg flex items-center text-xs font-semibold">
                        <button
                            onClick={() => setMainTab('buildings')}
                            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                                mainTab === 'buildings'
                                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Building2 size={13} />
                            <span>Buildings</span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-mono px-1 rounded">
                                {buildings.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setMainTab('floors')}
                            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                                mainTab === 'floors'
                                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Layers size={13} />
                            <span>Floors</span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-mono px-1 rounded">
                                {floors.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setMainTab('matrix')}
                            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                                mainTab === 'matrix'
                                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Compass size={13} />
                            <span>Capacity Matrix</span>
                        </button>
                    </div>

                    {/* Add Buttons depending on active tab */}
                    {mainTab === 'buildings' && (
                        <button
                            onClick={handleOpenAddBuilding}
                            className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus size={14} /> Add Building
                        </button>
                    )}
                    {mainTab === 'floors' && (
                        <button
                            onClick={() => handleOpenAddFloor()}
                            className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus size={14} /> Add Floor
                        </button>
                    )}
                </div>
            </div>

            {/* TOP METRICS SUMMARY STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50/40 border-b border-gray-100 text-xs">
                <div className="bg-white p-3 rounded-lg border border-gray-200/80 flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 text-[11px] font-medium block">Total Property Buildings</span>
                        <div className="text-lg font-bold text-gray-900 mt-0.5 flex items-baseline gap-1.5">
                            {buildingMetrics.totalBuildings}
                            <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                                ({buildingMetrics.activeBuildings} Active)
                            </span>
                        </div>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                        <Building2 size={16} />
                    </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200/80 flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 text-[11px] font-medium block">Floor Levels Configured</span>
                        <div className="text-lg font-bold text-gray-900 mt-0.5 flex items-baseline gap-1.5">
                            {buildingMetrics.totalFloors}
                            <span className="text-[10px] text-gray-400 font-semibold font-mono">Levels</span>
                        </div>
                    </div>
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md">
                        <Layers size={16} />
                    </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200/80 flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 text-[11px] font-medium block">Attached Physical Rooms</span>
                        <div className="text-lg font-bold text-gray-900 mt-0.5 flex items-baseline gap-1.5">
                            {buildingMetrics.totalRooms}
                            <span className="text-[10px] text-blue-600 font-semibold font-mono">Keys</span>
                        </div>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
                        <BedDouble size={16} />
                    </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200/80 flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 text-[11px] font-medium block">Clean / Inspected Ready</span>
                        <div className="text-lg font-bold text-gray-900 mt-0.5 flex items-baseline gap-1.5">
                            {buildingMetrics.readinessRate}%
                            <span className="text-[10px] text-emerald-600 font-semibold">Housekeeping</span>
                        </div>
                    </div>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-md">
                        <ShieldCheck size={16} />
                    </div>
                </div>
            </div>

            {/* TAB CONTENT 1: BUILDINGS MASTER */}
            {mainTab === 'buildings' && (
                <div className="flex-1 flex flex-col p-4">
                    {/* Control Bar: Search & Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                            {/* Live Search */}
                            <div className="relative flex-1 min-w-[220px] max-w-sm">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={buildingSearch}
                                    onChange={(e) => setBuildingSearch(e.target.value)}
                                    placeholder="Search buildings by title, code, address..."
                                    className="w-full h-8 pl-8 pr-3 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                />
                                {buildingSearch && (
                                    <button
                                        onClick={() => setBuildingSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Status Pills */}
                            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px]">
                                {['all', 'Active', 'Under Renovation', 'Inactive'].map((st) => (
                                    <button
                                        key={st}
                                        onClick={() => setBuildingStatusFilter(st)}
                                        className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors ${
                                            buildingStatusFilter === st
                                                ? 'bg-white text-gray-900 shadow-2xs font-bold'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        {st === 'all' ? 'All Status' : st}
                                    </button>
                                ))}
                            </div>

                            {/* Type Filter */}
                            <select
                                value={buildingTypeFilter}
                                onChange={(e) => setBuildingTypeFilter(e.target.value)}
                                className="h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 outline-none"
                            >
                                <option value="all">All Building Types</option>
                                <option value="Main Tower">Main Tower</option>
                                <option value="Executive Block">Executive Block</option>
                                <option value="Annex">Annex</option>
                                <option value="Villa">Villa</option>
                                <option value="Resort Cottage">Resort Cottage</option>
                            </select>
                        </div>

                        {/* View Switcher: Grid vs Table */}
                        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-all ${
                                    viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
                                }`}
                                title="Card View"
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-md transition-all ${
                                    viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
                                }`}
                                title="Table View"
                            >
                                <TableIcon size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Buildings List View */}
                    {filteredBuildings.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
                            <Building2 size={36} className="mx-auto text-gray-300 mb-2" />
                            <h3 className="text-sm font-bold text-gray-700">No buildings matched your criteria</h3>
                            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                                Try refining your search query or reset status filters.
                            </p>
                            <button
                                onClick={() => {
                                    setBuildingSearch('');
                                    setBuildingStatusFilter('all');
                                    setBuildingTypeFilter('all');
                                }}
                                className="mt-3 text-xs text-blue-600 font-semibold hover:underline"
                            >
                                Reset all filters
                            </button>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredBuildings.map((building) => {
                                const buildingFloors = floors.filter(f => f.buildingId === building.id);
                                const buildingRooms = getRoomsForBuilding(building.id);
                                const cleanRoomsCount = buildingRooms.filter(r => r.housekeepingStatus === 'Clean' || r.housekeepingStatus === 'Inspected').length;

                                return (
                                    <div
                                        key={building.id}
                                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
                                    >
                                        <div>
                                            {/* Top Card Bar */}
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono border border-indigo-200/60">
                                                            {building.shortCode}
                                                        </span>
                                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                                            building.status === 'Active'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : building.status === 'Under Renovation'
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-gray-100 text-gray-600 border-gray-200'
                                                        }`}>
                                                            {building.status}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-sm font-bold text-gray-900 mt-1.5 line-clamp-1">
                                                        {building.title}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-500 font-medium">{building.type}</p>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                                                    <button
                                                        onClick={() => handleOpenEditBuilding(building)}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Edit Building"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBuilding(building)}
                                                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Delete Building"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <p className="text-xs text-gray-600 line-clamp-2 mt-1 mb-3">
                                                {building.description || 'No description provided.'}
                                            </p>

                                            {/* Key Stats Pill Row */}
                                            <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs mb-3">
                                                <div>
                                                    <span className="text-[10px] text-gray-400 font-medium block">Total Floors</span>
                                                    <span className="font-bold text-gray-800">
                                                        {buildingFloors.length} ({building.groundFloorLabel || 'G'})
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-gray-400 font-medium block">Rooms Assigned</span>
                                                    <span className="font-bold text-gray-800">
                                                        {buildingRooms.length} Keys{' '}
                                                        <span className="text-[10px] text-emerald-600 font-normal">
                                                            ({cleanRoomsCount} ready)
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Feature Badges */}
                                            <div className="flex flex-wrap gap-1.5 mb-3 text-[10px]">
                                                {building.hasElevator && (
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium border border-blue-100">
                                                        🛗 Elevator
                                                    </span>
                                                )}
                                                {building.wheelchairAccess && (
                                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-medium border border-purple-100">
                                                        ♿ Wheelchair ADA
                                                    </span>
                                                )}
                                                {building.hasBasement && (
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-medium border border-gray-200">
                                                        Sub-Basement
                                                    </span>
                                                )}
                                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-medium border border-amber-100">
                                                    ⏱ {building.distanceFromLobby || 'Near Lobby'}
                                                </span>
                                            </div>

                                            {/* Address / Location snippet */}
                                            {building.specificAddress && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-3 truncate">
                                                    <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                                                    <span className="truncate">{building.specificAddress}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Footer: Manage Floors Shortcut */}
                                        <div className="border-t border-gray-100 pt-2.5 mt-1 flex justify-between items-center text-xs">
                                            <span className="text-[11px] text-gray-400 font-mono">
                                                ID: #{building.id}
                                            </span>
                                            <button
                                                onClick={() => handleJumpToFloorsForBuilding(building.id)}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                                            >
                                                <span>View & Manage Floors</span>
                                                <ArrowRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Table View for Buildings */
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                            <div className="overflow-x-auto min-w-[760px]">
                                <table className="w-full text-left text-xs text-gray-700 divide-y divide-gray-200">
                                    <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                        <tr>
                                            <th className="py-2.5 px-3">Code</th>
                                            <th className="py-2.5 px-3">Building Title</th>
                                            <th className="py-2.5 px-3">Type</th>
                                            <th className="py-2.5 px-3">Floors</th>
                                            <th className="py-2.5 px-3">Rooms Attached</th>
                                            <th className="py-2.5 px-3">Accessibility</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {filteredBuildings.map((building) => {
                                            const buildingFloors = floors.filter(f => f.buildingId === building.id);
                                            const buildingRooms = getRoomsForBuilding(building.id);

                                            return (
                                                <tr key={building.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                                                        {building.shortCode}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="font-bold text-gray-900">{building.title}</div>
                                                        <div className="text-[10px] text-gray-400">{building.specificAddress}</div>
                                                    </td>
                                                    <td className="py-2 px-3 font-medium text-gray-600">{building.type}</td>
                                                    <td className="py-2 px-3 font-semibold text-gray-800">
                                                        {buildingFloors.length} Floors
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                                            {buildingRooms.length} Rooms
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="flex gap-1 text-[10px]">
                                                            {building.hasElevator && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">🛗 Lift</span>}
                                                            {building.wheelchairAccess && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">♿ ADA</span>}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                            building.status === 'Active'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                            {building.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleJumpToFloorsForBuilding(building.id)}
                                                                className="px-2 py-1 text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
                                                            >
                                                                Floors ({buildingFloors.length})
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenEditBuilding(building)}
                                                                className="p-1 text-gray-500 hover:text-blue-600"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteBuilding(building)}
                                                                className="p-1 text-gray-500 hover:text-rose-600"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT 2: FLOOR MANAGEMENT */}
            {mainTab === 'floors' && (
                <div className="flex-1 flex flex-col p-4">
                    {/* Control Bar: Filters & Search */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px] max-w-xs">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={floorSearch}
                                    onChange={(e) => setFloorSearch(e.target.value)}
                                    placeholder="Search floor name, code..."
                                    className="w-full h-8 pl-8 pr-3 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                />
                                {floorSearch && (
                                    <button
                                        onClick={() => setFloorSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Building Filter Dropdown */}
                            <select
                                value={floorBuildingFilter}
                                onChange={(e) => setFloorBuildingFilter(e.target.value)}
                                className="h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 outline-none font-medium"
                            >
                                <option value="all">🏢 All Buildings ({buildings.length})</option>
                                {buildings.map(b => (
                                    <option key={b.id} value={b.id}>🏢 {b.title}</option>
                                ))}
                            </select>

                            {/* Floor Category Filter */}
                            <select
                                value={floorCategoryFilter}
                                onChange={(e) => setFloorCategoryFilter(e.target.value)}
                                className="h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 outline-none"
                            >
                                <option value="all">All Floor Categories</option>
                                <option value="Guest Rooms">Guest Rooms</option>
                                <option value="Public & Guest">Public & Guest</option>
                                <option value="Executive Club">Executive Club</option>
                                <option value="VIP Penthouse">VIP Penthouse</option>
                                <option value="Service & Admin">Service & Admin</option>
                            </select>

                            {/* Status Filter */}
                            <select
                                value={floorStatusFilter}
                                onChange={(e) => setFloorStatusFilter(e.target.value)}
                                className="h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 outline-none"
                            >
                                <option value="all">All Operational Statuses</option>
                                <option value="Open">Open</option>
                                <option value="Maintenance">Maintenance</option>
                                <option value="Restricted">Restricted</option>
                                <option value="Closed">Closed</option>
                            </select>

                            {floorBuildingFilter !== 'all' && (
                                <button
                                    onClick={() => setFloorBuildingFilter('all')}
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                                >
                                    <RefreshCw size={11} /> Clear building filter
                                </button>
                            )}
                        </div>

                        {/* View Switcher: Stack Cards vs Table */}
                        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-all ${
                                    viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
                                }`}
                                title="Card View"
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-md transition-all ${
                                    viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
                                }`}
                                title="Table View"
                            >
                                <TableIcon size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Floor List */}
                    {filteredFloors.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
                            <Layers size={36} className="mx-auto text-gray-300 mb-2" />
                            <h3 className="text-sm font-bold text-gray-700">No floors match this filter</h3>
                            <p className="text-xs text-gray-400 mt-1">Try resetting the building or category filters.</p>
                            <button
                                onClick={() => {
                                    setFloorSearch('');
                                    setFloorBuildingFilter('all');
                                    setFloorCategoryFilter('all');
                                    setFloorStatusFilter('all');
                                }}
                                className="mt-3 text-xs text-blue-600 font-semibold hover:underline"
                            >
                                Reset all filters
                            </button>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredFloors.map((floor) => {
                                const parentBuilding = buildings.find(b => b.id === floor.buildingId);
                                const floorRooms = getRoomsForFloor(floor.id);

                                return (
                                    <div
                                        key={floor.id}
                                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                                    >
                                        <div>
                                            {/* Floor Card Header */}
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex flex-col items-center justify-center font-bold text-xs">
                                                        <span className="text-[9px] uppercase leading-none text-indigo-500">FL</span>
                                                        <span className="leading-none mt-0.5">{floor.floorNumber}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-900 leading-tight">
                                                            {floor.name}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded">
                                                                {parentBuilding?.title || 'Unknown Building'}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-mono">
                                                                {floor.code}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleOpenEditFloor(floor)}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Edit Floor"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteFloor(floor)}
                                                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Delete Floor"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Category & Status */}
                                            <div className="flex items-center justify-between gap-2 mt-2 mb-2 text-xs">
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                    {floor.category}
                                                </span>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                                    floor.status === 'Open'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : floor.status === 'Maintenance'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}>
                                                    {floor.status}
                                                </span>
                                            </div>

                                            {/* Floor Description */}
                                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                                                {floor.description || 'Standard floor layout.'}
                                            </p>

                                            {/* Amenities Badges */}
                                            <div className="flex flex-wrap gap-1 mb-3 text-[10px]">
                                                {floor.hasElevatorAccess && (
                                                    <span className="px-1.5 py-0.5 bg-gray-50 text-gray-700 rounded border border-gray-200">
                                                        🛗 Elevator
                                                    </span>
                                                )}
                                                {floor.hasFireExit && (
                                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">
                                                        🚪 Fire Exit
                                                    </span>
                                                )}
                                                {floor.hasLinenCloset && (
                                                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100">
                                                        🧺 Linen Pantry
                                                    </span>
                                                )}
                                                {floor.hasIceMachine && (
                                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                                        🧊 Ice Machine
                                                    </span>
                                                )}
                                            </div>

                                            {/* Attached Rooms Roster */}
                                            <div className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 mb-2">
                                                <div className="flex justify-between items-center text-[10px] font-semibold text-gray-500 mb-1.5">
                                                    <span>Assigned Rooms ({floorRooms.length})</span>
                                                    <span>Target: {floor.roomCapacity}</span>
                                                </div>
                                                {floorRooms.length === 0 ? (
                                                    <div className="text-[11px] text-gray-400 italic">
                                                        No rooms configured for this level yet.
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                                        {floorRooms.map(rm => (
                                                            <span
                                                                key={rm.id}
                                                                className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${getHkBadgeClass(rm.housekeepingStatus)}`}
                                                                title={`Room ${rm.number} • Status: ${rm.status} • Housekeeping: ${rm.housekeepingStatus}`}
                                                            >
                                                                {rm.number}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="border-t border-gray-100 pt-2 flex justify-between items-center text-[11px] text-gray-400">
                                            <span>Sort Order: #{floor.sortOrder}</span>
                                            <span className="font-semibold text-gray-600">
                                                {floorRooms.length} of {floor.roomCapacity} Rooms
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Table View for Floors */
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                            <div className="overflow-x-auto min-w-[700px]">
                                <table className="w-full text-left text-xs text-gray-700 divide-y divide-gray-200">
                                    <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                                        <tr>
                                            <th className="py-2.5 px-3">Level / Code</th>
                                            <th className="py-2.5 px-3">Floor Name</th>
                                            <th className="py-2.5 px-3">Building Assignment</th>
                                            <th className="py-2.5 px-3">Category</th>
                                            <th className="py-2.5 px-3">Rooms / Capacity</th>
                                            <th className="py-2.5 px-3">Amenities</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {filteredFloors.map((floor) => {
                                            const parentBuilding = buildings.find(b => b.id === floor.buildingId);
                                            const floorRooms = getRoomsForFloor(floor.id);

                                            return (
                                                <tr key={floor.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="py-2 px-3 font-mono font-bold text-gray-800">
                                                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">
                                                            {floor.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="font-bold text-gray-900">{floor.name}</div>
                                                        <div className="text-[10px] text-gray-400">{floor.description}</div>
                                                    </td>
                                                    <td className="py-2 px-3 font-medium text-gray-700">
                                                        {parentBuilding?.title || 'Unassigned'}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                                            {floor.category}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 font-semibold">
                                                        {floorRooms.length} / {floor.roomCapacity} Rooms
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="flex gap-1 text-[10px]">
                                                            {floor.hasElevatorAccess && <span title="Elevator">🛗</span>}
                                                            {floor.hasFireExit && <span title="Fire Exit">🚪</span>}
                                                            {floor.hasLinenCloset && <span title="Linen Closet">🧺</span>}
                                                            {floor.hasIceMachine && <span title="Ice Machine">🧊</span>}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                            floor.status === 'Open'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                            {floor.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleOpenEditFloor(floor)}
                                                                className="p-1 text-gray-500 hover:text-blue-600"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteFloor(floor)}
                                                                className="p-1 text-gray-500 hover:text-rose-600"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT 3: CAPACITY & ARCHITECTURAL MATRIX */}
            {mainTab === 'matrix' && (
                <div className="flex-1 p-4 space-y-6">
                    <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-xl flex items-start gap-3">
                        <div className="p-2 bg-blue-600 text-white rounded-lg flex-shrink-0">
                            <Compass size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Hotel Architectural Matrix & Room Spread</h2>
                            <p className="text-xs text-gray-600 mt-0.5">
                                Visual representation of the property's vertical floor stacks, room assignments, and current housekeeping statuses across all registered wings.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {buildings.map((building) => {
                            const buildingFloors = floors
                                .filter(f => f.buildingId === building.id)
                                .sort((a, b) => b.floorNumber - a.floorNumber); // top floor down to ground
                            const buildingRooms = getRoomsForBuilding(building.id);

                            return (
                                <div key={building.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                                    {/* Building Header Banner */}
                                    <div className="bg-gray-800 text-white p-3.5 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={16} className="text-blue-400" />
                                            <div>
                                                <h3 className="text-sm font-bold tracking-tight">{building.title}</h3>
                                                <span className="text-[10px] text-gray-300 font-mono">
                                                    {building.shortCode} • {building.type}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-xs bg-gray-700/80 px-2.5 py-1 rounded-md font-bold font-mono">
                                            {buildingRooms.length} Rooms Total
                                        </span>
                                    </div>

                                    {/* Vertical Floor Stack */}
                                    <div className="p-4 space-y-3 bg-gray-50/40">
                                        {buildingFloors.length === 0 ? (
                                            <div className="text-center py-6 text-xs text-gray-400">
                                                No floors registered for this wing.
                                            </div>
                                        ) : (
                                            buildingFloors.map((fl) => {
                                                const floorRooms = getRoomsForFloor(fl.id);

                                                return (
                                                    <div
                                                        key={fl.id}
                                                        className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors shadow-2xs"
                                                    >
                                                        <div className="flex justify-between items-center text-xs mb-2 pb-1.5 border-b border-gray-100">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-900">
                                                                    Level {fl.floorNumber}: {fl.name}
                                                                </span>
                                                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-medium">
                                                                    {fl.category}
                                                                </span>
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-gray-500">
                                                                {floorRooms.length} / {fl.roomCapacity} Rooms
                                                            </span>
                                                        </div>

                                                        {/* Room Chips Matrix */}
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {floorRooms.map((rm) => (
                                                                <div
                                                                    key={rm.id}
                                                                    className={`px-2 py-1 rounded-md text-xs font-mono font-bold border flex items-center gap-1.5 ${getHkBadgeClass(
                                                                        rm.housekeepingStatus
                                                                    )}`}
                                                                >
                                                                    <span>{rm.number}</span>
                                                                    <span className="text-[9px] font-sans font-normal opacity-75">
                                                                        {rm.housekeepingStatus}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* MODAL: ADD / EDIT BUILDING */}
            {/* ================================================================ */}
            {isBuildingModalOpen && editingBuilding && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/70 rounded-t-xl">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    {buildings.some(b => b.id === editingBuilding.id) ? 'Edit Building Master' : 'Add New Building'}
                                </h3>
                                <p className="text-xs text-gray-500">Configure tower identity, structural capacity, and location</p>
                            </div>
                            <button
                                onClick={() => setIsBuildingModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Navigation Sub-tabs */}
                        <div className="px-5 pt-3 border-b border-gray-200 flex gap-4 text-xs font-semibold">
                            {[
                                { id: 'basic', label: '1. Identity & Info' },
                                { id: 'specs', label: '2. Structural Specs' },
                                { id: 'location', label: '3. Location & GPS' },
                                { id: 'status', label: '4. Operations & Dates' }
                            ].map((tb) => (
                                <button
                                    key={tb.id}
                                    type="button"
                                    onClick={() => setBuildingFormTab(tb.id as any)}
                                    className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                                        buildingFormTab === tb.id
                                            ? 'border-blue-600 text-blue-700 font-bold'
                                            : 'border-transparent text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    {tb.label}
                                </button>
                            ))}
                        </div>

                        {/* Modal Form Body */}
                        <form onSubmit={handleSaveBuilding} className="flex-1 overflow-y-auto p-5 space-y-4">
                            {/* TAB 1: BASIC INFO */}
                            {buildingFormTab === 'basic' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-xs font-semibold text-gray-700">Building Title *</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingBuilding.title}
                                                onChange={e => setEditingBuilding({ ...editingBuilding, title: e.target.value })}
                                                placeholder="e.g. Ocean View Tower, Executive Wing"
                                                className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Short Code *</label>
                                            <input
                                                type="text"
                                                required
                                                value={editingBuilding.shortCode}
                                                onChange={e => setEditingBuilding({ ...editingBuilding, shortCode: e.target.value.toUpperCase() })}
                                                placeholder="e.g. OCN, EW"
                                                className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg font-mono focus:ring-1 focus:ring-blue-500 outline-none uppercase"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Building Type</label>
                                            <select
                                                value={editingBuilding.type}
                                                onChange={e => setEditingBuilding({ ...editingBuilding, type: e.target.value as any })}
                                                className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white outline-none"
                                            >
                                                <option value="Main Tower">Main Tower</option>
                                                <option value="Executive Block">Executive Block</option>
                                                <option value="Annex">Annex</option>
                                                <option value="Villa">Villa</option>
                                                <option value="Resort Cottage">Resort Cottage</option>
                                                <option value="Service Wing">Service Wing</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Description</label>
                                        <textarea
                                            rows={3}
                                            value={editingBuilding.description}
                                            onChange={e => setEditingBuilding({ ...editingBuilding, description: e.target.value })}
                                            placeholder="Overview of this building's accommodations and guest profile..."
                                            className="w-full p-2.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: SPECS */}
                            {buildingFormTab === 'specs' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Total Floors</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={editingBuilding.totalFloors}
                                                onChange={e => setEditingBuilding({ ...editingBuilding, totalFloors: parseInt(e.target.value) || 1 })}
                                                className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Ground Floor Label</label>
                                            <input
                                                type="text"
                                                value={editingBuilding.groundFloorLabel}
                                                onChange={e => setEditingBuilding({ ...editingBuilding, groundFloorLabel: e.target.value })}
                                                placeholder="e.g. G, Lobby, 0"
                                                className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 space-y-2.5">
                                        <label className="text-xs font-semibold text-gray-700 block">Accessibility & Structural Assets</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                            <label className="flex items-center gap-2.5 p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingBuilding.hasElevator}
                                                    onChange={e => setEditingBuilding({ ...editingBuilding, hasElevator: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <span className="font-medium text-gray-800">Has Elevator</span>
                                            </label>

                                            <label className="flex items-center gap-2.5 p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingBuilding.wheelchairAccess}
                                                    onChange={e => setEditingBuilding({ ...editingBuilding, wheelchairAccess: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <span className="font-medium text-gray-800">Wheelchair ADA</span>
                                            </label>

                                            <label className="flex items-center gap-2.5 p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={editingBuilding.hasBasement}
                                                    onChange={e => setEditingBuilding({ ...editingBuilding, hasBasement: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded"
                                                />
                                                <span className="font-medium text-gray-800">Has Basement</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: LOCATION */}
                            {buildingFormTab === 'location' && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Distance / Walk Time from Main Lobby</label>
                                        <input
                                            type="text"
                                            value={editingBuilding.distanceFromLobby}
                                            onChange={e => setEditingBuilding({ ...editingBuilding, distanceFromLobby: e.target.value })}
                                            placeholder="e.g. 0 mins (Directly connected), 2 mins walk"
                                            className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Specific Campus Address / Wing Location</label>
                                        <input
                                            type="text"
                                            value={editingBuilding.specificAddress}
                                            onChange={e => setEditingBuilding({ ...editingBuilding, specificAddress: e.target.value })}
                                            placeholder="e.g. Wing A, Seaside Promenade, Resort Zone 1"
                                            className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">GPS / Map Coordinates</label>
                                        <input
                                            type="text"
                                            value={editingBuilding.mapCoordinates}
                                            onChange={e => setEditingBuilding({ ...editingBuilding, mapCoordinates: e.target.value })}
                                            placeholder="e.g. 21.4272° N, 91.9805° E"
                                            className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg font-mono outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: STATUS */}
                            {buildingFormTab === 'status' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Operational Status *</label>
                                            <select
                                                value={editingBuilding.status}
                                                onChange={e => setEditingBuilding({ ...editingBuilding, status: e.target.value as any })}
                                                className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white outline-none font-semibold"
                                            >
                                                <option value="Active">Active (Operational)</option>
                                                <option value="Under Renovation">Under Renovation</option>
                                                <option value="Inactive">Inactive</option>
                                                <option value="Planned">Planned Expansion</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Opening Date</label>
                                            <input
                                                type="date"
                                                value={editingBuilding.openingDate}
                                                onChange={e => setEditingBuilding({ ...editingBuilding, openingDate: e.target.value })}
                                                className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none"
                                            />
                                        </div>
                                    </div>

                                    {editingBuilding.status === 'Under Renovation' && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-700">Expected Renovation Completion</label>
                                            <input
                                                type="date"
                                                value={editingBuilding.renovationEnds || ''}
                                                onChange={e => setEditingBuilding({ ...editingBuilding, renovationEnds: e.target.value })}
                                                className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Internal Remarks / Notes</label>
                                        <textarea
                                            rows={2}
                                            value={editingBuilding.remarks}
                                            onChange={e => setEditingBuilding({ ...editingBuilding, remarks: e.target.value })}
                                            placeholder="Engineering, security, or housekeeping notes..."
                                            className="w-full p-2.5 text-xs border border-gray-300 rounded-lg outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsBuildingModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                                >
                                    <Save size={14} /> Save Building
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* MODAL: ADD / EDIT FLOOR */}
            {/* ================================================================ */}
            {isFloorModalOpen && editingFloor && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/70 rounded-t-xl">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">
                                    {floors.some(f => f.id === editingFloor.id) ? 'Edit Floor Configuration' : 'Add New Floor Level'}
                                </h3>
                                <p className="text-xs text-gray-500">Assign floor to a building, configure capacity and services</p>
                            </div>
                            <button
                                onClick={() => setIsFloorModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSaveFloor} className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Building Assignment *</label>
                                <select
                                    required
                                    value={editingFloor.buildingId}
                                    onChange={e => setEditingFloor({ ...editingFloor, buildingId: e.target.value })}
                                    className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white outline-none font-semibold text-gray-800"
                                >
                                    {buildings.map(b => (
                                        <option key={b.id} value={b.id}>
                                            🏢 {b.title} ({b.shortCode})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Floor Number *</label>
                                    <input
                                        type="number"
                                        required
                                        value={editingFloor.floorNumber}
                                        onChange={e => setEditingFloor({ ...editingFloor, floorNumber: parseInt(e.target.value) || 1 })}
                                        className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Floor Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingFloor.code}
                                        onChange={e => setEditingFloor({ ...editingFloor, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. FL-01"
                                        className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg font-mono outline-none uppercase"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Floor Name / Label *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingFloor.name}
                                    onChange={e => setEditingFloor({ ...editingFloor, name: e.target.value })}
                                    placeholder="e.g. Floor 1 (Ground & Garden), Floor 5 (VIP Penthouse)"
                                    className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Category</label>
                                    <select
                                        value={editingFloor.category}
                                        onChange={e => setEditingFloor({ ...editingFloor, category: e.target.value as any })}
                                        className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white outline-none"
                                    >
                                        <option value="Guest Rooms">Guest Rooms</option>
                                        <option value="Public & Guest">Public & Guest</option>
                                        <option value="Executive Club">Executive Club</option>
                                        <option value="VIP Penthouse">VIP Penthouse</option>
                                        <option value="Service & Admin">Service & Admin</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Room Capacity Target</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={200}
                                        value={editingFloor.roomCapacity}
                                        onChange={e => setEditingFloor({ ...editingFloor, roomCapacity: parseInt(e.target.value) || 8 })}
                                        className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Operational Status</label>
                                    <select
                                        value={editingFloor.status}
                                        onChange={e => setEditingFloor({ ...editingFloor, status: e.target.value as any })}
                                        className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white outline-none"
                                    >
                                        <option value="Open">Open</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Restricted">Restricted</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Sort Priority</label>
                                    <input
                                        type="number"
                                        value={editingFloor.sortOrder}
                                        onChange={e => setEditingFloor({ ...editingFloor, sortOrder: parseInt(e.target.value) || 1 })}
                                        className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none"
                                    />
                                </div>
                            </div>

                            {/* Service & Facilities Checklist */}
                            <div className="pt-2 border-t border-gray-100">
                                <label className="text-xs font-semibold text-gray-700 block mb-2">Service Amenities & Safety</label>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingFloor.hasElevatorAccess}
                                            onChange={e => setEditingFloor({ ...editingFloor, hasElevatorAccess: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span>Elevator Access</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingFloor.hasFireExit}
                                            onChange={e => setEditingFloor({ ...editingFloor, hasFireExit: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span>Fire Exit Route</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingFloor.hasLinenCloset}
                                            onChange={e => setEditingFloor({ ...editingFloor, hasLinenCloset: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span>Linen Pantry</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingFloor.hasIceMachine}
                                            onChange={e => setEditingFloor({ ...editingFloor, hasIceMachine: e.target.checked })}
                                            className="w-4 h-4 text-blue-600 rounded"
                                        />
                                        <span>Ice Machine Station</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Floor Layout Notes</label>
                                <textarea
                                    rows={2}
                                    value={editingFloor.description}
                                    onChange={e => setEditingFloor({ ...editingFloor, description: e.target.value })}
                                    placeholder="e.g. Garden terrace access, soundproof corridor..."
                                    className="w-full p-2.5 text-xs border border-gray-300 rounded-lg outline-none"
                                />
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFloorModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                                >
                                    <Save size={14} /> Save Floor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuildingManagement;
