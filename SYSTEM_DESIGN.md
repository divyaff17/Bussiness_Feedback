# Feedback System - Complete System Design

## Overview

The Feedback System is a QR-based customer feedback collection platform that allows businesses to gather customer reviews and automatically redirect positive reviews to Google.

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
            │  │  │       Services                 ││ │
            │  │  │  • Email (Nodemailer)          ││ │
            │  │  │  • QR Generation (qrcode)      ││ │
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
            │  │  • email_verification_otps         │ │
            │  └────────────────────────────────────┘ │
            │                                          │
            │  ┌────────────────────────────────────┐ │
            │  │       Row Level Security          │ │
            │  │    (Auth handled in backend)      │ │
            │  └────────────────────────────────────┘ │
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

### Database
| Technology | Purpose |
|------------|---------|
| **Supabase** | Managed PostgreSQL |
| **PostgreSQL** | Relational Database |

### Hosting & Deployment
| Service | Component | URL Pattern |
|---------|-----------|-------------|
| **Vercel** | Frontend (React SPA) | `https://bussiness-feedback.vercel.app` |
| **Railway** | Backend (Express API) | `https://bussinessfeedback-production.up.railway.app` |
| **Supabase** | Database (PostgreSQL) | `https://[project].supabase.co` |

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│     businesses      │       │       users         │
├─────────────────────┤       ├─────────────────────┤
│ id (PK, UUID)       │◄──────│ id (PK, UUID)       │
│ name                │       │ email (unique)      │
│ category            │       │ password_hash       │
│ logo_url            │       │ business_id (FK)    │
│ google_review_url   │       │ owner_name          │
│ subscription_plan   │       │ profile_picture_url │
│ monthly_feedback_*  │       │ created_at          │
│ created_at          │       └─────────────────────┘
└─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐       ┌─────────────────────────┐
│     feedbacks       │       │ email_verification_otps │
├─────────────────────┤       ├─────────────────────────┤
│ id (PK, UUID)       │       │ id (PK, UUID)           │
│ business_id (FK)    │       │ email                   │
│ rating (1-5)        │       │ otp_code                │
│ message             │       │ expires_at              │
│ is_positive         │       │ verified                │
│ notified            │       │ attempts                │
│ created_at          │       │ created_at              │
└─────────────────────┘       └─────────────────────────┘

┌─────────────────────────┐
│  password_reset_tokens  │
├─────────────────────────┤
│ id (PK, UUID)           │
│ user_id (FK)            │
│ token (unique)          │
│ expires_at              │
│ used                    │
│ created_at              │
└─────────────────────────┘
```

### Table Details

#### businesses
```sql
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    logo_url TEXT,
    google_review_url TEXT NOT NULL,
    subscription_plan TEXT DEFAULT 'free',      -- 'free' or 'paid'
    monthly_feedback_limit INTEGER DEFAULT 50,
    monthly_feedback_count INTEGER DEFAULT 0,
    last_reset_date TEXT,                       -- YYYY-MM format
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    owner_name TEXT,
    profile_picture_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### feedbacks
```sql
CREATE TABLE feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    message TEXT,
    is_positive BOOLEAN NOT NULL DEFAULT FALSE,  -- rating >= 4
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/send-otp` | No | Send OTP verification to email |
| POST | `/verify-otp` | No | Verify OTP code |
| POST | `/signup` | No | Register new business owner |
| POST | `/login` | No | Login with email/password |
| GET | `/me` | Yes | Get current user info |
| POST | `/forgot-password` | No | Request password reset |
| POST | `/reset-password` | No | Reset password with token |
| GET | `/verify-reset-token` | No | Verify reset token validity |

### Business (`/api/business`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:id` | No | Get business info (public) |
| PUT | `/:id` | Yes | Update business settings |
| GET | `/:id/qr` | Yes | Generate QR code |
| GET | `/:id/stats` | Yes | Get feedback statistics |
| POST | `/validate-google-url` | No | Validate Google review URL |

### Feedback (`/api/feedback`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/:businessId` | No | Submit feedback (from QR) |
| GET | `/:businessId` | Yes | Get feedbacks with filters |

### Upload (`/api/upload`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/avatar` | Yes | Upload profile picture |

---

## Data Flow

### 1. User Registration Flow

```
┌──────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  User    │────►│ Enter   │────►│ Send OTP │────►│ Verify   │
│  Visits  │     │ Details │     │ to Email │     │ OTP      │
│  Signup  │     │         │     │          │     │          │
└──────────┘     └─────────┘     └──────────┘     └────┬─────┘
                                                       │
                 ┌─────────┐     ┌──────────┐     ┌────▼─────┐
                 │ Redirect│◄────│ Create   │◄────│ Validate │
                 │ Welcome │     │ Account  │     │ Google   │
                 │         │     │          │     │ URL      │
                 └─────────┘     └──────────┘     └──────────┘
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
                               │              │               │              │
                               │ Thank You    │               │ Redirect to  │
                               │ Page (Stay)  │               │ Google Review│
                               └──────────────┘               └──────────────┘
```

