-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Adds missing columns for profile pictures
-- ============================================

-- Add owner_name column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Add profile_picture_url column if it doesn't exist  
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';
