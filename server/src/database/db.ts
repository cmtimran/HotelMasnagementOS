import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path inside server directory (falls back to /tmp in serverless environments like Vercel)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DB_PATH = isServerless ? path.join('/tmp', 'hotel_pms.db') : path.join(__dirname, '..', '..', 'hotel_pms.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');


// Singleton database instance
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode & Foreign Keys for high performance and integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialize Database Schema and Pre-populate Seed Data
 */
export const initDatabase = () => {
    console.log('🔄 Initializing Relational Database (1NF-4NF)...');
    
    // 1. Run Schema DDL
    if (fs.existsSync(SCHEMA_PATH)) {
        const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        db.exec(schemaSql);
        console.log('✅ Database schema verified and tables created.');
    }

    // 2. Check if already seeded
    const orgCheck = db.prepare('SELECT COUNT(*) as count FROM organizations').get() as { count: number };
    if (!orgCheck || orgCheck.count === 0) {
        console.log('🌱 Seeding multi-property hotel chain, accounting, and HRM data...');
        seedInitialOrganizationAndProperties();
    }

    // 3. Ensure all 34 canonical rooms and rich reservations exist in the database
    syncAllCanonicalRoomsAndReservations();

    console.log('🎉 Relational Database initialized with Multi-Hotel, 34 Canonical Rooms, USALI Accounting, and HRM records!');
};

