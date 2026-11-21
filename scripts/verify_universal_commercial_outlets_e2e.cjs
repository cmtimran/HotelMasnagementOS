const http = require('http');

function request(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch {
                    resolve({ status: res.statusCode, text: data });
                }
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runVerification() {
    console.log('================================================================');
    console.log('VERIFYING UNIVERSAL HOTEL COMMERCIAL OUTLETS & MULTI-DEPARTMENT');
    console.log('================================================================');

    let passedTests = 0;
    const testIds = [];

    try {
        // 1. Create Banquet & Event Venue Outlet
        console.log('\n[TEST 1] Creating Grand Ballroom Banquet Outlet...');
        const banquetPayload = {
            propertyId: 'prop-001',
            name: 'Grand Crystal Ballroom',
            code: `TEST-BALLROOM-${Date.now()}`,
            description: 'Premier column-free ballroom with crystal chandeliers',
            outletType: 'GRAND_BALLROOM',
            departmentCategory: 'BANQUET_EVENTS',
            catalogType: 'BANQUET_PACKAGES',
            physicalLocation: 'Convention Wing Level 2',
            venueDimensions: {
                lengthFeet: 120,
                widthFeet: 100,
                heightFeet: 20,
                totalSqFt: 12000,
                carpetAreaSqFt: 10500
            },
            seatingCapacities: {
                theatre: 800,
                classroom: 350,
                banquet: 500,
                ushape: 120,
                cocktail: 1000,
                boardroom: 60
            },
            rentalTariffs: {
                hourlyRate: 15000,
                halfDayRate: 60000,
                fullDayRate: 110000,
                eveningRate: 140000,
                cleaningFee: 10000
            },
            requiresTable: true,
            allowRoomCharge: true,
            autoGenerateKot: true,
            revenueHeadCode: '10050-01',
            vatRate: 15.00,
            serviceChargeRate: 10.00,
            cityTaxRate: 1.00
        };

        const bRes = await request({
            hostname: 'localhost',
            port: 3002,
            path: '/api/restaurant/outlets',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, banquetPayload);

        if (bRes.status === 201 && bRes.data.success) {
            const bOutlet = bRes.data.data;
            testIds.push(bOutlet.id);
            console.log(`✅ Banquet Outlet Created: ${bOutlet.name} [ID: ${bOutlet.id}]`);
            console.log(`   Department: ${bOutlet.department_category}`);
            console.log(`   Dimensions: ${bOutlet.venue_dimensions?.totalSqFt} sq ft`);
            console.log(`   Theatre Capacity: ${bOutlet.seating_capacities?.theatre} pax`);
            console.log(`   Full-Day Tariff: ৳${bOutlet.rental_tariffs?.fullDayRate}`);
            passedTests++;
        } else {
            throw new Error(`Failed to create banquet outlet: ${JSON.stringify(bRes.data)}`);
        }

        // 2. Create Hotel Gift Shop Retail Outlet
        console.log('\n[TEST 2] Creating Hotel Gift Shop Retail Outlet...');
        const retailPayload = {
            propertyId: 'prop-001',
            name: 'The Artisan Gift Shop & Essentials',
            code: `TEST-RETAIL-${Date.now()}`,
            description: 'Handicrafts, travel sundries, and luxury chocolates',
            outletType: 'GIFT_SHOP',
            departmentCategory: 'RETAIL_SHOP',
            catalogType: 'RETAIL_PRODUCTS',
            physicalLocation: 'Main Lobby East',
            allowsBarcodeScan: true,
            requiresTable: false,
            allowRoomCharge: true,
            autoGenerateKot: false,
            revenueHeadCode: '10040-01',
            vatRate: 15.00,
            serviceChargeRate: 0.00,
            cityTaxRate: 0.00
        };

        const rRes = await request({
            hostname: 'localhost',
            port: 3002,
            path: '/api/restaurant/outlets',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, retailPayload);

        if (rRes.status === 201 && rRes.data.success) {
            const rOutlet = rRes.data.data;
            testIds.push(rOutlet.id);
            console.log(`✅ Retail Outlet Created: ${rOutlet.name} [ID: ${rOutlet.id}]`);
            console.log(`   Barcode Scanner Allowed: ${rOutlet.allows_barcode_scan}`);
            console.log(`   Requires Table: ${rOutlet.requires_table}`);
            console.log(`   USALI Code: ${rOutlet.revenue_head_code}`);
            passedTests++;
        } else {
            throw new Error(`Failed to create retail outlet: ${JSON.stringify(rRes.data)}`);
        }

        // 3. Create Swimming Pool with Juice Bar Outlet
        console.log('\n[TEST 3] Creating Swimming Pool with Juice Bar Outlet...');
        const poolPayload = {
            propertyId: 'prop-001',
            name: 'Azure Poolside & Organic Juice Bar',
            code: `TEST-POOL-${Date.now()}`,
            description: 'Outdoor heated pool deck, fresh smoothies, and day passes',
            outletType: 'POOL_JUICE_BAR',
            departmentCategory: 'FITNESS_RECREATION',
            catalogType: 'MEMBERSHIP_PASS',
            physicalLocation: '6th Floor Wellness Terrace',
            requiresTable: true,
            allowRoomCharge: true,
            autoGenerateKot: true,
            revenueHeadCode: '10030-02',
            vatRate: 15.00,
            serviceChargeRate: 5.00
        };

        const pRes = await request({
            hostname: 'localhost',
            port: 3002,
            path: '/api/restaurant/outlets',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, poolPayload);

        if (pRes.status === 201 && pRes.data.success) {
            const pOutlet = pRes.data.data;
            testIds.push(pOutlet.id);
            console.log(`✅ Pool & Juice Bar Outlet Created: ${pOutlet.name} [ID: ${pOutlet.id}]`);
            console.log(`   Department: ${pOutlet.department_category}`);
            passedTests++;
        } else {
            throw new Error(`Failed to create pool outlet: ${JSON.stringify(pRes.data)}`);
        }

        // 4. Test Department Summary Endpoint
        console.log('\n[TEST 4] Testing GET /api/restaurant/outlets/departments/summary...');
        const sumRes = await request({
            hostname: 'localhost',
            port: 3002,
            path: '/api/restaurant/outlets/departments/summary',
            method: 'GET'
        });

        if (sumRes.status === 200 && sumRes.data.success) {
            const activeDepts = sumRes.data.data.activeDepartments || [];
            console.log('✅ Active Departments Detected:', activeDepts);
            console.log('   Department Counts:', sumRes.data.data.counts);

            if (activeDepts.includes('BANQUET_EVENTS') && activeDepts.includes('RETAIL_SHOP') && activeDepts.includes('FITNESS_RECREATION')) {
                console.log('✅ All newly created commercial departments registered in active summary!');
                passedTests++;
            } else {
                throw new Error('Expected new departments to be in active summary');
            }
        } else {
            throw new Error(`Failed to get departments summary: ${JSON.stringify(sumRes.data)}`);
        }

        // 5. Filter Outlets by Department
        console.log('\n[TEST 5] Testing GET /api/restaurant/outlets?department=BANQUET_EVENTS...');
        const filterRes = await request({
            hostname: 'localhost',
            port: 3002,
            path: '/api/restaurant/outlets?department=BANQUET_EVENTS',
            method: 'GET'
        });

        if (filterRes.status === 200 && filterRes.data.success) {
            const list = filterRes.data.data;
            const allBanquet = list.every(o => o.department_category === 'BANQUET_EVENTS');
            if (allBanquet && list.length > 0) {
                console.log(`✅ Department filter verified: Found ${list.length} Banquet outlets!`);
                passedTests++;
            } else {
                throw new Error('Filter query did not return pure banquet outlets');
            }
        }

        console.log('\n================================================================');
        console.log(`SUMMARY: ${passedTests}/5 TESTS PASSED SUCCESSFULLY (100%)!`);
        console.log('================================================================');

    } catch (err) {
        console.error('❌ Verification failed:', err.message);
        process.exit(1);
    } finally {
        // Cleanup test outlets
        console.log('\nCleaning up temporary test outlets...');
        for (const id of testIds) {
            await request({
                hostname: 'localhost',
                port: 3002,
                path: `/api/restaurant/outlets/${id}`,
                method: 'DELETE'
            });
        }
        console.log('Cleanup finished.');
    }
}

runVerification();
