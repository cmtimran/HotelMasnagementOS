import React, { useState, useEffect, useMemo } from 'react';
import {
    ShieldCheck,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    CheckCircle2,
    AlertCircle,
    Eye,
    Lock,
    Copy,
    Save
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface Permission {
    id: string;
    label: string;
    description?: string;
}

export interface PermissionGroup {
    id: string;
    name: string;
    category: 'Hotel PMS' | 'F&B Dining' | 'Finance & HRM' | 'Governance';
    permissions: Permission[];
}

export interface Role {
    id: string;
    code: string;
    name: string;
    description: string;
    color: string;
    isSystem: boolean;
    permissions: string[];
}

const STORAGE_KEY = 'hotel_roles_rbac_v1';

// Comprehensive Hotel & Restaurant RBAC Permission Matrix
export const HOTEL_PERMISSION_GROUPS: PermissionGroup[] = [
    {
        id: 'frontdesk',
        name: 'Front Desk & Reception',
        category: 'Hotel PMS',
        permissions: [
            { id: 'frontdesk_view', label: 'View Front Desk & Stay View', description: 'Access rack and room matrix' },
            { id: 'checkin_checkout', label: 'Check-In & Check-Out Guests', description: 'Execute check-in registration' },
            { id: 'keycard_issue', label: 'Issue RFID Room Keys', description: 'Encode keycards at reception' },
            { id: 'folio_billing', label: 'Folio Billing & Settlement', description: 'Post charges and collect payment' },
            { id: 'folio_discount', label: 'Manual Rate Override & Discount', description: 'Apply discretionary rebates' },
        ],
    },
    {
        id: 'reservations',
        name: 'Reservations & Booking',
        category: 'Hotel PMS',
        permissions: [
            { id: 'reservations_view', label: 'View Reservations List', description: 'Search and inspect reservations' },
            { id: 'reservations_create', label: 'Create New Reservations', description: 'Book walk-ins and direct inquiries' },
            { id: 'reservations_edit', label: 'Modify Guest Bookings', description: 'Change stay dates, room types' },
            { id: 'reservations_cancel', label: 'Cancel & Process Refunds', description: 'Void or cancel reservations' },
            { id: 'group_blocks', label: 'Manage Corporate & Group Blocks', description: 'Block room inventory for events' },
        ],
    },
    {
        id: 'housekeeping',
        name: 'Housekeeping & Cleanliness',
        category: 'Hotel PMS',
        permissions: [
            { id: 'housekeeping_view', label: 'View Housekeeping Room Grid', description: 'Inspect room hygiene status' },
            { id: 'housekeeping_update', label: 'Update Room Status (Clean / Dirty)', description: 'Mark room ready for check-in' },
            { id: 'maintenance_tag', label: 'Put Room Out of Order (OOO)', description: 'Take room offline for repair' },
            { id: 'linen_inventory', label: 'Track Linen & Towels Inventory', description: 'Manage floor supply stock' },
        ],
    },
    {
        id: 'maintenance',
        name: 'Engineering & Maintenance',
        category: 'Hotel PMS',
        permissions: [
            { id: 'maintenance_view', label: 'View Maintenance Kanban', description: 'Inspect repair tickets' },
            { id: 'workorder_create', label: 'Create Repair Work Orders', description: 'Dispatch maintenance engineer' },
            { id: 'workorder_resolve', label: 'Resolve & Sign Off Work Orders', description: 'Clear room back to inventory' },
        ],
    },
    {
        id: 'rates_inventory',
        name: 'Rooms, Rates & Packages',
        category: 'Hotel PMS',
        permissions: [
            { id: 'rates_view', label: 'View Rate Plans & Calendar', description: 'Check seasonal tariff' },
            { id: 'rates_manage', label: 'Manage Rate Plans & Multipliers', description: 'Update ADR and yield rules' },
            { id: 'packages_manage', label: 'Build Packages & Meal Plans', description: 'Create bundled experiences' },
            { id: 'building_manage', label: 'Building & Floor Management', description: 'Configure property layouts' },
        ],
    },
    {
        id: 'pos_dining',
        name: 'Restaurant POS & Dining',
        category: 'F&B Dining',
        permissions: [
            { id: 'pos_access', label: 'Access POS Terminal & Tables', description: 'Punch dine-in & takeaway orders' },
            { id: 'kot_dispatch', label: 'Dispatch KOT Kitchen Tickets', description: 'Fire orders to hot kitchen/bar' },
            { id: 'pos_discount', label: 'POS Discounts & Bill Split', description: 'Apply meal discounts or split' },
            { id: 'pos_cash_drawer', label: 'Open Cash Drawer & Close Shift', description: 'Reconcile shift cash drawer' },
            { id: 'room_charge_post', label: 'Charge Meal to Guest Room Folio', description: 'Direct room folio billing' },
        ],
    },
    {
        id: 'kitchen_bar',
        name: 'Kitchen & Culinary Display',
        category: 'F&B Dining',
        permissions: [
            { id: 'kds_view', label: 'View Kitchen Display Screen (KDS)', description: 'Live kitchen order screen' },
            { id: 'kot_ready_mark', label: 'Mark Food Ready for Service', description: 'Notify waiter of food completion' },
            { id: 'recipe_catalog', label: 'Manage Food Menu & Recipes', description: 'Recipe costing and ingredients' },
        ],
    },
    {
        id: 'finance_audit',
        name: 'Finance, Tax & Night Audit',
        category: 'Finance & HRM',
        permissions: [
            { id: 'night_audit_run', label: 'Execute End of Day Night Audit', description: 'Roll system date and post room tax' },
            { id: 'taxes_manage', label: 'Configure Taxes, VAT & Surcharges', description: 'Edit statutory tax rates & rules' },
            { id: 'financial_reports', label: 'View Trial Balance & P&L Reports', description: 'Access executive financial packs' },
            { id: 'cash_banking', label: 'Manage Bank Accounts & Petty Cash', description: 'Bank deposits and withdrawals' },
        ],
    },
    {
        id: 'hrm_staff',
        name: 'Staff & Human Resources (HRM)',
        category: 'Finance & HRM',
        permissions: [
            { id: 'staff_view', label: 'View Employee Directory', description: 'Inspect staff accounts and roles' },
            { id: 'staff_manage', label: 'Create & Edit Staff Accounts', description: 'Register staff, set POS PINs' },
            { id: 'shifts_roster', label: 'Manage 24/7 Shifts & Rosters', description: 'Schedule morning, evening, night' },
            { id: 'salary_payroll', label: 'Manage Staff Payroll & Overtime', description: 'View and disburse wages' },
        ],
    },
    {
        id: 'governance',
        name: 'System Governance & Settings',
        category: 'Governance',
        permissions: [
            { id: 'settings_manage', label: 'Edit System General Configuration', description: 'Hotel name, currency, logo' },
            { id: 'roles_manage', label: 'Manage Roles & RBAC Matrix', description: 'Assign security permissions' },
            { id: 'printers_manage', label: 'Configure Hardware & ESC/POS', description: 'Thermal printers and KOT routing' },
            { id: 'holidays_manage', label: 'Manage Holiday & Peak Calendar', description: 'Holiday surge rates and 2x wages' },
            { id: 'audit_logs_view', label: 'Inspect Security Audit Trail', description: 'View forensic activity logs' },
        ],
    },
];

// Helper: collect all IDs
const ALL_PERMISSION_IDS = HOTEL_PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.id));

