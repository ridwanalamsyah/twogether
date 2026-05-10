# Twogether — Production-grade workspace app

Next.js + TypeScript + Zustand + Dexie + Tailwind. Apple-style UX with
Notion-style modular dashboards. Offline-first, privacy-first, PWA + Capacitor
ready.

## Five core systems

1. **Personal Dashboard Customization** — `src/components/dashboard/`,
   `src/components/widgets/`, `src/stores/dashboard.ts`. Modular widgets,
   drag-and-drop reorder via `@dnd-kit`, per-user persistent layout in
   IndexedDB + sync queue. Customize page at `/settings/dashboard` toggles
   widgets and resizes them (S/M/L grid spans).

2. **Goal Prediction** — `src/services/prediction.ts`. Lightweight analytics:
   weekly bucketing → 8-week SMA → linear trend slope → consistency score
   (1 − coefficient of variation). Renders ETA + Indonesian summary in the
   Goal Prediction widget and the dedicated `/goals` page, which also hosts
   the **what-if simulator** (`GoalSimulator`).

3. **Offline Mode Advanced** — `src/lib/db.ts` (Dexie schema with `dirty`,
   `deletedAt`, `outbox`), `src/services/sync.ts` (sync engine with online/
   offline detection, batched drain, retry/back-off, last-write-wins on
   `updatedAt`). Status pill in the header (`SyncIndicator`) shows
   pending/offline/synced.

4. **Privacy-first Design** — `src/lib/crypto.ts` (Web Crypto: PBKDF2 SHA-256
   210k iter, AES-GCM 256), `src/services/privacy.ts` (export, wipe local,
   delete account). Moments support optional E2E encryption. Privacy panel
   at `/settings/privacy`.

5. **Theme System** — `src/app/globals.css` (CSS custom properties),
   `src/stores/theme.ts`, `src/components/theme/ThemeProvider.tsx`. Light /
   Dark / System + 6 accent presets. Smooth cross-token transitions,
   PWA `theme-color` follows the active mode.

## Architecture

```
src/
├── app/
│   ├── layout.tsx                 root + theme + sync providers
│   ├── page.tsx                   splash + auth redirect
│   ├── auth/page.tsx              local-first auth (PBKDF2 hashed)
│   └── (app)/
│       ├── layout.tsx             app shell, requires auth
│       ├── home/                  customizable dashboard
│       ├── tracker/               transaction list + add sheet
│       ├── goals/                 goals + prediction + simulator
│       ├── moments/               notes (optional E2E)
│       └── settings/
│           ├── dashboard/         widget customization
│           ├── theme/             theme + accent picker
│           └── privacy/           data export / delete / status
├── components/
│   ├── dashboard/                 DashboardGrid (DnD)
│   ├── widgets/                   modular widgets + registry
│   ├── shell/                     AppHeader, BottomNav
│   ├── goals/                     GoalSimulator
│   ├── theme/                     ThemeProvider
│   └── sync/                      SyncProvider, SyncIndicator, PWAInstaller
├── lib/
│   ├── db.ts                      Dexie schema (offline-first)
│   ├── crypto.ts                  Web Crypto helpers
│   └── utils.ts                   formatting, math (mean/stdev)
├── services/
│   ├── sync.ts                    sync queue + drain loop
│   ├── prediction.ts              goal analytics (no AI deps)
│   └── privacy.ts                 export / wipe / delete account
└── stores/                        Zustand (auth, theme, dashboard, data)
```

Business logic lives in `services/` so UI components stay declarative; stores
are thin wrappers around Dexie + Zustand.

## Running locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Optional: copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SYNC_URL`
to a backend that accepts `{table, recordId, op, payload}`. When unset, the
app remains fully functional offline-only and the sync queue stays "pending".

## Deploying

### 1. Static hosting (PWA)

```bash
npm run build           # produces /out
# Upload /out to: Vercel, Netlify, Cloudflare Pages, S3+CloudFront, etc.
```

The build is a fully static export — no server required. The PWA installs via
iOS Safari "Add to Home Screen" with proper safe-area + status-bar styling.

### 2. Custom domain

Point your domain (e.g. `twogether.app`) to the static host. For Cloudflare Pages
or Vercel, just add it in the dashboard. Make sure HTTPS is enabled — the
service worker, MediaRecorder (voice notes), and Notifications APIs all
require HTTPS or `localhost`.

### 3. Cross-device sync (Supabase)

Set in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SYNC_URL=...   # optional fallback HTTP endpoint
```

The sync queue is backend-agnostic. Without keys the app runs local-only
(IndexedDB) — every feature still works on a single device.

### 4. iOS App Store (Capacitor)

```bash
npm run build
npx cap add ios          # one-time
npx cap copy ios         # after each build
npx cap open ios         # opens Xcode
# In Xcode: Product → Archive → upload to App Store Connect
```

Requires Xcode (macOS) and an Apple Developer Program membership ($99/year).

## Backend (optional)

The sync engine talks to a single HTTP endpoint:

```
POST {NEXT_PUBLIC_SYNC_URL}
Content-Type: application/json
{
  "table": "transactions",
  "recordId": "...",
  "op": "upsert" | "delete",
  "payload": {...full record snapshot}
}
```

This is intentionally backend-agnostic — plug in Supabase Edge Functions, a
Next.js API route, Firebase, or self-hosted Node. Conflict resolution on the
server should compare `updatedAt` and accept the higher value (LWW).
