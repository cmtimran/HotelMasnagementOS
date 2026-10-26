import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function resetDatabase() {
  console.log('Connecting to PostgreSQL Cloud Cluster...');
  const client = await pool.connect();
  try {
    const tables = [
      'folio_charges',
      'payments',
      'folios',
      'reservation_rooms',
      'reservations',
      'daily_sequences'
    ];

    for (const table of tables) {
      await client.query(`DELETE FROM ${table};`);
      console.log(`Cleared table: ${table}`);
    }

    await client.query(`
      UPDATE rooms 
      SET status = 'ACTIVE', 
          housekeeping_status = 'CLEAN', 
          remarks = NULL
    `);
    console.log('Reset all rooms to ACTIVE / CLEAN.');

    await client.query(`
      UPDATE rooms 
      SET room_type_id = 5 
      WHERE room_number IN ('105', '106', '205', '302', '405')
    `);
    console.log('Verified room_type_id = 5 for Standard Single rooms.');

    const resCount = await client.query('SELECT count(*)::int as count FROM reservations');
    const roomCount = await client.query('SELECT count(*)::int as count FROM rooms');
    console.log(`Verification: reservations count = ${resCount.rows[0].count}, rooms count = ${roomCount.rows[0].count}`);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase();
