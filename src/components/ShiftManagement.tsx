import React, { useState, useEffect } from 'react';
import PageHeader from './common/PageHeader';
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
import { getApiBaseUrl } from '../utils/apiUrl';

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

export const ShiftManagement: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state from API
    const [shifts, setShifts] = useState<WorkShift[]>([]);

    const loadShifts = async () => {
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/hrm/shifts`);
            const json = await res.json();
            if (json.success) {
                const data = json.data;
                const shiftColorMap: Record<string, string> = {
                    'Morning': 'border-amber-400 bg-amber-50 text-amber-800',
                    'Evening': 'border-blue-400 bg-blue-50 text-blue-800',
                    'Night': 'border-purple-400 bg-purple-50 text-purple-800',
                    'General': 'border-emerald-400 bg-emerald-50 text-emerald-800'
                };
                const getColor = (name: string) => {
                    if (name.toLowerCase().includes('morning') || name.toLowerCase().includes('(a)')) return shiftColorMap.Morning;
                    if (name.toLowerCase().includes('evening') || name.toLowerCase().includes('(b)')) return shiftColorMap.Evening;
                    if (name.toLowerCase().includes('night') || name.toLowerCase().includes('audit') || name.toLowerCase().includes('(c)')) return shiftColorMap.Night;
                    return shiftColorMap.General;
                };
                const getCode = (name: string) => 'SHT-' + name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);

                const mapped: WorkShift[] = data.map((s: any) => ({
                    id: s.id,
                    code: getCode(s.name),
                    name: s.name,
                    startTime: s.start_time,
                    endTime: s.end_time,
                    gracePeriodMinutes: Number(s.grace_period_minutes) || 15,
                    mandatoryCashHandover: s.name.toLowerCase().includes('night') || s.name.toLowerCase().includes('morning') || s.name.toLowerCase().includes('evening'),
                    canTriggerNightAudit: s.name.toLowerCase().includes('night') || s.name.toLowerCase().includes('audit'),
                    assignedStaffCount: Number(s.assigned_today) || 0,
                    color: getColor(s.name),
                    status: 'Active' as WorkShift['status']
                }));
                setShifts(mapped);
            }
        } catch (err) {
            console.error('Failed to load shifts:', err);
        }
    };

    useEffect(() => { loadShifts(); }, []);

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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.name) return;

        try {
            const body = {
                name: formData.name,
                startTime: formData.startTime,
                endTime: formData.endTime,
                gracePeriodMinutes: formData.gracePeriodMinutes
            };
            if (editingShift) {
                await fetch(`${getApiBaseUrl()}/api/hrm/shifts/${editingShift.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                showToast(`Work Shift "${formData.name}" updated successfully.`);
            } else {
                await fetch(`${getApiBaseUrl()}/api/hrm/shifts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                showToast(`Work Shift "${formData.name}" registered successfully.`);
            }
            await loadShifts();
        } catch (err) {
            console.error('Failed to save shift:', err);
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (id: number) => {
        const item = shifts.find(s => s.id === id);
        if (window.confirm(`Are you sure you want to delete work shift "${item?.name}"?`)) {
            try {
                await fetch(`${getApiBaseUrl()}/api/hrm/shifts/${id}`, { method: 'DELETE' });
                showToast('Work Shift removed.');
                await loadShifts();
            } catch (err) {
                console.error('Failed to delete shift:', err);
            }
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
        <div className="page-container animate-in fade-in duration-150">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            <PageHeader
                title="24/7 Work Shifts & Handover Protocols"
                subtitle="Manage hotel shift timings, attendance grace periods, cash drawer blind counts, and End-of-Day (EOD) Night Audit pipeline authorizations"
                icon={<Clock size={20} />}
                badge="24/7 Operations"
                actions={
                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="btn-primary"
                    >
                        <Plus size={14} />
                        <span>Create Work Shift</span>
                    </button>
                }
            />

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
