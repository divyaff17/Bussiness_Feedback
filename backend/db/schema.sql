-- SQLite Schema for Feedback System

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    logo_url TEXT,
    google_review_url TEXT NOT NULL,
    -- Subscription plan: 'free' or 'paid'
    subscription_plan TEXT DEFAULT 'free',
    -- Monthly feedback limit (50 for free, unlimited for paid)
    monthly_feedback_limit INTEGER DEFAULT 50,
    -- Current month feedback count
    monthly_feedback_count INTEGER DEFAULT 0,
    -- Last reset date for monthly count
    last_reset_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table (business owners)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    business_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    message TEXT,
    is_positive INTEGER NOT NULL DEFAULT 0,
    notified INTEGER DEFAULT 0,  -- For extension notifications (0 = not notified, 1 = notified)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_feedbacks_business_id ON feedbacks(business_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);
CREATE INDEX IF NOT EXISTS idx_feedbacks_is_positive ON feedbacks(is_positive);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

