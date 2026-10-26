const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function syncSequences() {
    try {
        const tables = [
            'organizations', 'properties', 'buildings', 'floors', 'room_types', 'rooms',
            'departments', 'designations', 'employees'
        ];

        for (const t of tables) {
            try {
                const maxRes = await pool.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM ${t}`);
                const maxId = Number(maxRes.rows[0].max_id);
                console.log(`Table ${t}: current MAX(id) = ${maxId}`);
                
                // Check sequence name
                const seqRes = await pool.query(`SELECT pg_get_serial_sequence($1, 'id') as seq_name`, [t]);
                const seqName = seqRes.rows[0]?.seq_name;
                console.log(`  -> seq_name: ${seqName}`);
                
                if (seqName) {
                    await pool.query(`SELECT setval($1, $2, true)`, [seqName, maxId + 10]);
                    console.log(`  -> Reset ${seqName} to ${maxId + 10}`);
                }
            } catch (err) {
                console.warn(`  Notice for ${t}: ${err.message}`);
            }
        }
        console.log('✅ Sequence synchronization complete!');
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Sequence sync failed:', err);
        await pool.end();
        process.exit(1);
    }
}

syncSequences();
