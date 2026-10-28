import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    PackageSearch,
    Plus,
    Search,
    Shield,
    Clock,
    CheckCircle2,
    Truck,
    Trash2,
    Printer,
    UserCheck,
    Lock,
    Copy,
    Check,
    RefreshCw,
    X,
    MapPin,
    Phone,
    AlertCircle,
    Archive
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import {
    type LostAndFoundItem,
    type LostAndFoundCategory,
    type LostAndFoundStatus,
    type LocationType,
    getStoredLostAndFoundItems,
    fetchLostAndFoundFromBackend,
    createLostAndFoundItem,
    claimLostAndFoundItem,
    shipLostAndFoundItem,
    disposeLostAndFoundItem,
    findGuestForRoom,
    isHoldingPeriodExpired,
    getHoldingDaysRemaining
} from '../utils/lostAndFoundEngine';
import { toast } from '../context/ToastContext';

const CATEGORIES: LostAndFoundCategory[] = [
    'Valuables & Jewellery',
    'Electronics & Gadgets',
    'Luggage & Bags',
    'Clothing & Footwear',
    'Documents & Cards',
    'Toiletries & Cosmetics',
    'Keys & Access Cards',
    'Other'
];

const LOCATIONS: LocationType[] = [
    'Guest Room',
    'Lobby / Reception',
    'Restaurant / Bar',
    'Pool / Gym',
    'Banquet / Meeting Room',
    'Corridor / Elevator',
    'Parking / Exterior',
    'Other'
];

