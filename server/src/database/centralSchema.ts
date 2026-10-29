import type { Pool } from 'pg';

/**
 * Enterprise Multi-Tenant Central Control Plane Schema
 * Tracks tenant databases, connection credentials, modular plugins, and approval requests
 */
export async function ensureCentralSchema(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Central Tenants Registry (Supports Hybrid Multi-Tenancy: Shared Pools & Dedicated DBs)
        await client.query(`
            CREATE TABLE IF NOT EXISTS central_tenants (
                id SERIAL PRIMARY KEY,
                slug VARCHAR(64) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                db_name VARCHAR(128) NOT NULL,
                db_host VARCHAR(255) NOT NULL,
                db_port INT NOT NULL DEFAULT 5432,
                db_user VARCHAR(128) NOT NULL,
                db_pass VARCHAR(255) NOT NULL,
                db_ssl BOOLEAN NOT NULL DEFAULT TRUE,
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
                isolation_mode VARCHAR(32) NOT NULL DEFAULT 'DEDICATED',
                property_id INT,
                cluster_pool_id VARCHAR(64) DEFAULT 'primary-shared',
                custom_domain VARCHAR(255),
                subscription_tier VARCHAR(64) DEFAULT 'ENTERPRISE',
                admin_name VARCHAR(128),
                admin_email VARCHAR(128),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- Progressive Migration: Ensure hybrid multi-tenant columns & relaxed constraints exist
            ALTER TABLE central_tenants DROP CONSTRAINT IF EXISTS central_tenants_db_name_key;
            ALTER TABLE central_tenants ADD COLUMN IF NOT EXISTS isolation_mode VARCHAR(32) DEFAULT 'DEDICATED';
            ALTER TABLE central_tenants ADD COLUMN IF NOT EXISTS property_id INT;
            ALTER TABLE central_tenants ADD COLUMN IF NOT EXISTS cluster_pool_id VARCHAR(64) DEFAULT 'primary-shared';
        `);

        // 2. Plugins Catalog (System & Optional Addons)
        await client.query(`
            CREATE TABLE IF NOT EXISTS central_plugins_catalog (
                id SERIAL PRIMARY KEY,
                plugin_key VARCHAR(64) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
                category VARCHAR(64) NOT NULL DEFAULT 'OPERATIONS',
                schema_ddl TEXT,
                is_system BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Tenant Plugins Allocation
        await client.query(`
            CREATE TABLE IF NOT EXISTS central_tenant_plugins (
                id SERIAL PRIMARY KEY,
                tenant_slug VARCHAR(64) REFERENCES central_tenants(slug) ON DELETE CASCADE,
                plugin_key VARCHAR(64) REFERENCES central_plugins_catalog(plugin_key) ON DELETE CASCADE,
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
                installed_version VARCHAR(32) DEFAULT '1.0.0',
                activated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                config JSONB DEFAULT '{}'::jsonb,
                UNIQUE(tenant_slug, plugin_key)
            );
        `);

        // 4. Custom Feature & Schema Change Requests
        await client.query(`
            CREATE TABLE IF NOT EXISTS central_custom_requests (
                id SERIAL PRIMARY KEY,
                tenant_slug VARCHAR(64) REFERENCES central_tenants(slug) ON DELETE CASCADE,
                request_type VARCHAR(64) NOT NULL, -- PLUGIN_ACTIVATION, CUSTOM_SCHEMA, FEATURE_FLAG, CUSTOM_REPORT
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                target_module VARCHAR(64),
                sql_migration TEXT,
                status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, DEPLOYED, REJECTED
                requested_by VARCHAR(128) DEFAULT 'Property Admin',
                admin_notes TEXT,
                approved_by VARCHAR(128),
                approved_at TIMESTAMPTZ,
                deployed_at TIMESTAMPTZ,
                execution_logs TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Tenant Summary Metrics (Aggregated KPIs)
        await client.query(`
            CREATE TABLE IF NOT EXISTS central_tenant_metrics (
                id SERIAL PRIMARY KEY,
                tenant_slug VARCHAR(64) REFERENCES central_tenants(slug) ON DELETE CASCADE,
                total_rooms INT DEFAULT 0,
                occupied_rooms INT DEFAULT 0,
                revenue_bdt NUMERIC(15,2) DEFAULT 0,
                total_bookings INT DEFAULT 0,
                last_ping_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_slug)
            );
        `);

        // Seed Plugins Catalog
        const initialPlugins = [
            {
                key: 'banquet_events',
                name: 'Banquet & Event Operations',
                desc: 'Convention halls, audio-visual gear scheduling, seating setups, and per-plate catering invoicing.',
                cat: 'REVENUE',
                ddl: `
                    CREATE TABLE IF NOT EXISTS banquet_halls (
                        id BIGSERIAL PRIMARY KEY,
                        name VARCHAR(128) NOT NULL,
                        capacity_seating INT NOT NULL DEFAULT 100,
                        base_hourly_rate_bdt NUMERIC(10,2) NOT NULL DEFAULT 5000.00,
                        amenities TEXT[] DEFAULT ARRAY['Projector', 'Sound System', 'Podium'],
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE TABLE IF NOT EXISTS banquet_events (
                        id BIGSERIAL PRIMARY KEY,
                        hall_id BIGINT REFERENCES banquet_halls(id),
                        event_title VARCHAR(255) NOT NULL,
                        organizer_name VARCHAR(255) NOT NULL,
                        contact_phone VARCHAR(64),
                        start_time TIMESTAMPTZ NOT NULL,
                        end_time TIMESTAMPTZ NOT NULL,
                        expected_attendees INT NOT NULL DEFAULT 50,
                        total_amount_bdt NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                        deposit_paid_bdt NUMERIC(12,2) NOT NULL DEFAULT 0.00,
                        status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED'
                    );
                `
            },
            {
                key: 'spa_wellness',
                name: 'Ayurvedic Spa & Wellness Hub',
                desc: 'Treatment therapist booking slots, aromatic oil inventory, and direct guest folio billing integration.',
                cat: 'GUEST_SERVICES',
                ddl: `
                    CREATE TABLE IF NOT EXISTS spa_services (
                        id BIGSERIAL PRIMARY KEY,
                        service_name VARCHAR(128) NOT NULL,
                        duration_minutes INT NOT NULL DEFAULT 60,
                        price_bdt NUMERIC(10,2) NOT NULL DEFAULT 3500.00,
                        therapist_type VARCHAR(64) DEFAULT 'General',
                        is_active BOOLEAN DEFAULT TRUE
                    );
                    CREATE TABLE IF NOT EXISTS spa_appointments (
                        id BIGSERIAL PRIMARY KEY,
                        service_id BIGINT REFERENCES spa_services(id),
                        guest_name VARCHAR(128) NOT NULL,
                        room_number VARCHAR(32),
                        appointment_time TIMESTAMPTZ NOT NULL,
                        status VARCHAR(32) DEFAULT 'SCHEDULED',
                        billed_to_folio BOOLEAN DEFAULT FALSE
                    );
                `
            },
            {
                key: 'channel_manager_ota',
                name: 'Two-Way OTA Channel Manager',
                desc: 'Instant 2-way synchronization with Booking.com, Agoda, and Expedia for live rates & availability.',
                cat: 'DISTRIBUTION',
                ddl: `
                    CREATE TABLE IF NOT EXISTS ota_channels (
                        id BIGSERIAL PRIMARY KEY,
                        channel_code VARCHAR(32) UNIQUE NOT NULL,
                        channel_name VARCHAR(128) NOT NULL,
                        api_key VARCHAR(255),
                        sync_enabled BOOLEAN DEFAULT TRUE,
                        last_sync_at TIMESTAMPTZ
                    );
                `
            },
            {
                key: 'valet_parking',
                name: 'Smart Valet & Fleet Logistics',
                desc: 'Vehicle check-in key tags, dedicated driver dispatch, and automated parking space allocation.',
                cat: 'LOGISTICS',
                ddl: `
                    CREATE TABLE IF NOT EXISTS valet_tickets (
                        id BIGSERIAL PRIMARY KEY,
                        ticket_number VARCHAR(32) UNIQUE NOT NULL,
                        vehicle_plate VARCHAR(64) NOT NULL,
                        guest_name VARCHAR(128),
                        room_number VARCHAR(32),
                        parking_bay VARCHAR(32) NOT NULL,
                        parked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        retrieved_at TIMESTAMPTZ,
                        status VARCHAR(32) DEFAULT 'PARKED'
                    );
                `
            }
        ];

        for (const p of initialPlugins) {
            await client.query(`
                INSERT INTO central_plugins_catalog (plugin_key, name, description, category, schema_ddl)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (plugin_key) DO UPDATE SET 
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    schema_ddl = EXCLUDED.schema_ddl;
            `, [p.key, p.name, p.desc, p.cat, p.ddl]);
        }

        // Activate default plugins for primary tenant
        await client.query(`
            INSERT INTO central_tenant_plugins (tenant_slug, plugin_key, status)
            VALUES ('grand-palace', 'banquet_events', 'ACTIVE'),
                   ('grand-palace', 'spa_wellness', 'ACTIVE')
            ON CONFLICT (tenant_slug, plugin_key) DO NOTHING;
        `);

        await client.query('COMMIT');
        console.log('🏛️ [Central Multi-Tenant Engine] Control Plane Schemas & Catalog initialized successfully!');
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('🚨 [Central Multi-Tenant Engine] Failed to initialize schema:', err.message);
        throw err;
    } finally {
        client.release();
    }
}
