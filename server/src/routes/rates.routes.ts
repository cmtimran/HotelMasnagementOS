import { Router, Request, Response } from 'express';
import { pgPool } from '../database/postgres.js';
import { getDefaultActivePropertyId } from '../database/postgres.js';

const router = Router();

export const getReqPropertyId = (req: Request): number => {
    const raw = req.query.propertyId || req.headers['x-property-id'] || (req as any).propertyId || (req as any).user?.propertyId || req.body?.propertyId;
    if (raw !== undefined && raw !== null && raw !== '') {
        const num = Number(raw);
        if (!isNaN(num) && num > 0) return num;
    }
    const def = Number(getDefaultActivePropertyId());
    return !isNaN(def) && def > 0 ? def : 0;
};

// ============================================================================
// 1. RATE PLANS CRUD (/api/rates/plans)
// ============================================================================

// GET /api/rates/plans
router.get('/plans', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.json({ success: true, data: [] });
        }
        const rowsRes = await pgPool.query(`
            SELECT * FROM rate_plans WHERE property_id = $1 ORDER BY id ASC
        `, [propertyId]);
        const rows = rowsRes.rows as any[];

        const mapped = rows.map(r => {
            if (r.raw_json) {
                try {
                    const parsed = JSON.parse(r.raw_json);
                    return {
                        ...parsed,
                        id: r.id,
                        name: r.name,
                        shortCode: r.short_code,
                        status: r.status,
                        marketSegment: r.market_segment,
                        currency: r.currency,
                        description: r.description,
                        mealPlan: r.meal_plan
                    };
                } catch {}
            }
            return {
                id: r.id,
                name: r.name,
                shortCode: r.short_code,
                marketSegment: r.market_segment,
                currency: r.currency,
                description: r.description,
                status: r.status,
                mealPlan: r.meal_plan,
                packageId: r.package_id,
                taxIncluded: Boolean(r.tax_included),
                promoCode: r.promo_code,
                policies: r.policies_json ? JSON.parse(r.policies_json) : {
                    depositRequired: false,
                    depositAmount: 0,
                    depositType: 'Percentage',
                    cancellationType: 'Flexible',
                    cancellationDeadline: 24,
                    refundPercentage: 100
                },
                activationDate: r.activation_date || '2024-01-01',
                expirationDate: r.expiration_date || '2027-12-31',
                stayDateStart: r.stay_date_start,
                stayDateEnd: r.stay_date_end,
                isSeasonal: Boolean(r.is_seasonal),
                seasonName: r.season_name,
                seasonStart: r.season_start,
                seasonEnd: r.season_end,
                validDays: r.valid_days_json ? JSON.parse(r.valid_days_json) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                minNights: r.min_nights || 1,
                maxNights: r.max_nights,
                cutOffDays: r.cut_off_days || 0,
                closedToArrival: Boolean(r.closed_to_arrival),
                closedToDeparture: Boolean(r.closed_to_departure),
                stopSell: Boolean(r.stop_sell),
                pricing: r.pricing_json ? JSON.parse(r.pricing_json) : []
            };
        });

        res.json({ success: true, data: mapped });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch rate plans' });
    }
});

// POST /api/rates/plans
router.post('/plans', async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Valid Property ID is required' });
        }
        const name = body.name || 'New Rate Plan';
        const shortCode = (body.shortCode || `RP-${Date.now().toString().slice(-4)}`).toUpperCase();

        const result = await pgPool.query(`
            INSERT INTO rate_plans (
                property_id, name, short_code, market_segment, currency, description, status,
                meal_plan, package_id, tax_included, promo_code, policies_json, activation_date, expiration_date,
                stay_date_start, stay_date_end, is_seasonal, season_name, season_start, season_end,
                valid_days_json, min_nights, max_nights, cut_off_days, closed_to_arrival,
                closed_to_departure, stop_sell, pricing_json, raw_json
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
            RETURNING id
        `, [
            propertyId,
            name,
            shortCode,
            body.marketSegment || 'FIT / Direct',
            body.currency || 'BDT',
            body.description || '',
            body.status || 'Active',
            body.mealPlan || 'EP',
            body.packageId || null,
            Boolean(body.taxIncluded),
            body.promoCode || null,
            JSON.stringify(body.policies || {}),
            body.activationDate || null,
            body.expirationDate || null,
            body.stayDateStart || null,
            body.stayDateEnd || null,
            Boolean(body.isSeasonal),
            body.seasonName || null,
            body.seasonStart || null,
            body.seasonEnd || null,
            JSON.stringify(body.validDays || []),
            Number(body.minNights) || 1,
            body.maxNights ? Number(body.maxNights) : null,
            Number(body.cutOffDays) || 0,
            Boolean(body.closedToArrival),
            Boolean(body.closedToDeparture),
            Boolean(body.stopSell),
            JSON.stringify(body.pricing || []),
            JSON.stringify({ ...body, shortCode, name })
        ]);

        const newId = Number(result.rows[0]?.id);
        res.status(201).json({ success: true, data: { ...body, id: newId, shortCode, name } });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create rate plan' });
    }
});

