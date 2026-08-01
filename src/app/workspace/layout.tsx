import type { Metadata } from "next";
import { getRequestDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getRequestDictionary();
  return {
    title: dictionary.workspace.title,
    robots: { index: false, follow: false, noarchive: true },
    referrer: "no-referrer",
  };
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
