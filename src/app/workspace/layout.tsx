import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournament workspace",
  robots: { index: false, follow: false, noarchive: true },
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
