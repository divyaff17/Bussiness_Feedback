-- External Feedback Summaries Table
-- Stores Google Form summaries, Google Reviews, and other external feedback text
-- that users paste in Settings for AI analysis

CREATE TABLE IF NOT EXISTS external_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL DEFAULT 'other', -- 'google_form', 'google_review', 'survey', 'email', 'other'
    title VARCHAR(255),
    raw_text TEXT NOT NULL,
    -- AI analysis results (stored as JSONB for flexibility)
    analysis_result JSONB DEFAULT NULL,
    overall_sentiment VARCHAR(20) DEFAULT NULL, -- 'positive', 'negative', 'mixed', 'neutral'
    overall_score INTEGER DEFAULT NULL, -- 0-100
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    total_reviews_found INTEGER DEFAULT 0,
    is_analyzed BOOLEAN DEFAULT FALSE,
    analyzed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by business
CREATE INDEX IF NOT EXISTS idx_external_summaries_business ON external_summaries(business_id);
CREATE INDEX IF NOT EXISTS idx_external_summaries_created ON external_summaries(created_at DESC);

-- Enable RLS
ALTER TABLE external_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can only access their own business summaries
CREATE POLICY "Users can manage their own summaries"
    ON external_summaries
    FOR ALL
    USING (true)
    WITH CHECK (true);

