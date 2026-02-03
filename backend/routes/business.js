import express from 'express';
import QRCode from 'qrcode';
import { supabase } from '../db/supabase.js';
import { authenticate } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8000';

console.log('Frontend URL for QR:', FRONTEND_URL);

/**
 * GET /api/business/:id
 * Get business info (public - for feedback page)
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: business, error } = await supabase
            .from('businesses')
            .select('id, name, category, logo_url, google_review_url')
            .eq('id', id)
            .single();

        if (error || !business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        res.json(business);
    } catch (error) {
        console.error('Get business error:', error);
        res.status(500).json({ error: 'Failed to get business info' });
    }
});

/**
 * PUT /api/business/:id
 * Update business info (authenticated)
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;
        const { name, category, googleReviewUrl, logoUrl } = req.body;

        // Verify user owns this business
        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized to update this business' });
        }

        const updates = {};
        if (name) updates.name = name;
        if (category) updates.category = category;
        if (googleReviewUrl) updates.google_review_url = googleReviewUrl;
        if (logoUrl !== undefined) updates.logo_url = logoUrl;

        const { error } = await supabase
            .from('businesses')
            .update(updates)
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: 'Failed to update business' });
        }

        res.json({ message: 'Business updated successfully' });
    } catch (error) {
        console.error('Update business error:', error);
        res.status(500).json({ error: 'Failed to update business' });
    }
});

/**
 * GET /api/business/:id/qr
 * Generate QR code for feedback (authenticated)
 */
router.get('/:id/qr', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;

        // Verify user owns this business
        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized to access this business' });
        }

        const { data: business, error } = await supabase
            .from('businesses')
            .select('id, name')
            .eq('id', id)
            .single();

        if (error || !business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Generate feedback URL
        const feedbackUrl = `${FRONTEND_URL}/b/${id}`;

        // Generate QR code as data URL
        const qrCode = await QRCode.toDataURL(feedbackUrl, {
            width: 512,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        res.json({
            qrCode,
            feedbackUrl,
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
router.get('/:id/stats', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;
        const { filter } = req.query;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized to access this business' });
        }

        // Build date filter
        let dateFilter = '';
        const now = new Date();

        if (filter === 'today') {
            dateFilter = now.toISOString().split('T')[0];
        } else if (filter === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = weekAgo.toISOString();
        } else if (filter === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = monthAgo.toISOString();
        }

        // Build query
        let query = supabase
            .from('feedbacks')
            .select('is_positive')
            .eq('business_id', id);

        if (dateFilter) {
            query = query.gte('created_at', dateFilter);
        }

        const { data: feedbacks, error } = await query;

        if (error) {
            return res.status(500).json({ error: 'Failed to get statistics' });
        }

        const total = feedbacks?.length || 0;
        const positive = feedbacks?.filter(f => f.is_positive).length || 0;
        const negative = total - positive;

        res.json({ total, positive, negative });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

/**
 * GET /api/business/:id/plan
 * Get subscription plan info (authenticated)
 */
router.get('/:id/plan', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized to access this business' });
        }

        const { data: business, error } = await supabase
            .from('businesses')
            .select('subscription_plan, monthly_feedback_limit, monthly_feedback_count, last_reset_date')
            .eq('id', id)
            .single();

        if (error || !business) {
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
router.get('/:id/alerts', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Get unread negative feedback count
        const { data: unreadFeedbacks, error: countError } = await supabase
            .from('feedbacks')
            .select('id')
            .eq('business_id', id)
            .eq('is_positive', false)
            .eq('notified', false);

        // Get new negative feedbacks
        const { data: newNegative, error: feedbackError } = await supabase
            .from('feedbacks')
            .select('id, rating, message, created_at')
            .eq('business_id', id)
            .eq('is_positive', false)
            .eq('notified', false)
            .order('created_at', { ascending: false })
            .limit(5);

        res.json({
            unreadCount: unreadFeedbacks?.length || 0,
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
router.post('/:id/alerts/mark-notified', authenticate, async (req, res) => {
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

        const { error } = await supabase
            .from('feedbacks')
            .update({ notified: true })
            .in('id', feedbackIds)
            .eq('business_id', id);

        if (error) {
            return res.status(500).json({ error: 'Failed to mark as notified' });
        }

        res.json({ success: true, marked: feedbackIds.length });
    } catch (error) {
        console.error('Mark notified error:', error);
        res.status(500).json({ error: 'Failed to mark as notified' });
    }
});

export default router;
