import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { feedbackLimiter } from '../middleware/rateLimit.js';
import { analyzeFeedback, analyzeBulkFeedback, analyzeExternalFeedback, fetchAndAnalyzeUrl } from '../services/ai.js';
import { sendNegativeFeedbackAlert, sendReplyToCustomer } from '../services/email.js';
import { isValidEmail, truncate } from '../middleware/sanitize.js';

const router = express.Router();

/**
 * POST /api/feedback/:businessId
 * Submit feedback (public - from QR code)
 */
router.post('/:businessId', feedbackLimiter, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { rating, message, customerEmail } = req.body;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // SECURITY: Validate and limit input lengths
        if (message && message.length > 5000) {
            return res.status(400).json({ error: 'Feedback message is too long (max 5000 characters)' });
        }

        // SECURITY: Validate customer email format if provided
        if (customerEmail && !isValidEmail(customerEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
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

        // Determine if positive feedback (4-5 stars) — initial guess from rating
        let isPositive = rating >= 4;
        const feedbackId = uuidv4();

        // Run AI sentiment analysis BEFORE saving (instant, no retries — fallback is fast)
        let aiSentiment = null;
        let aiConfidence = null;
        let sentimentMismatch = false;

        if (message && message.trim()) {
            try {
                console.log(`[AI] Analyzing sentiment before saving feedback ${feedbackId}...`);
                const analysis = await analyzeFeedback(message.trim());
                
                if (analysis && analysis.sentiment) {
                    aiSentiment = analysis.sentiment;
                    aiConfidence = analysis.confidence || 0;
                    
                    // Detect mismatch: high stars + negative text, OR low stars + positive text
                    sentimentMismatch = 
                        (rating >= 4 && aiSentiment === 'negative') || 
                        (rating <= 2 && aiSentiment === 'positive');
                    
                    // Correct is_positive based on AI when there's a mismatch
                    if (sentimentMismatch) {
                        isPositive = aiSentiment === 'positive';
                        console.log(`[AI] ⚠️ MISMATCH: Rating=${rating}★ but text is ${aiSentiment} (${aiConfidence}%) → is_positive=${isPositive}`);
                    } else {
                        console.log(`[AI] ✅ ${aiSentiment} (${aiConfidence}%) matches ${rating}★ rating`);
                    }
                }
            } catch (aiError) {
                console.error('[AI] Analysis failed, using star rating only:', aiError.message);
            }
        }

        // Insert feedback with AI-corrected sentiment already applied
        const { error: insertError } = await supabase
            .from('feedbacks')
            .insert({
                id: feedbackId,
                business_id: businessId,
                rating: parseInt(rating),
                message: message || null,
                customer_email: customerEmail && customerEmail.trim() ? customerEmail.trim().toLowerCase() : null,
                is_positive: isPositive,
                ai_sentiment: aiSentiment,
                ai_confidence: aiConfidence,
                sentiment_mismatch: sentimentMismatch,
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

        // Send email alert for negative feedback (non-blocking)
        if (!isPositive) {
            try {
                const { data: businessDetails } = await supabase
                    .from('businesses')
                    .select('name, owner_email')
                    .eq('id', businessId)
                    .single();

                if (businessDetails?.owner_email) {
                    sendNegativeFeedbackAlert(
                        businessDetails.owner_email,
                        businessDetails.name || 'Your Business',
                        { message: message || '', rating, sentiment: aiSentiment }
                    ).catch(err => console.error('[Email] Alert failed:', err.message));
                }
            } catch (emailErr) {
                console.error('[Email] Failed to send negative feedback alert:', emailErr.message);
            }
        }

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
            const today = now.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
            query = query.gte('created_at', today);
        } else if (filter === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            query = query.gte('created_at', weekAgo.toISOString());
        } else if (filter === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            query = query.gte('created_at', monthAgo.toISOString());
        } else if (filter === 'year') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            query = query.gte('created_at', startOfYear.toISOString());
        }
        // filter === 'all' or undefined → no date filter → fetch everything

        // Apply type filter
        if (type === 'negative') {
            query = query.eq('is_positive', false);
        } else if (type === 'positive') {
            query = query.eq('is_positive', true);
        }

        const { data: feedbacks, error } = await query.limit(500);

        if (error) {
            return res.status(500).json({ error: 'Failed to get feedbacks' });
        }

        // Strip customer_email for privacy but indicate if one exists
        const sanitized = (feedbacks || []).map(fb => {
            const { customer_email, ...rest } = fb;
            return { ...rest, has_email: !!customer_email };
        });

        res.json({ feedbacks: sanitized });
    } catch (error) {
        console.error('Get feedbacks error:', error);
        res.status(500).json({ error: 'Failed to get feedbacks' });
    }
});

/**
 * POST /api/feedback/:businessId/external
 * Submit feedback from external source (Google Forms, surveys, etc.)
 * AI analyzes the text to determine sentiment & rating
 */
