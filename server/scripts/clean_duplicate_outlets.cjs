const pg = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hotel_db';
const pool = new pg.Pool({ connectionString });

async function inspectAndDeduplicate() {
    console.log('Connecting to PostgreSQL...');
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT o.id, o.name, o.code, o.department_category, o.outlet_type,
                (SELECT COUNT(*) FROM pos_orders po WHERE po.outlet_id = o.id) as orders_count,
                (SELECT COUNT(*) FROM restaurant_tables pt WHERE pt.outlet_id = o.id) as tables_count,
                (SELECT COUNT(*) FROM pos_menu_items mi WHERE mi.outlet_id = o.id) as items_count
            FROM restaurant_outlets o
            ORDER BY o.name, o.id;
        `);
        console.log('Current Outlets in DB:');
        console.table(res.rows);

        // Identify duplicate test clones
        // For "Lobby Espresso & Pastry Bar", keep only the first or create 1 clean one
        // For "Poolside Sunset Bistro", keep 1 clean one
        const duplicateIdsToDelete = [];
        const seenNames = new Map();

        for (const row of res.rows) {
            const normalizedName = row.name.trim().toLowerCase();
            if (row.code.startsWith('TEST-') || row.code.startsWith('CLONE-')) {
                // If we already have one of this name, mark subsequent ones for deletion
                if (seenNames.has(normalizedName)) {
                    duplicateIdsToDelete.push(row.id);
                } else {
                    seenNames.set(normalizedName, row.id);
                }
            } else {
                seenNames.set(normalizedName, row.id);
            }
        }

        console.log('\nDuplicates to delete:', duplicateIdsToDelete);

        if (duplicateIdsToDelete.length > 0) {
            await client.query('BEGIN');
            for (const id of duplicateIdsToDelete) {
                // Delete associated orders, items, stations, floors, and tables if any
                await client.query(`DELETE FROM pos_order_items WHERE order_id IN (SELECT id FROM pos_orders WHERE outlet_id = $1);`, [id]);
                await client.query(`DELETE FROM pos_kots WHERE outlet_id = $1;`, [id]);
                await client.query(`DELETE FROM pos_orders WHERE outlet_id = $1;`, [id]);
                await client.query(`DELETE FROM pos_menu_items WHERE outlet_id = $1;`, [id]);
                await client.query(`DELETE FROM pos_addons WHERE outlet_id = $1;`, [id]);
                await client.query(`DELETE FROM pos_categories WHERE outlet_id = $1;`, [id]);
                await client.query(`DELETE FROM pos_kitchen_stations WHERE outlet_id = $1;`, [id]);
                await client.query(`DELETE FROM restaurant_tables WHERE outlet_id = $1;`, [id]);
                await client.query(`DELETE FROM restaurant_floors WHERE outlet_id = $1;`, [id]);
                await client.query(`DELETE FROM restaurant_outlets WHERE id = $1;`, [id]);
            }
            await client.query('COMMIT');
            console.log(`\nSuccessfully deleted ${duplicateIdsToDelete.length} duplicate outlets!`);
        }

        // Show remaining outlets
        const remaining = await client.query(`SELECT id, name, code, department_category, outlet_type FROM restaurant_outlets ORDER BY name;`);
        console.log('\nRemaining Unique Outlets in DB:');
        console.table(remaining.rows);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error during deduplication:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

inspectAndDeduplicate();
