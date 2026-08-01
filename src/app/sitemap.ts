import type { MetadataRoute } from "next";

import { absolutePublicUrl } from "@/lib/public-tournaments/seo";
import { listPublishedTournaments } from "@/lib/public-tournaments/public-tournaments.repository";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = ["en", "ru"].flatMap((locale) => [
    {
      url: absolutePublicUrl(`/${locale}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: absolutePublicUrl(`/${locale}/tournaments`),
      changeFrequency: "daily" as const,
      priority: 1,
    },
  ]);
  try {
    let page = 1;
    let totalPages = 1;
    do {
      const result = await listPublishedTournaments({
        lifecycle: "all",
        page,
        limit: 20,
      });
      totalPages = result.totalPages;
      entries.push(
        ...result.tournaments.flatMap((tournament) =>
          ["en", "ru"].map((locale) => ({
            url: absolutePublicUrl(`/${locale}/tournaments/${tournament.slug}`),
            lastModified: tournament.source_updated_at,
            changeFrequency: "weekly" as const,
            priority: 0.8,
          })),
        ),
      );
      page += 1;
    } while (page <= totalPages);
  } catch {
    return entries;
  }
  return entries;
}
