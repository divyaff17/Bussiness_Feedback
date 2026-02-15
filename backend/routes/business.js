import express from 'express';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { analyzeBulkSummary } from '../services/ai.js';
import { isSafeUrl } from '../middleware/sanitize.js';
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
 * Detect platform from URL
 */
function detectPlatform(url) {
    const lowerUrl = url.toLowerCase();
    
    // Google Maps / Google Business
    if (lowerUrl.includes('google.com/maps') || 
        lowerUrl.includes('maps.google.com') ||
        lowerUrl.includes('g.page') ||
        lowerUrl.includes('goo.gl') ||
        lowerUrl.includes('search.google.com/local') ||
        (lowerUrl.includes('google.com') && lowerUrl.includes('review'))) {
        return { platform: 'google', label: 'Google Maps' };
    }
    
    // Google Forms
    if (lowerUrl.includes('docs.google.com/forms') || lowerUrl.includes('forms.gle')) {
        return { platform: 'google_forms', label: 'Google Forms' };
    }
    
    // Yelp
    if (lowerUrl.includes('yelp.com')) {
        return { platform: 'yelp', label: 'Yelp' };
    }
    
    // TripAdvisor
    if (lowerUrl.includes('tripadvisor.com') || lowerUrl.includes('tripadvisor.')) {
        return { platform: 'tripadvisor', label: 'TripAdvisor' };
    }
    
    // Facebook
    if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) {
        return { platform: 'facebook', label: 'Facebook' };
    }
    
    // Trustpilot
    if (lowerUrl.includes('trustpilot.com')) {
        return { platform: 'trustpilot', label: 'Trustpilot' };
    }
    
    // Zomato
    if (lowerUrl.includes('zomato.com')) {
        return { platform: 'zomato', label: 'Zomato' };
    }
    
    // Swiggy
    if (lowerUrl.includes('swiggy.com')) {
        return { platform: 'swiggy', label: 'Swiggy' };
    }
    
    // SurveyMonkey
    if (lowerUrl.includes('surveymonkey.com') || lowerUrl.includes('surveymonkey.')) {
        return { platform: 'surveymonkey', label: 'SurveyMonkey' };
    }
    
    // Typeform
    if (lowerUrl.includes('typeform.com')) {
        return { platform: 'typeform', label: 'Typeform' };
    }
    
    // JotForm
    if (lowerUrl.includes('jotform.com')) {
        return { platform: 'jotform', label: 'JotForm' };
    }
    
    // Amazon
    if (lowerUrl.includes('amazon.com') || lowerUrl.includes('amazon.in')) {
        return { platform: 'amazon', label: 'Amazon' };
    }
    
    // Booking.com
    if (lowerUrl.includes('booking.com')) {
        return { platform: 'booking', label: 'Booking.com' };
    }
    
    // Airbnb
    if (lowerUrl.includes('airbnb.com') || lowerUrl.includes('airbnb.')) {
        return { platform: 'airbnb', label: 'Airbnb' };
    }
    
    // Default: custom platform
    return { platform: 'custom', label: 'Custom' };
}

/**
 * POST /api/business/validate-review-url
 * Validate any review platform URL (replaces validate-google-url)
 */
