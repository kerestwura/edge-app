# EDGE — Free Deployment Guide

## Architecture (3 free services)

| Component | Platform | Free Tier |
|-----------|----------|-----------|
| Frontend | **Vercel** | Unlimited |
| Backend | **Render.com** | 750 hrs/month |
| Database | **MongoDB Atlas** | 512MB forever |

---

## Step 1: MongoDB Atlas (Database)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create free account → Create a **Free Shared Cluster** (M0)
3. Choose any cloud provider/region
4. Under **Database Access** → Add a database user (save username + password)
5. Under **Network Access** → Add IP `0.0.0.0/0` (allow from anywhere)
6. Click **Connect** → **Drivers** → Copy the connection string
7. It looks like: `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true`
8. Add your database name at the end: `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/edge_db?retryWrites=true`

Save this — you'll need it as `MONGO_URL` in the next step.

---

## Step 2: Render.com (Backend)

1. Go to [render.com](https://render.com) → Sign up free (use GitHub)
2. **Push your code to GitHub first** (use the "Save to GitHub" button in Emergent chat)
3. In Render dashboard → **New** → **Web Service**
4. Connect your GitHub repo
5. Configure:
   - **Name**: `edge-api`
   - **Region**: pick closest to you
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: **Free**

6. Add **Environment Variables**:
   ```
   MONGO_URL = mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/edge_db?retryWrites=true
   DB_NAME = edge_db
   JWT_SECRET = (generate a random 64-char string — use: openssl rand -hex 32)
   ADMIN_EMAIL = admin@traderdna.com
   ADMIN_PASSWORD = (your chosen password)
   CORS_ORIGINS = https://your-vercel-app.vercel.app
   EMERGENT_LLM_KEY = (your Emergent LLM key from Profile → Universal Key)
   ```

7. Click **Create Web Service** → Wait for deploy
8. Your backend URL will be: `https://edge-api.onrender.com`

> **Note**: Free Render services sleep after 15 min of inactivity. First request after sleep takes ~30s to wake. This is fine for personal testing.

---

## Step 3: Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) → Sign up free (use GitHub)
2. Click **Add New** → **Project** → Import your GitHub repo
3. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `yarn build` (should auto-detect)
   - **Output Directory**: `build`

4. Add **Environment Variable**:
   ```
   REACT_APP_BACKEND_URL = https://edge-api.onrender.com
   ```
   (Use your actual Render backend URL from Step 2)

5. Click **Deploy** → Wait for build
6. Your frontend URL will be: `https://your-project.vercel.app`

---

## Step 4: Update Render CORS

After getting your Vercel URL, go back to Render:

1. Go to your `edge-api` service → **Environment**
2. Update `CORS_ORIGINS` to your actual Vercel URL:
   ```
   CORS_ORIGINS = https://your-project.vercel.app
   ```
3. Save → Service will auto-redeploy

---

## Step 5: Install as PWA

1. Open `https://your-project.vercel.app` on your phone in Chrome/Safari
2. **Android**: Menu (⋮) → "Install App" or "Add to Home Screen"
3. **iOS**: Share (↑) → "Add to Home Screen"
4. App opens in standalone mode — no browser chrome, dark splash screen

---

## Environment Variables Summary

### Render (Backend)
| Variable | Value |
|----------|-------|
| `MONGO_URL` | Your MongoDB Atlas connection string |
| `DB_NAME` | `edge_db` |
| `JWT_SECRET` | Random 64-char hex string |
| `ADMIN_EMAIL` | `admin@traderdna.com` |
| `ADMIN_PASSWORD` | Your chosen password |
| `CORS_ORIGINS` | Your Vercel frontend URL |
| `EMERGENT_LLM_KEY` | Your key from Emergent Profile → Universal Key |

### Vercel (Frontend)
| Variable | Value |
|----------|-------|
| `REACT_APP_BACKEND_URL` | Your Render backend URL |

---

## Troubleshooting

**Backend won't start on Render?**
- Check logs in Render dashboard
- Make sure `requirements.txt` has all dependencies
- The free tier has 512MB RAM — should be plenty

**CORS errors?**
- Update `CORS_ORIGINS` in Render env to match your exact Vercel URL (no trailing slash)

**Google Auth not working?**
- Google OAuth redirect needs to point to your Vercel URL
- Update the redirect in the Emergent Auth dashboard if needed

**Render service sleeping?**
- First load after inactivity takes ~30 seconds
- For always-on, consider upgrading to Render paid ($7/mo) or use Railway.app free tier

**Voice/AI features not working?**
- Make sure `EMERGENT_LLM_KEY` is set in Render environment
- Check your Emergent Universal Key balance (Profile → Universal Key → Add Balance)
