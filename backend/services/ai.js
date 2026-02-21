/**
 * AI Feedback Analysis Service
 * Uses Google Gemini API to analyze feedback text
 * and classify it as positive/negative with a summary
 */

// SECURITY: No hardcoded API key — must be set via environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.warn('[AI] WARNING: GEMINI_API_KEY not set. AI analysis will be disabled.');
}
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Call Gemini API with automatic retry on 429 rate limit errors
 * @param {string} prompt - The prompt text
 * @param {number} maxTokens - Max output tokens
 * @param {number} retries - Number of retries (default 3)
 * @param {number} baseWaitMs - Base wait time per retry in ms (default 10000)
 */
async function callGeminiWithRetry(prompt, maxTokens = 1000, retries = 3, baseWaitMs = 10000) {
    if (!GEMINI_API_KEY) {
        console.warn('[Gemini] API key not configured — skipping AI analysis');
        return { ok: false, status: 0, error: 'API key not configured' };
    }
    for (let attempt = 0; attempt < retries; attempt++) {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: maxTokens
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            return { ok: true, text };
        }

        if (response.status === 429) {
            const waitMs = (attempt + 1) * baseWaitMs;
            console.log(`[Gemini] Rate limited (429). Waiting ${waitMs / 1000}s before retry ${attempt + 1}/${retries}...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
        }

        // Non-retryable error
        console.error(`[Gemini] API error: ${response.status}`);
        return { ok: false, status: response.status };
    }

    console.error('[Gemini] All retries exhausted (429)');
    return { ok: false, status: 429 };
}

/**
 * Normalize URLs for better scraping
 * - Google Forms /edit → /viewform (public view)
 * - Remove fragments that need auth
 */
function normalizeUrl(url) {
    let normalized = url;

    // Google Forms: convert /edit to /viewform for public access
    if (normalized.includes('docs.google.com/forms')) {
        // Extract the form ID and build a clean viewform URL
        const match = normalized.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            normalized = `https://docs.google.com/forms/d/${match[1]}/viewform`;
        }
    }

    return normalized;
}

/**
 * Fetch a URL and extract its text content for analysis
 * Works with Google Forms, survey pages, review sites, etc.
 * SECURITY: Includes SSRF protection — blocks private/internal URLs
 */
