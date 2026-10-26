import React, { useState, useEffect } from 'react';
import PageHeader from './common/PageHeader';
import {
    Building2,
    Plus,
    Edit2,
    Trash2,
    Check,
    CheckCircle2,
    X,
    Search,
    Users,
    DollarSign,
    Briefcase
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/apiUrl';

export interface Department {
    id: number;
    code: string;
    name: string;
    hodName: string;
    costCenterCode: string;
    type: 'Operational (Revenue Generating)' | 'Support & Administration';
    staffCount: number;
    monthlyBudgetBDT: number;
    status: 'Active' | 'Inactive';
}

export const DepartmentManagement: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('ALL');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state from API
    const [departments, setDepartments] = useState<Department[]>([]);

    const loadDepartments = async () => {
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/hrm/departments`);
            const json = await res.json();
            if (json.success) {
                const data = json.data;
                const mapped: Department[] = data.map((d: any) => ({
                    id: d.id,
                    code: d.code,
                    name: d.name,
                    hodName: d.hod_name || '—',
                    costCenterCode: d.cost_center_code || `CC-${d.code}`,
                    type: d.department_type === 'SUPPORT' ? 'Support & Administration' : 'Operational (Revenue Generating)',
                    staffCount: Number(d.active_employees) || 0,
                    monthlyBudgetBDT: Number(d.monthly_budget) || 500000,
                    status: d.status === 'INACTIVE' ? 'Inactive' : 'Active'
                }));
                setDepartments(mapped);
            }
        } catch (err) {
            console.error('Failed to load departments:', err);
        }
    };

    useEffect(() => { loadDepartments(); }, []);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        hodName: '',
        costCenterCode: 'CC-101',
        type: 'Operational (Revenue Generating)' as Department['type'],
        staffCount: 10,
        monthlyBudgetBDT: 500000,
        status: 'Active' as Department['status']
    });

    const handleOpenAdd = () => {
        setEditingDepartment(null);
        setFormData({
            code: `DPT-${Date.now().toString().slice(-3)}`,
            name: '',
            hodName: '',
            costCenterCode: `CC-${(100 + departments.length * 10)}`,
            type: 'Operational (Revenue Generating)',
            staffCount: 10,
            monthlyBudgetBDT: 500000,
            status: 'Active'
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (dept: Department) => {
        setEditingDepartment(dept);
        setFormData({
            code: dept.code,
            name: dept.name,
            hodName: dept.hodName,
            costCenterCode: dept.costCenterCode,
            type: dept.type,
            staffCount: dept.staffCount,
            monthlyBudgetBDT: dept.monthlyBudgetBDT,
            status: dept.status
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.name) return;

        try {
            const body = { code: formData.code, name: formData.name, costCenterCode: formData.costCenterCode };
            if (editingDepartment) {
                await fetch(`${getApiBaseUrl()}/api/hrm/departments/${editingDepartment.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                showToast(`Department "${formData.name}" updated successfully.`);
            } else {
                await fetch(`${getApiBaseUrl()}/api/hrm/departments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                showToast(`Department "${formData.name}" created successfully.`);
            }
            await loadDepartments();
        } catch (err) {
            console.error('Failed to save department:', err);
        }
        setIsModalOpen(false);
    };

    const handleDelete = async (id: number) => {
        const item = departments.find(d => d.id === id);
        if (window.confirm(`Are you sure you want to delete department "${item?.name}"?`)) {
            try {
                await fetch(`${getApiBaseUrl()}/api/hrm/departments/${id}`, { method: 'DELETE' });
                showToast('Department removed.');
                await loadDepartments();
            } catch (err) {
                console.error('Failed to delete department:', err);
            }
        }
    };

    const handleToggleStatus = (id: number) => {
        setDepartments(prev =>
            prev.map(d => d.id === id ? { ...d, status: d.status === 'Active' ? 'Inactive' : 'Active' } : d)
        );
        const item = departments.find(d => d.id === id);
        showToast(`${item?.name} is now ${item?.status === 'Active' ? 'Inactive' : 'Active'}.`);
    };

    // Filter
    const filteredDepartments = departments.filter(dept => {
        const matchesType = selectedType === 'ALL' || dept.type.includes(selectedType);
        const matchesQuery =
            dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dept.hodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dept.costCenterCode.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesQuery;
    });

    const totalStaff = departments.reduce((acc, d) => acc + d.staffCount, 0);
    const totalBudget = departments.reduce((acc, d) => acc + d.monthlyBudgetBDT, 0);
    const operationalCount = departments.filter(d => d.type.includes('Operational')).length;
    const supportCount = departments.filter(d => d.type.includes('Support')).length;

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
                title="Hotel Department & Cost Center Management"
                subtitle="Organize operational divisions, administrative cost centers, department heads (HODs), staffing quotas, and monthly operating expense budgets"
                icon={<Building2 size={20} />}
                badge="USALI Cost Centers"
                actions={
                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="btn-primary"
                    >
                        <Plus size={14} />
                        <span>Add Department</span>
                    </button>
                }
            />

            {/* KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Total Hotel Departments</span>
                        <div className="text-xl text-gray-900 mt-0.5">{departments.length} Divisions</div>
                        <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                            <Check size={11} /> {operationalCount} Revenue • {supportCount} Support
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Building2 size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Total Assigned Workforce</span>
                        <div className="text-xl text-gray-900 mt-0.5">{totalStaff} Personnel</div>
                        <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                            Active Roster Coverage
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Users size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Total Monthly Operating Budget</span>
                        <div className="text-xl text-gray-900 mt-0.5">৳ {(totalBudget / 1000000).toFixed(2)}M BDT</div>
                        <span className="text-[10px] text-purple-600 font-semibold mt-0.5 block">
                            Monthly OPEX Allocation
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                        <DollarSign size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Cost Centers Registered</span>
                        <div className="text-xl text-gray-900 mt-0.5">{departments.length} CC Codes</div>
                        <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">
                            Mapped to General Ledger
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                        <Briefcase size={18} />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setSelectedType('ALL')}
                        className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${selectedType === 'ALL' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        All Departments ({departments.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedType('Operational')}
                        className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${selectedType === 'Operational' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Operational (Revenue Generating) ({operationalCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedType('Support')}
                        className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${selectedType === 'Support' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Support & Administration ({supportCount})
                    </button>
                </div>

                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search department, HOD, CC..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white outline-none w-56 lg:w-64 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden text-xs">
                <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 size={14} className="text-blue-700" />
                        <span>Hotel Operating & Administrative Departments</span>
                    </h2>
                    <span className="text-[11px] text-gray-500">
                        {filteredDepartments.length} divisions listed
                    </span>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left min-w-[850px]">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] text-gray-500 uppercase tracking-wider">
                                <th className="px-3.5 py-2.5">Code</th>
                                <th className="px-3.5 py-2.5">Department Name</th>
                                <th className="px-3.5 py-2.5">Head of Department (HOD)</th>
                                <th className="px-3.5 py-2.5">Cost Center</th>
                                <th className="px-3.5 py-2.5">Classification</th>
                                <th className="px-3.5 py-2.5">Staff Count</th>
                                <th className="px-3.5 py-2.5">Monthly Budget</th>
                                <th className="px-3.5 py-2.5">Status</th>
                                <th className="px-3.5 py-2.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredDepartments.map(dept => (
                                <tr key={dept.id} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-3.5 py-2.5 font-mono text-blue-700">{dept.code}</td>
                                    <td className="px-3.5 py-2.5 font-semibold text-gray-900">{dept.name}</td>
                                    <td className="px-3.5 py-2.5 text-gray-700 font-medium">{dept.hodName}</td>
                                    <td className="px-3.5 py-2.5 font-mono">
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-[10.5px]">
                                            {dept.costCenterCode}
                                        </span>
                                    </td>
                                    <td className="px-3.5 py-2.5">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${dept.type.includes('Operational') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                            {dept.type.includes('Operational') ? 'Revenue Center' : 'Support Center'}
                                        </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-gray-900">
                                        {dept.staffCount} Staff
                                    </td>
                                    <td className="px-3.5 py-2.5 font-mono text-gray-800">
                                        ৳ {dept.monthlyBudgetBDT.toLocaleString()}
                                    </td>
                                    <td className="px-3.5 py-2.5">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleStatus(dept.id)}
                                            className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer transition-colors ${dept.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}
                                        >
                                            {dept.status}
                                        </button>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(dept)}
                                                className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                title="Edit Department"
                                            >
                                                <Edit2 size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(dept.id)}
                                                className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                                title="Delete Department"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: ADD / EDIT DEPARTMENT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                            <h3 className="text-xs text-gray-900 flex items-center gap-2">
                                <Building2 size={15} className="text-blue-700" />
                                <span>{editingDepartment ? 'Edit Department Details' : 'Register New Department'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Department Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. FO, HK, FNB"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Cost Center Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.costCenterCode}
                                        onChange={e => setFormData({ ...formData, costCenterCode: e.target.value.toUpperCase() })}
                                        placeholder="e.g. CC-101"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Department Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Front Office & Guest Services"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Head of Department (HOD) *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.hodName}
                                    onChange={e => setFormData({ ...formData, hodName: e.target.value })}
                                    placeholder="e.g. Md. Rafiqul Islam (FOM)"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Operational Classification *</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                >
                                    <option value="Operational (Revenue Generating)">Operational (Revenue Generating / Guest Facing)</option>
                                    <option value="Support & Administration">Support & Administration (Overhead Cost Center)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Allocated Staff Count</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formData.staffCount}
                                        onChange={e => setFormData({ ...formData, staffCount: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-gray-900"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Monthly Budget (BDT ৳)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={formData.monthlyBudgetBDT}
                                        onChange={e => setFormData({ ...formData, monthlyBudgetBDT: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={formData.status === 'Active'}
                                        onChange={e => setFormData({ ...formData, status: e.target.checked ? 'Active' : 'Inactive' })}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Active Status</span>
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
                                    className="h-8 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-2xs"
                                >
                                    {editingDepartment ? 'Update Department' : 'Save Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentManagement;
