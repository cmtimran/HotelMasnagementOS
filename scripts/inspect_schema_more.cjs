const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const connectionString = process.env.DATABASE_URL || 'postgresql://2ee5ogtas24zphhs.root:mX6wS33xX1K6wG1m@gateway01.us-east-1.prod.aws.pg.tidbcloud.com:4000/hotel_pms_db?sslmode=require';
const pool = new Pool({ connectionString });

async function inspectMore() {
    try {
        const roomsCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rooms' ORDER BY ordinal_position");
        console.log("=== ROOMS COLUMNS ===");
        console.log(roomsCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

        const lostCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lost_and_found_items' ORDER BY ordinal_position");
        console.log("\n=== LOST_AND_FOUND_ITEMS COLUMNS ===");
        console.log(lostCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

        const depCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'guest_security_deposits' ORDER BY ordinal_position");
        console.log("\n=== GUEST_SECURITY_DEPOSITS COLUMNS ===");
        console.log(depCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

        const keyCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'keycard_logs' ORDER BY ordinal_position");
        console.log("\n=== KEYCARD_LOGS COLUMNS ===");
        console.log(keyCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    } catch (err) {
        console.error("Error inspecting DB:", err);
    } finally {
        await pool.end();
    }
}

inspectMore();
