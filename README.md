# EstateClips

AI-powered video clip generator built exclusively for real estate agents. Upload a property video, get shareable social media clips with smart captions, room labels, and content-type templates — automatically.

## Features

- **AI Content Detection** — Identifies Property Tours, Luxury Listings, Open Houses, Market Updates, Neighborhood Tours, Talking Heads, and more
- **Highlight Detection** — Google Gemini AI scores every moment to find the best 15–60 second clips
- **Smart Captions** — Removes filler words, fixes grammar, highlights keywords, creates animated subtitles
- **Room Labels** — Detects Kitchen, Living Room, Pool, Master Bedroom, Backyard, Garage, Office, and more
- **Template Matching** — Luxury listings get elegant gold styling; Open Houses display address/date/time; Talking Heads get Reels-ready captions
- **Full Dashboard** — Upload, process, preview, download, delete, and regenerate clips
- **Dark Mode** — Full dark UI optimized for creative work
- **Responsive** — Works on mobile, tablet, and desktop

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| AI | Google Gemini 1.5 Flash (free tier) |
| Deployment | Vercel |

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/yourusername/estateclips.git
cd estateclips
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run the contents of `supabase/migrations/001_initial_schema.sql`
3. Storage buckets (`videos` and `clips`) are created by the migration

### 3. Get a Gemini API key

1. Visit [makersuite.google.com](https://makersuite.google.com/app/apikey)
2. Create a free API key (no billing required)
3. Free tier: 15 requests/min, 1,500 requests/day

### 4. Configure environment

```bash
cp .env.example .env.local
# Fill in your values in .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase Dashboard → Settings → API
- `GEMINI_API_KEY` — from Google AI Studio

### 5. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

## How It Works

1. **Upload** — Drag and drop a property video (MP4, MOV, AVI, WebM, MKV up to 500MB)
2. **Optional transcript** — Paste a transcript for higher-quality captions (or let AI work from context)
3. **AI pipeline** runs:
   - Transcript cleaning (removes filler words, fixes grammar)
   - Gemini AI analysis (content type, property details, highlights)
   - Room detection from transcript keywords
   - Caption generation with keyword highlighting
   - Overlay generation (room labels, open house info, property details)
4. **Clips generated** — 3–6 highlight clips with timestamps, captions, and overlays
5. **Preview and download** — Play clips in-browser, toggle captions, export

## Content Type Templates

| Type | Treatment |
|------|-----------|
| Luxury Listing | Gold fonts, smooth animations, premium overlays |
| Open House | Bold green, address/date/time prominently displayed |
| Property Tour | Blue dynamic captions, room label overlays |
| Market Update | Indigo professional styling |
| Neighborhood Tour | Amber energetic captions |
| Talking Head / Agent Reel | Pink bold Reels-style captions |
| Listing Walkthrough | Teal smooth transitions |

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Login, signup pages
│   ├── api/             # API routes (projects, upload, process, clips, stats)
│   ├── auth/callback/   # Supabase OAuth callback
│   ├── dashboard/       # Protected dashboard pages
│   └── page.tsx         # Landing page
├── components/
│   ├── clips/           # ClipCard with video preview and captions
│   ├── dashboard/       # Navbar, ProjectCard
│   ├── ui/              # Button, Badge, ProgressBar, EmptyState, etc.
│   └── upload/          # VideoUploader with dropzone
├── lib/
│   ├── ai-pipeline.ts   # Gemini AI integration, caption generation, room detection
│   ├── supabase/        # Client, server, middleware helpers
│   └── video-processing.ts  # Metadata extraction, validation, utilities
├── types/               # TypeScript interfaces
└── utils/               # Formatting, class utilities
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full Vercel deployment instructions.

## Future Enhancements (Architecture Ready)

- Background job queuing (Upstash Redis / BullMQ)
- Team accounts and shared projects
- Custom branding per agent
- Video export with burned-in captions (FFmpeg via Vercel Edge)
- Payment integration (Stripe) for pro features
- CRM integrations (Follow Up Boss, Sierra Interactive)

## License

MIT
