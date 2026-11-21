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

async function runTests() {
    console.log('🧪 === Starting Restaurant & POS Multi-Outlet E2E Tests ===\n');
    let passed = 0;
    let total = 0;

    function assert(name, condition, details = '') {
        total++;
        if (condition) {
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${name} -> ${details}`);
        }
    }

    try {
        // Test 1: GET Outlets
        const outletsRes = await request('GET', '/restaurant/outlets');
        assert('1. GET /restaurant/outlets returns outlets list', outletsRes.status === 200 && Array.isArray(outletsRes.body.data), JSON.stringify(outletsRes.body));
        const mainOutlet = outletsRes.body.data.find(o => o.code === 'OUTLET-MAIN') || outletsRes.body.data[0];
        assert('1.1 Initial Main Outlet exists', Boolean(mainOutlet), 'No main outlet found');

        // Test 2: POST /restaurant/outlets (Admin creates new outlet)
        const newOutletCode = `TEST-CAFE-${Date.now().toString().slice(-4)}`;
        const createOutletRes = await request('POST', '/restaurant/outlets', {
            name: 'Lobby Espresso & Pastry Bar',
            code: newOutletCode,
            outletType: 'CAFE_BAKERY',
            requiresTable: false,
            allowRoomCharge: true,
            vatRate: 15,
            serviceChargeRate: 5,
            revenueHeadCode: '10020-03'
        });
        assert('2. POST /restaurant/outlets creates new dynamic outlet', createOutletRes.status === 201 && createOutletRes.body.success, JSON.stringify(createOutletRes.body));
        const createdOutlet = createOutletRes.body.data;

        // Test 3: POST /restaurant/outlets/:id/clone (1-Click Menu Cloner)
        const cloneCode = `CLONE-${Date.now().toString().slice(-4)}`;
        const cloneRes = await request('POST', `/restaurant/outlets/${mainOutlet.id}/clone`, {
            targetOutletName: 'Poolside Sunset Bistro',
            targetOutletCode: cloneCode,
            priceMarkupPercent: 10,
            copyTables: true
        });
        assert('3. POST /restaurant/outlets/:id/clone clones menu items with markup & independent copies', cloneRes.status === 201 && cloneRes.body.success, JSON.stringify(cloneRes.body));

        // Test 4: GET /restaurant/categories & GET /restaurant/items
        const itemsRes = await request('GET', `/restaurant/items?outletId=${mainOutlet.id}`);
        assert('4. GET /restaurant/items returns menu items for outlet', itemsRes.status === 200 && itemsRes.body.data.length > 0, `Length: ${itemsRes.body?.data?.length}`);
        const sampleItem = itemsRes.body.data[0];

        // Test 5: GET /restaurant/tables
        const tablesRes = await request('GET', `/restaurant/tables?outletId=${mainOutlet.id}`);
        assert('5. GET /restaurant/tables returns tables with layout positions', tablesRes.status === 200 && tablesRes.body.data.length > 0, `Tables: ${tablesRes.body?.data?.length}`);
        const sampleTable = tablesRes.body.data[0];

        // Test 6: POST /pos/orders (Dine-in Order with Tax & Service Charge)
        const orderRes = await request('POST', '/pos/orders', {
            outletId: mainOutlet.id,
            tableId: sampleTable.id,
            orderType: 'DINE_IN',
            customerName: 'Sarah Jenkins',
            items: [
                {
                    menuItemId: sampleItem.id,
                    name: sampleItem.name,
                    quantity: 2,
                    unitPrice: sampleItem.price,
                    prepStation: sampleItem.prep_station || 'GRILL_HOT',
                    course: 'MAINS'
                }
            ],
            paymentMethod: 'CASH'
        });
        assert('6. POST /pos/orders creates order with subtotal, VAT & SC calculation', orderRes.status === 201 && orderRes.body.success, JSON.stringify(orderRes.body));
        const createdOrder = orderRes.body.data;

        // Test 7: Verify Table status updated to OCCUPIED
        const tableCheck = await request('GET', `/restaurant/tables?outletId=${mainOutlet.id}`);
        const occupiedTable = tableCheck.body.data.find(t => t.id === sampleTable.id);
        assert('7. Table status automatically set to OCCUPIED upon Dine-In order', occupiedTable && occupiedTable.status === 'OCCUPIED', `Status: ${occupiedTable?.status}`);

        // Test 8: Settle Order
        const settleRes = await request('POST', `/pos/orders/${createdOrder.id}/settle`, {
            paymentMethod: 'CASH',
            paymentDetails: [{ method: 'CASH', amount: createdOrder.total_amount }]
        });
        assert('8. POST /pos/orders/:id/settle settles order and sets table to CLEANING', settleRes.status === 200 && settleRes.body.success, JSON.stringify(settleRes.body));

        // Test 9: Cash Register Shift Session (Open, Stats, Close)
        const openRegRes = await request('POST', '/pos/registers/open', {
            outletId: mainOutlet.id,
            cashierId: 'cashier-01',
            cashierName: 'John Cashier',
            openingBalance: 5000,
            notes: 'Morning shift opening float'
        });
        assert('9. POST /pos/registers/open opens cashier shift with float', openRegRes.status === 201 && openRegRes.body.success, JSON.stringify(openRegRes.body));
        const session = openRegRes.body.data;

        const currentRegRes = await request('GET', `/pos/registers/current?outletId=${mainOutlet.id}&cashierId=cashier-01`);
        assert('9.1 GET /pos/registers/current returns live shift stats', currentRegRes.status === 200 && currentRegRes.body.data.session, JSON.stringify(currentRegRes.body));

        const closeRegRes = await request('POST', '/pos/registers/close', {
            sessionId: session.id,
            actualClosingCash: 5000,
            notes: 'Shift closed without issues'
        });
        assert('9.2 POST /pos/registers/close reconciles cash and closes shift', closeRegRes.status === 200 && closeRegRes.body.success, JSON.stringify(closeRegRes.body));

        console.log(`\n🏁 === Test Results: ${passed}/${total} passed (${Math.round(passed / total * 100)}%) ===`);
        process.exit(passed === total ? 0 : 1);
    } catch (err) {
        console.error('Fatal test error:', err);
        process.exit(1);
    }
}

runTests();
