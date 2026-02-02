import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for feedback submissions
 * Prevents spam: max 5 feedbacks per IP per minute
 */
export const feedbackLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute per IP
    message: { error: 'Too many feedback submissions. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limiter
 * Prevents abuse: max 100 requests per minute per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Auth rate limiter
 * Prevents brute force: max 10 login attempts per 15 minutes
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts
    message: { error: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