// PUT /api/rates/plans/:id
router.put('/plans/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body || {};
        const name = body.name;
        const shortCode = body.shortCode ? body.shortCode.toUpperCase() : undefined;

        await pgPool.query(`
            UPDATE rate_plans
            SET name = COALESCE($1, name),
                short_code = COALESCE($2, short_code),
                market_segment = COALESCE($3, market_segment),
                currency = COALESCE($4, currency),
                description = COALESCE($5, description),
                status = COALESCE($6, status),
                meal_plan = COALESCE($7, meal_plan),
                package_id = COALESCE($8, package_id),
                tax_included = COALESCE($9, tax_included),
                policies_json = COALESCE($10, policies_json),
                pricing_json = COALESCE($11, pricing_json),
                raw_json = COALESCE($12, raw_json),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
        `, [
            name || null,
            shortCode || null,
            body.marketSegment || null,
            body.currency || null,
            body.description || null,
            body.status || null,
            body.mealPlan || null,
            body.packageId !== undefined ? body.packageId : null,
            body.taxIncluded !== undefined ? Boolean(body.taxIncluded) : null,
            body.policies ? JSON.stringify(body.policies) : null,
            body.pricing ? JSON.stringify(body.pricing) : null,
            JSON.stringify({ ...body, id, ...(shortCode ? { shortCode } : {}), ...(name ? { name } : {}) }),
            id
        ]);

        res.json({ success: true, message: 'Rate plan updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update rate plan' });
    }
});

// DELETE /api/rates/plans/:id
router.delete('/plans/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        await pgPool.query('DELETE FROM rate_plans WHERE id = $1', [id]);
        res.json({ success: true, message: 'Rate plan deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete rate plan' });
    }
});

// ============================================================================
// 2. MEAL PLANS CRUD (/api/rates/meal-plans)
// ============================================================================

