import React, { useState, useEffect } from 'react';
import {
    Clock,
    Plus,
    Edit2,
    Trash2,
    Check,
    CheckCircle2,
    X,
    Search,
    Shield,
    Users,
    Moon,
    Sun,
    Sunset,
    Briefcase,
    AlertCircle
} from 'lucide-react';

export interface WorkShift {
    id: number;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
    gracePeriodMinutes: number;
    mandatoryCashHandover: boolean;
    canTriggerNightAudit: boolean;
    assignedStaffCount: number;
    color: string;
    status: 'Active' | 'Inactive';
}

const INITIAL_SHIFTS: WorkShift[] = [
    { id: 1, code: 'SHT-MOR', name: 'Morning Shift', startTime: '07:00', endTime: '15:30', gracePeriodMinutes: 15, mandatoryCashHandover: true, canTriggerNightAudit: false, assignedStaffCount: 42, color: 'border-amber-400 bg-amber-50 text-amber-800', status: 'Active' },
    { id: 2, code: 'SHT-EVE', name: 'Evening / Swing Shift', startTime: '15:00', endTime: '23:30', gracePeriodMinutes: 15, mandatoryCashHandover: true, canTriggerNightAudit: false, assignedStaffCount: 38, color: 'border-blue-400 bg-blue-50 text-blue-800', status: 'Active' },
    { id: 3, code: 'SHT-NGT', name: 'Night Audit / Graveyard Shift', startTime: '23:00', endTime: '07:30', gracePeriodMinutes: 10, mandatoryCashHandover: true, canTriggerNightAudit: true, assignedStaffCount: 14, color: 'border-purple-400 bg-purple-50 text-purple-800', status: 'Active' },
    { id: 4, code: 'SHT-DAY', name: 'General Administration Day Shift', startTime: '09:00', endTime: '18:00', gracePeriodMinutes: 20, mandatoryCashHandover: false, canTriggerNightAudit: false, assignedStaffCount: 26, color: 'border-emerald-400 bg-emerald-50 text-emerald-800', status: 'Active' }
];

