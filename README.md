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

### 4. Aplikasi iOS (Capacitor)

Proyek Xcode sudah ada di `ios/` (Swift Package Manager, tanpa CocoaPods).
Kode web yang sama dibundel ke dalam app, jadi app terbuka instan dan jalan
offline. Bedanya dengan PWA: haptic asli (Taptic Engine), status bar ikut
tema, splash screen, dan ikon di Home Screen seperti app biasa.

Butuh **Mac dengan Xcode** (gratis dari App Store).

```bash
npm install
npm run ios          # build web → salin ke ios/ → buka Xcode
```

Di Xcode:

1. Pilih target **App** → tab **Signing & Capabilities** → *Team*: login
   dengan Apple ID kamu. Ganti *Bundle Identifier* kalau `com.twogether.app`
   sudah dipakai orang lain (mis. `com.namakamu.twogether`).
2. Colok iPhone, pilih iPhone-nya di atas, tekan ▶︎ Run.
3. Di iPhone: Settings → General → VPN & Device Management → percayai
   developer-nya (sekali saja).

Pilihan distribusi:

| Cara | Biaya | Catatan |
|---|---|---|
| Apple ID gratis | Rp0 | App harus di-install ulang dari Xcode tiap 7 hari |
| Apple Developer Program | $99/tahun | Install permanen; bisa kirim ke HP pasangan lewat **TestFlight** atau rilis ke App Store |
| PWA (Safari → Bagikan → *Add to Home Screen*) | Rp0 | Tanpa Mac; fiturnya hampir sama |

Setiap kali kode web berubah: `npm run ios:sync` lalu Run lagi di Xcode.
Login magic link disembunyikan di app native (link email terbuka di Safari);
pakai email + password.

### Catatan untuk rilis komersial

- **Scan struk** berjalan di perangkat (tesseract.js). File OCR disalin ke
  `public/ocr` otomatis oleh `npm run dev/build` (`scripts/copy-ocr-assets.mjs`).
- Fitur yang ditandai `premium: true` di `src/data/features.ts` adalah calon
  paket berbayar — belum dikunci.

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
