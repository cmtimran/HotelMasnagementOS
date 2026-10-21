import { useState, useMemo } from 'react';
import {
    Tags, Users, BedDouble, Star, ChevronLeft, Plus, Save, Edit2, Trash2, Upload, X, Search
} from 'lucide-react';

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

const INITIAL_ROOM_TYPES: RoomType[] = [
    {
        id: 1,
        name: 'Standard Single',
        shortCode: 'STND',
        description: 'Cozy, quiet room ideal for solo travelers and business guests.',
        size: 280,
        status: 'Active',
        displayOrder: 1,
        baseAdult: 1,
        baseChild: 0,
        maxAdult: 1,
        maxChild: 1,
        totalCapacity: 2,
        extraBedAllowed: false,
        extraBedQuantity: 0,
        babyCotAllowed: false,
        isConnecting: false,
        basePrice: 2200,
        extraAdultPrice: 0,
        extraChildPrice: 800,
        pricingUnit: 'Per Room',
        bedType: 'Single',
        viewType: 'Courtyard View',
        smokingPolicy: 'Non-Smoking',
        amenities: ['AC', 'TV', 'Wifi', 'Desk', 'Safe'],
        photos: [],
        showOnWebsite: true
    },
    {
        id: 2,
        name: 'Deluxe Double',
        shortCode: 'DLX',
        description: 'Spacious room with king or twin bedding, ideal for couples and leisure.',
        size: 380,
        status: 'Active',
        displayOrder: 2,
        baseAdult: 2,
        baseChild: 1,
        maxAdult: 3,
        maxChild: 2,
        totalCapacity: 4,
        extraBedAllowed: true,
        extraBedQuantity: 1,
        babyCotAllowed: true,
        isConnecting: true,
        basePrice: 3000,
        extraAdultPrice: 1000,
        extraChildPrice: 500,
        pricingUnit: 'Per Room',
        bedType: 'King',
        viewType: 'City View',
        smokingPolicy: 'Non-Smoking',
        amenities: ['AC', 'TV', 'Wifi', 'Minibar', 'Safe', 'Desk'],
        photos: [],
        showOnWebsite: true
    },
    {
        id: 3,
        name: 'Superior King',
        shortCode: 'SUPK',
        description: 'Premium sea-view room featuring a private balcony and bathtub.',
        size: 450,
        status: 'Active',
        displayOrder: 3,
        baseAdult: 2,
        baseChild: 1,
        maxAdult: 3,
        maxChild: 2,
        totalCapacity: 4,
        extraBedAllowed: true,
        extraBedQuantity: 1,
        babyCotAllowed: true,
        isConnecting: true,
        basePrice: 4500,
        extraAdultPrice: 1500,
        extraChildPrice: 800,
        pricingUnit: 'Per Room',
        bedType: 'King',
        viewType: 'Sea View',
        smokingPolicy: 'Non-Smoking',
        amenities: ['AC', 'TV', 'Wifi', 'Minibar', 'Bathtub', 'Balcony', 'Safe', 'Hair Dryer'],
        photos: [],
        showOnWebsite: true
    },
    {
        id: 4,
        name: 'Executive Suite',
        shortCode: 'EXEC',
        description: 'High-floor suite with separate living room, work station, and executive lounge privileges.',
        size: 650,
        status: 'Active',
        displayOrder: 4,
        baseAdult: 2,
        baseChild: 2,
        maxAdult: 4,
        maxChild: 2,
        totalCapacity: 5,
        extraBedAllowed: true,
        extraBedQuantity: 2,
        babyCotAllowed: true,
        isConnecting: false,
        basePrice: 6500,
        extraAdultPrice: 2000,
        extraChildPrice: 1000,
        pricingUnit: 'Per Room',
        bedType: 'King',
        viewType: 'Sea View',
        smokingPolicy: 'Non-Smoking',
        amenities: ['AC', 'TV', 'Wifi', 'Minibar', 'Bathtub', 'Balcony', 'Safe', 'Hair Dryer', 'Desk'],
        photos: [],
        showOnWebsite: true
    },
    {
        id: 5,
        name: 'Presidential Suite',
        shortCode: 'PRES',
        description: 'Top penthouse suite with private terrace, personal jacuzzi, and dedicated butler service.',
        size: 1200,
        status: 'Active',
        displayOrder: 5,
        baseAdult: 4,
        baseChild: 2,
        maxAdult: 6,
        maxChild: 3,
        totalCapacity: 8,
        extraBedAllowed: true,
        extraBedQuantity: 2,
        babyCotAllowed: true,
        isConnecting: false,
        basePrice: 18000,
        extraAdultPrice: 3000,
        extraChildPrice: 1500,
        pricingUnit: 'Per Room',
        bedType: 'King',
        viewType: 'Sea View',
        smokingPolicy: 'Non-Smoking',
        amenities: ['AC', 'TV', 'Wifi', 'Minibar', 'Bathtub', 'Balcony', 'Safe', 'Hair Dryer', 'Desk'],
        photos: [],
        showOnWebsite: true
    }
];

