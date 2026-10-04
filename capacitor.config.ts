import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native iOS wrapper. The same static export (./out) that powers the PWA is
 * bundled inside the app, so it opens instantly and works offline.
 *
 *   npm run ios        # build web + copy into ios/ + open Xcode (Mac only)
 *
 * See README → "Aplikasi iOS" for the full walkthrough.
 */
const config: CapacitorConfig = {
  appId: "com.twogether.app",
  appName: "Twogether",
  webDir: "out",
  ios: {
    // Safe areas are handled in CSS via env(safe-area-inset-*), exactly like
    // the PWA, so the web view must not add its own insets on top.
    contentInset: "never",
    backgroundColor: "#faf6f1",
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      // Hidden from JS once the first screen has painted (lib/native.ts).
      launchAutoHide: false,
      backgroundColor: "#faf6f1",
      showSpinner: false,
    },
    Keyboard: {
      // Resize the web view so inputs in bottom sheets stay visible.
      resize: "native",
    },
  },
};

export default config;
