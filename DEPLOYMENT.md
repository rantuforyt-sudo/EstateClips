# EstateClips — Deployment Guide

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier)
- A [Vercel](https://vercel.com) account (free tier)
- A [Google AI Studio](https://makersuite.google.com) account (free Gemini API key)

---

## Step 1: Set Up Supabase

### 1.1 Create Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Choose your organization, give it a name (e.g. `estateclips`), set a strong database password
4. Select a region close to your users
5. Click **Create new project** and wait ~2 minutes

### 1.2 Run Database Migration

1. In your Supabase project, go to **SQL Editor**
2. Open `supabase/migrations/001_initial_schema.sql` from this repo
3. Paste the entire contents and click **Run**
4. You should see "Success. No rows returned"

This creates:
- `profiles` table
- `projects` table
- `clips` table
- `processing_jobs` table
- Storage buckets: `videos` (private) and `clips` (public)
- Row Level Security policies
- Auto-create profile trigger

### 1.3 Get API Keys

Go to **Settings → API** and copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### 1.4 Configure Auth

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel deployment URL (e.g. `https://estateclips.vercel.app`)
3. Add to **Redirect URLs**: `https://estateclips.vercel.app/auth/callback`
4. For local dev, also add: `http://localhost:3000/auth/callback`

---

## Step 2: Get Gemini API Key

1. Visit [makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Sign in with a Google account
3. Click **Create API key**
4. Copy the key → `GEMINI_API_KEY`

**Free tier limits:**
- 15 requests per minute
- 1,500 requests per day
- No credit card required

---

## Step 3: Deploy to Vercel

### Option A: Vercel CLI (recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from project root
cd estateclips
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: estateclips
# - Directory: ./
# - Override settings? No
```

### Option B: GitHub Integration

1. Push your code to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel auto-detects Next.js

### 3.1 Set Environment Variables

In Vercel Dashboard → Your Project → **Settings → Environment Variables**, add:

| Variable | Value | Environments |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Production, Preview, Development |
| `GEMINI_API_KEY` | `AIza...` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Production |

### 3.2 Redeploy

After setting environment variables, trigger a redeploy:
```bash
vercel --prod
```

---

## Step 4: Verify Deployment

1. Open your Vercel URL
2. Sign up for an account
3. Upload a short test video (30–60 seconds works best)
4. Click **Generate Clips**
5. Verify clips appear with captions

### Health Check Endpoints

- `GET /api/stats` — Returns user stats (requires auth)
- `GET /api/projects` — Returns project list (requires auth)

---

## Supabase Storage Configuration

The migration creates buckets automatically. Verify in **Storage**:

- `videos` — private bucket, 500MB file limit, video types only
- `clips` — public bucket, 200MB per clip

If buckets weren't created (some Supabase plans restrict this via SQL):
1. Go to **Storage** in Supabase Dashboard
2. Create `videos` bucket: private, 500MB limit
3. Create `clips` bucket: public, 200MB limit
4. Apply the RLS policies from the migration file manually

---

## Local Development

```bash
# Clone
git clone https://github.com/yourusername/estateclips.git
cd estateclips
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with your keys

# Start
npm run dev
# Open http://localhost:3000
```

---

## Troubleshooting

### "Invalid API key" on Gemini calls
- Verify `GEMINI_API_KEY` is set in Vercel environment variables
- Check the key is enabled at [aistudio.google.com](https://aistudio.google.com)

### Upload fails with 413
- Increase `bodySizeLimit` in `next.config.ts` (currently 500MB)
- Vercel Pro plan supports larger request sizes

### "Row Level Security" errors in Supabase
- Make sure you ran the full migration SQL
- Verify your anon key is correct (not the service role key)

### Auth redirect loop
- Add your domain to Supabase Auth → URL Configuration → Redirect URLs
- Make sure `NEXT_PUBLIC_APP_URL` matches your actual deployment URL

### Processing times out on large videos
- Vercel hobby plan functions time out at 60s; Pro extends to 300s
- `vercel.json` already configures 300s for upload and process routes
- For very large videos (>10 min), consider adding transcript text to speed up AI analysis

---

## Production Optimization

### For high traffic:
1. Add Upstash Redis for job queuing (environment variables ready)
2. Enable Vercel Edge Functions for faster response
3. Use Supabase connection pooling (PgBouncer)

### For better video processing:
1. Integrate a dedicated transcription service (Whisper API, AssemblyAI)
2. Add FFmpeg via a separate processing server or Cloudflare Workers
3. Use Cloudflare R2 instead of Supabase Storage for larger videos

---

## Cost Breakdown (Free Tier)

| Service | Free Limit | EstateClips Usage |
|---------|-----------|-------------------|
| Vercel Hobby | 100GB bandwidth, 100h build | Low — sufficient for dev/light prod |
| Supabase Free | 500MB DB, 1GB storage, 50MB files | Note: 500MB video limit needs Pro Storage |
| Gemini Flash Free | 1,500 req/day, 15 RPM | ~150 videos/day |

**Note:** Supabase free tier limits individual file uploads to 50MB. For production use with large videos, upgrade to Supabase Pro ($25/month) which removes file size limits, or use an alternative storage provider.
