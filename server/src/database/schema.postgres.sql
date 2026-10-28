-- ============================================================================
-- HotelManagementOS - Enterprise PostgreSQL 17 / Cloud DDL Schema (1NF - 4NF)
-- Multi-Tenancy, Zero-Overbooking Locks, USALI Accounting & HRM
-- Compatible with PostgreSQL 16+ & TiDB Cloud PostgreSQL Gateway
-- ============================================================================

-- ============================================================================
-- 1. MULTI-TENANT ORGANIZATIONS, PROPERTIES & ROOM INVENTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    tax_number VARCHAR(100),
    base_currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    headquarters_address TEXT,
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'ENTERPRISE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    property_type VARCHAR(50) NOT NULL DEFAULT 'HOTEL',
    star_rating INT NOT NULL DEFAULT 4 CHECK(star_rating BETWEEN 1 AND 5),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Bangladesh',
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    time_zone VARCHAR(50) NOT NULL DEFAULT 'Asia/Dhaka',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Dhaka',
    check_in_time VARCHAR(20) NOT NULL DEFAULT '14:00',
    check_out_time VARCHAR(20) NOT NULL DEFAULT '12:00',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS buildings (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 1,
    total_floors INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, code)
);

CREATE TABLE IF NOT EXISTS floors (
    id BIGSERIAL PRIMARY KEY,
    building_id BIGINT NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    floor_number INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_id, floor_number)
);

CREATE TABLE IF NOT EXISTS room_types (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    base_occupancy INT NOT NULL DEFAULT 2,
    max_adults INT NOT NULL DEFAULT 2,
    max_children INT NOT NULL DEFAULT 1,
    base_rate NUMERIC(12,2) NOT NULL DEFAULT 3000.00,
    extra_bed_rate NUMERIC(12,2) NOT NULL DEFAULT 1000.00,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, code)
);

CREATE TABLE IF NOT EXISTS rooms (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    building_id BIGINT NOT NULL REFERENCES buildings(id) ON DELETE RESTRICT,
    floor_id BIGINT NOT NULL REFERENCES floors(id) ON DELETE RESTRICT,
    room_type_id BIGINT NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    room_number VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'OUT_OF_ORDER', 'MAINTENANCE')),
    housekeeping_status VARCHAR(50) NOT NULL DEFAULT 'CLEAN' CHECK(housekeeping_status IN ('CLEAN', 'DIRTY', 'INSPECTED')),
    keycard_rfid VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, room_number)
);

