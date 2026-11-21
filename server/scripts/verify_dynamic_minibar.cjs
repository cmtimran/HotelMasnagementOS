const http = require('http');

function request(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(JSON.stringify(postData));
        req.end();
    });
}

async function runTests() {
    console.log('--- Testing Dynamic Minibar Catalog & Entry System ---');

    // Test 1: GET /api/housekeeping/minibar-items
    console.log('\n[1] Testing GET /api/housekeeping/minibar-items...');
    const getRes = await request({
        hostname: 'localhost',
        port: 3002,
        path: '/api/housekeeping/minibar-items?propertyId=1',
        method: 'GET'
    });
    console.log(`Status: ${getRes.status}`);
    console.log(`Count of items: ${getRes.data.count}`);
    if (getRes.status !== 200 || !getRes.data.success || getRes.data.count < 1) {
        throw new Error('Failed GET minibar items');
    }
    console.log('✓ PASS: Fetched catalog from PostgreSQL successfully.');

    // Test 2: POST /api/housekeeping/minibar-items (Dynamic Entry)
    console.log('\n[2] Testing POST /api/housekeeping/minibar-items (Dynamic Item Entry)...');
    const postRes = await request({
        hostname: 'localhost',
        port: 3002,
        path: '/api/housekeeping/minibar-items',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Property-Id': '1'
        }
    }, {
        name: 'Perrier Sparkling Water (330ml)',
        category: 'Beverage',
        price: 260.00,
        parStock: 2
    });
    console.log(`Status: ${postRes.status}`);
    console.log(`Created:`, postRes.data);
    if (postRes.status !== 201 || !postRes.data.success) {
        throw new Error('Failed POST dynamic minibar item');
    }
    const createdId = postRes.data.data.id;
    console.log(`✓ PASS: Created dynamic item with ID: ${createdId}`);

    // Test 3: PUT /api/housekeeping/minibar-items/:id
    console.log(`\n[3] Testing PUT /api/housekeeping/minibar-items/${createdId}...`);
    const putRes = await request({
        hostname: 'localhost',
        port: 3002,
        path: `/api/housekeeping/minibar-items/${createdId}`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Property-Id': '1'
        }
    }, {
        price: 280.00,
        parStock: 3
    });
    console.log(`Status: ${putRes.status}`);
    if (putRes.status !== 200 || !putRes.data.success) {
        throw new Error('Failed PUT minibar item');
    }
    console.log('✓ PASS: Updated minibar item price to ৳280 successfully.');

    // Test 4: DELETE /api/housekeeping/minibar-items/:id (Soft Deactivate)
    console.log(`\n[4] Testing DELETE /api/housekeeping/minibar-items/${createdId}...`);
    const delRes = await request({
        hostname: 'localhost',
        port: 3002,
        path: `/api/housekeeping/minibar-items/${createdId}`,
        method: 'DELETE',
        headers: {
            'X-Property-Id': '1'
        }
    });
    console.log(`Status: ${delRes.status}`);
    if (delRes.status !== 200 || !delRes.data.success) {
        throw new Error('Failed DELETE minibar item');
    }
    console.log('✓ PASS: Deactivated test minibar item cleanly.');

    console.log('\n=== ALL DYNAMIC MINIBAR CATALOG TESTS PASSED (4/4) ===\n');
}

runTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
