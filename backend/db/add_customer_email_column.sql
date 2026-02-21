-- Add customer_email column to feedbacks table
-- This stores the email of the person who submitted feedback (optional)
-- Allows business owners to reply directly to the customer via email

ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Index for quick lookup of feedbacks with emails (for reply functionality)
CREATE INDEX IF NOT EXISTS idx_feedbacks_customer_email ON feedbacks(customer_email) WHERE customer_email IS NOT NULL;