export async function fetchAndAnalyzeUrl(url, platformLabel) {
    if (!url) {
        return { error: 'No URL provided', feedbacks: [] };
    }

    try {
        // SECURITY: SSRF protection — block private/internal IPs
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return { error: 'Only HTTP/HTTPS URLs are allowed', feedbacks: [] };
        }

        const hostname = parsedUrl.hostname.toLowerCase();
        const blockedPatterns = [
            /^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./,
            /^192\.168\./, /^0\./, /^169\.254\./, /^::1$/, /\.local$/i, /\.internal$/i,
        ];
        for (const pattern of blockedPatterns) {
            if (pattern.test(hostname)) {
                return { error: 'URL points to a restricted address', feedbacks: [] };
            }
        }

        // Normalize URL for better access (e.g. Google Forms /edit → /viewform)
        const fetchUrl = normalizeUrl(url);
        console.log(`[fetchAndAnalyzeUrl] Original: ${url}`);
        console.log(`[fetchAndAnalyzeUrl] Normalized: ${fetchUrl}`);

        // Step 1: Fetch the page content
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(fetchUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return { error: `Failed to fetch URL (status ${response.status})`, feedbacks: [] };
        }

        const html = await response.text();

        // Step 2: Extract readable text from HTML
        const pageText = extractTextFromHtml(html);

        if (!pageText || pageText.trim().length < 20) {
            return { 
                error: 'Could not extract enough content from this page. The page may require login or have dynamic content that cannot be read directly.',
                feedbacks: [] 
            };
        }

        // Step 3: Send to Gemini for analysis — ask it to find and analyze ALL feedback/responses
        const prompt = `You are a feedback extraction and analysis AI. A business owner has shared a link from "${platformLabel || 'a review platform'}".

Below is the text content extracted from that page. Your job:
1. Find ALL customer feedback, responses, reviews, or survey answers in this content
2. For each piece of feedback, classify it as positive or negative
3. Provide an overall summary

Page content:
"""
${pageText.substring(0, 8000)}
"""

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "platformName": "${platformLabel || 'External'}",
  "totalFound": number of individual feedbacks found,
  "overallSentiment": "positive" or "negative" or "mixed",
  "overallScore": number 0-100,
  "overallSummary": "2-3 sentence summary of all feedback found",
  "feedbacks": [
    {
      "text": "the feedback text",
      "sentiment": "positive" or "negative" or "neutral",
      "rating": number 1-5,
      "summary": "one line summary"
    }
  ],
  "topPositivePoints": ["point1", "point2"],
  "topNegativePoints": ["point1", "point2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "positiveCount": number,
  "negativeCount": number
}

If you cannot find any feedback/reviews in the content, return:
{"totalFound": 0, "overallSummary": "No customer feedback found on this page. The page may be a form template, login page, or contain no responses.", "feedbacks": [], "topPositivePoints": [], "topNegativePoints": [], "recommendations": [], "positiveCount": 0, "negativeCount": 0, "overallSentiment": "neutral", "overallScore": 0, "platformName": "${platformLabel || 'External'}"}`;

        const geminiResult = await callGeminiWithRetry(prompt, 2000, 3);

        if (!geminiResult.ok) {
            console.error('Gemini URL analysis failed after retries, status:', geminiResult.status);
            // Fallback: return the extracted text for manual analysis
            return { 
                error: geminiResult.status === 429 
                    ? 'AI is busy right now (rate limited). Please wait 30 seconds and try again.'
                    : 'AI analysis service temporarily unavailable. Please try again.',
                pageTextPreview: pageText.substring(0, 500),
                feedbacks: [] 
            };
        }

        const aiText = geminiResult.text;

        if (!aiText) {
            return { error: 'AI returned empty response', feedbacks: [] };
        }

        const cleanText = aiText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const result = JSON.parse(cleanText);

        return {
            success: true,
            platformName: result.platformName || platformLabel || 'External',
            totalFound: result.totalFound || 0,
            overallSentiment: result.overallSentiment || 'neutral',
            overallScore: result.overallScore || 0,
            overallSummary: result.overallSummary || 'Analysis complete',
            feedbacks: result.feedbacks || [],
            topPositivePoints: result.topPositivePoints || [],
            topNegativePoints: result.topNegativePoints || [],
            recommendations: result.recommendations || [],
            positiveCount: result.positiveCount || 0,
            negativeCount: result.negativeCount || 0
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            return { error: 'Request timed out. The page took too long to load.', feedbacks: [] };
        }
        console.error('URL analysis error:', error);
        return { error: `Failed to analyze: ${error.message}`, feedbacks: [] };
    }
}

/**
 * Extract readable text from HTML, stripping tags and scripts
 */
function extractTextFromHtml(html) {
    // Remove scripts, styles, and comments
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

    // Replace block-level tags with newlines
    text = text
        .replace(/<(br|hr|p|div|li|tr|h[1-6]|blockquote|section|article)[^>]*>/gi, '\n')
        .replace(/<\/?(table|thead|tbody|tfoot)[^>]*>/gi, '\n');

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code));

    // Clean up whitespace
    text = text
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');

    return text;
}

/**
 * Analyze a single feedback message using AI
 * Returns: { sentiment: 'positive' | 'negative' | 'neutral', confidence: 0-100, summary: string }
 */
