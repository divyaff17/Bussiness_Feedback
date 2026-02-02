# Deployment Guide - QR Feedback System

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Vercel      │     │    Railway      │     │   SQLite DB     │
│   (Frontend)    │────▶│   (Backend)     │────▶│  (on Railway)   │
│  React + Vite   │     │  Node/Express   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Step 1: Deploy Backend on Railway

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### 1.2 Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository
4. Select the `feedback-system/backend` folder

### 1.3 Set Environment Variables
In Railway dashboard → Variables:

| Variable | Value |
|----------|-------|
| `PORT` | `8080` |
| `JWT_SECRET` | Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `FRONTEND_URL` | `https://your-app.vercel.app` (update after Vercel deploy) |
| `DATABASE_PATH` | `./db/feedback.db` |

### 1.4 Get Your Backend URL
After deploy, Railway gives you a URL like:
```
https://feedback-backend-production.up.railway.app
```
**Save this URL!**

---

## Step 2: Deploy Frontend on Vercel

### 2.1 Update vercel.json
Edit `frontend/vercel.json` and replace the backend URL:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://YOUR-RAILWAY-URL/api/$1"
    }
  ]
}
```

### 2.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"Import Project"**
4. Select your repository
5. Set **Root Directory** to `feedback-system/frontend`
6. Click **Deploy**

### 2.3 Get Your Frontend URL
Vercel gives you a URL like:
```
https://feedback-app.vercel.app
```

---

## Step 3: Update Backend FRONTEND_URL

Go back to Railway and update the environment variable:

```
FRONTEND_URL=https://feedback-app.vercel.app
```

This ensures QR codes generate the correct production URL.

---

## Step 4: Test Production

1. **Open**: `https://your-app.vercel.app`
2. **Sign up** a new business
3. **Go to QR Code page** - URL should be `https://your-app.vercel.app/b/...`
4. **Scan QR** from mobile - should work from anywhere!

---

## Troubleshooting

### API calls failing?
- Check Railway logs for errors
- Verify FRONTEND_URL in Railway matches your Vercel URL
- Check CORS is configured correctly

### Database not persisting?
- Railway's ephemeral storage resets on redeploy
- For production, consider upgrading to Railway's persistent storage or using PostgreSQL

### QR codes showing wrong URL?
- Restart Railway after updating FRONTEND_URL
- Clear browser cache and regenerate QR

---

## Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your domain: `feedback.yourbusiness.com`
3. Update DNS as instructed

### Railway
1. Go to Settings → Networking
2. Add custom domain
3. Update DNS as instructed

### Update FRONTEND_URL
After adding custom domain, update Railway:
```
FRONTEND_URL=https://feedback.yourbusiness.com
```

---

## Production Checklist

- [ ] Backend deployed on Railway
- [ ] Frontend deployed on Vercel
- [ ] FRONTEND_URL set to production URL
- [ ] JWT_SECRET is strong and unique
- [ ] QR codes generate production URLs
- [ ] Mobile feedback flow tested
- [ ] Dashboard shows live updates
