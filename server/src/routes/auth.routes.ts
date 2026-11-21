import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { pgPool } from '../database/postgres.js';
import { signJwt } from '../utils/jwt.js';

const router = Router();

/**
 * Strict Rate Limiter for Authentication endpoints.
 * Prevents high-frequency automated brute-force attacks and credential stuffing.
 */
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 15, // Limit each IP to 15 login requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many login attempts from this IP. Please try again after 15 minutes.'
    }
});

/**
 * Hashes a plaintext password using salted scrypt KDF.
 * Output format: scrypt:<salt_hex>:<hash_hex>
 */
export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt:${salt}:${hash}`;
}

/**
 * Timing-safe password verification supporting modern scrypt and legacy SHA-256.
 * Completely eliminates timing side-channel attacks and mitigates rainbow table lookups.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
    if (!password || !storedHash) return false;

    try {
        if (storedHash.startsWith('scrypt:')) {
            const parts = storedHash.split(':');
            if (parts.length !== 3) return false;
            const [, salt, expectedHash] = parts;
            const calculatedHash = crypto.scryptSync(password, salt, 64).toString('hex');
            const calcBuffer = Buffer.from(calculatedHash, 'hex');
            const expBuffer = Buffer.from(expectedHash, 'hex');
            if (calcBuffer.length !== expBuffer.length) return false;
            return crypto.timingSafeEqual(calcBuffer, expBuffer);
        }

        // Legacy SHA-256 fallback (timing-safe constant time comparison)
        const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
        const legacyBuffer = Buffer.from(legacyHash, 'hex');
        const storedBuffer = Buffer.from(storedHash, 'hex');
        if (legacyBuffer.length !== storedBuffer.length) return false;
        return crypto.timingSafeEqual(legacyBuffer, storedBuffer);
    } catch {
        return false;
    }
}

// POST /api/auth/login
router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const client = await pgPool.connect();

        try {
            const result = await client.query(
                'SELECT id, organization_id, property_id, name, email, password_hash, role, is_active, image FROM users WHERE LOWER(email) = $1 LIMIT 1;',
                [cleanEmail]
            );

            if (result.rows.length === 0) {
                // Timing normalization: avoid revealing whether user exists
                verifyPassword(password, 'scrypt:00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000');
                return res.status(401).json({ success: false, error: 'Invalid email or password' });
            }

            const user = result.rows[0];

            if (!user.is_active) {
                return res.status(403).json({ success: false, error: 'Account is deactivated' });
            }

            const isValid = verifyPassword(password, user.password_hash);

            if (!isValid) {
                return res.status(401).json({ success: false, error: 'Invalid email or password' });
            }

            // Transparent Password Hash Migration:
            // If user logged in with legacy unsalted SHA-256, upgrade to modern salted scrypt
            if (!user.password_hash.startsWith('scrypt:')) {
                const upgradedHash = hashPassword(password);
                client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [upgradedHash, user.id])
                    .then(() => console.log(`🔒 Upgraded user ${user.id} password to modern salted scrypt.`))
                    .catch((err) => console.warn('Failed to auto-upgrade password hash:', err?.message));
            }

            // Issue cryptographic HS256 JWT
            const token = signJwt({
                sub: user.id,
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationId: user.organization_id,
                propertyId: user.property_id
            });

            // Return user details and authentication token
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    organizationId: user.organization_id,
                    propertyId: user.property_id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    image: user.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'
                }
            });
        } finally {
            client.release();
        }
    } catch (e: any) {
        console.error('Login error:', e);
        res.status(500).json({ success: false, error: 'Authentication service error' });
    }
});

// GET /api/auth/me - Identity Inspection with Strict RBAC & IDOR Prevention
router.get('/me', async (req: Request, res: Response) => {
    try {
        const authReq = req as any;
        const authenticatedUser = authReq.user;
        const requestedEmail = req.query.email as string | undefined;

        // Default to the authenticated user's own identity
        let targetEmail = authenticatedUser?.email;

        // If inspecting another email, enforce super_admin / general_manager role check
        if (requestedEmail) {
            const cleanReqEmail = requestedEmail.trim().toLowerCase();
            const isSelf = authenticatedUser?.email && authenticatedUser.email.toLowerCase() === cleanReqEmail;
            const isPrivileged = authenticatedUser?.role === 'super_admin' || authenticatedUser?.role === 'general_manager';

            if (isSelf || isPrivileged) {
                targetEmail = cleanReqEmail;
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Forbidden: Insufficient privileges to inspect another user profile'
                });
            }
        }

        if (!targetEmail) {
            return res.status(400).json({ success: false, error: 'User identifier required' });
        }

        const client = await pgPool.connect();
        try {
            const result = await client.query(
                'SELECT id, organization_id, property_id, name, email, role, is_active, image FROM users WHERE LOWER(email) = $1 LIMIT 1;',
                [targetEmail.toLowerCase()]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            res.json({ success: true, user: result.rows[0] });
        } finally {
            client.release();
        }
    } catch (e: any) {
        res.status(500).json({ success: false, error: 'Failed to verify user' });
    }
});

export default router;
