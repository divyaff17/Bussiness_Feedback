# Data Flow — Feedback Submission to Dashboard

> Complete step-by-step flow from customer scanning a QR code to the business owner viewing and replying on the dashboard.

```mermaid
sequenceDiagram
    autonumber
    participant C as 👤 Customer
    participant QR as 📱 QR Code
    participant FB as ⚛️ Feedback Page<br/>/b/:businessId
    participant API as 🖥️ Backend<br/>POST /api/feedback/:id
    participant SAN as 🧹 Sanitize MW
    participant RL as ⏱️ Rate Limiter<br/>5 req/min
    participant AI as 🤖 Gemini AI
    participant SUP as 🗄️ Supabase DB
    participant EM as 📧 Email Service
    participant TY as ✅ ThankYou Page
    participant OWN as 👔 Business Owner
    participant DASH as 📊 Dashboard
    participant EXT as 🧩 Chrome Extension

    Note over C,EXT: PHASE 1 — FEEDBACK SUBMISSION

    C->>QR: Scans QR code
    QR->>FB: Opens /b/{businessId}
    FB->>API: GET /api/business/:id (public)
    API->>SUP: Query businesses table
    SUP-->>API: Business name, category, logo
    API-->>FB: Business info
    FB->>FB: Render star rating + message form

    C->>FB: Submit: ⭐⭐⭐ + "Great food!"
    FB->>API: POST /api/feedback/:businessId
    API->>RL: Check rate limit (5/min/IP)
    RL-->>API: ✅ Allowed
    API->>SAN: Sanitize inputs
    SAN-->>API: Clean data (length ≤5000, email validated)

    Note over API,AI: PHASE 2 — AI ANALYSIS

    API->>AI: analyzeFeedback("Great food!")
    AI-->>API: { sentiment: "positive", confidence: 92,<br/>category: "food_quality", summary: "..." }

    Note over API,SUP: PHASE 3 — DATABASE STORAGE

    API->>SUP: INSERT INTO feedbacks<br/>(rating, message, ai_sentiment,<br/>ai_confidence, ai_category, ai_summary,<br/>is_positive, customer_email, source)
    SUP-->>API: ✅ Row saved

    Note over API,EXT: PHASE 4 — NEGATIVE FEEDBACK ALERTS

    alt Negative Feedback (rating ≤ 2 OR ai_sentiment = "negative")
        API->>SUP: Get business owner email
        SUP-->>API: owner_email
        API->>EM: sendNegativeFeedbackAlert()
        EM-->>OWN: 📧 "⚠️ Negative feedback received"
        Note over EXT: background.js alarm triggers every 1 min
        EXT->>API: GET /api/business/:id/alerts
        API->>SUP: SELECT feedbacks WHERE notified = false
        SUP-->>API: New unnotified feedbacks
        API-->>EXT: Alert data
        EXT->>OWN: 🔔 Chrome desktop notification
        EXT->>API: POST /api/business/:id/alerts/mark-notified
    end

    Note over API,TY: PHASE 5 — CUSTOMER REDIRECT

    API-->>FB: { isPositive: true, googleReviewUrl: "..." }
    FB->>TY: Navigate to /thank-you

    alt Positive Feedback
        TY->>C: "Thanks! Leave us a Google review? 🔗"
    else Negative Feedback
        TY->>C: "We appreciate your feedback. We'll do better!"
    end

    Note over OWN,EXT: PHASE 6 — OWNER DASHBOARD

    OWN->>DASH: Opens /dashboard
    DASH->>API: GET /api/business/:id/stats
    API->>SUP: Aggregate: total, avg_rating, positive%, negative%
    SUP-->>API: Stats data
    API-->>DASH: { totalFeedbacks, avgRating, positivePercent }

    DASH->>API: GET /api/feedback/:businessId?page=1&search=&filter=
    API->>SUP: SELECT feedbacks with filters + pagination
    SUP-->>API: Feedback list with AI analysis
    API-->>DASH: Paginated feedbacks

    DASH->>DASH: Render stats cards + feedback list<br/>with search, filter, pin, delete

    Note over OWN,C: PHASE 7 — OWNER REPLY

    OWN->>DASH: Click "Reply" on a feedback
    DASH->>API: POST /api/feedback/:businessId/:fbId/reply<br/>{ replyText: "Thank you for..." }
    API->>SUP: UPDATE feedbacks SET reply_text, replied_at
    API->>EM: sendReplyToCustomer(customer_email, replyText)
    EM-->>C: 📧 "Business X responded to your feedback"

    Note over OWN,DASH: PHASE 8 — AI BULK SUMMARY

    OWN->>DASH: Request AI summary (Analytics page)
    DASH->>API: GET /api/feedback/:businessId/ai-summary
    API->>SUP: SELECT all recent feedbacks
    API->>AI: analyzeBulkSummary(feedbacks[])
    AI-->>API: { overallSentiment, themes, suggestions }
    API-->>DASH: AI summary report
```

---

## Data Flow Summary Table

| Phase | From → To | Endpoint | Data Transferred |
|-------|-----------|----------|-----------------|
| **1. Load Form** | Frontend → Backend | `GET /api/business/:id` | Business name, logo, category |
| **2. Submit** | Frontend → Backend | `POST /api/feedback/:businessId` | rating, message, customer_email |
| **3. Rate Limit** | Backend → rateLimit.js | Internal middleware | IP + window check (5/min) |
| **4. Sanitize** | Backend → sanitize.js | Internal middleware | Strip XSS, validate length, check email |
| **5. AI Analysis** | Backend → Gemini API | External HTTP POST | Message text → sentiment, confidence, category |
| **6. Store** | Backend → Supabase | SQL INSERT | Full feedback row with AI fields |
| **7. Alert (neg)** | Backend → Email/Extension | SMTP + Chrome alarm | Alert email + desktop notification |
| **8. Redirect** | Backend → Frontend | HTTP response | isPositive flag + review URL |
| **9. Dashboard** | Frontend → Backend | `GET /stats` + `GET /feedback` | Stats + paginated feedbacks |
| **10. Reply** | Frontend → Backend → Email | `POST /reply` + SMTP | Reply text → customer email |
| **11. AI Summary** | Frontend → Backend → Gemini | `GET /ai-summary` | Bulk feedbacks → summary report |

---

## Files Involved in Data Flow

| Step | Files Used |
|------|-----------|
| QR Scan Landing | `frontend/src/pages/Feedback.jsx`, `components/StarRating.jsx` |
| Feedback Submit | `backend/routes/feedback.js` (POST handler) |
| Rate Limiting | `backend/middleware/rateLimit.js` (feedbackLimiter: 5/min) |
| Input Sanitization | `backend/middleware/sanitize.js` (sanitizeInputs, isValidEmail) |
| AI Analysis | `backend/services/ai.js` (analyzeFeedback, analyzeBulkSummary) |
| Database Storage | `backend/db/supabase.js` → feedbacks table |
| Email Alerts | `backend/services/email.js` (sendNegativeFeedbackAlert) |
| Chrome Alerts | `extension/background.js` (polls /alerts every 1 min) |
| Thank You Page | `frontend/src/pages/ThankYou.jsx` |
| Dashboard View | `frontend/src/pages/Dashboard.jsx` |
| Analytics View | `frontend/src/pages/Analytics.jsx` |
| Reply to Customer | `backend/routes/feedback.js` (POST reply), `services/email.js` |
