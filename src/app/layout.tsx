import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SyncProvider } from "@/components/sync/SyncProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export const metadata: Metadata = {
  title: "Bareng",
  description: "Workspace bareng — keuangan, goals, dan momen, offline-first.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Bareng",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
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
