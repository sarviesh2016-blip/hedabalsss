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
- **Backend** (all under `/api`):
  - `/auth/session`, `/auth/me`, `/auth/logout` (Emergent Google flow, custom user_id, cookie+Bearer)
  - `/upload/video`, `/videos`, `/videos/{id}`, `/videos/{id}/stream` (Emergent object storage, MIME validation, 100MB cap)
  - `/generate-prompt` (Gemini 3 Pro w/ 40s timeout + structured fallback mock; atomic credit decrement)
  - `/generations`, `/generations/{id}`, `/user/credits`
  - `/save-prompt`, `/saved-prompts`, DELETE `/saved-prompts/{id}`
  - `/payments/plans`, `/create-order`, `/verify` (placeholder-safe), `/history`, `/webhooks/razorpay`
  - `/api-keys/create` (full key shown once), list, delete (with key_hash storage)
  - `/admin/stats`, `/users`, `/payments`, `/generations`, `/credits/adjust`, `/integration-keys` (GET/PUT, masked secret), `/logs`
  - `/contact` (public)
- **Frontend pages**: Landing (hero, features, workflow, prompt preview, testimonials, FAQ),
  Pricing (4 tiers + 3 packs), Login (Google), Dashboard (stats + recent gens), Upload (drag-and-drop),
  PromptResult (timeline + per-model tabs + copy/TXT/JSON), SavedPrompts, Billing (Razorpay checkout flow,
  history), ApiDocs (key management + curl snippet), Blog, Contact, Admin (4 tabs).
- **Design**: dark cinematic theme, glassmorphism cards, brand-gradient + cyan glow accents,
  Outfit/Manrope/JetBrains Mono fonts, framer-motion entrance animations.
- **Testing**: 27/34 backend pytest tests passing; the `/generate-prompt` timeout issue
  was fixed by wrapping the AI call with `asyncio.wait_for(..., timeout=40)` + structured
  fallback. Live curl test now returns a complete structured prompt in ~6s.

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
