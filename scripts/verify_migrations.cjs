const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://2ee5ogtas24zphhs.postgres:eG15kbUDFmqKTqH6oig7B2dmh9ZruSCm@2ee5ogtas24zphhs.gateway01.us-east-1.prod.aws.pg.tidbcloud.com:5432/postgres?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    try {
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name IN ('connecting_room_components', 'reservation_meal_entitlements', 'holiday_rate_adjustments', 'guest_security_deposits')
            ORDER BY table_name;
        `);
        console.log('✅ Migrated Tables in PostgreSQL:', tables.rows.map(r => r.table_name));

        const cols = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'reservations' 
              AND column_name IN ('is_overbooked', 'overbooking_status')
            ORDER BY column_name;
        `);
        console.log('✅ Reservation Columns in PostgreSQL:', cols.rows.map(r => r.column_name));
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(console.error);