export default function LostAndFoundManagement() {
    // ── State ─────────────────────────────────────────────────────────────────
    const [items, setItems] = useState<LostAndFoundItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [copiedRef, setCopiedRef] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | LostAndFoundStatus | 'valuable' | 'expired'>('in_custody');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [locationFilter, setLocationFilter] = useState<string>('all');

    // Modals
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [claimModalItem, setClaimModalItem] = useState<LostAndFoundItem | null>(null);
    const [shipModalItem, setShipModalItem] = useState<LostAndFoundItem | null>(null);
    const [disposeModalItem, setDisposeModalItem] = useState<LostAndFoundItem | null>(null);
    const [receiptModalItem, setReceiptModalItem] = useState<LostAndFoundItem | null>(null);

    // Registration Form State
    const [newItemName, setNewItemName] = useState('');
    const [newCategory, setNewCategory] = useState<LostAndFoundCategory>('Electronics & Gadgets');
    const [newDescription, setNewDescription] = useState('');
    const [newLocationType, setNewLocationType] = useState<LocationType>('Guest Room');
    const [newRoomNumber, setNewRoomNumber] = useState('');
    const [newAreaDetails, setNewAreaDetails] = useState('');
    const [newFoundDate, setNewFoundDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [newFoundTime, setNewFoundTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const [newFoundBy, setNewFoundBy] = useState('');
    const [newFinderRole, setNewFinderRole] = useState('Housekeeper');
    const [newStorageLocation, setNewStorageLocation] = useState('Front Office Safe Box #01');
    const [newStorageBin, setNewStorageBin] = useState('');
    const [newIsValuable, setNewIsValuable] = useState(false);
    const [newHoldingDays, setNewHoldingDays] = useState(90);

    // Guest auto-link form fields
    const [newGuestName, setNewGuestName] = useState('');
    const [newGuestPhone, setNewGuestPhone] = useState('');
    const [newGuestEmail, setNewGuestEmail] = useState('');
    const [newReservationId, setNewReservationId] = useState('');
    const [guestAutoDiscovered, setGuestAutoDiscovered] = useState(false);

    // Claim Form State
    const [claimantName, setClaimantName] = useState('');
    const [claimantPhone, setClaimantPhone] = useState('');
    const [claimantIdType, setClaimantIdType] = useState('Passport');
    const [claimantIdNumber, setClaimantIdNumber] = useState('');
    const [releasingOfficer, setReleasingOfficer] = useState('');
    const [releaseNotes, setReleaseNotes] = useState('Item inspected and verified by owner.');

    // Ship Form State
    const [shippingCarrier, setShippingCarrier] = useState('DHL Express');
    const [shippingTrackingNumber, setShippingTrackingNumber] = useState('');
    const [shippingOfficer, setShippingOfficer] = useState('');
    const [shippingNotes, setShippingNotes] = useState('Dispatched via insured courier.');

    // Dispose Form State
    const [disposalReason, setDisposalReason] = useState('Retention period expired (> 90 days). Donated to local charity.');
    const [disposalOfficer, setDisposalOfficer] = useState('');
    const [disposalType, setDisposalType] = useState<'disposed' | 'donated'>('donated');

    // ── Load & Sync ───────────────────────────────────────────────────────────
    const loadItems = useCallback(async () => {
        setIsLoading(true);
        const local = getStoredLostAndFoundItems(1);
        setItems(local);
        setIsLoading(false);

        // Background sync with API
        try {
            const remote = await fetchLostAndFoundFromBackend(1);
            if (remote && remote.length > 0) {
                setItems(remote);
            }
        } catch {
            // Keep local
        }
    }, []);

    useEffect(() => {
        loadItems();

        const handleSync = () => {
            setItems(getStoredLostAndFoundItems(1));
        };
        window.addEventListener('pms_lost_and_found_updated', handleSync);
        return () => window.removeEventListener('pms_lost_and_found_updated', handleSync);
    }, [loadItems]);

    const handleManualRefresh = async () => {
        setIsSyncing(true);
        await loadItems();
        setIsSyncing(false);
        toast.success('Lost & Found catalog synchronized');
    };

    // ── Auto-Detect Guest on Room Change ───────────────────────────────────────
    useEffect(() => {
        if (!newRoomNumber.trim()) {
            setGuestAutoDiscovered(false);
            return;
        }
        const guestInfo = findGuestForRoom(newRoomNumber.trim());
        if (guestInfo) {
            setNewGuestName(guestInfo.guestName);
            setNewGuestPhone(guestInfo.guestPhone || '');
            setNewGuestEmail(guestInfo.guestEmail || '');
            setNewReservationId(guestInfo.reservationNumber || '');
            setGuestAutoDiscovered(true);
        } else {
            setGuestAutoDiscovered(false);
        }
    }, [newRoomNumber]);

    // When isValuable toggles, adjust default storage & holding period
    const handleValuableToggle = (valuable: boolean) => {
        setNewIsValuable(valuable);
        if (valuable) {
            setNewHoldingDays(180);
            if (!newStorageLocation.includes('Safe') && !newStorageLocation.includes('Vault')) {
                setNewStorageLocation('Duty Manager High-Security Vault #01');
            }
        } else {
            setNewHoldingDays(90);
        }
    };

    // Copy reference number to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedRef(text);
        toast.info(`Copied ${text} to clipboard`);
        setTimeout(() => setCopiedRef(null), 2000);
    };

    // ── KPI Calculations ──────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = items.length;
        const inCustody = items.filter(i => i.status === 'in_custody').length;
        const valuableInSafe = items.filter(i => i.isValuable && i.status === 'in_custody').length;
        const claimed = items.filter(i => i.status === 'claimed' || i.status === 'shipped').length;
        const expired = items.filter(i => isHoldingPeriodExpired(i)).length;
        return { total, inCustody, valuableInSafe, claimed, expired };
    }, [items]);

    // ── Filtered Catalog ──────────────────────────────────────────────────────
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = item.itemName.toLowerCase().includes(q);
                const matchRef = item.referenceNo.toLowerCase().includes(q);
                const matchRoom = (item.roomNumber || '').toLowerCase().includes(q);
                const matchGuest = (item.guestName || '').toLowerCase().includes(q);
                const matchFinder = item.foundBy.toLowerCase().includes(q);
                const matchDesc = item.description.toLowerCase().includes(q);
                if (!matchName && !matchRef && !matchRoom && !matchGuest && !matchFinder && !matchDesc) {
                    return false;
                }
            }

            // Status Filter Tab
            if (statusFilter === 'valuable') {
                if (!item.isValuable || item.status !== 'in_custody') return false;
            } else if (statusFilter === 'expired') {
                if (!isHoldingPeriodExpired(item)) return false;
            } else if (statusFilter !== 'all') {
                if (item.status !== statusFilter) return false;
            }

            // Category Filter
            if (categoryFilter !== 'all' && item.category !== categoryFilter) {
                return false;
            }

            // Location Filter
            if (locationFilter !== 'all' && item.locationType !== locationFilter) {
                return false;
            }

            return true;
        });
    }, [items, searchQuery, statusFilter, categoryFilter, locationFilter]);

    // ── Action Handlers ───────────────────────────────────────────────────────
    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) {
            toast.error('Please enter the item name');
            return;
        }

        const registered = await createLostAndFoundItem({
            itemName: newItemName.trim(),
            category: newCategory,
            description: newDescription.trim(),
            locationType: newLocationType,
            roomNumber: newLocationType === 'Guest Room' ? newRoomNumber.trim() : null,
            areaDetails: newAreaDetails.trim(),
            foundDate: newFoundDate,
            foundTime: newFoundTime,
            foundBy: newFoundBy.trim() || 'Duty Staff',
            finderRole: newFinderRole,
            storageLocation: newStorageLocation.trim() || 'Housekeeping Storage Locker',
            storageBin: newStorageBin.trim(),
            isValuable: newIsValuable,
            holdingPeriodDays: newHoldingDays,
            guestName: newGuestName.trim(),
            guestPhone: newGuestPhone.trim(),
            guestEmail: newGuestEmail.trim(),
            reservationId: newReservationId.trim(),
            notifiedStatus: newGuestName ? 'contacted' : 'pending'
        });

        toast.success(`Registered item ${registered.referenceNo} successfully!`);
        setIsRegisterModalOpen(false);
        // Reset form
        setNewItemName('');
        setNewDescription('');
        setNewRoomNumber('');
        setNewAreaDetails('');
        setNewGuestName('');
        setNewGuestPhone('');
        setNewGuestEmail('');
        setNewReservationId('');
        loadItems();
    };

    const handleClaimSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!claimModalItem) return;
        if (!claimantName.trim()) {
            toast.error('Claimant name is required');
            return;
        }
        if (!releasingOfficer.trim()) {
            toast.error('Releasing staff name is required');
            return;
        }

        await claimLostAndFoundItem(claimModalItem.id, {
            claimedBy: claimantName.trim(),
            claimantPhone: claimantPhone.trim(),
            claimantIdType,
            claimantIdNumber: claimantIdNumber.trim(),
            releasedBy: releasingOfficer.trim(),
            releaseNotes: releaseNotes.trim()
        });

        toast.success(`Item ${claimModalItem.referenceNo} claimed and released!`);
        setClaimModalItem(null);
        loadItems();
    };

    const handleShipSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shipModalItem) return;
        if (!shippingTrackingNumber.trim()) {
            toast.error('Tracking number is required');
            return;
        }

        await shipLostAndFoundItem(shipModalItem.id, {
            shippingCarrier,
            shippingTrackingNumber: shippingTrackingNumber.trim(),
            releasedBy: shippingOfficer.trim() || 'Duty Manager',
            releaseNotes: shippingNotes.trim()
        });

        toast.success(`Item ${shipModalItem.referenceNo} dispatched via ${shippingCarrier}!`);
        setShipModalItem(null);
        loadItems();
    };

    const handleDisposeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!disposeModalItem) return;
        if (!disposalReason.trim()) {
            toast.error('Disposal reason is required');
            return;
        }

        await disposeLostAndFoundItem(disposeModalItem.id, {
            disposalReason: disposalReason.trim(),
            disposedBy: disposalOfficer.trim() || 'Security Manager',
            status: disposalType
        });

        toast.success(`Item ${disposeModalItem.referenceNo} archived as ${disposalType}!`);
        setDisposeModalItem(null);
        loadItems();
    };

    const handlePrintReceipt = (item: LostAndFoundItem) => {
        setReceiptModalItem(item);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/60 p-3 space-y-3">
            {/* ── Page Header ──────────────────────────────────────────────────── */}
            <PageHeader
                title="Lost & Found Registry"
                subtitle="Opera Cloud & AHLA SOP compliant guest property retention, safe vault custody, and audit handover"
                icon={<PackageSearch size={16} />}
                badge={`${stats.inCustody} Active in Custody`}
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleManualRefresh}
                            disabled={isSyncing}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                            Sync
                        </button>
                        <button
                            onClick={() => setIsRegisterModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition shadow-xs"
                        >
                            <Plus size={13} />
                            Register Found Item
                        </button>
                    </div>
                }
            />

            {/* ── KPI Stat Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Registered</p>
                        <p className="text-base font-bold text-slate-900 mt-0.5">{stats.total}</p>
                    </div>
                    <div className="p-2 rounded-md bg-blue-50 text-blue-600">
                        <PackageSearch size={16} />
                    </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">In Custody</p>
                        <p className="text-base font-bold text-emerald-600 mt-0.5">{stats.inCustody}</p>
                    </div>
                    <div className="p-2 rounded-md bg-emerald-50 text-emerald-600">
                        <Lock size={16} />
                    </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">High-Value Safe</p>
                        <p className="text-base font-bold text-amber-600 mt-0.5">{stats.valuableInSafe}</p>
                    </div>
                    <div className="p-2 rounded-md bg-amber-50 text-amber-600">
                        <Shield size={16} />
                    </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Claimed / Returned</p>
                        <p className="text-base font-bold text-indigo-600 mt-0.5">{stats.claimed}</p>
                    </div>
                    <div className="p-2 rounded-md bg-indigo-50 text-indigo-600">
                        <UserCheck size={16} />
                    </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Expired Retention</p>
                        <p className="text-base font-bold text-rose-600 mt-0.5">{stats.expired}</p>
                    </div>
                    <div className="p-2 rounded-md bg-rose-50 text-rose-600">
                        <Clock size={16} />
                    </div>
                </div>
            </div>

            {/* ── Filters & Search Controls ────────────────────────────────────── */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                {/* Search Box */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                        type="text"
                        placeholder="Search item, ref #, room, guest, or finder..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-medium bg-slate-100 p-1 rounded-md">
                    <button
                        onClick={() => setStatusFilter('in_custody')}
                        className={`px-2 py-0.5 rounded transition ${statusFilter === 'in_custody' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        In Custody ({stats.inCustody})
                    </button>
                    <button
                        onClick={() => setStatusFilter('valuable')}
                        className={`px-2 py-0.5 rounded transition ${statusFilter === 'valuable' ? 'bg-white text-amber-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Safe Vault ({stats.valuableInSafe})
                    </button>
                    <button
                        onClick={() => setStatusFilter('claimed')}
                        className={`px-2 py-0.5 rounded transition ${statusFilter === 'claimed' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Claimed
                    </button>
                    <button
                        onClick={() => setStatusFilter('shipped')}
                        className={`px-2 py-0.5 rounded transition ${statusFilter === 'shipped' ? 'bg-white text-purple-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Shipped
                    </button>
                    <button
                        onClick={() => setStatusFilter('expired')}
                        className={`px-2 py-0.5 rounded transition ${statusFilter === 'expired' ? 'bg-white text-rose-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Expired ({stats.expired})
                    </button>
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-2 py-0.5 rounded transition ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        All Items ({stats.total})
                    </button>
                </div>

                {/* Category & Location Selectors */}
                <div className="flex items-center gap-2">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="text-[11px] bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="all">All Categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="text-[11px] bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="all">All Locations</option>
                        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
            </div>

            {/* ── Table & Catalog List ─────────────────────────────────────────── */}
            <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-2 px-3">Ref #</th>
                                <th className="py-2 px-3">Item Details</th>
                                <th className="py-2 px-3">Found Location</th>
                                <th className="py-2 px-3">Found By / Date</th>
                                <th className="py-2 px-3">Storage / Safe Locker</th>
                                <th className="py-2 px-3">Linked Guest</th>
                                <th className="py-2 px-3">Retention Status</th>
                                <th className="py-2 px-3">Status</th>
                                <th className="py-2 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw size={14} className="animate-spin text-blue-600" />
                                            <span>Loading Lost & Found Registry...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400">
                                        <PackageSearch size={28} className="mx-auto mb-2 text-slate-300" />
                                        <p className="font-semibold text-slate-600">No items found</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Try altering search keywords or filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    const isExpired = isHoldingPeriodExpired(item);
                                    const daysRemaining = getHoldingDaysRemaining(item);

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Ref # */}
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-[11px] font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                        {item.referenceNo}
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(item.referenceNo)}
                                                        title="Copy Reference Number"
                                                        className="text-slate-400 hover:text-slate-600"
                                                    >
                                                        {copiedRef === item.referenceNo ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Item Details */}
                                            <td className="py-2.5 px-3 min-w-[200px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-slate-900">{item.itemName}</span>
                                                    {item.isValuable && (
                                                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[9px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200" title="High-Value Valuables / Safe Custody">
                                                            <Shield size={9} />
                                                            VALUABLE
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-0.5">
                                                    <span className="text-blue-600 font-medium">{item.category}</span>
                                                    {item.description && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="truncate max-w-[220px]" title={item.description}>
                                                                {item.description}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Found Location */}
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    {item.roomNumber ? (
                                                        <span className="font-bold text-slate-800 bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]">
                                                            Room {item.roomNumber}
                                                        </span>
                                                    ) : (
                                                        <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                                            {item.locationType}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.areaDetails && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={item.areaDetails}>
                                                        {item.areaDetails}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Found By & Date */}
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                <div className="font-medium text-slate-800">{item.foundBy}</div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <span>{item.finderRole}</span>
                                                    <span>•</span>
                                                    <span>{item.foundDate} {item.foundTime}</span>
                                                </div>
                                            </td>

                                            {/* Storage / Safe Locker */}
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1 font-medium text-slate-800 text-[11px]">
                                                    {item.isValuable ? <Lock size={11} className="text-amber-600" /> : <Archive size={11} className="text-slate-400" />}
                                                    <span>{item.storageLocation}</span>
                                                </div>
                                                {item.storageBin && (
                                                    <span className="text-[10px] text-slate-400 font-mono">Bin: {item.storageBin}</span>
                                                )}
                                            </td>

                                            {/* Linked Guest */}
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                {item.guestName ? (
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{item.guestName}</div>
                                                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                            {item.guestPhone && (
                                                                <span className="flex items-center gap-0.5">
                                                                    <Phone size={9} />
                                                                    {item.guestPhone}
                                                                </span>
                                                            )}
                                                            {item.reservationId && (
                                                                <span className="bg-slate-100 px-1 rounded font-mono text-[9px] text-slate-600">
                                                                    {item.reservationId}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] italic text-slate-400">Unidentified Guest</span>
                                                )}
                                            </td>

                                            {/* Retention Status */}
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                {item.status === 'in_custody' ? (
                                                    isExpired ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                                            <AlertCircle size={10} />
                                                            Retention Expired
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            {daysRemaining} days left ({item.holdingPeriodDays}d policy)
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">Archived</span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                {item.status === 'in_custody' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                        In Custody
                                                    </span>
                                                )}
                                                {item.status === 'claimed' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                        <CheckCircle2 size={10} />
                                                        Claimed
                                                    </span>
                                                )}
                                                {item.status === 'shipped' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                                        <Truck size={10} />
                                                        Shipped
                                                    </span>
                                                )}
                                                {(item.status === 'disposed' || item.status === 'donated') && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                        <Archive size={10} />
                                                        {item.status === 'donated' ? 'Donated' : 'Disposed'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-2.5 px-3 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {item.status === 'in_custody' ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setClaimModalItem(item);
                                                                    setClaimantName(item.guestName || '');
                                                                    setClaimantPhone(item.guestPhone || '');
                                                                }}
                                                                title="Claim & Release Item"
                                                                className="px-2 py-1 text-[10px] font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition shadow-2xs"
                                                            >
                                                                Claim
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    setShipModalItem(item);
                                                                }}
                                                                title="Dispatch via Courier / Shipping"
                                                                className="p-1 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded border border-slate-200"
                                                            >
                                                                <Truck size={12} />
                                                            </button>

                                                            {isExpired && (
                                                                <button
                                                                    onClick={() => {
                                                                        setDisposeModalItem(item);
                                                                    }}
                                                                    title="Dispose / Donate Expired Item"
                                                                    className="p-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded border border-slate-200"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => handlePrintReceipt(item)}
                                                            title="Print Handover Gate Pass / Audit Receipt"
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 border border-slate-200 transition"
                                                        >
                                                            <Printer size={11} />
                                                            Gate Pass
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handlePrintReceipt(item)}
                                                        title="Print Security Tag & Custody Slip"
                                                        className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                                                    >
                                                        <Printer size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ── MODAL: Register Found Item ──────────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-600 text-white rounded-md">
                                    <PackageSearch size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Register Found Item</h3>
                                    <p className="text-[11px] text-slate-500">Record found property with room & guest linkage</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsRegisterModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleRegisterSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
                            {/* Item Name & Category */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                        Item Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Apple iPad Pro, Rolex Watch, Wallet"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value as LostAndFoundCategory)}
                                        className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Detailed Physical Description (Brand, Color, Serial/IMEI, Marks)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Space gray, black case, sticker on back with initial R, minor scratch on bezel..."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Location & Room Auto-Linkage */}
                            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                                        <MapPin size={12} className="text-blue-600" />
                                        Location & Guest Discovery
                                    </span>
                                    {guestAutoDiscovered && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                                            <CheckCircle2 size={10} />
                                            Guest Auto-Identified
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Location Type</label>
                                        <select
                                            value={newLocationType}
                                            onChange={(e) => setNewLocationType(e.target.value as LocationType)}
                                            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded-md"
                                        >
                                            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>

                                    {newLocationType === 'Guest Room' ? (
                                        <div>
                                            <label className="block text-[10px] font-semibold text-blue-800 mb-0.5">Room Number</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 304"
                                                value={newRoomNumber}
                                                onChange={(e) => setNewRoomNumber(e.target.value)}
                                                className="w-full text-xs px-2 py-1 bg-white border border-blue-300 rounded-md focus:ring-1 focus:ring-blue-500 font-bold"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Area Specifics</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Table 6, Pool bench 3"
                                                value={newAreaDetails}
                                                onChange={(e) => setNewAreaDetails(e.target.value)}
                                                className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded-md"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Guest Name (Auto)</label>
                                        <input
                                            type="text"
                                            placeholder="Guest Name"
                                            value={newGuestName}
                                            onChange={(e) => setNewGuestName(e.target.value)}
                                            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded-md"
                                        />
                                    </div>
                                </div>

                                {newGuestName && (
                                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-blue-100 text-[10.5px]">
                                        <div className="text-slate-600">
                                            Phone: <span className="font-semibold text-slate-800">{newGuestPhone || 'N/A'}</span>
                                        </div>
                                        <div className="text-slate-600">
                                            Email: <span className="font-semibold text-slate-800 truncate block">{newGuestEmail || 'N/A'}</span>
                                        </div>
                                        <div className="text-slate-600">
                                            Folio/Res: <span className="font-semibold text-slate-800 font-mono">{newReservationId || 'N/A'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Finder & Date */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                <div>
                                    <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">Found By</label>
                                    <input
                                        type="text"
                                        placeholder="Staff Name"
                                        value={newFoundBy}
                                        onChange={(e) => setNewFoundBy(e.target.value)}
                                        className="w-full text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">Staff Role</label>
                                    <select
                                        value={newFinderRole}
                                        onChange={(e) => setNewFinderRole(e.target.value)}
                                        className="w-full text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                                    >
                                        <option value="Housekeeper">Housekeeper</option>
                                        <option value="Front Desk Agent">Front Desk Agent</option>
                                        <option value="F&B Captain">F&B Captain</option>
                                        <option value="Security Officer">Security Officer</option>
                                        <option value="Bellman / Concierge">Bellman / Concierge</option>
                                        <option value="Maintenance Tech">Maintenance Tech</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">Found Date</label>
                                    <input
                                        type="date"
                                        value={newFoundDate}
                                        onChange={(e) => setNewFoundDate(e.target.value)}
                                        className="w-full text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">Found Time</label>
                                    <input
                                        type="time"
                                        value={newFoundTime}
                                        onChange={(e) => setNewFoundTime(e.target.value)}
                                        className="w-full text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                                    />
                                </div>
                            </div>

                            {/* Storage Location & High Value Protection */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                        Secure Storage Location / Safe Locker
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Front Office Safe #A-04, HK Locker 12"
                                        value={newStorageLocation}
                                        onChange={(e) => setNewStorageLocation(e.target.value)}
                                        className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                        Storage Bin / Shelf Tag
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Bin-E3, Shelf-02"
                                        value={newStorageBin}
                                        onChange={(e) => setNewStorageBin(e.target.value)}
                                        className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md"
                                    />
                                </div>
                            </div>

                            {/* High Value Flag */}
                            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isValuableCheck"
                                        checked={newIsValuable}
                                        onChange={(e) => handleValuableToggle(e.target.checked)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="isValuableCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                                        High-Value Item (Jewellery, Currency, Passport, Smartphone)
                                    </label>
                                </div>
                                <span className="text-[10.5px] text-slate-500">
                                    Retention: <strong className="text-slate-800">{newHoldingDays} days</strong>
                                </span>
                            </div>

                            {/* Form Actions */}
                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setIsRegisterModalOpen(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition"
                                >
                                    Register & Generate Tag
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ── MODAL: Claim & Release Item ─────────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {claimModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95">
                        <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserCheck size={18} />
                                <div>
                                    <h3 className="text-sm font-bold">Claim & Release Custody</h3>
                                    <p className="text-[11px] text-blue-100">Ref: {claimModalItem.referenceNo} — {claimModalItem.itemName}</p>
                                </div>
                            </div>
                            <button onClick={() => setClaimModalItem(null)} className="text-blue-100 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleClaimSubmit} className="p-4 space-y-3">
                            {/* Claimant Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                        Claimant Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={claimantName}
                                        onChange={(e) => setClaimantName(e.target.value)}
                                        className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Claimant Phone</label>
                                    <input
                                        type="text"
                                        value={claimantPhone}
                                        onChange={(e) => setClaimantPhone(e.target.value)}
                                        className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white"
                                    />
                                </div>
                            </div>

                            {/* Identification Verification */}
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                                <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                    <Shield size={12} className="text-blue-600" />
                                    Identity Verification (Mandatory for Handover)
                                </p>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-600 mb-0.5">ID Document Type</label>
                                        <select
                                            value={claimantIdType}
                                            onChange={(e) => setClaimantIdType(e.target.value)}
                                            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded-md"
                                        >
                                            <option value="Passport">Passport</option>
                                            <option value="National ID">National ID Card</option>
                                            <option value="Driving License">Driving License</option>
                                            <option value="Hotel Key & Folio">Verified Folio / Room Key</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Document Number</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. A01824921"
                                            value={claimantIdNumber}
                                            onChange={(e) => setClaimantIdNumber(e.target.value)}
                                            className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded-md"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Staff Verification */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Releasing Staff Officer <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Staff Member / Duty Manager name"
                                    value={releasingOfficer}
                                    onChange={(e) => setReleasingOfficer(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white"
                                />
                            </div>

                            {/* Release Notes */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Handover Notes</label>
                                <textarea
                                    rows={2}
                                    value={releaseNotes}
                                    onChange={(e) => setReleaseNotes(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setClaimModalItem(null)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition"
                                >
                                    Confirm Release & Print Gate Pass
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ── MODAL: Courier Shipping Dispatch ────────────────────────────── */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {shipModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in-50 zoom-in-95">
                        <div className="px-4 py-3 bg-purple-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Truck size={18} />
                                <div>
                                    <h3 className="text-sm font-bold">Dispatch via Courier</h3>
                                    <p className="text-[11px] text-purple-100">{shipModalItem.referenceNo} — {shipModalItem.itemName}</p>
                                </div>
                            </div>
                            <button onClick={() => setShipModalItem(null)} className="text-purple-100 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleShipSubmit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Courier Carrier</label>
                                <select
                                    value={shippingCarrier}
                                    onChange={(e) => setShippingCarrier(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md"
                                >
                                    <option value="DHL Express">DHL Express</option>
                                    <option value="FedEx">FedEx International</option>
                                    <option value="UPS">UPS</option>
                                    <option value="Aramex">Aramex</option>
                                    <option value="Sundarban Courier">Sundarban Courier Service</option>
                                    <option value="SA Paribahan">SA Paribahan</option>
                                    <option value="Other">Other Carrier</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Waybill / Tracking Number <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. DHL-8921048201"
                                    value={shippingTrackingNumber}
                                    onChange={(e) => setShippingTrackingNumber(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Dispatching Officer</label>
                                <input
                                    type="text"
                                    value={shippingOfficer}
                                    onChange={(e) => setShippingOfficer(e.target.value)}
                                    placeholder="Duty Manager / Concierge"
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Shipping & Packaging Notes</label>
                                <textarea
                                    rows={2}
                                    value={shippingNotes}
                                    onChange={(e) => setShippingNotes(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setShipModalItem(null)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-xs transition"
                                >
                                    Confirm Shipment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ── MODAL: Dispose / Donate Expired Item ────────────────────────── */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {disposeModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in-50 zoom-in-95">
                        <div className="px-4 py-3 bg-rose-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trash2 size={18} />
                                <div>
                                    <h3 className="text-sm font-bold">Dispose or Donate Property</h3>
                                    <p className="text-[11px] text-rose-100">{disposeModalItem.referenceNo} — Retention Expired</p>
                                </div>
                            </div>
                            <button onClick={() => setDisposeModalItem(null)} className="text-rose-100 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleDisposeSubmit} className="p-4 space-y-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Disposal Action</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDisposalType('donated')}
                                        className={`px-3 py-2 rounded-md border text-xs font-semibold text-center transition ${disposalType === 'donated' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                                    >
                                        Donate to Charity
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDisposalType('disposed')}
                                        className={`px-3 py-2 rounded-md border text-xs font-semibold text-center transition ${disposalType === 'disposed' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                                    >
                                        Discard / Recycle
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Authorizing Officer</label>
                                <input
                                    type="text"
                                    placeholder="Security Manager / General Manager"
                                    value={disposalOfficer}
                                    onChange={(e) => setDisposalOfficer(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Disposal Reason / Charity Details</label>
                                <textarea
                                    rows={2}
                                    value={disposalReason}
                                    onChange={(e) => setDisposalReason(e.target.value)}
                                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setDisposeModalItem(null)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs transition"
                                >
                                    Confirm Action
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ── MODAL: Printable Gate Pass / Handover Audit Certificate ────── */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {receiptModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
                        {/* Header bar */}
                        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between print:hidden">
                            <div className="flex items-center gap-2">
                                <Printer size={16} />
                                <h3 className="text-xs font-bold uppercase tracking-wider">Property Handover Certificate & Security Gate Pass</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                >
                                    <Printer size={13} />
                                    Print Document
                                </button>
                                <button
                                    onClick={() => setReceiptModalItem(null)}
                                    className="text-slate-400 hover:text-white p-1"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Printable Certificate Body */}
                        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 bg-white" id="gate-pass-printable">
                            {/* Hotel Letterhead */}
                            <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between">
                                <div>
                                    <h1 className="text-lg font-black tracking-tight text-slate-900">HOTEL MANAGEMENT OS</h1>
                                    <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Security & Housekeeping Division</p>
                                    <p className="text-[10px] text-slate-400">Official Chain of Custody & Property Release Form</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono font-bold bg-slate-100 border border-slate-300 px-2 py-1 rounded inline-block">
                                        REF: {receiptModalItem.referenceNo}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1">Date: {new Date().toLocaleDateString()}</p>
                                </div>
                            </div>

                            {/* Item Details Box */}
                            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                                <h4 className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Item Specifications</h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-500">Item Name:</span>{' '}
                                        <strong className="text-slate-900">{receiptModalItem.itemName}</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Category:</span>{' '}
                                        <span className="font-semibold">{receiptModalItem.category}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-500">Description:</span>{' '}
                                        <span className="text-slate-800">{receiptModalItem.description || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Found Date / Time:</span>{' '}
                                        <span>{receiptModalItem.foundDate} at {receiptModalItem.foundTime}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Location Found:</span>{' '}
                                        <span className="font-semibold">{receiptModalItem.locationType} {receiptModalItem.roomNumber ? `(Room ${receiptModalItem.roomNumber})` : ''}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Found By:</span>{' '}
                                        <span>{receiptModalItem.foundBy} ({receiptModalItem.finderRole})</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Storage Location:</span>{' '}
                                        <span>{receiptModalItem.storageLocation}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Release & Verification Box */}
                            <div className="bg-blue-50/50 p-3.5 rounded-lg border border-blue-200 space-y-2">
                                <h4 className="text-[11px] font-bold uppercase text-blue-900 tracking-wider">Handover & Verification Details</h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-500">Claimant Name:</span>{' '}
                                        <strong className="text-slate-900">{receiptModalItem.claimedBy || receiptModalItem.guestName || 'Pending'}</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Contact Phone:</span>{' '}
                                        <span>{receiptModalItem.claimantPhone || receiptModalItem.guestPhone || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">ID Verification:</span>{' '}
                                        <span className="font-mono">{receiptModalItem.claimantIdType || 'N/A'}: {receiptModalItem.claimantIdNumber || 'Verified'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Releasing Staff Officer:</span>{' '}
                                        <span className="font-semibold">{receiptModalItem.releasedBy || 'Duty Manager'}</span>
                                    </div>
                                    {receiptModalItem.shippingTrackingNumber && (
                                        <div className="col-span-2">
                                            <span className="text-slate-500">Courier Tracking:</span>{' '}
                                            <span className="font-mono font-bold text-purple-700">{receiptModalItem.shippingCarrier} — #{receiptModalItem.shippingTrackingNumber}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Declaration */}
                            <p className="text-[10px] text-slate-500 italic leading-relaxed">
                                I hereby certify that the property described above has been returned to me in the same condition as reported found. 
                                The hotel and its staff are hereby discharged from any further custody liability regarding this item.
                            </p>

                            {/* Signatures Grid */}
                            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-center text-xs">
                                <div>
                                    <div className="h-12 border-b border-dashed border-slate-400"></div>
                                    <p className="font-semibold text-slate-800 mt-1">Claimant / Recipient</p>
                                    <p className="text-[10px] text-slate-400">Signature & Date</p>
                                </div>
                                <div>
                                    <div className="h-12 border-b border-dashed border-slate-400"></div>
                                    <p className="font-semibold text-slate-800 mt-1">Releasing Officer</p>
                                    <p className="text-[10px] text-slate-400">Signature & Employee ID</p>
                                </div>
                                <div>
                                    <div className="h-12 border-b border-dashed border-slate-400"></div>
                                    <p className="font-semibold text-slate-800 mt-1">Duty / Security Manager</p>
                                    <p className="text-[10px] text-slate-400">Official Hotel Seal</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