-- 4NF: Separate multi-valued independent amenities
CREATE TABLE IF NOT EXISTS amenities (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    icon VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS room_amenities (
    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    amenity_id BIGINT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (room_id, amenity_id)
);

-- ============================================================================
-- 2. GUESTS, CORPORATE ACCOUNTS & 4NF RESERVATIONS ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS guests (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    salutation VARCHAR(20) DEFAULT 'Mr',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50) NOT NULL,
    nationality VARCHAR(100) DEFAULT 'Bangladeshi',
    id_type VARCHAR(50) DEFAULT 'National ID (NID)',
    id_number VARCHAR(100),
    vip_status VARCHAR(50) DEFAULT 'NONE',
    is_blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
    blacklist_reason TEXT,
    blacklisted_by VARCHAR(150),
    blacklisted_at TIMESTAMPTZ,
    dob DATE,
    gender VARCHAR(20) DEFAULT 'Male',
    id_issue_date DATE,
    id_expiry_date DATE,
    id_issue_country VARCHAR(100),
    id_issue_place VARCHAR(150),
    passport_visa_number VARCHAR(100),
    passport_visa_type VARCHAR(50),
    passport_visa_expiry DATE,
    passport_entry_port VARCHAR(150),
    driving_vehicle_class VARCHAR(50),
    identity_metadata JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Bangladesh',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Guest Profile Audit Trail & Edit History
CREATE TABLE IF NOT EXISTS guest_edit_history (
    id BIGSERIAL PRIMARY KEY,
    guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    changed_by VARCHAR(150) NOT NULL DEFAULT 'Staff Member',
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    change_summary TEXT,
    changes JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_guest_edit_history_guest_id ON guest_edit_history(guest_id);

CREATE TABLE IF NOT EXISTS corporate_accounts (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    trade_license VARCHAR(100),
    tax_id VARCHAR(100),
    credit_limit NUMERIC(14,2) NOT NULL DEFAULT 100000.00,
    payment_terms_days INT NOT NULL DEFAULT 30,
    credit_days INT NOT NULL DEFAULT 30,
    contact_person VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    current_outstanding NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    reservation_number VARCHAR(50) NOT NULL UNIQUE,
    booker_guest_id BIGINT NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
    corporate_account_id BIGINT REFERENCES corporate_accounts(id) ON DELETE SET NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'Direct',
    channel VARCHAR(50) NOT NULL DEFAULT 'Front Desk',
    agent VARCHAR(100),
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    group_name VARCHAR(150),
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'IN_HOUSE', 'COMPLETED', 'HOLD', 'CANCELLED', 'VOIDED')),
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    special_requests TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4NF: Multi-Room Stay Breakdown with individual check-in/out dates and rates
CREATE TABLE IF NOT EXISTS reservation_rooms (
    id BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    room_type_id BIGINT REFERENCES room_types(id) ON DELETE RESTRICT,
    guest_id BIGINT REFERENCES guests(id) ON DELETE SET NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INT NOT NULL DEFAULT 1 CHECK(nights >= 1),
    room_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    rate_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    adults INT NOT NULL DEFAULT 1,
    children INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED' CHECK(status IN ('ASSIGNED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(check_out_date > check_in_date)
);

CREATE TABLE IF NOT EXISTS addon_services (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK(category IN ('TRANSFER', 'EXTRA_BED', 'MEAL', 'SPA', 'CELEBRATION', 'OTHER')),
    unit_price NUMERIC(12,2) NOT NULL,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 15.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, code)
);

CREATE TABLE IF NOT EXISTS reservation_addons (
    id BIGSERIAL PRIMARY KEY,
    reservation_room_id BIGINT NOT NULL REFERENCES reservation_rooms(id) ON DELETE CASCADE,
    addon_service_id BIGINT NOT NULL REFERENCES addon_services(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    scheduled_date DATE,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_stay_splits (
    id BIGSERIAL PRIMARY KEY,
    reservation_room_id BIGINT NOT NULL REFERENCES reservation_rooms(id) ON DELETE CASCADE,
    from_room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    to_room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    split_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. USALI DOUBLE-ENTRY ACCOUNTING & GENERAL LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id BIGINT REFERENCES properties(id) ON DELETE CASCADE,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK(account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    usali_department VARCHAR(50) CHECK(usali_department IN ('ROOMS', 'F_AND_B', 'ADMIN_GENERAL', 'SALES_MARKETING', 'PROPERTY_OPS', 'UTILITIES', 'NON_OPERATING')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, account_code)
);

CREATE TABLE IF NOT EXISTS folios (
    id BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT REFERENCES reservations(id) ON DELETE SET NULL,
    guest_id BIGINT REFERENCES guests(id) ON DELETE SET NULL,
    corporate_account_id BIGINT REFERENCES corporate_accounts(id) ON DELETE SET NULL,
    folio_number VARCHAR(100) NOT NULL UNIQUE,
    folio_type VARCHAR(50) NOT NULL DEFAULT 'GUEST' CHECK(folio_type IN ('GUEST', 'MASTER', 'CITY_LEDGER')),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'SETTLED', 'CLOSED')),
    balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS folio_charges (
    id BIGSERIAL PRIMARY KEY,
    folio_id BIGINT NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
    reservation_room_id BIGINT REFERENCES reservation_rooms(id) ON DELETE SET NULL,
    charge_code VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL,
    charge_date DATE NOT NULL,
    is_voided BOOLEAN NOT NULL DEFAULT FALSE,
    void_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    folio_id BIGINT NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    payment_number VARCHAR(100) NOT NULL UNIQUE,
    payment_method VARCHAR(50) NOT NULL CHECK(payment_method IN ('CASH', 'CREDIT_CARD', 'BKASH', 'NAGAD', 'BANK_TRANSFER', 'CITY_LEDGER')),
    amount NUMERIC(14,2) NOT NULL,
    reference_code VARCHAR(150),
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_by_user_id BIGINT
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    entry_number VARCHAR(100) NOT NULL UNIQUE,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    reference_id VARCHAR(100),
    is_posted BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL DEFAULT 'System Night Audit',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_lines (
    id BIGSERIAL PRIMARY KEY,
    journal_entry_id BIGINT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id BIGINT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    debit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    credit NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);

-- ============================================================================
-- 4. HUMAN RESOURCES MANAGEMENT (HRM) & PAYROLL
-- ============================================================================

CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    cost_center_code VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, code)
);

CREATE TABLE IF NOT EXISTS designations (
    id BIGSERIAL PRIMARY KEY,
    department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    pay_grade VARCHAR(50) NOT NULL DEFAULT 'GRADE-1',
    grade_level VARCHAR(20) NOT NULL DEFAULT 'L1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, title)
);

CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    designation_id BIGINT NOT NULL REFERENCES designations(id) ON DELETE RESTRICT,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    nid VARCHAR(100),
    nid_passport VARCHAR(100),
    hire_date DATE NOT NULL,
    employment_type VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME',
    employment_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK(employment_status IN ('ACTIVE', 'PROBATION', 'ON_LEAVE', 'TERMINATED')),
    basic_salary NUMERIC(12,2) NOT NULL DEFAULT 25000.00,
    base_salary_bdt NUMERIC(12,2) NOT NULL DEFAULT 25000.00,
    bank_account_number VARCHAR(100),
    bank_name VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    grace_period_minutes INT NOT NULL DEFAULT 15,
    grace_period_mins INT NOT NULL DEFAULT 15
);

