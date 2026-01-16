import { useState } from 'react';
import {
    Tags, Users, BedDouble, DollarSign, Star, ChevronLeft, Plus, Save, Edit2, Trash2, Upload, X
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

const RoomTypeManagement = () => {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([
        {
            id: 1,
            name: 'Super Deluxe King',
            shortCode: 'SDLX',
            description: 'Spacious room with ocean view',
            size: 450,
            status: 'Active',
            displayOrder: 1,
            baseAdult: 2,
            baseChild: 1,
            maxAdult: 3,
            maxChild: 2,
            totalCapacity: 4,
            extraBedAllowed: true,
            extraBedQuantity: 1,
            babyCotAllowed: true,
            isConnecting: false,
            basePrice: 15000,
            extraAdultPrice: 2000,
            extraChildPrice: 1000,
            pricingUnit: 'Per Room',
            bedType: 'King',
            viewType: 'Sea View',
            smokingPolicy: 'Non-Smoking',
            amenities: ['AC', 'TV', 'Wifi', 'Minibar'],
            photos: [],
            showOnWebsite: true
        }
    ]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<RoomType | null>(null);
    const [activeTab, setActiveTab] = useState('identity');

    const handleAddNew = () => {
        setEditingId(null);
        setFormData({
            id: Date.now(),
            name: '',
            shortCode: '',
            description: '',
            size: 0,
            status: 'Active',
            displayOrder: 0,
            baseAdult: 2,
            baseChild: 0,
            maxAdult: 2,
            maxChild: 1,
            totalCapacity: 3,
            extraBedAllowed: false,
            extraBedQuantity: 0,
            babyCotAllowed: false,
            isConnecting: false,
            basePrice: 0,
            extraAdultPrice: 0,
            extraChildPrice: 0,
            pricingUnit: 'Per Room',
            bedType: 'King',
            viewType: 'City View',
            smokingPolicy: 'Non-Smoking',
            amenities: [],
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
        if (!formData) return;
        if (editingId) {
            setRoomTypes(roomTypes.map(rt => rt.id === editingId ? formData : rt));
        } else {
            setRoomTypes([...roomTypes, formData]);
        }
        setView('list');
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this room type?')) {
            setRoomTypes(roomTypes.filter(rt => rt.id !== id));
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
            // In a real app, we would upload to server. Here we just create object URLs
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

    const tabs = [
        { id: 'identity', label: 'Basic Info', icon: <Tags size={18} /> },
        { id: 'occupancy', label: 'Occupancy', icon: <Users size={18} /> },
        { id: 'extraBed', label: 'Extra Bed', icon: <BedDouble size={18} /> },
        { id: 'pricing', label: 'Pricing', icon: <DollarSign size={18} /> },
        { id: 'attributes', label: 'Attributes', icon: <Star size={18} /> },
    ];

    const amenityOptions = ['AC', 'TV', 'Minibar', 'Bathtub', 'Balcony', 'Wifi', 'Hair Dryer', 'Safe', 'Desk'];

    if (view === 'list') {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Room Types</h1>
                        <p className="text-sm text-gray-500">Manage room categories and pricing</p>
                    </div>
                    <button onClick={handleAddNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
                        <Plus size={18} /> Add Room Type
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roomTypes.map(rt => (
                        <div key={rt.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${rt.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {rt.status}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-800 mt-2">{rt.name}</h3>
                                    <p className="text-sm text-gray-500">{rt.shortCode}</p>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(rt)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(rt.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 border-t pt-4">
                                <div>
                                    <span className="block text-xs text-gray-400">Base Occupancy</span>
                                    <span className="font-medium">{rt.baseAdult} Ad, {rt.baseChild} Ch</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-400">Base Price</span>
                                    <span className="font-medium font-mono">{rt.basePrice}</span>
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
                        <h1 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Room Type' : 'Add Room Type'}</h1>
                        <p className="text-xs text-gray-500">Configure room details, capacity, and pricing</p>
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
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Tags size={20} className="text-gray-400" /> Basic Information</h2>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Room Type Name *</label>
                                            <input type="text" value={formData?.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g. Super Deluxe King" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Short Name / Code *</label>
                                            <input type="text" value={formData?.shortCode} onChange={e => updateField('shortCode', e.target.value)} placeholder="e.g. SDLX" className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Description</label>
                                        <textarea value={formData?.description} onChange={e => updateField('description', e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Room Size (Sq. ft)</label>
                                            <input type="number" value={formData?.size} onChange={e => updateField('size', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Status *</label>
                                            <select value={formData?.status} onChange={e => updateField('status', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                                <option>Active</option>
                                                <option>Inactive</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Display Order</label>
                                            <input type="number" value={formData?.displayOrder} onChange={e => updateField('displayOrder', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={formData?.showOnWebsite} onChange={e => updateField('showOnWebsite', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                            <span className="text-sm font-medium text-gray-700">Show on Website?</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. Occupancy */}
                        {activeTab === 'occupancy' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Users size={20} className="text-gray-400" /> Occupancy & Capacity</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Base Adult *</label>
                                        <input type="number" value={formData?.baseAdult} onChange={e => updateField('baseAdult', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Base Child</label>
                                        <input type="number" value={formData?.baseChild} onChange={e => updateField('baseChild', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Max Adult *</label>
                                        <input type="number" value={formData?.maxAdult} onChange={e => updateField('maxAdult', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Max Child</label>
                                        <input type="number" value={formData?.maxChild} onChange={e => updateField('maxChild', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Total Max Capacity</label>
                                        <input type="number" value={formData?.totalCapacity} onChange={e => updateField('totalCapacity', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none bg-gray-50" />
                                        <p className="text-xs text-gray-500">Total persons allowed (Adult + Child)</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Extra Bed */}
                        {activeTab === 'extraBed' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><BedDouble size={20} className="text-gray-400" /> Extra Bed & Policy</h2>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">Extra Bed Allowed?</span>
                                            <p className="text-xs text-gray-500">Can an extra mattress be added?</p>
                                        </div>
                                        <input type="checkbox" checked={formData?.extraBedAllowed} onChange={e => updateField('extraBedAllowed', e.target.checked)} className="toggle toggle-sm text-blue-600" />
                                    </div>

                                    {formData?.extraBedAllowed && (
                                        <div className="space-y-1 animate-fadeIn">
                                            <label className="text-sm font-medium text-gray-700">Extra Bed Quantity</label>
                                            <input type="number" value={formData?.extraBedQuantity} onChange={e => updateField('extraBedQuantity', parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">Baby Cot / Crib?</span>
                                            <p className="text-xs text-gray-500">Is a baby cot allowed?</p>
                                        </div>
                                        <input type="checkbox" checked={formData?.babyCotAllowed} onChange={e => updateField('babyCotAllowed', e.target.checked)} className="toggle toggle-sm text-blue-600" />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">Is Joint/Connecting?</span>
                                            <p className="text-xs text-gray-500">Can this room connect with another?</p>
                                        </div>
                                        <input type="checkbox" checked={formData?.isConnecting} onChange={e => updateField('isConnecting', e.target.checked)} className="toggle toggle-sm text-blue-600" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 4. Pricing */}
                        {activeTab === 'pricing' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><DollarSign size={20} className="text-gray-400" /> Pricing (Rack Rate / Default)</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Base Price *</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500">$</span>
                                            <input type="number" value={formData?.basePrice} onChange={e => updateField('basePrice', parseFloat(e.target.value))} className="w-full pl-8 pr-3 py-2 border rounded-lg outline-none text-lg font-semibold" />
                                        </div>
                                        <p className="text-xs text-gray-500">Default nightly rate for Base Occupancy</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Extra Adult Price</label>
                                        <input type="number" value={formData?.extraAdultPrice} onChange={e => updateField('extraAdultPrice', parseFloat(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Extra Child Price</label>
                                        <input type="number" value={formData?.extraChildPrice} onChange={e => updateField('extraChildPrice', parseFloat(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none" />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Pricing Unit</label>
                                        <select value={formData?.pricingUnit} onChange={e => updateField('pricingUnit', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                            <option>Per Room</option>
                                            <option>Per Person</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 5. Attributes */}
                        {activeTab === 'attributes' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4 flex items-center gap-2"><Star size={20} className="text-gray-400" /> Attributes & Amenities</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Bed Type *</label>
                                        <select value={formData?.bedType} onChange={e => updateField('bedType', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                            <option>King</option>
                                            <option>Queen</option>
                                            <option>Twin (2 Single)</option>
                                            <option>Hollywood Twin</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">View Type</label>
                                        <select value={formData?.viewType} onChange={e => updateField('viewType', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                            <option>Sea View</option>
                                            <option>City View</option>
                                            <option>Garden View</option>
                                            <option>Pool View</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Smoking Policy</label>
                                        <select value={formData?.smokingPolicy} onChange={e => updateField('smokingPolicy', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                            <option>Non-Smoking</option>
                                            <option>Smoking</option>
                                            <option>Both Available</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Amenities Checklist</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {amenityOptions.map(amenity => (
                                                <label key={amenity} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData?.amenities?.includes(amenity)}
                                                        onChange={() => toggleAmenity(amenity)}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700">{amenity}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-2 space-y-4 pt-4 border-t">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-gray-700">Photos / Gallery</label>
                                            <label className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors">
                                                <Upload size={16} />
                                                Upload Photos
                                                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                            </label>
                                        </div>

                                        {formData?.photos && formData.photos.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {formData.photos.map((photo, index) => (
                                                    <div key={index} className="relative group rounded-lg overflow-hidden h-32 bg-gray-100 border">
                                                        <img src={photo} alt={`Room ${index + 1}`} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => removePhoto(index)}
                                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                                                <p className="text-sm text-gray-500">No photos uploaded yet.</p>
                                            </div>
                                        )}
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

export default RoomTypeManagement;
