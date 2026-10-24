-- ============================================================================
-- HOTEL MANAGEMENT OS (PMS CORE) - RELATIONAL DATABASE SCHEMA (1NF - 4NF)
-- Supports: Multi-Property Hotel Chains, Room Inventory, Group Reservations,
--           USALI Double-Entry Accounting, Human Resources Management (HRM).
-- Engine: SQLite / PostgreSQL ANSI SQL Compatible
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. MULTI-TENANT & HOTEL GROUP CORE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tax_number TEXT,
    base_currency TEXT NOT NULL DEFAULT 'BDT',
    headquarters_address TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    star_rating INTEGER NOT NULL DEFAULT 4 CHECK(star_rating BETWEEN 1 AND 5),
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Bangladesh',
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BDT',
    time_zone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    check_in_time TEXT NOT NULL DEFAULT '14:00',
    check_out_time TEXT NOT NULL DEFAULT '12:00',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE(property_id, code)
);

CREATE TABLE IF NOT EXISTS floors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_id INTEGER NOT NULL,
    floor_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
    UNIQUE(building_id, floor_number)
);

CREATE TABLE IF NOT EXISTS room_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    base_occupancy INTEGER NOT NULL DEFAULT 2,
    max_adults INTEGER NOT NULL DEFAULT 2,
    max_children INTEGER NOT NULL DEFAULT 1,
    base_rate DECIMAL(12,2) NOT NULL DEFAULT 3000.00,
    extra_bed_rate DECIMAL(12,2) NOT NULL DEFAULT 1000.00,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE(property_id, code)
);

CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    building_id INTEGER NOT NULL,
    floor_id INTEGER NOT NULL,
    room_type_id INTEGER NOT NULL,
    room_number TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'OUT_OF_ORDER', 'MAINTENANCE')),
    housekeeping_status TEXT NOT NULL DEFAULT 'CLEAN' CHECK(housekeeping_status IN ('CLEAN', 'DIRTY', 'INSPECTED')),
    keycard_rfid TEXT,
    remarks TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT,
    FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE RESTRICT,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT,
    UNIQUE(property_id, room_number)
);

-- 4NF: Separate multi-valued independent amenities
CREATE TABLE IF NOT EXISTS amenities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'GENERAL',
    icon TEXT
);

CREATE TABLE IF NOT EXISTS room_amenities (
    room_id INTEGER NOT NULL,
    amenity_id INTEGER NOT NULL,
    PRIMARY KEY (room_id, amenity_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. GUESTS & RESERVATIONS CORE (1NF, 2NF, 3NF, 4NF NORMALIZED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    salutation TEXT DEFAULT 'Mr',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    nationality TEXT NOT NULL DEFAULT 'Bangladeshi',
    id_type TEXT DEFAULT 'National ID (NID)',
    id_number TEXT,
    vip_status TEXT DEFAULT 'NONE' CHECK(vip_status IN ('NONE', 'VIP', 'VVIP', 'REPEAT', 'BLACKLISTED')),
    address TEXT,
    city TEXT,
    country TEXT DEFAULT 'Bangladesh',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS corporate_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    company_name TEXT NOT NULL,
    trade_license TEXT,
    tax_id TEXT,
    credit_limit DECIMAL(14,2) NOT NULL DEFAULT 100000.00,
    payment_terms_days INTEGER NOT NULL DEFAULT 30,
    contact_person TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    reservation_number TEXT NOT NULL UNIQUE,
    booker_guest_id INTEGER NOT NULL,
    corporate_account_id INTEGER,
    source TEXT NOT NULL DEFAULT 'Direct',
    channel TEXT NOT NULL DEFAULT 'Front Desk',
    agent TEXT,
    is_group BOOLEAN NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'IN_HOUSE', 'COMPLETED', 'HOLD', 'CANCELLED', 'VOIDED')),
    total_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    due_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    special_requests TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (booker_guest_id) REFERENCES guests(id) ON DELETE RESTRICT,
    FOREIGN KEY (corporate_account_id) REFERENCES corporate_accounts(id) ON DELETE SET NULL
);

-- 1NF / 2NF: Granular multi-room allocation (one row per allocated room stay)
CREATE TABLE IF NOT EXISTS reservation_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    guest_id INTEGER,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INTEGER NOT NULL CHECK(nights >= 1),
    room_rate DECIMAL(12,2) NOT NULL,
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK(status IN ('ASSIGNED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL,
    CHECK(check_out_date > check_in_date)
);

CREATE TABLE IF NOT EXISTS addon_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('TRANSFER', 'EXTRA_BED', 'MEAL', 'SPA', 'CELEBRATION', 'OTHER')),
    unit_price DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE(property_id, code)
);

CREATE TABLE IF NOT EXISTS reservation_addons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_room_id INTEGER NOT NULL,
    addon_service_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    scheduled_date DATE,
    remarks TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_room_id) REFERENCES reservation_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (addon_service_id) REFERENCES addon_services(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS room_stay_splits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_room_id INTEGER NOT NULL,
    from_room_id INTEGER NOT NULL,
    to_room_id INTEGER NOT NULL,
    split_date DATE NOT NULL,
    reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_room_id) REFERENCES reservation_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (from_room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_room_id) REFERENCES rooms(id) ON DELETE RESTRICT
);

