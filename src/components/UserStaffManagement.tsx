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
    Loader2,
    ArrowUpDown,
    Download,
    Printer,
    RefreshCw,
    Copy,
    Check,
    Clock,
    Briefcase,
    Building2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { generateUniqueShortCode } from '../utils/codeGenerator';
import { getApiBaseUrl, getActivePropertyId } from '../utils/apiUrl';

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
    shift?: string;
    shiftTime?: string;
}

type SortColumn = 'name' | 'code' | 'department' | 'role' | 'salary' | 'status';
type SortDirection = 'asc' | 'desc';

const STORAGE_KEY = 'hotel_staff_users_v1';

const AVATAR_COLORS = [
    'bg-blue-600',
    'bg-purple-600',
    'bg-emerald-600',
    'bg-rose-600',
    'bg-amber-600',
    'bg-indigo-600',
    'bg-sky-600',
    'bg-teal-600'
];

// Helper to color-code departments
const getDeptBadgeStyle = (deptName: string = '') => {
    const d = deptName.toLowerCase();
    if (d.includes('front') || d.includes('reception')) {
        return 'bg-blue-50 text-blue-700 border-blue-200/80';
    }
    if (d.includes('housekeeping') || d.includes('room')) {
        return 'bg-rose-50 text-rose-700 border-rose-200/80';
    }
    if (d.includes('food') || d.includes('beverage') || d.includes('kitchen') || d.includes('restaurant')) {
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
    }
    if (d.includes('finance') || d.includes('account')) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    }
    if (d.includes('executive') || d.includes('management') || d.includes('admin')) {
        return 'bg-purple-50 text-purple-700 border-purple-200/80';
    }
    if (d.includes('engineer') || d.includes('maintenance') || d.includes('it')) {
        return 'bg-cyan-50 text-cyan-700 border-cyan-200/80';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
};

