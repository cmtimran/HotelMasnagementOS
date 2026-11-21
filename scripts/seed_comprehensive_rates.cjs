const { pgPool } = require('../server/dist/database/postgres.js');

async function seed() {
    const client = await pgPool.connect();
    try {
        console.log('--- 1. Inserting Comprehensive Meal Plan ---');
        const mealPlanData = {
            id: 1,
            property_id: 1,
            name: 'Royal Gourmet Full Board (CP+MAP+AP Deluxe)',
            marketingName: 'Royal Imperial Dine-Around Plan',
            shortCode: 'FB-ROYAL',
            description: 'Comprehensive 5-Star all-inclusive dining plan covering lavish international breakfast buffet, 3-course executive business lunch, and chef-curated royal evening dinner buffet across all signature dining venues.',
            status: 'Active',
            hasBreakfast: true,
            breakfastMenu: 'Continental, American & Traditional Royal Bengali Luxury Buffet',
            breakfastStyle: 'Buffet',
            breakfastVenue: 'Palace Coffee Shop & The Grand Buffet',
            breakfastCuisine: 'International & Pan-Asian',
            hasLunch: true,
            lunchMenu: 'Executive 3-Course Business Lunch & Live Teppanyaki Station',
            lunchStyle: 'Buffet',
            lunchVenue: 'The Sky Garden Bistro & Terrace',
            lunchCuisine: 'Mediterranean, Mughal & Continental',
            hasDinner: true,
            dinnerMenu: 'Grand Chef Signature Gala Dinner Buffet with Live Seafood & Grill',
            dinnerStyle: 'Buffet',
            dinnerVenue: 'The Imperial Grand Dining Hall',
            dinnerCuisine: 'Multicuisine & Premium Charcoal BBQ',
            hasBrunch: true,
            brunchMenu: 'Weekend Champagne & Mocktail Artisan Brunch',
            brunchStyle: 'Buffet',
            brunchVenue: 'Poolside Oasis Veranda',
            brunchCuisine: 'Modern Fusion & Patisserie',
            hasCupole: true,
            cupoleMenu: 'Royal Afternoon High Tea, Macarons, Finger Sandwiches & Artisan Coffee',
            cupoleStyle: 'Set Menu',
            cupoleVenue: 'The Royal Tea Lounge',
            cupoleCuisine: 'British & Parisian Confectionery',
            hasSnacks: true,
            snacksMenu: 'Midnight Snacks, Gourmet Canapés & Artisan Finger Bites',
            snacksStyle: 'À la carte',
            snacksVenue: '24/7 In-Room Dining & Lobby Lounge',
            snacksCuisine: 'Gourmet Fast Casual',
            servingType: 'Buffet',
            internalCost: 1200,
            sellingPriceAdult: 2500,
            sellingPriceChild: 1250,
            infantMealsFree: true,
            maxInfantAge: 5,
            postingFrequency: 'Daily',
            revenueCode: 'REV-FB-MEAL',
            taxInclusive: true,
            startTime: '06:30',
            endTime: '23:30',
            venue: 'The Imperial Grand Dining Hall'
        };

        const mealRes = await client.query(`
            INSERT INTO meal_plans (
                property_id, name, marketing_name, short_code, description, status,
                has_breakfast, breakfast_menu, breakfast_style, breakfast_venue, breakfast_cuisine,
                has_lunch, lunch_menu, lunch_style, lunch_venue, lunch_cuisine,
                has_dinner, dinner_menu, dinner_style, dinner_venue, dinner_cuisine,
                has_brunch, brunch_menu, brunch_style, brunch_venue, brunch_cuisine,
                has_cupole, cupole_menu, cupole_style, cupole_venue, cupole_cuisine,
                has_snacks, snacks_menu, snacks_style, snacks_venue, snacks_cuisine,
                serving_type, internal_cost, selling_price_adult, selling_price_child,
                infant_meals_free, max_infant_age, posting_frequency, revenue_code,
                tax_inclusive, start_time, end_time, venue, raw_json
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21,
                $22, $23, $24, $25, $26,
                $27, $28, $29, $30, $31,
                $32, $33, $34, $35, $36,
                $37, $38, $39, $40,
                $41, $42, $43, $44,
                $45, $46, $47, $48, $49
            )
            ON CONFLICT (property_id, short_code) 
            DO UPDATE SET 
                name = EXCLUDED.name,
                marketing_name = EXCLUDED.marketing_name,
                description = EXCLUDED.description,
                selling_price_adult = EXCLUDED.selling_price_adult,
                selling_price_child = EXCLUDED.selling_price_child,
                internal_cost = EXCLUDED.internal_cost,
                raw_json = EXCLUDED.raw_json
            RETURNING id;
        `, [
            mealPlanData.property_id, mealPlanData.name, mealPlanData.marketingName, mealPlanData.shortCode, mealPlanData.description, mealPlanData.status,
            mealPlanData.hasBreakfast, mealPlanData.breakfastMenu, mealPlanData.breakfastStyle, mealPlanData.breakfastVenue, mealPlanData.breakfastCuisine,
            mealPlanData.hasLunch, mealPlanData.lunchMenu, mealPlanData.lunchStyle, mealPlanData.lunchVenue, mealPlanData.lunchCuisine,
            mealPlanData.hasDinner, mealPlanData.dinnerMenu, mealPlanData.dinnerStyle, mealPlanData.dinnerVenue, mealPlanData.dinnerCuisine,
            mealPlanData.hasBrunch, mealPlanData.brunchMenu, mealPlanData.brunchStyle, mealPlanData.brunchVenue, mealPlanData.brunchCuisine,
            mealPlanData.hasCupole, mealPlanData.cupoleMenu, mealPlanData.cupoleStyle, mealPlanData.cupoleVenue, mealPlanData.cupoleCuisine,
            mealPlanData.hasSnacks, mealPlanData.snacksMenu, mealPlanData.snacksStyle, mealPlanData.snacksVenue, mealPlanData.snacksCuisine,
            mealPlanData.servingType, mealPlanData.internalCost, mealPlanData.sellingPriceAdult, mealPlanData.sellingPriceChild,
            mealPlanData.infantMealsFree, mealPlanData.maxInfantAge, mealPlanData.postingFrequency, mealPlanData.revenueCode,
            mealPlanData.taxInclusive, mealPlanData.startTime, mealPlanData.endTime, mealPlanData.venue, JSON.stringify(mealPlanData)
        ]);

        const mealPlanId = mealRes.rows[0].id;
        console.log('✅ Meal Plan created/updated with ID:', mealPlanId);

        console.log('--- 2. Inserting Comprehensive Hotel Package ---');
        const packageData = {
            id: 2,
            property_id: 1,
            name: 'Royal Honeymoon & Wellness Escape',
            shortCode: 'PKG-ROYAL-WELLNESS',
            packageType: 'Honeymoon',
            status: 'Active',
            color: '#8B5CF6',
            description: 'Ultra-luxurious all-in-one getaway package including VIP luxury airport transfer, daily full buffet breakfast & romantic candlelit dinner, couple Swedish spa session, unlimited recreation & heated swimming pool access, complimentary minibar replenishment, and premium laundry service.',
            roomConfig: {
                applicableRoomTypes: ['Deluxe Double', 'Executive Suite'],
                extraBedAllowed: true,
                extraBedRate: 1500,
                extraAdultRate: 2000,
                extraChildRate: 1000,
                childAgeFrom: 6,
                childAgeTo: 12,
                infantFree: true,
                infantMaxAge: 5,
                maxExtraBeds: 1,
                extraBedMealIncluded: true,
                welcomeAmenity: 'Chilled Sparkling Mocktail, Belgian Chocolates & Fresh Exotic Fruit Basket',
                lateCheckoutAllowed: true,
                lateCheckoutTime: '16:00',
                wifiIncluded: true,
                priorityCheckin: true
            },
            mealInclusions: {
                hasBreakfast: true,
                breakfastVenue: 'The Imperial Grand Dining Hall',
                breakfastStyle: 'Buffet',
                breakfastMenu: 'Royal Continental & Hot Buffet',
                breakfastCuisine: 'International',
                breakfastAdultRate: 800,
                breakfastChildRate: 400,
                breakfastInfantFree: true,
                hasLunch: false,
                lunchVenue: 'The Sky Garden Bistro',
                lunchStyle: 'Set Menu',
                lunchAdultRate: 0,
                lunchChildRate: 0,
                lunchMenu: '',
                lunchCuisine: '',
                hasDinner: true,
                dinnerVenue: 'Poolside Candlelight Cabana',
                dinnerStyle: 'À la carte',
                dinnerMenu: '4-Course Candlelight Chef Special',
                dinnerCuisine: 'European Fine Dining',
                dinnerCredit: 3500,
                dinnerAdultRate: 1500,
                dinnerChildRate: 750,
                hasBrunch: false,
                brunchVenue: '',
                brunchStyle: 'Buffet',
                brunchAdultRate: 0,
                brunchMenu: '',
                brunchCuisine: '',
                hasCupole: true,
                cupoleVenue: 'The Royal Tea Lounge',
                cupoleStyle: 'Set Menu',
                cupoleCredit: 1000,
                cupoleMenu: 'Afternoon High Tea with Petit Fours',
                cupoleCuisine: 'Artisan Bakery'
            },
            poolConfig: {
                included: true,
                complimentaryAdults: 2,
                complimentaryChildren: 1,
                extraAdultRate: 500,
                extraChildRate: 250
            },
            transportConfig: {
                type: 'Both',
                vehicleType: 'Executive Mercedes E-Class / Luxury Chauffeur SUV',
                pickupRate: 2500,
                dropRate: 2500
            },
            laundryConfig: {
                included: true,
                allowanceType: 'Per Stay',
                itemsAllowance: 6,
                extraItemRate: 150,
                items: [
                    { name: "Men's / Women's Suit or Blazer", includedQty: 2, extraRate: 350 },
                    { name: 'Executive Shirt / Blouse (Steam Press)', includedQty: 4, extraRate: 150 }
                ]
            },
            minibarConfig: {
                included: true,
                dailyCredit: 1200,
                replenishment: 'Daily',
                items: [
                    { name: 'Evian Natural Mineral Water (750ml)', category: 'Beverage', qty: 2, unitPrice: 350 },
                    { name: 'Imported Sparkling Fruit Nectar', category: 'Non-Alcoholic', qty: 2, unitPrice: 280 },
                    { name: 'Artisan Roasted Salted Cashews & Macadamias', category: 'Snack', qty: 2, unitPrice: 420 },
                    { name: 'Swiss Dark Truffle Chocolates', category: 'Snack', qty: 1, unitPrice: 500 }
                ]
            },
            recreationConfig: {
                included: true,
                activities: [
                    { name: 'Couple Swedish Aroma Spa Therapy (60 Min)', includedSessions: 1, adultRate: 4000, childRate: 0, minAge: 18 },
                    { name: 'Steam, Sauna & Jacuzzi Hydro-Session', includedSessions: 2, adultRate: 1200, childRate: 600, minAge: 12 },
                    { name: 'Olympic Heated Pool & Infinity Terrace Access', includedSessions: 4, adultRate: 800, childRate: 400 }
                ]
            },
            outletCredits: [
                { outletName: 'The Royal Spa & Ayurvedic Pavilion', creditType: 'Per Stay', creditAmount: 2000, revenueCode: 'REV-SPA-01' },
                { outletName: 'Skyline Lounge & Mocktail Bar', creditType: 'Per Day', creditAmount: 1000, revenueCode: 'REV-BEV-02' }
            ],
            validity: {
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                minNights: 2,
                maxNights: 14,
                blackoutDates: '2026-12-24, 2026-12-31'
            },
            finance: {
                baseSurcharge: 4500,
                dateBasedSurcharges: [
                    { dateRange: '2026-12-20 to 2026-12-31', surchargeAmount: 2000, reason: 'Peak Year-End Holiday Season Surcharge' }
                ],
                autoPost: true,
                revenueAllocations: [
                    { department: 'Food & Beverage', amount: 40, type: 'Percentage' },
                    { department: 'Spa & Recreation', amount: 35, type: 'Percentage' },
                    { department: 'Transportation', amount: 25, type: 'Percentage' }
                ],
                totalCost: 3200
            }
        };

        const pkgRes = await client.query(`
            INSERT INTO hotel_packages (
                property_id, name, short_code, package_type, status, color, description, raw_json
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8
            )
            ON CONFLICT (property_id, short_code)
            DO UPDATE SET 
                name = EXCLUDED.name,
                package_type = EXCLUDED.package_type,
                status = EXCLUDED.status,
                color = EXCLUDED.color,
                description = EXCLUDED.description,
                raw_json = EXCLUDED.raw_json
            RETURNING id;
        `, [
            packageData.property_id, packageData.name, packageData.shortCode, packageData.packageType,
            packageData.status, packageData.color, packageData.description, JSON.stringify(packageData)
        ]);

        const packageId = pkgRes.rows[0].id;
        console.log('✅ Hotel Package created/updated with ID:', packageId);

        console.log('--- 3. Inserting Comprehensive Rate Plan ---');
        const ratePlanData = {
            id: 2,
            property_id: 1,
            name: 'Best Available Rate with Breakfast & Wellness Bundle',
            shortCode: 'BAR-BB-WELL',
            marketSegment: 'FIT / Direct Web & Front Desk',
            currency: 'BDT',
            description: 'Premier dynamic flexible rate plan inclusive of Royal Full Breakfast buffet, linked with the Royal Honeymoon & Wellness Escape bundle, flexible 24-hour cancellation policy, and customized room pricing matrix.',
            status: 'Active',
            mealPlan: 'FB-ROYAL',
            packageId: Number(packageId),
            taxIncluded: true,
            promoCode: 'ROYAL2026',
            policies: {
                depositRequired: true,
                depositAmount: 20,
                depositType: 'Percentage',
                cancellationType: 'Flexible',
                cancellationDeadline: 24,
                refundPercentage: 100
            },
            activationDate: '2026-01-01',
            expirationDate: '2026-12-31',
            stayDateStart: '2026-01-01',
            stayDateEnd: '2026-12-31',
            isSeasonal: true,
            seasonName: 'Peak Executive Hospitality Season',
            seasonStart: '2026-10-01',
            seasonEnd: '2026-12-31',
            validDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            minNights: 1,
            maxNights: 30,
            cutOffDays: 0,
            closedToArrival: false,
            closedToDeparture: false,
            stopSell: false,
            pricing: [
                {
                    roomTypeId: 'Deluxe Twin',
                    structure: 'Flat',
                    operatingCost: 1200,
                    baseRate: 3200,
                    doubleRate: 3500,
                    tripleRate: 4200,
                    extraAdult: 1000,
                    extraChild: 500,
                    baseOccupancy: 2,
                    maxOccupancy: 3
                },
                {
                    roomTypeId: 'Deluxe Double',
                    structure: 'Flat',
                    operatingCost: 1400,
                    baseRate: 3600,
                    doubleRate: 3900,
                    tripleRate: 4600,
                    extraAdult: 1200,
                    extraChild: 600,
                    baseOccupancy: 2,
                    maxOccupancy: 3
                },
                {
                    roomTypeId: 'Executive Suite',
                    structure: 'Flat',
                    operatingCost: 2200,
                    baseRate: 6500,
                    doubleRate: 7000,
                    tripleRate: 8000,
                    extraAdult: 1800,
                    extraChild: 900,
                    baseOccupancy: 2,
                    maxOccupancy: 4
                }
            ]
        };

        const planRes = await client.query(`
            INSERT INTO rate_plans (
                property_id, name, short_code, market_segment, currency, description, status,
                meal_plan, package_id, tax_included, promo_code, policies_json, activation_date, expiration_date,
                stay_date_start, stay_date_end, is_seasonal, season_name, season_start, season_end,
                valid_days_json, min_nights, max_nights, cut_off_days, closed_to_arrival,
                closed_to_departure, stop_sell, pricing_json, raw_json
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11, $12, $13, $14,
                $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25,
                $26, $27, $28, $29
            )
            ON CONFLICT (property_id, short_code)
            DO UPDATE SET 
                name = EXCLUDED.name,
                market_segment = EXCLUDED.market_segment,
                status = EXCLUDED.status,
                meal_plan = EXCLUDED.meal_plan,
                package_id = EXCLUDED.package_id,
                tax_included = EXCLUDED.tax_included,
                promo_code = EXCLUDED.promo_code,
                policies_json = EXCLUDED.policies_json,
                pricing_json = EXCLUDED.pricing_json,
                raw_json = EXCLUDED.raw_json
            RETURNING id;
        `, [
            ratePlanData.property_id, ratePlanData.name, ratePlanData.shortCode, ratePlanData.marketSegment,
            ratePlanData.currency, ratePlanData.description, ratePlanData.status, ratePlanData.mealPlan,
            ratePlanData.packageId, ratePlanData.taxIncluded, ratePlanData.promoCode, JSON.stringify(ratePlanData.policies),
            ratePlanData.activationDate, ratePlanData.expirationDate, ratePlanData.stayDateStart, ratePlanData.stayDateEnd,
            ratePlanData.isSeasonal, ratePlanData.seasonName, ratePlanData.seasonStart, ratePlanData.seasonEnd,
            JSON.stringify(ratePlanData.validDays), ratePlanData.minNights, ratePlanData.maxNights, ratePlanData.cutOffDays,
            ratePlanData.closedToArrival, ratePlanData.closedToDeparture, ratePlanData.stopSell,
            JSON.stringify(ratePlanData.pricing), JSON.stringify(ratePlanData)
        ]);

        const ratePlanId = planRes.rows[0].id;
        console.log('✅ Rate Plan created/updated with ID:', ratePlanId);

        console.log('--- ALL THREE ENTITIES SYNCED IN POSTGRES! ---');
    } finally {
        client.release();
        await pgPool.end();
    }
}

seed().catch(err => {
    console.error('SEED FAILED:', err);
    process.exit(1);
});