export const ShiftManagement: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state from localStorage
    const [shifts, setShifts] = useState<WorkShift[]>(() => {
        const saved = localStorage.getItem('master_shifts_v2');
        return saved ? JSON.parse(saved) : INITIAL_SHIFTS;
    });

    useEffect(() => {
        localStorage.setItem('master_shifts_v2', JSON.stringify(shifts));
    }, [shifts]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        startTime: '08:00',
        endTime: '16:30',
        gracePeriodMinutes: 15,
        mandatoryCashHandover: true,
        canTriggerNightAudit: false,
        assignedStaffCount: 20,
        color: 'border-blue-400 bg-blue-50 text-blue-800',
        status: 'Active' as WorkShift['status']
    });

    const handleOpenAdd = () => {
        setEditingShift(null);
        setFormData({
            code: `SHT-${Date.now().toString().slice(-3)}`,
            name: '',
            startTime: '08:00',
            endTime: '16:30',
            gracePeriodMinutes: 15,
            mandatoryCashHandover: true,
            canTriggerNightAudit: false,
            assignedStaffCount: 15,
            color: 'border-blue-400 bg-blue-50 text-blue-800',
            status: 'Active'
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (shift: WorkShift) => {
        setEditingShift(shift);
        setFormData({
            code: shift.code,
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            gracePeriodMinutes: shift.gracePeriodMinutes,
            mandatoryCashHandover: shift.mandatoryCashHandover,
            canTriggerNightAudit: shift.canTriggerNightAudit,
            assignedStaffCount: shift.assignedStaffCount,
            color: shift.color,
            status: shift.status
        });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.name) return;

        if (editingShift) {
            setShifts(prev =>
                prev.map(s => s.id === editingShift.id ? { ...s, ...formData } : s)
            );
            showToast(`Work Shift "${formData.name}" updated successfully.`);
        } else {
            const newShift: WorkShift = {
                id: Date.now(),
                ...formData
            };
            setShifts(prev => [...prev, newShift]);
            showToast(`Work Shift "${newShift.name}" registered successfully.`);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: number) => {
        const item = shifts.find(s => s.id === id);
        if (window.confirm(`Are you sure you want to delete work shift "${item?.name}"?`)) {
            setShifts(prev => prev.filter(s => s.id !== id));
            showToast('Work Shift removed.');
        }
    };

    const handleToggleStatus = (id: number) => {
        setShifts(prev =>
            prev.map(s => s.id === id ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s)
        );
        const item = shifts.find(s => s.id === id);
        showToast(`${item?.name} is now ${item?.status === 'Active' ? 'Inactive' : 'Active'}.`);
    };

    const getShiftIcon = (code: string) => {
        if (code.includes('MOR')) return <Sun size={15} className="text-amber-500" />;
        if (code.includes('EVE')) return <Sunset size={15} className="text-blue-500" />;
        if (code.includes('NGT')) return <Moon size={15} className="text-purple-500" />;
        return <Briefcase size={15} className="text-emerald-500" />;
    };

    // Filter
    const filteredShifts = shifts.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.startTime.includes(searchQuery) ||
        s.endTime.includes(searchQuery)
    );

    const totalStaffAssigned = shifts.reduce((acc, s) => acc + s.assignedStaffCount, 0);
    const nightAuditShifts = shifts.filter(s => s.canTriggerNightAudit).length;
    const cashHandoverShifts = shifts.filter(s => s.mandatoryCashHandover).length;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-150">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start md:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-md flex-shrink-0">
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                                24/7 Work Shifts & Handover Protocols
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                24/7 Operations
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Blind Cash Drop
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Manage hotel shift timings, attendance grace periods, cash drawer blind counts, and End-of-Day (EOD) Night Audit pipeline authorizations.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="h-8 px-3.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer self-start md:self-auto"
                >
                    <Plus size={14} />
                    <span>+ Create Work Shift</span>
                </button>
            </div>

            {/* KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Active Hotel Shifts</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{shifts.length} Rotations</div>
                        <span className="text-[10px] text-purple-600 font-semibold flex items-center gap-1 mt-0.5">
                            <Check size={11} /> 100% 24/7 Continuous
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                        <Clock size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Total Roster Capacity</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{totalStaffAssigned} Staff</div>
                        <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
                            Scheduled on Rotations
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Users size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Cash Handover Enforced</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{cashHandoverShifts} Shifts</div>
                        <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                            Mandatory Drawer Drop
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Shield size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Night Audit EOD Trigger</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{nightAuditShifts} Authorized</div>
                        <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">
                            Graveyard Shift Security
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                        <Moon size={18} />
                    </div>
                </div>
            </div>

            {/* Visual 24-Hour Timeline Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={14} className="text-purple-600" />
                        <span>24-Hour Continuous Shift Timeline & Overlap Map</span>
                    </h2>
                    <span className="text-[11px] text-gray-500">
                        30-minute handover buffers prevent front desk unattended periods
                    </span>
                </div>

                <div className="relative pt-6 pb-2">
                    {/* Time ticks 00:00 to 24:00 */}
                    <div className="flex justify-between text-[10px] font-mono font-bold text-gray-400 border-b border-gray-200 pb-1">
                        <span>00:00</span>
                        <span>04:00</span>
                        <span>08:00</span>
                        <span>12:00</span>
                        <span>16:00</span>
                        <span>20:00</span>
                        <span>24:00</span>
                    </div>

                    <div className="space-y-2 mt-3">
                        {shifts.map(shift => (
                            <div key={shift.id} className="flex items-center gap-2">
                                <span className="w-28 font-medium text-gray-800 text-[11px] truncate flex items-center gap-1">
                                    {getShiftIcon(shift.code)}
                                    {shift.name}
                                </span>
                                <div className="flex-1 bg-gray-100 h-6 rounded-md relative overflow-hidden flex items-center px-2">
                                    <div
                                        className={`absolute h-5 rounded flex items-center px-2 font-mono text-[10px] font-bold shadow-2xs ${shift.code.includes('MOR') ? 'bg-amber-400 text-amber-950 left-[29%] w-[35%]' : shift.code.includes('EVE') ? 'bg-blue-400 text-blue-950 left-[62%] w-[35%]' : shift.code.includes('NGT') ? 'bg-purple-400 text-purple-950 left-[0%] w-[31%]' : 'bg-emerald-400 text-emerald-950 left-[37.5%] w-[37.5%]'}`}
                                    >
                                        <span>{shift.startTime} - {shift.endTime}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search Filter */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">
                    Showing {filteredShifts.length} of {shifts.length} Work Shifts
                </span>
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search shifts by name or time..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white outline-none w-56 lg:w-64 focus:border-purple-500"
                    />
                </div>
            </div>

            {/* Shift Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                {filteredShifts.map(s => (
                    <div
                        key={s.id}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between space-y-3 relative group bg-white shadow-2xs ${s.color.split(' ')[0]}`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold uppercase bg-white/90 px-2 py-0.5 rounded shadow-2xs border border-gray-200 text-gray-800">
                                {s.code}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    onClick={() => handleOpenEdit(s)}
                                    className="p-1 text-gray-500 hover:text-purple-700 rounded transition-colors"
                                    title="Edit Shift"
                                >
                                    <Edit2 size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(s.id)}
                                    className="p-1 text-gray-500 hover:text-rose-700 rounded transition-colors"
                                    title="Delete Shift"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-1.5">
                                {getShiftIcon(s.code)}
                                <h3 className="font-bold text-gray-900 text-sm">{s.name}</h3>
                            </div>
                            <div className="font-mono text-sm font-bold text-gray-900 mt-1">
                                {s.startTime} - {s.endTime}
                            </div>
                            <div className="text-[10.5px] text-gray-500 mt-0.5 flex items-center gap-1">
                                <AlertCircle size={11} className="text-gray-400" />
                                <span>Attendance Grace: {s.gracePeriodMinutes} mins</span>
                            </div>
                        </div>

                        <div className="pt-2.5 border-t border-gray-100 text-[11px] space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Cash Handover:</span>
                                <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${s.mandatoryCashHandover ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                                    {s.mandatoryCashHandover ? 'Mandatory' : 'Optional'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500">Night Audit Trigger:</span>
                                <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${s.canTriggerNightAudit ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-400'}`}>
                                    {s.canTriggerNightAudit ? 'Authorized (EOD)' : 'Restricted'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                <span className="text-gray-500">Staff Assigned:</span>
                                <span className="font-bold text-gray-900">{s.assignedStaffCount} Personnel</span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[10.5px] text-gray-500">Shift Status</span>
                            <button
                                type="button"
                                onClick={() => handleToggleStatus(s.id)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${s.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}
                            >
                                {s.status}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL: ADD / EDIT WORK SHIFT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                <Clock size={15} className="text-purple-600" />
                                <span>{editingShift ? 'Edit Work Shift Parameters' : 'Create New Work Shift'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Shift Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. SHT-MOR, SHT-EVE"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Grace Period (Minutes) *</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={60}
                                        value={formData.gracePeriodMinutes}
                                        onChange={e => setFormData({ ...formData, gracePeriodMinutes: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Shift Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Morning Shift (Front Office & Dining)"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Start Time (24h) *</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.startTime}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">End Time (24h) *</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.endTime}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Allocated Staff Personnel</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.assignedStaffCount}
                                        onChange={e => setFormData({ ...formData, assignedStaffCount: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-bold text-gray-900"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Card Theme Color</label>
                                    <select
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        <option value="border-amber-400 bg-amber-50 text-amber-800">Amber (Morning / Sun)</option>
                                        <option value="border-blue-400 bg-blue-50 text-blue-800">Blue (Evening / Swing)</option>
                                        <option value="border-purple-400 bg-purple-50 text-purple-800">Purple (Night / Graveyard)</option>
                                        <option value="border-emerald-400 bg-emerald-50 text-emerald-800">Emerald (Day Admin)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 pt-1 border-t border-gray-100">
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={formData.mandatoryCashHandover}
                                        onChange={e => setFormData({ ...formData, mandatoryCashHandover: e.target.checked })}
                                        className="rounded text-purple-600 focus:ring-purple-500"
                                    />
                                    <span>Mandatory Cash Drawer Blind Count Handover</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={formData.canTriggerNightAudit}
                                        onChange={e => setFormData({ ...formData, canTriggerNightAudit: e.target.checked })}
                                        className="rounded text-purple-600 focus:ring-purple-500"
                                    />
                                    <span>Authorize Night Audit End-of-Day (EOD) Trigger</span>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-8 px-3.5 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-2xs"
                                >
                                    {editingShift ? 'Update Shift' : 'Save Shift'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftManagement;
