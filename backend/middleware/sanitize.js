/**
 * Input Sanitization Middleware
 * ─────────────────────────────
 * SECURITY: Prevents XSS, injection attacks, and oversized payloads
 * Applied globally to all incoming request bodies, query params, and URL params
 */

/**
 * HTML-escape dangerous characters to prevent XSS
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Strip null bytes and control characters (except newlines/tabs)
 */
function stripDangerous(str) {
    if (typeof str !== 'string') return str;
    // Remove null bytes and non-printable control chars (keep \n, \r, \t)
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Recursively sanitize an object's string values
 * @param {any} obj - The object to sanitize
 * @param {number} depth - Current recursion depth
 * @param {number} maxDepth - Maximum allowed nesting depth
 */
function sanitizeObject(obj, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) return undefined; // Prevent prototype pollution via deep nesting

    if (typeof obj === 'string') {
        return stripDangerous(obj);
    }

    if (Array.isArray(obj)) {
        return obj.slice(0, 1000).map(item => sanitizeObject(item, depth + 1, maxDepth)); // Cap array size
    }

    if (obj && typeof obj === 'object') {
        // Block __proto__ and constructor overrides (prototype pollution prevention)
        const sanitized = {};
        for (const key of Object.keys(obj)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                continue; // Skip dangerous keys
            }
            sanitized[key] = sanitizeObject(obj[key], depth + 1, maxDepth);
        }
        return sanitized;
    }

    return obj;
}

/**
 * Middleware: sanitize all inputs (body, query, params)
 */
export const sanitizeInputs = (req, res, next) => {
    try {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query);
        }
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params);
        }
        next();
    } catch (err) {
        return res.status(400).json({ error: 'Invalid request data' });
    }
};

/**
 * Validate email format
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 * Must be 8+ chars, with uppercase, lowercase, and number
 */
export function isStrongPassword(password) {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8) return false;
    if (password.length > 128) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
}

/**
 * Validate and sanitize URL — block private/internal IPs (SSRF prevention)
 */
export function isSafeUrl(urlString) {
    try {
        const url = new URL(urlString);

        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
            return false;
        }

        // Block private/internal IPs
        const hostname = url.hostname.toLowerCase();
        const blockedPatterns = [
            /^localhost$/i,
            /^127\./,
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[01])\./,
            /^192\.168\./,
            /^0\./,
            /^169\.254\./,      // Link-local
            /^fc00:/i,          // IPv6 private
            /^fe80:/i,          // IPv6 link-local
            /^::1$/,            // IPv6 loopback
            /^0:0:0:0:0:0:0:1$/,
            /\.local$/i,        // mDNS
            /\.internal$/i,
        ];

        for (const pattern of blockedPatterns) {
            if (pattern.test(hostname)) {
                return false;
            }
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Escape user data for safe HTML email embedding
 */
export function escapeForEmail(str) {
    return escapeHtml(str);
}

/**
 * Truncate a string to a max length
 */
export function truncate(str, maxLen = 5000) {
    if (typeof str !== 'string') return str;
    return str.length > maxLen ? str.slice(0, maxLen) : str;
}