-- ============================================================================
-- 3. USALI DOUBLE-ENTRY ACCOUNTING & GENERAL LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    property_id INTEGER,
    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK(account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    usali_department TEXT CHECK(usali_department IN ('ROOMS', 'F_AND_B', 'ADMIN_GENERAL', 'SALES_MARKETING', 'PROPERTY_OPS', 'UTILITIES', 'NON_OPERATING')),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE(organization_id, account_code)
);

CREATE TABLE IF NOT EXISTS folios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER,
    guest_id INTEGER,
    corporate_account_id INTEGER,
    folio_number TEXT NOT NULL UNIQUE,
    folio_type TEXT NOT NULL DEFAULT 'GUEST' CHECK(folio_type IN ('GUEST', 'MASTER', 'CITY_LEDGER')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'SETTLED', 'CLOSED')),
    balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL,
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL,
    FOREIGN KEY (corporate_account_id) REFERENCES corporate_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS folio_charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio_id INTEGER NOT NULL,
    reservation_room_id INTEGER,
    charge_code TEXT NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    charge_date DATE NOT NULL,
    is_voided BOOLEAN NOT NULL DEFAULT 0,
    void_reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folio_id) REFERENCES folios(id) ON DELETE CASCADE,
    FOREIGN KEY (reservation_room_id) REFERENCES reservation_rooms(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    payment_number TEXT NOT NULL UNIQUE,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'CREDIT_CARD', 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CITY_LEDGER')),
    amount DECIMAL(14,2) NOT NULL,
    reference_code TEXT,
    transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_by_user_id INTEGER,
    FOREIGN KEY (folio_id) REFERENCES folios(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    entry_number TEXT NOT NULL UNIQUE,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type TEXT,
    reference_id INTEGER,
    is_posted BOOLEAN NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL DEFAULT 'System Night Audit',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Invariant: Sum of debit must equal sum of credit per journal entry
CREATE TABLE IF NOT EXISTS journal_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_entry_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    debit DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    credit DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    memo TEXT,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    CHECK((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

-- ============================================================================
-- 4. HUMAN RESOURCES MANAGEMENT (HRM) & PAYROLL CORE
-- ============================================================================

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    cost_center_code TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE(property_id, code)
);

CREATE TABLE IF NOT EXISTS designations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    department_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    pay_grade TEXT DEFAULT 'GRADE-1',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE(department_id, title)
);

CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    department_id INTEGER NOT NULL,
    designation_id INTEGER NOT NULL,
    employee_code TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    nid TEXT,
    hire_date DATE NOT NULL,
    employment_type TEXT NOT NULL DEFAULT 'FULL_TIME' CHECK(employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT')),
    basic_salary DECIMAL(12,2) NOT NULL DEFAULT 25000.00,
    bank_account_number TEXT,
    bank_name TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    grace_period_minutes INTEGER NOT NULL DEFAULT 15,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_shift_rosters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    shift_id INTEGER NOT NULL,
    roster_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'SWAPPED', 'COMPLETED', 'CANCELLED')),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE RESTRICT,
    UNIQUE(employee_id, roster_date)
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    shift_id INTEGER,
    attendance_date DATE NOT NULL,
    clock_in DATETIME,
    clock_out DATETIME,
    work_hours DECIMAL(5,2) DEFAULT 8.0,
    overtime_hours DECIMAL(5,2) DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'PRESENT' CHECK(status IN ('PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'ON_LEAVE')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
    UNIQUE(employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS leave_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    annual_quota INTEGER NOT NULL DEFAULT 14,
    is_paid BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    leave_type_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by_employee_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER NOT NULL,
    period_month INTEGER NOT NULL CHECK(period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL,
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_gross DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total_deductions DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total_net DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    is_posted_to_gl BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE(property_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS payroll_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payroll_run_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    basic_salary DECIMAL(12,2) NOT NULL,
    allowances DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    overtime_pay DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_salary DECIMAL(12,2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID', 'PAID')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
    UNIQUE(payroll_run_id, employee_id)
);

-- ============================================================================
-- 5. HOUSEKEEPING & MAINTENANCE WORK ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    cleaner_employee_id INTEGER,
    task_type TEXT NOT NULL DEFAULT 'DAILY_CLEAN' CHECK(task_type IN ('TURNOVER', 'DAILY_CLEAN', 'DEEP_CLEAN')),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW', 'NORMAL', 'HIGH', 'RUSH')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'INSPECTED')),
    inspection_notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (cleaner_employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    property_id INTEGER NOT NULL,
    reported_by_employee_id INTEGER,
    assigned_technician_id INTEGER,
    issue_type TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED')),
    estimated_cost DECIMAL(10,2) DEFAULT 0.00,
    resolved_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_technician_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- ============================================================================
-- PERFORMANCE INDEXES (FOR O(1) & O(log N) SCALABLE QUERYING)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_rooms_property_status ON rooms(property_id, status);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_res_rooms_dates ON reservation_rooms(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_res_rooms_room ON reservation_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_property ON reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_employees_property_dept ON employees(property_id, department_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_folios_res ON folios(reservation_id);
