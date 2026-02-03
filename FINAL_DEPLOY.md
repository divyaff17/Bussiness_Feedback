# 🚀 FINAL DEPLOYMENT GUIDE

## Your URLs:
- **Railway Backend**: `https://extension-production-9536.up.railway.app`
- **Vercel Frontend**: (Your Vercel URL after deploy)

---

## STEP 1: RAILWAY BACKEND

### 1.1 Settings Configuration
- **Root Directory**: `backend`
- **Build Command**: (leave empty - uses package.json)
- **Start Command**: (leave empty - uses package.json)

### 1.2 Add Environment Variables (REQUIRED!)
Go to **Variables** tab and add ALL of these:

| Key | Value |
|-----|-------|
| `PORT` | `8080` |
| `JWT_SECRET` | `my-super-secret-key-2024` |
| `SUPABASE_URL` | `https://cyedbqrknoigldnyuqon.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZWRicXJrbm9pZ2xkbnl1cW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzkzNDcsImV4cCI6MjA4NTY1NTM0N30.7bDtKb4zaiCxlkt6aQetH0rgFQzoKtrdB4_42gnt9LY` |
| `FRONTEND_URL` | `https://YOUR-VERCEL-URL.vercel.app` |

### 1.3 Generate Domain
1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy the URL

### 1.4 Verify Backend Works
Open in browser: `https://extension-production-9536.up.railway.app/health`

Should show: `{"status":"ok","database":"supabase"}`

---

## STEP 2: VERCEL FRONTEND

### 2.1 Project Settings
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 2.2 Add Environment Variable
Go to **Settings** → **Environment Variables**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://extension-production-9536.up.railway.app` |

### 2.3 Redeploy
Go to **Deployments** → Click 3 dots on latest → **Redeploy**

---

## STEP 3: TEST EVERYTHING

1. Open your Vercel URL
2. Sign up with a new account
3. Go to QR Code page
4. Scan QR with phone
5. Submit feedback
6. Check Dashboard for the feedback!

---

## TROUBLESHOOTING

### "ERR_NAME_NOT_RESOLVED"
- Railway backend not deployed or crashed
- Check Railway Logs for errors
- Make sure all environment variables are set

### "Not Found" or 404
- VITE_API_URL not set in Vercel
- Redeploy Vercel after adding variable

### "Session Expired"
- Clear browser data
- Sign up with new account
