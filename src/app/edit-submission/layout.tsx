import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};

export default function EditSubmissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