router.post('/:businessId/external', authenticate, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { businessId: userBusinessId } = req.user;
        const { text, source } = req.body;

        if (businessId !== userBusinessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Feedback text is required' });
        }

        // AI analyzes the feedback
        const analysis = await analyzeExternalFeedback(text);

        const feedbackId = uuidv4();

        // Insert the analyzed feedback
        const { error: insertError } = await supabase
            .from('feedbacks')
            .insert({
                id: feedbackId,
                business_id: businessId,
                rating: analysis.rating,
                message: text.trim(),
                is_positive: analysis.isPositive,
                notified: false,
                source: source || 'external',
                ai_sentiment: analysis.sentiment,
                ai_confidence: analysis.confidence,
                ai_summary: analysis.summary,
                ai_category: analysis.category
            });

        if (insertError) {
            // If columns don't exist, insert without AI fields
            const { error: fallbackError } = await supabase
                .from('feedbacks')
                .insert({
                    id: feedbackId,
                    business_id: businessId,
                    rating: analysis.rating,
                    message: text.trim(),
                    is_positive: analysis.isPositive,
                    notified: false
                });

            if (fallbackError) {
                console.error('Insert external feedback error:', fallbackError);
                return res.status(500).json({ error: 'Failed to save feedback' });
            }
        }

        res.status(201).json({
            message: 'External feedback analyzed and saved',
            feedback: {
                id: feedbackId,
                text: text.trim(),
                analysis
            }
        });
    } catch (error) {
        console.error('External feedback error:', error);
        res.status(500).json({ error: 'Failed to process external feedback' });
    }
});

/**
 * GET /api/feedback/:businessId/ai-summary
 * Get AI-generated summary of all feedbacks for a business
 */
router.get('/:businessId/ai-summary', authenticate, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { businessId: userBusinessId } = req.user;
        const { filter } = req.query;

        if (businessId !== userBusinessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Fetch feedbacks
        let query = supabase
            .from('feedbacks')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

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

        const { data: feedbacks, error } = await query.limit(200);

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch feedbacks' });
        }

        if (!feedbacks || feedbacks.length === 0) {
            return res.json({
                totalAnalyzed: 0,
                overallSummary: 'No feedback available for this period.',
                positive: 0,
                negative: 0,
                topPositivePoints: [],
                topNegativePoints: [],
                recommendations: []
            });
        }

        // AI bulk analysis
        const summary = await analyzeBulkFeedback(feedbacks);

        res.json(summary);
    } catch (error) {
        console.error('AI summary error:', error);
        res.status(500).json({ error: 'Failed to generate AI summary' });
    }
});

/**
 * POST /api/feedback/:businessId/analyze-url
 * Fetch a URL, extract page content, analyze all feedback found with AI
 */
router.post('/:businessId/analyze-url', authenticate, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { businessId: userBusinessId } = req.user;
        const { url, platformLabel, platformName } = req.body;

        if (businessId !== userBusinessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        console.log(`[analyze-url] Fetching and analyzing: ${url}`);

        // Fetch and analyze the URL content
        const analysis = await fetchAndAnalyzeUrl(url, platformLabel);

        if (analysis.error && !analysis.success) {
            return res.status(400).json({ error: analysis.error });
        }

        // Save each found feedback into the database
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
                        business_id: businessId,
                        rating: rating,
                        message: fb.text || fb.summary || 'No text',
                        is_positive: isPositive,
                        notified: false
                    });

                if (!insertError) savedCount++;
            }
        }

        console.log(`[analyze-url] Found ${analysis.totalFound} feedbacks, saved ${savedCount}`);

        res.json({
            ...analysis,
            savedCount
        });
    } catch (error) {
        console.error('Analyze URL error:', error);
        res.status(500).json({ error: 'Failed to analyze URL' });
    }
});

/**
 * POST /api/feedback/:businessId/:feedbackId/reply
 * Reply to a feedback (business owner)
 */