function seedInitialOrganizationAndProperties() {
    db.exec(`
        INSERT INTO organizations (code, name, tax_number, base_currency, headquarters_address)
        VALUES ('GHG', 'Grand Hospitality Group', 'BIN-908123481', 'BDT', 'Level 14, Gulshan Centre Point, Dhaka-1212');

        INSERT INTO properties (organization_id, code, name, star_rating, address, city, phone, email, currency)
        VALUES 
        (1, 'GPD', 'Grand Palace Dhaka (Main Tower)', 5, 'Plot 12, Road 45, Gulshan-2, Dhaka', 'Dhaka', '+880 2 9882200', 'dhaka@grandhospitality.com', 'BDT'),
        (1, 'GOR', 'Grand Ocean Resort (Cox''s Bazar)', 5, 'Marine Drive, Kolatoli Beach, Cox''s Bazar', 'Cox''s Bazar', '+880 341 62100', 'coxsbazar@grandhospitality.com', 'BDT');

        -- Buildings & Floors for Dhaka & Cox's Bazar
        INSERT INTO buildings (id, property_id, code, name, sort_order) VALUES
        (1, 1, 'B1', 'Main Tower', 1),
        (2, 1, 'B2', 'Suites & Annex Wing', 2),
        (3, 2, 'OT', 'Ocean Front Tower', 1),
        (4, 2, 'BV', 'Bay View Chalet Villas', 2);

        INSERT INTO floors (id, building_id, floor_number, name, sort_order) VALUES
        (1, 1, 1, 'Floor 1 (Executive & Lobby)', 1),
        (2, 1, 2, 'Floor 2 (Standard & Deluxe)', 2),
        (3, 1, 3, 'Floor 3 (Deluxe Sea View)', 3),
        (4, 2, 4, 'Floor 4 (Club & Suites)', 4),
        (5, 2, 5, 'Floor 5 (Presidential Suites)', 5),
        (6, 3, 1, 'Ground (Beach Club Level)', 1),
        (7, 3, 2, 'Floor 1 (Coral Sea View)', 2),
        (8, 4, 1, 'Beachfront Villas Promenade', 1);

        -- Room Types
        INSERT INTO room_types (id, property_id, code, name, base_occupancy, max_adults, max_children, base_rate, extra_bed_rate, description) VALUES
        (1, 1, 'DD', 'Deluxe Double', 2, 2, 1, 3000.00, 1000.00, 'King bed, city view, high-speed WiFi, work desk'),
        (2, 1, 'SK', 'Superior King', 2, 2, 1, 4500.00, 1200.00, 'King bed with panoramic balcony and plush lounge'),
        (3, 1, 'ES', 'Executive Suite', 3, 3, 2, 7500.00, 1500.00, 'Separate living room, executive lounge access, bathtub'),
        (4, 1, 'PS', 'Presidential Royal Suite', 4, 4, 2, 18000.00, 2500.00, 'Top-tier luxury penthouse with private terrace and jacuzzi'),
        (5, 1, 'SS', 'Standard Single', 1, 1, 0, 2200.00, 800.00, 'Cozy single room with premium bed and workspace'),
        (6, 2, 'DSV', 'Deluxe Sea View', 2, 2, 1, 5500.00, 1500.00, 'Panoramic bay view balcony, king bed, beach club access'),
        (7, 2, 'EBS', 'Executive Beach Suite', 3, 3, 2, 9500.00, 2000.00, 'Direct private beach lawn access, private plunge pool'),
        (8, 2, 'RBV', 'Royal Beachfront Villa', 4, 4, 2, 22000.00, 3000.00, 'Exclusive private duplex villa with infinity pool and butler');


        -- Addon Services
        INSERT INTO addon_services (property_id, code, name, category, unit_price, tax_rate) VALUES
        (1, 'AIRPORT_PICK', 'Luxury Airport Pickup', 'TRANSFER', 1800.00, 15.00),
        (1, 'AIRPORT_DROP', 'Luxury Airport Drop', 'TRANSFER', 1500.00, 15.00),
        (1, 'EXTRA_BED', 'Rollaway Extra Bed with Linen', 'EXTRA_BED', 1200.00, 15.00),
        (1, 'BUFFET_BFAST', 'International Buffet Breakfast', 'MEAL', 850.00, 15.00),
        (1, 'SPA_COUPLE', 'Aromatherapy Couple Spa (60m)', 'SPA', 4500.00, 15.00);

        -- USALI Chart of Accounts
        INSERT INTO chart_of_accounts (organization_id, property_id, account_code, account_name, account_type, usali_department) VALUES
        (1, 1, '1010', 'Cash at Front Desk Petty Cash', 'ASSET', 'ROOMS'),
        (1, 1, '1020', 'Operating Bank Account - City Bank', 'ASSET', 'ADMIN_GENERAL'),
        (1, 1, '1030', 'bKash Merchant Gateway', 'ASSET', 'ADMIN_GENERAL'),
        (1, 1, '1100', 'Guest Ledger (In-House A/R)', 'ASSET', 'ROOMS'),
        (1, 1, '1110', 'City Ledger (B2B Corporate A/R)', 'ASSET', 'SALES_MARKETING'),
        (1, 2, '2010', 'Advance Guest Deposits', 'LIABILITY', 'ROOMS'),
        (1, 1, '2020', 'Government VAT Payable (15%)', 'LIABILITY', 'ADMIN_GENERAL'),
        (1, 1, '2030', 'Service Charge Pool Payable (10%)', 'LIABILITY', 'ADMIN_GENERAL'),
        (1, 1, '4010', 'Room Revenue', 'REVENUE', 'ROOMS'),
        (1, 1, '4020', 'Food & Beverage Dining Revenue', 'REVENUE', 'F_AND_B'),
        (1, 1, '4030', 'Guest Addon & Transfer Revenue', 'REVENUE', 'ROOMS'),
        (1, 1, '5010', 'Salaries & Staff Wages', 'EXPENSE', 'ADMIN_GENERAL'),
        (1, 1, '5020', 'Laundry, Linen & Housekeeping Supplies', 'EXPENSE', 'ROOMS'),
        (1, 1, '5030', 'Hotel Utilities, Electricity & HVAC', 'EXPENSE', 'UTILITIES');

        -- HRM: Departments & Designations
        INSERT INTO departments (property_id, code, name, cost_center_code) VALUES
        (1, 'FO', 'Front Office & Concierge', 'CC-101'),
        (1, 'HK', 'Housekeeping & Laundry', 'CC-102'),
        (1, 'FB', 'Food & Beverage Dining', 'CC-103'),
        (1, 'AC', 'Accounts & Finance', 'CC-104'),
        (1, 'MT', 'Engineering & Maintenance', 'CC-105');

        INSERT INTO designations (department_id, title, pay_grade) VALUES
        (1, 'Front Office Manager', 'GRADE-EXECUTIVE'),
        (1, 'Front Desk Executive', 'GRADE-2'),
        (2, 'Housekeeping Supervisor', 'GRADE-3'),
        (2, 'Room Attendant', 'GRADE-4'),
        (3, 'Executive Chef', 'GRADE-EXECUTIVE'),
        (4, 'Chief Accountant', 'GRADE-EXECUTIVE'),
        (4, 'Night Auditor', 'GRADE-2');

        -- HRM: Employees
        INSERT INTO employees (property_id, department_id, designation_id, employee_code, first_name, last_name, email, phone, nid, hire_date, basic_salary, status) VALUES
        (1, 1, 1, 'EMP-1001', 'Zubair', 'Ahmed', 'zubair.fo@grandhospitality.com', '+880 1711-100100', '1990269201923', '2024-01-15', 55000.00, 'ACTIVE'),
        (1, 1, 2, 'EMP-1002', 'Farhana', 'Yeasmin', 'farhana.desk@grandhospitality.com', '+880 1711-100200', '1995269201944', '2025-03-01', 32000.00, 'ACTIVE'),
        (1, 2, 3, 'EMP-2001', 'Rafiqul', 'Islam', 'rafiq.hk@grandhospitality.com', '+880 1711-200100', '1988269201911', '2023-06-10', 38000.00, 'ACTIVE'),
        (1, 2, 4, 'EMP-2002', 'Sumi', 'Akter', 'sumi.clean@grandhospitality.com', '+880 1711-200200', '1998269201988', '2025-07-01', 22000.00, 'ACTIVE'),
        (1, 4, 6, 'EMP-4001', 'Tanvir', 'Hasan', 'tanvir.accounts@grandhospitality.com', '+880 1711-400100', '1986269201955', '2023-01-01', 65000.00, 'ACTIVE'),
        (1, 4, 7, 'EMP-4002', 'Kamrul', 'Hasan', 'kamrul.audit@grandhospitality.com', '+880 1711-400200', '1994269201966', '2024-09-01', 35000.00, 'ACTIVE');

        -- HRM: Work Shifts
        INSERT INTO shifts (property_id, name, start_time, end_time, grace_period_minutes) VALUES
        (1, 'Morning Shift (A)', '06:00', '14:00', 15),
        (1, 'Evening Shift (B)', '14:00', '22:00', 15),
        (1, 'Night Audit Shift (C)', '22:00', '06:00', 15),
        (1, 'General Administrative', '09:00', '18:00', 30);

        -- HRM: Initial Attendance Records (Today)
        INSERT INTO attendance_records (employee_id, shift_id, attendance_date, clock_in, clock_out, work_hours, status) VALUES
        (1, 4, '2026-07-01', '2026-07-01 08:55:00', '2026-07-01 18:05:00', 9.1, 'PRESENT'),
        (2, 1, '2026-07-01', '2026-07-01 05:58:00', '2026-07-01 14:02:00', 8.0, 'PRESENT'),
        (3, 1, '2026-07-01', '2026-07-01 06:12:00', '2026-07-01 14:00:00', 7.8, 'LATE'),
        (4, 2, '2026-07-01', '2026-07-01 13:50:00', '2026-07-01 22:00:00', 8.1, 'PRESENT'),
        (5, 4, '2026-07-01', '2026-07-01 09:00:00', '2026-07-01 18:00:00', 9.0, 'PRESENT'),
        (6, 3, '2026-07-01', '2026-07-01 21:55:00', '2026-07-02 06:00:00', 8.0, 'PRESENT');

        -- HRM: Sample Payroll Run
        INSERT INTO payroll_runs (property_id, period_month, period_year, total_gross, total_deductions, total_net, is_posted_to_gl)
        VALUES (1, 6, 2026, 247000.00, 14200.00, 232800.00, 1);

        INSERT INTO payroll_items (payroll_run_id, employee_id, basic_salary, allowances, overtime_pay, deductions, tax_deductions, net_salary, payment_status) VALUES
        (1, 1, 55000.00, 5000.00, 0.00, 2000.00, 3000.00, 55000.00, 'PAID'),
        (1, 2, 32000.00, 3000.00, 1500.00, 1000.00, 1200.00, 34300.00, 'PAID'),
        (1, 3, 38000.00, 3500.00, 2000.00, 1000.00, 1500.00, 41000.00, 'PAID'),
        (1, 4, 22000.00, 2000.00, 1200.00, 500.00, 0.00, 24700.00, 'PAID'),
        (1, 5, 65000.00, 6000.00, 0.00, 2500.00, 4500.00, 64000.00, 'PAID'),
        (1, 6, 35000.00, 3000.00, 1800.00, 1000.00, 1500.00, 37300.00, 'PAID');
    `);
}

