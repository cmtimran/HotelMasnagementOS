import crypto from 'crypto';

let cachedDynamicSecret = process.env.JWT_SECRET;

/**
 * Returns dynamic cryptographic secret. If not provided in environment,
 * dynamically generates a cryptographically secure 512-bit key.
 */
export function getDynamicJwtSecret(): string {
    if (!cachedDynamicSecret) {
        cachedDynamicSecret = crypto.randomBytes(64).toString('hex');
    }
    return cachedDynamicSecret;
}

function base64UrlEncode(data: string | Buffer): string {
    return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(str: string): string {
    return Buffer.from(str, 'base64url').toString('utf8');
}

export function signJwt(payload: Record<string, any>, expiresInSeconds: number = 86400 * 7): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInSeconds
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
        .createHmac('sha256', getDynamicJwtSecret())
        .update(dataToSign)
        .digest();

    const encodedSignature = base64UrlEncode(signature);
    return `${dataToSign}.${encodedSignature}`;
}

export function verifyJwt(token: string): Record<string, any> | null {
    try {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [encodedHeader, encodedPayload, encodedSignature] = parts;
        const dataToSign = `${encodedHeader}.${encodedPayload}`;

        const expectedSignature = base64UrlEncode(
            crypto.createHmac('sha256', getDynamicJwtSecret()).update(dataToSign).digest()
        );

        // Constant time comparison against timing attacks
        const sigBuffer = Buffer.from(encodedSignature);
        const expectedBuffer = Buffer.from(expectedSignature);
        if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
            return null;
        }

        const payloadStr = base64UrlDecode(encodedPayload);
        const payload = JSON.parse(payloadStr);

        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            // Token expired
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}
