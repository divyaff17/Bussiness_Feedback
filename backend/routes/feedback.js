import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { feedbackLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

/**
 * POST /api/feedback/:businessId
 * Submit feedback (public - from QR code)
 */
router.post('/:businessId', feedbackLimiter, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { rating, message } = req.body;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Check if business exists
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('id, google_review_url, subscription_plan, monthly_feedback_count, monthly_feedback_limit, last_reset_date')
            .eq('id', businessId)
            .single();

        if (businessError || !business) {
            return res.status(404).json({ error: 'Business not found' });
        }

        // Check monthly limit for free tier
        if (business.subscription_plan !== 'paid') {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            let currentCount = business.monthly_feedback_count || 0;

            // Reset if new month
            if (business.last_reset_date !== currentMonth) {
                currentCount = 0;
                await supabase
                    .from('businesses')
                    .update({
                        monthly_feedback_count: 0,
                        last_reset_date: currentMonth
                    })
                    .eq('id', businessId);
            }

            if (currentCount >= (business.monthly_feedback_limit || 50)) {
                return res.status(429).json({
                    error: 'Monthly feedback limit reached. Please upgrade to Pro for unlimited feedbacks.',
                    limitReached: true
                });
            }
        }

        // Determine if positive feedback (4-5 stars)
        const isPositive = rating >= 4;
        const feedbackId = uuidv4();

        // Insert feedback
        const { error: insertError } = await supabase
            .from('feedbacks')
            .insert({
                id: feedbackId,
                business_id: businessId,
                rating: parseInt(rating),
                message: message || null,
                is_positive: isPositive,
                notified: false
            });

        if (insertError) {
            console.error('Insert error:', insertError);
            return res.status(500).json({ error: 'Failed to submit feedback' });
        }

        // Increment monthly count
        await supabase
            .from('businesses')
            .update({ monthly_feedback_count: (business.monthly_feedback_count || 0) + 1 })
            .eq('id', businessId);

        // Get primary review platform URL (with fallback to legacy google_review_url)
        let reviewUrl = business.google_review_url
        if (isPositive) {
            const { data: primaryPlatform } = await supabase
                .from('review_platforms')
                .select('url')
                .eq('business_id', businessId)
                .eq('is_primary', true)
                .eq('is_active', true)
                .single()
            
            if (primaryPlatform?.url) {
                reviewUrl = primaryPlatform.url
            }
        }

        res.status(201).json({
            message: 'Feedback submitted successfully',
            isPositive,
            googleReviewUrl: isPositive ? reviewUrl : null
        });
    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

/**
 * GET /api/feedback/:businessId
 * Get feedbacks for a business (authenticated)
 */
router.get('/:businessId', authenticate, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { businessId: userBusinessId } = req.user;
        const { filter, type } = req.query;

        // Verify ownership
        if (businessId !== userBusinessId) {
            return res.status(403).json({ error: 'Not authorized to access this business' });
        }

        // Build date filter
        let query = supabase
            .from('feedbacks')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        // Apply date filter
        const now = new Date();
        if (filter === 'today') {
            const today = now.toISOString().split('T')[0];
            query = query.gte('created_at', today);
        } else if (filter === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            query = query.gte('created_at', weekAgo.toISOString());
        } else if (filter === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            query = query.gte('created_at', monthAgo.toISOString());
        }

        // Apply type filter
        if (type === 'negative') {
            query = query.eq('is_positive', false);
        } else if (type === 'positive') {
            query = query.eq('is_positive', true);
        }

        const { data: feedbacks, error } = await query.limit(100);

        if (error) {
            return res.status(500).json({ error: 'Failed to get feedbacks' });
        }

        res.json({ feedbacks: feedbacks || [] });
    } catch (error) {
        console.error('Get feedbacks error:', error);
        res.status(500).json({ error: 'Failed to get feedbacks' });
    }
});

export default router;
