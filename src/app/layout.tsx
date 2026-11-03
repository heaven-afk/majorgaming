import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "lenis/dist/lenis.css";
import "./globals.css";

// Self-hosted (latin, from Google Fonts, SIL Open Font License): pages never wait on a font
// server, and builds and dev work without reaching fonts.googleapis.com.
const sans = localFont({ src: "./fonts/InterTight-Variable.woff2", variable: "--font-sans-face", weight: "100 900", display: "swap" });
const serif = localFont({ src: "./fonts/InstrumentSerif-Italic.woff2", variable: "--font-serif-face", weight: "400", style: "italic", display: "swap" });

export const metadata: Metadata = {
  title: "MGL · Major Gaming League",
  description: "The ranked league for Call of Duty: Mobile Battle Royale.",
  icons: { icon: "/brand/mgl-mark.svg" },
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