// GET /api/rates/meal-plans
router.get('/meal-plans', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.json({ success: true, data: [] });
        }
        const rowsRes = await pgPool.query(`
            SELECT * FROM meal_plans WHERE property_id = $1 ORDER BY id ASC
        `, [propertyId]);
        const rows = rowsRes.rows as any[];

        const mapped = rows.map(r => {
            if (r.raw_json) {
                try {
                    const parsed = JSON.parse(r.raw_json);
                    return {
                        ...parsed,
                        id: r.id,
                        name: r.name,
                        marketingName: r.marketing_name,
                        shortCode: r.short_code,
                        status: r.status,
                        description: r.description
                    };
                } catch {}
            }
            return {
                id: r.id,
                name: r.name,
                marketingName: r.marketing_name || r.name,
                shortCode: r.short_code,
                description: r.description,
                status: r.status,
                hasBreakfast: Boolean(r.has_breakfast),
                breakfastMenu: r.breakfast_menu || '',
                breakfastStyle: r.breakfast_style || 'Buffet',
                breakfastVenue: r.breakfast_venue || '',
                breakfastCuisine: r.breakfast_cuisine || '',
                hasLunch: Boolean(r.has_lunch),
                lunchMenu: r.lunch_menu || '',
                lunchStyle: r.lunch_style || 'Buffet',
                lunchVenue: r.lunch_venue || '',
                lunchCuisine: r.lunch_cuisine || '',
                hasDinner: Boolean(r.has_dinner),
                dinnerMenu: r.dinner_menu || '',
                dinnerStyle: r.dinner_style || 'Buffet',
                dinnerVenue: r.dinner_venue || '',
                dinnerCuisine: r.dinner_cuisine || '',
                hasBrunch: Boolean(r.has_brunch),
                brunchMenu: r.brunch_menu || '',
                brunchStyle: r.brunch_style || 'Buffet',
                brunchVenue: r.brunch_venue || '',
                brunchCuisine: r.brunch_cuisine || '',
                hasCupole: Boolean(r.has_cupole),
                cupoleMenu: r.cupole_menu || '',
                cupoleStyle: r.cupole_style || 'Buffet',
                cupoleVenue: r.cupole_venue || '',
                cupoleCuisine: r.cupole_cuisine || '',
                hasSnacks: Boolean(r.has_snacks),
                snacksMenu: r.snacks_menu || '',
                snacksStyle: r.snacks_style || 'Buffet',
                snacksVenue: r.snacks_venue || '',
                snacksCuisine: r.snacks_cuisine || '',
                servingType: r.serving_type || 'Buffet',
                internalCost: Number(r.internal_cost) || 0,
                sellingPriceAdult: Number(r.selling_price_adult) || 0,
                sellingPriceChild: Number(r.selling_price_child) || 0,
                infantMealsFree: Boolean(r.infant_meals_free),
                maxInfantAge: Number(r.max_infant_age) || 5,
                postingFrequency: r.posting_frequency || 'Daily',
                revenueCode: r.revenue_code || 'REV-FB-MEAL',
                taxInclusive: Boolean(r.tax_inclusive),
                startTime: r.start_time || '07:00',
                endTime: r.end_time || '23:00',
                venue: r.venue || 'Main Restaurant'
            };
        });

        res.json({ success: true, data: mapped });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch meal plans' });
    }
});

// POST /api/rates/meal-plans
router.post('/meal-plans', async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Valid Property ID is required' });
        }
        const name = body.name || 'New Meal Plan';
        const shortCode = (body.shortCode || `MP-${Date.now().toString().slice(-4)}`).toUpperCase();

        const result = await pgPool.query(`
            INSERT INTO meal_plans (
                property_id, name, marketing_name, short_code, description, status,
                has_breakfast, breakfast_menu, breakfast_style, breakfast_venue, breakfast_cuisine,
                has_lunch, lunch_menu, lunch_style, lunch_venue, lunch_cuisine,
                has_dinner, dinner_menu, dinner_style, dinner_venue, dinner_cuisine,
                has_brunch, has_cupole, has_snacks, serving_type, internal_cost,
                selling_price_adult, selling_price_child, infant_meals_free, max_infant_age,
                posting_frequency, revenue_code, tax_inclusive, start_time, end_time, venue, raw_json
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)
            RETURNING id
        `, [
            propertyId,
            name,
            body.marketingName || name,
            shortCode,
            body.description || '',
            body.status || 'Active',
            Boolean(body.hasBreakfast),
            body.breakfastMenu || null,
            body.breakfastStyle || null,
            body.breakfastVenue || null,
            body.breakfastCuisine || null,
            Boolean(body.hasLunch),
            body.lunchMenu || null,
            body.lunchStyle || null,
            body.lunchVenue || null,
            body.lunchCuisine || null,
            Boolean(body.hasDinner),
            body.dinnerMenu || null,
            body.dinnerStyle || null,
            body.dinnerVenue || null,
            body.dinnerCuisine || null,
            Boolean(body.hasBrunch),
            Boolean(body.hasCupole),
            Boolean(body.hasSnacks),
            body.servingType || 'Buffet',
            Number(body.internalCost) || 0,
            Number(body.sellingPriceAdult) || 0,
            Number(body.sellingPriceChild) || 0,
            Boolean(body.infantMealsFree),
            Number(body.maxInfantAge) || 5,
            body.postingFrequency || 'Daily',
            body.revenueCode || 'REV-FB-MEAL',
            Boolean(body.taxInclusive),
            body.startTime || '07:00',
            body.endTime || '23:00',
            body.venue || 'Main Restaurant',
            JSON.stringify({ ...body, shortCode, name })
        ]);

        const newId = Number(result.rows[0]?.id);
        res.status(201).json({ success: true, data: { ...body, id: newId, shortCode, name } });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create meal plan' });
    }
});

