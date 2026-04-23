import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.url),
  title: {
    default: "RapidCleanAI | Quote Cleaning Jobs Faster",
    template: "%s | RapidCleanAI",
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  openGraph: {
    title: "RapidCleanAI",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: "RapidCleanAI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RapidCleanAI",
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(manrope.variable, spaceGrotesk.variable, "min-h-screen")}>
        {children}
      </body>
    </html>
  );
}