router.post('/validate-review-url', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ valid: false, error: 'URL is required' });
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            return res.json({ 
                valid: false, 
                error: 'Invalid URL format. Please enter a valid URL starting with http:// or https://'
            });
        }

        // SECURITY: SSRF protection — block private/internal IPs
        if (!isSafeUrl(url)) {
            return res.json({ 
                valid: false, 
                error: 'URL points to a restricted address and cannot be validated' 
            });
        }

        // Detect platform
        const { platform, label } = detectPlatform(url);

        // Try to fetch the URL to verify it's accessible
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; FeedbackBot/1.0)'
                }
            });

            clearTimeout(timeoutId);

            if (response.ok || response.status === 301 || response.status === 302 || response.status === 307) {
                return res.json({ 
                    valid: true, 
                    platform,
                    label,
                    message: `${label} URL is valid and accessible`
                });
            } else {
                return res.json({ 
                    valid: true, // Still allow it
                    platform,
                    label,
                    warning: `URL returned status ${response.status}, but format is correct`
                });
            }
        } catch (fetchError) {
            // Allow URL if format is valid even if we can't fetch it
            return res.json({ 
                valid: true, 
                platform,
                label,
                message: 'URL format is valid',
                warning: 'Could not verify accessibility, but URL format appears correct'
            });
        }
    } catch (error) {
        console.error('Validate review URL error:', error);
        res.status(500).json({ valid: false, error: 'Failed to validate URL' });
    }
});

// Keep old endpoint for backwards compatibility
router.post('/validate-google-url', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ valid: false, error: 'URL is required' });
        }

        // Check URL format first
        const lowerUrl = url.toLowerCase();
        const isValidFormat = 
            lowerUrl.includes('google.com/maps') ||
            lowerUrl.includes('maps.google.com') ||
            lowerUrl.includes('g.page') ||
            lowerUrl.includes('goo.gl') ||
            lowerUrl.includes('search.google.com/local') ||
            (lowerUrl.includes('google.com') && lowerUrl.includes('review'));

        if (!isValidFormat) {
            return res.json({ 
                valid: false, 
                error: 'URL does not appear to be a valid Google review link. Please use a link from Google Maps or Google Business Profile.',
                suggestion: 'Valid formats: https://g.page/r/..., https://maps.google.com/..., or your Google Maps business link'
            });
        }

        // Try to fetch the URL to verify it's accessible
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; FeedbackBot/1.0)'
                }
            });

            clearTimeout(timeoutId);

            // Check for successful response or redirect (Google often redirects)
            if (response.ok || response.status === 301 || response.status === 302 || response.status === 307) {
                return res.json({ 
                    valid: true, 
                    message: 'Google review URL is valid and accessible'
                });
            } else {
                return res.json({ 
                    valid: false, 
                    error: `URL returned status ${response.status}. Please verify the link is correct.`
                });
            }
        } catch (fetchError) {
            // If fetch fails, still allow the URL if it has the right format
            // Some Google URLs may block bots but still work for users
            if (fetchError.name === 'AbortError') {
                return res.json({ 
                    valid: true, 
                    message: 'URL format is valid (response timeout - may still work)',
                    warning: 'Could not fully verify the URL, but format appears correct'
                });
            }
            
            console.log('URL validation fetch error:', fetchError.message);
            return res.json({ 
                valid: true, 
                message: 'URL format is valid',
                warning: 'Could not fully verify accessibility, but format appears correct'
            });
        }
    } catch (error) {
        console.error('Validate Google URL error:', error);
        res.status(500).json({ valid: false, error: 'Failed to validate URL' });
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
 * GET /api/business/:id/platforms
 * Get all review platforms for a business
 */
router.get('/:id/platforms', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;

        console.log('[GET platforms] Requested id:', id, 'User businessId:', businessId);

        if (id !== businessId) {
            console.log('[GET platforms] Auth mismatch - returning 403');
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { data: platforms, error } = await supabase
            .from('review_platforms')
            .select('*')
            .eq('business_id', id)
            .eq('is_active', true)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[GET platforms] Supabase error:', JSON.stringify(error));
            return res.status(500).json({ error: 'Failed to get platforms' });
        }

        console.log('[GET platforms] Found', (platforms || []).length, 'platforms:', JSON.stringify(platforms));
        res.json({ platforms: platforms || [] });
    } catch (error) {
        console.error('Get platforms error:', error);
        res.status(500).json({ error: 'Failed to get platforms' });
    }
});

/**
 * POST /api/business/:id/platforms
 * Add a new review platform
 */
