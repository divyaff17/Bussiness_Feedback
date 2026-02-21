import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ── SECURITY: No fallback secret – must be set via environment variable ──
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not defined in environment variables.');
    // Server startup check in server.js will catch this and exit
}

// Token expiry constants
const ACCESS_TOKEN_EXPIRY = '1h';   // Short-lived access token (was 7d)
const REFRESH_TOKEN_EXPIRY = '7d';  // Longer-lived refresh token

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    // SECURITY: Reject abnormally long tokens
    if (token.length > 2048) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'], // SECURITY: Pin algorithm to prevent "none" attack
        });
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Generate JWT access token (short-lived)
 * @param {Object} payload - { userId, businessId }
 */
export const generateToken = (payload) => {
    return jwt.sign(
        {
            userId: payload.userId,
            businessId: payload.businessId,
            jti: crypto.randomUUID(), // Unique token ID for revocation support
        },
        JWT_SECRET,
        { 
            expiresIn: ACCESS_TOKEN_EXPIRY,
            algorithm: 'HS256',
        }
    );
};

/**
 * Generate refresh token (longer-lived)
 * @param {Object} payload - { userId, businessId }
 */
export const generateRefreshToken = (payload) => {
    return jwt.sign(
        {
            userId: payload.userId,
            businessId: payload.businessId,
            type: 'refresh',
            jti: crypto.randomUUID(),
        },
        JWT_SECRET,
        { 
            expiresIn: REFRESH_TOKEN_EXPIRY,
            algorithm: 'HS256',
        }
    );
};

/**
 * Verify a refresh token and return a new access token
 */
export const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        if (decoded.type !== 'refresh') {
            throw new Error('Not a refresh token');
        }
        return decoded;
    } catch {
        return null;
    }
};
