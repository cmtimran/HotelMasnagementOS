import type { Request } from 'express';

export interface ResolveUrlOptions {
    req?: Request;
    propertySettings?: any;
    fallbackUrl?: string;
}

/**
 * Dynamically resolves the Frontend application base URL without hardcoded localhost.
 * Precedence:
 * 1. Incoming Request origin / referer header (if dispatched from active client session)
 * 2. Property custom domain / bookingEngineUrl from database settings
 * 3. Environment variables: FRONTEND_URL, APP_URL, VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL
 * 4. Safe dev fallback: http://localhost:5173
 */
export function getFrontendBaseUrl(options?: ResolveUrlOptions | Request): string {
    let req: Request | undefined;
    let propertySettings: any;
    let fallbackUrl: string | undefined;

    if (options && ('get' in options || 'headers' in options)) {
        req = options as Request;
    } else if (options) {
        const opts = options as ResolveUrlOptions;
        req = opts.req;
        propertySettings = opts.propertySettings;
        fallbackUrl = opts.fallbackUrl;
    }

    // 1. From active HTTP request origin/referer
    if (req) {
        const origin = req.get('origin');
        if (origin && !origin.includes('localhost:3002')) {
            return origin.replace(/\/+$/, '');
        }

        const referer = req.get('referer');
        if (referer) {
            try {
                const url = new URL(referer);
                if (!url.port || url.port !== '3002') {
                    return `${url.protocol}//${url.host}`.replace(/\/+$/, '');
                }
            } catch {}
        }

        const forwardedHost = req.get('x-forwarded-host') || req.get('host');
        const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
        if (forwardedHost && !forwardedHost.includes(':3002')) {
            return `${proto}://${forwardedHost}`.replace(/\/+$/, '');
        }
    }

    // 2. From Property Settings in Database (e.g. custom domain / bookingEngineUrl)
    if (propertySettings) {
        const customUrl = propertySettings.bookingEngineUrl || propertySettings.portalUrl || propertySettings.website;
        if (customUrl && typeof customUrl === 'string' && customUrl.trim().length > 0) {
            let clean = customUrl.trim();
            if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
                clean = `https://${clean}`;
            }
            return clean.replace(/\/+$/, '');
        }
    }

    // 3. From Environment Variables (Vercel, Production Server, Docker, Local env)
    if (process.env.FRONTEND_URL) {
        return process.env.FRONTEND_URL.trim().replace(/\/+$/, '');
    }
    if (process.env.APP_URL) {
        return process.env.APP_URL.trim().replace(/\/+$/, '');
    }
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`.replace(/\/+$/, '');
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL.trim()}`.replace(/\/+$/, '');
    }

    // 4. Default / Fallback
    return (fallbackUrl || 'http://localhost:5173').replace(/\/+$/, '');
}
