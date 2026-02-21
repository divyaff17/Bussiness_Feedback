# ReviewDock — QR-Based Business Feedback System

A production-ready, AI-powered feedback management platform that helps businesses collect, analyze, and respond to customer feedback via QR codes — intercepting negative reviews before they go public.

---

## Features

- **QR Code Feedback Collection** — Generate customizable QR codes; customers scan and submit ratings + messages
- **AI-Powered Sentiment Analysis** — Google Gemini 2.0 Flash auto-classifies feedback (sentiment, confidence, category)
- **Smart Review Routing** — Positive feedback → redirect to Google Reviews; Negative → kept private with owner alerts
- **Real-Time Alerts** — Email notifications + Chrome Extension desktop notifications for negative feedback
- **Owner Dashboard** — Stats, feedback list, search, filter, pin, delete, reply to customers via email
- **Analytics** — Line, bar, pie, and area charts with date range filtering and CSV/JSON export
- **5 Authentication Methods** — Email/password signup with OTP, login, Supabase Magic Link (passwordless), password reset, token refresh
- **Chrome Extension** — Polls for new alerts every minute, fires desktop notifications, quick stats view
- **11-Layer Security Architecture** — See [Security](#security) section below
- **External Review Analysis** — Import and AI-analyze reviews from Google, Yelp, and custom URLs

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5.1, Tailwind CSS 3.4, React Router v6 |
| **Backend** | Node.js, Express 4.18, ES Modules |
| **Database** | Supabase PostgreSQL (cloud) with Row-Level Security |
| **AI** | Google Gemini 2.0 Flash API |
| **Auth** | JWT HS256 (1h access + 7d refresh), bcryptjs, Supabase Magic Link |
| **Email** | Nodemailer (SMTP/Gmail) — OTP, alerts, customer replies |
| **Charts** | Recharts (line, bar, pie, area) |
| **3D/VFX** | React Three Fiber, Three.js |
| **QR** | qr-code-styling (4 styles, PNG/SVG download) |
| **Extension** | Chrome Manifest V3 (alarms, notifications, storage) |
| **Deployment** | Railway (backend), Vercel (frontend) |

---

## Project Structure

```
feedback-system/
├── backend/
│   ├── server.js                  # Express app + 6 security middleware layers
│   ├── middleware/
│   │   ├── auth.js                # JWT verify, token generation (1h + 7d)
│   │   ├── rateLimit.js           # 3 rate limiters (API, auth, feedback)
│   │   └── sanitize.js            # XSS prevention, SSRF checker, validators
│   ├── routes/
│   │   ├── auth.js                # 11 auth endpoints (signup, login, OTP, magic link, reset)
│   │   ├── business.js            # 18+ business management endpoints
│   │   ├── feedback.js            # 9 feedback endpoints (submit, reply, pin, export)
│   │   └── upload.js              # Avatar upload/delete (MIME validated)
│   ├── services/
│   │   ├── ai.js                  # Google Gemini integration (5 analysis functions)
│   │   └── email.js               # Nodemailer SMTP (OTP, alerts, replies)
│   └── db/
│       ├── supabase.js            # Supabase service-role client
│       └── *.sql                  # Schema + migration files
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Router + ProtectedRoute/PublicRoute guards
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Auth state (login, signup, magicLink, logout)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Stats, feedback list, reply, pin, search
│   │   │   ├── Analytics.jsx      # Charts with date filtering
│   │   │   ├── Feedback.jsx       # Public feedback form (/b/:businessId)
│   │   │   ├── QRCode.jsx         # QR generation (4 styles, download)
│   │   │   ├── Settings.jsx       # Business settings, profile, platforms
│   │   │   ├── Login.jsx          # Email/password + Magic Link
│   │   │   ├── Signup.jsx         # OTP verification + registration
│   │   │   └── ...                # Welcome, Pricing, ForgotPassword, ResetPassword
│   │   ├── components/            # Layout, StarRating, ProfileCard, 10+ visual effects
│   │   ├── config/                # api.js, supabase.js
│   │   └── hooks/                 # useAuth.js
│   └── vite.config.js             # Dev server port 8000, proxy /api → :8081
├── extension/
│   ├── manifest.json              # Chrome Manifest V3
│   ├── popup.js                   # Login, stats, open dashboard
│   └── background.js              # Polls alerts every 1 min, Chrome notifications
├── docs/                          # Architecture diagrams (5 Mermaid + downloadable HTML)
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- Supabase account (free tier works)

### 1. Clone & Install

```bash
cd feedback-system

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

Create `backend/.env`:

```env
# Required
JWT_SECRET=your-secure-random-secret-min-32-chars
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional — AI (sentiment analysis disabled if missing)
GEMINI_API_KEY=your-gemini-api-key

# Optional — Email (OTP/alerts disabled if missing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Optional
FRONTEND_URL=http://localhost:8000
PORT=8081
```

Create `frontend/.env` (optional, for Magic Link):

```env
VITE_API_URL=
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up Database

Run the SQL files in your Supabase SQL editor in order:

1. `backend/db/supabase_schema.sql` — Main tables
2. `backend/db/add_ai_sentiment_columns.sql`
3. `backend/db/add_customer_email_column.sql`
4. `backend/db/add_pinned_column.sql`
5. `backend/db/add_reply_columns.sql`
6. `backend/db/add_profile_columns.sql`
7. `backend/db/add_external_summaries.sql`

### 4. Run

```bash
# Terminal 1 — Backend
cd backend
node server.js
# → http://localhost:8081

# Terminal 2 — Frontend
cd frontend
npm run dev
# → http://localhost:8000
```

---

## How It Works

### For Business Owners

1. **Sign up** at `/signup` — verify email with OTP, create account
2. **Get QR code** at `/qr-code` — choose from 4 styles, customize colors, download PNG/SVG
3. **Print & display** the QR code at your business location
4. **Monitor feedback** at `/dashboard` — view stats, search, filter, reply to customers
5. **Analyze trends** at `/analytics` — charts, date filtering, CSV export
6. **Get alerts** — email + Chrome extension notifications for negative feedback

### For Customers

1. **Scan** QR code with phone camera
2. **Rate** experience (1-5 stars) + optional message
3. **Positive (4-5★)** → "Thanks! Leave us a Google review?" with redirect link
4. **Negative (1-3★)** → Feedback stored privately, owner alerted, empathetic thank-you message
5. **Owner replies** → Customer receives email response

### Core Rating Logic

```
IF rating >= 4:
  → AI analyzes sentiment → Store with AI metadata
  → Redirect customer to Google Reviews
  → Owner sees on dashboard

IF rating <= 3:
  → AI analyzes sentiment → Store privately
  → Send negative alert email to owner
  → Chrome extension fires desktop notification
  → Customer sees empathetic message
  → NOT sent to Google Reviews
```

---

## API Endpoints

### Authentication (`/api/auth`)

| Method | Path | Auth | Rate Limit | Description |
|--------|------|:----:|:----------:|-------------|
| POST | `/send-otp` | — | 10/15min | Send OTP for email verification |
| POST | `/verify-otp` | — | 10/15min | Verify 6-digit OTP code |
| POST | `/signup` | — | 10/15min | Register new user + business |
| POST | `/login` | — | 10/15min | Email/password login |
| POST | `/google` | — | 10/15min | Magic Link / OAuth login |
| GET | `/me` | JWT | — | Get current user info |
| POST | `/forgot-password` | — | 10/15min | Request password reset |
| POST | `/reset-password` | — | 10/15min | Reset with token |
| GET | `/verify-reset-token` | — | — | Validate reset token |
| POST | `/change-password` | JWT | — | Change password (logged in) |
| POST | `/refresh-token` | — | 10/15min | Refresh expired access token |

### Business (`/api/business`)

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| GET | `/:id` | — | Get business info (public, for feedback form) |
| PUT | `/:id` | JWT | Update business settings |
| POST | `/validate-review-url` | — | Validate review platform URL (SSRF protected) |
| GET | `/:id/platforms` | JWT | List review platforms |
| POST | `/:id/platforms` | JWT | Add review platform |
| PUT | `/:id/platforms/:pid` | JWT | Update platform |
| DELETE | `/:id/platforms/:pid` | JWT | Delete platform |
| GET | `/:id/qr` | JWT | Get QR code data |
| GET | `/:id/stats` | JWT | Get feedback statistics |
| GET | `/:id/plan` | JWT | Get subscription plan |
| GET | `/:id/alerts` | JWT | Get unnotified feedback alerts |
| POST | `/:id/alerts/mark-notified` | JWT | Mark alerts as read |
| GET | `/:id/analytics` | JWT | Get analytics data |
| POST | `/:id/external-summaries` | JWT | Create AI external summary |
| GET | `/:id/external-summaries` | JWT | List external summaries |
| DELETE | `/:id/external-summaries/:sid` | JWT | Delete summary |

### Feedback (`/api/feedback`)

| Method | Path | Auth | Rate Limit | Description |
|--------|------|:----:|:----------:|-------------|
| POST | `/:businessId` | — | 5/min | Submit feedback (public) |
| GET | `/:businessId` | JWT | — | Get all feedbacks (with filters) |
| POST | `/:businessId/external` | JWT | — | Import external feedback |
| GET | `/:businessId/ai-summary` | JWT | — | AI bulk summary |
| POST | `/:businessId/analyze-url` | JWT | — | AI-analyze external review URL |
| POST | `/:businessId/:fbId/reply` | JWT | — | Reply to feedback (sends email) |
| DELETE | `/:businessId/:fbId` | JWT | — | Delete feedback |
| PATCH | `/:businessId/:fbId/pin` | JWT | — | Pin/unpin feedback |
| GET | `/:businessId/export` | JWT | — | Export as CSV/JSON |

### Upload (`/api/upload`)

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| POST | `/avatar` | JWT | Upload profile picture (MIME validated) |
| DELETE | `/avatar` | JWT | Remove profile picture |

---

## Database Schema

7 tables in Supabase PostgreSQL:

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **users** | Business owner accounts | `email` (unique), `password_hash` (bcrypt), `business_id` (FK) |
| **businesses** | Business profiles | `name`, `category`, `subscription_plan`, `monthly_feedback_count` |
| **feedbacks** | Customer feedback entries | `rating` (1-5), `message`, `ai_sentiment`, `ai_confidence`, `reply_text` |
| **review_platforms** | External review URLs | `platform_name`, `url`, `is_primary` |
| **email_verification_otps** | Signup OTP codes | `otp_code`, `expires_at` (10min), `attempts` (max 5) |
| **password_reset_tokens** | Password reset tokens | `token` (crypto.randomBytes), `expires_at` (1h), `used` |
| **external_summaries** | AI analysis of external reviews | `source_type`, `content`, `ai_analysis` |

Full ER diagram available in `docs/5_Database_Schema.md`.

---

## Security

The application implements an **11-layer security architecture**. Every HTTP request passes through multiple security checks before reaching the database.

### Layer 1 — Network & Transport

- HTTPS/TLS encryption in production
- HSTS enabled (1 year, includeSubDomains)
- Trust proxy configured for Railway/Vercel

### Layer 2 — HTTP Security Headers (`helmet`)

- `Content-Security-Policy` — script-src: self only
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection` enabled
- `X-Powered-By` header removed

### Layer 3 — CORS & HPP

- CORS whitelist — only `localhost:8000` and production Vercel domain
- `hpp()` blocks HTTP parameter pollution attacks
- Allowed methods restricted to GET, POST, PUT, PATCH, DELETE

### Layer 4 — Body Size Limits

- JSON body capped at **5 MB**
- URL-encoded body capped at **1 MB**
- Avatar uploads capped at **2 MB**

### Layer 5 — Input Sanitization (`middleware/sanitize.js`)

- Strips null bytes and control characters from all inputs
- Blocks `__proto__`, `constructor`, `prototype` keys (prototype pollution prevention)
- Maximum object nesting depth: **10 levels**
- Array size cap: **1000 items**
- Applied globally to `req.body`, `req.query`, `req.params`

### Layer 6 — Rate Limiting (`middleware/rateLimit.js`)

| Limiter | Window | Max Requests | Applied To |
|---------|--------|:------------:|------------|
| `apiLimiter` | 1 minute | 100/IP | All API routes |
| `authLimiter` | 15 minutes | 10/IP | Auth endpoints |
| `feedbackLimiter` | 1 minute | 5/IP | Feedback submission |

### Layer 7 — Authentication (`middleware/auth.js`)

- **Algorithm pinned** to HS256 (prevents algorithm confusion attacks)
- **No fallback secret** — server refuses to start without `JWT_SECRET`
- Access tokens: **1 hour** expiry with unique `jti` (JWT ID)
- Refresh tokens: **7 day** expiry with rotation
- Token length check: **max 2048 characters**
- Bearer token extraction with format validation

### Layer 8 — Input Validation (Route-Level)

| Check | Validation |
|-------|-----------|
| Email | `isValidEmail()` — RFC-compliant regex, no backticks/quotes |
| Password | `isStrongPassword()` — 8+ chars, uppercase, lowercase, number |
| Message | Max 5000 characters |
| Business name | Max 200 characters |
| Rating | Integer 1-5 only |
| File upload | MIME whitelist: `image/jpeg`, `image/png`, `image/gif`, `image/webp` |

### Layer 9 — SSRF Protection (`sanitize.js` + `ai.js`)

- Blocks private IPs: `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`
- Blocks `localhost`, `127.x.x.x`, `0.0.0.0`
- Blocks IPv6 loopback (`::1`)
- HTTP/HTTPS protocols only
- Applied to: URL validation endpoint, `fetchAndAnalyzeUrl` in AI service

### Layer 10 — Data Security

- **Passwords**: bcrypt with salt rounds 10
- **OTP generation**: `crypto.randomInt()` (CSPRNG, not `Math.random`)
- **Reset tokens**: `crypto.randomBytes(32)` (256-bit entropy)
- **Email templates**: HTML-escaped with `esc()` function (prevents XSS via email injection)
- **Customer emails**: Stripped from API responses (privacy protection)
- **No hardcoded secrets**: API keys only from environment variables
- **Reset token NOT in API response** (anti-enumeration)

### Layer 11 — Error Handling

- No stack traces in production (generic error messages)
- Anti-enumeration on login: same error for wrong email and wrong password
- Anti-enumeration on forgot-password: "If account exists, link sent"
- Server-side logging only

### Security by File

| File | Security Responsibility |
|------|------------------------|
| `server.js` | Helmet, HPP, CORS, body limits, sanitize middleware, error handler |
| `middleware/auth.js` | JWT HS256, token generation, refresh tokens, algorithm pinning |
| `middleware/rateLimit.js` | 3 rate limiters (API, auth, feedback) |
| `middleware/sanitize.js` | XSS prevention, prototype pollution, SSRF URL checker, validators |
| `routes/auth.js` | Password strength, anti-enumeration, OTP expiry/attempts |
| `routes/upload.js` | MIME type whitelist, file size limit |
| `routes/feedback.js` | Message length limit, email validation |
| `routes/business.js` | SSRF protection on URL validator, ownership verification |
| `services/ai.js` | No hardcoded API key, SSRF on fetchAndAnalyzeUrl |
| `services/email.js` | HTML-escaped templates, crypto-secure OTP |

---

## Architecture Diagrams

Full diagrams with Mermaid markup are available in the `docs/` folder:

| File | Content |
|------|---------|
| `docs/1_Complete_System_Architecture.md` | Full system — all 3 platforms, files, connections |
| `docs/2_Database_Flow.md` | Feedback lifecycle from QR scan to owner reply |
| `docs/3_Authentication_Flow.md` | All 5 auth flows with security checks |
| `docs/4_Frontend_Architecture.md` | React routes, components, state management |
| `docs/5_Database_Schema.md` | ER diagram with all 7 tables and columns |
| `docs/diagrams.html` | **Downloadable PNG/SVG** — open at `localhost:8888` |

---

## Deployment

### Backend (Railway)

1. Push to GitHub
2. Connect repo to Railway
3. Set environment variables in Railway dashboard
4. Railway auto-deploys from `backend/` directory

### Frontend (Vercel)

1. Push to GitHub
2. Import repo to Vercel
3. Set root directory to `frontend/`
4. Set `VITE_API_URL` to Railway backend URL
5. Vercel auto-deploys on push

### Chrome Extension

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked" → select `extension/` folder
4. Update `API_URL` in `popup.js` to your backend URL

---

## License

MIT
