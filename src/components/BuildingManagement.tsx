import React, { useState, useEffect, useMemo } from 'react';
import {
    Building2, Layers, MapPin, Plus, Search, Edit2, Trash2,
    Save, X, LayoutGrid, Table as TableIcon,
    ArrowRight, BedDouble, ShieldCheck, RefreshCw,
    Sparkles, Compass, AlertTriangle, CheckCircle2
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';
import { getApiBaseUrl } from '../utils/apiUrl';
import { getCanonicalRooms, syncRoomTypesAndRoomsFromDB, broadcastPMSEvent } from '../utils/roomInventoryEngine';

// ============================================================================
// DATA MODELS & INTERFACES
// ============================================================================

export interface AmenityItem {
    id: string; // unique code/id, e.g. 'FIRE-EXT', 'ELEV', 'AED'
    name: string; // e.g. 'Emergency Fire Extinguishers & Hose Reel'
    category: 'Safety & Emergency' | 'Vertical Transport & Access' | 'Housekeeping & Operations' | 'Guest Amenities & Comfort' | 'Security & Surveillance';
    icon: string; // emoji icon
    type: 'safety' | 'amenity' | 'operational';
    description: string;
    isMandatory?: boolean; // statutory compliance requirement
    scope: 'floor' | 'building' | 'both';
}

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
    amenityIds?: string[];
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
    amenityIds: string[]; // Dynamic list of assigned amenity IDs
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
// INITIAL SEED DATA
// ============================================================================

export const INITIAL_AMENITIES_SAFETY: AmenityItem[] = [
    // Safety & Emergency
    {
        id: 'FIRE-EXIT',
        name: 'Fire Exit & Pressurized Stairwell',
        category: 'Safety & Emergency',
        icon: '🚪',
        type: 'safety',
        isMandatory: true,
        scope: 'floor',
        description: 'Illuminated photoluminescent exit signage and double-leaf fire-rated exit doors.'
    },
    {
        id: 'FIRE-EXT',
        name: 'Fire Hose Reel & Extinguishers',
        category: 'Safety & Emergency',
        icon: '🧯',
        type: 'safety',
        isMandatory: true,
        scope: 'both',
        description: 'Dry chemical CO2 and wet foam multi-purpose fire extinguishers every 20 meters.'
    },
    {
        id: 'SMK-DET',
        name: 'Smoke Detectors & Sprinklers',
        category: 'Safety & Emergency',
        icon: '🚨',
        type: 'safety',
        isMandatory: true,
        scope: 'both',
        description: 'Automated optical smoke detection with ceiling concealed fire suppression sprinkler heads.'
    },
    {
        id: 'AED-KIT',
        name: 'Automated Defibrillator (AED) & Trauma Kit',
        category: 'Safety & Emergency',
        icon: '🩺',
        type: 'safety',
        isMandatory: false,
        scope: 'both',
        description: 'Wall-mounted emergency AED shock unit and trauma medical first aid kit.'
    },
    {
        id: 'EMRG-LGT',
        name: 'Emergency Battery Backup Lighting',
        category: 'Safety & Emergency',
        icon: '⚡',
        type: 'safety',
        isMandatory: true,
        scope: 'both',
        description: '90-minute sustained LED egress lighting path during electrical power outages.'
    },

    // Vertical Transport & Accessibility
    {
        id: 'ELEV-GST',
        name: 'Guest High-Speed Elevator Landing',
        category: 'Vertical Transport & Access',
        icon: '🛗',
        type: 'amenity',
        isMandatory: false,
        scope: 'both',
        description: 'Keycard-secured elevator landing with voice floor annunciator.'
    },
    {
        id: 'SRV-LIFT',
        name: 'Dedicated Service / Freight Lift',
        category: 'Vertical Transport & Access',
        icon: '📦',
        type: 'operational',
        isMandatory: false,
        scope: 'both',
        description: 'Heavy-duty housekeeping luggage and linen elevator bank.'
    },
    {
        id: 'ADA-RMP',
        name: 'Wheelchair ADA Accessible Ramp',
        category: 'Vertical Transport & Access',
        icon: '♿',
        type: 'amenity',
        isMandatory: true,
        scope: 'both',
        description: 'Gentle gradient handrail ramps compliant with ADA physical accessibility codes.'
    },

    // Housekeeping & Operations
    {
        id: 'LIN-CLST',
        name: 'Housekeeping Linen & Supply Pantry',
        category: 'Housekeeping & Operations',
        icon: '🧺',
        type: 'operational',
        isMandatory: false,
        scope: 'floor',
        description: 'Secured floor staging closet for fresh bed linen, towels, and guestroom toiletries.'
    },
    {
        id: 'SRV-STN',
        name: 'Room Service Pantry / Collection Station',
        category: 'Housekeeping & Operations',
        icon: '🍽️',
        type: 'operational',
        isMandatory: false,
        scope: 'floor',
        description: 'Thermal food warmer bay and dirty tray clearing collection hub.'
    },
    {
        id: 'LIN-CHUT',
        name: 'Linen / Laundry Gravity Chute',
        category: 'Housekeeping & Operations',
        icon: '🗑️',
        type: 'operational',
        isMandatory: false,
        scope: 'floor',
        description: 'Fire-damped stainless steel gravity chute leading directly to laundry sort room.'
    },

    // Guest Amenities & Comfort
    {
        id: 'ICE-MCH',
        name: 'Ice Dispenser & Vending Nook',
        category: 'Guest Amenities & Comfort',
        icon: '🧊',
        type: 'amenity',
        isMandatory: false,
        scope: 'floor',
        description: 'Touchless sanitary cube ice maker with sparkling water station.'
    },
    {
        id: 'LNG-TER',
        name: 'Floor Lounge / Sky Terrace',
        category: 'Guest Amenities & Comfort',
        icon: '☕',
        type: 'amenity',
        isMandatory: false,
        scope: 'floor',
        description: 'Casual sitting lobby with plush seating and panoramic ocean view glass.'
    },
    {
        id: 'WTR-FLTR',
        name: 'Reverse Osmosis Filtered Water Station',
        category: 'Guest Amenities & Comfort',
        icon: '💧',
        type: 'amenity',
        isMandatory: false,
        scope: 'both',
        description: 'Eco-friendly touchless chilled and ambient mineral water bottle refilling tap.'
    },

    // Security & Surveillance
    {
        id: 'CCTV-247',
        name: '24/7 HD CCTV Security Coverage',
        category: 'Security & Surveillance',
        icon: '📹',
        type: 'safety',
        isMandatory: true,
        scope: 'both',
        description: 'Corridor and lift lobby dome cameras monitored by central security control.'
    },
    {
        id: 'SMART-LCK',
        name: 'RFID / Mobile Keycard Corridor Access',
        category: 'Security & Surveillance',
        icon: '🔑',
        type: 'safety',
        isMandatory: false,
        scope: 'both',
        description: 'Floor-lock security preventing unauthorized non-resident guests from entry.'
    }
];

const STORAGE_KEY_BUILDINGS = 'hotel_buildings_v2';
const STORAGE_KEY_FLOORS = 'hotel_floors_v2';
const STORAGE_KEY_AMENITIES = 'hotel_amenities_safety_catalog_v1';
const STORAGE_KEY_ROOMS = 'hotel_rooms_inventory_v1';

interface BuildingManagementProps {
    initialTab?: 'buildings' | 'floors' | 'amenities' | 'matrix';
    allowedTabs?: ('buildings' | 'floors' | 'amenities' | 'matrix')[];
}

const BuildingManagement: React.FC<BuildingManagementProps> = ({ initialTab = 'buildings', allowedTabs }) => {
    // Navigation / View Tabs
    const [mainTab, setMainTab] = useState<'buildings' | 'floors' | 'amenities' | 'matrix'>(initialTab);
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
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title) return parsed;
            }
        } catch (e) {
            console.error('Failed to load buildings', e);
        }
        return [];
    });

    // State: Floors
    const [floors, setFloors] = useState<Floor[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_FLOORS);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].code) return parsed;
            }
        } catch (e) {
            console.error('Failed to load floors', e);
        }
        return [];
    });

    // State: Dynamic Amenities & Safety Catalog
    const [amenitiesCatalog, setAmenitiesCatalog] = useState<AmenityItem[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_AMENITIES);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Failed to load amenities catalog', e);
        }
        return INITIAL_AMENITIES_SAFETY;
    });

    // State: Rooms
    const [rooms, setRooms] = useState<RoomSummary[]>(() => {
        return getCanonicalRooms().map(r => ({
            id: r.id,
            number: r.number,
            buildingId: r.buildingId,
            floorId: r.floorId,
            status: r.status,
            housekeepingStatus: r.housekeepingStatus
        }));
    });

    // Fetch buildings, floors, and rooms from backend API on mount
    useEffect(() => {
        const loadArchitectureFromDB = async () => {
            try {
                const res = await fetch(`${getApiBaseUrl()}/api/properties/1`);
                const json = await res.json();
                if (json.success && json.data) {
                    if (Array.isArray(json.data.buildings) && json.data.buildings.length > 0) {
                        const mappedBlds: Building[] = json.data.buildings.map((b: any) => ({
                            id: String(b.id),
                            title: b.name || b.title || `Building ${b.id}`,
                            shortCode: b.code || b.shortCode || `BLD-${b.id}`,
                            type: b.type || (b.id === 1 ? 'Main Tower' : 'Accommodation Wing'),
                            description: b.description || `${b.name || b.title} accommodation wing`,
                            totalFloors: Number(b.total_floors || b.totalFloors || 3),
                            groundFloorLabel: b.ground_floor_label || 'G (Lobby)',
                            hasBasement: Boolean(b.has_basement ?? (b.id === 1)),
                            hasElevator: Boolean(b.has_elevator ?? true),
                            wheelchairAccess: Boolean(b.wheelchair_access ?? true),
                            distanceFromLobby: b.distance_from_lobby || '0 mins (Connected)',
                            mapCoordinates: b.map_coordinates || '21.4272° N, 91.9805° E',
                            specificAddress: b.specific_address || 'Property Campus',
                            status: b.status === 'INACTIVE' ? 'Inactive' : 'Active',
                            openingDate: b.opening_date || '2022-01-01',
                            remarks: b.remarks || b.description || '',
                            amenityIds: Array.isArray(b.amenities) ? b.amenities : ['ELEV-GST', 'ADA-RMP', 'FIRE-EXT', 'SMK-DET', 'EMRG-LGT', 'CCTV-247']
                        }));
                        setBuildings(mappedBlds);
                        localStorage.setItem(STORAGE_KEY_BUILDINGS, JSON.stringify(mappedBlds));
                    }
                    if (Array.isArray(json.data.floors) && json.data.floors.length > 0) {
                        const mappedFloors: Floor[] = json.data.floors.map((f: any, idx: number) => ({
                            id: String(f.id),
                            name: f.name || `Floor ${f.floor_number || idx + 1}`,
                            floorNumber: Number(f.floor_number || f.floorNumber || idx + 1),
                            code: f.code || `FL-0${f.floor_number || idx + 1}`,
                            buildingId: String(f.building_id || f.buildingId || '1'),
                            category: f.category || (Number(f.floor_number) >= 4 ? 'Executive Club' : 'Guest Rooms'),
                            roomCapacity: Number(f.room_capacity || f.roomCapacity || 8),
                            hasElevatorAccess: Boolean(f.has_elevator_access ?? true),
                            hasFireExit: Boolean(f.has_fire_exit ?? true),
                            hasLinenCloset: Boolean(f.has_linen_closet ?? true),
                            hasServiceStation: Boolean(f.has_service_station ?? true),
                            hasIceMachine: Boolean(f.has_ice_machine ?? true),
                            amenityIds: Array.isArray(f.amenities) ? f.amenities : ['FIRE-EXIT', 'FIRE-EXT', 'SMK-DET', 'ELEV-GST', 'LIN-CLST', 'CCTV-247'],
                            status: f.status || 'Open',
                            description: f.description || `${f.name} corridor & rooms`,
                            sortOrder: idx + 1
                        }));
                        setFloors(mappedFloors);
                        localStorage.setItem(STORAGE_KEY_FLOORS, JSON.stringify(mappedFloors));
                    }
                }
                const { rooms: syncedRooms } = await syncRoomTypesAndRoomsFromDB(1);
                if (syncedRooms.length > 0) {
                    setRooms(syncedRooms.map(r => ({
                        id: r.id,
                        number: r.number,
                        buildingId: r.buildingId,
                        floorId: r.floorId,
                        status: r.status,
                        housekeepingStatus: r.housekeepingStatus
                    })));
                }
            } catch (e) {
                console.warn('BuildingManagement DB sync warning:', e);
            }
        };
        loadArchitectureFromDB();
    }, []);

    // Refresh rooms whenever storage updates
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

    const [amenitySearch, setAmenitySearch] = useState('');
    const [amenityCategoryFilter, setAmenityCategoryFilter] = useState<string>('all');
    const [amenityTypeFilter, setAmenityTypeFilter] = useState<string>('all');

    // Modals
    const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
    const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
    const [buildingFormTab, setBuildingFormTab] = useState<'basic' | 'specs' | 'amenities' | 'location' | 'status'>('basic');
    const [isBuildingCodeManual, setIsBuildingCodeManual] = useState(false);

    const [isFloorModalOpen, setIsFloorModalOpen] = useState(false);
    const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
    const [floorFormTab, setFloorFormTab] = useState<'general' | 'amenities'>('general');
    const [isFloorCodeManual, setIsFloorCodeManual] = useState(false);

    // Modal: Amenity Master Add/Edit
    const [isAmenityModalOpen, setIsAmenityModalOpen] = useState(false);
    const [editingAmenity, setEditingAmenity] = useState<AmenityItem | null>(null);
    const [isAmenityCodeManual, setIsAmenityCodeManual] = useState(false);

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

    // Save helper: Amenities
    const saveAmenitiesCatalog = (updated: AmenityItem[]) => {
        setAmenitiesCatalog(updated);
        try {
            localStorage.setItem(STORAGE_KEY_AMENITIES, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save amenities to localStorage', e);
        }
    };

    // Existing short codes for duplicate checking
    const existingBuildingCodes = useMemo(() => buildings.map(b => b.shortCode), [buildings]);
    const existingFloorCodes = useMemo(() => floors.map(f => f.code), [floors]);
    const existingAmenityCodes = useMemo(() => amenitiesCatalog.map(a => a.id), [amenitiesCatalog]);

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
        const totalSafetyAssets = amenitiesCatalog.filter(a => a.type === 'safety').length;

        return {
            totalBuildings,
            activeBuildings,
            totalFloors,
            totalRooms,
            readinessRate,
            totalSafetyAssets
        };
    }, [buildings, floors, rooms, amenitiesCatalog]);

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

    // Filtered Amenities Catalog
    const filteredAmenities = useMemo(() => {
        return amenitiesCatalog.filter(a => {
            const matchesSearch = a.name.toLowerCase().includes(amenitySearch.toLowerCase()) ||
                a.id.toLowerCase().includes(amenitySearch.toLowerCase()) ||
                a.description.toLowerCase().includes(amenitySearch.toLowerCase());
            const matchesCat = amenityCategoryFilter === 'all' || a.category === amenityCategoryFilter;
            const matchesType = amenityTypeFilter === 'all' || a.type === amenityTypeFilter;
            return matchesSearch && matchesCat && matchesType;
        });
    }, [amenitiesCatalog, amenitySearch, amenityCategoryFilter, amenityTypeFilter]);

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
    // AUTO SHORT CODE GENERATION LOGIC
    // ========================================================================

    // Handle Title change for Building: auto-generates shortCode with duplicate prevention
    const handleBuildingTitleChange = (newTitle: string) => {
        if (!editingBuilding) return;
        const updated = { ...editingBuilding, title: newTitle };

        if (!isBuildingCodeManual || !editingBuilding.shortCode) {
            const autoCode = generateUniqueShortCode(newTitle, existingBuildingCodes, {
                currentCode: editingBuilding.shortCode,
                maxLength: 7
            });
            updated.shortCode = autoCode;
        }
        setEditingBuilding(updated);
    };

    // Handle Floor Name/Number change: auto-generates code with duplicate prevention
    const handleFloorNameChange = (newName: string) => {
        if (!editingFloor) return;
        const updated = { ...editingFloor, name: newName };

        if (!isFloorCodeManual || !editingFloor.code) {
            const autoCode = generateUniqueShortCode(newName, existingFloorCodes, {
                prefix: 'FL',
                currentCode: editingFloor.code,
                maxLength: 8
            });
            updated.code = autoCode;
        }
        setEditingFloor(updated);
    };

    // Handle Amenity Name change: auto-generates code with duplicate prevention
    const handleAmenityNameChange = (newName: string) => {
        if (!editingAmenity) return;
        const updated = { ...editingAmenity, name: newName };

        if (!isAmenityCodeManual || !editingAmenity.id) {
            const autoCode = generateUniqueShortCode(newName, existingAmenityCodes, {
                currentCode: editingAmenity.id,
                maxLength: 10
            });
            updated.id = autoCode;
        }
        setEditingAmenity(updated);
    };

    // ========================================================================
    // BUILDING CRUD HANDLERS
    // ========================================================================

    const handleOpenAddBuilding = () => {
        const nextId = String(Date.now());
        const defaultTitle = 'New Wing';
        const autoCode = generateUniqueShortCode(defaultTitle, existingBuildingCodes);

        setEditingBuilding({
            id: nextId,
            title: defaultTitle,
            shortCode: autoCode,
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
            remarks: '',
            amenityIds: ['ELEV-GST', 'FIRE-EXT', 'SMK-DET', 'EMRG-LGT']
        });
        setIsBuildingCodeManual(false);
        setBuildingFormTab('basic');
        setIsBuildingModalOpen(true);
    };

    const handleOpenEditBuilding = (b: Building) => {
        setEditingBuilding({ ...b });
        setIsBuildingCodeManual(true);
        setBuildingFormTab('basic');
        setIsBuildingModalOpen(true);
    };

    const handleSaveBuilding = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingBuilding) return;
        if (!editingBuilding.title.trim()) {
            alert('Building Title is required');
            return;
        }

        // Duplicate code validation
        const origBuilding = buildings.find(b => b.id === editingBuilding.id);
        if (isShortCodeDuplicate(editingBuilding.shortCode, existingBuildingCodes, origBuilding?.shortCode)) {
            alert(`Short Code "${editingBuilding.shortCode}" is already in use by another building! Please provide a unique code.`);
            return;
        }

        const exists = buildings.some(b => b.id === editingBuilding.id);
        let updated: Building[];
        const payload = {
            code: editingBuilding.shortCode,
            name: editingBuilding.title,
            sortOrder: editingBuilding.totalFloors || 1,
            totalFloors: editingBuilding.totalFloors,
            type: editingBuilding.type,
            description: editingBuilding.description,
            status: editingBuilding.status,
            amenityIds: editingBuilding.amenityIds
        };

        if (exists) {
            updated = buildings.map(b => b.id === editingBuilding.id ? editingBuilding : b);
            try {
                await fetch(`${getApiBaseUrl()}/api/properties/1/buildings/${editingBuilding.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch {}
            showToast(`Building "${editingBuilding.title}" (${editingBuilding.shortCode}) updated!`);
        } else {
            let newId = editingBuilding.id;
            try {
                const res = await fetch(`${getApiBaseUrl()}/api/properties/1/buildings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success && json.data?.id) newId = String(json.data.id);
            } catch {}
            updated = [...buildings, { ...editingBuilding, id: newId }];
            showToast(`Building "${editingBuilding.title}" (${editingBuilding.shortCode}) created!`);
        }

        saveBuildings(updated);
        try {
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
        setIsBuildingModalOpen(false);
        setEditingBuilding(null);
    };

    const handleDeleteBuilding = async (building: Building) => {
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
        try {
            await fetch(`${getApiBaseUrl()}/api/properties/1/buildings/${building.id}`, { method: 'DELETE' });
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
        showToast(`Building "${building.title}" removed.`);
    };

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
        const defaultName = `Floor ${nextFloorNum}`;
        const autoCode = generateUniqueShortCode(defaultName, existingFloorCodes, { prefix: 'FL' });

        setEditingFloor({
            id: String(Date.now()),
            name: defaultName,
            floorNumber: nextFloorNum,
            code: autoCode,
            buildingId: defaultBId,
            category: 'Guest Rooms',
            roomCapacity: 8,
            hasElevatorAccess: true,
            hasFireExit: true,
            hasLinenCloset: true,
            hasServiceStation: true,
            hasIceMachine: false,
            amenityIds: ['FIRE-EXIT', 'FIRE-EXT', 'SMK-DET', 'ELEV-GST', 'LIN-CLST', 'CCTV-247'],
            status: 'Open',
            description: `Floor ${nextFloorNum} guest rooms`,
            sortOrder: floors.length + 1
        });
        setIsFloorCodeManual(false);
        setFloorFormTab('general');
        setIsFloorModalOpen(true);
    };

    const handleOpenEditFloor = (f: Floor, defaultSubTab: 'general' | 'amenities' = 'general') => {
        // Ensure amenityIds array exists
        const safeFloor: Floor = {
            ...f,
            amenityIds: f.amenityIds || ['FIRE-EXIT', 'FIRE-EXT', 'SMK-DET', 'ELEV-GST', 'LIN-CLST', 'CCTV-247']
        };
        setEditingFloor(safeFloor);
        setIsFloorCodeManual(true);
        setFloorFormTab(defaultSubTab);
        setIsFloorModalOpen(true);
    };

    const handleSaveFloor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingFloor) return;
        if (!editingFloor.name.trim()) {
            alert('Floor Name is required');
            return;
        }

        // Duplicate code validation
        const origFloor = floors.find(f => f.id === editingFloor.id);
        if (isShortCodeDuplicate(editingFloor.code, existingFloorCodes, origFloor?.code)) {
            alert(`Floor Code "${editingFloor.code}" is already in use by another floor! Please provide a unique code.`);
            return;
        }

        const exists = floors.some(f => f.id === editingFloor.id);
        let updated: Floor[];
        const floorPayload = {
            buildingId: editingFloor.buildingId,
            floorNumber: editingFloor.floorNumber,
            name: editingFloor.name,
            category: editingFloor.category,
            roomCapacity: editingFloor.roomCapacity,
            description: editingFloor.description,
            status: editingFloor.status,
            amenityIds: editingFloor.amenityIds
        };

        if (exists) {
            updated = floors.map(f => f.id === editingFloor.id ? editingFloor : f);
            try {
                await fetch(`${getApiBaseUrl()}/api/properties/1/floors/${editingFloor.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(floorPayload)
                });
            } catch {}
            showToast(`Floor "${editingFloor.name}" (${editingFloor.code}) updated!`);
        } else {
            let newId = editingFloor.id;
            try {
                const res = await fetch(`${getApiBaseUrl()}/api/properties/1/floors`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(floorPayload)
                });
                const json = await res.json();
                if (json.success && json.data?.id) newId = String(json.data.id);
            } catch {}
            updated = [...floors, { ...editingFloor, id: newId }];
            showToast(`Floor "${editingFloor.name}" (${editingFloor.code}) created!`);
        }

        saveFloors(updated);
        try {
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
        setIsFloorModalOpen(false);
        setEditingFloor(null);
    };

    const handleDeleteFloor = async (floor: Floor) => {
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
        try {
            await fetch(`${getApiBaseUrl()}/api/properties/1/floors/${floor.id}`, { method: 'DELETE' });
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
        showToast(`Floor "${floor.name}" deleted.`);
    };

    // Toggle amenity selection on editing floor
    const toggleFloorAmenity = (amenityId: string) => {
        if (!editingFloor) return;
        const current = editingFloor.amenityIds || [];
        const next = current.includes(amenityId)
            ? current.filter(id => id !== amenityId)
            : [...current, amenityId];
        setEditingFloor({ ...editingFloor, amenityIds: next });
    };

    // Toggle amenity selection on editing building
    const toggleBuildingAmenity = (amenityId: string) => {
        if (!editingBuilding) return;
        const current = editingBuilding.amenityIds || [];
        const next = current.includes(amenityId)
            ? current.filter(id => id !== amenityId)
            : [...current, amenityId];
        setEditingBuilding({ ...editingBuilding, amenityIds: next });
    };

    // ========================================================================
    // AMENITY CATALOG CRUD HANDLERS
    // ========================================================================

    const handleOpenAddAmenity = () => {
        const defaultName = 'New Safety Asset';
        const autoCode = generateUniqueShortCode(defaultName, existingAmenityCodes, { maxLength: 8 });

        setEditingAmenity({
            id: autoCode,
            name: defaultName,
            category: 'Safety & Emergency',
            icon: '🛡️',
            type: 'safety',
            description: '',
            isMandatory: false,
            scope: 'floor'
        });
        setIsAmenityCodeManual(false);
        setIsAmenityModalOpen(true);
    };

    const handleOpenEditAmenity = (item: AmenityItem) => {
        setEditingAmenity({ ...item });
        setIsAmenityCodeManual(true);
        setIsAmenityModalOpen(true);
    };

    const handleSaveAmenity = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAmenity) return;
        if (!editingAmenity.name.trim()) {
            alert('Amenity / Safety Name is required');
            return;
        }

        // Duplicate code check
        const origAmenity = amenitiesCatalog.find(a => a.id === editingAmenity.id);
        if (isShortCodeDuplicate(editingAmenity.id, existingAmenityCodes, origAmenity?.id)) {
            alert(`Short Code / ID "${editingAmenity.id}" is already in use by another item!`);
            return;
        }

        const exists = amenitiesCatalog.some(a => a.id === editingAmenity.id);
        let updated: AmenityItem[];
        if (exists) {
            updated = amenitiesCatalog.map(a => a.id === editingAmenity.id ? editingAmenity : a);
            showToast(`Asset "${editingAmenity.name}" (${editingAmenity.id}) updated!`);
        } else {
            updated = [...amenitiesCatalog, editingAmenity];
            showToast(`New Asset "${editingAmenity.name}" added to master library!`);

            // If user is currently editing a floor, auto-check it for that floor
            if (editingFloor) {
                setEditingFloor(prev => prev ? ({
                    ...prev,
                    amenityIds: [...(prev.amenityIds || []), editingAmenity.id]
                }) : null);
            }
        }

        saveAmenitiesCatalog(updated);
        setIsAmenityModalOpen(false);
        setEditingAmenity(null);
    };

    const handleDeleteAmenity = (item: AmenityItem) => {
        const floorsUsing = floors.filter(f => (f.amenityIds || []).includes(item.id)).length;
        const buildingsUsing = buildings.filter(b => (b.amenityIds || []).includes(item.id)).length;

        if (floorsUsing > 0 || buildingsUsing > 0) {
            if (!confirm(`Warning: "${item.name}" is currently assigned to ${floorsUsing} floor(s) and ${buildingsUsing} building(s). Deleting will remove it from all configurations. Continue?`)) {
                return;
            }
        } else {
            if (!confirm(`Delete asset "${item.name}" from catalog?`)) return;
        }

        const updated = amenitiesCatalog.filter(a => a.id !== item.id);
        saveAmenitiesCatalog(updated);
        showToast(`Asset "${item.name}" deleted.`);
    };

    // Calculate usage of an amenity
    const getAmenityUsage = (amenityId: string) => {
        const floorCount = floors.filter(f => (f.amenityIds || []).includes(amenityId)).length;
        const buildingCount = buildings.filter(b => (b.amenityIds || []).includes(amenityId)).length;
        return { floorCount, buildingCount, total: floorCount + buildingCount };
    };

    return (
        <div className="p-2.5 sm:p-3.5 space-y-3 font-sans animate-in fade-in duration-200">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-bounce">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Standard Thesis Page Header */}
            <PageHeader
                title="Property Structure & Amenities Master"
                subtitle="Manage wings, towers, floor levels, room capacity, and dynamic life safety assets with duplicate-free short codes"
                icon={<Building2 className="size-5 text-primary" />}
                actions={
                    <div className="flex items-center gap-2">
                        {mainTab === 'buildings' && (
                            <button
                                onClick={handleOpenAddBuilding}
                                className="btn-primary !h-8 !py-1 !px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Plus size={14} /> Add Building
                            </button>
                        )}
                        {mainTab === 'floors' && (
                            <button
                                onClick={() => handleOpenAddFloor()}
                                className="btn-primary !h-8 !py-1 !px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Plus size={14} /> Add Floor
                            </button>
                        )}
                        {mainTab === 'amenities' && (
                            <button
                                onClick={handleOpenAddAmenity}
                                className="btn-primary !h-8 !py-1 !px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Plus size={14} /> Add Amenity / Safety Asset
                            </button>
                        )}
                    </div>
                }
            />

            {/* 4 Standardized Thesis KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Buildings</span>
                        <div className="size-7 rounded-lg bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <Building2 size={14} />
                        </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{buildingMetrics.totalBuildings}</div>
                    <div className="mt-0.5 text-[10px] text-emerald-600 font-semibold">{buildingMetrics.activeBuildings} Active Wings</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Floor Levels</span>
                        <div className="size-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Layers size={14} />
                        </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{buildingMetrics.totalFloors}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400 font-medium">Configured levels</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Life Safety & Assets</span>
                        <div className="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <ShieldCheck size={14} />
                        </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{amenitiesCatalog.length}</div>
                    <div className="mt-0.5 text-[10px] text-emerald-600 font-semibold">{buildingMetrics.totalSafetyAssets} Safety Assets</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Room Inventory</span>
                        <div className="size-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <BedDouble size={14} />
                        </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{buildingMetrics.totalRooms}</div>
                    <div className="mt-0.5 text-[10px] text-primary font-semibold">Total Physical Keys</div>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            {(!allowedTabs || allowedTabs.length > 1) && (
                <div className="bg-white p-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 rounded-lg">
                        {(!allowedTabs || allowedTabs.includes('floors')) && (
                            <button
                                onClick={() => setMainTab('floors')}
                                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                    mainTab === 'floors'
                                        ? 'bg-white text-primary shadow-2xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Layers size={13} />
                                <span>Floors</span>
                                <span className="badge-code !py-0 !px-1.5 !text-[10px]">
                                    {floors.length}
                                </span>
                            </button>
                        )}
                        {(!allowedTabs || allowedTabs.includes('buildings')) && (
                            <button
                                onClick={() => setMainTab('buildings')}
                                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                    mainTab === 'buildings'
                                        ? 'bg-white text-primary shadow-2xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Building2 size={13} />
                                <span>Buildings</span>
                                <span className="badge-code !py-0 !px-1.5 !text-[10px]">
                                    {buildings.length}
                                </span>
                            </button>
                        )}
                        {(!allowedTabs || allowedTabs.includes('amenities')) && (
                            <button
                                onClick={() => setMainTab('amenities')}
                                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                    mainTab === 'amenities'
                                        ? 'bg-white text-primary shadow-2xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <ShieldCheck size={13} className="text-emerald-600" />
                                <span>Amenities & Safety</span>
                                <span className="badge-code !py-0 !px-1.5 !text-[10px]">
                                    {amenitiesCatalog.length}
                                </span>
                            </button>
                        )}
                        {(!allowedTabs || allowedTabs.includes('matrix')) && (
                            <button
                                onClick={() => setMainTab('matrix')}
                                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                    mainTab === 'matrix'
                                        ? 'bg-white text-primary shadow-2xs font-bold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Compass size={13} />
                                <span>Matrix</span>
                            </button>
                        )}
                    </div>

                    <div className="text-xs text-slate-400 font-medium px-2 hidden sm:block">
                        {mainTab === 'buildings' && 'Viewing property wings & structural specs'}
                        {mainTab === 'floors' && 'Viewing floor levels & capacity'}
                        {mainTab === 'amenities' && 'Viewing life safety assets & guest amenities'}
                        {mainTab === 'matrix' && 'Floor & Amenity Coverage Matrix'}
                    </div>
                </div>
            )}

            {/* TAB CONTENT 1: BUILDINGS MASTER */}
            {mainTab === 'buildings' && (
                <div className="flex-1 flex flex-col p-1 sm:p-2 space-y-3">
                    {/* Control Bar: Search & Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
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
                            <h3 className="text-sm text-gray-700">No buildings matched your criteria</h3>
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
                                const bAmenities = (building.amenityIds || []).map(id => amenitiesCatalog.find(a => a.id === id)).filter(Boolean) as AmenityItem[];

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
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono border border-indigo-200/60">
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
                                                    <h3 className="text-sm text-gray-900 mt-1.5 line-clamp-1">
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
                                                    <span className="text-gray-800">
                                                        {buildingFloors.length} ({building.groundFloorLabel || 'G'})
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-gray-400 font-medium block">Rooms Assigned</span>
                                                    <span className="text-gray-800">
                                                        {buildingRooms.length} Keys{' '}
                                                        <span className="text-[10px] text-emerald-600 font-normal">
                                                            ({cleanRoomsCount} ready)
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Dynamic Building Amenities Badges */}
                                            {bAmenities.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-3 text-[10px]">
                                                    {bAmenities.slice(0, 5).map(item => (
                                                        <span
                                                            key={item.id}
                                                            className={`px-1.5 py-0.5 rounded font-medium border flex items-center gap-1 ${
                                                                item.type === 'safety'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                                            }`}
                                                            title={item.name}
                                                        >
                                                            <span>{item.icon}</span>
                                                            <span className="truncate max-w-[90px]">{item.name}</span>
                                                        </span>
                                                    ))}
                                                    {bAmenities.length > 5 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-bold">
                                                            +{bAmenities.length - 5}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

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
                                    <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                                        <tr>
                                            <th className="py-2.5 px-3">Code</th>
                                            <th className="py-2.5 px-3">Building Title</th>
                                            <th className="py-2.5 px-3">Type</th>
                                            <th className="py-2.5 px-3">Floors</th>
                                            <th className="py-2.5 px-3">Rooms Attached</th>
                                            <th className="py-2.5 px-3">Safety & Amenities</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {filteredBuildings.map((building) => {
                                            const buildingFloors = floors.filter(f => f.buildingId === building.id);
                                            const buildingRooms = getRoomsForBuilding(building.id);
                                            const bAmenities = (building.amenityIds || []).map(id => amenitiesCatalog.find(a => a.id === id)).filter(Boolean) as AmenityItem[];

                                            return (
                                                <tr key={building.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="py-2 px-3 font-mono text-indigo-700">
                                                        {building.shortCode}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="text-gray-900">{building.title}</div>
                                                        <div className="text-[10px] text-gray-400">{building.specificAddress}</div>
                                                    </td>
                                                    <td className="py-2 px-3 font-medium text-gray-600">{building.type}</td>
                                                    <td className="py-2 px-3 font-semibold text-gray-800">
                                                        {buildingFloors.length} Floors
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                                            {buildingRooms.length} Rooms
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="flex gap-1 text-[11px]">
                                                            {bAmenities.slice(0, 4).map(item => (
                                                                <span key={item.id} title={item.name}>{item.icon}</span>
                                                            ))}
                                                            {bAmenities.length > 4 && (
                                                                <span className="text-[10px] text-gray-500 font-mono">
                                                                    +{bAmenities.length - 4}
                                                                </span>
                                                            )}
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
                <div className="flex-1 flex flex-col p-1 sm:p-2 space-y-3">
                    {/* Control Bar: Filters & Search */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
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
                            <h3 className="text-sm text-gray-700">No floors match this filter</h3>
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
                                const fAmenities = (floor.amenityIds || []).map(id => amenitiesCatalog.find(a => a.id === id)).filter(Boolean) as AmenityItem[];

                                return (
                                    <div
                                        key={floor.id}
                                        className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                                    >
                                        <div>
                                            {/* Floor Card Header */}
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex flex-col items-center justify-center text-xs">
                                                        <span className="text-[9px] uppercase leading-none text-indigo-500">FL</span>
                                                        <span className="leading-none mt-0.5">{floor.floorNumber}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm text-gray-900 leading-tight">
                                                            {floor.name}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded">
                                                                {parentBuilding?.title || 'Unknown Building'}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-mono font-bold">
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

                                            {/* Dynamic Amenities Badges with Click-to-Manage shortcut */}
                                            <div className="mb-3">
                                                <div className="flex justify-between items-center text-[10px] font-semibold text-gray-500 mb-1">
                                                    <span className="flex items-center gap-1">
                                                        <ShieldCheck size={11} className="text-emerald-600" />
                                                        <span>Amenities & Safety ({fAmenities.length})</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditFloor(floor, 'amenities')}
                                                        className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        + Edit
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                                                    {fAmenities.map(item => (
                                                        <span
                                                            key={item.id}
                                                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${
                                                                item.type === 'safety'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : item.type === 'operational'
                                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                                            }`}
                                                            title={`${item.name} (${item.category})`}
                                                        >
                                                            <span>{item.icon}</span>
                                                            <span className="truncate max-w-[85px]">{item.name}</span>
                                                        </span>
                                                    ))}
                                                    {fAmenities.length === 0 && (
                                                        <span className="text-[10px] text-gray-400 italic">
                                                            No specific amenities attached.
                                                        </span>
                                                    )}
                                                </div>
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
                                                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${getHkBadgeClass(rm.housekeepingStatus)}`}
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
                            <div className="overflow-x-auto min-w-[720px]">
                                <table className="w-full text-left text-xs text-gray-700 divide-y divide-gray-200">
                                    <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                                        <tr>
                                            <th className="py-2.5 px-3">Level / Code</th>
                                            <th className="py-2.5 px-3">Floor Name</th>
                                            <th className="py-2.5 px-3">Building Assignment</th>
                                            <th className="py-2.5 px-3">Category</th>
                                            <th className="py-2.5 px-3">Rooms / Capacity</th>
                                            <th className="py-2.5 px-3">Life Safety & Amenities</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {filteredFloors.map((floor) => {
                                            const parentBuilding = buildings.find(b => b.id === floor.buildingId);
                                            const floorRooms = getRoomsForFloor(floor.id);
                                            const fAmenities = (floor.amenityIds || []).map(id => amenitiesCatalog.find(a => a.id === id)).filter(Boolean) as AmenityItem[];

                                            return (
                                                <tr key={floor.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="py-2 px-3 font-mono text-gray-800">
                                                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">
                                                            {floor.code}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="text-gray-900">{floor.name}</div>
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
                                                        <div className="flex items-center gap-1 text-[11px]">
                                                            {fAmenities.slice(0, 5).map(item => (
                                                                <span key={item.id} title={item.name}>{item.icon}</span>
                                                            ))}
                                                            {fAmenities.length > 5 && (
                                                                <span className="text-[10px] text-gray-500 font-mono">
                                                                    +{fAmenities.length - 5}
                                                                </span>
                                                            )}
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

            {/* TAB CONTENT 3: AMENITIES & LIFE SAFETY MASTER */}
            {mainTab === 'amenities' && (
                <div className="flex-1 flex flex-col p-1 sm:p-2 space-y-3">
                    {/* Control Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={amenitySearch}
                                    onChange={(e) => setAmenitySearch(e.target.value)}
                                    placeholder="Search amenities or safety features by name, code..."
                                    className="w-full h-8 pl-8 pr-3 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                />
                                {amenitySearch && (
                                    <button
                                        onClick={() => setAmenitySearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Category Filter */}
                            <select
                                value={amenityCategoryFilter}
                                onChange={(e) => setAmenityCategoryFilter(e.target.value)}
                                className="h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 outline-none"
                            >
                                <option value="all">All Categories ({amenitiesCatalog.length})</option>
                                <option value="Safety & Emergency">Safety & Emergency</option>
                                <option value="Vertical Transport & Access">Vertical Transport & Access</option>
                                <option value="Housekeeping & Operations">Housekeeping & Operations</option>
                                <option value="Guest Amenities & Comfort">Guest Amenities & Comfort</option>
                                <option value="Security & Surveillance">Security & Surveillance</option>
                            </select>

                            {/* Type Filter */}
                            <select
                                value={amenityTypeFilter}
                                onChange={(e) => setAmenityTypeFilter(e.target.value)}
                                className="h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 outline-none"
                            >
                                <option value="all">All Types</option>
                                <option value="safety">Safety Items Only</option>
                                <option value="amenity">Guest Amenities</option>
                                <option value="operational">Operational Assets</option>
                            </select>
                        </div>

                        {/* Reset defaults helper */}
                        <button
                            onClick={() => {
                                if (confirm('Reset amenities catalog back to international hotel safety defaults?')) {
                                    saveAmenitiesCatalog(INITIAL_AMENITIES_SAFETY);
                                    showToast('Amenities catalog restored to statutory defaults.');
                                }
                            }}
                            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-semibold hover:underline"
                        >
                            <RefreshCw size={12} /> Reset to Defaults
                        </button>
                    </div>

                    {/* Amenities Cards Grid */}
                    {filteredAmenities.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
                            <ShieldCheck size={36} className="mx-auto text-gray-300 mb-2" />
                            <h3 className="text-sm text-gray-700">No amenities or safety assets found</h3>
                            <p className="text-xs text-gray-400 mt-1">Try refining your search keyword or reset filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredAmenities.map((item) => {
                                const usage = getAmenityUsage(item.id);

                                return (
                                    <div
                                        key={item.id}
                                        className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                                    >
                                        <div>
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-2xl p-1 bg-gray-50 rounded-lg border border-gray-100 flex-shrink-0">
                                                        {item.icon}
                                                    </span>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                                                {item.id}
                                                            </span>
                                                            {item.isMandatory && (
                                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                                                                    Statutory
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="text-xs text-gray-900 mt-1 line-clamp-1">
                                                            {item.name}
                                                        </h4>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                                                    <button
                                                        onClick={() => handleOpenEditAmenity(item)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                                        title="Edit Asset"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAmenity(item)}
                                                        className="p-1 text-gray-400 hover:text-rose-600 rounded"
                                                        title="Delete Asset"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Category & Scope */}
                                            <div className="flex items-center justify-between text-[10px] mb-2">
                                                <span className="text-gray-500 font-medium">{item.category}</span>
                                                <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                                                    Scope: {item.scope}
                                                </span>
                                            </div>

                                            {/* Description */}
                                            <p className="text-[11px] text-gray-600 line-clamp-2 mb-3">
                                                {item.description || 'No detailed specifications recorded.'}
                                            </p>
                                        </div>

                                        {/* Usage Footer */}
                                        <div className="border-t border-gray-100 pt-2 flex justify-between items-center text-[10px] text-gray-500 font-medium">
                                            <span>Type: <strong className="capitalize">{item.type}</strong></span>
                                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                                In {usage.floorCount} Floors • {usage.buildingCount} Wings
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT 4: CAPACITY & ARCHITECTURAL MATRIX */}
            {mainTab === 'matrix' && (
                <div className="flex-1 p-4 space-y-6">
                    <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-xl flex items-start gap-3">
                        <div className="p-2 bg-blue-600 text-white rounded-lg flex-shrink-0">
                            <Compass size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm text-gray-900">Hotel Architectural Matrix & Room Spread</h2>
                            <p className="text-xs text-gray-600 mt-0.5">
                                Visual representation of the property's vertical floor stacks, room assignments, and current housekeeping statuses across all registered wings.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {buildings.map((building) => {
                            const buildingFloors = floors
                                .filter(f => f.buildingId === building.id)
                                .sort((a, b) => b.floorNumber - a.floorNumber);
                            const buildingRooms = getRoomsForBuilding(building.id);

                            return (
                                <div key={building.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                                    {/* Building Header Banner */}
                                    <div className="bg-gray-800 text-white p-3.5 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={16} className="text-blue-400" />
                                            <div>
                                                <h3 className="text-sm tracking-tight">{building.title}</h3>
                                                <span className="text-[10px] text-gray-300 font-mono">
                                                    {building.shortCode} • {building.type}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-xs bg-gray-700/80 px-2.5 py-1 rounded-md font-mono">
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
                                                                <span className="text-gray-900">
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
                                                                    className={`px-2 py-1 rounded-md text-xs font-mono border flex items-center gap-1.5 ${getHkBadgeClass(
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
                                <h3 className="text-base text-gray-900">
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
                        <div className="px-5 pt-3 border-b border-gray-200 flex gap-4 text-xs font-semibold overflow-x-auto">
                            {[
                                { id: 'basic', label: '1. Identity & Info' },
                                { id: 'specs', label: '2. Structural Specs' },
                                { id: 'amenities', label: '3. Wing Amenities & Safety' },
                                { id: 'location', label: '4. Location & GPS' },
                                { id: 'status', label: '5. Operations' }
                            ].map((tb) => (
                                <button
                                    key={tb.id}
                                    type="button"
                                    onClick={() => setBuildingFormTab(tb.id as any)}
                                    className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex-shrink-0 ${
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
                                                onChange={e => handleBuildingTitleChange(e.target.value)}
                                                placeholder="e.g. Ocean View Tower, Executive Wing"
                                                className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                                            />
                                        </div>

                                        {/* Short Code Field with Auto-Generation & Duplicate Detection */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-semibold text-gray-700">Short Code *</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const auto = generateUniqueShortCode(editingBuilding.title, existingBuildingCodes, {
                                                            currentCode: editingBuilding.shortCode,
                                                            maxLength: 7
                                                        });
                                                        setEditingBuilding({ ...editingBuilding, shortCode: auto });
                                                        setIsBuildingCodeManual(false);
                                                        showToast(`Auto-created unique code: ${auto}`);
                                                    }}
                                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                >
                                                    <RefreshCw size={10} /> Auto-Generate
                                                </button>
                                            </div>

                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    required
                                                    value={editingBuilding.shortCode}
                                                    onChange={e => {
                                                        setIsBuildingCodeManual(true);
                                                        setEditingBuilding({ ...editingBuilding, shortCode: e.target.value.toUpperCase() });
                                                    }}
                                                    placeholder="e.g. OCN, EW"
                                                    className={`w-full h-8 px-3 pr-8 text-xs border rounded-lg font-mono focus:ring-1 outline-none uppercase ${
                                                        isShortCodeDuplicate(editingBuilding.shortCode, existingBuildingCodes, buildings.find(b => b.id === editingBuilding.id)?.shortCode)
                                                            ? 'border-rose-500 bg-rose-50 text-rose-700 focus:ring-rose-500'
                                                            : 'border-gray-300 focus:ring-blue-500 text-blue-700'
                                                    }`}
                                                />
                                                {/* Duplicate warning icon */}
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    {isShortCodeDuplicate(editingBuilding.shortCode, existingBuildingCodes, buildings.find(b => b.id === editingBuilding.id)?.shortCode) ? (
                                                        <AlertTriangle size={14} className="text-rose-500" />
                                                    ) : editingBuilding.shortCode ? (
                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                    ) : null}
                                                </div>
                                            </div>

                                            {/* Duplicate Feedback Message */}
                                            {isShortCodeDuplicate(editingBuilding.shortCode, existingBuildingCodes, buildings.find(b => b.id === editingBuilding.id)?.shortCode) ? (
                                                <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                                                    <AlertTriangle size={11} /> Short Code already in use! Must be unique.
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-gray-400">
                                                    Auto-created uniquely from title. You can customize anytime.
                                                </p>
                                            )}
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

                            {/* TAB 3: WING AMENITIES & SAFETY */}
                            {buildingFormTab === 'amenities' && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-xs text-gray-800">Assign Building-Wide Safety & Amenities</h4>
                                            <p className="text-[11px] text-gray-500">Check all facilities that apply across this entire building</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleOpenAddAmenity}
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                                        >
                                            <Plus size={12} /> Add New Asset to Library
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto border border-gray-200 rounded-lg p-2.5 bg-gray-50/50">
                                        {amenitiesCatalog.map((item) => {
                                            const isSelected = (editingBuilding.amenityIds || []).includes(item.id);

                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => toggleBuildingAmenity(item.id)}
                                                    className={`p-2 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                                                        isSelected
                                                            ? 'bg-blue-50/70 border-blue-300 text-blue-900 shadow-2xs'
                                                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}} // Handled by container onClick
                                                        className="w-4 h-4 text-blue-600 rounded mt-0.5 pointer-events-none"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>{item.icon}</span>
                                                            <span className="text-xs truncate">{item.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className="text-[9px] font-mono px-1 rounded bg-gray-100 text-gray-600">
                                                                {item.id}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400 capitalize">
                                                                {item.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: LOCATION */}
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

                            {/* TAB 5: STATUS */}
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
                                    disabled={isShortCodeDuplicate(editingBuilding.shortCode, existingBuildingCodes, buildings.find(b => b.id === editingBuilding.id)?.shortCode)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
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
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl max-h-[90vh] flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/70 rounded-t-xl">
                            <div>
                                <h3 className="text-base text-gray-900">
                                    {floors.some(f => f.id === editingFloor.id) ? 'Edit Floor Configuration' : 'Add New Floor Level'}
                                </h3>
                                <p className="text-xs text-gray-500">Assign floor to a building, configure capacity and dynamic safety amenities</p>
                            </div>
                            <button
                                onClick={() => setIsFloorModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Sub-tabs: General vs Dynamic Amenities */}
                        <div className="px-5 pt-3 border-b border-gray-200 flex gap-4 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setFloorFormTab('general')}
                                className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                                    floorFormTab === 'general'
                                        ? 'border-blue-600 text-blue-700 font-bold'
                                        : 'border-transparent text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                1. General & Capacity
                            </button>
                            <button
                                type="button"
                                onClick={() => setFloorFormTab('amenities')}
                                className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                                    floorFormTab === 'amenities'
                                        ? 'border-emerald-600 text-emerald-700 font-bold'
                                        : 'border-transparent text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <ShieldCheck size={13} className="text-emerald-600" />
                                <span>2. Dynamic Amenities & Safety ({(editingFloor.amenityIds || []).length})</span>
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSaveFloor} className="flex-1 overflow-y-auto p-5 space-y-4">
                            {floorFormTab === 'general' && (
                                <div className="space-y-4">
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
                                                onChange={e => {
                                                    const num = parseInt(e.target.value) || 1;
                                                    const updatedName = editingFloor.name.startsWith('Floor ') ? `Floor ${num}` : editingFloor.name;
                                                    setEditingFloor({ ...editingFloor, floorNumber: num, name: updatedName });
                                                }}
                                                className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg outline-none"
                                            />
                                        </div>

                                        {/* Floor Code Field with Auto-Generation & Duplicate Detection */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-semibold text-gray-700">Floor Code *</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const auto = generateUniqueShortCode(editingFloor.name, existingFloorCodes, {
                                                            prefix: 'FL',
                                                            currentCode: editingFloor.code,
                                                            maxLength: 8
                                                        });
                                                        setEditingFloor({ ...editingFloor, code: auto });
                                                        setIsFloorCodeManual(false);
                                                        showToast(`Auto-created unique code: ${auto}`);
                                                    }}
                                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                >
                                                    <RefreshCw size={10} /> Auto
                                                </button>
                                            </div>

                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    required
                                                    value={editingFloor.code}
                                                    onChange={e => {
                                                        setIsFloorCodeManual(true);
                                                        setEditingFloor({ ...editingFloor, code: e.target.value.toUpperCase() });
                                                    }}
                                                    placeholder="e.g. FL-01"
                                                    className={`w-full h-8 px-3 pr-8 text-xs border rounded-lg font-mono outline-none uppercase ${
                                                        isShortCodeDuplicate(editingFloor.code, existingFloorCodes, floors.find(f => f.id === editingFloor.id)?.code)
                                                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                                                            : 'border-gray-300 text-indigo-700'
                                                    }`}
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    {isShortCodeDuplicate(editingFloor.code, existingFloorCodes, floors.find(f => f.id === editingFloor.id)?.code) ? (
                                                        <AlertTriangle size={14} className="text-rose-500" />
                                                    ) : editingFloor.code ? (
                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                    ) : null}
                                                </div>
                                            </div>
                                            {isShortCodeDuplicate(editingFloor.code, existingFloorCodes, floors.find(f => f.id === editingFloor.id)?.code) && (
                                                <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                                                    <AlertTriangle size={11} /> Floor code already exists! Must be unique.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Floor Display Label *</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingFloor.name}
                                            onChange={e => handleFloorNameChange(e.target.value)}
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
                                            <label className="text-xs font-semibold text-gray-700">Target Room Capacity</label>
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
                                </div>
                            )}

                            {/* SUB-TAB 2: DYNAMIC AMENITIES & SAFETY CHECKLIST */}
                            {floorFormTab === 'amenities' && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-xs text-gray-800">Dynamic Floor Amenities & Safety</h4>
                                            <p className="text-[11px] text-gray-500">Select life safety assets and amenities active on this floor</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleOpenAddAmenity}
                                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                                        >
                                            <Plus size={12} /> + Add Custom Asset
                                        </button>
                                    </div>

                                    {/* Categorized Checkbox Grid */}
                                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                        {['Safety & Emergency', 'Vertical Transport & Access', 'Housekeeping & Operations', 'Guest Amenities & Comfort', 'Security & Surveillance'].map(category => {
                                            const catItems = amenitiesCatalog.filter(a => a.category === category);
                                            if (catItems.length === 0) return null;

                                            return (
                                                <div key={category} className="border border-gray-200 rounded-lg p-2.5 bg-gray-50/40">
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-2">
                                                        {category}
                                                    </span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {catItems.map(item => {
                                                            const isSelected = (editingFloor.amenityIds || []).includes(item.id);

                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    onClick={() => toggleFloorAmenity(item.id)}
                                                                    className={`p-2 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                                                                        isSelected
                                                                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-2xs'
                                                                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => {}}
                                                                        className="w-4 h-4 text-emerald-600 rounded mt-0.5 pointer-events-none"
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span>{item.icon}</span>
                                                                            <span className="text-xs truncate">{item.name}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 mt-0.5">
                                                                            <span className="text-[9px] font-mono px-1 rounded bg-gray-100 text-gray-600">
                                                                                {item.id}
                                                                            </span>
                                                                            {item.isMandatory && (
                                                                                <span className="text-[8.5px] text-rose-600 bg-rose-50 px-1 rounded">
                                                                                    Mandatory
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

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
                                    disabled={isShortCodeDuplicate(editingFloor.code, existingFloorCodes, floors.find(f => f.id === editingFloor.id)?.code)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                                >
                                    <Save size={14} /> Save Floor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* MODAL: ADD / EDIT AMENITY & SAFETY ASSET (CATALOG MASTER) */}
            {/* ================================================================ */}
            {isAmenityModalOpen && editingAmenity && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md max-h-[90vh] flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/70 rounded-t-xl">
                            <div>
                                <h3 className="text-base text-gray-900 flex items-center gap-1.5">
                                    <ShieldCheck size={16} className="text-emerald-600" />
                                    <span>{amenitiesCatalog.some(a => a.id === editingAmenity.id) ? 'Edit Life Safety / Amenity' : 'Create New Amenity / Safety Asset'}</span>
                                </h3>
                                <p className="text-xs text-gray-500">Define dynamic asset with automatic unique code generation</p>
                            </div>
                            <button
                                onClick={() => setIsAmenityModalOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSaveAmenity} className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Asset / Feature Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingAmenity.name}
                                    onChange={e => handleAmenityNameChange(e.target.value)}
                                    placeholder="e.g. Emergency Eye Wash Station, Water Purifier"
                                    className="w-full h-8 px-3 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            {/* Short Code / ID with Auto-generation */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-semibold text-gray-700">Unique Identifier Code *</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const auto = generateUniqueShortCode(editingAmenity.name, existingAmenityCodes, {
                                                currentCode: editingAmenity.id,
                                                maxLength: 10
                                            });
                                            setEditingAmenity({ ...editingAmenity, id: auto });
                                            setIsAmenityCodeManual(false);
                                            showToast(`Auto-created code: ${auto}`);
                                        }}
                                        className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    >
                                        <RefreshCw size={10} /> Auto-Code
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={editingAmenity.id}
                                        onChange={e => {
                                            setIsAmenityCodeManual(true);
                                            setEditingAmenity({ ...editingAmenity, id: e.target.value.toUpperCase() });
                                        }}
                                        placeholder="e.g. EYE-WASH, AED-01"
                                        className={`w-full h-8 px-3 pr-8 text-xs border rounded-lg font-mono outline-none uppercase ${
                                            isShortCodeDuplicate(editingAmenity.id, existingAmenityCodes, amenitiesCatalog.find(a => a.id === editingAmenity.id)?.id)
                                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                                : 'border-gray-300 text-gray-800'
                                        }`}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {isShortCodeDuplicate(editingAmenity.id, existingAmenityCodes, amenitiesCatalog.find(a => a.id === editingAmenity.id)?.id) ? (
                                            <AlertTriangle size={14} className="text-rose-500" />
                                        ) : editingAmenity.id ? (
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                        ) : null}
                                    </div>
                                </div>
                                {isShortCodeDuplicate(editingAmenity.id, existingAmenityCodes, amenitiesCatalog.find(a => a.id === editingAmenity.id)?.id) && (
                                    <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                                        <AlertTriangle size={11} /> Asset Code already exists! Must be unique.
                                    </p>
                                )}
                            </div>

                            {/* Icon Emoji Selector */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Display Icon Emoji</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={editingAmenity.icon}
                                        onChange={e => setEditingAmenity({ ...editingAmenity, icon: e.target.value })}
                                        className="w-14 h-8 text-center text-lg border border-gray-300 rounded-lg outline-none"
                                    />
                                    <div className="flex flex-wrap gap-1 flex-1">
                                        {['🚪', '🧯', '🚨', '🛗', '♿', '🧺', '🧊', '🍽️', '☕', '💧', '📹', '🔑', '🩺', '⚡', '🛡️', '📦'].map(ic => (
                                            <button
                                                key={ic}
                                                type="button"
                                                onClick={() => setEditingAmenity({ ...editingAmenity, icon: ic })}
                                                className={`p-1 text-sm rounded hover:bg-gray-100 transition-colors ${editingAmenity.icon === ic ? 'bg-emerald-50 ring-1 ring-emerald-500' : ''}`}
                                            >
                                                {ic}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Category</label>
                                    <select
                                        value={editingAmenity.category}
                                        onChange={e => setEditingAmenity({ ...editingAmenity, category: e.target.value as any })}
                                        className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white outline-none"
                                    >
                                        <option value="Safety & Emergency">Safety & Emergency</option>
                                        <option value="Vertical Transport & Access">Vertical Transport & Access</option>
                                        <option value="Housekeeping & Operations">Housekeeping & Operations</option>
                                        <option value="Guest Amenities & Comfort">Guest Amenities & Comfort</option>
                                        <option value="Security & Surveillance">Security & Surveillance</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Asset Type</label>
                                    <select
                                        value={editingAmenity.type}
                                        onChange={e => setEditingAmenity({ ...editingAmenity, type: e.target.value as any })}
                                        className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white outline-none"
                                    >
                                        <option value="safety">Life Safety Asset</option>
                                        <option value="amenity">Guest Amenity</option>
                                        <option value="operational">Operational Equipment</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Deployment Scope</label>
                                    <select
                                        value={editingAmenity.scope}
                                        onChange={e => setEditingAmenity({ ...editingAmenity, scope: e.target.value as any })}
                                        className="w-full h-8 px-2.5 text-xs border border-gray-300 rounded-lg bg-white outline-none"
                                    >
                                        <option value="floor">Floor Level</option>
                                        <option value="building">Building Wide</option>
                                        <option value="both">Both Floor & Building</option>
                                    </select>
                                </div>

                                <div className="flex items-center pt-5">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                                        <input
                                            type="checkbox"
                                            checked={editingAmenity.isMandatory}
                                            onChange={e => setEditingAmenity({ ...editingAmenity, isMandatory: e.target.checked })}
                                            className="w-4 h-4 text-rose-600 rounded"
                                        />
                                        <span className="font-semibold text-gray-800">Statutory Mandatory</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700">Description / Specifications</label>
                                <textarea
                                    rows={2}
                                    value={editingAmenity.description}
                                    onChange={e => setEditingAmenity({ ...editingAmenity, description: e.target.value })}
                                    placeholder="Operational guidelines, maintenance or compliance info..."
                                    className="w-full p-2.5 text-xs border border-gray-300 rounded-lg outline-none"
                                />
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t border-gray-200 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAmenityModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isShortCodeDuplicate(editingAmenity.id, existingAmenityCodes, amenitiesCatalog.find(a => a.id === editingAmenity.id)?.id)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                                >
                                    <Save size={14} /> Save Asset
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
