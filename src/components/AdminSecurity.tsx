import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    Shield,
    ShieldCheck,
    Search,
    Plus,
    Edit2,
    Save,
    X,
    Lock,
    Unlock,
    KeyRound,
    Smartphone,
    Wifi,
    CheckCircle2,
    AlertTriangle,
    Download,
    Clock,
    Building2,
    DollarSign,
    Receipt,
    Briefcase,
    CreditCard,
    User,
    Sliders,
    History,
    Info,
    Calendar
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/apiUrl';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export type StaffDepartment =
    | 'Executive Management'
    | 'Front Office'
    | 'Housekeeping'
    | 'Food & Beverage'
    | 'Kitchen & Culinary'
    | 'Accounts & Finance'
    | 'Maintenance & Engineering'
    | 'Security & IT';

export type ShiftType =
    | 'Morning (07:00 - 15:30)'
    | 'Evening (15:00 - 23:30)'
    | 'Night Audit (23:00 - 07:30)'
    | 'General Day (09:00 - 18:00)';

export type SecurityTier = 'L1 Executive' | 'L2 Operations' | 'L3 Cashier/POS' | 'L4 Service';

export interface StaffMember {
    id: string;
    staffCode: string;
    name: string;
    username: string;
    email: string;
    phone: string;
    avatarInitials: string;
    department: StaffDepartment;
    designation: string;
    role: string;
    roleTier: SecurityTier;
    shift: ShiftType;
    propertyScope: string;
    twoFactorEnabled: boolean;
    deviceBinding: string;
    maxDiscountPercent: number;
    canVoidBills: boolean;
    status: 'Active' | 'On Leave' | 'Suspended';
    isOnline: boolean;
    lastLogin: string;
    lastIp: string;
    nidPassport: string;
    bankName: string;
    bankAccount: string;
    mfsNumber: string;
}

export interface SecurityRole {
    id: string;
    name: string;
    code: string;
    tier: SecurityTier;
    description: string;
    membersCount: number;
    isSystem: boolean;
    maxDiscount: number;
    canVoid: boolean;
    allowBackdate: boolean;
    ipRestricted: boolean;
    allowedIp?: string;
    concurrentSessions: number;
    keyCapabilities: string[];
    permissions: string[];
}

export interface PermissionAction {
    id: string;
    name: string;
    description: string;
}

export interface PermissionModule {
    id: string;
    name: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    description: string;
    actions: PermissionAction[];
}

export interface AuditLogItem {
    id: string;
    user: string;
    staffCode: string;
    role: string;
    action: string;
    module: string;
    severity: 'info' | 'warning' | 'critical';
    timestamp: string;
    ip: string;
    device: string;
}

export interface ActiveSession {
    id: string;
    staffName: string;
    role: string;
    terminal: string;
    ip: string;
    loginTime: string;
    idleTime: string;
}

// ==========================================
// PRE-CONFIGURED HOSPITALITY PERMISSION MATRIX
// ==========================================

const HOSPITALITY_PERMISSION_MODULES: PermissionModule[] = [
    {
        id: 'front-desk',
        name: 'Front Desk & Reservations',
        icon: Building2,
        description: 'Room rack, guest check-in/out, rate overrides, keycards & reservations',
        actions: [
            { id: 'fd_view_rack', name: 'View Room Rack & Stay View', description: 'Inspect room calendar and occupancy grid' },
            { id: 'fd_create_res', name: 'Create & Modify Reservations', description: 'Book individual or group reservations' },
            { id: 'fd_checkin_out', name: 'Execute Check-in & Check-out', description: 'Assign rooms, scan IDs, issue keys, settle folios' },
            { id: 'fd_walkin', name: 'Process Walk-In Guests', description: 'Immediate room allotment with payment capture' },
            { id: 'fd_rate_override', name: 'Override Base Room Rates', description: 'Apply discretionary pricing adjustments' },
            { id: 'fd_vip_handling', name: 'VIP & Blacklist Tagging', description: 'Manage guest loyalty and sensitive tags' },
            { id: 'fd_overbooking', name: 'Authorize Overbooking', description: 'Exceed standard property room capacity limits' },
        ],
    },
    {
        id: 'cashiering',
        name: 'Cashiering & Folio Management',
        icon: Receipt,
        description: 'Payments, bill settlement, split folios, invoice voiding & refunds',
        actions: [
            { id: 'cash_open_close', name: 'Open / Close Cashier Shift', description: 'Record opening float and submit blind cash drop' },
            { id: 'cash_post_charges', name: 'Post Room & Miscellaneous Charges', description: 'Add laundry, telephone, or room service fees' },
            { id: 'cash_settle_payments', name: 'Process Settlements (Cash/Card/MFS)', description: 'Accept and reconcile guest folio payments' },
            { id: 'cash_split_transfer', name: 'Split & Route Folio Charges', description: 'Move charges between room guests or corporate ledger' },
            { id: 'cash_void_bills', name: 'Void Paid Invoices & Items', description: 'Cancel finalized transactions (high audit sensitivity)' },
            { id: 'cash_process_refunds', name: 'Issue Guest Cash/Card Refunds', description: 'Disburse money back to guests' },
            { id: 'cash_apply_discounts', name: 'Authorize Manual Discounts', description: 'Apply % or fixed rebate up to authorized limit' },
        ],
    },
    {
        id: 'night-audit',
        name: 'Night Audit & Financial Close',
        icon: Clock,
        description: 'End-of-day rollover, auto room charge posting, trial balance generation',
        actions: [
            { id: 'na_run_audit', name: 'Execute Automated Night Audit', description: 'Lock registers, advance system business date' },
            { id: 'na_post_room_rev', name: 'Post Daily Room Revenue & Taxes', description: 'Batch process room tariff & service tax' },
            { id: 'na_noshow_release', name: 'Process No-Shows & Cancellations', description: 'Release rooms and charge guarantee deposits' },
            { id: 'na_trial_balance', name: 'Generate Trial Balance & Manager Flash', description: 'Produce daily executive financial summary' },
            { id: 'na_emergency_lock', name: 'Emergency System Lock & Backdate', description: 'Perform emergency maintenance rollbacks' },
        ],
    },
    {
        id: 'housekeeping',
        name: 'Housekeeping & Maintenance',
        icon: Briefcase,
        description: 'Room cleaning statuses, supervisor inspections, minibar & repairs',
        actions: [
            { id: 'hk_update_status', name: 'Update Room Status (Dirty/Clean)', description: 'Attendant updates on room readiness' },
            { id: 'hk_inspect_room', name: 'Inspect & Release (Clean to Inspected)', description: 'Supervisor approval before front desk check-in' },
            { id: 'hk_minibar_post', name: 'Log Minibar & Linen Consumption', description: 'Directly bill consumed amenities to guest folio' },
            { id: 'hk_out_of_order', name: 'Mark Rooms Out of Order (OOO/OOS)', description: 'Temporarily remove rooms from saleable inventory' },
            { id: 'hk_lost_found', name: 'Manage Lost & Found Registry', description: 'Log, claim, or archive guest left-behind items' },
            { id: 'hk_work_orders', name: 'Raise Engineering Maintenance Work Orders', description: 'Dispatch tickets for HVAC, plumbing, or electrical' },
        ],
    },
    {
        id: 'pos-fnb',
        name: 'Point of Sale (POS) & F&B',
        icon: DollarSign,
        description: 'Restaurant, room service, bar orders, KDS and split bills',
        actions: [
            { id: 'pos_create_order', name: 'Punch Dine-In & Room Service Orders', description: 'Generate Kitchen Order Tickets (KOT)' },
            { id: 'pos_transfer_folio', name: 'Transfer Restaurant Bill to Room Folio', description: 'Charge dining costs directly to hotel guest' },
            { id: 'pos_void_kot', name: 'Void KOT / Remove Ordered Items', description: 'Cancel kitchen items after ticket dispatch' },
            { id: 'pos_split_bill', name: 'Split Checks by Seat or Item', description: 'Divide restaurant billing among multiple payers' },
            { id: 'pos_complimentary', name: 'Authorize Complimentary / Staff Meals', description: 'Zero-rate F&B orders under company allowance' },
        ],
    },
    {
        id: 'rates-inventory',
        name: 'Rates, Inventory & Distribution',
        icon: Calendar,
        description: 'Master rate plans, room types, seasonality, stop-sells & OTA sync',
        actions: [
            { id: 'rate_manage_plans', name: 'Configure Rate Plans & Meal Packages', description: 'Create CP, MAP, AP, Non-refundable rate types' },
            { id: 'rate_seasonality', name: 'Set Dynamic Pricing & Seasonal Rules', description: 'Adjust rates for peak, shoulder, and low seasons' },
            { id: 'rate_inventory_lock', name: 'Stop-Sell & Minimum Stay Restrictions', description: 'Block availability on high-demand dates' },
            { id: 'rate_ota_sync', name: 'Trigger 2-Way OTA Channel Manager Sync', description: 'Push rates and inventory to Booking.com, Agoda' },
        ],
    },
    {
        id: 'accounting',
        name: 'Financial Accounting & City Ledger',
        icon: CreditCard,
        description: 'Corporate accounts, vendor payables, receivables & tax returns',
        actions: [
            { id: 'acc_city_ledger', name: 'Manage Corporate Direct Billing Accounts', description: 'Approve credit limits for corporate clients' },
            { id: 'acc_vendor_po', name: 'Create Purchase Orders & GRN Goods Receipts', description: 'Procure hotel supplies and F&B raw inventory' },
            { id: 'acc_tax_reports', name: 'Generate VAT / GST & Statutory Tax Returns', description: 'Export government tax compliance registries' },
            { id: 'acc_gl_export', name: 'General Ledger Export to Tally / QuickBooks', description: 'Sync journal vouchers to external accounting ERP' },
        ],
    },
    {
        id: 'security-admin',
        name: 'Security, Staff & RBAC Governance',
        icon: ShieldCheck,
        description: 'User provisioning, role definitions, audit trail & IP whitelist',
        actions: [
            { id: 'sec_manage_users', name: 'Register & Deactivate Staff Accounts', description: 'Full employee identity lifecycle control' },
            { id: 'sec_manage_roles', name: 'Define & Edit Role Permission Matrices', description: 'Configure granular functional module access' },
            { id: 'sec_reset_creds', name: 'Force Reset Passwords & 2FA Tokens', description: 'Manage employee credentials & emergency lock' },
            { id: 'sec_view_audit', name: 'Access Comprehensive Security Audit Trail', description: 'Inspect timestamped staff system operations' },
            { id: 'sec_ip_whitelist', name: 'Enforce On-Premise IP Restrictions', description: 'Block remote logins outside hotel network' },
        ],
    },
];

