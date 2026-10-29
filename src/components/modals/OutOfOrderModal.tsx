import React, { useState, useEffect, useMemo } from 'react';
import {
    Wrench,
    AlertTriangle,
    Calendar,
    Clock,
    User,
    CheckCircle2,
    X,
    ArrowRight,
    Sparkles,
    ShieldAlert,
    RefreshCw,
    PlusCircle,
    Check,
    Search,
    CheckSquare,
    Square
} from 'lucide-react';
import {
    type OutOfOrderBlock,
    type MaintenanceBlockType,
    type MaintenanceReasonCategory,
    getStoredOOOBlocks,
    createOOOBlock,
    extendOOOBlock,
    releaseOOOBlock,
    cancelOOOBlock,
    findConflictingReservations,
    isBlockOverdue,
    syncOOOBlocksFromBackend
} from '../../utils/outOfOrderEngine';
import {
    getCanonicalRooms,
    type CanonicalRoom,
    type StoredReservation,
    getAllStoredReservations,
    saveStoredReservations,
    moveRoomInDB
} from '../../utils/roomInventoryEngine';
import { toast } from '../../context/ToastContext';
import { getActivePropertyId } from '../../utils/apiUrl';

interface OutOfOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId?: number;
    initialRoomNumber?: string;
    initialStartDate?: string;
    initialEndDate?: string;
    initialBlockType?: MaintenanceBlockType;
    onBlockUpdated?: () => void;
}

const REASON_CATEGORIES: MaintenanceReasonCategory[] = [
    'HVAC / AC',
    'Plumbing',
    'Electrical',
    'Deep Cleaning',
    'Furniture & Fixtures',
    'Renovation',
    'Painting',
    'Flooring / Carpeting',
    'Window / Glass',
    'Electronic Lock',
    'Pest Control',
    'Guest Damage / Incident',
    'Other'
];

