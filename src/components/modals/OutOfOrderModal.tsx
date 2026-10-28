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
    Check
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

interface OutOfOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
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
    initialRoomNumber,
    initialStartDate,
    initialEndDate,
    initialBlockType = 'OOO',
    onBlockUpdated
}) => {
    const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
    const [rooms, setRooms] = useState<CanonicalRoom[]>([]);
    const [blocks, setBlocks] = useState<OutOfOrderBlock[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Form fields
    const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(initialRoomNumber || '');
    const [blockType, setBlockType] = useState<MaintenanceBlockType>(initialBlockType);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [reasonCategory, setReasonCategory] = useState<MaintenanceReasonCategory>('HVAC / AC');
    const [description, setDescription] = useState<string>('');
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [returnToStatus, setReturnToStatus] = useState<'Dirty' | 'Inspected' | 'Clean'>('Dirty');
    const [managerOverride, setManagerOverride] = useState<boolean>(false);

    // Extension modal state
    const [extendingBlock, setExtendingBlock] = useState<OutOfOrderBlock | null>(null);
    const [extensionNewDate, setExtensionNewDate] = useState<string>('');
    const [extensionReason, setExtensionReason] = useState<string>('');

    // Releasing modal state
    const [releasingBlock, setReleasingBlock] = useState<OutOfOrderBlock | null>(null);
    const [releaseReturnStatus, setReleaseReturnStatus] = useState<'Dirty' | 'Inspected' | 'Clean'>('Dirty');
    const [releaseNotes, setReleaseNotes] = useState<string>('');

    const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

    // Load initial data
    const refreshData = async () => {
        const canonical = getCanonicalRooms();
        setRooms(canonical);
        const stored = getStoredOOOBlocks();
        setBlocks(stored);

        try {
            const synced = await syncOOOBlocksFromBackend();
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
            setBlockType(initialBlockType);
            setDescription('');
            setAssignedTo('');
            setManagerOverride(false);
            setExtendingBlock(null);
            setReleasingBlock(null);
        }
    }, [isOpen, initialRoomNumber, initialStartDate, initialEndDate, initialBlockType]);

    // Selected Room details
    const selectedRoom = useMemo(() => {
        return rooms.find(r => String(r.number).trim() === String(selectedRoomNumber).trim());
    }, [rooms, selectedRoomNumber]);

    // Conflicting reservations for proposed window
    const conflicts = useMemo(() => {
        if (!selectedRoomNumber || !startDate || !endDate || startDate > endDate) return [];
        return findConflictingReservations(selectedRoomNumber, startDate, endDate);
    }, [selectedRoomNumber, startDate, endDate]);

    // Available clean rooms for reallocating conflicting bookings
    const alternativeRooms = useMemo(() => {
        if (!selectedRoom) return [];
        return rooms.filter(r =>
            r.number !== selectedRoom.number &&
            r.roomTypeName === selectedRoom.roomTypeName &&
            r.status === 'Active'
        );
    }, [rooms, selectedRoom]);

    // Handle Quick Date Chips
    const handleQuickDays = (days: number) => {
        const base = new Date(startDate || todayStr);
        base.setDate(base.getDate() + days);
        setEndDate(base.toISOString().slice(0, 10));
    };

    // Auto-Reassign Conflicting Reservation to an Alternative Clean Room
    const handleReassignBooking = async (res: StoredReservation, targetRoomNumber: string) => {
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
                specialRequests: `${allRes[idx].specialRequests || ''} [Auto-Reassigned from Room ${selectedRoomNumber} due to maintenance on ${todayStr}]`.trim()
            };
            allRes[idx] = updatedBooking;
            saveStoredReservations(allRes);

            toast.success(`Booking ${res.reservationNumber} successfully moved from Room ${selectedRoomNumber} to Room ${targetRoomNumber}`);
            refreshData();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to reassign reservation');
        } finally {
            setLoading(false);
        }
    };

    // Submit New Maintenance Block
    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoomNumber) {
            toast.error('Please select a room');
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
        if (conflicts.length > 0 && !managerOverride) {
            toast.error(`Cannot lock Room ${selectedRoomNumber}: ${conflicts.length} overlapping reservation(s) exist. Reassign them first or enable Manager Override.`);
            return;
        }

        try {
            setLoading(true);
            const res = await createOOOBlock({
                propertyId: 1,
                roomNumber: selectedRoomNumber,
                roomType: selectedRoom?.roomTypeName || 'Deluxe',
                blockType,
                startDate,
                endDate,
                reasonCategory,
                description: description.trim() || `${reasonCategory} maintenance`,
                assignedTo: assignedTo.trim() || undefined,
                returnToStatus,
                createdBy: 'Manager'
            }, managerOverride);

            if (res.success) {
                toast.success(res.message || `Room ${selectedRoomNumber} placed ${blockType}`);
                refreshData();
                onBlockUpdated?.();
                setActiveTab('list');
            } else {
                toast.error(res.message || 'Failed to place room in maintenance');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Error creating maintenance block');
        } finally {
            setLoading(false);
        }
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

    // Submit Release to Housekeeping
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

    if (!isOpen) return null;

    const activeBlocksCount = blocks.filter(b => b.status === 'active' || b.status === 'extended').length;
    const overdueCount = blocks.filter(b => isBlockOverdue(b, todayStr)).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-500/20 rounded-lg border border-rose-500/30 text-rose-400">
                            <Wrench className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold tracking-tight">Room Maintenance & Out of Order / Out of Service</h2>
                                {overdueCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {overdueCount} OVERDUE
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-300">
                                Schedule room defect closures, manage extensions, prevent illegal bookings, and release to Housekeeping.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-4 flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('create')}
                        className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                            activeTab === 'create'
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <PlusCircle className="w-4 h-4" />
                        Place Room in Maintenance (OOO / OOS)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('list')}
                        className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                            activeTab === 'list'
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Active & Overdue Maintenance
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            overdueCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                        }`}>
                            {activeBlocksCount}
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'create' ? (
                        <form onSubmit={handleCreateSubmit} className="space-y-6">
                            
                            {/* Maintenance Type Selection (OOO vs OOS) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Maintenance Classification & Inventory Impact
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setBlockType('OOO')}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            blockType === 'OOO'
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
                                            <strong>Severe defect / safety hazard</strong> (e.g. burst pipe, AC failure, window break).
                                            <br />
                                            <span className="text-rose-700 font-semibold">• Deducted from Total Sellable Room Inventory.</span>
                                            <br />
                                            <span className="text-rose-700 font-semibold">• Strictly blocked from booking & Front Desk allocation.</span>
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setBlockType('OOS')}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            blockType === 'OOS'
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
                                            <strong>Minor cosmetic / light servicing</strong> (e.g. touch-up paint, TV remote, deep carpet shampoo).
                                            <br />
                                            <span className="text-amber-800 font-medium">• NOT deducted from total inventory count.</span>
                                            <br />
                                            <span className="text-amber-800 font-medium">• Front Desk receives warning, but can sell during peak nights.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Room and Date Range */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Room Selection */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Target Room <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedRoomNumber}
                                            onChange={(e) => setSelectedRoomNumber(e.target.value)}
                                            className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
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
                                    {selectedRoom && (
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            Type: <span className="font-semibold text-slate-800">{selectedRoom.roomTypeName}</span> | Status: <span className="font-semibold text-slate-800">{selectedRoom.status}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Start Date */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Start Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                        required
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">Maintenance start</p>
                                </div>

                                {/* End Date */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Estimated Ready Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        min={startDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                        required
                                    />
                                    {/* Quick chips */}
                                    <div className="flex gap-1.5 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleQuickDays(1)}
                                            className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-medium"
                                        >
                                            +1 Day
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickDays(3)}
                                            className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-medium"
                                        >
                                            +3 Days
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickDays(7)}
                                            className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-medium"
                                        >
                                            +1 Week
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickDays(14)}
                                            className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors font-medium"
                                        >
                                            +2 Weeks
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Conflicting Bookings Interceptor */}
                            {conflicts.length > 0 && (
                                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3 animate-pulse">
                                    <div className="flex items-center gap-2 text-rose-800">
                                        <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
                                        <h4 className="text-xs font-black uppercase tracking-wider">
                                            Booking Collision Interceptor: {conflicts.length} Overlapping Reservation(s) Found!
                                        </h4>
                                    </div>
                                    <p className="text-xs text-rose-700">
                                        Guests are already booked in Room {selectedRoomNumber} during these dates! Setting this room to {blockType} will displace them.
                                        You can <strong>Auto-Move / Reassign</strong> them directly to an available clean room below:
                                    </p>

                                    <div className="space-y-2">
                                        {conflicts.map(res => (
                                            <div key={res.id} className="p-3 bg-white rounded-lg border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-2xs">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-bold text-slate-900">{res.reservationNumber}</span>
                                                        <span className="text-xs font-semibold text-slate-700">— {res.guestName}</span>
                                                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 text-blue-800 font-semibold uppercase">{res.status}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500">
                                                        Stay: <span className="font-mono">{res.checkIn}</span> to <span className="font-mono">{res.checkOut}</span>
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {alternativeRooms.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            disabled={loading}
                                                            onClick={() => handleReassignBooking(res, alternativeRooms[0].number)}
                                                            className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
                                                        >
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                            Auto-Move to Room {alternativeRooms[0].number} ({alternativeRooms[0].roomTypeName})
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                                            No vacant clean same-category room available!
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-xs font-bold text-rose-900 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={managerOverride}
                                                onChange={(e) => setManagerOverride(e.target.checked)}
                                                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-rose-300"
                                            />
                                            Manager Override (Acknowledge displaced guests & manage re-allocations manually)
                                        </label>
                                    </div>
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
                                        className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
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
                                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
                                    placeholder="Describe the exact malfunction, parts required, or renovation plan..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                    required
                                />
                            </div>

                            {/* Return-to-Service Status */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Target Status when Released back to Housekeeping
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    <label className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                                        returnToStatus === 'Dirty'
                                            ? 'border-indigo-600 bg-indigo-50/60 font-bold text-indigo-900'
                                            : 'border-slate-200 text-slate-700'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="returnToStatus"
                                            value="Dirty"
                                            checked={returnToStatus === 'Dirty'}
                                            onChange={() => setReturnToStatus('Dirty')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="text-left">
                                            <span className="block text-xs">Dirty (Recommended)</span>
                                            <span className="block text-[10px] text-slate-500 font-normal">Must be cleaned & inspected by HK</span>
                                        </div>
                                    </label>

                                    <label className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                                        returnToStatus === 'Inspected'
                                            ? 'border-indigo-600 bg-indigo-50/60 font-bold text-indigo-900'
                                            : 'border-slate-200 text-slate-700'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="returnToStatus"
                                            value="Inspected"
                                            checked={returnToStatus === 'Inspected'}
                                            onChange={() => setReturnToStatus('Inspected')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="text-left">
                                            <span className="block text-xs">Inspected</span>
                                            <span className="block text-[10px] text-slate-500 font-normal">Immediately sellable</span>
                                        </div>
                                    </label>

                                    <label className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                                        returnToStatus === 'Clean'
                                            ? 'border-indigo-600 bg-indigo-50/60 font-bold text-indigo-900'
                                            : 'border-slate-200 text-slate-700'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="returnToStatus"
                                            value="Clean"
                                            checked={returnToStatus === 'Clean'}
                                            onChange={() => setReturnToStatus('Clean')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="text-left">
                                            <span className="block text-xs">Clean</span>
                                            <span className="block text-[10px] text-slate-500 font-normal">Cleaned, pending supervisor</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || (conflicts.length > 0 && !managerOverride)}
                                    className={`px-5 py-2 text-xs font-bold text-white rounded-lg flex items-center gap-2 transition-all shadow-md ${
                                        blockType === 'OOO'
                                            ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300'
                                            : 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300'
                                    }`}
                                >
                                    <Wrench className="w-4 h-4" />
                                    {loading ? 'Processing...' : `Confirm ${blockType === 'OOO' ? 'Out of Order' : 'Out of Service'}`}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Active & Overdue List Tab */
                        <div className="space-y-4">
                            {blocks.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-semibold">No maintenance blocks active</p>
                                    <p className="text-xs text-slate-400">All rooms are currently in service.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {blocks.map(b => {
                                        const isOverdue = isBlockOverdue(b, todayStr);
                                        const isComplete = b.status === 'completed';
                                        const isCancelled = b.status === 'cancelled';

                                        return (
                                            <div
                                                key={b.id}
                                                className={`p-4 rounded-xl border transition-all ${
                                                    isOverdue
                                                        ? 'bg-rose-50/90 border-rose-300 shadow-sm'
                                                        : isComplete
                                                            ? 'bg-slate-50 border-slate-200 opacity-60'
                                                            : isCancelled
                                                                ? 'bg-slate-50 border-slate-200 opacity-50'
                                                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                                                }`}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                                                                b.blockType === 'OOO'
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
                                                                    Completed
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
                                                                className="px-3 py-1.5 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors flex items-center gap-1"
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
                                                                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Release to HK
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancelBlock(b)}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
                            className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1"
                        >
                            Review & Extend <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>

            {/* Sub-Modal: Extend Date Range */}
            {extendingBlock && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                                <Clock className="w-5 h-5" />
                                Extend Maintenance for Room {extendingBlock.roomNumber}
                            </div>
                            <button
                                onClick={() => setExtendingBlock(null)}
                                className="text-slate-400 hover:text-slate-600"
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
                                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Extension Reason / Justification <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                rows={2}
                                placeholder="e.g. Waiting for spare compressor from vendor, extra paint coat drying..."
                                value={extensionReason}
                                onChange={(e) => setExtensionReason(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setExtendingBlock(null)}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleExtensionSubmit}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-xs"
                            >
                                {loading ? 'Saving...' : 'Confirm Extension'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Modal: Release to Housekeeping */}
            {releasingBlock && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                <CheckCircle2 className="w-5 h-5" />
                                Release Room {releasingBlock.roomNumber} from Maintenance
                            </div>
                            <button
                                onClick={() => setReleasingBlock(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-600">
                            Repairs completed! Under international hotel QA standards, rooms should be sent to Housekeeping as <strong>'Dirty'</strong> for deep clean and supervisor inspection before guest check-in.
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Return Housekeeping Status
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <label className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 ${
                                    releaseReturnStatus === 'Dirty' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-200'
                                }`}>
                                    <input
                                        type="radio"
                                        name="relStatus"
                                        checked={releaseReturnStatus === 'Dirty'}
                                        onChange={() => setReleaseReturnStatus('Dirty')}
                                    />
                                    Dirty (Clean & Inspect)
                                </label>
                                <label className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 ${
                                    releaseReturnStatus === 'Inspected' ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-200'
                                }`}>
                                    <input
                                        type="radio"
                                        name="relStatus"
                                        checked={releaseReturnStatus === 'Inspected'}
                                        onChange={() => setReleaseReturnStatus('Inspected')}
                                    />
                                    Inspected (Ready to Sell)
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Completion Notes
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Repaired AC coil, tested cold air 18°C OK."
                                value={releaseNotes}
                                onChange={(e) => setReleaseNotes(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setReleasingBlock(null)}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleReleaseSubmit}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                            >
                                {loading ? 'Releasing...' : 'Release Room'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default OutOfOrderModal;
