import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { getRequestLocale } from "@/i18n/get-dictionary";

import "./globals.css";

// Заголовки — геометрический Space Grotesk.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

// Основной текст — Inter, с кириллицей для RU-локали.
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

// Данные, даты и код — JetBrains Mono.
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "DLTV Organizer Portal",
  description:
    "Submit a Deadlock tournament for review and publication by DLTV.",
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();
  return (
    <html
      lang={locale}
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
