import type { Request, Response, NextFunction } from 'express';
import { tenantLocalStorage, type TenantContext } from '../database/tenantContext.js';
import { TenantConnectionManager } from '../database/TenantConnectionManager.js';

// Extend Express Request to optionally include tenantContext
declare global {
    namespace Express {
        interface Request {
            tenantContext?: TenantContext;
        }
    }
}

/**
 * Enterprise Multi-Tenant Context Resolver Middleware
 * Intercepts every incoming API request and routes queries to the tenant's isolated database.
 */
export async function tenantMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Platform-level & authentication routes bypass tenant isolation routing
    const path = (req.path || '').toLowerCase();
    if (
        path.startsWith('/auth') || 
        path.startsWith('/api/auth') || 
        path.startsWith('/health') || 
        path.startsWith('/api/health') || 
        path.startsWith('/schema') || 
        path.startsWith('/api/schema') || 
        path.startsWith('/central') || 
        path.startsWith('/api/central') ||
        path.startsWith('/tenants') ||
        path.startsWith('/api/tenants')
    ) {
        return next();
    }

    try {
        // Priority order for Tenant Slug resolution:
        // 1. HTTP Request Header: 'X-Tenant-Id' or 'X-Property-Slug'
        // 2. Query parameter: '?tenant=xyz'
        // 3. Subdomain: e.g. 'radisson.hotelmasnagementos.com' -> 'radisson'
        let tenantSlug = (req.headers['x-tenant-id'] as string) || 
                         (req.headers['x-property-slug'] as string) || 
                         (req.query.tenant as string);

        // Subdomain extraction fallback (if not localhost or ip)
        if (!tenantSlug && req.hostname && !req.hostname.includes('localhost') && !req.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            const parts = req.hostname.split('.');
            if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api') {
                tenantSlug = parts[0];
            }
        }

        // Clean and normalize slug
        tenantSlug = (tenantSlug || 'default').toLowerCase().trim();

        // Resolve connection pool via LRU Manager
        const context = await TenantConnectionManager.resolveTenantContext(tenantSlug);
        req.tenantContext = context;

        // Set diagnostic response headers
        res.setHeader('X-Tenant-Resolved', context.tenantSlug);
        res.setHeader('X-Tenant-Database', context.dbName);
        res.setHeader('X-Tenant-Isolation', context.isolationMode || 'DEDICATED');

        // Automatically populate property scope for shared multi-tenant routing
        if (context.propertyId) {
            (req as any).propertyId = String(context.propertyId);
            (req.headers as any)['x-property-id'] = String(context.propertyId);
        }

        // Run next middleware chain within the isolated tenant async storage scope
        tenantLocalStorage.run(context, () => {
            next();
        });
    } catch (err: any) {
        console.error(`🚨 [Tenant Middleware] Failed to resolve tenant context: ${err.message}`);
        res.status(404).json({
            success: false,
            error: `Tenant database error: ${err.message}`
        });
    }
}
