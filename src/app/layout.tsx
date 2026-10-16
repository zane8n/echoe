import type { Metadata, Viewport } from "next";
import { Funnel_Display, Funnel_Sans } from "next/font/google";
import { AppShell } from "./app-shell";
import "./globals.css";

const display = Funnel_Display({ subsets: ["latin"], variable: "--font-funnel-display", display: "swap" });
const sans = Funnel_Sans({ subsets: ["latin"], variable: "--font-funnel-sans", display: "swap" });

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
        { media: "(prefers-color-scheme: light)", color: "#f2f3f7" },
        { media: "(prefers-color-scheme: dark)", color: "#101115" },
    ],
    colorScheme: "light dark",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" data-accent="blue" className={`${display.variable} ${sans.variable}`}>
            <body className="antialiased">
                <AppShell>{children}</AppShell>
            </body>
        </html>
    );
}