router.post('/:businessId/:feedbackId/reply', authenticate, async (req, res) => {
    try {
        const { businessId, feedbackId } = req.params;
        const { businessId: userBusinessId } = req.user;
        const { reply } = req.body;

        if (businessId !== userBusinessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (!reply && reply !== '') {
            return res.status(400).json({ error: 'Reply text is required' });
        }

        // If reply is empty string, it means "hide/remove reply"
        const updateData = reply.trim() 
            ? { owner_reply: reply.trim(), replied_at: new Date().toISOString() }
            : { owner_reply: null, replied_at: null };

        const { data, error } = await supabase
            .from('feedbacks')
            .update(updateData)
            .eq('id', feedbackId)
            .eq('business_id', businessId)
            .select()
            .single();

        if (error) {
            console.error('Reply error:', error);
            return res.status(500).json({ error: 'Failed to save reply' });
        }

        // Respond immediately — don't block on email sending (prevents Vercel proxy timeout / 502)
        const hasEmail = !!(data?.customer_email && reply.trim());
        res.json({ message: 'Reply saved', feedback: data, emailSent: hasEmail ? 'pending' : false });

        // Fire-and-forget: send reply email to customer in background
        if (hasEmail) {
            (async () => {
                try {
                    const { data: biz } = await supabase
                        .from('businesses')
                        .select('name')
                        .eq('id', businessId)
                        .single();

                    const result = await sendReplyToCustomer(
                        data.customer_email,
                        biz?.name || 'The Business',
                        {
                            originalMessage: data.message || '',
                            originalRating: data.rating,
                            replyText: reply.trim()
                        }
                    );
                    console.log(`[Email] Reply sent to customer ${data.customer_email}: ${result.success}`);
                } catch (emailErr) {
                    console.error('[Email] Failed to send reply to customer:', emailErr.message);
                }
            })();
        }
    } catch (error) {
        console.error('Reply error:', error);
        res.status(500).json({ error: 'Failed to save reply' });
    }
});

/**
 * DELETE /api/feedback/:businessId/:feedbackId
 * Delete a feedback entry
 */
router.delete('/:businessId/:feedbackId', authenticate, async (req, res) => {
    try {
        const { businessId, feedbackId } = req.params;
        const { businessId: userBusinessId } = req.user;

        if (businessId !== userBusinessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { error } = await supabase
            .from('feedbacks')
            .delete()
            .eq('id', feedbackId)
            .eq('business_id', businessId);

        if (error) {
            console.error('Delete feedback error:', error);
            return res.status(500).json({ error: 'Failed to delete feedback' });
        }

        res.json({ message: 'Feedback deleted' });
    } catch (error) {
        console.error('Delete feedback error:', error);
        res.status(500).json({ error: 'Failed to delete feedback' });
    }
});

/**
 * PATCH /api/feedback/:businessId/:feedbackId/pin
 * Toggle pin/bookmark on a feedback
 */
router.patch('/:businessId/:feedbackId/pin', authenticate, async (req, res) => {
    try {
        const { businessId, feedbackId } = req.params;
        const { businessId: userBusinessId } = req.user;

        if (businessId !== userBusinessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Get current pin state
        const { data: feedback, error: fetchError } = await supabase
            .from('feedbacks')
            .select('is_pinned')
            .eq('id', feedbackId)
            .eq('business_id', businessId)
            .single();

        if (fetchError || !feedback) {
            return res.status(404).json({ error: 'Feedback not found' });
        }

        const newPinState = !feedback.is_pinned;

        const { error: updateError } = await supabase
            .from('feedbacks')
            .update({ is_pinned: newPinState })
            .eq('id', feedbackId)
            .eq('business_id', businessId);

        if (updateError) {
            return res.status(500).json({ error: 'Failed to update pin status' });
        }

        res.json({ message: newPinState ? 'Feedback pinned' : 'Feedback unpinned', is_pinned: newPinState });
    } catch (error) {
        console.error('Pin feedback error:', error);
        res.status(500).json({ error: 'Failed to pin feedback' });
    }
});

/**
 * GET /api/feedback/:businessId/export
 * Export feedbacks as CSV
 */
router.get('/:businessId/export', authenticate, async (req, res) => {
    try {
        const { businessId } = req.params;
        const { businessId: userBusinessId } = req.user;
        const { filter, type } = req.query;

        if (businessId !== userBusinessId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        let query = supabase
            .from('feedbacks')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        // Apply date filter
        const now = new Date();
        if (filter === 'today') {
            query = query.gte('created_at', now.toISOString().split('T')[0]);
        } else if (filter === 'week') {
            query = query.gte('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());
        } else if (filter === 'month') {
            query = query.gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
        } else if (filter === 'year') {
            query = query.gte('created_at', new Date(now.getFullYear(), 0, 1).toISOString());
        }

        if (type === 'negative') query = query.eq('is_positive', false);
        else if (type === 'positive') query = query.eq('is_positive', true);

        const { data: feedbacks, error } = await query.limit(5000);

        if (error) {
            return res.status(500).json({ error: 'Failed to export feedbacks' });
        }

        // Build CSV
        const headers = ['Date', 'Time', 'Rating', 'Sentiment', 'Message', 'AI Sentiment', 'AI Confidence', 'Owner Reply', 'Reply Date'];
        const rows = (feedbacks || []).map(fb => {
            const date = fb.created_at ? new Date(fb.created_at) : null;
            return [
                date ? date.toLocaleDateString() : '',
                date ? date.toLocaleTimeString() : '',
                fb.rating != null ? fb.rating : '',
                fb.is_positive ? 'Positive' : 'Negative',
                `"${(fb.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
                fb.ai_sentiment || '',
                fb.ai_confidence != null ? fb.ai_confidence : '',
                `"${(fb.owner_reply || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
                fb.replied_at ? new Date(fb.replied_at).toLocaleDateString() : ''
            ].join(',');
        });

        const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=feedbacks_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export feedbacks' });
    }
});

export default router;
