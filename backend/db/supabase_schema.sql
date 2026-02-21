-- ============================================
-- SUPABASE SCHEMA FOR FEEDBACK SYSTEM
-- Copy and paste this entire file into:
-- Supabase Dashboard > SQL Editor > New Query
-- Then click "Run"
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE 1: BUSINESSES
-- Stores business information for each owner
-- ============================================
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    logo_url TEXT,
    google_review_url TEXT NOT NULL,
    subscription_plan TEXT DEFAULT 'free',
    monthly_feedback_limit INTEGER DEFAULT 50,
    monthly_feedback_count INTEGER DEFAULT 0,
    last_reset_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE 2: USERS
-- Stores business owner login credentials
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT, -- Can be NULL for Google OAuth users
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    owner_name TEXT,
    profile_picture_url TEXT,
    google_id TEXT, -- Google OAuth user ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADD COLUMNS IF THEY DON'T EXIST (for existing databases)
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'owner_name') THEN
        ALTER TABLE users ADD COLUMN owner_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_picture_url') THEN
        ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'google_id') THEN
        ALTER TABLE users ADD COLUMN google_id TEXT;
    END IF;
    -- Allow NULL password_hash for OAuth users
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
END $$;

-- ============================================
-- TABLE 3: FEEDBACKS
-- Stores customer feedback for each business
-- ============================================
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    message TEXT,
    is_positive BOOLEAN NOT NULL DEFAULT FALSE,
    notified BOOLEAN DEFAULT FALSE,
    ai_sentiment TEXT,           -- AI-detected sentiment: 'positive', 'negative', 'neutral'
    ai_confidence INTEGER,       -- AI confidence score 0-100
    sentiment_mismatch BOOLEAN DEFAULT FALSE,  -- true when stars don't match AI sentiment
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR FASTER QUERIES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_feedbacks_business_id ON feedbacks(business_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);
CREATE INDEX IF NOT EXISTS idx_feedbacks_is_positive ON feedbacks(is_positive);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- TABLE 4: PASSWORD RESET TOKENS
-- Stores password reset tokens for users
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- ============================================
-- TABLE 5: EMAIL VERIFICATION OTPs
-- Stores OTP codes for email verification during signup
-- ============================================
CREATE TABLE IF NOT EXISTS email_verification_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_otps_email ON email_verification_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_otps_otp_code ON email_verification_otps(otp_code);

-- ============================================
-- TABLE 6: REVIEW PLATFORMS
-- Stores multiple review platform URLs per business
-- Supports: Google Maps, Yelp, TripAdvisor, Google Forms, etc.
-- ============================================
CREATE TABLE IF NOT EXISTS review_platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    platform_name TEXT NOT NULL, -- 'google', 'yelp', 'tripadvisor', 'google_forms', 'facebook', 'custom'
    platform_label TEXT, -- Display name like "Google Maps", "Yelp", etc.
    url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE, -- Primary platform for positive redirects
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_platforms_business_id ON review_platforms(business_id);
CREATE INDEX IF NOT EXISTS idx_review_platforms_platform ON review_platforms(platform_name);

-- RLS for review_platforms
ALTER TABLE review_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on review_platforms" ON review_platforms FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Enable but allow all operations (auth handled in backend)
-- ============================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Allow all operations (backend handles authentication)
CREATE POLICY "Allow all on businesses" ON businesses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on feedbacks" ON feedbacks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all on email_verification_otps" ON email_verification_otps FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SUCCESS! Tables created.
-- Now go back to your app and sign up!
-- ============================================
