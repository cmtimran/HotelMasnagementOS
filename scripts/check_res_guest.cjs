const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const connectionString = process.env.DATABASE_URL || 'postgresql://2ee5ogtas24zphhs.root:mX6wS33xX1K6wG1m@gateway01.us-east-1.prod.aws.pg.tidbcloud.com:4000/hotel_pms_db?sslmode=require';
const pool = new Pool({ connectionString });

async function checkGuest() {
    try {
        const res = await pool.query("SELECT id, reservation_number, booker_guest_id FROM reservations WHERE reservation_number LIKE 'RES-TEST-%'");
        console.log("Reservations:", res.rows);
        if (res.rows.length > 0) {
            const g = await pool.query("SELECT id, email, total_stays, lifetime_spend, last_stay_date FROM guests WHERE id = $1", [res.rows[0].booker_guest_id]);
            console.log("Guest of reservation:", g.rows);
        }
    } finally {
        await pool.end();
    }
}
checkGuest();
