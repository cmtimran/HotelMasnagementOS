import { useState, useMemo, useEffect } from 'react';
import {
    Tags, Users, BedDouble, Star, ChevronLeft, Plus, Save, Edit2, Trash2, Upload, X, Search,
    RefreshCw, AlertTriangle, CheckCircle2, DollarSign, Layers, Film, Video, Link as LinkIcon
} from 'lucide-react';
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';
import { getApiBaseUrl, getActivePropertyId } from '../utils/apiUrl';
import { useActiveCurrency } from '../utils/currencyUtils';
import { getDynamicRoomTypes, syncRoomTypesAndRoomsFromDB, broadcastPMSEvent } from '../utils/roomInventoryEngine';
import PageHeader from './common/PageHeader';
import { toast } from '../context/ToastContext';
import { confirmModal } from '../context/ConfirmModalContext';

interface RoomTypeManagementProps {
    propertyId?: number;
}

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
    extraBedRate: number;
    extraAdultIncludesBed?: boolean;
    pricingUnit: string;
    pricingBasis?: string;
    bedType: string;
    bedConfiguration?: string;
    viewType: string;
    smokingPolicy: string;
    amenities: string[];
    photos: string[];
    videos?: string[];
    showOnWebsite: boolean;
    raw_json?: any;
}

const STORAGE_KEY = 'hotel_room_types_v1';

const mapDynamicToRoomType = (rt: any, idx: number): RoomType => ({
    id: Number(rt.id) || (idx + 1),
    name: rt.name || '',
    shortCode: rt.code || rt.shortCode || `RT${idx + 1}`,
    description: rt.description || '',
    size: Number(rt.size) || 0,
    status: rt.status || 'Active',
    displayOrder: Number(rt.displayOrder) || (idx + 1),
    baseAdult: Number(rt.baseOccupancy ?? rt.baseAdult ?? 0),
    baseChild: Number(rt.baseChild ?? 0),
    maxAdult: Number(rt.maxOccupancy ?? rt.maxAdult ?? 0),
    maxChild: Number(rt.maxChild ?? 0),
    totalCapacity: Number(rt.totalCapacity ?? ((Number(rt.maxOccupancy ?? rt.maxAdult ?? 0)) + (Number(rt.maxChild ?? 0)))),
    extraBedAllowed: Boolean(rt.extraBedAllowed ?? rt.extra_bed_rate),
    extraBedQuantity: Number(rt.extraBedQuantity ?? 0),
    babyCotAllowed: Boolean(rt.babyCotAllowed),
    isConnecting: Boolean(rt.isConnecting),
    basePrice: Number(rt.baseRate ?? rt.basePrice ?? 0),
    extraAdultPrice: Number(rt.extraAdultPrice ?? 0),
    extraChildPrice: Number(rt.extraChildPrice ?? 0),
    extraBedRate: Number(rt.extraBedRate ?? rt.extra_bed_rate ?? rt.extraBedPrice ?? 1000),
    extraAdultIncludesBed: Boolean(rt.extraAdultIncludesBed ?? rt.extra_adult_includes_bed ?? false),
    pricingUnit: rt.pricingUnit || '',
    pricingBasis: rt.pricingBasis || rt.pricingUnit || '',
    bedType: rt.bedType || '',
    bedConfiguration: rt.bedConfiguration || rt.bedType || '',
    viewType: rt.viewType || '',
    smokingPolicy: rt.smokingPolicy || '',
    amenities: Array.isArray(rt.amenities) ? rt.amenities : [],
    photos: Array.isArray(rt.photos) ? rt.photos : (typeof rt.photos === 'string' ? (() => { try { return JSON.parse(rt.photos); } catch { return []; } })() : []),
    videos: Array.isArray(rt.videos) ? rt.videos : (typeof rt.videos === 'string' ? (() => { try { return JSON.parse(rt.videos); } catch { return []; } })() : []),
    showOnWebsite: rt.showOnWebsite ?? true
});