CREATE TABLE IF NOT EXISTS employee_shift_rosters (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id BIGINT NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    roster_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED' CHECK(status IN ('SCHEDULED', 'SWAPPED', 'COMPLETED', 'CANCELLED')),
    UNIQUE(employee_id, roster_date)
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id BIGINT REFERENCES shifts(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    work_hours NUMERIC(5,2) DEFAULT 8.0,
    overtime_hours NUMERIC(5,2) DEFAULT 0.0,
    status VARCHAR(50) NOT NULL DEFAULT 'PRESENT' CHECK(status IN ('PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'ON_LEAVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS leave_types (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    annual_quota INT NOT NULL DEFAULT 14,
    is_paid BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id BIGINT NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by_employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    period_month INT NOT NULL CHECK(period_month BETWEEN 1 AND 12),
    period_year INT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_gross NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_net NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    is_posted_to_gl BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(property_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS payroll_items (
    id BIGSERIAL PRIMARY KEY,
    payroll_run_id BIGINT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    basic_salary NUMERIC(12,2) NOT NULL,
    allowances NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    overtime_pay NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    deductions NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_deductions NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_salary NUMERIC(12,2) NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID', 'PAID')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(payroll_run_id, employee_id)
);

-- ============================================================================
-- 5. HOUSEKEEPING & MAINTENANCE WORK ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    cleaner_employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    task_type VARCHAR(50) NOT NULL DEFAULT 'DAILY_CLEAN' CHECK(task_type IN ('TURNOVER', 'DAILY_CLEAN', 'DEEP_CLEAN')),
    priority VARCHAR(50) NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW', 'NORMAL', 'HIGH', 'RUSH')),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'INSPECTED')),
    inspection_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS maintenance_orders (
    id BIGSERIAL PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    reported_by_employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    assigned_technician_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    issue_type VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED')),
    estimated_cost NUMERIC(10,2) DEFAULT 0.00,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. HIGH-PERFORMANCE INDEXES & ZERO-OVERBOOKING SPEED
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_rooms_property_status ON rooms(property_id, status);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_res_dates ON reservation_rooms (room_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_res_room_status ON reservation_rooms (room_id, status);
CREATE INDEX IF NOT EXISTS idx_res_rooms_dates ON reservation_rooms(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_res_rooms_resid ON reservation_rooms(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_property ON reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_folios_balance ON folios(status, balance);
CREATE INDEX IF NOT EXISTS idx_folios_res ON folios(reservation_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_acc ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_employees_prop_dept ON employees(property_id, department_id);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_records(employee_id, attendance_date);
