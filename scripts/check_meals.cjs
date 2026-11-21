const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const connectionString = process.env.DATABASE_URL || 'postgresql://2ee5ogtas24zphhs.root:mX6wS33xX1K6wG1m@gateway01.us-east-1.prod.aws.pg.tidbcloud.com:4000/hotel_pms_db?sslmode=require';
const pool = new Pool({ connectionString });

async function checkMeals() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reservation_meal_entitlements' ORDER BY ordinal_position");
        console.log("MEALS:", res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    } finally {
        await pool.end();
    }
}
checkMeals();
