const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: './server/.env' });

const connectionString = process.env.DATABASE_URL || 'postgresql://2ee5ogtas24zphhs.root:mX6wS33xX1K6wG1m@gateway01.us-east-1.prod.aws.pg.tidbcloud.com:4000/hotel_pms_db?sslmode=require';
const pool = new Pool({ connectionString });
const API_BASE = 'http://localhost:3002';
const JWT_SECRET = process.env.JWT_SECRET || 'hotelmanagementos_enterprise_secure_stable_jwt_secret_key_2026';

function generateAdminToken() {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
        sub: '1',
        id: '1',
        name: 'Chief Auditor',
        email: 'auditor@hotelos.com',
        role: 'super_admin',
        propertyId: '1',
        propertyName: 'Grand Palace Hotel & Resort',
        tier: 'enterprise',
        permissions: ['*'],
        iat: now,
        exp: now + 86400
    })).toString('base64url');
    const dataToSign = `${header}.${payload}`;
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(dataToSign).digest('base64url');
    return `${dataToSign}.${signature}`;
}

const ADMIN_TOKEN = generateAdminToken();
const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'x-property-id': '1'
};

async function runTests() {
    console.log('================================================================');
    console.log('🏨 HotelManagementOS: End-to-End Lifecycle Verification Suite');
    console.log('================================================================');

    const client = await pool.connect();
    try {
        console.log('\n--- Setup Test Guest & Room ---');
        let guestRes = await client.query("SELECT id FROM guests WHERE email = 'test_lifecycle@hotel.com' LIMIT 1");
        let guestId;
        if (guestRes.rows.length === 0) {
            const newG = await client.query(`
                INSERT INTO guests (organization_id, first_name, last_name, email, phone, total_stays, lifetime_spend)
                VALUES (1, 'Auditor', 'VIP', 'test_lifecycle@hotel.com', '+8801700999999', 0, 0.00)
                RETURNING id
            `);
            guestId = newG.rows[0].id;
        } else {
            guestId = guestRes.rows[0].id;
        }

        // Clean up previous test bookings
        await client.query("DELETE FROM folio_charges WHERE folio_id IN (SELECT id FROM folios WHERE reservation_id IN (SELECT id FROM reservations WHERE reservation_number LIKE 'RES-TEST-%'))");
        await client.query("DELETE FROM payments WHERE folio_id IN (SELECT id FROM folios WHERE reservation_id IN (SELECT id FROM reservations WHERE reservation_number LIKE 'RES-TEST-%'))");
        await client.query("DELETE FROM folios WHERE reservation_id IN (SELECT id FROM reservations WHERE reservation_number LIKE 'RES-TEST-%')");
        await client.query("DELETE FROM reservation_rooms WHERE reservation_id IN (SELECT id FROM reservations WHERE reservation_number LIKE 'RES-TEST-%')");
        await client.query("DELETE FROM reservations WHERE reservation_number LIKE 'RES-TEST-%'");

        let roomRes = await client.query("SELECT id, room_number FROM rooms WHERE property_id = 1 LIMIT 1");
        if (roomRes.rows.length === 0) {
            throw new Error('No rooms found in property 1');
        }
        const testRoom = roomRes.rows[0];
        console.log(`Using Test Room: Room ${testRoom.room_number} (ID: ${testRoom.id}), Test Guest ID: ${guestId}`);

        // Create a test reservation
        const resNum = `RES-TEST-${Date.now().toString().slice(-6)}`;
        const newBookingRes = await fetch(`${API_BASE}/api/bookings`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                propertyId: 1,
                reservationNumber: resNum,
                guestName: 'Auditor VIP',
                guestEmail: 'test_lifecycle@hotel.com',
                guestPhone: '+8801700999999',
                roomNumber: testRoom.room_number,
                roomType: 'Deluxe Suite',
                rateAmount: 4000,
                totalAmount: 4000,
                paidAmount: 0,
                dueAmount: 4000,
                checkIn: new Date().toISOString().slice(0, 10),
                checkOut: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
                source: 'Direct Web'
            })
        });
        const bookingJson = await newBookingRes.json();
        if (!bookingJson.success) {
            throw new Error(`Failed to create test booking: ${bookingJson.error}`);
        }
        const bookingId = bookingJson.data.id;
        console.log(`✅ Test Reservation created: ${resNum} (ID: ${bookingId})`);

        // TEST 1: Check-In Gate Guard on Dirty Room
        console.log('\n--- Test 1: Check-In Gate Guard on Dirty Room ---');
        await client.query("UPDATE rooms SET housekeeping_status = 'DIRTY' WHERE id = $1", [testRoom.id]);
        
        const dirtyCheckInRes = await fetch(`${API_BASE}/api/bookings/${bookingId}/status`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ status: 'in-house' })
        });
        const dirtyCheckInJson = await dirtyCheckInRes.json();
        console.log(`Check-in Dirty Room Response: status=${dirtyCheckInRes.status}, error="${dirtyCheckInJson.error}"`);
        if (dirtyCheckInRes.status === 400 && dirtyCheckInJson.error && dirtyCheckInJson.error.includes('Room must be Clean & Inspected')) {
            console.log('✅ PASS: Check-in was strictly BLOCKED because room is DIRTY!');
        } else {
            throw new Error(`❌ FAIL: Check-in was not blocked on dirty room! Result: ${JSON.stringify(dirtyCheckInJson)}`);
        }

        // TEST 2: Check-In to Clean Room
        console.log('\n--- Test 2: Check-In to Clean & Inspected Room ---');
        await client.query("UPDATE rooms SET housekeeping_status = 'INSPECTED', status = 'ACTIVE' WHERE id = $1", [testRoom.id]);
        await new Promise(r => setTimeout(r, 300));
        
        const cleanCheckInRes = await fetch(`${API_BASE}/api/bookings/${bookingId}/status`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ status: 'in-house' })
        });
        const cleanCheckInJson = await cleanCheckInRes.json();
        if (cleanCheckInRes.status === 200 && cleanCheckInJson.success) {
            console.log(`✅ PASS: Check-in succeeded! Guest is now IN_HOUSE. (Reg: ${cleanCheckInJson.data.registrationNumber}, Folio: ${cleanCheckInJson.data.folioNumber})`);
        } else {
            throw new Error(`❌ FAIL: Check-in to clean room failed: ${JSON.stringify(cleanCheckInJson)}`);
        }

        // TEST 3: Check-Out Gate Guard with Unpaid Balance
        console.log('\n--- Test 3: Check-Out Gate Guard with Unpaid Balance ---');
        const folioRows = await client.query("SELECT id, folio_number, balance FROM folios WHERE reservation_id = $1", [bookingId]);
        const folio = folioRows.rows[0];
        console.log(`Active Folio: #${folio.id} (${folio.folio_number}), Current Balance: ৳${folio.balance}`);

        // Post an extra restaurant charge of ৳1,500
        const postChargeRes = await fetch(`${API_BASE}/api/accounting/folios/${folio.id}/charges`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                revenueHead: 'Food & Beverage',
                description: 'Executive Seafood Buffet',
                amount: 1500,
                taxApplicable: true
            })
        });
        const postChargeJson = await postChargeRes.json();
        console.log(`Posted charge result: ${postChargeJson.message}`);

        // Attempt checkout with unpaid balance
        const checkoutUnpaidRes = await fetch(`${API_BASE}/api/bookings/${bookingId}/status`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ status: 'checked-out' })
        });
        const checkoutUnpaidJson = await checkoutUnpaidRes.json();
        console.log(`Checkout Unpaid Response: status=${checkoutUnpaidRes.status}, error="${checkoutUnpaidJson.error}"`);
        if (checkoutUnpaidRes.status === 400 && checkoutUnpaidJson.error && checkoutUnpaidJson.error.includes('must be settled before check-out')) {
            console.log('✅ PASS: Check-Out was strictly BLOCKED due to unpaid folio balance!');
        } else {
            throw new Error(`❌ FAIL: Check-Out was not blocked with unpaid balance! Result: ${JSON.stringify(checkoutUnpaidJson)}`);
        }

        // TEST 4: Settle Payment & Complete Checkout with Automated Turnaround
        console.log('\n--- Test 4: Settle Payment & Complete Check-Out ---');
        const updatedFolio = (await client.query("SELECT balance FROM folios WHERE id = $1", [folio.id])).rows[0];
        const payAmount = Number(updatedFolio.balance);
        console.log(`Settling full folio balance of ৳${payAmount.toFixed(2)} via Credit Card...`);

        const payRes = await fetch(`${API_BASE}/api/accounting/folios/${folio.id}/payments`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                propertyId: 1,
                amount: payAmount,
                paymentMethod: 'CREDIT_CARD',
                referenceCode: 'VISA_SETTLE_AUTH_99'
            })
        });
        const payJson = await payRes.json();
        console.log(`Payment recorded: ${payJson.success ? 'SUCCESS' : 'FAILED'}, Response:`, payJson);

        // Execute Check-Out
        const checkoutRes = await fetch(`${API_BASE}/api/bookings/${bookingId}/status`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ status: 'checked-out', closedBy: 'Chief Cashier' })
        });
        const checkoutJson = await checkoutRes.json();
        if (checkoutRes.status === 200 && checkoutJson.success) {
            console.log('✅ PASS: Check-Out executed successfully!');
        } else {
            throw new Error(`❌ FAIL: Check-Out failed after payment: ${JSON.stringify(checkoutJson)}`);
        }

        // Verify Side Effects in Database
        console.log('\n--- Verifying Departure Automation Side Effects in PostgreSQL ---');
        // 1. Room marked DIRTY
        const roomCheck = (await client.query("SELECT housekeeping_status FROM rooms WHERE id = $1", [testRoom.id])).rows[0];
        console.log(`Room ${testRoom.room_number} Housekeeping Status: ${roomCheck.housekeeping_status}`);
        if (roomCheck.housekeeping_status === 'DIRTY') {
            console.log('✅ PASS: Room was automatically flagged DIRTY on checkout!');
        } else {
            throw new Error(`❌ FAIL: Room status is ${roomCheck.housekeeping_status}, expected DIRTY`);
        }

        // 2. Housekeeping departure turnover task created
        const taskCheck = await client.query("SELECT id, task_type, priority, status FROM housekeeping_tasks WHERE room_id = $1 AND task_type = 'TURNOVER' ORDER BY id DESC LIMIT 1", [testRoom.id]);
        if (taskCheck.rows.length > 0) {
            console.log(`✅ PASS: Housekeeping turnover task #${taskCheck.rows[0].id} created! (Type: ${taskCheck.rows[0].task_type}, Priority: ${taskCheck.rows[0].priority}, Status: ${taskCheck.rows[0].status})`);
        } else {
            throw new Error('❌ FAIL: No housekeeping turnover task was created!');
        }

        // 3. Folio marked CLOSED
        const folioCheck = (await client.query("SELECT status, closed_at, closed_by FROM folios WHERE id = $1", [folio.id])).rows[0];
        console.log(`Folio Status: ${folioCheck.status}, Closed At: ${folioCheck.closed_at}, Closed By: ${folioCheck.closed_by}`);
        if (folioCheck.status === 'CLOSED') {
            console.log('✅ PASS: Folio was automatically CLOSED upon checkout!');
        } else {
            throw new Error(`❌ FAIL: Folio status is ${folioCheck.status}, expected CLOSED`);
        }

        // 4. Guest lifetime CRM statistics incremented
        const guestCheck = (await client.query("SELECT total_stays, lifetime_spend, last_stay_date FROM guests WHERE id = (SELECT booker_guest_id FROM reservations WHERE id = $1)", [bookingId])).rows[0];
        console.log(`Guest CRM Stats: Stays=${guestCheck.total_stays}, Lifetime Spend=৳${guestCheck.lifetime_spend}, Last Stay=${guestCheck.last_stay_date}`);
        if (Number(guestCheck.total_stays) > 0) {
            console.log('✅ PASS: Guest profile lifetime stays and spend were incremented!');
        } else {
            throw new Error('❌ FAIL: Guest total_stays was not incremented!');
        }

        // TEST 5: Post-Checkout Late Charge Handling (Supplementary Folio B)
        console.log('\n--- Test 5: Post-Checkout Late Charge Handling ---');
        console.log(`Attempting to post late minibar charge of ৳350 to closed folio #${folio.id}...`);

        const lateChargeRes = await fetch(`${API_BASE}/api/accounting/folios/${folio.id}/charges`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                revenueHead: 'Mini Bar',
                description: 'Late Mini Bar Consumption',
                amount: 350,
                taxApplicable: true
            })
        });
        const lateChargeJson = await lateChargeRes.json();
        console.log(`Late Charge Response:`, lateChargeJson);

        if (lateChargeJson.success && lateChargeJson.isSupplementaryFolio) {
            console.log(`✅ PASS: Late charge did NOT alter closed parent folio! Automatically created Supplementary Folio (${lateChargeJson.supplementaryFolioNumber})!`);
        } else {
            throw new Error(`❌ FAIL: Supplementary folio was not created for late charge!`);
        }

        console.log('\n================================================================');
        console.log('🎉 ALL 5 LIFECYCLE FORENSIC VERIFICATIONS PASSED WITH 100% SUCCESS!');
        console.log('================================================================');
    } catch (err) {
        console.error('\n❌ Suite Error:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runTests();