// ==========================================
// INITIAL MOCK DATA
// ==========================================

const INITIAL_ROLES: SecurityRole[] = [
    {
        id: 'role-super-admin',
        name: 'Super Administrator',
        code: 'ROLE_SUPER_ADMIN',
        tier: 'L1 Executive',
        description: 'Unrestricted full access across all hotel properties, system configuration, financial ledger, and security governance.',
        membersCount: 2,
        isSystem: true,
        maxDiscount: 100,
        canVoid: true,
        allowBackdate: true,
        ipRestricted: false,
        concurrentSessions: 5,
        keyCapabilities: ['All Modules Unrestricted', 'Security & RBAC Matrix', 'Direct Ledger Overwrite', 'Emergency Date Rollback'],
        permissions: HOSPITALITY_PERMISSION_MODULES.flatMap(m => m.actions.map(a => a.id)),
    },
    {
        id: 'role-gm',
        name: 'General Manager (GM)',
        code: 'ROLE_GENERAL_MANAGER',
        tier: 'L1 Executive',
        description: 'Complete operational management, executive financial reports, VIP handling, high-value discount approval, and audit review.',
        membersCount: 2,
        isSystem: true,
        maxDiscount: 50,
        canVoid: true,
        allowBackdate: true,
        ipRestricted: false,
        concurrentSessions: 3,
        keyCapabilities: ['Operational Oversight', 'Manager Flash Reports', 'High-Tier Discounts (50%)', 'Rate Plan Approvals'],
        permissions: [
            'fd_view_rack', 'fd_create_res', 'fd_checkin_out', 'fd_walkin', 'fd_rate_override', 'fd_vip_handling', 'fd_overbooking',
            'cash_open_close', 'cash_post_charges', 'cash_settle_payments', 'cash_split_transfer', 'cash_void_bills', 'cash_process_refunds', 'cash_apply_discounts',
            'na_trial_balance',
            'hk_update_status', 'hk_inspect_room', 'hk_out_of_order', 'hk_lost_found', 'hk_work_orders',
            'pos_create_order', 'pos_transfer_folio', 'pos_split_bill', 'pos_complimentary',
            'rate_manage_plans', 'rate_seasonality', 'rate_inventory_lock', 'rate_ota_sync',
            'acc_city_ledger', 'acc_tax_reports', 'acc_gl_export',
            'sec_manage_users', 'sec_view_audit'
        ],
    },
    {
        id: 'role-fom',
        name: 'Front Office Manager (FOM)',
        code: 'ROLE_FRONT_OFFICE_MGR',
        tier: 'L2 Operations',
        description: 'Supervises front desk operations, room rack allocations, rate overrides, walk-ins, guest grievances, and cashier shift handovers.',
        membersCount: 3,
        isSystem: true,
        maxDiscount: 25,
        canVoid: true,
        allowBackdate: false,
        ipRestricted: true,
        allowedIp: '192.168.1.0/24',
        concurrentSessions: 2,
        keyCapabilities: ['Room Rack Allotment', 'Rate Overrides (25%)', 'Void Invoices w/ Audit', 'Cashier Shift Audit'],
        permissions: [
            'fd_view_rack', 'fd_create_res', 'fd_checkin_out', 'fd_walkin', 'fd_rate_override', 'fd_vip_handling', 'fd_overbooking',
            'cash_open_close', 'cash_post_charges', 'cash_settle_payments', 'cash_split_transfer', 'cash_void_bills', 'cash_process_refunds', 'cash_apply_discounts',
            'hk_update_status', 'hk_inspect_room', 'hk_out_of_order', 'hk_lost_found',
            'pos_transfer_folio',
            'rate_manage_plans', 'rate_inventory_lock'
        ],
    },
    {
        id: 'role-receptionist',
        name: 'Front Desk Receptionist',
        code: 'ROLE_RECEPTIONIST',
        tier: 'L3 Cashier/POS',
        description: 'Daily guest check-in, check-out, room key creation, guest registration card entry, standard folio charge posting and settlement.',
        membersCount: 8,
        isSystem: true,
        maxDiscount: 10,
        canVoid: false,
        allowBackdate: false,
        ipRestricted: true,
        allowedIp: '192.168.1.0/24',
        concurrentSessions: 1,
        keyCapabilities: ['Check-in / Check-out', 'Room Keycard Encoding', 'Folio Settlement', 'Walk-In Registration'],
        permissions: [
            'fd_view_rack', 'fd_create_res', 'fd_checkin_out', 'fd_walkin', 'fd_vip_handling',
            'cash_open_close', 'cash_post_charges', 'cash_settle_payments', 'cash_split_transfer', 'cash_apply_discounts',
            'hk_update_status', 'hk_lost_found'
        ],
    },
    {
        id: 'role-night-auditor',
        name: 'Night Auditor',
        code: 'ROLE_NIGHT_AUDITOR',
        tier: 'L3 Cashier/POS',
        description: 'Runs daily night audit rollover, audits cashier balances, posts automated room charges, generates daily revenue trial balance.',
        membersCount: 3,
        isSystem: true,
        maxDiscount: 15,
        canVoid: true,
        allowBackdate: false,
        ipRestricted: true,
        allowedIp: '192.168.1.0/24',
        concurrentSessions: 1,
        keyCapabilities: ['Automated Night Audit', 'System Date Roll', 'Room Revenue Posting', 'Trial Balance Generation'],
        permissions: [
            'fd_view_rack', 'fd_create_res', 'fd_checkin_out',
            'cash_open_close', 'cash_post_charges', 'cash_settle_payments', 'cash_split_transfer', 'cash_void_bills',
            'na_run_audit', 'na_post_room_rev', 'na_noshow_release', 'na_trial_balance',
            'hk_update_status', 'pos_transfer_folio'
        ],
    },
    {
        id: 'role-fb-captain',
        name: 'F&B Service Captain / Cashier',
        code: 'ROLE_FNB_CAPTAIN',
        tier: 'L3 Cashier/POS',
        description: 'Table order management, KDS dispatch, restaurant bill settlement, room folio charging, split checks, and cashier reconciliation.',
        membersCount: 6,
        isSystem: true,
        maxDiscount: 10,
        canVoid: false,
        allowBackdate: false,
        ipRestricted: true,
        allowedIp: '192.168.1.0/24',
        concurrentSessions: 1,
        keyCapabilities: ['Table POS & KOT Dispatch', 'Room Folio Transfers', 'Split Check Settlement', 'Cash Drawer Float'],
        permissions: [
            'cash_open_close', 'cash_settle_payments', 'cash_apply_discounts',
            'pos_create_order', 'pos_transfer_folio', 'pos_split_bill'
        ],
    },
    {
        id: 'role-hk-supervisor',
        name: 'Housekeeping Supervisor',
        code: 'ROLE_HK_SUPERVISOR',
        tier: 'L4 Service',
        description: 'Manages room cleaning schedules, inspects cleaned rooms to release for occupancy, logs minibar consumption, records lost & found.',
        membersCount: 4,
        isSystem: true,
        maxDiscount: 0,
        canVoid: false,
        allowBackdate: false,
        ipRestricted: true,
        allowedIp: '192.168.1.0/24',
        concurrentSessions: 2,
        keyCapabilities: ['Room Status (Dirty/Clean/Inspected)', 'Minibar Charges to Folio', 'Out-of-Order Blocking', 'Lost & Found Registry'],
        permissions: [
            'fd_view_rack',
            'cash_post_charges',
            'hk_update_status', 'hk_inspect_room', 'hk_minibar_post', 'hk_out_of_order', 'hk_lost_found', 'hk_work_orders'
        ],
    },
    {
        id: 'role-controller',
        name: 'Financial Controller & Accountant',
        code: 'ROLE_FINANCIAL_CONTROLLER',
        tier: 'L2 Operations',
        description: 'Supervises corporate city ledger, approves credit limits, audits cashier blind drops, tracks vendor payables, generates VAT/Tax returns.',
        membersCount: 4,
        isSystem: true,
        maxDiscount: 20,
        canVoid: true,
        allowBackdate: true,
        ipRestricted: false,
        concurrentSessions: 2,
        keyCapabilities: ['City Ledger Approvals', 'Vendor PO & Invoices', 'Statutory Tax Compliance', 'Tally / ERP Sync'],
        permissions: [
            'cash_open_close', 'cash_settle_payments', 'cash_void_bills', 'cash_process_refunds',
            'na_trial_balance',
            'acc_city_ledger', 'acc_vendor_po', 'acc_tax_reports', 'acc_gl_export',
            'sec_view_audit'
        ],
    },
];