// PUT /api/rates/meal-plans/:id
router.put('/meal-plans/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body || {};
        const name = body.name;
        const shortCode = body.shortCode ? body.shortCode.toUpperCase() : undefined;

        await pgPool.query(`
            UPDATE meal_plans
            SET name = COALESCE($1, name),
                marketing_name = COALESCE($2, marketing_name),
                short_code = COALESCE($3, short_code),
                description = COALESCE($4, description),
                status = COALESCE($5, status),
                selling_price_adult = COALESCE($6, selling_price_adult),
                selling_price_child = COALESCE($7, selling_price_child),
                raw_json = COALESCE($8, raw_json),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
        `, [
            name || null,
            body.marketingName || null,
            shortCode || null,
            body.description || null,
            body.status || null,
            body.sellingPriceAdult !== undefined ? Number(body.sellingPriceAdult) : null,
            body.sellingPriceChild !== undefined ? Number(body.sellingPriceChild) : null,
            JSON.stringify({ ...body, id, ...(shortCode ? { shortCode } : {}), ...(name ? { name } : {}) }),
            id
        ]);

        res.json({ success: true, message: 'Meal plan updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update meal plan' });
    }
});

// DELETE /api/rates/meal-plans/:id
router.delete('/meal-plans/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        await pgPool.query('DELETE FROM meal_plans WHERE id = $1', [id]);
        res.json({ success: true, message: 'Meal plan deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete meal plan' });
    }
});

// ============================================================================
// 3. HOTEL PACKAGES CRUD (/api/rates/packages)
// ============================================================================

// GET /api/rates/packages
router.get('/packages', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.json({ success: true, data: [] });
        }
        const rowsRes = await pgPool.query(`
            SELECT * FROM hotel_packages WHERE property_id = $1 ORDER BY id ASC
        `, [propertyId]);
        const rows = rowsRes.rows as any[];

        const mapped = rows.map(r => {
            if (r.raw_json) {
                try {
                    const parsed = JSON.parse(r.raw_json);
                    return {
                        ...parsed,
                        id: r.id,
                        name: r.name,
                        shortCode: r.short_code,
                        packageType: r.package_type,
                        status: r.status,
                        color: r.color,
                        description: r.description
                    };
                } catch {}
            }
            return {
                id: r.id,
                name: r.name,
                shortCode: r.short_code,
                packageType: r.package_type,
                status: r.status,
                color: r.color,
                description: r.description
            };
        });

        res.json({ success: true, data: mapped });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch packages' });
    }
});

