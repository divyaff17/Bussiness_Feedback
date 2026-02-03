# Feedback System - Deployment Guide

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │────▶│   Railway       │────▶│   Supabase      │
│   Frontend      │     │   Backend       │     │   Database      │
│   (React)       │     │   (Express)     │     │   (PostgreSQL)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Step 1: Set up Supabase Database

1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to **SQL Editor** → **New Query**
3. Copy the content from `backend/db/supabase_schema.sql`
4. Click **Run** to create tables

## Step 2: Deploy Backend to Railway

1. Go to [Railway](https://railway.app) and create new project
2. Connect your GitHub repository
3. Set environment variables:
   - `JWT_SECRET` - Strong random string
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anon key
   - `FRONTEND_URL` - Your Vercel frontend URL (e.g., https://your-app.vercel.app)
   - `PORT` - 8080

4. Railway will automatically deploy from the `backend` folder

## Step 3: Deploy Frontend to Vercel

1. Go to [Vercel](https://vercel.com) and import your GitHub repository
2. Set the root directory to `frontend`
3. Set environment variables:
   - `VITE_API_URL` - Your Railway backend URL (e.g., https://your-app.railway.app)

4. Update `frontend/vite.config.js` for production proxy

## Step 4: Update QR Code URLs

The QR code URL comes from the `FRONTEND_URL` environment variable in the backend.

**Example:**
- Development: `http://localhost:8000/b/{business_id}`
- Production: `https://your-app.vercel.app/b/{business_id}`

Make sure `FRONTEND_URL` in Railway matches your Vercel deployment URL!

## Environment Variables Summary

### Backend (Railway)
| Variable | Description | Example |
|----------|-------------|---------|
| JWT_SECRET | JWT signing key | `super-secret-key-123` |
| SUPABASE_URL | Supabase project URL | `https://abc.supabase.co` |
| SUPABASE_ANON_KEY | Supabase anon key | `eyJhbGc...` |
| FRONTEND_URL | Vercel frontend URL | `https://app.vercel.app` |
| PORT | Server port | `8080` |

### Frontend (Vercel)
| Variable | Description | Example |
|----------|-------------|---------|
| VITE_API_URL | Railway backend URL | `https://app.railway.app` |

## Testing QR Codes

1. Sign up on your production site
2. Go to QR Code page
3. The QR code should point to: `https://your-vercel-app.vercel.app/b/{business_id}`
4. Scan with your phone - it should open the feedback form!

## Database Schema

The Supabase database has 3 tables:
- `businesses` - Business info (name, category, google_review_url)
- `users` - Business owner login credentials
- `feedbacks` - Customer feedback data

All linked by `business_id` - data is stored in cloud, not localStorage!