interface AdminSecurityProps {
    initialTab?: 'users' | 'roles' | 'departments' | 'shifts' | 'policies' | 'audit';
    onNavigate?: (page: string) => void;
}

export const AdminSecurity: React.FC<AdminSecurityProps> = ({
    initialTab = 'users',
    onNavigate,
}) => {
    // Tab Navigation State
    const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'departments' | 'shifts' | 'policies' | 'audit'>(initialTab);

    // Sync initialTab when route changes
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    // Data Collections State
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [rolesList, setRolesList] = useState<SecurityRole[]>(INITIAL_ROLES);
    const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [departmentsList, setDepartmentsList] = useState<any[]>([]);
    const [shiftsList, setShiftsList] = useState<any[]>([]);

    useEffect(() => {
        const API_BASE = getApiBaseUrl();
        fetch(`${API_BASE}/api/hrm/employees?propertyId=1`)
            .then(r => r.json())
            .then(j => {
                if (j.success && Array.isArray(j.data)) {
                    const mappedStaff: StaffMember[] = j.data.map((e: any, idx: number) => ({
                        id: String(e.id),
                        staffCode: e.employee_code || `EMP-${1001 + idx}`,
                        name: `${e.first_name} ${e.last_name}`,
                        username: `${e.first_name.toLowerCase()}.${e.last_name.toLowerCase()}`,
                        email: e.email || `${e.employee_code.toLowerCase()}@hotel.com`,
                        phone: e.phone || '+880 1711 000000',
                        avatarInitials: `${e.first_name?.[0] || 'S'}${e.last_name?.[0] || 'M'}`.toUpperCase(),
                        department: (e.department_name || 'Front Office') as StaffDepartment,
                        designation: e.designation_title || 'Staff',
                        role: e.designation_title || 'Front Desk Receptionist',
                        roleTier: idx === 0 ? 'L1 Executive' : idx < 3 ? 'L2 Operations' : 'L3 Cashier/POS',
                        shift: 'General Day (09:00 - 18:00)',
                        propertyScope: 'Grand Palace Hotel & Resort (Primary)',
                        twoFactorEnabled: true,
                        deviceBinding: `Workstation-0${idx + 1}`,
                        maxDiscountPercent: idx === 0 ? 50 : 15,
                        canVoidBills: idx < 2,
                        status: e.status === 'INACTIVE' ? 'Suspended' : 'Active',
                        isOnline: true,
                        lastLogin: 'Active Session',
                        lastIp: `192.168.1.${10 + idx}`,
                        nidPassport: `NID-${8192000 + idx}`,
                        bankName: 'Eastern Bank PLC',
                        bankAccount: `1041002938${10 + idx}`,
                        mfsNumber: `${e.phone || '+880 1711 000000'} (bKash)`
                    }));
                    setStaffList(mappedStaff);
                    setActiveSessions(mappedStaff.map((s, idx) => ({
                        id: `sess-${s.id}`,
                        staffName: s.name,
                        role: s.role,
                        terminal: s.deviceBinding,
                        ip: s.lastIp,
                        loginTime: `0${8 + (idx % 3)}:00 AM`,
                        idleTime: 'Active now'
                    })));
                    setAuditLogs(mappedStaff.slice(0, 4).map((s, idx) => ({
                        id: `aud-${900 + idx}`,
                        user: s.name,
                        staffCode: s.staffCode,
                        role: s.role,
                        action: `Authenticated RBAC session on ${s.deviceBinding} (${s.department})`,
                        module: s.department,
                        severity: 'info',
                        timestamp: 'Today',
                        ip: s.lastIp,
                        device: s.deviceBinding
                    })));
                }
            })
            .catch(() => {});

        fetch(`${API_BASE}/api/hrm/departments`)
            .then(r => r.json())
            .then(j => {
                if (j.success && Array.isArray(j.data)) {
                    setDepartmentsList(j.data.map((d: any) => ({
                        id: d.id,
                        code: d.code,
                        name: d.name,
                        hodName: 'Department Head',
                        costCenterCode: d.cost_center_code || `CC-${d.code}`,
                        type: 'Operational (Revenue Generating)',
                        staffCount: Number(d.active_employees) || 0,
                        monthlyBudgetBDT: 500000,
                        status: 'Active'
                    })));
                }
            })
            .catch(() => {});

        fetch(`${API_BASE}/api/hrm/shifts`)
            .then(r => r.json())
            .then(j => {
                if (j.success && Array.isArray(j.data)) {
                    setShiftsList(j.data.map((s: any) => ({
                        id: s.id,
                        code: 'SHT-' + s.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3),
                        name: s.name,
                        startTime: s.start_time,
                        endTime: s.end_time,
                        gracePeriodMinutes: Number(s.grace_period_minutes) || 15,
                        mandatoryCashHandover: true,
                        canTriggerNightAudit: s.name.toLowerCase().includes('night'),
                        assignedStaffCount: Number(s.assigned_today) || 0,
                        color: 'border-blue-400 bg-blue-50 text-blue-800',
                        status: 'Active'
                    })));
                }
            })
            .catch(() => {});
    }, []);

    // Filter States for Users
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [shiftFilter, setShiftFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'On Leave' | 'Suspended'>('ALL');

    // Modals & Drawers
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
    const [staffModalTab, setStaffModalTab] = useState<'identity' | 'role' | 'pos' | 'kyc'>('identity');

    // Role Matrix Modal State
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<SecurityRole | null>(null);
    const [rolePermissions, setRolePermissions] = useState<string[]>([]);
    const [permissionSearch, setPermissionSearch] = useState('');

    // Reset Password / Security PIN Modal
    const [resetCredsStaff, setResetCredsStaff] = useState<StaffMember | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [newPin, setNewPin] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Temporary Notification Helper
    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Filtered Staff Calculation
    const filteredStaff = useMemo(() => {
        return staffList.filter(staff => {
            const matchesSearch =
                staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                staff.staffCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                staff.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                staff.phone.includes(searchQuery);

            const matchesDept = departmentFilter === 'ALL' || staff.department === departmentFilter;
            const matchesRole = roleFilter === 'ALL' || staff.role === roleFilter;
            const matchesShift = shiftFilter === 'ALL' || staff.shift === shiftFilter;
            const matchesStatus = statusFilter === 'ALL' || staff.status === statusFilter;

            return matchesSearch && matchesDept && matchesRole && matchesShift && matchesStatus;
        });
    }, [staffList, searchQuery, departmentFilter, roleFilter, shiftFilter, statusFilter]);

    // Handle Tab Switch & Sync Route
    const handleTabChange = (tab: 'users' | 'roles' | 'departments' | 'shifts' | 'policies' | 'audit') => {
        setActiveTab(tab);
        if (onNavigate) {
            if (tab === 'users') onNavigate('users');
            else if (tab === 'roles') onNavigate('roles-permissions');
        }
    };

    // Staff Actions
    const handleOpenAddStaff = () => {
        setEditingStaff(null);
        setStaffModalTab('identity');
        setIsStaffModalOpen(true);
    };

    const handleOpenEditStaff = (staff: StaffMember) => {
        setEditingStaff(staff);
        setStaffModalTab('identity');
        setIsStaffModalOpen(true);
    };

    const handleToggleStaffStatus = (staffId: string) => {
        setStaffList(prev =>
            prev.map(s => {
                if (s.id === staffId) {
                    const nextStatus = s.status === 'Active' ? 'Suspended' : 'Active';
                    showToast(`Staff member ${s.name} status updated to ${nextStatus}.`);
                    return { ...s, status: nextStatus };
                }
                return s;
            })
        );
    };

    const handleSaveStaffForm = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = (formData.get('name') as string) || 'New Staff';
        const email = (formData.get('email') as string) || '';
        const phone = (formData.get('phone') as string) || '';
        const department = (formData.get('department') as StaffDepartment) || 'Front Office';
        const designation = (formData.get('designation') as string) || 'Staff Officer';
        const roleName = (formData.get('role') as string) || 'Front Desk Receptionist';
        const shift = (formData.get('shift') as ShiftType) || 'Morning (07:00 - 15:30)';
        const maxDiscount = Number(formData.get('maxDiscountPercent')) || 0;
        const canVoid = formData.get('canVoidBills') === 'on';
        const twoFactor = formData.get('twoFactorEnabled') === 'on';
        const propertyScope = (formData.get('propertyScope') as string) || 'The Grand Palace Hotel (Primary)';
        const nidPassport = (formData.get('nidPassport') as string) || '';
        const bankName = (formData.get('bankName') as string) || '';
        const bankAccount = (formData.get('bankAccount') as string) || '';
        const mfsNumber = (formData.get('mfsNumber') as string) || '';

        const selectedRoleObj = rolesList.find(r => r.name === roleName);

        if (editingStaff) {
            setStaffList(prev =>
                prev.map(s =>
                    s.id === editingStaff.id
                        ? {
                            ...s,
                            name,
                            email,
                            phone,
                            department,
                            designation,
                            role: roleName,
                            roleTier: selectedRoleObj?.tier || s.roleTier,
                            shift,
                            maxDiscountPercent: maxDiscount,
                            canVoidBills: canVoid,
                            twoFactorEnabled: twoFactor,
                            propertyScope,
                            nidPassport,
                            bankName,
                            bankAccount,
                            mfsNumber,
                        }
                        : s
                )
            );
            showToast(`Staff member "${name}" profile updated successfully.`);
        } else {
            const newId = `usr-${Date.now().toString().slice(-4)}`;
            const initials = name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'ST';
            const username = name.toLowerCase().replace(/\s+/g, '.') + Math.floor(10 + Math.random() * 90);

            const newMember: StaffMember = {
                id: newId,
                staffCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                name,
                username,
                email,
                phone,
                avatarInitials: initials,
                department,
                designation,
                role: roleName,
                roleTier: selectedRoleObj?.tier || 'L3 Cashier/POS',
                shift,
                propertyScope,
                twoFactorEnabled: twoFactor,
                deviceBinding: 'Unbound (First Login)',
                maxDiscountPercent: maxDiscount,
                canVoidBills: canVoid,
                status: 'Active',
                isOnline: false,
                lastLogin: 'Never',
                lastIp: '—',
                nidPassport,
                bankName,
                bankAccount,
                mfsNumber,
            };
            setStaffList(prev => [newMember, ...prev]);
            showToast(`New staff member "${name}" registered successfully.`);
        }

        setIsStaffModalOpen(false);
    };

    // Role Actions
    const handleOpenEditRole = (role: SecurityRole) => {
        setEditingRole(role);
        setRolePermissions([...role.permissions]);
        setPermissionSearch('');
        setIsRoleModalOpen(true);
    };

    const handleCreateNewRole = () => {
        const baseRole = rolesList[3] || rolesList[0];
        setEditingRole({
            id: `role-${Date.now().toString().slice(-4)}`,
            name: 'New Custom Role',
            code: 'ROLE_CUSTOM',
            tier: 'L3 Cashier/POS',
            description: 'Custom security role with tailored hospitality permissions.',
            membersCount: 0,
            isSystem: false,
            maxDiscount: 10,
            canVoid: false,
            allowBackdate: false,
            ipRestricted: true,
            allowedIp: '192.168.1.0/24',
            concurrentSessions: 1,
            keyCapabilities: ['Custom Permissions'],
            permissions: [...baseRole.permissions],
        });
        setRolePermissions([...baseRole.permissions]);
        setPermissionSearch('');
        setIsRoleModalOpen(true);
    };

    const handleTogglePermission = (actionId: string) => {
        setRolePermissions(prev =>
            prev.includes(actionId) ? prev.filter(id => id !== actionId) : [...prev, actionId]
        );
    };

    const handleGrantAllPermissions = () => {
        const allActionIds = HOSPITALITY_PERMISSION_MODULES.flatMap(m => m.actions.map(a => a.id));
        setRolePermissions(allActionIds);
    };

    const handleClearAllPermissions = () => {
        setRolePermissions([]);
    };

    const handleSaveRoleMatrix = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingRole) return;

        const formData = new FormData(e.currentTarget);
        const name = (formData.get('roleName') as string) || editingRole.name;
        const description = (formData.get('roleDesc') as string) || editingRole.description;
        const tier = (formData.get('roleTier') as SecurityTier) || editingRole.tier;
        const maxDiscount = Number(formData.get('maxDiscount')) || 0;
        const canVoid = formData.get('canVoid') === 'on';
        const allowBackdate = formData.get('allowBackdate') === 'on';
        const ipRestricted = formData.get('ipRestricted') === 'on';
        const allowedIp = (formData.get('allowedIp') as string) || '192.168.1.0/24';
        const concurrentSessions = Number(formData.get('concurrentSessions')) || 1;

        const updatedRole: SecurityRole = {
            ...editingRole,
            name,
            description,
            tier,
            maxDiscount,
            canVoid,
            allowBackdate,
            ipRestricted,
            allowedIp,
            concurrentSessions,
            permissions: rolePermissions,
        };

        setRolesList(prev => {
            const exists = prev.some(r => r.id === updatedRole.id);
            if (exists) {
                return prev.map(r => (r.id === updatedRole.id ? updatedRole : r));
            }
            return [...prev, updatedRole];
        });

        // Add to audit trail
        setAuditLogs(prev => [
            {
                id: `aud-${Date.now().toString().slice(-3)}`,
                user: 'Imran Hossain',
                staffCode: 'EMP-1001',
                role: 'Super Administrator',
                action: `Updated RBAC Security Matrix for role "${name}" (${rolePermissions.length} permissions configured)`,
                module: 'RBAC Governance',
                severity: 'info',
                timestamp: 'Just now',
                ip: '192.168.1.10',
                device: 'HQ-MacBook-Pro',
            },
            ...prev,
        ]);

        showToast(`Role "${name}" RBAC policy deployed successfully.`);
        setIsRoleModalOpen(false);
    };

    const handleTerminateSession = (sessionId: string, staffName: string) => {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        showToast(`Active session for ${staffName} terminated immediately.`);
    };

    const handleExecuteResetCreds = (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetCredsStaff) return;
        showToast(`Password/PIN reset dispatched for ${resetCredsStaff.name}. Notification sent to ${resetCredsStaff.email}.`);
        setResetCredsStaff(null);
        setNewPassword('');
        setNewPin('');
    };

    // Export CSV Helper
    const handleExportStaffCsv = () => {
        const headers = ['Staff Code', 'Name', 'Email', 'Phone', 'Department', 'Designation', 'Role', 'Shift', 'Status'];
        const rows = staffList.map(s => [
            s.staffCode,
            `"${s.name}"`,
            s.email,
            s.phone,
            `"${s.department}"`,
            `"${s.designation}"`,
            `"${s.role}"`,
            `"${s.shift}"`,
            s.status,
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `hotel_staff_roster_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Staff roster exported to CSV successfully.');
    };

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans text-gray-800">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[120] bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 border border-gray-700">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Consistent Elevated Header Card */}
            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/80 flex items-center justify-center text-blue-700 text-sm shadow-2xs flex-shrink-0">
                            <ShieldCheck size={22} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg text-gray-900 tracking-tight leading-tight">
                                    Staff Directory & Access Control
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200/60 flex-shrink-0">
                                    Enterprise RBAC
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1 font-medium">
                                <span className="flex items-center gap-1">
                                    <Users size={11} className="text-gray-400" />
                                    <span>{staffList.filter(s => s.status === 'Active').length} Active Staff</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Shield size={11} className="text-gray-400" />
                                    <span>{rolesList.length} Defined Roles</span>
                                </span>
                                <span className="hidden sm:flex items-center gap-1">
                                    <Smartphone size={11} className="text-gray-400" />
                                    <span>88% 2FA Enforcement</span>
                                </span>
                                <span className="hidden lg:flex items-center gap-1">
                                    <Wifi size={11} className="text-gray-400" />
                                    <span>{activeSessions.length} Live On-Premise Sessions</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleExportStaffCsv}
                            className="h-7 px-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            title="Export Staff Roster CSV"
                        >
                            <Download size={12} className="text-gray-400" />
                            <span>Export CSV</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateNewRole}
                            className="h-7 px-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Shield size={12} className="text-blue-600" />
                            <span>New Role</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenAddStaff}
                            className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus size={13} />
                            <span>Register Staff</span>
                        </button>
                    </div>
                </div>

                {/* Compact Segmented Navigation Tabs */}
                <div className="px-3 sm:px-4 py-2 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        <button
                            type="button"
                            onClick={() => handleTabChange('users')}
                            className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'users'
                                ? 'bg-white text-blue-700 shadow-2xs border border-gray-200 font-bold'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                }`}
                        >
                            <Users size={13} />
                            <span>Users & Staff</span>
                            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-100">
                                {staffList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange('roles')}
                            className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'roles'
                                ? 'bg-white text-blue-700 shadow-2xs border border-gray-200 font-bold'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                }`}
                        >
                            <Shield size={13} />
                            <span>Roles & RBAC Matrix</span>
                            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 text-gray-700 border border-gray-200">
                                {rolesList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange('departments')}
                            className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'departments'
                                ? 'bg-white text-blue-700 shadow-2xs border border-gray-200 font-bold'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                }`}
                        >
                            <Building2 size={13} />
                            <span>Departments</span>
                            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-100">
                                {departmentsList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange('shifts')}
                            className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'shifts'
                                ? 'bg-white text-blue-700 shadow-2xs border border-gray-200 font-bold'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                }`}
                        >
                            <Clock size={13} />
                            <span>Work Shifts</span>
                            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-50 text-purple-700 border border-purple-100">
                                {shiftsList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange('policies')}
                            className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'policies'
                                ? 'bg-white text-blue-700 shadow-2xs border border-gray-200 font-bold'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                }`}
                        >
                            <Sliders size={13} />
                            <span>POS & Financial Limits</span>
                            <span className="hidden sm:inline-block ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-50 text-amber-700 border border-amber-200/60">
                                Guardrails Active
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange('audit')}
                            className={`h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'audit'
                                ? 'bg-white text-blue-700 shadow-2xs border border-gray-200 font-bold'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                }`}
                        >
                            <History size={13} />
                            <span>Audit Trail & Sessions</span>
                            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                {activeSessions.length} Live
                            </span>
                        </button>
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 font-mono">
                        <Clock size={12} className="text-gray-400" />
                        <span>Audit Synced</span>
                    </div>
                </div>
            </div>

            {/* TAB 1: USERS & STAFF DIRECTORY */}
            {activeTab === 'users' && (
                <div className="space-y-3">
                    {/* Informative Guidance Banner for Hotel Staff Management */}
                    <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-3 rounded-xl border border-blue-200/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                                <Info size={16} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-900">Hotel Staff & User Account Governance</span>
                                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">PCI-DSS Audited</span>
                                </div>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Configure staff user accounts, assign role security tiers (L1–L4), enforce 2FA verification, and calibrate max discount limits.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-600 flex-shrink-0 font-medium">
                            <span className="inline-flex items-center gap-1 text-blue-700 bg-white px-2 py-1 rounded-md border border-blue-200 shadow-2xs">
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                <span>Anti-Fraud Protection</span>
                            </span>
                        </div>
                    </div>

                    {/* Top KPI Metrics Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200/90 shadow-2xs flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <Users size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] uppercase text-gray-400 tracking-wider">Total Staff</div>
                                <div className="text-sm text-gray-900 leading-tight">
                                    {staffList.length} <span className="text-[11px] font-normal text-emerald-600 font-medium">({staffList.filter(s => s.status === 'Active').length} Active)</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200/90 shadow-2xs flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                <Smartphone size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] uppercase text-gray-400 tracking-wider">2FA Compliance</div>
                                <div className="text-sm text-gray-900 leading-tight">
                                    {Math.round((staffList.filter(s => s.twoFactorEnabled).length / staffList.length) * 100)}%
                                    <span className="text-[11px] font-normal text-gray-400 ml-1">Enforced</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200/90 shadow-2xs flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                                <Clock size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] uppercase text-gray-400 tracking-wider">Shifts Scheduled</div>
                                <div className="text-sm text-gray-900 leading-tight">
                                    3 Shifts <span className="text-[11px] font-normal text-amber-600 font-medium">(24/7 Desk)</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200/90 shadow-2xs flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                                <ShieldCheck size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] uppercase text-gray-400 tracking-wider">Security Tiering</div>
                                <div className="text-sm text-gray-900 leading-tight">
                                    4 Tiers <span className="text-[11px] font-normal text-purple-600 font-medium">(L1 to L4)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compact Filter & Search Toolbar */}
                    <div className="bg-white rounded-xl border border-gray-200/90 p-2.5 sm:p-3 shadow-2xs space-y-2.5">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
                            {/* Search Input */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search staff by name, code, username, email, or phone..."
                                    className="w-full h-8 pl-8 pr-7 text-xs bg-gray-50/70 border border-gray-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Dropdowns */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-medium text-gray-500 hidden sm:inline">Dept:</span>
                                    <select
                                        value={departmentFilter}
                                        onChange={e => setDepartmentFilter(e.target.value)}
                                        className="h-8 px-2 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
                                    >
                                        <option value="ALL">All Departments</option>
                                        <option value="Front Office">Front Office</option>
                                        <option value="Housekeeping">Housekeeping</option>
                                        <option value="Food & Beverage">Food & Beverage</option>
                                        <option value="Accounts & Finance">Accounts & Finance</option>
                                        <option value="Executive Management">Executive Management</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-medium text-gray-500 hidden sm:inline">Role:</span>
                                    <select
                                        value={roleFilter}
                                        onChange={e => setRoleFilter(e.target.value)}
                                        className="h-8 px-2 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
                                    >
                                        <option value="ALL">All Roles</option>
                                        {rolesList.map(r => (
                                            <option key={r.id} value={r.name}>
                                                {r.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-medium text-gray-500 hidden sm:inline">Shift:</span>
                                    <select
                                        value={shiftFilter}
                                        onChange={e => setShiftFilter(e.target.value)}
                                        className="h-8 px-2 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer font-medium"
                                    >
                                        <option value="ALL">All Shifts</option>
                                        <option value="Morning (07:00 - 15:30)">Morning</option>
                                        <option value="Evening (15:00 - 23:30)">Evening</option>
                                        <option value="Night Audit (23:00 - 07:30)">Night Audit</option>
                                        <option value="General Day (09:00 - 18:00)">General Day</option>
                                    </select>
                                </div>

                                {(searchQuery || departmentFilter !== 'ALL' || roleFilter !== 'ALL' || shiftFilter !== 'ALL' || statusFilter !== 'ALL') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setDepartmentFilter('ALL');
                                            setRoleFilter('ALL');
                                            setShiftFilter('ALL');
                                            setStatusFilter('ALL');
                                        }}
                                        className="h-8 px-2.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium transition-colors cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Status Pills Row */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 text-xs">
                            <span className="text-[11px] text-gray-400 uppercase tracking-wider mr-1">Status:</span>
                            {(['ALL', 'Active', 'On Leave', 'Suspended'] as const).map(st => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setStatusFilter(st)}
                                    className={`h-6 px-2.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${statusFilter === st
                                        ? 'bg-blue-600 text-white shadow-2xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                                        }`}
                                >
                                    {st === 'ALL' ? `All (${staffList.length})` : `${st} (${staffList.filter(s => s.status === st).length})`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Compact High-Density Staff Table */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[980px] border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-2.5">Employee</th>
                                        <th className="px-3 py-2.5">Department & Shift</th>
                                        <th className="px-3 py-2.5">Role & Tier</th>
                                        <th className="px-3 py-2.5">Security & 2FA</th>
                                        <th className="px-3 py-2.5">Financial Authority</th>
                                        <th className="px-3 py-2.5">Status</th>
                                        <th className="px-3 py-2.5">Last Login</th>
                                        <th className="px-3 py-2.5 text-right sticky right-0 bg-gray-50/95 backdrop-blur-xs shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.08)] z-10 w-[100px]">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs">
                                    {filteredStaff.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Users size={28} className="text-gray-300" />
                                                    <span className="text-sm font-medium text-gray-600">No staff members match the selected criteria.</span>
                                                    <span className="text-xs text-gray-400">Try adjusting your department, role, or search keyword.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStaff.map(staff => (
                                            <tr key={staff.id} className="hover:bg-blue-50/25 transition-colors group">
                                                {/* Employee info */}
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="relative">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 text-blue-700 text-xs flex items-center justify-center flex-shrink-0">
                                                                {staff.avatarInitials}
                                                            </div>
                                                            {staff.isOnline && (
                                                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" title="Online on property LAN" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-gray-900 leading-snug flex items-center gap-1.5">
                                                                <span className="truncate">{staff.name}</span>
                                                                <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1 py-0.2 rounded font-normal">
                                                                    {staff.staffCode}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-gray-400 flex items-center gap-1.5 font-normal">
                                                                <span>@{staff.username}</span>
                                                                <span>•</span>
                                                                <span className="truncate max-w-[140px]" title={staff.email}>{staff.email}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Department & Shift */}
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-gray-800">{staff.department}</div>
                                                    <div className="mt-0.5">
                                                        <span className="inline-flex items-center gap-1 text-[10.5px] text-gray-500 font-medium bg-gray-50 px-1.5 py-0.2 rounded border border-gray-100">
                                                            <Clock size={10} className="text-gray-400 flex-shrink-0" />
                                                            <span className="truncate max-w-[130px]">{staff.shift.split(' (')[0]}</span>
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Role & Tier */}
                                                <td className="px-3 py-2">
                                                    <div>
                                                        <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 inline-block">
                                                            {staff.role}
                                                        </span>
                                                    </div>
                                                    <div className="mt-0.5">
                                                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border inline-block ${staff.roleTier.startsWith('L1')
                                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                            : staff.roleTier.startsWith('L2')
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                : staff.roleTier.startsWith('L3')
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                                            }`}>
                                                            {staff.roleTier}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Security & 2FA */}
                                                <td className="px-3 py-2">
                                                    <div>
                                                        {staff.twoFactorEnabled ? (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 size={11} /> 2FA Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] bg-amber-50 text-amber-700 border border-amber-200">
                                                                <AlertTriangle size={11} /> 2FA Off
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[130px]" title={staff.deviceBinding}>
                                                        {staff.deviceBinding}
                                                    </div>
                                                </td>

                                                {/* Financial Powers */}
                                                <td className="px-3 py-2">
                                                    <div className="text-[11px] font-medium text-gray-700">
                                                        Max Disc: <strong className="text-blue-700">{staff.maxDiscountPercent}%</strong>
                                                    </div>
                                                    <div className="mt-0.5">
                                                        {staff.canVoidBills ? (
                                                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                                Void: Authorized
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.2 rounded border border-gray-200">
                                                                Void: Requires Sup.
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-3 py-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStaffStatus(staff.id)}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-tight transition-all cursor-pointer ${staff.status === 'Active'
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                            : staff.status === 'On Leave'
                                                                ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                                            }`}
                                                        title="Click to toggle account status"
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${staff.status === 'Active' ? 'bg-emerald-500' : staff.status === 'On Leave' ? 'bg-blue-500' : 'bg-rose-500'}`} />
                                                        <span>{staff.status}</span>
                                                    </button>
                                                </td>

                                                {/* Last Login */}
                                                <td className="px-3 py-2">
                                                    <div className="text-gray-700 font-medium text-[11px]">{staff.lastLogin}</div>
                                                    <div className="text-[10px] font-mono text-gray-400">{staff.lastIp}</div>
                                                </td>

                                                {/* Actions (Sticky) */}
                                                <td className="px-3 py-2 text-right whitespace-nowrap sticky right-0 bg-white/95 backdrop-blur-xs group-hover:bg-blue-50/40 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.08)] z-10 w-[100px]">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditStaff(staff)}
                                                            className="p-1.5 hover:bg-blue-100/60 text-gray-500 hover:text-blue-700 rounded-md transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                                                            title="Edit Staff Profile & Access"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setResetCredsStaff(staff)}
                                                            className="p-1.5 hover:bg-amber-100/60 text-gray-500 hover:text-amber-700 rounded-md transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                                                            title="Reset Password or Cashier PIN"
                                                        >
                                                            <KeyRound size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleStaffStatus(staff.id)}
                                                            className={`p-1.5 rounded-md transition-colors cursor-pointer border border-transparent ${staff.status === 'Active'
                                                                ? 'hover:bg-rose-100/60 text-gray-400 hover:text-rose-600 hover:border-rose-200'
                                                                : 'hover:bg-emerald-100/60 text-emerald-600 hover:border-emerald-200'
                                                                }`}
                                                            title={staff.status === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
                                                        >
                                                            {staff.status === 'Active' ? <Lock size={13} /> : <Unlock size={13} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: ROLES & RBAC MATRIX */}
            {activeTab === 'roles' && (
                <div className="space-y-3">
                    {/* Informative Guidance Banner for Role-Based Access Control */}
                    <div className="bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white p-3 rounded-xl border border-indigo-200/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                                <ShieldCheck size={16} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-900">Role-Based Access Control (RBAC) Architecture</span>
                                    <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">Granular Matrix</span>
                                </div>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Configure role-based permission matrices, supervisory override authorizations, maximum discount caps, and billing void controls.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-600 flex-shrink-0 font-medium">
                            <span className="inline-flex items-center gap-1 text-indigo-700 bg-white px-2 py-1 rounded-md border border-indigo-200 shadow-2xs">
                                <Lock size={11} className="text-indigo-600" />
                                <span>Zero-Trust Security</span>
                            </span>
                        </div>
                    </div>

                    {/* Header info */}
                    <div className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm text-gray-900">Hospitality Security Role Profiles</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Granular module permissions for Front Desk, Cashiering, Night Audit, POS, Housekeeping, and General Ledger.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleGrantAllPermissions}
                                className="h-7 px-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer"
                            >
                                Grant Full System Access
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateNewRole}
                                className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                                <Plus size={13} />
                                <span>Create Custom Role</span>
                            </button>
                        </div>
                    </div>

                    {/* Role Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rolesList.map(role => (
                            <div
                                key={role.id}
                                className="bg-white rounded-xl border border-gray-200/90 p-3.5 shadow-2xs hover:shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between space-y-3 group"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <Shield size={16} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm text-gray-900 leading-tight">{role.name}</h3>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] font-mono text-gray-400 font-semibold">{role.code}</span>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-gray-100 text-gray-600">
                                                        {role.tier}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {role.isSystem ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                System Default
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                                                Custom Role
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                                        {role.description}
                                    </p>

                                    {/* Capabilities Pills */}
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {role.keyCapabilities.slice(0, 3).map((cap, i) => (
                                            <span
                                                key={i}
                                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-100"
                                            >
                                                {cap}
                                            </span>
                                        ))}
                                        {role.keyCapabilities.length > 3 && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-400">
                                                +{role.keyCapabilities.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-gray-100">
                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                                        <div>
                                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Max Discount</span>
                                            <strong className="text-gray-800">{role.maxDiscount}% Allowance</strong>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block text-[10px] uppercase font-bold">Void Authority</span>
                                            <strong className={role.canVoid ? 'text-emerald-700' : 'text-gray-400'}>
                                                {role.canVoid ? 'Authorized' : 'Requires Sup.'}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <Users size={12} className="text-gray-400" />
                                            <span><strong>{staffList.filter(s => s.role === role.name).length}</strong> Staff Assigned</span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditRole(role)}
                                            className="h-7 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                        >
                                            <Sliders size={12} />
                                            <span>Edit Matrix ({role.permissions.length})</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB: DEPARTMENTS & COST CENTERS */}
            {activeTab === 'departments' && (
                <div className="space-y-3">
                    <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white p-3 rounded-xl border border-blue-200/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                                <Building2 size={16} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-900">Hotel Organizational Departments & Cost Center Roster</span>
                                    <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">Master Org Structure</span>
                                </div>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Each department maps to a specific hotel operational cost center, budget allotment, and Head of Department (HOD).
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Building2 size={14} className="text-blue-600" />
                                <span>Active Departments ({departmentsList.length})</span>
                            </h3>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Synced with Master Data Config
                            </span>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-2">Code</th>
                                        <th className="px-3 py-2">Department Name</th>
                                        <th className="px-3 py-2">Head of Department (HOD)</th>
                                        <th className="px-3 py-2">Cost Center</th>
                                        <th className="px-3 py-2">Category</th>
                                        <th className="px-3 py-2">Active Staff</th>
                                        <th className="px-3 py-2">Monthly Budget</th>
                                        <th className="px-3 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {departmentsList.map((d: any) => (
                                        <tr key={d.id} className="hover:bg-blue-50/20">
                                            <td className="px-3 py-2 font-mono text-blue-700">{d.code}</td>
                                            <td className="px-3 py-2 text-gray-900">{d.name}</td>
                                            <td className="px-3 py-2 text-gray-700">{d.hodName}</td>
                                            <td className="px-3 py-2 font-mono text-[11px] text-gray-600 font-bold">{d.costCenterCode}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-1.5 py-0.2 rounded text-[10px] ${d.type.includes('Operational') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                                                    {d.type.includes('Operational') ? 'Operational' : 'Support / Overhead'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-900">
                                                {staffList.filter(s => s.department === d.name || s.department.toLowerCase().includes(d.code.toLowerCase())).length || d.staffCount} Staff
                                            </td>
                                            <td className="px-3 py-2 font-mono text-gray-700">৳ {d.monthlyBudgetBDT?.toLocaleString()}</td>
                                            <td className="px-3 py-2">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {d.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: WORK SHIFTS & ROSTERING */}
            {activeTab === 'shifts' && (
                <div className="space-y-3">
                    <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-white p-3 rounded-xl border border-purple-200/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                                <Clock size={16} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-900">24/7 Hotel Operations Work Shift Configuration</span>
                                    <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">Continuous Desk Protocol</span>
                                </div>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    Configures shift turnover boundaries, cash drawer blind counts, grace periods, and night audit automation permissions.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {shiftsList.map((s: any) => (
                            <div
                                key={s.id}
                                className={`bg-white p-3.5 rounded-xl border ${s.color} transition-all flex flex-col justify-between space-y-2 relative shadow-2xs`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] uppercase bg-white/90 px-1.5 py-0.2 rounded border border-current">
                                        {s.code}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        {s.status}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="text-sm text-gray-900">{s.name}</h4>
                                    <div className="font-mono text-xs text-blue-700 mt-1">
                                        {s.startTime} - {s.endTime}
                                    </div>
                                    <div className="text-[10.5px] text-gray-500 mt-0.5">Clock-in Grace: {s.gracePeriodMinutes} mins</div>
                                </div>
                                <div className="pt-2 border-t border-gray-100 text-[10.5px] space-y-1 text-gray-600">
                                    <div className="flex items-center justify-between">
                                        <span>Cash Drawer Handover:</span>
                                        <span className="text-gray-900">{s.mandatoryCashHandover ? 'Mandatory' : 'Optional'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Night Audit EOD:</span>
                                        <span className={`${s.canTriggerNightAudit ? 'text-purple-700' : 'text-gray-400'}`}>
                                            {s.canTriggerNightAudit ? 'Authorized' : 'Restricted'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <span>Staff Scheduled:</span>
                                        <span className="text-gray-900">
                                            {staffList.filter(st => st.shift.includes(s.name.split(' ')[0])).length || s.assignedStaffCount} Personnel
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: POS & FINANCIAL LIMITS / GUARDRAILS */}
            {activeTab === 'policies' && (
                <div className="space-y-3">
                    <div className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                            <div>
                                <h2 className="text-sm text-gray-900 flex items-center gap-2">
                                    <Sliders size={16} className="text-blue-600" />
                                    <span>Enterprise POS, Cashiering & Audit Guardrails</span>
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Mandatory controls to prevent cashier leakage, unapproved voids, and out-of-balance folios.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => showToast('Security policy guardrails saved and synchronized across all terminals.')}
                                className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
                            >
                                <Save size={13} />
                                <span>Save Policy Guardrails</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Card 1: Discount Authority */}
                            <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/80 space-y-3">
                                <div className="flex items-center gap-2 text-xs text-gray-900">
                                    <DollarSign size={14} className="text-emerald-600" />
                                    <span>Discount Approval Matrix</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Front Desk Receptionist</span>
                                        <span className="text-gray-800">Max 10%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Front Office Manager (FOM)</span>
                                        <span className="text-gray-800">Max 25%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">General Manager (GM)</span>
                                        <span className="text-gray-800">Max 50%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Managing Director / Owner</span>
                                        <span className="text-blue-700">100% (Complimentary)</span>
                                    </div>
                                </div>
                                <div className="p-2 bg-blue-50/60 rounded-lg text-[11px] text-blue-800 border border-blue-100 flex items-start gap-1.5">
                                    <Info size={13} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                    <span>Discounts exceeding staff limit require a 4-digit supervisor approval PIN prompt.</span>
                                </div>
                            </div>

                            {/* Card 2: Void & Cancellation Policy */}
                            <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/80 space-y-3">
                                <div className="flex items-center gap-2 text-xs text-gray-900">
                                    <Receipt size={14} className="text-rose-600" />
                                    <span>Bill Void & Refund Governance</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-gray-600">Require Mandatory Void Reason Code</span>
                                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-gray-600">Require Manager PIN for KOT Void</span>
                                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-gray-600">Prohibit Post-Night Audit Bill Deletions</span>
                                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-gray-600">Auto-Alert GM on Voids &gt; $100</span>
                                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                                    </label>
                                </div>
                                <div className="p-2 bg-rose-50/60 rounded-lg text-[11px] text-rose-800 border border-rose-100 flex items-start gap-1.5">
                                    <AlertTriangle size={13} className="text-rose-600 flex-shrink-0 mt-0.5" />
                                    <span>Every void action is logged to immutable security audit logs with operator IP.</span>
                                </div>
                            </div>

                            {/* Card 3: Session & LAN Restrictions */}
                            <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/80 space-y-3">
                                <div className="flex items-center gap-2 text-xs text-gray-900">
                                    <Wifi size={14} className="text-blue-600" />
                                    <span>Network & Session Security</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Front Desk IP Subnet</span>
                                        <span className="font-mono text-gray-800 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                            192.168.1.0/24
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Auto-Logout Inactivity Timer</span>
                                        <span className="text-gray-800">15 Minutes</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Max Concurrent Logins</span>
                                        <span className="text-gray-800">1 Terminal / User</span>
                                    </div>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-gray-600">Block Logins Outside Property LAN</span>
                                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                                    </label>
                                </div>
                                <div className="p-2 bg-emerald-50/60 rounded-lg text-[11px] text-emerald-800 border border-emerald-100 flex items-start gap-1.5">
                                    <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <span>Executive staff with remote VPN access are protected by mandatory 2FA.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: AUDIT TRAIL & ACTIVE SESSIONS */}
            {activeTab === 'audit' && (
                <div className="space-y-3">
                    {/* Active Live Sessions */}
                    <div className="bg-white rounded-xl border border-gray-200/90 p-3.5 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <h3 className="text-xs text-gray-900 uppercase tracking-wider">
                                    Live On-Premise Sessions ({activeSessions.length} Active)
                                </h3>
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono">Terminal Watchdog Active</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {activeSessions.map(session => (
                                <div
                                    key={session.id}
                                    className="p-2.5 bg-gray-50/70 border border-gray-200/70 rounded-lg flex items-center justify-between gap-2 text-xs"
                                >
                                    <div className="min-w-0">
                                        <div className="text-gray-900 truncate">{session.staffName}</div>
                                        <div className="text-[11px] text-gray-500 truncate">{session.role}</div>
                                        <div className="text-[10px] font-mono text-gray-400 mt-0.5 flex items-center gap-1.5">
                                            <span>{session.terminal}</span>
                                            <span>•</span>
                                            <span>{session.ip}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleTerminateSession(session.id, session.staffName)}
                                        className="h-6 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] transition-colors cursor-pointer flex-shrink-0"
                                        title="Kill session immediately"
                                    >
                                        Kill
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Security Audit Trail Table */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                <History size={14} className="text-blue-600" />
                                <span>Security Event & Override Audit Log</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => showToast('Audit logs exported.')}
                                className="h-6 px-2 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded font-medium flex items-center gap-1 cursor-pointer"
                            >
                                <Download size={11} /> Export Log
                            </button>
                        </div>

                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left min-w-[850px] border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-2">Timestamp</th>
                                        <th className="px-3 py-2">Actor & Role</th>
                                        <th className="px-3 py-2">Module</th>
                                        <th className="px-3 py-2">Activity Description</th>
                                        <th className="px-3 py-2">Severity</th>
                                        <th className="px-3 py-2">Terminal & IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {auditLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-3 py-2 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                                                {log.timestamp}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="text-gray-800">{log.user}</div>
                                                <div className="text-[10px] text-gray-400">{log.role}</div>
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span className="px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-gray-100 text-gray-700">
                                                    {log.module}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-700 leading-snug">
                                                {log.action}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span
                                                    className={`px-1.5 py-0.2 rounded text-[10px] uppercase tracking-tight ${log.severity === 'critical'
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        : log.severity === 'warning'
                                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        }`}
                                                >
                                                    {log.severity}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 font-mono text-[10.5px] text-gray-400 whitespace-nowrap">
                                                <div>{log.ip}</div>
                                                <div className="text-[9.5px] text-gray-400">{log.device}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 1: ADD / EDIT STAFF PROFILE (Compact Multi-Tab)      */}
            {/* ========================================================= */}
            {isStaffModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
                        {/* Modal Header */}
                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                    <User size={16} />
                                </div>
                                <div>
                                    <h2 className="text-sm text-gray-900">
                                        {editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Register New Hotel Staff'}
                                    </h2>
                                    <p className="text-[11px] text-gray-500">
                                        Setup employee credentials, departmental designation & cashier guardrails.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsStaffModalOpen(false)}
                                className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Subtabs */}
                        <div className="px-4 py-1.5 bg-white border-b border-gray-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'identity', label: '1. Core Identity', icon: User },
                                { id: 'role', label: '2. Role & Shift', icon: Briefcase },
                                { id: 'pos', label: '3. POS & Cashier Security', icon: DollarSign },
                                { id: 'kyc', label: '4. KYC & Banking', icon: CreditCard },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setStaffModalTab(t.id as any)}
                                    className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${staffModalTab === t.id
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-bold'
                                        : 'text-gray-600 hover:bg-gray-100/70'
                                        }`}
                                >
                                    <t.icon size={12} />
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSaveStaffForm} className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
                            {/* TAB 1: Core Identity */}
                            {staffModalTab === 'identity' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                required
                                                defaultValue={editingStaff?.name || ''}
                                                placeholder="e.g. Imran Hossain"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                Official Staff Code
                                            </label>
                                            <input
                                                type="text"
                                                name="staffCode"
                                                disabled
                                                defaultValue={editingStaff?.staffCode || `EMP-${Math.floor(1000 + Math.random() * 9000)}`}
                                                className="w-full h-8 px-2.5 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg text-xs font-mono"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                Work Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                defaultValue={editingStaff?.email || ''}
                                                placeholder="staff@thegrandpalace.com"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                Contact Phone Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="phone"
                                                required
                                                defaultValue={editingStaff?.phone || ''}
                                                placeholder="+880 1XXX XXXXXX"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                            />
                                        </div>
                                    </div>

                                    {!editingStaff && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-100">
                                            <div className="space-y-1">
                                                <label className="font-semibold text-gray-700">
                                                    Initial Password <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="password"
                                                    name="password"
                                                    required
                                                    defaultValue="Hotel@2026!"
                                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                                />
                                                <span className="text-[10px] text-gray-400">User will be prompted to reset upon first login.</span>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="font-semibold text-gray-700">
                                                    4-Digit Cashier / POS PIN
                                                </label>
                                                <input
                                                    type="password"
                                                    name="pin"
                                                    maxLength={4}
                                                    placeholder="e.g. 1234"
                                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-xs font-mono"
                                                />
                                                <span className="text-[10px] text-gray-400">Used for fast terminal switching at front desk / POS.</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: Role, Department & Shift */}
                            {staffModalTab === 'role' && (
                                <div className="space-y-3 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                Department <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="department"
                                                defaultValue={editingStaff?.department || 'Front Office'}
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer font-medium"
                                            >
                                                <option value="Front Office">Front Office</option>
                                                <option value="Housekeeping">Housekeeping</option>
                                                <option value="Food & Beverage">Food & Beverage</option>
                                                <option value="Kitchen & Culinary">Kitchen & Culinary</option>
                                                <option value="Accounts & Finance">Accounts & Finance</option>
                                                <option value="Maintenance & Engineering">Maintenance & Engineering</option>
                                                <option value="Executive Management">Executive Management</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                Designation Title <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="designation"
                                                required
                                                defaultValue={editingStaff?.designation || 'Front Desk Officer'}
                                                placeholder="e.g. Senior Receptionist"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                Assigned Security Role <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="role"
                                                defaultValue={editingStaff?.role || 'Front Desk Receptionist'}
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer font-semibold text-blue-700"
                                            >
                                                {rolesList.map(r => (
                                                    <option key={r.id} value={r.name}>
                                                        {r.name} ({r.tier})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                Assigned Work Shift <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="shift"
                                                defaultValue={editingStaff?.shift || 'Morning (07:00 - 15:30)'}
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer"
                                            >
                                                <option value="Morning (07:00 - 15:30)">Morning (07:00 - 15:30)</option>
                                                <option value="Evening (15:00 - 23:30)">Evening (15:00 - 23:30)</option>
                                                <option value="Night Audit (23:00 - 07:30)">Night Audit (23:00 - 07:30)</option>
                                                <option value="General Day (09:00 - 18:00)">General Day (09:00 - 18:00)</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="font-semibold text-gray-700">
                                                Property Access Scope <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                name="propertyScope"
                                                defaultValue={editingStaff?.propertyScope || 'The Grand Palace Hotel (Primary)'}
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs cursor-pointer"
                                            >
                                                <option value="The Grand Palace Hotel (Primary)">The Grand Palace Hotel (Primary Property Only)</option>
                                                <option value="All 3 Group Properties (HQ Scope)">All 3 Group Properties (HQ & Multi-Property Oversight)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: POS & Cashier Security */}
                            {staffModalTab === 'pos' && (
                                <div className="space-y-3 text-xs">
                                    <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-200/80 space-y-2">
                                        <div className="text-amber-900 flex items-center gap-1.5">
                                            <DollarSign size={14} className="text-amber-700" />
                                            <span>Cashiering & Financial Authorization Limits</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                            <div className="space-y-1">
                                                <label className="font-semibold text-gray-700">
                                                    Max Discretionary Discount (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    name="maxDiscountPercent"
                                                    min={0}
                                                    max={100}
                                                    defaultValue={editingStaff?.maxDiscountPercent ?? 10}
                                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-bold"
                                                />
                                            </div>

                                            <div className="space-y-2 pt-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="canVoidBills"
                                                        defaultChecked={editingStaff?.canVoidBills ?? false}
                                                        className="w-4 h-4 accent-blue-600 rounded"
                                                    />
                                                    <span className="font-semibold text-gray-700">Allow Independent Bill / KOT Voiding</span>
                                                </label>
                                                <span className="text-[10.5px] text-gray-500 block">
                                                    If unchecked, cashier must obtain supervisor PIN override for voiding.
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200/80 space-y-2">
                                        <div className="text-blue-900 flex items-center gap-1.5">
                                            <Shield size={14} className="text-blue-700" />
                                            <span>Two-Factor Authentication & Device Binding</span>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="twoFactorEnabled"
                                                defaultChecked={editingStaff?.twoFactorEnabled ?? true}
                                                className="w-4 h-4 accent-blue-600 rounded"
                                            />
                                            <span className="font-semibold text-gray-800">
                                                Enforce Two-Factor Authentication (2FA via Authenticator / SMS)
                                            </span>
                                        </label>
                                        <p className="text-[10.5px] text-gray-500">
                                            Mandatory under hotel policy for Cashiers, Night Auditors, and Managers.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: KYC & Banking */}
                            {staffModalTab === 'kyc' && (
                                <div className="space-y-3 text-xs">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                National ID / Passport Number
                                            </label>
                                            <input
                                                type="text"
                                                name="nidPassport"
                                                defaultValue={editingStaff?.nidPassport || ''}
                                                placeholder="NID-XXXX-XXXX-XX"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                Salary Bank Name
                                            </label>
                                            <input
                                                type="text"
                                                name="bankName"
                                                defaultValue={editingStaff?.bankName || 'Eastern Bank PLC'}
                                                placeholder="e.g. Eastern Bank PLC"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                Salary Account Number
                                            </label>
                                            <input
                                                type="text"
                                                name="bankAccount"
                                                defaultValue={editingStaff?.bankAccount || ''}
                                                placeholder="104100XXXXXX"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">
                                                MFS Wallet (bKash / Nagad / Rocket)
                                            </label>
                                            <input
                                                type="text"
                                                name="mfsNumber"
                                                defaultValue={editingStaff?.mfsNumber || ''}
                                                placeholder="+880 1XXX XXXXXX"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal Footer inside form */}
                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsStaffModalOpen(false)}
                                    className="h-8 px-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                >
                                    <Save size={13} />
                                    <span>{editingStaff ? 'Save Changes' : 'Register Staff Member'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 2: ROLE & PERMISSION MATRIX EDITOR                  */}
            {/* ========================================================= */}
            {isRoleModalOpen && editingRole && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
                        {/* Modal Header */}
                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <h2 className="text-sm text-gray-900">
                                        Configure Permissions Matrix: {editingRole.name}
                                    </h2>
                                    <p className="text-[11px] text-gray-500">
                                        Tier: <strong className="text-indigo-600">{editingRole.tier}</strong> • {rolePermissions.length} permissions granted
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsRoleModalOpen(false)}
                                className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveRoleMatrix} className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 text-xs">
                            {/* Role Identification Header Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Role Name</label>
                                    <input
                                        type="text"
                                        name="roleName"
                                        required
                                        defaultValue={editingRole.name}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs font-bold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Security Tier</label>
                                    <select
                                        name="roleTier"
                                        defaultValue={editingRole.tier}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs font-semibold cursor-pointer"
                                    >
                                        <option value="L1 Executive">L1 Executive</option>
                                        <option value="L2 Operations">L2 Operations</option>
                                        <option value="L3 Cashier/POS">L3 Cashier/POS</option>
                                        <option value="L4 Service">L4 Service</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Max Discount %</label>
                                    <input
                                        type="number"
                                        name="maxDiscount"
                                        min={0}
                                        max={100}
                                        defaultValue={editingRole.maxDiscount}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs font-bold"
                                    />
                                </div>

                                <div className="space-y-1 sm:col-span-3">
                                    <label className="font-semibold text-gray-700">Role Description</label>
                                    <input
                                        type="text"
                                        name="roleDesc"
                                        defaultValue={editingRole.description}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs"
                                    />
                                </div>
                            </div>

                            {/* Quick Presets Bar with Permission Search */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-800 text-xs">
                                        Functional Modules Matrix ({HOSPITALITY_PERMISSION_MODULES.length} Domains)
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="relative">
                                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={permissionSearch}
                                            onChange={(e) => setPermissionSearch(e.target.value)}
                                            placeholder="Search permissions (e.g. void, discount, night audit)..."
                                            className="h-6 pl-7 pr-6 text-[11px] bg-white border border-gray-200 rounded-lg outline-none w-52 sm:w-64 focus:border-blue-500 shadow-2xs font-normal"
                                        />
                                        {permissionSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setPermissionSearch('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                            >
                                                <X size={10} />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGrantAllPermissions}
                                        className="h-6 px-2 text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold cursor-pointer"
                                    >
                                        Grant All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClearAllPermissions}
                                        className="h-6 px-2 text-[11px] bg-gray-100 text-gray-700 hover:bg-gray-200 rounded font-semibold cursor-pointer"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            {/* 8 Hospitality Modules Permission Accordion/Grid */}
                            <div className="space-y-3">
                                {HOSPITALITY_PERMISSION_MODULES.map(module => {
                                    const modActions = module.actions.filter(a =>
                                        !permissionSearch.trim() ||
                                        a.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                                        a.description.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                                        module.name.toLowerCase().includes(permissionSearch.toLowerCase())
                                    );

                                    if (permissionSearch.trim() && modActions.length === 0) return null;

                                    const grantedCount = modActions.filter(a => rolePermissions.includes(a.id)).length;
                                    const allGranted = modActions.length > 0 && grantedCount === modActions.length;

                                    return (
                                        <div
                                            key={module.id}
                                            className="border border-gray-200/90 rounded-xl overflow-hidden bg-white shadow-2xs"
                                        >
                                            <div className="p-2.5 bg-gray-50/80 border-b border-gray-200/80 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <module.icon size={15} className="text-blue-600" />
                                                    <div>
                                                        <span className="text-gray-900 text-xs">{module.name}</span>
                                                        <span className="text-[10.5px] text-gray-400 ml-2 hidden sm:inline">
                                                            {module.description}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10.5px] font-mono text-gray-500 font-semibold">
                                                        {grantedCount} / {modActions.length} active
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const ids = modActions.map(a => a.id);
                                                            if (allGranted) {
                                                                setRolePermissions(prev => prev.filter(id => !ids.includes(id)));
                                                            } else {
                                                                setRolePermissions(prev => [...new Set([...prev, ...ids])]);
                                                            }
                                                        }}
                                                        className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        {allGranted ? 'Uncheck All' : 'Check All'}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                {modActions.map(action => {
                                                    const isChecked = rolePermissions.includes(action.id);
                                                    return (
                                                        <label
                                                            key={action.id}
                                                            className={`p-2 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${isChecked
                                                                ? 'bg-blue-50/40 border-blue-200 text-gray-900'
                                                                : 'border-gray-100 hover:bg-gray-50 text-gray-500'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => handleTogglePermission(action.id)}
                                                                className="mt-0.5 w-4 h-4 accent-blue-600 rounded flex-shrink-0"
                                                            />
                                                            <div className="min-w-0">
                                                                <div className={`font-semibold text-xs ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>
                                                                    {action.name}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 mt-0.5">
                                                                    {action.description}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Additional Security Rules */}
                            <div className="p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-2">
                                <span className="text-gray-800 text-xs block">Operational & POS Guardrails for this Role:</span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="canVoid"
                                            defaultChecked={editingRole.canVoid}
                                            className="w-4 h-4 accent-blue-600 rounded"
                                        />
                                        <span className="text-gray-700 font-semibold">Can Void Invoices</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="allowBackdate"
                                            defaultChecked={editingRole.allowBackdate}
                                            className="w-4 h-4 accent-blue-600 rounded"
                                        />
                                        <span className="text-gray-700 font-semibold">Allow Backdate Entry</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="ipRestricted"
                                            defaultChecked={editingRole.ipRestricted}
                                            className="w-4 h-4 accent-blue-600 rounded"
                                        />
                                        <span className="text-gray-700 font-semibold">Restrict to Property LAN</span>
                                    </label>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRoleModalOpen(false)}
                                    className="h-8 px-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                >
                                    <Save size={13} />
                                    <span>Deploy Role Policy Matrix</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 3: RESET CREDENTIALS / PIN MODAL                    */}
            {/* ========================================================= */}
            {resetCredsStaff && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 text-xs">
                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-amber-50/70">
                            <div className="flex items-center gap-2">
                                <KeyRound size={16} className="text-amber-700" />
                                <h3 className="text-gray-900">Reset Credentials for {resetCredsStaff.name}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setResetCredsStaff(null)}
                                className="p-1 hover:bg-gray-200 rounded text-gray-400"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <form onSubmit={handleExecuteResetCreds} className="p-4 space-y-3">
                            <p className="text-gray-600 leading-relaxed">
                                Set a temporary password or update the 4-digit POS Cashier PIN. The user will be required to change it on their next login session.
                            </p>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">New Temporary Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Enter new secure password"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">4-Digit Terminal PIN</label>
                                <input
                                    type="password"
                                    maxLength={4}
                                    value={newPin}
                                    onChange={e => setNewPin(e.target.value)}
                                    placeholder="e.g. 5678"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none text-xs font-mono"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setResetCredsStaff(null)}
                                    className="h-8 px-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs"
                                >
                                    <KeyRound size={13} />
                                    <span>Confirm Reset</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSecurity;
