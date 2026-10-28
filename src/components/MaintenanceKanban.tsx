import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Wrench,
    AlertCircle,
    Clock,
    CheckCircle2,
    Plus,
    Layers,
    ShieldAlert,
    RefreshCw,
    X,
    Search,
    CheckSquare,
    Square,
    Sparkles,
    Check,
    Calendar,
    Settings2,
    ShieldCheck,
    Cpu,
    FileCheck
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import OutOfOrderModal from './modals/OutOfOrderModal';
import {
    type OutOfOrderBlock,
    getStoredOOOBlocks,
    releaseOOOBlock,
    cancelOOOBlock,
    extendOOOBlock,
    isBlockOverdue,
    syncOOOBlocksFromBackend
} from '../utils/outOfOrderEngine';
import { toast } from '../context/ToastContext';
import {
    type MaintenanceTask,
    type PPMProgram,
    getMaintenanceTasks,
    createMaintenanceTask,
    updateMaintenanceTaskStatus,
    getPPMPrograms,
    completePPMCycle,
    savePPMPrograms
} from '../utils/maintenanceEngine';

const MaintenanceKanban = () => {
    const [activeSection, setActiveSection] = useState<'blocks' | 'kanban' | 'ppm'>('blocks');

    // ── OOO Blocks State ──────────────────────────────────────────────────────
    const [blocks, setBlocks] = useState<OutOfOrderBlock[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOooModalOpen, setIsOooModalOpen] = useState(false);
    const [selectedOooRoom, setSelectedOooRoom] = useState<string | undefined>(undefined);

    // List filtering
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'ooo' | 'oos' | 'completed'>('active');

    // Bulk Unlock
    const [selectedBlocksForUnlock, setSelectedBlocksForUnlock] = useState<Set<string>>(new Set());
    const [isBulkUnlockOpen, setIsBulkUnlockOpen] = useState(false);
    const [bulkUnlockReturnStatus, setBulkUnlockReturnStatus] = useState<'Dirty' | 'Inspected' | 'Clean'>('Dirty');
    const [bulkUnlockNotes, setBulkUnlockNotes] = useState('Bulk unblocked & returned to service');

    // Single Extend Modal
    const [extendingBlock, setExtendingBlock] = useState<OutOfOrderBlock | null>(null);
    const [extensionNewDate, setExtensionNewDate] = useState('');
    const [extensionReason, setExtensionReason] = useState('');

    // Single Release Modal
    const [releasingBlock, setReleasingBlock] = useState<OutOfOrderBlock | null>(null);
    const [releaseReturnStatus, setReleaseReturnStatus] = useState<'Dirty' | 'Inspected' | 'Clean'>('Dirty');
    const [releaseNotes, setReleaseNotes] = useState('');

    const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

    const fetchBlocks = useCallback(async () => {
        setIsSyncing(true);
        const stored = getStoredOOOBlocks();
        setBlocks(stored);
        try {
            const synced = await syncOOOBlocksFromBackend();
            setBlocks(synced);
        } catch {
            // fallback to stored
        } finally {
            setIsSyncing(false);
        }
    }, []);

    useEffect(() => {
        fetchBlocks();
        const handleUpdate = () => fetchBlocks();
        window.addEventListener('hotel_ooo_blocks_updated', handleUpdate);
        return () => window.removeEventListener('hotel_ooo_blocks_updated', handleUpdate);
    }, [fetchBlocks]);

    // ── Kanban Tasks State ────────────────────────────────────────────────────
    const [tasks, setTasks] = useState<MaintenanceTask[]>(() => getMaintenanceTasks());
    const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskRoom, setNewTaskRoom] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<MaintenanceTask['priority']>('medium');
    const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');

    // ── PPM State ─────────────────────────────────────────────────────────────
    const [ppmPrograms, setPpmPrograms] = useState<PPMProgram[]>(() => getPPMPrograms());
    const [completingPPM, setCompletingPPM] = useState<PPMProgram | null>(null);
    const [ppmCompletedBy, setPpmCompletedBy] = useState('Duty Engineer');
    const [ppmCompletionNotes, setPpmCompletionNotes] = useState('All preventive checks passed. Service completed per SOP.');
    const [isNewPPMModalOpen, setIsNewPPMModalOpen] = useState(false);
    const [newPPMTitle, setNewPPMTitle] = useState('');
    const [newPPMCategory, setNewPPMCategory] = useState<PPMProgram['category']>('HVAC & Climate');
    const [newPPMCycleDays, setNewPPMCycleDays] = useState(30);
    const [newPPMTargetRooms, setNewPPMTargetRooms] = useState('All Guest Rooms');
    const [newPPMDesc, setNewPPMDesc] = useState('');
    const [newPPMTech, setNewPPMTech] = useState('');

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !newTaskRoom.trim()) {
            toast.error('Task title and room number are required');
            return;
        }
        const created = createMaintenanceTask({
            title: newTaskTitle.trim(),
            room: newTaskRoom.trim(),
            priority: newTaskPriority,
            assignedTo: newTaskAssignedTo.trim() || undefined,
            description: newTaskDesc.trim() || 'General maintenance required',
            source: 'frontdesk'
        });
        setTasks(getMaintenanceTasks());
        setIsNewTaskModalOpen(false);
        setNewTaskTitle('');
        setNewTaskRoom('');
        setNewTaskDesc('');
        setNewTaskAssignedTo('');
        toast.success(`Work order #${created.id} created for Room ${created.room}`);
    };

    const handleTaskStatusChange = (taskId: number | string, newStatus: MaintenanceTask['status']) => {
        updateMaintenanceTaskStatus(taskId, newStatus);
        setTasks(getMaintenanceTasks());
    };

    const handleExecutePPM = (e: React.FormEvent) => {
        e.preventDefault();
        if (!completingPPM) return;
        completePPMCycle(completingPPM.id, ppmCompletedBy, ppmCompletionNotes);
        setPpmPrograms(getPPMPrograms());
        toast.success(`PPM cycle completed: "${completingPPM.title}" — rolled to next schedule.`);
        setCompletingPPM(null);
        setPpmCompletionNotes('All preventive checks passed. Service completed per SOP.');
    };

    const handleCreatePPM = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPPMTitle.trim()) { toast.error('Program title required'); return; }
        const programs = getPPMPrograms();
        const nextDate = new Date(Date.now() + newPPMCycleDays * 86400000).toISOString().slice(0, 10);
        const newProg: PPMProgram = {
            id: `PPM-${String(programs.length + 1).padStart(3, '0')}`,
            title: newPPMTitle.trim(),
            category: newPPMCategory,
            cycleDays: newPPMCycleDays,
            targetRooms: newPPMTargetRooms.trim() || 'All Rooms',
            description: newPPMDesc.trim(),
            nextDueDate: nextDate,
            status: 'scheduled',
            assignedTechnician: newPPMTech.trim() || 'Engineering Team',
            checklist: ['Inspect asset condition', 'Perform service per manufacturer SOP', 'Log results & sign off']
        };
        savePPMPrograms([newProg, ...programs]);
        setPpmPrograms(getPPMPrograms());
        setIsNewPPMModalOpen(false);
        setNewPPMTitle(''); setNewPPMDesc(''); setNewPPMTech('');
        toast.success(`PPM scheduled: ${newProg.title}`);
    };

    // ── Single and Bulk Unlock actions ────────────────────────────────────────
    const handleSingleRelease = async () => {
        if (!releasingBlock) return;
        const res = await releaseOOOBlock(releasingBlock.id, releaseReturnStatus, 'Manager', releaseNotes.trim());
        if (res.success) {
            toast.success(res.message || 'Room unlocked and released to Housekeeping');
            setReleasingBlock(null);
            fetchBlocks();
        } else {
            toast.error(res.message || 'Failed to unlock room');
        }
    };

    const handleBulkUnlock = async () => {
        if (selectedBlocksForUnlock.size === 0) return;
        const ids = Array.from(selectedBlocksForUnlock);
        let count = 0;
        for (const id of ids) {
            const res = await releaseOOOBlock(id, bulkUnlockReturnStatus, 'Manager', bulkUnlockNotes.trim());
            if (res.success) count++;
        }
        toast.success(`Successfully unlocked ${count} room(s) as ${bulkUnlockReturnStatus}`);
        setSelectedBlocksForUnlock(new Set());
        setIsBulkUnlockOpen(false);
        fetchBlocks();
    };

    const handleSingleExtend = async () => {
        if (!extendingBlock) return;
        if (!extensionNewDate || extensionNewDate <= extendingBlock.endDate) {
            toast.error(`New date must be after current date (${extendingBlock.endDate})`);
            return;
        }
        const res = await extendOOOBlock(extendingBlock.id, extensionNewDate, extensionReason.trim(), 'Manager');
        if (res.success) {
            toast.success(res.message || 'Maintenance date extended');
            setExtendingBlock(null);
            fetchBlocks();
        } else {
            toast.error(res.message || 'Failed to extend date');
        }
    };

    const handleCancelBlockAction = async (block: OutOfOrderBlock) => {
        if (!window.confirm(`Cancel maintenance lock for Room ${block.roomNumber}? This will immediately restore the room.`)) {
            return;
        }
        const res = await cancelOOOBlock(block.id, 'Cancelled via Maintenance Hub');
        if (res.success) {
            toast.success(res.message || 'Maintenance lock cancelled');
            fetchBlocks();
        }
    };

    // ── Computed Statistics ───────────────────────────────────────────────────
    const stats = useMemo(() => {
        const active = blocks.filter(b => b.status === 'active' || b.status === 'extended');
        const overdue = active.filter(b => isBlockOverdue(b, todayStr));
        const ooo = active.filter(b => b.blockType === 'OOO');
        const oos = active.filter(b => b.blockType === 'OOS');
        return {
            totalActive: active.length,
            oooCount: ooo.length,
            oosCount: oos.length,
            overdueCount: overdue.length
        };
    }, [blocks, todayStr]);

    // ── Filtered Blocks ───────────────────────────────────────────────────────
    const filteredBlocks = useMemo(() => {
        return blocks.filter(b => {
            const matchesSearch =
                b.roomNumber.includes(searchTerm) ||
                b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (b.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                b.reasonCategory.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            const isOverdue = isBlockOverdue(b, todayStr);
            const isActive = b.status === 'active' || b.status === 'extended';

            switch (statusFilter) {
                case 'active': return isActive;
                case 'overdue': return isOverdue;
                case 'ooo': return isActive && b.blockType === 'OOO';
                case 'oos': return isActive && b.blockType === 'OOS';
                case 'completed': return b.status === 'completed' || b.status === 'cancelled';
                default: return true;
            }
        });
    }, [blocks, searchTerm, statusFilter, todayStr]);

    const getPriorityColor = (priority: MaintenanceTask['priority']) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            case 'low': return 'bg-blue-100 text-blue-700 border-blue-300';
        }
    };

    const todoTasks = tasks.filter(t => t.status === 'todo');
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    return (
        <div className="page-container">
            <PageHeader
                title="Room Maintenance & Out of Order Management" icon={<Wrench size={20} />}
                badge={
                    stats.overdueCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-bold animate-pulse">
                            <ShieldAlert size={11} /> {stats.overdueCount} Overdue
                        </span>
                    ) : (
                        <span className="badge-status-active">
                            {stats.totalActive} Rooms Blocked
                        </span>
                    )
                }
                actions={
                    <div className="flex items-center gap-2">
                        {activeSection === 'blocks' ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedOooRoom(undefined);
                                    setIsOooModalOpen(true);
                                }}
                                className="btn-primary flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                <Plus size={14} />
                                <span>Mark Maintenance Block</span>
                            </button>
                        ) : activeSection === 'ppm' ? (
                            <button
                                type="button"
                                onClick={() => setIsNewPPMModalOpen(true)}
                                className="btn-primary flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                <Plus size={14} />
                                <span>New PPM Program</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsNewTaskModalOpen(true)}
                                className="btn-primary flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                <Plus size={14} />
                                <span>New Work Order</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={fetchBlocks}
                            title="Reload maintenance blocks"
                            className="btn-secondary cursor-pointer"
                        >
                            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-primary' : 'text-slate-400'} />
                            <span>Sync</span>
                        </button>
                    </div>
                }
            />

            {/* Sub-navigation tabs (Blocks vs Kanban) */}
            <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-2xs gap-4 mb-4">
                <button
                    type="button"
                    onClick={() => setActiveSection('blocks')}
                    className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeSection === 'blocks'
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                >
                    <Layers size={14} />
                    <span>Out of Order &amp; Room Locks (OOO / OOS)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                        {stats.totalActive}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveSection('kanban')}
                    className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeSection === 'kanban'
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                >
                    <Wrench size={14} />
                    <span>Engineering Work Orders (Kanban)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                        {tasks.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveSection('ppm')}
                    className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${activeSection === 'ppm'
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                >
                    <Calendar size={14} />
                    <span>Preventive Maintenance (PPM)</span>
                    {ppmPrograms.filter(p => p.status === 'overdue' || p.status === 'due').length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 border border-rose-200 font-bold animate-pulse">
                            {ppmPrograms.filter(p => p.status === 'overdue' || p.status === 'due').length} Due
                        </span>
                    )}
                    {ppmPrograms.filter(p => p.status === 'overdue' || p.status === 'due').length === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                            {ppmPrograms.length}
                        </span>
                    )}
                </button>
            </div>

            {/* =========================================================================
                SECTION 1: OUT OF ORDER & ROOM BLOCKS (eZee PMS Front Office >> Out of Order)
               ========================================================================= */}
            {activeSection === 'blocks' && (
                <div className="space-y-4">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Blocked</p>
                                <p className="text-xl sm:text-2xl text-slate-900 mt-1">{stats.totalActive} Rooms</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Currently offline</p>
                            </div>
                            <div className="size-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                <Layers size={17} />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Out of Order (OOO)</p>
                                <p className="text-xl sm:text-2xl text-rose-600 mt-1">{stats.oooCount}</p>
                                <p className="text-[11px] text-rose-600 font-medium mt-0.5">Deducted from inventory</p>
                            </div>
                            <div className="size-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                <ShieldAlert size={17} />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Out of Service (OOS)</p>
                                <p className="text-xl sm:text-2xl text-amber-600 mt-1">{stats.oosCount}</p>
                                <p className="text-[11px] text-amber-700 font-medium mt-0.5">Minor repair / sellable</p>
                            </div>
                            <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <Wrench size={17} />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Overdue Maintenance</p>
                                <p className={`text-xl sm:text-2xl mt-1 ${stats.overdueCount > 0 ? 'text-rose-600 font-black' : 'text-emerald-600'}`}>
                                    {stats.overdueCount}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Exceeded scheduled end</p>
                            </div>
                            <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${stats.overdueCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                <AlertCircle size={17} />
                            </div>
                        </div>
                    </div>

                    {/* Filter & Action Bar */}
                    <div className="card-container !p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search room number, technician, reason..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-standard pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                                { id: 'active', label: 'Active Locks' },
                                { id: 'overdue', label: 'Overdue' },
                                { id: 'ooo', label: 'OOO Only' },
                                { id: 'oos', label: 'OOS Only' },
                                { id: 'completed', label: 'History' },
                                { id: 'all', label: 'All Records' }
                            ].map(fl => (
                                <button
                                    key={fl.id}
                                    type="button"
                                    onClick={() => setStatusFilter(fl.id as any)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${statusFilter === fl.id
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {fl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bulk Unlock Bar */}
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

                    {/* Blocked Rooms Table */}
                    <div className="table-container">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th className="w-8 pr-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const activeFiltered = filteredBlocks.filter(b => b.status === 'active' || b.status === 'extended');
                                                    if (selectedBlocksForUnlock.size === activeFiltered.length && activeFiltered.length > 0) {
                                                        setSelectedBlocksForUnlock(new Set());
                                                    } else {
                                                        setSelectedBlocksForUnlock(new Set(activeFiltered.map(b => b.id)));
                                                    }
                                                }}
                                                className="flex items-center justify-center text-slate-500 hover:text-primary cursor-pointer"
                                            >
                                                {selectedBlocksForUnlock.size === filteredBlocks.filter(b => b.status === 'active' || b.status === 'extended').length && filteredBlocks.length > 0
                                                    ? <CheckSquare size={14} className="text-primary" />
                                                    : <Square size={14} />}
                                            </button>
                                        </th>
                                        <th>Room</th>
                                        <th>Type</th>
                                        <th>Block Type</th>
                                        <th>Defect Category</th>
                                        <th>Dates (From → To)</th>
                                        <th>Assigned To</th>
                                        <th>Description</th>
                                        <th>Status</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBlocks.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="text-center py-10 text-slate-400 text-xs">
                                                <Sparkles size={20} className="mx-auto mb-2 text-slate-300" />
                                                No maintenance blocks match your current filter
                                            </td>
                                        </tr>
                                    ) : filteredBlocks.map(block => {
                                        const isOverdue = isBlockOverdue(block, todayStr);
                                        const isComplete = block.status === 'completed';
                                        const isCancelled = block.status === 'cancelled';
                                        const isSelected = selectedBlocksForUnlock.has(block.id);

                                        return (
                                            <tr
                                                key={block.id}
                                                className={`hover:bg-slate-50/80 transition-colors ${isOverdue ? 'bg-rose-50/40' : ''
                                                    }`}
                                            >
                                                <td className="pr-0" onClick={e => e.stopPropagation()}>
                                                    {!isComplete && !isCancelled && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedBlocksForUnlock(prev => {
                                                                    const next = new Set(prev);
                                                                    next.has(block.id) ? next.delete(block.id) : next.add(block.id);
                                                                    return next;
                                                                });
                                                            }}
                                                            className="flex items-center justify-center text-slate-400 hover:text-primary cursor-pointer"
                                                        >
                                                            {isSelected
                                                                ? <CheckSquare size={14} className="text-primary" />
                                                                : <Square size={14} />}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="font-mono font-bold text-slate-900">
                                                    Room {block.roomNumber}
                                                </td>
                                                <td className="text-slate-600 font-medium">
                                                    {block.roomType}
                                                </td>
                                                <td>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${block.blockType === 'OOO'
                                                        ? 'bg-rose-600 text-white'
                                                        : 'bg-amber-600 text-white'
                                                        }`}>
                                                        {block.blockType}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {block.reasonCategory}
                                                    </span>
                                                </td>
                                                <td className="font-mono text-xs text-slate-600">
                                                    {block.startDate} → {block.endDate}
                                                    {isOverdue && (
                                                        <span className="block text-[9px] font-bold text-rose-600 animate-pulse">
                                                            OVERDUE
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-slate-700 text-xs font-semibold">
                                                    {block.assignedTo || <span className="text-slate-400 italic font-normal">Unassigned</span>}
                                                </td>
                                                <td className="text-slate-500 text-xs max-w-[200px] truncate" title={block.description}>
                                                    {block.description}
                                                </td>
                                                <td>
                                                    {isComplete ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                                                            <Check size={10} /> Unlocked ({block.returnToStatus})
                                                        </span>
                                                    ) : isCancelled ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                                            Cancelled
                                                        </span>
                                                    ) : isOverdue ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white animate-pulse">
                                                            Overdue
                                                        </span>
                                                    ) : block.status === 'extended' ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                                                            Extended
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                                            Active Lock
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-right whitespace-nowrap">
                                                    {!isComplete && !isCancelled && (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setExtendingBlock(block);
                                                                    const d = new Date(block.endDate);
                                                                    d.setDate(d.getDate() + 2);
                                                                    setExtensionNewDate(d.toISOString().slice(0, 10));
                                                                    setExtensionReason('');
                                                                }}
                                                                className="btn-secondary !py-1 !px-2 !text-[11px] cursor-pointer"
                                                                title="Extend Maintenance Date"
                                                            >
                                                                <Clock size={11} />
                                                                Extend
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReleasingBlock(block);
                                                                    setReleaseReturnStatus(block.returnToStatus || 'Dirty');
                                                                    setReleaseNotes('');
                                                                }}
                                                                className="btn-primary !py-1 !px-2.5 !text-[11px] !bg-emerald-600 hover:!bg-emerald-700 cursor-pointer"
                                                                title="Unlock room and release to Housekeeping"
                                                            >
                                                                <CheckCircle2 size={11} />
                                                                Unlock
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancelBlockAction(block)}
                                                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                                                title="Cancel maintenance block"
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                SECTION 2: ENGINEERING WORK ORDERS KANBAN
               ========================================================================= */}
            {activeSection === 'kanban' && (
                <div className="space-y-4">
                    {/* Kanban Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Tasks</p>
                                <p className="text-xl sm:text-2xl text-slate-900 mt-1">{tasks.length}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Logged tickets</p>
                            </div>
                            <div className="size-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                <Wrench size={17} />
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">To Do</p>
                                <p className="text-xl sm:text-2xl text-primary mt-1">{todoTasks.length}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Awaiting dispatch</p>
                            </div>
                            <div className="size-9 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                                <AlertCircle size={17} />
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">In Progress</p>
                                <p className="text-xl sm:text-2xl text-amber-600 mt-1">{inProgressTasks.length}</p>
                                <p className="text-[11px] text-amber-600 font-medium mt-0.5">Active repairs</p>
                            </div>
                            <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <Wrench size={17} />
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Completed</p>
                                <p className="text-xl sm:text-2xl text-emerald-600 mt-1">{completedTasks.length}</p>
                                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Resolved &amp; verified</p>
                            </div>
                            <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={17} />
                            </div>
                        </div>
                    </div>

                    {/* Columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* To Do Column */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col">
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                                <h2 className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2 font-bold">
                                    <AlertCircle size={14} className="text-primary" />
                                    To Do
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-primary border border-blue-200 font-bold">{todoTasks.length}</span>
                            </div>
                            <div className="space-y-3 bg-slate-50/40 p-3.5 flex-1 min-h-[420px]">
                                {todoTasks.map(task => (
                                    <div key={task.id} className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200/90 border-l-4 border-l-primary">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-sm font-bold text-slate-900">{task.title}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-primary font-mono">Room {task.room}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 mb-3">{task.description}</p>
                                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                                            <div className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {task.createdAt}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleTaskStatusChange(task.id, 'in-progress')}
                                                className="text-xs text-indigo-600 hover:underline font-bold cursor-pointer"
                                            >
                                                Start →
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* In Progress Column */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col">
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                                <h2 className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2 font-bold">
                                    <Wrench size={14} className="text-amber-600" />
                                    In Progress
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-200 font-bold">{inProgressTasks.length}</span>
                            </div>
                            <div className="space-y-3 bg-slate-50/40 p-3.5 flex-1 min-h-[420px]">
                                {inProgressTasks.map(task => (
                                    <div key={task.id} className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200/90 border-l-4 border-l-amber-500">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-sm font-bold text-slate-900">{task.title}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-primary font-mono">Room {task.room}</span>
                                            {task.assignedTo && (
                                                <span className="text-xs text-slate-500">• Tech: {task.assignedTo}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-600 mb-3">{task.description}</p>
                                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => handleTaskStatusChange(task.id, 'todo')}
                                                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                                            >
                                                ← To Do
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleTaskStatusChange(task.id, 'completed')}
                                                className="text-xs text-emerald-600 hover:underline font-bold cursor-pointer"
                                            >
                                                Complete ✓
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Completed Column */}
                        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col">
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                                <h2 className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2 font-bold">
                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                    Completed
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">{completedTasks.length}</span>
                            </div>
                            <div className="space-y-3 bg-slate-50/40 p-3.5 flex-1 min-h-[420px]">
                                {completedTasks.map(task => (
                                    <div key={task.id} className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200/90 border-l-4 border-l-emerald-500 opacity-80">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-sm font-bold line-through text-slate-500">{task.title}</h3>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Done
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-slate-600 font-mono">Room {task.room}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-3">{task.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                SECTION 3: PLANNED PREVENTIVE MAINTENANCE (PPM)
               ========================================================================= */}
            {activeSection === 'ppm' && (
                <div className="space-y-4">
                    {/* PPM KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Programs</p>
                                <p className="text-xl sm:text-2xl text-slate-900 mt-1">{ppmPrograms.length}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Active PPM schedules</p>
                            </div>
                            <div className="size-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                <Calendar size={17} />
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Overdue</p>
                                <p className={`text-xl sm:text-2xl mt-1 ${ppmPrograms.filter(p => p.status === 'overdue').length > 0 ? 'text-rose-600 font-black' : 'text-emerald-600'}`}>
                                    {ppmPrograms.filter(p => p.status === 'overdue').length}
                                </p>
                                <p className="text-[11px] text-rose-500 font-medium mt-0.5">Past service date</p>
                            </div>
                            <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${ppmPrograms.filter(p => p.status === 'overdue').length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                <AlertCircle size={17} />
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Due This Week</p>
                                <p className="text-xl sm:text-2xl text-amber-600 mt-1">{ppmPrograms.filter(p => p.status === 'due').length}</p>
                                <p className="text-[11px] text-amber-600 font-medium mt-0.5">Within 7 days</p>
                            </div>
                            <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <Clock size={17} />
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">On Schedule</p>
                                <p className="text-xl sm:text-2xl text-emerald-600 mt-1">{ppmPrograms.filter(p => p.status === 'scheduled').length}</p>
                                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">No immediate action</p>
                            </div>
                            <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <ShieldCheck size={17} />
                            </div>
                        </div>
                    </div>

                    {/* PPM Program Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {ppmPrograms.map(prog => {
                            const isOverdue = prog.status === 'overdue';
                            const isDue = prog.status === 'due';
                            const borderColor = isOverdue ? 'border-l-rose-500' : isDue ? 'border-l-amber-500' : 'border-l-emerald-500';
                            const statusBadge = isOverdue
                                ? 'bg-rose-600 text-white animate-pulse'
                                : isDue
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                            return (
                                <div key={prog.id} className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 border-l-4 ${borderColor} flex flex-col gap-3`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-[10px] font-mono text-slate-400">{prog.id}</p>
                                            <h3 className="text-sm font-bold text-slate-900 mt-0.5">{prog.title}</h3>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0 ${statusBadge}`}>
                                            {prog.status}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-[11px]">
                                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold flex items-center gap-1">
                                            <Cpu size={10} /> {prog.category}
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                                            Every {prog.cycleDays}d
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-600 font-medium">
                                            {prog.targetRooms}
                                        </span>
                                    </div>

                                    {prog.description && (
                                        <p className="text-xs text-slate-500">{prog.description}</p>
                                    )}

                                    {/* Checklist Preview */}
                                    <div className="space-y-1">
                                        {prog.checklist.slice(0, 4).map((item, i) => (
                                            <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                                                <FileCheck size={11} className="text-slate-400 mt-0.5 shrink-0" />
                                                {item}
                                            </div>
                                        ))}
                                        {prog.checklist.length > 4 && (
                                            <p className="text-[10px] text-slate-400 italic">+{prog.checklist.length - 4} more checks…</p>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Next Service</p>
                                            <p className={`text-xs font-bold font-mono mt-0.5 ${isOverdue ? 'text-rose-600' : isDue ? 'text-amber-600' : 'text-slate-700'}`}>
                                                {prog.nextDueDate}
                                            </p>
                                            {prog.lastCompletedDate && (
                                                <p className="text-[10px] text-slate-400 mt-0.5">Last done: {prog.lastCompletedDate}</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCompletingPPM(prog);
                                                setPpmCompletedBy('Duty Engineer');
                                                setPpmCompletionNotes('All preventive checks passed. Service completed per SOP.');
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors ${isOverdue
                                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                                : isDue
                                                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                }`}
                                        >
                                            <CheckCircle2 size={12} />
                                            Execute & Complete Cycle
                                        </button>
                                    </div>
                                    {prog.assignedTechnician && (
                                        <p className="text-[10px] text-slate-400">Tech: <span className="font-semibold text-slate-600">{prog.assignedTechnician}</span></p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Out of Order Modal */}
            <OutOfOrderModal
                isOpen={isOooModalOpen}
                onClose={() => {
                    setIsOooModalOpen(false);
                    setSelectedOooRoom(undefined);
                }}
                initialRoomNumber={selectedOooRoom}
                onBlockUpdated={() => {
                    fetchBlocks();
                }}
            />

            {/* Extend Modal */}
            {extendingBlock && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                                <Clock className="w-5 h-5" />
                                Extend Maintenance for Room {extendingBlock.roomNumber}
                            </div>
                            <button onClick={() => setExtendingBlock(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-600">Current End Date: <strong className="font-mono text-slate-900">{extendingBlock.endDate}</strong></p>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">New Target Ready Date *</label>
                            <input
                                type="date"
                                min={extendingBlock.endDate}
                                value={extensionNewDate}
                                onChange={(e) => setExtensionNewDate(e.target.value)}
                                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Delay *</label>
                            <textarea
                                rows={2}
                                value={extensionReason}
                                onChange={(e) => setExtensionReason(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button type="button" onClick={() => setExtendingBlock(null)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                            <button type="button" onClick={handleSingleExtend} className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer shadow-xs">Save Extension</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Single Release Modal */}
            {releasingBlock && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                <CheckCircle2 className="w-5 h-5" />
                                Unlock Room {releasingBlock.roomNumber}
                            </div>
                            <button onClick={() => setReleasingBlock(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-600">Release Room <strong className="font-mono text-slate-900">{releasingBlock.roomNumber}</strong> back to Housekeeping &amp; active inventory.</p>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Return Housekeeping Status</label>
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
                                        className={`py-2 text-center text-xs rounded-lg border font-semibold cursor-pointer ${releaseReturnStatus === st.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                                            }`}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Completion Notes</label>
                            <textarea
                                rows={2}
                                value={releaseNotes}
                                onChange={(e) => setReleaseNotes(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button type="button" onClick={() => setReleasingBlock(null)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                            <button type="button" onClick={handleSingleRelease} className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-xs">Unlock &amp; Release</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Unlock Modal */}
            {isBulkUnlockOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                <CheckCircle2 className="w-5 h-5" />
                                Bulk Unlock {selectedBlocksForUnlock.size} Rooms
                            </div>
                            <button onClick={() => setIsBulkUnlockOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-600">Release <strong>{selectedBlocksForUnlock.size} rooms</strong> from maintenance and restore them to sellable inventory.</p>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Return Status for all Rooms</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Dirty', 'Inspected', 'Clean'].map(st => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => setBulkUnlockReturnStatus(st as any)}
                                        className={`py-2 text-center text-xs rounded-lg border font-semibold cursor-pointer ${bulkUnlockReturnStatus === st ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                                            }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                            <textarea
                                rows={2}
                                value={bulkUnlockNotes}
                                onChange={(e) => setBulkUnlockNotes(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button type="button" onClick={() => setIsBulkUnlockOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                            <button type="button" onClick={handleBulkUnlock} className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-xs">Confirm Bulk Unlock</button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Work Order Modal */}
            {isNewTaskModalOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
                    <form onSubmit={handleCreateTask} className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                                <Plus className="w-5 h-5" />
                                New Work Order
                            </div>
                            <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 204"
                                    value={newTaskRoom}
                                    onChange={(e) => setNewTaskRoom(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                                <select
                                    value={newTaskPriority}
                                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                                >
                                    <option value="urgent">Urgent</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Issue / Task Title *</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. AC leaking water on floor"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Technician</label>
                            <input
                                type="text"
                                placeholder="e.g. Ahmed (HVAC Tech)"
                                value={newTaskAssignedTo}
                                onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Defect Details</label>
                            <textarea
                                rows={2}
                                placeholder="Describe symptoms..."
                                value={newTaskDesc}
                                onChange={(e) => setNewTaskDesc(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                            <button type="submit" className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-xs">Create Ticket</button>
                        </div>
                    </form>
                </div>
            )}
            {/* PPM Execute & Complete Cycle Modal */}
            {completingPPM && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
                    <form onSubmit={handleExecutePPM} className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                                <ShieldCheck className="w-5 h-5" />
                                Complete PPM Cycle
                            </div>
                            <button type="button" onClick={() => setCompletingPPM(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 space-y-1">
                            <p className="font-bold text-slate-900">{completingPPM.title}</p>
                            <p className="text-slate-500">{completingPPM.category} · Every {completingPPM.cycleDays} days · {completingPPM.targetRooms}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Completed By *</label>
                            <input
                                type="text"
                                required
                                value={ppmCompletedBy}
                                onChange={e => setPpmCompletedBy(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                                placeholder="Technician name / ID"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Service Notes</label>
                            <textarea
                                rows={3}
                                value={ppmCompletionNotes}
                                onChange={e => setPpmCompletionNotes(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                                placeholder="Describe work done, parts replaced, findings..."
                            />
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[11px] text-blue-700">
                            <strong>Auto-Roll:</strong> Next due date will be set to <strong className="font-mono">{new Date(Date.now() + (completingPPM?.cycleDays ?? 30) * 86400000).toISOString().slice(0, 10)}</strong> ({completingPPM?.cycleDays} days from today).
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button type="button" onClick={() => setCompletingPPM(null)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                            <button type="submit" className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5">
                                <CheckCircle2 size={13} /> Confirm Cycle Completion
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* New PPM Program Modal */}
            {isNewPPMModalOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
                    <form onSubmit={handleCreatePPM} className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                                <Settings2 className="w-5 h-5" />
                                New PPM Program
                            </div>
                            <button type="button" onClick={() => setIsNewPPMModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Program Title *</label>
                            <input
                                type="text"
                                required
                                value={newPPMTitle}
                                onChange={e => setNewPPMTitle(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                                placeholder="e.g. Generator Load Test & Inspection"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                                <select
                                    value={newPPMCategory}
                                    onChange={e => setNewPPMCategory(e.target.value as PPMProgram['category'])}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none bg-white"
                                >
                                    <option>HVAC &amp; Climate</option>
                                    <option>Plumbing &amp; Water</option>
                                    <option>Electrical &amp; Power</option>
                                    <option>Furniture &amp; Fixtures</option>
                                    <option>Fire &amp; Safety</option>
                                    <option>Pest Control</option>
                                    <option>Elevators &amp; Lifts</option>
                                    <option>Exterior &amp; Grounds</option>
                                    <option>Kitchen &amp; Laundry</option>
                                    <option>General</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Cycle (Days)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={730}
                                    value={newPPMCycleDays}
                                    onChange={e => setNewPPMCycleDays(Number(e.target.value))}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Rooms / Areas</label>
                            <input
                                type="text"
                                value={newPPMTargetRooms}
                                onChange={e => setNewPPMTargetRooms(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                                placeholder="e.g. All Guest Rooms, Kitchen, Lobby"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Technician / Team</label>
                            <input
                                type="text"
                                value={newPPMTech}
                                onChange={e => setNewPPMTech(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                                placeholder="e.g. Engineering Team / Ahmed"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                            <textarea
                                rows={2}
                                value={newPPMDesc}
                                onChange={e => setNewPPMDesc(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none"
                                placeholder="Brief description of this maintenance program..."
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button type="button" onClick={() => setIsNewPPMModalOpen(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                            <button type="submit" className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5">
                                <Calendar size={13} /> Schedule PPM Program
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default MaintenanceKanban;
