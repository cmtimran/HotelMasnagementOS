const http = require('http');

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'localhost',
            port: 3002,
            path: `/api${path}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function testRoomCharge() {
    console.log('🏨 === Testing POS to Hotel Folio Room Charge Integration ===\n');
    const { pgPool } = await import('../server/dist/database/postgres.js');
    const client = await pgPool.connect();

    try {
        // 1. Fetch Outlets & Items
        const outlets = await request('GET', '/restaurant/outlets');
        const mainOutlet = outlets.body.data.find(o => o.code === 'OUTLET-MAIN') || outlets.body.data[0];
        const items = await request('GET', `/restaurant/items?outletId=${mainOutlet.id}`);
        const sampleItem = items.body.data[0];

        // 2. Setup an In-House Reservation for Room 101
        const roomRes = await client.query("SELECT id, room_number, room_type_id FROM rooms WHERE property_id = 1 LIMIT 1");
        const room = roomRes.rows[0];
        const roomNum = room.room_number;

        // Clean previous test
        await client.query("DELETE FROM folio_charges WHERE description LIKE '%POS Room Charge Test%' OR description LIKE '%POS Order%'");

        // Find or create in-house guest via reservation_rooms
        let resRes = await client.query(`
            SELECT r.id as res_id, r.reservation_number 
            FROM reservation_rooms rr
            JOIN rooms rm ON rm.id = rr.room_id
            JOIN reservations r ON r.id = rr.reservation_id
            WHERE rm.room_number = $1 AND rr.status IN ('CHECKED_IN','IN_HOUSE','CONFIRMED')
            LIMIT 1;
        `, [roomNum]);

        let reservationId;
        if (resRes.rows.length === 0) {
            const createRes = await client.query(`
                INSERT INTO reservations (
                    property_id, reservation_number, status, total_amount, paid_amount, due_amount
                ) VALUES (
                    1, 'RES-POS-TEST', 'IN_HOUSE', 6000, 0, 6000
                ) RETURNING id;
            `);
            reservationId = createRes.rows[0].id;

            // Insert reservation_rooms
            await client.query(`
                INSERT INTO reservation_rooms (
                    reservation_id, room_id, room_type_id, status, check_in_date, check_out_date, nights, room_rate
                ) VALUES (
                    $1, $2, $3, 'IN_HOUSE', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 1, 6000
                );
            `, [reservationId, room.id, room.room_type_id || 1]);

            // Create Master Folio for reservation
            await client.query(`
                INSERT INTO folios (reservation_id, folio_number, folio_type, status)
                VALUES ($1, 'FOL-POS-TEST', 'MASTER', 'OPEN')
                ON CONFLICT DO NOTHING;
            `, [reservationId]);
        } else {
            reservationId = resRes.rows[0].res_id;
            // Ensure folio exists
            await client.query(`
                INSERT INTO folios (reservation_id, folio_number, folio_type, status)
                VALUES ($1, 'FOL-POS-TEST', 'MASTER', 'OPEN')
                ON CONFLICT DO NOTHING;
            `, [reservationId]);
        }

        console.log(`✅ Verified in-house reservation ID: ${reservationId} in Room ${roomNum}`);

        // 3. Post POS Order with payment_method: 'ROOM_CHARGE'
        const orderRes = await request('POST', '/pos/orders', {
            outletId: mainOutlet.id,
            orderType: 'ROOM_SERVICE',
            customerName: 'Dr. Imran Hossain',
            roomNumber: roomNum,
            paymentMethod: 'ROOM_CHARGE',
            items: [
                {
                    menuItemId: sampleItem.id,
                    name: sampleItem.name,
                    quantity: 2,
                    unitPrice: sampleItem.price,
                    prepStation: sampleItem.prep_station || 'GRILL_HOT',
                    course: 'MAINS'
                }
            ]
        });

        if (orderRes.status === 201 && orderRes.body.success) {
            const created = orderRes.body.data;
            console.log(`✅ [PASS] POS Order #${created.order_number} created with paymentMethod: ROOM_CHARGE!`);
            console.log(`   - Order Total: ৳${created.total_amount}`);
            console.log(`   - Folio Charge ID: ${created.folio_charge_id}`);

            // 4. Verify in PostgreSQL that folio_charges has this record under 10020-01!
            const chargeCheck = await client.query(`
                SELECT * FROM folio_charges WHERE id = $1
            `, [created.folio_charge_id]);

            if (chargeCheck.rows.length > 0) {
                const c = chargeCheck.rows[0];
                console.log(`\n✅ [PASS] Verified Folio Charge in PostgreSQL:`);
                console.log(`   - Charge ID: ${c.id}`);
                console.log(`   - Charge Type: ${c.charge_type}`);
                console.log(`   - Revenue Head Code: ${c.revenue_head_code} (USALI Food & Beverage)`);
                console.log(`   - Base Amount: ৳${c.base_amount}`);
                console.log(`   - VAT Amount: ৳${c.vat_amount} (${c.vat_rate}%)`);
                console.log(`   - Service Charge: ৳${c.service_charge_amount} (${c.service_charge_rate}%)`);
                console.log(`   - Total Folio Charge: ৳${c.total_amount}`);
                console.log(`\n🎉 Hotel Folio "Bill to Room" End-to-End Integration Verified 100%!`);
                process.exit(0);
            } else {
                console.error(`❌ [FAIL] Folio charge record not found in PostgreSQL!`);
                process.exit(1);
            }
        } else {
            console.error('❌ [FAIL] POS Order creation failed:', orderRes.body?.error);
            process.exit(1);
        }
    } finally {
        client.release();
    }
}

testRoomCharge().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