export async function analyzeFeedback(message) {
    if (!message || message.trim().length === 0) {
        return { sentiment: 'neutral', confidence: 50, summary: 'No message provided' };
    }

    try {
        const prompt = `You are a feedback analysis AI. Analyze the following customer feedback and respond ONLY with valid JSON (no markdown, no code blocks).

Feedback: "${message}"

Respond with this exact JSON format:
{"sentiment": "positive" or "negative" or "neutral", "confidence": number between 0-100, "summary": "one line summary of the feedback", "keyPoints": ["point1", "point2"]}`;

        // Single attempt, no retry wait — instant fallback to keyword analysis if API fails
        const geminiResult = await callGeminiWithRetry(prompt, 300, 1, 0);

        if (!geminiResult.ok || !geminiResult.text) {
            return fallbackAnalysis(message);
        }

        // Parse the JSON response (strip any markdown formatting)
        const cleanText = geminiResult.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const result = JSON.parse(cleanText);

        return {
            sentiment: result.sentiment || 'neutral',
            confidence: result.confidence || 50,
            summary: result.summary || message.substring(0, 100),
            keyPoints: result.keyPoints || []
        };
    } catch (error) {
        console.error('AI analysis error:', error);
        return fallbackAnalysis(message);
    }
}

/**
 * Analyze multiple feedbacks and generate a comprehensive summary
 */
export async function analyzeBulkFeedback(feedbacks) {
    if (!feedbacks || feedbacks.length === 0) {
        return {
            totalAnalyzed: 0,
            positive: 0,
            negative: 0,
            neutral: 0,
            overallSummary: 'No feedback to analyze',
            topPositivePoints: [],
            topNegativePoints: [],
            recommendations: []
        };
    }

    try {
        const feedbackList = feedbacks
            .map((f, i) => `${i + 1}. [Rating: ${f.rating}/5] "${f.message || 'No message'}"`)
            .join('\n');

        const prompt = `You are a business feedback analyst AI. Analyze these customer feedbacks and respond ONLY with valid JSON (no markdown, no code blocks).

Feedbacks:
${feedbackList}

Respond with this exact JSON format:
{
  "overallSentiment": "positive" or "negative" or "mixed",
  "overallScore": number between 0-100,
  "overallSummary": "2-3 sentence summary of all feedback",
  "positive": ${feedbacks.filter(f => f.is_positive).length},
  "negative": ${feedbacks.filter(f => !f.is_positive).length},
  "topPositivePoints": ["what customers love point 1", "point 2", "point 3"],
  "topNegativePoints": ["what needs improvement point 1", "point 2"],
  "recommendations": ["actionable recommendation 1", "recommendation 2", "recommendation 3"],
  "categoryBreakdown": [
    {"category": "Service", "sentiment": "positive", "count": 0},
    {"category": "Quality", "sentiment": "positive", "count": 0}
  ]
}`;

        const geminiResult = await callGeminiWithRetry(prompt, 1000);

        if (!geminiResult.ok || !geminiResult.text) {
            return fallbackBulkAnalysis(feedbacks);
        }

        const cleanText = geminiResult.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const result = JSON.parse(cleanText);

        return {
            totalAnalyzed: feedbacks.length,
            overallSentiment: result.overallSentiment || 'mixed',
            overallScore: result.overallScore || 50,
            overallSummary: result.overallSummary || 'Analysis complete',
            positive: result.positive || 0,
            negative: result.negative || 0,
            topPositivePoints: result.topPositivePoints || [],
            topNegativePoints: result.topNegativePoints || [],
            recommendations: result.recommendations || [],
            categoryBreakdown: result.categoryBreakdown || []
        };
    } catch (error) {
        console.error('Bulk AI analysis error:', error);
        return fallbackBulkAnalysis(feedbacks);
    }
}

/**
 * Analyze feedback from external sources (Google Forms, etc.)
 * Takes raw text input and classifies it
 */