const INITIAL_ROLES: Role[] = [
    {
        id: 'role-admin',
        code: 'GM-ADMIN',
        name: 'General Manager (Super Admin)',
        description: 'Complete unrestricted access across all Hotel PMS, POS, Finance, HRM and Governance operations.',
        color: 'rose',
        isSystem: true,
        permissions: [...ALL_PERMISSION_IDS],
    },
    {
        id: 'role-fd-mgr',
        code: 'FD-MGR',
        name: 'Front Desk Operations Manager',
        description: 'Supervises check-ins, guest relations, reservation overrides, room rack and housekeeping inspections.',
        color: 'blue',
        isSystem: false,
        permissions: [
            'frontdesk_view',
            'checkin_checkout',
            'keycard_issue',
            'folio_billing',
            'folio_discount',
            'reservations_view',
            'reservations_create',
            'reservations_edit',
            'reservations_cancel',
            'group_blocks',
            'housekeeping_view',
            'housekeeping_update',
            'maintenance_tag',
            'rates_view',
            'room_charge_post',
            'shifts_roster',
            'holidays_manage',
        ],
    },
    {
        id: 'role-receptionist',
        code: 'RECEPTION',
        name: 'Front Desk Receptionist',
        description: 'Standard guest check-in, check-out, keycard issuing, walk-in reservations, and guest inquiries.',
        color: 'sky',
        isSystem: false,
        permissions: [
            'frontdesk_view',
            'checkin_checkout',
            'keycard_issue',
            'folio_billing',
            'reservations_view',
            'reservations_create',
            'housekeeping_view',
            'room_charge_post',
        ],
    },
    {
        id: 'role-accountant',
        code: 'CHIEF-ACC',
        name: 'Chief Accountant & Night Auditor',
        description: 'Night audit automation, daily revenue reconciliation, tax compliance, invoices, and bank deposits.',
        color: 'emerald',
        isSystem: false,
        permissions: [
            'frontdesk_view',
            'folio_billing',
            'folio_discount',
            'rates_view',
            'pos_cash_drawer',
            'night_audit_run',
            'taxes_manage',
            'financial_reports',
            'cash_banking',
            'salary_payroll',
            'holidays_manage',
            'audit_logs_view',
        ],
    },
    {
        id: 'role-fnb-captain',
        code: 'FNB-CAPT',
        name: 'F&B Captain & Restaurant Manager',
        description: 'Floor supervision, table layout, KOT dispatch, room service delivery, and cashier reconciliation.',
        color: 'amber',
        isSystem: false,
        permissions: [
            'pos_access',
            'kot_dispatch',
            'pos_discount',
            'pos_cash_drawer',
            'room_charge_post',
            'kds_view',
            'kot_ready_mark',
            'recipe_catalog',
            'shifts_roster',
        ],
    },
    {
        id: 'role-housekeeping',
        code: 'HK-EXEC',
        name: 'Executive Housekeeper',
        description: 'Room cleaning grid, turn-down assignments, linen inventory, and maintenance defect logging.',
        color: 'purple',
        isSystem: false,
        permissions: [
            'housekeeping_view',
            'housekeeping_update',
            'maintenance_tag',
            'linen_inventory',
            'maintenance_view',
            'workorder_create',
            'shifts_roster',
        ],
    },
    {
        id: 'role-pos-cashier',
        code: 'CASHIER',
        name: 'POS Cashier & Server',
        description: 'Billing orders, accepting cash/card payments, printing receipts, and sending KOTs to kitchen.',
        color: 'indigo',
        isSystem: false,
        permissions: [
            'pos_access',
            'kot_dispatch',
            'room_charge_post',
            'pos_cash_drawer',
        ],
    },
];

