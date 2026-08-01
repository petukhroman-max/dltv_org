import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getRequestLocale } from "@/i18n/get-dictionary";

import "./globals.css";

export const metadata: Metadata = {
  title: "DLTV Organizer Portal",
  description:
    "Submit a Deadlock tournament for review and publication by DLTV.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
