import { defineConfig } from "@playwright/test";

// Smoke tests against the real static export (npm run build first).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    browserName: "chromium",
    baseURL: "http://localhost:3210",
    timezoneId: "Asia/Jakarta",
    locale: "id-ID",
  },
  webServer: {
    command: "node scripts/serve-out.mjs",
    url: "http://localhost:3210/auth",
    reuseExistingServer: !process.env.CI,
  },
});
