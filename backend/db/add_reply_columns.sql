-- Add reply columns to feedbacks table
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS owner_reply TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedbacks_replied_at ON feedbacks(replied_at) WHERE replied_at IS NOT NULL;
