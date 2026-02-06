# Feedback System - Complete System Design v2.0

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture-diagram)
3. [Tech Stack](#tech-stack)
4. [Key Features](#key-features)
5. [Database Schema](#database-schema)
6. [API Reference](#api-endpoints)
7. [Data Flows](#data-flow)
8. [Security](#security-measures)
9. [Email Configuration](#email-configuration-otp)
10. [Environment Variables](#environment-variables)
11. [File Structure](#file-structure)
12. [Deployment Guide](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Overview

The **Feedback System** is a comprehensive QR-based customer feedback collection platform that enables businesses to:

- Collect customer feedback via QR code scanning
- Automatically redirect positive reviews (4-5 stars) to Google Reviews
- Keep negative feedback (1-3 stars) private for internal improvement
- Verify user emails with OTP during registration
- Validate Google Review URLs before account creation
- View real-time feedback with filtering options (All/Positive/Negative)
- Track feedback statistics by time period (Today/Week/Month)

### Version 2.0 Features
- ✅ **OTP Email Verification** - Real-time email verification during signup
- ✅ **Google URL Validation** - Verify Google Review links are valid
- ✅ **Feedback Type Filters** - View All, Positive, or Negative reviews
- ✅ **Fixed Date Display** - Proper date/time formatting with "Today"/"Yesterday"
- ✅ **Star Ratings Display** - Visual star ratings in feedback list
- ✅ **Auto-refresh Dashboard** - Live updates every 10 seconds

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                   │
│    │   Browser    │     │   Mobile     │     │  Chrome      │                   │
│    │   (React)    │     │   (QR Scan)  │     │  Extension   │                   │
│    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘                   │
│           │                    │                    │                            │
└───────────┼────────────────────┼────────────────────┼────────────────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       VERCEL CDN        │
                    │   (Frontend Hosting)    │
                    │   React SPA + Vite      │
                    │   TailwindCSS + Three.js│
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    VERCEL REWRITES      │
                    │   /api/* → Railway      │
                    └────────────┬────────────┘
                                 │
            ┌────────────────────▼────────────────────┐
            │              RAILWAY                     │
            │         (Backend Hosting)                │
            │                                          │
            │  ┌────────────────────────────────────┐ │
            │  │        Express.js Server           │ │
            │  │           (Node.js v18+)           │ │
            │  │                                    │ │
            │  │  ┌────────────┐  ┌──────────────┐ │ │
            │  │  │   Routes   │  │  Middleware  │ │ │
            │  │  │            │  │              │ │ │
            │  │  │ • /auth    │  │ • CORS       │ │ │
            │  │  │ • /business│  │ • Rate Limit │ │ │
            │  │  │ • /feedback│  │ • JWT Auth   │ │ │
            │  │  │ • /upload  │  │              │ │ │
            │  │  └────────────┘  └──────────────┘ │ │
            │  │                                    │ │
            │  │  ┌────────────────────────────────┐│ │
            │  │  │         Services               ││ │
            │  │  │  • Email (Nodemailer + SMTP)   ││ │
            │  │  │  • QR Generation (qrcode)      ││ │
            │  │  │  • URL Validation (fetch)      ││ │
            │  │  └────────────────────────────────┘│ │
            │  └────────────────────────────────────┘ │
            └────────────────────┬────────────────────┘
                                 │
            ┌────────────────────▼────────────────────┐
            │              SUPABASE                    │
            │        (Database & Storage)              │
            │                                          │
            │  ┌────────────────────────────────────┐ │
            │  │          PostgreSQL                │ │
            │  │                                    │ │
            │  │  Tables:                           │ │
            │  │  • businesses                      │ │
            │  │  • users                           │ │
            │  │  • feedbacks                       │ │
            │  │  • password_reset_tokens           │ │
            │  │  • email_verification_otps  [NEW]  │ │
            │  └────────────────────────────────────┘ │
            │                                          │
            │  ┌────────────────────────────────────┐ │
            │  │       Row Level Security          │ │
            │  │    (Auth handled in backend)      │ │
            │  └────────────────────────────────────┘ │
            └──────────────────────────────────────────┘
                                 │
            ┌────────────────────▼────────────────────┐
            │           EXTERNAL SERVICES              │
            │                                          │
            │  ┌──────────────┐  ┌──────────────────┐ │
            │  │    Gmail     │  │  Google Maps     │ │
            │  │    SMTP      │  │  (Review URLs)   │ │
            │  │  (OTP Send)  │  │  (Validation)    │ │
            │  └──────────────┘  └──────────────────┘ │
            └──────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2.0 | UI Framework |
| **Vite** | 5.1.0 | Build Tool & Dev Server |
| **React Router** | 6.22.0 | Client-side Routing |
| **TailwindCSS** | 3.4.1 | Utility-first CSS |
| **Three.js** | 0.182.0 | 3D Graphics & Animations |
| **@react-three/fiber** | 8.17.10 | React Three.js Renderer |
| **@react-three/drei** | 10.7.7 | Three.js Helpers |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | ≥18.0.0 | Runtime Environment |
| **Express.js** | 4.18.2 | Web Framework |
| **Supabase JS** | 2.93.3 | Database Client |
| **bcryptjs** | 2.4.3 | Password Hashing |
| **jsonwebtoken** | 9.0.2 | JWT Authentication |
| **nodemailer** | 6.9.8 | Email Service (OTP) |
| **qrcode** | 1.5.3 | QR Code Generation |
| **express-rate-limit** | 7.1.5 | Rate Limiting |
| **uuid** | 9.0.1 | Unique ID Generation |
| **dotenv** | 16.4.1 | Environment Variables |
| **cors** | 2.8.5 | Cross-Origin Resource Sharing |

### Database
| Technology | Purpose |
|------------|---------|
| **Supabase** | Managed PostgreSQL + Auth + Storage |
| **PostgreSQL** | Relational Database |

### Hosting & Deployment
| Service | Component | URL |
|---------|-----------|-----|
| **Vercel** | Frontend (React SPA) | `https://bussiness-feedback.vercel.app` |
| **Railway** | Backend (Express API) | `https://bussinessfeedback-production.up.railway.app` |
| **Supabase** | Database (PostgreSQL) | `https://cyedbqrknoigldnyuqon.supabase.co` |

---

## Key Features

### 1. OTP Email Verification (NEW)
Ensures email ownership during signup:

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐    ┌──────────────┐
│ User enters  │───►│ Click Verify  │───►│ OTP sent to  │───►│ User enters  │
│ email        │    │ button        │    │ email inbox  │    │ 6-digit code │
└──────────────┘    └───────────────┘    └──────────────┘    └──────┬───────┘
                                                                    │
                    ┌───────────────┐    ┌──────────────┐    ┌──────▼───────┐
                    │ Email shows   │◄───│ Verification │◄───│ Code matches │
                    │ ✓ Verified    │    │ successful   │    │              │
                    └───────────────┘    └──────────────┘    └──────────────┘
```

**Features:**
- 6-digit random OTP code
- 10-minute expiration
- Max 5 verification attempts
- Beautiful HTML email template
- Resend cooldown (60 seconds)
- Development mode: OTP logged to console

### 2. Google URL Validation (NEW)
Validates Google Review URLs before account creation:

```
Supported URL Formats:
✅ https://g.page/r/CxxxxxxxxYYYYYY/review
✅ https://maps.google.com/maps?cid=XXXXX
✅ https://www.google.com/maps/place/...
✅ https://search.google.com/local/...
```

**Validation Process:**
1. Check URL format matches Google patterns
2. Attempt HEAD request to verify accessibility
3. Return validation status with suggestions

### 3. Feedback Filters (NEW)
Dashboard now supports filtering feedbacks:

| Filter | Description |
|--------|-------------|
| **All** | Show all feedbacks |
| **Positive** | Show only 4-5 star ratings (green) |
| **Negative** | Show only 1-3 star ratings (red) |

Combined with time filters: Today, Last 7 days, Last 30 days

### 4. Enhanced Feedback Display (NEW)
Each feedback item now shows:
- ★★★★★ Visual star rating
- Positive/Negative badge
- Customer message
- "Today", "Yesterday", or date + time
- Color-coded borders (green/red)

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────┐       ┌─────────────────────────┐
│       businesses        │       │         users           │
├─────────────────────────┤       ├─────────────────────────┤
│ id (PK, UUID)           │◄──────│ id (PK, UUID)           │
│ name                    │       │ email (unique)          │
│ category                │       │ password_hash           │
│ logo_url                │       │ business_id (FK)        │
│ google_review_url       │       │ owner_name              │
│ subscription_plan       │       │ profile_picture_url     │
│ monthly_feedback_limit  │       │ created_at              │
│ monthly_feedback_count  │       └─────────────────────────┘
│ last_reset_date         │
│ created_at              │
└─────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐       ┌─────────────────────────────┐
│       feedbacks         │       │  email_verification_otps    │
├─────────────────────────┤       ├─────────────────────────────┤
│ id (PK, UUID)           │       │ id (PK, UUID)               │
│ business_id (FK)        │       │ email                       │
│ rating (1-5)            │       │ otp_code (6 digits)         │
│ message                 │       │ expires_at (10 min)         │
│ is_positive             │       │ verified (boolean)          │
│ notified                │       │ attempts (max 5)            │
│ created_at              │       │ created_at                  │
└─────────────────────────┘       └─────────────────────────────┘

┌─────────────────────────────┐
│    password_reset_tokens    │
├─────────────────────────────┤
│ id (PK, UUID)               │
│ user_id (FK)                │
│ token (unique, 32 chars)    │
│ expires_at (1 hour)         │
│ used (boolean)              │
│ created_at                  │
└─────────────────────────────┘
```

### Complete SQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE 1: BUSINESSES
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

-- TABLE 2: USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    owner_name TEXT,
    profile_picture_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 3: FEEDBACKS
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    message TEXT,
    is_positive BOOLEAN NOT NULL DEFAULT FALSE,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 4: PASSWORD RESET TOKENS
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 5: EMAIL VERIFICATION OTPs (NEW)
CREATE TABLE IF NOT EXISTS email_verification_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_feedbacks_business_id ON feedbacks(business_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);
CREATE INDEX IF NOT EXISTS idx_feedbacks_is_positive ON feedbacks(is_positive);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_otps_email ON email_verification_otps(email);

-- ROW LEVEL SECURITY
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_otps ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (Allow all - auth handled in backend)
CREATE POLICY "Allow all on businesses" ON businesses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on feedbacks" ON feedbacks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on password_reset_tokens" ON password_reset_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on email_verification_otps" ON email_verification_otps FOR ALL USING (true) WITH CHECK (true);
```

---

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/send-otp` | No | Send 6-digit OTP to email |
| POST | `/verify-otp` | No | Verify OTP code |
| POST | `/signup` | No | Register new business owner |
| POST | `/login` | No | Login with email/password |
| GET | `/me` | Yes | Get current user info |
| POST | `/forgot-password` | No | Request password reset |
| POST | `/reset-password` | No | Reset password with token |
| GET | `/verify-reset-token` | No | Verify reset token validity |

#### Send OTP Request
```json
POST /api/auth/send-otp
{
    "email": "user@example.com",
    "businessName": "My Business"
}
```

#### Verify OTP Request
```json
POST /api/auth/verify-otp
{
    "email": "user@example.com",
    "otp": "123456"
}
```

### Business (`/api/business`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:id` | No | Get business info (public) |
| PUT | `/:id` | Yes | Update business settings |
| GET | `/:id/qr` | Yes | Generate QR code |
| GET | `/:id/stats` | Yes | Get feedback statistics |
| POST | `/validate-google-url` | No | Validate Google review URL |

#### Validate Google URL Request
```json
POST /api/business/validate-google-url
{
    "url": "https://g.page/r/CxxxxxxxxYYYY/review"
}
```

#### Response
```json
{
    "valid": true,
    "message": "Google review URL is valid and accessible"
}
```

### Feedback (`/api/feedback`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/:businessId` | No | Submit feedback (from QR) |
| GET | `/:businessId` | Yes | Get feedbacks with filters |

#### Get Feedbacks with Filters
```
GET /api/feedback/:businessId?filter=today&type=negative
```

Query Parameters:
- `filter`: `today`, `week`, `month`
- `type`: `all`, `positive`, `negative`

### Upload (`/api/upload`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/avatar` | Yes | Upload profile picture (base64) |

---

## Data Flow

### 1. Complete User Registration Flow

```
┌──────────────┐
│  User Visits │
│    Signup    │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Fill Business│────►│ Fill Email   │────►│ Click Verify │
│ Details      │     │ Field        │     │ Button       │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Backend sends OTP     │
        │  via Gmail SMTP        │
        │  (6-digit code)        │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  User checks email     │
        │  inbox for OTP         │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  Enter OTP in form     │
        │  Click ✓ button        │
        └───────────┬────────────┘
                    │
       ┌────────────┴────────────┐
       │                         │
       ▼                         ▼
┌──────────────┐         ┌──────────────┐
│  OTP Valid   │         │  OTP Invalid │
│  ✓ Verified  │         │  Try Again   │
└──────┬───────┘         └──────────────┘
       │
       ▼
┌──────────────────────────┐
│  Enter Google Review URL │
│  Click Validate button   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Backend validates URL   │
│  (format + accessibility)│
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Fill Password fields    │
│  Click Create Account    │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Account Created!        │
│  Redirect to Welcome     │
└──────────────────────────┘
```

### 2. Feedback Collection Flow

```
┌──────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│ Customer │────►│ Scan QR │────►│ Rate     │────►│ Submit   │
│          │     │ Code    │     │ Business │     │ Feedback │
└──────────┘     └─────────┘     └──────────┘     └────┬─────┘
                                                       │
                                       ┌───────────────┴───────────────┐
                                       ▼                               ▼
                               ┌──────────────┐               ┌──────────────┐
                               │ Rating ≤ 3   │               │ Rating ≥ 4   │
                               │ (Negative)   │               │ (Positive)   │
                               │              │               │              │
                               │ Stay on site │               │ Redirect to  │
                               │ Thank You    │               │ Google Review│
                               │ (Private)    │               │ (Public)     │
                               └──────────────┘               └──────────────┘
```

### 3. Dashboard Data Flow with Filters

```
┌──────────────────────────────────────────────────────────────┐
│                      ADMIN DASHBOARD                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    TIME FILTERS                          │ │
│  │   [Today]  [Last 7 days]  [Last 30 days]                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   STATS SUMMARY                          │ │
│  │                                                          │ │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐             │ │
│  │   │  Total   │  │ Positive │  │ Negative │             │ │
│  │   │    15    │  │    12    │  │    3     │             │ │
│  │   └──────────┘  └──────────┘  └──────────┘             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  TYPE FILTERS                            │ │
│  │   [All (15)]  [⭐ Positive (12)]  [⚠️ Negative (3)]     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  FEEDBACK LIST                           │ │
│  │                                                          │ │
│  │  ┌─────────────────────────────────────────────────────┐│ │
│  │  │ ★★★★★  [Positive]              Today 2:30 PM        ││ │
│  │  │ "Great service, will come again!"                   ││ │
│  │  └─────────────────────────────────────────────────────┘│ │
│  │                                                          │ │
│  │  ┌─────────────────────────────────────────────────────┐│ │
│  │  │ ★★☆☆☆  [Negative]              Yesterday 5:15 PM   ││ │
│  │  │ "Food was cold, need to improve"                    ││ │
│  │  └─────────────────────────────────────────────────────┘│ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  🟢 Live updates • Last updated: 2:45:30 PM                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Security Measures

### Authentication
| Feature | Implementation |
|---------|----------------|
| **JWT Tokens** | Stateless auth, 7-day expiry |
| **Password Hashing** | bcrypt, 10 salt rounds |
| **OTP Verification** | 6-digit code, 10-min expiry, max 5 attempts |
| **Password Reset** | 32-char token, 1-hour expiry, single use |

### Rate Limiting
| Endpoint Type | Limit |
|---------------|-------|
| Auth routes (`/send-otp`, `/login`, `/signup`) | 5 requests / 15 min / IP |
| API routes | 100 requests / 15 min / IP |
| Feedback submission | 3 requests / hour / IP |

### Data Protection
- ✅ CORS restricted to frontend domain only
- ✅ HTTPS enforced in production
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention via Supabase parameterized queries
- ✅ JWT stored in sessionStorage (not localStorage)
- ✅ Sensitive data never logged

---

## Email Configuration (OTP)

### How Email Sending Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Backend    │────►│    Gmail     │────►│   User's     │
│   Server     │     │    SMTP      │     │   Inbox      │
│              │     │              │     │              │
│ SMTP_USER    │     │ smtp.gmail   │     │ Any email    │
│ SMTP_PASS    │     │ .com:587     │     │ address      │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       │ Your Gmail credentials
       │ (configured ONCE)
       │
       ▼
   Sends OTP to ANY user's email
```

### Gmail Setup (Recommended)

1. **Enable 2-Step Verification**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - App name: `Feedback System`
   - Click "Create"
   - Copy the 16-character password

3. **Configure Backend**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   SMTP_FROM="Feedback System" <your-email@gmail.com>
   ```

### Development Mode (No SMTP)
If SMTP is not configured, OTP codes are logged to console:
```
==================================================
📧 OTP EMAIL (Development Mode)
==================================================
To: user@example.com
OTP Code: 847291
Expires: 10 minutes
==================================================
```

### Email Template Preview
The OTP email is sent with a beautiful HTML template:
- Dark theme with gradient accents
- Large, easy-to-read OTP code
- Business name personalization
- Clear expiration notice
- Mobile-responsive design

---

## Environment Variables

### Backend (Railway / .env)
```env
# Database
SUPABASE_URL=https://cyedbqrknoigldnyuqon.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=8080
FRONTEND_URL=https://bussiness-feedback.vercel.app

# Email/SMTP (Required for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="Feedback System" <your-email@gmail.com>
```

### Frontend (Vercel)
```env
VITE_API_URL=https://bussinessfeedback-production.up.railway.app
```

---

## File Structure

```
feedback-system/
├── backend/
│   ├── db/
│   │   ├── connection.js           # SQLite (deprecated)
│   │   ├── supabase.js             # Supabase client initialization
│   │   ├── supabase_schema.sql     # Complete database schema
│   │   └── add_profile_columns.sql # Migration script
│   │
│   ├── middleware/
│   │   ├── auth.js                 # JWT authentication middleware
│   │   └── rateLimit.js            # Rate limiting configuration
│   │
│   ├── routes/
│   │   ├── auth.js                 # Auth routes (signup, login, OTP)
│   │   ├── business.js             # Business routes (CRUD, QR, validate URL)
│   │   ├── feedback.js             # Feedback routes (submit, list with filters)
│   │   └── upload.js               # File upload routes (avatar)
│   │
│   ├── services/
│   │   └── email.js                # Email service (Nodemailer, OTP templates)
│   │
│   ├── .env                        # Environment variables (local)
│   ├── server.js                   # Express app entry point
│   ├── package.json                # Backend dependencies
│   └── railway.toml                # Railway deployment config
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnimatedBackground.jsx
│   │   │   ├── ElectricBorder.jsx  # Animated border effect
│   │   │   ├── GooeyNav.jsx        # Navigation component
│   │   │   ├── Layout.jsx          # Page layout wrapper
│   │   │   ├── StarRating.jsx      # Interactive star rating
│   │   │   ├── Threads.jsx         # Background animation
│   │   │   └── ...
│   │   │
│   │   ├── config/
│   │   │   └── api.js              # API URL configuration
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # React Context for auth state
│   │   │
│   │   ├── hooks/
│   │   │   └── useAuth.js          # Custom auth hook
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Admin dashboard (filters, stats)
│   │   │   ├── Feedback.jsx        # Public feedback form
│   │   │   ├── Login.jsx           # Login page
│   │   │   ├── Signup.jsx          # Signup with OTP + URL validation
│   │   │   ├── Settings.jsx        # Business settings
│   │   │   ├── QRCode.jsx          # QR code generator
│   │   │   ├── ForgotPassword.jsx  # Password reset request
│   │   │   ├── ResetPassword.jsx   # Password reset form
│   │   │   ├── ThankYou.jsx        # Post-feedback page
│   │   │   ├── Welcome.jsx         # Onboarding page
│   │   │   └── Pricing.jsx         # Subscription plans
│   │   │
│   │   ├── App.jsx                 # Route definitions
│   │   ├── main.jsx                # React entry point
│   │   └── index.css               # Global styles + Tailwind
│   │
│   ├── public/
│   │   └── manifest.json           # PWA manifest
│   │
│   ├── vercel.json                 # Vercel config + API rewrites
│   ├── vite.config.js              # Vite configuration
│   ├── tailwind.config.js          # Tailwind configuration
│   ├── postcss.config.js           # PostCSS configuration
│   └── package.json                # Frontend dependencies
│
├── extension/                       # Chrome Extension
│   ├── manifest.json               # Extension manifest v3
│   ├── popup.html                  # Popup UI
│   ├── popup.js                    # Popup logic
│   ├── popup.css                   # Popup styles
│   ├── background.js               # Service worker
│   └── icons/                      # Extension icons
│
├── DEPLOYMENT.md                   # Deployment guide
├── SYSTEM_DESIGN.md                # This document (v1)
├── SYSTEM_DESIGN_v2.md             # This document (v2)
├── README.md                       # Project overview
└── package.json                    # Root package.json
```

---

## Deployment

### Prerequisites
1. **Supabase Account**: Free tier available at https://supabase.com
2. **Railway Account**: Free tier available at https://railway.app
3. **Vercel Account**: Free tier available at https://vercel.com
4. **Gmail Account**: For sending OTP emails

### Step-by-Step Deployment

#### 1. Database Setup (Supabase)
```sql
-- Run the complete schema in SQL Editor
-- See "Complete SQL Schema" section above
```

#### 2. Backend Deployment (Railway)
1. Connect GitHub repository
2. Set root directory: `backend`
3. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `JWT_SECRET`
   - `FRONTEND_URL`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
4. Deploy

#### 3. Frontend Deployment (Vercel)
1. Import GitHub repository
2. Set root directory: `frontend`
3. Add environment variable:
   - `VITE_API_URL` = Railway backend URL
4. Deploy

#### 4. Post-Deployment
- Update `FRONTEND_URL` in Railway to match Vercel URL
- Test OTP flow end-to-end
- Test QR code generation and feedback submission

---

## Troubleshooting

### OTP Not Sending
1. Check SMTP credentials in `.env`
2. Ensure Gmail App Password (not regular password)
3. Check backend console for error messages
4. Verify `email_verification_otps` table exists in Supabase

### Invalid Date Showing
- Ensure backend returns `created_at` field
- Frontend expects ISO 8601 format from Supabase

### CORS Errors
- Verify `FRONTEND_URL` in backend matches Vercel URL
- Check for trailing slashes

### 404 on Feedback Page
- Run `vercel --prod` to redeploy
- Check Vercel rewrites in `vercel.json`

### Database Connection Failed
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Check RLS policies are set to allow all

---

## Subscription Model

### Free Tier
- 50 feedbacks/month
- Basic dashboard with filters
- QR code generation
- OTP email verification

### Pro Tier (Future)
- Unlimited feedbacks
- Advanced analytics
- Custom branding
- Email notifications for negative feedback
- API access
- Priority support

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Basic feedback system |
| 2.0 | Feb 2026 | OTP verification, Google URL validation, Feedback filters, Date fixes |

---

## Support

For issues or questions:
- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: See README.md and DEPLOYMENT.md
- **Email**: Configure your own support email

---

*Last Updated: February 6, 2026*