export async function analyzeExternalFeedback(text) {
    if (!text || text.trim().length === 0) {
        return { sentiment: 'neutral', confidence: 50, summary: 'Empty feedback', rating: 3, isPositive: false };
    }

    try {
        const prompt = `You are a feedback classification AI. A business owner has received this feedback from an external source (Google Form, survey, email, etc.). Analyze it and respond ONLY with valid JSON (no markdown, no code blocks).

Feedback text: "${text}"

Respond with this exact JSON format:
{"sentiment": "positive" or "negative" or "neutral", "confidence": number 0-100, "rating": number 1-5 (estimated star rating), "isPositive": true or false, "summary": "one line summary", "keyPoints": ["point1", "point2"], "category": "Service/Quality/Price/Ambiance/Staff/Other"}`;

        const geminiResult = await callGeminiWithRetry(prompt, 300);

        if (!geminiResult.ok || !geminiResult.text) {
            console.log('[AI] Gemini unavailable, using enhanced fallback for external feedback');
            return fallbackExternalAnalysis(text);
        }

        const cleanText = geminiResult.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const result = JSON.parse(cleanText);

        return {
            sentiment: result.sentiment || 'neutral',
            confidence: result.confidence || 50,
            rating: Math.min(5, Math.max(1, result.rating || 3)),
            isPositive: result.isPositive ?? (result.rating >= 4),
            summary: result.summary || text.substring(0, 100),
            keyPoints: result.keyPoints || [],
            category: result.category || 'Other'
        };
    } catch (error) {
        console.error('External feedback analysis error:', error);
        return fallbackExternalAnalysis(text);
    }
}

// ========== Enhanced Fallback Analysis (used when Gemini API is unavailable) ==========

// Comprehensive word lists for sentiment scoring
const POSITIVE_WORDS = [
    'good', 'great', 'excellent', 'amazing', 'love', 'loved', 'best', 'wonderful', 'fantastic',
    'happy', 'satisfied', 'recommend', 'awesome', 'perfect', 'nice', 'friendly', 'delicious',
    'tasty', 'fresh', 'clean', 'fast', 'quick', 'helpful', 'polite', 'beautiful', 'comfortable',
    'outstanding', 'superb', 'brilliant', 'exceptional', 'impressed', 'impressive', 'enjoy',
    'enjoyed', 'pleasant', 'welcoming', 'cozy', 'worth', 'affordable', 'reasonable', 'favorite',
    'favourite', 'yummy', 'quality', 'authentic', 'genuine', 'consistent', 'reliable', 'must visit',
    'must try', 'highly recommend', 'top notch', 'five star', '5 star', 'thumbs up', 'well done',
    'thank', 'thanks', 'grateful', 'appreciate', 'appreciated', 'smile', 'warm', 'kind'
];

const NEGATIVE_WORDS = [
    'bad', 'terrible', 'awful', 'worst', 'hate', 'hated', 'horrible', 'poor', 'disappointed',
    'rude', 'slow', 'dirty', 'expensive', 'complaint', 'waste', 'overpriced', 'cold', 'stale',
    'bland', 'tasteless', 'unhygienic', 'unhelpful', 'unprofessional', 'disgusting', 'gross',
    'mediocre', 'average', 'boring', 'unpleasant', 'unfriendly', 'pathetic', 'lousy', 'dreadful',
    'worse', 'annoying', 'frustrated', 'frustrating', 'uncomfortable', 'noisy', 'crowded',
    'overcooked', 'undercooked', 'raw', 'soggy', 'never again', 'not worth', 'do not recommend',
    'stay away', 'avoid', 'regret', 'scam', 'rip off', 'ripoff', 'misleading', 'fake',
    'deteriorated', 'declined', 'unhappy', 'unsatisfied', 'angry', 'furious', 'unacceptable',
    'inedible', 'horrible', 'nasty', 'cockroach', 'bug', 'hair in', 'food poisoning', 'sick'
];

const CATEGORY_KEYWORDS = {
    'Food Quality': ['food', 'taste', 'flavor', 'dish', 'meal', 'cook', 'fresh', 'stale', 'delicious', 'bland', 'menu', 'recipe', 'ingredient', 'spicy', 'sweet', 'salty'],
    'Service': ['service', 'staff', 'waiter', 'server', 'manager', 'rude', 'polite', 'friendly', 'helpful', 'slow', 'fast', 'attentive', 'response', 'wait time', 'waiting'],
    'Ambiance': ['ambiance', 'atmosphere', 'decor', 'music', 'lighting', 'seating', 'clean', 'dirty', 'noise', 'cozy', 'comfortable', 'crowded', 'spacious'],
    'Value': ['price', 'value', 'expensive', 'cheap', 'affordable', 'overpriced', 'worth', 'cost', 'bill', 'portion', 'quantity', 'money'],
    'Delivery': ['delivery', 'packaging', 'order', 'late', 'on time', 'cold food', 'missing items', 'wrong order', 'app', 'online']
};

