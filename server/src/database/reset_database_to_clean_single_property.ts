import pg from 'pg';

const { Client } = pg;

export async function resetDatabaseToCleanSingleProperty(connectionUrl?: string) {
    const connectionString = connectionUrl || process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required.');
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('🔄 Connected to PostgreSQL to reset database to clean single-property state...');

        const tablesToPurge = [
            // Operational & Children
            'reservation_addons',
            'reservation_rooms',
            'room_stay_splits',
            'folio_charges',
            'payments',
            'folios',
            'reservations',
            'guest_edit_history',
            'guests',
            'room_maintenance_blocks',
            'housekeeping_tasks',
            'maintenance_orders',
            'lost_and_found_items',
            'connecting_rooms',
            'room_amenities',
            'rate_calendar_overrides',
            'rooms',
            'room_types',
            'floors',
            'buildings',
            'addon_services',
            'hotel_packages',
            'meal_plans',
            'rate_plans',
            'payroll_items',
            'payroll_runs',
            'leave_requests',
            'attendance_records',
            'employee_shift_rosters',
            'employees',
            'shifts',
            'designations',
            'departments'
        ];

        console.log('🧹 Purging all mock operational, inventory, guest and staff records...');
        for (const tbl of tablesToPurge) {
            try {
                await client.query(`DELETE FROM ${tbl};`);
            } catch (err: any) {
                console.warn(`Table ${tbl} delete note:`, err?.message);
            }
        }

        // 2. Retain ONLY Property 1 and Organization 1
        console.log('🏢 Retaining only Organization 1 and Property 1...');
        try {
            await client.query(`DELETE FROM properties WHERE id != 1;`);
            await client.query(`DELETE FROM organizations WHERE id != 1;`);
        } catch (e: any) {
            console.warn('Property/org delete note:', e?.message);
        }

        // Ensure Organization 1 exists
        await client.query(`
            INSERT INTO organizations (id, code, name, tax_number, base_currency, headquarters_address)
            VALUES (1, 'GHG', 'Grand Hospitality Group', 'BIN-908123481', 'BDT', 'Level 14, Gulshan Centre Point, Dhaka-1212')
            ON CONFLICT (id) DO UPDATE SET 
                name = EXCLUDED.name,
                code = EXCLUDED.code;
        `);

        // Ensure Property 1 exists with clean defaults
        await client.query(`
            INSERT INTO properties (
                id, organization_id, code, name, property_type, star_rating, 
                address, city, country, phone, email, currency, time_zone, check_in_time, check_out_time, is_active
            )
            VALUES (
                1, 1, 'GPD', 'Grand Palace Hotel & Resort', 'HOTEL', 5,
                'Plot 12, Road 45, Gulshan-2, Dhaka', 'Dhaka', 'Bangladesh', '+880 2 9882200', 'dhaka@grandhospitality.com', 'BDT', 'Asia/Dhaka', '14:00', '12:00', true
            )
            ON CONFLICT (id) DO UPDATE SET 
                name = 'Grand Palace Hotel & Resort',
                code = 'GPD',
                organization_id = 1;
        `);

        // 3. Reset daily sequences
        try {
            await client.query(`DELETE FROM daily_sequences;`);
        } catch {}

        // 4. Verify clean counts
        const roomCheck = await client.query('SELECT COUNT(*) as c FROM rooms;');
        const resCheck = await client.query('SELECT COUNT(*) as c FROM reservations;');
        const guestCheck = await client.query('SELECT COUNT(*) as c FROM guests;');
        const propCheck = await client.query('SELECT COUNT(*) as c, id, name FROM properties GROUP BY id, name;');
        const orgCheck = await client.query('SELECT COUNT(*) as c, id, name FROM organizations GROUP BY id, name;');

        console.log('====================================================');
        console.log('✅ DATABASE RESET COMPLETE:');
        console.log(`- Rooms: ${roomCheck.rows[0].c}`);
        console.log(`- Reservations: ${resCheck.rows[0].c}`);
        console.log(`- Guests: ${guestCheck.rows[0].c}`);
        console.log(`- Properties: ${propCheck.rows.map(p => `#${p.id}: ${p.name}`).join(', ')}`);
        console.log(`- Organizations: ${orgCheck.rows.map(o => `#${o.id}: ${o.name}`).join(', ')}`);
        console.log('====================================================');

        return true;
    } catch (err: any) {
        console.error('❌ Error resetting database:', err);
        throw err;
    } finally {
        await client.end();
    }
}

// Auto-run if executed directly via CLI
if (process.argv[1]?.includes('reset_database_to_clean_single_property')) {
    resetDatabaseToCleanSingleProperty()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
