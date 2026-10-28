import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";

const sans = Inter_Tight({ variable: "--font-sans-face", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif-face", subsets: ["latin"], weight: "400", style: "italic" });

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
