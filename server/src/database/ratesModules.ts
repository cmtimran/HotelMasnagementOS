import type { Pool } from 'pg';

/**
 * Ensures all PostgreSQL tables, extended columns, and seed data for:
 * 1. Connecting Rooms
 * 2. Rate Plans
 * 3. Meal Plans
 * 4. Hotel Packages
 * 5. Rate Calendar Overrides
 * 6. Extended room_types, rooms, buildings, and floors columns
 */
export async function ensureRatesAndExtendedTablesPostgres(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
        // 1. Connecting Rooms Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS connecting_rooms (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                inventory_logic VARCHAR(64) NOT NULL DEFAULT 'Auto-Sync',
                pricing_strategy VARCHAR(64) NOT NULL DEFAULT 'Sum of Rates',
                fixed_price NUMERIC(12,2) DEFAULT 0.00,
                status VARCHAR(32) NOT NULL DEFAULT 'Active',
                component_rooms_json TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 1b. Room Maintenance Blocks (Out of Order & Out of Service)
        await client.query(`
            CREATE TABLE IF NOT EXISTS room_maintenance_blocks (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                room_number VARCHAR(32) NOT NULL,
                room_type VARCHAR(128) NOT NULL,
                block_type VARCHAR(10) NOT NULL DEFAULT 'OOO', -- 'OOO' (Out of Order) or 'OOS' (Out of Service)
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason_category VARCHAR(64) NOT NULL,
                description TEXT,
                assigned_to VARCHAR(128),
                status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active', 'extended', 'completed', 'cancelled'
                return_to_status VARCHAR(32) NOT NULL DEFAULT 'Dirty', -- 'Dirty', 'Inspected', 'Clean'
                extension_notes TEXT,
                created_by VARCHAR(128) NOT NULL DEFAULT 'Manager',
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_room_maint_dates ON room_maintenance_blocks(property_id, room_number, start_date, end_date, status);
        `);

        // 1c. Lost & Found Management Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS lost_and_found_items (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                reference_no VARCHAR(64) NOT NULL UNIQUE,
                item_name VARCHAR(255) NOT NULL,
                category VARCHAR(64) NOT NULL,
                description TEXT,
                found_date DATE NOT NULL,
                found_time VARCHAR(16),
                location_type VARCHAR(32) NOT NULL DEFAULT 'Guest Room',
                room_number VARCHAR(32),
                area_details VARCHAR(255),
                found_by VARCHAR(128) NOT NULL,
                finder_role VARCHAR(64) DEFAULT 'Housekeeping Attendant',
                storage_location VARCHAR(128) NOT NULL,
                storage_bin VARCHAR(64),
                is_valuable BOOLEAN NOT NULL DEFAULT FALSE,
                holding_period_days INT NOT NULL DEFAULT 90,
                guest_name VARCHAR(128),
                guest_phone VARCHAR(64),
                guest_email VARCHAR(128),
                reservation_id VARCHAR(64),
                notified_status VARCHAR(32) NOT NULL DEFAULT 'pending',
                notified_at TIMESTAMPTZ,
                notified_notes TEXT,
                status VARCHAR(32) NOT NULL DEFAULT 'in_custody',
                claimed_by VARCHAR(128),
                claimant_phone VARCHAR(64),
                claimant_id_type VARCHAR(64),
                claimant_id_number VARCHAR(128),
                released_by VARCHAR(128),
                released_at TIMESTAMPTZ,
                release_notes TEXT,
                shipping_tracking_number VARCHAR(128),
                shipping_carrier VARCHAR(64),
                disposal_reason TEXT,
                disposed_at TIMESTAMPTZ,
                disposed_by VARCHAR(128),
                created_by VARCHAR(128) NOT NULL DEFAULT 'Housekeeping',
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_lost_found_status ON lost_and_found_items(property_id, status, found_date);
        `);

        // 2. Rate Plans Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS rate_plans (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                short_code VARCHAR(64) NOT NULL,
                market_segment VARCHAR(64) NOT NULL DEFAULT 'FIT / Direct',
                currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
                description TEXT,
                status VARCHAR(32) NOT NULL DEFAULT 'Active',
                meal_plan VARCHAR(32) DEFAULT 'EP',
                package_id BIGINT,
                tax_included BOOLEAN NOT NULL DEFAULT FALSE,
                promo_code VARCHAR(64),
                policies_json TEXT,
                activation_date DATE,
                expiration_date DATE,
                stay_date_start DATE,
                stay_date_end DATE,
                is_seasonal BOOLEAN NOT NULL DEFAULT FALSE,
                season_name VARCHAR(128),
                season_start DATE,
                season_end DATE,
                valid_days_json TEXT,
                min_nights INT NOT NULL DEFAULT 1,
                max_nights INT,
                cut_off_days INT NOT NULL DEFAULT 0,
                closed_to_arrival BOOLEAN NOT NULL DEFAULT FALSE,
                closed_to_departure BOOLEAN NOT NULL DEFAULT FALSE,
                stop_sell BOOLEAN NOT NULL DEFAULT FALSE,
                pricing_json TEXT,
                raw_json TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(property_id, short_code)
            );
        `);

        // 3. Meal Plans Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS meal_plans (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                marketing_name VARCHAR(255),
                short_code VARCHAR(64) NOT NULL,
                description TEXT,
                status VARCHAR(32) NOT NULL DEFAULT 'Active',
                has_breakfast BOOLEAN DEFAULT FALSE,
                breakfast_menu TEXT,
                breakfast_style VARCHAR(64),
                breakfast_venue VARCHAR(128),
                breakfast_cuisine VARCHAR(64),
                has_lunch BOOLEAN DEFAULT FALSE,
                lunch_menu TEXT,
                lunch_style VARCHAR(64),
                lunch_venue VARCHAR(128),
                lunch_cuisine VARCHAR(64),
                has_dinner BOOLEAN DEFAULT FALSE,
                dinner_menu TEXT,
                dinner_style VARCHAR(64),
                dinner_venue VARCHAR(128),
                dinner_cuisine VARCHAR(64),
                has_brunch BOOLEAN DEFAULT FALSE,
                brunch_menu TEXT,
                brunch_style VARCHAR(64),
                brunch_venue VARCHAR(128),
                brunch_cuisine VARCHAR(64),
                has_cupole BOOLEAN DEFAULT FALSE,
                cupole_menu TEXT,
                cupole_style VARCHAR(64),
                cupole_venue VARCHAR(128),
                cupole_cuisine VARCHAR(64),
                has_snacks BOOLEAN DEFAULT FALSE,
                snacks_menu TEXT,
                snacks_style VARCHAR(64),
                snacks_venue VARCHAR(128),
                snacks_cuisine VARCHAR(64),
                serving_type VARCHAR(64) DEFAULT 'Buffet',
                internal_cost NUMERIC(12,2) DEFAULT 0.00,
                selling_price_adult NUMERIC(12,2) DEFAULT 0.00,
                selling_price_child NUMERIC(12,2) DEFAULT 0.00,
                infant_meals_free BOOLEAN DEFAULT TRUE,
                max_infant_age INT DEFAULT 5,
                posting_frequency VARCHAR(64) DEFAULT 'Daily',
                revenue_code VARCHAR(64) DEFAULT 'REV-FB-MEAL',
                tax_inclusive BOOLEAN DEFAULT TRUE,
                start_time VARCHAR(16) DEFAULT '07:00',
                end_time VARCHAR(16) DEFAULT '23:00',
                venue VARCHAR(128) DEFAULT 'Main Restaurant',
                raw_json TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(property_id, short_code)
            );
        `);

        // 4. Hotel Packages Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS hotel_packages (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                short_code VARCHAR(64) NOT NULL,
                package_type VARCHAR(64) NOT NULL DEFAULT 'Standard',
                status VARCHAR(32) NOT NULL DEFAULT 'Active',
                color VARCHAR(32) DEFAULT '#3B82F6',
                description TEXT,
                raw_json TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(property_id, short_code)
            );
        `);

        // 5. Rate Calendar Overrides Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS rate_calendar_overrides (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                room_type_name VARCHAR(128) NOT NULL,
                date DATE NOT NULL,
                rate NUMERIC(12,2) NOT NULL,
                occupancy INT DEFAULT 0,
                is_weekend BOOLEAN DEFAULT FALSE,
                is_holiday BOOLEAN DEFAULT FALSE,
                event_name VARCHAR(128),
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(property_id, room_type_name, date)
            );
        `);

        // 5b. Enterprise Operational System Settings
        await client.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                operational_date DATE NOT NULL DEFAULT CURRENT_DATE,
                night_audit_status VARCHAR(32) NOT NULL DEFAULT 'IDLE',
                last_night_audit_at TIMESTAMPTZ,
                auto_dirty_on_checkout BOOLEAN NOT NULL DEFAULT TRUE,
                auto_dirty_on_night_audit BOOLEAN NOT NULL DEFAULT TRUE,
                strict_checkin_gate BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(property_id)
            );
            CREATE INDEX IF NOT EXISTS idx_system_settings_prop ON system_settings(property_id);
        `);

        // 5c. Night Audit Historical Execution Logs
        await client.query(`
            CREATE TABLE IF NOT EXISTS night_audit_logs (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                audit_date DATE NOT NULL,
                performed_by VARCHAR(128) NOT NULL DEFAULT 'System',
                rooms_posted INT NOT NULL DEFAULT 0,
                total_room_revenue NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                total_tax_posted NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                in_house_count INT NOT NULL DEFAULT 0,
                arrivals_pending INT NOT NULL DEFAULT 0,
                departures_pending INT NOT NULL DEFAULT 0,
                status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
                details_json TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_night_audit_logs_prop ON night_audit_logs(property_id, audit_date);
        `);

        // 5d. Smart Lock & Keycard Encoders Log
        await client.query(`
            CREATE TABLE IF NOT EXISTS keycard_logs (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                room_number VARCHAR(32) NOT NULL,
                card_uid VARCHAR(128) NOT NULL,
                encoder_type VARCHAR(64) NOT NULL DEFAULT 'RFID_GENERIC',
                operation VARCHAR(32) NOT NULL DEFAULT 'ISSUE',
                issued_to VARCHAR(128),
                valid_from TIMESTAMPTZ NOT NULL,
                valid_until TIMESTAMPTZ NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_keycard_logs_room ON keycard_logs(property_id, room_number, status);
        `);

        // 5e. Two-Way Channel Manager (ARI) Sync Logs
        await client.query(`
            CREATE TABLE IF NOT EXISTS channel_manager_logs (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                channel_name VARCHAR(64) NOT NULL,
                event_type VARCHAR(64) NOT NULL,
                payload_json TEXT NOT NULL DEFAULT '{}',
                status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_channel_logs_prop ON channel_manager_logs(property_id, channel_name, created_at);
        `);

        // 6. Safe Column Additions to Existing Tables in PostgreSQL
        const safeColumns = [
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS size INT DEFAULT 350;',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS extra_adult_price NUMERIC(12,2) DEFAULT 1000.00;',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS extra_child_price NUMERIC(12,2) DEFAULT 500.00;',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS bed_type VARCHAR(64) DEFAULT \'King\';',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS view_type VARCHAR(64) DEFAULT \'City View\';',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS smoking_policy VARCHAR(64) DEFAULT \'Non-Smoking\';',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS amenities TEXT DEFAULT \'[]\';',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS photos TEXT DEFAULT \'[]\';',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS is_connecting BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT TRUE;',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT \'Active\';',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 1;',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS default_bed_type VARCHAR(64) DEFAULT \'King\';',
            'ALTER TABLE room_types ADD COLUMN IF NOT EXISTS bed_count INT DEFAULT 1;',

            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS phone_ext VARCHAR(32);',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS lock_id VARCHAR(64);',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS keycard_rfid VARCHAR(128);',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_connecting BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS connected_to VARCHAR(64);',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS smoking_status VARCHAR(64) DEFAULT \'Non-Smoking\';',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS near_elevator BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS remarks TEXT;',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bed_type VARCHAR(64);',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bed_count INT;',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_bed_convertible BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS current_bed_setup VARCHAR(64) DEFAULT \'Standard\';',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS view_type VARCHAR(64) DEFAULT \'City View\';',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS connecting_door_status VARCHAR(32) DEFAULT \'LOCKED\';',

            'ALTER TABLE buildings ADD COLUMN IF NOT EXISTS type VARCHAR(64) DEFAULT \'Main Tower\';',
            'ALTER TABLE buildings ADD COLUMN IF NOT EXISTS description TEXT;',
            'ALTER TABLE buildings ADD COLUMN IF NOT EXISTS total_floors INT DEFAULT 5;',
            'ALTER TABLE buildings ADD COLUMN IF NOT EXISTS has_elevator BOOLEAN DEFAULT TRUE;',
            'ALTER TABLE buildings ADD COLUMN IF NOT EXISTS wheelchair_access BOOLEAN DEFAULT TRUE;',
            'ALTER TABLE buildings ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT \'Active\';',
            'ALTER TABLE buildings ADD COLUMN IF NOT EXISTS amenity_ids_json TEXT;',

            'ALTER TABLE floors ADD COLUMN IF NOT EXISTS category VARCHAR(64) DEFAULT \'Guest Rooms\';',
            'ALTER TABLE floors ADD COLUMN IF NOT EXISTS room_capacity INT DEFAULT 8;',
            'ALTER TABLE floors ADD COLUMN IF NOT EXISTS has_elevator_access BOOLEAN DEFAULT TRUE;',
            'ALTER TABLE floors ADD COLUMN IF NOT EXISTS has_fire_exit BOOLEAN DEFAULT TRUE;',
            'ALTER TABLE floors ADD COLUMN IF NOT EXISTS has_linen_closet BOOLEAN DEFAULT TRUE;',
            'ALTER TABLE floors ADD COLUMN IF NOT EXISTS has_service_station BOOLEAN DEFAULT TRUE;',
            'ALTER TABLE floors ADD COLUMN IF NOT EXISTS has_ice_machine BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE floors ADD COLUMN IF NOT EXISTS amenity_ids_json TEXT;',
            'ALTER TABLE floors ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT \'Open\';',
            'ALTER TABLE floors ADD COLUMN IF NOT EXISTS description TEXT;'
        ];

        for (const colSql of safeColumns) {
            try {
                await client.query(colSql);
            } catch (err: any) {
                console.warn('Column add warning in PostgreSQL:', err.message);
            }
        }

        // 7. Dynamic schema verification completed
        // (Automatic re-seeding disabled to ensure clean single-property architecture)
    } finally {
        client.release();
    }
}
