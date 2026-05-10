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
