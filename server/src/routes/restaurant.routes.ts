import { Router, Request, Response } from 'express';
import { pgPool } from '../database/postgres.js';

const router = Router();

// Helper for pure PostgreSQL query
async function queryRows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const res = await pgPool.query(sql, params);
    return res.rows as T[];
}

async function queryRow<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await queryRows<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OUTLETS CRUD & 1-CLICK CLONE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/restaurant/outlets - List all outlets
router.get('/outlets', async (req: Request, res: Response) => {
    try {
        const propertyId = req.query.propertyId as string;
        const department = (req.query.department || req.query.departmentCategory) as string;
        let sql = `
            SELECT o.*,
                (SELECT COUNT(*) FROM restaurant_tables t WHERE t.outlet_id = o.id) as total_tables,
                (SELECT COUNT(*) FROM pos_menu_items m WHERE m.outlet_id = o.id) as total_menu_items,
                (SELECT COUNT(*) FROM pos_kitchen_stations k WHERE k.outlet_id = o.id) as total_kitchen_stations,
                (SELECT COUNT(*) FROM pos_orders po WHERE po.outlet_id = o.id AND po.status IN ('PENDING','CONFIRMED','PREPARING','READY','SERVED')) as active_orders_count
            FROM restaurant_outlets o
            WHERE 1=1
        `;
        const params: any[] = [];
        if (propertyId) {
            params.push(propertyId);
            sql += ` AND o.property_id = $${params.length}`;
        }
        if (department && department !== 'ALL') {
            params.push(department);
            sql += ` AND o.department_category = $${params.length}`;
        }
        sql += ` ORDER BY o.name ASC`;
        const outlets = await queryRows(sql, params);
        res.json({ success: true, data: outlets });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// GET /api/restaurant/outlets/departments/summary - Active outlet counts grouped by department
router.get('/outlets/departments/summary', async (req: Request, res: Response) => {
    try {
        const propertyId = req.query.propertyId as string;
        let sql = `
            SELECT 
                COALESCE(department_category, 'FOOD_BEVERAGE') as department,
                COUNT(*)::int as count
            FROM restaurant_outlets
            WHERE status = 'ACTIVE'
        `;
        const params: any[] = [];
        if (propertyId) {
            params.push(propertyId);
            sql += ` AND property_id = $1`;
        }
        sql += ` GROUP BY department_category`;
        const rows = await queryRows<{ department: string; count: number }>(sql, params);
        const counts: Record<string, number> = {};
        const activeDepartments: string[] = [];
        for (const row of rows) {
            counts[row.department] = Number(row.count);
            if (Number(row.count) > 0) {
                activeDepartments.push(row.department);
            }
        }
        res.json({ success: true, data: { counts, activeDepartments } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// GET /api/restaurant/outlets/:id - Get single outlet
router.get('/outlets/:id', async (req: Request, res: Response) => {
    try {
        const outlet = await queryRow(`SELECT * FROM restaurant_outlets WHERE id = $1`, [req.params.id]);
        if (!outlet) return res.status(404).json({ success: false, error: 'Outlet not found' });
        res.json({ success: true, data: outlet });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// POST /api/restaurant/outlets - Create new outlet
router.post('/outlets', async (req: Request, res: Response) => {
    try {
        const {
            propertyId = 'prop-001',
            name,
            code,
            description = '',
            outletType = 'DINE_IN_RESTAURANT',
            departmentCategory = 'FOOD_BEVERAGE',
            catalogType = 'RESTAURANT_MENU',
            allowsBarcodeScan = false,
            requiresAppointment = false,
            physicalLocation = '',
            acceptedPaymentMethods = ['Cash', 'Card', 'Room-Charge'],
            assignedTerminalIds = [],
            hardwareSettings = {},
            venueDimensions = { lengthFeet: 0, widthFeet: 0, heightFeet: 0, totalSqFt: 0, carpetAreaSqFt: 0 },
            seatingCapacities = { theatre: 0, classroom: 0, banquet: 0, ushape: 0, cocktail: 0, boardroom: 0 },
            rentalTariffs = { hourlyRate: 0, halfDayRate: 0, fullDayRate: 0, eveningRate: 0, cleaningFee: 0 },
            operatingHours = { open: '07:00', close: '23:30', is24Hours: false, days: ['MON','TUE','WED','THU','FRI','SAT','SUN'] },
            requiresTable = true,
            allowRoomCharge = true,
            autoGenerateKot = true,
            taxMode = 'STATUTORY_NBR',
            taxConfigurationId = null,
            vatRate = 0.00,
            serviceChargeRate = 0.00,
            cityTaxRate = 0.00,
            revenueHeadCode = '10020-01',
            receiptHeader = '',
            receiptFooter = 'Thank you for your business!',
            binNumber = '',
            createDefaultStations = true
        } = req.body;

        if (!name || !code) {
            return res.status(400).json({ success: false, error: 'Name and Code are required' });
        }

        const id = `outlet-${Date.now()}`;
        const sanitizedCode = String(code).toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '-');

        const insertSql = `
            INSERT INTO restaurant_outlets (
                id, property_id, name, code, description, outlet_type,
                department_category, catalog_type, allows_barcode_scan, requires_appointment, physical_location,
                accepted_payment_methods, assigned_terminal_ids, hardware_settings,
                venue_dimensions, seating_capacities, rental_tariffs,
                operating_hours, requires_table, allow_room_charge, auto_generate_kot,
                tax_mode, tax_configuration_id, vat_rate, service_charge_rate, city_tax_rate, revenue_head_code,
                receipt_header, receipt_footer, bin_number, status
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11,
                $12, $13, $14,
                $15, $16, $17,
                $18, $19, $20, $21,
                $22, $23, $24, $25, $26, $27,
                $28, $29, $30, 'ACTIVE'
            )
            RETURNING *;
        `;
        const outlet = await queryRow(insertSql, [
            id, propertyId, name, sanitizedCode, description, outletType,
            departmentCategory, catalogType, allowsBarcodeScan, requiresAppointment, physicalLocation,
            JSON.stringify(acceptedPaymentMethods), JSON.stringify(assignedTerminalIds), JSON.stringify(hardwareSettings),
            JSON.stringify(venueDimensions), JSON.stringify(seatingCapacities), JSON.stringify(rentalTariffs),
            JSON.stringify(operatingHours), requiresTable, allowRoomCharge, autoGenerateKot,
            taxMode, taxConfigurationId, vatRate, serviceChargeRate, cityTaxRate, revenueHeadCode,
            receiptHeader || name, receiptFooter, binNumber
        ]);

        // Auto-provision 1 default floor & stations if requested and applicable
        if (createDefaultStations && departmentCategory !== 'RETAIL_SHOP' && departmentCategory !== 'FRONT_OFFICE') {
            const floorId = `floor-${id}-g`;
            await pgPool.query(`
                INSERT INTO restaurant_floors (id, outlet_id, name, floor_number, description, is_main, status)
                VALUES ($1, $2, 'Main Area', 0, 'Default service area', TRUE, 'active');
            `, [floorId, id]);

            if (requiresTable) {
                await pgPool.query(`
                    INSERT INTO restaurant_tables (id, outlet_id, floor_id, table_number, code, name, capacity, status, pos_x, pos_y)
                    VALUES 
                        ($1, $2, $3, 1, 'T-01', 'Table 1', 4, 'VACANT', 50, 60),
                        ($4, $2, $3, 2, 'T-02', 'Table 2', 4, 'VACANT', 180, 60),
                        ($5, $2, $3, 3, 'T-03', 'Table 3', 6, 'VACANT', 310, 60);
                `, [`tbl-${id}-01`, id, floorId, `tbl-${id}-02`, `tbl-${id}-03`]);
            }

            if (autoGenerateKot) {
                await pgPool.query(`
                    INSERT INTO pos_kitchen_stations (id, outlet_id, name, code, description, status)
                    VALUES 
                        ($1, $2, 'Service Prep Station', 'PREP_MAIN', 'Main order fulfillment station', 'active');
                `, [`ks-${id}-main`, id]);
            }
        }

        res.status(201).json({ success: true, data: outlet, message: 'Outlet created successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// PATCH /api/restaurant/outlets/:id - Update outlet
router.patch('/outlets/:id', async (req: Request, res: Response) => {
    try {
        const {
            name, code, description, outletType,
            departmentCategory, catalogType, allowsBarcodeScan, requiresAppointment, physicalLocation,
            acceptedPaymentMethods, assignedTerminalIds, hardwareSettings,
            venueDimensions, seatingCapacities, rentalTariffs,
            operatingHours, requiresTable, allowRoomCharge, autoGenerateKot,
            taxMode, taxConfigurationId, vatRate, serviceChargeRate, cityTaxRate, revenueHeadCode,
            receiptHeader, receiptFooter, binNumber, status
        } = req.body;

        const existing = await queryRow(`SELECT * FROM restaurant_outlets WHERE id = $1`, [req.params.id]);
        if (!existing) return res.status(404).json({ success: false, error: 'Outlet not found' });

        const updated = await queryRow(`
            UPDATE restaurant_outlets SET
                name = COALESCE($1, name),
                code = COALESCE($2, code),
                description = COALESCE($3, description),
                outlet_type = COALESCE($4, outlet_type),
                department_category = COALESCE($5, department_category),
                catalog_type = COALESCE($6, catalog_type),
                allows_barcode_scan = COALESCE($7, allows_barcode_scan),
                requires_appointment = COALESCE($8, requires_appointment),
                physical_location = COALESCE($9, physical_location),
                accepted_payment_methods = COALESCE($10, accepted_payment_methods),
                assigned_terminal_ids = COALESCE($11, assigned_terminal_ids),
                hardware_settings = COALESCE($12, hardware_settings),
                venue_dimensions = COALESCE($13, venue_dimensions),
                seating_capacities = COALESCE($14, seating_capacities),
                rental_tariffs = COALESCE($15, rental_tariffs),
                operating_hours = COALESCE($16, operating_hours),
                requires_table = COALESCE($17, requires_table),
                allow_room_charge = COALESCE($18, allow_room_charge),
                auto_generate_kot = COALESCE($19, auto_generate_kot),
                tax_mode = COALESCE($20, tax_mode),
                tax_configuration_id = COALESCE($21, tax_configuration_id),
                vat_rate = COALESCE($22, vat_rate),
                service_charge_rate = COALESCE($23, service_charge_rate),
                city_tax_rate = COALESCE($24, city_tax_rate),
                revenue_head_code = COALESCE($25, revenue_head_code),
                receipt_header = COALESCE($26, receipt_header),
                receipt_footer = COALESCE($27, receipt_footer),
                bin_number = COALESCE($28, bin_number),
                status = COALESCE($29, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $30
            RETURNING *;
        `, [
            name, code, description, outletType,
            departmentCategory, catalogType, allowsBarcodeScan, requiresAppointment, physicalLocation,
            acceptedPaymentMethods ? JSON.stringify(acceptedPaymentMethods) : null,
            assignedTerminalIds ? JSON.stringify(assignedTerminalIds) : null,
            hardwareSettings ? JSON.stringify(hardwareSettings) : null,
            venueDimensions ? JSON.stringify(venueDimensions) : null,
            seatingCapacities ? JSON.stringify(seatingCapacities) : null,
            rentalTariffs ? JSON.stringify(rentalTariffs) : null,
            operatingHours ? JSON.stringify(operatingHours) : null,
            requiresTable, allowRoomCharge, autoGenerateKot,
            taxMode, taxConfigurationId, vatRate, serviceChargeRate, cityTaxRate, revenueHeadCode,
            receiptHeader, receiptFooter, binNumber, status, req.params.id
        ]);

        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// POST /api/restaurant/outlets/:id/clone - 1-Click Zero-Friction Cloner
router.post('/outlets/:id/clone', async (req: Request, res: Response) => {
    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');
        const sourceOutletId = req.params.id;
        const { targetOutletName, targetOutletCode, priceMarkupPercent = 0, copyTables = false, propertyId } = req.body;

        const sourceRes = await client.query(`SELECT * FROM restaurant_outlets WHERE id = $1`, [sourceOutletId]);
        const source = sourceRes.rows[0];
        if (!source) throw new Error('Source outlet not found');

        const newOutletId = `outlet-${Date.now()}`;
        const newCode = (targetOutletCode || `${source.code}-CLONE`).toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '-');
        const targetPropertyId = propertyId || source.property_id;

        // 1. Create target outlet
        await client.query(`
            INSERT INTO restaurant_outlets (
                id, property_id, name, code, description, outlet_type,
                department_category, catalog_type, allows_barcode_scan, requires_appointment, physical_location,
                accepted_payment_methods, assigned_terminal_ids, hardware_settings,
                venue_dimensions, seating_capacities, rental_tariffs,
                operating_hours, requires_table, allow_room_charge, auto_generate_kot,
                tax_mode, tax_configuration_id, vat_rate, service_charge_rate, city_tax_rate, revenue_head_code,
                receipt_header, receipt_footer, bin_number, cloned_from_id, status
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11,
                $12, $13, $14,
                $15, $16, $17,
                $18, $19, $20, $21,
                $22, $23, $24, $25, $26, $27,
                $28, $29, $30, $31, 'ACTIVE'
            );
        `, [
            newOutletId, targetPropertyId, targetOutletName || `${source.name} (Copy)`, newCode,
            source.description, source.outlet_type,
            source.department_category || 'FOOD_BEVERAGE', source.catalog_type || 'RESTAURANT_MENU',
            Boolean(source.allows_barcode_scan), Boolean(source.requires_appointment), source.physical_location || '',
            JSON.stringify(source.accepted_payment_methods || ["Cash", "Card", "Room-Charge"]),
            JSON.stringify(source.assigned_terminal_ids || []),
            JSON.stringify(source.hardware_settings || {}),
            JSON.stringify(source.venue_dimensions || {}),
            JSON.stringify(source.seating_capacities || {}),
            JSON.stringify(source.rental_tariffs || {}),
            source.operating_hours, source.requires_table,
            source.allow_room_charge, source.auto_generate_kot, source.tax_mode, source.tax_configuration_id, source.vat_rate,
            source.service_charge_rate, source.city_tax_rate, source.revenue_head_code,
            targetOutletName || source.receipt_header, source.receipt_footer, source.bin_number, sourceOutletId
        ]);

        // 2. Clone Kitchen Stations
        const stationsRes = await client.query(`SELECT * FROM pos_kitchen_stations WHERE outlet_id = $1`, [sourceOutletId]);
        const stations = stationsRes.rows;
        for (const st of stations) {
            await client.query(`
                INSERT INTO pos_kitchen_stations (id, outlet_id, name, code, description, printer_ip, category_routing, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
            `, [`ks-${newOutletId}-${st.code}`, newOutletId, st.name, st.code, st.description, st.printer_ip, JSON.stringify(st.category_routing || []), st.status]);
        }

        // 3. Clone Categories (Map old IDs to new IDs)
        const categoriesRes = await client.query(`SELECT * FROM pos_categories WHERE outlet_id = $1 ORDER BY parent_id NULLS FIRST`, [sourceOutletId]);
        const categories = categoriesRes.rows;
        const catMap = new Map<string, string>();
        for (const cat of categories) {
            const newCatId = `cat-${newOutletId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            catMap.set(cat.id, newCatId);
            const parentId = cat.parent_id ? catMap.get(cat.parent_id) || null : null;
            await client.query(`
                INSERT INTO pos_categories (id, outlet_id, name, sort_order, icon, parent_id, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7);
            `, [newCatId, newOutletId, cat.name, cat.sort_order, cat.icon, parentId, cat.status]);
        }

        // 4. Clone Addons
        const addonsRes = await client.query(`SELECT * FROM pos_addons WHERE outlet_id = $1`, [sourceOutletId]);
        const addons = addonsRes.rows;
        const addonMap = new Map<string, string>();
        for (const add of addons) {
            const newAddonId = `addon-${newOutletId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            addonMap.set(add.id, newAddonId);
            const price = Number(add.price) * (1 + priceMarkupPercent / 100);
            await client.query(`
                INSERT INTO pos_addons (id, outlet_id, name, description, price, cost_price, sort_order, image_url, status, recipe_json)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
            `, [newAddonId, newOutletId, add.name, add.description, price.toFixed(2), add.cost_price, add.sort_order, add.image_url, add.status, JSON.stringify(add.recipe_json || [])]);
        }

        // 5. Clone Menu Items (with independent copies and optional markup)
        const itemsRes = await client.query(`SELECT * FROM pos_menu_items WHERE outlet_id = $1`, [sourceOutletId]);
        const items = itemsRes.rows;
        for (const item of items) {
            const newItemId = `item-${newOutletId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const newCatId = catMap.get(item.category_id) || item.category_id;
            const newSubCatId = item.sub_category_id ? catMap.get(item.sub_category_id) || null : null;
            const adjustedPrice = (Number(item.price) * (1 + priceMarkupPercent / 100)).toFixed(2);
            
            // Adjust variations prices too
            let variations = item.variations || [];
            if (Array.isArray(variations)) {
                variations = variations.map((v: any) => ({
                    ...v,
                    price: Number((Number(v.price) * (1 + priceMarkupPercent / 100)).toFixed(2))
                }));
            }

            // Remap addon IDs
            let mappedAddons: string[] = [];
            if (Array.isArray(item.addons)) {
                mappedAddons = item.addons.map((aid: string) => addonMap.get(aid) || aid);
            }

            await client.query(`
                INSERT INTO pos_menu_items (
                    id, outlet_id, name, description, price, product_code, slug,
                    category_id, sub_category_id, prep_station, prep_time_estimate, sort_order,
                    is_available, is_featured, image_url, allergens, tags, variations, combo_items, addons,
                    tax_group_id, is_tax_inclusive
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22);
            `, [
                newItemId, newOutletId, item.name, item.description, adjustedPrice, item.product_code, `${item.slug}-${newCode.toLowerCase()}`,
                newCatId, newSubCatId, item.prep_station, item.prep_time_estimate, item.sort_order,
                item.is_available, item.is_featured, item.image_url, JSON.stringify(item.allergens || []),
                JSON.stringify(item.tags || []), JSON.stringify(variations), JSON.stringify(item.combo_items || []),
                JSON.stringify(mappedAddons), item.tax_group_id, item.is_tax_inclusive
            ]);
        }

        // 6. Optional: Clone Floors and Tables
        if (copyTables) {
            const floorsRes = await client.query(`SELECT * FROM restaurant_floors WHERE outlet_id = $1`, [sourceOutletId]);
            const floors = floorsRes.rows;
            const floorMap = new Map<string, string>();
            for (const fl of floors) {
                const newFloorId = `floor-${newOutletId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                floorMap.set(fl.id, newFloorId);
                await client.query(`
                    INSERT INTO restaurant_floors (id, outlet_id, name, floor_number, description, is_main, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7);
                `, [newFloorId, newOutletId, fl.name, fl.floor_number, fl.description, fl.is_main, fl.status]);
            }

            const tablesRes = await client.query(`SELECT * FROM restaurant_tables WHERE outlet_id = $1`, [sourceOutletId]);
            const tables = tablesRes.rows;
            for (const tb of tables) {
                const newFloorId = tb.floor_id ? floorMap.get(tb.floor_id) || null : null;
                await client.query(`
                    INSERT INTO restaurant_tables (id, outlet_id, floor_id, table_number, code, name, capacity, status, is_vip, pos_x, pos_y)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'VACANT', $8, $9, $10);
                `, [`tbl-${newOutletId}-${tb.table_number}`, newOutletId, newFloorId, tb.table_number, tb.code, tb.name, tb.capacity, tb.is_vip, tb.pos_x, tb.pos_y]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            data: { newOutletId, code: newCode },
            message: `Successfully cloned ${items.length} items and ${categories.length} categories to new outlet ${newCode}`
        });
    } catch (e: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: e?.message });
    } finally {
        client.release();
    }
});

// DELETE /api/restaurant/outlets/:id - Delete or archive outlet
router.delete('/outlets/:id', async (req: Request, res: Response) => {
    try {
        const outletId = req.params.id;
        const activeOrders = await queryRows(`
            SELECT id FROM pos_orders WHERE outlet_id = $1 AND status IN ('PENDING','CONFIRMED','PREPARING','READY','SERVED')
        `, [outletId]);
        if (activeOrders.length > 0) {
            return res.status(400).json({ success: false, error: 'Cannot delete outlet with active unsettled orders. Please complete or cancel orders first.' });
        }
        await pgPool.query(`DELETE FROM restaurant_outlets WHERE id = $1`, [outletId]);
        res.json({ success: true, message: 'Outlet deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. FLOORS CRUD
// ─────────────────────────────────────────────────────────────────────────────

router.get('/floors', async (req: Request, res: Response) => {
    try {
        const outletId = req.query.outletId as string;
        let sql = `
            SELECT f.*,
                (SELECT COUNT(*) FROM restaurant_tables t WHERE t.floor_id = f.id) as tables_count,
                (SELECT COALESCE(SUM(capacity), 0) FROM restaurant_tables t WHERE t.floor_id = f.id) as total_capacity
            FROM restaurant_floors f
        `;
        const params: any[] = [];
        if (outletId) {
            sql += ` WHERE f.outlet_id = $1`;
            params.push(outletId);
        }
        sql += ` ORDER BY f.floor_number ASC, f.name ASC`;
        const floors = await queryRows(sql, params);
        res.json({ success: true, data: floors });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.post('/floors', async (req: Request, res: Response) => {
    try {
        const { outletId, name, floorNumber = 0, description = '', isMain = false, status = 'active' } = req.body;
        if (!outletId || !name) return res.status(400).json({ success: false, error: 'outletId and name are required' });
        const id = `floor-${Date.now()}`;
        const inserted = await queryRow(`
            INSERT INTO restaurant_floors (id, outlet_id, name, floor_number, description, is_main, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `, [id, outletId, name, floorNumber, description, isMain, status]);
        res.status(201).json({ success: true, data: inserted });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.patch('/floors/:id', async (req: Request, res: Response) => {
    try {
        const { name, floorNumber, description, isMain, status } = req.body;
        const updated = await queryRow(`
            UPDATE restaurant_floors SET
                name = COALESCE($1, name),
                floor_number = COALESCE($2, floor_number),
                description = COALESCE($3, description),
                is_main = COALESCE($4, is_main),
                status = COALESCE($5, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 RETURNING *;
        `, [name, floorNumber, description, isMain, status, req.params.id]);
        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.delete('/floors/:id', async (req: Request, res: Response) => {
    try {
        await pgPool.query(`DELETE FROM restaurant_floors WHERE id = $1`, [req.params.id]);
        res.json({ success: true, message: 'Floor deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. TABLES CRUD & 2D VISUAL POSITIONS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/tables', async (req: Request, res: Response) => {
    try {
        const { outletId, floorId, status } = req.query as any;
        let sql = `
            SELECT t.*, f.name as floor_name,
                (SELECT json_build_object(
                    'id', o.id, 'orderNumber', o.order_number, 'status', o.status,
                    'totalAmount', o.total_amount, 'guestCount', o.guest_count,
                    'customerName', o.customer_name, 'createdAt', o.created_at
                ) FROM pos_orders o WHERE o.id = t.active_order_id) as active_order
            FROM restaurant_tables t
            LEFT JOIN restaurant_floors f ON f.id = t.floor_id
            WHERE 1=1
        `;
        const params: any[] = [];
        if (outletId) {
            params.push(outletId);
            sql += ` AND t.outlet_id = $${params.length}`;
        }
        if (floorId && floorId !== 'All' && floorId !== 'All floors') {
            params.push(floorId);
            sql += ` AND t.floor_id = $${params.length}`;
        }
        if (status && status !== 'All statuses') {
            params.push(status);
            sql += ` AND t.status = $${params.length}`;
        }
        sql += ` ORDER BY t.table_number ASC`;
        const tables = await queryRows(sql, params);
        res.json({ success: true, data: tables });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.post('/tables', async (req: Request, res: Response) => {
    try {
        const { outletId, floorId, tableNumber, code, name, capacity = 4, isVip = false, posX = 0, posY = 0 } = req.body;
        if (!outletId || !tableNumber) return res.status(400).json({ success: false, error: 'outletId and tableNumber are required' });
        const id = `tbl-${outletId}-${tableNumber}`;
        const inserted = await queryRow(`
            INSERT INTO restaurant_tables (id, outlet_id, floor_id, table_number, code, name, capacity, is_vip, pos_x, pos_y, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'VACANT')
            ON CONFLICT (outlet_id, table_number) DO UPDATE SET
                floor_id = EXCLUDED.floor_id,
                code = EXCLUDED.code,
                name = EXCLUDED.name,
                capacity = EXCLUDED.capacity,
                is_vip = EXCLUDED.is_vip
            RETURNING *;
        `, [id, outletId, floorId || null, tableNumber, code || `T-${tableNumber}`, name || `Table ${tableNumber}`, capacity, isVip, posX, posY]);
        res.status(201).json({ success: true, data: inserted });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.patch('/tables/:id', async (req: Request, res: Response) => {
    try {
        const { floorId, code, name, capacity, isVip, status, posX, posY } = req.body;
        const updated = await queryRow(`
            UPDATE restaurant_tables SET
                floor_id = COALESCE($1, floor_id),
                code = COALESCE($2, code),
                name = COALESCE($3, name),
                capacity = COALESCE($4, capacity),
                is_vip = COALESCE($5, is_vip),
                status = COALESCE($6, status),
                pos_x = COALESCE($7, pos_x),
                pos_y = COALESCE($8, pos_y),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9 RETURNING *;
        `, [floorId, code, name, capacity, isVip, status, posX, posY, req.params.id]);
        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.patch('/tables/:id/status', async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const updated = await queryRow(`
            UPDATE restaurant_tables SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;
        `, [status, req.params.id]);
        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// PATCH /api/restaurant/tables/bulk/positions - Batch update positions from 2D Canvas Drag-and-Drop
router.patch('/tables/bulk/positions', async (req: Request, res: Response) => {
    const client = await pgPool.connect();
    try {
        await client.query('BEGIN');
        const { positions } = req.body; // Array of { id, posX, posY }
        if (Array.isArray(positions)) {
            for (const pos of positions) {
                await client.query(`
                    UPDATE restaurant_tables SET pos_x = $1, pos_y = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3;
                `, [pos.posX, pos.posY, pos.id]);
            }
        }
        await client.query('COMMIT');
        res.json({ success: true, message: 'Table positions saved' });
    } catch (e: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: e?.message });
    } finally {
        client.release();
    }
});

router.delete('/tables/:id', async (req: Request, res: Response) => {
    try {
        await pgPool.query(`DELETE FROM restaurant_tables WHERE id = $1`, [req.params.id]);
        res.json({ success: true, message: 'Table deleted' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. CATEGORIES CRUD
// ─────────────────────────────────────────────────────────────────────────────

router.get('/categories', async (req: Request, res: Response) => {
    try {
        const outletId = req.query.outletId as string;
        let sql = `
            SELECT c.*,
                (SELECT COUNT(*) FROM pos_menu_items m WHERE m.category_id = c.id) as items_count,
                (SELECT json_build_object('id', p.id, 'name', p.name) FROM pos_categories p WHERE p.id = c.parent_id) as parent
            FROM pos_categories c
        `;
        const params: any[] = [];
        if (outletId) {
            sql += ` WHERE c.outlet_id = $1`;
            params.push(outletId);
        }
        sql += ` ORDER BY c.sort_order ASC, c.name ASC`;
        const categories = await queryRows(sql, params);
        res.json({ success: true, data: categories });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.post('/categories', async (req: Request, res: Response) => {
    try {
        const { outletId, name, sortOrder = 0, icon = 'Utensils', parentId = null, status = 'active' } = req.body;
        if (!outletId || !name) return res.status(400).json({ success: false, error: 'outletId and name are required' });
        const id = `cat-${Date.now()}`;
        const inserted = await queryRow(`
            INSERT INTO pos_categories (id, outlet_id, name, sort_order, icon, parent_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `, [id, outletId, name, sortOrder, icon, parentId || null, status]);
        res.status(201).json({ success: true, data: inserted });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.patch('/categories/:id', async (req: Request, res: Response) => {
    try {
        const { name, sortOrder, icon, parentId, status } = req.body;
        const updated = await queryRow(`
            UPDATE pos_categories SET
                name = COALESCE($1, name),
                sort_order = COALESCE($2, sort_order),
                icon = COALESCE($3, icon),
                parent_id = $4,
                status = COALESCE($5, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6 RETURNING *;
        `, [name, sortOrder, icon, parentId !== undefined ? (parentId || null) : undefined, status, req.params.id]);
        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.delete('/categories/:id', async (req: Request, res: Response) => {
    try {
        await pgPool.query(`DELETE FROM pos_categories WHERE id = $1`, [req.params.id]);
        res.json({ success: true, message: 'Category deleted' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADDONS & MODIFIERS CRUD
// ─────────────────────────────────────────────────────────────────────────────

router.get('/addons', async (req: Request, res: Response) => {
    try {
        const outletId = req.query.outletId as string;
        let sql = `SELECT * FROM pos_addons`;
        const params: any[] = [];
        if (outletId) {
            sql += ` WHERE outlet_id = $1`;
            params.push(outletId);
        }
        sql += ` ORDER BY sort_order ASC, name ASC`;
        const addons = await queryRows(sql, params);
        res.json({ success: true, data: addons });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.post('/addons', async (req: Request, res: Response) => {
    try {
        const { outletId, name, description = '', price = 0, costPrice = 0, sortOrder = 0, imageUrl = '', status = 'active', recipe = [] } = req.body;
        if (!outletId || !name) return res.status(400).json({ success: false, error: 'outletId and name are required' });
        const id = `addon-${Date.now()}`;
        const inserted = await queryRow(`
            INSERT INTO pos_addons (id, outlet_id, name, description, price, cost_price, sort_order, image_url, status, recipe_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
        `, [id, outletId, name, description, price, costPrice, sortOrder, imageUrl, status, JSON.stringify(recipe)]);
        res.status(201).json({ success: true, data: inserted });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.patch('/addons/:id', async (req: Request, res: Response) => {
    try {
        const { name, description, price, costPrice, sortOrder, imageUrl, status, recipe } = req.body;
        const updated = await queryRow(`
            UPDATE pos_addons SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                price = COALESCE($3, price),
                cost_price = COALESCE($4, cost_price),
                sort_order = COALESCE($5, sort_order),
                image_url = COALESCE($6, image_url),
                status = COALESCE($7, status),
                recipe_json = COALESCE($8, recipe_json),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9 RETURNING *;
        `, [name, description, price, costPrice, sortOrder, imageUrl, status, recipe ? JSON.stringify(recipe) : null, req.params.id]);
        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.delete('/addons/:id', async (req: Request, res: Response) => {
    try {
        await pgPool.query(`DELETE FROM pos_addons WHERE id = $1`, [req.params.id]);
        res.json({ success: true, message: 'Addon deleted' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. MENU ITEMS CRUD & CSV BULK IMPORT
// ─────────────────────────────────────────────────────────────────────────────

router.get('/items', async (req: Request, res: Response) => {
    try {
        const { outletId, categoryId, prepStation, search } = req.query as any;
        let sql = `
            SELECT m.*, c.name as category_name, sc.name as sub_category_name
            FROM pos_menu_items m
            LEFT JOIN pos_categories c ON c.id = m.category_id
            LEFT JOIN pos_categories sc ON sc.id = m.sub_category_id
            WHERE 1=1
        `;
        const params: any[] = [];
        if (outletId) {
            params.push(outletId);
            sql += ` AND m.outlet_id = $${params.length}`;
        }
        if (categoryId && categoryId !== 'All categories') {
            params.push(categoryId);
            sql += ` AND m.category_id = $${params.length}`;
        }
        if (prepStation && prepStation !== 'All stations') {
            params.push(prepStation);
            sql += ` AND m.prep_station = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            sql += ` AND (m.name ILIKE $${params.length} OR m.product_code ILIKE $${params.length} OR m.description ILIKE $${params.length})`;
        }
        sql += ` ORDER BY m.sort_order ASC, m.name ASC`;
        const items = await queryRows(sql, params);
        res.json({ success: true, data: items });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.get('/items/:id', async (req: Request, res: Response) => {
    try {
        const item = await queryRow(`
            SELECT m.*, c.name as category_name
            FROM pos_menu_items m
            LEFT JOIN pos_categories c ON c.id = m.category_id
            WHERE m.id = $1
        `, [req.params.id]);
        if (!item) return res.status(404).json({ success: false, error: 'Menu item not found' });
        const boms = await queryRows(`SELECT * FROM recipe_boms WHERE menu_item_id = $1`, [req.params.id]);
        res.json({ success: true, data: { ...item, bomItems: boms } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.post('/items', async (req: Request, res: Response) => {
    try {
        const {
            outletId, name, description = '', price = 0, productCode, slug,
            categoryId, subCategoryId, prepStation = 'GRILL_HOT', prepTimeEstimate = 15,
            sortOrder = 0, isAvailable = true, isFeatured = false, imageUrl = '',
            allergens = [], tags = [], variations = [], comboItems = [], addons = []
        } = req.body;

        if (!outletId || !name || !categoryId) {
            return res.status(400).json({ success: false, error: 'outletId, name and categoryId are required' });
        }

        const id = `item-${Date.now()}`;
        const itemSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const inserted = await queryRow(`
            INSERT INTO pos_menu_items (
                id, outlet_id, name, description, price, product_code, slug,
                category_id, sub_category_id, prep_station, prep_time_estimate, sort_order,
                is_available, is_featured, image_url, allergens, tags, variations, combo_items, addons
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            RETURNING *;
        `, [
            id, outletId, name, description, price, productCode || null, itemSlug,
            categoryId, subCategoryId || null, prepStation, prepTimeEstimate, sortOrder,
            isAvailable, isFeatured, imageUrl || null, JSON.stringify(allergens),
            JSON.stringify(tags), JSON.stringify(variations), JSON.stringify(comboItems), JSON.stringify(addons)
        ]);

        res.status(201).json({ success: true, data: inserted });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.patch('/items/:id', async (req: Request, res: Response) => {
    try {
        const {
            name, description, price, productCode, slug,
            categoryId, subCategoryId, prepStation, prepTimeEstimate, sortOrder,
            isAvailable, isFeatured, imageUrl, allergens, tags, variations, comboItems, addons
        } = req.body;

        const updated = await queryRow(`
            UPDATE pos_menu_items SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                price = COALESCE($3, price),
                product_code = COALESCE($4, product_code),
                slug = COALESCE($5, slug),
                category_id = COALESCE($6, category_id),
                sub_category_id = $7,
                prep_station = COALESCE($8, prep_station),
                prep_time_estimate = COALESCE($9, prep_time_estimate),
                sort_order = COALESCE($10, sort_order),
                is_available = COALESCE($11, is_available),
                is_featured = COALESCE($12, is_featured),
                image_url = COALESCE($13, image_url),
                allergens = COALESCE($14, allergens),
                tags = COALESCE($15, tags),
                variations = COALESCE($16, variations),
                combo_items = COALESCE($17, combo_items),
                addons = COALESCE($18, addons),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $19 RETURNING *;
        `, [
            name, description, price, productCode, slug,
            categoryId, subCategoryId !== undefined ? (subCategoryId || null) : undefined,
            prepStation, prepTimeEstimate, sortOrder,
            isAvailable, isFeatured, imageUrl,
            allergens ? JSON.stringify(allergens) : null,
            tags ? JSON.stringify(tags) : null,
            variations ? JSON.stringify(variations) : null,
            comboItems ? JSON.stringify(comboItems) : null,
            addons ? JSON.stringify(addons) : null,
            req.params.id
        ]);

        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.patch('/items/:id/availability', async (req: Request, res: Response) => {
    try {
        const { isAvailable } = req.body;
        const updated = await queryRow(`
            UPDATE pos_menu_items SET is_available = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;
        `, [isAvailable, req.params.id]);
        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.delete('/items/:id', async (req: Request, res: Response) => {
    try {
        await pgPool.query(`DELETE FROM pos_menu_items WHERE id = $1`, [req.params.id]);
        res.json({ success: true, message: 'Menu item deleted' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. KITCHEN STATIONS CRUD (100% Dynamic)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/kitchens', async (req: Request, res: Response) => {
    try {
        const outletId = req.query.outletId as string;
        let sql = `SELECT * FROM pos_kitchen_stations`;
        const params: any[] = [];
        if (outletId) {
            sql += ` WHERE outlet_id = $1`;
            params.push(outletId);
        }
        sql += ` ORDER BY name ASC`;
        const kitchens = await queryRows(sql, params);
        res.json({ success: true, data: kitchens });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.post('/kitchens', async (req: Request, res: Response) => {
    try {
        const { outletId, name, code, description = '', printerIp = '', categoryRouting = [], status = 'active' } = req.body;
        if (!outletId || !name || !code) return res.status(400).json({ success: false, error: 'outletId, name and code are required' });
        const id = `ks-${Date.now()}`;
        const inserted = await queryRow(`
            INSERT INTO pos_kitchen_stations (id, outlet_id, name, code, description, printer_ip, category_routing, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `, [id, outletId, name, code.toUpperCase().trim(), description, printerIp, JSON.stringify(categoryRouting), status]);
        res.status(201).json({ success: true, data: inserted });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.patch('/kitchens/:id', async (req: Request, res: Response) => {
    try {
        const { name, code, description, printerIp, categoryRouting, status } = req.body;
        const updated = await queryRow(`
            UPDATE pos_kitchen_stations SET
                name = COALESCE($1, name),
                code = COALESCE($2, code),
                description = COALESCE($3, description),
                printer_ip = COALESCE($4, printer_ip),
                category_routing = COALESCE($5, category_routing),
                status = COALESCE($6, status),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7 RETURNING *;
        `, [name, code ? code.toUpperCase().trim() : null, description, printerIp, categoryRouting ? JSON.stringify(categoryRouting) : null, status, req.params.id]);
        res.json({ success: true, data: updated });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

router.delete('/kitchens/:id', async (req: Request, res: Response) => {
    try {
        await pgPool.query(`DELETE FROM pos_kitchen_stations WHERE id = $1`, [req.params.id]);
        res.json({ success: true, message: 'Kitchen station deleted' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. BANQUET EVENT ORDERS (BEO) & FUNCTION SHEETS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/restaurant/beo - List banquet event orders
router.get('/beo', async (req: Request, res: Response) => {
    try {
        const { outletId, eventDate, status } = req.query as any;
        let sql = `
            SELECT b.*, o.name as outlet_name, o.code as outlet_code
            FROM banquet_event_orders b
            JOIN restaurant_outlets o ON o.id = b.outlet_id
            WHERE 1=1
        `;
        const params: any[] = [];
        if (outletId) {
            params.push(outletId);
            sql += ` AND b.outlet_id = $${params.length}`;
        }
        if (eventDate) {
            params.push(eventDate);
            sql += ` AND b.event_date = $${params.length}`;
        }
        if (status && status !== 'ALL') {
            params.push(status);
            sql += ` AND b.status = $${params.length}`;
        }
        sql += ` ORDER BY b.event_date ASC, b.start_time ASC`;
        const orders = await queryRows(sql, params);
        res.json({ success: true, data: orders });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message || 'Failed to fetch banquet orders' });
    }
});

// GET /api/restaurant/beo/:id - Get single BEO details
router.get('/beo/:id', async (req: Request, res: Response) => {
    try {
        const beo = await queryRow(`
            SELECT b.*, o.name as outlet_name, o.code as outlet_code, o.venue_dimensions, o.seating_capacities, o.rental_tariffs
            FROM banquet_event_orders b
            JOIN restaurant_outlets o ON o.id = b.outlet_id
            WHERE b.id = $1
        `, [req.params.id]);
        if (!beo) return res.status(404).json({ success: false, error: 'Banquet Event Order not found' });
        res.json({ success: true, data: beo });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// POST /api/restaurant/beo - Create Banquet Event Order
router.post('/beo', async (req: Request, res: Response) => {
    try {
        const {
            outletId,
            eventName,
            eventType = 'GALA_DINNER',
            hostName,
            hostPhone = '',
            hostEmail = '',
            companyName = '',
            eventDate,
            setupTime = '15:00',
            startTime = '18:00',
            endTime = '23:00',
            guaranteedPax = 50,
            expectedPax = 60,
            seatingStyle = 'BANQUET_ROUND',
            hallLayoutNotes = '',
            avChecklist = {},
            foodServiceSchedule = {},
            menuSelected = [],
            rentalTariff = 0,
            perPaxMenuRate = 0,
            totalAvAmount = 0,
            discountAmount = 0,
            advancePaid = 0,
            specialInstructions = ''
        } = req.body;

        if (!outletId) return res.status(400).json({ success: false, error: 'Outlet ID is required' });
        if (!eventName) return res.status(400).json({ success: false, error: 'Event name is required' });
        if (!hostName) return res.status(400).json({ success: false, error: 'Host name is required' });
        if (!eventDate) return res.status(400).json({ success: false, error: 'Event date is required' });

        // Calculate financials
        const numGuaranteed = Math.max(1, Number(guaranteedPax) || 1);
        const numMenuRate = Math.max(0, Number(perPaxMenuRate) || 0);
        const totalFood = numGuaranteed * numMenuRate;
        const numRental = Math.max(0, Number(rentalTariff) || 0);
        const numAv = Math.max(0, Number(totalAvAmount) || 0);
        const subtotal = numRental + totalFood + numAv;
        const numDiscount = Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
        const netBase = Math.max(0, subtotal - numDiscount);

        // Fetch statutory tax rate from outlet
        const outlet = await queryRow(`SELECT * FROM restaurant_outlets WHERE id = $1`, [outletId]);
        if (!outlet) return res.status(404).json({ success: false, error: 'Banquet outlet venue not found' });

        const scRate = Number(outlet.service_charge_rate || 0.00);
        const vatRate = Number(outlet.vat_rate || 0.00);
        const serviceCharge = Number((netBase * (scRate / 100)).toFixed(2));
        const vat = Number(((netBase + serviceCharge) * (vatRate / 100)).toFixed(2));
        const totalAmount = Number((netBase + serviceCharge + vat).toFixed(2));
        const numAdvance = Math.max(0, Number(advancePaid) || 0);
        const balanceDue = Number(Math.max(0, totalAmount - numAdvance).toFixed(2));

        // Generate sequential BEO Number: BEO-YYYYMM-XXXX
        const yearMonth = eventDate.slice(0, 7).replace('-', '');
        const countRes = await queryRow(`SELECT COUNT(*) as count FROM banquet_event_orders WHERE beo_number LIKE $1`, [`BEO-${yearMonth}-%`]);
        const seq = String(Number(countRes?.count || 0) + 1).padStart(4, '0');
        const beoNumber = `BEO-${yearMonth}-${seq}`;
        const beoId = `beo-${Date.now()}`;

        const newBeo = await queryRow(`
            INSERT INTO banquet_event_orders (
                id, property_id, outlet_id, beo_number, event_name, event_type,
                host_name, host_phone, host_email, company_name,
                event_date, setup_time, start_time, end_time,
                guaranteed_pax, expected_pax, seating_style, hall_layout_notes,
                av_checklist, food_service_schedule, menu_selected,
                rental_tariff, per_pax_menu_rate, total_food_amount, total_av_amount,
                subtotal, discount_amount, service_charge, vat, total_amount,
                advance_paid, balance_due, status, special_instructions
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10,
                $11, $12, $13, $14,
                $15, $16, $17, $18,
                $19, $20, $21,
                $22, $23, $24, $25,
                $26, $27, $28, $29, $30,
                $31, $32, 'CONFIRMED', $33
            ) RETURNING *;
        `, [
            beoId, Number(outlet.property_id) || 1, outletId, beoNumber, eventName, eventType,
            hostName, hostPhone, hostEmail, companyName,
            eventDate, setupTime, startTime, endTime,
            numGuaranteed, Number(expectedPax) || numGuaranteed, seatingStyle, hallLayoutNotes,
            JSON.stringify(avChecklist), JSON.stringify(foodServiceSchedule), JSON.stringify(menuSelected),
            numRental, numMenuRate, totalFood, numAv,
            subtotal, numDiscount, serviceCharge, vat, totalAmount,
            numAdvance, balanceDue, specialInstructions
        ]);

        res.status(201).json({
            success: true,
            data: newBeo,
            message: `Banquet Event Order ${beoNumber} created successfully`
        });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

// DELETE /api/restaurant/beo/:id - Cancel BEO
router.delete('/beo/:id', async (req: Request, res: Response) => {
    try {
        await pgPool.query(`UPDATE banquet_event_orders SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
        res.json({ success: true, message: 'Banquet Event Order cancelled' });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e?.message });
    }
});

export default router;
