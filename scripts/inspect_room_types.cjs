const { pgPool } = require('../server/dist/database/postgres.js');

async function inspect() {
    const client = await pgPool.connect();
    try {
        const res = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'room_types'
            ORDER BY ordinal_position;
        `);
        console.log('--- COLUMNS IN room_types ---');
        console.table(res.rows);
    } finally {
        client.release();
        await pgPool.end();
    }
}

inspect().catch(console.error);
