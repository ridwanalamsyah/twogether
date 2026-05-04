import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor wrapper config. To produce the iOS app:
 *
 *   npm run build && npm run export   # static export to ./out
 *   npx cap add ios
 *   npx cap copy ios
 *   npx cap open ios                  # opens Xcode
 *
 * The Next.js app is set up so the same code runs as a PWA in iOS Safari OR
 * inside the Capacitor wrapper (no native plugin assumptions).
 */
const config: CapacitorConfig = {
  appId: "com.bareng.app",
  appName: "Bareng",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
