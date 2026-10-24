-- ============================================================================
-- HotelManagementOS - Enterprise PostgreSQL 16 DDL Schema (1NF, 2NF, 3NF, 4NF)
-- Multi-Tenancy, Zero-Overbooking Locks, USALI Accounting & HRM
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. MULTI-TENANT ORGANIZATIONS, PROPERTIES & ROOM INVENTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'ENTERPRISE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    property_type VARCHAR(50) NOT NULL DEFAULT 'HOTEL',
    star_rating INT NOT NULL DEFAULT 4,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Dhaka',
    checkin_time TIME NOT NULL DEFAULT '14:00:00',
    checkout_time TIME NOT NULL DEFAULT '12:00:00',
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Bangladesh',
    phone VARCHAR(50),
    email VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS buildings (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
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

-- 4NF: Separate multi-valued amenities
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
    id_type VARCHAR(50) DEFAULT 'NID' CHECK(id_type IN ('PASSPORT', 'NID', 'DRIVING_LICENSE')),
    id_number VARCHAR(100),
    nationality VARCHAR(100) DEFAULT 'Bangladeshi',
    address TEXT,
    vip_status VARCHAR(50) DEFAULT 'REGULAR' CHECK(vip_status IN ('REGULAR', 'VIP_SILVER', 'VIP_GOLD', 'VIP_PLATINUM', 'BLACKLISTED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS corporate_accounts (
    id BIGSERIAL PRIMARY KEY,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    trade_license VARCHAR(100),
    contact_person VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    credit_limit NUMERIC(14,2) NOT NULL DEFAULT 100000.00,
    credit_days INT NOT NULL DEFAULT 30,
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
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('CONFIRMED', 'IN_HOUSE', 'COMPLETED', 'HOLD', 'CANCELLED', 'VOIDED')),
    source VARCHAR(50) NOT NULL DEFAULT 'DIRECT_DESK' CHECK(source IN ('DIRECT_DESK', 'PHONE', 'WALK_IN', 'WEBSITE', 'OTA_BOOKING', 'OTA_AGODA', 'OTA_EXPEDIA', 'CORPORATE')),
    channel VARCHAR(50) NOT NULL DEFAULT 'FRONT_DESK',
    agent VARCHAR(100),
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    group_name VARCHAR(150),
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    special_requests TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4NF: Multi-Room Stay Breakdown with individual check-in/out dates
CREATE TABLE IF NOT EXISTS reservation_rooms (
    id BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    room_type_id BIGINT NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    guest_id BIGINT REFERENCES guests(id) ON DELETE SET NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INT NOT NULL DEFAULT 1,
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
    created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM_AUDIT',
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
    UNIQUE(property_id, code)
);

CREATE TABLE IF NOT EXISTS designations (
    id BIGSERIAL PRIMARY KEY,
    department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    grade_level VARCHAR(20) NOT NULL DEFAULT 'L1'
);

CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    department_id BIGINT NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    designation_id BIGINT NOT NULL REFERENCES designations(id) ON DELETE RESTRICT,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    nid_passport VARCHAR(100),
    hire_date DATE NOT NULL,
    employment_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK(employment_status IN ('ACTIVE', 'PROBATION', 'ON_LEAVE', 'TERMINATED')),
    base_salary_bdt NUMERIC(12,2) NOT NULL DEFAULT 25000.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shifts (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_mins INT NOT NULL DEFAULT 15
);

CREATE TABLE IF NOT EXISTS employee_attendance (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id BIGINT REFERENCES shifts(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'PRESENT' CHECK(status IN ('PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'LEAVE')),
    overtime_hours NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    UNIQUE(employee_id, attendance_date)
);

-- ============================================================================
-- 5. PERFORMANCE INDEXES & ZERO-OVERBOOKING SPEED
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_res_dates ON reservation_rooms (property_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_res_room_status ON reservation_rooms (room_id, status);
CREATE INDEX IF NOT EXISTS idx_res_active ON reservations (property_id, status) WHERE status IN ('CONFIRMED', 'IN_HOUSE');
CREATE INDEX IF NOT EXISTS idx_folios_balance ON folios (status, balance);
CREATE INDEX IF NOT EXISTS idx_journal_lines_acc ON journal_lines (account_id);
