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

            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS phone_ext VARCHAR(32);',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS lock_id VARCHAR(64);',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_connecting BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS connected_to VARCHAR(64);',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS smoking_status VARCHAR(64) DEFAULT \'Non-Smoking\';',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS near_elevator BOOLEAN DEFAULT FALSE;',
            'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS remarks TEXT;',

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

async function seedRatesAndModulesIfEmpty(client: any): Promise<void> {
    // A. Seed Connecting Rooms
    try {
        const check = await client.query('SELECT COUNT(*) as count FROM connecting_rooms WHERE property_id = 1;');
        if (parseInt(check.rows[0]?.count || '0', 10) === 0) {
            const compJson = JSON.stringify([
                { roomTypeId: '1', count: 1, roomNumbers: ['101'] },
                { roomTypeId: '1', count: 1, roomNumbers: ['102'] }
            ]);
            await client.query(`
                INSERT INTO connecting_rooms (property_id, name, inventory_logic, pricing_strategy, fixed_price, status, component_rooms_json)
                VALUES (1, 'Interconnecting Suite (101-102)', 'Auto-Sync', 'Sum of Rates', 6000.00, 'Active', $1);
            `, [compJson]);
        }
    } catch (e: any) {
        console.warn('Connecting rooms seed warning:', e.message);
    }

    // B. Seed Rate Plans
    try {
        const check = await client.query('SELECT COUNT(*) as count FROM rate_plans WHERE property_id = 1;');
        if (parseInt(check.rows[0]?.count || '0', 10) === 0) {
            const defaultRatePlans = [
                {
                    name: 'Best Available Rate (BAR)',
                    shortCode: 'BAR-01',
                    marketSegment: 'FIT / Direct',
                    currency: 'BDT',
                    description: 'Standard flexible rate for all direct bookings. No advance payment required.',
                    status: 'Active',
                    mealPlan: 'EP',
                    taxIncluded: false,
                    policies: {
                        depositRequired: false,
                        depositAmount: 0,
                        depositType: 'Percentage',
                        cancellationType: 'Flexible',
                        cancellationDeadline: 24,
                        refundPercentage: 100
                    },
                    activationDate: '2024-01-01',
                    expirationDate: '2027-12-31',
                    isSeasonal: false,
                    validDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    minNights: 1,
                    cutOffDays: 0,
                    closedToArrival: false,
                    closedToDeparture: false,
                    stopSell: false,
                    pricing: [
                        { roomTypeId: 'Deluxe Suite', structure: 'Flat', operatingCost: 4500, baseRate: 14500, doubleRate: 14500, tripleRate: 18000, extraAdult: 3500, extraChild: 1500, baseOccupancy: 2, maxOccupancy: 3 }
                    ]
                },
                {
                    name: 'Corporate Negotiated (Standard)',
                    shortCode: 'CORP-A1',
                    marketSegment: 'Corporate',
                    currency: 'BDT',
                    description: 'Negotiated flat rate for Tier-1 Corporate partners. Priority check-in included.',
                    status: 'Active',
                    mealPlan: 'CP',
                    packageId: 3,
                    taxIncluded: true,
                    policies: {
                        depositRequired: true,
                        depositAmount: 0,
                        depositType: 'Fixed',
                        cancellationType: 'Moderate',
                        cancellationDeadline: 48,
                        refundPercentage: 100
                    },
                    activationDate: '2024-01-01',
                    expirationDate: '2027-12-31',
                    isSeasonal: false,
                    validDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                    minNights: 1,
                    cutOffDays: 0,
                    closedToArrival: false,
                    closedToDeparture: false,
                    stopSell: false,
                    pricing: [
                        { roomTypeId: 'Premium King', structure: 'Flat', operatingCost: 3800, baseRate: 11000, doubleRate: 11000, tripleRate: 14000, extraAdult: 2500, extraChild: 1000, baseOccupancy: 2, maxOccupancy: 3 }
                    ]
                },
                {
                    name: 'Honeymoon Bliss Experience',
                    shortCode: 'HON-PKG',
                    marketSegment: 'Promotional',
                    currency: 'BDT',
                    description: 'Premium romantic getaway including flower bed decoration and candlelight dinner.',
                    status: 'Active',
                    mealPlan: 'MAP',
                    packageId: 1,
                    taxIncluded: false,
                    policies: {
                        depositRequired: true,
                        depositAmount: 50,
                        depositType: 'Percentage',
                        cancellationType: 'Strict',
                        cancellationDeadline: 72,
                        refundPercentage: 50
                    },
                    activationDate: '2024-02-01',
                    expirationDate: '2027-06-30',
                    isSeasonal: true,
                    seasonName: 'Summer Season',
                    validDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    minNights: 2,
                    cutOffDays: 48,
                    closedToArrival: false,
                    closedToDeparture: false,
                    stopSell: false,
                    pricing: [
                        { roomTypeId: 'Junior Suite', structure: 'Flat', operatingCost: 5500, baseRate: 18500, doubleRate: 18500, tripleRate: 22000, extraAdult: 4500, extraChild: 2000, baseOccupancy: 2, maxOccupancy: 3 }
                    ]
                },
                {
                    name: 'Long Stay Weekly (7+ Nights)',
                    shortCode: 'LONG-7D',
                    marketSegment: 'FIT / Direct',
                    currency: 'BDT',
                    description: 'Special weekly discounted rate for guests staying 7 nights or longer.',
                    status: 'Active',
                    mealPlan: 'CP',
                    taxIncluded: false,
                    policies: {
                        depositRequired: true,
                        depositAmount: 25,
                        depositType: 'Percentage',
                        cancellationType: 'Flexible',
                        cancellationDeadline: 48,
                        refundPercentage: 100
                    },
                    activationDate: '2024-01-01',
                    expirationDate: '2027-12-31',
                    isSeasonal: false,
                    validDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    minNights: 7,
                    cutOffDays: 0,
                    closedToArrival: false,
                    closedToDeparture: false,
                    stopSell: false,
                    pricing: [
                        { roomTypeId: 'Deluxe Double', structure: 'Flat', operatingCost: 2500, baseRate: 2500, doubleRate: 2500, tripleRate: 3500, extraAdult: 1000, extraChild: 500, baseOccupancy: 2, maxOccupancy: 3 }
                    ]
                }
            ];

            for (const p of defaultRatePlans) {
                await client.query(`
                    INSERT INTO rate_plans (
                        property_id, name, short_code, market_segment, currency, description, status,
                        meal_plan, package_id, tax_included, policies_json, activation_date, expiration_date,
                        is_seasonal, season_name, valid_days_json, min_nights, cut_off_days,
                        closed_to_arrival, closed_to_departure, stop_sell, pricing_json, raw_json
                    ) VALUES (
                        1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
                    ) ON CONFLICT (property_id, short_code) DO NOTHING;
                `, [
                    p.name,
                    p.shortCode,
                    p.marketSegment,
                    p.currency,
                    p.description,
                    p.status,
                    p.mealPlan,
                    p.packageId || null,
                    p.taxIncluded,
                    JSON.stringify(p.policies),
                    p.activationDate,
                    p.expirationDate,
                    p.isSeasonal,
                    p.seasonName || null,
                    JSON.stringify(p.validDays),
                    p.minNights,
                    p.cutOffDays,
                    p.closedToArrival,
                    p.closedToDeparture,
                    p.stopSell,
                    JSON.stringify(p.pricing),
                    JSON.stringify(p)
                ]);
            }
        }
    } catch (e: any) {
        console.warn('Rate plans seed warning:', e.message);
    }

    // C. Seed Meal Plans
    try {
        const check = await client.query('SELECT COUNT(*) as count FROM meal_plans WHERE property_id = 1;');
        if (parseInt(check.rows[0]?.count || '0', 10) === 0) {
            const defaultMealPlans = [
                {
                    name: 'Continental Plan (CP)',
                    marketingName: 'Buffet Breakfast',
                    shortCode: 'CP',
                    description: 'Includes daily buffet breakfast at The Cove Restaurant',
                    status: 'Active',
                    hasBreakfast: true,
                    breakfastMenu: 'Continental Menu A',
                    breakfastStyle: 'Buffet',
                    breakfastVenue: 'Main Restaurant',
                    breakfastCuisine: 'Continental',
                    hasLunch: false,
                    hasDinner: false,
                    hasBrunch: false,
                    hasCupole: false,
                    hasSnacks: false,
                    servingType: 'Buffet',
                    internalCost: 350,
                    sellingPriceAdult: 850,
                    sellingPriceChild: 450,
                    infantMealsFree: true,
                    maxInfantAge: 5,
                    postingFrequency: 'Daily',
                    revenueCode: 'REV-FB-BRKFST',
                    taxInclusive: true,
                    startTime: '06:30',
                    endTime: '10:30',
                    venue: 'Garden Terrace Restaurant'
                },
                {
                    name: 'European Plan (EP)',
                    marketingName: 'Room Only (No Meals)',
                    shortCode: 'EP',
                    description: 'Pure accommodation plan without any inclusive food and beverage.',
                    status: 'Active',
                    hasBreakfast: false,
                    hasLunch: false,
                    hasDinner: false,
                    hasBrunch: false,
                    hasCupole: false,
                    hasSnacks: false,
                    servingType: 'À la carte',
                    internalCost: 0,
                    sellingPriceAdult: 0,
                    sellingPriceChild: 0,
                    infantMealsFree: true,
                    maxInfantAge: 5,
                    postingFrequency: 'Daily',
                    revenueCode: 'REV-RM-ROOM',
                    taxInclusive: true,
                    startTime: '00:00',
                    endTime: '23:59',
                    venue: 'N/A'
                },
                {
                    name: 'Modified American Plan (MAP)',
                    marketingName: 'Half Board (Breakfast + Dinner)',
                    shortCode: 'MAP',
                    description: 'Includes daily gourmet buffet breakfast and dinner at selected hotel restaurants.',
                    status: 'Active',
                    hasBreakfast: true,
                    breakfastMenu: 'Continental Buffet',
                    breakfastStyle: 'Buffet',
                    breakfastVenue: 'Garden Terrace',
                    breakfastCuisine: 'Continental',
                    hasLunch: false,
                    hasDinner: true,
                    dinnerMenu: 'Grand Multi-Cuisine Dinner',
                    dinnerStyle: 'Buffet',
                    dinnerVenue: 'Waves Poolside',
                    dinnerCuisine: 'Multi-cuisine',
                    hasBrunch: false,
                    hasCupole: false,
                    hasSnacks: false,
                    servingType: 'Buffet',
                    internalCost: 800,
                    sellingPriceAdult: 2200,
                    sellingPriceChild: 1200,
                    infantMealsFree: true,
                    maxInfantAge: 5,
                    postingFrequency: 'Daily',
                    revenueCode: 'REV-FB-MAP',
                    taxInclusive: true,
                    startTime: '06:30',
                    endTime: '22:30',
                    venue: 'Garden Terrace & Waves'
                },
                {
                    name: 'American Plan (AP)',
                    marketingName: 'Full Board (All 3 Meals)',
                    shortCode: 'AP',
                    description: 'Includes Breakfast, Lunch, and Dinner (Full Board)',
                    status: 'Active',
                    hasBreakfast: true,
                    breakfastMenu: 'Full American Breakfast',
                    breakfastStyle: 'Buffet',
                    breakfastVenue: 'Executive Lounge',
                    breakfastCuisine: 'Continental',
                    hasLunch: true,
                    lunchMenu: 'Multicuisine Lunch',
                    lunchStyle: 'Buffet',
                    lunchVenue: 'Main Restaurant',
                    lunchCuisine: 'Pan-Asian',
                    hasDinner: true,
                    dinnerMenu: 'Gala Theme Dinner',
                    dinnerStyle: 'Buffet',
                    dinnerVenue: 'Main Restaurant',
                    dinnerCuisine: 'Multi-cuisine',
                    hasBrunch: false,
                    hasCupole: false,
                    hasSnacks: true,
                    snacksMenu: 'Afternoon High Tea',
                    snacksStyle: 'Set Menu',
                    snacksVenue: 'The Atrium Cafe',
                    snacksCuisine: 'Continental',
                    servingType: 'Buffet',
                    internalCost: 1200,
                    sellingPriceAdult: 3500,
                    sellingPriceChild: 1800,
                    infantMealsFree: true,
                    maxInfantAge: 5,
                    postingFrequency: 'Daily',
                    revenueCode: 'REV-FB-AP',
                    taxInclusive: true,
                    startTime: '07:00',
                    endTime: '23:00',
                    venue: 'Multiple Outlets'
                }
            ];

            for (const m of defaultMealPlans) {
                await client.query(`
                    INSERT INTO meal_plans (
                        property_id, name, marketing_name, short_code, description, status,
                        has_breakfast, breakfast_menu, breakfast_style, breakfast_venue, breakfast_cuisine,
                        has_lunch, lunch_menu, lunch_style, lunch_venue, lunch_cuisine,
                        has_dinner, dinner_menu, dinner_style, dinner_venue, dinner_cuisine,
                        has_brunch, has_cupole, has_snacks, serving_type, internal_cost,
                        selling_price_adult, selling_price_child, infant_meals_free, max_infant_age,
                        posting_frequency, revenue_code, tax_inclusive, start_time, end_time, venue, raw_json
                    ) VALUES (
                        1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
                    ) ON CONFLICT (property_id, short_code) DO NOTHING;
                `, [
                    m.name,
                    m.marketingName,
                    m.shortCode,
                    m.description,
                    m.status,
                    m.hasBreakfast,
                    m.breakfastMenu || null,
                    m.breakfastStyle || null,
                    m.breakfastVenue || null,
                    m.breakfastCuisine || null,
                    m.hasLunch,
                    m.lunchMenu || null,
                    m.lunchStyle || null,
                    m.lunchVenue || null,
                    m.lunchCuisine || null,
                    m.hasDinner,
                    m.dinnerMenu || null,
                    m.dinnerStyle || null,
                    m.dinnerVenue || null,
                    m.dinnerCuisine || null,
                    m.hasBrunch,
                    m.hasCupole,
                    m.hasSnacks,
                    m.servingType,
                    m.internalCost,
                    m.sellingPriceAdult,
                    m.sellingPriceChild,
                    m.infantMealsFree,
                    m.maxInfantAge,
                    m.postingFrequency,
                    m.revenueCode,
                    m.taxInclusive,
                    m.startTime,
                    m.endTime,
                    m.venue,
                    JSON.stringify(m)
                ]);
            }
        }
    } catch (e: any) {
        console.warn('Meal plans seed warning:', e.message);
    }

    // D. Seed Hotel Packages
    try {
        const check = await client.query('SELECT COUNT(*) as count FROM hotel_packages WHERE property_id = 1;');
        if (parseInt(check.rows[0]?.count || '0', 10) === 0) {
            const defaultPackages = [
                {
                    name: 'Honeymoon Delight',
                    shortCode: 'HONEY',
                    packageType: 'Honeymoon',
                    status: 'Active',
                    color: '#EC4899',
                    description: 'Romantic retreat featuring candle-lit dinner, airport transfers, sparkling beverage, and rose petal decoration.'
                },
                {
                    name: 'Family Adventure',
                    shortCode: 'FAMADV',
                    packageType: 'Family',
                    status: 'Active',
                    color: '#10B981',
                    description: 'Full family entertainment with kids meals included, pool games, laundry service and family suite benefits.'
                },
                {
                    name: 'Corporate Executive',
                    shortCode: 'BIZEXEC',
                    packageType: 'Standard',
                    status: 'Active',
                    color: '#3B82F6',
                    description: 'Designed for the modern professional. Includes airport transfers, express laundry and business breakfast.'
                }
            ];

            for (const p of defaultPackages) {
                await client.query(`
                    INSERT INTO hotel_packages (property_id, name, short_code, package_type, status, color, description, raw_json)
                    VALUES (1, $1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (property_id, short_code) DO NOTHING;
                `, [
                    p.name,
                    p.shortCode,
                    p.packageType,
                    p.status,
                    p.color,
                    p.description,
                    JSON.stringify(p)
                ]);
            }
        }
    } catch (e: any) {
        console.warn('Hotel packages seed warning:', e.message);
    }
}