function syncAllCanonicalRoomsAndReservations() {
    // 1. Ensure Standard Single exists
    db.exec(`
        INSERT OR IGNORE INTO room_types (id, property_id, code, name, base_occupancy, max_adults, max_children, base_rate, extra_bed_rate, description)
        VALUES (5, 1, 'SS', 'Standard Single', 1, 1, 0, 2200.00, 800.00, 'Cozy single room with premium bed and workspace');
    `);

    // 2. Ensure all 34 physical rooms exist in Dhaka property
    db.exec(`
        INSERT OR IGNORE INTO rooms (property_id, building_id, floor_id, room_type_id, room_number, name, status, housekeeping_status) VALUES
        -- Floor 1
        (1, 1, 1, 1, '101', 'Garden Deluxe 101', 'ACTIVE', 'CLEAN'),
        (1, 1, 1, 1, '102', 'Garden Deluxe 102', 'ACTIVE', 'CLEAN'),
        (1, 1, 1, 2, '103', 'Superior Bay 103', 'ACTIVE', 'DIRTY'),
        (1, 1, 1, 3, '104', 'Executive Suite 104', 'ACTIVE', 'INSPECTED'),
        (1, 1, 1, 5, '105', 'Standard Single 105', 'ACTIVE', 'CLEAN'),
        (1, 1, 1, 5, '106', 'Standard Single 106', 'ACTIVE', 'CLEAN'),
        (1, 1, 1, 1, '107', 'Deluxe Courtyard 107', 'ACTIVE', 'CLEAN'),
        (1, 1, 1, 2, '108', 'Superior King 108', 'OUT_OF_ORDER', 'DIRTY'),

        -- Floor 2
        (1, 1, 2, 2, '201', 'Superior Balcony 201', 'ACTIVE', 'INSPECTED'),
        (1, 1, 2, 2, '202', 'Superior King 202', 'ACTIVE', 'CLEAN'),
        (1, 1, 2, 3, '203', 'Executive Suite 203', 'ACTIVE', 'DIRTY'),
        (1, 1, 2, 1, '204', 'Deluxe King 204', 'ACTIVE', 'CLEAN'),
        (1, 1, 2, 5, '205', 'Standard Single 205', 'ACTIVE', 'CLEAN'),
        (1, 1, 2, 1, '206', 'Deluxe Twin 206', 'ACTIVE', 'CLEAN'),
        (1, 1, 2, 1, '207', 'Deluxe Double 207', 'ACTIVE', 'CLEAN'),
        (1, 1, 2, 2, '208', 'Superior King 208', 'ACTIVE', 'CLEAN'),

        -- Floor 3
        (1, 1, 3, 1, '301', 'Deluxe Sea View 301', 'ACTIVE', 'CLEAN'),
        (1, 1, 3, 5, '302', 'Standard Single 302', 'ACTIVE', 'CLEAN'),
        (1, 1, 3, 3, '303', 'Executive Suite 303', 'ACTIVE', 'CLEAN'),
        (1, 1, 3, 1, '304', 'Deluxe Double 304', 'ACTIVE', 'DIRTY'),
        (1, 1, 3, 1, '305', 'Deluxe Twin 305', 'ACTIVE', 'DIRTY'),
        (1, 1, 3, 2, '306', 'Superior King 306', 'ACTIVE', 'CLEAN'),
        (1, 1, 3, 1, '307', 'Deluxe Garden 307', 'ACTIVE', 'CLEAN'),
        (1, 1, 3, 2, '308', 'Superior King 308', 'ACTIVE', 'INSPECTED'),

        -- Floor 4
        (1, 2, 4, 3, '401', 'Executive Club 401', 'ACTIVE', 'CLEAN'),
        (1, 2, 4, 3, '402', 'Executive Club 402', 'ACTIVE', 'CLEAN'),
        (1, 2, 4, 1, '403', 'Deluxe Panoramic 403', 'ACTIVE', 'CLEAN'),
        (1, 2, 4, 2, '404', 'Superior Sky 404', 'ACTIVE', 'CLEAN'),
        (1, 2, 4, 5, '405', 'Standard Single 405', 'ACTIVE', 'CLEAN'),
        (1, 2, 4, 3, '410', 'Corner Executive 410', 'ACTIVE', 'CLEAN'),

        -- Floor 5
        (1, 2, 5, 4, '501', 'Presidential Royal Suite 501', 'ACTIVE', 'CLEAN'),
        (1, 2, 5, 3, '502', 'Executive Diplomatic 502', 'ACTIVE', 'CLEAN'),
        (1, 2, 5, 4, '503', 'Presidential Penthouse 503', 'ACTIVE', 'CLEAN'),
        (1, 2, 5, 2, '505', 'Sky Superior 505', 'ACTIVE', 'CLEAN'),

        -- Property 2: Grand Ocean Resort (Cox's Bazar)
        (2, 3, 6, 6, '101', 'Deluxe Coral 101', 'ACTIVE', 'CLEAN'),
        (2, 3, 6, 6, '102', 'Deluxe Coral 102', 'ACTIVE', 'CLEAN'),
        (2, 3, 6, 6, '103', 'Deluxe Coral 103', 'ACTIVE', 'CLEAN'),
        (2, 3, 6, 6, '104', 'Deluxe Coral 104', 'ACTIVE', 'DIRTY'),
        (2, 3, 6, 7, '105', 'Beach Suite 105', 'ACTIVE', 'INSPECTED'),
        (2, 3, 6, 7, '106', 'Beach Suite 106', 'ACTIVE', 'CLEAN'),
        (2, 3, 7, 6, '201', 'Sea Horizon 201', 'ACTIVE', 'CLEAN'),
        (2, 3, 7, 6, '202', 'Sea Horizon 202', 'ACTIVE', 'CLEAN'),
        (2, 3, 7, 6, '203', 'Sea Horizon 203', 'ACTIVE', 'INSPECTED'),
        (2, 3, 7, 7, '204', 'Executive Ocean Suite 204', 'ACTIVE', 'CLEAN'),
        (2, 3, 7, 7, '205', 'Executive Ocean Suite 205', 'ACTIVE', 'DIRTY'),
        (2, 3, 7, 6, '206', 'Sea Horizon 206', 'ACTIVE', 'CLEAN'),
        (2, 3, 7, 6, '207', 'Sea Horizon 207', 'ACTIVE', 'CLEAN'),
        (2, 3, 7, 7, '208', 'Executive Ocean Suite 208', 'OUT_OF_ORDER', 'DIRTY'),
        (2, 4, 8, 8, 'V01', 'Royal Beach Villa 1', 'ACTIVE', 'INSPECTED'),
        (2, 4, 8, 8, 'V02', 'Royal Beach Villa 2', 'ACTIVE', 'CLEAN'),
        (2, 4, 8, 8, 'V03', 'Royal Beach Villa 3', 'ACTIVE', 'CLEAN'),
        (2, 4, 8, 8, 'V04', 'Royal Beach Villa 4', 'ACTIVE', 'DIRTY'),
        (2, 4, 8, 7, 'V05', 'Sunset Chalet 5', 'ACTIVE', 'CLEAN'),
        (2, 4, 8, 7, 'V06', 'Sunset Chalet 6', 'ACTIVE', 'CLEAN');
    `);

    // 3. Ensure realistic guests and reservations exist in SQLite
    const resCount = db.prepare('SELECT COUNT(*) as c FROM reservations').get() as { c: number };
    if (resCount && resCount.c < 5) {
        console.log('📝 Seeding realistic reservations directly into relational DB tables...');
        db.exec(`
            -- Guests
            INSERT OR IGNORE INTO guests (id, organization_id, salutation, first_name, last_name, email, phone, nationality, id_type, id_number, vip_status) VALUES
            (10, 1, 'Mr', 'Asif', 'Iqbal', 'asif.iqbal@brac.net', '+880 1711-234567', 'Bangladeshi', 'National ID (NID)', '199201928374', 'NONE'),
            (11, 1, 'Mrs', 'Sabrina', 'Yeasmin', 'sabrina.y@gmail.com', '+880 1819-876543', 'Bangladeshi', 'Passport', 'A09823412', 'VIP'),
            (12, 1, 'Mr', 'Mahbubur', 'Rahman', 'mahbub@apex.com', '+880 1713-987654', 'Bangladeshi', 'National ID (NID)', '198501928311', 'NONE'),
            (13, 1, 'Mr', 'Rashidul', 'Hasan', 'rashidul@gmail.com', '+880 1819-384720', 'Bangladeshi', 'National ID (NID)', '199101928355', 'NONE'),
            (14, 1, 'Mr', 'Md. Tariqul', 'Islam', 'tariqul@grameen.com', '+880 1711-928371', 'Bangladeshi', 'National ID (NID)', '198901928366', 'NONE'),
            (15, 1, 'Dr', 'Imran', 'Hossain', 'imran@hospitality.com', '+880 1711-987654', 'Bangladeshi', 'Passport', 'P09823412', 'VVIP'),
            (16, 1, 'Mr', 'Shahidul', 'Alam', 'shahidul@drik.net', '+880 1715-443322', 'Bangladeshi', 'National ID (NID)', '197501928399', 'VIP');

            -- Reservations
            INSERT OR IGNORE INTO reservations (id, property_id, reservation_number, booker_guest_id, source, channel, is_group, status, total_amount, paid_amount, due_amount) VALUES
            (101, 1, 'RES-009288', 10, 'Direct Web', 'Website', 0, 'CONFIRMED', 6600.00, 3000.00, 3600.00),
            (102, 1, 'RES-009289', 11, 'Online OTA', 'Booking.com', 0, 'CONFIRMED', 9000.00, 9000.00, 0.00),
            (103, 1, 'RES-009283', 12, 'Corporate Contract', 'Corporate Desk', 1, 'CONFIRMED', 21000.00, 21000.00, 0.00),
            (105, 1, 'RES-009287', 13, 'Phone Tentative', 'Phone Call', 0, 'HOLD', 9000.00, 0.00, 9000.00),
            (106, 1, 'RES-009281', 14, 'Direct Walk-In', 'Front Desk', 0, 'IN_HOUSE', 9000.00, 9000.00, 0.00),
            (107, 1, 'RES-009284', 15, 'Executive Suite Web', 'VIP Direct', 0, 'IN_HOUSE', 108000.00, 50000.00, 58000.00),
            (108, 1, 'RES-009280', 16, 'Direct Walk-In', 'Front Desk', 0, 'IN_HOUSE', 9000.00, 9000.00, 0.00);

            -- Reservation Rooms (1NF-4NF)
            -- 105: Room 105 (id 5)
            INSERT OR IGNORE INTO reservation_rooms (id, reservation_id, room_id, guest_id, check_in_date, check_out_date, nights, room_rate, adults, children, status) VALUES
            (101, 101, (SELECT id FROM rooms WHERE room_number = '105' LIMIT 1), 10, '2026-07-10', '2026-07-13', 3, 2200.00, 1, 0, 'ASSIGNED'),
            (102, 102, (SELECT id FROM rooms WHERE room_number = '204' LIMIT 1), 11, '2026-07-12', '2026-07-15', 3, 3000.00, 2, 1, 'ASSIGNED'),
            (103, 103, (SELECT id FROM rooms WHERE room_number = '102' LIMIT 1), 12, '2026-07-03', '2026-07-06', 3, 3000.00, 2, 0, 'ASSIGNED'),
            (104, 103, (SELECT id FROM rooms WHERE room_number = '201' LIMIT 1), 12, '2026-07-03', '2026-07-06', 3, 4000.00, 2, 0, 'ASSIGNED'),
            (105, 105, (SELECT id FROM rooms WHERE room_number = '102' LIMIT 1), 13, '2026-07-05', '2026-07-08', 3, 3000.00, 2, 0, 'ASSIGNED'),
            (106, 106, (SELECT id FROM rooms WHERE room_number = '101' LIMIT 1), 14, '2026-07-01', '2026-07-04', 3, 3000.00, 2, 0, 'CHECKED_IN'),
            (107, 107, (SELECT id FROM rooms WHERE room_number = '501' LIMIT 1), 15, '2026-07-01', '2026-07-07', 6, 18000.00, 2, 0, 'CHECKED_IN'),
            (108, 108, (SELECT id FROM rooms WHERE room_number = '103' LIMIT 1), 16, '2026-06-29', '2026-07-01', 2, 4500.00, 1, 0, 'CHECKED_IN');
        `);
    }
}
