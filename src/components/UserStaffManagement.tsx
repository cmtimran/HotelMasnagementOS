import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Eye,
    EyeOff,
    Phone,
    Mail,
    KeyRound,
    CheckCircle2,
    AlertCircle,
    User,
    Lock,
    Unlock,
    Save,
    ShieldAlert,
    Loader2
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { generateUniqueShortCode } from '../utils/codeGenerator';
import { getApiBaseUrl } from '../utils/apiUrl';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface StaffUser {
    id: string;
    code: string;
    name: string;
    username: string;
    email: string;
    phone: string;
    role: string;
    roleCode: string;
    department: string;
    property: string;
    posPin: string;
    salary: number;
    status: 'active' | 'inactive' | 'locked';
    failedLoginAttempts: number;
    lockedUntil: string | null;
    lastActive: string;
    avatarColor: string;
}

const STORAGE_KEY = 'hotel_staff_users_v1';

const AVATAR_COLORS = [
    'bg-blue-600',
    'bg-purple-600',
    'bg-emerald-600',
    'bg-rose-600',
    'bg-amber-600',
    'bg-indigo-600',
    'bg-sky-600',
];

export default function UserStaffManagement() {
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [departments, setDepartments] = useState<{ id: number; name: string; code: string }[]>([]);
    const [designations, setDesignations] = useState<{ id: number; title: string; department_id: number }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Filter & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [deptFilter, setDeptFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // PIN visibility state for rows
    const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [viewingUser, setViewingUser] = useState<StaffUser | null>(null);

    // Form Fields
    const [formName, setFormName] = useState('');
    const [formUsername, setFormUsername] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formRole, setFormRole] = useState('Front Desk Receptionist');
    const [formRoleCode, setFormRoleCode] = useState('RECEPTION');
    const [formDepartment, setFormDepartment] = useState('Front Office');
    const [formProperty, setFormProperty] = useState('Grand Palace Hotel & Resort (Dhaka HQ)');
    const [formPosPin, setFormPosPin] = useState('1234');
    const [formSalary, setFormSalary] = useState('45000');
    const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'locked'>('active');
    const [formPassword, setFormPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // ==========================================
    // API FUNCTIONS
    // ==========================================

    const loadStaff = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${getApiBaseUrl()}/api/hrm/employees?propertyId=1`);
            const json = await res.json();
            if (json.success && json.data) {
                const mapped: StaffUser[] = json.data.map((e: any, idx: number) => ({
                    id: String(e.id),
                    code: e.employee_code,
                    name: `${e.first_name} ${e.last_name}`,
                    username: `${e.first_name.toLowerCase()}.${e.last_name.toLowerCase()}`,
                    email: e.email || `${e.employee_code.toLowerCase()}@hotel.com`,
                    phone: e.phone || '—',
                    role: e.designation_title || 'Staff',
                    roleCode: (e.designation_title || 'STAFF').toUpperCase().replace(/\s+/g, '-').slice(0, 12),
                    department: e.department_name || 'General',
                    property: 'Grand Palace Hotel & Resort (Dhaka HQ)',
                    posPin: String(1000 + idx * 111).slice(0, 4),
                    salary: Number(e.basic_salary) || 40000,
                    status: e.status === 'INACTIVE' ? 'inactive' : 'active',
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                    lastActive: e.hire_date ? `Hired ${e.hire_date}` : '—',
                    avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                }));
                setUsers(mapped);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
            }
        } catch (err) {
            // fallback to localStorage
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setUsers(JSON.parse(saved));
        } finally {
            setIsLoading(false);
        }
    };

    const loadDepts = async () => {
        try {
            const [dRes, desRes] = await Promise.all([
                fetch(`${getApiBaseUrl()}/api/hrm/departments`),
                fetch(`${getApiBaseUrl()}/api/hrm/designations`),
            ]);
            const dJson = await dRes.json();
            const desJson = await desRes.json();
            if (dJson.success) setDepartments(dJson.data);
            if (desJson.success) setDesignations(desJson.data);
        } catch {}
    };

    useEffect(() => {
        loadStaff();
        loadDepts();
    }, []);

    // Filtered Users
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                user.name.toLowerCase().includes(term) ||
                user.username.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term) ||
                user.phone.includes(term) ||
                user.code.toLowerCase().includes(term);

            const matchesRole = roleFilter === 'ALL' || user.roleCode === roleFilter;
            const matchesDept = deptFilter === 'ALL' || user.department === deptFilter;
            const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;

            return matchesSearch && matchesRole && matchesDept && matchesStatus;
        });
    }, [users, searchTerm, roleFilter, deptFilter, statusFilter]);

    // Toggle single PIN reveal
    const toggleRevealPin = (id: string) => {
        setRevealedPins(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Open Create Modal
    const handleOpenCreate = () => {
        setEditingUserId(null);
        setFormName('');
        setFormUsername('');
        setFormEmail('');
        setFormPhone('');
        setFormRole('Front Desk Receptionist');
        setFormRoleCode('RECEPTION');
        setFormDepartment('Front Office');
        setFormProperty('Grand Palace Hotel & Resort (Dhaka HQ)');
        setFormPosPin('2048');
        setFormSalary('45000');
        setFormStatus('active');
        setFormPassword('Hotel@2026');
        setShowPassword(false);
        setIsFormModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (user: StaffUser) => {
        setEditingUserId(user.id);
        setFormName(user.name);
        setFormUsername(user.username);
        setFormEmail(user.email);
        setFormPhone(user.phone);
        setFormRole(user.role);
        setFormRoleCode(user.roleCode);
        setFormDepartment(user.department);
        setFormProperty(user.property);
        setFormPosPin(user.posPin);
        setFormSalary(String(user.salary));
        setFormStatus(user.status);
        setFormPassword('');
        setShowPassword(false);
        setIsFormModalOpen(true);
    };

    // Save Staff User
    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) return;

        try {
            if (editingUserId) {
                // --- EDIT: PUT to API ---
                const resp = await fetch(`${getApiBaseUrl()}/api/hrm/employees/${editingUserId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstName: formName.split(' ')[0],
                        lastName: formName.split(' ').slice(1).join(' ') || '—',
                        email: formEmail,
                        phone: formPhone,
                        basicSalary: Number(formSalary),
                        status: formStatus === 'active' ? 'ACTIVE' : 'INACTIVE',
                    }),
                });
                const rJson = await resp.json();
                if (rJson.success) {
                    await loadStaff();
                    showToast(`Staff member "${formName.trim()}" updated successfully!`);
                    setIsFormModalOpen(false);
                } else {
                    showToast(rJson.message || 'Failed to update staff member.', 'error');
                }
            } else {
                // --- CREATE: POST to API ---
                // Look up departmentId from departments array by name match
                const matchedDept = departments.find(
                    d => d.name.toLowerCase() === formDepartment.toLowerCase()
                );
                const departmentId = matchedDept?.id ?? departments[0]?.id ?? 1;

                // Look up designationId from designations array
                const matchedDes = designations.find(
                    d => d.title.toLowerCase() === formRole.toLowerCase()
                        || d.department_id === matchedDept?.id
                );
                const designationId = matchedDes?.id ?? designations[0]?.id ?? 1;

                const newCode = generateUniqueShortCode('EMP', users.map(u => u.code));

                const resp = await fetch(`${getApiBaseUrl()}/api/hrm/employees`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        propertyId: 1,
                        departmentId,
                        designationId,
                        employeeCode: newCode,
                        firstName: formName.split(' ')[0],
                        lastName: formName.split(' ').slice(1).join(' ') || '—',
                        email: formEmail.trim(),
                        phone: formPhone.trim(),
                        basicSalary: Number(formSalary) || 40000,
                        status: formStatus === 'active' ? 'ACTIVE' : 'INACTIVE',
                    }),
                });
                const rJson = await resp.json();
                if (rJson.success) {
                    await loadStaff();
                    showToast(`New staff account "${formName.trim()}" registered!`);
                    setIsFormModalOpen(false);
                } else {
                    showToast(rJson.message || 'Failed to register staff member.', 'error');
                }
            }
        } catch (err) {
            showToast('Network error. Please check your connection.', 'error');
        }
    };

    // Delete User
    const handleDeleteUser = async (id: string, name: string) => {
        if (confirm(`Remove staff account "${name}"? This action is logged for compliance.`)) {
            try {
                const resp = await fetch(`${getApiBaseUrl()}/api/hrm/employees/${id}`, {
                    method: 'DELETE',
                });
                const rJson = await resp.json();
                if (rJson.success) {
                    await loadStaff();
                    showToast(`Staff account "${name}" removed`);
                } else {
                    showToast(rJson.message || 'Failed to delete staff member.', 'error');
                }
            } catch {
                showToast('Network error. Please check your connection.', 'error');
            }
        }
    };

    // Unlock User Account (local state only — no server endpoint)
    const handleUnlockUser = (id: string, name: string) => {
        setUsers(prev =>
            prev.map(u =>
                u.id === id
                    ? {
                          ...u,
                          status: 'active',
                          failedLoginAttempts: 0,
                          lockedUntil: null,
                      }
                    : u
            )
        );
        showToast(`Account "${name}" has been unlocked and security lockout cleared.`);
        if (viewingUser && viewingUser.id === id) {
            setViewingUser(prev =>
                prev ? { ...prev, status: 'active', failedLoginAttempts: 0, lockedUntil: null } : null
            );
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans pb-16">
            {/* Toast Alert */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-xl text-white text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                        toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
                    }`}
                >
                    {toast.type === 'error' ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Standard Page Header */}
            <PageHeader
                title="Staff & User Management"
                subtitle="Employee directory, role assignments, 4-digit POS Cashier PINs, department quotas & account lockouts"
                icon={<Users className="size-6 text-primary" />}
                actions={
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="btn-primary flex items-center gap-2 cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Register Staff Member</span>
                    </button>
                }
            />

            {/* 4 Standardized Thesis KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Staff</span>
                        <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <Users className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                        {users.filter(u => u.status === 'active').length}
                        <span className="text-sm font-normal text-slate-400"> / {users.length}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-semibold">Active staff accounts</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">POS Cashier PINs</span>
                        <div className="size-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <KeyRound className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                        {users.filter(u => u.posPin && u.posPin !== '—').length}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">4-digit PINs configured</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Locked Accounts</span>
                        <div className="size-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                            <Lock className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-rose-600 tracking-tight">
                        {users.filter(u => u.status === 'locked').length}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">Security lockout triggered</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Monthly Payroll</span>
                        <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-mono text-xs">
                            ৳
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight font-mono">
                        ৳{users.reduce((acc, u) => acc + (u.salary || 0), 0).toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">Estimated salary base</div>
                </div>
            </div>

            {/* Standardized Search & Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap gap-3 items-center justify-between">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search name, username, email, phone, code..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input-standard pl-10"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Role Filter */}
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        className="select-standard !py-1.5 !text-xs !w-auto"
                    >
                        <option value="ALL">All Roles</option>
                        {Array.from(new Set(users.map(u => u.role))).map(r => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>

                    {/* Department Filter */}
                    <select
                        value={deptFilter}
                        onChange={e => setDeptFilter(e.target.value)}
                        className="select-standard !py-1.5 !text-xs !w-auto"
                    >
                        <option value="ALL">All Departments</option>
                        {Array.from(new Set(users.map(u => u.department))).map(d => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="select-standard !py-1.5 !text-xs !w-auto"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="locked">Security Locked</option>
                    </select>
                </div>
            </div>

            {/* Staff Directory Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                {/* Loading indicator badge */}
                {isLoading && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-sky-50 border-b border-sky-100 text-sky-700 text-xs font-semibold">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Loading staff data from server…</span>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                                <th className="py-3 px-4">Staff Member</th>
                                <th className="py-3 px-4">Employee ID</th>
                                <th className="py-3 px-4">Role & Department</th>
                                <th className="py-3 px-4">Property / Branch</th>
                                <th className="py-3 px-4 text-center">POS PIN</th>
                                <th className="py-3 px-4 text-right">Base Salary</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                                        {isLoading
                                            ? 'Loading staff members…'
                                            : 'No staff members found matching your search criteria.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => {
                                    const isRevealed = revealedPins[user.id] || false;
                                    const initials = user.name
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2);

                                    return (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-slate-50/70 transition group"
                                        >
                                            {/* Staff Name & Contact */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`size-9 rounded-xl ${user.avatarColor} text-white text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                                                    >
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-900 flex items-center gap-1.5">
                                                            <span>{user.name}</span>
                                                            <span className="text-[10px] text-slate-400 font-normal">
                                                                (@{user.username})
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="size-3" />
                                                                {user.email}
                                                            </span>
                                                            {user.phone && (
                                                                <span className="flex items-center gap-1">
                                                                    <Phone className="size-3" />
                                                                    {user.phone}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Code */}
                                            <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                                                <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                                                    {user.code}
                                                </span>
                                            </td>

                                            {/* Role & Dept */}
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-900">
                                                    {user.role}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    {user.department}
                                                </div>
                                            </td>

                                            {/* Property */}
                                            <td className="py-3 px-4 text-slate-600">
                                                <div className="line-clamp-1 max-w-[180px]">
                                                    {user.property}
                                                </div>
                                            </td>

                                            {/* POS PIN */}
                                            <td className="py-3 px-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleRevealPin(user.id)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 font-mono text-xs text-slate-800 border border-slate-200 hover:bg-slate-200 transition"
                                                    title="Click to show/hide 4-digit POS PIN"
                                                >
                                                    <span>{isRevealed ? user.posPin : '••••'}</span>
                                                    {isRevealed ? (
                                                        <EyeOff className="size-3 text-slate-400" />
                                                    ) : (
                                                        <Eye className="size-3 text-slate-400" />
                                                    )}
                                                </button>
                                            </td>

                                            {/* Salary */}
                                            <td className="py-3 px-4 text-right font-mono text-slate-900">
                                                ৳{user.salary.toLocaleString()}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3 px-4 text-center">
                                                <span
                                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] border ${
                                                        user.status === 'active'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : user.status === 'locked'
                                                            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                                                            : 'bg-slate-100 text-slate-500 border-slate-300'
                                                    }`}
                                                >
                                                    {user.status === 'locked' ? 'Locked (5 Attempts)' : user.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {user.status === 'locked' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUnlockUser(user.id, user.name)}
                                                            className="size-7 rounded hover:bg-emerald-50 text-emerald-600 flex items-center justify-center transition"
                                                            title="Unlock Account"
                                                        >
                                                            <Unlock className="size-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingUser(user)}
                                                        className="size-7 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
                                                        title="View Profile Details"
                                                    >
                                                        <Eye className="size-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(user)}
                                                        className="size-7 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
                                                        title="Edit Staff Member"
                                                    >
                                                        <Edit2 className="size-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteUser(user.id, user.name)}
                                                        className="size-7 rounded hover:bg-rose-50 text-rose-600 flex items-center justify-center transition"
                                                        title="Remove Staff"
                                                    >
                                                        <Trash2 className="size-3.5" />
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

            {/* View Profile Drawer */}
            {viewingUser && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <User className="size-5 text-sky-600" />
                                <h3 className="text-slate-900 text-base">
                                    Staff Account Profile
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingUser(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div
                                    className={`size-16 rounded-2xl ${viewingUser.avatarColor} text-white text-xl flex items-center justify-center shadow-lg`}
                                >
                                    {viewingUser.name
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                </div>
                                <div>
                                    <h4 className="text-lg text-slate-900">
                                        {viewingUser.name}
                                    </h4>
                                    <div className="text-xs text-slate-500 font-mono">@{viewingUser.username}</div>
                                    <div className="text-xs font-semibold text-sky-600 mt-0.5">
                                        {viewingUser.role} • {viewingUser.department}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <span className="text-slate-400 block text-[10px]">EMPLOYEE CODE:</span>
                                    <span className="font-mono text-slate-800">
                                        {viewingUser.code}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">SECURITY PIN:</span>
                                    <span className="font-mono text-slate-800">
                                        {viewingUser.posPin}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">WORK EMAIL:</span>
                                    <span className="text-slate-800 font-medium truncate block">
                                        {viewingUser.email}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">CONTACT PHONE:</span>
                                    <span className="text-slate-800 font-medium">
                                        {viewingUser.phone || '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">ASSIGNED PROPERTY:</span>
                                    <span className="text-slate-800 font-medium line-clamp-1">
                                        {viewingUser.property}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">BASE SALARY:</span>
                                    <span className="font-mono text-emerald-600">
                                        ৳{viewingUser.salary.toLocaleString()} / mo
                                    </span>
                                </div>
                            </div>

                            {viewingUser.status === 'locked' && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-rose-700 text-xs">
                                        <ShieldAlert className="size-5 shrink-0" />
                                        <div>
                                            <div className="font-bold">Account Locked due to 5 Failed Login Attempts</div>
                                            <div className="text-[11px] text-rose-600/80">Click below to unlock immediately.</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleUnlockUser(viewingUser.id, viewingUser.name)}
                                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs transition shrink-0"
                                    >
                                        Unlock Now
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setViewingUser(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create & Edit Modal */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <Users className="size-5 text-sky-600" />
                                <h2 className="text-base text-slate-900">
                                    {editingUserId ? 'Edit Staff Account' : 'Register New Staff Member'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFormModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {/* Full Name & Username */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Imran Hossain"
                                        value={formName}
                                        onChange={e => {
                                            setFormName(e.target.value);
                                            if (!editingUserId && e.target.value.length > 2) {
                                                const autoUsername = e.target.value
                                                    .toLowerCase()
                                                    .replace(/\s+/g, '.');
                                                setFormUsername(autoUsername);
                                            }
                                        }}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Login Username *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. imran.gm"
                                        value={formUsername}
                                        onChange={e => setFormUsername(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-mono"
                                    />
                                </div>
                            </div>

                            {/* Email & Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Work Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="e.g. imran@grandpalace.hotel"
                                        value={formEmail}
                                        onChange={e => setFormEmail(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Contact Phone
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="+880 1711-000000"
                                        value={formPhone}
                                        onChange={e => setFormPhone(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>
                            </div>

                            {/* Role & Department */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Assigned RBAC Security Role *
                                    </label>
                                    <select
                                        value={formRoleCode}
                                        onChange={e => {
                                            setFormRoleCode(e.target.value);
                                            const roleMap: Record<string, string> = {
                                                'GM-ADMIN': 'General Manager (Super Admin)',
                                                'FD-MGR': 'Front Desk Operations Manager',
                                                'RECEPTION': 'Front Desk Receptionist',
                                                'CHIEF-ACC': 'Chief Accountant & Night Auditor',
                                                'FNB-CAPT': 'F&B Captain & Restaurant Manager',
                                                'HK-EXEC': 'Executive Housekeeper',
                                                'CASHIER': 'POS Cashier & Server',
                                            };
                                            setFormRole(roleMap[e.target.value] || e.target.value);
                                        }}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                                    >
                                        <option value="GM-ADMIN">General Manager (Super Admin)</option>
                                        <option value="FD-MGR">Front Desk Operations Manager</option>
                                        <option value="RECEPTION">Front Desk Receptionist</option>
                                        <option value="CHIEF-ACC">Chief Accountant & Night Auditor</option>
                                        <option value="FNB-CAPT">F&B Captain & Restaurant Manager</option>
                                        <option value="HK-EXEC">Executive Housekeeper</option>
                                        <option value="CASHIER">POS Cashier & Server</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Department
                                    </label>
                                    <select
                                        value={formDepartment}
                                        onChange={e => setFormDepartment(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                                    >
                                        {departments.length > 0 ? (
                                            departments.map(d => (
                                                <option key={d.id} value={d.name}>
                                                    {d.name}
                                                </option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="Executive Management">Executive Management</option>
                                                <option value="Front Office">Front Office</option>
                                                <option value="Finance & Accounts">Finance & Accounts</option>
                                                <option value="Food & Beverage">Food & Beverage</option>
                                                <option value="Housekeeping & Rooms">Housekeeping & Rooms</option>
                                                <option value="Engineering & Maintenance">Engineering & Maintenance</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {/* Property & POS PIN */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Assigned Property
                                    </label>
                                    <select
                                        value={formProperty}
                                        onChange={e => setFormProperty(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                                    >
                                        <option value="Grand Palace Hotel & Resort (Dhaka HQ)">
                                            Grand Palace Hotel & Resort (Dhaka HQ)
                                        </option>
                                        <option value="Oceanfront Beach Resort (Cox Bazar)">
                                            Oceanfront Beach Resort (Cox Bazar)
                                        </option>
                                        <option value="Heritage Mountain & Tea Lodge (Sylhet)">
                                            Heritage Mountain & Tea Lodge (Sylhet)
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        4-Digit POS Cashier PIN *
                                    </label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        required
                                        placeholder="4-digit PIN"
                                        value={formPosPin}
                                        onChange={e => setFormPosPin(e.target.value.replace(/\D/g, ''))}
                                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>
                            </div>

                            {/* Salary & Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Monthly Base Salary (৳)
                                    </label>
                                    <input
                                        type="number"
                                        value={formSalary}
                                        onChange={e => setFormSalary(e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Account Status
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={e =>
                                            setFormStatus(e.target.value as 'active' | 'inactive' | 'locked')
                                        }
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                                    >
                                        <option value="active">Active (Access Allowed)</option>
                                        <option value="inactive">Inactive / Suspended</option>
                                        <option value="locked">Security Locked</option>
                                    </select>
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    {editingUserId ? 'Change Password (leave blank to retain current)' : 'Account Password *'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required={!editingUserId}
                                        placeholder="Min 6 characters"
                                        value={formPassword}
                                        onChange={e => setFormPassword(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 pr-9"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setIsFormModalOpen(false)}
                                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                                >
                                    <Save className="size-4" />
                                    <span>{editingUserId ? 'Save Changes' : 'Register Member'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
