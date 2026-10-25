import { useState, useMemo, useEffect } from 'react';
import {
    Tags, Users, BedDouble, Star, ChevronLeft, Plus, Save, Edit2, Trash2, Upload, X, Search,
    RefreshCw, AlertTriangle, CheckCircle2, DollarSign, Layers
} from 'lucide-react';
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';
import { getApiBaseUrl } from '../utils/apiUrl';
import { getDynamicRoomTypes, syncRoomTypesAndRoomsFromDB } from '../utils/roomInventoryEngine';
import PageHeader from './common/PageHeader';

interface RoomType {
    id: number;
    name: string;
    shortCode: string;
    description: string;
    size: number;
    status: string;
    displayOrder: number;
    baseAdult: number;
    baseChild: number;
    maxAdult: number;
    maxChild: number;
    totalCapacity: number;
    extraBedAllowed: boolean;
    extraBedQuantity: number;
    babyCotAllowed: boolean;
    isConnecting: boolean;
    basePrice: number;
    extraAdultPrice: number;
    extraChildPrice: number;
    pricingUnit: string;
    bedType: string;
    viewType: string;
    smokingPolicy: string;
    amenities: string[];
    photos: string[];
    showOnWebsite: boolean;
}

const STORAGE_KEY = 'hotel_room_types_v1';

const mapDynamicToRoomType = (rt: any, idx: number): RoomType => ({
    id: Number(rt.id) || (idx + 1),
    name: rt.name || 'Room Category',
    shortCode: rt.code || rt.shortCode || `RT${idx + 1}`,
    description: rt.description || `${rt.name} category configured in property inventory.`,
    size: Number(rt.size) || 350,
    status: rt.status || 'Active',
    displayOrder: Number(rt.displayOrder) || (idx + 1),
    baseAdult: Number(rt.baseOccupancy || rt.baseAdult) || 2,
    baseChild: Number(rt.baseChild) || 1,
    maxAdult: Number(rt.maxOccupancy || rt.maxAdult) || 3,
    maxChild: Number(rt.maxChild) || 2,
    totalCapacity: (Number(rt.maxOccupancy || rt.maxAdult) || 3) + (Number(rt.maxChild) || 1),
    extraBedAllowed: rt.extraBedAllowed ?? true,
    extraBedQuantity: Number(rt.extraBedQuantity) || 1,
    babyCotAllowed: rt.babyCotAllowed ?? true,
    isConnecting: Boolean(rt.isConnecting),
    basePrice: Number(rt.baseRate || rt.basePrice) || 3500,
    extraAdultPrice: Number(rt.extraAdultPrice) || 1000,
    extraChildPrice: Number(rt.extraChildPrice) || 500,
    pricingUnit: rt.pricingUnit || 'Per Room',
    bedType: rt.bedType || 'King',
    viewType: rt.viewType || 'City View',
    smokingPolicy: rt.smokingPolicy || 'Non-Smoking',
    amenities: Array.isArray(rt.amenities) ? rt.amenities : ['AC', 'TV', 'Wifi', 'Safe', 'Desk'],
    photos: Array.isArray(rt.photos) ? rt.photos : [],
    showOnWebsite: rt.showOnWebsite ?? true
});

