import { useState, useEffect, useMemo } from 'react';
import {
    Layers, Plus, Save, Edit2, Trash2, ChevronLeft, Link as LinkIcon, Check,
    ShieldCheck, Search, Filter, Building2, Info
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { getApiBaseUrl } from '../utils/apiUrl';
import {
    getCanonicalRooms,
    getDynamicRoomTypes,
    syncRoomTypesAndRoomsFromDB,
    broadcastPMSEvent
} from '../utils/roomInventoryEngine';
import { useProperty } from '../context/PropertyContext';
import { toast } from '../context/ToastContext';

interface ComponentRoom {
    roomTypeId: string;
    count: number;
    roomNumbers: string[];
}

export interface ConnectingRoom {
    id: number | string;
    propertyId?: number;
    name: string;
    componentRooms: ComponentRoom[];
    inventoryLogic: string;
    pricingStrategy: string;
    fixedPrice?: number;
    status: string;
}

const STORAGE_KEY = 'hotel_connecting_rooms_v1';

const ConnectingRoomManagement = () => {
    const { activeProperty } = useProperty();
    const activePropertyId = activeProperty?.id || 1;

    // Dynamic Currency Symbol based on active property configuration
    const currencySymbol = useMemo(() => {
        switch (activeProperty?.currency) {
            case 'USD': return '$';
            case 'EUR': return '€';
            case 'GBP': return '£';
            case 'INR': return '₹';
            case 'AED': return 'AED ';
            case 'BDT':
            default: return '৳';
        }
    }, [activeProperty?.currency]);

    const [view, setView] = useState<'list' | 'form'>('list');
    const [roomTypes, setRoomTypes] = useState(() => getDynamicRoomTypes());
    const [physicalRoomsState, setPhysicalRoomsState] = useState(() => getCanonicalRooms(activePropertyId));

    const [connectingRooms, setConnectingRooms] = useState<ConnectingRoom[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {}
        return [];
    });

    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [formData, setFormData] = useState<ConnectingRoom | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
    const [deleteModalSuite, setDeleteModalSuite] = useState<ConnectingRoom | null>(null);

    // Floor and Building descriptive names
    const { buildingNames, floorNames } = useMemo(() => {
        const bMap: Record<string, string> = { '1': 'Building 1', '2': 'Building 2' };
        const fMap: Record<string, string> = { '1': 'Floor 1', '2': 'Floor 2', '3': 'Floor 3', '4': 'Floor 4', '5': 'Floor 5' };
        try {
            const savedB = localStorage.getItem('hotel_buildings_v2');
            if (savedB) {
                JSON.parse(savedB).forEach((b: any) => {
                    const k = String(b.id || '');
                    if (k && (b.title || b.name)) bMap[k] = b.title || b.name;
                });
            }
            const savedF = localStorage.getItem('hotel_floors_v2');
            if (savedF) {
                JSON.parse(savedF).forEach((f: any) => {
                    const k = String(f.id || f.number || '');
                    if (k && f.name) fMap[k] = f.name;
                });
            }
        } catch {}
        return { buildingNames: bMap, floorNames: fMap };
    }, []);

    const existingRoomTypes = useMemo(() => roomTypes.map(rt => ({
        id: String(rt.id),
        name: rt.name,
        code: rt.code,
        price: Number(rt.baseRate) || 3000
    })), [roomTypes]);

    const physicalRoomsList = useMemo(() => physicalRoomsState.map(r => ({
        id: r.number,
        number: String(r.number).trim(),
        name: r.name || `Room ${r.number}`,
        typeId: String(r.roomTypeId),
        buildingId: String(r.buildingId || '1'),
        floorId: String(r.floorId || '1')
    })), [physicalRoomsState]);

    // Fetch and Sync rooms & connecting suites on mount or property change
    useEffect(() => {
        syncRoomTypesAndRoomsFromDB(activePropertyId).then(({ roomTypes: rt, rooms: r }) => {
            if (rt && rt.length > 0) setRoomTypes(rt);
            if (r && r.length > 0) setPhysicalRoomsState(r);
        }).catch(() => {});

        fetch(`${getApiBaseUrl()}/api/connecting-rooms?propertyId=${activePropertyId}`)
            .then(res => res.json())
            .then(json => {
                if (json.success && Array.isArray(json.data)) {
                    setConnectingRooms(json.data);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
                }
            })
            .catch(() => {});
    }, [activePropertyId]);

    // Two-Way Sync helper: Updates physical room isConnecting and connectedTo in All Rooms & DB
    const syncPhysicalRoomsTwoWay = async (suites: ConnectingRoom[]) => {
        try {
            const canonical = getCanonicalRooms(activePropertyId);
            if (!canonical || canonical.length === 0) return;

            const partnerMap = new Map<string, string>();
            suites.filter(s => s.status === 'Active').forEach(suite => {
                const suiteRooms: string[] = [];
                suite.componentRooms.forEach(cr => {
                    if (Array.isArray(cr.roomNumbers)) {
                        cr.roomNumbers.forEach(n => {
                            const num = String(n).trim();
                            if (num && !suiteRooms.includes(num)) suiteRooms.push(num);
                        });
                    }
                });
                if (suiteRooms.length >= 2) {
                    suiteRooms.forEach(rm => {
                        const others = suiteRooms.filter(x => x !== rm);
                        partnerMap.set(rm, others.join(', '));
                    });
                }
            });

            const updatedRooms = canonical.map(room => {
                const roomNum = String(room.number).trim();
                const partner = partnerMap.get(roomNum);
                return {
                    ...room,
                    isConnecting: Boolean(partner),
                    connectedTo: partner || ''
                };
            });

            if (activePropertyId === 1) {
                localStorage.setItem('hotel_rooms_inventory_v1', JSON.stringify(updatedRooms));
            }
            localStorage.setItem(`hotel_rooms_prop_${activePropertyId}`, JSON.stringify(updatedRooms));
            setPhysicalRoomsState(updatedRooms);

            window.dispatchEvent(new CustomEvent('hotel_rooms_updated', { detail: updatedRooms }));
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });

            // Push changed rooms to backend API
            const apiBase = getApiBaseUrl();
            for (const room of updatedRooms) {
                const original = canonical.find(c => String(c.number).trim() === String(room.number).trim());
                if (original && (Boolean(original.isConnecting) !== room.isConnecting || (original.connectedTo || '') !== room.connectedTo)) {
                    try {
                        await fetch(`${apiBase}/api/rooms/${encodeURIComponent(room.number)}/details`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                isConnecting: room.isConnecting,
                                connectedTo: room.connectedTo
                            })
                        });
                    } catch {}
                }
            }
        } catch (e) {
            console.warn('Connecting Room Two-Way Sync error:', e);
        }
    };

    const persistRooms = (updated: ConnectingRoom[]) => {
        setConnectingRooms(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        syncPhysicalRoomsTwoWay(updated);
    };

    const handleAddNew = () => {
        setEditingId(null);
        const firstType = existingRoomTypes[0]?.id || '1';
        setFormData({
            id: Date.now(),
            propertyId: activePropertyId,
            name: '',
            componentRooms: [{ roomTypeId: firstType, count: 0, roomNumbers: [] }],
            inventoryLogic: 'Auto-Sync',
            pricingStrategy: 'Sum of Rates',
            status: 'Active'
        });
        setView('form');
    };

    const handleEdit = (room: ConnectingRoom) => {
        setEditingId(room.id);
        setFormData(JSON.parse(JSON.stringify(room)));
        setView('form');
    };

    // Calculate sum of rates for component rooms
    const calculateSumPrice = (roomToCalc?: ConnectingRoom | null) => {
        const target = roomToCalc || formData;
        if (!target) return 0;
        return target.componentRooms.reduce((acc, comp) => {
            const roomType = existingRoomTypes.find(rt => rt.id === comp.roomTypeId);
            return acc + (roomType ? roomType.price * (comp.roomNumbers?.length || comp.count || 1) : 0);
        }, 0);
    };

    // Identify Anchor Room for Physical Adjacency check
    const anchorRoom = useMemo(() => {
        if (!formData) return null;
        for (const comp of formData.componentRooms) {
            if (comp.roomNumbers && comp.roomNumbers.length > 0) {
                const first = physicalRoomsList.find(r => r.number === comp.roomNumbers[0]);
                if (first) return first;
            }
        }
        return null;
    }, [formData, physicalRoomsList]);

    // Validation & Save Handler
    const handleSave = async () => {
        if (!formData || !formData.name.trim()) {
            toast.error('Please enter a name for the connecting room suite.');
            return;
        }

        // Collect all distinct rooms selected across all component categories
        const allSelectedRooms = Array.from(new Set(
            formData.componentRooms.flatMap(c => (c.roomNumbers || []).map(num => String(num).trim()))
        )).filter(Boolean);

        // Validation 1: At least 2 physical rooms
        if (allSelectedRooms.length < 2) {
            toast.error('A connecting suite must include at least 2 distinct physical rooms with an adjoining door.');
            return;
        }

        // Validation 2: Duplicate check across rows
        const flatList = formData.componentRooms.flatMap(c => (c.roomNumbers || []).map(num => String(num).trim()));
        if (flatList.length !== allSelectedRooms.length) {
            toast.error('Duplicate rooms detected! A room cannot be selected more than once in the same suite.');
            return;
        }

        // Validation 3: Physical Adjacency check (Same Floor & Same Building)
        const roomDetails = allSelectedRooms.map(rn => physicalRoomsList.find(r => r.number === rn)).filter(Boolean);
        const bldgs = new Set(roomDetails.map(r => r?.buildingId));
        const flrs = new Set(roomDetails.map(r => r?.floorId));

        if (bldgs.size > 1 || flrs.size > 1) {
            toast.error('Physical Adjacency Violation: All connecting rooms must be located on the same building and floor for internal door connectivity.');
            return;
        }

        // Validation 4: Overlap with other active suites
        for (const rn of allSelectedRooms) {
            const conflict = connectingRooms.find(s =>
                String(s.id) !== String(editingId) &&
                s.status === 'Active' &&
                s.componentRooms.some(c => c.roomNumbers?.map(String).includes(rn))
            );
            if (conflict) {
                toast.error(`Room #${rn} is already allocated to active suite "${conflict.name}". A room cannot belong to multiple connecting suites.`);
                return;
            }
        }

        // Validation 5: Fixed Rate Pricing check
        if (formData.pricingStrategy === 'Fixed Rate' && (!formData.fixedPrice || formData.fixedPrice <= 0)) {
            toast.error('Please enter a valid fixed combo tariff greater than 0 for Fixed Rate mode.');
            return;
        }

        const API_BASE = getApiBaseUrl();
        const payload = {
            ...formData,
            propertyId: activePropertyId
        };

        let updated: ConnectingRoom[];
        if (editingId) {
            try {
                await fetch(`${API_BASE}/api/connecting-rooms/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch {}
            updated = connectingRooms.map(r => String(r.id) === String(editingId) ? payload : r);
        } else {
            let newId = formData.id;
            try {
                const res = await fetch(`${API_BASE}/api/connecting-rooms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success && json.data?.id) newId = json.data.id;
            } catch {}
            updated = [...connectingRooms, { ...payload, id: newId }];
        }

        persistRooms(updated);
        toast.success(editingId ? `Connecting Suite "${formData.name}" updated successfully!` : `New Connecting Suite "${formData.name}" created successfully!`);
        setView('list');
    };

    // Confirmed Delete execution
    const confirmDeleteSuite = async () => {
        if (!deleteModalSuite) return;
        const targetId = deleteModalSuite.id;
        try {
            await fetch(`${getApiBaseUrl()}/api/connecting-rooms/${targetId}`, { method: 'DELETE' });
        } catch {}

        const updated = connectingRooms.filter(r => String(r.id) !== String(targetId));
        persistRooms(updated);
        toast.success(`Connecting suite "${deleteModalSuite.name}" deleted successfully.`);
        setDeleteModalSuite(null);
    };

    const updateField = (field: keyof ConnectingRoom, value: any) => {
        if (formData) {
            setFormData({ ...formData, [field]: value });
        }
    };

    const addComponentRoom = () => {
        if (formData) {
            const firstType = existingRoomTypes[0]?.id || '1';
            updateField('componentRooms', [...formData.componentRooms, { roomTypeId: firstType, count: 0, roomNumbers: [] }]);
        }
    };

    const removeComponentRoom = (index: number) => {
        if (formData) {
            if (formData.componentRooms.length <= 1) {
                toast.warning('A connecting suite must have at least one room category row.');
                return;
            }
            updateField('componentRooms', formData.componentRooms.filter((_, i) => i !== index));
        }
    };

    const getRoomTypeName = (id: string) => existingRoomTypes.find(rt => rt.id === id)?.name || 'Unknown Room';

    const filteredConnectingRooms = connectingRooms.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.componentRooms.some(c => (c.roomNumbers || []).some(n => String(n).includes(searchTerm)));
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // KPI Metrics
    const totalSuites = connectingRooms.length;
    const activeSuites = connectingRooms.filter(r => r.status === 'Active').length;
    const totalLinkedRooms = connectingRooms.reduce((acc, r) =>
        acc + r.componentRooms.reduce((cAcc, c) => cAcc + (c.roomNumbers?.length || c.count || 0), 0), 0
    );
    const avgTariff = totalSuites > 0
        ? Math.round(connectingRooms.reduce((acc, r) => {
            const price = r.pricingStrategy === 'Fixed Rate' && r.fixedPrice ? r.fixedPrice : calculateSumPrice(r);
            return acc + price;
        }, 0) / totalSuites)
        : 0;

    // =========================================================================
    // 1. LIST VIEW
    // =========================================================================
    if (view === 'list') {
        return (
            <div className="p-2.5 sm:p-3.5 space-y-3 font-sans animate-in fade-in duration-200">
                {/* Standard Page Header with Active Property Code */}
                <PageHeader
                    title="Connecting & Joint Rooms"
                    subtitle={`Virtual interconnecting suites, parent-child inventory locks & synchronized pricing (${activeProperty?.name || 'Grand Palace Dhaka'})`}
                    icon={<Layers className="size-5 text-primary" />}
                    actions={
                        <button
                            type="button"
                            onClick={handleAddNew}
                            className="btn-primary !h-8 !py-1 !px-3 text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-[0.99] transition-transform"
                        >
                            <Plus size={14} /> <span>Add Connecting Suite</span>
                        </button>
                    }
                />

                {/* 4 Standardized KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Suites</span>
                            <div className="size-7 rounded-lg bg-primary-subtle text-primary flex items-center justify-center font-bold">
                                <Layers size={14} />
                            </div>
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{totalSuites}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400 font-medium">Configured suites</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Active Suites</span>
                            <div className="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <ShieldCheck size={14} />
                            </div>
                        </div>
                        <div className="mt-1 text-lg font-bold text-emerald-600 tracking-tight">{activeSuites}</div>
                        <div className="mt-0.5 text-[10px] text-emerald-600 font-semibold">Bookable across PMS</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Linked Units</span>
                            <div className="size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <LinkIcon size={14} />
                            </div>
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{totalLinkedRooms}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400 font-medium">Physical rooms assigned</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Average Tariff</span>
                            <div className="size-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-mono font-bold">
                                {currencySymbol}
                            </div>
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight font-mono">
                            {currencySymbol}{avgTariff.toLocaleString()}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400 font-medium">Mean rate per night</div>
                    </div>
                </div>

                {/* Standardized Search & Filter Toolbar */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap gap-2 items-center justify-between">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search suites, room numbers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-standard pl-8.5 !h-8 !text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Filter size={12} className="text-slate-400" />
                            <span>Status:</span>
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="select-standard !py-1 !h-8 !text-xs !w-auto"
                        >
                            <option value="all">All Statuses ({totalSuites})</option>
                            <option value="Active">Active ({activeSuites})</option>
                            <option value="Inactive">Inactive ({totalSuites - activeSuites})</option>
                        </select>
                    </div>
                </div>

                {/* Suites Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredConnectingRooms.length === 0 ? (
                        <div className="col-span-full card-container p-8 text-center text-slate-400 text-xs">
                            No connecting suites found matching your search.
                        </div>
                    ) : (
                        filteredConnectingRooms.map(room => {
                            const sumPrice = calculateSumPrice(room);
                            const displayPrice = room.pricingStrategy === 'Fixed Rate' && room.fixedPrice ? room.fixedPrice : sumPrice;
                            const totalSuiteRooms = room.componentRooms.flatMap(c => c.roomNumbers || []);

                            return (
                                <div key={String(room.id)} className="card-container p-3.5 flex flex-col justify-between hover:border-primary/40 transition">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`${room.status === 'Active' ? 'badge-status-active' : 'badge-status-inactive'} text-[10px] py-0.5 px-2`}>
                                                {room.status}
                                            </span>
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(room)}
                                                    className="btn-icon size-6"
                                                    title="Edit Suite"
                                                >
                                                    <Edit2 size={13} className="text-slate-600" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteModalSuite(room)}
                                                    className="btn-icon-danger size-6"
                                                    title="Delete Suite"
                                                >
                                                    <Trash2 size={13} className="text-rose-500" />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-sm font-semibold text-slate-900 leading-snug">{room.name}</h3>

                                        <div className="mt-2.5 space-y-1.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200/70">
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between font-semibold">
                                                <span className="flex items-center gap-1">
                                                    <LinkIcon size={11} className="text-primary" /> Linked Units ({totalSuiteRooms.length})
                                                </span>
                                                <span className="text-[9.5px] font-mono text-slate-400">
                                                    {room.inventoryLogic || 'Auto-Sync'}
                                                </span>
                                            </div>
                                            {room.componentRooms.map((comp, idx) => (
                                                <div key={idx} className="text-xs text-slate-700 flex items-center justify-between">
                                                    <span className="font-semibold text-slate-800 text-[11px]">
                                                        {comp.roomNumbers?.length || comp.count || 1}x {getRoomTypeName(comp.roomTypeId)}
                                                    </span>
                                                    {comp.roomNumbers && comp.roomNumbers.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 justify-end">
                                                            {comp.roomNumbers.map((num) => (
                                                                <span key={num} className="badge-code text-[10px] py-0.5 px-1.5">
                                                                    #{num}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-3">
                                        <div>
                                            <span className="block text-[9px] uppercase text-slate-400">Rate Strategy</span>
                                            <span className="font-semibold text-slate-800 text-xs">{room.pricingStrategy}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[9px] uppercase text-slate-400">Effective Rate</span>
                                            <span className="font-mono text-emerald-600 font-bold text-xs">
                                                {currencySymbol}{displayPrice.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Sleek Delete Confirmation Modal (Zero browser alert/confirm popup) */}
                {deleteModalSuite && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
                        <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                    <Trash2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Delete Connecting Suite?</h3>
                                    <p className="text-xs text-slate-500">This will dissolve the interconnecting suite relationship.</p>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                                <p className="font-semibold text-slate-800">{deleteModalSuite.name}</p>
                                <p className="text-slate-500 text-[11px]">
                                    Rooms: {deleteModalSuite.componentRooms.flatMap(c => c.roomNumbers || []).map(r => `#${r}`).join(', ')}
                                </p>
                                <p className="text-amber-700 text-[10px] mt-1">
                                    Note: Component rooms will be reverted to standard individual rooms in All Rooms (`?tab=rooms`).
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteModalSuite(null)}
                                    className="btn-secondary !text-xs !py-1.5 !px-3"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDeleteSuite}
                                    className="btn-danger !text-xs !py-1.5 !px-3 flex items-center gap-1.5"
                                >
                                    <Trash2 size={13} /> Delete Suite
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================================
    // 2. CREATE & EDIT FORM VIEW
    // =========================================================================
    // Calculate all currently selected room numbers across all rows in the form
    const allSelectedRoomNumbers = formData?.componentRooms.flatMap(c => c.roomNumbers || []) || [];

    return (
        <div className="p-2.5 sm:p-3.5 max-w-4xl mx-auto space-y-3 font-sans animate-in fade-in duration-200">
            {/* Form Page Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/90">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setView('list')}
                        className="btn-secondary !p-2 rounded-xl"
                        title="Back to list"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl text-slate-900 tracking-tight font-bold">
                            {editingId ? 'Edit Connecting Suite' : 'Create New Connecting Suite'}
                        </h1>
                        <p className="text-xs text-slate-500">
                            Configure virtual interconnected layout, physical adjoining units and sync rules ({activeProperty?.name || 'Grand Palace Dhaka'})
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setView('list')}
                        className="btn-secondary !h-8 text-xs cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="btn-primary !h-8 text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                        <Save size={14} /> Save Configuration
                    </button>
                </div>
            </div>

            <div className="card-container p-5 sm:p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <h2 className="text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 font-bold">
                        <Layers size={15} className="text-primary" /> Basic Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5 md:col-span-1">
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
                                className="select-standard font-semibold"
                            >
                                <option value="Active">Active (Bookable)</option>
                                <option value="Inactive">Inactive (Suspended)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Inventory Allocation Logic</label>
                            <select
                                value={formData?.inventoryLogic || 'Auto-Sync'}
                                onChange={e => updateField('inventoryLogic', e.target.value)}
                                className="select-standard font-semibold"
                            >
                                <option value="Auto-Sync">Auto-Sync (Joint / Deduct Inventory)</option>
                                <option value="Independent">Independent (Dual Sell)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Component Rooms */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h2 className="text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 font-bold">
                            <LinkIcon size={15} className="text-primary" /> Component Categories & Room Numbers
                        </h2>
                        <button
                            type="button"
                            onClick={addComponentRoom}
                            className="btn-secondary !py-1 !px-2.5 !text-xs flex items-center gap-1 text-primary border-primary/30 cursor-pointer shadow-2xs hover:bg-primary-subtle"
                        >
                            <Plus size={13} /> Add Category
                        </button>
                    </div>

                    {/* Physical Adjacency Banner */}
                    {anchorRoom ? (
                        <div className="flex items-center justify-between p-2.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 font-medium">
                            <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-blue-600 shrink-0" />
                                <span>
                                    <strong>Physical Adjacency Anchor:</strong> Suite anchored to{' '}
                                    <strong className="text-blue-950">
                                        Room #{anchorRoom.number} ({floorNames[anchorRoom.floorId] || `Floor ${anchorRoom.floorId}`}, {buildingNames[anchorRoom.buildingId] || `Building ${anchorRoom.buildingId}`})
                                    </strong>.
                                    All connecting rooms must share this floor and wing.
                                </span>
                            </div>
                            <span className="text-[10.5px] font-semibold text-blue-700 font-mono bg-white px-2 py-0.5 rounded border border-blue-200 shrink-0">
                                {allSelectedRoomNumbers.length} Rooms Selected
                            </span>
                        </div>
                    ) : (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                            <Info size={15} className="text-slate-400 shrink-0" />
                            <span>Select physical rooms below. The first selected room will establish the floor and building for the suite.</span>
                        </div>
                    )}

                    <div className="space-y-3">
                        {formData?.componentRooms.map((comp, index) => {
                            const availableRooms = physicalRoomsList.filter(r => r.typeId === comp.roomTypeId);

                            return (
                                <div key={index} className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
                                    <div className="flex items-start gap-4">
                                        {/* Room Type Column */}
                                        <div className="w-1/3 min-w-[200px] space-y-1.5">
                                            <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                                                Room Category #{index + 1}
                                            </label>
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
                                                        {rt.name} ({currencySymbol}{rt.price.toLocaleString()})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Room Selection Column */}
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[11px] text-slate-500 uppercase tracking-wider flex items-center justify-between font-semibold">
                                                <span>Assign Physical Rooms</span>
                                                {comp.roomNumbers && comp.roomNumbers.length > 0 && (
                                                    <span className="text-primary font-bold">({comp.roomNumbers.length} selected)</span>
                                                )}
                                            </label>

                                            {comp.roomTypeId && availableRooms.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5 min-h-[38px] items-center pt-0.5">
                                                    {availableRooms.map(room => {
                                                        const isSelectedInThisRow = comp.roomNumbers?.includes(room.number);
                                                        const isSelectedInOtherRow = formData?.componentRooms.some(
                                                            (c, i) => i !== index && c.roomNumbers?.includes(room.number)
                                                        );

                                                        // Physical Adjacency check against anchor room
                                                        const isDiffFloorOrBldg = anchorRoom && (
                                                            room.buildingId !== anchorRoom.buildingId ||
                                                            room.floorId !== anchorRoom.floorId
                                                        );

                                                        // Check if allocated in another active suite
                                                        const otherActiveSuite = connectingRooms.find(s =>
                                                            String(s.id) !== String(editingId) &&
                                                            s.status === 'Active' &&
                                                            s.componentRooms.some(c => c.roomNumbers?.map(String).includes(room.number))
                                                        );

                                                        const handleRoomClick = () => {
                                                            if (isSelectedInOtherRow) {
                                                                toast.warning(`Room #${room.number} is already assigned in another category row above.`);
                                                                return;
                                                            }
                                                            if (isDiffFloorOrBldg && !isSelectedInThisRow) {
                                                                toast.warning(`Physical Adjacency: Connecting rooms must be on the same floor (${floorNames[anchorRoom!.floorId] || `Floor ${anchorRoom!.floorId}`}). Room #${room.number} is on ${floorNames[room.floorId] || `Floor ${room.floorId}`}.`);
                                                                return;
                                                            }
                                                            if (otherActiveSuite && !isSelectedInThisRow) {
                                                                toast.warning(`Room #${room.number} is already part of active suite "${otherActiveSuite.name}".`);
                                                                return;
                                                            }

                                                            const newNumbers = isSelectedInThisRow
                                                                ? (comp.roomNumbers || []).filter(n => n !== room.number)
                                                                : [...(comp.roomNumbers || []), room.number];

                                                            const updatedComponents = formData.componentRooms.map((c, i) =>
                                                                i === index ? { ...c, roomNumbers: newNumbers, count: newNumbers.length } : c
                                                            );
                                                            updateField('componentRooms', updatedComponents);
                                                        };

                                                        let chipStyle = 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300';
                                                        if (isSelectedInThisRow) {
                                                            chipStyle = 'bg-primary text-white border-primary shadow-2xs font-bold';
                                                        } else if (isSelectedInOtherRow) {
                                                            chipStyle = 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed';
                                                        } else if (isDiffFloorOrBldg) {
                                                            chipStyle = 'bg-rose-50/70 text-rose-700 border-rose-200 hover:bg-rose-100';
                                                        } else if (otherActiveSuite) {
                                                            chipStyle = 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
                                                        }

                                                        return (
                                                            <button
                                                                key={room.id}
                                                                type="button"
                                                                onClick={handleRoomClick}
                                                                className={`px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 transition-all cursor-pointer ${chipStyle}`}
                                                                title={`Room #${room.number} (${floorNames[room.floorId] || `Floor ${room.floorId}`}, ${buildingNames[room.buildingId] || `Bldg ${room.buildingId}`})${otherActiveSuite ? ` • In Suite "${otherActiveSuite.name}"` : ''}`}
                                                            >
                                                                <span>#{room.number}</span>
                                                                {isSelectedInThisRow && <Check size={12} strokeWidth={3} />}
                                                                {isDiffFloorOrBldg && !isSelectedInThisRow && (
                                                                    <span className="text-[9px] font-mono text-rose-600 font-normal">
                                                                        F{room.floorId}
                                                                    </span>
                                                                )}
                                                                {otherActiveSuite && !isSelectedInThisRow && (
                                                                    <span className="text-[9px] text-amber-700 font-normal">
                                                                        (Used)
                                                                    </span>
                                                                )}
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
                                            disabled={formData.componentRooms.length <= 1}
                                            className="btn-icon-danger mt-6 disabled:opacity-30 disabled:cursor-not-allowed"
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
                        <span>
                            <strong>Two-Way PMS Inventory Sync:</strong> Saving this suite will automatically synchronize both component physical rooms with the <strong>All Rooms (`?tab=rooms`)</strong> registry and ensure proper parent-child locks across Front Desk operations.
                        </span>
                    </div>
                </div>

                {/* Pricing Strategy */}
                <div className="space-y-4">
                    <h2 className="text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 font-bold">
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
                                <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-mono text-sm flex items-center justify-between">
                                    <span>{currencySymbol}{calculateSumPrice().toLocaleString()}</span>
                                    <span className="text-xs font-normal text-emerald-600">Sum of component tariffs</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Fixed Suite Tariff ({activeProperty?.currency || 'BDT'}) *</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">{currencySymbol}</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData?.fixedPrice || ''}
                                        onChange={e => updateField('fixedPrice', parseFloat(e.target.value) || 0)}
                                        placeholder="Enter combo rate"
                                        className="input-standard pl-8 font-mono text-primary text-sm"
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