// Score a single piece of text for sentiment
function scoreSentiment(text) {
    const lower = text.toLowerCase();
    let posScore = 0;
    let negScore = 0;

    for (const word of POSITIVE_WORDS) {
        if (lower.includes(word)) posScore++;
    }
    for (const word of NEGATIVE_WORDS) {
        if (lower.includes(word)) negScore++;
    }

    // Check for star ratings in text (e.g., "4/5", "★★★★", "4 stars")
    const starMatch = lower.match(/(\d)\s*(?:\/\s*5|stars?|★)/);
    if (starMatch) {
        const stars = parseInt(starMatch[1]);
        if (stars >= 4) posScore += 3;
        else if (stars >= 3) posScore += 1;
        else negScore += 3;
    }

    // Check for negation patterns that flip sentiment
    const negationPatterns = ['not good', 'not great', 'not recommend', 'not worth', 'not happy', 'not satisfied', 'not fresh', 'not clean'];
    for (const pattern of negationPatterns) {
        if (lower.includes(pattern)) {
            posScore = Math.max(0, posScore - 2);
            negScore += 2;
        }
    }

    return { posScore, negScore };
}

// Detect category from text
function detectCategory(text) {
    const lower = text.toLowerCase();
    let bestCategory = 'General';
    let bestCount = 0;

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        const count = keywords.filter(k => lower.includes(k)).length;
        if (count > bestCount) {
            bestCount = count;
            bestCategory = category;
        }
    }
    return bestCategory;
}

// Split pasted text into individual reviews
function splitIntoReviews(text) {
    // Try splitting by common review separators
    let reviews = [];

    // Pattern 1: Numbered reviews (1. review, 2. review)
    const numbered = text.split(/\n\s*\d+[\.\)]\s*/);
    if (numbered.length > 2) {
        reviews = numbered.filter(r => r.trim().length > 10);
        if (reviews.length > 1) return reviews;
    }

    // Pattern 2: Double newlines separate reviews
    const byDoubleNewline = text.split(/\n\s*\n/);
    if (byDoubleNewline.length > 1) {
        reviews = byDoubleNewline.filter(r => r.trim().length > 10);
        if (reviews.length > 1) return reviews;
    }

    // Pattern 3: Reviews separated by dashes or stars
    const byDash = text.split(/\n\s*[-—=★]{3,}\s*\n/);
    if (byDash.length > 1) {
        reviews = byDash.filter(r => r.trim().length > 10);
        if (reviews.length > 1) return reviews;
    }

    // Pattern 4: Single newlines (each line is a review)  
    const byNewline = text.split(/\n/);
    if (byNewline.length > 1) {
        reviews = byNewline.filter(r => r.trim().length > 15);
        if (reviews.length > 1) return reviews;
    }

    // If no splitting works, treat complete text as one review
    return [text.trim()];
}

function fallbackAnalysis(message) {
    const { posScore, negScore } = scoreSentiment(message);
    const total = posScore + negScore;
    const confidence = total === 0 ? 35 : Math.min(75, 40 + total * 5);

    let sentiment;
    if (posScore > negScore) sentiment = 'positive';
    else if (negScore > posScore) sentiment = 'negative';
    else sentiment = 'neutral';

    const category = detectCategory(message);
    const keyPoints = [];
    if (posScore > 0) keyPoints.push(`Found ${posScore} positive indicator(s)`);
    if (negScore > 0) keyPoints.push(`Found ${negScore} negative indicator(s)`);

    return {
        sentiment,
        confidence,
        summary: message.length > 150 ? message.substring(0, 147) + '...' : message,
        keyPoints,
        category,
        note: '⚠️ AI service temporarily unavailable - using keyword-based analysis'
    };
}