const RoomTypeManagement = () => {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [searchTerm, setSearchTerm] = useState('');

    const [roomTypes, setRoomTypes] = useState<RoomType[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].shortCode) {
                    return parsed;
                }
            }
        } catch {
            // fallback
        }
        return getDynamicRoomTypes().map(mapDynamicToRoomType);
    });

    useEffect(() => {
        syncRoomTypesAndRoomsFromDB(1).then(({ roomTypes: dbRoomTypes }) => {
            if (dbRoomTypes && dbRoomTypes.length > 0) {
                setRoomTypes(prev => {
                    const mapped = dbRoomTypes.map((dbRt: any, idx: number) => {
                        const existing = prev.find(p => Number(p.id) === Number(dbRt.id) || p.shortCode === dbRt.code);
                        return existing ? {
                            ...existing,
                            id: Number(dbRt.id),
                            name: dbRt.name || existing.name,
                            shortCode: dbRt.code || existing.shortCode,
                            basePrice: Number(dbRt.baseRate || dbRt.basePrice || existing.basePrice)
                        } : mapDynamicToRoomType(dbRt, idx);
                    });
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
                    return mapped;
                });
            }
        }).catch(() => {});
    }, []);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<RoomType | null>(null);
    const [activeTab, setActiveTab] = useState('identity');
    const [isCodeManual, setIsCodeManual] = useState(false);

    const persistRoomTypes = (updated: RoomType[]) => {
        setRoomTypes(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
            // fallback
        }
    };

    const existingCodes = useMemo(() => roomTypes.map(rt => rt.shortCode), [roomTypes]);

    const handleAddNew = () => {
        setEditingId(null);
        setIsCodeManual(false);
        const defaultName = '';
        setFormData({
            id: Date.now(),
            name: defaultName,
            shortCode: '',
            description: '',
            size: 350,
            status: 'Active',
            displayOrder: roomTypes.length + 1,
            baseAdult: 2,
            baseChild: 0,
            maxAdult: 2,
            maxChild: 1,
            totalCapacity: 3,
            extraBedAllowed: true,
            extraBedQuantity: 1,
            babyCotAllowed: true,
            isConnecting: false,
            basePrice: 3500,
            extraAdultPrice: 1000,
            extraChildPrice: 500,
            pricingUnit: 'Per Room',
            bedType: 'King',
            viewType: 'City View',
            smokingPolicy: 'Non-Smoking',
            amenities: ['AC', 'TV', 'Wifi'],
            photos: [],
            showOnWebsite: true
        });
        setView('form');
        setActiveTab('identity');
    };

    const handleEdit = (roomType: RoomType) => {
        setEditingId(roomType.id);
        setIsCodeManual(true);
        setFormData({ ...roomType });
        setView('form');
        setActiveTab('identity');
    };

    const handleNameChange = (name: string) => {
        if (!formData) return;
        const currentCode = editingId ? roomTypes.find(rt => rt.id === editingId)?.shortCode : undefined;
        let nextCode = formData.shortCode;
        if (!isCodeManual || !nextCode) {
            nextCode = generateUniqueShortCode(name, existingCodes, { currentCode, maxLength: 6 });
        }
        setFormData({ ...formData, name, shortCode: nextCode });
    };

    const handleSave = async () => {
        if (!formData || !formData.name.trim() || !formData.shortCode.trim()) {
            alert('Please provide a Room Type Name and Short Code.');
            return;
        }

        const currentCode = editingId ? roomTypes.find(rt => rt.id === editingId)?.shortCode : undefined;
        if (isShortCodeDuplicate(formData.shortCode, existingCodes, currentCode)) {
            alert(`Short Code "${formData.shortCode}" is already in use by another Room Type! Please use a unique code.`);
            return;
        }

        let updated: RoomType[];
        if (editingId) {
            try {
                await fetch(`${getApiBaseUrl()}/api/properties/1/room-types/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: formData.shortCode,
                        name: formData.name,
                        baseOccupancy: formData.baseAdult,
                        maxOccupancy: formData.maxAdult,
                        baseRate: formData.basePrice
                    })
                });
            } catch {}
            updated = roomTypes.map(rt => rt.id === editingId ? formData : rt);
        } else {
            let newId = formData.id;
            try {
                const res = await fetch(`${getApiBaseUrl()}/api/properties/1/room-types`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: formData.shortCode,
                        name: formData.name,
                        baseOccupancy: formData.baseAdult,
                        maxOccupancy: formData.maxAdult,
                        baseRate: formData.basePrice
                    })
                });
                const json = await res.json();
                if (json.success && json.data?.id) newId = Number(json.data.id);
            } catch {}
            updated = [...roomTypes, { ...formData, id: newId }];
        }
        persistRoomTypes(updated);
        setView('list');
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this room type? Rooms assigned to it will need to be reallocated.')) {
            try {
                await fetch(`${getApiBaseUrl()}/api/properties/1/room-types/${id}`, { method: 'DELETE' });
            } catch {}
            const updated = roomTypes.filter(rt => rt.id !== id);
            persistRoomTypes(updated);
        }
    };

    const updateField = (field: keyof RoomType, value: any) => {
        if (formData) {
            setFormData({ ...formData, [field]: value });
        }
    };

    const toggleAmenity = (amenity: string) => {
        if (formData) {
            const currentAmenities = formData.amenities || [];
            if (currentAmenities.includes(amenity)) {
                updateField('amenities', currentAmenities.filter(a => a !== amenity));
            } else {
                updateField('amenities', [...currentAmenities, amenity]);
            }
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && formData) {
            const newPhotos = Array.from(e.target.files).map(file => URL.createObjectURL(file));
            updateField('photos', [...(formData.photos || []), ...newPhotos]);
        }
    };

    const removePhoto = (index: number) => {
        if (formData) {
            const currentPhotos = formData.photos || [];
            updateField('photos', currentPhotos.filter((_, i) => i !== index));
        }
    };

    const filteredRoomTypes = useMemo(() => {
        return roomTypes.filter(rt =>
            rt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rt.shortCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rt.viewType.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [roomTypes, searchTerm]);

    const tabs = [
        { id: 'identity', label: 'Basic Info', icon: <Tags size={16} /> },
        { id: 'occupancy', label: 'Occupancy', icon: <Users size={16} /> },
        { id: 'extraBed', label: 'Extra Bed', icon: <BedDouble size={16} /> },
        { id: 'pricing', label: 'Pricing & Tariff', icon: <span className="font-bold">৳</span> },
        { id: 'attributes', label: 'Attributes & Amenities', icon: <Star size={16} /> },
    ];

    const amenityOptions = ['AC', 'TV', 'Minibar', 'Bathtub', 'Balcony', 'Wifi', 'Hair Dryer', 'Safe', 'Desk'];

    const activeCount = roomTypes.filter(rt => rt.status === 'Active').length;
    const avgTariff = roomTypes.length > 0 ? Math.round(roomTypes.reduce((acc, r) => acc + r.basePrice, 0) / roomTypes.length) : 0;
    const connectingCount = roomTypes.filter(rt => rt.isConnecting).length;

    if (view === 'list') {
        return (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
                {/* Header */}
                <PageHeader
                    title="Room Type Master Data"
                    subtitle="Configure hotel room categories, occupancy limits, physical inventory specifications, and base tariffs."
                    icon={<BedDouble className="size-6 text-primary" />}
                    actions={
                        <button
                            onClick={handleAddNew}
                            className="btn-primary"
                        >
                            <Plus className="size-4 mr-1.5" />
                            Add Room Type
                        </button>
                    }
                />

                {/* KPI Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500">Total Categories</span>
                            <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                                <BedDouble className="size-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900 tracking-tight">{roomTypes.length}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1">Configured room classes</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500">Active Room Types</span>
                            <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <CheckCircle2 className="size-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900 tracking-tight">{activeCount}</div>
                        <div className="text-[11px] text-emerald-600 font-semibold mt-1">Available for reservations</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500">Avg Base Tariff</span>
                            <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                <DollarSign className="size-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">৳{avgTariff.toLocaleString()}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-1">Rack rate average</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500">Connecting Enabled</span>
                            <div className="size-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                <Layers className="size-4" />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900 tracking-tight">{connectingCount}</div>
                        <div className="text-[11px] text-indigo-600 font-semibold mt-1">Joint door room configurations</div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                        <input
                            type="text"
                            placeholder="Search by name, code, view..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-standard pl-9"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <span className="text-xs text-slate-500 font-medium">
                            Showing <strong className="text-slate-800">{filteredRoomTypes.length}</strong> of {roomTypes.length}
                        </span>
                    </div>
                </div>

                {/* Room Type Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredRoomTypes.map(rt => (
                        <div key={rt.id} className="card-container p-5 flex flex-col justify-between hover:shadow-xs transition group">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={rt.status === 'Active' ? 'badge-status-active' : 'badge-status-inactive'}>
                                            {rt.status}
                                        </span>
                                        <span className="badge-code">
                                            {rt.shortCode}
                                        </span>
                                    </div>
                                    <div className="flex gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition">
                                        <button
                                            onClick={() => handleEdit(rt)}
                                            className="btn-icon"
                                            title="Edit Room Type"
                                        >
                                            <Edit2 className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rt.id)}
                                            className="btn-icon-danger"
                                            title="Delete Room Type"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-base font-bold text-slate-900 leading-snug">{rt.name}</h3>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{rt.description}</p>

                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {rt.amenities.slice(0, 4).map(a => (
                                        <span key={a} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200/80">
                                            {a}
                                        </span>
                                    ))}
                                    {rt.amenities.length > 4 && (
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium">
                                            +{rt.amenities.length - 4} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 border-t border-slate-100 pt-3.5 mt-4">
                                <div>
                                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Occupancy</span>
                                    <span className="font-semibold text-slate-800">{rt.baseAdult}A, {rt.baseChild}C (Max {rt.totalCapacity})</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Base Tariff</span>
                                    <span className="font-bold font-mono text-primary text-sm">৳{rt.basePrice.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafc] text-slate-800 font-sans flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200/90 sticky top-0 z-20 px-6 py-4 flex justify-between items-center shadow-2xs">
                <div className="flex items-center gap-3">
                    <button onClick={() => setView('list')} className="btn-secondary p-2">
                        <ChevronLeft className="size-4 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Room Type' : 'Create Room Type'}</h1>
                        <p className="text-xs text-slate-500">Configure room category specifications, occupancy limits, and base tariff</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <button onClick={() => setView('list')} className="btn-secondary">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn-primary"
                    >
                        <Save className="size-4 mr-1.5" /> Save Changes
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-6 w-full flex-1">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Tabs */}
                    <div className="w-full md:w-64 shrink-0">
                        <nav className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 p-2 flex flex-col gap-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition w-full text-left ${
                                        activeTab === tab.id
                                            ? 'bg-primary-subtle text-primary font-bold shadow-2xs'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <span className={activeTab === tab.id ? 'text-primary' : 'text-slate-400'}>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 card-container p-6 min-h-[500px]">

                        {/* 1. Identity */}
                        {activeTab === 'identity' && (
                            <div className="space-y-5">
                                <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                                    <Tags className="size-5 text-primary" />
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Basic Information</h2>
                                        <p className="text-xs text-slate-500">Room class designation, short code, and physical dimensions</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Room Type Name <span className="text-rose-500">*</span></label>
                                        <input
                                            type="text"
                                            value={formData?.name || ''}
                                            onChange={e => handleNameChange(e.target.value)}
                                            placeholder="e.g. Superior King"
                                            className="input-standard"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-semibold text-slate-700">Short Code <span className="text-rose-500">*</span></label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const auto = generateUniqueShortCode(formData?.name || '', existingCodes, {
                                                        currentCode: editingId ? roomTypes.find(rt => rt.id === editingId)?.shortCode : undefined,
                                                        maxLength: 6
                                                    });
                                                    setFormData(prev => prev ? ({ ...prev, shortCode: auto }) : null);
                                                    setIsCodeManual(false);
                                                }}
                                                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                                            >
                                                <RefreshCw className="size-3" /> Auto-Generate
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData?.shortCode || ''}
                                                onChange={e => {
                                                    setIsCodeManual(true);
                                                    updateField('shortCode', e.target.value.toUpperCase());
                                                }}
                                                placeholder="e.g. SUPK"
                                                className={`input-standard pr-8 font-mono font-bold uppercase ${
                                                    isShortCodeDuplicate(formData?.shortCode || '', existingCodes, editingId ? roomTypes.find(rt => rt.id === editingId)?.shortCode : undefined)
                                                        ? 'border-rose-400 bg-rose-50/50 text-rose-700'
                                                        : ''
                                                }`}
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                {isShortCodeDuplicate(formData?.shortCode || '', existingCodes, editingId ? roomTypes.find(rt => rt.id === editingId)?.shortCode : undefined) ? (
                                                    <AlertTriangle className="size-4 text-rose-500" />
                                                ) : formData?.shortCode ? (
                                                    <CheckCircle2 className="size-4 text-emerald-500" />
                                                ) : null}
                                            </div>
                                        </div>
                                        {isShortCodeDuplicate(formData?.shortCode || '', existingCodes, editingId ? roomTypes.find(rt => rt.id === editingId)?.shortCode : undefined) && (
                                            <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                                                <AlertTriangle className="size-3" /> Short Code already in use! Must be unique.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Description</label>
                                    <textarea
                                        value={formData?.description || ''}
                                        onChange={e => updateField('description', e.target.value)}
                                        rows={3}
                                        placeholder="Detailed description of features, view and ambience..."
                                        className="input-standard resize-none py-2"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Room Size (Sq. ft)</label>
                                        <input
                                            type="number"
                                            value={formData?.size || 0}
                                            onChange={e => updateField('size', parseInt(e.target.value) || 0)}
                                            className="input-standard"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Status <span className="text-rose-500">*</span></label>
                                        <select
                                            value={formData?.status || 'Active'}
                                            onChange={e => updateField('status', e.target.value)}
                                            className="select-standard"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Display Order</label>
                                        <input
                                            type="number"
                                            value={formData?.displayOrder || 1}
                                            onChange={e => updateField('displayOrder', parseInt(e.target.value) || 1)}
                                            className="input-standard"
                                        />
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-slate-100">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData?.showOnWebsite || false}
                                            onChange={e => updateField('showOnWebsite', e.target.checked)}
                                            className="size-4 text-primary rounded border-slate-300"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">Publish to Online Booking Engine & Public Channels</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* 2. Occupancy */}
                        {activeTab === 'occupancy' && (
                            <div className="space-y-5">
                                <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                                    <Users className="size-5 text-primary" />
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Occupancy & Guest Limits</h2>
                                        <p className="text-xs text-slate-500">Base allowance and maximum guest limits per reservation</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Base Adults <span className="text-rose-500">*</span></label>
                                        <input
                                            type="number"
                                            value={formData?.baseAdult || 1}
                                            onChange={e => updateField('baseAdult', parseInt(e.target.value) || 1)}
                                            className="input-standard"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Base Children</label>
                                        <input
                                            type="number"
                                            value={formData?.baseChild || 0}
                                            onChange={e => updateField('baseChild', parseInt(e.target.value) || 0)}
                                            className="input-standard"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Max Adults <span className="text-rose-500">*</span></label>
                                        <input
                                            type="number"
                                            value={formData?.maxAdult || 2}
                                            onChange={e => updateField('maxAdult', parseInt(e.target.value) || 2)}
                                            className="input-standard"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Max Children</label>
                                        <input
                                            type="number"
                                            value={formData?.maxChild || 1}
                                            onChange={e => updateField('maxChild', parseInt(e.target.value) || 1)}
                                            className="input-standard"
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Total Maximum Capacity</label>
                                        <input
                                            type="number"
                                            value={formData?.totalCapacity || 3}
                                            onChange={e => updateField('totalCapacity', parseInt(e.target.value) || 3)}
                                            className="input-standard bg-slate-50 font-bold text-primary"
                                        />
                                        <p className="text-[11px] text-slate-400">Total persons permitted in room (Adults + Children)</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Extra Bed */}
                        {activeTab === 'extraBed' && (
                            <div className="space-y-5">
                                <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                                    <BedDouble className="size-5 text-primary" />
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Extra Bedding Policies</h2>
                                        <p className="text-xs text-slate-500">Rollaway bedding configuration and supplemental crib options</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                                        <div>
                                            <span className="text-xs font-bold text-slate-800">Rollaway Extra Bed Allowed?</span>
                                            <p className="text-[11px] text-slate-500">Can an extra mattress / rollaway bed be accommodated in this room?</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData?.extraBedAllowed || false}
                                            onChange={e => updateField('extraBedAllowed', e.target.checked)}
                                            className="size-4 text-primary rounded"
                                        />
                                    </div>

                                    {formData?.extraBedAllowed && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-primary-subtle/30 rounded-2xl border border-primary-border/40">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-700">Extra Bed Quantity Allowed</label>
                                                <input
                                                    type="number"
                                                    value={formData?.extraBedQuantity || 1}
                                                    onChange={e => updateField('extraBedQuantity', parseInt(e.target.value) || 1)}
                                                    className="input-standard bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-slate-700">Extra Bed Tariff per Night</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                                                    <input
                                                        type="number"
                                                        value={formData?.extraAdultPrice || 1000}
                                                        onChange={e => updateField('extraAdultPrice', parseInt(e.target.value) || 0)}
                                                        className="input-standard pl-8 bg-white font-mono font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                                        <div>
                                            <span className="text-xs font-bold text-slate-800">Baby Crib / Cot Permitted?</span>
                                            <p className="text-[11px] text-slate-500">Complimentary or paid baby cot for infants under 3 years</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData?.babyCotAllowed || false}
                                            onChange={e => updateField('babyCotAllowed', e.target.checked)}
                                            className="size-4 text-primary rounded"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Pricing */}
                        {activeTab === 'pricing' && (
                            <div className="space-y-5">
                                <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                                    <DollarSign className="size-5 text-primary" />
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Base Pricing & Surcharges</h2>
                                        <p className="text-xs text-slate-500">Standard rack rate and extra occupant pricing</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Base Rack Rate <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                                            <input
                                                type="number"
                                                value={formData?.basePrice || 0}
                                                onChange={e => updateField('basePrice', parseFloat(e.target.value) || 0)}
                                                className="input-standard pl-8 font-mono font-bold text-primary text-base"
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-400">Standard nightly price for base occupancy</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Pricing Basis</label>
                                        <select
                                            value={formData?.pricingUnit || 'Per Room'}
                                            onChange={e => updateField('pricingUnit', e.target.value)}
                                            className="select-standard"
                                        >
                                            <option value="Per Room">Per Room / Night</option>
                                            <option value="Per Person">Per Person / Night</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Extra Adult Surcharge (৳)</label>
                                        <input
                                            type="number"
                                            value={formData?.extraAdultPrice || 0}
                                            onChange={e => updateField('extraAdultPrice', parseFloat(e.target.value) || 0)}
                                            className="input-standard font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Extra Child Surcharge (৳)</label>
                                        <input
                                            type="number"
                                            value={formData?.extraChildPrice || 0}
                                            onChange={e => updateField('extraChildPrice', parseFloat(e.target.value) || 0)}
                                            className="input-standard font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. Attributes */}
                        {activeTab === 'attributes' && (
                            <div className="space-y-5">
                                <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                                    <Star className="size-5 text-primary" />
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">Attributes & Amenities Checklist</h2>
                                        <p className="text-xs text-slate-500">Bed styles, views, policies, and room catalog photos</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Bed Configuration <span className="text-rose-500">*</span></label>
                                        <select
                                            value={formData?.bedType || 'King'}
                                            onChange={e => updateField('bedType', e.target.value)}
                                            className="select-standard"
                                        >
                                            <option>King</option>
                                            <option>Queen</option>
                                            <option>Twin (2 Single)</option>
                                            <option>Single</option>
                                            <option>Hollywood Twin</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">View Type</label>
                                        <select
                                            value={formData?.viewType || 'Sea View'}
                                            onChange={e => updateField('viewType', e.target.value)}
                                            className="select-standard"
                                        >
                                            <option>Sea View</option>
                                            <option>City View</option>
                                            <option>Garden View</option>
                                            <option>Pool View</option>
                                            <option>Courtyard View</option>
                                        </select>
                                    </div>
                                    <div className="col-span-1 md:col-span-2 space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Smoking Policy</label>
                                        <select
                                            value={formData?.smokingPolicy || 'Non-Smoking'}
                                            onChange={e => updateField('smokingPolicy', e.target.value)}
                                            className="select-standard"
                                        >
                                            <option value="Non-Smoking">Non-Smoking Throughout</option>
                                            <option value="Smoking">Smoking Permitted</option>
                                            <option value="Balcony Smoking Only">Balcony Smoking Only</option>
                                        </select>
                                    </div>
                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <label className="text-xs font-semibold text-slate-700">Room Amenities</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                                            {amenityOptions.map(amenity => (
                                                <label key={amenity} className="flex items-center gap-2 p-2.5 border border-slate-200/90 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700 transition">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData?.amenities?.includes(amenity) || false}
                                                        onChange={() => toggleAmenity(amenity)}
                                                        className="size-4 text-primary rounded"
                                                    />
                                                    <span>{amenity}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-1 md:col-span-2 space-y-3 pt-3 border-t border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-semibold text-slate-700">Room Photos</label>
                                            <label className="btn-secondary cursor-pointer">
                                                <Upload className="size-3.5 mr-1.5" />
                                                <span>Upload Images</span>
                                                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                            </label>
                                        </div>

                                        {formData?.photos && formData.photos.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {formData.photos.map((photo, index) => (
                                                    <div key={index} className="relative group rounded-xl overflow-hidden h-24 bg-slate-100 border border-slate-200">
                                                        <img src={photo} alt={`Room ${index + 1}`} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => removePhoto(index)}
                                                            className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-xs"
                                                        >
                                                            <X className="size-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/50">
                                                <p className="text-xs text-slate-400">No photos uploaded yet. High-res JPEG, PNG supported.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
};

export default RoomTypeManagement;
