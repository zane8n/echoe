import type { Metadata, Viewport } from "next";
import { AppShell } from "./app-shell";
import "./globals.css";

export const metadata: Metadata = {
    title: "Echoe: build a rhythm you can trust",
    description: "A calm, local-first milestone and habit tracker built around progress, reflection, and practical growth.",
    manifest: "/manifest.webmanifest",
    icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Echoe" },
    formatDetection: { telephone: false },
};

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#f6f7fa" },
        { media: "(prefers-color-scheme: dark)", color: "#0a0b10" },
    ],
    colorScheme: "light dark",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" data-accent="blue">
            <head>
                {/* Sora is self-hosted (public/fonts) so neither the build nor the installed app waits on a font server. */}
                <link rel="preload" href="/fonts/sora-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
            </head>
            <body className="antialiased">
                <AppShell>{children}</AppShell>
            </body>
        </html>
    );
}
