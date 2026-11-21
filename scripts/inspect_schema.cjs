const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const connectionString = process.env.DATABASE_URL || 'postgresql://2ee5ogtas24zphhs.root:mX6wS33xX1K6wG1m@gateway01.us-east-1.prod.aws.pg.tidbcloud.com:4000/hotel_pms_db?sslmode=require';
const pool = new Pool({ connectionString });

async function inspect() {
    try {
        const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
        console.log("=== TABLES ===");
        console.log(tablesRes.rows.map(r => r.table_name).join(', '));

        const resCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reservations' ORDER BY ordinal_position");
        console.log("\n=== RESERVATIONS COLUMNS ===");
        console.log(resCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

        const folioCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'folios' ORDER BY ordinal_position");
        console.log("\n=== FOLIOS COLUMNS ===");
        console.log(folioCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

        const guestCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'guests' ORDER BY ordinal_position");
        console.log("\n=== GUESTS COLUMNS ===");
        console.log(guestCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));

        const hkCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'housekeeping_tasks' ORDER BY ordinal_position");
        console.log("\n=== HOUSEKEEPING_TASKS COLUMNS ===");
        console.log(hkCols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    } catch (err) {
        console.error("Error inspecting DB:", err);
    } finally {
        await pool.end();
    }
}

inspect();
