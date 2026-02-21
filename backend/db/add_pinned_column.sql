-- Add pinned column to feedbacks table for bookmarking important feedback
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add index for faster queries on pinned feedbacks
CREATE INDEX IF NOT EXISTS idx_feedbacks_pinned ON feedbacks(is_pinned) WHERE is_pinned = true;