export default function RolesPermissionsManagement() {
    const [roles, setRoles] = useState<Role[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : INITIAL_ROLES;
        } catch {
            return INITIAL_ROLES;
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
    }, [roles]);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Filter & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    // Modal Builder State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formColor, setFormColor] = useState('blue');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [codeError, setCodeError] = useState('');

    // Filtered roles
    const filteredRoles = useMemo(() => {
        return roles.filter(r => {
            const term = searchTerm.toLowerCase();
            return (
                r.name.toLowerCase().includes(term) ||
                r.code.toLowerCase().includes(term) ||
                r.description.toLowerCase().includes(term)
            );
        });
    }, [roles, searchTerm]);

    // Open Create Modal
    const handleOpenCreate = () => {
        setEditingRole(null);
        setFormName('');
        const code = generateUniqueShortCode('ROLE', roles.map(r => r.code));
        setFormCode(code);
        setFormDescription('');
        setFormColor('blue');
        setSelectedPermissions([]);
        setCodeError('');
        setIsModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (role: Role) => {
        setEditingRole(role);
        setFormName(role.name);
        setFormCode(role.code);
        setFormDescription(role.description);
        setFormColor(role.color || 'blue');
        setSelectedPermissions([...role.permissions]);
        setCodeError('');
        setIsModalOpen(true);
    };

    // Duplicate Role
    const handleDuplicate = (role: Role) => {
        const newCode = generateUniqueShortCode(`${role.code}-CPY`, roles.map(r => r.code));
        const newRole: Role = {
            id: `role-${Date.now()}`,
            code: newCode,
            name: `${role.name} (Copy)`,
            description: role.description,
            color: role.color,
            isSystem: false,
            permissions: [...role.permissions],
        };
        setRoles(prev => [...prev, newRole]);
        showToast(`Role cloned into "${newRole.name}"`);
    };

    // Toggle Permission in modal
    const togglePermission = (id: string) => {
        setSelectedPermissions(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    // Toggle entire group
    const toggleGroup = (group: PermissionGroup) => {
        const groupPermIds = group.permissions.map(p => p.id);
        const hasAll = groupPermIds.every(id => selectedPermissions.includes(id));

        if (hasAll) {
            // Remove all in this group
            setSelectedPermissions(prev => prev.filter(id => !groupPermIds.includes(id)));
        } else {
            // Add all in this group
            const missing = groupPermIds.filter(id => !selectedPermissions.includes(id));
            setSelectedPermissions(prev => [...prev, ...missing]);
        }
    };

    // Select All System Permissions
    const selectAllPermissions = () => {
        setSelectedPermissions([...ALL_PERMISSION_IDS]);
    };

    // Clear All Permissions
    const clearAllPermissions = () => {
        setSelectedPermissions([]);
    };

    // Save Role
    const handleSaveRole = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCode = formCode.trim().toUpperCase();
        if (!cleanCode) {
            setCodeError('Short code is required');
            return;
        }

        const existingCodes = roles.filter(r => r.id !== editingRole?.id).map(r => r.code);
        if (isShortCodeDuplicate(cleanCode, existingCodes)) {
            setCodeError(`Role code "${cleanCode}" is already in use.`);
            return;
        }

        if (editingRole) {
            setRoles(prev =>
                prev.map(r =>
                    r.id === editingRole.id
                        ? {
                              ...r,
                              name: formName.trim(),
                              code: cleanCode,
                              description: formDescription.trim(),
                              color: formColor,
                              permissions: selectedPermissions,
                          }
                        : r
                )
            );
            showToast('Role updated successfully');
        } else {
            const newRole: Role = {
                id: `role-${Date.now()}`,
                code: cleanCode,
                name: formName.trim(),
                description: formDescription.trim(),
                color: formColor,
                isSystem: false,
                permissions: selectedPermissions,
            };
            setRoles(prev => [...prev, newRole]);
            showToast('New role created successfully');
        }

        setIsModalOpen(false);
    };

    // Delete Role
    const handleDelete = (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete role "${name}"? Staff assigned to this role will need to be reassigned.`)) {
            setRoles(prev => prev.filter(r => r.id !== id));
            showToast('Role deleted');
        }
    };

    // Color badges helper
    const getColorClass = (color: string) => {
        switch (color) {
            case 'rose':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'blue':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'sky':
                return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'emerald':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'amber':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'purple':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'indigo':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
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
                title="Roles & RBAC Access Matrix"
                subtitle="Role-Based Access Control (RBAC), multi-department permission matrices, front-desk security and cashier PIN safeguards"
                icon={<ShieldCheck className="size-6 text-primary" />}
                actions={
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="btn-primary flex items-center gap-2 cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Create New Role</span>
                    </button>
                }
            />

            {/* 4 Standardized Thesis KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configured Roles</span>
                        <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <ShieldCheck className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{roles.length}</div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">Defined staff positions</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Standard</span>
                        <div className="size-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Lock className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{roles.filter(r => r.isSystem).length}</div>
                    <div className="mt-1 text-[11px] text-indigo-600 font-medium">Protected root presets</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Scopes</span>
                        <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <CheckCircle2 className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{ALL_PERMISSION_IDS.length}</div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-medium">Granular permissions</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Roles</span>
                        <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Edit2 className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{roles.filter(r => !r.isSystem).length}</div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">Custom tailor-made roles</div>
                </div>
            </div>

            {/* Standardized Search Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search roles, codes, or descriptions..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input-standard pl-10"
                    />
                </div>

                <div className="text-xs text-slate-500 font-medium hidden sm:block">
                    Showing <span className="font-bold text-slate-900">{filteredRoles.length}</span> active roles
                </div>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredRoles.map(role => {
                    const badgeClass = getColorClass(role.color);
                    const pct = Math.round((role.permissions.length / ALL_PERMISSION_IDS.length) * 100);

                    return (
                        <div
                            key={role.id}
                            className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4 shadow-xs hover:border-blue-300 transition group"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                        {role.code}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {role.isSystem && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                                <Lock className="size-2.5" />
                                                <span>System</span>
                                            </span>
                                        )}
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                                            {role.permissions.length} Perms
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">
                                        {role.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                        {role.description}
                                    </p>
                                </div>

                                {/* Permission Coverage Bar */}
                                <div className="space-y-1 pt-1">
                                    <div className="flex justify-between text-[11px] text-slate-500">
                                        <span>System Privileges Access</span>
                                        <span className="font-mono font-bold text-slate-800">
                                            {pct}% ({role.permissions.length}/{ALL_PERMISSION_IDS.length})
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            style={{ width: `${pct}%` }}
                                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setSelectedRole(role)}
                                    className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                                >
                                    <Eye className="size-3.5" />
                                    <span>Inspect Matrix</span>
                                </button>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleDuplicate(role)}
                                        className="size-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
                                        title="Clone Role"
                                    >
                                        <Copy className="size-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEdit(role)}
                                        className="size-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
                                        title="Edit Role Permissions"
                                    >
                                        <Edit2 className="size-3.5" />
                                    </button>
                                    {!role.isSystem && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(role.id, role.name)}
                                            className="size-8 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center justify-center transition"
                                            title="Delete Role"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Inspect Modal Drawer */}
            {selectedRole && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                            <div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="size-5 text-blue-600" />
                                    <h2 className="text-base font-bold text-slate-900">
                                        {selectedRole.name} ({selectedRole.code})
                                    </h2>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{selectedRole.description}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedRole(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Granted Permissions ({selectedRole.permissions.length} Total):
                            </div>

                            <div className="space-y-3">
                                {HOTEL_PERMISSION_GROUPS.map(group => {
                                    const granted = group.permissions.filter(p =>
                                        selectedRole.permissions.includes(p.id)
                                    );
                                    if (granted.length === 0) return null;

                                    return (
                                        <div
                                            key={group.id}
                                            className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2"
                                        >
                                            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                                                <span>{group.name}</span>
                                                <span className="text-[10px] text-blue-600 font-mono">
                                                    {granted.length}/{group.permissions.length} Granted
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                                {granted.map(p => (
                                                    <div
                                                        key={p.id}
                                                        className="flex items-center gap-1.5 text-xs text-slate-700"
                                                    >
                                                        <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                                        <span className="font-medium">{p.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedRole(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create & Edit Role Modal Builder */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="size-5 text-blue-600" />
                                <h2 className="text-base font-bold text-slate-900">
                                    {editingRole ? 'Edit Role Privileges' : 'Create Custom RBAC Role'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRole} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                {/* Role Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Role Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Banquet Event Supervisor"
                                            value={formName}
                                            onChange={e => {
                                                setFormName(e.target.value);
                                                if (!editingRole && e.target.value.length > 2) {
                                                    setFormCode(
                                                        generateUniqueShortCode(e.target.value, roles.map(r => r.code))
                                                    );
                                                    setCodeError('');
                                                }
                                            }}
                                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Role Short Code *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formCode}
                                            onChange={e => {
                                                setFormCode(e.target.value.toUpperCase());
                                                setCodeError('');
                                            }}
                                            className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-white border border-slate-200 rounded-lg text-slate-900"
                                        />
                                        {codeError && (
                                            <p className="text-[10px] text-rose-500 mt-0.5">{codeError}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Role Description
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Responsibilities and operational scope"
                                            value={formDescription}
                                            onChange={e => setFormDescription(e.target.value)}
                                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Badge Theme Color
                                        </label>
                                        <select
                                            value={formColor}
                                            onChange={e => setFormColor(e.target.value)}
                                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                                        >
                                            <option value="blue">Blue (Corporate)</option>
                                            <option value="sky">Sky (Front Desk)</option>
                                            <option value="rose">Rose (Executive)</option>
                                            <option value="emerald">Emerald (Accounts)</option>
                                            <option value="amber">Amber (F&B / POS)</option>
                                            <option value="purple">Purple (Housekeeping)</option>
                                            <option value="indigo">Indigo (IT / Dispatch)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Permissions Matrix Header */}
                                <div className="pt-2 border-t border-slate-200 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                                Select Permissions Matrix ({selectedPermissions.length}/{ALL_PERMISSION_IDS.length} active)
                                            </h4>
                                            <p className="text-[11px] text-slate-400">
                                                Check individual rights or click group headers to toggle entire functional areas.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1.5 self-start sm:self-auto">
                                            <button
                                                type="button"
                                                onClick={selectAllPermissions}
                                                className="px-2.5 py-1 text-[11px] bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearAllPermissions}
                                                className="px-2.5 py-1 text-[11px] bg-slate-100 text-slate-600 font-semibold rounded-lg"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Groups */}
                                    <div className="space-y-3">
                                        {HOTEL_PERMISSION_GROUPS.map(group => {
                                            const groupPermIds = group.permissions.map(p => p.id);
                                            const countGranted = groupPermIds.filter(id =>
                                                selectedPermissions.includes(id)
                                            ).length;
                                            const allGranted = countGranted === groupPermIds.length;

                                            return (
                                                <div
                                                    key={group.id}
                                                    className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40"
                                                >
                                                    {/* Group Header */}
                                                    <div
                                                        onClick={() => toggleGroup(group)}
                                                        className="px-3.5 py-2 bg-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-200/70 transition"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={allGranted}
                                                                readOnly
                                                                className="rounded text-blue-600"
                                                            />
                                                            <span className="text-xs font-bold text-slate-900">
                                                                {group.name}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">
                                                                ({group.category})
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-mono font-bold text-blue-600">
                                                            {countGranted}/{group.permissions.length}
                                                        </span>
                                                    </div>

                                                    {/* Group Checklist */}
                                                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white">
                                                        {group.permissions.map(perm => {
                                                            const isChecked = selectedPermissions.includes(perm.id);
                                                            return (
                                                                <label
                                                                    key={perm.id}
                                                                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                                                                        isChecked
                                                                            ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                                                                            : 'border-transparent text-slate-600 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => togglePermission(perm.id)}
                                                                        className="rounded text-blue-600 mt-0.5"
                                                                    />
                                                                    <div>
                                                                        <div className="text-xs font-semibold">
                                                                            {perm.label}
                                                                        </div>
                                                                        {perm.description && (
                                                                            <div className="text-[10px] text-slate-400">
                                                                                {perm.description}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                                >
                                    <Save className="size-4" />
                                    <span>{editingRole ? 'Save Changes' : 'Create Role'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