router.post('/:id/platforms', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;
        const { url, isPrimary = false, customLabel } = req.body;

        console.log('[POST platform] id:', id, 'businessId:', businessId, 'body:', JSON.stringify(req.body));

        if (id !== businessId) {
            console.log('[POST platform] Auth mismatch - returning 403');
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Detect platform
        const { platform, label } = detectPlatform(url);
        const finalLabel = customLabel || label;

        // If setting as primary, unset other primaries
        if (isPrimary) {
            await supabase
                .from('review_platforms')
                .update({ is_primary: false })
                .eq('business_id', id);
        }

        // Check for duplicate URL
        const { data: existing } = await supabase
            .from('review_platforms')
            .select('id')
            .eq('business_id', id)
            .eq('url', url)
            .single();

        if (existing) {
            console.log('[POST platform] Duplicate URL found:', url);
            return res.status(400).json({ error: 'This URL is already added' });
        }

        // Insert new platform
        const { data: newPlatform, error } = await supabase
            .from('review_platforms')
            .insert({
                business_id: id,
                platform_name: platform,
                platform_label: finalLabel,
                url,
                is_primary: isPrimary,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('[POST platform] Insert error:', JSON.stringify(error));
            return res.status(500).json({ error: 'Failed to add platform' });
        }

        console.log('[POST platform] Successfully inserted:', JSON.stringify(newPlatform));

        // Also update the legacy google_review_url if this is primary
        if (isPrimary) {
            await supabase
                .from('businesses')
                .update({ google_review_url: url })
                .eq('id', id);
        }

        res.json({ 
            message: 'Platform added successfully',
            platform: newPlatform
        });
    } catch (error) {
        console.error('Add platform error:', error);
        res.status(500).json({ error: 'Failed to add platform' });
    }
});

/**
 * PUT /api/business/:id/platforms/:platformId
 * Update a review platform
 */
router.put('/:id/platforms/:platformId', authenticate, async (req, res) => {
    try {
        const { id, platformId } = req.params;
        const { businessId } = req.user;
        const { url, isPrimary, customLabel, isActive } = req.body;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const updates = {};
        
        if (url) {
            const { platform, label } = detectPlatform(url);
            updates.url = url;
            updates.platform_name = platform;
            updates.platform_label = customLabel || label;
        }
        
        if (customLabel) {
            updates.platform_label = customLabel;
        }
        
        if (typeof isActive === 'boolean') {
            updates.is_active = isActive;
        }

        // Handle primary flag
        if (isPrimary === true) {
            // Unset other primaries first
            await supabase
                .from('review_platforms')
                .update({ is_primary: false })
                .eq('business_id', id);
            updates.is_primary = true;
        } else if (isPrimary === false) {
            updates.is_primary = false;
        }

        const { data: updatedPlatform, error } = await supabase
            .from('review_platforms')
            .update(updates)
            .eq('id', platformId)
            .eq('business_id', id)
            .select()
            .single();

        if (error) {
            console.error('Update platform error:', error);
            return res.status(500).json({ error: 'Failed to update platform' });
        }

        // Update legacy google_review_url if this became primary
        if (updates.is_primary && updatedPlatform?.url) {
            await supabase
                .from('businesses')
                .update({ google_review_url: updatedPlatform.url })
                .eq('id', id);
        }

        res.json({ 
            message: 'Platform updated successfully',
            platform: updatedPlatform
        });
    } catch (error) {
        console.error('Update platform error:', error);
        res.status(500).json({ error: 'Failed to update platform' });
    }
});

/**
 * DELETE /api/business/:id/platforms/:platformId
 * Delete a review platform
 */
