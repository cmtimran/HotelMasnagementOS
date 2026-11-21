import pg from 'pg';

export async function ensureRestaurantAndPosSchema(pool: pg.Pool): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Restaurant Outlets (Multi-Outlet Support per Hotel Property)
        await client.query(`
            CREATE TABLE IF NOT EXISTS restaurant_outlets (
                id VARCHAR(64) PRIMARY KEY,
                property_id VARCHAR(64) NOT NULL,
                name VARCHAR(128) NOT NULL,
                code VARCHAR(64) NOT NULL,
                description TEXT DEFAULT '',
                outlet_type VARCHAR(32) NOT NULL DEFAULT 'DINE_IN_RESTAURANT',
                department_category VARCHAR(64) NOT NULL DEFAULT 'FOOD_BEVERAGE',
                catalog_type VARCHAR(64) NOT NULL DEFAULT 'RESTAURANT_MENU',
                allows_barcode_scan BOOLEAN NOT NULL DEFAULT FALSE,
                requires_appointment BOOLEAN NOT NULL DEFAULT FALSE,
                physical_location VARCHAR(255) DEFAULT '',
                operating_hours JSONB DEFAULT '{"open": "07:00", "close": "23:30", "is24Hours": false, "days": ["MON","TUE","WED","THU","FRI","SAT","SUN"]}'::jsonb,
                requires_table BOOLEAN NOT NULL DEFAULT TRUE,
                allow_room_charge BOOLEAN NOT NULL DEFAULT TRUE,
                auto_generate_kot BOOLEAN NOT NULL DEFAULT TRUE,
                tax_mode VARCHAR(20) NOT NULL DEFAULT 'STATUTORY_NBR',
                tax_configuration_id VARCHAR(64),
                vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                city_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
                revenue_head_code VARCHAR(32) NOT NULL DEFAULT '10020-01',
                accepted_payment_methods JSONB DEFAULT '["Cash", "Card", "Room-Charge"]'::jsonb,
                assigned_terminal_ids JSONB DEFAULT '[]'::jsonb,
                hardware_settings JSONB DEFAULT '{}'::jsonb,
                venue_dimensions JSONB DEFAULT '{"lengthFeet": 0, "widthFeet": 0, "heightFeet": 0, "totalSqFt": 0, "carpetAreaSqFt": 0}'::jsonb,
                seating_capacities JSONB DEFAULT '{"theatre": 0, "classroom": 0, "banquet": 0, "ushape": 0, "cocktail": 0, "boardroom": 0}'::jsonb,
                rental_tariffs JSONB DEFAULT '{"hourlyRate": 0, "halfDayRate": 0, "fullDayRate": 0, "eveningRate": 0, "cleaningFee": 0}'::jsonb,
                receipt_header TEXT,
                receipt_footer TEXT DEFAULT 'Thank you for dining with us! Please come again.',
                bin_number VARCHAR(64),
                cloned_from_id VARCHAR(64),
                status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_outlet_property_code UNIQUE(property_id, code)
            );
            CREATE INDEX IF NOT EXISTS idx_outlets_property ON restaurant_outlets(property_id);
            CREATE INDEX IF NOT EXISTS idx_outlets_status ON restaurant_outlets(status);
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS department_category VARCHAR(64) DEFAULT 'FOOD_BEVERAGE';
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS catalog_type VARCHAR(64) DEFAULT 'RESTAURANT_MENU';
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS allows_barcode_scan BOOLEAN DEFAULT FALSE;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS requires_appointment BOOLEAN DEFAULT FALSE;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS physical_location VARCHAR(255) DEFAULT '';
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS accepted_payment_methods JSONB DEFAULT '["Cash", "Card", "Room-Charge"]'::jsonb;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS assigned_terminal_ids JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS hardware_settings JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS venue_dimensions JSONB DEFAULT '{"lengthFeet": 0, "widthFeet": 0, "heightFeet": 0, "totalSqFt": 0, "carpetAreaSqFt": 0}'::jsonb;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS seating_capacities JSONB DEFAULT '{"theatre": 0, "classroom": 0, "banquet": 0, "ushape": 0, "cocktail": 0, "boardroom": 0}'::jsonb;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS rental_tariffs JSONB DEFAULT '{"hourlyRate": 0, "halfDayRate": 0, "fullDayRate": 0, "eveningRate": 0, "cleaningFee": 0}'::jsonb;
            ALTER TABLE restaurant_outlets ADD COLUMN IF NOT EXISTS tax_configuration_id VARCHAR(64);
            ALTER TABLE restaurant_outlets ALTER COLUMN vat_rate SET DEFAULT 0.00;
            ALTER TABLE restaurant_outlets ALTER COLUMN service_charge_rate SET DEFAULT 0.00;
            ALTER TABLE restaurant_outlets ALTER COLUMN city_tax_rate SET DEFAULT 0.00;
            CREATE INDEX IF NOT EXISTS idx_outlets_department ON restaurant_outlets(department_category);
        `);

        // 2. Restaurant Floors / Dining Areas
        await client.query(`
            CREATE TABLE IF NOT EXISTS restaurant_floors (
                id VARCHAR(64) PRIMARY KEY,
                outlet_id VARCHAR(64) NOT NULL REFERENCES restaurant_outlets(id) ON DELETE CASCADE,
                name VARCHAR(64) NOT NULL,
                floor_number INT NOT NULL DEFAULT 0,
                description TEXT DEFAULT '',
                is_main BOOLEAN NOT NULL DEFAULT FALSE,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_floors_outlet ON restaurant_floors(outlet_id);
        `);

        // 3. Restaurant Dining Tables (With 2D visual layout coordinates)
        await client.query(`
            CREATE TABLE IF NOT EXISTS restaurant_tables (
                id VARCHAR(64) PRIMARY KEY,
                outlet_id VARCHAR(64) NOT NULL REFERENCES restaurant_outlets(id) ON DELETE CASCADE,
                floor_id VARCHAR(64) REFERENCES restaurant_floors(id) ON DELETE SET NULL,
                table_number INT NOT NULL,
                code VARCHAR(32),
                name VARCHAR(64),
                capacity INT NOT NULL DEFAULT 4,
                occupied_seats INT NOT NULL DEFAULT 0,
                status VARCHAR(32) NOT NULL DEFAULT 'VACANT',
                is_vip BOOLEAN NOT NULL DEFAULT FALSE,
                pos_x INT NOT NULL DEFAULT 0,
                pos_y INT NOT NULL DEFAULT 0,
                active_order_id VARCHAR(64),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_outlet_table_number UNIQUE(outlet_id, table_number)
            );
            CREATE INDEX IF NOT EXISTS idx_tables_outlet ON restaurant_tables(outlet_id);
            CREATE INDEX IF NOT EXISTS idx_tables_floor ON restaurant_tables(floor_id);
            CREATE INDEX IF NOT EXISTS idx_tables_status ON restaurant_tables(status);
        `);

        // 4. Menu Categories (Hierarchical with Icons)
        await client.query(`
            CREATE TABLE IF NOT EXISTS pos_categories (
                id VARCHAR(64) PRIMARY KEY,
                outlet_id VARCHAR(64) NOT NULL REFERENCES restaurant_outlets(id) ON DELETE CASCADE,
                name VARCHAR(128) NOT NULL,
                sort_order INT NOT NULL DEFAULT 0,
                icon VARCHAR(64) NOT NULL DEFAULT 'Utensils',
                parent_id VARCHAR(64) REFERENCES pos_categories(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_categories_outlet ON pos_categories(outlet_id);
            CREATE INDEX IF NOT EXISTS idx_categories_parent ON pos_categories(parent_id);
        `);

        // 5. Addons & Modifiers
        await client.query(`
            CREATE TABLE IF NOT EXISTS pos_addons (
                id VARCHAR(64) PRIMARY KEY,
                outlet_id VARCHAR(64) NOT NULL REFERENCES restaurant_outlets(id) ON DELETE CASCADE,
                name VARCHAR(128) NOT NULL,
                description TEXT DEFAULT '',
                price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                sort_order INT NOT NULL DEFAULT 0,
                image_url TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                recipe_json JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_addons_outlet ON pos_addons(outlet_id);
        `);

        // 6. Menu Items
        await client.query(`
            CREATE TABLE IF NOT EXISTS pos_menu_items (
                id VARCHAR(64) PRIMARY KEY,
                outlet_id VARCHAR(64) NOT NULL REFERENCES restaurant_outlets(id) ON DELETE CASCADE,
                name VARCHAR(128) NOT NULL,
                description TEXT DEFAULT '',
                price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                product_code VARCHAR(64),
                slug VARCHAR(128),
                category_id VARCHAR(64) NOT NULL REFERENCES pos_categories(id) ON DELETE RESTRICT,
                sub_category_id VARCHAR(64) REFERENCES pos_categories(id) ON DELETE SET NULL,
                prep_station VARCHAR(64) NOT NULL DEFAULT 'GRILL_HOT',
                prep_time_estimate INT NOT NULL DEFAULT 15,
                sort_order INT NOT NULL DEFAULT 0,
                is_available BOOLEAN NOT NULL DEFAULT TRUE,
                is_featured BOOLEAN NOT NULL DEFAULT FALSE,
                image_url TEXT,
                allergens JSONB DEFAULT '[]'::jsonb,
                tags JSONB DEFAULT '[]'::jsonb,
                variations JSONB DEFAULT '[]'::jsonb,
                combo_items JSONB DEFAULT '[]'::jsonb,
                addons JSONB DEFAULT '[]'::jsonb,
                tax_group_id VARCHAR(64),
                is_tax_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_menu_items_outlet ON pos_menu_items(outlet_id);
            CREATE INDEX IF NOT EXISTS idx_menu_items_category ON pos_menu_items(category_id);
            CREATE INDEX IF NOT EXISTS idx_menu_items_prep_station ON pos_menu_items(prep_station);
            CREATE INDEX IF NOT EXISTS idx_menu_items_available ON pos_menu_items(is_available);
        `);

        // 7. POS Orders
        await client.query(`
            CREATE TABLE IF NOT EXISTS pos_orders (
                id VARCHAR(64) PRIMARY KEY,
                outlet_id VARCHAR(64) NOT NULL REFERENCES restaurant_outlets(id) ON DELETE CASCADE,
                order_number INT NOT NULL,
                table_id VARCHAR(64) REFERENCES restaurant_tables(id) ON DELETE SET NULL,
                order_type VARCHAR(32) NOT NULL DEFAULT 'DINE_IN',
                status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED',
                customer_name VARCHAR(128) DEFAULT 'Guest',
                customer_phone VARCHAR(32),
                room_number VARCHAR(32),
                reservation_id VARCHAR(64),
                folio_id VARCHAR(64),
                folio_charge_id VARCHAR(64),
                meal_plan_code VARCHAR(32),
                meal_plan_deduction NUMERIC(12, 2) DEFAULT 0.00,
                subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                vat NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                service_charge NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                payment_method VARCHAR(32) DEFAULT 'CASH',
                payment_status VARCHAR(32) DEFAULT 'PENDING',
                payment_details JSONB DEFAULT '[]'::jsonb,
                waiter_id VARCHAR(64),
                waiter_name VARCHAR(128),
                notes TEXT,
                guest_count INT NOT NULL DEFAULT 1,
                client_order_id VARCHAR(64),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_outlet_order_number UNIQUE(outlet_id, order_number)
            );
            CREATE INDEX IF NOT EXISTS idx_pos_orders_outlet ON pos_orders(outlet_id);
            CREATE INDEX IF NOT EXISTS idx_pos_orders_status ON pos_orders(status);
            CREATE INDEX IF NOT EXISTS idx_pos_orders_created_at ON pos_orders(created_at);
            CREATE INDEX IF NOT EXISTS idx_pos_orders_table ON pos_orders(table_id);
            CREATE INDEX IF NOT EXISTS idx_pos_orders_folio ON pos_orders(folio_id);
        `);

        // 8. POS Order Items
        await client.query(`
            CREATE TABLE IF NOT EXISTS pos_order_items (
                id VARCHAR(64) PRIMARY KEY,
                order_id VARCHAR(64) NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
                menu_item_id VARCHAR(64) NOT NULL REFERENCES pos_menu_items(id) ON DELETE RESTRICT,
                item_name VARCHAR(128) NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                variation_name VARCHAR(64),
                selected_addons JSONB DEFAULT '[]'::jsonb,
                unit_price NUMERIC(12, 2) NOT NULL,
                total_price NUMERIC(12, 2) NOT NULL,
                course VARCHAR(32) NOT NULL DEFAULT 'MAINS',
                prep_station VARCHAR(64) NOT NULL DEFAULT 'GRILL_HOT',
                status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
                custom_notes TEXT,
                allergens_excluded JSONB DEFAULT '[]'::jsonb,
                is_complimentary BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_pos_order_items_order ON pos_order_items(order_id);
            CREATE INDEX IF NOT EXISTS idx_pos_order_items_station ON pos_order_items(prep_station, status);
        `);

        // 9. Cash Register Shifts & Sessions
        await client.query(`
            CREATE TABLE IF NOT EXISTS pos_cash_registers (
                id VARCHAR(64) PRIMARY KEY,
                outlet_id VARCHAR(64) NOT NULL REFERENCES restaurant_outlets(id) ON DELETE CASCADE,
                cashier_id VARCHAR(64) NOT NULL,
                cashier_name VARCHAR(128) NOT NULL,
                opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                closing_balance NUMERIC(12, 2),
                expected_closing_balance NUMERIC(12, 2),
                discrepancy NUMERIC(12, 2),
                total_cash_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                total_card_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                total_digital_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                total_room_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
                opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                closed_at TIMESTAMP WITH TIME ZONE,
                notes TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_pos_cash_registers_outlet ON pos_cash_registers(outlet_id);
            CREATE INDEX IF NOT EXISTS idx_pos_cash_registers_status ON pos_cash_registers(status);
        `);

        // 10. Kitchen Stations (100% Dynamic, Scoped to Outlet)
        await client.query(`
            CREATE TABLE IF NOT EXISTS pos_kitchen_stations (
                id VARCHAR(64) PRIMARY KEY,
                outlet_id VARCHAR(64) NOT NULL REFERENCES restaurant_outlets(id) ON DELETE CASCADE,
                name VARCHAR(128) NOT NULL,
                code VARCHAR(64) NOT NULL,
                description TEXT DEFAULT '',
                printer_ip VARCHAR(64) DEFAULT '',
                category_routing JSONB DEFAULT '[]'::jsonb,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_outlet_kitchen_code UNIQUE(outlet_id, code)
            );
            CREATE INDEX IF NOT EXISTS idx_kitchen_stations_outlet ON pos_kitchen_stations(outlet_id);
        `);

        // 11. Kitchen Order Tickets (KOT Audit & Reprint Tracking)
        await client.query(`
            CREATE TABLE IF NOT EXISTS pos_kots (
                id VARCHAR(64) PRIMARY KEY,
                outlet_id VARCHAR(64) NOT NULL REFERENCES restaurant_outlets(id) ON DELETE CASCADE,
                order_id VARCHAR(64) NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
                kot_number INT NOT NULL,
                station_code VARCHAR(64) NOT NULL,
                items JSONB NOT NULL DEFAULT '[]'::jsonb,
                is_printed BOOLEAN NOT NULL DEFAULT FALSE,
                reprint_count INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_kots_order ON pos_kots(order_id);
            CREATE INDEX IF NOT EXISTS idx_kots_outlet ON pos_kots(outlet_id);
        `);

        // 12. Recipe Bill of Materials (BOM) & Food Costing
        await client.query(`
            CREATE TABLE IF NOT EXISTS recipe_boms (
                id VARCHAR(64) PRIMARY KEY,
                menu_item_id VARCHAR(64) NOT NULL REFERENCES pos_menu_items(id) ON DELETE CASCADE,
                ingredient_name VARCHAR(128) NOT NULL,
                quantity_required NUMERIC(12, 4) NOT NULL,
                unit VARCHAR(32) NOT NULL,
                cost_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_recipe_bom_item ON recipe_boms(menu_item_id);
        `);

        // 13. Banquet Event Orders (BEO) & Function Sheets
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

        // ─────────────────────────────────────────────────────────────────────────────
        // 13. SEED INITIAL OUTLETS & RICH WORKABLE DEMO DATA (IF EMPTY)
        // ─────────────────────────────────────────────────────────────────────────────
        const outletsCheck = await client.query('SELECT COUNT(*) as count FROM restaurant_outlets;');
        if (parseInt(outletsCheck.rows[0]?.count || '0', 10) === 0) {
            // Fetch default property ID if available
            const propRes = await client.query('SELECT id FROM properties ORDER BY id ASC LIMIT 1;');
            const defaultPropertyId = propRes.rows[0]?.id || 'prop-001';

            // 13.1 Insert Main Dining Outlet
            const mainOutletId = 'outlet-main';
            await client.query(`
                INSERT INTO restaurant_outlets (
                    id, property_id, name, code, description, outlet_type, 
                    operating_hours, requires_table, allow_room_charge, 
                    vat_rate, service_charge_rate, city_tax_rate, revenue_head_code,
                    receipt_header, receipt_footer, bin_number, status
                ) VALUES (
                    $1, $2, 'The Grand Feast - Main Dining', 'OUTLET-MAIN', 'All-day luxury buffet and à la carte dining', 'DINE_IN_RESTAURANT',
                    '{"open": "06:30", "close": "23:00", "is24Hours": false, "days": ["MON","TUE","WED","THU","FRI","SAT","SUN"]}',
                    TRUE, TRUE, 0.00, 0.00, 0.00, '10020-01',
                    'The Grand Feast Restaurant\nLevel 1, Hotel Plaza', 'Thank you for dining with us! Mushak 6.3 Tax Invoice.', 'BIN-003847291-01', 'ACTIVE'
                );
            `, [mainOutletId, defaultPropertyId]);

            // 13.2 Insert Skyline Rooftop Lounge Outlet
            const rooftopOutletId = 'outlet-rooftop';
            await client.query(`
                INSERT INTO restaurant_outlets (
                    id, property_id, name, code, description, outlet_type, 
                    operating_hours, requires_table, allow_room_charge, 
                    vat_rate, service_charge_rate, city_tax_rate, revenue_head_code,
                    receipt_header, receipt_footer, bin_number, status
                ) VALUES (
                    $1, $2, 'Skyline Rooftop Bar & Lounge', 'OUTLET-ROOFTOP', 'Panoramic sunset cocktails, steaks and live tapas', 'BAR_LOUNGE',
                    '{"open": "17:00", "close": "02:00", "is24Hours": false, "days": ["MON","TUE","WED","THU","FRI","SAT","SUN"]}',
                    TRUE, TRUE, 0.00, 0.00, 0.00, '10020-02',
                    'Skyline Rooftop Lounge\nLevel 18, Hotel Plaza', 'Thank you for celebrating with us!', 'BIN-003847291-02', 'ACTIVE'
                );
            `, [rooftopOutletId, defaultPropertyId]);

            // 13.3 Insert Floors for Main Dining
            const floorGroundId = 'floor-main-g';
            const floorMezzId = 'floor-main-m';
            await client.query(`
                INSERT INTO restaurant_floors (id, outlet_id, name, floor_number, description, is_main, status)
                VALUES 
                    ($1, $2, 'Ground Floor Main Hall', 0, 'Central seating area next to buffet station', TRUE, 'active'),
                    ($3, $2, 'Mezzanine VIP Terrace', 1, 'Private dining and quiet executive booths', FALSE, 'active');
            `, [floorGroundId, mainOutletId, floorMezzId]);

            // 13.4 Insert Floors for Rooftop
            const floorRoofId = 'floor-roof-t';
            await client.query(`
                INSERT INTO restaurant_floors (id, outlet_id, name, floor_number, description, is_main, status)
                VALUES 
                    ($1, $2, 'Rooftop Open Terrace', 18, 'Open sky seating overlooking the skyline', TRUE, 'active');
            `, [floorRoofId, rooftopOutletId]);

            // 13.5 Insert Dining Tables for Main Dining
            await client.query(`
                INSERT INTO restaurant_tables (id, outlet_id, floor_id, table_number, code, name, capacity, status, is_vip, pos_x, pos_y)
                VALUES
                    ('tbl-m-01', $1, $2, 1, 'T-01', 'Table 1 (Window)', 4, 'VACANT', FALSE, 50, 60),
                    ('tbl-m-02', $1, $2, 2, 'T-02', 'Table 2 (Window)', 4, 'VACANT', FALSE, 180, 60),
                    ('tbl-m-03', $1, $2, 3, 'T-03', 'Table 3 (Center)', 6, 'VACANT', FALSE, 320, 60),
                    ('tbl-m-04', $1, $2, 4, 'T-04', 'Table 4 (Center)', 4, 'VACANT', FALSE, 460, 60),
                    ('tbl-m-05', $1, $2, 5, 'T-05', 'Table 5 (Family)', 8, 'VACANT', FALSE, 50, 180),
                    ('tbl-m-06', $1, $2, 6, 'T-06', 'Table 6 (Booth)', 4, 'VACANT', FALSE, 180, 180),
                    ('tbl-m-07', $1, $3, 7, 'V-01', 'VIP Royal Booth 1', 6, 'VACANT', TRUE, 80, 80),
                    ('tbl-m-08', $1, $3, 8, 'V-02', 'VIP Royal Booth 2', 6, 'VACANT', TRUE, 220, 80);
            `, [mainOutletId, floorGroundId, floorMezzId]);

            // 13.6 Insert Tables for Rooftop
            await client.query(`
                INSERT INTO restaurant_tables (id, outlet_id, floor_id, table_number, code, name, capacity, status, is_vip, pos_x, pos_y)
                VALUES
                    ('tbl-r-01', $1, $2, 101, 'R-01', 'Skyline Table 1', 2, 'VACANT', FALSE, 60, 80),
                    ('tbl-r-02', $1, $2, 102, 'R-02', 'Skyline Table 2', 4, 'VACANT', FALSE, 190, 80),
                    ('tbl-r-03', $1, $2, 103, 'R-03', 'Skyline Table 3', 4, 'VACANT', FALSE, 320, 80),
                    ('tbl-r-04', $1, $2, 104, 'R-VIP', 'Presidential Cabana', 8, 'VACANT', TRUE, 480, 80);
            `, [rooftopOutletId, floorRoofId]);

            // 13.7 Insert Dynamic Kitchen Stations
            await client.query(`
                INSERT INTO pos_kitchen_stations (id, outlet_id, name, code, description, printer_ip, status)
                VALUES
                    ('ks-m-grill', $1, 'Tandoor & Hot Grill Station', 'GRILL_HOT', 'Kebabs, Biryanis, Sizzlers and Tandoori items', '192.168.1.101', 'active'),
                    ('ks-m-curry', $1, 'Curry & Rice Counter', 'CURRY_POT', 'Main traditional curries, soups and rice bowls', '192.168.1.102', 'active'),
                    ('ks-m-cold', $1, 'Cold Prep & Salad Counter', 'COLD_PREP', 'Fresh garden salads, raita and appetizers', '192.168.1.103', 'active'),
                    ('ks-m-bar', $1, 'Beverage & Juice Bar', 'BAR', 'Fresh fruit juices, soft drinks, tea and coffee', '192.168.1.104', 'active'),
                    ('ks-r-bar', $2, 'Cocktail & Spirits Lounge Bar', 'BAR', 'Craft cocktails, imported wines and shooters', '192.168.2.101', 'active'),
                    ('ks-r-grill', $2, 'Live Steakhouse & BBQ Grill', 'GRILL_HOT', 'Premium wagyu, ribeye and grilled skewers', '192.168.2.102', 'active');
            `, [mainOutletId, rooftopOutletId]);

            // 13.8 Insert Menu Categories for Main Dining
            const catBiryani = 'cat-m-biryani';
            const catGrill = 'cat-m-grill';
            const catCurry = 'cat-m-curry';
            const catDrinks = 'cat-m-drinks';
            const catDessert = 'cat-m-dessert';
            await client.query(`
                INSERT INTO pos_categories (id, outlet_id, name, sort_order, icon, parent_id, status)
                VALUES
                    ($1, $6, 'Biryani & Rice Specialties', 1, 'Rice', NULL, 'active'),
                    ($2, $6, 'Meat & Tandoori Grill', 2, 'Beef', NULL, 'active'),
                    ($3, $6, 'Rich Curries & Gravies', 3, 'Soup', NULL, 'active'),
                    ($4, $6, 'Beverages & Soft Drinks', 4, 'GlassWater', NULL, 'active'),
                    ($5, $6, 'Desserts & Sweet Delights', 5, 'Cake', NULL, 'active');
            `, [catBiryani, catGrill, catCurry, catDrinks, catDessert, mainOutletId]);

            // 13.9 Insert Addons
            const addCheese = 'addon-01';
            const addEgg = 'addon-02';
            const addBorhani = 'addon-03';
            const addNaan = 'addon-04';
            await client.query(`
                INSERT INTO pos_addons (id, outlet_id, name, description, price, cost_price, sort_order, image_url, status)
                VALUES
                    ($1, $5, 'Extra Melted Cheese', 'Imported cheddar cheese topping', 50.00, 20.00, 1, 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=300', 'active'),
                    ($2, $5, 'Crispy Fried Egg', 'Farm fresh organic fried egg', 30.00, 12.00, 2, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=300', 'active'),
                    ($3, $5, 'Traditional Borhani (250ml)', 'Tangy spiced yogurt drink', 80.00, 35.00, 3, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=300', 'active'),
                    ($4, $5, 'Butter Garlic Naan', 'Clay oven baked fluffy bread', 60.00, 22.00, 4, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300', 'active');
            `, [addCheese, addEgg, addBorhani, addNaan, mainOutletId]);

            // 13.10 Insert Rich Menu Items
            await client.query(`
                INSERT INTO pos_menu_items (
                    id, outlet_id, name, description, price, product_code, slug,
                    category_id, prep_station, prep_time_estimate, sort_order, is_available, is_featured,
                    image_url, allergens, tags, variations, addons
                ) VALUES
                (
                    'item-001', $1, 'Kacchi Biryani (Basmati)', 'Authentic tender mutton layered in fragrant Basmati rice with alu bukhara and boiled potato', 480.00, 'BIR-01', 'kacchi-biryani',
                    $2, 'GRILL_HOT', 15, 1, TRUE, TRUE,
                    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
                    '["Dairy"]'::jsonb, '["Bestseller","Mutton","Chef Special"]'::jsonb,
                    '[{"id":"v-k-reg","name":"Regular (1 Person)","price":480},{"id":"v-k-plat","name":"Platter (2 Persons)","price":920}]'::jsonb,
                    '["addon-02","addon-03"]'::jsonb
                ),
                (
                    'item-002', $1, 'Chicken Dum Biryani', 'Slow-cooked aromatic chicken biryani infused with saffron and royal spices', 360.00, 'BIR-02', 'chicken-dum-biryani',
                    $2, 'GRILL_HOT', 12, 2, TRUE, TRUE,
                    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400',
                    '["Dairy"]'::jsonb, '["Popular","Chicken"]'::jsonb,
                    '[{"id":"v-c-reg","name":"Regular Portion","price":360},{"id":"v-c-leg","name":"With Extra Leg Roast","price":460}]'::jsonb,
                    '["addon-02","addon-03"]'::jsonb
                ),
                (
                    'item-003', $1, 'Beef Seekh Kebab Platter', 'Minced beef skewers charcoal-grilled with mint chutney and fresh onion rings', 420.00, 'GRL-01', 'beef-seekh-kebab',
                    $3, 'GRILL_HOT', 18, 3, TRUE, TRUE,
                    'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400',
                    '[]'::jsonb, '["Spicy","Beef","Charcoal"]'::jsonb,
                    '[{"id":"v-s-4pc","name":"4 Skewers","price":420},{"id":"v-s-8pc","name":"8 Skewers Platter","price":780}]'::jsonb,
                    '["addon-01","addon-04"]'::jsonb
                ),
                (
                    'item-004', $1, 'Butter Chicken Masala', 'Tandoori chicken simmered in rich buttery tomato velvet gravy', 390.00, 'CUR-01', 'butter-chicken-masala',
                    $4, 'GRILL_HOT', 15, 4, TRUE, TRUE,
                    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400',
                    '["Dairy","Cashew Nuts"]'::jsonb, '["Creamy","Mild","North Indian"]'::jsonb,
                    '[{"id":"v-bc-half","name":"Half Bowl","price":390},{"id":"v-bc-full","name":"Full Bowl","price":650}]'::jsonb,
                    '["addon-01","addon-04"]'::jsonb
                ),
                (
                    'item-005', $1, 'Fresh Green Apple Mojito', 'Crushed fresh mint, lime slices, sparkling soda and crisp green apple syrup', 180.00, 'DRK-01', 'green-apple-mojito',
                    $5, 'BAR', 5, 5, TRUE, FALSE,
                    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400',
                    '[]'::jsonb, '["Refreshing","Mocktail","Cold"]'::jsonb,
                    '[]'::jsonb, '[]'::jsonb
                );
            `, [mainOutletId, catBiryani, catGrill, catCurry, catDrinks]);

            console.log('✅ [PostgreSQL 17] Restaurant & POS schema and rich initial demo data initialized successfully!');
        }

        await client.query('COMMIT');
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to ensure Restaurant and POS schema:', err?.message);
        throw err;
    } finally {
        client.release();
    }
}
