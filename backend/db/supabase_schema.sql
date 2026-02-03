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
    password_hash TEXT NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ============================================
-- SUCCESS! Tables created.
-- Now go back to your app and sign up!
-- ============================================
