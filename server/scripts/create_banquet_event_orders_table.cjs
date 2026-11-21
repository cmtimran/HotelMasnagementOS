const { pgPool } = require('../dist/database/postgres.js');

async function migrate() {
    console.log('🚀 Creating banquet_event_orders table in PostgreSQL...');
    const client = await pgPool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS banquet_event_orders (
                id VARCHAR(64) PRIMARY KEY,
                property_id INT NOT NULL DEFAULT 1,
                outlet_id VARCHAR(64) NOT NULL REFERENCES restaurant_outlets(id) ON DELETE CASCADE,
                beo_number VARCHAR(64) NOT NULL,
                event_name VARCHAR(255) NOT NULL,
                event_type VARCHAR(64) NOT NULL DEFAULT 'GALA_DINNER',
                host_name VARCHAR(128) NOT NULL,
                host_phone VARCHAR(32) DEFAULT '',
                host_email VARCHAR(128) DEFAULT '',
                company_name VARCHAR(128) DEFAULT '',
                event_date DATE NOT NULL,
                setup_time VARCHAR(16) DEFAULT '15:00',
                start_time VARCHAR(16) DEFAULT '18:00',
                end_time VARCHAR(16) DEFAULT '23:00',
                guaranteed_pax INT NOT NULL DEFAULT 50,
                expected_pax INT NOT NULL DEFAULT 60,
                seating_style VARCHAR(64) NOT NULL DEFAULT 'BANQUET_ROUND',
                hall_layout_notes TEXT DEFAULT '',
                av_checklist JSONB DEFAULT '{"cordlessMics": 2, "projector": true, "stageLighting": true, "soundConsole": true, "podium": true}'::jsonb,
                food_service_schedule JSONB DEFAULT '{"welcomeDrinks": "18:00", "starters": "19:00", "buffet": "20:30", "desserts": "21:30"}'::jsonb,
                menu_selected JSONB DEFAULT '[]'::jsonb,
                rental_tariff NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                per_pax_menu_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                total_food_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                total_av_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                service_charge NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                vat NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                advance_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
                special_instructions TEXT DEFAULT '',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_beo_property ON banquet_event_orders(property_id);
            CREATE INDEX IF NOT EXISTS idx_beo_outlet ON banquet_event_orders(outlet_id);
            CREATE INDEX IF NOT EXISTS idx_beo_date ON banquet_event_orders(event_date);
            CREATE INDEX IF NOT EXISTS idx_beo_number ON banquet_event_orders(beo_number);
        `);
        console.log('✅ banquet_event_orders table created and indexed successfully!');
    } catch (e) {
        console.error('Migration error:', e);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