const RoomTypeManagement: React.FC<RoomTypeManagementProps> = ({ propertyId }) => {
    const activePropId = propertyId || getActivePropertyId();
    const { currencySymbol } = useActiveCurrency();
    const [view, setView] = useState<'list' | 'form'>('list');
    const [searchTerm, setSearchTerm] = useState('');

    const [roomTypes, setRoomTypes] = useState<RoomType[]>(() => {
        try {
            const key = activePropId ? `hotel_room_types_prop_${activePropId}` : STORAGE_KEY;
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].shortCode) {
                    return parsed;
                }
            }
        } catch {
            // fallback
        }
        return getDynamicRoomTypes(activePropId).map(mapDynamicToRoomType);
    });

    useEffect(() => {
        const loadRoomTypesFromDB = async () => {
            if (!activePropId) {
                setRoomTypes([]);
                return;
            }
            try {
                const res = await fetch(`${getApiBaseUrl()}/api/properties/${activePropId}`);
                const json = await res.json();
                if (json.success && json.data?.roomTypes && Array.isArray(json.data.roomTypes)) {
                    const mapped: RoomType[] = json.data.roomTypes.map((rt: any, idx: number) => {
                        let raw: any = {};
                        try {
                            if (rt.raw_json) raw = typeof rt.raw_json === 'string' ? JSON.parse(rt.raw_json) : rt.raw_json;
                        } catch {}
                        return {
                            id: Number(rt.id),
                            name: rt.name,
                            shortCode: rt.code,
                            description: rt.description || raw.description || '',
                            size: Number(rt.size || raw.size || 0),
                            status: rt.status || raw.status || 'Active',
                            displayOrder: Number(rt.display_order ?? raw.displayOrder ?? (idx + 1)),
                            baseAdult: Number(rt.base_occupancy ?? raw.baseAdult ?? raw.baseOccupancy ?? 0),
                            baseChild: Number(rt.max_children ?? rt.max_child ?? raw.baseChild ?? 0),
                            maxAdult: Number(rt.max_adults ?? rt.max_occupancy ?? raw.maxAdult ?? raw.maxAdults ?? 0),
                            maxChild: Number(rt.max_children ?? rt.max_child ?? raw.maxChild ?? raw.maxChildren ?? 0),
                            totalCapacity: Number(raw.totalCapacity ?? ((Number(rt.max_adults ?? raw.maxAdult ?? 0)) + (Number(rt.max_children ?? raw.maxChild ?? 0)))),
                            extraBedAllowed: Boolean(rt.extra_bed_allowed ?? raw.extraBedAllowed ?? (Number(rt.extra_bed_rate) > 0)),
                            extraBedQuantity: Number(rt.extra_bed_quantity ?? raw.extraBedQuantity ?? (Number(rt.extra_bed_rate) > 0 ? 1 : 0)),
                            babyCotAllowed: Boolean(rt.baby_cot_allowed ?? raw.babyCotAllowed ?? false),
                            isConnecting: Boolean(rt.is_connecting ?? raw.isConnecting ?? false),
                            basePrice: Number(rt.base_rate ?? rt.baseRate ?? raw.basePrice ?? raw.baseRate ?? 0),
                            extraAdultPrice: Number(rt.extra_adult_price ?? rt.extraAdultPrice ?? raw.extraAdultPrice ?? 0),
                            extraChildPrice: Number(rt.extra_child_price ?? rt.extraChildPrice ?? raw.extraChildPrice ?? 0),
                            extraBedRate: Number(rt.extra_bed_rate ?? raw.extraBedRate ?? raw.extraBedPrice ?? 1000),
                            pricingUnit: rt.pricing_unit || raw.pricingUnit || '',
                            pricingBasis: rt.pricing_basis || raw.pricingBasis || '',
                            bedType: rt.bed_type || raw.bedType || '',
                            bedConfiguration: raw.bedConfiguration || rt.bed_type || raw.bedType || '',
                            viewType: rt.view_type || raw.viewType || '',
                            smokingPolicy: rt.smoking_policy || raw.smokingPolicy || '',
                            amenities: Array.isArray(rt.amenities) ? rt.amenities : (typeof rt.amenities === 'string' ? JSON.parse(rt.amenities || '[]') : (raw.amenities || [])),
                            photos: Array.isArray(rt.photos) ? rt.photos : (typeof rt.photos === 'string' ? JSON.parse(rt.photos || '[]') : (raw.photos || [])),
                            videos: Array.isArray(rt.videos) ? rt.videos : (typeof rt.videos === 'string' ? JSON.parse(rt.videos || '[]') : (raw.videos || [])),
                            showOnWebsite: Boolean(rt.show_on_website ?? raw.showOnWebsite ?? true)
                        };
                    });
                    setRoomTypes(mapped);
                    localStorage.setItem(`hotel_room_types_prop_${activePropId}`, JSON.stringify(mapped));
                } else {
                    setRoomTypes([]);
                }
            } catch (err) {
                console.warn('Could not load room types from DB, using dynamic cached engine:', err);
            }
        };
        loadRoomTypesFromDB();
    }, [activePropId]);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<RoomType | null>(null);
    const [activeTab, setActiveTab] = useState('identity');
    const [isCodeManual, setIsCodeManual] = useState(false);
    const [photoUrlInput, setPhotoUrlInput] = useState('');
    const [videoUrlInput, setVideoUrlInput] = useState('');
    const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
    const [isUploadingVideos, setIsUploadingVideos] = useState(false);

    const persistRoomTypes = (updated: RoomType[]) => {
        setRoomTypes(updated);
        try {
            if (activePropId) {
                localStorage.setItem(`hotel_room_types_prop_${activePropId}`, JSON.stringify(updated));
            }
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
            size: 0,
            status: 'Active',
            displayOrder: roomTypes.length + 1,
            baseAdult: 2,
            baseChild: 0,
            maxAdult: 2,
            maxChild: 0,
            totalCapacity: 2,
            extraBedAllowed: false,
            extraBedQuantity: 0,
            extraBedRate: 1000,
            babyCotAllowed: false,
            isConnecting: false,
            basePrice: 0,
            extraAdultPrice: 0,
            extraChildPrice: 0,
            pricingUnit: 'Per Room',
            bedType: '',
            viewType: '',
            smokingPolicy: 'Non-Smoking',
            amenities: [],
            photos: [],
            videos: [],
            showOnWebsite: true
        });
        setView('form');
        setActiveTab('identity');
    };

    const handleEdit = (roomType: RoomType) => {
        setEditingId(roomType.id);
        setIsCodeManual(true);
        const parsedPhotos = Array.isArray(roomType.photos)
            ? roomType.photos
            : (typeof (roomType as any).photos === 'string'
                ? (() => { try { return JSON.parse((roomType as any).photos); } catch { return []; } })()
                : []);
        const parsedVideos = Array.isArray(roomType.videos)
            ? roomType.videos
            : (typeof (roomType as any).videos === 'string'
                ? (() => { try { return JSON.parse((roomType as any).videos); } catch { return []; } })()
                : []);
        setFormData({
            ...roomType,
            extraBedRate: Number(roomType.extraBedRate || (roomType as any).extra_bed_rate || 1000),
            photos: parsedPhotos,
            videos: parsedVideos
        });
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
            toast.warning('Please provide a Room Type Name and Short Code.');
            return;
        }

        const currentCode = editingId ? roomTypes.find(rt => rt.id === editingId)?.shortCode : undefined;
        if (isShortCodeDuplicate(formData.shortCode, existingCodes, currentCode)) {
            toast.error(`Short Code "${formData.shortCode}" is already in use by another Room Type! Please use a unique code.`);
            return;
        }

        let updated: RoomType[];
        if (editingId) {
            try {
                if (activePropId) {
                    const res = await fetch(`${getApiBaseUrl()}/api/properties/${activePropId}/room-types/${editingId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code: formData.shortCode,
                            name: formData.name,
                            baseOccupancy: formData.baseAdult,
                            maxOccupancy: formData.maxAdult,
                            maxChild: formData.maxChild,
                            baseRate: formData.basePrice,
                            extraAdultPrice: formData.extraAdultPrice,
                            extraChildPrice: formData.extraChildPrice,
                            extraBedAllowed: formData.extraBedAllowed,
                            extraBedQuantity: formData.extraBedQuantity,
                            extraBedRate: formData.extraBedRate,
                            extra_bed_rate: formData.extraBedRate,
                            babyCotAllowed: formData.babyCotAllowed,
                            pricingUnit: formData.pricingUnit,
                            pricingBasis: formData.pricingBasis || formData.pricingUnit,
                            size: formData.size,
                            bedType: formData.bedType,
                            bedConfiguration: formData.bedConfiguration || formData.bedType,
                            viewType: formData.viewType,
                            smokingPolicy: formData.smokingPolicy,
                            amenities: formData.amenities,
                            photos: formData.photos,
                            videos: formData.videos,
                            isConnecting: formData.isConnecting,
                            showOnWebsite: formData.showOnWebsite,
                            status: formData.status,
                            description: formData.description,
                            raw_json: formData
                        })
                    });
                    const json = await res.json();
                    if (!res.ok || json.success === false) {
                        toast.error(json.error || 'Failed to update room type in database');
                        return;
                    }
                }
            } catch (err: any) {
                toast.error(`Error saving room type: ${err?.message || 'Network error'}`);
                return;
            }
            updated = roomTypes.map(rt => rt.id === editingId ? formData : rt);
            toast.success(`Room Type "${formData.name}" updated successfully.`);
        } else {
            let newId = formData.id;
            try {
                if (activePropId) {
                    const res = await fetch(`${getApiBaseUrl()}/api/properties/${activePropId}/room-types`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code: formData.shortCode,
                            name: formData.name,
                            baseOccupancy: formData.baseAdult,
                            maxOccupancy: formData.maxAdult,
                            maxChild: formData.maxChild,
                            baseRate: formData.basePrice,
                            extraAdultPrice: formData.extraAdultPrice,
                            extraChildPrice: formData.extraChildPrice,
                            extraBedAllowed: formData.extraBedAllowed,
                            extraBedQuantity: formData.extraBedQuantity,
                            extraBedRate: formData.extraBedRate,
                            extra_bed_rate: formData.extraBedRate,
                            babyCotAllowed: formData.babyCotAllowed,
                            pricingUnit: formData.pricingUnit,
                            pricingBasis: formData.pricingBasis || formData.pricingUnit,
                            size: formData.size,
                            bedType: formData.bedType,
                            bedConfiguration: formData.bedConfiguration || formData.bedType,
                            viewType: formData.viewType,
                            smokingPolicy: formData.smokingPolicy,
                            amenities: formData.amenities,
                            photos: formData.photos,
                            videos: formData.videos,
                            isConnecting: formData.isConnecting,
                            showOnWebsite: formData.showOnWebsite,
                            status: formData.status,
                            description: formData.description,
                            raw_json: formData
                        })
                    });
                    const json = await res.json();
                    if (!res.ok || json.success === false) {
                        toast.error(json.error || 'Failed to create room type in database');
                        return;
                    }
                    if (json.success && json.data?.id) newId = Number(json.data.id);
                }
            } catch (err: any) {
                toast.error(`Error creating room type: ${err?.message || 'Network error'}`);
                return;
            }
            updated = [...roomTypes, { ...formData, id: newId }];
            toast.success(`Room Type "${formData.name}" created successfully.`);
        }
        persistRoomTypes(updated);
        try {
            await syncRoomTypesAndRoomsFromDB(activePropId);
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
        setView('list');
    };

    const handleDelete = async (id: number) => {
        const target = roomTypes.find(rt => rt.id === id);
        const name = target?.name || 'this room type';
        const confirmed = await confirmModal({
            title: `Delete "${name}"?`,
            message: 'Are you sure you want to delete this room type? Any physical rooms assigned to it must be reallocated first.',
            confirmText: 'Delete Room Type',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            if (activePropId) {
                const res = await fetch(`${getApiBaseUrl()}/api/properties/${activePropId}/room-types/${id}`, { method: 'DELETE' });
                const json = await res.json();
                if (!res.ok || json.success === false) {
                    toast.error(json.error || 'Failed to delete room type from database');
                    return;
                }
            }
        } catch (err: any) {
            toast.error(`Error deleting room type: ${err?.message || 'Network error'}`);
            return;
        }
        const updated = roomTypes.filter(rt => rt.id !== id);
        persistRoomTypes(updated);
        try {
            await syncRoomTypesAndRoomsFromDB(activePropId);
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
        toast.success(`Room Type "${name}" deleted.`);
    };

    const updateField = (field: keyof RoomType, value: any) => {
        if (formData) {
            const next = { ...formData, [field]: value };
            if (field === 'maxAdult' || field === 'maxChild' || field === 'extraBedAllowed' || field === 'extraBedQuantity') {
                const extraBedAddition = (field === 'extraBedAllowed' ? value : next.extraBedAllowed)
                    ? (field === 'extraBedQuantity' ? Number(value) : (next.extraBedQuantity || 1))
                    : 0;
                const adults = field === 'maxAdult' ? Number(value) : (next.maxAdult || 2);
                const children = field === 'maxChild' ? Number(value) : (next.maxChild || 0);
                next.totalCapacity = adults + children + extraBedAddition;
            }
            setFormData(next);
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

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | File[] } }) => {
        const filesList = e.target.files;
        if (filesList && filesList.length > 0 && formData) {
            setIsUploadingPhotos(true);
            const files = Array.from(filesList);
            try {
                const readPromises = files.map(file => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }));
                const newPhotos = await Promise.all(readPromises);
                const validPhotos = newPhotos.filter(Boolean);
                setFormData(prev => {
                    if (!prev) return prev;
                    return { ...prev, photos: [...(prev.photos || []), ...validPhotos] };
                });
            } catch (err) {
                console.error('Failed to read photos:', err);
                toast.error('Some photo files could not be processed.');
            } finally {
                setIsUploadingPhotos(false);
                if ('value' in e.target) {
                    (e.target as HTMLInputElement).value = '';
                }
            }
        }
    };

    const addPhotoUrl = () => {
        if (!photoUrlInput.trim() || !formData) return;
        // Support multiple URLs separated by commas, newlines, or spaces
        const urls = photoUrlInput
            .split(/[\n,\s]+/)
            .map(u => u.trim())
            .filter(u => u.length > 5);

        if (urls.length === 0) urls.push(photoUrlInput.trim());
        updateField('photos', [...(formData.photos || []), ...urls]);
        setPhotoUrlInput('');
    };

    const removePhoto = (index: number) => {
        if (formData) {
            const currentPhotos = formData.photos || [];
            updateField('photos', currentPhotos.filter((_, i) => i !== index));
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | File[] } }) => {
        const filesList = e.target.files;
        if (filesList && filesList.length > 0 && formData) {
            setIsUploadingVideos(true);
            const files = Array.from(filesList);
            try {
                const readPromises = files.map(file => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }));
                const newVideos = await Promise.all(readPromises);
                const validVideos = newVideos.filter(Boolean);
                setFormData(prev => {
                    if (!prev) return prev;
                    return { ...prev, videos: [...(prev.videos || []), ...validVideos] };
                });
            } catch (err) {
                console.error('Failed to read video files:', err);
                toast.error('Some video files could not be processed.');
            } finally {
                setIsUploadingVideos(false);
                if ('value' in e.target) {
                    (e.target as HTMLInputElement).value = '';
                }
            }
        }
    };

    const addVideoUrl = () => {
        if (!videoUrlInput.trim() || !formData) return;
        // Support multiple video URLs separated by commas, newlines, or spaces
        const urls = videoUrlInput
            .split(/[\n,\s]+/)
            .map(u => u.trim())
            .filter(u => u.length > 5);

        if (urls.length === 0) urls.push(videoUrlInput.trim());
        updateField('videos', [...(formData.videos || []), ...urls]);
        setVideoUrlInput('');
    };

    const removeVideo = (index: number) => {
        if (formData) {
            const currentVideos = formData.videos || [];
            updateField('videos', currentVideos.filter((_, i) => i !== index));
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
        { id: 'pricing', label: 'Pricing & Tariff', icon: <span className="font-bold">{currencySymbol}</span> },
        { id: 'attributes', label: 'Attributes & Amenities', icon: <Star size={16} /> },
    ];

    const amenityOptions = ['AC', 'TV', 'Minibar', 'Bathtub', 'Balcony', 'Wifi', 'Hair Dryer', 'Safe', 'Desk'];

    const activeCount = roomTypes.filter(rt => rt.status === 'Active').length;
    const avgTariff = roomTypes.length > 0 ? Math.round(roomTypes.reduce((acc, r) => acc + r.basePrice, 0) / roomTypes.length) : 0;
    const connectingCount = roomTypes.filter(rt => rt.isConnecting).length;

    if (view === 'list') {
        return (
            <div className="p-2.5 sm:p-3.5 space-y-3 font-sans animate-in fade-in duration-200">
                {/* Header */}
                <PageHeader
                    title="Room Type Master Data"
                    subtitle="Configure hotel room categories, occupancy limits, physical inventory specifications, and base tariffs."
                    icon={<BedDouble className="size-5 text-primary" />}
                    actions={
                        <button
                            onClick={handleAddNew}
                            className="btn-primary !h-8 !py-1 !px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="size-3.5" />
                            <span>Add Room Type</span>
                        </button>
                    }
                />

                {/* KPI Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Categories</span>
                            <div className="size-7 rounded-lg bg-primary-subtle text-primary flex items-center justify-center font-bold">
                                <BedDouble className="size-3.5" />
                            </div>
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{roomTypes.length}</div>
                        <div className="mt-0.5 text-[10px] text-slate-500 font-medium">Configured room classes</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Active Room Types</span>
                            <div className="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <CheckCircle2 className="size-3.5" />
                            </div>
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{activeCount}</div>
                        <div className="mt-0.5 text-[10px] text-emerald-600 font-semibold">Available for reservations</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Avg Base Tariff</span>
                            <div className="size-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                                <DollarSign className="size-3.5" />
                            </div>
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight font-mono">{currencySymbol}{avgTariff.toLocaleString()}</div>
                        <div className="mt-0.5 text-[10px] text-slate-500 font-medium">Rack rate average</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Connecting Enabled</span>
                            <div className="size-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                <Layers className="size-3.5" />
                            </div>
                        </div>
                        <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{connectingCount}</div>
                        <div className="mt-0.5 text-[10px] text-indigo-600 font-semibold">Joint door room setups</div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-2 items-center justify-between">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 size-3.5" />
                        <input
                            type="text"
                            placeholder="Search by name, code, view..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-standard pl-8.5 !h-8 !text-xs"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <span className="text-[11px] text-slate-500 font-medium">
                            Showing <strong className="text-slate-800">{filteredRoomTypes.length}</strong> of {roomTypes.length}
                        </span>
                    </div>
                </div>

                {/* Room Type Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredRoomTypes.map(rt => (
                        <div key={rt.id} className="card-container p-3.5 flex flex-col justify-between hover:shadow-xs transition group">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`${rt.status === 'Active' ? 'badge-status-active' : 'badge-status-inactive'} text-[10px] py-0.5 px-2`}>
                                            {rt.status}
                                        </span>
                                        <span className="badge-code text-[10px] py-0.5 px-1.5">
                                            {rt.shortCode}
                                        </span>
                                    </div>
                                    <div className="flex gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition">
                                        <button
                                            onClick={() => handleEdit(rt)}
                                            className="btn-icon size-7"
                                            title="Edit Room Type"
                                        >
                                            <Edit2 className="size-3 text-slate-600" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rt.id)}
                                            className="btn-icon-danger size-7"
                                            title="Delete Room Type"
                                        >
                                            <Trash2 className="size-3 text-rose-500" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-sm font-semibold text-slate-900 leading-snug">{rt.name}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{rt.description}</p>

                                <div className="mt-3 flex flex-wrap gap-1">
                                    {rt.amenities.slice(0, 4).map(a => (
                                        <span key={a} className="text-[9.5px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium border border-slate-200/80">
                                            {a}
                                        </span>
                                    ))}
                                    {rt.amenities.length > 4 && (
                                        <span className="text-[9.5px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                            +{rt.amenities.length - 4} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-100 pt-2.5 mt-3">
                                <div>
                                    <span className="block text-[9px] uppercase text-slate-400 tracking-wider">Occupancy</span>
                                    <span className="font-semibold text-slate-800 text-xs">{rt.baseAdult}A, {rt.baseChild}C (Max {rt.totalCapacity})</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[9px] uppercase text-slate-400 tracking-wider">Base Tariff</span>
                                    <span className="font-mono text-primary font-bold text-xs">{currencySymbol}{rt.basePrice.toLocaleString()}</span>
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
                        <h1 className="text-xl text-slate-900">{editingId ? 'Edit Room Type' : 'Create Room Type'}</h1>
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
                                            ? 'bg-primary-subtle text-primary shadow-2xs'
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
                                        <h2 className="text-sm text-slate-900">Basic Information</h2>
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
                                                className={`input-standard pr-8 font-mono uppercase ${
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
                                        <h2 className="text-sm text-slate-900">Occupancy & Guest Limits</h2>
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
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-semibold text-slate-700">Total Maximum Capacity</label>
                                            <span className="text-[10px] font-semibold text-primary bg-primary-subtle px-2 py-0.5 rounded-full border border-primary-border">
                                                Auto-Synchronized
                                            </span>
                                        </div>
                                        <input
                                            type="number"
                                            value={formData?.totalCapacity || 3}
                                            onChange={e => updateField('totalCapacity', parseInt(e.target.value) || 3)}
                                            className="input-standard bg-slate-50 text-primary font-bold font-mono"
                                        />
                                        <p className="text-[11px] text-slate-400">Total persons permitted: Max Adults ({formData?.maxAdult || 2}) + Max Children ({formData?.maxChild || 0}) + Extra Bed ({formData?.extraBedAllowed ? (formData?.extraBedQuantity || 1) : 0})</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Extra Bedding Policies */}
                        {activeTab === 'extraBed' && (
                            <div className="space-y-5">
                                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <BedDouble className="size-5 text-primary" />
                                        <div>
                                            <h2 className="text-sm font-semibold text-slate-900">Extra Bedding Policies</h2>
                                            <p className="text-xs text-slate-500">Physical rollaway bed allocation and infant crib parameters</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-medium px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
                                        Physical Capacity Only
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                                        <div>
                                            <span className="text-xs font-semibold text-slate-800">Rollaway Extra Bed Allowed?</span>
                                            <p className="text-[11px] text-slate-500">Can an extra mattress / rollaway bed be accommodated physically in this room?</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={formData?.extraBedAllowed || false}
                                            onChange={e => updateField('extraBedAllowed', e.target.checked)}
                                            className="size-4 text-primary rounded"
                                        />
                                    </div>

                                    {formData?.extraBedAllowed && (
                                        <div className="p-4 bg-primary-subtle/30 rounded-2xl border border-primary-border/40 space-y-3">
                                            <div className="space-y-1.5 max-w-xs">
                                                <label className="text-xs font-semibold text-slate-700">Extra Bed Quantity Allowed</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="5"
                                                    value={formData?.extraBedQuantity || 1}
                                                    onChange={e => updateField('extraBedQuantity', parseInt(e.target.value) || 1)}
                                                    className="input-standard bg-white font-mono font-bold"
                                                />
                                                <p className="text-[11px] text-slate-500">Maximum rollaway beds this room can physically fit.</p>
                                            </div>
                                            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/60 text-[11px] text-blue-700 flex items-center gap-2">
                                                <span className="font-bold">ℹ️ Note:</span>
                                                <span>The nightly rental tariff for extra rollaway bed is configured under the <strong>Pricing & Tariff</strong> tab.</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                                        <div>
                                            <span className="text-xs font-semibold text-slate-800">Baby Crib / Cot Permitted?</span>
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

                        {/* 4. Pricing & Tariff */}
                        {activeTab === 'pricing' && (
                            <div className="space-y-5">
                                <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                                    <DollarSign className="size-5 text-primary" />
                                    <div>
                                        <h2 className="text-sm font-semibold text-slate-900">Base Pricing & Surcharges</h2>
                                        <p className="text-xs text-slate-500">Standard rack rate, extra guest surcharges, and rollaway bed tariffs</p>
                                    </div>
                                </div>

                                {/* 1. Base Rack Rate & Basis */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/60 rounded-2xl border border-slate-200/70">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Base Rack Rate <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencySymbol}</span>
                                            <input
                                                type="number"
                                                value={formData?.basePrice || 0}
                                                onChange={e => updateField('basePrice', parseFloat(e.target.value) || 0)}
                                                className="input-standard pl-8 font-mono text-primary text-base font-bold bg-white"
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-400">Standard nightly price for base occupancy</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Pricing Basis</label>
                                        <select
                                            value={formData?.pricingUnit || 'Per Room'}
                                            onChange={e => {
                                                updateField('pricingUnit', e.target.value);
                                                updateField('pricingBasis', e.target.value);
                                            }}
                                            className="select-standard bg-white"
                                        >
                                            <option value="Per Room">Per Room / Night</option>
                                            <option value="Per Person">Per Person / Night</option>
                                        </select>
                                        <p className="text-[11px] text-slate-400">Determines if base rate is charged per room or per guest</p>
                                    </div>
                                </div>

                                {/* 2. Extra Occupant Surcharges (Pax / Person) */}
                                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <div className="flex items-center gap-2">
                                            <Users className="size-4 text-primary" />
                                            <span className="text-xs font-bold text-slate-800">Occupancy Surcharges (Per Extra Guest / Night)</span>
                                        </div>
                                        <span className="text-[11px] text-slate-500">Charged when exceeding Base Occupancy</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700">Extra Adult Surcharge ({currencySymbol})</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencySymbol}</span>
                                                <input
                                                    type="number"
                                                    value={formData?.extraAdultPrice || 0}
                                                    onChange={e => updateField('extraAdultPrice', parseFloat(e.target.value) || 0)}
                                                    className="input-standard pl-8 font-mono bg-white font-medium"
                                                />
                                            </div>
                                            <p className="text-[11px] text-slate-400">Nightly fee per additional adult beyond base occupancy (linens, amenities, utilities)</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700">Extra Child Surcharge ({currencySymbol})</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencySymbol}</span>
                                                <input
                                                    type="number"
                                                    value={formData?.extraChildPrice || 0}
                                                    onChange={e => updateField('extraChildPrice', parseFloat(e.target.value) || 0)}
                                                    className="input-standard pl-8 font-mono bg-white font-medium"
                                                />
                                            </div>
                                            <p className="text-[11px] text-slate-400">Nightly fee per additional child beyond base child allowance</p>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Physical Extra Bed (Rollaway) Tariff & Billing Policy */}
                                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <div className="flex items-center gap-2">
                                            <BedDouble className="size-4 text-primary" />
                                            <span className="text-xs font-bold text-slate-800">Extra Bedding Hardware Tariff (Rollaway Bed)</span>
                                        </div>
                                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                                            formData?.extraBedAllowed 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                            {formData?.extraBedAllowed ? `✓ Rollaway Supported (Max ${formData?.extraBedQuantity || 1})` : '✕ Extra Bed Not Permitted'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-700">Extra Bed Tariff per Night</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencySymbol}</span>
                                                <input
                                                    type="number"
                                                    disabled={!formData?.extraBedAllowed}
                                                    value={formData?.extraBedRate ?? 1000}
                                                    onChange={e => updateField('extraBedRate', parseFloat(e.target.value) || 0)}
                                                    className={`input-standard pl-8 font-mono font-bold ${
                                                        !formData?.extraBedAllowed ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-white text-slate-900'
                                                    }`}
                                                />
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                {formData?.extraBedAllowed 
                                                    ? 'Nightly hardware fee charged when a physical rollaway bed is supplied to the room' 
                                                    : 'This room type physically disallows rollaway beds. Enable in Extra Bed tab to configure.'}
                                            </p>
                                        </div>

                                        <div className="flex flex-col justify-center p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                                            <label className="flex items-start gap-2.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(formData?.extraAdultIncludesBed)}
                                                    onChange={e => updateField('extraAdultIncludesBed', e.target.checked)}
                                                    className="size-4 text-primary rounded mt-0.5"
                                                />
                                                <div>
                                                    <span className="text-xs font-semibold text-slate-800">Extra Adult fee includes Rollaway Bed</span>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        If checked, when an extra adult is charged, the rollaway bed fee is waived (prevents double billing).
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
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
                                        <h2 className="text-sm text-slate-900">Attributes & Amenities Checklist</h2>
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

                                    {/* ROOM PHOTOS SECTION */}
                                    <div className="col-span-1 md:col-span-2 space-y-3 pt-3 border-t border-slate-100">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                                    <span>Room Photos (রুমের ছবি সমূহ)</span>
                                                    <span className="text-[10px] font-normal text-slate-400">({formData?.photos?.length || 0} attached)</span>
                                                </label>
                                                <p className="text-[11px] text-slate-500">Photos are displayed across booking engines and sent dynamically to guests via AI Concierge WhatsApp.</p>
                                            </div>
                                            <label className="btn-secondary cursor-pointer shrink-0 inline-flex items-center text-xs">
                                                <Upload className="size-3.5 mr-1.5 text-blue-600" />
                                                <span>Upload From Device</span>
                                                <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                                            </label>
                                        </div>

                                        {/* Paste Direct Image URL */}
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                                                <input
                                                    type="url"
                                                    placeholder="Paste image URL(s) - separate multiple URLs with commas or newlines"
                                                    value={photoUrlInput}
                                                    onChange={e => setPhotoUrlInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhotoUrl(); } }}
                                                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addPhotoUrl}
                                                disabled={!photoUrlInput.trim()}
                                                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900 disabled:opacity-40 transition cursor-pointer"
                                            >
                                                Add URL(s)
                                            </button>
                                        </div>

                                        {isUploadingPhotos && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 animate-pulse font-medium">
                                                <RefreshCw className="size-3.5 animate-spin" />
                                                <span>Processing multiple photos in parallel... please wait</span>
                                            </div>
                                        )}

                                        {formData?.photos && formData.photos.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {formData.photos.map((photo, index) => (
                                                    <div key={index} className="relative group rounded-xl overflow-hidden h-28 bg-slate-100 border border-slate-200 shadow-2xs">
                                                        <img src={photo} alt={`Room ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                                                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-white rounded text-[9px] font-medium">
                                                            {index === 0 ? '★ Primary' : `#${index + 1}`}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removePhoto(index)}
                                                            className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                                                            title="Delete photo"
                                                        >
                                                            <X className="size-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={e => {
                                                    e.preventDefault();
                                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                                        handlePhotoUpload({ target: { files: e.dataTransfer.files } });
                                                    }
                                                }}
                                                className="border border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-blue-50/30 transition cursor-pointer"
                                            >
                                                <p className="text-xs text-slate-500 font-medium">No photos uploaded yet.</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">Drag & drop multiple JPEG/PNG photos here or click "Upload From Device" (Ctrl/Shift select supported)</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* ROOM VIDEOS SECTION */}
                                    <div className="col-span-1 md:col-span-2 space-y-3 pt-4 border-t border-slate-100">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                                    <Film className="size-3.5 text-purple-600" />
                                                    <span>Room Videos & Virtual 360° Tours (রুম ভিডিও ও ভার্চুয়াল ট্যুর)</span>
                                                    <span className="text-[10px] font-normal text-slate-400">({formData?.videos?.length || 0} attached)</span>
                                                </label>
                                                <p className="text-[11px] text-slate-500">Attach MP4 video tours or direct links. When guests ask for room videos, StayPulse AI automatically delivers them.</p>
                                            </div>
                                            <label className="btn-secondary cursor-pointer shrink-0 inline-flex items-center text-xs">
                                                <Video className="size-3.5 mr-1.5 text-purple-600" />
                                                <span>Upload Video File</span>
                                                <input type="file" multiple accept="video/mp4,video/webm,video/*" onChange={handleVideoUpload} className="hidden" />
                                            </label>
                                        </div>

                                        {/* Paste Direct Video URL */}
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                                                <input
                                                    type="url"
                                                    placeholder="Paste video URL(s) - separate multiple links with commas or newlines"
                                                    value={videoUrlInput}
                                                    onChange={e => setVideoUrlInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVideoUrl(); } }}
                                                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/80 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addVideoUrl}
                                                disabled={!videoUrlInput.trim()}
                                                className="px-3 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-medium hover:bg-purple-800 disabled:opacity-40 transition cursor-pointer"
                                            >
                                                Add Video(s)
                                            </button>
                                        </div>

                                        {isUploadingVideos && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700 animate-pulse font-medium">
                                                <RefreshCw className="size-3.5 animate-spin" />
                                                <span>Processing multiple video files... please wait</span>
                                            </div>
                                        )}

                                        {formData?.videos && formData.videos.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {formData.videos.map((video, index) => (
                                                    <div key={index} className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs">
                                                        <video
                                                            controls
                                                            playsInline
                                                            src={video}
                                                            className="w-full h-32 object-cover bg-black"
                                                        />
                                                        <div className="p-2 bg-slate-900 text-white flex items-center justify-between text-[11px]">
                                                            <span className="font-medium flex items-center gap-1 truncate text-slate-300">
                                                                <Film className="size-3 text-purple-400 shrink-0" />
                                                                Tour Video #{index + 1}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeVideo(index)}
                                                                className="p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-md text-[10px] transition cursor-pointer flex items-center gap-1"
                                                                title="Delete video"
                                                            >
                                                                <Trash2 className="size-3" />
                                                                <span>Delete</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={e => {
                                                    e.preventDefault();
                                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                                        handleVideoUpload({ target: { files: e.dataTransfer.files } });
                                                    }
                                                }}
                                                className="border border-dashed border-slate-300 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-purple-50/30 transition cursor-pointer"
                                            >
                                                <p className="text-xs text-slate-500 font-medium">No room tour videos attached yet.</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">Drag & drop multiple MP4/WebM videos here or click "Upload Video File" (multi-select supported)</p>
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