router.delete('/:id/platforms/:platformId', authenticate, async (req, res) => {
    try {
        const { id, platformId } = req.params;
        const { businessId } = req.user;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { error } = await supabase
            .from('review_platforms')
            .delete()
            .eq('id', platformId)
            .eq('business_id', id);

        if (error) {
            console.error('Delete platform error:', error);
            return res.status(500).json({ error: 'Failed to delete platform' });
        }

        res.json({ message: 'Platform deleted successfully' });
    } catch (error) {
        console.error('Delete platform error:', error);
        res.status(500).json({ error: 'Failed to delete platform' });
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
        let dateFilter = null;
        let prevDateFilter = null;
        const now = new Date();

        if (filter === 'today') {
            const today = now.toISOString().split('T')[0];
            dateFilter = today;
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            prevDateFilter = { start: yesterday.toISOString().split('T')[0], end: today };
        } else if (filter === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = weekAgo.toISOString();
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            prevDateFilter = { start: twoWeeksAgo.toISOString(), end: weekAgo.toISOString() };
        } else if (filter === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = monthAgo.toISOString();
            const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            prevDateFilter = { start: twoMonthsAgo.toISOString(), end: monthAgo.toISOString() };
        } else if (filter === 'year') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            dateFilter = startOfYear.toISOString();
            const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
            prevDateFilter = { start: startOfLastYear.toISOString(), end: startOfYear.toISOString() };
        }

        // Build query — fetch all fields (use * to be resilient to missing columns)
        let query = supabase
            .from('feedbacks')
            .select('*')
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
        const avgRating = total > 0
            ? parseFloat((feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / total).toFixed(1))
            : 0;
        const positiveRate = total > 0 ? Math.round((positive / total) * 100) : 0;

        // NPS Score: Promoters (4-5) - Detractors (1-2), Passives (3) ignored
        const promoters = feedbacks?.filter(f => f.rating >= 4).length || 0;
        const detractors = feedbacks?.filter(f => f.rating <= 2).length || 0;
        const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

        // Response Rate: % of feedbacks with owner_reply
        const replied = feedbacks?.filter(f => f.owner_reply).length || 0;
        const responseRate = total > 0 ? Math.round((replied / total) * 100) : 0;

        // Average response time (hours) for replied feedbacks
        let avgResponseTime = null;
        const repliedFeedbacks = feedbacks?.filter(f => f.owner_reply && f.replied_at && f.created_at) || [];
        if (repliedFeedbacks.length > 0) {
            const totalHours = repliedFeedbacks.reduce((sum, f) => {
                const diff = new Date(f.replied_at) - new Date(f.created_at);
                return sum + (diff / (1000 * 60 * 60));
            }, 0);
            avgResponseTime = parseFloat((totalHours / repliedFeedbacks.length).toFixed(1));
        }

        // Rating distribution (1-5 stars)
        const ratingDistribution = [1, 2, 3, 4, 5].map(star => ({
            star,
            count: feedbacks?.filter(f => f.rating === star).length || 0,
            percentage: total > 0 ? Math.round((feedbacks?.filter(f => f.rating === star).length || 0) / total * 100) : 0
        }));

        // Period comparison - fetch previous period data
        let comparison = null;
        if (prevDateFilter) {
            let prevQuery = supabase
                .from('feedbacks')
                .select('rating, is_positive')
                .eq('business_id', id)
                .gte('created_at', prevDateFilter.start)
                .lt('created_at', prevDateFilter.end);

            const { data: prevFeedbacks } = await prevQuery;
            const prevTotal = prevFeedbacks?.length || 0;
            const prevPositive = prevFeedbacks?.filter(f => f.is_positive).length || 0;
            const prevNegative = prevTotal - prevPositive;
            const prevAvgRating = prevTotal > 0
                ? parseFloat((prevFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / prevTotal).toFixed(1))
                : 0;

            comparison = {
                totalChange: prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : (total > 0 ? 100 : 0),
                positiveChange: prevPositive > 0 ? Math.round(((positive - prevPositive) / prevPositive) * 100) : (positive > 0 ? 100 : 0),
                negativeChange: prevNegative > 0 ? Math.round(((negative - prevNegative) / prevNegative) * 100) : (negative > 0 ? 100 : 0),
                ratingChange: prevAvgRating > 0 ? parseFloat((avgRating - prevAvgRating).toFixed(1)) : 0,
            };
        }

        // Top keywords from feedback messages
        const stopWords = new Set(['the', 'is', 'at', 'in', 'it', 'a', 'an', 'and', 'or', 'to', 'of', 'for', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'not', 'but', 'if', 'they', 'them', 'their', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'we', 'you', 'i', 'me', 'he', 'she', 'with', 'on', 'from', 'by', 'are', 'am', 'so', 'very', 'just', 'all', 'no', 'yes', 'also', 'too', 'more', 'much', 'than', 'then', 'about', 'up', 'out', 'what', 'which', 'who', 'when', 'where', 'how', 'here', 'there', 'really', 'get', 'got', 'us']);
        const wordCounts = {};
        (feedbacks || []).forEach(f => {
            if (f.message) {
                f.message.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(word => {
                    if (word.length > 2 && !stopWords.has(word)) {
                        wordCounts[word] = (wordCounts[word] || 0) + 1;
                    }
                });
            }
        });
        // Only words mentioned more than once
        const topKeywords = Object.entries(wordCounts)
            .filter(([_, count]) => count > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([word, count]) => ({ word, count }));

        res.json({
            total, positive, negative, avgRating, positiveRate,
            npsScore, responseRate, avgResponseTime,
            ratingDistribution, comparison, topKeywords,
            replied, totalWithMessages: feedbacks?.filter(f => f.message).length || 0
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

/**
 * GET /api/business/:id/analytics
 * Get analytics data for charts (authenticated)
 * Query params:
 * - range: 'week', 'month', 'year', 'custom'
 * - startDate: ISO date string (for custom range)
 * - endDate: ISO date string (for custom range)
 */
router.get('/:id/analytics', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;
        const { range, startDate, endDate } = req.query;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized to access this business' });
        }

        const now = new Date();
        let fromDate, toDate = now;
        let groupBy = 'day'; // day, week, month

        // Calculate date range
        if (range === 'week') {
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            groupBy = 'day';
        } else if (range === 'month') {
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            groupBy = 'day';
        } else if (range === 'year') {
            fromDate = new Date(now.getFullYear(), 0, 1); // Start of year
            groupBy = 'month';
        } else if (range === 'custom' && startDate && endDate) {
            fromDate = new Date(startDate);
            toDate = new Date(endDate);
            // If range > 60 days, group by week; if > 180 days, group by month
            const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24);
            if (daysDiff > 180) groupBy = 'month';
            else if (daysDiff > 60) groupBy = 'week';
            else groupBy = 'day';
        } else {
            // Default: last 7 days
            fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            groupBy = 'day';
        }

        // Fetch all feedbacks in range
        const { data: feedbacks, error } = await supabase
            .from('feedbacks')
            .select('rating, is_positive, created_at')
            .eq('business_id', id)
            .gte('created_at', fromDate.toISOString())
            .lte('created_at', toDate.toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            return res.status(500).json({ error: 'Failed to get analytics data' });
        }

        // Group data by date
        const groupedData = {};
        const labels = [];

        // Generate all date labels in range
        const currentDate = new Date(fromDate);
        while (currentDate <= toDate) {
            let label;
            if (groupBy === 'day') {
                label = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
            } else if (groupBy === 'week') {
                // Get week number
                const weekStart = new Date(currentDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                label = `Week ${weekStart.toISOString().split('T')[0]}`;
            } else { // month
                label = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            }

            if (!labels.includes(label)) {
                labels.push(label);
                groupedData[label] = { positive: 0, negative: 0, total: 0, ratings: [] };
            }

            // Advance date
            if (groupBy === 'day') {
                currentDate.setDate(currentDate.getDate() + 1);
            } else if (groupBy === 'week') {
                currentDate.setDate(currentDate.getDate() + 7);
            } else {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }

        // Populate with actual data
        feedbacks.forEach(feedback => {
            const date = new Date(feedback.created_at);
            let label;
            if (groupBy === 'day') {
                label = date.toISOString().split('T')[0];
            } else if (groupBy === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                label = `Week ${weekStart.toISOString().split('T')[0]}`;
            } else {
                label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }

            if (groupedData[label]) {
                groupedData[label].total++;
                groupedData[label].ratings.push(feedback.rating);
                if (feedback.is_positive) {
                    groupedData[label].positive++;
                } else {
                    groupedData[label].negative++;
                }
            }
        });

        // Calculate averages and format for chart
        const chartData = labels.map(label => {
            const data = groupedData[label];
            const avgRating = data.ratings.length > 0 
                ? (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(1)
                : 0;
            
            // Format label for display
            let displayLabel = label;
            if (groupBy === 'day') {
                const d = new Date(label);
                displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else if (groupBy === 'month') {
                const [year, month] = label.split('-');
                const d = new Date(year, parseInt(month) - 1);
                displayLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            }

            return {
                date: label,
                label: displayLabel,
                total: data.total,
                positive: data.positive,
                negative: data.negative,
                avgRating: parseFloat(avgRating)
            };
        });

        // Calculate summary stats
        const totalFeedback = feedbacks.length;
        const totalPositive = feedbacks.filter(f => f.is_positive).length;
        const totalNegative = totalFeedback - totalPositive;
        const avgRating = totalFeedback > 0
            ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedback).toFixed(1)
            : 0;

        res.json({
            chartData,
            summary: {
                total: totalFeedback,
                positive: totalPositive,
                negative: totalNegative,
                avgRating: parseFloat(avgRating),
                positiveRate: totalFeedback > 0 ? Math.round((totalPositive / totalFeedback) * 100) : 0
            },
            range: {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                groupBy
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics data' });
    }
});

// ==================== EXTERNAL FEEDBACK SUMMARIES ====================

/**
 * POST /api/business/:id/external-summaries
 * Save an external feedback summary (Google Form, Google Review, etc.)
 */
router.post('/:id/external-summaries', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;
        const { sourceType, title, rawText } = req.body;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (!rawText || rawText.trim().length === 0) {
            return res.status(400).json({ error: 'Feedback text is required' });
        }

        const summaryId = uuidv4();
        const { error: insertError } = await supabase
            .from('external_summaries')
            .insert({
                id: summaryId,
                business_id: id,
                source_type: sourceType || 'other',
                title: title || `${sourceType || 'External'} Feedback - ${new Date().toLocaleDateString()}`,
                raw_text: rawText.trim(),
                is_analyzed: false
            });

        if (insertError) {
            console.error('Insert external summary error:', insertError);
            return res.status(500).json({ error: 'Failed to save summary. Please ensure the external_summaries table exists.' });
        }

        res.status(201).json({
            message: 'Summary saved successfully',
            summary: {
                id: summaryId,
                source_type: sourceType || 'other',
                title: title || `${sourceType || 'External'} Feedback`,
                is_analyzed: false
            }
        });
    } catch (error) {
        console.error('Save external summary error:', error);
        res.status(500).json({ error: 'Failed to save summary' });
    }
});

/**
 * GET /api/business/:id/external-summaries
 * Get all saved external summaries for a business
 */
router.get('/:id/external-summaries', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { businessId } = req.user;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { data: summaries, error } = await supabase
            .from('external_summaries')
            .select('id, source_type, title, overall_sentiment, overall_score, positive_count, negative_count, total_reviews_found, is_analyzed, analyzed_at, created_at')
            .eq('business_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch summaries error:', error);
            return res.status(500).json({ error: 'Failed to fetch summaries' });
        }

        res.json({ summaries: summaries || [] });
    } catch (error) {
        console.error('Get summaries error:', error);
        res.status(500).json({ error: 'Failed to fetch summaries' });
    }
});

/**
 * GET /api/business/:id/external-summaries/:summaryId
 * Get a single summary with full analysis result
 */
router.get('/:id/external-summaries/:summaryId', authenticate, async (req, res) => {
    try {
        const { id, summaryId } = req.params;
        const { businessId } = req.user;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { data: summary, error } = await supabase
            .from('external_summaries')
            .select('*')
            .eq('id', summaryId)
            .eq('business_id', id)
            .single();

        if (error || !summary) {
            return res.status(404).json({ error: 'Summary not found' });
        }

        res.json({ summary });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

/**
 * POST /api/business/:id/external-summaries/:summaryId/analyze
 * Analyze a saved summary with AI (can re-analyze)
 */
router.post('/:id/external-summaries/:summaryId/analyze', authenticate, async (req, res) => {
    try {
        const { id, summaryId } = req.params;
        const { businessId } = req.user;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Fetch the summary
        const { data: summary, error: fetchError } = await supabase
            .from('external_summaries')
            .select('*')
            .eq('id', summaryId)
            .eq('business_id', id)
            .single();

        if (fetchError || !summary) {
            return res.status(404).json({ error: 'Summary not found' });
        }

        console.log(`[analyze-summary] Analyzing summary ${summaryId} (${summary.source_type})...`);

        // Run AI analysis
        const analysis = await analyzeBulkSummary(summary.raw_text, summary.source_type);

        // Update the summary with analysis results
        const { error: updateError } = await supabase
            .from('external_summaries')
            .update({
                analysis_result: analysis,
                overall_sentiment: analysis.overallSentiment,
                overall_score: analysis.overallScore,
                positive_count: analysis.positiveCount,
                negative_count: analysis.negativeCount,
                total_reviews_found: analysis.totalFound,
                is_analyzed: true,
                analyzed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', summaryId);

        if (updateError) {
            console.error('Update summary error:', updateError);
        }

        // Also save individual feedbacks to the main feedbacks table
        let savedCount = 0;
        if (analysis.feedbacks && analysis.feedbacks.length > 0) {
            for (const fb of analysis.feedbacks) {
                const feedbackId = uuidv4();
                const rating = Math.min(5, Math.max(1, fb.rating || 3));
                const isPositive = fb.sentiment === 'positive' || rating >= 4;

                const { error: insertError } = await supabase
                    .from('feedbacks')
                    .insert({
                        id: feedbackId,
                        business_id: id,
                        rating: rating,
                        message: fb.text || fb.summary || 'External feedback',
                        is_positive: isPositive,
                        notified: false,
                        source: summary.source_type || 'external',
                        ai_sentiment: fb.sentiment,
                        ai_confidence: fb.confidence
                    });

                if (!insertError) savedCount++;
            }
        }

        console.log(`[analyze-summary] Analysis complete. Found ${analysis.totalFound} feedbacks, saved ${savedCount} to dashboard.`);

        res.json({
            message: 'Analysis complete',
            analysis,
            savedCount
        });
    } catch (error) {
        console.error('Analyze summary error:', error);
        res.status(500).json({ error: 'Failed to analyze summary' });
    }
});

/**
 * DELETE /api/business/:id/external-summaries/:summaryId
 * Delete a saved summary
 */
router.delete('/:id/external-summaries/:summaryId', authenticate, async (req, res) => {
    try {
        const { id, summaryId } = req.params;
        const { businessId } = req.user;

        if (id !== businessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { error } = await supabase
            .from('external_summaries')
            .delete()
            .eq('id', summaryId)
            .eq('business_id', id);

        if (error) {
            return res.status(500).json({ error: 'Failed to delete summary' });
        }

        res.json({ message: 'Summary deleted' });
    } catch (error) {
        console.error('Delete summary error:', error);
        res.status(500).json({ error: 'Failed to delete summary' });
    }
});

export default router;
