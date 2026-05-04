/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export so the app can ship as a PWA + Capacitor wrapper.
  output: "export",
  images: { unoptimized: true },
  // Generate flat .html files (e.g. /auth.html) at the export root so the
  // hosting layer's SPA fallback doesn't shadow nested directory routes.
  trailingSlash: false,
};

export default nextConfig;
