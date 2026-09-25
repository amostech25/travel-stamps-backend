import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { SITE_URL } from "@/lib/config";

// Outfit (SIL Open Font License), self-hosted so visitors never load anything from Google.
const outfit = localFont({ src: "./fonts/outfit-latin-wght-normal.woff2", weight: "100 900", variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Travel Stamps — Where the world welcomes you", template: "%s · Travel Stamps" },
  description:
    "A travel guide built by travellers from every background: places that made us feel at home, the ones worth ticking off, and the ones to think twice about.",
  openGraph: { title: "Travel Stamps", description: "A community travel guide for travellers of every background.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#EEEAE3" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={outfit.variable}>
      <body>{children}</body>
    </html>
  );
}
