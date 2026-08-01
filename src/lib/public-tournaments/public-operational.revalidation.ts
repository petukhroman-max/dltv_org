import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function publicTournamentProjectionTag(slug: string) {
  return `public-tournament-projection:${slug}`;
}

type PublishedSlugResolver = (submissionId: string) => Promise<string | null>;

async function resolvePublishedSlug(submissionId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("published_tournaments")
    .select("slug")
    .eq("submission_id", submissionId)
    .eq("visibility_status", "published")
    .maybeSingle();
  if (error) {
    console.warn("[public-tournament-projection] revalidation_lookup_failed");
    return null;
  }
  return data?.slug ?? null;
}

export async function revalidatePublicTournamentProjection(
  submissionId: string,
  resolve: PublishedSlugResolver = resolvePublishedSlug,
) {
  const slug = await resolve(submissionId);
  if (!slug) return false;
  revalidateTag(publicTournamentProjectionTag(slug));
  revalidatePath(`/en/tournaments/${slug}`);
  revalidatePath(`/ru/tournaments/${slug}`);
  return true;
}