function fallbackBulkAnalysis(feedbacks) {
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const posPoints = [];
    const negPoints = [];
    const categories = {};

    for (const feedback of feedbacks) {
        const text = feedback.message || feedback.text || '';
        const { posScore, negScore } = scoreSentiment(text);
        const category = detectCategory(text);

        categories[category] = (categories[category] || 0) + 1;

        if (posScore > negScore) {
            positiveCount++;
            if (posPoints.length < 3) posPoints.push(text.substring(0, 80));
        } else if (negScore > posScore) {
            negativeCount++;
            if (negPoints.length < 3) negPoints.push(text.substring(0, 80));
        } else {
            // Use the existing is_positive flag as a tiebreaker
            if (feedback.is_positive) positiveCount++;
            else negativeCount++;
            neutralCount++;
        }
    }

    const total = feedbacks.length;
    const overallScore = total > 0 ? Math.round((positiveCount / total) * 100) : 50;

    return {
        totalAnalyzed: total,
        overallSentiment: positiveCount > negativeCount ? 'positive' : (negativeCount > positiveCount ? 'negative' : 'mixed'),
        overallScore,
        overallSummary: `Analyzed ${total} feedbacks: ${positiveCount} positive, ${negativeCount} negative${neutralCount > 0 ? `, ${neutralCount} neutral` : ''}. (Keyword-based analysis - AI temporarily unavailable)`,
        positive: positiveCount,
        negative: negativeCount,
        topPositivePoints: posPoints.length > 0 ? posPoints : ['No strongly positive feedback detected'],
        topNegativePoints: negPoints.length > 0 ? negPoints : ['No strongly negative feedback detected'],
        recommendations: ['For detailed AI-powered insights, try again later when the AI service is available'],
        categoryBreakdown: Object.entries(categories).map(([name, count]) => ({ name, count })),
        note: '⚠️ AI service temporarily unavailable - using keyword-based analysis'
    };
}

/**
 * Analyze a bulk summary (Google Form responses, Google Reviews, etc.)
 * with maximum accuracy — splits into individual reviews and analyzes each
 * Returns comprehensive analysis with per-review breakdown
 */
