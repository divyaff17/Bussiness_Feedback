import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbHelpers } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { feedbackLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

/**
 * Check and reset monthly feedback count if needed
 */
const checkMonthlyReset = (business) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (business.last_reset_date !== currentMonth) {
        // Reset monthly count for new month
        dbHelpers.prepare(`
            UPDATE businesses 
            SET monthly_feedback_count = 0, last_reset_date = ? 
            WHERE id = ?
        `).run(currentMonth, business.id);
        return 0;
    }
    return business.monthly_feedback_count || 0;
};

/**
 * POST /api/feedback
 * Submit feedback (public, rate-limited)
 */
router.post('/', feedbackLimiter, (req, res) => {
    try {
        const { businessId, rating, message } = req.body;

        // Validation
        if (!businessId || !rating) {
            return res.status(400).json({ error: 'Business ID and rating are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Check if business exists and get plan info
        const business = dbHelpers.prepare(`
            SELECT id, google_review_url, subscription_plan, monthly_feedback_limit, monthly_feedback_count, last_reset_date 
            FROM businesses WHERE id = ?
        `).get(businessId);

        if (!business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Check monthly feedback limit for free tier
        const currentCount = checkMonthlyReset(business);
        const limit = business.monthly_feedback_limit || 50;

        if (business.subscription_plan === 'free' && currentCount >= limit) {
            return res.status(429).json({
                error: 'Monthly feedback limit reached. Please ask the business to upgrade their plan.',
                limitReached: true
            });
        }

        // Determine if positive (4-5 stars) or negative (1-3 stars)
        const isPositive = rating >= 4;

        // For negative feedback, message is required
        if (!isPositive && (!message || message.trim().length === 0)) {
            return res.status(400).json({
                error: 'Please tell us what went wrong. Feedback is required for ratings below 4 stars.'
            });
        }

        // Save feedback
        const feedbackId = uuidv4();
        dbHelpers.prepare(`
            INSERT INTO feedbacks (id, business_id, rating, message, is_positive)
            VALUES (?, ?, ?, ?, ?)
        `).run(feedbackId, businessId, rating, message || null, isPositive ? 1 : 0);

        // Increment monthly feedback count
        dbHelpers.prepare(`
            UPDATE businesses SET monthly_feedback_count = monthly_feedback_count + 1 WHERE id = ?
        `).run(businessId);

        // Return appropriate response based on rating
        if (isPositive) {
            res.status(201).json({
                success: true,
                isPositive: true,
                message: 'Thank you for your feedback!',
                googleReviewUrl: business.google_review_url,
                showGoogleReview: true
            });
        } else {
            res.status(201).json({
                success: true,
                isPositive: false,
                message: "We're sorry about your experience. Thank you for letting us know.",
                showGoogleReview: false
            });
        }
    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

/**
 * GET /api/feedback/:businessId
 * Get all feedbacks for a business (authenticated)
 */
router.get('/:businessId', authenticate, (req, res) => {
    try {
        const { businessId } = req.params;
        const userBusinessId = req.user.businessId;

        // Verify user owns this business
        if (businessId !== userBusinessId) {
            return res.status(403).json({ error: 'Not authorized to view this feedback' });
        }

        const { filter, type } = req.query; // filter: today, week, month | type: positive, negative, all

        // Build query
        let dateFilter = '';
        switch (filter) {
            case 'today':
                dateFilter = `AND date(created_at) = date('now', 'localtime')`;
                break;
            case 'week':
                dateFilter = `AND created_at >= datetime('now', '-7 days', 'localtime')`;
                break;
            case 'month':
                dateFilter = `AND created_at >= datetime('now', '-30 days', 'localtime')`;
                break;
            default:
                dateFilter = '';
        }

        let typeFilter = '';
        if (type === 'positive') {
            typeFilter = 'AND is_positive = 1';
        } else if (type === 'negative') {
            typeFilter = 'AND is_positive = 0';
        }

        const feedbacks = dbHelpers.prepare(`
            SELECT id, rating, message, is_positive, created_at
            FROM feedbacks
            WHERE business_id = ? ${dateFilter} ${typeFilter}
            ORDER BY created_at DESC
            LIMIT 100
        `).all(businessId);

        res.json({
            feedbacks: feedbacks.map(f => ({
                id: f.id,
                rating: f.rating,
                message: f.message,
                isPositive: f.is_positive === 1,
                createdAt: f.created_at
            })),
            count: feedbacks.length
        });
    } catch (error) {
        console.error('Get feedbacks error:', error);
        res.status(500).json({ error: 'Failed to get feedbacks' });
    }
});

export default router;