export const OutOfOrderModal: React.FC<OutOfOrderModalProps> = ({
    isOpen,
    onClose,
    propertyId,
    initialRoomNumber,
    initialStartDate,
    initialEndDate,
    initialBlockType = 'OOO',
    onBlockUpdated
}) => {
    const activePropId = propertyId || getActivePropertyId();
    const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
    const [rooms, setRooms] = useState<CanonicalRoom[]>([]);
    const [blocks, setBlocks] = useState<OutOfOrderBlock[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Form fields
    const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
    const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(initialRoomNumber || '');
    const [selectedRoomNumbers, setSelectedRoomNumbers] = useState<Set<string>>(new Set());
    const [blockType, setBlockType] = useState<MaintenanceBlockType>(initialBlockType);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [reasonCategory, setReasonCategory] = useState<MaintenanceReasonCategory>('HVAC / AC');
    const [description, setDescription] = useState<string>('');
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [returnToStatus, setReturnToStatus] = useState<'Dirty' | 'Inspected' | 'Clean'>('Dirty');
    const [managerOverride, setManagerOverride] = useState<boolean>(false);

    // List & Bulk Unlock state
    const [listSearchTerm, setListSearchTerm] = useState<string>('');
    const [listStatusFilter, setListStatusFilter] = useState<'all' | 'active' | 'overdue' | 'ooo' | 'oos' | 'completed'>('active');
    const [selectedBlocksForUnlock, setSelectedBlocksForUnlock] = useState<Set<string>>(new Set());
    const [isBulkUnlockOpen, setIsBulkUnlockOpen] = useState<boolean>(false);
    const [bulkUnlockReturnStatus, setBulkUnlockReturnStatus] = useState<'Dirty' | 'Inspected' | 'Clean'>('Dirty');
    const [bulkUnlockNotes, setBulkUnlockNotes] = useState<string>('Repairs completed and verified');

    // Extension modal state
    const [extendingBlock, setExtendingBlock] = useState<OutOfOrderBlock | null>(null);
    const [extensionNewDate, setExtensionNewDate] = useState<string>('');
    const [extensionReason, setExtensionReason] = useState<string>('');

    // Single releasing modal state
    const [releasingBlock, setReleasingBlock] = useState<OutOfOrderBlock | null>(null);
    const [releaseReturnStatus, setReleaseReturnStatus] = useState<'Dirty' | 'Inspected' | 'Clean'>('Dirty');
    const [releaseNotes, setReleaseNotes] = useState<string>('');

    const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // Load initial data
    const refreshData = async () => {
        if (!activePropId) {
            setRooms([]);
            setBlocks([]);
            return;
        }
        const canonical = getCanonicalRooms(activePropId);
        setRooms(canonical);
        const stored = getStoredOOOBlocks(activePropId);
        setBlocks(stored);

        try {
            const synced = await syncOOOBlocksFromBackend(activePropId);
            setBlocks(synced);
        } catch {
            // fallback to stored
        }
    };

    useEffect(() => {
        if (isOpen) {
            refreshData();

            const start = initialStartDate || todayStr;
            const end = initialEndDate || (() => {
                const d = new Date(start);
                d.setDate(d.getDate() + 2);
                return d.toISOString().slice(0, 10);
            })();

            setStartDate(start);
            setEndDate(end);
            setSelectedRoomNumber(initialRoomNumber || (rooms[0]?.number || ''));
            setSelectedRoomNumbers(initialRoomNumber ? new Set([initialRoomNumber]) : new Set());
            setBlockType(initialBlockType);
            setDescription('');
            setAssignedTo('');
            setManagerOverride(false);
            setExtendingBlock(null);
            setReleasingBlock(null);
            setSelectedBlocksForUnlock(new Set());
            setIsBulkUnlockOpen(false);
        }
    }, [isOpen, initialRoomNumber, initialStartDate, initialEndDate, initialBlockType]);

    // Floor grouping for bulk room selection
    const floorGroups = useMemo(() => {
        const map = new Map<number | string, CanonicalRoom[]>();
        rooms.forEach(r => {
            const fl = r.floorId || '1';
            if (!map.has(fl)) map.set(fl, []);
            map.get(fl)!.push(r);
        });
        return Array.from(map.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
    }, [rooms]);

    // Conflicting reservations for proposed window
    const targetRoomList = useMemo(() => {
        if (isBulkMode) return Array.from(selectedRoomNumbers);
        return selectedRoomNumber ? [selectedRoomNumber] : [];
    }, [isBulkMode, selectedRoomNumbers, selectedRoomNumber]);

    const conflicts = useMemo(() => {
        if (targetRoomList.length === 0 || !startDate || !endDate || startDate > endDate) return [];
        const all: { room: string; conflicts: StoredReservation[] }[] = [];
        targetRoomList.forEach(rn => {
            const rmConflicts = findConflictingReservations(rn, startDate, endDate);
            if (rmConflicts.length > 0) {
                all.push({ room: rn, conflicts: rmConflicts });
            }
        });
        return all;
    }, [targetRoomList, startDate, endDate]);

    const totalConflictCount = useMemo(() => {
        return conflicts.reduce((sum, c) => sum + c.conflicts.length, 0);
    }, [conflicts]);

    // Handle Quick Date Chips
    const handleQuickDays = (days: number) => {
        const base = new Date(startDate || todayStr);
        base.setDate(base.getDate() + days);
        setEndDate(base.toISOString().slice(0, 10));
    };

    // Toggle multi-room selection
    const toggleRoomSelection = (roomNo: string) => {
        setSelectedRoomNumbers(prev => {
            const next = new Set(prev);
            next.has(roomNo) ? next.delete(roomNo) : next.add(roomNo);
            return next;
        });
    };

    const toggleFloorRooms = (floorRooms: CanonicalRoom[]) => {
        setSelectedRoomNumbers(prev => {
            const next = new Set(prev);
            const allSelected = floorRooms.every(r => next.has(r.number));
            if (allSelected) {
                floorRooms.forEach(r => next.delete(r.number));
            } else {
                floorRooms.forEach(r => next.add(r.number));
            }
            return next;
        });
    };

    // Auto-Reassign Conflicting Reservation to an Alternative Clean Room
    const handleReassignBooking = async (res: StoredReservation, targetRoomNumber: string, displacedRoomNumber: string) => {
        try {
            setLoading(true);
            const allRes = getAllStoredReservations();
            const idx = allRes.findIndex(r => String(r.id) === String(res.id) || r.reservationNumber === res.reservationNumber);

            if (idx === -1) {
                toast.error('Reservation record not found');
                return;
            }

            await moveRoomInDB(res.id || res.reservationNumber, targetRoomNumber);
            const updatedBooking: StoredReservation = {
                ...allRes[idx],
                roomNumber: targetRoomNumber,
                allocatedRooms: [targetRoomNumber],
                specialRequests: `${allRes[idx].specialRequests || ''} [Auto-Reassigned from Room ${displacedRoomNumber} due to maintenance on ${todayStr}]`.trim()
            };
            allRes[idx] = updatedBooking;
            saveStoredReservations(allRes);

            toast.success(`Booking ${res.reservationNumber} successfully moved from Room ${displacedRoomNumber} to Room ${targetRoomNumber}`);
            refreshData();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to reassign reservation');
        } finally {
            setLoading(false);
        }
    };

    // Submit New Maintenance Block (Supports Single & Bulk Multi-Room)
    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const targets = isBulkMode ? Array.from(selectedRoomNumbers) : (selectedRoomNumber ? [selectedRoomNumber] : []);
        if (targets.length === 0) {
            toast.error('Please select at least one room');
            return;
        }
        if (!startDate || !endDate) {
            toast.error('Please specify both start and end dates');
            return;
        }
        if (startDate > endDate) {
            toast.error('Start date cannot be after end date');
            return;
        }
        if (totalConflictCount > 0 && !managerOverride) {
            toast.error(`Cannot lock: ${totalConflictCount} overlapping reservation(s) exist. Reassign them first or enable Manager Override.`);
            return;
        }

        try {
            setLoading(true);
            let successCount = 0;
            for (const rn of targets) {
                const roomObj = rooms.find(r => String(r.number).trim() === rn);
                const res = await createOOOBlock({
                    propertyId: activePropId,
                    roomNumber: rn,
                    roomType: roomObj?.roomTypeName || 'Standard Room',
                    blockType,
                    startDate,
                    endDate,
                    reasonCategory,
                    description: description.trim() || `${reasonCategory} maintenance`,
                    assignedTo: assignedTo.trim() || undefined,
                    returnToStatus,
                    createdBy: 'Manager'
                }, managerOverride);
                if (res.success) successCount++;
            }

            toast.success(`Successfully placed ${successCount} room(s) into ${blockType === 'OOO' ? 'Out of Order' : 'Out of Service'}`);
            refreshData();
            onBlockUpdated?.();
            setActiveTab('list');
        } catch (e: any) {
            toast.error(e?.message || 'Error creating maintenance block');
        } finally {
            setLoading(false);
        }
    };

    // Submit Bulk Unlock
    const handleBulkUnlockSubmit = async () => {
        if (selectedBlocksForUnlock.size === 0) return;
        const blockIds = Array.from(selectedBlocksForUnlock);
        setLoading(true);
        let count = 0;
        for (const bId of blockIds) {
            const res = await releaseOOOBlock(bId, bulkUnlockReturnStatus, 'Manager', bulkUnlockNotes.trim() || 'Bulk unblocked');
            if (res.success) count++;
        }
        toast.success(`Successfully unlocked ${count} room(s) and released to Housekeeping as ${bulkUnlockReturnStatus}`);
        setSelectedBlocksForUnlock(new Set());
        setIsBulkUnlockOpen(false);
        refreshData();
        onBlockUpdated?.();
        setLoading(false);
    };

    // Submit Extension
    const handleExtensionSubmit = async () => {
        if (!extendingBlock) return;
        if (!extensionNewDate || extensionNewDate <= extendingBlock.endDate) {
            toast.error(`New end date must be after current end date (${extendingBlock.endDate})`);
            return;
        }
        if (!extensionReason.trim()) {
            toast.error('Please enter the reason for extension');
            return;
        }

        try {
            setLoading(true);
            const res = await extendOOOBlock(extendingBlock.id, extensionNewDate, extensionReason, 'FrontDesk Manager');
            if (res.success) {
                toast.success(res.message || 'Maintenance extended successfully');
                setExtendingBlock(null);
                setExtensionNewDate('');
                setExtensionReason('');
                refreshData();
                onBlockUpdated?.();
            } else {
                toast.error(res.message || 'Failed to extend block');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Error extending block');
        } finally {
            setLoading(false);
        }
    };

    // Submit Release to Housekeeping (Single)
    const handleReleaseSubmit = async () => {
        if (!releasingBlock) return;
        try {
            setLoading(true);
            const res = await releaseOOOBlock(
                releasingBlock.id,
                releaseReturnStatus,
                'FrontDesk Manager',
                releaseNotes.trim()
            );
            if (res.success) {
                toast.success(res.message || 'Room released to Housekeeping successfully');
                setReleasingBlock(null);
                setReleaseNotes('');
                refreshData();
                onBlockUpdated?.();
            } else {
                toast.error(res.message || 'Failed to release room');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Error releasing room');
        } finally {
            setLoading(false);
        }
    };

    // Cancel block
    const handleCancelBlock = async (block: OutOfOrderBlock) => {
        if (!window.confirm(`Are you sure you want to cancel maintenance for Room ${block.roomNumber}? This will restore the room to active service.`)) {
            return;
        }
        try {
            setLoading(true);
            const res = await cancelOOOBlock(block.id, 'Cancelled via UI');
            if (res.success) {
                toast.success(res.message || 'Maintenance cancelled');
                refreshData();
                onBlockUpdated?.();
            } else {
                toast.error(res.message || 'Failed to cancel block');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Error cancelling block');
        } finally {
            setLoading(false);
        }
    };

    // Filtered Blocks for List Tab
    const filteredBlocks = useMemo(() => {
        return blocks.filter(b => {
            const matchesSearch =
                b.roomNumber.includes(listSearchTerm) ||
                b.description.toLowerCase().includes(listSearchTerm.toLowerCase()) ||
                (b.assignedTo?.toLowerCase().includes(listSearchTerm.toLowerCase()) ?? false) ||
                b.reasonCategory.toLowerCase().includes(listSearchTerm.toLowerCase());

            if (!matchesSearch) return false;

            const isOverdue = isBlockOverdue(b, todayStr);
            const isActive = b.status === 'active' || b.status === 'extended';

            switch (listStatusFilter) {
                case 'active': return isActive;
                case 'overdue': return isOverdue;
                case 'ooo': return isActive && b.blockType === 'OOO';
                case 'oos': return isActive && b.blockType === 'OOS';
                case 'completed': return b.status === 'completed' || b.status === 'cancelled';
                default: return true;
            }
        });
    }, [blocks, listSearchTerm, listStatusFilter, todayStr]);

    if (!isOpen) return null;

    const activeBlocksCount = blocks.filter(b => b.status === 'active' || b.status === 'extended').length;
    const overdueCount = blocks.filter(b => isBlockOverdue(b, todayStr)).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4.5 text-white flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-400">
                            <Wrench className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold tracking-tight">Room Maintenance &amp; Out of Order / Out of Service</h3>
                                {overdueCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {overdueCount} OVERDUE
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-4 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('create')}
                        className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'create'
                            ? 'border-indigo-600 text-indigo-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <PlusCircle className="w-4 h-4" />
                        Mark Maintenance Block
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('list')}
                        className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeTab === 'list'
                            ? 'border-indigo-600 text-indigo-700'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Unlock Maintenance Block
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${overdueCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                            }`}>
                            {activeBlocksCount}
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'create' ? (
                        <form onSubmit={handleCreateSubmit} className="space-y-6">

                            {/* Single vs Multiple Room Toggle */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div>
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Lock Mode</span>
                                    <span className="text-[11px] text-slate-500">Lock a single room or batch-lock multiple rooms for floor renovation</span>
                                </div>
                                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => setIsBulkMode(false)}
                                        className={`px-3 py-1 rounded-md transition-all ${!isBulkMode ? 'bg-white shadow-xs text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        Single Room
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsBulkMode(true)}
                                        className={`px-3 py-1 rounded-md transition-all ${isBulkMode ? 'bg-white shadow-xs text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        Multiple Rooms (Bulk)
                                    </button>
                                </div>
                            </div>

                            {/* Maintenance Type Selection (OOO vs OOS) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Maintenance Classification &amp; Inventory Impact
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setBlockType('OOO')}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${blockType === 'OOO'
                                            ? 'border-rose-500 bg-rose-50/70 shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded text-[11px] font-black bg-rose-600 text-white tracking-wider">
                                                    OOO
                                                </span>
                                                <span className="font-bold text-sm text-slate-900">Out of Order</span>
                                            </div>
                                            {blockType === 'OOO' && <CheckCircle2 className="w-5 h-5 text-rose-600" />}
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            <strong>Severe defect / safety hazard</strong> (burst pipe, AC broken, window break).
                                            <br />
                                            <span className="text-rose-700 font-semibold">• Strictly deducted from Sellable Inventory count.</span>
                                            <br />
                                            <span className="text-rose-700 font-semibold">• Front Desk blocked from booking or assigning.</span>
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setBlockType('OOS')}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${blockType === 'OOS'
                                            ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded text-[11px] font-black bg-amber-600 text-white tracking-wider">
                                                    OOS
                                                </span>
                                                <span className="font-bold text-sm text-slate-900">Out of Service</span>
                                            </div>
                                            {blockType === 'OOS' && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            <strong>Minor cosmetic / light servicing</strong> (touch-up paint, remote, carpet shampoo).
                                            <br />
                                            <span className="text-amber-800 font-medium">• NOT deducted from total sellable inventory.</span>
                                            <br />
                                            <span className="text-amber-800 font-medium">• Front Desk receives warning, but can assign during peak.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Room Selection */}
                            {!isBulkMode ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Target Room <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={selectedRoomNumber}
                                            onChange={(e) => setSelectedRoomNumber(e.target.value)}
                                            className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                            required
                                        >
                                            <option value="">Select Room...</option>
                                            {rooms.map(r => (
                                                <option key={r.number} value={r.number}>
                                                    Room {r.number} — {r.roomTypeName} ({r.housekeepingStatus})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Start Date <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Estimated Ready Date <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            min={startDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            required
                                        />
                                        <div className="flex gap-1.5 mt-1">
                                            {[1, 3, 7, 14].map(days => (
                                                <button
                                                    key={days}
                                                    type="button"
                                                    onClick={() => handleQuickDays(days)}
                                                    className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-medium cursor-pointer"
                                                >
                                                    +{days}D
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Bulk Multi-Room Picker */
                                <div className="space-y-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-slate-800">
                                                Select Rooms to Lock ({selectedRoomNumbers.size} selected)
                                            </span>
                                            <span className="text-[11px] text-slate-500 block">
                                                Click floor buttons or individual room badges
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedRoomNumbers.size === rooms.length) {
                                                    setSelectedRoomNumbers(new Set());
                                                } else {
                                                    setSelectedRoomNumbers(new Set(rooms.map(r => r.number)));
                                                }
                                            }}
                                            className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
                                        >
                                            {selectedRoomNumbers.size === rooms.length ? 'Deselect All' : 'Select All Rooms'}
                                        </button>
                                    </div>

                                    {/* Floor-by-floor room selector */}
                                    <div className="space-y-2.5">
                                        {floorGroups.map(([floor, floorRooms]) => (
                                            <div key={floor} className="bg-white p-2.5 rounded-lg border border-slate-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[11px] font-bold text-slate-700">Floor {floor}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleFloorRooms(floorRooms)}
                                                        className="text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                                                    >
                                                        Select All Floor {floor}
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {floorRooms.map(r => {
                                                        const isSelected = selectedRoomNumbers.has(r.number);
                                                        return (
                                                            <button
                                                                key={r.number}
                                                                type="button"
                                                                onClick={() => toggleRoomSelection(r.number)}
                                                                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${isSelected
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                                                                    }`}
                                                            >
                                                                {r.number}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Date range for bulk */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Ready Date *</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                min={startDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Collisions / Conflicting Bookings Interceptor */}
                            {totalConflictCount > 0 && (
                                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3 animate-pulse">
                                    <div className="flex items-center gap-2 text-rose-800">
                                        <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
                                        <h4 className="text-xs font-black uppercase tracking-wider">
                                            Booking Collision Interceptor: {totalConflictCount} Overlapping Reservation(s) Found!
                                        </h4>
                                    </div>
                                    <p className="text-xs text-rose-700">
                                        Guests are already booked in these rooms during the maintenance window. Locking them will displace guests.
                                        Auto-move them or enable Manager Override.
                                    </p>

                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {conflicts.map(c => {
                                            const alternativeRooms = rooms.filter(r =>
                                                r.number !== c.room &&
                                                r.status === 'Active'
                                            );
                                            return (
                                                <div key={c.room} className="p-2.5 bg-white rounded-lg border border-rose-200 text-xs">
                                                    <span className="font-bold text-rose-900 block mb-1">Room {c.room} has {c.conflicts.length} overlapping stay(s):</span>
                                                    {c.conflicts.map(res => (
                                                        <div key={res.id} className="flex items-center justify-between text-[11px] py-1 border-t border-slate-100 flex-wrap gap-2">
                                                            <span><strong>{res.reservationNumber}</strong> — {res.guestName} ({res.checkIn} to {res.checkOut})</span>
                                                            {alternativeRooms.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleReassignBooking(res, alternativeRooms[0].number, c.room)}
                                                                    className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200 cursor-pointer flex items-center gap-1"
                                                                >
                                                                    <ArrowRight size={10} /> Auto-Move to Room {alternativeRooms[0].number}
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <label className="flex items-center gap-2 text-xs font-bold text-rose-900 cursor-pointer pt-2 border-t border-rose-200">
                                        <input
                                            type="checkbox"
                                            checked={managerOverride}
                                            onChange={(e) => setManagerOverride(e.target.checked)}
                                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                                        />
                                        Manager Override (Acknowledge displaced guests &amp; manage reallocations manually)
                                    </label>
                                </div>
                            )}

                            {/* Reason Category and Assigned Staff */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Defect / Reason Category <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={reasonCategory}
                                        onChange={(e) => setReasonCategory(e.target.value as MaintenanceReasonCategory)}
                                        className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        required
                                    >
                                        {REASON_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Assigned Technician / Vendor
                                    </label>
                                    <div className="relative">
                                        <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="e.g. Technician Karim, Daikin AC Services..."
                                            value={assignedTo}
                                            onChange={(e) => setAssignedTo(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Description / Work Order Details */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Work Order Details / Defect Symptoms <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Describe the defect symptoms, parts required, or renovation plan..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            </div>

                            {/* Return-to-Service Status */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Target Status when Released back to Housekeeping
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'Dirty', label: 'Dirty (Recommended)', sub: 'Must be cleaned & inspected by HK' },
                                        { id: 'Inspected', label: 'Inspected', sub: 'Immediately sellable' },
                                        { id: 'Clean', label: 'Clean', sub: 'Cleaned, pending supervisor' }
                                    ].map(st => (
                                        <label key={st.id} className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${returnToStatus === st.id
                                            ? 'border-indigo-600 bg-indigo-50/60 font-bold text-indigo-900'
                                            : 'border-slate-200 text-slate-700'
                                            }`}>
                                            <input
                                                type="radio"
                                                name="returnToStatus"
                                                value={st.id}
                                                checked={returnToStatus === st.id}
                                                onChange={() => setReturnToStatus(st.id as any)}
                                                className="text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="text-left">
                                                <span className="block text-xs">{st.label}</span>
                                                <span className="block text-[10px] text-slate-500 font-normal">{st.sub}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || (totalConflictCount > 0 && !managerOverride)}
                                    className={`px-5 py-2 text-xs font-bold text-white rounded-lg flex items-center gap-2 transition-all shadow-md cursor-pointer ${blockType === 'OOO'
                                        ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300'
                                        : 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300'
                                        }`}
                                >
                                    <Wrench className="w-4 h-4" />
                                    {loading ? 'Processing...' : `Confirm ${isBulkMode ? `${targetRoomList.length} Rooms` : 'Room'} ${blockType === 'OOO' ? 'Out of Order' : 'Out of Service'}`}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Active & Overdue List Tab (Unlock Maintenance Block) */
                        <div className="space-y-4">
                            {/* Filter and Search Bar */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by room, technician, defect category..."
                                        value={listSearchTerm}
                                        onChange={(e) => setListSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {[
                                        { id: 'active', label: 'Active Locks' },
                                        { id: 'overdue', label: 'Overdue' },
                                        { id: 'ooo', label: 'OOO Only' },
                                        { id: 'oos', label: 'OOS Only' },
                                        { id: 'completed', label: 'History' },
                                        { id: 'all', label: 'All' }
                                    ].map(fl => (
                                        <button
                                            key={fl.id}
                                            type="button"
                                            onClick={() => setListStatusFilter(fl.id as any)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${listStatusFilter === fl.id
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {fl.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bulk Unlock Action Bar */}
                            {selectedBlocksForUnlock.size > 0 && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span className="text-xs font-bold text-emerald-900">
                                            {selectedBlocksForUnlock.size} room block{selectedBlocksForUnlock.size !== 1 ? 's' : ''} selected
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsBulkUnlockOpen(true)}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <CheckCircle2 size={13} />
                                            Unlock Selected Rooms
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedBlocksForUnlock(new Set())}
                                            className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {filteredBlocks.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-semibold">No maintenance blocks match your filter</p>
                                    <p className="text-xs text-slate-400">All matching rooms are in service.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredBlocks.map(b => {
                                        const isOverdue = isBlockOverdue(b, todayStr);
                                        const isComplete = b.status === 'completed';
                                        const isCancelled = b.status === 'cancelled';
                                        const isSelected = selectedBlocksForUnlock.has(b.id);

                                        return (
                                            <div
                                                key={b.id}
                                                className={`p-4 rounded-xl border transition-all ${isOverdue
                                                    ? 'bg-rose-50/90 border-rose-300 shadow-sm'
                                                    : isComplete
                                                        ? 'bg-slate-50 border-slate-200 opacity-60'
                                                        : isCancelled
                                                            ? 'bg-slate-50 border-slate-200 opacity-50'
                                                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                                                    }`}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        {!isComplete && !isCancelled && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedBlocksForUnlock(prev => {
                                                                        const next = new Set(prev);
                                                                        next.has(b.id) ? next.delete(b.id) : next.add(b.id);
                                                                        return next;
                                                                    });
                                                                }}
                                                                className="mt-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                                                            >
                                                                {isSelected ? (
                                                                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                                ) : (
                                                                    <Square className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${b.blockType === 'OOO'
                                                                    ? 'bg-rose-600 text-white'
                                                                    : 'bg-amber-600 text-white'
                                                                    }`}>
                                                                    {b.blockType}
                                                                </span>
                                                                <span className="font-bold text-sm text-slate-900 font-mono">
                                                                    Room {b.roomNumber}
                                                                </span>
                                                                <span className="text-xs text-slate-500 font-medium">
                                                                    ({b.roomType})
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                                    {b.reasonCategory}
                                                                </span>
                                                                {isOverdue && (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse flex items-center gap-1">
                                                                        <AlertTriangle className="w-3 h-3" />
                                                                        OVERDUE ({b.endDate})
                                                                    </span>
                                                                )}
                                                                {b.status === 'extended' && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                                                                        Extended
                                                                    </span>
                                                                )}
                                                                {isComplete && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                                                        <Check className="w-3 h-3" />
                                                                        Unlocked ({b.returnToStatus})
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className="text-xs text-slate-700 font-medium mb-1">
                                                                {b.description}
                                                            </p>

                                                            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-mono">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                                    {b.startDate} → {b.endDate}
                                                                </span>
                                                                {b.assignedTo && (
                                                                    <span className="flex items-center gap-1">
                                                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                                                        Assigned: {b.assignedTo}
                                                                    </span>
                                                                )}
                                                                <span>By: {b.createdBy}</span>
                                                            </div>

                                                            {b.extensionNotes && (
                                                                <div className="mt-2 text-[10px] font-mono text-slate-600 bg-slate-100/80 p-2 rounded border border-slate-200 whitespace-pre-line">
                                                                    {b.extensionNotes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    {!isComplete && !isCancelled && (
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setExtendingBlock(b);
                                                                    const d = new Date(b.endDate);
                                                                    d.setDate(d.getDate() + 2);
                                                                    setExtensionNewDate(d.toISOString().slice(0, 10));
                                                                    setExtensionReason('');
                                                                }}
                                                                className="px-3 py-1.5 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <Clock className="w-3.5 h-3.5" />
                                                                Extend Date
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReleasingBlock(b);
                                                                    setReleaseReturnStatus(b.returnToStatus || 'Dirty');
                                                                    setReleaseNotes('');
                                                                }}
                                                                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Unlock / Release
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancelBlock(b)}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                                title="Cancel maintenance block"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Overdue Alert Banner in Footer */}
                {overdueCount > 0 && activeTab === 'create' && (
                    <div className="bg-rose-50 border-t border-rose-200 px-6 py-2.5 flex items-center justify-between text-xs text-rose-800">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 animate-bounce" />
                            <span>
                                <strong>{overdueCount} room(s)</strong> have exceeded their scheduled repair date! Rooms stay blocked until inspected.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveTab('list')}
                            className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            Review &amp; Unlock <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>

            {/* Sub-Modal: Extend Date Range */}
            {extendingBlock && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                                <Clock className="w-5 h-5" />
                                Extend Maintenance for Room {extendingBlock.roomNumber}
                            </div>
                            <button
                                onClick={() => setExtendingBlock(null)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-600">
                            Current End Date: <strong className="font-mono text-slate-900">{extendingBlock.endDate}</strong>
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                New Target Completion Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                min={extendingBlock.endDate}
                                value={extensionNewDate}
                                onChange={(e) => setExtensionNewDate(e.target.value)}
                                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Reason for Delay / Extension <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                rows={2}
                                placeholder="e.g. Awaiting spare compressor parts from vendor, paint drying delayed..."
                                value={extensionReason}
                                onChange={(e) => setExtensionReason(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button
                                type="button"
                                onClick={() => setExtendingBlock(null)}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleExtensionSubmit}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm cursor-pointer"
                            >
                                {loading ? 'Saving...' : 'Save Extension'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Modal: Single Release / Unlock */}
            {releasingBlock && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                <CheckCircle2 className="w-5 h-5" />
                                Unlock Room {releasingBlock.roomNumber}
                            </div>
                            <button
                                onClick={() => setReleasingBlock(null)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-600">
                            Remove maintenance lock and release Room <strong className="font-mono text-slate-900">{releasingBlock.roomNumber}</strong> back into the operational pool.
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Return Housekeeping Status
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'Dirty', label: 'Dirty (Recommended)' },
                                    { id: 'Inspected', label: 'Inspected' },
                                    { id: 'Clean', label: 'Clean' }
                                ].map(st => (
                                    <button
                                        key={st.id}
                                        type="button"
                                        onClick={() => setReleaseReturnStatus(st.id as any)}
                                        className={`py-2 px-2 text-center text-xs rounded-lg border font-semibold cursor-pointer transition-all ${releaseReturnStatus === st.id
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Work Completion / Verification Notes
                            </label>
                            <textarea
                                rows={2}
                                placeholder="e.g. AC compressor replaced and cooling verified by Engineer John..."
                                value={releaseNotes}
                                onChange={(e) => setReleaseNotes(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button
                                type="button"
                                onClick={() => setReleasingBlock(null)}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleReleaseSubmit}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
                            >
                                {loading ? 'Unlocking...' : 'Unlock & Release'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Modal: Bulk Unlock */}
            {isBulkUnlockOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                <CheckCircle2 className="w-5 h-5" />
                                Bulk Unlock {selectedBlocksForUnlock.size} Rooms
                            </div>
                            <button
                                onClick={() => setIsBulkUnlockOpen(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-600">
                            You are about to unblock <strong>{selectedBlocksForUnlock.size} rooms</strong>. This will release all locks, update the Stay View timeline, and restore inventory.
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Return Housekeeping Status for all {selectedBlocksForUnlock.size} Rooms
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'Dirty', label: 'Dirty (Recommended)' },
                                    { id: 'Inspected', label: 'Inspected' },
                                    { id: 'Clean', label: 'Clean' }
                                ].map(st => (
                                    <button
                                        key={st.id}
                                        type="button"
                                        onClick={() => setBulkUnlockReturnStatus(st.id as any)}
                                        className={`py-2 px-2 text-center text-xs rounded-lg border font-semibold cursor-pointer transition-all ${bulkUnlockReturnStatus === st.id
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Unlock Remarks / Log Entry
                            </label>
                            <textarea
                                rows={2}
                                value={bulkUnlockNotes}
                                onChange={(e) => setBulkUnlockNotes(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button
                                type="button"
                                onClick={() => setIsBulkUnlockOpen(false)}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleBulkUnlockSubmit}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
                            >
                                {loading ? 'Unlocking...' : `Confirm Bulk Unlock (${selectedBlocksForUnlock.size} Rooms)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OutOfOrderModal;