### 3. Dashboard Data Flow

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│ Admin    │─────────►│ API      │─────────►│ Supabase │
│ Dashboard│◄─────────│ Backend  │◄─────────│ Database │
└──────────┘          └──────────┘          └──────────┘
     │
     │  Auto-refresh every 10 seconds
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│                    Dashboard View                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Stats   │  │ Time Filter │  │ Feedback Type Filter│ │
│  │ Summary │  │ Today/Week/ │  │ All/Positive/       │ │
│  │         │  │ Month       │  │ Negative            │ │
│  └─────────┘  └─────────────┘  └─────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │              Recent Feedback List                    ││
│  │  • Rating stars                                      ││
│  │  • Message content                                   ││
│  │  • Timestamp                                         ││
│  │  • Positive/Negative badge                           ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## Security Measures

### Authentication
- **JWT Tokens**: Stateless authentication with 7-day expiry
- **Password Hashing**: bcrypt with 10 salt rounds
- **OTP Verification**: 6-digit code, 10-minute expiry, max 5 attempts

### Rate Limiting
| Endpoint Type | Limit |
|---------------|-------|
| Auth routes | 5 requests/15 min per IP |
| API routes | 100 requests/15 min per IP |
| Feedback submission | 3 requests/hour per IP |

### Data Protection
- CORS restricted to frontend domain
- HTTPS enforced in production
- Input validation on all endpoints
- SQL injection prevention via Supabase client

---

## Environment Variables

### Backend (Railway)
```env
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...

# Auth
JWT_SECRET=your-secret-key

# Server
PORT=8080
FRONTEND_URL=https://bussiness-feedback.vercel.app

# Email (Optional - for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Feedback System" <noreply@feedback.app>
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
│   │   ├── connection.js       # SQLite (deprecated)
│   │   ├── supabase.js         # Supabase client
│   │   └── supabase_schema.sql # Database schema
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication
│   │   └── rateLimit.js        # Rate limiting
│   ├── routes/
│   │   ├── auth.js             # Authentication routes
│   │   ├── business.js         # Business routes
│   │   ├── feedback.js         # Feedback routes
│   │   └── upload.js           # File upload routes
│   ├── services/
│   │   └── email.js            # Email/OTP service
│   ├── server.js               # Express app entry
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── AnimatedBackground.jsx
│   │   │   ├── ElectricBorder.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── StarRating.jsx
│   │   │   └── ...
│   │   ├── config/
│   │   │   └── api.js          # API configuration
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Auth state management
│   │   ├── hooks/
│   │   │   └── useAuth.js      # Auth hook
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Admin dashboard
│   │   │   ├── Feedback.jsx    # Public feedback form
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── QRCode.jsx
│   │   │   └── ...
│   │   ├── App.jsx             # Route definitions
│   │   └── main.jsx            # Entry point
│   ├── vercel.json             # Vercel config + rewrites
│   └── package.json
│
├── extension/                   # Chrome extension
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── background.js
│
└── README.md
```

---

## Deployment

### Prerequisites
1. **Supabase Account**: Create project and run `supabase_schema.sql`
2. **Railway Account**: Connect GitHub repo, set environment variables
3. **Vercel Account**: Import frontend, set `VITE_API_URL`

### Deployment Steps

1. **Database Setup (Supabase)**
   ```sql
   -- Run backend/db/supabase_schema.sql in SQL Editor
   ```

2. **Backend Deployment (Railway)**
   - Connect GitHub repository
   - Set root directory: `backend`
   - Configure environment variables
   - Deploy

3. **Frontend Deployment (Vercel)**
   - Import GitHub repository
   - Set root directory: `frontend`
   - Set `VITE_API_URL` environment variable
   - Deploy

### URL Configuration
- Update `FRONTEND_URL` in Railway to match Vercel deployment
- Ensure CORS allows the Vercel domain
- QR codes will point to `{FRONTEND_URL}/b/{businessId}`

---

## Subscription Model

### Free Tier
- 50 feedbacks/month
- Basic dashboard
- QR code generation

### Paid Tier (Future)
- Unlimited feedbacks
- Advanced analytics
- Custom branding
- Email notifications

---

## Future Enhancements

1. **Analytics Dashboard**: Sentiment analysis, trends, graphs
2. **Email Notifications**: Real-time alerts for negative feedback
3. **Multi-language Support**: I18n for feedback forms
4. **API Integrations**: Slack, Discord, Zapier webhooks
5. **White-label Solution**: Custom branding per business
6. **Mobile App**: Native iOS/Android apps
7. **AI Responses**: Auto-generated response suggestions

---

## Support

For issues or questions:
- Email: support@feedback.app
- Documentation: See README.md and DEPLOYMENT.md