// POST /api/rates/packages
router.post('/packages', async (req: Request, res: Response) => {
    try {
        const body = req.body || {};
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Valid Property ID is required' });
        }
        const name = body.name || 'New Package';
        const shortCode = (body.shortCode || `PKG-${Date.now().toString().slice(-4)}`).toUpperCase();

        const result = await pgPool.query(`
            INSERT INTO hotel_packages (property_id, name, short_code, package_type, status, color, description, raw_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [
            propertyId,
            name,
            shortCode,
            body.packageType || 'Standard',
            body.status || 'Active',
            body.color || '#3B82F6',
            body.description || '',
            JSON.stringify({ ...body, shortCode, name })
        ]);

        const newId = Number(result.rows[0]?.id);
        res.status(201).json({ success: true, data: { ...body, id: newId, shortCode, name } });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to create package' });
    }
});

// PUT /api/rates/packages/:id
router.put('/packages/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const body = req.body || {};
        const name = body.name;
        const shortCode = body.shortCode ? body.shortCode.toUpperCase() : undefined;

        await pgPool.query(`
            UPDATE hotel_packages
            SET name = COALESCE($1, name),
                short_code = COALESCE($2, short_code),
                package_type = COALESCE($3, package_type),
                status = COALESCE($4, status),
                color = COALESCE($5, color),
                description = COALESCE($6, description),
                raw_json = COALESCE($7, raw_json),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
        `, [
            name || null,
            shortCode || null,
            body.packageType || null,
            body.status || null,
            body.color || null,
            body.description || null,
            JSON.stringify({ ...body, id, ...(shortCode ? { shortCode } : {}), ...(name ? { name } : {}) }),
            id
        ]);

        res.json({ success: true, message: 'Package updated' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to update package' });
    }
});

// DELETE /api/rates/packages/:id
router.delete('/packages/:id', async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        await pgPool.query('DELETE FROM hotel_packages WHERE id = $1', [id]);
        res.json({ success: true, message: 'Package deleted' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to delete package' });
    }
});

// ============================================================================
// 4. RATE CALENDAR OVERRIDES (/api/rates/calendar)
// ============================================================================

// GET /api/rates/calendar
router.get('/calendar', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.json({ success: true, data: {} });
        }
        const roomType = req.query.roomType as string | undefined;

        let query = 'SELECT * FROM rate_calendar_overrides WHERE property_id = $1';
        const params: any[] = [propertyId];

        if (roomType) {
            query += ' AND room_type_name = $2';
            params.push(roomType);
        }
        query += ' ORDER BY date ASC';

        const rowsRes = await pgPool.query(query, params);
        const rows = rowsRes.rows as any[];

        // Group by room_type_name -> { date: DayRate }
        const ratesByRoomType: Record<string, Record<string, any>> = {};
        for (const row of rows) {
            const rt = row.room_type_name;
            if (!ratesByRoomType[rt]) ratesByRoomType[rt] = {};
            const dateStr = typeof row.date === 'string' ? row.date.slice(0, 10) : new Date(row.date).toISOString().slice(0, 10);
            ratesByRoomType[rt][dateStr] = {
                date: dateStr,
                rate: Number(row.rate),
                occupancy: Number(row.occupancy || 0),
                isWeekend: Boolean(row.is_weekend),
                isHoliday: Boolean(row.is_holiday),
                eventName: row.event_name || undefined
            };
        }

        res.json({ success: true, data: ratesByRoomType });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch calendar overrides' });
    }
});

// POST /api/rates/calendar/override - Single Day Override
router.post('/calendar/override', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Valid Property ID is required' });
        }
        const { roomType, date, rate, occupancy, isWeekend, isHoliday, eventName } = req.body;

        if (!roomType || !date || rate === undefined) {
            return res.status(400).json({ success: false, error: 'roomType, date, and rate are required' });
        }

        await pgPool.query(`
            INSERT INTO rate_calendar_overrides (property_id, room_type_name, date, rate, occupancy, is_weekend, is_holiday, event_name, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT(property_id, room_type_name, date) DO UPDATE SET
                rate = excluded.rate,
                occupancy = excluded.occupancy,
                is_weekend = excluded.is_weekend,
                is_holiday = excluded.is_holiday,
                event_name = excluded.event_name,
                updated_at = CURRENT_TIMESTAMP
        `, [propertyId, roomType, date, Number(rate), Number(occupancy || 0), Boolean(isWeekend), Boolean(isHoliday), eventName || null]);

        res.json({ success: true, message: `Override saved for ${roomType} on ${date}` });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to save rate override' });
    }
});

// POST /api/rates/calendar/bulk-override - Date Range Bulk Override
router.post('/calendar/bulk-override', async (req: Request, res: Response) => {
    try {
        const propertyId = getReqPropertyId(req);
        if (!propertyId) {
            return res.status(400).json({ success: false, error: 'Valid Property ID is required' });
        }
        const { roomType, startDate, endDate, rate, dayFilter } = req.body;

        if (!roomType || !startDate || !endDate || rate === undefined) {
            return res.status(400).json({ success: false, error: 'roomType, startDate, endDate, and rate are required' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const targetRate = Number(rate);

        const upsertQuery = `
            INSERT INTO rate_calendar_overrides (property_id, room_type_name, date, rate, is_weekend, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT(property_id, room_type_name, date) DO UPDATE SET
                rate = excluded.rate,
                is_weekend = excluded.is_weekend,
                updated_at = CURRENT_TIMESTAMP
        `;

        let count = 0;
        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Fri/Sat in BD

            let shouldApply = true;
            if (dayFilter === 'weekends' && !isWeekend) shouldApply = false;
            if (dayFilter === 'weekdays' && isWeekend) shouldApply = false;

            if (shouldApply) {
                const dateStr = current.toISOString().split('T')[0];
                await pgPool.query(upsertQuery, [propertyId, roomType, dateStr, targetRate, isWeekend]);
                count++;
            }

            current.setDate(current.getDate() + 1);
        }

        res.json({ success: true, message: `Updated ${count} day(s) for ${roomType}` });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e?.message || 'Failed to apply bulk rate overrides' });
    }
});

export default router;
