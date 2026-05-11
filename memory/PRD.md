# VideosToPrompt.com — Product Requirements Document

## Original problem statement
A full-stack AI SaaS where users upload videos and get cinematic AI prompts (summary,
scene-by-scene breakdown, per-model prompts for Veo / Sora / Kling / Runway / Midjourney / Flux),
with Google login, Razorpay payments, credit system, dashboard, admin controls, and API access.

## Stack actually used
- **Frontend**: React 19 + Tailwind + ShadCN UI + framer-motion + lucide-react + sonner toasts
- **Backend**: FastAPI + MongoDB (Motor)
- **AI**: Gemini 3 Pro (`gemini-3.1-pro-preview`) via `emergentintegrations` Universal Key
- **Object storage**: Emergent built-in object storage
- **Auth**: Emergent-managed Google OAuth (session_id → session_token cookie + Bearer fallback)
- **Payments**: Razorpay (placeholder mode by default — test verification; production keys via Admin → Integrations panel or backend `.env`)

## Personas
- **Creator** — uploads videos, generates prompts, exports to AI tools, manages credits.
- **Developer** — uses REST API + API keys to integrate VideosToPrompt into their pipeline.
- **Admin** — manages users, payments, integration keys; can manually adjust credits.

## Core requirements (static)
- Multi-page marketing site (Landing, Pricing, Blog, Contact, API docs)
- Authenticated dashboard with credit balance, recent generations, upload, saved prompts, billing, API keys
- Admin dashboard with stats, user list, payments, generations, integration key overrides, credit adjustment
- Razorpay subscription + credit-pack purchase, signature verification, webhook handler
- Gemini-3-Pro video understanding with structured JSON schema output
- Copy / TXT / JSON export of prompts; per-AI-model prompt tabs; scene timeline view

## What's been implemented (Feb 11, 2026)

### Iteration 1 — MVP
- **Backend** (all under `/api`):
  - `/auth/session`, `/auth/me`, `/auth/logout` (Emergent Google flow)
  - `/upload/video`, `/videos`, `/videos/{id}`, `/videos/{id}/stream` (Emergent storage, MIME validation, 100MB cap)
  - `/generate-prompt`, `/generations`, `/generations/{id}`, `/user/credits`
  - `/save-prompt`, `/saved-prompts`
  - `/payments/plans`, `/create-order`, `/verify`, `/history`, `/webhooks/razorpay`
  - `/api-keys/*`, `/admin/*`, `/contact`
- **Frontend**: 13 pages (dark theme initially)

### Iteration 4 — Feb 11, 2026 (Master Login + Free AI tier)
- **Master Admin login (separate from Google OAuth)**:
  - `/master-login` page with username/password form
  - `POST /api/auth/admin-master/login` with bcrypt + idempotent seeding from env
    (`MASTER_ADMIN_USERNAME`, `MASTER_ADMIN_PASSWORD`)
  - Brute-force lockout: 5 fails / 15-min, per-username (works behind K8s ingress)
- **Fixed setUser/navigate race**: all post-login redirects now use `window.location.replace()`
  so AuthContext re-initialises with the new token before ProtectedRoute runs.
- **Real Gemini SDK path**: when an `AIza…` key is supplied, we call the official `google-genai`
  SDK (`gemini-2.5-pro`) instead of the Emergent wrapper.
- **Groq free-tier fallback**: new pipeline
  - `ffmpeg` extracts 5 keyframes from the uploaded video
  - Frames + style preset sent to **Groq `meta-llama/llama-4-scout-17b-16e-instruct`** (free tier)
  - Returns the same structured JSON schema as Gemini
  - Smart routing: Gemini-real-key → Groq → Emergent-key → cinematic mock
- **Admin → Integrations** now exposes a **Groq API Key** field (placeholder + admin-panel override).
- **PromptResult** now shows an amber notice with the actual reason when a generation falls back
  to the cinematic mock (quota / invalid key / timeout) and confirms the credit refund.
- **Free-tier**: 2 credits/day refresh implemented in `auth_utils.refresh_free_credits_if_due`.
- **Home button** in marketing nav + dashboard sidebar.
- **Light theme**: full re-skin to a clean light SaaS aesthetic (off-white #fafafa, controlled
  purple-blue brand gradient accents, glass cards on white). All pages updated; text contrast verified.
- **Credit refund on AI fallback**: `_process_generation` marks `used_fallback=True` and
  increments user credits by +1 when the AI errors → user is never charged for a mock.
- **ffprobe duration + thumbnail extraction**: `video_utils.py` runs `ffprobe` and `ffmpeg`
  on upload; thumbnail saved to object storage; `GET /api/videos/{id}/thumbnail` serves it.
- **Async background generation**: POST `/generate-prompt` returns immediately with
  `status='processing'`; AI runs in `asyncio.to_thread` (so polling stays responsive);
  frontend `PromptResult` polls every 2s until completion.
- **Own-managed Google OAuth** (separate from Emergent Auth):
  - Admin → Integrations → Google OAuth Client ID/Secret
  - POST `/api/auth/google-own/verify { credential }` verifies the id_token JWT against the configured client_id and creates a session
  - Login page renders the Google Identity Services button automatically when client_id is configured
- **Admin → Integrations** extended:
  - Razorpay Key ID + Secret (already existed)
  - Google OAuth Client ID + Secret (new)
  - Gemini API Key override (new — falls back to `EMERGENT_LLM_KEY`)
- **Admin → Analytics & SEO** (new tab):
  - GA4 Measurement ID, Google Tag Manager ID, Meta/Facebook Pixel ID
  - Google Search Console & Bing Webmaster verification meta tags
  - Default page title, meta description, OG image URL
- **SiteConfigProvider** on frontend fetches `GET /api/site-config` and injects:
  GA4/GTM/Pixel scripts, verification `<meta>` tags, default title + Open Graph meta tags.
- **Favicon**: brand logo set as `<link rel="icon">` + Apple touch icon.
- **Testing**: 42/42 pytest tests pass.

## Known limitations / next backlog
**P0**
- **EMERGENT_LLM_KEY budget** is exhausted in this run — real Gemini calls fall back to
  the structured mock. User should top up via Profile → Universal Key → Add Balance to get
  real video analysis output. The fallback still returns the full schema so the UI is functional.
- **Razorpay** is in placeholder mode. To accept real payments, paste real
  `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` via Admin → Integrations panel.

**P1**
- Refund credit when AI returns the fallback (currently charges 1 credit even on fallback).
- Thumbnail generation from uploaded video (frame extraction).
- True video duration metadata via ffprobe on upload.
- Async background job queue for very long videos (currently synchronous within 40s budget).

**P2**
- Email notifications (Resend) for completed generations.
- Team workspaces for Studio plan.
- White-label export (Studio plan).
- Public share links for prompts.
- Search + filter on dashboard.

## Test credentials
See `/app/memory/test_credentials.md` for the seeding pattern.

## Architecture decisions
- Custom `user_id` (UUID-based) field instead of MongoDB `_id` everywhere — `_id` is always projected out.
- Single `Authorization: Bearer <session_token>` header path mirrors the cookie path for cross-domain
  reliability (handled by `auth_utils.get_current_user`).
- AI call wrapped in `asyncio.wait_for(40s)` — guarantees response within ingress 60s window.
- Razorpay service has a placeholder-safe path so the full purchase flow works end-to-end without keys.
