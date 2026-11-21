const pg = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hotel_db';
const pool = new pg.Pool({ connectionString });

async function polishOutlets() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Clean up codes for existing outlets
        await client.query(`
            UPDATE restaurant_outlets 
            SET code = 'OUTLET-LOBBY-CAFE', name = 'Lobby Espresso & Pastry Bar'
            WHERE id = 'outlet-1795133712074';
        `);

        await client.query(`
            UPDATE restaurant_outlets 
            SET code = 'OUTLET-POOL-BISTRO', name = 'Poolside Sunset Bistro & Cabana'
            WHERE id = 'outlet-1795133713425';
        `);

        await client.query(`
            UPDATE restaurant_outlets 
            SET code = 'OUTLET-LOTUS-SPA', name = 'Lotus Luxury Spa & Wellness Suite', department_category = 'SPA_WELLNESS'
            WHERE id = 'outlet-1795182824812';
        `);

        // 2. Ensure Grand Ballroom exists
        const ballroomRes = await client.query(`SELECT id FROM restaurant_outlets WHERE code = 'OUTLET-BALLROOM';`);
        if (ballroomRes.rows.length === 0) {
            await client.query(`
                INSERT INTO restaurant_outlets (
                    id, property_id, name, code, description, outlet_type,
                    department_category, catalog_type, allows_barcode_scan, requires_appointment, physical_location,
                    venue_dimensions, seating_capacities, rental_tariffs,
                    operating_hours, requires_table, allow_room_charge, auto_generate_kot,
                    tax_mode, vat_rate, service_charge_rate, city_tax_rate, revenue_head_code,
                    receipt_header, receipt_footer, status
                ) VALUES (
                    'outlet-ballroom', 'prop-001', 'Imperial Grand Ballroom & Convention Hall', 'OUTLET-BALLROOM',
                    'Column-free grand ballroom for gala dinners, weddings and international summits', 'GRAND_BALLROOM',
                    'BANQUET_EVENTS', 'BANQUET_PACKAGES', FALSE, FALSE, 'Convention Wing Level 2',
                    '{"lengthFeet": 120, "widthFeet": 100, "heightFeet": 20, "totalSqFt": 12000, "carpetAreaSqFt": 10500}'::jsonb,
                    '{"theatre": 850, "classroom": 380, "banquet": 550, "ushape": 140, "cocktail": 1100, "boardroom": 70}'::jsonb,
                    '{"hourlyRate": 15000, "halfDayRate": 60000, "fullDayRate": 110000, "eveningRate": 140000, "cleaningFee": 10000}'::jsonb,
                    '{"open": "08:00", "close": "02:00", "is24Hours": false, "days": ["MON","TUE","WED","THU","FRI","SAT","SUN"]}'::jsonb,
                    TRUE, TRUE, TRUE,
                    'STATUTORY_NBR', 15.00, 10.00, 1.00, '10050-01',
                    'Imperial Grand Ballroom & Convention Hall', 'Thank you for choosing us for your special event!', 'ACTIVE'
                );
            `);
            console.log('✅ Created Imperial Grand Ballroom outlet.');
        }

        // 3. Ensure Gift Shop exists
        const shopRes = await client.query(`SELECT id FROM restaurant_outlets WHERE code = 'OUTLET-GIFT-SHOP';`);
        if (shopRes.rows.length === 0) {
            await client.query(`
                INSERT INTO restaurant_outlets (
                    id, property_id, name, code, description, outlet_type,
                    department_category, catalog_type, allows_barcode_scan, requires_appointment, physical_location,
                    venue_dimensions, seating_capacities, rental_tariffs,
                    operating_hours, requires_table, allow_room_charge, auto_generate_kot,
                    tax_mode, vat_rate, service_charge_rate, city_tax_rate, revenue_head_code,
                    receipt_header, receipt_footer, status
                ) VALUES (
                    'outlet-gift-shop', 'prop-001', 'The Royal Gift Shop & Essentials', 'OUTLET-GIFT-SHOP',
                    'Curated local handicrafts, luxury chocolates, sundries, and travel merchandise', 'GIFT_SHOP',
                    'RETAIL_SHOP', 'RETAIL_PRODUCTS', TRUE, FALSE, 'Lobby Level East Wing',
                    '{"lengthFeet": 30, "widthFeet": 25, "heightFeet": 12, "totalSqFt": 750, "carpetAreaSqFt": 650}'::jsonb,
                    '{}'::jsonb,
                    '{}'::jsonb,
                    '{"open": "07:00", "close": "23:00", "is24Hours": false, "days": ["MON","TUE","WED","THU","FRI","SAT","SUN"]}'::jsonb,
                    FALSE, TRUE, FALSE,
                    'STATUTORY_NBR', 15.00, 0.00, 0.00, '10040-01',
                    'The Royal Gift Shop & Essentials', 'Thank you for shopping with us!', 'ACTIVE'
                );
            `);
            console.log('✅ Created The Royal Gift Shop outlet.');
        }

        await client.query('COMMIT');

        const finalOutlets = await client.query(`
            SELECT id, name, code, department_category, outlet_type, status 
            FROM restaurant_outlets 
            ORDER BY department_category, name;
        `);
        console.log('\nFinal Clean Outlets Set:');
        console.table(finalOutlets.rows);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error polishing outlets:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

polishOutlets();