export async function analyzeBulkSummary(text, sourceType = 'other') {
    if (!text || text.trim().length === 0) {
        return {
            overallSentiment: 'neutral',
            overallScore: 0,
            overallSummary: 'No text provided for analysis',
            totalFound: 0,
            positiveCount: 0,
            negativeCount: 0,
            feedbacks: [],
            topPositivePoints: [],
            topNegativePoints: [],
            recommendations: [],
            accuracy: 0
        };
    }

    const sourceLabel = {
        'google_form': 'Google Form responses',
        'google_review': 'Google Reviews',
        'survey': 'Survey responses',
        'email': 'Email feedback',
        'other': 'External feedback'
    }[sourceType] || 'External feedback';

    try {
        const prompt = `You are an expert feedback analysis AI specializing in extracting and analyzing customer feedback from ${sourceLabel}. 

Below is raw text content that a business owner has pasted. It may contain:
- Multiple individual reviews/responses
- Star ratings (1-5 stars, ★, or numeric ratings)
- Mixed formatting (numbered lists, paragraphs, form responses)
- Survey question-answer pairs

Your job is to provide the MOST ACCURATE analysis possible:

1. Identify and extract EVERY individual piece of feedback/review/response
2. For each one, determine sentiment (positive/negative/neutral) and estimate a star rating
3. Look for star ratings mentioned in text (e.g., "4/5", "★★★★", "4 stars", "rated 3")
4. Analyze the overall text written alongside ratings to determine true sentiment
5. Provide an overall assessment with maximum accuracy

Pasted content:
"""
${text.substring(0, 12000)}
"""

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "overallSentiment": "positive" or "negative" or "mixed" or "neutral",
  "overallScore": number 0-100 (accuracy-weighted score),
  "overallSummary": "3-4 sentence comprehensive summary of ALL the feedback",
  "totalFound": number of individual feedbacks identified,
  "positiveCount": number of positive feedbacks,
  "negativeCount": number of negative feedbacks,
  "neutralCount": number of neutral feedbacks,
  "averageRating": number 1.0-5.0 (estimated average star rating),
  "feedbacks": [
    {
      "text": "the extracted feedback text (max 200 chars)",
      "sentiment": "positive" or "negative" or "neutral",
      "rating": number 1-5,
      "confidence": number 0-100,
      "summary": "one line summary"
    }
  ],
  "topPositivePoints": ["strength 1", "strength 2", "strength 3"],
  "topNegativePoints": ["weakness 1", "weakness 2"],
  "recommendations": ["actionable recommendation 1", "recommendation 2", "recommendation 3"],
  "sentimentDistribution": {
    "veryPositive": number (5 stars),
    "positive": number (4 stars),
    "neutral": number (3 stars),
    "negative": number (2 stars),
    "veryNegative": number (1 star)
  },
  "keyThemes": ["theme1", "theme2", "theme3"],
  "accuracy": number 70-99 (your confidence in this analysis)
}

If you find star ratings in the text, prioritize those for accuracy. If only text is available, infer ratings from sentiment intensity. Be thorough — find EVERY review/response.`;

        const geminiResult = await callGeminiWithRetry(prompt, 3000, 3);

        if (!geminiResult.ok || !geminiResult.text) {
            console.log('[AI] Gemini unavailable for bulk summary, using enhanced fallback');
            return fallbackBulkSummaryAnalysis(text, sourceType);
        }

        const cleanText = geminiResult.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const result = JSON.parse(cleanText);

        return {
            overallSentiment: result.overallSentiment || 'neutral',
            overallScore: result.overallScore || 50,
            overallSummary: result.overallSummary || 'Analysis complete',
            totalFound: result.totalFound || 0,
            positiveCount: result.positiveCount || 0,
            negativeCount: result.negativeCount || 0,
            neutralCount: result.neutralCount || 0,
            averageRating: result.averageRating || 3,
            feedbacks: (result.feedbacks || []).slice(0, 50),
            topPositivePoints: result.topPositivePoints || [],
            topNegativePoints: result.topNegativePoints || [],
            recommendations: result.recommendations || [],
            sentimentDistribution: result.sentimentDistribution || {},
            keyThemes: result.keyThemes || [],
            accuracy: result.accuracy || 75
        };
    } catch (error) {
        console.error('Bulk summary analysis error:', error);
        return fallbackBulkSummaryAnalysis(text, sourceType);
    }
}

/**
 * Fallback analysis for bulk summaries when AI is unavailable
 */
function fallbackBulkSummaryAnalysis(text, sourceType) {
    const reviews = splitIntoReviews(text);
    const totalReviews = reviews.length;
    
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let totalRating = 0;
    const feedbacks = [];
    const posPoints = [];
    const negPoints = [];

    for (const review of reviews) {
        const { posScore, negScore } = scoreSentiment(review);
        let sentiment, rating;

        if (posScore > negScore) {
            sentiment = 'positive';
            positiveCount++;
            rating = Math.min(5, 3 + Math.floor(posScore / 2));
            if (posPoints.length < 3) posPoints.push(review.substring(0, 80));
        } else if (negScore > posScore) {
            sentiment = 'negative';
            negativeCount++;
            rating = Math.max(1, 3 - Math.floor(negScore / 2));
            if (negPoints.length < 3) negPoints.push(review.substring(0, 80));
        } else {
            sentiment = 'neutral';
            neutralCount++;
            rating = 3;
        }

        totalRating += rating;
        feedbacks.push({
            text: review.substring(0, 200),
            sentiment,
            rating,
            confidence: Math.min(65, 30 + (posScore + negScore) * 5),
            summary: review.substring(0, 80)
        });
    }

    const avgRating = totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 3;
    const overallScore = totalReviews > 0 ? Math.round((positiveCount / totalReviews) * 100) : 50;

    return {
        overallSentiment: positiveCount > negativeCount ? 'positive' : (negativeCount > positiveCount ? 'negative' : 'mixed'),
        overallScore,
        overallSummary: `Analyzed ${totalReviews} reviews: ${positiveCount} positive, ${negativeCount} negative, ${neutralCount} neutral. Average rating: ${avgRating}/5. (Keyword-based analysis — AI temporarily unavailable)`,
        totalFound: totalReviews,
        positiveCount,
        negativeCount,
        neutralCount,
        averageRating: avgRating,
        feedbacks: feedbacks.slice(0, 50),
        topPositivePoints: posPoints.length > 0 ? posPoints : ['No strongly positive points detected'],
        topNegativePoints: negPoints.length > 0 ? negPoints : ['No strongly negative points detected'],
        recommendations: ['For more accurate analysis, try again when AI service is available'],
        sentimentDistribution: {
            veryPositive: feedbacks.filter(f => f.rating === 5).length,
            positive: feedbacks.filter(f => f.rating === 4).length,
            neutral: feedbacks.filter(f => f.rating === 3).length,
            negative: feedbacks.filter(f => f.rating === 2).length,
            veryNegative: feedbacks.filter(f => f.rating === 1).length,
        },
        keyThemes: [],
        accuracy: 45,
        note: '⚠️ AI service temporarily unavailable — using keyword-based analysis'
    };
}

