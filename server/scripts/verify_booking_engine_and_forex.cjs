/**
 * Automated Verification Script for:
 * 1. Multi-Currency Forex Exchange Rate Engine (USALI Accounting)
 * 2. Direct Web Booking Engine (/book guest portal)
 */

const http = require('http');

const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
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

        req.on('error', (err) => reject(err));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('================================================================');
    console.log(' 🚀 RUNNING VERIFICATION: MULTI-CURRENCY FOREX & WEB BOOKING ENGINE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    // Test 1: Property Info
    try {
        console.log('[Test 1] GET /api/booking-engine/property-info ...');
        const res = await makeRequest('GET', '/api/booking-engine/property-info?propertyId=1');
        if (res.status === 200 && res.body?.success && res.body?.data?.name) {
            console.log(' ✅ PASS: Property info retrieved successfully:', res.body.data.name);
            passed++;
        } else {
            console.error(' ❌ FAIL:', res);
            failed++;
        }
    } catch (err) {
        console.error(' ❌ FAIL (Exception):', err.message);
        failed++;
    }

    // Test 2: Room Types
    try {
        console.log('\n[Test 2] GET /api/booking-engine/room-types ...');
        const res = await makeRequest('GET', '/api/booking-engine/room-types?propertyId=1');
        if (res.status === 200 && res.body?.success && Array.isArray(res.body?.data) && res.body.data.length > 0) {
            console.log(` ✅ PASS: Found ${res.body.data.length} room types. First: ${res.body.data[0].name} (৳${res.body.data[0].baseRate}/night)`);
            passed++;
        } else {
            console.error(' ❌ FAIL:', res);
            failed++;
        }
    } catch (err) {
        console.error(' ❌ FAIL (Exception):', err.message);
        failed++;
    }

    // Test 3: Meal Plans
    try {
        console.log('\n[Test 3] GET /api/booking-engine/meal-plans ...');
        const res = await makeRequest('GET', '/api/booking-engine/meal-plans?propertyId=1');
        if (res.status === 200 && res.body?.success && Array.isArray(res.body?.data) && res.body.data.length > 0) {
            console.log(` ✅ PASS: Found ${res.body.data.length} meal plans (${res.body.data.map(m => m.code).join(', ')})`);
            passed++;
        } else {
            console.error(' ❌ FAIL:', res);
            failed++;
        }
    } catch (err) {
        console.error(' ❌ FAIL (Exception):', err.message);
        failed++;
    }

    // Test 4: Web Booking Creation
    let confirmedBooking = null;
    try {
        console.log('\n[Test 4] POST /api/booking-engine/reserve ...');
        const inDate = new Date();
        inDate.setDate(inDate.getDate() + 5);
        const outDate = new Date();
        outDate.setDate(outDate.getDate() + 7);

        const payload = {
            propertyId: 1,
            guestName: 'Ambassador Alexander Vance',
            phone: '+8801700998877',
            email: 'alexander.vance@un-diplomatic.org',
            roomTypeId: 1,
            roomTypeName: 'Deluxe Suite',
            checkIn: inDate.toISOString().split('T')[0],
            checkOut: outDate.toISOString().split('T')[0],
            adults: 2,
            children: 0,
            mealPlanCode: 'MAP',
            mealPlanPrice: 1800,
            specialRequests: 'High floor, airport transfer requested',
            paymentMethod: 'PAY_AT_HOTEL'
        };

        const res = await makeRequest('POST', '/api/booking-engine/reserve', payload);
        if ((res.status === 200 || res.status === 201) && res.body?.success && res.body?.confirmationNumber) {
            confirmedBooking = res.body;
            console.log(' ✅ PASS: Web booking confirmed! Confirmation #:', res.body.confirmationNumber);
            console.log(`         Assigned Room: ${res.body.assignedRoom}, Total: ৳${res.body.totalAmount}`);
            passed++;
        } else {
            console.error(' ❌ FAIL:', res);
            failed++;
        }
    } catch (err) {
        console.error(' ❌ FAIL (Exception):', err.message);
        failed++;
    }

    // Test 5: Currency Exchange Rates Engine
    try {
        console.log('\n[Test 5] GET /api/accounting/currencies/rates ...');
        const res = await makeRequest('GET', '/api/accounting/currencies/rates?propertyId=1');
        const ratesList = res.body?.data || res.body?.rates;
        if (res.status === 200 && res.body?.success && Array.isArray(ratesList)) {
            const usdRate = ratesList.find(r => r.fromCurrency === 'USD' || r.from_currency === 'USD');
            const rateVal = usdRate?.exchangeRate || usdRate?.exchange_rate;
            console.log(` ✅ PASS: Retrieved ${ratesList.length} active forex rates. USD/BDT = ৳${rateVal}`);
            passed++;
        } else {
            console.error(' ❌ FAIL:', res);
            failed++;
        }
    } catch (err) {
        console.error(' ❌ FAIL (Exception):', err.message);
        failed++;
    }

    // Test 6: Cross-Currency Folio Settlement
    try {
        console.log('\n[Test 6] Cross-Currency Payment on Folio (USD -> BDT) ...');
        
        // Let's find an open folio
        const { Pool } = require('pg');
        require('dotenv').config({ path: 'server/.env' });
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });

        const folioQuery = await pool.query(`SELECT id, reservation_id, balance FROM folios WHERE balance > 0 LIMIT 1`);
        
        if (folioQuery.rows.length > 0) {
            const testFolio = folioQuery.rows[0];
            const paymentPayload = {
                propertyId: 1,
                paymentNumber: `PAY-TEST-${Date.now()}`,
                method: 'CREDIT_CARD',
                amount: 100, // 100 USD
                currency: 'USD',
                exchangeRate: 122.50, // 100 * 122.50 = 12,250 BDT
                referenceCode: 'AMEX-882193',
                userName: 'Senior Auditor'
            };

            const res = await makeRequest('POST', `/api/accounting/folios/${testFolio.id}/payments`, paymentPayload);
            if (res.status === 200 && res.body?.success && res.body?.baseCurrencyAmount === 12250) {
                console.log(` ✅ PASS: Cross-currency payment processed successfully!`);
                console.log(`         Transaction: 100 USD -> Base Amount: ৳${res.body.baseCurrencyAmount} BDT (@ 122.50)`);
                console.log(`         Payment Record ID: ${res.body.paymentId}`);
                passed++;
            } else {
                console.error(' ❌ FAIL:', res);
                failed++;
            }
        } else {
            console.log(' ℹ️ Folios table has no open folios with balance > 0. Creating a test charge first...');
            // Create a test folio or charge to verify
            const insertFolio = await pool.query(`
                INSERT INTO folios (property_id, reservation_id, folio_number, total_charges, balance, status)
                VALUES (1, 1, 'FOL-FOREX-TEST', 50000, 50000, 'OPEN')
                RETURNING id
            `);
            const folioId = insertFolio.rows[0].id;

            const paymentPayload = {
                propertyId: 1,
                paymentNumber: `PAY-TEST-${Date.now()}`,
                method: 'CREDIT_CARD',
                amount: 100,
                currency: 'USD',
                exchangeRate: 122.50,
                referenceCode: 'AMEX-882193',
                userName: 'Senior Auditor'
            };

            const res = await makeRequest('POST', `/api/accounting/folios/${folioId}/payments`, paymentPayload);
            if (res.status === 200 && res.body?.success && res.body?.baseCurrencyAmount === 12250) {
                console.log(` ✅ PASS: Cross-currency payment processed successfully!`);
                console.log(`         Transaction: 100 USD -> Base Amount: ৳${res.body.baseCurrencyAmount} BDT (@ 122.50)`);
                console.log(`         Payment Record ID: ${res.body.paymentId}`);
                passed++;
            } else {
                console.error(' ❌ FAIL:', res);
                failed++;
            }
        }
        await pool.end();
    } catch (err) {
        console.error(' ❌ FAIL (Exception):', err.message);
        failed++;
    }

    console.log('\n================================================================');
    console.log(` 🏁 VERIFICATION SUMMARY: ${passed} PASSED / ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests();
