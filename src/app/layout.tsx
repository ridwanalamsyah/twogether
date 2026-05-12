import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SyncProvider } from "@/components/sync/SyncProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export const metadata: Metadata = {
  title: "Twogether",
  description: "Keuangan, tracker, jadwal & moments untuk berdua — offline-first PWA.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Twogether",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "Twogether",
    description:
      "Keuangan, tracker, jadwal & moments untuk berdua — offline-first PWA.",
    type: "website",
    siteName: "Twogether",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Twogether",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Twogether",
    description:
      "Keuangan, tracker, jadwal & moments untuk berdua — offline-first PWA.",
    images: ["/icons/icon-512.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

/**
 * Inline script that runs in <head> BEFORE the body renders. Reads the
 * persisted theme from localStorage (zustand `bareng:theme`) and sets
 * `data-theme` / `data-accent` on <html> so the user never sees a flash
 * of the wrong color scheme on first paint or full reload.
 *
 * Kept tiny and try/catched so a malformed localStorage entry can't crash
 * the page. `ThemeProvider` still runs on mount to handle live changes
 * (system colorscheme toggle, auto-dark schedule).
 */
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("bareng:theme");var m="system",a="default";if(s){var p=JSON.parse(s);if(p&&p.state){m=p.state.mode||"system";a=p.state.accent||"default";}}var r=m;if(m==="system"){r=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=r;document.documentElement.dataset.accent=a;}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="theme-transition">
        <ErrorBoundary>
          <ThemeProvider>
            <SyncProvider>{children}</SyncProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