function fallbackExternalAnalysis(text) {
    console.log('[Fallback] Analyzing external feedback with enhanced keyword analysis...');

    // Split into individual reviews
    const reviews = splitIntoReviews(text);
    const totalReviews = reviews.length;

    let positiveCount = 0;
    let negativeCount = 0;
    let totalPosScore = 0;
    let totalNegScore = 0;
    const keyPoints = [];

    for (const review of reviews) {
        const { posScore, negScore } = scoreSentiment(review);
        totalPosScore += posScore;
        totalNegScore += negScore;

        if (posScore > negScore) {
            positiveCount++;
        } else if (negScore > posScore) {
            negativeCount++;
        } else {
            // When tied, lean positive if text is short (likely casual positive)
            if (review.length < 50) positiveCount++;
            else negativeCount++;
        }
    }

    const neutralCount = totalReviews - positiveCount - negativeCount;
    const overallPositive = positiveCount >= negativeCount;
    const totalWords = totalPosScore + totalNegScore;
    const confidence = totalWords === 0 ? 30 : Math.min(70, 35 + totalWords * 2);

    // Calculate rating out of 5
    let rating;
    if (totalReviews === 0) {
        rating = 3;
    } else {
        const positiveRatio = positiveCount / totalReviews;
        rating = Math.round(1 + positiveRatio * 4); // Maps 0-100% to 1-5
    }

    // Build key points
    if (positiveCount > 0) keyPoints.push(`${positiveCount} out of ${totalReviews} review(s) appear positive`);
    if (negativeCount > 0) keyPoints.push(`${negativeCount} out of ${totalReviews} review(s) appear negative`);
    if (neutralCount > 0) keyPoints.push(`${neutralCount} review(s) are neutral/mixed`);

    const category = detectCategory(text);

    // Build a meaningful summary
    let summary;
    if (totalReviews === 1) {
        summary = text.length > 150 ? text.substring(0, 147) + '...' : text;
    } else {
        const sentimentWord = overallPositive ? 'positive' : 'negative';
        summary = `Analyzed ${totalReviews} reviews: overall ${sentimentWord} sentiment. ${positiveCount} positive, ${negativeCount} negative.`;
    }

    console.log(`[Fallback] Results: ${totalReviews} reviews, ${positiveCount} positive, ${negativeCount} negative, rating: ${rating}/5`);

    return {
        sentiment: overallPositive ? 'positive' : 'negative',
        confidence,
        rating,
        isPositive: overallPositive,
        summary,
        keyPoints,
        category,
        totalReviews,
        positiveCount,
        negativeCount,
        note: '⚠️ AI service temporarily unavailable - analysis based on keyword matching. Results may be less accurate.'
    };
}
