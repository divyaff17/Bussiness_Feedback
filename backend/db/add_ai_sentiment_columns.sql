-- ============================================
-- MIGRATION: Add AI Sentiment columns to feedbacks table
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- Add AI sentiment analysis columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'ai_sentiment') THEN
        ALTER TABLE feedbacks ADD COLUMN ai_sentiment TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'ai_confidence') THEN
        ALTER TABLE feedbacks ADD COLUMN ai_confidence INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'sentiment_mismatch') THEN
        ALTER TABLE feedbacks ADD COLUMN sentiment_mismatch BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Index for finding mismatches quickly
CREATE INDEX IF NOT EXISTS idx_feedbacks_sentiment_mismatch ON feedbacks(sentiment_mismatch);
CREATE INDEX IF NOT EXISTS idx_feedbacks_ai_sentiment ON feedbacks(ai_sentiment);