export default function UserStaffManagement() {
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [departments, setDepartments] = useState<{ id: number; name: string; code: string }[]>([]);
    const [designations, setDesignations] = useState<{ id: number; title: string; department_id: number }[]>([]);
    const [shifts, setShifts] = useState<{ id: number; name: string; start_time: string; end_time: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Filter & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [deptFilter, setDeptFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive' | 'locked'>('ALL');

    // Sorting
    const [sortColumn, setSortColumn] = useState<SortColumn>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Multi-Selection for Bulk Actions
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // PIN visibility state for rows
    const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
    const [copiedPinId, setCopiedPinId] = useState<string | null>(null);

    // Modal & Slide-Over Drawer States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [viewingUser, setViewingUser] = useState<StaffUser | null>(null);
    const [drawerTab, setDrawerTab] = useState<'overview' | 'credentials' | 'payroll'>('overview');

    // Form Fields
    const [formName, setFormName] = useState('');
    const [formUsername, setFormUsername] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formRole, setFormRole] = useState('Front Desk Receptionist');
    const [formRoleCode, setFormRoleCode] = useState('RECEPTION');
    const [formDepartment, setFormDepartment] = useState('Front Office');
    const [formProperty, setFormProperty] = useState('Grand Palace Hotel & Resort (Dhaka HQ)');
    const [formPosPin, setFormPosPin] = useState('2048');
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
            const propId = getActivePropertyId();
            const res = await fetch(`${getApiBaseUrl()}/api/hrm/employees?propertyId=${propId}`);
            const json = await res.json();
            if (json.success && json.data) {
                const shiftPresets = [
                    { name: 'Morning Shift', time: '07:00 - 15:30' },
                    { name: 'Evening Shift', time: '15:00 - 23:30' },
                    { name: 'Night Shift', time: '23:00 - 07:30' },
                    { name: 'General Shift', time: '09:00 - 18:00' }
                ];

                const mapped: StaffUser[] = json.data.map((e: any, idx: number) => {
                    const preset = shiftPresets[idx % shiftPresets.length];
                    return {
                        id: String(e.id),
                        code: e.employee_code || `EMP-${String(e.id).padStart(3, '0')}`,
                        name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Staff Member',
                        username: `${(e.first_name || 'staff').toLowerCase()}.${(e.last_name || 'user').toLowerCase()}`,
                        email: e.email || `${(e.employee_code || 'emp').toLowerCase()}@grandpalace.hotel`,
                        phone: e.phone || '—',
                        role: e.designation_title || 'Staff Officer',
                        roleCode: (e.designation_title || 'STAFF').toUpperCase().replace(/\s+/g, '-').slice(0, 12),
                        department: e.department_name || 'General',
                        property: e.property_name || 'Grand Palace Hotel & Resort (Dhaka HQ)',
                        posPin: String(1000 + idx * 111).slice(0, 4),
                        salary: Number(e.basic_salary) || 45000,
                        status: e.status === 'INACTIVE' ? 'inactive' : 'active',
                        failedLoginAttempts: 0,
                        lockedUntil: null,
                        lastActive: e.hire_date ? `Hired ${e.hire_date}` : 'Active Today',
                        avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                        shift: preset.name,
                        shiftTime: preset.time
                    };
                });
                setUsers(mapped);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
            }
        } catch (err) {
            // fallback to localStorage
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    setUsers(JSON.parse(saved));
                } catch {}
            }
        } finally {
            setIsLoading(false);
        }
    };

    const loadDeptsAndShifts = async () => {
        try {
            const [dRes, desRes, sRes] = await Promise.all([
                fetch(`${getApiBaseUrl()}/api/hrm/departments`),
                fetch(`${getApiBaseUrl()}/api/hrm/designations`),
                fetch(`${getApiBaseUrl()}/api/hrm/shifts`).catch(() => null)
            ]);
            const dJson = await dRes.json();
            const desJson = await desRes.json();
            if (dJson.success) setDepartments(dJson.data);
            if (desJson.success) setDesignations(desJson.data);

            if (sRes) {
                const sJson = await sRes.json();
                if (sJson.success && sJson.data) setShifts(sJson.data);
            }
        } catch {}
    };

    useEffect(() => {
        loadStaff();
        loadDeptsAndShifts();
    }, []);

    // Handle Column Sort
    const handleSort = (col: SortColumn) => {
        if (sortColumn === col) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(col);
            setSortDirection('asc');
        }
    };

    // Filtered & Sorted Users
    const processedUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        const filtered = users.filter(user => {
            const matchesSearch =
                !term ||
                user.name.toLowerCase().includes(term) ||
                user.username.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term) ||
                user.phone.includes(term) ||
                user.code.toLowerCase().includes(term) ||
                user.department.toLowerCase().includes(term) ||
                user.role.toLowerCase().includes(term);

            const matchesRole = roleFilter === 'ALL' || user.roleCode === roleFilter || user.role === roleFilter;
            const matchesDept = deptFilter === 'ALL' || user.department === deptFilter;
            const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;

            return matchesSearch && matchesRole && matchesDept && matchesStatus;
        });

        // Apply Sorting
        filtered.sort((a, b) => {
            let valA: any = a[sortColumn];
            let valB: any = b[sortColumn];

            if (sortColumn === 'salary') {
                valA = Number(valA) || 0;
                valB = Number(valB) || 0;
            } else {
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [users, searchTerm, roleFilter, deptFilter, statusFilter, sortColumn, sortDirection]);

    // Paginated users
    const totalPages = Math.ceil(processedUsers.length / pageSize) || 1;
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return processedUsers.slice(start, start + pageSize);
    }, [processedUsers, currentPage, pageSize]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter, deptFilter, statusFilter, pageSize]);

    // Toggle Single PIN visibility
    const toggleRevealPin = (id: string) => {
        setRevealedPins(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // 1-Click Quick PIN Regenerate
    const handleQuickRegeneratePin = (userId: string, userName: string) => {
        const newPin = String(Math.floor(1000 + Math.random() * 9000));
        setUsers(prev => {
            const updated = prev.map(u => (u.id === userId ? { ...u, posPin: newPin } : u));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
        setRevealedPins(prev => ({ ...prev, [userId]: true }));
        showToast(`New 4-digit POS PIN (${newPin}) assigned to ${userName}!`);
    };

    // Copy PIN to clipboard
    const handleCopyPin = (pin: string, userId: string) => {
        navigator.clipboard.writeText(pin);
        setCopiedPinId(userId);
        setTimeout(() => setCopiedPinId(null), 2000);
        showToast('POS PIN copied to clipboard!', 'info');
    };

    // 1-Click Quick Status Toggle (Active <-> Inactive)
    const handleQuickToggleStatus = async (user: StaffUser) => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        const dbStatus = newStatus === 'active' ? 'ACTIVE' : 'INACTIVE';

        // Optimistic UI update
        setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, status: newStatus } : u)));

        try {
            await fetch(`${getApiBaseUrl()}/api/hrm/employees/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: dbStatus })
            });
            showToast(`${user.name} is now marked as ${newStatus.toUpperCase()}`);
            await loadStaff();
        } catch {
            showToast('Failed to update status on server.', 'error');
            loadStaff();
        }
    };

    // Unlock User Account
    const handleUnlockUser = (id: string, name: string) => {
        setUsers(prev =>
            prev.map(u =>
                u.id === id
                    ? {
                          ...u,
                          status: 'active',
                          failedLoginAttempts: 0,
                          lockedUntil: null
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

    // Delete User
    const handleDeleteUser = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete staff account "${name}"? This action is permanent.`)) {
            try {
                const resp = await fetch(`${getApiBaseUrl()}/api/hrm/employees/${id}`, {
                    method: 'DELETE'
                });
                const rJson = await resp.json();
                if (rJson.success) {
                    await loadStaff();
                    showToast(`Staff account "${name}" deleted.`);
                    setSelectedUserIds(prev => prev.filter(uid => uid !== id));
                } else {
                    showToast(rJson.message || 'Failed to delete staff member.', 'error');
                }
            } catch {
                showToast('Network error while deleting staff member.', 'error');
            }
        }
    };

    // Bulk Selection Handlers
    const handleSelectAll = () => {
        if (selectedUserIds.length === paginatedUsers.length) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(paginatedUsers.map(u => u.id));
        }
    };

    const handleToggleSelect = (id: string) => {
        setSelectedUserIds(prev =>
            prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
        );
    };

    // Bulk Status Change
    const handleBulkStatus = async (newStatus: 'active' | 'inactive') => {
        if (selectedUserIds.length === 0) return;
        const dbStatus = newStatus === 'active' ? 'ACTIVE' : 'INACTIVE';
        setIsLoading(true);

        try {
            await Promise.all(
                selectedUserIds.map(id =>
                    fetch(`${getApiBaseUrl()}/api/hrm/employees/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: dbStatus })
                    })
                )
            );
            showToast(`${selectedUserIds.length} staff accounts updated to ${newStatus.toUpperCase()}`);
            setSelectedUserIds([]);
            await loadStaff();
        } catch {
            showToast('Failed to apply bulk status update.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Bulk Delete
    const handleBulkDelete = async () => {
        if (selectedUserIds.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedUserIds.length} selected staff members?`)) return;

        setIsLoading(true);
        try {
            await Promise.all(
                selectedUserIds.map(id =>
                    fetch(`${getApiBaseUrl()}/api/hrm/employees/${id}`, { method: 'DELETE' })
                )
            );
            showToast(`${selectedUserIds.length} staff accounts removed.`);
            setSelectedUserIds([]);
            await loadStaff();
        } catch {
            showToast('Failed to execute bulk deletion.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Export Staff Directory to CSV
    const handleExportCSV = (selectedOnly: boolean = false) => {
        const targetList = selectedOnly
            ? users.filter(u => selectedUserIds.includes(u.id))
            : processedUsers;

        if (targetList.length === 0) {
            showToast('No staff records to export.', 'info');
            return;
        }

        const headers = ['Employee ID', 'Full Name', 'Username', 'Email', 'Phone', 'Department', 'Designation', 'Shift', 'Monthly Base Salary (BDT)', 'Status', 'POS PIN'];
        const rows = targetList.map(u => [
            u.code,
            `"${u.name.replace(/"/g, '""')}"`,
            u.username,
            u.email,
            u.phone,
            `"${u.department.replace(/"/g, '""')}"`,
            `"${u.role.replace(/"/g, '""')}"`,
            `"${u.shift || 'General'}"`,
            u.salary,
            u.status.toUpperCase(),
            `"${u.posPin}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `hotel_staff_roster_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Exported ${targetList.length} staff records to CSV!`);
    };

    // Print Staff Roster
    const handlePrint = () => {
        window.print();
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
        setFormDepartment(departments[0]?.name || 'Front Office');
        setFormProperty('Grand Palace Hotel & Resort (Dhaka HQ)');
        setFormPosPin(String(Math.floor(1000 + Math.random() * 9000)));
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
                        status: formStatus === 'active' ? 'ACTIVE' : 'INACTIVE'
                    })
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
                const matchedDept = departments.find(
                    d => d.name.toLowerCase() === formDepartment.toLowerCase()
                );
                const departmentId = matchedDept?.id ?? departments[0]?.id ?? 1;

                const matchedDes = designations.find(
                    d => d.title.toLowerCase() === formRole.toLowerCase() || d.department_id === matchedDept?.id
                );
                const designationId = matchedDes?.id ?? designations[0]?.id ?? 1;

                const newCode = generateUniqueShortCode('EMP', users.map(u => u.code));

                const propId = getActivePropertyId();
                const resp = await fetch(`${getApiBaseUrl()}/api/hrm/employees`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        propertyId: propId,
                        departmentId,
                        designationId,
                        employeeCode: newCode,
                        firstName: formName.split(' ')[0],
                        lastName: formName.split(' ').slice(1).join(' ') || '—',
                        email: formEmail.trim(),
                        phone: formPhone.trim(),
                        basicSalary: Number(formSalary) || 45000,
                        status: formStatus === 'active' ? 'ACTIVE' : 'INACTIVE'
                    })
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
        } catch {
            showToast('Network error. Please check your connection.', 'error');
        }
    };

    // Active Counts
    const activeCount = users.filter(u => u.status === 'active').length;
    const inactiveCount = users.filter(u => u.status === 'inactive').length;
    const lockedCount = users.filter(u => u.status === 'locked').length;
    const totalPayroll = users.reduce((acc, u) => acc + (u.salary || 0), 0);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-200 font-sans pb-16">
            {/* Toast Alert */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-xl text-white text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 duration-150 ${
                        toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'
                    }`}
                >
                    {toast.type === 'error' ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Standard Page Header */}
            <PageHeader
                title="Staff & User Management"
                subtitle="Employee master directory, role assignments, 4-digit POS Cashier PINs, department quotas & access security"
                icon={<Users className="size-6 text-primary" />}
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Print staff roster"
                        >
                            <Printer className="size-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Print Roster</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleExportCSV(false)}
                            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title="Export full roster to CSV"
                        >
                            <Download className="size-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="btn-primary flex items-center gap-1.5 cursor-pointer text-xs font-bold px-3.5 py-2 shadow-2xs"
                        >
                            <Plus className="size-4 stroke-[2.5]" />
                            <span>Register Staff Member</span>
                        </button>
                    </div>
                }
            />

            {/* 4 Interactive Thesis KPI Cards (Click to Filter) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div
                    onClick={() => setStatusFilter(statusFilter === 'active' ? 'ALL' : 'active')}
                    className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-xs transition cursor-pointer group ${
                        statusFilter === 'active' ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20' : 'border-slate-200/90'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Staff</span>
                        <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <Users className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                        {activeCount}
                        <span className="text-sm font-normal text-slate-400"> / {users.length}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span>Click to filter active accounts</span>
                    </div>
                </div>

                <div
                    onClick={() => {
                        setRoleFilter(roleFilter === 'CASHIER' ? 'ALL' : 'CASHIER');
                    }}
                    className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-xs transition cursor-pointer group ${
                        roleFilter === 'CASHIER' ? 'border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/20' : 'border-slate-200/90'
                    }`}
                >
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

                <div
                    onClick={() => setStatusFilter(statusFilter === 'locked' ? 'ALL' : 'locked')}
                    className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-xs transition cursor-pointer group ${
                        statusFilter === 'locked' ? 'border-rose-500 ring-2 ring-rose-100 bg-rose-50/20' : 'border-slate-200/90'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Locked Accounts</span>
                        <div className="size-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                            <Lock className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-rose-600 tracking-tight">
                        {lockedCount}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">
                        {lockedCount > 0 ? 'Click to review lockouts' : 'Zero lockouts flagged'}
                    </div>
                </div>

                <div
                    onClick={() => { setStatusFilter('ALL'); setDeptFilter('ALL'); setRoleFilter('ALL'); }}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition cursor-pointer"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Base Payroll</span>
                        <div className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-mono text-xs font-bold">
                            ৳
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight font-mono">
                        ৳{totalPayroll.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">Estimated salary base</div>
                </div>
            </div>

            {/* Quick Status Filter Tabs & Search Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Status Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                statusFilter === 'ALL'
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                            }`}
                        >
                            <span>All Staff</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${statusFilter === 'ALL' ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                                {users.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('active')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                statusFilter === 'active'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                            }`}
                        >
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${statusFilter === 'active' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-600'}`}>
                                {activeCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                statusFilter === 'inactive'
                                    ? 'bg-slate-700 text-white shadow-2xs'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                            }`}
                        >
                            <span>Inactive</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${statusFilter === 'inactive' ? 'bg-slate-800 text-slate-100' : 'bg-slate-200 text-slate-600'}`}>
                                {inactiveCount}
                            </span>
                        </button>

                        {lockedCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setStatusFilter('locked')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                    statusFilter === 'locked'
                                        ? 'bg-rose-600 text-white shadow-2xs'
                                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                }`}
                            >
                                <Lock size={12} />
                                <span>Locked</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${statusFilter === 'locked' ? 'bg-rose-700 text-rose-100' : 'bg-rose-100 text-rose-700'}`}>
                                    {lockedCount}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Reset Filters Pill (if any filter is applied) */}
                    {(searchTerm || roleFilter !== 'ALL' || deptFilter !== 'ALL' || statusFilter !== 'ALL') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setRoleFilter('ALL');
                                setDeptFilter('ALL');
                                setStatusFilter('ALL');
                            }}
                            className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        >
                            <X size={12} />
                            <span>Reset Filters</span>
                        </button>
                    )}
                </div>

                {/* Filter Toolbar: Search + Department + Role Dropdowns */}
                <div className="flex flex-wrap gap-2.5 items-center justify-between pt-1 border-t border-slate-100">
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, employee ID, role, department, or phone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Department Filter */}
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
                            <Building2 size={13} className="text-slate-400" />
                            <select
                                value={deptFilter}
                                onChange={e => setDeptFilter(e.target.value)}
                                className="bg-transparent outline-none text-slate-800 font-medium cursor-pointer"
                            >
                                <option value="ALL">All Departments</option>
                                {Array.from(new Set(users.map(u => u.department))).map(d => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Role Filter */}
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
                            <Briefcase size={13} className="text-slate-400" />
                            <select
                                value={roleFilter}
                                onChange={e => setRoleFilter(e.target.value)}
                                className="bg-transparent outline-none text-slate-800 font-medium cursor-pointer"
                            >
                                <option value="ALL">All Designations</option>
                                {Array.from(new Set(users.map(u => u.role))).map(r => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Page Size Selector */}
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
                            <span className="text-[11px] text-slate-400">Rows:</span>
                            <select
                                value={pageSize}
                                onChange={e => setPageSize(Number(e.target.value))}
                                className="bg-transparent outline-none text-slate-800 font-bold cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating / Docked Bulk Actions Toolbar (when rows selected) */}
            {selectedUserIds.length > 0 && (
                <div className="bg-blue-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center gap-2.5">
                        <span className="size-6 rounded-lg bg-blue-700 flex items-center justify-center font-mono font-bold text-xs">
                            {selectedUserIds.length}
                        </span>
                        <span className="text-xs font-bold">staff members selected</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleBulkStatus('active')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                            <Check size={12} />
                            <span>Mark Active</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleBulkStatus('inactive')}
                            className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                            <span>Mark Inactive</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleExportCSV(true)}
                            className="px-3 py-1.5 rounded-xl bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                            <Download size={12} />
                            <span>Export Selected</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleBulkDelete}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                            <Trash2 size={12} />
                            <span>Delete</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedUserIds([])}
                            className="text-xs text-blue-200 hover:text-white ml-2 underline cursor-pointer"
                        >
                            Deselect
                        </button>
                    </div>
                </div>
            )}

            {/* Staff Directory Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                {isLoading && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100 text-blue-700 text-xs font-semibold">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Synchronizing employee records from PostgreSQL database...</span>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-extrabold uppercase tracking-wider text-[10.5px]">
                                {/* Checkbox Select All */}
                                <th className="py-3 px-4 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        checked={paginatedUsers.length > 0 && selectedUserIds.length === paginatedUsers.length}
                                        onChange={handleSelectAll}
                                        className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </th>

                                {/* Staff Member (Sortable) */}
                                <th
                                    className="py-3 px-4 cursor-pointer hover:text-slate-900 transition select-none"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Staff Member</span>
                                        <ArrowUpDown size={11} className={sortColumn === 'name' ? 'text-blue-600' : 'text-slate-400'} />
                                    </div>
                                </th>

                                {/* Employee ID (Sortable) */}
                                <th
                                    className="py-3 px-4 cursor-pointer hover:text-slate-900 transition select-none"
                                    onClick={() => handleSort('code')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Employee ID</span>
                                        <ArrowUpDown size={11} className={sortColumn === 'code' ? 'text-blue-600' : 'text-slate-400'} />
                                    </div>
                                </th>

                                {/* Department (Sortable) */}
                                <th
                                    className="py-3 px-4 cursor-pointer hover:text-slate-900 transition select-none"
                                    onClick={() => handleSort('department')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Department</span>
                                        <ArrowUpDown size={11} className={sortColumn === 'department' ? 'text-blue-600' : 'text-slate-400'} />
                                    </div>
                                </th>

                                {/* Designation / Role (Sortable) */}
                                <th
                                    className="py-3 px-4 cursor-pointer hover:text-slate-900 transition select-none"
                                    onClick={() => handleSort('role')}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>Designation / Role</span>
                                        <ArrowUpDown size={11} className={sortColumn === 'role' ? 'text-blue-600' : 'text-slate-400'} />
                                    </div>
                                </th>

                                {/* Work Shift */}
                                <th className="py-3 px-4">
                                    <span>Assigned Shift</span>
                                </th>

                                {/* 4-Digit POS PIN */}
                                <th className="py-3 px-4 text-center">
                                    <span>POS PIN</span>
                                </th>

                                {/* Base Salary (Sortable) */}
                                <th
                                    className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 transition select-none"
                                    onClick={() => handleSort('salary')}
                                >
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span>Salary (BDT)</span>
                                        <ArrowUpDown size={11} className={sortColumn === 'salary' ? 'text-blue-600' : 'text-slate-400'} />
                                    </div>
                                </th>

                                {/* Status (Sortable) */}
                                <th
                                    className="py-3 px-4 text-center cursor-pointer hover:text-slate-900 transition select-none"
                                    onClick={() => handleSort('status')}
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span>Status</span>
                                        <ArrowUpDown size={11} className={sortColumn === 'status' ? 'text-blue-600' : 'text-slate-400'} />
                                    </div>
                                </th>

                                {/* Actions */}
                                <th className="py-3 px-4 text-right">
                                    <span>Actions</span>
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-14 text-center text-slate-400">
                                        <Users size={32} className="mx-auto text-slate-300 stroke-[1.5] mb-2" />
                                        <p className="text-sm font-bold text-slate-700">No staff members match the current filter</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or selecting &quot;All Staff&quot;</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchTerm('');
                                                setRoleFilter('ALL');
                                                setDeptFilter('ALL');
                                                setStatusFilter('ALL');
                                            }}
                                            className="mt-3 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                                        >
                                            Reset All Filters
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map(user => {
                                    const isRevealed = revealedPins[user.id] || false;
                                    const isSelected = selectedUserIds.includes(user.id);
                                    const initials = user.name
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2);

                                    return (
                                        <tr
                                            key={user.id}
                                            className={`transition group ${
                                                isSelected
                                                    ? 'bg-blue-50/60'
                                                    : 'hover:bg-slate-50/70'
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <td className="py-3.5 px-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(user.id)}
                                                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </td>

                                            {/* Staff Member Avatar & Info */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`size-9 rounded-xl ${user.avatarColor} text-white text-xs font-extrabold flex items-center justify-center shrink-0 shadow-2xs`}
                                                    >
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div
                                                            onClick={() => setViewingUser(user)}
                                                            className="text-slate-900 font-bold hover:text-blue-600 transition cursor-pointer truncate flex items-center gap-1.5"
                                                        >
                                                            <span>{user.name}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono font-normal">
                                                                @{user.username}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 truncate">
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="size-3 text-slate-400 shrink-0" />
                                                                <span className="truncate">{user.email}</span>
                                                            </span>
                                                            {user.phone && user.phone !== '—' && (
                                                                <span className="flex items-center gap-1">
                                                                    <Phone className="size-3 text-slate-400 shrink-0" />
                                                                    <span>{user.phone}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Employee Code */}
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                                                <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200/90 text-xs">
                                                    {user.code}
                                                </span>
                                            </td>

                                            {/* Department Pill */}
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-2xs ${getDeptBadgeStyle(user.department)}`}>
                                                    {user.department}
                                                </span>
                                            </td>

                                            {/* Designation / Role */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-slate-900">
                                                    {user.role}
                                                </div>
                                                <div className="text-[10.5px] text-slate-400">
                                                    {user.roleCode}
                                                </div>
                                            </td>

                                            {/* Assigned Shift */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 text-slate-700">
                                                    <Clock size={12} className="text-slate-400 shrink-0" />
                                                    <span className="font-semibold text-xs">{user.shift || 'General'}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono pl-4.5">
                                                    {user.shiftTime || '09:00 - 18:00'}
                                                </div>
                                            </td>

                                            {/* POS Cashier PIN */}
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRevealPin(user.id)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-800 border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
                                                        title="Click to reveal/hide 4-digit PIN"
                                                    >
                                                        <span>{isRevealed ? user.posPin : '••••'}</span>
                                                        {isRevealed ? (
                                                            <EyeOff className="size-3 text-slate-500" />
                                                        ) : (
                                                            <Eye className="size-3 text-slate-500" />
                                                        )}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickRegeneratePin(user.id, user.name)}
                                                        className="size-6 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition cursor-pointer"
                                                        title="Regenerate new 4-digit POS PIN"
                                                    >
                                                        <RefreshCw className="size-3" />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Base Salary */}
                                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                                                ৳{user.salary.toLocaleString()}
                                            </td>

                                            {/* Status Badge with 1-Click Toggle */}
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickToggleStatus(user)}
                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs transition cursor-pointer ${
                                                        user.status === 'active'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                                            : user.status === 'locked'
                                                            ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse hover:bg-rose-100'
                                                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                                    }`}
                                                    title="Click to toggle Active / Inactive"
                                                >
                                                    <span className={`size-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : user.status === 'locked' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                                                    <span>{user.status === 'locked' ? 'Locked' : user.status}</span>
                                                </button>
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {user.status === 'locked' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUnlockUser(user.id, user.name)}
                                                            className="size-7 rounded-lg hover:bg-emerald-50 text-emerald-600 flex items-center justify-center transition cursor-pointer"
                                                            title="Unlock Account"
                                                        >
                                                            <Unlock className="size-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingUser(user)}
                                                        className="size-7 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center transition cursor-pointer"
                                                        title="View Profile Details"
                                                    >
                                                        <Eye className="size-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(user)}
                                                        className="size-7 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 flex items-center justify-center transition cursor-pointer"
                                                        title="Edit Staff Member"
                                                    >
                                                        <Edit2 className="size-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteUser(user.id, user.name)}
                                                        className="size-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                                                        title="Delete Staff"
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

                {/* Table Footer with Pagination & Records Counter */}
                <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <div>
                        Showing{' '}
                        <span className="font-bold text-slate-900">
                            {processedUsers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                        </span>{' '}
                        to{' '}
                        <span className="font-bold text-slate-900">
                            {Math.min(currentPage * pageSize, processedUsers.length)}
                        </span>{' '}
                        of <span className="font-bold text-slate-900">{processedUsers.length}</span> staff members
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                            <ChevronLeft size={13} />
                            <span>Previous</span>
                        </button>

                        <div className="flex items-center gap-1 px-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setCurrentPage(p)}
                                    className={`size-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        currentPage === p
                                            ? 'bg-blue-600 text-white shadow-2xs'
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                            <span>Next</span>
                            <ChevronRight size={13} />
                        </button>
                    </div>
                </div>
            </div>

            {/* View Profile Slide-Over Drawer */}
            {viewingUser && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
                    <div
                        className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User className="size-4 text-blue-600" />
                                <span className="font-bold text-slate-900 text-sm">Staff Profile Dossier</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingUser(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Top Profile Summary Card */}
                        <div className="p-5 border-b border-slate-100 bg-white">
                            <div className="flex items-center gap-4">
                                <div
                                    className={`size-14 rounded-2xl ${viewingUser.avatarColor} text-white text-xl font-black flex items-center justify-center shadow-md`}
                                >
                                    {viewingUser.name
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-base font-black text-slate-900 truncate">
                                        {viewingUser.name}
                                    </h4>
                                    <p className="text-xs text-slate-500 font-mono">@{viewingUser.username}</p>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getDeptBadgeStyle(viewingUser.department)}`}>
                                            {viewingUser.department}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                                            viewingUser.status === 'active'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}>
                                            {viewingUser.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Tabs */}
                        <div className="flex border-b border-slate-200 px-4 bg-slate-50/50">
                            <button
                                type="button"
                                onClick={() => setDrawerTab('overview')}
                                className={`py-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                                    drawerTab === 'overview'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Overview
                            </button>
                            <button
                                type="button"
                                onClick={() => setDrawerTab('credentials')}
                                className={`py-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                                    drawerTab === 'credentials'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Access & PIN
                            </button>
                            <button
                                type="button"
                                onClick={() => setDrawerTab('payroll')}
                                className={`py-2.5 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                                    drawerTab === 'payroll'
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                Compensation
                            </button>
                        </div>

                        {/* Drawer Tab Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {drawerTab === 'overview' && (
                                <div className="space-y-3.5">
                                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Employee Code</span>
                                            <span className="font-mono font-bold text-slate-900">{viewingUser.code}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Designation</span>
                                            <span className="font-bold text-slate-900">{viewingUser.role}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Department</span>
                                            <span className="font-bold text-slate-900">{viewingUser.department}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Assigned Shift</span>
                                            <span className="font-bold text-slate-900">{viewingUser.shift || 'General Shift'} ({viewingUser.shiftTime || '09:00 - 18:00'})</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Work Email</span>
                                            <span className="font-medium text-slate-900">{viewingUser.email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Contact Phone</span>
                                            <span className="font-medium text-slate-900">{viewingUser.phone || '—'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Branch Property</span>
                                            <span className="font-medium text-slate-900 truncate max-w-[200px]">{viewingUser.property}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Activity Status</span>
                                            <span className="text-emerald-700 font-semibold">{viewingUser.lastActive}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {drawerTab === 'credentials' && (
                                <div className="space-y-3.5">
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-700">4-Digit POS Cashier PIN</span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyPin(viewingUser.posPin, viewingUser.id)}
                                                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                                            >
                                                {copiedPinId === viewingUser.id ? <Check size={12} /> : <Copy size={12} />}
                                                <span>{copiedPinId === viewingUser.id ? 'Copied' : 'Copy PIN'}</span>
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 font-mono text-base font-black text-slate-800">
                                            <span>{viewingUser.posPin}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleQuickRegeneratePin(viewingUser.id, viewingUser.name)}
                                                className="px-2.5 py-1 text-xs font-sans rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
                                            >
                                                <RefreshCw size={11} />
                                                <span>Regenerate</span>
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            Used to authorize food orders, room charge postings, and night audit verification.
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">RBAC Role Code</span>
                                            <span className="font-mono font-bold text-slate-900">{viewingUser.roleCode}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Failed Login Attempts</span>
                                            <span className="font-mono text-slate-900">{viewingUser.failedLoginAttempts} / 5</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Account Lockout</span>
                                            <span className="font-bold text-slate-900">{viewingUser.status === 'locked' ? 'Locked' : 'Unlocked (Clear)'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {drawerTab === 'payroll' && (
                                <div className="space-y-3.5">
                                    <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200/80 space-y-2 text-xs">
                                        <span className="text-slate-500 font-semibold block text-[11px]">MONTHLY BASE SALARY</span>
                                        <div className="text-2xl font-black font-mono text-emerald-700">
                                            ৳{viewingUser.salary.toLocaleString()}
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                            Fixed gross monthly compensation before overtime and service charge allocations.
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Estimated Daily Rate</span>
                                            <span className="font-mono font-bold text-slate-900">৳{Math.round(viewingUser.salary / 30).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Estimated Hourly Base</span>
                                            <span className="font-mono font-bold text-slate-900">৳{Math.round(viewingUser.salary / 240).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Annual Base Projection</span>
                                            <span className="font-mono font-bold text-slate-900">৳{(viewingUser.salary * 12).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const u = viewingUser;
                                    setViewingUser(null);
                                    handleOpenEdit(u);
                                }}
                                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            >
                                <Edit2 size={13} />
                                <span>Edit Profile</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleQuickToggleStatus(viewingUser)}
                                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
                            >
                                <span>{viewingUser.status === 'active' ? 'Deactivate' : 'Activate'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setViewingUser(null)}
                                className="px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create & Edit Staff Member Modal */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <Users className="size-5 text-blue-600" />
                                <h2 className="text-base font-bold text-slate-900">
                                    {editingUserId ? 'Edit Staff Member' : 'Register New Staff Member'}
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
                                        placeholder="e.g. imran.hossain"
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
                                        Assigned Role *
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
                                                'CASHIER': 'POS Cashier & Server'
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
                                                <option value="Front Office">Front Office</option>
                                                <option value="Food & Beverage">Food & Beverage</option>
                                                <option value="Housekeeping & Rooms">Housekeeping & Rooms</option>
                                                <option value="Finance & Accounts">Finance & Accounts</option>
                                                <option value="Engineering & Maintenance">Engineering & Maintenance</option>
                                            </>
                                        )}
                                    </select>
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

                            {/* 4-Digit POS PIN & Shift */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        4-Digit POS Cashier PIN *
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={4}
                                        required
                                        placeholder="4-digit PIN"
                                        value={formPosPin}
                                        onChange={e => setFormPosPin(e.target.value.replace(/\D/g, ''))}
                                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Work Shift Assignment
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                                    >
                                        {shifts.length > 0 ? (
                                            shifts.map(s => (
                                                <option key={s.id} value={s.name}>
                                                    {s.name} ({s.start_time} - {s.end_time})
                                                </option>
                                            ))
                                        ) : (
                                            <option value="General">General Shift (09:00 - 18:00)</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {/* Property Branch */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Assigned Property Branch
                                </label>
                                <input
                                    type="text"
                                    value={formProperty}
                                    onChange={e => setFormProperty(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                                />
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
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
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
