import { Router, Request, Response } from 'express';
import { pgPool } from '../database/postgres.js';
import { TenantConnectionManager } from '../database/TenantConnectionManager.js';

const router = Router();

/**
 * GET /api/central/tenants
 * List all registered tenants with database info and live status
 */
router.get('/tenants', async (_req: Request, res: Response) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                t.id, t.slug, t.name, t.db_name, t.db_host, t.db_port, t.status, 
                COALESCE(t.isolation_mode, 'DEDICATED') as isolation_mode,
                t.property_id,
                t.subscription_tier, t.admin_name, t.admin_email, t.created_at,
                COALESCE(m.total_rooms, 0) as total_rooms,
                COALESCE(m.occupied_rooms, 0) as occupied_rooms,
                COALESCE(m.revenue_bdt, 0) as revenue_bdt,
                COALESCE(
                    json_agg(p.plugin_key) FILTER (WHERE p.plugin_key IS NOT NULL AND p.status = 'ACTIVE'), 
                    '[]'
                ) as active_plugins
            FROM central_tenants t
            LEFT JOIN central_tenant_metrics m ON t.slug = m.tenant_slug
            LEFT JOIN central_tenant_plugins p ON t.slug = p.tenant_slug
            GROUP BY 
                t.id, t.slug, t.name, t.db_name, t.db_host, t.db_port, t.status, 
                t.isolation_mode, t.property_id,
                t.subscription_tier, t.admin_name, t.admin_email, t.created_at,
                m.total_rooms, m.occupied_rooms, m.revenue_bdt
            ORDER BY t.id ASC;
        `);

        // Compute Cluster Architecture Metrics
        const totalTenants = result.rows.length;
        const dedicatedCount = result.rows.filter(r => r.isolation_mode === 'DEDICATED').length;
        const sharedCount = result.rows.filter(r => r.isolation_mode === 'SHARED').length;

        res.json({
            success: true,
            data: result.rows,
            clusterOverview: {
                totalTenants,
                dedicatedTenants: dedicatedCount,
                sharedTenants: sharedCount,
                scalingCapacity: '10,000+ Tenants Supported (Hybrid Clustered)',
                activePoolsSaved: `${sharedCount > 0 ? sharedCount - 1 : 0} connection pools saved via High-Density Shared Engine`
            }
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/central/tenants
 * Hybrid Provisioning: Standard (High-Density Shared) or Enterprise (Dedicated Database)
 */
router.post('/tenants', async (req: Request, res: Response) => {
    try {
        const { slug, name, adminName, adminEmail, city, totalRooms, tier } = req.body;

        if (!slug || !name) {
            return res.status(400).json({
                success: false,
                error: 'Both slug and name are required to provision a new property.'
            });
        }

        const provisionResult = await TenantConnectionManager.provisionTenantDatabase({
            slug,
            name,
            adminName,
            adminEmail,
            city,
            totalRooms: totalRooms ? parseInt(totalRooms, 10) : 10,
            tier: tier === 'ENTERPRISE' ? 'ENTERPRISE' : 'STANDARD'
        });

        res.status(201).json({
            success: true,
            data: provisionResult
        });
    } catch (err: any) {
        console.error('Provisioning error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/central/tenants/:slug/upgrade
 * Promote a Standard (Shared) Tenant to an Enterprise Dedicated Physical Database
 */
router.post('/tenants/:slug/upgrade', async (req: Request, res: Response) => {
    try {
        const slug = String(req.params.slug);
        const upgradeResult = await TenantConnectionManager.upgradeTenantToDedicated(slug);
        res.json({ success: true, data: upgradeResult });
    } catch (err: any) {
        console.error('Upgrade error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/central/tenants/:slug/health
 * Inspect tenant isolated database connectivity and metrics
 */
router.get('/tenants/:slug/health', async (req: Request, res: Response) => {
    try {
        const slug = String(req.params.slug);
        const health = await TenantConnectionManager.checkTenantHealth(slug);
        res.json({ success: true, data: health });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * DELETE /api/central/tenants/:slug
 * Terminate, drop isolated database, and archive tenant
 */
router.delete('/tenants/:slug', async (req: Request, res: Response) => {
    try {
        const slug = String(req.params.slug);
        const result = await TenantConnectionManager.dropTenantDatabase(slug);
        res.json({ success: true, data: result });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/central/plugins
 * Catalog of all modular plugins available for tenant provisioning
 */
router.get('/plugins', async (_req: Request, res: Response) => {
    try {
        const result = await pgPool.query(`
            SELECT id, plugin_key, name, description, version, category, is_system, created_at 
            FROM central_plugins_catalog 
            ORDER BY category, name ASC;
        `);
        res.json({ success: true, data: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/central/tenants/:slug/plugins/toggle
 * Activate or deactivate a modular plugin for a specific tenant database
 */
router.post('/tenants/:slug/plugins/toggle', async (req: Request, res: Response) => {
    try {
        const slug = String(req.params.slug);
        const { pluginKey, enable } = req.body;

        if (!pluginKey) {
            return res.status(400).json({ success: false, error: 'pluginKey is required' });
        }

        // Verify plugin exists in catalog
        const catalogRes = await pgPool.query(
            'SELECT schema_ddl, name FROM central_plugins_catalog WHERE plugin_key = $1',
            [pluginKey]
        );
        if (catalogRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Plugin not found in catalog' });
        }

        if (enable) {
            // 1. If plugin has schema DDL, execute it in the isolated tenant database
            const ddl = catalogRes.rows[0].schema_ddl;
            if (ddl && ddl.trim()) {
                console.log(`🔌 [Plugin Engine] Executing schema DDL for '${pluginKey}' on tenant '${slug}'...`);
                await TenantConnectionManager.executeTenantMigration(slug, ddl);
            }

            // 2. Mark active in central registry
            await pgPool.query(`
                INSERT INTO central_tenant_plugins (tenant_slug, plugin_key, status)
                VALUES ($1, $2, 'ACTIVE')
                ON CONFLICT (tenant_slug, plugin_key) DO UPDATE SET status = 'ACTIVE';
            `, [slug, pluginKey]);

            res.json({
                success: true,
                message: `Plugin '${catalogRes.rows[0].name}' successfully activated and migrated for tenant '${slug}'!`
            });
        } else {
            // Deactivate
            await pgPool.query(`
                UPDATE central_tenant_plugins 
                SET status = 'DISABLED' 
                WHERE tenant_slug = $1 AND plugin_key = $2;
            `, [slug, pluginKey]);

            res.json({
                success: true,
                message: `Plugin '${catalogRes.rows[0].name}' disabled for tenant '${slug}'.`
            });
        }
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/central/custom-requests
 * View all custom module, schema, and feature change requests
 */
router.get('/custom-requests', async (_req: Request, res: Response) => {
    try {
        const result = await pgPool.query(`
            SELECT 
                r.*, 
                t.name as tenant_name,
                t.db_name
            FROM central_custom_requests r
            JOIN central_tenants t ON r.tenant_slug = t.slug
            ORDER BY 
                CASE r.status 
                    WHEN 'PENDING' THEN 1 
                    WHEN 'APPROVED' THEN 2 
                    ELSE 3 
                END,
                r.created_at DESC;
        `);
        res.json({ success: true, data: result.rows });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/central/custom-requests
 * Submit a new custom feature / schema / plugin request from a property
 */
router.post('/custom-requests', async (req: Request, res: Response) => {
    try {
        const { tenantSlug, requestType, title, description, targetModule, sqlMigration, requestedBy } = req.body;

        if (!tenantSlug || !title || !description) {
            return res.status(400).json({
                success: false,
                error: 'tenantSlug, title, and description are required.'
            });
        }

        const result = await pgPool.query(`
            INSERT INTO central_custom_requests (
                tenant_slug, request_type, title, description, target_module, 
                sql_migration, status, requested_by
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7)
            RETURNING *;
        `, [
            tenantSlug,
            requestType || 'PLUGIN_ACTIVATION',
            title,
            description,
            targetModule || 'General',
            sqlMigration || null,
            requestedBy || 'Property General Manager'
        ]);

        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Custom feature request submitted successfully. Awaiting Super Administrator approval.'
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/central/custom-requests/:id/approve
 * Super Administrator approves and triggers the isolated migration on that specific tenant's database
 */
router.post('/custom-requests/:id/approve', async (req: Request, res: Response) => {
    try {
        const requestId = parseInt(String(req.params.id), 10);
        const { adminNotes, approvedBy } = req.body;

        const reqQuery = await pgPool.query(
            'SELECT * FROM central_custom_requests WHERE id = $1',
            [requestId]
        );

        if (reqQuery.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }

        const item = reqQuery.rows[0];
        let executionLogs = '';

        // If this request includes a SQL migration script, execute it in the isolated database
        if (item.sql_migration && item.sql_migration.trim()) {
            console.log(`🚀 [Approval Engine] Executing isolated migration for request #${requestId} on tenant '${item.tenant_slug}'...`);
            const migResult = await TenantConnectionManager.executeTenantMigration(
                item.tenant_slug,
                item.sql_migration
            );
            executionLogs = `Executed successfully: ${migResult.rowsAffected} rows affected. ${migResult.output}`;
        } else if (item.target_module) {
            // Activate catalog plugin if target_module matches
            const pluginQuery = await pgPool.query(
                'SELECT schema_ddl FROM central_plugins_catalog WHERE plugin_key = $1',
                [item.target_module]
            );
            if (pluginQuery.rows.length > 0 && pluginQuery.rows[0].schema_ddl) {
                await TenantConnectionManager.executeTenantMigration(
                    item.tenant_slug,
                    pluginQuery.rows[0].schema_ddl
                );
            }
            await pgPool.query(`
                INSERT INTO central_tenant_plugins (tenant_slug, plugin_key, status)
                VALUES ($1, $2, 'ACTIVE')
                ON CONFLICT (tenant_slug, plugin_key) DO UPDATE SET status = 'ACTIVE';
            `, [item.tenant_slug, item.target_module]);
            executionLogs = `Plugin '${item.target_module}' schema initialized and marked ACTIVE.`;
        }

        // Update request record in Central Registry
        const updated = await pgPool.query(`
            UPDATE central_custom_requests
            SET 
                status = 'DEPLOYED',
                admin_notes = $1,
                approved_by = $2,
                approved_at = CURRENT_TIMESTAMP,
                deployed_at = CURRENT_TIMESTAMP,
                execution_logs = $3
            WHERE id = $4
            RETURNING *;
        `, [
            adminNotes || 'Approved by Super Administrator. Isolated tenant deployment successful.',
            approvedBy || 'Alexander Vance (Super Admin)',
            executionLogs,
            requestId
        ]);

        res.json({
            success: true,
            data: updated.rows[0],
            message: `Custom feature approved and safely deployed to isolated database '${item.tenant_slug}' without affecting any other property!`
        });
    } catch (err: any) {
        console.error('Approval/Deployment Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/central/custom-requests/:id/reject
 * Super Administrator rejects request with reason notes
 */
router.post('/custom-requests/:id/reject', async (req: Request, res: Response) => {
    try {
        const requestId = parseInt(String(req.params.id), 10);
        const { adminNotes, approvedBy } = req.body;

        const updated = await pgPool.query(`
            UPDATE central_custom_requests
            SET 
                status = 'REJECTED',
                admin_notes = $1,
                approved_by = $2,
                approved_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *;
        `, [
            adminNotes || 'Rejected during Super Admin architectural review.',
            approvedBy || 'Alexander Vance (Super Admin)',
            requestId
        ]);

        if (updated.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }

        res.json({
            success: true,
            data: updated.rows[0],
            message: 'Custom feature request rejected.'
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
