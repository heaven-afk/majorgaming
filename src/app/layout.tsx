import type { Metadata, Viewport } from "next";
import { site } from "@/content/site";
import { MGL_ORIGIN } from "@/lib/site-url.mjs";
import localFont from "next/font/local";
import "lenis/dist/lenis.css";
import "./globals.css";

// Self-hosted (latin, from Google Fonts, SIL Open Font License): pages never wait on a font
// server, and builds and dev work without reaching fonts.googleapis.com.
const sans = localFont({ src: "./fonts/InterTight-Variable.woff2", variable: "--font-sans-face", weight: "100 900", display: "swap" });
const serif = localFont({ src: "./fonts/InstrumentSerif-Italic.woff2", variable: "--font-serif-face", weight: "400", style: "italic", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(MGL_ORIGIN),
  title: site.name,
  description: site.description,
  applicationName: site.short,
  openGraph: { siteName: site.name, locale: "en_GB", type: "website" },
  icons: {
    icon: [{ url: "/brand/favicon-96.png", type: "image/png", sizes: "96x96" }],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#161616",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
