/**
 * scripts/migrate_housekeeping_schema.cjs
 * Executes schema migration on PostgreSQL for Housekeeping Subsystem:
 * 1. Extends housekeeping_tasks with enterprise attributes (credit_value, floor, priority, dates).
 * 2. Creates room_discrepancies for auditable room physical-to-financial variance tracking.
 * 3. Creates housekeeping_sop_inspections for 8-point digital checklist audits.
 * 4. Creates housekeeping_settings for property-scoped automated policies.
 */

const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });
dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set!');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting Housekeeping Subsystem Migration...');
    await client.query('BEGIN');

    // 1. Extend housekeeping_tasks
    console.log('📦 Updating housekeeping_tasks table...');
    await client.query(`
      ALTER TABLE housekeeping_tasks 
        ADD COLUMN IF NOT EXISTS property_id BIGINT REFERENCES properties(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS credit_value NUMERIC(4,2) DEFAULT 1.00,
        ADD COLUMN IF NOT EXISTS floor_number INT,
        ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS is_rush BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_linen_due BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_dnd BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS special_requests TEXT,
        ADD COLUMN IF NOT EXISTS assigned_employee_name VARCHAR(128);
    `);

    // Backfill property_id on existing housekeeping_tasks from rooms
    await client.query(`
      UPDATE housekeeping_tasks ht
      SET property_id = r.property_id,
          floor_number = COALESCE(ht.floor_number, r.floor_id::int, 1)
      FROM rooms r
      WHERE ht.room_id = r.id AND ht.property_id IS NULL;
    `);

    // 2. Create room_discrepancies table
    console.log('📦 Creating room_discrepancies table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_discrepancies (
        id BIGSERIAL PRIMARY KEY,
        property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        room_number VARCHAR(50) NOT NULL,
        discrepancy_type VARCHAR(64) NOT NULL CHECK (discrepancy_type IN (
          'Sleep Discrepancy', 
          'Skip Discrepancy (Skipper)', 
          'Person Count Mismatch', 
          'Luggage Without Guest'
        )),
        front_desk_status VARCHAR(64) NOT NULL,
        housekeeping_found VARCHAR(128) NOT NULL,
        guest_name VARCHAR(128),
        reported_by VARCHAR(128) NOT NULL,
        reported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVESTIGATING', 'RESOLVED')),
        resolved_by VARCHAR(128),
        resolved_at TIMESTAMPTZ,
        resolution_notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_room_discrepancies_property_status ON room_discrepancies(property_id, status);
      CREATE INDEX IF NOT EXISTS idx_room_discrepancies_room_id ON room_discrepancies(room_id);
    `);

    // 3. Create housekeeping_sop_inspections table
    console.log('📦 Creating housekeeping_sop_inspections table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS housekeeping_sop_inspections (
        id BIGSERIAL PRIMARY KEY,
        task_id BIGINT REFERENCES housekeeping_tasks(id) ON DELETE SET NULL,
        room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        property_id BIGINT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        supervisor_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
        supervisor_name VARCHAR(128) NOT NULL,
        passed BOOLEAN NOT NULL DEFAULT TRUE,
        score_percentage NUMERIC(5,2) DEFAULT 100.00,
        checklist_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        defect_notes TEXT,
        inspected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sop_inspections_room ON housekeeping_sop_inspections(room_id);
      CREATE INDEX IF NOT EXISTS idx_sop_inspections_property ON housekeeping_sop_inspections(property_id);
    `);

    // 4. Create housekeeping_settings table
    console.log('📦 Creating housekeeping_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS housekeeping_settings (
        property_id BIGINT PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
        auto_dirty_on_checkout BOOLEAN DEFAULT TRUE,
        auto_dirty_on_night_audit BOOLEAN DEFAULT TRUE,
        require_inspection_before_checkin BOOLEAN DEFAULT TRUE,
        auto_mark_clean_on_inspection BOOLEAN DEFAULT TRUE,
        default_stayover_frequency VARCHAR(32) DEFAULT 'daily',
        linen_change_frequency_days INT DEFAULT 3,
        deep_clean_interval_days INT DEFAULT 30,
        credit_per_standard_room NUMERIC(4,2) DEFAULT 1.00,
        credit_per_suite NUMERIC(4,2) DEFAULT 2.00,
        credit_per_connecting_suite NUMERIC(4,2) DEFAULT 3.00,
        max_credits_per_housekeeper NUMERIC(4,2) DEFAULT 14.00,
        auto_assign_strategy VARCHAR(32) DEFAULT 'by-credits',
        rush_room_alert_minutes INT DEFAULT 120,
        dnd_max_hours_alert INT DEFAULT 24,
        status_workflow VARCHAR(32) DEFAULT 'standard',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default settings for property 1 if not exists
    await client.query(`
      INSERT INTO housekeeping_settings (property_id)
      VALUES (1)
      ON CONFLICT (property_id) DO NOTHING;
    `);

    // 5. Seed Housekeeping Department, Designations, and Attendants
    console.log('📦 Ensuring Housekeeping Staff & Department in PostgreSQL...');
    await client.query(`
      INSERT INTO departments (property_id, code, name)
      VALUES (1, 'HK', 'Housekeeping')
      ON CONFLICT (property_id, code) DO NOTHING;

      INSERT INTO designations (department_id, title)
      SELECT d.id, 'Room Attendant'
      FROM departments d
      WHERE d.property_id = 1 AND d.code = 'HK'
      ON CONFLICT (department_id, title) DO NOTHING;

      INSERT INTO designations (department_id, title)
      SELECT d.id, 'Floor Supervisor'
      FROM departments d
      WHERE d.property_id = 1 AND d.code = 'HK'
      ON CONFLICT (department_id, title) DO NOTHING;

      INSERT INTO employees (
        property_id, department_id, designation_id, employee_code,
        first_name, last_name, email, phone, hire_date, employment_status, status
      )
      SELECT 
        1, d.id, des.id, v.code, v.fn, v.ln, v.email, v.phone, CURRENT_DATE, 'ACTIVE', 'ACTIVE'
      FROM departments d
      JOIN designations des ON des.department_id = d.id AND des.title = 'Room Attendant'
      CROSS JOIN (VALUES 
        ('HK-101', 'Fatema', 'Begum', 'fatema.hk@grandpalace.com', '+880 1711 111001'),
        ('HK-102', 'Rupa', 'Akter', 'rupa.hk@grandpalace.com', '+880 1711 111002'),
        ('HK-103', 'Salma', 'Khatun', 'salma.hk@grandpalace.com', '+880 1711 111003'),
        ('HK-104', 'Mitu', 'Sultana', 'mitu.hk@grandpalace.com', '+880 1711 111004')
      ) AS v(code, fn, ln, email, phone)
      WHERE d.property_id = 1 AND d.code = 'HK'
      ON CONFLICT (employee_code) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ Housekeeping Subsystem Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