const RoomTypeManagement = () => {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [searchTerm, setSearchTerm] = useState('');

    const [roomTypes, setRoomTypes] = useState<RoomType[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch {
            // fallback
        }
        return INITIAL_ROOM_TYPES;
    });

    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<RoomType | null>(null);
    const [activeTab, setActiveTab] = useState('identity');

    const persistRoomTypes = (updated: RoomType[]) => {
        setRoomTypes(updated);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
            // fallback
        }
    };

    const handleAddNew = () => {
        setEditingId(null);
        setFormData({
            id: Date.now(),
            name: '',
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
        setFormData({ ...roomType });
        setView('form');
        setActiveTab('identity');
    };

    const handleSave = () => {
        if (!formData || !formData.name.trim() || !formData.shortCode.trim()) {
            alert('Please provide a Room Type Name and Short Code.');
            return;
        }
        let updated: RoomType[];
        if (editingId) {
            updated = roomTypes.map(rt => rt.id === editingId ? formData : rt);
        } else {
            updated = [...roomTypes, formData];
        }
        persistRoomTypes(updated);
        setView('list');
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Are you sure you want to delete this room type? Rooms assigned to it will need to be reallocated.')) {
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

    if (view === 'list') {
        return (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200/90 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <Tags size={20} />
                            </span>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Room Type Master Data</h1>
                                <p className="text-xs sm:text-sm text-gray-500">Manage hotel room categories, occupancy limits, amenities and base tariffs</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
                            <input
                                type="text"
                                placeholder="Search room types..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 w-48 sm:w-60"
                            />
                        </div>
                        <button
                            onClick={handleAddNew}
                            className="px-3.5 py-1.5 bg-purple-600 text-white rounded-lg flex items-center justify-center gap-1.5 hover:bg-purple-700 font-semibold text-xs transition-colors shadow-xs"
                        >
                            <Plus size={15} /> Add Room Type
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredRoomTypes.map(rt => (
                        <div key={rt.id} className="bg-white p-5 rounded-xl shadow-xs border border-gray-200 hover:shadow-md transition-shadow group flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${rt.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                                            {rt.status}
                                        </span>
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-mono font-bold">
                                            {rt.shortCode}
                                        </span>
                                    </div>
                                    <div className="flex gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(rt)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 size={15} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rt.id)}
                                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-base font-bold text-gray-900 leading-snug">{rt.name}</h3>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{rt.description}</p>

                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {rt.amenities.slice(0, 4).map(a => (
                                        <span key={a} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium">
                                            {a}
                                        </span>
                                    ))}
                                    {rt.amenities.length > 4 && (
                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md font-medium">
                                            +{rt.amenities.length - 4} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 border-t border-gray-100 pt-3.5 mt-4">
                                <div>
                                    <span className="block text-[10px] uppercase font-bold text-gray-400">Occupancy</span>
                                    <span className="font-semibold text-gray-800">{rt.baseAdult} Adult, {rt.baseChild} Child (Max {rt.totalCapacity})</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[10px] uppercase font-bold text-gray-400">Base Tariff</span>
                                    <span className="font-bold font-mono text-purple-700 text-sm">৳{rt.basePrice.toLocaleString()}</span>
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
            <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-xs">
                <div className="flex items-center gap-3">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Room Type' : 'Add Room Type'}</h1>
                        <p className="text-xs text-gray-500">Configure category specifications, capacity policies, and tariff structures</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm flex items-center gap-2 shadow-xs transition-colors"
                >
                    <Save size={16} /> Save Changes
                </button>
            </header>

            <main className="max-w-5xl mx-auto p-4 sm:p-6">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Tabs */}
                    <div className="w-full md:w-64 shrink-0">
                        <nav className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col overflow-hidden">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-3 px-4 py-3.5 text-xs font-bold transition-colors w-full text-left border-l-4 ${activeTab === tab.id
                                        ? 'border-purple-600 bg-purple-50 text-purple-700'
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
                    <div className="flex-1 bg-white rounded-xl shadow-xs border border-gray-200 p-6 min-h-[460px]">

                        {/* 1. Identity */}
                        {activeTab === 'identity' && (
                            <div className="space-y-5">
                                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                                    <Tags size={16} className="text-purple-600" /> Basic Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Room Type Name *</label>
                                        <input
                                            type="text"
                                            value={formData?.name || ''}
                                            onChange={e => updateField('name', e.target.value)}
                                            placeholder="e.g. Superior King"
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Short Code *</label>
                                        <input
                                            type="text"
                                            value={formData?.shortCode || ''}
                                            onChange={e => updateField('shortCode', e.target.value.toUpperCase())}
                                            placeholder="e.g. SUPK"
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Description</label>
                                    <textarea
                                        value={formData?.description || ''}
                                        onChange={e => updateField('description', e.target.value)}
                                        rows={3}
                                        placeholder="Detailed description of features, view and ambience..."
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Room Size (Sq. ft)</label>
                                        <input
                                            type="number"
                                            value={formData?.size || 0}
                                            onChange={e => updateField('size', parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Status *</label>
                                        <select
                                            value={formData?.status || 'Active'}
                                            onChange={e => updateField('status', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Display Order</label>
                                        <input
                                            type="number"
                                            value={formData?.displayOrder || 1}
                                            onChange={e => updateField('displayOrder', parseInt(e.target.value) || 1)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="pt-3 border-t">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData?.showOnWebsite || false}
                                            onChange={e => updateField('showOnWebsite', e.target.checked)}
                                            className="w-4 h-4 text-purple-600 rounded"
                                        />
                                        <span className="text-xs font-semibold text-gray-700">Publish to Online Booking Engine & Website</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* 2. Occupancy */}
                        {activeTab === 'occupancy' && (
                            <div className="space-y-5">
                                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                                    <Users size={16} className="text-purple-600" /> Occupancy & Guest Limits
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Base Adult *</label>
                                        <input
                                            type="number"
                                            value={formData?.baseAdult || 1}
                                            onChange={e => updateField('baseAdult', parseInt(e.target.value) || 1)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Base Child</label>
                                        <input
                                            type="number"
                                            value={formData?.baseChild || 0}
                                            onChange={e => updateField('baseChild', parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Max Adult *</label>
                                        <input
                                            type="number"
                                            value={formData?.maxAdult || 2}
                                            onChange={e => updateField('maxAdult', parseInt(e.target.value) || 2)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Max Child</label>
                                        <input
                                            type="number"
                                            value={formData?.maxChild || 1}
                                            onChange={e => updateField('maxChild', parseInt(e.target.value) || 1)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Total Maximum Capacity</label>
                                        <input
                                            type="number"
                                            value={formData?.totalCapacity || 3}
                                            onChange={e => updateField('totalCapacity', parseInt(e.target.value) || 3)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-gray-50 font-bold text-purple-700"
                                        />
                                        <p className="text-[11px] text-gray-400">Total persons permitted in room (Adults + Children)</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Extra Bed */}
                        {activeTab === 'extraBed' && (
                            <div className="space-y-5">
                                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                                    <BedDouble size={16} className="text-purple-600" /> Extra Bedding Policies
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                                        <div>
                                            <span className="text-xs font-bold text-gray-800">Rollaway Extra Bed Allowed?</span>
                                            <p className="text-[11px] text-gray-500">Can an extra mattress / rollaway bed be accommodated in this room?</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData?.extraBedAllowed || false}
                                            onChange={e => updateField('extraBedAllowed', e.target.checked)}
                                            className="w-4 h-4 text-purple-600 rounded"
                                        />
                                    </div>

                                    {formData?.extraBedAllowed && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-700">Extra Bed Quantity Allowed</label>
                                                <input
                                                    type="number"
                                                    value={formData?.extraBedQuantity || 1}
                                                    onChange={e => updateField('extraBedQuantity', parseInt(e.target.value) || 1)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-semibold text-gray-700">Extra Bed Tariff per Night</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-gray-400 font-bold">৳</span>
                                                    <input
                                                        type="number"
                                                        value={formData?.extraAdultPrice || 1000}
                                                        onChange={e => updateField('extraAdultPrice', parseInt(e.target.value) || 0)}
                                                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white font-mono font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                                        <div>
                                            <span className="text-xs font-bold text-gray-800">Baby Crib / Cot Permitted?</span>
                                            <p className="text-[11px] text-gray-500">Complimentary or paid baby cot for infants under 3 years</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData?.babyCotAllowed || false}
                                            onChange={e => updateField('babyCotAllowed', e.target.checked)}
                                            className="w-4 h-4 text-purple-600 rounded"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Pricing */}
                        {activeTab === 'pricing' && (
                            <div className="space-y-5">
                                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                                    <span className="text-purple-600 font-bold text-base">৳</span> Base Pricing & Surcharges
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Base Rack Rate *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500 font-bold">৳</span>
                                            <input
                                                type="number"
                                                value={formData?.basePrice || 0}
                                                onChange={e => updateField('basePrice', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none font-bold text-purple-700 font-mono text-base focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                        <p className="text-[11px] text-gray-400">Standard nightly price for base occupancy</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Pricing Basis</label>
                                        <select
                                            value={formData?.pricingUnit || 'Per Room'}
                                            onChange={e => updateField('pricingUnit', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
                                        >
                                            <option value="Per Room">Per Room / Night</option>
                                            <option value="Per Person">Per Person / Night</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Extra Adult Surcharge</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-400 font-bold">৳</span>
                                            <input
                                                type="number"
                                                value={formData?.extraAdultPrice || 0}
                                                onChange={e => updateField('extraAdultPrice', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Extra Child Surcharge</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-400 font-bold">৳</span>
                                            <input
                                                type="number"
                                                value={formData?.extraChildPrice || 0}
                                                onChange={e => updateField('extraChildPrice', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. Attributes */}
                        {activeTab === 'attributes' && (
                            <div className="space-y-5">
                                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                                    <Star size={16} className="text-purple-600" /> Attributes & Amenities Checklist
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Bed Configuration *</label>
                                        <select
                                            value={formData?.bedType || 'King'}
                                            onChange={e => updateField('bedType', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
                                        >
                                            <option>King</option>
                                            <option>Queen</option>
                                            <option>Twin (2 Single)</option>
                                            <option>Single</option>
                                            <option>Hollywood Twin</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">View Type</label>
                                        <select
                                            value={formData?.viewType || 'Sea View'}
                                            onChange={e => updateField('viewType', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
                                        >
                                            <option>Sea View</option>
                                            <option>City View</option>
                                            <option>Garden View</option>
                                            <option>Pool View</option>
                                            <option>Courtyard View</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-xs font-semibold text-gray-700">Smoking Policy</label>
                                        <select
                                            value={formData?.smokingPolicy || 'Non-Smoking'}
                                            onChange={e => updateField('smokingPolicy', e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none"
                                        >
                                            <option value="Non-Smoking">Non-Smoking Throughout</option>
                                            <option value="Smoking">Smoking Permitted</option>
                                            <option value="Balcony Smoking Only">Balcony Smoking Only</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-semibold text-gray-700">Room Amenities</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {amenityOptions.map(amenity => (
                                                <label key={amenity} className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-gray-50 cursor-pointer text-xs font-medium text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData?.amenities?.includes(amenity) || false}
                                                        onChange={() => toggleAmenity(amenity)}
                                                        className="w-4 h-4 text-purple-600 rounded"
                                                    />
                                                    <span>{amenity}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-2 space-y-3 pt-3 border-t">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-semibold text-gray-700">Room Photos</label>
                                            <label className="cursor-pointer px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors">
                                                <Upload size={14} />
                                                <span>Upload Images</span>
                                                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                            </label>
                                        </div>

                                        {formData?.photos && formData.photos.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {formData.photos.map((photo, index) => (
                                                    <div key={index} className="relative group rounded-lg overflow-hidden h-24 bg-gray-100 border">
                                                        <img src={photo} alt={`Room ${index + 1}`} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => removePhoto(index)}
                                                            className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-gray-300 rounded-lg p-5 text-center bg-gray-50/60">
                                                <p className="text-xs text-gray-400">No photos uploaded yet. JPEG, PNG supported.</p>
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
