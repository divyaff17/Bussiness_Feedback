# QR-Based Feedback System

A minimal, production-ready feedback system for Indian businesses that intercepts customer feedback privately before it becomes a public Google review.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm

### Installation

1. **Install Backend Dependencies**
```bash
cd feedback-system/backend
npm install
```

2. **Install Frontend Dependencies**
```bash
cd feedback-system/frontend
npm install
```

### Running the Application

1. **Start Backend** (Terminal 1)
```bash
cd feedback-system/backend
npm run dev
```
Backend runs on: http://localhost:3001

2. **Start Frontend** (Terminal 2)
```bash
cd feedback-system/frontend
npm run dev
```
Frontend runs on: http://localhost:5173

## 📱 How It Works

### For Business Owners
1. Sign up at `/signup`
2. Get your unique QR code at `/qr-code`
3. Print and display the QR code at your location
4. Monitor feedback at `/dashboard`

### For Customers
1. Scan QR code or open feedback link
2. Rate experience (1-5 stars)
3. **4-5 stars**: Prompted to leave Google review
4. **1-3 stars**: Feedback stored privately (not public)

## 🎯 Core Rating Logic

```
IF rating >= 4 stars:
  → Show "Leave Google Review" button
  → Redirect to Google Reviews
  → Store as POSITIVE

IF rating <= 3 stars:
  → Require text feedback
  → Store as PRIVATE (not sent to Google)
  → Show empathetic message
```

## 🛠 Tech Stack

- **Frontend**: React + Tailwind CSS + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT tokens
- **QR Code**: node-qrcode

## 📂 Project Structure

```
feedback-system/
├── backend/
│   ├── db/           # Database schema & connection
│   ├── middleware/   # Auth & rate limiting
│   ├── routes/       # API endpoints
│   └── server.js     # Express server
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # React context (auth)
│   │   ├── hooks/        # Custom hooks
│   │   └── pages/        # Route pages
│   └── index.html
└── README.md
```

## 🔑 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | ❌ | Register business |
| POST | `/api/auth/login` | ❌ | Login |
| GET | `/api/business/:id` | ❌ | Get business info |
| PUT | `/api/business/:id` | ✅ | Update business |
| GET | `/api/business/:id/qr` | ✅ | Get QR code |
| GET | `/api/business/:id/stats` | ✅ | Get feedback stats |
| POST | `/api/feedback` | ❌ | Submit feedback |
| GET | `/api/feedback/:businessId` | ✅ | Get feedback list |

## 💡 Features

✅ Simple business onboarding  
✅ QR code generation  
✅ Mobile-first feedback page  
✅ Smart rating logic (4-5★ → Google, 1-3★ → Private)  
✅ Dashboard with feedback summary  
✅ Date filters (Today, 7 days, 30 days)  
✅ Rate limiting for spam protection  
✅ JWT authentication  

## 📞 Support

For issues or questions, contact the developer.
