import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";

// Внутренние инструменты: только `next dev`, без языковых разделов и шапки сайта. В продакшне — 404.

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "cyrillic"] });

const IS_DEV = process.env.NODE_ENV === "development";

export const metadata: Metadata = IS_DEV
  ? { title: "Entry Check — внутренние инструменты", robots: { index: false, follow: false } }
  : {};

export default function DevLayout({ children }: { children: ReactNode }) {
  if (!IS_DEV) notFound();
  return (
    <html lang="ru" className={`${geistSans.variable} antialiased`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
