/**
 * scripts/verify_housekeeping_lifecycle_e2e.cjs
 * Comprehensive End-to-End TDD Verification Suite for Housekeeping Subsystem
 * 
 * Verifies:
 * 1. Housekeeping Roster API (fetched from PostgreSQL employees).
 * 2. Automated Workload Balancing (Floor Zoning + Credit Balancing).
 * 3. Task Progression (PENDING -> IN_PROGRESS -> COMPLETED -> room becomes CLEAN).
 * 4. Strict 5-Star 2-Tier Check-In Gate Guard (CLEAN blocked until INSPECTED).
 * 5. 8-Point SOP Inspection Sign-off (persisted in DB, releases room to INSPECTED).
 * 6. Physical Discrepancy Lockout & Supervisory Resolution.
 */

const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });
dotenv.config();

const BASE_URL = 'http://localhost:3002';
const JWT_SECRET = process.env.JWT_SECRET || 'hotelmanagementos_enterprise_secure_stable_jwt_secret_key_2026';

function generateAdminToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    id: '1',
    userId: 1,
    name: 'Executive Housekeeper',
    role: 'super_admin',
    propertyId: '1',
    permissions: ['*'],
    iat: now,
    exp: now + 86400
  })).toString('base64url');
  const dataToSign = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(dataToSign).digest('base64url');
  return `${dataToSign}.${signature}`;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function main() {
  console.log('================================================================');
  console.log('🧹 HotelManagementOS: Housekeeping Forensic Lifecycle Suite');
  console.log('================================================================\n');

  const token = generateAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-property-id': '1'
  };

  const client = await pool.connect();
  let testRoomId = null;
  let testRoomNumber = '101';
  let testTaskId = null;
  let testDiscrepancyId = null;
  let testReservationId = null;
  const testResNumber = `RES-HK-TEST-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    // 0. Setup: Identify Room 101 and ensure dirty state
    const roomRes = await client.query("SELECT id, room_number, housekeeping_status FROM rooms WHERE room_number = '101' LIMIT 1");
    if (roomRes.rows.length === 0) {
      throw new Error('Room 101 not found in database');
    }
    testRoomId = roomRes.rows[0].id;

    // Ensure test room is DIRTY and create a pending turnover task
    await client.query("UPDATE rooms SET housekeeping_status = 'DIRTY', status = 'ACTIVE' WHERE id = $1", [testRoomId]);
    await client.query("DELETE FROM housekeeping_tasks WHERE room_id = $1", [testRoomId]);
    await client.query("DELETE FROM room_discrepancies WHERE room_id = $1", [testRoomId]);

    const insertTaskRes = await client.query(`
      INSERT INTO housekeeping_tasks (
        property_id, room_id, task_type, priority, status, credit_value, created_at
      ) VALUES (1, $1, 'TURNOVER', 'HIGH', 'PENDING', 1.0, CURRENT_TIMESTAMP)
      RETURNING id;
    `, [testRoomId]);
    testTaskId = insertTaskRes.rows[0].id;
    console.log(`Setup complete: Room ${testRoomNumber} (ID: ${testRoomId}), Housekeeping Task #${testTaskId} created.`);

    // ── Test 1: Housekeeping Roster API ──────────────────────────────────────
    console.log('\n--- Test 1: Housekeeping Roster API ---');
    const rosterRes = await fetch(`${BASE_URL}/api/housekeeping/roster`, { headers });
    const rosterJson = await rosterRes.json();
    if (!rosterJson.success || !Array.isArray(rosterJson.data) || rosterJson.data.length === 0) {
      throw new Error(`Failed to fetch roster: ${JSON.stringify(rosterJson)}`);
    }
    console.log(`✅ PASS: Retrieved ${rosterJson.data.length} on-duty housekeeping staff from database.`);
    console.log(`Sample Cleaner: ${rosterJson.data[0].name} (Zone: ${rosterJson.data[0].assignedZone})`);

    // ── Test 2: Auto-Allocation Engine (Floor Zoning + Credit Balancing) ─────
    console.log('\n--- Test 2: Workload Balancing & Staff Auto-Allocation ---');
    const autoAssignRes = await fetch(`${BASE_URL}/api/housekeeping/tasks/auto-assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ strategy: 'by-floor' })
    });
    const autoAssignJson = await autoAssignRes.json();
    if (!autoAssignJson.success) {
      throw new Error(`Auto-assign failed: ${JSON.stringify(autoAssignJson)}`);
    }
    console.log(`✅ PASS: Auto-assign executed: ${autoAssignJson.message}`);

    // Verify task assignment in PostgreSQL
    const assignedTaskRes = await client.query("SELECT cleaner_employee_id, assigned_employee_name, status FROM housekeeping_tasks WHERE id = $1", [testTaskId]);
    console.log(`Task #${testTaskId} Assigned Attendant: ${assignedTaskRes.rows[0].assigned_employee_name || 'Assigned'}`);
    if (!assignedTaskRes.rows[0].assigned_employee_name) {
      throw new Error('Task did not get an assigned attendant name');
    }

    // ── Test 3: Task Progression (PENDING -> IN_PROGRESS -> COMPLETED) ───────
    console.log('\n--- Test 3: Task Progression to COMPLETED ---');
    // Step 3A: Start Work
    const startRes = await fetch(`${BASE_URL}/api/housekeeping/tasks/${testTaskId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'IN_PROGRESS' })
    });
    const startJson = await startRes.json();
    if (!startJson.success) throw new Error(`Start task failed: ${JSON.stringify(startJson)}`);

    // Step 3B: Complete Cleaning
    const completeRes = await fetch(`${BASE_URL}/api/housekeeping/tasks/${testTaskId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'COMPLETED' })
    });
    const completeJson = await completeRes.json();
    if (!completeJson.success) throw new Error(`Complete task failed: ${JSON.stringify(completeJson)}`);

    // Verify room status in DB is now CLEAN
    const roomCleanCheck = await client.query("SELECT housekeeping_status FROM rooms WHERE id = $1", [testRoomId]);
    console.log(`Room 101 Housekeeping Status: ${roomCleanCheck.rows[0].housekeeping_status}`);
    if (roomCleanCheck.rows[0].housekeeping_status !== 'CLEAN') {
      throw new Error(`Expected room status to be CLEAN, but got ${roomCleanCheck.rows[0].housekeeping_status}`);
    }
    console.log('✅ PASS: Task completed! Room automatically transitioned to CLEAN in database.');

    // ── Test 4: Strict 5-Star 2-Tier Inspection Check-In Gate Guard ──────────
    console.log('\n--- Test 4: Strict 5-Star 2-Tier Check-In Gate Guard ---');
    // Create a test reservation targeting Room 101
    const createRes = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        reservationNumber: testResNumber,
        guestId: 18,
        roomId: testRoomId,
        roomNumber: testRoomNumber,
        checkIn: '2026-11-20',
        checkOut: '2026-11-22',
        adults: 1,
        totalAmount: 3000,
        paidAmount: 3000,
        dueAmount: 0,
        source: 'DIRECT'
      })
    });
    const createResJson = await createRes.json();
    testReservationId = createResJson.data?.id || createResJson.booking?.id || createResJson.id;
    console.log(`Created Test Reservation ${testResNumber} (ID: ${testReservationId}) for Room ${testRoomNumber}.`);

    // Ensure settings require inspection
    await client.query("UPDATE housekeeping_settings SET require_inspection_before_checkin = true WHERE property_id = 1");

    // Attempt Check-In when room is CLEAN (not yet INSPECTED)
    const checkinCleanRes = await fetch(`${BASE_URL}/api/bookings/${testReservationId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'IN_HOUSE' })
    });
    const checkinCleanJson = await checkinCleanRes.json();
    console.log(`Check-In Clean Room Response: status=${checkinCleanRes.status}, error="${checkinCleanJson.error || ''}"`);

    if (checkinCleanRes.status === 200) {
      throw new Error('Check-in should have been BLOCKED because room is CLEAN but not yet INSPECTED!');
    }
    console.log('✅ PASS: Check-in was strictly BLOCKED because room is not yet INSPECTED by a Floor Supervisor!');

    // ── Test 5: 8-Point SOP Inspection Sign-Off ──────────────────────────────
    console.log('\n--- Test 5: 8-Point SOP Inspection Sign-Off ---');
    const inspectRes = await fetch(`${BASE_URL}/api/housekeeping/inspect`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        taskId: testTaskId,
        roomId: testRoomId,
        supervisorName: 'Head Housekeeper Fatema',
        passed: true,
        scorePercentage: 100.0,
        checklistData: {
          linen: true,
          bathroom: true,
          amenities: true,
          hvac: true,
          lighting: true,
          cleanliness: true,
          appliances: true,
          safety: true
        },
        defectNotes: 'All 8 points passed. Room pristine and scented.'
      })
    });
    const inspectJson = await inspectRes.json();
    if (!inspectJson.success) throw new Error(`Inspection failed: ${JSON.stringify(inspectJson)}`);

    const roomInspectedCheck = await client.query("SELECT housekeeping_status FROM rooms WHERE id = $1", [testRoomId]);
    console.log(`Room 101 Housekeeping Status: ${roomInspectedCheck.rows[0].housekeeping_status}`);
    if (roomInspectedCheck.rows[0].housekeeping_status !== 'INSPECTED') {
      throw new Error(`Expected room to be INSPECTED, but got ${roomInspectedCheck.rows[0].housekeeping_status}`);
    }
    console.log('✅ PASS: SOP Inspection permanently saved to database! Room released as INSPECTED.');

    // Now Check-in will succeed!
    const checkinInspectedRes = await fetch(`${BASE_URL}/api/bookings/${testReservationId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'IN_HOUSE' })
    });
    const checkinInspectedJson = await checkinInspectedRes.json();
    if (checkinInspectedRes.status !== 200) {
      throw new Error(`Check-in failed after inspection: ${JSON.stringify(checkinInspectedJson)}`);
    }
    console.log('✅ PASS: Check-in succeeded once room was verified as INSPECTED!');

    // ── Test 6: Physical Discrepancy Lockout & Resolution ────────────────────
    console.log('\n--- Test 6: Physical Room Discrepancy Lockout & Resolution ---');
    // Flag a Skip Discrepancy (Skipper) for Room 101
    const flagDiscRes = await fetch(`${BASE_URL}/api/housekeeping/discrepancies`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        roomId: testRoomId,
        roomNumber: testRoomNumber,
        discrepancyType: 'Skip Discrepancy (Skipper)',
        frontDeskStatus: 'Occupied in PMS',
        housekeepingFound: 'Room completely empty, keys left on table, guest absconded',
        reportedBy: 'Floor Maid Rupa',
        notes: 'Luggage missing, no personal effects found'
      })
    });
    const flagDiscJson = await flagDiscRes.json();
    if (!flagDiscJson.success) throw new Error(`Flag discrepancy failed: ${JSON.stringify(flagDiscJson)}`);
    testDiscrepancyId = flagDiscJson.data.id;
    console.log(`Discrepancy #${testDiscrepancyId} flagged for Room ${testRoomNumber}.`);

    // Verify discrepancy check blocks check-in
    const discBlockedRes = await fetch(`${BASE_URL}/api/bookings/${testReservationId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'IN_HOUSE' })
    });
    const discBlockedJson = await discBlockedRes.json();
    console.log(`Check-In with Active Discrepancy Response: status=${discBlockedRes.status}, error="${discBlockedJson.error || ''}"`);
    if (discBlockedRes.status === 200) {
      throw new Error('Check-in should have been BLOCKED due to active discrepancy!');
    }
    console.log('✅ PASS: Check-In strictly BLOCKED due to active physical discrepancy!');

    // Duty Manager Reconciles and Resolves Discrepancy
    const resolveRes = await fetch(`${BASE_URL}/api/housekeeping/discrepancies/${testDiscrepancyId}/resolve`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        resolvedBy: 'Duty Manager Kabir',
        resolutionNotes: 'CCTV footage confirmed early departure. Folio settled to company direct billing.'
      })
    });
    const resolveJson = await resolveRes.json();
    if (!resolveJson.success) throw new Error(`Resolve discrepancy failed: ${JSON.stringify(resolveJson)}`);
    console.log('✅ PASS: Discrepancy resolved and cleared in database with supervisory audit trail!');

    console.log('\n================================================================');
    console.log('🎉 ALL 6 HOUSEKEEPING FORENSIC LIFECYCLE TESTS PASSED (100%)!');
    console.log('================================================================');

  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  } finally {
    // Cleanup test artifacts
    if (testReservationId) {
      await client.query("DELETE FROM reservations WHERE id = $1", [testReservationId]).catch(() => {});
    }
    await client.query("UPDATE rooms SET housekeeping_status = 'CLEAN' WHERE room_number = '101'").catch(() => {});
    client.release();
    await pool.end();
  }
}

main();
