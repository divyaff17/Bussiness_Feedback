import express from 'express';
import QRCode from 'qrcode';
import { dbHelpers } from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Frontend URL for generating feedback links
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8000';
console.log('📱 QR Code URLs will use:', FRONTEND_URL);

/**
 * GET /api/business/:id
 * Get business info (public - for feedback page)
 */
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const business = dbHelpers.prepare(`
            SELECT id, name, category, logo_url, google_review_url, created_at
            FROM businesses
            WHERE id = ?
        `).get(id);

        if (!business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        res.json({
            id: business.id,
            name: business.name,
            category: business.category,
            logoUrl: business.logo_url,
            googleReviewUrl: business.google_review_url,
            createdAt: business.created_at
        });
    } catch (error) {
        console.error('Get business error:', error);
        res.status(500).json({ error: 'Failed to get business info' });
    }
});

/**
 * PUT /api/business/:id
 * Update business info (authenticated)
 */
router.put('/:id', authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;

        // Verify user owns this business
        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized to update this business' });
        }

        const { name, category, logoUrl, googleReviewUrl } = req.body;

        // Build update query dynamically
        const updates = [];
        const values = [];

        if (name) {
            updates.push('name = ?');
            values.push(name);
        }
        if (category) {
            updates.push('category = ?');
            values.push(category);
        }
        if (logoUrl !== undefined) {
            updates.push('logo_url = ?');
            values.push(logoUrl);
        }
        if (googleReviewUrl) {
            updates.push('google_review_url = ?');
            values.push(googleReviewUrl);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        dbHelpers.prepare(`UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        // Return updated business
        const business = dbHelpers.prepare('SELECT * FROM businesses WHERE id = ?').get(id);

        res.json({
            message: 'Business updated successfully',
            business: {
                id: business.id,
                name: business.name,
                category: business.category,
                logoUrl: business.logo_url,
                googleReviewUrl: business.google_review_url
            }
        });
    } catch (error) {
        console.error('Update business error:', error);
        res.status(500).json({ error: 'Failed to update business' });
    }
});

/**
 * GET /api/business/:id/qr
 * Generate QR code for feedback page (authenticated)
 */
router.get('/:id/qr', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;

        // Verify user owns this business
        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized to access this business' });
        }

        const business = dbHelpers.prepare('SELECT name FROM businesses WHERE id = ?').get(id);
        if (!business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Generate feedback URL
        const feedbackUrl = `${FRONTEND_URL}/b/${id}`;

        // Generate QR code as data URL
        const qrCodeDataUrl = await QRCode.toDataURL(feedbackUrl, {
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        res.json({
            feedbackUrl,
            qrCode: qrCodeDataUrl,
            businessName: business.name
        });
    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

/**
 * GET /api/business/:id/stats
 * Get feedback statistics (authenticated)
 */
router.get('/:id/stats', authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;

        // Verify user owns this business
        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized to access this business' });
        }

        const { filter } = req.query; // today, week, month, all

        // Calculate date filter
        let dateFilter = '';
        const now = new Date();

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

        // Get stats
        const stats = dbHelpers.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_positive = 1 THEN 1 ELSE 0 END) as positive,
                SUM(CASE WHEN is_positive = 0 THEN 1 ELSE 0 END) as negative
            FROM feedbacks 
            WHERE business_id = ? ${dateFilter}
        `).get(id);

        res.json({
            total: stats.total || 0,
            positive: stats.positive || 0,
            negative: stats.negative || 0
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

/**
 * GET /api/business/:id/plan
 * Get subscription plan info (authenticated)
 */
router.get('/:id/plan', authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;

        // Verify user owns this business
        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized to access this business' });
        }

        const business = dbHelpers.prepare(`
            SELECT subscription_plan, monthly_feedback_limit, monthly_feedback_count, last_reset_date
            FROM businesses WHERE id = ?
        `).get(id);

        if (!business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Check if we need to reset for new month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        let usedThisMonth = business.monthly_feedback_count || 0;

        if (business.last_reset_date !== currentMonth) {
            usedThisMonth = 0;
        }

        res.json({
            plan: business.subscription_plan || 'free',
            limit: business.monthly_feedback_limit || 50,
            usedThisMonth,
            isUnlimited: business.subscription_plan === 'paid'
        });
    } catch (error) {
        console.error('Plan info error:', error);
        res.status(500).json({ error: 'Failed to get plan info' });
    }
});
/**
 * GET /api/business/:id/alerts
 * Get unread feedback count and new negative feedbacks (for extension)
 */
router.get('/:id/alerts', authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Get unread negative feedback count
        const unreadResult = dbHelpers.prepare(`
            SELECT COUNT(*) as count FROM feedbacks 
            WHERE business_id = ? AND is_positive = 0 AND (notified IS NULL OR notified = 0)
        `).get(id);

        // Get new negative feedbacks that haven't been notified
        const newNegative = dbHelpers.prepare(`
            SELECT id, rating, message, created_at FROM feedbacks 
            WHERE business_id = ? AND is_positive = 0 AND (notified IS NULL OR notified = 0)
            ORDER BY created_at DESC LIMIT 5
        `).all(id);

        res.json({
            unreadCount: unreadResult?.count || 0,
            newNegative: newNegative || []
        });
    } catch (error) {
        console.error('Alerts error:', error);
        res.status(500).json({ error: 'Failed to get alerts' });
    }
});

/**
 * POST /api/business/:id/alerts/mark-notified
 * Mark feedbacks as notified (for extension)
 */
router.post('/:id/alerts/mark-notified', authenticate, (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;
        const { feedbackIds } = req.body;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (!feedbackIds || !Array.isArray(feedbackIds)) {
            return res.status(400).json({ error: 'feedbackIds array required' });
        }

        // Mark as notified
        const placeholders = feedbackIds.map(() => '?').join(',');
        dbHelpers.prepare(`
            UPDATE feedbacks SET notified = 1 
            WHERE id IN (${placeholders}) AND business_id = ?
        `).run(...feedbackIds, id);

        res.json({ success: true, marked: feedbackIds.length });
    } catch (error) {
        console.error('Mark notified error:', error);
        res.status(500).json({ error: 'Failed to mark as notified' });
    }
});

export default router;
